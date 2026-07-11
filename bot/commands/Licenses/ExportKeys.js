const { SlashCommandBuilder, AttachmentBuilder, EmbedBuilder, Colors } = require("discord.js");
const axios = require("axios");
const { getActiveSellerKey } = require("../../utils/config");
const fs = require("fs");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("exportkeys")
        .setDescription("Export all license keys in TEXT or CSV format")
        .addStringOption(o =>
            o.setName("format")
                .setDescription("Choose export format")
                .addChoices(
                    { name: "Text Export", value: "text" },
                    { name: "CSV Export", value: "csv" }
                )
                .setRequired(true)
        ),

    async execute(interaction) {

        const sellerKey = await getActiveSellerKey(interaction.user.id);
        const BASE_URL = process.env.BASE_URL;

        // ❌ No Seller Key
        if (!sellerKey) {
            const noKey = new EmbedBuilder()
                .setDescription("❌ Seller key not set. Use `/setsellerkey` first.")
                .setColor(Colors.Red)
                .setTimestamp()
                .setFooter({ text: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() });

            return interaction.reply({ embeds: [noKey] });
        }

        const format = interaction.options.getString("format");
        const url = `${BASE_URL}?type=exportkeys&sellerkey=${sellerKey}&format=${format}`;

        try {
            const res = await axios.get(url, { responseType: "text" });

            // ========================================
            // 📤 CSV EXPORT
            // ========================================
            if (format === "csv") {
                const filePath = "./export.csv";
                fs.writeFileSync(filePath, res.data);

                const file = new AttachmentBuilder(filePath);
                const embed = new EmbedBuilder()
                    .setTitle("📤 CSV Export Ready")
                    .setDescription("Your license keys have been exported as `.csv`.\nClick to download below.")
                    .setColor(Colors.Green)
                    .setTimestamp()
                    .setFooter({ text: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() });

                await interaction.reply({ embeds: [embed], files: [file] });
                fs.unlinkSync(filePath);
                return;
            }

            // ========================================
            // 📄 TEXT EXPORT
            // ========================================
            const text = res.data || "No keys found.";

            const embed = new EmbedBuilder()
                .setTitle("📄 License Export Complete")
                .setDescription(`\`\`\`\n${text}\n\`\`\``)
                .setColor(Colors.Green)
                .setTimestamp()
                .setFooter({ text: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() });

            return interaction.reply({ embeds: [embed] });

        } catch (err) {
            console.log(err);

            const apiError = new EmbedBuilder()
                .setDescription("❌ Export failed. API Request Error.")
                .setColor(Colors.Red)
                .setTimestamp()
                .setFooter({ text: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() });

            return interaction.reply({ embeds: [apiError] });
        }
    }
};
