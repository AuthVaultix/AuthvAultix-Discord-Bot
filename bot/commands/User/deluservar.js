const { SlashCommandBuilder, EmbedBuilder, Colors } = require("discord.js");
const axios = require("axios");
const { getActiveSellerKey } = require("../../utils/config");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("deluservar")
        .setDescription("Delete a specific variable from a user")
        .addStringOption(o =>
            o.setName("username")
                .setDescription("User to target")
                .setRequired(true)
        )
        .addStringOption(o =>
            o.setName("variable")
                .setDescription("Variable name to delete")
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

        const username = interaction.options.getString("username");
        const variable = interaction.options.getString("variable");

        const url = `${BASE_URL}?type=deluservar&sellerkey=${sellerKey}&username=${encodeURIComponent(username)}&var=${encodeURIComponent(variable)}`;

        try {
            const res = await axios.get(url);

            if (!res.data.success) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(Colors.Red)
                            .setDescription(`❌ ${res.data.msg || "Failed to delete variable"}`)
                    ]
                });
            }

            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(Colors.Green)
                        .setTitle("🗑 Variable Deleted Successfully")
                        .addFields(
                            { name: "User", value: `\`${username}\`` },
                            { name: "Variable Name", value: `\`${variable}\`` }
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
                        .setDescription("❌ API request failed — Check Console.")
                ]
            });
        }
    }
};
