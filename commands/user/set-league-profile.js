import { SlashCommandBuilder } from '@discordjs/builders';
import fs from 'fs';

export const data = new SlashCommandBuilder()
    .setName('setprofile')
    .setDescription('Saves your League of Legends profile information.')
    .addStringOption(option =>
        option.setName('username')
            .setDescription('Your Riot username.')
            .setRequired(true))
    .addStringOption(option =>
        option.setName('tagline')
            .setDescription('Your Riot tagline (without the hashtag).')
            .setRequired(true))
    .addStringOption(option =>
        option.setName('region')
            .setDescription('Your Riot account region (na1, euw1, etc.).')
            .setRequired(true));

export async function execute(interaction) {
    const userId = interaction.user.id;  // Discord user ID
    const username = interaction.options.getString('username');
    const tagline = interaction.options.getString('tagline');
    const region = interaction.options.getString('region');

    // Load existing profiles
    let profiles = {};
    try {
        profiles = JSON.parse(fs.readFileSync('./userProfiles.json', 'utf8'));
    } catch (error) {
        console.error('Error reading profiles file:', error);
    }

    // Save or update user profile
    profiles[userId] = { username, tagline, region };

    // Write/overwrite updated profiles back to the file
    fs.writeFileSync('./userProfiles.json', JSON.stringify(profiles, null, 2), 'utf8');

    await interaction.reply(`Your profile has been saved: **${username}** ${tagline} (${region})`);
}