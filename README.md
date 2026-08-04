# The Crucible

A philosophy debate app: state a real position, have it broken into premises,
and have two philosophers with genuinely opposing frameworks attack it.

## Structure

- `client/` — Vite + React + TypeScript + Tailwind v4
- `server/` — Express backend that holds the Claude API key and proxies
  structured-output requests to it. The client never sees the key.

## Running locally

```bash
# terminal 1
cd server
cp .env.example .env   # fill in ANTHROPIC_API_KEY
npm install
npm run dev             # http://localhost:8787

# terminal 2
cd client
npm install
npm run dev              # http://localhost:5173, proxies /api to :8787
```

## Deploying (no terminal needed)

See [DEPLOY.md](./DEPLOY.md) — dashboard-only steps for Render, including
where to paste your API key.

## Status

Project scaffold and app shell (landing screen, bottom tab bar, Debate/
Library/Train/History routes) are in place. Core debate logic, the
47-philosopher dataset, and the real prompt wording are pending — they're
being ported from a prototype file that hasn't come through yet. See open
items below.

## Design notes / decisions worth knowing about

- **Structured output over delimiter parsing.** The prototype used a
  hand-rolled `MARKER: value` format because JSON kept breaking on
  unescaped quotes in philosophical prose. The real API supports forced
  tool use, so `server/src/claude.ts` has Claude fill in a tool call
  against a JSON schema instead — the SDK parses it, there's no
  quote-escaping to get wrong, and there's no text format to break.
- **The `via-[#hex]` Tailwind bug is avoided, not just worked around.**
  All forge gradients use inline `style={{ background: 'linear-gradient(...)' }}`
  rather than Tailwind's `via-` utility, so this doesn't depend on
  whichever Tailwind/JIT version ends up in the build.
- **`min-h-full` vs `min-h-svh`.** The landing screen initially used
  `min-h-full` for centering and silently failed to center — percentage
  heights need a definite-height ancestor chain, and `min-height` on an
  ancestor doesn't count as "definite" for that purpose, so the browser
  fell back to auto-sizing. Switched to `min-h-svh` (viewport-relative,
  no ancestor chain needed) and it centers correctly.
- **Bust illustrations are one component, not four.** `BustPlain`/
  `BustLaurel`/`BustBearded`/`BustPlinth` from the prototype are one
  `<Bust laurel bearded plinth>` component with boolean props here —
  same visual variety, no duplicated paths to keep in sync.

## Flags on the brief (read before going further)

1. **Rate limiting is not optional once this is deployed.** A backend
   proxy that holds the API key still means anyone who finds the URL can
   burn your Claude spend if there's no limiter. `server/src/index.ts` has
   a basic per-IP `express-rate-limit` on `/api` (20 req/min) — treat this
   as a floor, not a finished answer. If this ends up on a public URL for
   your CV, consider adding a lightweight app-level check too (e.g. a
   shared secret header set at build time), since IP-based limits alone
   are easy to route around.
2. **Photos behind text need a scrim.** Rotating real Wikimedia portraits
   as backgrounds behind philosopher text will fight for contrast against
   whatever the debate/library UI renders on top, especially portrait
   photos with busy backgrounds. Plan on a consistent gradient/scrim
   overlay (e.g. parchment-to-transparent) rather than raw `<img>` behind
   text, or contrast will vary debate to debate depending on which photo
   rotates in.
3. **Wikimedia filenames need a validity check at build/runtime, not just
   at spec-writing time.** Files get renamed or deleted on Commons.
   Fetching by exact filename with no fallback means a single renamed
   file silently breaks a philosopher's whole background rotation — worth
   a fallback to the `Bust` illustration if an image 404s, which also
   gives the "keep or improve the busts" ask a real job to do instead of
   being pure decoration.
4. **AI-generated bios "fetched on first view and cached" need a real
   cache layer**, not just a component-level `useState`. If it's
   per-browser (`localStorage`) that's fine for a solo CV project, but if
   this is ever shown to someone else it refetches for them — worth
   deciding now whether caching is per-user or shared (would need the
   backend to own the cache, e.g. a small SQLite/KV store keyed by
   philosopher id).
5. **Fraunces is on Google Fonts and via `@fontsource/fraunces`** (used
   here) — confirmed working, no concern there.

## Still needed from you

The prototype file (`crucible.jsx`) didn't come through in this session —
checked the working directory, scratchpad, and the GitHub repo, all empty.
Please paste its contents (or re-attach) so the 47-philosopher roster,
`BG_FILES` list, and the actual prompt wording can be ported in rather than
reconstructed from the description alone.
