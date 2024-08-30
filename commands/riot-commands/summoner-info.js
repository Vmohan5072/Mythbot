import { SlashCommandBuilder } from '@discordjs/builders';
import { getPuuidByRiotId, getAccIdByPuuid } from '../../API/riot-api.js';

export const data = new SlashCommandBuilder()
    .setName('summonerinfo')
    .setDescription('Fetches basic League of Legends account information.')
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
        // get PUUID by Riot ID
        const puuid = await getPuuidByRiotId(username, tagline, region);

        // Fetch League of Legends account info using PUUID
        const summonerInfo  = await getAccIdByPuuid(puuid, region);
        
        // Respond with basic account information
        await interaction.reply(
            `**Summoner ID:** ${summonerInfo.summId}\n` +
            `**Account ID:** ${summonerInfo.accountId}\n` +
            `**PUUID:** ${summonerInfo.puuid}\n` +
            `**Profile Icon ID:** ${summonerInfo.profileIconId}\n` +
            `**Revision Date:** ${new Date(summonerInfo.revisionDate).toLocaleString()}\n` +
            `**Summoner Level:** ${summonerInfo.summonerLevel}`);
        }
        
    catch (error) {
        console.error('Error fetching summoner data:', error);
        await interaction.reply({ content: 'There was an error fetching the account information. Please try again later.', ephemeral: true });
    }
}