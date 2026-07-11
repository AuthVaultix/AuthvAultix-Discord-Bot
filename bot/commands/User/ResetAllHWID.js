const { SlashCommandBuilder, EmbedBuilder, Colors } = require("discord.js");
const axios = require("axios");
const { getActiveSellerKey } = require("../../utils/config");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("resethwidall")
        .setDescription("Reset HWID of ALL users (cannot be undone)"),

    async execute(interaction) {
        const sellerKey = await getActiveSellerKey(interaction.user.id);
        const BASE_URL = process.env.BASE_URL;

        // No seller key → Red warning embed
        if (!sellerKey) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(Colors.Red)
                        .setDescription("❌ Seller key not set.\nUse **/setsellerkey** first.")
                ],
                ephemeral: true
            });
        }

        await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(Colors.Yellow)
                    .setDescription("⏳ Processing... resetting HWID for all users!")
            ]
        });

        try {
            const res = await axios.get(`${BASE_URL}?type=resetalluser&sellerkey=${sellerKey}`);

            if (!res.data.success) {
                return interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(Colors.Red)
                            .setDescription(`❌ Failed — ${res.data.msg}`)
                    ]
                });
            }

            return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle("🧨 HWID Reset Complete")
                        .setColor(Colors.Green)
                        .setDescription(`All user HWIDs have been successfully reset!`)
                        .addFields({ name: "Total Users Affected", value: `**${res.data.reset_count}**` })
                        .setTimestamp()
                ]
            });

        } catch (err) {
            console.error(err);
            return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(Colors.Red)
                        .setDescription("❌ API Request Failed — Check BASE_URL / Seller Key / Server")
                ]
            });
        }
    }
};
