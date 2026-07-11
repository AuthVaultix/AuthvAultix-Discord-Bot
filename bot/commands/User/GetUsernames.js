const { SlashCommandBuilder, EmbedBuilder, Colors } = require("discord.js");
const axios = require("axios");
const { getActiveSellerKey } = require("../../utils/config");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("getusernames")
        .setDescription("📜 Fetch all usernames from the app"),

    async execute(interaction) {
        const sellerKey = await getActiveSellerKey(interaction.user.id);
        const BASE_URL = process.env.BASE_URL;

        if (!sellerKey) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(Colors.Red)
                        .setDescription("❌ Seller key not set. Use **/setsellerkey** first.")
                ]
            });
        }

        await interaction.reply("⏳ Fetching usernames...");

        const url = `${BASE_URL}?type=verifyuser&sellerkey=${sellerKey}&format=text`;

        try {
            const res = await axios.get(url);

            if (!res.data || typeof res.data !== "string") {
                return interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(Colors.Yellow)
                            .setDescription("⚠ No usernames found OR API returned JSON instead of text.")
                    ]
                });
            }

            const embed = new EmbedBuilder()
                .setTitle("📜 Usernames List")
                .setColor(Colors.Blue)
                .setDescription(`\`\`\`\n${res.data}\n\`\`\``)
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error(error);

            return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(Colors.Red)
                        .setDescription("❌ Failed to connect to API — check BASE_URL/server.")
                ]
            });
        }
    }
};
