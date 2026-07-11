const { SlashCommandBuilder, EmbedBuilder, Colors } = require("discord.js");
const { pool } = require("../../utils/db");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("ping")
        .setDescription("Check database latency"),

    async execute(interaction) {

        // 🔥 IMPORTANT FIX
        await interaction.deferReply({ flags: 64 }); // ephemeral

        /* ======================
           DB LATENCY
        ====================== */
        let dbLatency = "Not connected";
        try {
            const dbStart = Date.now();
            await pool.query("SELECT 1");
            dbLatency = `${Date.now() - dbStart} ms`;
        } catch (err) {
            dbLatency = "Failed";
        }

        /* ======================
           EMBED
        ====================== */
        const embed = new EmbedBuilder()
            .setTitle("🏓 Pong!")
            .setColor(Colors.Green)
            .addFields(
                { name: "Latency", value: `\`${dbLatency}\``, inline: true }
            )
            .setTimestamp()
            .setFooter({
                text: interaction.user.tag,
                iconURL: interaction.user.displayAvatarURL()
            });

        return interaction.editReply({
            embeds: [embed]
        });
    }
};
