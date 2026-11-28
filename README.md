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
| Thought Experiments | 23 of philosophy's great puzzles, played: a scene and a choice, a twist that tests it, a second choice, then two philosophers respond to what you chose and the famous thinkers' own answers are revealed. One is today's dilemma. | `/app/experiments` |
| The Journey | A road through history in seven chapters (the Hall's wings): meet the 47 thinkers in turn. Each asks you a question about your own life and answers what you say, or invites you to play the thought experiment they devised. Meeting one opens the next and marks them in the Hall. Your temples and lamps are still reached from Your seat. | `/app/journey` |

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

Aesthetics done so far: every place 3D with a shared night look (sea, sky,
mist, bloom, the view across the bay), real scanned surfaces, carved panels
and gilt buttons, classical icons, lamplight arrivals between places, a 3D
welcome, night sounds in every place, and an app icon.

Done from the 28 Nov test report: premises visible all debate, the roof
re-carved after a rewrite, every premise tested, a clearer round counter,
waiting times on the lamps, a loading screen, steadier forms, auto-scroll,
one question per Journey meeting, shorter judge lines, more varied busts, a
plate for every thought experiment, the medallion off the moon, AI-portrayal
labels, and a support card for anyone in crisis.

1. **Replies that appear word by word** (streaming), so the 10-20 second waits feel shorter.
2. **The AI cost plan**: compare models, then pre-write what can be pre-written.
3. **Check it on a real iPhone**: frame rate and memory in the 3D places on older phones.
4. Untested so far: Landscape with many temples, "Meet" completion on the
   Journey, and what happens when the API fails.

Later, before the App Store: accounts and sign-in (Apple or email), packaging
as an iPhone app with real native features (sync, notifications, haptics,
offline Hall), a privacy policy and age rating, the Apple developer account
($99/year), and a monthly spending cap in the Anthropic console.

## Still to do

- Accounts and sign-in, so the daily allowance and saved history follow a person rather than a device.
- Faces could go further still (hand-made models per thinker would be the next step).
- Packaging as an iPhone app and App Store submission.

