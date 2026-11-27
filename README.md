# The Crucible

A philosophy app that feels like a world you enter at night. You test what you
believe against great thinkers, talk real situations through with them, and
watch your own thinking take shape on a hillside.

## The world

The app opens on **the Sanctuary**, a moonlit 3D hill above the sea with five places; tap one and the camera flies up to it:

| Place | What you do there | Route |
| --- | --- | --- |
| The Temple | Defend a belief against two philosophers. Your thesis is the roof, each premise a column; objections crack columns, and your replies seal them in gold, rebuild them, or let them fall. Ends in Victory, Stands reshaped, Still contested or Collapse. | `/app/debate` |
| The Symposium | Talk something real through with philosophers seated as marble statues around a lamplit table. Speak to one or to everyone; only those with something to say reply, and they argue with each other. Choose how simple the English is. | `/app/symposium` |
| Hall of Minds | A moonlit 3D gallery of 47 marble busts in lit niches, wing by wing through history. Walk along it, tap a bust to read its plaque, talk to them alone, or seat them at the Symposium. | `/app/hall` |
| The Oracle | A bronze tripod burning among the ruins of an old shrine (3D); its fire reacts as you answer. One everyday question a day. Answer in a sentence; hear what your answer rests on and how two thinkers would see it. | `/app/oracle` |
| Your Landscape | A 3D hill you can turn all the way round. Every belief you have tested stands as its own small temple, built from how the debate went (gold veins, new marble, cracks, fallen drums, ruins); conversations leave lamps. | `/app/landscape` |

Older routes (`/app/reflect`, `/app/archive`, `/app/train`, `/app/mythinking`)
redirect to their new places. The product vision and build plan live in the
"The Crucible: Vision and Build Plan" doc.

## Structure

- `client/` — Vite + React + TypeScript + Tailwind v4.
  - `src/screens/` — one file per place (`Sanctuary`, `TempleDebate`, `Symposium`, `Hall`, `Oracle`, `Landscape`) plus the debate composer, onboarding, profile and settings.
  - `src/temple/` — the 3D temple (`TempleScene.ts`, three.js), its synthesised sounds, and the shared ending rules (`ending.ts`).
  - `src/night/theme.ts` — the night world's colours and fonts. Fonts are bundled through Fontsource.
- `server/` — Express backend that holds the Claude API key and asks Claude for structured answers.
  - `src/routes/` — `debate`, `reflect` (the Symposium), `library`, `oracle`, `train` (unused, kept for now).
  - `src/data/constitutions.ts` — a researched profile of each philosopher's real views, injected so they argue as themselves.

## Running locally

```bash
# terminal 1
cd server
cp .env.example .env   # fill in ANTHROPIC_API_KEY
npm install
npm run dev            # http://localhost:8787

# terminal 2
cd client
npm install
npm run dev            # http://localhost:5173, proxies /api to :8787
```

## Settings (server environment)

| Variable | Default | What it does |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | none | Required. Never sent to the browser. |
| `CLAUDE_MODEL` | `claude-opus-5-5` | Model for everything a philosopher says. |
| `CLAUDE_LIGHT_MODEL` | `claude-haiku-5-5` | Cheaper model for hidden jobs: choosing opponents, splitting premises, search. |
| `DAILY_SESSION_LIMIT` | `12` | New debates, symposiums and Oracle answers per visitor per day. `0` turns it off. |
| `CLIENT_ORIGIN` | none | Extra website addresses allowed to call the server (comma-separated). The live site and localhost are always allowed. |

Every request is also rate limited to 20 per minute per visitor. Set a monthly
spending cap in the Anthropic console as the final safeguard.

## Deploying

See [DEPLOY.md](./DEPLOY.md): dashboard-only steps for Render. Once set up,
every push to the tracked branch redeploys the app automatically.

## Design decisions worth knowing

- **Structured output through a tool call.** `server/src/claude.ts` offers one tool and asks Claude to call it, so answers arrive as parsed JSON. Current models reject a forced `tool_choice`, so it uses `auto` with an explicit instruction and one retry.
- **Thinking counts toward `max_tokens`.** Current models always think first, so per-route token limits are treated as a floor of 16,000; length is set in each prompt.
- **The judge decides what happens to a column.** After each reply, `/debate/evaluate` returns `standing`, `defended`, `weakened`, `conceded` or `revised` (with the rewritten premise) and a one-line reason per touched premise. Changing your mind for a good reason never counts as losing.
- **Honest endings.** Endings are derived from final premise states in `client/src/temple/ending.ts`, shared by the Temple and the Landscape; a session with no replies is Untested, never a win or a loss.
- **The 3D library loads only in the Temple**, so the rest of the app stays quick to open.
- **Reduced motion is respected** everywhere: camera sway, particles and entrance animations switch off.

## Next session: start here

1. **Try the new Symposium with the real AI.** It now runs as a conversation:
   one call to `/reflect/discuss` writes the next 1 to 4 turns, only those
   with something to say speak, they answer each other by name, the speaker
   turns to whoever they address and listeners nod or shake their heads. The
   English level (Simple, Everyday, Philosophical) is chosen at the table.
   Check how it reads and how long a reply takes; tune the prompt from there.
2. The opening is conversational too: only the one or two philosophers most
   provoked by what you said speak first; the others join when they have
   something to add.
3. Then: replies that appear word by word. (Every place is now 3D: the
   Sanctuary hill, Temple, Symposium, Hall of Minds, Oracle and Landscape.)

## Still to do

- Accounts and sign-in, so the daily allowance and saved history follow a person rather than a device.
- Faces could go further still (hand-made models per thinker would be the next step).
- Packaging as an iPhone app and App Store submission.

