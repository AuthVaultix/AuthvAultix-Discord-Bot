const { SlashCommandBuilder, EmbedBuilder, Colors } = require("discord.js");
const axios = require("axios");
const { getActiveSellerKey } = require("../../utils/config");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("killsessionsip")
        .setDescription("🛑 Terminate all active sessions from a specific IP address")
        .addStringOption(o =>
            o.setName("ip")
                .setDescription("Enter IP address to kill sessions")
                .setRequired(true)
        ),

    async execute(interaction) {

        const sellerKey = await getActiveSellerKey(interaction.user.id);
        const BASE_URL = process.env.BASE_URL;

        // ❌ Seller Key Missing
        if (!sellerKey) {
            const noKey = new EmbedBuilder()
                .setDescription("❌ Seller key not set. Use `/setsellerkey` first.")
                .setColor(Colors.Red)
                .setTimestamp()
                .setFooter({ text: interaction.user.tag });
            return interaction.reply({ embeds: [noKey] });
        }

        const ip = interaction.options.getString("ip");

        const loading = new EmbedBuilder()
            .setDescription(`⏳ Killing sessions associated with **${ip}**...`)
            .setColor(Colors.Yellow)
            .setTimestamp()
            .setFooter({ text: interaction.user.tag });
        await interaction.reply({ embeds: [loading] });

        try {
            const res = await axios.get(`${BASE_URL}?type=killsessionsip&sellerkey=${sellerKey}&type=kill_ip&ip=${ip}`);

            // ❌ Error Response
            if (typeof res.data === "object" && !res.data.success) {
                const failed = new EmbedBuilder()
                    .setDescription(`❌ Failed — ${res.data.message || "Unknown error"}`)
                    .setColor(Colors.Red)
                    .setTimestamp()
                    .setFooter({ text: interaction.user.tag });
                return interaction.editReply({ embeds: [failed] });
            }

            // 🟢 SUCCESS EMBED
            const success = new EmbedBuilder()
                .setTitle("🛑 Sessions Terminated")
                .addFields({ name: "Target IP", value: `\`${ip}\`` })
                .setColor(Colors.Green)
                .setTimestamp()
                .setFooter({ text: interaction.user.tag });

            return interaction.editReply({ embeds: [success] });

        } catch (err) {
            console.error(err);

            const apiFail = new EmbedBuilder()
                .setDescription("❌ API request failed — Check console.")
                .setColor(Colors.Red)
                .setTimestamp()
                .setFooter({ text: interaction.user.tag });

            return interaction.editReply({ embeds: [apiFail] });
        }
    }
};
