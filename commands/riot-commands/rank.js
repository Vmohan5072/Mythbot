import { SlashCommandBuilder } from '@discordjs/builders';
import { getPuuidByRiotId, getAccIdByPuuid, getRankBySummID } from '../../API/riot-api.js';

export const data = new SlashCommandBuilder()
    .setName('rankedinfo')
    .setDescription('Fetches your League of Legends ranks')
    .addStringOption(option =>
        option.setName('username')
            .setDescription('The Riot username of the player.')
            .setRequired(true))
    .addStringOption(option =>
        option.setName('tagline')
            .setDescription('The tag of the player without a hashtag (NA1, EUW1, EUNE1, etc.)')
            .setRequired(true))
    .addStringOption(option =>
        option.setName('region')
            .setDescription('The region of the Riot account (na1, euw1, eune1, etc.)')
            .setRequired(true));

export async function execute(interaction) {
    const username = interaction.options.getString('username');
    const tagline = interaction.options.getString('tagline');
    const region = interaction.options.getString('region');

    try {
        // Get PUUID by Riot ID
        const puuid = await getPuuidByRiotId(username, tagline, region);

        // Get summId by PUUID
        const accountInfo = await getAccIdByPuuid(puuid, region);
        const summId = accountInfo.summId;

        // Get ranked data by summoner ID
        const rankedData = await getRankBySummID(summId, region);        

        // Construct message
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

        // Send message
        await interaction.reply(responseMessage);

    } catch (error) {
        console.error('Error fetching summoner rank data:', error);
        await interaction.reply({ content: 'There was an error fetching the ranked data. Please try again later.', ephemeral: true });
    }
}