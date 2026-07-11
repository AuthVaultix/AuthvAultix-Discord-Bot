const { SlashCommandBuilder, EmbedBuilder, Colors } = require("discord.js");
const axios = require("axios");
const { getActiveSellerKey } = require("../../utils/config");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("verifylicense")
        .setDescription("Verify a license & view its full details")
        .addStringOption(o =>
            o.setName("license")
                .setDescription("License key to verify")
                .setRequired(true)
        ),

    async execute(interaction) {

        const sellerKey = await getActiveSellerKey(interaction.user.id);
        const BASE_URL = process.env.BASE_URL;

        // ❌ No Seller Key Set
        if (!sellerKey) {
            const noKey = new EmbedBuilder()
                .setDescription("❌ Seller key not set. Use `/setsellerkey` first.")
                .setColor(Colors.Red)
                .setTimestamp()
                .setFooter({ text: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() });

            return interaction.reply({ embeds: [noKey] });
        }

        const license = interaction.options.getString("license");
        const url = `${BASE_URL}?type=verifylicense&sellerkey=${sellerKey}&license=${encodeURIComponent(license)}`;

        try {
            const res = await axios.get(url);

            // ❌ Not Found
            if (!res.data.success) {
                const notFound = new EmbedBuilder()
                    .setDescription("❌ License not found or invalid.")
                    .setColor(Colors.Red)
                    .setTimestamp()
                    .setFooter({ text: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() });

                return interaction.reply({ embeds: [notFound] });
            }

            const info = res.data.license;

            // 🟢 SUCCESS Embed
            const embed = new EmbedBuilder()
                .setTitle("🔍 License Verification Result")
                .addFields(
                    { name: "License Key", value: `\`${info.license_key}\`` },
                    { name: "Used Status", value: info.used === "1" ? "🔴 Used" : "🟢 Not Used", inline: true },
                    { name: "Note", value: info.note || "None", inline: true },
                    { name: "Created", value: info.created_at, inline: true },
                    { name: "Expiry", value: info.expiry_human || "Lifetime", inline: true }
                )
                .setColor(info.used === "1" ? Colors.Yellow : Colors.Green)
                .setTimestamp()
                .setFooter({ text: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() });

            return interaction.reply({ embeds: [embed] });

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
