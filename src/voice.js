import {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  StreamType,
  EndBehaviorType,
  VoiceConnectionStatus,
  entersState,
  NoSubscriberBehavior,
  getVoiceConnection,
} from '@discordjs/voice';
import prism from 'prism-media';
import { isLeader, getVoiceChannelId, otherGroup } from './config.js';

// One "side" per group: the bot client for it, its live voice connection,
// and the audio player that speaks the OTHER side's relayed audio into it.
const sides = {
  A: { client: null, connection: null, player: null },
  B: { client: null, connection: null, player: null },
};

/** Register the two bot clients. Call once at startup. */
export function registerClients({ botA, botB }) {
  sides.A.client = botA;
  sides.B.client = botB;
}

function makePlayer() {
  return createAudioPlayer({
    behaviors: { noSubscriber: NoSubscriberBehavior.Play },
  });
}

/**
 * Join both configured voice channels (one per bot) and wire the relay.
 * Returns a human-readable summary of what happened.
 */
export async function joinAll() {
  const results = [];
  for (const group of ['A', 'B']) {
    const channelId = getVoiceChannelId(group);
    if (!channelId) {
      results.push(`Group ${group}: no voice channel set (use /setroom).`);
      continue;
    }
    try {
      await connectSide(group, channelId);
      results.push(`Group ${group}: connected. ✅`);
    } catch (err) {
      console.error(`Group ${group} join failed:`, err);
      results.push(`Group ${group}: failed to join — ${err.message}`);
    }
  }
  // Wire receivers only after both connections exist so relay targets are ready.
  wireRelay('A');
  wireRelay('B');
  return results.join('\n');
}

async function connectSide(group, channelId) {
  const side = sides[group];
  const client = side.client;
  const channel = await client.channels.fetch(channelId);
  if (!channel || !channel.isVoiceBased()) {
    throw new Error('configured channel is not a voice channel');
  }

  const connection = joinVoiceChannel({
    channelId: channel.id,
    guildId: channel.guild.id,
    adapterCreator: channel.guild.voiceAdapterCreator,
    selfDeaf: false, // must NOT be deaf, or we can't receive audio
    selfMute: false, // must NOT be muted, or we can't play relayed audio
  });

  await entersState(connection, VoiceConnectionStatus.Ready, 20_000);

  const player = side.player ?? makePlayer();
  connection.subscribe(player);

  side.connection = connection;
  side.player = player;
}

/**
 * Subscribe to leaders speaking in `group`'s channel and play their audio
 * into the opposite group's channel.
 */
function wireRelay(group) {
  const source = sides[group];
  const target = sides[otherGroup(group)];
  if (!source.connection || !target.player) return;

  const receiver = source.connection.receiver;

  // Avoid double-wiring if joinAll runs again.
  receiver.speaking.removeAllListeners('start');

  receiver.speaking.on('start', (userId) => {
    if (!isLeader(userId)) return;
    relayUtterance(receiver, userId, target.player, group);
  });
}

function relayUtterance(receiver, userId, targetPlayer, group) {
  // One Opus stream per utterance; ends after a short silence.
  const opusStream = receiver.subscribe(userId, {
    end: { behavior: EndBehaviorType.AfterSilence, duration: 500 },
  });

  // Decode Opus -> PCM; createAudioResource re-encodes it for the target channel.
  const decoder = new prism.opus.Decoder({
    rate: 48000,
    channels: 2,
    frameSize: 960,
  });

  const pcm = opusStream.pipe(decoder);
  const resource = createAudioResource(pcm, { inputType: StreamType.Raw });

  targetPlayer.play(resource);

  const cleanup = () => {
    opusStream.destroy();
    decoder.destroy();
  };
  opusStream.on('error', (e) => {
    console.error(`Relay source stream error (group ${group}):`, e.message);
    cleanup();
  });
  decoder.on('error', (e) => {
    console.error(`Relay decode error (group ${group}):`, e.message);
    cleanup();
  });
}

/** Disconnect both bots and stop relaying. */
export function leaveAll() {
  for (const group of ['A', 'B']) {
    const side = sides[group];
    const channelId = getVoiceChannelId(group);
    // Destroy any live connection for this bot's guild.
    if (side.connection) {
      side.connection.receiver?.speaking.removeAllListeners('start');
      side.connection.destroy();
      side.connection = null;
    } else if (channelId && side.client) {
      const guildId = side.client.channels.cache.get(channelId)?.guild?.id;
      if (guildId) getVoiceConnection(guildId, side.client.user.id)?.destroy();
    }
    side.player?.stop(true);
  }
}

export function getState() {
  return ['A', 'B'].map((group) => {
    const side = sides[group];
    const status = side.connection?.state?.status ?? 'not connected';
    return { group, channelId: getVoiceChannelId(group), status };
  });
}
