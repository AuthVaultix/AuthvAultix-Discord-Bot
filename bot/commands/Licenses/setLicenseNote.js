const { SlashCommandBuilder, EmbedBuilder, Colors } = require("discord.js");
const axios = require("axios");
const { getActiveSellerKey } = require("../../utils/config");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("setlicensenote")
        .setDescription("Update or set the note of a license key")
        .addStringOption(o =>
            o.setName("license")
                .setDescription("License key")
                .setRequired(true)
        )
        .addStringOption(o =>
            o.setName("note")
                .setDescription("Note to assign to license")
                .setRequired(true)
        ),

    async execute(interaction) {

        const sellerKey = await getActiveSellerKey(interaction.user.id);
        const BASE_URL = process.env.BASE_URL;

        // ❌ No seller key set
        if (!sellerKey) {
            const noKey = new EmbedBuilder()
                .setDescription("❌ Seller key not set. Use `/setsellerkey` first.")
                .setColor(Colors.Red)
                .setTimestamp()
                .setFooter({ text: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() });

            return interaction.reply({ embeds: [noKey] });
        }

        const license = interaction.options.getString("license");
        const note = interaction.options.getString("note");

        const url = `${BASE_URL}?type=setlicensenote&sellerkey=${sellerKey}&license=${encodeURIComponent(license)}&note=${encodeURIComponent(note)}`;

        try {
            const res = await axios.get(url);

            // ❌ NOTE UPDATE FAILED
            if (typeof res.data === "object" && !res.data.success) {
                const failed = new EmbedBuilder()
                    .setDescription("❌ " + (res.data.msg || "Failed updating license note."))
                    .setColor(Colors.Red)
                    .setTimestamp()
                    .setFooter({ text: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() });

                return interaction.reply({ embeds: [failed] });
            }

            // 🟢 SUCCESS — NOTE UPDATED
            const success = new EmbedBuilder()
                .setTitle("📝 License Note Updated Successfully!")
                .addFields(
                    { name: "License", value: `\`${license}\`` },
                    { name: "New Note", value: note }
                )
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
