const { SlashCommandBuilder, EmbedBuilder, Colors } = require("discord.js");
const axios = require("axios");
const { getActiveSellerKey } = require("../../utils/config");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("exportunused")
        .setDescription("Export all unused license keys"),

    async execute(interaction) {

        const sellerKey = await getActiveSellerKey(interaction.user.id);
        const BASE_URL = process.env.BASE_URL;

        // ❌ No seller key
        if (!sellerKey) {
            const noKey = new EmbedBuilder()
                .setDescription("❌ Seller key not set. Use `/setsellerkey` first.")
                .setColor(Colors.Red)
                .setTimestamp()
                .setFooter({ text: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() });

            return interaction.reply({ embeds: [noKey] });
        }

        const url = `${BASE_URL}?type=exportunused&sellerkey=${sellerKey}`;

        try {
            const res = await axios.get(url, { responseType: "text" });

            let output = res.data.trim();

            // ⚠ No unused keys
            if (!output || output.includes("No unused licenses")) {
                const none = new EmbedBuilder()
                    .setDescription("⚠️ No unused licenses found.")
                    .setColor(Colors.Yellow)
                    .setTimestamp()
                    .setFooter({ text: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() });

                return interaction.reply({ embeds: [none] });
            }

            // Trim if too long
            if (output.length > 1900) {
                output = output.slice(0, 1900) + "\n... (truncated)";
            }

            // 🟢 Success Export
            const success = new EmbedBuilder()
                .setTitle("📤 Exported Unused License Keys")
                .setDescription(`\`\`\`\n${output}\n\`\`\``)
                .setColor(Colors.Green)
                .setTimestamp()
                .setFooter({ text: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() });

            return interaction.reply({ embeds: [success] });

        } catch (err) {
            console.error(err);

            const apiError = new EmbedBuilder()
                .setDescription("❌ Failed to export unused keys (API Error)")
                .setColor(Colors.Red)
                .setTimestamp()
                .setFooter({ text: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() });

            return interaction.reply({ embeds: [apiError] });
        }
    }
};
