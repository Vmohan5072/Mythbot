import { SlashCommandBuilder } from '@discordjs/builders';

export const data = new SlashCommandBuilder()
	.setName('ping')
	.setDescription('Replies with Pong!');

export async function execute(interaction) {
	await interaction.reply('Pong!');
}

/*TODO: add the following back into index.js
// "test" command
if (name === 'test') {
	// Send a message into the channel where command was triggered from
	return res.send({
	  type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
	  data: {
		// Fetches a random emoji to send from a helper function
		content: `hello world! ${getRandomEmoji()}`,
	  },
	});
  }
  
  if (name === 'testing') {
	// Send a message into the channel where command was triggered from
	return res.send({
	  type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
	  data: {
		// Fetches a random emoji to send from a helper function
		content: `hello mom ${getRandomEmoji()}`,
	  },
	});
  }
*/