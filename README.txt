# Discord Seller Bot

This repository contains a Discord seller bot. The actual bot code is inside the `bot/` folder.

## Setup

1. Open the workspace folder in your code editor.
2. Install dependencies in the `bot/` folder:

```bash
cd bot
npm install
```

3. Create a `.env` file in the workspace root (same folder as `README.txt`), or update the existing `.env` file with your configuration.

4. Required `.env` values:

```env
DISCORD_TOKEN=
CLIENT_ID=
SELLER_API_KEY=
BASE_URL=https://authvaultix.com/api/seller
ENCRYPT_KEY=6xT9wXqA1pLrN7dV4zQeB8MfR2yHc5kG

HOST=localhost
PORT=3306
USER=root
PASSWD=
DATABASE=
```

5. Start the bot from the workspace root:

```bash
run.bat
```

Or start directly from the `bot/` folder:

```bash
cd bot
node index.js
```

## Discord Developer Portal

1. Go to Discord Developer Portal.
2. Create a new application.
3. Open the "BOT" tab and add the bot.
4. Go to "OAuth2" -> "URL Generator".
5. Select scopes: `bot`, `application.commands`.
6. Select bot permissions: `Administrator`.
7. Copy the generated URL and authorize the bot to your server.
8. Type `/` in a channel to see available slash commands.

> Note: No `suno` file was found in the current repository.
