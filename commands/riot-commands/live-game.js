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
            await interaction.reply({ content: 'Please provide your Riot ID details or set up your profile with /setprofile.', ephemeral: true });
            return;
        }
    }

    console.log(`Fetching live game data for username: ${username}, tagline: ${tagline}, region: ${region}`);
    
    try {
        const puuid = await getPuuidByRiotId(username, tagline, region);

        if (!puuid) {
            await interaction.reply({ content: `Could not find a player with the username: ${username} and tagline: ${tagline} in the ${region.toUpperCase()} region.`, ephemeral: true });
            return;
        }

        const liveGameData = await getLiveGameDataBySummonerId(puuid, region);

        if (!liveGameData) {
            await interaction.reply({ content: `No live game data found for the player: ${username}. They might not be in a game currently.`, ephemeral: true });
            return;
        }

        // Get the champion ID to name map from Data Dragon API
        const championIdToNameMap = await getChampionIdToNameMap();
        if (!championIdToNameMap) {
            await interaction.reply({ content: 'Failed to fetch champion data. Please try again later.', ephemeral: true });
            return;
        }

        // Split players into red and blue team
        const playerTeam = liveGameData.participants.find(p => p.puuid === puuid).teamId; //locate the team that has the searched name
        const playerTeamData = liveGameData.participants.filter(p => p.teamId === playerTeam);
        const opposingTeamData = liveGameData.participants.filter(p => p.teamId !== playerTeam); //Assign the team without searched name to opposing team

        // Build and send the embed for live game data
        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle(`Live Game Data for ${username}`)
            .setDescription('Here is the current live game information.')
            .setTimestamp();

        // fetch rank and mastery for each player
        const addPlayerInfo = async (teamData, columnHeader) => {
            let columnText = `**${columnHeader}:**\n`;
            for (const participant of teamData) {
                const championName = championIdToNameMap[participant.championId] || 'Unknown Champion';
                
                // Fetch Rank
                const rankData = await getRankBySummID(participant.summonerId, region);
                const soloRank = rankData.solo ? `${rankData.solo.tier} ${rankData.solo.rank}` : 'Unranked';
                
                // Fetch Champion Mastery
                const masteryData = await getMasteryListByPUUID(participant.puuid, region);
                const masteryPoints = masteryData.find(m => m.championId === participant.championId)?.championPoints || 0;

                columnText += `**${participant.riotId}**\n${championName}\nRank: ${soloRank}\nMastery Points: ${masteryPoints.toLocaleString()}\n\n`;
            }
            return columnText;
        };

        const leftColumn = await addPlayerInfo(playerTeamData, 'Your Team');
        const rightColumn = await addPlayerInfo(opposingTeamData, 'Opposing Team');

        embed.addFields(
            { name: 'Your Team', value: leftColumn, inline: true },
            { name: 'Opposing Team', value: rightColumn, inline: true }
        );

        await interaction.reply({ embeds: [embed] });
    } 
    
    catch (error) {
        console.error('Error fetching live game data:', error);

        if (error.message.includes('404')) {
            await interaction.reply({ content: `Could not find a player with the username: ${username} and tagline: ${tagline} in the ${region.toUpperCase()} region. Please make sure the details are correct.`, ephemeral: true });
        } 
        
        else {
            await interaction.reply({ content: 'There was an error fetching the live game data. Please try again later.', ephemeral: true });
        }
    }
}
