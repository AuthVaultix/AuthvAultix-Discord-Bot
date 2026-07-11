const { SlashCommandBuilder, EmbedBuilder, Colors } = require("discord.js");
const axios = require("axios");
const { getActiveSellerKey } = require("../../utils/config");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("exportused")
        .setDescription("Export all used license keys"),

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

        const url = `${BASE_URL}?type=exportused&sellerkey=${sellerKey}`;

        try {
            const res = await axios.get(url, { responseType: "text" });

            let output = res.data.trim();

            // ⚠ No used keys present
            if (!output || output.includes("No used licenses")) {
                const none = new EmbedBuilder()
                    .setDescription("⚠️ No used licenses found.")
                    .setColor(Colors.Yellow)
                    .setTimestamp()
                    .setFooter({ text: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() });

                return interaction.reply({ embeds: [none] });
            }

            // Trim huge response
            if (output.length > 1900) {
                output = output.slice(0, 1900) + "\n... (truncated)";
            }

            // 🟢 Success — Display keys
            const success = new EmbedBuilder()
                .setTitle("📤 Exported Used License Keys")
                .setDescription(`\`\`\`\n${output}\n\`\`\``)
                .setColor(Colors.Green)
                .setTimestamp()
                .setFooter({ text: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() });

            return interaction.reply({ embeds: [success] });

        } catch (err) {
            console.log(err);

            const apiError = new EmbedBuilder()
                .setDescription("❌ Failed to export used keys (API Error)")
                .setColor(Colors.Red)
                .setTimestamp()
                .setFooter({ text: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() });

            return interaction.reply({ embeds: [apiError] });
        }
    }
};
