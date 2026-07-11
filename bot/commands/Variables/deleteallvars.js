const { SlashCommandBuilder, EmbedBuilder, Colors } = require("discord.js");
const axios = require("axios");
const { getActiveSellerKey } = require("../../utils/config");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("delallvars")
        .setDescription("🗑 Delete ALL global variables ( irreversible )"),

    async execute(interaction) {

        const sellerKey = await getActiveSellerKey(interaction.user.id);
        const BASE_URL = process.env.BASE_URL;

        // ❌ Seller key missing
        if (!sellerKey) {
            const noKey = new EmbedBuilder()
                .setDescription("❌ Seller key not set — use `/setsellerkey` first.")
                .setColor(Colors.Red)
                .setTimestamp()
                .setFooter({ text: interaction.user.tag });

            return interaction.reply({ embeds: [noKey] });
        }

        // ⚠ Confirmation message
        const confirmEmbed = new EmbedBuilder()
            .setTitle("⚠ Delete ALL Global Variables?")
            .setDescription("This action **cannot be undone**.\nReply with **`YES`** within 10 seconds to continue.")
            .setColor(Colors.Yellow)
            .setFooter({ text: interaction.user.tag })
            .setTimestamp();

        await interaction.reply({ embeds: [confirmEmbed] });

        // Message collector for confirmation
        const filter = msg => msg.author.id === interaction.user.id;
        const collector = interaction.channel.createMessageCollector({ filter, time: 10000, max: 1 });

        collector.on("collect", async msg => {
            if (msg.content.toLowerCase() !== "yes")
                return msg.reply("❌ Cancelled — no variables deleted.");

            // ⏳ Deleting embed
            const processing = new EmbedBuilder()
                .setDescription("⏳ Deleting ALL global variables...")
                .setColor(Colors.Orange)
                .setTimestamp()
                .setFooter({ text: interaction.user.tag });

            await interaction.followUp({ embeds: [processing] });

            try {
                const res = await axios.get(`${BASE_URL}?type=delallvars&sellerkey=${sellerKey}`);

                if (!res.data.success) {
                    const fail = new EmbedBuilder()
                        .setDescription(`❌ ${res.data.msg || "Failed to delete variables"}`)
                        .setColor(Colors.Red)
                        .setTimestamp()
                        .setFooter({ text: interaction.user.tag });
                    return interaction.followUp({ embeds: [fail] });
                }

                // 🟢 Success embed
                const done = new EmbedBuilder()
                    .setTitle("🗑 Global Variables Deleted")
                    .setDescription(`Deleted: **${res.data.deleted_count} variables**`)
                    .setColor(Colors.Green)
                    .setFooter({ text: interaction.user.tag })
                    .setTimestamp();

                return interaction.followUp({ embeds: [done] });

            } catch (err) {
                console.log(err);

                const apiError = new EmbedBuilder()
                    .setDescription("❌ API Request Failed — check console.")
                    .setColor(Colors.Red)
                    .setTimestamp()
                    .setFooter({ text: interaction.user.tag });

                return interaction.followUp({ embeds: [apiError] });
            }
        });

        collector.on("end", collected => {
            if (collected.size === 0)
                interaction.followUp("⌛ Time expired — deletion cancelled.");
        });
    }
};
