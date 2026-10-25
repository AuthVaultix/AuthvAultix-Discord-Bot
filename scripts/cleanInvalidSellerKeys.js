/**
 * ============================================================
 *  CRONJOB: CLEAN INVALID SELLER KEYS
 * ============================================================
 *
 *  Iterates over all stored seller keys in the SQLite database,
 *  validates each key against the AuthVaultix API:
 *  https://authvaultix.com/api/getApplicationFromSellerKey.php?sellerkey=<key>
 *
 *  If any key is invalid or revoked, it automatically deletes it
 *  from the database and switches the user's active application.
 *
 *  Cronjob Example (runs daily at 2:00 AM):
 *  0 2 * * * cd /path/to/bot && node scripts/cleanInvalidSellerKeys.js >> logs/cron_clean_keys.log 2>&1
 *
 *  Manual run:
 *  node scripts/cleanInvalidSellerKeys.js
 * ============================================================
 */

require("../utils/loadEnv");
const axios = require("axios");
const { pool, initializeDB } = require("../utils/db");
const { sealDecrypt } = require("../utils/asymCrypto");
const { deleteUserApp } = require("../utils/config");

const API_ENDPOINT = "https://authvaultix.com/api/getApplicationFromSellerKey.php";
const REQUEST_TIMEOUT_MS = 10000;

async function checkKeyWithApi(sellerKey) {
    try {
        const url = `${API_ENDPOINT}?sellerkey=${encodeURIComponent(sellerKey)}`;
        const res = await axios.get(url, {
            timeout: REQUEST_TIMEOUT_MS,
            validateStatus: () => true
        });

        if (res.status === 200 && res.data && res.data.success === true && res.data.application?.name) {
            return { valid: true, appName: res.data.application.name };
        }

        const reason = res.data?.message || res.data?.msg || `HTTP ${res.status}`;
        return { valid: false, reason };
    } catch (err) {
        // If it's a network/timeout error, do NOT delete the key accidentally
        return { valid: null, error: err.message };
    }
}

async function cleanInvalidSellerKeys() {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] 🚀 Starting 24-hour Seller Key validation cronjob...`);

    await initializeDB();

    const [rows] = await pool.query("SELECT id, userId, appName, `key` FROM user_keys");

    if (!rows || rows.length === 0) {
        console.log(`ℹ️  No seller keys found in database. Nothing to clean.`);
        return { total: 0, valid: 0, deleted: 0, skipped: 0 };
    }

    console.log(`🔍 Found ${rows.length} total seller key(s) in database. Validating...`);

    let validCount = 0;
    let deletedCount = 0;
    let skippedCount = 0;

    for (const row of rows) {
        let decryptedKey;
        try {
            decryptedKey = sealDecrypt(row.key);
        } catch (decErr) {
            console.error(`⚠️  Failed to decrypt key for user ${row.userId}, app '${row.appName}':`, decErr.message);
            decryptedKey = null;
        }

        if (!decryptedKey) {
            console.log(`🗑️  Deleting un-decryptable / corrupted key for user ${row.userId}, app '${row.appName}'...`);
            await deleteUserApp(row.userId, row.appName);
            deletedCount++;
            continue;
        }

        const check = await checkKeyWithApi(decryptedKey);

        if (check.valid === true) {
            validCount++;
            console.log(`✅ [Valid] User: ${row.userId} | App: '${row.appName}' (Live: ${check.appName})`);
        } else if (check.valid === false) {
            console.log(`❌ [Invalid] User: ${row.userId} | App: '${row.appName}' | Reason: ${check.reason} -> Deleting...`);
            const delRes = await deleteUserApp(row.userId, row.appName);
            deletedCount++;
            if (delRes.newActiveApp) {
                console.log(`   🔄 User ${row.userId} active app switched to: '${delRes.newActiveApp}'`);
            } else {
                console.log(`   ⚠️  User ${row.userId} has no remaining active apps.`);
            }
        } else {
            // Network issue / timeout: do not delete
            skippedCount++;
            console.warn(`⚠️  [Skipped due to network error] User: ${row.userId} | App: '${row.appName}' | Error: ${check.error}`);
        }
    }

    console.log("══════════════════════════════════════════════════════════════");
    console.log(`📊 Cleanup Summary:`);
    console.log(`   Total checked: ${rows.length}`);
    console.log(`   ✅ Valid:      ${validCount}`);
    console.log(`   🗑️  Deleted:    ${deletedCount}`);
    console.log(`   ⚠️  Skipped:    ${skippedCount}`);
    console.log("══════════════════════════════════════════════════════════════\n");

    return { total: rows.length, valid: validCount, deleted: deletedCount, skipped: skippedCount };
}

if (require.main === module) {
    cleanInvalidSellerKeys()
        .then(() => process.exit(0))
        .catch(err => {
            console.error("❌ Fatal error in cleanInvalidSellerKeys:", err);
            process.exit(1);
        });
}

module.exports = { cleanInvalidSellerKeys };
