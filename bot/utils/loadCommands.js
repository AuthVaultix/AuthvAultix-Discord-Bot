const fs = require("fs");
const path = require("path");

function loadCommands(client) {
    client.commands = new Map();
    const rawCommands = [];

    const commandsPath = path.join(__dirname, "..", "commands");
    const folders = fs.readdirSync(commandsPath);

    for (const folder of folders) {
        const folderPath = path.join(commandsPath, folder);
        const files = fs.readdirSync(folderPath).filter(f => f.endsWith(".js"));

        for (const file of files) {
            const filePath = path.join(folderPath, file);
            const command = require(filePath);

            command.category = folder; // Attach category dynamically
            rawCommands.push(command);
        }
    }

    // Sort commands: priority commands first, then sort by category, then by name
    const priority = ["help", "setsellerkey", "switchapp", "deleteapp"];
    rawCommands.sort((a, b) => {
        const aName = a.data.name.toLowerCase();
        const bName = b.data.name.toLowerCase();
        
        const aIdx = priority.indexOf(aName);
        const bIdx = priority.indexOf(bName);

        if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
        if (aIdx !== -1) return -1;
        if (bIdx !== -1) return 1;

        // Sort by category first
        const aCat = a.category.toLowerCase();
        const bCat = b.category.toLowerCase();
        if (aCat !== bCat) return aCat.localeCompare(bCat);

        // Sort by name
        return aName.localeCompare(bName);
    });

    const commands = [];
    for (const command of rawCommands) {
        client.commands.set(command.data.name, command);
        commands.push(command.data.toJSON());
    }

    return commands;
}

module.exports = { loadCommands };

