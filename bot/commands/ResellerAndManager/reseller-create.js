const { SlashCommandBuilder, EmbedBuilder, Colors } = require("discord.js");
const axios = require("axios");
const { getActiveSellerKey } = require("../../utils/config");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("resellercreate")
        .setDescription("🛒 Create a new reseller account")
        .addStringOption(o =>
            o.setName("username")
                .setDescription("Enter new reseller username")
                .setRequired(true)
        )
        .addStringOption(o =>
            o.setName("password")
                .setDescription("Set password for the reseller")
                .setRequired(true)
        ),

    async execute(interaction) {
        
        const sellerKey = await getActiveSellerKey(interaction.user.id);
        const BASE_URL = process.env.BASE_URL;

        // ❌ No key error
        if (!sellerKey) {
            const noKey = new EmbedBuilder()
                .setDescription("❌ Seller key not set! Use `/setsellerkey` first.")
                .setColor(Colors.Red)
                .setTimestamp()
                .setFooter({ text: interaction.user.tag });

            return interaction.reply({ embeds: [noKey] });
        }

        const username = interaction.options.getString("username");
        const password = interaction.options.getString("password");

        // ⏳ Creating message
        const pending = new EmbedBuilder()
            .setDescription(`⏳ Creating reseller **${username}**...`)
            .setColor(Colors.Yellow)
            .setTimestamp()
            .setFooter({ text: interaction.user.tag });

        await interaction.reply({ embeds: [pending] });

        try {
            const url = `${BASE_URL}?type=resellercreate&sellerkey=${sellerKey}&username=${username}&password=${password}`;
            const res = await axios.get(url);

            // ❌ Failed
            if (!res.data.success) {
                const fail = new EmbedBuilder()
                    .setDescription(`❌ ${res.data.msg || "Failed to create reseller."}`)
                    .setColor(Colors.Red)
                    .setTimestamp()
                    .setFooter({ text: interaction.user.tag });

                return interaction.editReply({ embeds: [fail] });
            }

            // 🟢 SUCCESS UI
            const success = new EmbedBuilder()
                .setTitle("🛒 Reseller Created Successfully")
                .addFields(
                    { name: "Username", value: `**${username}**` },
                    { name: "Temporary Password", value: `\`${password}\`` },
                    { name: "Panel URL", value: `${res.data.panel_url ?? "https://authsecure.shop/win/resaller/"}` }
                )
                .setColor(Colors.Green)
                .setTimestamp()
                .setFooter({ text: "Reseller panel generated", iconURL: interaction.user.displayAvatarURL() });

            return interaction.editReply({ embeds: [success] });

        } catch (err) {
            console.log(err);

            const apiError = new EmbedBuilder()
                .setDescription("⚠ Request Failed — Check console.")
                .setColor(Colors.Red)
                .setTimestamp()
                .setFooter({ text: interaction.user.tag });

            return interaction.editReply({ embeds: [apiError] });
        }
    }
};
