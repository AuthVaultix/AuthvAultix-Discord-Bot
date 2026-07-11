const { SlashCommandBuilder, EmbedBuilder, Colors } = require("discord.js");
const axios = require("axios");
const { getActiveSellerKey } = require("../../utils/config");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("subtime")
        .setDescription("⏳ Subtract days from a user's expiry date")
        .addStringOption(o => 
            o.setName("username")
             .setDescription("Username to update")
             .setRequired(true)
        )
        .addIntegerOption(o =>
            o.setName("days")
             .setDescription("Days to subtract from expiry")
             .setRequired(true)
        ),

    async execute(interaction) {

        const sellerKey = await getActiveSellerKey(interaction.user.id);
        const BASE_URL  = process.env.BASE_URL;

        if (!sellerKey) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(Colors.Red)
                        .setDescription("❌ Seller key not set — Use `/setsellerkey` first.")
                ],
                ephemeral: true
            });
        }

        const username = interaction.options.getString("username");
        const days = interaction.options.getInteger("days");

        const url = `${BASE_URL}?type=subtract&sellerkey=${sellerKey}&username=${username}&days=${days}`;

        await interaction.reply(`⏳ Processing request for **${username}**...`);

        try {
            const res = await axios.get(url);

            if (typeof res.data === "object" && !res.data.success) {
                return interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(Colors.Red)
                            .setDescription(`❌ ${res.data.msg}`)
                    ]
                });
            }

            const embed = new EmbedBuilder()
                .setTitle("🕒 Expiry Updated")
                .setColor(Colors.Yellow)
                .addFields(
                    { name: "👤 User", value: `\`${username}\``, inline: true },
                    { name: "🗑 Days Removed", value: `**${days}**`, inline: true }
                )
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });

        } catch (err) {
            console.error(err);
            return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(Colors.Red)
                        .setDescription("⚠ API Request Failed — Check console/server")
                ]
            });
        }
    }
};
