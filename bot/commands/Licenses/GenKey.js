const { SlashCommandBuilder, EmbedBuilder, Colors } = require("discord.js");
const axios = require("axios");
const { getActiveSellerKey } = require("../../utils/config");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("genkey")
        .setDescription("Generate a license key")
        .addStringOption(o =>
            o.setName("subscription")
                .setDescription("Subscription name")
                .setRequired(true)
        )
        .addIntegerOption(o =>
            o.setName("expiry")
                .setDescription("Expiry days")
                .setRequired(true)
        )
        .addIntegerOption(o =>
            o.setName("amount")
                .setDescription("How many keys to generate?")
                .setRequired(true)
        ),

    async execute(interaction) {

        const sellerKey = await getActiveSellerKey(interaction.user.id);

        // ❌ Seller Key Missing
        if (!sellerKey) {
            const noKey = new EmbedBuilder()
                .setDescription("❌ Seller key not set. Use `/setsellerkey` first.")
                .setColor(Colors.Red)
                .setTimestamp()
                .setFooter({ text: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() });

            return interaction.reply({ embeds: [noKey] });
        }

        const BASE_URL = process.env.BASE_URL;
        const sub = interaction.options.getString("subscription");
        const expiry = interaction.options.getInteger("expiry");
        const amount = interaction.options.getInteger("amount");

        const url =
            `${BASE_URL}/seller_create_license.php?sellerkey=${sellerKey}` +
            `&type=add&subscription=${sub}&expiry=${expiry}&amount=${amount}` +
            `&mask=******-******-******&format=text`;

        try {
            const res = await axios.get(url);
            let keys = res.data.trim();

            if (keys.length > 1900) keys = keys.slice(0,1900) + "\n... (truncated)";

            const success = new EmbedBuilder()
                .setTitle("🎉 License Keys Generated Successfully!")
                .addFields(
                    { name: "Subscription", value: sub },
                    { name: "Expiry (Days)", value: `${expiry}` },
                    { name: "Amount", value: `${amount}` },
                    { name: "Generated Keys", value: `||\`\`\`\n${keys}\n\`\`\`||` }
                )
                .setColor(Colors.Green)
                .setTimestamp()
                .setFooter({ text: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() });

            return interaction.reply({ embeds: [success] });

        } catch (err) {
            console.log(err);

            const apiError = new EmbedBuilder()
                .setDescription("❌ API error while generating keys.")
                .setColor(Colors.Red)
                .setTimestamp()
                .setFooter({ text: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() });

            return interaction.reply({ embeds: [apiError] });
        }
    }
};
