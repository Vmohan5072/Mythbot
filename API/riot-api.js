import fetch from 'node-fetch';
// Pulls from .env
const riotApiKey = process.env.RIOT_KEY;

// SPLIT DATES (Update these for each new split)
export const SPLIT_START_DATE = new Date('2024-05-15').getTime() / 1000; // May 15 2024
export const SPLIT_END_DATE = new Date('2024-09-24').getTime() / 1000;   // September 24 2024

// Rate limit management
let requestCount = 0;
const MAX_REQUESTS_PER_SECOND = 20;
const MAX_REQUESTS_PER_TWO_MINUTES = 100;

// Function to handle rate limiting
async function rateLimit() {
    return new Promise(resolve => {
        // Throttle API calls if they exceed 20 per second or 100 per 2 minutes
        if (requestCount >= MAX_REQUESTS_PER_TWO_MINUTES) {
            console.log("Rate limit exceeded. Waiting for 2 minutes...");
            setTimeout(() => {
                requestCount = 0;
                resolve();
            }, 120000); // Wait 2 minutes
        } else {
            if (requestCount >= MAX_REQUESTS_PER_SECOND) {
                console.log("Rate limit per second reached. Waiting for 1 second...");
                setTimeout(() => {
                    resolve();
                }, 1000); // Wait 1 second
            } else {
                resolve();
            }
        }
        requestCount++;
    });
}

// Function to get puuid from gameName and tagline
export async function getPuuidByRiotId(username, tagLine, region) {
    await rateLimit(); // Call rate limit before proceeding

    let puuidRegion;
    if (["na1", "br1", "la1", "la2"].includes(region)) {
        puuidRegion = "americas";
    } else if (["euw1", "eun1", "tr1", "me1"].includes(region)) {
        puuidRegion = "europe";
    } else if (["oc1", "ru1", "jp1", "kr", "ph2", "sg2", "tw2", "th2", "vn2"].includes(region)) {
        puuidRegion = "asia";
    } else {
        throw new Error(`Invalid region code: ${region}`);
    }
    console.log(`https://${puuidRegion}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(username)}/${encodeURIComponent(tagLine)}?api_key=${riotApiKey}`);

    try {
        const response = await fetch(`https://${puuidRegion}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(username)}/${encodeURIComponent(tagLine)}?api_key=${riotApiKey}`);
        if (!response.ok) {
            if (response.status === 429) {
                await handleRateLimit(response);
                return getPuuidByRiotId(username, tagLine, region); // Retry the request
            }
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
    await rateLimit(); // Call rate limit before proceeding

    try {
        const response = await fetch(`https://${region}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${puuid}?api_key=${riotApiKey}`);

        if (!response.ok) {
            if (response.status === 429) {
                await handleRateLimit(response);
                return getAccIdByPuuid(puuid, region); // Retry the request
            }
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
    await rateLimit(); // Call rate limit before proceeding

    try {
        const response = await fetch(`https://${region}.api.riotgames.com/lol/league/v4/entries/by-summoner/${summId}?api_key=${riotApiKey}`);
        if (!response.ok) {
            if (response.status === 429) {
                await handleRateLimit(response);
                return getRankBySummID(summId, region); // Retry the request
            }
            throw new Error(`Failed to fetch ranked info. Status: ${response.status}, Message: ${response.statusText}`);
        }

        const data = await response.json();
        const rankedData = {
            solo: null,
            flex: null,
        };

        data.forEach(entry => {
            if (entry.queueType === "RANKED_SOLO_5x5") {
                rankedData.solo = entry;
            } else if (entry.queueType === "RANKED_FLEX_SR") {
                rankedData.flex = entry;
            }
        });

        return rankedData;
    } catch (error) {
        console.error('Error fetching account info:', error);
        throw error;
    }
}

// Function to get mastery list by PUUID
export async function getMasteryListByPUUID(puuid, region) {
    await rateLimit(); // Call rate limit before proceeding

    try {
        const response = await fetch(`https://${region}.api.riotgames.com/lol/champion-mastery/v4/champion-masteries/by-puuid/${puuid}?api_key=${riotApiKey}`);
        if (!response.ok) {
            if (response.status === 429) {
                await handleRateLimit(response);
                return getMasteryListByPUUID(puuid, region); // Retry the request
            }
            throw new Error(`Failed to fetch mastery list info. Status: ${response.status}, Message: ${response.statusText}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching mastery list info:', error);
        throw error;
    }
}

// Function to get a limited mastery list by PUUID
export async function getMasteryListCountByPUUID(puuid, region, champCount) {
    await rateLimit(); // Call rate limit before proceeding

    try {
        const response = await fetch(`https://${region}.api.riotgames.com/lol/champion-mastery/v4/champion-masteries/by-puuid/${puuid}/top?count=${champCount}&api_key=${riotApiKey}`);
        if (!response.ok) {
            if (response.status === 429) {
                await handleRateLimit(response);
                return getMasteryListCountByPUUID(puuid, region, champCount); // Retry the request
            }
            throw new Error(`Failed to fetch limited mastery list info. Status: ${response.status}, Message: ${response.statusText}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching limited mastery list info:', error);
        throw error;
    }
}

// Function to fetch live game data by summoner ID
export async function getLiveGameDataBySummonerId(puuid, region) {
    await rateLimit(); // Call rate limit before proceeding
    console.log(`https://${region}.api.riotgames.com/lol/spectator/v5/active-games/by-summoner/${puuid}?api_key=${riotApiKey}`); //temp logging
    try {
        const response = await fetch(`https://${region}.api.riotgames.com/lol/spectator/v5/active-games/by-summoner/${puuid}?api_key=${riotApiKey}`);
        if (response.status === 404) {
            return null;
        }
        if (!response.ok) {
            if (response.status === 429) {
                await handleRateLimit(response);
                return getLiveGameDataBySummonerId(puuid, region); // Retry the request
            }
            throw new Error(`Failed to fetch live game data. Status: ${response.status}, Message: ${response.statusText}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching live game data:', error);
        throw error;
    }
}

// Function to fetch match IDs by time frame (split) limited to recent 5 matches
export async function getMatchIdsByTimeFrame(puuid, region, startTime = SPLIT_START_DATE, endTime = SPLIT_END_DATE, limit = 5) {
    const matchRegion = getMatchRoutingRegion(region);
    let matchIds = [];
    let start = 0;
    const count = limit;

    const response = await fetch(`https://${matchRegion}.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?start=${start}&count=${count}&startTime=${startTime}&endTime=${endTime}&api_key=${riotApiKey}`);
    
    if (!response.ok) {
        if (response.status === 429) {
            await handleRateLimit(response);
            return getMatchIdsByTimeFrame(puuid, region, startTime, endTime, limit); // Retry the request
        }
        throw new Error(`Failed to fetch match IDs. Status: ${response.status}, Message: ${response.statusText}`);
    }

    matchIds = await response.json();

    return matchIds;
}

// Function to get match details by match ID
export async function getMatchDetails(matchId, region) {
    await rateLimit(); // Call rate limit before proceeding

    const matchRegion = getMatchRoutingRegion(region);

    try {
        const response = await fetch(`https://${matchRegion}.api.riotgames.com/lol/match/v5/matches/${matchId}?api_key=${riotApiKey}`);
        if (!response.ok) {
            if (response.status === 429) {
                await handleRateLimit(response);
                return getMatchDetails(matchId, region); // Retry the request
            }
            throw new Error(`Failed to fetch match details. Status: ${response.status}, Message: ${response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching match details:', error);
        throw error;
    }
}

// Function to calculate general win rate over a limited number of matches
export async function getSplitWinRate(puuid, region, matchLimit = 10) {
    const matchIds = await getMatchIdsByTimeFrame(puuid, region, SPLIT_START_DATE, SPLIT_END_DATE, matchLimit);
    let totalGames = 0;
    let totalWins = 0;

    for (const matchId of matchIds) {
        const matchDetails = await getMatchDetails(matchId, region);
        const participant = matchDetails.info.participants.find(p => p.puuid === puuid);
        if (participant) {
            totalGames += 1;
            if (participant.win) {
                totalWins += 1;
            }
        }

        // Add delay to pace the API calls
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    const winRate = totalGames > 0 ? ((totalWins / totalGames) * 100).toFixed(2) : 'N/A';
    return { totalWins, totalGames, winRate };
}

// Function to calculate champion-specific win rate over a limited number of matches
export async function getChampionSplitWinRate(puuid, region, championId, matchLimit = 10) {
    const matchIds = await getMatchIdsByTimeFrame(puuid, region, SPLIT_START_DATE, SPLIT_END_DATE, matchLimit);
    let championGames = 0;
    let championWins = 0;

    for (const matchId of matchIds) {
        const matchDetails = await getMatchDetails(matchId, region);
        const participant = matchDetails.info.participants.find(p => p.puuid === puuid);
        if (participant && participant.championId === championId) {
            championGames += 1;
            if (participant.win) {
                championWins += 1;
            }
        }

        // Add delay to pace the API calls
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    const winRate = championGames > 0 ? ((championWins / championGames) * 100).toFixed(2) : 'N/A';
    return { championWins, championGames, winRate };
}

// Function to get champion ID to name map
export async function getChampionIdToNameMap() {
    try {
        const versionResponse = await fetch('https://ddragon.leagueoflegends.com/api/versions.json');
        const versions = await versionResponse.json();
        const latestVersion = versions[0];

        const championsResponse = await fetch(`https://ddragon.leagueoflegends.com/cdn/${latestVersion}/data/en_US/champion.json`);
        const championsData = await championsResponse.json();

        const championIdToNameMap = {};
        for (const championKey in championsData.data) {
            const champion = championsData.data[championKey];
            championIdToNameMap[champion.key] = champion.name;
        }

        return championIdToNameMap;
    } catch (error) {
        console.error('Error fetching champion data:', error);
        return null;
    }
}

// Helper function to handle rate limits
async function handleRateLimit(response) {
    const retryAfter = response.headers.get('Retry-After');
    if (retryAfter) {
        console.warn(`Rate limited. Retrying after ${retryAfter} seconds.`);
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
    } else {
        console.warn('Rate limited but no Retry-After header provided. Pausing for 10 seconds.');
        await new Promise(resolve => setTimeout(resolve, 10000));
    }
}

// Helper function to determine match region
function getMatchRoutingRegion(region) {
    if (["na1", "br1", "la1", "la2", "oc1"].includes(region)) {
        return "americas";
    } else if (["euw1", "eun1", "tr1", "ru"].includes(region)) {
        return "europe";
    } else if (["kr", "jp1"].includes(region)) {
        return "asia";
    } else {
        throw new Error(`Invalid region code: ${region}`);
    }
}