import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
  ChannelType,
} from 'discord.js';
import {
  getConfig,
  setVoiceChannel,
  addLeader,
  removeLeader,
  getVoiceChannelId,
} from './config.js';
import { joinAll, leaveAll, getState } from './voice.js';

// Commands are visible to everyone for now. To restrict them to members with
// the "Manage Server" permission again, use:
//   builder.setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
const adminOnly = (builder) => builder;

export const commandData = [
  adminOnly(
    new SlashCommandBuilder()
      .setName('setroom')
      .setDescription('Set a group\'s voice channel.')
      .addStringOption((o) =>
        o
          .setName('group')
          .setDescription('Which group')
          .setRequired(true)
          .addChoices(
            { name: 'Attack', value: 'attack' },
            { name: 'Defence', value: 'defence' },
          ),
      )
      .addChannelOption((o) =>
        o
          .setName('channel')
          .setDescription('The voice channel for this group')
          .addChannelTypes(ChannelType.GuildVoice)
          .setRequired(true),
      ),
  ),
  adminOnly(
    new SlashCommandBuilder()
      .setName('join')
      .setDescription('Make both bots join their rooms and start relaying voice.'),
  ),
  adminOnly(
    new SlashCommandBuilder()
      .setName('leave')
      .setDescription('Make both bots leave and stop relaying.'),
  ),
  adminOnly(
    new SlashCommandBuilder()
      .setName('addleader')
      .setDescription('Add a user whose voice gets relayed.')
      .addUserOption((o) =>
        o.setName('user').setDescription('The leader to add').setRequired(true),
      ),
  ),
  adminOnly(
    new SlashCommandBuilder()
      .setName('removeleader')
      .setDescription('Stop relaying a user\'s voice.')
      .addUserOption((o) =>
        o.setName('user').setDescription('The leader to remove').setRequired(true),
      ),
  ),
  adminOnly(
    new SlashCommandBuilder()
      .setName('status')
      .setDescription('Show leaders, rooms, and connection state.'),
  ),
].map((b) => b.toJSON());

export async function handleCommand(interaction) {
  const reply = (content) =>
    interaction.reply({ content, flags: MessageFlags.Ephemeral });

  switch (interaction.commandName) {
    case 'setroom': {
      const group = interaction.options.getString('group', true);
      const channel = interaction.options.getChannel('channel', true);
      setVoiceChannel(group, channel.id);
      return reply(`✅ **${group}** voice channel set to <#${channel.id}>.`);
    }
    case 'join': {
      if (!getVoiceChannelId('attack') && !getVoiceChannelId('defence')) {
        return reply('⚠️ No rooms set yet. Use `/setroom` for attack and defence first.');
      }
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const summary = await joinAll();
      return interaction.editReply(summary);
    }
    case 'leave': {
      leaveAll();
      return reply('👋 Both bots left the voice channels. Relay stopped.');
    }
    case 'addleader': {
      const user = interaction.options.getUser('user', true);
      const added = addLeader(user.id);
      return reply(
        added
          ? `✅ <@${user.id}> is now a leader — their voice will be relayed.`
          : `ℹ️ <@${user.id}> is already a leader.`,
      );
    }
    case 'removeleader': {
      const user = interaction.options.getUser('user', true);
      const removed = removeLeader(user.id);
      return reply(
        removed
          ? `✅ <@${user.id}> is no longer a leader.`
          : `ℹ️ <@${user.id}> was not a leader.`,
      );
    }
    case 'status': {
      const cfg = getConfig();
      const leaders = cfg.leaders.length
        ? cfg.leaders.map((id) => `<@${id}>`).join(', ')
        : '_none_';
      const lines = getState().map((s) => {
        const room = s.channelId ? `<#${s.channelId}>` : '_not set_';
        return `**${s.group}:** ${room} — ${s.status}`;
      });
      return reply(`**Leaders:** ${leaders}\n${lines.join('\n')}`);
    }
    default:
      return reply('Unknown command.');
  }
}
