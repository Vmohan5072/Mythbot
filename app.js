// Load dotenv and discordjs classes
import 'dotenv/config';
import { Client, Events, GatewayIntentBits } from 'discord.js';

// Create a new client instance
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// Fetch token from env and logs in
const discToken = process.env.DISCORD_TOKEN;
client.login(discToken);

// When the client is connects, print success message
client.once(Events.ClientReady, readyClient => {
    console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});