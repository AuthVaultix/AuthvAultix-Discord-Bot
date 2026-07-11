const { SlashCommandBuilder, EmbedBuilder, Colors } = require("discord.js");
const axios = require("axios");
const { getActiveSellerKey } = require("../../utils/config");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("extendexpiry")
        .setDescription("Extend a license expiry by days")
        .addStringOption(o =>
            o.setName("license")
                .setDescription("License key")
                .setRequired(true)
        )
        .addIntegerOption(o =>
            o.setName("days")
                .setDescription("How many days to extend")
                .setRequired(true)
        )
        .addStringOption(o =>
            o.setName("note")
                .setDescription("Optional note to attach")
                .setRequired(false)
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

        const license = interaction.options.getString("license");
        const days = interaction.options.getInteger("days");
        const note = interaction.options.getString("note") ?? "";

        const url = `${BASE_URL}?type=extendexpiry&sellerkey=${sellerKey}&key=${encodeURIComponent(license)}&days=${days}&note=${encodeURIComponent(note)}`;

        try {
            const res = await axios.get(url);

            // 📌 JSON Response Handling
            if (typeof res.data === "object") {

                // ❌ Failed Extension
                if (!res.data.success) {
                    const fail = new EmbedBuilder()
                        .setDescription("❌ " + (res.data.message || "Failed extending expiry."))
                        .setColor(Colors.Red)
                        .setTimestamp()
                        .setFooter({ text: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() });

                    return interaction.reply({ embeds: [fail] });
                }

                // 🟢 SUCCESS
                const success = new EmbedBuilder()
                    .setTitle("⏳ License Expiry Extended")
                    .addFields(
                        { name: "License", value: `\`${license}\`` },
                        { name: "Days Added", value: `**${days} days**` }
                    )
                    .setColor(Colors.Green)
                    .setTimestamp()
                    .setFooter({ text: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() });

                // 🔹 If note exists, append as extra field
                if (note.length > 0) {
                    success.addFields({ name: "Note", value: note });
                }

                return interaction.reply({ embeds: [success] });
            }

            // 🟦 Text fallback
            const fallback = new EmbedBuilder()
                .setDescription("⏳ " + res.data)
                .setColor(Colors.Blue)
                .setTimestamp()
                .setFooter({ text: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() });

            return interaction.reply({ embeds: [fallback] });

        } catch (err) {
            console.error(err);

            const apiError = new EmbedBuilder()
                .setDescription("❌ API Request Failed — Check console.")
                .setColor(Colors.Red)
                .setTimestamp()
                .setFooter({ text: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() });

            return interaction.reply({ embeds: [apiError] });
        }
    }
};
