# MythBot - Discord Bot with League of Legends API Integration 

MythBot is a Discord bot designed with the Discord.js framework to enhance the League of Legends experience by enabling users to create custom lobbies, balance teams based on player ranks, and fetch League of Legends profile information. The bot uses the Riot Games API to provide accurate and up-to-date information about players' ranks, win rates, and other stats.

## Features

- **Custom Lobby Creation**: Users can create custom lobbies within Discord, allowing other users to join and leave with a simple click of a button.
- **Team Balancing**: The bot balances teams within the lobby based on player ranks and divisions to ensure fair matches.
- **Profile Fetching**: Retrieve detailed League of Legends profile information, including rank, win rate, and mastery, directly from Discord.
- **Dynamic User Interaction**: The bot utilizes Discord's interaction components, such as buttons, for joining and leaving lobbies, as well as for balancing teams.

## Getting Started

### Prerequisites

Before you begin, ensure you have met the following requirements:

- Node.js (v14.0.0 or later)
- A Discord bot token ([Discord Developer Portal](https://discord.com/developers/applications))
- A Riot Games API key ([Riot Developer Portal](https://developer.riotgames.com/))
- Basic knowledge of JavaScript and Node.js

### Installation

1. **Clone the repository**:
    ```bash
    git clone https://github.com/Vmohan5072/MythBot.git
    cd MythBot
    ```

2. **Install dependencies**:
    ```bash
    npm install
    ```

3. **Configure the bot**:
   Create a `config.json` file in the root directory of the project:
      ```json
      {
        "DISCORD_TOKEN": "your-discord-bot-token",
        "RIOT_KEY": "your-riot-api-key"
      }
      ```

4. **Run the bot**:
    ```bash
    npm start
    ```

## Commands and Interactions

### `/createlobby`

- **Description**: Creates a custom lobby where users can join, leave, and balance teams.
- **Options**:
  - `maxplayers` (optional): Set the maximum number of players (default is 10).
- **Usage**: 
    - Creates a lobby with interactive buttons for users to join, leave, and balance teams.
    - Example: `/createlobby maxplayers:10`

### Fetching User Profiles

- The bot uses a `getProfile` function to fetch linked Riot account information.
- This data is then used for various commands, such as balancing teams based on ranks and win rates.

## File Structure

- **app.js**: The main entry point for the bot, handling command registration and interactions.
- **commands/**: Contains all command files for the bot.
  - **riot-commands/**: Folder containing commands related to League of Legends, such as fetching profiles and managing custom lobbies.
  - **base-commands/**: Folder containing commands for basic information, such as server information and user information.
  - **user/**: Contains commands related to Riot Games profiles, such as linking and fetching a linked Riot profile.
- **API/**: Contains functions to interact with the Riot Games API, such as fetching PUUIDs, ranked data, and match history.
- **profileFunctions.js**: Manages user profiles, linking Discord users to their Riot accounts.
- **deploy-commands.js**: Script to refresh commands.
- **userProfiles.json**: Stores linked Riot usernames to Discord profiles.
- **config.json**: Stores the API keys for Discord and Riot Games. NOT included by default.

## API Call Rate Limiting

- **Rate Limits**: The bot paces API calls to the Riot Games API over 6-8 seconds to avoid hitting rate limits.
- **Error Handling**: The bot handles 429 rate limit errors by retrying the request after the recommended delay.

## Coming Soon

- **Live Game Data**: During a League of Legends match, the bot can gather information of each player in your match, such as the ranks, average winrate and champion winrates.
- **Server Leaderboard**: A leaderboard in a server that displays the people with the highest ranks, as well as the top champion masteries.
