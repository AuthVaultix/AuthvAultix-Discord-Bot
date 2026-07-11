const { SlashCommandBuilder, EmbedBuilder, Colors } = require("discord.js");
const axios = require("axios");
const { getActiveSellerKey } = require("../../utils/config");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("delkey")
        .setDescription("Delete a specific license key")
        .addStringOption(o =>
            o.setName("license")
                .setDescription("License key to delete")
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
        const url = `${BASE_URL}?type=delkey&sellerkey=${sellerKey}&license=${license}`;

        try {
            const res = await axios.get(url);

            if (typeof res.data === "object") {

                // ❌ Failure response
                if (!res.data.success) {
                    const fail = new EmbedBuilder()
                        .setDescription("❌ " + (res.data.msg || "Delete failed."))
                        .setColor(Colors.Red)
                        .setTimestamp()
                        .setFooter({ text: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() });

                    return interaction.reply({ embeds: [fail] });
                }

                // ⚠ No key deleted
                if (!res.data.deleted || res.data.deleted.length === 0) {
                    const none = new EmbedBuilder()
                        .setDescription("⚠️ No license deleted.")
                        .setColor(Colors.Yellow)
                        .setTimestamp()
                        .setFooter({ text: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() });

                    return interaction.reply({ embeds: [none] });
                }

                // 🟢 Success response
                const success = new EmbedBuilder()
                    .setTitle("🗑️ License Deleted Successfully!")
                    .addFields({
                        name: "Deleted Key",
                        value: `\`\`\`\n${res.data.deleted.join("\n")}\n\`\`\``
                    })
                    .setColor(Colors.Green)
                    .setTimestamp()
                    .setFooter({ text: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() });

                return interaction.reply({ embeds: [success] });
            }

            // 🟦 TEXT fallback
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
