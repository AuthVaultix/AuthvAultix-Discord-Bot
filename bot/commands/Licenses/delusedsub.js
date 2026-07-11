const { SlashCommandBuilder, EmbedBuilder, Colors } = require("discord.js");
const axios = require("axios");
const { getActiveSellerKey } = require("../../utils/config");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("delusedsub")
        .setDescription("Delete used license keys by subscription")
        .addStringOption(o =>
            o.setName("subscription")
                .setDescription("Subscription name")
                .setRequired(true)
        )
        .addIntegerOption(o =>
            o.setName("amount")
                .setDescription("How many used keys to delete (default = ALL)")
                .setRequired(false)
        ),

    async execute(interaction) {
        const sellerKey = await getActiveSellerKey(interaction.user.id);
        const BASE_URL = process.env.BASE_URL;

        // ❌ No seller key
        if (!sellerKey) {
            const noKey = new EmbedBuilder()
                .setDescription("❌ Seller key not set. Use `/setsellerkey` first.")
                .setColor(Colors.Red)
                .setTimestamp()
                .setFooter({ text: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() });

            return interaction.reply({ embeds: [noKey] });
        }

        const subscription = interaction.options.getString("subscription");
        const amount = interaction.options.getInteger("amount") ?? 0;

        const url = `${BASE_URL}?type=delusedsub&sellerkey=${sellerKey}&type=delete_used&subscription=${encodeURIComponent(subscription)}&amount=${amount}`;

        try {
            const res = await axios.get(url);

            // ❌ Delete failed
            if (!res.data.success) {
                const fail = new EmbedBuilder()
                    .setDescription("❌ " + (res.data.msg || "Failed deleting used keys."))
                    .setColor(Colors.Red)
                    .setTimestamp()
                    .setFooter({ text: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() });

                return interaction.reply({ embeds: [fail] });
            }

            // ⚠ No deleted licenses
            if (res.data.deleted.length === 0) {
                const none = new EmbedBuilder()
                    .setDescription(`⚠️ No used licenses found for subscription **${subscription}**.`)
                    .setColor(Colors.Yellow)
                    .setTimestamp()
                    .setFooter({ text: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() });

                return interaction.reply({ embeds: [none] });
            }

            // 🟢 Success response
            const success = new EmbedBuilder()
                .setTitle(`🗑️ Deleted Used Keys for Subscription: ${subscription}`)
                .addFields({
                    name: "Deleted Keys",
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
