const { SlashCommandBuilder, EmbedBuilder, Colors } = require("discord.js");
const axios = require("axios");
const { getActiveSellerKey } = require("../../utils/config");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("setvar")
        .setDescription("Create or modify a user variable")
        .addStringOption(o => 
            o.setName("username")
             .setDescription("Username to modify")
             .setRequired(true)
        )
        .addStringOption(o => 
            o.setName("key")
             .setDescription("Variable name")
             .setRequired(true)
        )
        .addStringOption(o => 
            o.setName("value")
             .setDescription("New variable value")
             .setRequired(true)
        ),

    async execute(interaction) {

        const sellerKey = await getActiveSellerKey(interaction.user.id);
        const BASE_URL = process.env.BASE_URL;

        if (!sellerKey) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(Colors.Red)
                        .setDescription("❌ Seller key not set — use `/setsellerkey` first.")
                ],
                ephemeral: true
            });
        }

        const user = interaction.options.getString("username");
        const key  = interaction.options.getString("key");
        const val  = interaction.options.getString("value");

        const url = `${BASE_URL}?type=setvar&sellerkey=${sellerKey}&username=${user}&var=${key}&newdata=${encodeURIComponent(val)}`;

        try {
            const r = await axios.get(url);

            if (!r.data.success) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(Colors.Red)
                            .setDescription(`❌ ${r.data.msg || "Failed to update variable"}`)
                    ]
                });
            }

            const embed = new EmbedBuilder()
                .setTitle("🟢 User Variable Saved")
                .setColor(Colors.Green)
                .addFields(
                    { name: "👤 User", value: `\`${user}\``, inline: true },
                    { name: "🔑 Key", value: key, inline: true },
                    { name: "📝 New Value", value: `\`${val}\`` }
                )
                .setTimestamp();

            return interaction.reply({ embeds: [embed] });

        } catch (e) {
            console.error(e);
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(Colors.Red)
                        .setDescription("⚠ API Request Failed — Check Server / URL & Try Again")
                ]
            });
        }
    }
};
