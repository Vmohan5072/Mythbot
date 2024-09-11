// TODO: Rework region input handling, allow users to ping others to pull their riot info, adjust readme, refactoring codebase
import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { normalizeRegionInput } from '../../utils.js';
import { getPuuidByRiotId, getLiveGameDataBySummonerId, getRankBySummID, getMasteryListByPUUID, getChampionIdToNameMap, getQueueDescription } from '../../API/riot-api.js';
import { getProfile } from '../../profileFunctions.js';

export const data = new SlashCommandBuilder()
    .setName('livegame')
    .setDescription('Fetches the live game data for a League of Legends player.')
    .addStringOption(option =>
        option.setName('username')
            .setDescription('The Riot username of the player.')
            .setRequired(false))
    .addStringOption(option =>
        option.setName('tagline')
            .setDescription('The tag of the player without a hashtag (NA1, EUW1, EUNE1, etc.)')
            .setRequired(false))
    .addStringOption(option =>
        option.setName('region')
            .setDescription('The region of the Riot account (na1, euw1, eune1, etc.)')
            .setRequired(false));

export async function execute(interaction) {
    // Defer the reply to avoid interaction timeout
    await interaction.deferReply({ ephemeral: false });

    let username = interaction.options.getString('username');
    let tagline = interaction.options.getString('tagline');
    let region = interaction.options.getString('region');
    let normalizedRegion = normalizeRegionInput(region);

    // Fetch user profile from the database if the username/tagline/region are not provided
    if (!username || !tagline || !normalizedRegion) {
        const userProfile = await getProfile(interaction.user.id);
        if (userProfile) {
            username = username || userProfile.riot_username;
            tagline = tagline || userProfile.tagline;
            region = region || userProfile.region;
        } else {
            await interaction.editReply({ content: 'Please provide your Riot ID details or set up your profile with /setprofile.', ephemeral: true });
            return;
        }
    }

    console.log(`Fetching live game data for username: ${username}, tagline: ${tagline}, region: ${normalizedRegion}`);

    // Regex conversion function to remove number after region for op.gg link
    const convertRegion = (regionWithNumber) => {
        return regionWithNumber.replace(/\d+$/, '');
    };

    // Create op.gg link for each player
    const constructOpGGUrl = (normalizedRegion, riotId) => {
        const formattedRegion = convertRegion(normalizedRegion);
        const [riotUsername, riotTag] = riotId.split('#');  // Split riotId into username and tag
        const encodedUsername = encodeURIComponent(riotUsername);
        return `https://www.op.gg/summoners/${formattedRegion}/${encodedUsername}-${riotTag}`;
    };

    try {
        const puuid = await getPuuidByRiotId(username, tagline, normalizedRegion);

        if (!puuid) {
            await interaction.editReply({ content: `Could not find a player with the username: ${username} and tagline: ${tagline} in the ${region.toUpperCase()} region.`, ephemeral: true });
            return;
        }

        const liveGameData = await getLiveGameDataBySummonerId(puuid, normalizedRegion);

        if (!liveGameData) {
            await interaction.editReply({ content: `No live game data found for the player: ${username}. They might not be in a game currently.`, ephemeral: true });
            return;
        }

         // grab queue from queueId
         const queueDescription = await getQueueDescription(liveGameData.gameQueueConfigId);


        // Get the champion ID to name map from Data Dragon API
        const championIdToNameMap = await getChampionIdToNameMap();
        if (!championIdToNameMap) {
            await interaction.editReply({ content: 'Failed to fetch champion data. Please try again later.', ephemeral: true });
            return;
        }

        // Collect general match info
        const gameLengthInSeconds = liveGameData.gameLength || 0;
        const gameLengthMinutes = Math.floor(gameLengthInSeconds / 60);
        const gameLengthSeconds = gameLengthInSeconds % 60;

        // Split players into red and blue team
        const playerTeam = liveGameData.participants.find(p => p.puuid === puuid).teamId;
        const playerTeamData = liveGameData.participants.filter(p => p.teamId === playerTeam);
        const opposingTeamData = liveGameData.participants.filter(p => p.teamId !== playerTeam);

        // Build the embed for live game data
        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle(`Live Game Data for ${username}`)
            .setDescription(`Queue Type: ${queueDescription}\nGame Length: ${gameLengthMinutes}m ${gameLengthSeconds}s`) //Displays queue type and current length
            .setTimestamp(); //displays baseline time to compare to game length

        // Add details about the player's team and opponent's team
        let leftColumn = '';
        let rightColumn = '';

        for (const participant of playerTeamData) {
            const championName = championIdToNameMap[participant.championId] || 'Unknown Champion';
            const summId = participant.summonerId;
            const rankData = await getRankBySummID(summId, normalizedRegion);
            const masteryData = await getMasteryListByPUUID(participant.puuid, normalizedRegion);
            const champMastery = masteryData.find(mastery => mastery.championId === participant.championId)?.championPoints || 'N/A';
            const soloRank = rankData.solo ? `${rankData.solo.tier} ${rankData.solo.rank}` : 'Unranked';
            const opGGUrl = constructOpGGUrl(region, participant.riotId);

            leftColumn += `**[${participant.riotId}](${opGGUrl})**\nSolo/Duo Rank: ${soloRank}\nChampion: ${championName}\nMastery Points: ${champMastery}\n\n`;
        }

        for (const participant of opposingTeamData) {
            const championName = championIdToNameMap[participant.championId] || 'Unknown Champion';
            const summId = participant.summonerId;
            const rankData = await getRankBySummID(summId, normalizedRegion);
            const masteryData = await getMasteryListByPUUID(participant.puuid, normalizedRegion);
            const champMastery = masteryData.find(mastery => mastery.championId === participant.championId)?.championPoints || 'N/A';
            const soloRank = rankData.solo ? `${rankData.solo.tier} ${rankData.solo.rank}` : 'Unranked';
            const opGGUrl = constructOpGGUrl(region, participant.riotId);

            rightColumn += `**[${participant.riotId}](${opGGUrl})**\nSolo/Duo Rank: ${soloRank}\nChampion: ${championName}\nMastery Points: ${champMastery}\n\n`;
        }

        embed.addFields(
            { name: 'Your Team', value: leftColumn, inline: true },
            { name: 'Opposing Team', value: rightColumn, inline: true }
        );

        // Final reply after processing
        await interaction.editReply({ embeds: [embed] });
    } 
    
    catch (error) {
        console.error('Error fetching live game data:', error);

        if (error.message.includes('404')) {
            await interaction.editReply({ content: `Could not find a player with the username: ${username} and tagline: ${tagline} in the ${region.toUpperCase()} region. Please make sure the details are correct.`, ephemeral: true });
        } 
        
        else {
            await interaction.editReply({ content: 'There was an error fetching the live game data. Please try again later.', ephemeral: true });
        }
    }
}