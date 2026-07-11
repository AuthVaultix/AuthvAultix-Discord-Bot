const { SlashCommandBuilder, EmbedBuilder, Colors } = require("discord.js");
const axios = require("axios");
const { getActiveSellerKey } = require("../../utils/config");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("getsessions")
        .setDescription("📌 Retrieve all active authentication sessions"),

    async execute(interaction) {

        const sellerKey = await getActiveSellerKey(interaction.user.id);
        const BASE_URL = process.env.BASE_URL;

        // ❌ No Seller Key
        if (!sellerKey) {
            const noKey = new EmbedBuilder()
                .setDescription("❌ Seller key not set. Use `/setsellerkey` first.")
                .setColor(Colors.Red)
                .setTimestamp()
                .setFooter({ text: interaction.user.tag });
            return interaction.reply({ embeds: [noKey] });
        }

        const loading = new EmbedBuilder()
            .setDescription("⏳ Fetching active sessions, please wait…")
            .setColor(Colors.Yellow)
            .setTimestamp()
            .setFooter({ text: interaction.user.tag });

        await interaction.reply({ embeds: [loading] });

        try {
            const res = await axios.get(`${BASE_URL}?type=getsessions&sellerkey=${sellerKey}&format=json`);

            // ❌ Failed / Invalid Response
            if (!res.data.success || !res.data.sessions) {
                const failed = new EmbedBuilder()
                    .setDescription("❌ Failed to retrieve sessions.")
                    .setColor(Colors.Red)
                    .setTimestamp()
                    .setFooter({ text: interaction.user.tag });
                return interaction.editReply({ embeds: [failed] });
            }

            const sessions = res.data.sessions;

            // 📭 No sessions
            if (sessions.length === 0) {
                const none = new EmbedBuilder()
                    .setDescription("📭 No active sessions found.")
                    .setColor(Colors.Orange)
                    .setTimestamp()
                    .setFooter({ text: interaction.user.tag });
                return interaction.editReply({ embeds: [none] });
            }

            // Format sessions (limit to 20 to avoid Discord overflow)
            const list = sessions.slice(0, 20).map(s =>
                `🔹 **Session ID:** \`${s.session_id}\`\n👤 User: **${s.username}**\n🌐 IP: ${s.ip_address}\n⏳ Created: ${s.created_at}\n🚫 Expire: ${s.expired_at}`
            ).join("\n\n");

            const embed = new EmbedBuilder()
                .setTitle("📌 Active Sessions")
                .setDescription(list)
                .setColor(Colors.Blue)
                .setTimestamp()
                .setFooter({ text: `Showing ${Math.min(20,sessions.length)} of ${sessions.length} total` });

            return interaction.editReply({ embeds: [embed] });

        } catch (err) {
            console.error(err);

            const error = new EmbedBuilder()
                .setDescription("❌ API request failed — Check console.")
                .setColor(Colors.Red)
                .setTimestamp()
                .setFooter({ text: interaction.user.tag });

            return interaction.editReply({ embeds: [error] });
        }
    }
};
