const { SlashCommandBuilder, EmbedBuilder, Colors } = require("discord.js");
const axios = require("axios");
const { getActiveSellerKey } = require("../../utils/config");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("listsubs")
        .setDescription("📜 View all subscriptions under your seller key"),

    async execute(interaction) {

        const sellerKey = await getActiveSellerKey(interaction.user.id);
        const BASE_URL  = process.env.BASE_URL;

        // ❌ No Seller Key
        if (!sellerKey) {
            const noKey = new EmbedBuilder()
                .setDescription("❌ Seller key not set. Use `/setsellerkey` first.")
                .setColor(Colors.Red)
                .setTimestamp()
                .setFooter({ text: interaction.user.tag });
            
            return interaction.reply({ embeds: [noKey] });
        }

        // ⏳ Loading Embed
        const loading = new EmbedBuilder()
            .setDescription("⏳ Fetching subscriptions...")
            .setColor(Colors.Yellow)
            .setTimestamp()
            .setFooter({ text: interaction.user.tag });
        
        await interaction.reply({ embeds: [loading] });

        try {
            const res = await axios.get(`${BASE_URL}?type=listsubs&sellerkey=${sellerKey}&format=json`);

            // ❌ Failed Response
            if (!res.data.success) {
                const fail = new EmbedBuilder()
                    .setDescription(`❌ ${res.data.message || "Failed to fetch subscriptions."}`)
                    .setColor(Colors.Red)
                    .setTimestamp()
                    .setFooter({ text: interaction.user.tag });

                return interaction.editReply({ embeds: [fail] });
            }

            const subs = res.data.subscriptions;

            // ⚠ No subscriptions
            if (subs.length === 0) {
                const empty = new EmbedBuilder()
                    .setDescription("⚠ No subscriptions found.")
                    .setColor(Colors.Orange)
                    .setTimestamp()
                    .setFooter({ text: interaction.user.tag });

                return interaction.editReply({ embeds: [empty] });
            }

            // 🟢 SUCCESS Output
            const embed = new EmbedBuilder()
                .setTitle("📜 Subscription List")
                .setColor(Colors.Green)
                .setTimestamp()
                .setFooter({ text: `Total Subscriptions: ${subs.length}` });

            subs.forEach(sub => {
                embed.addFields({
                    name: ` ${sub.name}`,
                    value: ` Level: **${sub.level}**\n Status: *${sub.status}*`,
                    inline: true
                });
            });

            return interaction.editReply({ embeds: [embed] });

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
