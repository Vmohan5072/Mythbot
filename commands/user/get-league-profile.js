import { SlashCommandBuilder } from '@discordjs/builders';
import { getProfile } from '../../profileFunctions.js'; // Import the function to get profile from PostgreSQL

export const data = new SlashCommandBuilder()
    .setName('getprofile')
    .setDescription('Displays your saved League of Legends profile information.');

export async function execute(interaction) {
    const userId = interaction.user.id;  // Save discord user ID

    try {
        const userProfile = await getProfile(userId);

        if (userProfile) {
            await interaction.reply(`Your saved profile: **${userProfile.riot_username}** ${userProfile.tagline} (${userProfile.region})`);
        } else {
            await interaction.reply('No profile found. Use /setprofile to save your profile information.');
        }
    } catch (error) {
        console.error('Error fetching profile:', error);
        await interaction.reply('There was an error retrieving your profile. Please try again later.');
    }
}