const { SlashCommandBuilder, EmbedBuilder, Colors } = require("discord.js");
const axios = require("axios");
const { getActiveSellerKey } = require("../../utils/config");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("extenduserexpiry")
        .setDescription("Extend a user's subscription expiry date")
        .addStringOption(o => 
            o.setName("username")
             .setDescription("Username to extend")
             .setRequired(true)
        )
        .addIntegerOption(o => 
            o.setName("days")
             .setDescription("Days to extend")
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

        const user = interaction.options.getString("username");
        const days = interaction.options.getInteger("days");

        const url = `${BASE_URL}?type=extenduserexpiry&sellerkey=${sellerKey}&username=${user}&days=${days}`;

        try {
            const res = await axios.get(url);

            if (!res.data.success) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(Colors.Red)
                            .setDescription(`❌ ${res.data.msg}`)
                    ]
                });
            }

            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle("⏳ Expiry Extended Successfully")
                        .setColor(Colors.Green)
                        .addFields(
                            { name: "👤 User", value: `\`${user}\`` },
                            { name: "📆 Days Extended", value: `**${days}** days`, inline: true }
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
                        .setDescription("❌ API Request Failed — Check console.")
                ]
            });
        }
    }
};
