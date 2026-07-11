const { SlashCommandBuilder, EmbedBuilder, Colors } = require("discord.js");
const axios = require("axios");
const { getActiveSellerKey } = require("../../utils/config");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("deletealluservars")
        .setDescription("Delete all user variables from the database for this app"),

    async execute(interaction) {

        const sellerKey = await getActiveSellerKey(interaction.user.id);
        const BASE_URL = process.env.BASE_URL;

        if (!sellerKey) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(Colors.Red)
                        .setDescription("❌ Seller key not set — Use `/setsellerkey` first.")
                        .setTimestamp()
                ]
            });
        }

        const url = `${BASE_URL}?type=deletealluservars&sellerkey=${sellerKey}`;

        await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(Colors.Yellow)
                    .setDescription("⏳ Deleting all user variables...")
                    .setTimestamp()
            ]
        });

        try {
            const res = await axios.get(url);

            if (!res.data.success) {
                return interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(Colors.Red)
                            .setDescription("❌ " + (res.data.msg || "Failed to delete variables"))
                            .setTimestamp()
                    ]
                });
            }

            return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle("🗑 All User Variables Deleted")
                        .setColor(Colors.Green)
                        .addFields({ name: "🔻 Removed", value: `**${res.data.deleted}** variables` })
                        .setTimestamp()
                ]
            });

        } catch (err) {
            console.error(err);
            return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(Colors.Red)
                        .setDescription("❌ API Request Failed — Check Console.")
                        .setTimestamp()
                ]
            });
        }
    }
};
