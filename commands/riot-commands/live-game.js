import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getPuuidByRiotId, getLiveGameDataBySummonerId, getRankBySummID, getMasteryListByPUUID, getChampionIdToNameMap } from '../../API/riot-api.js';
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

    // Fetch user profile from the database if the username/tagline/region are not provided
    if (!username || !tagline || !region) {
        const userProfile = await getProfile(interaction.user.id);
        if (userProfile) {
            username = username || userProfile.riot_username;
            tagline = tagline || userProfile.tagline;
            region = region || userProfile.region;
        } 
        
        else {
            await interaction.editReply({ content: 'Please provide your Riot ID details or set up your profile with /setprofile.', ephemeral: true });
            return;
        }
    }

    console.log(`Fetching live game data for username: ${username}, tagline: ${tagline}, region: ${region}`);

    try {
        const puuid = await getPuuidByRiotId(username, tagline, region);

        if (!puuid) {
            await interaction.editReply({ content: `Could not find a player with the username: ${username} and tagline: ${tagline} in the ${region.toUpperCase()} region.`, ephemeral: true });
            return;
        }

        const liveGameData = await getLiveGameDataBySummonerId(puuid, region);

        if (!liveGameData) {
            await interaction.editReply({ content: `No live game data found for the player: ${username}. They might not be in a game currently.`, ephemeral: true });
            return;
        }

        // Get the champion ID to name map from Data Dragon API
        const championIdToNameMap = await getChampionIdToNameMap();
        if (!championIdToNameMap) {
            await interaction.editReply({ content: 'Failed to fetch champion data. Please try again later.', ephemeral: true });
            return;
        }

        // Split players into red and blue team
        const playerTeam = liveGameData.participants.find(p => p.puuid === puuid).teamId;
        const playerTeamData = liveGameData.participants.filter(p => p.teamId === playerTeam);
        const opposingTeamData = liveGameData.participants.filter(p => p.teamId !== playerTeam);

        // Build the embed for live game data
        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle(`Live Game Data for ${username}`)
            .setDescription('Here is the current live game information.')
            .setTimestamp();

        // Add details about the player's team and opponent's team
        let leftColumn = '';
        let rightColumn = '';
        for (const participant of playerTeamData) {
            const championName = championIdToNameMap[participant.championId] || 'Unknown Champion';
            const summId = participant.summonerId;
            const rankData = await getRankBySummID(summId, region);
            const masteryData = await getMasteryListByPUUID(participant.puuid, region);
            const champMastery = masteryData.find(mastery => mastery.championId === participant.championId)?.championPoints || 'N/A';
            const soloRank = rankData.solo ? `${rankData.solo.tier} ${rankData.solo.rank}` : 'Unranked';

            leftColumn += `**${participant.riotId}**\nSolo/Duo Rank: ${soloRank}\nChampion: ${championName}\nMastery Points: ${champMastery}\n\n`; //Gathers each player's information
        }

        for (const participant of opposingTeamData) {
            const championName = championIdToNameMap[participant.championId] || 'Unknown Champion';
            const summId = participant.summonerId;
            const rankData = await getRankBySummID(summId, region);
            const masteryData = await getMasteryListByPUUID(participant.puuid, region);
            const champMastery = masteryData.find(mastery => mastery.championId === participant.championId)?.championPoints || 'N/A';
            const soloRank = rankData.solo ? `${rankData.solo.tier} ${rankData.solo.rank}` : 'Unranked';

            rightColumn += `**${participant.riotId}**\nSolo/Duo Rank: ${soloRank}\nChampion: ${championName}\nMastery Points: ${champMastery}\n\n`; //Gathers each player's information
        }
        
        //Pastes both teams' information into message
        embed.addFields(
            { name: 'Your Team', value: leftColumn, inline: true },
            { name: 'Opposing Team', value: rightColumn, inline: true }
        );

        // Send final message
        await interaction.editReply({ embeds: [embed] });
    } 
    
    catch (error) {
        console.error('Error fetching live game data:', error);

        if (error.message.includes('404')) { // Account not found
            await interaction.editReply({ content: `Could not find a player with the username: ${username} and tagline: ${tagline} in the ${region.toUpperCase()} region. Please make sure the details are correct.`, ephemeral: true });
        } 
        
        else { // Generic error
            await interaction.editReply({ content: 'There was an error fetching the live game data. Please try again later.', ephemeral: true });
        }
    }
}
