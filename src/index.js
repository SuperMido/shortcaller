import 'dotenv/config';
import { Client, GatewayIntentBits, Partials, Events } from 'discord.js';
import { isLeader, getGroupOfChannel, getRelayTargets } from './config.js';
import { handleCommand } from './commands.js';
import { relayToChannel } from './relay.js';

const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.error('Missing DISCORD_TOKEN. Copy .env.example to .env and fill it in.');
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent, // privileged — enable it in the Dev Portal
  ],
  partials: [Partials.Channel],
});

client.once(Events.ClientReady, (c) => {
  console.log(`✅ shortcaller is online as ${c.user.tag}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  try {
    await handleCommand(interaction);
  } catch (err) {
    console.error('Command error:', err);
    if (interaction.isRepliable() && !interaction.replied) {
      await interaction.reply({ content: '⚠️ Something went wrong.', ephemeral: true }).catch(() => {});
    }
  }
});

client.on(Events.MessageCreate, async (message) => {
  // Ignore bots/webhooks (including our own relayed copies) to prevent loops.
  if (message.author.bot || message.webhookId) return;
  if (!message.guild) return;

  // Only relay leaders speaking in a channel that belongs to a group.
  if (!isLeader(message.author.id)) return;
  if (!getGroupOfChannel(message.channelId)) return;

  const targetIds = getRelayTargets(message.channelId);
  await Promise.all(
    targetIds.map(async (channelId) => {
      try {
        const channel = await client.channels.fetch(channelId);
        if (channel?.isTextBased()) {
          await relayToChannel(channel, message);
        }
      } catch (err) {
        console.error(`Failed to relay to channel ${channelId}:`, err.message);
      }
    }),
  );
});

client.login(token);
