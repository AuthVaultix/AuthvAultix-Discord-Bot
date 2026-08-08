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
        .setName("deleteapp")
        .setDescription("Delete a saved application seller key"),

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
                        .setDescription("❌ No applications found to delete.")
                ]
            });
        }

        // ✅ REMOVE DUPLICATES (FIX 50035)
        const uniqueApps = [...new Set(apps)];

        const menu = new StringSelectMenuBuilder()
            .setCustomId("deleteapp_select")
            .setPlaceholder("Select application to delete")
            .addOptions(
                uniqueApps.map(app => ({
                    label: app,
                    value: app,
                    description: `Delete seller key for ${app}`
                }))
            );

        const row = new ActionRowBuilder().addComponents(menu);

        return interaction.editReply({
            embeds: [
                new EmbedBuilder()
                    .setTitle("🗑️ Delete Application")
                    .setDescription("Select the application key you want to delete:")
                    .setColor(Colors.Red)
            ],
            components: [row]
        });
    }
};
