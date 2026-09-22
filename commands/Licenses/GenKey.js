const { SlashCommandBuilder, EmbedBuilder, Colors, AttachmentBuilder } = require("discord.js");
const axios = require("axios");
const { getActiveSellerKey } = require("../../utils/config");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("genkey")
        .setDescription("Generate a license key")
        .addIntegerOption(o =>
            o.setName("amount")
                .setDescription("How many keys to generate?")
                .setRequired(true)
        )
        .addIntegerOption(o =>
            o.setName("expiry")
                .setDescription("Expiry days")
                .setRequired(true)
        )
        .addStringOption(o =>
            o.setName("mask")
                .setDescription("License mask (Default: ******-******-******)")
                .setRequired(false)
        )
        .addStringOption(o =>
            o.setName("subscription")
                .setDescription("Subscription name (Default: default)")
                .setRequired(false)
        ),

    async execute(interaction) {

        const sellerKey = await getActiveSellerKey(interaction.user.id);

        // ❌ Seller Key Missing
        if (!sellerKey) {
            const noKey = new EmbedBuilder()
                .setDescription("❌ Seller key not set. Use `/setsellerkey` first.")
                .setColor(Colors.Red)
                .setTimestamp()
                .setFooter({ text: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() });

            return interaction.reply({ embeds: [noKey] });
        }

        const BASE_URL = process.env.BASE_URL;
        const amount = interaction.options.getInteger("amount");
        const expiry = interaction.options.getInteger("expiry");
        const rawMask = interaction.options.getString("mask");
        const mask = (!rawMask || rawMask.trim() === "" || rawMask.toLowerCase() === "default" || rawMask.toLowerCase() === "none")
            ? "******-******-******"
            : rawMask.trim();
        const rawSub = interaction.options.getString("subscription");
        const sub = (!rawSub || rawSub.trim() === "")
            ? "default"
            : rawSub.trim();

        const baseUrl = BASE_URL.endsWith("/") ? BASE_URL : `${BASE_URL}/`;
        const url =
            `${baseUrl}?type=genkey&sellerkey=${sellerKey}` +
            `&subscription=${encodeURIComponent(sub)}&expiry=${expiry}&amount=${amount}` +
            `&mask=${encodeURIComponent(mask)}&format=text`;

        try {
            const res = await axios.get(url);

            // Handle possible JSON error response
            if (typeof res.data === "object") {
                if (!res.data.success) {
                    const fail = new EmbedBuilder()
                        .setDescription(`❌ ${res.data.msg || res.data.message || "Failed to generate keys."}`)
                        .setColor(Colors.Red)
                        .setTimestamp()
                        .setFooter({ text: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() });

                    return interaction.reply({ embeds: [fail] });
                }
            }

            let rawKeys = typeof res.data === "string" ? res.data.trim() : "";

            // Check if returned text is an error string
            if (
                rawKeys.toLowerCase().includes("subscription not found") ||
                rawKeys.toLowerCase().includes("invalid seller key") ||
                rawKeys.toLowerCase().startsWith("error")
            ) {
                const fail = new EmbedBuilder()
                    .setDescription(`❌ ${rawKeys}`)
                    .setColor(Colors.Red)
                    .setTimestamp()
                    .setFooter({ text: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() });

                return interaction.reply({ embeds: [fail] });
            }

            let keys = rawKeys;
            const files = [];

            if (keys.length > 950) {
                files.push(new AttachmentBuilder(Buffer.from(keys, "utf-8"), { name: "generated_keys.txt" }));
                keys = keys.slice(0, 950) + "\n... (truncated - full list attached)";
            }

            const success = new EmbedBuilder()
                .setTitle("🎉 License Keys Generated Successfully!")
                .addFields(
                    { name: "Amount", value: `${amount}`, inline: true },
                    { name: "Expiry (Days)", value: `${expiry}`, inline: true },
                    { name: "Subscription", value: sub, inline: true },
                    { name: "Mask", value: `\`${mask}\``, inline: true },
                    { name: "Generated Keys", value: `||\`\`\`\n${keys}\n\`\`\`||` }
                )
                .setColor(Colors.Green)
                .setTimestamp()
                .setFooter({ text: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() });

            return interaction.reply({ embeds: [success], files });

        } catch (err) {
            console.log(err);

            const apiError = new EmbedBuilder()
                .setDescription("❌ API error while generating keys.")
                .setColor(Colors.Red)
                .setTimestamp()
                .setFooter({ text: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() });

            return interaction.reply({ embeds: [apiError] });
        }
    }
};
