const { SlashCommandBuilder, EmbedBuilder, Colors } = require("discord.js");
const axios = require("axios");
const { getActiveSellerKey } = require("../../utils/config");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("fetchauservars")
        .setDescription("Retrieve all user variables for a specific user")
        .addStringOption(o =>
            o.setName("username")
                .setDescription("Username to retrieve variables for")
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
                        .setDescription("❌ Seller key not set — use `/setsellerkey` first.")
                ],
                ephemeral: true
            });
        }

        const username = interaction.options.getString("username");
        const url = `${BASE_URL}?type=getvar&sellerkey=${sellerKey}&username=${username}`;

        try {
            const res = await axios.get(url);

            if (!res.data.success) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(Colors.Red)
                            .setDescription(`❌ ${res.data.msg || "Failed to fetch user variables."}`)
                    ]
                });
            }

            const vars = res.data.variables;

            if (vars.length === 0) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(Colors.Yellow)
                            .setDescription(`⚠ No variables found for **${username}**`)
                    ]
                });
            }

            const formatted = vars
                .slice(0,40)
                .map(v => `🔑 **${v.variable_name}** → \`${v.variable_data}\`\n📅 *${v.created_at}*`)
                .join("\n\n");

            const embed = new EmbedBuilder()
                .setTitle(`📂 User Variables — ${username}`)
                .setColor(Colors.Blue)
                .setDescription(formatted.length > 4000 ? formatted.slice(0,3900)+"\n...and more" : formatted)
                .setFooter({ text: `Total Variables: ${vars.length}` })
                .setTimestamp();

            return interaction.reply({ embeds: [embed] });

        } catch (err) {
            console.log(err);
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(Colors.Red)
                        .setDescription("❌ API request failed — check your server/URL")
                ]
            });
        }
    }
};
