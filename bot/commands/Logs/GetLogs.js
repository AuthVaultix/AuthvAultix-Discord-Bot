const { SlashCommandBuilder, EmbedBuilder, Colors } = require("discord.js");
const axios = require("axios");
const { getActiveSellerKey } = require("../../utils/config");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("getlogs")
        .setDescription("Retrieve all logs with IP, user & timestamp"),

    async execute(interaction) {

        const sellerKey = await getActiveSellerKey(interaction.user.id);
        const BASE_URL = process.env.BASE_URL;

        // ❌ If no seller key is found
        if (!sellerKey) {
            const noKey = new EmbedBuilder()
                .setDescription("❌ Seller key not set. Use `/setsellerkey` first.")
                .setColor(Colors.Red)
                .setTimestamp()
                .setFooter({ text: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() });
            return interaction.reply({ embeds: [noKey] });
        }

        const url = `${BASE_URL}?type=getlogs&sellerkey=${sellerKey}&format=json`;

        try {
            const res = await axios.get(url);

            // ❌ If API returns false
            if (!res.data.success) {
                const failed = new EmbedBuilder()
                    .setDescription("❌ Failed to fetch logs.")
                    .setColor(Colors.Red)
                    .setTimestamp()
                    .setFooter({ text: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() });
                return interaction.reply({ embeds: [failed] });
            }

            const logs = res.data.logs;

            // ⚠ No logs available
            if (!logs || logs.length === 0) {
                const empty = new EmbedBuilder()
                    .setDescription("⚠ No logs found.")
                    .setColor(Colors.Yellow)
                    .setTimestamp()
                    .setFooter({ text: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() });
                return interaction.reply({ embeds: [empty] });
            }

            // Format logs (limit 25)
            let formatted = logs.slice(0, 25).map(l => 
                `📝 **LogID:** ${l.id}\n👤 User: ${l.user_id}\n🌐 IP: ${l.ip_address}\n💻 PC: ${l.pcuser}\n📅 Date: ${l.logdate}\n───`
            ).join("\n");

            if (logs.length > 25) {
                formatted += `\n📌 Showing **25 out of ${logs.length}+ logs**`;
            }

            const success = new EmbedBuilder()
                .setTitle("📄 Retrieved Logs")
                .setDescription(`\`\`\`\n${formatted}\n\`\`\``)
                .setColor(Colors.Green)
                .setTimestamp()
                .setFooter({ text: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() });

            return interaction.reply({ embeds: [success] });

        } catch (error) {
            console.error(error);

            const apiError = new EmbedBuilder()
                .setDescription("❌ API request failed — check console.")
                .setColor(Colors.Red)
                .setTimestamp()
                .setFooter({ text: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() });

            return interaction.reply({ embeds: [apiError] });
        }
    }
};
