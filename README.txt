# Discord Seller Bot

High-performance Discord seller bot powered by SQLite (`json.sqlite`) and Discord.js v14.

## 🚀 Quick Start (1-Line Command)

```bash
npm install && node index.js
```

## 🛠️ Step-by-Step Setup

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Configure `.env`**:
   Copy `env.example` to `.env` and fill in your Discord credentials:
   ```env
   DISCORD_TOKEN=your_bot_token
   CLIENT_ID=your_client_id
   BASE_URL=https://authvaultix.com/api/seller/
   BOT_PRIVATE_KEY=your_private_key
   DATABASE_PATH=./json.sqlite
   ```

3. **Start the Bot**:
   ```bash
   node index.js
   ```

## ⚡ Features
- **SQLite Database**: Native `better-sqlite3` storage (`./json.sqlite`).
- **X25519 Encryption**: Asymmetric encryption for seller API keys.
- **MITM Protection**: TLS 1.2+ hardened client agent.
- **Redis Rate Limiting**: Built-in rate limiter with automatic offline fallback mode.
