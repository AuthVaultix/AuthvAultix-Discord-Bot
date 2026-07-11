const { SlashCommandBuilder, EmbedBuilder, Colors } = require("discord.js");
const axios = require("axios");
const { getActiveSellerKey } = require("../../utils/config");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("pauseuser")
        .setDescription("Pause a user account")
        .addStringOption(o =>
            o.setName("username")
                .setDescription("Username to pause")
                .setRequired(true)
        ),

    async execute(interaction) {

        const sellerKey = await getActiveSellerKey(interaction.user.id);
        const BASE_URL = process.env.BASE_URL;

        // No seller key → Red embed
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

        const username = interaction.options.getString("username");
        const url = `${BASE_URL}?type=pauseuser&sellerkey=${sellerKey}&username=${encodeURIComponent(username)}`;

        try {
            const res = await axios.get(url);

            if (!res.data.success) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(Colors.Red)
                            .setDescription(`❌ Failed to pause user\n🔍 Reason: **${res.data.msg || "Unknown"}**`)
                    ]
                });
            }

            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle("⏸️ User Paused")
                        .setColor(Colors.Yellow)
                        .setDescription(`👤 Username: **${username}**\n\nThe account has been paused successfully.`)
                        .setTimestamp()
                ]
            });

        } catch (err) {
            console.error(err);
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(Colors.Red)
                        .setDescription("❌ API Request Failed — Check console or BASE_URL")
                ]
            });
        }
    }
};
