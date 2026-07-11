const { SlashCommandBuilder, EmbedBuilder, Colors } = require("discord.js");
const axios = require("axios");
const { getActiveSellerKey } = require("../../utils/config");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("createsub")
        .setDescription("🆕 Create a new subscription plan")
        .addStringOption(o =>
            o.setName("name")
                .setDescription("Subscription name")
                .setRequired(true)
        )
        .addIntegerOption(o =>
            o.setName("level")
                .setDescription("Subscription level (default: 1)")
                .setRequired(false)
        ),

    async execute(interaction) {
        
        const sellerKey = await getActiveSellerKey(interaction.user.id);
        const BASE_URL = process.env.BASE_URL;

        // ❌ if seller key missing
        if (!sellerKey) {
            const noKey = new EmbedBuilder()
                .setDescription("❌ Seller key not set. Use `/setsellerkey` first.")
                .setColor(Colors.Red)
                .setFooter({ text: interaction.user.tag })
                .setTimestamp();
            return interaction.reply({ embeds: [noKey] });
        }

        const name  = interaction.options.getString("name");
        const level = interaction.options.getInteger("level") ?? 1;

        const loading = new EmbedBuilder()
            .setDescription(`⏳ Creating subscription **${name}**...`)
            .setColor(Colors.Yellow)
            .setFooter({ text: interaction.user.tag })
            .setTimestamp();

        await interaction.reply({ embeds: [loading] });

        try {
            const res = await axios.get(
                `${BASE_URL}?type=createsub&sellerkey=${sellerKey}&name=${encodeURIComponent(name)}&level=${level}`
            );

            // ❌ Failed
            if (typeof res.data === "object" && !res.data.success) {
                const failed = new EmbedBuilder()
                    .setDescription(`❌ ${res.data.message || "Failed to create subscription"}`)
                    .setColor(Colors.Red)
                    .setFooter({ text: interaction.user.tag })
                    .setTimestamp();
                return interaction.editReply({ embeds: [failed] });
            }

            // 🟢 SUCCESS EMBED
            const success = new EmbedBuilder()
                .setTitle("🆕 Subscription Created Successfully")
                .addFields(
                    { name: "📌 Subscription Name", value: `**${name}**`, inline: true },
                    { name: "⭐ Level Assigned", value: `**${level}**`, inline: true }
                )
                .setColor(Colors.Green)
                .setFooter({ text: interaction.user.tag })
                .setTimestamp();

            return interaction.editReply({ embeds: [success] });

        } catch (err) {
            console.error(err);

            const apiError = new EmbedBuilder()
                .setDescription("❌ API Request Failed — Check console.")
                .setColor(Colors.Red)
                .setFooter({ text: interaction.user.tag })
                .setTimestamp();

            return interaction.editReply({ embeds: [apiError] });
        }
    }
};
