//return information about any user
import { SlashCommandBuilder } from '@discordjs/builders';

export const data = new SlashCommandBuilder()
	.setName('userinfo')
	.setDescription('Provides information about a specified user.')
    .addUserOption(option => //Option to specify which command to reload
        option.setName('username')
            .setDescription('The username of the user')
            .setRequired(true));

export async function execute(interaction) {
	await interaction.reply(`${interaction.user.username}, who joined on ${interaction.member.joinedAt}.`);
}