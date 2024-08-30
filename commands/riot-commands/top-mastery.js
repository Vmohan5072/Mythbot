import { SlashCommandBuilder } from '@discordjs/builders';
import { getPuuidByRiotId, getMasteryListByPUUID } from '../../API/riot-api.js';

export const data = new SlashCommandBuilder()
    .setName('summonerinfo')
    .setDescription('Fetches basic League of Legends account information.')
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
        // get PUUID by Riot ID
        const puuid = await getPuuidByRiotId(username, tagline, region);
        if (count) {
            const champMasteryData = await getMasteryListCountByPUUID(puuid, region, champCount);
        }
        else if (!count) {
            const champMasteryData = await getMasteryCountByPUUID(puuid, region);
        }
        let responseMessage = `Champion Mastery Data for Summoner: ${username} ${tagline}\n\n`;
    }
}