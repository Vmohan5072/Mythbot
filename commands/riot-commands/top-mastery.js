import { SlashCommandBuilder } from '@discordjs/builders';
import { getPuuidByRiotId, getMasteryListByPUUID, getMasteryListCountByPUUID, getChampionIdToNameMap } from '../../API/riot-api.js';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export const data = new SlashCommandBuilder()
    .setName('topmastery')
    .setDescription('Fetches your top champion masteries')
    .addStringOption(option =>
        option.setName('username')
            .setDescription('The Riot username of the player.')
            .setRequired(true))
    .addStringOption(option =>
        option.setName('tagline')
            .setDescription('The tag of the player without a hashtag (NA1, EUW1, EUNE1, etc.)')
            .setRequired(true))
    .addStringOption(option =>
        option.setName('region')
            .setDescription('The region of the Riot account (na1, euw1, eune1, etc.)')
            .setRequired(true))
    .addIntegerOption(option =>
        option.setName('count')
            .setDescription('The top # of champions to display (Optional))')
            .setRequired(false));

export async function execute(interaction) {
    const username = interaction.options.getString('username');
    const tagline = interaction.options.getString('tagline');
    const region = interaction.options.getString('region');
    const count = interaction.options.getInteger('count');

    try {
        // Get PUUID by Riot ID
        const puuid = await getPuuidByRiotId(username, tagline, region);
        
        // Populate champion mastery data
        const champMasteryData = count 
            ? await getMasteryListCountByPUUID(puuid, region, count) 
            : await getMasteryListByPUUID(puuid, region);

        // Assign champ name to champ id
        const championIdToNameMap = await getChampionIdToNameMap();
        if (!championIdToNameMap) {
            throw new Error('Failed to fetch champion data.');
        }

        // Page setup
        const championsPerPage = 10;  // Show 10 champions per page
        const totalPages = Math.ceil(champMasteryData.length / championsPerPage);

        // Create page content
        let currentPage = 0;
        const generatePageContent = (page) => {
            const startIndex = page * championsPerPage;
            const endIndex = startIndex + championsPerPage;
            const pageData = champMasteryData.slice(startIndex, endIndex);

            let responseMessage = `Champion Mastery Data for Summoner: ${username} ${tagline}\n\n`;
            pageData.forEach((entry, index) => {
                const championName = championIdToNameMap[entry.championId];
                responseMessage += `**${startIndex + index + 1}. ${championName}**Level ${entry.championLevel}, Points: ${entry.championPoints}\n`;
            });

            return responseMessage;
        };

        // Create buttons for pagination
        const createPaginationButtons = () => {
            return new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('previous')
                    .setLabel('Previous')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(currentPage === 0),
                new ButtonBuilder()
                    .setCustomId('next')
                    .setLabel('Next')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(currentPage === totalPages - 1)
            );
        };

        // Send the initial response with pagination
        const initialMessage = await interaction.reply({
            content: generatePageContent(currentPage),
            components: [createPaginationButtons()],
            fetchReply: true,
        });

        // Set up a collector to handle button interactions
        const collector = initialMessage.createMessageComponentCollector({
            filter: i => i.user.id === interaction.user.id,
            time: 60000, // 1-minute timeout
        });

        collector.on('collect', async (buttonInteraction) => {
            if (buttonInteraction.customId === 'previous' && currentPage > 0) {
                currentPage--;
            } else if (buttonInteraction.customId === 'next' && currentPage < totalPages - 1) {
                currentPage++;
            }

            await buttonInteraction.update({
                content: generatePageContent(currentPage),
                components: [createPaginationButtons()],
            });
        });

        // When the collector expires, edit the message to remove buttons and reset to the first page
        collector.on('end', async () => {
            await initialMessage.edit({
                content: generatePageContent(0),  // Return to the first page
                components: [],
            });
        });

    } catch (error) {
        console.error('Error executing command:', error);
        await interaction.reply(`Failed to fetch mastery data: ${error.message}`);
    }
}