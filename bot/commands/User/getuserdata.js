const { SlashCommandBuilder, EmbedBuilder, Colors } = require("discord.js");
const axios = require("axios");
const { getActiveSellerKey } = require("../../utils/config");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("userdata")
        .setDescription("Get complete user details")
        .addStringOption(opt =>
            opt.setName("username")
                .setDescription("Enter username")
                .setRequired(true)
        ),

    async execute(interaction) {
        const sellerKey = await getActiveSellerKey(interaction.user.id);
        const BASE_URL = process.env.BASE_URL;

        if (!sellerKey) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(Colors.Red)
                        .setDescription("❌ Seller key not set — use **/setsellerkey** first")
                ]
            });
        }

        const username = interaction.options.getString("username");

        try {
            const res = await axios.get(`${BASE_URL}?type=userdata&sellerkey=${sellerKey}&username=${username}`);

            if (!res.data.success) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(Colors.Red)
                            .setDescription(`❌ ${res.data.msg}`)
                    ]
                });
            }

            const u = res.data.user;

            const embed = new EmbedBuilder()
                .setTitle(`👤 User Info — ${u.username}`)
                .setColor(Colors.Blue)
                .addFields(
                    { name: "📦 Subscription", value: u.subscription || "None", inline: true },
                    { name: "⌛ Expiry", value: u.expiry ? `<t:${u.expiry}:R>` : "🔓 Lifetime", inline: true },
                    { name: "🔑 HWID", value: u.hwid || "None", inline: false },
                    { name: "🌍 IP Address", value: u.ip_address || "Unknown", inline: true },
                    { name: "🚫 Banned", value: u.is_banned ? "Yes ❗" : "No ✔", inline: true },
                    { name: "⏸ Paused", value: u.is_paused ? "Paused ⛔" : "Active ▶", inline: true },
                    { name: "📅 Created At", value: u.created_at, inline: false },
                    { name: "🔐 Last Login", value: u.last_login || "Never Logged In", inline: false }
                )
                .setTimestamp();

            return interaction.reply({ embeds: [embed] });

        } catch (err) {
            console.log(err);

            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(Colors.Red)
                        .setDescription("❌ API Request Failed — Check Console")
                ]
            });
        }
    }
};
