const Database = require("better-sqlite3");
const fs = require("fs");
const path = require("path");
require("./loadEnv");

const dbPath = process.env.DATABASE_PATH || "./json.sqlite";

let db = null;

function getDb() {
    if (!db) {
        const dir = path.dirname(dbPath);
        if (dir && !fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        db = new Database(dbPath);
        db.pragma("journal_mode = WAL");
    }
    return db;
}

// Convert MySQL syntax queries to SQLite syntax
function formatSql(sql) {
    let formatted = sql;
    // Replace ON DUPLICATE KEY UPDATE in users (userId is PK)
    if (/INSERT INTO users/i.test(formatted) && /ON DUPLICATE KEY UPDATE/i.test(formatted)) {
        if (/activeApp/i.test(formatted)) {
            formatted = formatted.replace(/ON DUPLICATE KEY UPDATE.*/i, "ON CONFLICT(userId) DO UPDATE SET activeApp=excluded.activeApp, updatedAt=excluded.updatedAt");
        } else {
            formatted = formatted.replace(/ON DUPLICATE KEY UPDATE.*/i, "ON CONFLICT(userId) DO UPDATE SET updatedAt=excluded.updatedAt");
        }
    }
    // Replace ON DUPLICATE KEY UPDATE in user_keys (userId, appName is UNIQUE)
    if (/INSERT INTO user_keys/i.test(formatted) && /ON DUPLICATE KEY UPDATE/i.test(formatted)) {
        formatted = formatted.replace(/ON DUPLICATE KEY UPDATE.*/i, "ON CONFLICT(userId, appName) DO UPDATE SET `key`=excluded.`key`");
    }
    return formatted;
}

const pool = {
    async query(sql, params = []) {
        const sqlite = getDb();
        const formattedSql = formatSql(sql);
        const isSelect = /^\s*SELECT/i.test(formattedSql);

        const expectedParamsCount = (formattedSql.match(/\?/g) || []).length;
        const validParams = params.slice(0, expectedParamsCount);

        if (isSelect) {
            const rows = sqlite.prepare(formattedSql).all(...validParams);
            return [rows, []];
        } else {
            const info = sqlite.prepare(formattedSql).run(...validParams);
            return [{ affectedRows: info.changes, insertId: info.lastInsertRowid }, []];
        }
    },
    async getConnection() {
        return {
            query: this.query.bind(this),
            release: () => {}
        };
    }
};

async function initializeDB() {
    try {
        const sqlite = getDb();
        console.log("✅ SQLite Database Connected successfully:", dbPath);

        // Create users table
        sqlite.exec(`
            CREATE TABLE IF NOT EXISTS users (
                userId TEXT PRIMARY KEY,
                activeApp TEXT NULL,
                updatedAt TEXT NULL
            );
        `);

        // Create user_keys table
        sqlite.exec(`
            CREATE TABLE IF NOT EXISTS user_keys (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                userId TEXT NOT NULL,
                appName TEXT NOT NULL,
                \`key\` TEXT NOT NULL,
                UNIQUE(userId, appName),
                FOREIGN KEY (userId) REFERENCES users(userId) ON DELETE CASCADE
            );
        `);

        console.log("✅ SQLite tables initialized");
    } catch (err) {
        console.error("❌ SQLite Database initialization failed:", err);
        throw err;
    }
}

module.exports = {
    pool,
    initializeDB
};
