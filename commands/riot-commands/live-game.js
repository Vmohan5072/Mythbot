//Implementation complete but too rate-limited. Will return when production key is obtained.

import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getPuuidByRiotId, getAccIdByPuuid, getLiveGameDataBySummonerId, getChampionSplitWinRate, getSplitWinRate, getChampionIdToNameMap, SPLIT_START_DATE, SPLIT_END_DATE } from '../../API/riot-api.js';
import { getProfile } from '../../profileFunctions.js';

export const data = new SlashCommandBuilder()
    .setName('livegame')
    .setDescription('Fetches live game information for a League of Legends player.')
    .addStringOption(option =>
        option.setName('username')
            .setDescription('The Riot username of the player.')
            .setRequired(false))
    .addStringOption(option =>
        option.setName('tagline')
            .setDescription('The tag of the player without a hashtag (e.g., NA1, EUW1, EUNE1, etc.)')
            .setRequired(false))
    .addStringOption(option =>
        option.setName('region')
            .setDescription('The region of the Riot account (e.g., na1, euw1, eune1, etc.)')
            .setRequired(false));

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
            await interaction.reply({ content: 'Please provide your details or set up your profile with /setprofile.', ephemeral: true });
            return;
        }
    }

    try {
        const puuid = await getPuuidByRiotId(username, tagline, region);
        const accountInfo = await getAccIdByPuuid(puuid, region);
        const liveGameData = await getLiveGameDataBySummonerId(accountInfo.puuid, region);
        const championIdToNameMap = await getChampionIdToNameMap();

        if (!liveGameData) {
            await interaction.reply({ content: `${username} is not currently in a game.`, ephemeral: true });
            return;
        }

        const embeds = [];
        let currentEmbed = new EmbedBuilder()
            .setColor('#FF4500')
            .setTitle(`Live Game Info for ${username}`)
            .setDescription(`Game in progress in the ${region.toUpperCase()} region.`)
            .setTimestamp();

        let fieldCount = 0;

        for (const participant of liveGameData.participants) {
            const championName = championIdToNameMap[participant.championId] || 'Unknown';
            const generalWinRate = await getSplitWinRate(participant.puuid, region, SPLIT_START_DATE, SPLIT_END_DATE, 5);
            const championWinRate = await getChampionSplitWinRate(participant.puuid, region, participant.championId, SPLIT_START_DATE, SPLIT_END_DATE, 5);

            currentEmbed.addFields(
                { name: participant.summonerName || 'Unknown Summoner', value: `${championName}`, inline: true },
                { name: 'General Win Rate', value: `${generalWinRate.winRate}% (${generalWinRate.totalWins}W/${generalWinRate.totalGames}G)`, inline: true },
                { name: 'Champion Win Rate', value: `${championWinRate.winRate}% (${championWinRate.championWins}W/${championWinRate.championGames}G)`, inline: true }
            );

            fieldCount += 3;

            // Check if adding more fields would exceed the limit
            if (fieldCount >= 24) {
                embeds.push(currentEmbed);
                currentEmbed = new EmbedBuilder().setColor('#FF4500').setTimestamp();
                fieldCount = 0;
            }
        }

        // Push the last embed if it has any fields
        if (fieldCount > 0) {
            embeds.push(currentEmbed);
        }

        await interaction.reply({ embeds });

    } catch (error) {
        console.error('Error fetching live game data:', error);
        await interaction.reply({ content: `There was an error fetching the live game information: ${error.message}`, ephemeral: true });
    }
}
