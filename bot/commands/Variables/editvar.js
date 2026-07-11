const { SlashCommandBuilder, EmbedBuilder, Colors } = require("discord.js");
const axios = require("axios");
const { getActiveSellerKey } = require("../../utils/config");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("editvar")
        .setDescription("✏ Edit an existing global variable")
        .addStringOption(opt =>
            opt.setName("key")
                .setDescription("Variable name/key to update")
                .setRequired(true)
        )
        .addStringOption(opt =>
            opt.setName("value")
                .setDescription("New value for variable")
                .setRequired(true)
        ),

    async execute(interaction) {

        const sellerKey = await getActiveSellerKey(interaction.user.id);
        const BASE_URL  = process.env.BASE_URL;

        // ❌ No Seller Key
        if (!sellerKey) {
            const noKey = new EmbedBuilder()
                .setDescription("❌ Seller key not set — use `/setsellerkey` first.")
                .setColor(Colors.Red)
                .setFooter({ text: interaction.user.tag })
                .setTimestamp();
            return interaction.reply({ embeds: [noKey] });
        }

        const key   = interaction.options.getString("key");
        const value = interaction.options.getString("value");

        // ⏳ Processing Embed
        const loading = new EmbedBuilder()
            .setDescription(`⏳ Updating variable **${key}**...`)
            .setColor(Colors.Yellow)
            .setFooter({ text: interaction.user.tag })
            .setTimestamp();

        await interaction.reply({ embeds: [loading] });

        try {
            const res = await axios.get(
                `${BASE_URL}?type=editvar&sellerkey=${sellerKey}&key=${encodeURIComponent(key)}&value=${encodeURIComponent(value)}`
            );

            // ❌ Failed
            if (!res.data.success) {
                const failed = new EmbedBuilder()
                    .setDescription(`❌ ${res.data.msg || "Failed to update variable"}`)
                    .setColor(Colors.Red)
                    .setFooter({ text: interaction.user.tag })
                    .setTimestamp();
                return interaction.editReply({ embeds: [failed] });
            }

            // 🟢 SUCCESS EMBED
            const success = new EmbedBuilder()
                .setTitle("✏ Global Variable Updated Successfully")
                .addFields(
                    { name: "🗝 Key", value: `\`${key}\``, inline: true },
                    { name: "📌 New Value", value: `\`${value}\``, inline: true }
                )
                .setColor(Colors.Green)
                .setFooter({ text: interaction.user.tag })
                .setTimestamp();

            return interaction.editReply({ embeds: [success] });

        } catch (err) {
            console.log(err);

            const apiErr = new EmbedBuilder()
                .setDescription("❌ API Request Failed — check console")
                .setColor(Colors.Red)
                .setFooter({ text: interaction.user.tag })
                .setTimestamp();

            return interaction.editReply({ embeds: [apiErr] });
        }
    }
};
