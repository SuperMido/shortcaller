import 'dotenv/config';
import { REST, Routes } from 'discord.js';
import { commandData } from './commands.js';

// Slash commands live on Bot A only.
const token = process.env.DISCORD_TOKEN_A;
const clientId = process.env.DISCORD_CLIENT_ID_A;
const guildId = process.env.DISCORD_GUILD_ID;

if (!token || !clientId) {
  console.error('Missing DISCORD_TOKEN_A or DISCORD_CLIENT_ID_A in .env');
  process.exit(1);
}

const rest = new REST().setToken(token);

try {
  if (guildId) {
    // Guild commands update instantly — best for development.
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
      body: commandData,
    });
    console.log(`✅ Registered ${commandData.length} guild commands to ${guildId}.`);
  } else {
    // Global commands can take up to ~1 hour to propagate.
    await rest.put(Routes.applicationCommands(clientId), { body: commandData });
    console.log(`✅ Registered ${commandData.length} global commands.`);
  }
} catch (err) {
  console.error('Failed to register commands:', err);
  process.exit(1);
}
