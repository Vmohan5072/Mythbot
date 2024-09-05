import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getPuuidByRiotId, getAccIdByPuuid, getRankBySummID } from '../../API/riot-api.js';
import { getProfile } from '../../profileFunctions.js'; // Import getProfile

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

    if (!username || !tagline || !region) { // If input fields empty, check for league profile
        const userProfile = getProfile(interaction.user.id);
        if (userProfile) {
            username = username || userProfile.riot_username;
            tagline = tagline || userProfile.tagline;
            region = region || userProfile.region;
        } else { // If no profile found, prompt user to retry or make a profile
            await interaction.reply({ content: 'Please provide your details or set up your profile with /setprofile.', ephemeral: true });
            return;
        }
    }

    try {
        const puuid = await getPuuidByRiotId(username, tagline, region);
        const accountInfo = await getAccIdByPuuid(puuid, region);
        const rankedData = await getRankBySummID(accountInfo.summId, region);

        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('Ranked Information')
            .setAuthor({ name: username + ' (' + tagline + ')' })
            .setDescription(`Detailed ranked stats for the summoner in ${region.toUpperCase()}.`)
            .addFields( //Display ranked info
                { name: 'Solo/Duo Queue', value: rankedData.solo ? `Tier: ${rankedData.solo.tier} ${rankedData.solo.rank} - ${rankedData.solo.leaguePoints} LP\n${rankedData.solo.wins}W ${rankedData.solo.losses}L` : 'Not available', inline: false },
                { name: 'Flex Queue', value: rankedData.flex ? `Tier: ${rankedData.flex.tier} ${rankedData.flex.rank} - ${rankedData.flex.leaguePoints} LP\n${rankedData.flex.wins}W ${rankedData.flex.losses}L` : 'Not available', inline: false }
            )
            embed.setTimestamp();

        await interaction.reply({ embeds: [embed] });
    } catch (error) {
        console.error('Error fetching summoner rank data:', error);
        await interaction.reply({ content: 'There was an error fetching the ranked data. Please try again later.', ephemeral: true });
    }
}