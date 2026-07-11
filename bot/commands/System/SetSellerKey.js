const {
    SlashCommandBuilder,
    EmbedBuilder,
    Colors,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");

const { setSellerKey } = require("../../utils/config");
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
        // 🔥 VERY IMPORTANT
        await interaction.deferReply({ flags: 64 }); // EPHEMERAL SAFE

        try {
            const rawKey = interaction.options.getString("key");

            // 🔗 API call
            const res = await axios.get(
                `https://authvaultix.com/api/getApplicationFromSellerKey.php?sellerkey=${rawKey}`,
                { timeout: 5000 }
            );

            if (!res.data?.application?.name) {
                return interaction.editReply("❌ Invalid seller key");
            }

            const baseAppName = res.data.application.name;

            // 🔐 SAVE (AUTO XD / XD-2 / XD-3)
            const finalAppName = await setSellerKey(
                interaction.user.id,
                baseAppName,
                rawKey
            );

            const embed = new EmbedBuilder()
                .setTitle("🔐 Seller Key Saved Successfully!")
                .setColor(Colors.Green)
                .setDescription(
                    [
                        `✅ Seller key stored safely`,
                        ``,
                        `📦 **Application Name:**`,
                        `\`${finalAppName}\``,
                        ``,
                        `🚀 Use /switchapp to select active app`
                    ].join("\n")
                )
                .setTimestamp();

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId("open_switchapp")
                    .setLabel("Switch Application")
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji("🔄")
            );

            return interaction.editReply({
                embeds: [embed],
                components: [row]
            });

        } catch (err) {
            console.error("SETSELLERKEY ERROR:", err);
            return interaction.editReply("❌ Something went wrong. Try again.");
        }
    }
};
