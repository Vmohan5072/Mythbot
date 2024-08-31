import { SlashCommandBuilder } from '@discordjs/builders';
import { getPuuidByRiotId, getAccIdByPuuid } from '../../API/riot-api.js';
import { getProfile } from '../../profileFunctions.js'; // Import getProfile

export const data = new SlashCommandBuilder()
    .setName('summonerinfo')
    .setDescription('Fetches basic League of Legends account information.')
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

    // Load from saved profile if no details provided
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
        const summonerInfo = await getAccIdByPuuid(puuid, region);

        await interaction.reply(
            `**Summoner ID:** ${summonerInfo.summId}\n` +
            `**Account ID:** ${summonerInfo.accountId}\n` +
            `**PUUID:** ${summonerInfo.puuid}\n` +
            `**Profile Icon ID:** ${summonerInfo.profileIconId}\n` +
            `**Revision Date:** ${new Date(summonerInfo.revisionDate).toLocaleString()}\n` +
            `**Summoner Level:** ${summonerInfo.summonerLevel}`);
    } catch (error) {
        console.error('Error fetching summoner data:', error);
        await interaction.reply({ content: 'There was an error fetching the account information. Please try again later.', ephemeral: true });
    }
}