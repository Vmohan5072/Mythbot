import { SlashCommandBuilder } from '@discordjs/builders';
import fs from 'fs';

export const data = new SlashCommandBuilder()
    .setName('getprofile')
    .setDescription('Displays your saved League of Legends profile information.');

export async function execute(interaction) {
    const userId = interaction.user.id;  // Save discord user ID

    // Load existing profiles
    let profiles = {};
    try {
        profiles = JSON.parse(fs.readFileSync('./userProfiles.json', 'utf8'));
    } catch (error) {
        console.error('Error reading profiles file:', error);
    }

    const userProfile = profiles[userId];

    if (userProfile) {
        await interaction.reply(`Your saved profile: **${userProfile.username}** ${userProfile.tagline} (${userProfile.region})`);
    } else {
        await interaction.reply('No profile found. Use /setprofile to save your profile information.');
    }
}