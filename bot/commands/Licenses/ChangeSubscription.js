const { SlashCommandBuilder, EmbedBuilder, Colors } = require("discord.js");
const axios = require("axios");
const { getActiveSellerKey } = require("../../utils/config");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("changesub")
        .setDescription("Change a license subscription")
        .addStringOption(o =>
            o.setName("license")
                .setDescription("License key")
                .setRequired(true)
        )
        .addStringOption(o =>
            o.setName("subscription")
                .setDescription("New subscription name")
                .setRequired(true)
        ),

    async execute(interaction) {

        const sellerKey = await getActiveSellerKey(interaction.user.id);
        const BASE_URL = process.env.BASE_URL;

        if (!sellerKey) {
            const noKey = new EmbedBuilder()
                .setDescription("❌ Seller key not set. Use `/setsellerkey` first.")
                .setColor(Colors.Red)
                .setTimestamp()
                .setFooter({ text: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() });

            return interaction.reply({ embeds: [noKey] });
        }

        const key = interaction.options.getString("license");
        const newSub = interaction.options.getString("subscription");

        const url = `${BASE_URL}?type=changesubli&sellerkey=${sellerKey}&key=${key}&subscription=${encodeURIComponent(newSub)}`;

        try {
            const res = await axios.get(url);

            if (typeof res.data === "object") {

                if (!res.data.success) {
                    const fail = new EmbedBuilder()
                        .setDescription(`❌ ${res.data.msg || "Failed to update subscription"}`)
                        .setColor(Colors.Red)
                        .setTimestamp()
                        .setFooter({ text: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() });

                    return interaction.reply({ embeds: [fail] });
                }

                const success = new EmbedBuilder()
                    .setTitle("🔄 Subscription Updated Successfully!")
                    .addFields(
                        { name: "License", value: `\`${key}\`` },
                        { name: "New Subscription", value: `**${newSub}**` }
                    )
                    .setColor(Colors.Green)
                    .setTimestamp()
                    .setFooter({ text: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() });

                return interaction.reply({ embeds: [success] });
            }

            // Fallback text
            const fallback = new EmbedBuilder()
                .setDescription(`🔄 ${res.data}`)
                .setColor(Colors.Blue)
                .setTimestamp()
                .setFooter({ text: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() });

            return interaction.reply({ embeds: [fallback] });

        } catch (err) {
            console.error(err);

            const apiError = new EmbedBuilder()
                .setDescription("❌ API Request failed. Check console.")
                .setColor(Colors.Red)
                .setTimestamp()
                .setFooter({ text: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() });

            return interaction.reply({ embeds: [apiError] });
        }
    }
};
