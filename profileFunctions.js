import { getRankBySummID, getPuuidByRiotId, getAccIdByPuuid } from './API/riot-api.js';
import { setProfile } from '../../profileFunctions.js';
import pkg from 'pg';
const { Client } = pkg;

// Connect to postgres
const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

// Function to connect to the database
export async function connectToDatabase() {
    try {
        await client.connect();
        console.log('Database connection successful');
    } catch (error) {
        console.error('Error connecting to the database:', error);
        process.exit(1); // Exit the process with errors if the database connection fails
    }
}

// Get profile by Discord ID
export async function getProfile(discordId) {
    try {
        const res = await client.query('SELECT * FROM riot_profiles WHERE discord_id = $1', [discordId]);
        console.log('Fetched profile:', res.rows[0]);  // Temp logging
        await refreshRank(discordId); //refresh rank
        return res.rows[0] || null;
    } 
    
    catch (error) {
        console.error('Error fetching profile:', error);
        return null;
    }
}

// Set Profile and save rank to Postgres database
export async function setProfile(discordId, username, tagline, region) {
    try {

        const normalizedRegion = normalizeRegionInput(region);
        // Fetch summoner information from the Riot API
        const puuid = await getPuuidByRiotId(username, tagline, normalizedRegion);

        if (!puuid) {
            console.error('Could not find summoner information.');
            return;
        }

        // Fetch summoner ID and account info
        const summonerInfo = await getAccIdByPuuid(puuid, normalizedRegion);
        if (!summonerInfo) {
            console.error('Could not retrieve summoner account information.');
            return;
        }

        const summonerId = summonerInfo.summId;

        // Fetch rank information using summoner ID
        const rankData = await getRankBySummID(summonerId, normalizedRegion);
        let soloDuoRank = 'Unranked';

        if (rankData && rankData.solo) {
            soloDuoRank = `${rankData.solo.tier} ${rankData.solo.rank} ${rankData.solo.leaguePoints} LP`;
        }

        // Insert or update the profile in the database, including the rank and last_update timestamp
        const query = `
            INSERT INTO riot_profiles (discord_id, riot_username, tagline, region, solo_duo_rank, last_update, summoner_id)
            VALUES ($1, $2, $3, $4, $5, NOW(), $6)
            ON CONFLICT (discord_id)
            DO UPDATE SET riot_username = EXCLUDED.riot_username, tagline = EXCLUDED.tagline, region = EXCLUDED.region, solo_duo_rank = EXCLUDED.solo_duo_rank, summoner_id = EXCLUDED.summoner_id, last_update = NOW();
        `;
        await client.query(query, [discordId, username, tagline, normalizedRegion, soloDuoRank, summonerId]);

        console.log(`Profile set for ${username}: Rank - ${soloDuoRank}`);
    } 
    
    catch (error) {
        console.error('Error setting profile:', error);
    }
}

// Refresh Rank and update last_update
export async function refreshRank(discordId) {
    try {
        // Fetch the profile from the database using the discordId
        const res = await client.query('SELECT * FROM riot_profiles WHERE discord_id = $1', [discordId]);

        if (res.rows.length === 0) {
            console.log('No league profile found with this discord Id');
            return;
        }

        const profile = res.rows[0];
        const summonerId = profile.summoner_id;  // Assuming this field stores the summoner ID
        const region = profile.region;

        console.log('Fetched profile:', profile);  // Temp logging

        // Fetch the rank information using the summonerId
        const rankData = await getRankBySummID(summonerId, region);

        if (!rankData || !rankData.solo) {
            console.log('No solo/duo rank found for this user');
            return;
        }

        const soloDuoRank = `${rankData.solo.tier} ${rankData.solo.rank} ${rankData.solo.leaguePoints} LP`;

        // Update the database with the fetched rank and reset timestamp
        await client.query('UPDATE riot_profiles SET solo_duo_rank = $1, last_update = NOW() WHERE discord_id = $2', [soloDuoRank, discordId]);

        console.log(`Updated rank for ${profile.riot_username}: ${soloDuoRank}`);
    } 
    
    catch (error) {
        console.error('Error refreshing rank:', error);
    }
}
// Query to select and sort profiles by rank hierarchy
export async function getProfileLeaderboard() {
    try {
        const res = await client.query(`
            SELECT discord_id, riot_username, tagline, solo_duo_rank 
            FROM riot_profiles 
            WHERE solo_duo_rank IS NOT NULL
            ORDER BY solo_duo_rank DESC;
        `);

        return res.rows; // Return the leaderboard data
    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        return [];
    }
}


// Function to disconnect from the database
export function closeConnection() {
    client.end();
}

connectToDatabase();