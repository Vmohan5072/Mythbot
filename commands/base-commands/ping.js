import { SlashCommandBuilder } from '@discordjs/builders';

export const data = new SlashCommandBuilder()
	.setName('ping')
	.setDescription('Replies with Pong!');

export async function execute(interaction) {
	try {
	await interaction.reply('Pong!'); }
	catch (error) {
		console.error('Error executing ping command:', error);
        await interaction.reply({ content: 'There was an error executing this command.', ephemeral: true });
	}
}
