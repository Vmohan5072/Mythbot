import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getPuuidByRiotId, getMasteryListByPUUID, getMasteryListCountByPUUID, getChampionIdToNameMap } from '../../API/riot-api.js';
import { getProfile } from '../../profileFunctions.js'; // Import getProfile

export const data = new SlashCommandBuilder()
    .setName('mastery')
    .setDescription('Fetches your top champion masteries')
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
            .setRequired(false))
    .addIntegerOption(option =>
        option.setName('count')
            .setDescription('The top # of champions to display (Optional)')
            .setRequired(false));

export async function execute(interaction) {
    let username = interaction.options.getString('username');
    let tagline = interaction.options.getString('tagline');
    let region = interaction.options.getString('region');
    const count = interaction.options.getInteger('count');

    // Fetch user profile if no name is provided
    if (!username || !tagline || !region) {
        const userProfile = await getProfile(interaction.user.id);
        if (userProfile) {
            username = username || userProfile.riot_username;
            tagline = tagline || userProfile.tagline;
            region = region || userProfile.region;
        } else {
            await interaction.reply({ content: 'Please provide your details or set up your profile with /setprofile.', ephemeral: true });
            return;
        }
    }

    try {
        // Fetch PUUID and mastery data
        const puuid = await getPuuidByRiotId(username, tagline, region);
        const champMasteryData = count // Check if count is provided, otherwise default to showing all champs
            ? await getMasteryListCountByPUUID(puuid, region, count)  
            : await getMasteryListByPUUID(puuid, region);

        const championIdToNameMap = await getChampionIdToNameMap();
        if (!championIdToNameMap) {
            throw new Error('Failed to fetch champion data.');
        }

        // Build message embed
        const embed = new EmbedBuilder()
            .setColor('#4B0082')
            .setTitle('Top Champion Masteries')
            .setDescription(`Champion mastery data for ${username} (${tagline}) in the ${region.toUpperCase()} region.`)
            .setThumbnail(`https://ddragon.leagueoflegends.com/cdn/12.5.1/img/profileicon/${champMasteryData[0]?.profileIconId}.png`)
            .setTimestamp();

        // Adding fields based on mastery data
        champMasteryData.forEach((champion, index) => {
            if (index < 10) {
                const championName = championIdToNameMap[champion.championId] || 'Unknown Champion'; 
                const championLevel = champion.championLevel || 'N/A'; 
                const championPoints = champion.championPoints || 'N/A'; 
                embed.addFields({ 
                    name: `#${index + 1} ${championName}`, 
                    value: `Level: ${championLevel}\nPoints: ${championPoints}`, 
                    inline: true 
                });
            }
        });

        // Send the reply with the embedded champion mastery data
        await interaction.reply({ embeds: [embed] });
    } catch (error) {
        console.error('Error executing command:', error);
        await interaction.reply({ content: `Failed to fetch mastery data: ${error.message}`, ephemeral: true });
    }
}