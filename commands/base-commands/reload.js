//Reloads a specific command 
import { SlashCommandBuilder } from '@discordjs/builders';
import { pathToFileURL } from 'node:url';
//imports file system and pathing
import fs from 'node:fs'; 
import path from 'node:path';

//Command info
export const data = new SlashCommandBuilder()
    .setName('reload')
	.setDescription('Reloads a command.')
    .addStringOption(option => //Option to specify which command to reload
        option.setName('command')
            .setDescription('The command to reload.')
            .setRequired(true));


export async function execute(interaction) {
    const commandName = interaction.options.getString('command', true).toLowerCase();
    const command = interaction.client.commands.get(commandName);
    //Searches for command
    if (!command) {
        return interaction.reply(`There is no command with name \`${commandName}\`!`);
    }

    // Delete the existing command from the client
    interaction.client.commands.delete(commandName);

    // Search for command in commands folder and subfolders
    function findCommandFile(dir, commandName) {
        const files = fs.readdirSync(dir);
        for (const file of files) {
            const filePath = path.join(dir, file);
            const stat = fs.lstatSync(filePath);
            if (stat.isDirectory()) {
                // Recursively search in subdirectories
                const found = findCommandFile(filePath, commandName);
                if (found) return found;
            } else if (file.endsWith('.js') && file.toLowerCase() === `${commandName}.js`) {
                // Return the file path if it matches the command name
                return filePath;
            }
        }
        return null;
    }

    // Get the commands folder path
    const commandsFolder = path.join(process.cwd(), 'commands');
    const commandFilePath = findCommandFile(commandsFolder, commandName);

    if (!commandFilePath) {
        return interaction.reply(`Could not find the command file for \`${commandName}\`!`);
    }

    try {
        // Import the new version of the command
        const commandUrl = pathToFileURL(commandFilePath).href;
        const newCommand = await import(commandUrl + `?timestamp=${Date.now()}`); // Bypass cache

        // Pushes the new version of the command
        interaction.client.commands.set(newCommand.data.name, newCommand);

        await interaction.reply(`Command \`${newCommand.data.name}\` was reloaded!`); //Success message
    } catch (error) { //Error handling
        console.error(error);
        await interaction.reply(`There was an error while reloading the command \`${commandName}\`:\n\`${error.message}\``);
    }
}