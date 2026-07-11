const { SlashCommandBuilder, EmbedBuilder, Colors } = require("discord.js");
const axios = require("axios");
const { getActiveSellerKey } = require("../../utils/config");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("clearlogsip")
        .setDescription("Delete KeyAuth logs by specific IP address")
        .addStringOption(o =>
            o.setName("ip")
                .setDescription("IP address to remove logs for")
                .setRequired(true)
        ),

    async execute(interaction) {
        
        const sellerKey = await getActiveSellerKey(interaction.user.id);
        const BASE_URL = process.env.BASE_URL;

        // ❌ Seller key missing
        if (!sellerKey) {
            const noKey = new EmbedBuilder()
                .setDescription("❌ Seller key not set. Use `/setsellerkey` first.")
                .setColor(Colors.Red)
                .setTimestamp()
                .setFooter({ text: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() });

            return interaction.reply({ embeds: [noKey] });
        }

        const ip = interaction.options.getString("ip");
        const url = `${BASE_URL}?type=clearlogsip&sellerkey=${sellerKey}&ip=${ip}&format=json`;

        try {
            const res = await axios.get(url);

            // 🟢 SUCCESS
            if (res.data.success) {
                const success = new EmbedBuilder()
                    .setTitle("🗑 Logs Deleted Successfully")
                    .addFields(
                        { name: "Target IP", value: `\`${ip}\`` },
                        { name: "Deleted Entries", value: `${res.data.deleted_rows}` }
                    )
                    .setColor(Colors.Green)
                    .setTimestamp()
                    .setFooter({ text: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() });

                return interaction.reply({ embeds: [success] });
            }

            // ❌ Failed result
            const failed = new EmbedBuilder()
                .setDescription(`❌ Failed — ${res.data.message || "Unknown error"}`)
                .setColor(Colors.Red)
                .setTimestamp()
                .setFooter({ text: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() });

            return interaction.reply({ embeds: [failed] });

        } catch (error) {
            console.log(error);

            const apiError = new EmbedBuilder()
                .setDescription("❌ API request failed — check console.")
                .setColor(Colors.Red)
                .setTimestamp()
                .setFooter({ text: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() });

            return interaction.reply({ embeds: [apiError] });
        }
    }
};
