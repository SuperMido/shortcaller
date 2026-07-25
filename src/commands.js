import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
} from 'discord.js';
import {
  getConfig,
  linkChannel,
  unlinkChannel,
  addLeader,
  removeLeader,
} from './config.js';

// All commands are restricted to members with the "Manage Server" permission.
const adminOnly = (builder) =>
  builder.setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

export const commandData = [
  adminOnly(
    new SlashCommandBuilder()
      .setName('link')
      .setDescription('Add this channel to a relay group (A or B).')
      .addStringOption((o) =>
        o
          .setName('group')
          .setDescription('Which group this channel belongs to')
          .setRequired(true)
          .addChoices(
            { name: 'Group A', value: 'A' },
            { name: 'Group B', value: 'B' },
          ),
      ),
  ),
  adminOnly(
    new SlashCommandBuilder()
      .setName('unlink')
      .setDescription('Remove this channel from its relay group.'),
  ),
  adminOnly(
    new SlashCommandBuilder()
      .setName('addleader')
      .setDescription('Add a user whose messages get relayed.')
      .addUserOption((o) =>
        o.setName('user').setDescription('The leader to add').setRequired(true),
      ),
  ),
  adminOnly(
    new SlashCommandBuilder()
      .setName('removeleader')
      .setDescription('Stop relaying a user\'s messages.')
      .addUserOption((o) =>
        o.setName('user').setDescription('The leader to remove').setRequired(true),
      ),
  ),
  adminOnly(
    new SlashCommandBuilder()
      .setName('status')
      .setDescription('Show the current leaders and each group\'s channels.'),
  ),
].map((b) => b.toJSON());

export async function handleCommand(interaction) {
  const reply = (content) =>
    interaction.reply({ content, flags: MessageFlags.Ephemeral });

  switch (interaction.commandName) {
    case 'link': {
      const group = interaction.options.getString('group', true);
      const { added, movedFrom } = linkChannel(interaction.channelId, group);
      if (!added) {
        return reply(`ℹ️ This channel is already in **Group ${group}**.`);
      }
      if (movedFrom) {
        return reply(
          `✅ Moved this channel from **Group ${movedFrom}** to **Group ${group}**.`,
        );
      }
      return reply(`✅ This channel is now in **Group ${group}**.`);
    }
    case 'unlink': {
      const removedFrom = unlinkChannel(interaction.channelId);
      return reply(
        removedFrom
          ? `✅ Removed this channel from **Group ${removedFrom}**.`
          : 'ℹ️ This channel was not in any group.',
      );
    }
    case 'addleader': {
      const user = interaction.options.getUser('user', true);
      const added = addLeader(user.id);
      return reply(
        added
          ? `✅ <@${user.id}> is now a leader — their messages will be relayed.`
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
      const fmt = (ids) =>
        ids.length ? ids.map((id) => `<#${id}>`).join(', ') : '_none_';
      return reply(
        `**Leaders:** ${leaders}\n` +
          `**Group A:** ${fmt(cfg.groups.A)}\n` +
          `**Group B:** ${fmt(cfg.groups.B)}`,
      );
    }
    default:
      return reply('Unknown command.');
  }
}
