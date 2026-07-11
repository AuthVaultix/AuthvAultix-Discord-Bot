const { SlashCommandBuilder, EmbedBuilder, Colors } = require("discord.js");
const axios = require("axios");
const { getActiveSellerKey } = require("../../utils/config");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("getusers")
        .setDescription("📜 Retrieve all users of your application"),

    async execute(interaction) {

        const sellerKey = await getActiveSellerKey(interaction.user.id);
        const BASE_URL = process.env.BASE_URL;

        // No seller key → Red warning embed
        if (!sellerKey) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(Colors.Red)
                        .setDescription("❌ Seller key not set. Use **/setsellerkey** first.")
                ],
                ephemeral: true
            });
        }

        const url = `${BASE_URL}?type=userdata&sellerkey=${sellerKey}`;

        try {
            const res = await axios.get(url);

            if (!res.data.success) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(Colors.Red)
                            .setDescription("❌ Failed retrieving user list.\n" + (res.data.msg || "API Error"))
                    ]
                });
            }

            const users = res.data.users;
            if (!users.length) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(Colors.Yellow)
                            .setDescription("📭 No users found in your application.")
                    ]
                });
            }

            // Format first 50 users only
            const list = users.slice(0, 50).map(u => 
                `• **${u.username}** | 🏷 Sub: **${u.subscription}** | ⏳ Exp: **${u.expiry}** | ⏸ Paused: **${u.is_paused ? "Yes" : "No"}**`
            ).join("\n");

            const embed = new EmbedBuilder()
                .setTitle("📜 User List")
                .setColor(Colors.Blue)
                .setDescription(list)
                .setFooter({ text: `Total users: ${users.length} | Showing 50 max` })
                .setTimestamp();

            return interaction.reply({ embeds: [embed] });

        } catch (err) {
            console.error(err);
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(Colors.Red)
                        .setDescription("❌ API Request Failed — Check console/Base URL.")
                ]
            });
        }
    }
};
