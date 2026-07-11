const { SlashCommandBuilder, EmbedBuilder, Colors } = require("discord.js");
const axios = require("axios");
const { getActiveSellerKey } = require("../../utils/config");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("managerlist")
        .setDescription("📜 View all manager accounts registered under your seller"),

    async execute(interaction) {
        
        const sellerKey = await getActiveSellerKey(interaction.user.id);
        const BASE_URL = process.env.BASE_URL;

        // ❌ No key
        if (!sellerKey) {
            const noKey = new EmbedBuilder()
                .setDescription("❌ Seller key not configured. Use `/setsellerkey` first!")
                .setColor(Colors.Red)
                .setTimestamp()
                .setFooter({ text: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() });
            return interaction.reply({ embeds: [noKey] });
        }

        // ⏳ Loading message
        const loading = new EmbedBuilder()
            .setDescription("📥 Fetching manager accounts... Please wait.")
            .setColor(Colors.Yellow)
            .setTimestamp()
            .setFooter({ text: interaction.user.tag });
        await interaction.reply({ embeds: [loading] });

        try {
            const url = `${BASE_URL}?type=managerlist&sellerkey=${sellerKey}`;
            const res = await axios.get(url);

            // ❌ Failed
            if (!res.data.success) {
                const failed = new EmbedBuilder()
                    .setDescription(`❌ ${res.data.msg || "Failed to fetch managers."}`)
                    .setColor(Colors.Red)
                    .setTimestamp()
                    .setFooter({ text: interaction.user.tag });
                return interaction.editReply({ embeds: [failed] });
            }

            const managers = res.data.managers;

            // ⚠ No managers
            if (!managers || managers.length === 0) {
                const none = new EmbedBuilder()
                    .setDescription("⚠ No managers found!")
                    .setColor(Colors.Yellow)
                    .setTimestamp()
                    .setFooter({ text: interaction.user.tag });
                return interaction.editReply({ embeds: [none] });
            }

            // 🧾 Format manager list
            const formatted = managers
                .slice(0, 25)
                .map((m, i) => 
                    `**${i+1}. ${m.username}**\n📧 Email: ${m.email || "None"}\n📅 Created: ${m.created_at}`
                )
                .join("\n\n");

            const embed = new EmbedBuilder()
                .setTitle("🧾 Manager Accounts")
                .setDescription(`\`\`\`\n${formatted}\n\`\`\``)
                .setColor(Colors.Blue)
                .setTimestamp()
                .setFooter({ text: `Total Managers: ${managers.length}` });

            return interaction.editReply({ embeds: [embed] });

        } catch (err) {
            console.error(err);

            const apiError = new EmbedBuilder()
                .setDescription("⚠ API request failed — check console.")
                .setColor(Colors.Red)
                .setTimestamp()
                .setFooter({ text: interaction.user.tag });

            return interaction.editReply({ embeds: [apiError] });
        }
    }
};
