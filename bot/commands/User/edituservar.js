const { SlashCommandBuilder, EmbedBuilder, Colors } = require("discord.js");
const axios = require("axios");
const { getActiveSellerKey } = require("../../utils/config");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("edituservar")
        .setDescription("Edit or update a user variable value")
        .addStringOption(o => 
            o.setName("username")
             .setDescription("Target username")
             .setRequired(true)
        )
        .addStringOption(o => 
            o.setName("variable")
             .setDescription("Variable name to update")
             .setRequired(true)
        )
        .addStringOption(o => 
            o.setName("newdata")
             .setDescription("New value to set")
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
                        .setDescription("❌ Seller key not set — Use `/setsellerkey` first.")
                ]
            });
        }

        const username = interaction.options.getString("username");
        const variable = interaction.options.getString("variable");
        const newdata  = interaction.options.getString("newdata");

        const url = `${BASE_URL}?type=edituservar&sellerkey=${sellerKey}&username=${username}&var=${variable}&newdata=${encodeURIComponent(newdata)}`;

        try {
            const res = await axios.get(url);

            // SUCCESS EMBED
            if (res.data?.success) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setTitle("📝 User Variable Updated")
                            .setColor(Colors.Green)
                            .addFields(
                                { name: "👤 User", value: `\`${username}\`` },
                                { name: "Variable Name", value: `\`${variable}\`` },
                                { name: "Variable Deta", value: `\`${newdata}\`` }
                            )
                            .setTimestamp()
                    ]
                });
            }

            // FAILED EMBED
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(Colors.Red)
                        .setDescription(`❌ ${res.data.msg || "Failed to update variable"}`)
                ]
            });

        } catch (err) {
            console.error(err);
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(Colors.Red)
                        .setDescription("❌ API Request Failed — Check Console.")
                ]
            });
        }
    }
};
