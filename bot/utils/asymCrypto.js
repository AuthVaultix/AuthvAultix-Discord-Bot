/**
 * ============================================================
 *  ASYMMETRIC HYBRID ENCRYPTION — X25519 + AES-256-GCM
 *  (Sealed Box Pattern — Curve25519 family / "Ed255" style)
 * ============================================================
 *
 *  HOW IT WORKS:
 *  ┌─────────────────────────────────────────────────────────┐
 *  │  ENCRYPT (Bot side — only needs PUBLIC KEY)             │
 *  │  1. Generate ephemeral X25519 key pair (one-time use)   │
 *  │  2. ECDH(ephemeral_priv, recipient_pub) → shared secret │
 *  │  3. HKDF(shared_secret) → AES-256 key                  │
 *  │  4. AES-256-GCM encrypt the seller key                  │
 *  │  5. Store: ephPub + iv + authTag + ciphertext           │
 *  ├─────────────────────────────────────────────────────────┤
 *  │  DECRYPT (Server side — needs PRIVATE KEY from .env)    │
 *  │  1. ECDH(server_priv, ephemeral_pub) → same secret      │
 *  │  2. HKDF(shared_secret) → same AES key                  │
 *  │  3. AES-256-GCM decrypt → original seller key           │
 *  └─────────────────────────────────────────────────────────┘
 *
 *  SECURITY:
 *  - Public key leaked → NOTHING decryptable (no private key)
 *  - Each encryption uses fresh ephemeral key → perfect forward secrecy
 *  - AES-256-GCM provides authenticated encryption (tamper-proof)
 *  - Node.js built-in crypto only — zero extra dependencies
 * ============================================================
 */

"use strict";

const crypto = require("crypto");
require("./loadEnv");

/* ============================================================
   PUBLIC KEY — Hardcoded in bot source (NOT a secret)
   Generated once via: node scripts/generateKeys.js
   Private key is ONLY in .env (server side)
   ============================================================ */
const PUBLIC_KEY_HEX =
    "302a300506032b656e032100b2e1c161fed23ec1774d0a3cf25a64bd484ffbf0b1ef615597c013d305db247d";

/* Internal: load + cache the private key object */
let _cachedPrivateKey = null;
function _getPrivateKey() {
    if (_cachedPrivateKey) return _cachedPrivateKey;

    const hex = process.env.BOT_PRIVATE_KEY;
    if (!hex) {
        throw new Error(
            "❌ BOT_PRIVATE_KEY is not set in .env — cannot decrypt seller keys."
        );
    }

    _cachedPrivateKey = crypto.createPrivateKey({
        key: Buffer.from(hex, "hex"),
        format: "der",
        type: "pkcs8",
    });

    return _cachedPrivateKey;
}

/* Internal: load + cache the public key object */
let _cachedPublicKey = null;
function _getPublicKey() {
    if (_cachedPublicKey) return _cachedPublicKey;

    _cachedPublicKey = crypto.createPublicKey({
        key: Buffer.from(PUBLIC_KEY_HEX, "hex"),
        format: "der",
        type: "spki",
    });

    return _cachedPublicKey;
}

/* ============================================================
   HKDF KEY DERIVATION
   Turns raw ECDH shared secret → proper 32-byte AES key
   ============================================================ */
const HKDF_INFO = Buffer.from("bot-x25519-seal-v1", "utf8");
const HKDF_SALT = Buffer.alloc(0); // empty salt — info field provides domain separation

function _deriveAesKey(sharedSecret) {
    return crypto.hkdfSync("sha256", sharedSecret, HKDF_SALT, HKDF_INFO, 32);
}

/* ============================================================
   ENCRYPT — uses PUBLIC KEY only
   Returns hex string: ephPub:iv:tag:ciphertext
   ============================================================ */
function sealEncrypt(plaintext) {
    /* 1. Ephemeral X25519 key pair (one-time, throwaway) */
    const ephemeral = crypto.generateKeyPairSync("x25519");

    /* 2. ECDH: ephemeral_private × recipient_public → shared secret */
    const sharedSecret = crypto.diffieHellman({
        privateKey: ephemeral.privateKey,
        publicKey: _getPublicKey(),
    });

    /* 3. Derive AES-256 key via HKDF */
    const aesKey = _deriveAesKey(sharedSecret);

    /* 4. AES-256-GCM encrypt */
    const iv = crypto.randomBytes(12); // 96-bit nonce for GCM
    const cipher = crypto.createCipheriv("aes-256-gcm", aesKey, iv);
    const encrypted = Buffer.concat([
        cipher.update(plaintext, "utf8"),
        cipher.final(),
    ]);
    const authTag = cipher.getAuthTag(); // 16-byte authentication tag

    /* 5. Export ephemeral public key as DER/SPKI */
    const ephPubDer = ephemeral.publicKey.export({
        format: "der",
        type: "spki",
    });

    /* Format: version|ephPub|iv|tag|ciphertext (all hex, pipe-separated) */
    return [
        "x1", // version marker — makes future format changes easy
        ephPubDer.toString("hex"),
        iv.toString("hex"),
        authTag.toString("hex"),
        encrypted.toString("hex"),
    ].join("|");
}

/* ============================================================
   DECRYPT — requires PRIVATE KEY from .env
   ============================================================ */
function sealDecrypt(sealed) {
    try {
        /* Legacy format check: old AES-256-CBC was "ivHex:encHex" (2 parts) */
        if (!sealed || typeof sealed !== "string") return null;

        const parts = sealed.split("|");

        /* New format: x1|ephPub|iv|tag|cipher — 5 parts */
        if (parts.length === 5 && parts[0] === "x1") {
            const [, ephPubHex, ivHex, tagHex, cipherHex] = parts;

            /* Reconstruct ephemeral public key */
            const ephemeralPublicKey = crypto.createPublicKey({
                key: Buffer.from(ephPubHex, "hex"),
                format: "der",
                type: "spki",
            });

            /* ECDH: server_private × ephemeral_public → same shared secret */
            const sharedSecret = crypto.diffieHellman({
                privateKey: _getPrivateKey(),
                publicKey: ephemeralPublicKey,
            });

            /* Derive same AES key */
            const aesKey = _deriveAesKey(sharedSecret);

            /* AES-256-GCM decrypt (auth tag verified automatically) */
            const decipher = crypto.createDecipheriv(
                "aes-256-gcm",
                aesKey,
                Buffer.from(ivHex, "hex")
            );
            decipher.setAuthTag(Buffer.from(tagHex, "hex"));

            return Buffer.concat([
                decipher.update(Buffer.from(cipherHex, "hex")),
                decipher.final(),
            ]).toString("utf8");
        }

        /* Unknown format */
        console.error("❌ asymCrypto: Unknown encrypted data format");
        return null;
    } catch (err) {
        console.error("❌ asymCrypto sealDecrypt error:", err.message);
        return null;
    }
}

/* ============================================================
   DETECT if a value is in new X25519 format
   Used by migration script
   ============================================================ */
function isNewFormat(value) {
    return typeof value === "string" && value.startsWith("x1|");
}

/* ============================================================
   DETECT if a value is old AES-CBC format
   Old format was: ivHex:encryptedHex (2 parts, no pipe)
   ============================================================ */
function isOldFormat(value) {
    if (!value || typeof value !== "string") return false;
    if (value.includes("|")) return false;
    const parts = value.split(":");
    return parts.length === 2 && /^[0-9a-f]+$/i.test(parts[0]);
}

module.exports = {
    sealEncrypt,
    sealDecrypt,
    isNewFormat,
    isOldFormat,
    PUBLIC_KEY_HEX, // exported so generateKeys.js can verify
};
