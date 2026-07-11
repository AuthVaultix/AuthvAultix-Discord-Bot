const crypto = require("crypto");
const { pool } = require("./db");
require("./loadEnv");

const SECRET_KEY = process.env.ENCRYPT_KEY;
if (!SECRET_KEY || SECRET_KEY.length !== 32) {
    throw new Error("❌ ENCRYPT_KEY must be 32 characters");
}

/* ======================
   CRYPTO
====================== */
function encrypt(text) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(SECRET_KEY), iv);
    const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
    return iv.toString("hex") + ":" + encrypted.toString("hex");
}

function decrypt(data) {
    try {
        const [ivHex, encHex] = data.split(":");
        const iv = Buffer.from(ivHex, "hex");
        const encrypted = Buffer.from(encHex, "hex");
        const decipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from(SECRET_KEY), iv);
        return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
    } catch {
        return null;
    }
}

/* ======================
   UNIQUE APP NAME
====================== */
async function getUniqueAppName(userId, baseName) {
    const names = await getUserApps(userId);
    if (!names.includes(baseName)) return baseName;

    let i = 2;
    while (names.includes(`${baseName}-${i}`)) i++;
    return `${baseName}-${i}`;
}

/* ======================
   SAVE SELLER KEY
====================== */
async function setSellerKey(userId, baseAppName, rawKey) {
    const updatedAt = new Date().toISOString();
    
    // Insert or update user
    await pool.query(
        "INSERT INTO users (userId, updatedAt) VALUES (?, ?) ON DUPLICATE KEY UPDATE updatedAt = ?",
        [userId, updatedAt, updatedAt]
    );

    const finalName = await getUniqueAppName(userId, baseAppName);
    const encryptedKey = encrypt(rawKey);

    // Insert user key
    await pool.query(
        "INSERT INTO user_keys (userId, appName, `key`) VALUES (?, ?, ?)",
        [userId, finalName, encryptedKey]
    );

    // Set activeApp if not already set
    const [userRows] = await pool.query("SELECT activeApp FROM users WHERE userId = ?", [userId]);
    if (userRows.length > 0 && !userRows[0].activeApp) {
        await pool.query("UPDATE users SET activeApp = ? WHERE userId = ?", [finalName, userId]);
    }

    return finalName;
}

/* ======================
   GET USER APPS
====================== */
async function getUserApps(userId) {
    const [rows] = await pool.query("SELECT appName FROM user_keys WHERE userId = ?", [userId]);
    return rows.map(r => r.appName);
}

/* ======================
   SWITCH ACTIVE APP
====================== */
async function switchActiveApp(userId, appName) {
    const [rows] = await pool.query("SELECT id FROM user_keys WHERE userId = ? AND appName = ?", [userId, appName]);
    if (rows.length > 0) {
        await pool.query("UPDATE users SET activeApp = ? WHERE userId = ?", [appName, userId]);
    }
}

/* ======================
   GET ACTIVE KEY
====================== */
async function getActiveSellerKey(userId) {
    const [rows] = await pool.query(
        "SELECT k.`key` FROM user_keys k INNER JOIN users u ON k.userId = u.userId AND k.appName = u.activeApp WHERE u.userId = ?",
        [userId]
    );
    if (rows.length > 0) {
        return decrypt(rows[0].key);
    }
    return null;
}

module.exports = {
    setSellerKey,
    getUserApps,
    switchActiveApp,
    getActiveSellerKey
};
