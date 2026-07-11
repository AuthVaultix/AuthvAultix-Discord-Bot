const { SlashCommandBuilder, EmbedBuilder, Colors } = require("discord.js");
const axios = require("axios");
const { getActiveSellerKey } = require("../../utils/config");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("editsub")
        .setDescription("✏ Edit an existing subscription")
        .addStringOption(o =>
            o.setName("old")
                .setDescription("Old subscription name")
                .setRequired(true)
        )
        .addStringOption(o =>
            o.setName("new")
                .setDescription("New subscription name")
                .setRequired(true)
        )
        .addIntegerOption(o =>
            o.setName("level")
                .setDescription("New subscription level")
                .setRequired(true)
        ),

    async execute(interaction) {

        const sellerKey = await getActiveSellerKey(interaction.user.id);
        const BASE_URL  = process.env.BASE_URL;

        // ❌ Missing sellerkey embed
        if (!sellerKey) {
            const noKey = new EmbedBuilder()
                .setDescription("❌ Seller key not set. Use `/setsellerkey` first.")
                .setColor(Colors.Red)
                .setFooter({ text: interaction.user.tag })
                .setTimestamp();

            return interaction.reply({ embeds: [noKey] });
        }

        const oldName = interaction.options.getString("old");
        const newName = interaction.options.getString("new");
        const level   = interaction.options.getInteger("level");

        // ⏳ Processing embed
        const wait = new EmbedBuilder()
            .setDescription(`⏳ Updating subscription **${oldName} → ${newName}**...`)
            .setColor(Colors.Yellow)
            .setFooter({ text: interaction.user.tag })
            .setTimestamp();

        await interaction.reply({ embeds: [wait] });

        try {
            const res = await axios.get(
                `${BASE_URL}?type=editsub&sellerkey=${sellerKey}&old=${encodeURIComponent(oldName)}&new=${encodeURIComponent(newName)}&level=${level}`
            );

            // ❌ Failed Embed
            if (typeof res.data === "object" && !res.data.success) {
                const failed = new EmbedBuilder()
                    .setDescription(`❌ ${res.data.message || "Failed to update subscription"}`)
                    .setColor(Colors.Red)
                    .setFooter({ text: interaction.user.tag })
                    .setTimestamp();

                return interaction.editReply({ embeds: [failed] });
            }

            // 🟢 SUCCESS EMBED
            const success = new EmbedBuilder()
                .setTitle("✏ Subscription Updated Successfully")
                .addFields(
                    { name: "Old Name", value: `**${oldName}**`, inline: true },
                    { name: "New Name", value: `**${newName}**`, inline: true },
                    { name: "⭐ New Level", value: `**${level}**`, inline: true }
                )
                .setColor(Colors.Green)
                .setFooter({ text: interaction.user.tag })
                .setTimestamp();

            return interaction.editReply({ embeds: [success] });

        } catch (err) {
            console.error(err);

            const apiError = new EmbedBuilder()
                .setDescription("❌ API request failed. Check console.")
                .setColor(Colors.Red)
                .setFooter({ text: interaction.user.tag })
                .setTimestamp();

            return interaction.editReply({ embeds: [apiError] });
        }
    }
};
