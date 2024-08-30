// riot-api.js
import fetch from 'node-fetch';
import config from '../config.json' assert { type: 'json' };

// Function to get puuid from gameName and tagline
export async function getPuuidByRiotId(username, tagLine, region) {
    const riotApiKey = config.RIOT_KEY;
    //Converts region code for PUUID
    let puuidRegion;
    if (["na1", "br1", "la1", "la2"].includes(region)) {
        puuidRegion = "americas";
    }
     else if (["euw1", "eun1", "tr1", "me1"].includes(region)) {
        puuidRegion = "europe";
    }
     else if (["oc1", "ru1", "jp1", "kr", "ph2", "sg2", "tw2", "th2", "vn2"].includes(region)) {
        puuidRegion = "asia";
    }
     else {
        throw new Error(`Invalid region code: ${region}`);
    }

    try {
        // Riot API endpoint for fetching PUUID from Riot ID
        const response = await fetch(`https://${puuidRegion}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(username)}/${encodeURIComponent(tagLine)}?api_key=${riotApiKey}`);

        if (!response.ok) { // throw error message
            throw new Error(`Failed to fetch PUUID. Status: ${response.status}, Message: ${response.statusText}`);
        }

        const data = await response.json();
        return data.puuid;
    } catch (error) {
        console.error('Error fetching PUUID:', error);
        throw error;  
    }
}


// Function to get accountID from PUUID
export async function getAccIdByPuuid(puuid, region) {
    const riotApiKey = config.RIOT_KEY;

    try {
        // Riot API endpoint to get summonerID from PUUID
        const response = await fetch(`https://${region}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${puuid}?api_key=${riotApiKey}`);

        if (!response.ok) { // throw error message
            throw new Error(`Failed to fetch account info. Status: ${response.status}, Message: ${response.statusText}`);
        }

        const data = await response.json();
        return { 
            summId: data.id,
            accountId: data.accountId,
            puuid: data.puuid,
            profileIconId: data.profileIconId,
            revisionDate: data.revisionDate,
            summonerLevel: data.summonerLevel
        };  

    } catch (error) {
        console.error('Error fetching account info:', error);
        throw error;  
    }
}


// Function to get ranked info from summonerID
export async function getRankBySummID(summId, region) {
    const riotApiKey = config.RIOT_KEY;

    try {
        // Riot API endpoint to get ranked data from summonerID
        const response = await fetch(`https://${region}.api.riotgames.com/lol/league/v4/entries/by-summoner/${summId}?api_key=${riotApiKey}`);

        if (!response.ok) { // throw error
            throw new Error(`Failed to fetch ranked info. Status: ${response.status}, Message: ${response.statusText}`);
        }

        const data = await response.json();
         // Organize data by queueType
         const rankedData = {
            solo: null,
            flex: null,
        };

        data.forEach(entry => {
            if (entry.queueType === "RANKED_SOLO_5x5") {
                rankedData.solo = entry;  // Store Solo Queue info
            } else if (entry.queueType === "RANKED_FLEX_SR") {
                rankedData.flex = entry;  // Store Flex Queue info
            }
        });

        return rankedData;  // Return tier, rank, LP, wins, losses

    } catch (error) {
        console.error('Error fetching account info:', error);
        throw error;  
    }
}


export async function getMasteryListByPUUID(puuid, region) {
    const riotApiKey = config.RIOT_KEY;

    try {
        const response = await fetch(`https://${region}.api.riotgames.com/lol/champion-mastery/v4/champion-masteries/by-puuid/${puuid}?api_key=${riotApiKey}`);

        if (!response.ok) { // throw error
            throw new Error(`Failed to fetch mastery list info. Status: ${response.status}, Message: ${response.statusText}`);
        }

        const data = await response.json();

        const champMasteryData = {};

        data.forEach(entry => {
            champMasteryData = entry;
        });

        return rankedData;
    } catch (error) {
        console.error('Error fetching mastery list info:', error);
        throw error;
    }
}



export async function getMasteryListCountByPUUID(puuid, region, champCount) {
    const riotApiKey = config.RIOT_KEY;
    try {
        const response = await fetch(`https://${region}.api.riotgames.com/lol/champion-mastery/v4/champion-masteries/by-puuid/${puuid}/top?count=${champCount}&api_key=${riotApiKey}`);

        if (!response.ok) { // throw error
            throw new Error(`Failed to fetch limited mastery list info. Status: ${response.status}, Message: ${response.statusText}`);
        }

        const data = await response.json();

        const champMasteryData = {};

        data.forEach(entry => {
            champMasteryData = entry;
        });

        return rankedData;
    } catch (error) {
        console.error('Error fetching limited mastery list info:', error);
        throw error;
    }
}