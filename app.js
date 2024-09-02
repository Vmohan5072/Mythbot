/*import fs from 'node:fs';
import path from 'node:path';
import { Client, Collection, Events, GatewayIntentBits } from 'discord.js';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { registerButtonHandler } from './commands/riot-commands/customs.js';

console.log("Starting the bot...");  // Add this

const discToken = process.env.DISCORD_TOKEN;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.commands = new Collection();

const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

console.log("Loading commands...");  // Add this

try {
    for (const folder of commandFolders) {
        const commandsPath = path.join(foldersPath, folder);
        const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
        for (const file of commandFiles) {
            const filePath = path.join(commandsPath, file);
            const command = await import(pathToFileURL(filePath).href);
            if ('data' in command && 'execute' in command) {
                client.commands.set(command.data.name, command);
                console.log(`Registered command: ${command.data.name}`);
            } else {
                console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
            }
        }
    }
} catch (error) {
    console.error('Error loading commands:', error);
    process.exit(1); // Exit the process if command loading fails
}

client.once(Events.ClientReady, readyClient => {
    console.log(`Ready! Logged in as ${readyClient.user.tag}`);
    registerButtonHandler(client);
});

console.log("Logging in...");  // Add this

client.login(discToken);

client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const command = interaction.client.commands.get(interaction.commandName);

    if (!command) {
        console.error(`No command matching ${interaction.commandName} was found.`);
        return;
    }

    console.log(`Executing command: ${interaction.commandName}`);

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
        } else {
            await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
        }
    }
}); */

import { Client, Events, GatewayIntentBits } from 'discord.js';

console.log("Starting minimal bot setup...");

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

console.log("Client initialized...");

client.once(Events.ClientReady, () => {
    console.log('Bot is ready!');
});

client.on('error', (error) => {
    console.error('Client encountered an error:', error);
});

client.on('warn', (warning) => {
    console.warn('Client warning:', warning);
});

client.login(process.env.DISCORD_TOKEN).then(() => {
    console.log("Login successful...");
}).catch(error => {
    console.error('Login failed:', error);
    process.exit(1);
});

console.log("Login attempt made...");