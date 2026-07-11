const { SlashCommandBuilder, EmbedBuilder, Colors } = require("discord.js");
const axios = require("axios");
const { getActiveSellerKey } = require("../../utils/config");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("changeusername")
        .setDescription("Change user's username")
        .addStringOption(o =>
            o.setName("old")
                .setDescription("Old username")
                .setRequired(true)
        )
        .addStringOption(o =>
            o.setName("new")
                .setDescription("New username")
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
                        .setDescription("❌ Seller key not set — use `/setsellerkey` first.")
                        .setTimestamp()
                ]
            });
        }

        const oldName = interaction.options.getString("old");
        const newName = interaction.options.getString("new");

        // Loading status (looks smooth in Discord ⚡)
        await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(Colors.Yellow)
                    .setDescription(`🔄 Updating username **${oldName} → ${newName}**...`)
                    .setTimestamp()
            ]
        });

        const url = `${BASE_URL}?type=editusername&sellerkey=${sellerKey}&old=${encodeURIComponent(oldName)}&new=${encodeURIComponent(newName)}`;

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
                        .setTitle("📝 Username Successfully Updated")
                        .setColor(Colors.Green)
                        .addFields(
                            { name: "Old Username", value: `\`${oldName}\`` },
                            { name: "New Username", value: `**${newName}**` }
                        )
                        .setFooter({ text: "Username Modified" })
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
