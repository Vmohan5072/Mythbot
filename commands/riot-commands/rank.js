import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getPuuidByRiotId, getAccIdByPuuid, getRankBySummID } from '../../API/riot-api.js';
import { getProfile, refreshRank } from '../../profileFunctions.js';

export const data = new SlashCommandBuilder()
    .setName('rankedinfo')
    .setDescription('Fetches your League of Legends ranks')
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

    // If string fields are empty, check for user profile
    if (!username || !tagline || !region) {
        const userProfile = await getProfile(interaction.user.id);
        console.log('Fetched profile:', userProfile);

        if (userProfile) {
            username = username || userProfile.riot_username;
            tagline = tagline || userProfile.tagline;
            region = region || userProfile.region;
        } 
        
        else {
            await interaction.reply({ content: 'Please provide your details or set up your profile with /setprofile.', ephemeral: true });
            return;
        }
    }

    if (!region) {
        await interaction.reply({ content: 'Region is required. Please provide your region or set it up in your profile.', ephemeral: true });
        return;
    }

    try {
        console.log(`Fetching PUUID for username: ${username}, tagline: ${tagline}, region: ${region}`);
        const puuid = await getPuuidByRiotId(username, tagline, region);
        const accountInfo = await getAccIdByPuuid(puuid, region);

        // Refresh rank and update it in the database
        await refreshRank(interaction.user.id);

        // Fetch the updated profile from the database (assuming it includes the updated rank)
        const updatedProfile = await getProfile(interaction.user.id);

        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('Ranked Information')
            .setAuthor({ name: username + ' (' + tagline + ')' })
            .setDescription(`Detailed ranked stats for the summoner in ${region.toUpperCase()}.`)
            .addFields(
                { name: 'Solo/Duo Queue', value: updatedProfile.solo_duo_rank || 'Unranked', inline: false }
            );

        await interaction.reply({ embeds: [embed] });
    } 
    
    catch (error) {
        console.error('Error fetching summoner rank data:', error);
        await interaction.reply({ content: 'There was an error fetching the ranked data. Please try again later.', ephemeral: true });
    }
}
