// riot-api.js
import fetch from 'node-fetch';
import config from '../config.json' assert { type: 'json' };

// Function to get puuid from gameName and tagline
export async function getPuuidByRiotId(username, tagLine, region) {
    const riotApiKey = config.RIOT_KEY;
    //Converts region code for PUUID
    let puuidRegion;
    if (region == "na1" || "br1" || "la1" || "la2" ) {
        puuidRegion = "americas";
    }

    else if (region == "euw1" || "eun1" || "tr1" || "me1") {
        puuidRegion = "europe";
    }

    else if (region == "oc1" || "ru1" || "jp1" || "kr" || "ph2" || "sg2" || "tw2" || "th2" || "vn2") {
        puuidRegion = "asia";
    }

    try {
        // Riot API endpoint for fetching PUUID from Riot ID
        const response = await fetch(`https://${puuidRegion}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(username)}/${encodeURIComponent(tagLine)}?api_key=${riotApiKey}`);

        if (!response.ok) {
            throw new Error(`Failed to fetch PUUID. Status: ${response.status}, Message: ${response.statusText}`);
        }

        const data = await response.json();
        return data.puuid;  // Return the PUUID from the response
    } catch (error) {
        console.error('Error fetching PUUID:', error);
        throw error;  
    }
}


export async function getAccIdByPuuid(puuid, region) {
    const riotApiKey = config.RIOT_KEY;

    try {
        // Riot API endpoint to get summonerID from puuid
        const response = await fetch(`https://${region}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${puuid}?api_key=${riotApiKey}`);

        if (!response.ok) { // throw error
            throw new Error(`Failed to fetch account info. Status: ${response.status}, Message: ${response.statusText}`);
        }

        const data = await response.json();
        return data.puuid;  // Return the PUUID from the response
    } catch (error) {
        console.error('Error fetching account info:', error);
        throw error;  
    }
}