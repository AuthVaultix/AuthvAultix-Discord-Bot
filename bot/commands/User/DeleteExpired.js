const { SlashCommandBuilder, EmbedBuilder, Colors } = require("discord.js");
const axios = require("axios");
const { getActiveSellerKey } = require("../../utils/config");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("delexpired")
        .setDescription("Delete all expired users instantly"),

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

        // Loading visual
        await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(Colors.Yellow)
                    .setDescription("⏳ Removing expired users...")
                    .setTimestamp()
            ]
        });

        const url = `${BASE_URL}?type=delexpusers&sellerkey=${sellerKey}`;

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
                        .setTitle("🗑 Expired Users Removed")
                        .setColor(Colors.Green)
                        .addFields(
                            { name: "Deleted Accounts", value: `**${res.data.deleted} users**` }
                        )
                        .setFooter({ text: "Expiry Cleanup Complete" })
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
