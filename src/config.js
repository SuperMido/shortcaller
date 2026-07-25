import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = join(__dirname, '..', 'config.json');

export const GROUPS = ['A', 'B'];

const DEFAULT_CONFIG = {
  // Discord user IDs whose messages get relayed (P1, P3, ...).
  leaders: [],
  // The two relay groups. A leader's message in a Group A channel is reposted
  // to every Group B channel, and vice versa.
  groups: {
    A: [], // channel IDs in Group A
    B: [], // channel IDs in Group B
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
        groups: { ...DEFAULT_CONFIG.groups, ...(raw.groups ?? {}) },
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

/** Returns 'A', 'B', or null for the group a channel belongs to. */
export function getGroupOfChannel(channelId) {
  const cfg = load();
  for (const group of GROUPS) {
    if (cfg.groups[group].includes(channelId)) return group;
  }
  return null;
}

/** Channels in the *other* group, i.e. where a message from this channel is relayed. */
export function getRelayTargets(fromChannelId) {
  const group = getGroupOfChannel(fromChannelId);
  if (!group) return [];
  const otherGroup = group === 'A' ? 'B' : 'A';
  return [...load().groups[otherGroup]];
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

/**
 * Add a channel to a group. Removes it from the other group first if needed
 * (a channel belongs to exactly one group).
 * Returns { added, movedFrom } — movedFrom is the previous group or null.
 */
export function linkChannel(channelId, group) {
  const cfg = load();
  const current = getGroupOfChannel(channelId);
  if (current === group) return { added: false, movedFrom: null };

  if (current) {
    const arr = cfg.groups[current];
    arr.splice(arr.indexOf(channelId), 1);
  }
  cfg.groups[group].push(channelId);
  save();
  return { added: true, movedFrom: current };
}

/** Remove a channel from whichever group it's in. Returns the group, or null. */
export function unlinkChannel(channelId) {
  const cfg = load();
  const current = getGroupOfChannel(channelId);
  if (!current) return null;
  const arr = cfg.groups[current];
  arr.splice(arr.indexOf(channelId), 1);
  save();
  return current;
}
