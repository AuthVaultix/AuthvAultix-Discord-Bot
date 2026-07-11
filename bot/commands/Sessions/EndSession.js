const { SlashCommandBuilder, EmbedBuilder, Colors } = require("discord.js");
const axios = require("axios");
const { getActiveSellerKey } = require("../../utils/config");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("endsession")
        .setDescription("🛑 End a specific session by session_id")
        .addStringOption(o =>
            o.setName("session_id")
                .setDescription("Enter Session ID to terminate")
                .setRequired(true)
        ),

    async execute(interaction) {

        const sellerKey = await getActiveSellerKey(interaction.user.id);
        const BASE_URL = process.env.BASE_URL;

        // ❌ No key found
        if (!sellerKey) {
            const noKey = new EmbedBuilder()
                .setDescription("❌ Seller key not set. Use `/setsellerkey` first.")
                .setColor(Colors.Red)
                .setTimestamp()
                .setFooter({ text: interaction.user.tag });
            return interaction.reply({ embeds: [noKey] });
        }

        const sessionID = interaction.options.getString("session_id");

        const loading = new EmbedBuilder()
            .setDescription(`⏳ Ending session \`${sessionID}\`...`)
            .setColor(Colors.Yellow)
            .setTimestamp()
            .setFooter({ text: interaction.user.tag });

        await interaction.reply({ embeds: [loading] });

        try {
            const res = await axios.get(
                `${BASE_URL}?type=endsession&sellerkey=${sellerKey}&type=end_session&session_id=${encodeURIComponent(sessionID)}`
            );

            // ❌ Failed
            if (typeof res.data === "object" && !res.data.success) {
                const failed = new EmbedBuilder()
                    .setDescription(`❌ ${res.data.message || "Failed to terminate session."}`)
                    .setColor(Colors.Red)
                    .setTimestamp()
                    .setFooter({ text: interaction.user.tag });
                return interaction.editReply({ embeds: [failed] });
            }

            // 🟢 SUCCESS RESPONSE
            const success = new EmbedBuilder()
                .setTitle("🛑 Session Terminated Successfully")
                .addFields({ name: "Session ID", value: `\`${sessionID}\`` })
                .setColor(Colors.Green)
                .setTimestamp()
                .setFooter({ text: interaction.user.tag });

            return interaction.editReply({ embeds: [success] });

        } catch (err) {
            console.error(err);

            const apiErr = new EmbedBuilder()
                .setDescription("❌ API request failed — Check console.")
                .setColor(Colors.Red)
                .setTimestamp()
                .setFooter({ text: interaction.user.tag });

            return interaction.editReply({ embeds: [apiErr] });
        }
    }
};
