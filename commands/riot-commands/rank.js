import { SlashCommandBuilder } from '@discordjs/builders';
import { getPuuidByRiotId, getAccIdByPuuid, getRankBySummID } from '../../API/riot-api.js';
import { getProfile } from '../../profileFunctions.js'; // Import getProfile

export const data = new SlashCommandBuilder()
    .setName('rankedinfo')
    .setDescription('Fetches your League of Legends ranks')
    .addStringOption(option =>
        option.setName('username')
            .setDescription('The Riot username of the player.'))
    .addStringOption(option =>
        option.setName('tagline')
            .setDescription('The tag of the player without a hashtag (NA1, EUW1, EUNE1, etc.)'))
    .addStringOption(option =>
        option.setName('region')
            .setDescription('The region of the Riot account (na1, euw1, eune1, etc.)'));

export async function execute(interaction) {
    let username = interaction.options.getString('username');
    let tagline = interaction.options.getString('tagline');
    let region = interaction.options.getString('region');

    // If no details provided, load from saved profile
    if (!username || !tagline || !region) {
        const userProfile = getProfile(interaction.user.id);
        if (userProfile) {
            username = username || userProfile.username;
            tagline = tagline || userProfile.tagline;
            region = region || userProfile.region;
        } else {
            await interaction.reply('Please provide your details or set up your profile with /setprofile.');
            return;
        }
    }

    try {
        const puuid = await getPuuidByRiotId(username, tagline, region);
        const accountInfo = await getAccIdByPuuid(puuid, region);
        const rankedData = await getRankBySummID(accountInfo.summId, region);        

        // Construct message (continue with existing logic)
        let responseMessage = `Ranked Data for Summoner: ${username} ${tagline}\n\n`;
        // Solo ranked information
        if (rankedData.solo) {
            const solo = rankedData.solo;
            let soloTotal = solo.wins + solo.losses;
            let soloWR = ((solo.wins /soloTotal) *100).toFixed(2);
            responseMessage += `**Solo/Duo Queue:**\nTier: ${solo.tier} ${solo.rank} (${solo.leaguePoints} LP)\n${soloTotal} Games, ${soloWR}% Winrate\nWins: ${solo.wins}, Losses: ${solo.losses}\n\n`;
        } else {
            responseMessage += `**Solo/Duo Queue:** Not available\n\n`;
        }

        // Flex ranked information
        if (rankedData.flex) {
            const flex = rankedData.flex;
            let flexTotal = flex.wins + flex.losses;
            let flexWR = ((flex.wins /flexTotal) *100).toFixed(2);
            responseMessage += `**Flex Queue:**\nTier: ${flex.tier} ${flex.rank} (${flex.leaguePoints} LP)\n${flexTotal} Games, ${flexWR}% Winrate\nWins: ${flex.wins}, Losses: ${flex.losses}`;
        } else {
            responseMessage += `**Flex Queue:** Not available`;
        }

        await interaction.reply(responseMessage);
    } 
    
    catch (error) {
        console.error('Error fetching summoner rank data:', error);
        await interaction.reply({ content: 'There was an error fetching the ranked data. Please try again later.', ephemeral: true });
    }
}