const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    Colors, 
    ActionRowBuilder, 
    StringSelectMenuBuilder, 
    ButtonBuilder, 
    ButtonStyle 
} = require("discord.js");

// Metadata for categories to give them nice emojis, clean names, and descriptions
const categoryMeta = {
    "Licenses": { emoji: "🔑", name: "Licenses", desc: "Manage license keys, generate, verify, and export." },
    "Logs": { emoji: "📋", name: "Logs", desc: "View and delete system and application logs." },
    "ResellerAndManager": { emoji: "👥", name: "Resellers & Managers", desc: "Manage resellers, managers, and permissions." },
    "Sessions": { emoji: "🌐", name: "Sessions", desc: "Monitor and end active application sessions." },
    "Subscriptions": { emoji: "💎", name: "Subscriptions", desc: "Create, edit, pause, and view app subscriptions." },
    "System": { emoji: "⚙️", name: "System", desc: "System configuration, application switching, and status." },
    "User": { emoji: "👤", name: "Users", desc: "Manage application users, HWID resets, and user variables." },
    "Variables": { emoji: "📊", name: "Variables", desc: "Manage application-wide custom variables." }
};

const ITEMS_PER_PAGE = 8; // Number of commands per page in category list

module.exports = {
    data: new SlashCommandBuilder()
        .setName("help")
        .setDescription("Browse all available commands by category"),

    async execute(interaction) {
        // 🔥 Prevent 10062 (Interaction Timeout) by deferring ephemeral reply
        await interaction.deferReply({ flags: 64 });

        const client = interaction.client;
        
        // 1. Group commands by category (based on folder)
        const categories = {};
        let totalCommands = 0;

        client.commands.forEach(cmd => {
            const cat = cmd.category || "System";
            if (!categories[cat]) categories[cat] = [];
            categories[cat].push(cmd);
            totalCommands++;
        });

        // Sort commands in each category, prioritizing help, setsellerkey, switchapp, and deleteapp
        const priority = ["help", "setsellerkey", "switchapp", "deleteapp"];
        for (const cat in categories) {
            categories[cat].sort((a, b) => {
                const aName = a.data.name.toLowerCase();
                const bName = b.data.name.toLowerCase();
                const aIdx = priority.indexOf(aName);
                const bIdx = priority.indexOf(bName);

                if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
                if (aIdx !== -1) return -1;
                if (bIdx !== -1) return 1;

                return aName.localeCompare(bName);
            });
        }

        // 2. Generate Dropdown Select Menu Options
        const selectMenuOptions = [
            {
                label: "Home Menu",
                description: "Back to the help dashboard",
                value: "help_home",
                emoji: "🏠"
            }
        ];

        // Sort categories to display in select menu
        const sortedCategoryKeys = Object.keys(categories).sort();
        for (const catKey of sortedCategoryKeys) {
            const meta = categoryMeta[catKey] || { emoji: "📁", name: catKey, desc: "Commands in this category." };
            selectMenuOptions.push({
                label: meta.name,
                description: meta.desc.substring(0, 100),
                value: `cat_${catKey}`,
                emoji: meta.emoji
            });
        }

        // 3. Helper to format usage and options for a command
        function formatCommandUsage(cmd) {
            const name = cmd.data.name;
            const options = cmd.data.options || [];

            // Check if command has subcommands (SlashCommandSubcommandBuilder)
            const subcommands = options.filter(opt => opt.type === 1 || opt.constructor.name === "SlashCommandSubcommandBuilder");

            if (subcommands.length > 0) {
                return subcommands.map(sub => {
                    const subOpts = (sub.options || []).map(o => o.required ? `<${o.name}>` : `[${o.name}]`).join(" ");
                    return `**\`/${name} ${sub.name}${subOpts ? " " + subOpts : ""}\`**\n└ *${sub.description}*`;
                }).join("\n");
            } else {
                const optString = options.map(o => o.required ? `<${o.name}>` : `[${o.name}]`).join(" ");
                return `**\`/${name}${optString ? " " + optString : ""}\`**\n└ *${cmd.data.description}*`;
            }
        }

        // Helper to build the home embed
        function buildHomeEmbed() {
            return new EmbedBuilder()
                .setTitle("📚 Seller Bot - Help Dashboard")
                .setDescription(
                    "Welcome to the interactive **Seller Bot** Help panel!\n\n" +
                    "Browse all available commands by selecting a category from the dropdown select menu below. " +
                    "Each command includes its parameter guide (`<required>` and `[optional]`) and a brief description."
                )
                .setColor(0x6366f1) // Premium Indigo color
                .addFields(
                    {
                        name: "🚀 Core Setup Commands",
                        value: [
                            "• **/help** - Browse all available commands by category.",
                            "• **/setsellerkey `<key>**` - Configure your AuthSecure seller key.",
                            "• **/switchapp** - Select your active KeyAuth application.",
                            "• **/deleteapp** - Delete a saved application seller key."
                        ].join("\n"),
                        inline: false
                    },
                    { 
                        name: "📊 Bot Statistics", 
                        value: `📁 **Categories:** \`${Object.keys(categories).length}\`\n⚡ **Total Commands:** \`${totalCommands}\``, 
                        inline: true 
                    },
                    { 
                        name: "🛡️ Server Permissions", 
                        value: "Requires the `perms` role in a guild to execute administration commands.", 
                        inline: true 
                    }
                )
                .setFooter({ 
                    text: `Requested by ${interaction.user.tag}`, 
                    iconURL: interaction.user.displayAvatarURL({ dynamic: true }) 
                })
                .setTimestamp();
        }

        // Helper to build a category page embed
        function buildCategoryEmbed(categoryKey, page = 0) {
            const meta = categoryMeta[categoryKey] || { emoji: "📁", name: categoryKey, desc: "Commands" };
            const cmdList = categories[categoryKey] || [];
            const totalPages = Math.max(1, Math.ceil(cmdList.length / ITEMS_PER_PAGE));
            
            const startIdx = page * ITEMS_PER_PAGE;
            const endIdx = startIdx + ITEMS_PER_PAGE;
            const pageCmds = cmdList.slice(startIdx, endIdx);

            const embed = new EmbedBuilder()
                .setTitle(`${meta.emoji} ${meta.name} Commands`)
                .setDescription(
                    `*${meta.desc}*\n\n` +
                    pageCmds.map(cmd => formatCommandUsage(cmd)).join("\n\n")
                )
                .setColor(0x6366f1)
                .setFooter({ 
                    text: `Category: ${meta.name} • Page ${page + 1} of ${totalPages} • Total: ${cmdList.length} commands`,
                    iconURL: client.user.displayAvatarURL()
                })
                .setTimestamp();

            return { embed, totalPages };
        }

        // 4. Create action rows
        const menuRow = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId("help_menu")
                .setPlaceholder("📂 Choose a command category")
                .addOptions(selectMenuOptions)
        );

        const getPaginationRow = (currentPage, totalPages) => {
            return new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId("help_prev")
                    .setLabel("Previous")
                    .setEmoji("◀️")
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(currentPage === 0),
                new ButtonBuilder()
                    .setCustomId("help_next")
                    .setLabel("Next")
                    .setEmoji("▶️")
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(currentPage === totalPages - 1)
            );
        };

        // 5. Send initial Home embed
        const initialEmbed = buildHomeEmbed();
        const mainMessage = await interaction.editReply({
            embeds: [initialEmbed],
            components: [menuRow]
        });

        // 6. Set up interaction collector
        let activeCategory = "home";
        let currentPage = 0;

        const collector = mainMessage.createMessageComponentCollector({
            filter: i => i.user.id === interaction.user.id,
            time: 600000, // 10 minutes of active duration
            idle: 120000  // 2 minutes of idle timeout
        });

        collector.on("collect", async i => {
            try {
                // Handle Dropdown Menu Selection
                if (i.isStringSelectMenu()) {
                    await i.deferUpdate();
                    const selectedValue = i.values[0];

                    if (selectedValue === "help_home") {
                        activeCategory = "home";
                        currentPage = 0;

                        await i.editReply({
                            embeds: [buildHomeEmbed()],
                            components: [menuRow]
                        });
                    } else if (selectedValue.startsWith("cat_")) {
                        activeCategory = selectedValue.replace("cat_", "");
                        currentPage = 0;

                        const { embed, totalPages } = buildCategoryEmbed(activeCategory, currentPage);
                        const components = [menuRow];
                        if (totalPages > 1) {
                            components.push(getPaginationRow(currentPage, totalPages));
                        }

                        await i.editReply({
                            embeds: [embed],
                            components: components
                        });
                    }
                }

                // Handle Pagination Buttons
                if (i.isButton()) {
                    await i.deferUpdate();
                    
                    if (activeCategory === "home") return;

                    const cmdList = categories[activeCategory] || [];
                    const totalPages = Math.max(1, Math.ceil(cmdList.length / ITEMS_PER_PAGE));

                    if (i.customId === "help_prev") {
                        if (currentPage > 0) currentPage--;
                    } else if (i.customId === "help_next") {
                        if (currentPage < totalPages - 1) currentPage++;
                    }

                    const { embed } = buildCategoryEmbed(activeCategory, currentPage);
                    await i.editReply({
                        embeds: [embed],
                        components: [menuRow, getPaginationRow(currentPage, totalPages)]
                    });
                }
            } catch (err) {
                console.error("Help command interaction collector error:", err);
            }
        });

        // Clean up components on timeout to keep Discord server neat
        collector.on("end", async () => {
            try {
                // Disable all select menus and buttons when help menu expires
                const disabledMenu = new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId("help_menu_disabled")
                        .setPlaceholder("❌ Help menu session expired. Run /help again.")
                        .setDisabled(true)
                        .addOptions([{ label: "Expired", value: "expired" }])
                );

                await interaction.editReply({
                    components: [disabledMenu]
                });
            } catch {
                // Silence if message was deleted
            }
        });
    }
};
