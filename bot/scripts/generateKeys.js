/**
 * ============================================================
 *  KEY GENERATION SCRIPT — Run ONCE on server
 *  node scripts/generateKeys.js
 * ============================================================
 *  OUTPUT:
 *   - PUBLIC_KEY_HEX  → paste into utils/asymCrypto.js
 *   - BOT_PRIVATE_KEY → paste into .env (keep SECRET)
 * ============================================================
 */

"use strict";

const crypto = require("crypto");

console.log("\n🔑 Generating X25519 Key Pair (Curve25519 / Ed255-family)...\n");

const { privateKey, publicKey } = crypto.generateKeyPairSync("x25519");

const pubHex = publicKey.export({ format: "der", type: "spki" }).toString("hex");
const privHex = privateKey.export({ format: "der", type: "pkcs8" }).toString("hex");

console.log("━".repeat(60));
console.log("📢 PUBLIC KEY (paste into utils/asymCrypto.js):");
console.log("━".repeat(60));
console.log(`PUBLIC_KEY_HEX = "${pubHex}"`);
console.log();
console.log("━".repeat(60));
console.log("🔐 PRIVATE KEY (paste into .env — NEVER share this!):");
console.log("━".repeat(60));
console.log(`BOT_PRIVATE_KEY=${privHex}`);
console.log();
console.log("━".repeat(60));
console.log("✅ STEPS:");
console.log("  1. Copy PUBLIC_KEY_HEX value → utils/asymCrypto.js line with PUBLIC_KEY_HEX");
console.log("  2. Copy BOT_PRIVATE_KEY=... → your .env file");
console.log("  3. Run: node scripts/migrateKeys.js  (to re-encrypt old DB data)");
console.log("  4. Remove ENCRYPT_KEY from .env (no longer needed)");
console.log("━".repeat(60));
console.log();

/* Verify round-trip works */
try {
    const testMsg = "verify-ok-" + Date.now();

    const pubKeyObj = crypto.createPublicKey({
        key: Buffer.from(pubHex, "hex"),
        format: "der",
        type: "spki",
    });
    const privKeyObj = crypto.createPrivateKey({
        key: Buffer.from(privHex, "hex"),
        format: "der",
        type: "pkcs8",
    });

    /* Encrypt */
    const eph = crypto.generateKeyPairSync("x25519");
    const ss1 = crypto.diffieHellman({ privateKey: eph.privateKey, publicKey: pubKeyObj });
    const info = Buffer.from("bot-x25519-seal-v1", "utf8");
    const aesKey1 = crypto.hkdfSync("sha256", ss1, Buffer.alloc(0), info, 32);
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", aesKey1, iv);
    const enc = Buffer.concat([cipher.update(testMsg, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    const ephPubDer = eph.publicKey.export({ format: "der", type: "spki" });

    /* Decrypt */
    const ephPubObj = crypto.createPublicKey({ key: ephPubDer, format: "der", type: "spki" });
    const ss2 = crypto.diffieHellman({ privateKey: privKeyObj, publicKey: ephPubObj });
    const aesKey2 = crypto.hkdfSync("sha256", ss2, Buffer.alloc(0), info, 32);
    const decipher = crypto.createDecipheriv("aes-256-gcm", aesKey2, iv);
    decipher.setAuthTag(tag);
    const dec = Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");

    if (dec === testMsg) {
        console.log("✅ Key pair verification PASSED — encryption/decryption works correctly!\n");
    } else {
        console.error("❌ Key pair verification FAILED — something is wrong!\n");
        process.exit(1);
    }
} catch (err) {
    console.error("❌ Verification error:", err.message);
    process.exit(1);
}
