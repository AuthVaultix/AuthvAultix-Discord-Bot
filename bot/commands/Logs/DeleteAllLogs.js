const { SlashCommandBuilder, EmbedBuilder, Colors } = require("discord.js");
const axios = require("axios");
const { getActiveSellerKey } = require("../../utils/config");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("clearlogs")
        .setDescription("⚠ Delete ALL logs permanently (confirmation required)"),

    async execute(interaction) {

        const sellerKey = await getActiveSellerKey(interaction.user.id);
        const BASE_URL = process.env.BASE_URL;

        // ❌ No seller key
        if (!sellerKey) {
            const noKey = new EmbedBuilder()
                .setDescription("❌ Seller key not set. Use `/setsellerkey` first.")
                .setColor(Colors.Red)
                .setTimestamp()
                .setFooter({ text: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() });

            return interaction.reply({ embeds: [noKey] });
        }

        // ⚠ Confirmation Embed
        const confirmEmbed = new EmbedBuilder()
            .setTitle("⚠ Delete ALL Logs?")
            .setDescription("This action is **IRREVERSIBLE**.\nReply **yes** within **10 seconds** to confirm.")
            .setColor(Colors.Yellow)
            .setTimestamp()
            .setFooter({ text: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() });

        await interaction.reply({ embeds: [confirmEmbed] });

        // Message listener for confirmation
        const filter = m => m.author.id === interaction.user.id;
        const collector = interaction.channel.createMessageCollector({ filter, time: 10000, max: 1 });

        collector.on("collect", async msg => {

            // ❌ Cancelled
            if (msg.content.toLowerCase() !== "yes") {
                const cancelled = new EmbedBuilder()
                    .setDescription("❌ Deletion cancelled — No logs were removed.")
                    .setColor(Colors.Red)
                    .setTimestamp()
                    .setFooter({ text: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() });

                return msg.reply({ embeds: [cancelled] });
            }

            const url = `${BASE_URL}?type=clearlogs&sellerkey=${sellerKey}`;

            try {
                const res = await axios.get(url);

                // 🟢 Success
                if (res.data.success) {
                    const success = new EmbedBuilder()
                        .setDescription("🗑️ **All logs have been permanently deleted.**")
                        .setColor(Colors.Green)
                        .setTimestamp()
                        .setFooter({ text: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() });

                    return msg.reply({ embeds: [success] });
                }

                // ❌ API says failed
                const failed = new EmbedBuilder()
                    .setDescription("❌ Failed to delete logs from server.")
                    .setColor(Colors.Red)
                    .setTimestamp()
                    .setFooter({ text: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() });

                return msg.reply({ embeds: [failed] });

            } catch (err) {
                console.log(err);

                const apiError = new EmbedBuilder()
                    .setDescription("❌ API request failed.")
                    .setColor(Colors.Red)
                    .setTimestamp()
                    .setFooter({ text: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() });

                return msg.reply({ embeds: [apiError] });
            }
        });

        // ⏳ Timeout (no reply)
        collector.on("end", collected => {
            if (collected.size === 0) {
                const timeout = new EmbedBuilder()
                    .setDescription("⌛ No response — **Deletion cancelled automatically.**")
                    .setColor(Colors.Grey)
                    .setTimestamp()
                    .setFooter({ text: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() });

                return interaction.followUp({ embeds: [timeout] });
            }
        });
    }
};
