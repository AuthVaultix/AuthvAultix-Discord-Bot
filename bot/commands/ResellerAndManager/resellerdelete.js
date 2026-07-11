const { SlashCommandBuilder, EmbedBuilder, Colors } = require("discord.js");
const axios = require("axios");
const { getActiveSellerKey } = require("../../utils/config");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("resellerdelete")
        .setDescription("🗑 Delete an existing reseller")
        .addStringOption(o =>
            o.setName("username")
                .setDescription("Enter reseller username to delete")
                .setRequired(true)
        ),

    async execute(interaction) {

        const sellerKey = await getActiveSellerKey(interaction.user.id);
        const BASE_URL = process.env.BASE_URL;

        // ❌ Seller Key Not Set
        if (!sellerKey) {
            const noKey = new EmbedBuilder()
                .setDescription("❌ Seller key not set! Use `/setsellerkey` first.")
                .setColor(Colors.Red)
                .setTimestamp()
                .setFooter({ text: interaction.user.tag });

            return interaction.reply({ embeds: [noKey] });
        }

        const username = interaction.options.getString("username");

        // ⏳ Loading embed
        const pending = new EmbedBuilder()
            .setDescription(`⏳ Deleting reseller **${username}**...`)
            .setColor(Colors.Yellow)
            .setTimestamp()
            .setFooter({ text: interaction.user.tag });

        await interaction.reply({ embeds: [pending] });

        try {
            const url = `${BASE_URL}?type=resellerdelete&sellerkey=${sellerKey}&username=${username}`;
            const res = await axios.get(url);

            // ❌ If failed
            if (!res.data.success) {
                const fail = new EmbedBuilder()
                    .setDescription(`❌ ${res.data.msg || "Failed to delete reseller."}`)
                    .setColor(Colors.Red)
                    .setTimestamp()
                    .setFooter({ text: interaction.user.tag });

                return interaction.editReply({ embeds: [fail] });
            }

            // 🟢 SUCCESS – Reseller Deleted
            const success = new EmbedBuilder()
                .setTitle("🗑 Reseller Removed Successfully")
                .addFields({ name: "Username Deleted", value: `**${username}**` })
                .setColor(Colors.Green)
                .setTimestamp()
                .setFooter({ text: interaction.user.tag });

            return interaction.editReply({ embeds: [success] });

        } catch (err) {
            console.log(err);

            const errorEmbed = new EmbedBuilder()
                .setDescription("⚠ API request failed — Check console.")
                .setColor(Colors.Red)
                .setTimestamp()
                .setFooter({ text: interaction.user.tag });

            return interaction.editReply({ embeds: [errorEmbed] });
        }
    }
};
