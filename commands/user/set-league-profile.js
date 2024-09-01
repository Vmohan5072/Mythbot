import { SlashCommandBuilder } from '@discordjs/builders';
import { setProfile } from '../../profileFunctions.js'; // Import the function to set profile in PostgreSQL

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

    try {
        await setProfile(userId, username, tagline, region);
        await interaction.reply(`Your profile has been saved: **${username}** ${tagline} (${region})`);
    } catch (error) {
        console.error('Error saving profile:', error);
        await interaction.reply('There was an error saving your profile. Please try again later.');
    }
}