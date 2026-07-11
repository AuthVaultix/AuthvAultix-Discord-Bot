const { SlashCommandBuilder, EmbedBuilder, Colors } = require("discord.js");
const axios = require("axios");
const { getActiveSellerKey } = require("../../utils/config");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("delusedall")
        .setDescription("Delete ALL used licenses of a subscription")
        .addStringOption(o =>
            o.setName("subscription")
                .setDescription("Subscription name")
                .setRequired(true)
        ),

    async execute(interaction) {
        const sellerKey = await getActiveSellerKey(interaction.user.id);
        const BASE_URL = process.env.BASE_URL;

        // ❌ No KEY SET
        if (!sellerKey) {
            const noKey = new EmbedBuilder()
                .setDescription("❌ Seller key not set. Use `/setsellerkey` first.")
                .setColor(Colors.Red)
                .setTimestamp()
                .setFooter({ text: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() });

            return interaction.reply({ embeds: [noKey] });
        }

        const subscription = interaction.options.getString("subscription");

        const url = `${BASE_URL}?type=delusedkey&sellerkey=${sellerKey}&type=delete_used&subscription=${encodeURIComponent(subscription)}&amount=999999`;

        try {
            const res = await axios.get(url);

            // ❌ FAIL
            if (!res.data.success) {
                const failed = new EmbedBuilder()
                    .setDescription("❌ " + (res.data.msg || "Failed deleting used keys."))
                    .setColor(Colors.Red)
                    .setTimestamp()
                    .setFooter({ text: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() });

                return interaction.reply({ embeds: [failed] });
            }

            // ⚠ None deleted
            if (res.data.deleted.length === 0) {
                const none = new EmbedBuilder()
                    .setDescription(`⚠️ No used licenses found for **${subscription}**.`)
                    .setColor(Colors.Yellow)
                    .setTimestamp()
                    .setFooter({ text: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() });

                return interaction.reply({ embeds: [none] });
            }

            // 🟢 SUCCESS
            const success = new EmbedBuilder()
                .setTitle("🗑️ Deleted ALL Used Keys")
                .addFields({
                    name: `Subscription: ${subscription}`,
                    value: `\`\`\`\n${res.data.deleted.join("\n")}\n\`\`\``
                })
                .setColor(Colors.Green)
                .setTimestamp()
                .setFooter({ text: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() });

            return interaction.reply({ embeds: [success] });

        } catch (err) {
            console.log(err);

            const apiError = new EmbedBuilder()
                .setDescription("❌ API request failed.")
                .setColor(Colors.Red)
                .setTimestamp()
                .setFooter({ text: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() });

            return interaction.reply({ embeds: [apiError] });
        }
    }
};
