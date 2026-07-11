const { SlashCommandBuilder, EmbedBuilder, Colors } = require("discord.js");
const axios = require("axios");
const { getActiveSellerKey } = require("../../utils/config");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("activecount")
        .setDescription("📊 Check active authenticated session count"),

    async execute(interaction) {

        const sellerKey = await getActiveSellerKey(interaction.user.id);
        const BASE_URL = process.env.BASE_URL;

        // ❌ No Seller Key found
        if (!sellerKey) {
            const noKey = new EmbedBuilder()
                .setDescription("❌ Seller key not set. Use `/setsellerkey` first.")
                .setColor(Colors.Red)
                .setTimestamp()
                .setFooter({ text: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() });

            return interaction.reply({ embeds: [noKey] });
        }

        try {
            const res = await axios.get(`${BASE_URL}?type=activecount&sellerkey=${sellerKey}`);

            // 🟢 Valid Response
            if (typeof res.data === "object" && res.data.success) {
                const embed = new EmbedBuilder()
                    .setTitle("📊 Active Session Count")
                    .addFields({
                        name: "🟢 Active Sessions",
                        value: `\`${res.data.active_sessions}\``,
                        inline: true
                    })
                    .setColor(Colors.Green)
                    .setTimestamp()
                    .setFooter({ text: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() });

                return interaction.reply({ embeds: [embed] });
            }

            // ⚠ Unexpected Data
            const unexpected = new EmbedBuilder()
                .setDescription("⚠ Unexpected server response:\n```\n" + res.data + "\n```")
                .setColor(Colors.Orange)
                .setTimestamp()
                .setFooter({ text: interaction.user.tag });

            return interaction.reply({ embeds: [unexpected] });

        } catch (err) {
            console.error(err);

            const apiFail = new EmbedBuilder()
                .setDescription("❌ API Request Failed. Check console.")
                .setColor(Colors.Red)
                .setTimestamp()
                .setFooter({ text: interaction.user.tag });

            return interaction.reply({ embeds: [apiFail] });
        }
    }
};
