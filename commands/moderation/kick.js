//Kicks a user
import { SlashCommandBuilder } from '@discordjs/builders';

export const data = new SlashCommandBuilder()
	.setName('kick')
	.setDescription('Kicks a user from the server');

export async function execute(interaction) {
	await interaction.reply(`This command was run by ${interaction.user.username}, who joined on ${interaction.member.joinedAt}.`);
}

/*kick(reason) {
    return this.guild.members.kick(this, reason);
  }
*/