const { SlashCommandBuilder, EmbedBuilder, Colors } = require("discord.js");
const axios = require("axios");
const { getActiveSellerKey } = require("../../utils/config");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("delusedkey")
        .setDescription("Delete a used license key")
        .addStringOption(o =>
            o.setName("license")
                .setDescription("Used license key to delete")
                .setRequired(true)
        ),

    async execute(interaction) {
        const sellerKey = await getActiveSellerKey(interaction.user.id);
        const BASE_URL = process.env.BASE_URL;

        // ❌ No Seller Key
        if (!sellerKey) {
            const noKey = new EmbedBuilder()
                .setDescription("❌ Seller key not set. Use `/setsellerkey` first.")
                .setColor(Colors.Red)
                .setTimestamp()
                .setFooter({ text: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() });

            return interaction.reply({ embeds: [noKey] });
        }

        const license = interaction.options.getString("license");
        const url = `${BASE_URL}?type=delusedkey&sellerkey=${sellerKey}&type=delete_used&license=${license}`;

        try {
            const res = await axios.get(url);

            // ❌ Failed
            if (!res.data.success) {
                const fail = new EmbedBuilder()
                    .setDescription("❌ " + (res.data.msg || "Failed deleting used key."))
                    .setColor(Colors.Red)
                    .setTimestamp()
                    .setFooter({ text: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() });

                return interaction.reply({ embeds: [fail] });
            }

            // ⚠ No Deleted Keys
            if (res.data.deleted.length === 0) {
                const none = new EmbedBuilder()
                    .setDescription("⚠️ No used license found for this key.")
                    .setColor(Colors.Yellow)
                    .setTimestamp()
                    .setFooter({ text: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() });

                return interaction.reply({ embeds: [none] });
            }

            // 🟢 SUCCESS
            const success = new EmbedBuilder()
                .setTitle("🗑️ Used License Key Deleted Successfully!")
                .addFields({
                    name: "Deleted Key",
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
