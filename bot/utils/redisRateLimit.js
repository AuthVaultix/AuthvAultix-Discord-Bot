/**
 * ============================================================
 *  REDIS-BASED RATE LIMITER WITH BAN SYSTEM
 * ============================================================
 *
 *  RULES:
 *  - 5 requests per 60 seconds per user
 *  - 6th request → 60-second ban
 *  - If a ban is active, every request is blocked
 *  - Limits and bans persist even after a bot restart (in Redis)
 *
 *  REDIS KEYS:
 *  bot:rl:{userId}  → request counter  (TTL: 60s)
 *  bot:ban:{userId} → ban flag          (TTL: 60s)
 *
 *  FLOW:
 *  A request arrives
 *     ↓
 *  Does the ban key exist? → YES → BLOCKED (ban is active, show remaining time)
 *     ↓ NO
 *  Increment the counter → set TTL if it is new
 *     ↓
 *  Is the count > 5? → YES → set the ban key (60s) and delete the counter → BLOCKED
 *     ↓ NO
 *  ALLOWED (remaining = 5 - count)
 * ============================================================
 */

"use strict";

const Redis = require("ioredis");
require("./loadEnv");

/* ============================================================
   REDIS CONNECTION
   ============================================================ */
const REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";

const redis = new Redis(REDIS_URL, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
        if (times > 5) return null; // Stop retrying after 5 attempts
        return Math.min(times * 200, 2000);
    },
    lazyConnect: false,
});

redis.on("connect", () => {
    console.log("✅ [redisRateLimit] Redis connected —", REDIS_URL);
});

let redisLoggedError = false;
redis.on("error", (err) => {
    if (!redisLoggedError) {
        console.log("ℹ️  [redisRateLimit] Redis not connected (rate limiter running in fallback mode)");
        redisLoggedError = true;
    }
});

/* ============================================================
   SETTINGS
   ============================================================ */
const MAX_REQUESTS  = 5;      // 5 requests allowed per window
const WINDOW_SEC    = 60;     // 60-second window
const BAN_SEC       = 60;     // 60-second ban when the limit is exceeded
const KEY_PREFIX    = "bot";  // Redis key prefix

/* ============================================================
   REDIS RATE LIMIT CHECK
   Atomic Lua script — no race conditions
   ============================================================ */
const RATE_LIMIT_SCRIPT = `
local ban_key     = KEYS[1]
local counter_key = KEYS[2]
local max_req     = tonumber(ARGV[1])
local window_sec  = tonumber(ARGV[2])
local ban_sec     = tonumber(ARGV[3])

-- Step 1: Check if user is banned
local ban_ttl = redis.call('TTL', ban_key)
if ban_ttl > 0 then
    return {0, ban_ttl, -1}   -- {allowed=0, retryAfter=ban_ttl, remaining=-1}
end

-- Step 2: Increment counter
local count = redis.call('INCR', counter_key)

-- Step 3: Set TTL on first request
if count == 1 then
    redis.call('EXPIRE', counter_key, window_sec)
end

-- Step 4: Check if limit exceeded
if count > max_req then
    -- Set ban
    redis.call('SET', ban_key, '1', 'EX', ban_sec)
    -- Reset counter
    redis.call('DEL', counter_key)
    return {0, ban_sec, 0}    -- {allowed=0, retryAfter=ban_sec, remaining=0}
end

-- Step 5: Allowed
local remaining = max_req - count
return {1, 0, remaining}      -- {allowed=1, retryAfter=0, remaining=N}
`;

/* Load the script SHA for efficiency */
let _scriptSha = null;
async function _getScriptSha() {
    if (_scriptSha) return _scriptSha;
    _scriptSha = await redis.script("LOAD", RATE_LIMIT_SCRIPT);
    return _scriptSha;
}

/* ============================================================
   MAIN FUNCTION: checkRateLimit(userId)
   Returns: { allowed, remaining, retryAfterSec, banned }
   ============================================================ */
async function checkRateLimit(userId) {
    const banKey     = `${KEY_PREFIX}:ban:${userId}`;
    const counterKey = `${KEY_PREFIX}:rl:${userId}`;

    try {
        const sha = await _getScriptSha();

        const [allowed, retryAfter, remaining] = await redis.evalsha(
            sha,
            2,                   // number of keys
            banKey,
            counterKey,
            MAX_REQUESTS,
            WINDOW_SEC,
            BAN_SEC
        );

        return {
            allowed:      allowed === 1,
            remaining:    Math.max(0, remaining),
            retryAfterSec: retryAfter,
            banned:       allowed === 0 && retryAfter > 0,
        };

    } catch (err) {
        /* Redis down → fail open silently */
        return { allowed: true, remaining: MAX_REQUESTS, retryAfterSec: 0, banned: false };
    }
}

/* ============================================================
   ADMIN: Manual ban/unban a user
   ============================================================ */
async function banUser(userId, seconds = BAN_SEC) {
    const banKey = `${KEY_PREFIX}:ban:${userId}`;
    await redis.set(banKey, "1", "EX", seconds);
    console.log(`🚫 [redisRateLimit] User ${userId} manually banned for ${seconds} seconds`);
}

async function unbanUser(userId) {
    const banKey     = `${KEY_PREFIX}:ban:${userId}`;
    const counterKey = `${KEY_PREFIX}:rl:${userId}`;
    await redis.del(banKey, counterKey);
    console.log(`✅ [redisRateLimit] User ${userId} has been unbanned`);
}

async function getUserStatus(userId) {
    const banKey     = `${KEY_PREFIX}:ban:${userId}`;
    const counterKey = `${KEY_PREFIX}:rl:${userId}`;

    const [banTtl, count, counterTtl] = await Promise.all([
        redis.ttl(banKey),
        redis.get(counterKey),
        redis.ttl(counterKey),
    ]);

    return {
        userId,
        banned:       banTtl > 0,
        banTtl:       banTtl > 0 ? banTtl : 0,
        requestCount: parseInt(count || "0"),
        windowTtl:    counterTtl > 0 ? counterTtl : 0,
        remaining:    Math.max(0, MAX_REQUESTS - parseInt(count || "0")),
    };
}

/* ============================================================
   GRACEFUL SHUTDOWN
   ============================================================ */
async function safeShutdownRedis() {
    try {
        if (redis.status === "ready" || redis.status === "connect") {
            await redis.quit();
            console.log("🔌 [redisRateLimit] Redis disconnected");
        } else {
            redis.disconnect();
        }
    } catch (e) {
        try { redis.disconnect(); } catch (_) {}
    }
}

process.on("SIGINT", safeShutdownRedis);
process.on("SIGTERM", safeShutdownRedis);

module.exports = {
    checkRateLimit,
    banUser,
    unbanUser,
    getUserStatus,
    redis, // exported for advanced use
    MAX_REQUESTS,
    WINDOW_SEC,
    BAN_SEC,
};
