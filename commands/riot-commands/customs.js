import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import { getPuuidByRiotId, getAccIdByPuuid, getRankBySummID, getSplitWinRate } from '../../API/riot-api.js';
import { getProfile } from '../../profileFunctions.js';

let lobbies = {};

export const data = new SlashCommandBuilder()
    .setName('createlobby')
    .setDescription('Creates a custom lobby for team balancing.')
    .addIntegerOption(option =>
        option.setName('maxplayers')
            .setDescription('Maximum number of players (default is 10).')
            .setRequired(false));

export async function execute(interaction) {
    const creator = interaction.user.id;
    const maxPlayers = interaction.options.getInteger('maxplayers') || 10;
    const lobbyId = `${creator}-${Date.now()}`;

    lobbies[lobbyId] = {
        creator,
        maxPlayers,
        players: [],
    };

    const joinButton = new ButtonBuilder()
        .setCustomId(`join-${lobbyId}`)
        .setLabel('Join Lobby')
        .setStyle(ButtonStyle.Primary);

    const leaveButton = new ButtonBuilder()
        .setCustomId(`leave-${lobbyId}`)
        .setLabel('Leave Lobby')
        .setStyle(ButtonStyle.Danger);

    const balanceButton = new ButtonBuilder()
        .setCustomId(`balance-${lobbyId}`)
        .setLabel('Balance Teams')
        .setStyle(ButtonStyle.Success);

    const row = new ActionRowBuilder()
        .addComponents(joinButton, leaveButton, balanceButton);

    const embed = new EmbedBuilder()
        .setTitle('Custom Lobby Created')
        .setDescription(`Lobby created by <@${creator}>. Max Players: ${maxPlayers}`)
        .setColor('#0099ff')
        .addFields({ name: 'Current Players', value: 'No players yet.' });

    const replyMessage = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });

    // Save the message ID to update it later
    lobbies[lobbyId].messageId = replyMessage.id;
    lobbies[lobbyId].channelId = replyMessage.channel.id;
}

// Generate button responses
export function registerButtonHandler(client) {
    client.on('interactionCreate', async buttonInteraction => {
        if (!buttonInteraction.isButton()) return;

        const [action, ...lobbyIdParts] = buttonInteraction.customId.split('-');
        const lobbyId = lobbyIdParts.join('-');
        const lobby = lobbies[lobbyId];

        if (!lobby) {
            await buttonInteraction.reply({ content: 'This lobby no longer exists.', ephemeral: true });
            return;
        }

        if (action === 'join') {
            if (lobby.players.length >= lobby.maxPlayers) {
                await buttonInteraction.reply({ content: 'Lobby is full.', ephemeral: true });
                return;
            }

            if (!lobby.players.includes(buttonInteraction.user.id)) {
                lobby.players.push(buttonInteraction.user.id);
                await updateLobbyMessage(client, lobby);
                await buttonInteraction.reply({ content: `You have joined the lobby. (${lobby.players.length}/${lobby.maxPlayers})`, ephemeral: true });
            } else {
                await buttonInteraction.reply({ content: 'You are already in the lobby.', ephemeral: true });
            }

        } else if (action === 'leave') {
            lobby.players = lobby.players.filter(id => id !== buttonInteraction.user.id);
            await updateLobbyMessage(client, lobby);
            await buttonInteraction.reply({ content: 'You have left the lobby.', ephemeral: true });

        } else if (action === 'balance') {
            if (buttonInteraction.user.id !== lobby.creator) {
                await buttonInteraction.reply({ content: 'Only the lobby creator can balance teams.', ephemeral: true });
                return;
            }

            if (lobby.players.length < 2) {
                await buttonInteraction.reply({ content: 'Not enough players to balance teams.', ephemeral: true });
                return;
            }

            await balanceTeams(lobby, buttonInteraction);
        }
    });
}

async function updateLobbyMessage(client, lobby) {
    const channel = await client.channels.fetch(lobby.channelId);
    const message = await channel.messages.fetch(lobby.messageId);

    const playerList = lobby.players.length > 0
        ? lobby.players.map(id => `<@${id}>`).join('\n')
        : 'No players yet.';

    const embed = new EmbedBuilder()
        .setTitle('Custom Lobby Created')
        .setDescription(`Lobby created by <@${lobby.creator}>. Max Players: ${lobby.maxPlayers}`)
        .setColor('#0099ff')
        .addFields({ name: 'Current Players', value: playerList });

    await message.edit({ embeds: [embed] });
}

// Balance Teams Function
async function balanceTeams(lobby, buttonInteraction) {
    try {
        const embed = new EmbedBuilder()
            .setTitle('Balancing Teams')
            .setDescription('Please wait while we balance the teams...')
            .setColor('#FFFF00');

        // Notify the creator that balancing is in progress, but don't make it ephemeral
        await buttonInteraction.reply({ embeds: [embed], ephemeral: true });

        const region = 'na1'; // Default region to NA1 if not set
        const playerData = [];

        for (const playerId of lobby.players) {
            const user = await buttonInteraction.client.users.fetch(playerId);
            const riotProfile = await getProfile(user.id); // Ensure async getProfile

            if (!riotProfile) {
                console.error(`No profile found for player ${user.id}`);
                continue;
            }

            const { riot_username, tagline } = riotProfile;
            const puuid = await getPuuidByRiotId(riot_username, tagline, region);
            const accountInfo = await getAccIdByPuuid(puuid, region);
            const rankData = await getRankBySummID(accountInfo.summId, region);
            const winrateData = await getSplitWinRate(puuid, region);

            playerData.push({
                id: playerId,
                username: user.username,
                rank: rankData.solo ? `${rankData.solo.tier} ${rankData.solo.rank}` : 'Unranked',
                rankPoints: rankData.solo ? rankData.solo.leaguePoints : 0,
                winRate: winrateData.winRate,
                totalGames: winrateData.totalGames,
            });

            // Pace API calls to avoid rate limits
            await new Promise(resolve => setTimeout(resolve, 600));
        }

        const teams = generateBalancedTeams(playerData);
        const team1 = teams.team1.map(p => `<@${p.id}> (${p.rank} ${p.rankPoints} LP)`).join('\n');
        const team2 = teams.team2.map(p => `<@${p.id}> (${p.rank} ${p.rankPoints} LP)`).join('\n');

        const balancedEmbed = new EmbedBuilder()
            .setTitle('Teams Balanced')
            .setDescription('Teams have been balanced based on ranks and winrates.')
            .addFields(
                { name: 'Team 1', value: team1, inline: true },
                { name: 'Team 2', value: team2, inline: true }
            )
            .setColor('#00FF00');

        // Edit the original message to show the balanced teams to everyone
        await buttonInteraction.followUp({ embeds: [balancedEmbed], ephemeral: false });

    } catch (error) {
        console.error('Error balancing teams:', error);
        await buttonInteraction.followUp({ content: 'There was an error balancing the teams.', ephemeral: true });
    }
}

// Function to convert rank to a set number
function rankToValue(rank) {
    const rankValues = {
        'IRON': 1,
        'BRONZE': 2,
        'SILVER': 3,
        'GOLD': 4,
        'PLATINUM': 5,
        'DIAMOND': 6,
        'MASTER': 7,
        'GRANDMASTER': 8,
        'CHALLENGER': 9
    };

    const divisionValues = {
        'IV': 0,
        'III': 0.25,
        'II': 0.5,
        'I': 0.75
    };

    if (rank === 'Unranked') return 0;

    const [tier, division] = rank.split(' ');
    return rankValues[tier] + (divisionValues[division] || 0);
}

// Algorithm to balance teams
function generateBalancedTeams(playerData) {
    playerData.forEach(player => {
        player.rankValue = rankToValue(player.rank);
    });

    playerData.sort((a, b) => b.rankValue - a.rankValue);

    const team1 = [];
    const team2 = [];

    let team1TotalRank = 0;
    let team2TotalRank = 0;

    playerData.forEach(player => {
        if (team1TotalRank <= team2TotalRank) {
            team1.push(player);
            team1TotalRank += player.rankValue;
        } else {
            team2.push(player);
            team2TotalRank += player.rankValue;
        }
    });

    return { team1, team2 };
}