import 'dotenv/config';

export async function DiscordRequest(endpoint, options) {
  // append endpoint to root API URL
  const url = 'https://discord.com/api/v10/' + endpoint;
  // Stringify payloads
  if (options.body) options.body = JSON.stringify(options.body);
  // Use fetch to make requests
  const res = await fetch(url, {
    headers: {
      Authorization: `Bot ${process.env.DISCORD_TOKEN}`,
      'Content-Type': 'application/json; charset=UTF-8',
      'User-Agent': 'DiscordBot (https://github.com/discord/discord-example-app, 1.0.0)',
    },
    ...options
  });
  // throw API errors
  if (!res.ok) {
    const data = await res.json();
    console.log(res.status);
    throw new Error(JSON.stringify(data));
  }
  // return original response
  return res;
}

export async function InstallGlobalCommands(appId, commands) {
  // API endpoint to overwrite global commands
  const endpoint = `applications/${appId}/commands`;

  try {
    // This is calling the bulk overwrite endpoint: https://discord.com/developers/docs/interactions/application-commands#bulk-overwrite-global-application-commands
    await DiscordRequest(endpoint, { method: 'PUT', body: commands });
  } catch (err) {
    console.error(err);
  }
}

// Function to normalize region input
export function normalizeRegionInput(region) {
  // Convert to lowercase
  region = region.toLowerCase();

  // Define region mappings for those without "1"
  const regionMappings = {
      "na": "na1",
      "euw": "euw1",
      "eune": "eun1",
      "br": "br1",
      "jp": "jp1",
      "kr": "kr",
      "oc": "oc1",
      "ru": "ru1",
      "tr": "tr1",
      "la": "la1" // You can add more region mappings as needed
  };

  // If the region is already valid (like na1, euw1), return it directly
  if (Object.values(regionMappings).includes(region)) {
      return region;
  }

  // Check if the region is in the mappings and return the correct format (e.g., na -> na1)
  if (region in regionMappings) {
      return regionMappings[region];
  }

  // If it's not a recognized region, return the input as is (for cases like kr or already normalized ones)
  return region;
}

export function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
