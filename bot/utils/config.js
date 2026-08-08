const { pool } = require("./db");
require("./loadEnv");

/* ======================
   CRYPTO — X25519 Sealed Box
   (Curve25519 / Ed255-family asymmetric encryption)
   Public Key  → hardcoded in utils/asymCrypto.js
   Private Key → BOT_PRIVATE_KEY in .env (server only)
====================== */
const { sealEncrypt, sealDecrypt } = require("./asymCrypto");

/* Aliases for drop-in compatibility */
const encrypt = sealEncrypt;
const decrypt = sealDecrypt;

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
   DELETE USER APP
====================== */
async function deleteUserApp(userId, appName) {
    const [result] = await pool.query(
        "DELETE FROM user_keys WHERE userId = ? AND appName = ?",
        [userId, appName]
    );

    if (result.affectedRows > 0) {
        const [userRows] = await pool.query("SELECT activeApp FROM users WHERE userId = ?", [userId]);
        if (userRows.length > 0 && userRows[0].activeApp === appName) {
            const remainingApps = await getUserApps(userId);
            const nextApp = remainingApps.length > 0 ? remainingApps[0] : null;
            await pool.query("UPDATE users SET activeApp = ? WHERE userId = ?", [nextApp, userId]);
            return { success: true, newActiveApp: nextApp };
        }
        return { success: true, newActiveApp: userRows[0]?.activeApp || null };
    }

    return { success: false, newActiveApp: null };
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
    deleteUserApp,
    getActiveSellerKey
};
