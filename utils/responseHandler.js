const { AsyncLocalStorage } = require("async_hooks");
const axios = require("axios");
const { EmbedBuilder, Colors } = require("discord.js");
const { pool } = require("./db");

async function getActiveApp(userId) {
    try {
        const [rows] = await pool.query("SELECT activeApp FROM users WHERE userId = ?", [userId]);
        if (rows.length > 0) {
            return rows[0].activeApp || null;
        }
        return null;
    } catch (err) {
        console.error("Error getting active app from DB:", err);
        return null;
    }
}

const asyncLocalStorage = new AsyncLocalStorage();

// Intercept Axios responses globally
axios.interceptors.response.use(
    (response) => {
        if (typeof response.data === "string" && response.data.toLowerCase().includes("disabled by app owner")) {
            const interaction = asyncLocalStorage.getStore();
            if (interaction) {
                interaction.lastApiError = response.data.trim();
            }
        }
        return response;
    },
    (error) => {
        if (error.response && typeof error.response.data === "string" && error.response.data.toLowerCase().includes("disabled by app owner")) {
            const interaction = asyncLocalStorage.getStore();
            if (interaction) {
                interaction.lastApiError = error.response.data.trim();
            }
        }
        return Promise.reject(error);
    }
);

/**
 * Patches interaction reply methods to intercept and beautify disabled API function messages.
 */
function patchInteraction(interaction) {
    const originalReply = interaction.reply;
    const originalEditReply = interaction.editReply;
    const originalFollowUp = interaction.followUp;
    const originalUpdate = interaction.update;

    const checkAndModifyOptions = (options) => {
        let isDisabled = false;
        let rawError = interaction.lastApiError;

        let stringifyOptions = "";
        try {
            stringifyOptions = JSON.stringify(options || {});
        } catch (e) {
            stringifyOptions = String(options || "");
        }

        const lower = stringifyOptions.toLowerCase();

        // 1. If the message explicitly contains "disabled by app owner"
        if (lower.includes("disabled by app owner")) {
            isDisabled = true;
            const match = stringifyOptions.match(/Seller \w+(?: \w+)* function disabled by app owner/i);
            if (match) {
                rawError = match[0];
            } else {
                rawError = "A required API function is disabled by the app owner.";
            }
        } 
        // 2. If we recorded a disabled API error, and the reply is a generic failure/crash response
        else if (rawError && (
            lower.includes("undefined") || 
            lower.includes("failed") || 
            lower.includes("error") || 
            lower.includes("invalid")
        )) {
            isDisabled = true;
        }

        if (isDisabled && rawError) {
            const disabledEmbed = new EmbedBuilder()
                .setTitle("Function Disabled")
                .setDescription(` \n\n** ** \`${rawError}\``)
                .setColor(Colors.Red)
                .setTimestamp()
                .setFooter({ text: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() });

            let newOptions = typeof options === "string" ? {} : { ...options };
            newOptions.embeds = [disabledEmbed];
            newOptions.content = undefined;
            newOptions.components = [];
            newOptions.files = [];

            return newOptions;
        }

        // --- INJECT ACTIVE APP NAME ---
        try {
            const activeApp = interaction.activeApp;
            if (activeApp) {
                if (typeof options === "string") {
                    options = `${options} (App: ${activeApp})`;
                } else if (options && typeof options === "object") {
                    if (options.content && typeof options.content === "string") {
                        if (!options.content.includes(`App: ${activeApp}`)) {
                            options.content = `${options.content} (App: ${activeApp})`;
                        }
                    }
                    
                    if (options.embeds && Array.isArray(options.embeds)) {
                        options.embeds = options.embeds.map(embed => {
                            let footerText = `App: ${activeApp}`;
                            let footerIcon = undefined;
                            
                            let existingFooterText = "";
                            if (typeof embed.data === "object" && embed.data.footer) {
                                existingFooterText = embed.data.footer.text || "";
                                footerIcon = embed.data.footer.icon_url || embed.data.footer.iconURL;
                            } else if (embed.footer) {
                                existingFooterText = embed.footer.text || "";
                                footerIcon = embed.footer.icon_url || embed.footer.iconURL;
                            }
                            
                            if (existingFooterText) {
                                if (!existingFooterText.includes(`App: ${activeApp}`)) {
                                    footerText = `${existingFooterText} | App: ${activeApp}`;
                                } else {
                                    footerText = existingFooterText;
                                }
                            }
                            
                            if (typeof embed.setFooter === "function") {
                                embed.setFooter({
                                    text: footerText,
                                    iconURL: footerIcon
                                });
                            } else {
                                if (typeof embed.data === "object") {
                                    embed.data.footer = {
                                        text: footerText,
                                        icon_url: footerIcon
                                    };
                                } else {
                                    embed.footer = {
                                        text: footerText,
                                        icon_url: footerIcon
                                    };
                                }
                            }
                            return embed;
                        });
                    }
                }
            }
        } catch (e) {
            console.error("Error injecting active app name:", e);
        }

        return options;
    };

    interaction.reply = function (options) {
        return originalReply.call(this, checkAndModifyOptions(options));
    };

    interaction.editReply = function (options) {
        return originalEditReply.call(this, checkAndModifyOptions(options));
    };

    interaction.followUp = function (options) {
        return originalFollowUp.call(this, checkAndModifyOptions(options));
    };

    interaction.update = function (options) {
        return originalUpdate.call(this, checkAndModifyOptions(options));
    };
}

module.exports = {
    asyncLocalStorage,
    patchInteraction,
    getActiveApp
};
