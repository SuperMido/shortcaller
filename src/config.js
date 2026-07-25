import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = join(__dirname, '..', 'config.json');

export const GROUPS = ['attack', 'defence'];

const DEFAULT_CONFIG = {
  // Discord user IDs whose voice gets relayed (P1, P3, ...).
  leaders: [],
  // Each group is one voice channel. Bot A sits in the attack channel,
  // Bot B in the defence channel. Audio is relayed attack <-> defence.
  groups: {
    attack: { voiceChannelId: null },
    defence: { voiceChannelId: null },
  },
};

let cache = null;

function load() {
  if (cache) return cache;
  if (existsSync(CONFIG_PATH)) {
    try {
      const raw = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));
      cache = {
        ...DEFAULT_CONFIG,
        ...raw,
        groups: {
          attack: { ...DEFAULT_CONFIG.groups.attack, ...(raw.groups?.attack ?? {}) },
          defence: { ...DEFAULT_CONFIG.groups.defence, ...(raw.groups?.defence ?? {}) },
        },
      };
    } catch (err) {
      console.error('Failed to parse config.json, starting from defaults:', err.message);
      cache = structuredClone(DEFAULT_CONFIG);
    }
  } else {
    cache = structuredClone(DEFAULT_CONFIG);
  }
  return cache;
}

function save() {
  writeFileSync(CONFIG_PATH, JSON.stringify(cache, null, 2));
}

export function getConfig() {
  return load();
}

export function isLeader(userId) {
  return load().leaders.includes(userId);
}

export function getVoiceChannelId(group) {
  return load().groups[group]?.voiceChannelId ?? null;
}

export function setVoiceChannel(group, channelId) {
  const cfg = load();
  cfg.groups[group].voiceChannelId = channelId;
  save();
}

/** The group whose bot should relay TO (the opposite side). */
export function otherGroup(group) {
  return group === 'attack' ? 'defence' : 'attack';
}

export function addLeader(userId) {
  const cfg = load();
  if (cfg.leaders.includes(userId)) return false;
  cfg.leaders.push(userId);
  save();
  return true;
}

export function removeLeader(userId) {
  const cfg = load();
  const idx = cfg.leaders.indexOf(userId);
  if (idx === -1) return false;
  cfg.leaders.splice(idx, 1);
  save();
  return true;
}
