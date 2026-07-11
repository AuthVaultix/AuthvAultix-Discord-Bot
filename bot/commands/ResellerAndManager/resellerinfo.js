const { SlashCommandBuilder, EmbedBuilder, Colors } = require("discord.js");
const axios = require("axios");
const { getActiveSellerKey } = require("../../utils/config");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("resellerinfo")
        .setDescription("📄 Retrieve reseller information by username")
        .addStringOption(option =>
            option.setName("username")
                .setDescription("Reseller username to fetch")
                .setRequired(true)
        ),

    async execute(interaction) {

        const sellerKey = await getActiveSellerKey(interaction.user.id);
        const BASE_URL = process.env.BASE_URL;

        // ❌ If no key set
        if (!sellerKey) {
            const noKey = new EmbedBuilder()
                .setDescription("❌ Seller key not set! Use `/setsellerkey` first.")
                .setColor(Colors.Red)
                .setTimestamp()
                .setFooter({ text: interaction.user.tag });
            return interaction.reply({ embeds: [noKey] });
        }

        const username = interaction.options.getString("username");
        const url = `${BASE_URL}?type=resellerinfo&sellerkey=${sellerKey}&username=${username}`;

        // ⏳ Processing message
        const loading = new EmbedBuilder()
            .setDescription(`🔍 Fetching reseller **${username}**...`)
            .setColor(Colors.Yellow)
            .setTimestamp()
            .setFooter({ text: interaction.user.tag });

        await interaction.reply({ embeds: [loading] });

        try {
            const res = await axios.get(url);

            // ❌ Not found
            if (!res.data.success) {
                const failed = new EmbedBuilder()
                    .setDescription(`❌ ${res.data.msg || "Reseller not found."}`)
                    .setColor(Colors.Red)
                    .setTimestamp()
                    .setFooter({ text: interaction.user.tag });
                return interaction.editReply({ embeds: [failed] });
            }

            const r = res.data.reseller;

            // 🟦 SUCCESS UI
            const success = new EmbedBuilder()
                .setTitle("🟦 Reseller Information")
                .addFields(
                    { name: "👤 Username", value: `**${r.username}**`, inline: true },
                    { name: "🆔 ID", value: `\`${r.id}\``, inline: true },
                    { name: "📆 Created", value: `${r.created_at}`, inline: false }
                )
                .setColor(Colors.Blue)
                .setTimestamp()
                .setFooter({ text: interaction.user.tag });

            return interaction.editReply({ embeds: [success] });

        } catch (err) {
            console.error(err);

            const apiError = new EmbedBuilder()
                .setDescription("⚠ API Request Failed — Check console.")
                .setColor(Colors.Red)
                .setTimestamp()
                .setFooter({ text: interaction.user.tag });

            return interaction.editReply({ embeds: [apiError] });
        }
    }
};
