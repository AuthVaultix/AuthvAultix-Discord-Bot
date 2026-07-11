const { SlashCommandBuilder, EmbedBuilder, Colors } = require("discord.js");
const axios = require("axios");
const { getActiveSellerKey } = require("../../utils/config");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("usedkeys")
        .setDescription("Retrieve all used license keys with details"),

    async execute(interaction) {

        const sellerKey = await getActiveSellerKey(interaction.user.id);
        const BASE_URL = process.env.BASE_URL;

        // ❌ No key set
        if (!sellerKey) {
            const noKey = new EmbedBuilder()
                .setDescription("❌ Seller key not set. Use `/setsellerkey` first.")
                .setColor(Colors.Red)
                .setTimestamp()
                .setFooter({ text: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() });

            return interaction.reply({ embeds: [noKey] });
        }

        const url = `${BASE_URL}?type=usedkeys&sellerkey=${sellerKey}`;

        try {
            const res = await axios.get(url);

            // ❌ API says failed
            if (!res.data.success) {
                const fail = new EmbedBuilder()
                    .setDescription("❌ Failed to fetch used license keys.")
                    .setColor(Colors.Red)
                    .setTimestamp()
                    .setFooter({ text: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() });

                return interaction.reply({ embeds: [fail] });
            }

            const keys = res.data.used_keys;

            // ⚠ No used keys found
            if (!keys || keys.length === 0) {
                const empty = new EmbedBuilder()
                    .setDescription("⚠️ No used keys found.")
                    .setColor(Colors.Yellow)
                    .setTimestamp()
                    .setFooter({ text: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() });

                return interaction.reply({ embeds: [empty] });
            }

            // Format key list
            let output = keys.map(k =>
                `${k.license_key}  |  UsedAt: ${k.used_at}  |  Note: ${k.note || "None"}`
            ).join("\n");

            if (output.length > 1900) output = output.slice(0, 1900) + "\n... (truncated)";

            const success = new EmbedBuilder()
                .setTitle("🔑 Used License Keys")
                .setDescription(`\`\`\`\n${output}\n\`\`\``)
                .setColor(Colors.Green)
                .setTimestamp()
                .setFooter({ text: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() });

            return interaction.reply({ embeds: [success] });

        } catch (err) {
            console.log(err);

            const apiError = new EmbedBuilder()
                .setDescription("❌ API request failed — Check console.")
                .setColor(Colors.Red)
                .setTimestamp()
                .setFooter({ text: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() });

            return interaction.reply({ embeds: [apiError] });
        }
    }
};
