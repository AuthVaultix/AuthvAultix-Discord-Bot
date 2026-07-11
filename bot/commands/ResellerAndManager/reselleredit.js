const { SlashCommandBuilder, EmbedBuilder, Colors } = require("discord.js");
const axios = require("axios");
const { getActiveSellerKey } = require("../../utils/config");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("reselleredit")
        .setDescription("✏ Edit a reseller username/password")
        .addStringOption(o =>
            o.setName("username")
                .setDescription("Old reseller username")
                .setRequired(true)
        )
        .addStringOption(o =>
            o.setName("new_username")
                .setDescription("New username to update")
                .setRequired(true)
        )
        .addStringOption(o =>
            o.setName("new_password")
                .setDescription("New password (optional)")
                .setRequired(false)
        ),

    async execute(interaction) {

        const sellerKey = await getActiveSellerKey(interaction.user.id);
        const BASE_URL = process.env.BASE_URL;

        // ❌ No SellerKey
        if (!sellerKey) {
            const noKey = new EmbedBuilder()
                .setColor(Colors.Red)
                .setDescription("❌ Seller key not configured. Use `/setsellerkey` first!")
                .setTimestamp()
                .setFooter({ text: interaction.user.tag });
            return interaction.reply({ embeds: [noKey] });
        }

        const oldUser = interaction.options.getString("username");
        const newUser = interaction.options.getString("new_username");
        const newPass = interaction.options.getString("new_password") ?? "";

        const url = `${BASE_URL}?type=reselleredit&sellerkey=${sellerKey}&username=${oldUser}&new_username=${newUser}&new_password=${newPass}`;

        // ⏳ Updating embed
        const updating = new EmbedBuilder()
            .setColor(Colors.Yellow)
            .setDescription(`✏ Updating reseller **${oldUser} → ${newUser}**...`)
            .setTimestamp()
            .setFooter({ text: interaction.user.tag });

        await interaction.reply({ embeds: [updating] });

        try {
            const res = await axios.get(url);

            // ❌ Failed
            if (!res.data.success) {
                const failed = new EmbedBuilder()
                    .setColor(Colors.Red)
                    .setDescription(`❌ ${res.data.msg}`)
                    .setTimestamp()
                    .setFooter({ text: interaction.user.tag });
                return interaction.editReply({ embeds: [failed] });
            }

            // 🟩 SUCCESS RESULT
            const success = new EmbedBuilder()
                .setTitle("🟩 Reseller Updated Successfully")
                .addFields(
                    { name: "Old Username", value: `**${oldUser}**`, inline: true },
                    { name: "New Username", value: `**${newUser}**`, inline: true },
                    { name: "Password Changed", value: res.data.updated.password_changed ? "🔐 YES" : "❌ NO", inline: true }
                )
                .setColor(Colors.Green)
                .setTimestamp()
                .setFooter({ text: interaction.user.tag });

            return interaction.editReply({ embeds: [success] });

        } catch (err) {
            console.error(err);

            const errorEmbed = new EmbedBuilder()
                .setColor(Colors.Red)
                .setDescription("⚠ API Request Error — Check console.")
                .setTimestamp()
                .setFooter({ text: interaction.user.tag });

            return interaction.editReply({ embeds: [errorEmbed] });
        }
    }
};
