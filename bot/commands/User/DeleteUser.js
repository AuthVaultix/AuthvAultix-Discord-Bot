const { SlashCommandBuilder, EmbedBuilder, Colors } = require("discord.js");
const axios = require("axios");
const { getActiveSellerKey } = require("../../utils/config");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("deluser")
        .setDescription("Delete an existing user")
        .addStringOption(o =>
            o.setName("username")
                .setDescription("Username to delete")
                .setRequired(true)
        ),

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

        const username = interaction.options.getString("username");

        // Show processing embed
        await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(Colors.Yellow)
                    .setDescription(`⏳ Deleting user **${username}**...`)
                    .setTimestamp()
            ]
        });

        const url = `${BASE_URL}?type=deluser&sellerkey=${sellerKey}&username=${encodeURIComponent(username)}`;

        try {
            const res = await axios.get(url);

            if (!res.data.success) {
                return interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(Colors.Red)
                            .setDescription(`❌ ${res.data.msg}`)
                            .setTimestamp()
                    ]
                });
            }

            return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle("🗑 User Deleted Successfully")
                        .setColor(Colors.Green)
                        .addFields(
                            { name: "👤 Username", value: `\`${username}\`` }
                        )
                        .setFooter({ text: "User removed permanently" })
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
