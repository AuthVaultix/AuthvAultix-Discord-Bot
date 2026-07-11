const { SlashCommandBuilder, EmbedBuilder, Colors } = require("discord.js");
const axios = require("axios");
const { getActiveSellerKey } = require("../../utils/config");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("createuser")
        .setDescription("Create a new user in the system")
        .addStringOption(o =>
            o.setName("username")
                .setDescription("Enter new username")
                .setRequired(true)
        )
        .addStringOption(o =>
            o.setName("password")
                .setDescription("Password for user")
                .setRequired(true)
        )
        .addIntegerOption(o =>
            o.setName("expiry")
                .setDescription("Expiry (Days) — 0 = Lifetime")
                .setRequired(true)
        )
        .addStringOption(o =>
            o.setName("subscription")
                .setDescription("Subscription plan to assign (default: 'default')")
                .setRequired(false)
        ),

    async execute(interaction) {

const sellerKey = await getActiveSellerKey(interaction.user.id);
        const BASE_URL = process.env.BASE_URL;

        // If no seller key
        if (!sellerKey) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(Colors.Red)
                        .setDescription("❌ Seller key not set — use `/setsellerkey` first.")
                        .setTimestamp()
                ]
            });
        }

        const username = interaction.options.getString("username");
        const password = interaction.options.getString("password");
        const subscription = interaction.options.getString("subscription") || "default";
        const expiry = interaction.options.getInteger("expiry");

        // Loading visual response
        await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(Colors.Yellow)
                    .setDescription(`🔄 Creating user **${username}**...`)
                    .setTimestamp()
            ]
        });

        const url = `${BASE_URL}?type=adduser&sellerkey=${sellerKey}&username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&subscription=${encodeURIComponent(subscription)}&expiry=${expiry}`;

        try {
            const res = await axios.get(url);

            if (!res.data.success) {
                return interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(Colors.Red)
                            .setDescription(`❌ Failed — ${res.data.msg}`)
                            .setTimestamp()
                    ]
                });
            }

            // SUCCESS EMBED
            return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle("User Created Successfully")
                        .setColor(Colors.Green)
                        .addFields(
                            { name: "👤 Username", value: `\`${username}\`` },
                            { name: "🔐 Subscription", value: `**${subscription}**`, inline: true },
                            { name: "  Expiry", value: expiry == 0 ? "`Lifetime`" : `**${expiry} days**`, inline: true }
                        )
                        .setFooter({ text: "Account Registered" })
                        .setTimestamp()
                ]
            });

        } catch (err) {
            console.error(err);
            return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(Colors.Red)
                        .setDescription("❌ API Request Failed — Check console.")
                        .setTimestamp()
                ]
            });
        }
    }
};
