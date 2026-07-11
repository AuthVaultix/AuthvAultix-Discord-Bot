const { SlashCommandBuilder, EmbedBuilder, Colors } = require("discord.js");
const axios = require("axios");
const { getActiveSellerKey } = require("../../utils/config");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("unpauseuser")
        .setDescription("🔊 Unpause a paused user")
        .addStringOption(o => 
            o.setName("username")
                .setDescription("Username to unpause")
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
        const url = `${BASE_URL}?type=unpauseuser&sellerkey=${sellerKey}&username=${username}`;

        await interaction.reply(`🔄 Unpausing **${username}**...`);

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
                .setColor(Colors.Green)
                .setTitle("🔊 User Unpaused Successfully")
                .addFields({ name: "👤 Username", value: `\`${username}\`` })
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error(error);
            return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(Colors.Red)
                        .setDescription("❌ API request failed — Check console/server.")
                ]
            });
        }
    }
};
