import { PermissionFlagsBits } from 'discord.js';

const WEBHOOK_NAME = 'shortcaller-relay';

// channelId -> webhook, so we don't re-fetch on every message.
const webhookCache = new Map();

/**
 * Get (or create) the relay webhook for a channel. Requires the bot to have
 * the "Manage Webhooks" permission in that channel.
 */
async function getWebhook(channel) {
  if (webhookCache.has(channel.id)) return webhookCache.get(channel.id);

  const me = channel.guild.members.me;
  if (!channel.permissionsFor(me)?.has(PermissionFlagsBits.ManageWebhooks)) {
    return null; // caller falls back to a plain message
  }

  const existing = await channel.fetchWebhooks();
  let webhook = existing.find(
    (w) => w.name === WEBHOOK_NAME && w.owner?.id === channel.client.user.id,
  );
  if (!webhook) {
    webhook = await channel.createWebhook({ name: WEBHOOK_NAME });
  }
  webhookCache.set(channel.id, webhook);
  return webhook;
}

/**
 * Relay a leader's message into one target channel, mirroring their display
 * name and avatar via a webhook. Falls back to a plain bot message.
 */
export async function relayToChannel(targetChannel, message) {
  const content = buildContent(message);
  const files = message.attachments.map((a) => a.url);

  if (!content && files.length === 0) return; // nothing to relay

  try {
    const webhook = await getWebhook(targetChannel);
    if (webhook) {
      await webhook.send({
        content: content || undefined,
        username: message.member?.displayName ?? message.author.username,
        avatarURL: message.author.displayAvatarURL(),
        files,
        allowedMentions: { parse: [] }, // don't ping people in the relayed copy
      });
      return;
    }
  } catch (err) {
    console.error(`Webhook relay failed in ${targetChannel.id}, falling back:`, err.message);
    webhookCache.delete(targetChannel.id);
  }

  // Fallback: plain message prefixed with the author's name.
  const name = message.member?.displayName ?? message.author.username;
  await targetChannel.send({
    content: `**${name}:** ${content}`.trim(),
    files,
    allowedMentions: { parse: [] },
  });
}

function buildContent(message) {
  return message.content ?? '';
}
