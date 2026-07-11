const { SlashCommandBuilder, EmbedBuilder, Colors } = require("discord.js");
const axios = require("axios");
const { getActiveSellerKey } = require("../../utils/config");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("banuser")
        .setDescription("Ban a user from the system")
        .addStringOption(o =>
            o.setName("username")
                .setDescription("User you want to ban")
                .setRequired(true)
        )
        .addStringOption(o =>
            o.setName("reason")
                .setDescription("Reason for ban (optional)")
                .setRequired(false)
        ),

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

        const username = interaction.options.getString("username");
        const reason = interaction.options.getString("reason") || "No reason provided";

        const url = `${BASE_URL}?type=banuser&sellerkey=${sellerKey}&username=${encodeURIComponent(username)}&reason=${encodeURIComponent(reason)}`;

        // Loading Embed — looks professional 🔥
        await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(Colors.Yellow)
                    .setDescription(`🔄 Banning user **${username}**...`)
                    .setTimestamp()
            ]
        });

        try {
            const res = await axios.get(url);

            if (res.data.success) {

                return interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setTitle("🚫 User Banned Successfully")
                            .setColor(Colors.Red)
                            .addFields(
                                { name: "User", value: `\`${username}\``, inline: true },
                                { name: "Reason", value: `\`${reason}\``, inline: true }
                            )
                            .setFooter({ text: "Ban Applied • Secure System" })
                            .setTimestamp()
                    ]
                });

            } else {

                return interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(Colors.Red)
                            .setDescription(`❌ Failed — ${res.data.msg}`)
                            .setTimestamp()
                    ]
                });

            }

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
