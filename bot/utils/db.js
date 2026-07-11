const mysql = require("mysql2/promise");
const fs = require("fs");
const path = require("path");
require("./loadEnv");

const dbHost = process.env.HOST === "localhost" ? "127.0.0.1" : process.env.HOST;

const pool = mysql.createPool({
    host: dbHost,
    user: process.env.USER,
    password: process.env.PASSWD,
    database: process.env.DATABASE,
    port: process.env.PORT ? parseInt(process.env.PORT) : undefined,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

async function migrateJsonToMysql() {
    const configPath = path.join(__dirname, "..", "config.json");
    if (!fs.existsSync(configPath)) {
        return;
    }
    
    console.log("⏳ Found config.json. Starting migration to MySQL...");
    try {
        const fileContent = fs.readFileSync(configPath, "utf8");
        const data = JSON.parse(fileContent);
        
        for (const userId of Object.keys(data)) {
            const user = data[userId];
            const activeApp = user.activeApp || null;
            const updatedAt = user.updatedAt || new Date().toISOString();
            
            // Insert user
            await pool.query(
                "INSERT INTO users (userId, activeApp, updatedAt) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE activeApp = ?, updatedAt = ?",
                [userId, activeApp, updatedAt, activeApp, updatedAt]
            );
            
            // Insert keys
            if (Array.isArray(user.keys)) {
                for (const keyObj of user.keys) {
                    await pool.query(
                        "INSERT INTO user_keys (userId, appName, `key`) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE `key` = ?",
                        [userId, keyObj.appName, keyObj.key, keyObj.key]
                    );
                }
            }
        }
        
        console.log("✅ Migration completed successfully!");
        
        // Backup config.json
        const backupPath = path.join(__dirname, "..", "config.json.bak");
        fs.renameSync(configPath, backupPath);
        console.log(`📦 Backed up config.json to config.json.bak`);
    } catch (err) {
        console.error("❌ Failed to migrate config.json to MySQL:", err);
    }
}

async function initializeDB() {
    try {
        const dbName = process.env.DB_DATABASE || "bot_db";
        
        // Check if database exists, create if missing
        try {
            const tempConnection = await pool.getConnection();
            tempConnection.release();
        } catch (err) {
            if (err.errno === 1049 || err.code === "ER_BAD_DB_ERROR") {
                console.log(`🔌 Database "${dbName}" does not exist. Creating it...`);
                const initPool = mysql.createPool({
                    host: process.env.HOST || "localhost",
                    user: process.env.USER || "root",
                    password: process.env.PASSWD || "",
                    port: parseInt(process.env.PORT || "3306")
                });
                await initPool.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
                await initPool.end();
                console.log(`✅ Database "${dbName}" created successfully.`);
            } else {
                throw err;
            }
        }

        const connection = await pool.getConnection();
        console.log("✅ MySQL Database Connected successfully");
        
        // Create users table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS users (
                userId VARCHAR(64) PRIMARY KEY,
                activeApp VARCHAR(255) NULL,
                updatedAt VARCHAR(64) NULL
            )
        `);
        
        // Create user_keys table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS user_keys (
                id INT AUTO_INCREMENT PRIMARY KEY,
                userId VARCHAR(64) NOT NULL,
                appName VARCHAR(255) NOT NULL,
                \`key\` TEXT NOT NULL,
                UNIQUE KEY unique_user_app (userId, appName),
                FOREIGN KEY (userId) REFERENCES users(userId) ON DELETE CASCADE
            )
        `);
        
        connection.release();
        console.log("✅ MySQL tables initialized");
        
        // Migrate config.json data if exists
        await migrateJsonToMysql();
    } catch (err) {
        console.error("❌ MySQL Database initialization failed:", err);
        throw err;
    }
}

module.exports = {
    pool,
    initializeDB
};
