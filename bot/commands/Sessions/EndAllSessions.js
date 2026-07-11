const { SlashCommandBuilder, EmbedBuilder, Colors } = require("discord.js");
const axios = require("axios");
const { getActiveSellerKey } = require("../../utils/config");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("endallsessions")
        .setDescription("🛑 Terminate ALL active sessions for your entire application"),

    async execute(interaction) {

        const sellerKey = await getActiveSellerKey(interaction.user.id);
        const BASE_URL = process.env.BASE_URL;

        // ❌ No SellerKey
        if (!sellerKey) {
            const noKey = new EmbedBuilder()
                .setDescription("❌ Seller key not set. Use `/setsellerkey` first.")
                .setColor(Colors.Red)
                .setTimestamp()
                .setFooter({ text: interaction.user.tag });
            return interaction.reply({ embeds: [noKey] });
        }

        const url = `${BASE_URL}?type=endallsessions&sellerkey=${sellerKey}&type=end_all`;

        // ⏳ Processing UI
        const loading = new EmbedBuilder()
            .setDescription("⏳ Terminating **all active sessions**...")
            .setColor(Colors.Yellow)
            .setTimestamp()
            .setFooter({ text: interaction.user.tag });
        await interaction.reply({ embeds: [loading] });

        try {
            const res = await axios.get(url);

            // ❌ Failed
            if (typeof res.data === "object" && !res.data.success) {
                const failed = new EmbedBuilder()
                    .setDescription(`❌ ${res.data.message || "Failed to end sessions."}`)
                    .setColor(Colors.Red)
                    .setTimestamp()
                    .setFooter({ text: interaction.user.tag });
                return interaction.editReply({ embeds: [failed] });
            }

            // 🟢 SUCCESS UI
            const success = new EmbedBuilder()
                .setTitle("🛑 All Sessions Terminated")
                .setDescription("All currently active authentication sessions have been ended successfully.")
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
