const { SlashCommandBuilder, EmbedBuilder, Colors } = require("discord.js");
const axios = require("axios");
const { getActiveSellerKey } = require("../../utils/config");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("resethwid")
        .setDescription("Reset HWID of a specific user")
        .addStringOption(o =>
            o.setName("username")
                .setDescription("Username to reset HWID")
                .setRequired(true)
        ),

    async execute(interaction) {
        const sellerKey = await getActiveSellerKey(interaction.user.id);
        const BASE_URL = process.env.BASE_URL;

        // 🔐 Seller key missing
        if (!sellerKey) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(Colors.Red)
                        .setDescription("❌ Seller key not set.\nUse **/setsellerkey** to continue.")
                ],
                ephemeral: true
            });
        }

        const user = interaction.options.getString("username");
        const url = `${BASE_URL}?type=resetuser&sellerkey=${sellerKey}&username=${encodeURIComponent(user)}`;

        try {
            const res = await axios.get(url);

            if (!res.data.success) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(Colors.Red)
                            .setTitle("❌ HWID Reset Failed")
                            .setDescription(res.data.msg || "Unknown error")
                            .setTimestamp()
                    ]
                });
            }

            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle("🔄 HWID Reset Successful")
                        .setColor(Colors.Green)
                        .setDescription(`HWID Reset for user → **${user}**`)
                        .setTimestamp()
                ]
            });

        } catch (err) {
            console.error(err);
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(Colors.Red)
                        .setDescription("❌ API Connection Failed.\nCheck BASE_URL or server status.")
                ]
            });
        }
    }
};
