# shortcaller

A Discord bot that relays messages from designated **leaders** across multiple linked rooms.

## How it works

There are two relay groups: **Group A** and **Group B**.

- You designate one or more **leaders** (by Discord user).
- You **link** each channel to either Group A or Group B.
- When a leader posts in a **Group A** channel, the bot reposts that message to every **Group B** channel — and vice versa — mirroring the leader's name and avatar (via a webhook).

**Example**

```
Group A -> Room A: P1 (leader), P2
Group B -> Room B: P3 (leader), P4

P1 types "Hello" in Room A (Group A)  ->  bot posts "Hello" (as P1) in Room B (Group B)
P3 types "Hi"    in Room B (Group B)  ->  bot posts "Hi"    (as P3) in Room A (Group A)
```

Non-leaders (P2, P4) are not relayed. You can link more than one channel to a group; a Group A message fans out to all Group B channels.

## Setup

### 1. Create the bot application

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications) → **New Application**.
2. Open the **Bot** tab → **Reset Token** → copy the token.
3. On the same **Bot** tab, enable **MESSAGE CONTENT INTENT** (required — the bot reads message text).
4. Copy the **Application ID** from the **General Information** tab.

### 2. Invite the bot to your server

On the **OAuth2 → URL Generator** tab, select scopes **`bot`** and **`applications.commands`**, then give it these bot permissions:

- View Channels
- Send Messages
- Manage Webhooks _(lets relayed messages appear as the leader)_

Open the generated URL and add the bot to your server.

### 3. Configure & run

```bash
npm install
cp .env.example .env      # then edit .env with your token, client ID (and optionally a guild ID)
npm run deploy-commands   # register the slash commands
npm start                 # start the bot
```

> Tip: set `DISCORD_GUILD_ID` in `.env` while developing — guild commands appear instantly. Global commands can take up to an hour.

## Commands

All commands require the **Manage Server** permission and reply privately (ephemeral).

| Command | Description |
| --- | --- |
| `/link group:A` | Add the current channel to Group A (or `group:B` for Group B). |
| `/unlink` | Remove the current channel from its group. |
| `/addleader user:@P1` | Make a user a leader (their messages get relayed). |
| `/removeleader user:@P1` | Stop relaying a user's messages. |
| `/status` | Show the current leaders and each group's channels. |

### Setting up the example

Run these in your server:

```
# in Room A's channel:
/link group:A
# in Room B's channel:
/link group:B
# anywhere:
/addleader user:@P1
/addleader user:@P3
```

## Notes

- Configuration is stored in `config.json` (created automatically, git-ignored) so it survives restarts.
- A channel belongs to exactly one group; `/link` on a channel already in the other group moves it.
- Group A ⇄ Group B is bidirectional. Messages fan out to every channel in the opposite group.
- Relayed copies never ping/mention anyone.
- The bot ignores messages from bots and webhooks, so relayed copies never loop.
