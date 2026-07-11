const { SlashCommandBuilder, EmbedBuilder, Colors } = require("discord.js");
const axios = require("axios");
const { getActiveSellerKey } = require("../../utils/config");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("deleteallusers")
        .setDescription("⚠ Delete ALL users instantly — NO CONFIRMATION"),

    async execute(interaction) {

        const sellerKey = await getActiveSellerKey(interaction.user.id);
        const BASE_URL = process.env.BASE_URL;

        if (!sellerKey) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(Colors.Red)
                        .setDescription("❌ Seller key not set — use `/setsellerkey` first.")
                        .setTimestamp()
                ]
            });
        }

        // Loading Embed
        await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(Colors.Yellow)
                    .setDescription("⏳ Deleting **ALL users**...")
                    .setTimestamp()
            ]
        });

        const url = `${BASE_URL}?type=delallusers&sellerkey=${sellerKey}`;

        try {
            const res = await axios.get(url);

            if (!res.data.success) {
                return interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(Colors.Red)
                            .setDescription(`❌ Failed — ${res.data.msg}`)
                            .setTimestamp()
                    ]
                });
            }

            return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle("🗑 All Users Deleted")
                        .setColor(Colors.Red)
                        .setDescription(`📍 Total Removed: **${res.data.deleted_users}**`)
                        .setFooter({ text: "Data wipe completed" })
                        .setTimestamp()
                ]
            });

        } catch (err) {
            console.error(err);
            return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(Colors.Red)
                        .setDescription("❌ API Request Failed — Check console.")
                        .setTimestamp()
                ]
            });
        }
    }
};
