const { SlashCommandBuilder, EmbedBuilder, Colors } = require("discord.js");
const axios = require("axios");
const { getActiveSellerKey } = require("../../utils/config");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("pausesub")
        .setDescription("⏸ Pause a subscription")
        .addStringOption(o =>
            o.setName("subscription")
                .setDescription("Subscription name to pause")
                .setRequired(true)
        ),

    async execute(interaction) {
        
        const sellerKey = await getActiveSellerKey(interaction.user.id);
        const BASE_URL  = process.env.BASE_URL;

        // ❌ Seller Key Missing
        if (!sellerKey) {
            const noKey = new EmbedBuilder()
                .setDescription("❌ Seller key not set. Use `/setsellerkey` first.")
                .setColor(Colors.Red)
                .setFooter({ text: interaction.user.tag })
                .setTimestamp();

            return interaction.reply({ embeds: [noKey] });
        }

        const subName = interaction.options.getString("subscription");

        // Loading Embed
        const wait = new EmbedBuilder()
            .setDescription(`⏳ Pausing subscription **${subName}**...`)
            .setColor(Colors.Yellow)
            .setFooter({ text: interaction.user.tag })
            .setTimestamp();

        await interaction.reply({ embeds: [wait] });

        try {
            const res = await axios.get(
                `${BASE_URL}?type=pausesub&sellerkey=${sellerKey}&subscription=${encodeURIComponent(subName)}`
            );

            // ❌ Failed
            if (typeof res.data === "object" && !res.data.success) {
                const failed = new EmbedBuilder()
                    .setDescription(`❌ ${res.data.message || "Failed to pause subscription"}`)
                    .setColor(Colors.Red)
                    .setFooter({ text: interaction.user.tag })
                    .setTimestamp();
                
                return interaction.editReply({ embeds: [failed] });
            }

            // 🟢 SUCCESS EMBED
            const success = new EmbedBuilder()
                .setTitle("⏸ Subscription Paused Successfully")
                .addFields({ name: "📌 Subscription", value: `**${subName}**` })
                .setColor(Colors.Green)
                .setFooter({ text: interaction.user.tag })
                .setTimestamp();

            return interaction.editReply({ embeds: [success] });

        } catch (err) {
            console.error(err);

            const apiError = new EmbedBuilder()
                .setDescription("❌ API request failed. Check console.")
                .setColor(Colors.Red)
                .setFooter({ text: interaction.user.tag })
                .setTimestamp();

            return interaction.editReply({ embeds: [apiError] });
        }
    }
};
