import { SlashCommandBuilder } from '@discordjs/builders';

export const data = new SlashCommandBuilder()
	.setName('server')
	.setDescription('Provides information about the server.');

export async function execute(interaction) {
	await interaction.reply('This server is ${interaction.guild.name} and has ${interaction.guild.memberCount} members.');
}
