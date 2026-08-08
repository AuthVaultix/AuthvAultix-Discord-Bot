require("./utils/loadEnv");
// 🔐 MITM Protection — MUST be required FIRST before any axios usage
// Patches global axios: strict TLS, HMAC signing, cert pinning
require("./utils/secureClient");
// 🛑 Redis Rate Limiter — 5 req/min, 60s ban on exceed (persistent across restarts)
const { checkRateLimit } = require("./utils/redisRateLimit");
const { 
    Client, 
    GatewayIntentBits, 
    REST, 
    Routes, 
    EmbedBuilder, 
    Colors 
} = require("discord.js");

// Centralized API disabled handler
const { asyncLocalStorage, patchInteraction, getActiveApp } = require("./utils/responseHandler");
const { initializeDB } = require("./utils/db");

const { loadCommands } = require("./utils/loadCommands");

const axios = require("axios");

/* ======================================
   DISCORD CLIENT
====================================== */
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.DirectMessages
    ],
    partials: ["CHANNEL"]
});

const TOKEN     = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
let SELLERKEY   = process.env.SELLER_API_KEY;
const BASE_URL  = process.env.BASE_URL;

/* ======================================
   LOAD SLASH COMMANDS
====================================== */
const commandsJSON = loadCommands(client);
const rest = new REST({ version: "10" }).setToken(TOKEN);

/* ======================================
   REGISTER SLASH COMMANDS
====================================== */
(async () => {
    try {
        console.log("⏳ Updating slash commands...");
        await rest.put(
            Routes.applicationCommands(CLIENT_ID),
            { body: commandsJSON }
        );
        console.log("✅ Slash Commands Updated!");
    } catch (error) {
        console.error("Slash Command Error:", error);
    }
})();

/* ======================================
   AUTO CREATE ROLE ON SERVER JOIN
====================================== */
client.on("guildCreate", async guild => {
    let role = guild.roles.cache.find(r => r.name === "perms");

    if (!role) {
        role = await guild.roles.create({
            name: "perms",
            color: "Blue",
            permissions: []
        });

        console.log(`✔ Created role "perms" in ${guild.name}`);
    }

    try {
        let owner = await guild.fetchOwner();
        await owner.roles.add(role);
        console.log(`⚡ Owner given 'perms' role automatically`);
    } catch {
        console.log(`⚠ Failed to give owner perms role`);
    }
});

/* ======================================
   HANDLE COMMANDS
====================================== */
const { switchActiveApp, deleteUserApp } = require("./utils/config");

client.on("interactionCreate", async interaction => {
    // Staff-to-Owner mapping: If in a guild and user has 'perms' role, map to ownerId
    if (interaction.guild && interaction.user.id !== interaction.guild.ownerId) {
        const permsRole = interaction.guild.roles.cache.find(r => r.name === "perms");
        const hasPerms = interaction.member?.roles?.cache?.has(permsRole?.id);
        if (hasPerms) {
            Object.defineProperty(interaction.user, "id", {
                value: interaction.guild.ownerId,
                writable: true,
                configurable: true
            });
        }
    }

    // Fetch active app name and store it on interaction
    let activeApp = null;
    try {
        activeApp = await getActiveApp(interaction.user.id);
    } catch (e) {
        console.error("Error fetching active app name for interaction:", e);
    }
    interaction.activeApp = activeApp;

    // Patch interaction for premium API response handling
    patchInteraction(interaction);

    /* ===============================
       🔘 BUTTON HANDLER
    =============================== */
    if (interaction.isButton()) {

        if (interaction.customId === "open_switchapp") {
            return interaction.reply({
                content: "👉 Please use `/switchapp` to select your active application.",
                flags: 64 // ephemeral
            });
        }

        return;
    }

    /* ===============================
       📋 SELECT MENU (switchapp & deleteapp)
    =============================== */
    if (interaction.isStringSelectMenu()) {

        if (interaction.customId === "switchapp_select") {
            const appName = interaction.values[0];
            const userId = interaction.user.id;

            await switchActiveApp(userId, appName);

            return interaction.update({
                embeds: [
                    new EmbedBuilder()
                        .setColor(Colors.Green)
                        .setTitle("✅ Application Selected")
                        .setDescription(`Active application set to **${appName}**`)
                        .setTimestamp()
                ],
                components: []
            });
        }

        if (interaction.customId === "deleteapp_select") {
            const appName = interaction.values[0];
            const userId = interaction.user.id;

            const res = await deleteUserApp(userId, appName);

            if (!res.success) {
                return interaction.update({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(Colors.Red)
                            .setTitle("❌ Delete Failed")
                            .setDescription(`Failed to delete application **${appName}**.`)
                    ],
                    components: []
                });
            }

            let desc = `Application **${appName}** has been deleted successfully.`;
            if (res.newActiveApp) {
                desc += `\n\n🔄 Active application automatically switched to **${res.newActiveApp}**.`;
            } else {
                desc += `\n\n⚠️ No active application remaining. Use \`/setsellerkey\` to add a new key.`;
            }

            return interaction.update({
                embeds: [
                    new EmbedBuilder()
                        .setColor(Colors.Orange)
                        .setTitle("🗑️ Application Deleted")
                        .setDescription(desc)
                        .setTimestamp()
                ],
                components: []
            });
        }

        return;
    }

    /* ===============================
       ⌨️ SLASH COMMANDS
    =============================== */
    if (!interaction.isChatInputCommand()) return;

    const command = interaction.client.commands.get(interaction.commandName);
    if (!command) {
        return interaction.reply({
            content: "❌ Unknown command",
            flags: 64
        });
    }

    /* ===============================
       💬 DM — ALLOWED FOR ALL
       (ID mapping is guild-only, so in DMs
        no owner can access another owner's apps.
        Seller key checks will handle access control themselves.)
    =============================== */
    if (!interaction.guild) {

        /* 🛑 Redis Rate limit check — DM commands */
        const dmLimit = await checkRateLimit(interaction.user.id);
        if (!dmLimit.allowed) {
            const desc = dmLimit.banned
                ? `🚫 You have been **temporarily banned** for sending too many commands.\n\nPlease wait **${dmLimit.retryAfterSec}s** before trying again.`
                : `⏱️ You are sending commands too fast.\n\nPlease wait **${dmLimit.retryAfterSec}s** before trying again.`;
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle(dmLimit.banned ? "🚫 Temporarily Banned" : "⏱️ Rate Limited")
                        .setDescription(desc)
                        .setColor(dmLimit.banned ? Colors.Red : Colors.Orange)
                        .setFooter({ text: `Limit: 5 commands / 60s` })
                        .setTimestamp()
                ],
                flags: 64
            });
        }

        try {
            await asyncLocalStorage.run(interaction, () => command.execute(interaction, { axios }));
        } catch (err) {
            console.error(err);
            logError("DMCommandError", err);
            try {
                const msg = `⚠️ DM command error (App: ${interaction.activeApp || "None"})`;
                if (interaction.deferred || interaction.replied) {
                    await interaction.editReply({ content: msg });
                } else {
                    await interaction.reply({ content: msg, flags: 64 });
                }
            } catch (replyErr) {
                console.error("❌ Failed to send DM command error reply:", replyErr);
            }
        }
        return;
    }

    /* ===============================
       🛡 ROLE CHECK
    =============================== */
    const permsRole = interaction.guild.roles.cache.find(r => r.name === "perms");
    const hasPerms = interaction.member.roles.cache.has(permsRole?.id);

    if (!hasPerms) {
        return interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setTitle("🚫 Permissions required")
                    .setDescription("You must have the `perms` role to use this command.")
                    .setColor(Colors.Red)
            ],
            flags: 64
        });
    }

    /* ===============================
       🚀 EXECUTE COMMAND
    =============================== */
    /* 🛑 Redis Rate limit check — Guild commands */
    const guildLimit = await checkRateLimit(interaction.user.id);
    if (!guildLimit.allowed) {
        const desc = guildLimit.banned
            ? `🚫 You have been **temporarily banned** for sending too many commands.\n\nPlease wait **${guildLimit.retryAfterSec}s** before trying again.`
            : `⏱️ You are sending commands too fast.\n\nPlease wait **${guildLimit.retryAfterSec}s** before trying again.`;
        return interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setTitle(guildLimit.banned ? "🚫 Temporarily Banned" : "⏱️ Rate Limited")
                    .setDescription(desc)
                    .setColor(guildLimit.banned ? Colors.Red : Colors.Orange)
                    .setFooter({ text: `Limit: 5 commands / 60s` })
                    .setTimestamp()
            ],
            flags: 64
        });
    }

        try {
            await asyncLocalStorage.run(interaction, () => command.execute(interaction, { axios }));
        } catch (err) {
            console.error(err);
            logError("GuildCommandError", err);
            try {
                const errorEmbed = new EmbedBuilder()
                    .setDescription("⚠️ Error executing command")
                    .setColor(Colors.Red);

                if (interaction.deferred || interaction.replied) {
                    await interaction.editReply({ embeds: [errorEmbed] });
                } else {
                    await interaction.reply({ embeds: [errorEmbed], flags: 64 });
                }
            } catch (replyErr) {
                console.error("❌ Failed to send command error reply:", replyErr);
            }
        }
});



/* ======================================
   LOGIN
====================================== */
(async () => {
    try {
        await initializeDB();
    } catch (err) {
        console.error("❌ Failed to initialize SQLite database, exiting...", err);
        process.exit(1);
    }
    client.login(TOKEN);
})();

/* ======================================
   GLOBAL ERROR HANDLERS & LOGGING
====================================== */
const fs = require("fs");
const path = require("path");

const LOGS_DIR = path.join(__dirname, "logs");
if (!fs.existsSync(LOGS_DIR)) {
    fs.mkdirSync(LOGS_DIR);
}

function logError(type, error) {
    const timestamp = new Date().toISOString();
    const errorMessage = error?.stack || error?.message || String(error);
    const logLine = `[${timestamp}] [${type}] ${errorMessage}\n\n`;
    try {
        fs.appendFileSync(path.join(LOGS_DIR, "error.log"), logLine);
    } catch (err) {
        console.error("Failed to write to log file:", err);
    }
}

process.on("unhandledRejection", error => {
    console.error("❌ Unhandled promise rejection:", error);
    logError("UnhandledRejection", error);
});

process.on("uncaughtException", error => {
    console.error("❌ Uncaught exception:", error);
    logError("UncaughtException", error);
});

client.on("error", error => {
    console.error("❌ Discord client error:", error);
    logError("ClientError", error);
});

client.rest.on("error", error => {
    console.error("❌ Discord REST client error:", error);
    logError("RestClientError", error);
});



