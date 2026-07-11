const { SlashCommandBuilder, EmbedBuilder, Colors } = require("discord.js");
const axios = require("axios");
const { getActiveSellerKey } = require("../../utils/config");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("addvar")
        .setDescription("🆕 Create a new global variable")
        .addStringOption(opt =>
            opt.setName("key")
                .setDescription("Variable name")
                .setRequired(true)
        )
        .addStringOption(opt =>
            opt.setName("value")
                .setDescription("Variable value")
                .setRequired(true)
        ),

    async execute(interaction) {

        const sellerKey = await getActiveSellerKey(interaction.user.id);
        const BASE_URL = process.env.BASE_URL;

        // ❌ Seller key missing
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

        // ⏳ WAIT embed
        const loading = new EmbedBuilder()
            .setDescription(`⏳ Creating global variable **${key}**...`)
            .setColor(Colors.Yellow)
            .setFooter({ text: interaction.user.tag })
            .setTimestamp();

        await interaction.reply({ embeds: [loading] });

        try {
            const res = await axios.get(
                `${BASE_URL}?type=addvar&sellerkey=${sellerKey}&key=${encodeURIComponent(key)}&value=${encodeURIComponent(value)}`
            );

            // ❌ Failed
            if (!res.data.success) {
                const fail = new EmbedBuilder()
                    .setDescription(`❌ ${res.data.msg || "Failed to create variable"}`)
                    .setColor(Colors.Red)
                    .setFooter({ text: interaction.user.tag })
                    .setTimestamp();

                return interaction.editReply({ embeds: [fail] });
            }

            // 🟢 SUCCESS EMBED
            const success = new EmbedBuilder()
                .setTitle("🆕 Global Variable Created Successfully")
                .addFields(
                    { name: "Variables Name", value: `\`${key}\`` },
                    { name: "Variables Deta", value: `\`${value}\`` }
                )
                .setColor(Colors.Green)
                .setFooter({ text: interaction.user.tag })
                .setTimestamp();

            return interaction.editReply({ embeds: [success] });

        } catch (err) {
            console.log(err);

            const apiError = new EmbedBuilder()
                .setDescription("❌ API request failed — check console.")
                .setColor(Colors.Red)
                .setFooter({ text: interaction.user.tag })
                .setTimestamp();

            return interaction.editReply({ embeds: [apiError] });
        }
    }
};
