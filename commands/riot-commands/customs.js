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
            // Check if the player has a linked Riot account
            const riotProfile = await getProfile(buttonInteraction.user.id);
            if (!riotProfile) {
                await buttonInteraction.reply({ content: 'You do not have a linked Riot account. Please set up your profile with /setprofile before joining.', ephemeral: true });
                return; // Stop further execution if no Riot account is linked
            }

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

        // Notify the creator that balancing is in progress
        await buttonInteraction.reply({ embeds: [embed], ephemeral: true });

        const region = 'na1'; // Default region to NA1 if not set
        const playerData = [];

        for (const playerId of lobby.players) {
            const user = await buttonInteraction.client.users.fetch(playerId);
            const riotProfile = await getProfile(user.id); // Ensure async getProfile

            if (!riotProfile) {
                console.error(`No profile found for player ${user.id}`);
                continue; // Skip if no profile is found for a player
            }

            const { riot_username, tagline } = riotProfile;
            if (!riot_username || !tagline) {
                console.error(`Incomplete profile for player ${user.id}: Missing username or tagline.`);
                continue; // Skip if username or tagline is missing
            }

            try {
                const puuid = await getPuuidByRiotId(riot_username, tagline, region);
                const accountInfo = await getAccIdByPuuid(puuid, region);
                const rankData = await getRankBySummID(accountInfo.summId, region);
                const winrateData = await getSplitWinRate(puuid, region);

                const rank = rankData.solo ? `${rankData.solo.tier} ${rankData.solo.rank}` : 'Unranked';
                const rankPoints = rankData.solo ? rankData.solo.leaguePoints : 0;
                const winRate = winrateData.winRate || 'N/A';
                const totalGames = winrateData.totalGames || 0;

                playerData.push({
                    id: playerId,
                    username: user.username,
                    rank,
                    rankPoints,
                    winRate,
                    totalGames, // Include totalGames for unranked players
                });

                // Pace API calls over 6 seconds to avoid rate limits
                await new Promise(resolve => setTimeout(resolve, 600));
            } catch (error) {
                console.error(`Error fetching data for player ${riot_username} (${tagline}):`, error);
                continue; // Skip the player if there's an error fetching their data
            }
        }

        if (playerData.length < 2) {
            await buttonInteraction.followUp({ content: 'Not enough valid players to balance teams.', ephemeral: true });
            return;
        }

        const teams = generateBalancedTeams(playerData);
        const team1 = teams.team1.map(p => `<@${p.id}> (${p.rank}${p.rank !== 'Unranked' ? `, ${p.rankPoints} LP` : `, ${p.totalGames} Games`})`).join('\n');
        const team2 = teams.team2.map(p => `<@${p.id}> (${p.rank}${p.rank !== 'Unranked' ? `, ${p.rankPoints} LP` : `, ${p.totalGames} Games`})`).join('\n');

        const balancedEmbed = new EmbedBuilder()
            .setTitle('Teams Balanced')
            .setDescription('Teams have been balanced based on ranks and total games played for unranked players.')
            .addFields(
                { name: 'Team 1', value: team1 || 'N/A', inline: true },
                { name: 'Team 2', value: team2 || 'N/A', inline: true }
            )
            .setColor('#00FF00');

        // Edit the original message to show the balanced teams to everyone
        await buttonInteraction.followUp({ embeds: [balancedEmbed], ephemeral: false });

    } catch (error) {
        console.error('Error balancing teams:', error);
        await buttonInteraction.followUp({ content: 'There was an error balancing the teams.', ephemeral: true });
    }
}

// Function to convert rank to a set elo number
function rankToValue(rank, totalGames = 0) {
    const rankValues = {
        'IRON': 100,
        'BRONZE': 200,
        'SILVER': 300,
        'GOLD': 400,
        'PLATINUM': 500,
        'DIAMOND': 600,
        'MASTER': 700,
        'GRANDMASTER': 800,
        'CHALLENGER': 900
    };

    const divisionValues = {
        'IV': 0,
        'III': 25,
        'II': 50,
        'I': 75
    };

    if (rank === 'Unranked') {
        // Set baseline at Iron 4, skill ceiling at Gold 4 depending on total games played
        return 100 + Math.min(totalGames, 375);
    }

    const [tier, division] = rank.split(' ');
    return (rankValues[tier] || 0) + (divisionValues[division] || 0);
}

// Algorithm to balance teams based on skill rating
function generateBalancedTeams(playerData) {
    const n = playerData.length;
    let minDifference = Infinity;
    let bestTeam1 = [];
    let bestTeam2 = [];

    const targetTeamSize = Math.floor(n / 2);

    // Function to generate all possible team splits with pruning
    function generateSplits(index, team1, team2, team1Skill, team2Skill) {
        // Base case: All players have been assigned
        if (index === n) {
            const difference = Math.abs(team1Skill - team2Skill);
            if (difference < minDifference) {
                minDifference = difference;
                bestTeam1 = [...team1];
                bestTeam2 = [...team2];
            }
            return;
        }

        const player = playerData[index];

        // Assign player to Team 1 if team1 is not yet full
        if (team1.length < targetTeamSize) {
            team1.push(player);
            const newTeam1Skill = team1Skill + player.rankValue;

            // Calculate the minimum possible difference if assigning to Team 1
            const potentialDifference = Math.abs(newTeam1Skill - team2Skill);
            if (potentialDifference < minDifference) { // Prune if promising
                generateSplits(
                    index + 1,
                    team1,
                    team2,
                    newTeam1Skill,
                    team2Skill
                );
            }
            team1.pop();
        }

        // Assign player to Team 2 if team2 is not yet full
        if (team2.length < targetTeamSize) {
            team2.push(player);
            const newTeam2Skill = team2Skill + player.rankValue;

            // Calculate the minimum possible difference if assigning to Team 2
            const potentialDifference = Math.abs(team1Skill - newTeam2Skill);
            if (potentialDifference < minDifference) { // Prune if promising
                generateSplits(
                    index + 1,
                    team1,
                    team2,
                    team1Skill,
                    newTeam2Skill
                );
            }
            team2.pop();
        }
    }

    // Start generating splits
    generateSplits(0, [], [], 0, 0);

    return { team1: bestTeam1, team2: bestTeam2 };
}