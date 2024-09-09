import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getProfileLeaderboard } from '../../profileFunctions.js';

// Helper function to sort ranks
function rankSort(rank) {
    const rankOrder = {
        "CHALLENGER": 1,
        "GRANDMASTER": 2,
        "MASTER": 3,
        "DIAMOND": 4,
        "PLATINUM": 5,
        "GOLD": 6,
        "SILVER": 7,
        "BRONZE": 8,
        "IRON": 9,
        "UNRANKED": 10 // Handle unranked cases
    };

    if (!rank || rank === 'Unranked') {
        return rankOrder["UNRANKED"] * 10;
    }

    const [tier, division] = rank.split(' ');
    const divisionValue = division ? parseInt(division.replace('IV', '1').replace('III', '2').replace('II', '3').replace('I', '4')) : 5; // Converts division to numbers

    return rankOrder[tier] * 10 + (5 - divisionValue); // Higher ranks come first
}

export const data = new SlashCommandBuilder()
    .setName('rankleaderboard')
    .setDescription('Displays the rank leaderboard based on Solo/Duo ranks.');

export async function execute(interaction) {
    await interaction.deferReply({ ephemeral: false });

    try {
        // Fetch leaderboard data from the database
        const leaderboard = await getProfileLeaderboard();

        if (!leaderboard || leaderboard.length === 0) {
            await interaction.editReply({ content: 'No users found in the leaderboard.', ephemeral: true });
            return;
        }

        // Sort the leaderboard by rank
        const sortedLeaderboard = leaderboard.sort((a, b) => rankSort(a.solo_duo_rank) - rankSort(b.solo_duo_rank));

        // Build the embed
        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('Solo/Duo Rank Leaderboard')
            .setDescription('Here is the rank leaderboard based on Solo/Duo ranks.')
            .setTimestamp();

        // Build the leaderboard 
        let leaderboardText = '';
        sortedLeaderboard.forEach((user, index) => {
            leaderboardText += `**#${index + 1}: ${user.discord_username}**\n` +
                                `Riot ID: ${user.riot_username}#${user.tagline}\n` +  
                                `Rank: ${user.solo_duo_rank || 'Unranked'}\n\n`; // Default to 'Unranked' if solo_duo_rank field is empty
        });

        // Add the leaderboard to the embed
        embed.addFields({ name: 'Leaderboard', value: leaderboardText });

        // Send the final embed
        await interaction.editReply({ embeds: [embed] });
    } 
    
    catch (error) {
        console.error('Error fetching rank leaderboard:', error);
        await interaction.editReply({ content: 'There was an error fetching the rank leaderboard. Please try again later.', ephemeral: true });
    }
}