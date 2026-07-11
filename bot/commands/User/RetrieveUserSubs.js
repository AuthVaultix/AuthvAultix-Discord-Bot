const { SlashCommandBuilder, EmbedBuilder, Colors } = require("discord.js");
const axios = require("axios");
const { getActiveSellerKey } = require("../../utils/config");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("usersubs")
        .setDescription("📄 Get all user subscriptions"),

    async execute(interaction) {

        const sellerKey = await getActiveSellerKey(interaction.user.id);
        const BASE_URL  = process.env.BASE_URL;

        if (!sellerKey) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(Colors.Red)
                        .setDescription("❌ Seller key not set — use `/setsellerkey` first!")
                ],
                ephemeral: true
            });
        }

        await interaction.reply("⏳ Fetching user subscription list...");

        try {
            const res = await axios.get(`${BASE_URL}?type=usersubs&sellerkey=${sellerKey}`);

            if (!res.data.success) {
                return interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(Colors.Red)
                            .setDescription(`❌ ${res.data.msg || "Failed to retrieve"}`)
                    ]
                });
            }

            const list = res.data.subscriptions;

            if (!list.length) {
                return interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(Colors.Yellow)
                            .setDescription("⚠ No users found!")
                    ]
                });
            }

            const formatted = list
                .slice(0, 50) // limit spam flood
                .map(u => `👤 **${u.username}** — 📦 *${u.subscription}*`)
                .join("\n");

            const embed = new EmbedBuilder()
                .setTitle("📄 User Subscriptions")
                .setColor(Colors.Blue)
                .setDescription(formatted.length > 4000 ? formatted.slice(0,3900)+"\n...and more" : formatted)
                .setFooter({ text: `Total Users: ${list.length}` })
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });

        } catch (err) {
            console.log(err);
            return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(Colors.Red)
                        .setDescription("❌ API Request Failed — Check server or BASE_URL")
                ]
            });
        }
    }
};
