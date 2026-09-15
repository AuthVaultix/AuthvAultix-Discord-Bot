const { SlashCommandBuilder, EmbedBuilder, Colors } = require("discord.js");
const axios = require("axios");
const { getActiveSellerKey } = require("../../utils/config");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("deleteallunused")
    .setDescription("Delete ALL unused (not activated) licenses"),

  async execute(interaction) {
    // ✅ 3 sec rule: always ACK first
    await interaction.deferReply({ ephemeral: true });

    try {
      const sellerKey = await getActiveSellerKey(interaction.user.id);
      const BASE_URL = process.env.BASE_URL;

      if (!sellerKey) {
        const noKey = new EmbedBuilder()
          .setDescription("❌ Seller key not set. Use `/setsellerkey` first.")
          .setColor(Colors.Red)
          .setTimestamp()
          .setFooter({ text: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() });

        return interaction.editReply({ embeds: [noKey] });
      }

      const url = `${BASE_URL}?type=delallunusedli&sellerkey=${encodeURIComponent(sellerKey)}`;

      const res = await axios.get(url, { timeout: 10000 });

      // ✅ if API returns JSON string sometimes, try parse
      let data = res.data;
      if (typeof data === "string") {
        try { data = JSON.parse(data); } catch (_) {}
      }

      if (data && typeof data === "object" && data.success) {
        const deleted = data.deleted_unused ?? data.deleted_used ?? 0;

        const success = new EmbedBuilder()
          .setTitle("🗑️ Unused License Cleanup Complete!")
          .addFields({ name: "Total Deleted", value: `**${deleted}**` })
          .setColor(Colors.Green)
          .setTimestamp()
          .setFooter({ text: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() });

        return interaction.editReply({ embeds: [success] });
      }

      // fallback message (string or object without success)
      const msg =
        typeof data === "string"
          ? data
          : (data?.message ?? "Unknown response from API.");

      const fallback = new EmbedBuilder()
        .setDescription(`🗑️ ${msg}`)
        .setColor(Colors.Blue)
        .setTimestamp()
        .setFooter({ text: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() });

      return interaction.editReply({ embeds: [fallback] });

    } catch (err) {
      console.error(err);

      const apiError = new EmbedBuilder()
        .setDescription("❌ API request failed. Check console.")
        .setColor(Colors.Red)
        .setTimestamp()
        .setFooter({ text: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() });

      // ✅ never reply again; interaction already deferred
      return interaction.editReply({ embeds: [apiError] });
    }
  }
};
