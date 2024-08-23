import 'dotenv/config';
import { getRPSChoices } from './game.js';
import { capitalize, InstallGlobalCommands } from './utils.js';

// Get the game choices from game.js
function createCommandChoices() {
  const choices = getRPSChoices();
  const commandChoices = [];

  for (let choice of choices) {
    commandChoices.push({
      name: capitalize(choice),
      value: choice.toLowerCase(),
    });
  }

  return commandChoices;
}

// Simple test command
const TEST_COMMAND = {
  name: 'test',
  description: 'Basic command',
  type: 1,
  integration_types: [0, 1],
  contexts: [0, 1, 2],
};

const TEST2_COMMAND = {
  name: 'testing',
  description: 'Second command',
  type: 1,
  integration_types: [0, 1],
  contexts: [0, 1, 2],
};

const GET_RIOTID = {
  name: 'register riotid',
  description: 'link your Riot ID to your Discord profile',
  type: 
};


const ALL_COMMANDS = [TEST_COMMAND, TEST2_COMMAND];

InstallGlobalCommands(process.env.APP_ID, ALL_COMMANDS);

//TODO: function to link riotid to discord account 