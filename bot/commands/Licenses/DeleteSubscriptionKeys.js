const { SlashCommandBuilder, EmbedBuilder, Colors } = require("discord.js");
const axios = require("axios");
const { getActiveSellerKey } = require("../../utils/config");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("delsubkeys")
        .setDescription("Delete license keys by subscription name + amount")
        .addStringOption(o =>
            o.setName("subscription")
                .setDescription("Subscription name")
                .setRequired(true)
        )
        .addIntegerOption(o =>
            o.setName("amount")
                .setDescription("How many keys to delete (default ALL)")
                .setRequired(false)
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

        const sub = interaction.options.getString("subscription");
        const amount = interaction.options.getInteger("amount") ?? 0;

        const url =
            `${BASE_URL}?type=delsubkeys&sellerkey=${sellerKey}&subscription=${encodeURIComponent(sub)}&amount=${amount}`;

        try {
            const res = await axios.get(url);

            if (typeof res.data === "object") {

                // ❌ Failed API Response
                if (!res.data.success) {
                    const fail = new EmbedBuilder()
                        .setDescription(`❌ ${res.data.msg}`)
                        .setColor(Colors.Red)
                        .setTimestamp()
                        .setFooter({ text: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() });

                    return interaction.reply({ embeds: [fail] });
                }

                // ⚠ No keys deleted
                if (res.data.deleted.length === 0) {
                    const none = new EmbedBuilder()
                        .setDescription("⚠️ No keys were deleted.")
                        .setColor(Colors.Yellow)
                        .setTimestamp()
                        .setFooter({ text: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() });

                    return interaction.reply({ embeds: [none] });
                }

                // 🟢 Success
                const success = new EmbedBuilder()
                    .setTitle(`🗑️ Deleted Keys Under Subscription: ${sub}`)
                    .addFields({ name: "Removed Licenses", value: `\`\`\`\n${res.data.deleted.join("\n")}\n\`\`\`` })
                    .setColor(Colors.Green)
                    .setTimestamp()
                    .setFooter({ text: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() });

                return interaction.reply({ embeds: [success] });
            }

            // 🟦 Text Fallback
            const fallback = new EmbedBuilder()
                .setDescription(`🗑️ ${res.data}`)
                .setColor(Colors.Blue)
                .setTimestamp()
                .setFooter({ text: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() });

            return interaction.reply({ embeds: [fallback] });

        } catch (err) {
            console.error(err);

            const apiError = new EmbedBuilder()
                .setDescription("❌ API request failed. Check console.")
                .setColor(Colors.Red)
                .setTimestamp()
                .setFooter({ text: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() });

            return interaction.reply({ embeds: [apiError] });
        }
    }
};
