# shortcaller

A Discord bot that relays **voice** from designated **leaders** between two voice rooms.

## How it works

There are two voice rooms: **Group A** and **Group B**.

- You designate one or more **leaders** (by Discord user).
- Each group is one **voice channel**.
- When a leader speaks in **Group A**'s channel, the bot plays that audio into **Group B**'s channel — and vice versa. Only leaders' voices are relayed.

```
Group A -> Room A (voice): P1 (leader), P2
Group B -> Room B (voice): P3 (leader), P4

P1 speaks in Room A  ->  bot speaks P1's audio in Room B
P3 speaks in Room B  ->  bot speaks P3's audio in Room A
```

### ⚠️ Two bots are required

A single Discord bot can only be in **one voice channel per server**. Since both rooms
are in the **same server**, shortcaller runs **two bot applications** in one process:

- **Bot A** joins Group A's channel (and hosts the slash commands)
- **Bot B** joins Group B's channel

They share audio internally: Bot A hears a leader in Room A and Bot B plays it into Room B, and the reverse.

**Limitations:** the relayed audio comes out of the *bot's* voice (Discord can't reuse a
user's voice), and each direction plays one speaker at a time — if two leaders in the same
room talk at once, the newer one interrupts.

## Setup

### 1. Create TWO bot applications

For **each** of Bot A and Bot B, at the [Developer Portal](https://discord.com/developers/applications):

1. **New Application** → open the **Bot** tab → **Reset Token** → copy it.
2. Copy the **Application ID** from **General Information** (only Bot A's ID is needed, for commands).

No privileged intents are required (voice only — no Message Content intent).

### 2. Invite BOTH bots to your server

For each bot, use **OAuth2 → URL Generator**: scope **`bot`** (plus **`applications.commands`** for Bot A), with permissions:

- View Channels
- Connect
- Speak

Open each URL and add both bots to the server. Make sure both can **Connect** and **Speak** in the two voice channels.

### 3. Configure & run

```bash
npm install
cp .env.example .env      # fill in both tokens, Bot A's client ID, and the guild ID
npm run deploy-commands   # register slash commands (on Bot A)
npm start                 # starts BOTH bots in one process
```

On start it prints a dependency report — confirm an **Opus** library and an **Encryption**
library are found (they are installed automatically).

## Commands

All commands require the **Manage Server** permission and reply privately. Run them where Bot A can see them.

| Command | Description |
| --- | --- |
| `/setroom group:A channel:#RoomA` | Set Group A's voice channel (use `group:B` for B). |
| `/join` | Both bots join their rooms and start relaying. |
| `/leave` | Both bots leave and stop relaying. |
| `/addleader user:@P1` | Make a user a leader (their voice gets relayed). |
| `/removeleader user:@P1` | Stop relaying a user's voice. |
| `/status` | Show leaders, rooms, and connection state. |

### Setting up the example

```
/setroom group:A channel:#RoomA
/setroom group:B channel:#RoomB
/addleader user:@P1
/addleader user:@P3
/join
```

Now P1's voice in Room A plays in Room B, and P3's voice in Room B plays in Room A. P2/P4 are ignored.

## Notes

- Configuration is stored in `config.json` (created automatically, git-ignored) so it survives restarts.
- Both bots must have **Connect** + **Speak** in their respective voice channels.
- Voice relay uses `@discordjs/voice`; audio is decoded from Opus and re-encoded for the target channel.
