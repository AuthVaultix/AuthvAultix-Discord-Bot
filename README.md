# Authvaultix Discord Bot

The official Discord administration bot for the **Authvaultix** authentication and licensing platform. Built with **Discord.js v14**, **SQLite**, and **Redis**, providing sellers, resellers, and administrators with secure, high-performance command execution directly from Discord slash commands.

---

## Features

- **Asymmetric X25519 Cryptography**: Zero-knowledge encryption. Seller keys are encrypted client-side using an asymmetric curve (Curve25519) and decrypted strictly in-memory using your private server key.
- **Full Discord.js v14 Slash Commands**: Over 75 interactive slash commands organized into clean modules.
- **Embedded Response System**: Rich Discord embeds with standardized status formatting and auto-handling for disabled or throttled API states.
- **Multi-Tenant App Switching**: Manage multiple applications seamlessly (`/selectapp`, `/createapp`, `/deleteapp`).
- **Distributed Rate Limiter**: Redis-backed rate limiting (5 req/min with automatic timeout guards) that seamlessly falls back to in-memory limiting if Redis is unavailable.
- **MITM & API Tamper Protection**: Global HTTP client patching with strict TLS and HMAC request verification.
- **Docker Ready**: Complete multi-stage Docker build with bundled optional Redis container.

---

## Architecture & File Structure

```
Discord-Bot/
├── commands/               # 75 modular Discord slash commands
│   ├── Licenses/           # License key generation, validation, expiry, and export
│   ├── Logs/               # System & audit logs, IP-filtered deletion
│   ├── ResellerAndManager/ # Reseller and manager account management
│   ├── Sessions/           # Live session monitoring and kill switches
│   ├── Subscriptions/      # Subscription plan tiers and levels
│   ├── System/             # App selection, seller key configuration
│   ├── User/               # User creation, HWID management, ban/pause control
│   └── Variables/          # Global and per-user variables
├── scripts/
│   └── generateKeys.js     # Generates fresh X25519 keypair
├── utils/
│   ├── asymCrypto.js       # Asymmetric X25519 encryption & decryption
│   ├── config.js           # Centralized configuration loader
│   ├── db.js               # SQLite connection and query pool (better-sqlite3)
│   ├── loadCommands.js     # Recursive slash command registry loader
│   ├── loadEnv.js          # Environment variable initialization
│   ├── redisRateLimit.js   # Redis rate limiter with in-memory fallback
│   ├── responseHandler.js  # Embed builder and interaction response interceptor
│   └── secureClient.js     # Axios security layer (TLS, HMAC, MITM defense)
├── .dockerignore
├── .env.example
├── .gitignore
├── docker-compose.yml
├── Dockerfile
├── index.js                # Main bot entry point and Discord gateway client
├── package.json
└── README.md
```

---

## Prerequisites

- **Node.js**: v20.0.0 or higher
- **Discord Bot Application**: Create a bot at the [Discord Developer Portal](https://discord.com/developers/applications) with:
  - `bot` and `applications.commands` OAuth2 scopes
  - `Guilds` and `DirectMessages` Gateway intents enabled
- **Authvaultix API**: Running instance of Authvaultix Seller API

---

## Quick Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Generate Security Keys
Generate your X25519 cryptographic key pair:
```bash
npm run generate-keys
```
This command outputs:
- **`PUBLIC_KEY_HEX`**: Pre-configured in `utils/asymCrypto.js`.
- **`BOT_PRIVATE_KEY`**: Must be placed in your `.env` file.

### 3. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Fill in your configuration:
```env
# Discord Bot Credentials
DISCORD_TOKEN=your_discord_bot_token_here
CLIENT_ID=your_discord_client_id_here
BASE_URL=https://authvaultix.com/api/seller/

# X25519 Asymmetric Private Key (from generate-keys)
BOT_PRIVATE_KEY=your_generated_private_key_hex

# Database Configuration (SQLite)
TYPE=development
DATABASE_PATH=./json.sqlite

# Redis Rate Limiter (Optional - auto falls back if offline)
REDIS_URL=redis://127.0.0.1:6379
```

---

## Running the Bot

### Option A: Using Docker (Recommended for Production)
Start the bot and bundled Redis container:
```bash
docker compose up -d --build
```
View live logs:
```bash
docker compose logs -f
```
Stop the bot:
```bash
docker compose down
```

### Option B: Using Node.js
```bash
npm start
```

---

## Command Reference

### System & App Management
| Command | Description |
| :--- | :--- |
| `/setsellerkey` | Link or update your encrypted Authvaultix seller key |
| `/selectapp` | Switch the active working application |
| `/createapp` | Register a new application profile in the bot |
| `/deleteapp` | Remove an application profile |
| `/viewapps` | List all configured applications |

### License Management
| Command | Description |
| :--- | :--- |
| `/genkey` | Generate new licenses with customizable expiry, mask, and amount |
| `/verifylicense`| Inspect validity, usage status, and hardware binding |
| `/licenseinfo` | Retrieve comprehensive metadata for a license key |
| `/extendexpiry` | Add days to an existing license's validity |
| `/changesub` | Migrate a license to a different subscription level |
| `/setlicensenote`| Attach administrative notes to a license |
| `/delkey` | Delete a single license key |
| `/delsubkeys` | Purge all unused keys belonging to a subscription tier |
| `/exportkeys` | Export all licenses in plaintext or CSV format |
| `/exportused` | Export all activated licenses |
| `/exportunused`| Export all pending licenses |
| `/usedkeys` | List activated keys |

### User Management
| Command | Description |
| :--- | :--- |
| `/createuser` | Register a user account with subscription tier and expiry |
| `/userdata` | View user profile, registration date, and subscription state |
| `/userexists` | Check whether a username is registered |
| `/pauseuser` | Temporarily suspend user access |
| `/unpauseuser` | Reactivate a suspended user |
| `/banuser` | Permanently ban user account |
| `/unbanuser` | Remove a ban from a user |
| `/addhwid` | Manually bind an HWID to a user profile |
| `/resethwid` | Clear an existing HWID binding for a user |
| `/resethwidall`| Reset HWID locks across all registered users |
| `/extenduserexpiry`| Extend user subscription expiry duration |
| `/subtime` | Deduct time from user expiry duration |
| `/deluser` | Delete a user account |
| `/delexpired` | Cleanly purge expired accounts |

### Subscriptions
| Command | Description |
| :--- | :--- |
| `/listsubs` | List all available subscription tiers and privilege levels |
| `/createsub` | Create a new subscription tier |
| `/editsub` | Update subscription name or tier level |
| `/pausesub` | Temporarily pause an entire subscription tier |
| `/unpausesub` | Resume a paused subscription tier |
| `/delsub` | Delete a subscription tier |

### Variables
| Command | Description |
| :--- | :--- |
| `/addvar` | Create a global application variable |
| `/editvar` | Update a global variable value |
| `/retrvvar` | Retrieve a specific global variable |
| `/fetchallvars`| List all global application variables |
| `/delvar` | Delete a global variable |
| `/setvar` | Assign a per-user custom variable |
| `/edituservar` | Update a per-user custom variable |
| `/fetchauservars`| Retrieve all custom variables assigned to a user |
| `/deluservar` | Remove a custom variable from a user |

### Sessions & Security
| Command | Description |
| :--- | :--- |
| `/activecount` | View count of currently active online user sessions |
| `/getsessions` | List active sessions |
| `/endsession` | Terminate a specific user session |
| `/endallsessions`| Invalidate all active sessions globally |
| `/killsessionsip`| Invalidate all sessions originating from an IP address |

### Logs & Auditing
| Command | Description |
| :--- | :--- |
| `/getlogs` | Query recent system audit and security logs |
| `/clearlogs` | Clear all system logs with interactive confirmation |
| `/clearlogsip` | Remove logs associated with a specific IP address |

---

## Security Highlights

1. **Client-Side Curve25519 Encryption**: Keys entered by users are encrypted using the public key before writing to the database. Even if the SQLite file is leaked, keys cannot be decrypted without the private key in `.env`.
2. **Authenticated Encryption (AES-256-GCM)**: Decrypted payloads verify authentication tags to prevent ciphertext tampering.
3. **No Database Credential Leaks**: `.gitignore` and `.dockerignore` prevent `json.sqlite` and `.env` files from ever entering git commits or container layers.

---

## License

This project is part of the **Authvaultix** organization. Distributed under the **Elastic License 2.0**. See [LICENSE.txt](LICENSE.txt) for details.
