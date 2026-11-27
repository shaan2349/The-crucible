import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { rateLimit } from 'express-rate-limit'
import { debateRouter } from './routes/debate.js'
import { reflectRouter } from './routes/reflect.js'
import { libraryRouter } from './routes/library.js'
import { trainRouter } from './routes/train.js'
import { oracleRouter } from './routes/oracle.js'
import { experimentsRouter } from './routes/experiments.js'
import { journeyRouter } from './routes/journey.js'

const app = express()
const port = process.env.PORT ?? 8787
// Behind Render's proxy: trust its X-Forwarded-For so limits apply per
// visitor, not to the proxy itself.
app.set('trust proxy', 1)

// Websites allowed to call this server. CLIENT_ORIGIN (comma-separated) adds
// more; the live site and local development are always allowed.
const allowedOrigins = [
  'https://crucible-e53r.onrender.com',
  'http://localhost:5173',
  'http://localhost:4173',
  ...(process.env.CLIENT_ORIGIN ?? '').split(',').map((o) => o.trim()).filter(Boolean),
]
app.use(cors({ origin: allowedOrigins }))
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

// A daily allowance per visitor for the things that start real AI work:
// a new debate, a new symposium, an Oracle answer. Without accounts this
// is per IP address and resets when the server restarts; it is a floor
// that keeps one visitor from spending the whole monthly budget.
const DAILY_LIMIT = Number(process.env.DAILY_SESSION_LIMIT ?? 12)
const usage = new Map<string, { day: string; count: number }>()
const STARTS = new Set(['/api/claude/debate/select-opponents', '/api/claude/reflect/begin', '/api/claude/oracle/answer', '/api/claude/experiments/react', '/api/claude/journey/reply'])
app.use((req, res, next) => {
  if (req.method !== 'POST' || !STARTS.has(req.path) || !(DAILY_LIMIT > 0)) return next()
  const day = new Date().toISOString().slice(0, 10)
  const key = req.ip ?? 'unknown'
  const u = usage.get(key)
  const count = u && u.day === day ? u.count : 0
  if (count >= DAILY_LIMIT) {
    res.status(429).json({ error: `You have reached today's limit of ${DAILY_LIMIT} conversations. The sanctuary reopens tomorrow.` })
    return
  }
  usage.set(key, { day, count: count + 1 })
  if (usage.size > 50_000) usage.clear()
  // A start that failed on our side shouldn't use up the visitor's allowance.
  res.on('finish', () => {
    if (res.statusCode < 500) return
    const now = usage.get(key)
    if (now && now.day === day && now.count > 0) usage.set(key, { day, count: now.count - 1 })
  })
  next()
})

app.use('/api/claude/debate', debateRouter)
app.use('/api/claude/reflect', reflectRouter)
app.use('/api/claude/library', libraryRouter)
app.use('/api/claude/train', trainRouter)
app.use('/api/claude/oracle', oracleRouter)
app.use('/api/claude/experiments', experimentsRouter)
app.use('/api/claude/journey', journeyRouter)

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

app.listen(port, () => {
  console.log(`Crucible server listening on :${port}`)
})
