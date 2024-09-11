import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { normalizeRegionInput } from '../../utils.js';
import { getPuuidByRiotId, getAccIdByPuuid, getRankBySummID, getMasteryListCountByPUUID, getChampionIdToNameMap } from '../../API/riot-api.js';
import { getProfile } from '../../profileFunctions.js';

export const data = new SlashCommandBuilder()
    .setName('leagueprofile')
    .setDescription('Fetches basic League of Legends account information.')
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
    let normalizedRegion = normalizeRegionInput(region);

    // If string fields empty, check for user profile
    if (!username || !tagline || !normalizedRegion) {
        const userProfile = await getProfile(interaction.user.id);
        console.log('User profile fetched:', userProfile); // More temp logging

        if (userProfile) {
            username = username || userProfile.riot_username;
            tagline = tagline || userProfile.tagline;
            region = region || userProfile.region;
        } else {
            await interaction.reply({ content: 'Please provide your details or set up your profile with /setprofile.', ephemeral: true });
            return;
        }
    }

    if (!region) {
        await interaction.reply({ content: 'Region is required. Please provide your region or set it up in your profile.', ephemeral: true });
        return;
    }

    console.log(`Fetching PUUID for username: ${username}, tagline: ${tagline}, region: ${normalizedRegion}`);
    try {
        const puuid = await getPuuidByRiotId(username, tagline, normalizedRegion);
        if (!puuid) {
            throw new Error(`PUUID not found for username: ${username}, tagline: ${tagline}, region: ${normalizedRegion}`);
        }

        const summonerInfo = await getAccIdByPuuid(puuid, normalizedRegion);
        const rankedData = await getRankBySummID(summonerInfo.summId, normalizedRegion);
        const topChampions = await getMasteryListCountByPUUID(puuid, normalizedRegion, 3);
        const championIdToNameMap = await getChampionIdToNameMap();

        const embed = new EmbedBuilder()
            .setColor('#00B2FF')
            .setTitle(`${username}'s Summoner Information`)
            .setThumbnail(`https://ddragon.leagueoflegends.com/cdn/12.5.1/img/profileicon/${summonerInfo.profileIconId}.png`)
            .addFields(
                { name: 'Summoner Level', value: `${summonerInfo.summonerLevel}`, inline: true },
                { name: 'Solo/Duo Queue', value: rankedData.solo ? `Tier: ${rankedData.solo.tier} ${rankedData.solo.rank} - ${rankedData.solo.leaguePoints} LP\n${rankedData.solo.wins}W ${rankedData.solo.losses}L` : 'Not available', inline: true },
                { name: 'Flex Queue', value: rankedData.flex ? `Tier: ${rankedData.flex.tier} ${rankedData.flex.rank} - ${rankedData.flex.leaguePoints} LP\n${rankedData.flex.wins}W ${rankedData.flex.losses}L` : 'Not available', inline: true }
            )
            .addFields(
                { name: 'Top 3 Champions', value: topChampions.length ? '\u200B' : 'N/A', inline: false } // Handling empty champ list
            );

        // Populate top champion template with champion info
        topChampions.forEach((champion, index) => {
            const championName = championIdToNameMap[champion.championId] || 'Unknown Champion';
            const championPoints = champion.championPoints || 'N/A';
            const championLevel = champion.championLevel || 'N/A';

            embed.addFields(
                { 
                    name: `${index + 1}. ${championName}`,
                    value: `Level: ${championLevel}\nPoints: ${championPoints}`,
                    inline: true
                }
            );
        });

        embed.setTimestamp();
        await interaction.reply({ embeds: [embed] });
    } catch (error) {
        console.error('Error fetching summoner data:', error);
        await interaction.reply({ content: 'There was an error fetching the account information. Please try again later.', ephemeral: true });
    }
}