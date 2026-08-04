import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { rateLimit } from 'express-rate-limit'
import { premisesRouter } from './routes/premises.js'

const app = express()
const port = process.env.PORT ?? 8787

app.use(cors({ origin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173' }))
app.use(express.json({ limit: '32kb' }))

// The Claude API key lives only in this process's env. Every route below
// spends it on the server's behalf, so this proxy needs its own limiter —
// without one, anyone who finds the endpoint can burn the key on your bill.
app.use(
  '/api',
  rateLimit({
    windowMs: 60 * 1000,
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false,
  }),
)

app.use('/api/claude/premises', premisesRouter)

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

app.listen(port, () => {
  console.log(`Crucible server listening on :${port}`)
})
