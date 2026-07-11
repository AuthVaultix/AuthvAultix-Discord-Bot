const { SlashCommandBuilder, EmbedBuilder, Colors } = require("discord.js");
const axios = require("axios");
const { getActiveSellerKey } = require("../../utils/config");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("changepassword")
        .setDescription("Change password of an existing user")
        .addStringOption(o =>
            o.setName("username")
                .setDescription("Enter the username")
                .setRequired(true)
        )
        .addStringOption(o =>
            o.setName("newpass")
                .setDescription("New password for user")
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
        const newpass = interaction.options.getString("newpass");

        await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(Colors.Yellow)
                    .setDescription(`🔄 Updating password for **${username}**...`)
                    .setTimestamp()
            ]
        });

        const url = `${BASE_URL}?type=resetpw&sellerkey=${sellerKey}&username=${encodeURIComponent(username)}&newpass=${encodeURIComponent(newpass)}`;

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
                        .setTitle("🔑 Password Updated Successfully")
                        .setColor(Colors.Green)
                        .addFields(
                            { name: "👤 User", value: `\`${username}\`` },
                            { name: "🔄 New Password Set", value: "`••••••••` (Hidden for Safety)" }
                        )
                        .setFooter({ text: "User Credential Updated" })
                        .setTimestamp()
                ]
            });

        } catch (err) {
            console.error(err);
            return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(Colors.Red)
                        .setDescription("❌ API request failed — Check console.")
                        .setTimestamp()
                ]
            });
        }
    }
};
