const { SlashCommandBuilder, EmbedBuilder, Colors } = require("discord.js");
const axios = require("axios");
const { getActiveSellerKey } = require("../../utils/config");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("licenseinfo")
        .setDescription("Get detailed information about a license key")
        .addStringOption(o =>
            o.setName("key")
                .setDescription("License key to check")
                .setRequired(true)
        ),

    async execute(interaction) {

        const sellerKey = await getActiveSellerKey(interaction.user.id);
        const BASE_URL = process.env.BASE_URL;

        // ❌ No SELLER KEY
        if (!sellerKey) {
            const noKey = new EmbedBuilder()
                .setDescription("❌ Seller key not set. Use `/setsellerkey` first.")
                .setColor(Colors.Red)
                .setTimestamp()
                .setFooter({ text: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() });

            return interaction.reply({ embeds: [noKey] });
        }

        const key = interaction.options.getString("key");
        const url = `${BASE_URL}?type=licenseinfo&sellerkey=${sellerKey}&key=${key}`;

        try {
            const res = await axios.get(url);

            // ❌ License Not Found
            if (!res.data.success) {
                const notFound = new EmbedBuilder()
                    .setDescription("❌ " + (res.data.msg || "License not found"))
                    .setColor(Colors.Red)
                    .setTimestamp()
                    .setFooter({ text: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() });

                return interaction.reply({ embeds: [notFound] });
            }

            const d = res.data.info;

            // 🟢 SUCCESS — License Info
            const embed = new EmbedBuilder()
                .setTitle("🔍 License Information")
                .addFields(
                    { name: "License Key", value: `\`${d.license_key}\`` },
                    { name: "Used", value: d.used === "1" ? "Yes" : "No", inline: true },
                    { name: "Used At", value: d.used_at || "Never", inline: true },
                    { name: "Created", value: d.created_at, inline: true },
                    { name: "Subscription", value: d.subscription || "Unknown", inline: true },
                    { name: "Note", value: d.note || "None" },
                    { name: "Expiry", value: d.expiry ? new Date(d.expiry * 1000).toLocaleString() : "**Never (Lifetime)**" }
                )
                .setColor(Colors.Green)
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
    },
};
