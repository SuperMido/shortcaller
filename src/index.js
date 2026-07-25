import 'dotenv/config';
import { Client, GatewayIntentBits, Events } from 'discord.js';
import { generateDependencyReport } from '@discordjs/voice';
import { handleCommand } from './commands.js';
import { registerClients } from './voice.js';

const tokenA = process.env.DISCORD_TOKEN_A;
const tokenB = process.env.DISCORD_TOKEN_B;

if (!tokenA || !tokenB) {
  console.error(
    'Missing DISCORD_TOKEN_A and/or DISCORD_TOKEN_B.\n' +
      'You need TWO bot applications (both invited to the server) because a bot\n' +
      'can only be in one voice channel per server. Copy .env.example to .env.',
  );
  process.exit(1);
}

// GuildVoiceStates is required to join/receive voice. No message intents needed.
const intents = [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates];

const botA = new Client({ intents }); // sits in Group A's room, handles commands
const botB = new Client({ intents }); // sits in Group B's room

registerClients({ botA, botB });

botA.once(Events.ClientReady, (c) => console.log(`✅ Bot A online as ${c.user.tag} (Group A)`));
botB.once(Events.ClientReady, (c) => console.log(`✅ Bot B online as ${c.user.tag} (Group B)`));

// Only Bot A handles slash commands, to keep a single source of truth.
botA.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  try {
    await handleCommand(interaction);
  } catch (err) {
    console.error('Command error:', err);
    const msg = { content: '⚠️ Something went wrong.', ephemeral: true };
    if (interaction.deferred) await interaction.editReply(msg).catch(() => {});
    else if (!interaction.replied) await interaction.reply(msg).catch(() => {});
  }
});

console.log(generateDependencyReport());

await Promise.all([botA.login(tokenA), botB.login(tokenB)]);
