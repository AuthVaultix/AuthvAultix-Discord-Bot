const { SlashCommandBuilder, EmbedBuilder, Colors } = require("discord.js");
const axios = require("axios");
const { getActiveSellerKey } = require("../../utils/config");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("fetchallvars")
        .setDescription("🌍 Retrieve all global variables"),

    async execute(interaction) {

        const sellerKey = await getActiveSellerKey(interaction.user.id);
        const BASE_URL = process.env.BASE_URL;

        // ❌ If seller key missing
        if (!sellerKey) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setDescription("❌ Seller key not set — use `/setsellerkey` first.")
                        .setColor(Colors.Red)
                        .setFooter({ text: interaction.user.tag })
                        .setTimestamp()
                ]
            });
        }

        // Loading UI 🔄 (Looks more professional)
        await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setDescription("⏳ Fetching all global variables...")
                    .setColor(Colors.Yellow)
                    .setFooter({ text: interaction.user.tag })
                    .setTimestamp()
            ]
        });

        try {
            const res = await axios.get(`${BASE_URL}?type=fetchallvars&sellerkey=${sellerKey}`);

            if (!res.data.success || !res.data.variables) {
                return interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setDescription(`❌ ${res.data.msg || "Failed fetching variables."}`)
                            .setColor(Colors.Red)
                            .setFooter({ text: interaction.user.tag })
                            .setTimestamp()
                    ]
                });
            }

            const vars = res.data.variables;
            if (vars.length === 0) {
                return interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setDescription("⚠ No global variables found.")
                            .setColor(Colors.Orange)
                            .setFooter({ text: interaction.user.tag })
                            .setTimestamp()
                    ]
                });
            }

            // Message content formatting
            let formatted = vars
                .map(v => `**${v.setting_key}** → \`${v.setting_value}\``)
                .join("\n");

            const embed = new EmbedBuilder()
                .setTitle("🌍 Global Variables (All)")
                .setDescription(formatted)
                .setColor(Colors.Green)
                .setFooter({ text: `Total: ${vars.length} • Requested by ${interaction.user.tag}` })
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });

        } catch (err) {
            console.error(err);
            return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setDescription("❌ API request failed — check console.")
                        .setColor(Colors.Red)
                        .setFooter({ text: interaction.user.tag })
                        .setTimestamp()
                ]
            });
        }
    }
};
