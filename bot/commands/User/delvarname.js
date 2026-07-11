const { SlashCommandBuilder, EmbedBuilder, Colors } = require("discord.js");
const axios = require("axios");
const { getActiveSellerKey } = require("../../utils/config");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("delvarname")
        .setDescription("Delete all user variables by variable name")
        .addStringOption(o =>
            o.setName("var")
                .setDescription("Variable name to delete (case-sensitive)")
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
                ]
            });
        }

        const variable = interaction.options.getString("var");
        const url = `${BASE_URL}?type=delvarname&sellerkey=${sellerKey}&var=${encodeURIComponent(variable)}`;

        try {
            const res = await axios.get(url);

            if (!res.data.success) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(Colors.Red)
                            .setDescription(`❌ Failed — ${res.data.msg || "Unknown error"}`)
                    ]
                });
            }

            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(Colors.Green)
                        .setTitle("🗑 Variable Group Deleted")
                        .addFields(
                            { name: "🔑 Variable Name", value: `\`${variable}\`` },
                            { name: "🧹 Deleted Count", value: `**${res.data.deleted}**` }
                        )
                        .setTimestamp()
                ]
            });

        } catch (err) {
            console.error(err);
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(Colors.Red)
                        .setDescription("❌ API request failed — Check console.")
                ]
            });
        }
    }
};
