const { SlashCommandBuilder, EmbedBuilder, Colors } = require("discord.js");
const axios = require("axios");
const { getActiveSellerKey } = require("../../utils/config");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("addhwid")
        .setDescription("Add HWID to an existing user")
        .addStringOption(o =>
            o.setName("username")
                .setDescription("Username to update")
                .setRequired(true)
        )
        .addStringOption(o =>
            o.setName("hwid")
                .setDescription("New HWID to assign")
                .setRequired(true)
        ),

    async execute(interaction) {

        const sellerKey = await getActiveSellerKey(interaction.user.id);
        const BASE_URL = process.env.BASE_URL;

        if (!sellerKey) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setDescription("❌ Seller key not set — Use `/setsellerkey` first.")
                        .setColor(Colors.Red)
                        .setFooter({ text: interaction.user.tag })
                        .setTimestamp()
                ]
            });
        }

        const username = interaction.options.getString("username");
        const hwid = interaction.options.getString("hwid");

        const url = `${BASE_URL}?type=addhwiduser&sellerkey=${sellerKey}&username=${encodeURIComponent(username)}&hwid=${encodeURIComponent(hwid)}`;

        // Loading screen — looks premium 🔥
        await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setDescription(`🔄 Updating HWID for **${username}**...`)
                    .setColor(Colors.Yellow)
                    .setFooter({ text: interaction.user.tag })
                    .setTimestamp()
            ]
        });

        try {
            const res = await axios.get(url);

            if (res.data.success) {
                return interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setTitle("🔐 HWID Added Successfully")
                            .addFields(
                                { name: "👤 User", value: `\`${username}\``, inline: true },
                                { name: "🆔 HWID", value: `\`${hwid}\``, inline: true }
                            )
                            .setColor(Colors.Green)
                            .setFooter({ text: "HWID Updated • Secure Panel" })
                            .setTimestamp()
                    ]
                });
            } else {
                return interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setDescription(`❌ Failed — ${res.data.msg}`)
                            .setColor(Colors.Red)
                            .setFooter({ text: interaction.user.tag })
                            .setTimestamp()
                    ]
                });
            }

        } catch (err) {
            console.log(err);
            return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setDescription("❌ API Request Failed — Check console.")
                        .setColor(Colors.Red)
                        .setTimestamp()
                ]
            });
        }
    }
};
