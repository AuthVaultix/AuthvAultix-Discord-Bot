const { SlashCommandBuilder, EmbedBuilder, Colors } = require("discord.js");
const axios = require("axios");
const { getActiveSellerKey } = require("../../utils/config");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("managerdelete")
        .setDescription("🗑 Delete a manager account")
        .addStringOption(o =>
            o.setName("username")
                .setDescription("Manager username to delete")
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

        const username = interaction.options.getString("username");

        // ⏳ Processing embed
        const pending = new EmbedBuilder()
            .setDescription(`⏳ Deleting manager **${username}**...`)
            .setColor(Colors.Yellow)
            .setTimestamp()
            .setFooter({ text: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() });

        await interaction.reply({ embeds: [pending] });

        try {
            const url = `${BASE_URL}?type=managerdelete&sellerkey=${sellerKey}&username=${username}`;
            const res = await axios.get(url);

            // ❌ Failed to delete / not exists
            if (!res.data.success) {
                const failed = new EmbedBuilder()
                    .setDescription(`❌ ${res.data.msg || "Failed to delete manager."}`)
                    .setColor(Colors.Red)
                    .setTimestamp()
                    .setFooter({ text: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() });

                return interaction.editReply({ embeds: [failed] });
            }

            // 🗑 SUCCESS — Manager Deleted
            const success = new EmbedBuilder()
                .setTitle("🗑 Manager Removed Successfully")
                .addFields({ name: "Deleted Username", value: `**${username}**` })
                .setColor(Colors.Green)
                .setTimestamp()
                .setFooter({ text: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() });

            return interaction.editReply({ embeds: [success] });

        } catch (err) {
            console.error(err);

            const apiError = new EmbedBuilder()
                .setDescription("⚠ API request failed — check console.")
                .setColor(Colors.Red)
                .setTimestamp()
                .setFooter({ text: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() });

            return interaction.editReply({ embeds: [apiError] });
        }
    }
};
