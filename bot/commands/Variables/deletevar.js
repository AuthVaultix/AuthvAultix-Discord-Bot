const { SlashCommandBuilder, EmbedBuilder, Colors } = require("discord.js");
const axios = require("axios");
const { getActiveSellerKey } = require("../../utils/config");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("delvar")
        .setDescription("🗑 Delete a global variable by key")
        .addStringOption(o =>
            o.setName("key")
                .setDescription("Name of variable to delete")
                .setRequired(true)
        ),

    async execute(interaction) {

        const sellerKey = await getActiveSellerKey(interaction.user.id);
        const BASE_URL  = process.env.BASE_URL;

        // ❌ Seller key missing
        if (!sellerKey) {
            const noKey = new EmbedBuilder()
                .setDescription("❌ Seller key not set — use `/setsellerkey` first.")
                .setColor(Colors.Red)
                .setTimestamp()
                .setFooter({ text: interaction.user.tag });

            return interaction.reply({ embeds: [noKey] });
        }

        const variable = interaction.options.getString("key");

        // ⏳ Processing embed
        const wait = new EmbedBuilder()
            .setDescription(`⏳ Deleting global variable **${variable}**...`)
            .setColor(Colors.Yellow)
            .setTimestamp()
            .setFooter({ text: interaction.user.tag });

        await interaction.reply({ embeds: [wait] });

        try {
            const res = await axios.get(
                `${BASE_URL}?type=delvar&sellerkey=${sellerKey}&key=${encodeURIComponent(variable)}`
            );

            // ❌ Delete failed
            if (!res.data.success) {
                const failed = new EmbedBuilder()
                    .setDescription(`❌ ${res.data.msg || "Failed to delete variable"}`)
                    .setColor(Colors.Red)
                    .setTimestamp()
                    .setFooter({ text: interaction.user.tag });

                return interaction.editReply({ embeds: [failed] });
            }

            // 🟢 SUCCESS EMBED
            const success = new EmbedBuilder()
                .setTitle("🗑 Variable Deleted Successfully")
                .addFields({ name: "Deleted Key", value: `\`${variable}\`` })
                .setColor(Colors.Green)
                .setTimestamp()
                .setFooter({ text: interaction.user.tag });

            return interaction.editReply({ embeds: [success] });

        } catch (err) {
            console.log(err);

            const apiErr = new EmbedBuilder()
                .setDescription("❌ API Request Failed — Check console")
                .setColor(Colors.Red)
                .setTimestamp()
                .setFooter({ text: interaction.user.tag });

            return interaction.editReply({ embeds: [apiErr] });
        }
    }
};
