const {
    SlashCommandBuilder,
    EmbedBuilder,
    Colors,
    ActionRowBuilder,
    StringSelectMenuBuilder
} = require("discord.js");

const { setSellerKey, getUserApps } = require("../../utils/config");
const axios = require("axios");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("setsellerkey")
        .setDescription("Set AuthSecure seller key")
        .addStringOption(o =>
            o.setName("key")
             .setDescription("Seller key")
             .setRequired(true)
        ),

    async execute(interaction) {
        await interaction.deferReply({ flags: 64 }); // EPHEMERAL SAFE

        try {
            const rawKey = interaction.options.getString("key").trim();

            // API call
            const res = await axios.get(
                `https://authvaultix.com/api/getApplicationFromSellerKey.php?sellerkey=${encodeURIComponent(rawKey)}`,
                { timeout: 8000 }
            );

            if (!res.data?.application?.name) {
                const errMsg = res.data?.message || "Invalid seller key";
                return interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(Colors.Red)
                            .setTitle("❌ Invalid Seller Key")
                            .setDescription(`Server response: **${errMsg}**\nPlease make sure your key is active in your AuthVaultix dashboard.`)
                            .setTimestamp()
                    ]
                });
            }

            const baseAppName = res.data.application.name;

            // SAVE AND AUTO-ACTIVATE NEW KEY
            const finalAppName = await setSellerKey(
                interaction.user.id,
                baseAppName,
                rawKey
            );

            // 1. Send Success Message
            const successEmbed = new EmbedBuilder()
                .setTitle("✅ Seller Key Saved Successfully!")
                .setColor(Colors.Green)
                .setDescription(
                    [
                        `🔒 Seller key stored safely.`,
                        ``,
                        `📱 **Application Name:**`,
                        `\`${finalAppName}\``,
                        ``,
                        `✨ **Active Application:** Set to **\`${finalAppName}\`** automatically!`,
                        ``,
                        `🚀 Use \`/switchapp\` anytime to switch between apps`,
                        `🗑️ Use \`/deleteapp\` to remove an app`
                    ].join("\n")
                )
                .setTimestamp();

            await interaction.editReply({
                embeds: [successEmbed]
            });

            // 2. Automatically execute /switchapp dropdown so the user doesn't have to run it manually
            const apps = await getUserApps(interaction.user.id);
            const uniqueApps = [...new Set(apps)];

            if (uniqueApps.length > 0) {
                const menu = new StringSelectMenuBuilder()
                    .setCustomId("switchapp_select")
                    .setPlaceholder(`Active: ${finalAppName} (Select to switch)`)
                    .addOptions(
                        uniqueApps.map(app => ({
                            label: app,
                            value: app,
                            description: app === finalAppName ? "Current Active Application" : `Switch to ${app}`
                        }))
                    );

                const row = new ActionRowBuilder().addComponents(menu);

                return await interaction.followUp({
                    embeds: [
                        new EmbedBuilder()
                            .setTitle("🔄 Switch Application")
                            .setDescription(`Current active application: **${finalAppName}**\n\nTo switch to another application, select it from the menu below:`)
                            .setColor(Colors.Blue)
                    ],
                    components: [row],
                    flags: 64
                });
            }

        } catch (err) {
            console.error("SETSELLERKEY ERROR:", err);
            return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(Colors.Red)
                        .setDescription(`❌ Something went wrong: ${err.message || "Try again."}`)
                        .setTimestamp()
                ]
            });
        }
    }
};
