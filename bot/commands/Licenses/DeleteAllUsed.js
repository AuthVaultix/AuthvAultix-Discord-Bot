const { SlashCommandBuilder, EmbedBuilder, Colors } = require("discord.js");
const axios = require("axios");
const { getActiveSellerKey } = require("../../utils/config");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("deleteallused")
        .setDescription("Delete ALL used licenses from your application"),

    async execute(interaction) {
        const sellerKey = await getActiveSellerKey(interaction.user.id);
        const BASE_URL = process.env.BASE_URL;

        if (!sellerKey) {
            const noKey = new EmbedBuilder()
                .setDescription("❌ Seller key not set. Use `/setsellerkey` first.")
                .setColor(Colors.Red)
                .setTimestamp()
                .setFooter({ text: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() });

            return interaction.reply({ embeds: [noKey] });
        }

        const url = `${BASE_URL}?type=deleteallused&sellerkey=${sellerKey}`;

        try {
            const res = await axios.get(url);

            // JSON Response
            if (typeof res.data === "object") {
                const success = new EmbedBuilder()
                    .setTitle("🗑️ Used License Cleanup Complete!")
                    .addFields(
                        { name: "Total Deleted Keys", value: `**${res.data.deleted_used}**` }
                    )
                    .setColor(Colors.Green)
                    .setTimestamp()
                    .setFooter({ text: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() });

                return interaction.reply({ embeds: [success] });
            }

            // Fallback text response
            const fallback = new EmbedBuilder()
                .setDescription(`🗑️ ${res.data}`)
                .setColor(Colors.Blue)
                .setTimestamp()
                .setFooter({ text: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() });

            return interaction.reply({ embeds: [fallback] });

        } catch (err) {
            console.log(err);

            const apiError = new EmbedBuilder()
                .setDescription("❌ API request failed. Check console.")
                .setColor(Colors.Red)
                .setTimestamp()
                .setFooter({ text: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() });

            return interaction.reply({ embeds: [apiError] });
        }
    }
};
