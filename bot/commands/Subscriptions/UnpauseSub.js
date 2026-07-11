const { SlashCommandBuilder, EmbedBuilder, Colors } = require("discord.js");
const axios = require("axios");
const { getActiveSellerKey } = require("../../utils/config");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("unpausesub")
        .setDescription("▶️ Unpause a subscription")
        .addStringOption(o =>
            o.setName("subscription")
                .setDescription("Subscription name to unpause")
                .setRequired(true)
        ),

    async execute(interaction) {

        const sellerKey = await getActiveSellerKey(interaction.user.id);
        const BASE_URL  = process.env.BASE_URL;

        // ❌ No key embed
        if (!sellerKey) {
            const noKey = new EmbedBuilder()
                .setDescription("❌ Seller key not set. Use `/setsellerkey` first.")
                .setColor(Colors.Red)
                .setTimestamp()
                .setFooter({ text: interaction.user.tag });

            return interaction.reply({ embeds: [noKey] });
        }

        const subName = interaction.options.getString("subscription");

        // ⏳ Loading embed
        const wait = new EmbedBuilder()
            .setDescription(`⏳ Unpausing subscription **${subName}**...`)
            .setColor(Colors.Yellow)
            .setTimestamp()
            .setFooter({ text: interaction.user.tag });

        await interaction.reply({ embeds: [wait] });

        try {
            const res = await axios.get(
                `${BASE_URL}?type=unpausesub&sellerkey=${sellerKey}&subscription=${encodeURIComponent(subName)}`
            );

            // ❌ If failed
            if (typeof res.data === "object" && !res.data.success) {
                const failed = new EmbedBuilder()
                    .setDescription(`❌ ${res.data.message || "Failed to unpause subscription."}`)
                    .setColor(Colors.Red)
                    .setTimestamp()
                    .setFooter({ text: interaction.user.tag });

                return interaction.editReply({ embeds: [failed] });
            }

            // 🟢 SUCCESS EMBED
            const success = new EmbedBuilder()
                .setTitle("▶ Subscription Unpaused Successfully")
                .addFields({ name: "📌 Subscription", value: `**${subName}**` })
                .setColor(Colors.Green)
                .setTimestamp()
                .setFooter({ text: interaction.user.tag });

            return interaction.editReply({ embeds: [success] });

        } catch (err) {
            console.error(err);

            const apiError = new EmbedBuilder()
                .setDescription("❌ API Request failed — Check console.")
                .setColor(Colors.Red)
                .setTimestamp()
                .setFooter({ text: interaction.user.tag });

            return interaction.editReply({ embeds: [apiError] });
        }
    }
};
