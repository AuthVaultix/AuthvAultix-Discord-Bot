const {
    SlashCommandBuilder,
    EmbedBuilder,
    Colors,
    ActionRowBuilder,
    StringSelectMenuBuilder
} = require("discord.js");

const { getUserApps } = require("../../utils/config");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("switchapp")
        .setDescription("Select active application"),

    async execute(interaction) {

        // 🔥 IMPORTANT (prevents 10062)
        await interaction.deferReply({ flags: 64 });

        const userId = interaction.user.id;

        const apps = await getUserApps(userId);

        if (!apps || apps.length === 0) {
            return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(Colors.Red)
                        .setDescription("❌ No applications found for your seller keys.")
                ]
            });
        }

        // ✅ REMOVE DUPLICATES (FIX 50035)
        const uniqueApps = [...new Set(apps)];

        const menu = new StringSelectMenuBuilder()
            .setCustomId("switchapp_select")
            .setPlaceholder("Select application")
            .addOptions(
                uniqueApps.map(app => ({
                    label: app,
                    value: app
                }))
            );

        const row = new ActionRowBuilder().addComponents(menu);

        return interaction.editReply({
            embeds: [
                new EmbedBuilder()
                    .setTitle("🔁 Switch Application")
                    .setDescription("Select the application you want to use")
                    .setColor(Colors.Blue)
            ],
            components: [row]
        });
    }
};
