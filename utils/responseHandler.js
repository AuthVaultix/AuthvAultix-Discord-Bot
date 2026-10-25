const { AsyncLocalStorage } = require("async_hooks");
const axios = require("axios");
const { EmbedBuilder, Colors } = require("discord.js");
const { pool } = require("./db");
const { deleteUserApp } = require("./config");

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

function extractApiDetails(data) {
    if (!data) return null;
    let parsed = data;
    if (typeof data === "string") {
        try {
            parsed = JSON.parse(data.trim());
        } catch (_) {
            return { raw: data.trim(), message: data.trim(), success: false };
        }
    }
    if (parsed && typeof parsed === "object") {
        const msg = parsed.message || parsed.msg || parsed.error || null;
        const isSuccess = parsed.success === true || parsed.success === "true";
        return { raw: data, message: msg, success: isSuccess, obj: parsed };
    }
    return null;
}

async function processApiResponse(data) {
    const details = extractApiDetails(data);
    if (!details) return;

    const interaction = asyncLocalStorage.getStore();
    if (!interaction) return;

    const lowerMsg = (details.message || "").toLowerCase();
    const rawStr = typeof details.raw === "string" ? details.raw.toLowerCase() : "";

    // 1. Function disabled by app owner
    if (lowerMsg.includes("disabled by app owner") || rawStr.includes("disabled by app owner")) {
        interaction.lastApiError = details.message || details.raw;
        interaction.isDisabledApi = true;
    }

    // 2. Invalid seller key -> Auto delete the invalid app and alert
    if (lowerMsg.includes("invalid seller key") || rawStr.includes("invalid seller key")) {
        interaction.lastApiError = details.message || "Invalid seller key";
        interaction.isInvalidSellerKey = true;

        try {
            const activeApp = interaction.activeApp || (await getActiveApp(interaction.user.id));
            if (activeApp) {
                const delRes = await deleteUserApp(interaction.user.id, activeApp);
                if (delRes && delRes.success) {
                    interaction.deletedApp = activeApp;
                    interaction.newActiveApp = delRes.newActiveApp;
                    interaction.activeApp = delRes.newActiveApp || null;
                }
            }
        } catch (dbErr) {
            console.error("Error auto-deleting app with invalid seller key:", dbErr);
        }
    }

    // Record last API message for all failures if not successful
    if (!details.success && details.message) {
        interaction.lastApiMessage = details.message;
    }
}

// Intercept Axios responses globally
axios.interceptors.response.use(
    async (response) => {
        await processApiResponse(response.data);
        return response;
    },
    async (error) => {
        if (error.response) {
            await processApiResponse(error.response.data);
        }
        return Promise.reject(error);
    }
);

/**
 * Patches interaction reply methods to intercept and beautify API responses.
 */
function patchInteraction(interaction) {
    const originalReply = interaction.reply;
    const originalEditReply = interaction.editReply;
    const originalFollowUp = interaction.followUp;
    const originalUpdate = interaction.update;

    const checkAndModifyOptions = (options) => {
        let rawError = interaction.lastApiError;

        let stringifyOptions = "";
        try {
            stringifyOptions = JSON.stringify(options || {});
        } catch (e) {
            stringifyOptions = String(options || "");
        }

        const lower = stringifyOptions.toLowerCase();

        // 1. Invalid Seller Key Handling (Auto-deleted app embed)
        if (interaction.isInvalidSellerKey) {
            let desc = `Server Response: **${interaction.lastApiError || "Invalid seller key"}**`;
            if (interaction.deletedApp) {
                desc += `\n\n🗑️ Application **${interaction.deletedApp}** has an invalid seller key and was automatically removed from your account.`;
                if (interaction.newActiveApp) {
                    desc += `\n🔄 Active application switched to **${interaction.newActiveApp}**.`;
                } else {
                    desc += `\n⚠️ You have no more registered apps. Use \`/setsellerkey\` to set a valid key.`;
                }
            } else {
                desc += `\n\nPlease use \`/setsellerkey\` to register a valid seller key.`;
            }

            const invalidEmbed = new EmbedBuilder()
                .setTitle("❌ Invalid Seller Key")
                .setDescription(desc)
                .setColor(Colors.Red)
                .setTimestamp()
                .setFooter({ text: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() });

            let newOptions = typeof options === "string" ? {} : { ...options };
            newOptions.embeds = [invalidEmbed];
            newOptions.content = undefined;
            newOptions.components = [];
            newOptions.files = [];
            return newOptions;
        }

        // 2. Disabled Function Handling
        let isDisabled = false;
        if (lower.includes("disabled by app owner")) {
            isDisabled = true;
            const match = stringifyOptions.match(/Seller \w+(?: \w+)* function disabled by app owner/i);
            if (match) {
                rawError = match[0];
            } else {
                rawError = "A required API function is disabled by the app owner.";
            }
        } else if (rawError && (
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

        // 3. Generic failure override if real API error message was captured
        if (interaction.lastApiMessage && (
            lower.includes("check console") || 
            lower.includes("api request failed") ||
            lower.includes("undefined")
        )) {
            const apiErrorEmbed = new EmbedBuilder()
                .setTitle("API Error")
                .setDescription(`❌ **${interaction.lastApiMessage}**`)
                .setColor(Colors.Red)
                .setTimestamp()
                .setFooter({ text: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() });

            let newOptions = typeof options === "string" ? {} : { ...options };
            newOptions.embeds = [apiErrorEmbed];
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
