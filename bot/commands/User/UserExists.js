const { SlashCommandBuilder, EmbedBuilder, Colors } = require("discord.js");
const axios = require("axios");
const { getActiveSellerKey } = require("../../utils/config");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("userexists")
        .setDescription("🔍 Verify if a user exists in the database")
        .addStringOption(o =>
            o.setName("username")
                .setDescription("Enter username to check")
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
                        .setDescription("❌ Seller key not set! Use `/setsellerkey` first.")
                ],
                ephemeral: true
            });
        }

        const username = interaction.options.getString("username");
        const url = `${BASE_URL}?type=userexists&sellerkey=${sellerKey}&username=${username}`;

        await interaction.reply("⏳ Checking user...");

        try {
            const res = await axios.get(url);

            if (!res.data.success) {
                return interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(Colors.Red)
                            .setDescription(`❌ ${res.data.msg}`)
                    ]
                });
            }

            const exists = res.data.exists;
            const embed = new EmbedBuilder()
                .setColor(exists ? Colors.Green : Colors.Red)
                .setTitle(exists ? "🟢 User Found" : "🔴 User Not Found")
                .addFields({ name: "👤 Username", value: `\`${username}\`` })
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error(error);
            return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(Colors.Red)
                        .setDescription("⚠ API request failed — Check server/console.")
                ]
            });
        }
    }
};
