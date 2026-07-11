const { SlashCommandBuilder, EmbedBuilder, Colors } = require("discord.js");
const axios = require("axios");
const { getActiveSellerKey } = require("../../utils/config");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("retrvvar")
        .setDescription("🔍 Retrieve a specific global variable")
        .addStringOption(o =>
            o.setName("key")
                .setDescription("Variable name to retrieve")
                .setRequired(true)
        ),

    async execute(interaction) {

        const sellerKey = await getActiveSellerKey(interaction.user.id);
        const BASE_URL = process.env.BASE_URL;

        // ❌ No seller key
        if (!sellerKey) {
            const noKey = new EmbedBuilder()
                .setDescription("❌ Seller key not set — use `/setsellerkey` first.")
                .setColor(Colors.Red)
                .setFooter({ text: interaction.user.tag })
                .setTimestamp();
            return interaction.reply({ embeds: [noKey] });
        }

        const key = interaction.options.getString("key");

        // ⏳ Loading Embed
        const loading = new EmbedBuilder()
            .setDescription(`⏳ Retrieving variable **${key}**...`)
            .setColor(Colors.Yellow)
            .setFooter({ text: interaction.user.tag })
            .setTimestamp();

        await interaction.reply({ embeds: [loading] });

        try {
            const res = await axios.get(
                `${BASE_URL}?type=retrvvar&sellerkey=${sellerKey}&key=${encodeURIComponent(key)}`
            );

            // ❌ If not found
            if (!res.data.success) {
                const failed = new EmbedBuilder()
                    .setDescription(`❌ ${res.data.msg || "Variable not found."}`)
                    .setColor(Colors.Red)
                    .setFooter({ text: interaction.user.tag })
                    .setTimestamp();
                return interaction.editReply({ embeds: [failed] });
            }

            // 🟢 SUCCESS DISPLAY
            const variable = res.data.variable;

            const success = new EmbedBuilder()
                .setTitle("🔍 Global Variable Retrieved")
                .addFields(
                    { name: "🗝 Key", value: `\`${key}\``, inline: true },
                    { name: "📌 Value", value: `\`${variable.setting_value || "None"}\``, inline: true }
                )
                .setColor(Colors.Green)
                .setFooter({ text: interaction.user.tag })
                .setTimestamp();

            return interaction.editReply({ embeds: [success] });

        } catch (err) {
            console.error(err);

            const apiErr = new EmbedBuilder()
                .setDescription("❌ API request failed — check console.")
                .setColor(Colors.Red)
                .setFooter({ text: interaction.user.tag })
                .setTimestamp();

            return interaction.editReply({ embeds: [apiErr] });
        }
    }
};
