# Deploying The Crucible (no terminal needed)

This deploys two separate services on Render's free tier, entirely through
their website: a **Web Service** for the backend (holds your Claude API key)
and a **Static Site** for the frontend. You paste your API key into Render's
dashboard, never into a terminal or a file.

Takes about 10 minutes. You'll need a GitHub account signed into
`shaan2349/the-crucible` (to authorize Render) and your Anthropic API key.

## Step A — deploy the backend

1. Go to [render.com](https://render.com) and sign in with GitHub.
2. **New +** → **Web Service**.
3. Connect the `shaan2349/the-crucible` repository (Render will ask to
   install/authorize its GitHub app the first time — approve it).
4. Fill in:
   - **Name**: `crucible-server` (or anything)
   - **Branch**: `claude/crucible-debate-app-d0vz15` (or `main`, once this is merged)
   - **Root Directory**: `server`
   - **Runtime**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Instance Type**: Free
5. Under **Environment Variables**, add:
   - `ANTHROPIC_API_KEY` → your real key (starts `sk-ant-...`)
   - `CLAUDE_MODEL` → `claude-sonnet-4-5` (optional — this is already the default)
   - `CLIENT_ORIGIN` → leave blank for now, you'll fill this in at the end of Step C
6. Click **Create Web Service**. Wait for the first deploy to finish (a few
   minutes), then copy its URL from the top of the page — it looks like
   `https://crucible-server-xxxx.onrender.com`. You'll need it in Step B.
7. Optional: in **Settings → Health Check Path**, set `/api/health`.

## Step B — deploy the frontend

1. **New +** → **Static Site**, same repository.
2. Fill in:
   - **Name**: `crucible-client` (or anything)
   - **Branch**: same one you used in Step A
   - **Root Directory**: `client`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
3. Under **Environment Variables**, add:
   - `VITE_API_BASE_URL` → the backend URL you copied in Step A (no
     trailing slash), e.g. `https://crucible-server-xxxx.onrender.com`
4. Click **Create Static Site**. When it finishes, its URL — something like
   `https://crucible-client-xxxx.onrender.com` — is the live app.

## Step C — connect them

The backend only accepts requests from a known origin (CORS), so it needs to
know the frontend's URL:

1. Go back to the **crucible-server** service → **Environment**.
2. Set `CLIENT_ORIGIN` to the frontend URL from Step B (no trailing slash).
3. Save — Render redeploys the backend automatically with the correct setting.

Open the frontend URL from Step B in a browser. That's the live app.

## Notes

- **Free-tier cold starts**: the backend spins down after 15 minutes of no
  traffic and takes 30–50 seconds to wake back up on the next request — so
  the first "Enter the Crucible" after a lull will sit on the loading spinner
  longer than usual. This is normal Render free-tier behavior, not a bug.
  The static frontend has no such delay.
- **Rate limiting**: the backend limits each IP to 20 requests/minute
  (`server/src/index.ts`) so a public URL can't silently burn through your
  API spend. Loosen or tighten it there if needed.
- **Redeploying after code changes**: push to the branch each service is
  tracking and Render redeploys both automatically — no manual step.
- If you'd rather use Vercel or another host: the client is a standard Vite
  static build (`npm run build` → `dist/`) and will work anywhere that
  serves static files with SPA fallback routing. The server is a standard
  Express app; Vercel specifically would need it adapted into serverless
  functions (its request model doesn't run a persistent Node process the
  way Render/Railway/Fly do), which is more surgery than this doc covers.
