import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getPuuidByRiotId, getLiveGameDataBySummonerId, getChampionIdToNameMap } from '../../API/riot-api.js';
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
        } else {
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

        // Build and send the embed for live game data
        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle(`Live Game Data for ${username}`)
            .setDescription('Here is the current live game information.')
            .setTimestamp();

        // Add fields based on live game data for each player in the match
        liveGameData.participants.forEach((participant, index) => {
            const championName = championIdToNameMap[participant.championId] || 'Unknown Champion';
            const team = participant.teamId === 100 ? 'Blue' : 'Red';
            const summonerIconUrl = `https://ddragon.leagueoflegends.com/cdn/12.5.1/img/profileicon/${participant.profileIconId}.png`;
            
            embed.addFields({
                name: `Player ${index + 1}: ${participant.riotId}`,
                value: `Champion: ${championName}, Team: ${team}, Summoner Spells: ${participant.spell1Id}, ${participant.spell2Id}`,
                inline: true,
            });

            embed.setThumbnail(summonerIconUrl);
        });

        await interaction.reply({ embeds: [embed] });
    } catch (error) {
        console.error('Error fetching live game data:', error);

        if (error.message.includes('404')) {
            await interaction.reply({ content: `Could not find a player with the username: ${username} and tagline: ${tagline} in the ${region.toUpperCase()} region. Please make sure the details are correct.`, ephemeral: true });
        } else {
            await interaction.reply({ content: 'There was an error fetching the live game data. Please try again later.', ephemeral: true });
        }
    }
}