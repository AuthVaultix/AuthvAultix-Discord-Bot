const { SlashCommandBuilder, EmbedBuilder, Colors } = require("discord.js");
const axios = require("axios");
const { getActiveSellerKey } = require("../../utils/config");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("resellerlist")
        .setDescription("📄 Retrieve all registered resellers"),

    async execute(interaction) {

        const sellerKey = await getActiveSellerKey(interaction.user.id);
        const BASE_URL = process.env.BASE_URL;

        // ❌ No seller key
        if (!sellerKey) {
            const noKey = new EmbedBuilder()
                .setDescription("❌ Seller key not set! Use `/setsellerkey` first.")
                .setColor(Colors.Red)
                .setTimestamp()
                .setFooter({ text: interaction.user.tag });

            return interaction.reply({ embeds: [noKey] });
        }

        const loading = new EmbedBuilder()
            .setDescription("⏳ Fetching reseller list...")
            .setColor(Colors.Yellow)
            .setTimestamp()
            .setFooter({ text: interaction.user.tag });

        await interaction.reply({ embeds: [loading] });

        try {
            const res = await axios.get(`${BASE_URL}?type=resellerlist&sellerkey=${sellerKey}`);

            // ❌ API failed
            if (!res.data.success) {
                const failed = new EmbedBuilder()
                    .setDescription(`❌ ${res.data.msg || "Unable to fetch resellers."}`)
                    .setColor(Colors.Red)
                    .setTimestamp()
                    .setFooter({ text: interaction.user.tag });

                return interaction.editReply({ embeds: [failed] });
            }

            const list = res.data.resellers;

            // ⚠ No resellers found
            if (!list || list.length === 0) {
                const none = new EmbedBuilder()
                    .setDescription("⚠ No resellers found!")
                    .setColor(Colors.Orange)
                    .setTimestamp()
                    .setFooter({ text: interaction.user.tag });

                return interaction.editReply({ embeds: [none] });
            }

            // format list (limit 25 to avoid discord overflow)
            const formatted = list.slice(0, 25).map((r, i) =>
                `\`${i+1}\` • **${r.username}**\n📆 Created: *${r.created_at}*`
            ).join("\n\n");

            const embed = new EmbedBuilder()
                .setTitle("📄 Registered Resellers")
                .setDescription(`\`\`\`\nTotal: ${list.length}\n\`\`\`\n${formatted}`)
                .setColor(Colors.Blue)
                .setTimestamp()
                .setFooter({ text: `Showing ${Math.min(list.length,25)} of ${list.length}+` });

            return interaction.editReply({ embeds: [embed] });

        } catch (err) {
            console.log(err);

            const apiError = new EmbedBuilder()
                .setDescription("⚠ API request failed — Check console.")
                .setColor(Colors.Red)
                .setTimestamp()
                .setFooter({ text: interaction.user.tag });

            return interaction.editReply({ embeds: [apiError] });
        }
    }
};
