const { SlashCommandBuilder, EmbedBuilder, Colors } = require("discord.js");
const axios = require("axios");
const { getActiveSellerKey } = require("../../utils/config");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("delsub")
        .setDescription("🗑 Delete a subscription")
        .addStringOption(o =>
            o.setName("name")
                .setDescription("Subscription name to delete")
                .setRequired(true)
        ),

    async execute(interaction) {

        const sellerKey = await getActiveSellerKey(interaction.user.id);
        const BASE_URL = process.env.BASE_URL;

        // ❌ If seller key missing
        if (!sellerKey) {
            const noKey = new EmbedBuilder()
                .setDescription("❌ Seller key not set. Use `/setsellerkey` first.")
                .setColor(Colors.Red)
                .setFooter({ text: interaction.user.tag })
                .setTimestamp();

            return interaction.reply({ embeds: [noKey] });
        }

        const name = interaction.options.getString("name");

        const loading = new EmbedBuilder()
            .setDescription(`⏳ Deleting subscription **${name}**...`)
            .setColor(Colors.Yellow)
            .setFooter({ text: interaction.user.tag })
            .setTimestamp();

        await interaction.reply({ embeds: [loading] });

        try {
            const res = await axios.get(
                `${BASE_URL}?type=delsub&sellerkey=${sellerKey}&name=${encodeURIComponent(name)}`
            );

            // ❌ If failure
            if (typeof res.data === "object" && !res.data.success) {
                const fail = new EmbedBuilder()
                    .setDescription(`❌ ${res.data.message || "Failed to delete subscription"}`)
                    .setColor(Colors.Red)
                    .setFooter({ text: interaction.user.tag })
                    .setTimestamp();

                return interaction.editReply({ embeds: [fail] });
            }

            // 🟢 SUCCESS EMBED
            const success = new EmbedBuilder()
                .setTitle("🗑 Subscription Deleted Successfully")
                .addFields({ name: "📌 Subscription Name", value: `**${name}**` })
                .setColor(Colors.Green)
                .setFooter({ text: interaction.user.tag })
                .setTimestamp();

            return interaction.editReply({ embeds: [success] });

        } catch (err) {
            console.error(err);

            const apiError = new EmbedBuilder()
                .setDescription("❌ API Request failed — Check console.")
                .setColor(Colors.Red)
                .setFooter({ text: interaction.user.tag })
                .setTimestamp();

            return interaction.editReply({ embeds: [apiError] });
        }
    }
};
