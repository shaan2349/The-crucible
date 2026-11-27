import { Suspense, lazy, useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Mic } from 'lucide-react'
import * as api from '../lib/api'
import { loadOracleDays, saveOracleDays, type OracleDay } from '../lib/storage'
import { philosopherById } from '../data/philosophers'
import { usePreferencesContext } from '../context/PreferencesContext'
import { useSpeechToText } from '../hooks/useSpeechToText'
import { NIGHT as C, NIGHT_FONT as F } from '../night/theme'
import { Thinking } from '../night/Thinking'
import type { OracleMood } from '../oracle/OracleScene'

// The 3D ledge and fire load with the Oracle; the drawn flame shows if 3D is unavailable.
const Oracle3D = lazy(() => import('../oracle/Oracle3D'))

/**
 * The Oracle: one question a day, for when you are simply curious. A bronze
 * tripod burns on a ledge among the ruins of an old shrine (3D, src/oracle),
 * and its fire answers what happens on the page. Answer in a sentence or two; the Oracle answers back with what
 * your answer rests on and how two thinkers would see it. No scores.
 */

function today(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function prettyDate(iso: string) {
  try {
    return new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })
  } catch {
    return iso
  }
}

export function Oracle() {
  const navigate = useNavigate()
  const { preferences } = usePreferencesContext()
  const stt = useSpeechToText()
  const [days, setDays] = useState<OracleDay[]>(() => loadOracleDays())
  const [answer, setAnswer] = useState('')
  const [loading, setLoading] = useState(false)
  const [thinking, setThinking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const asked = useRef(false)
  const [scroll, setScroll] = useState(0)
  const [no3d, setNo3d] = useState(false)
  const date = today()
  const day = days.find((d) => d.date === date)
  const earlier = days.filter((d) => d.date !== date && d.answer).slice().reverse()

  function store(next: OracleDay[]) {
    setDays(next)
    saveOracleDays(next)
  }

  // Today's question is asked once and kept for the whole day.
  useEffect(() => {
    if (day || asked.current) return
    asked.current = true
    setLoading(true)
    api
      .fetchOracleQuestion(days.map((d) => d.question))
      .then((q) => store([...loadOracleDays().filter((d) => d.date !== date), { date, question: q.question, context: q.context }]))
      .catch((e) => setError((e as Error)?.message || 'The Oracle is silent for now.'))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function offer() {
    const text = answer.trim()
    if (!text || !day || thinking) return
    if (stt.listening) stt.stop()
    setThinking(true)
    setError(null)
    try {
      const r = await api.answerOracle(day.question, text, { language: preferences.language, depth: preferences.depth })
      store(days.map((d) => (d.date === date ? { ...d, answer: text, reply: r.reply, perspectives: r.perspectives, followUp: r.followUp } : d)))
      setAnswer('')
    } catch (e) {
      setError((e as Error)?.message || 'The Oracle could not answer just now.')
    } finally {
      setThinking(false)
    }
  }

  function retryQuestion() {
    asked.current = false
    setError(null)
    setLoading(true)
    api
      .fetchOracleQuestion(days.map((d) => d.question))
      .then((q) => store([...loadOracleDays().filter((d) => d.date !== date), { date, question: q.question, context: q.context }]))
      .catch((e) => setError((e as Error)?.message || 'The Oracle is silent for now.'))
      .finally(() => setLoading(false))
  }

  const mood: OracleMood = thinking ? 'thinking' : day?.reply ? 'answered' : day ? 'waiting' : 'gathering'

  return createPortal(
    <div className="fixed inset-0 z-[60] flex flex-col" style={{ background: C.night, color: C.ivory, fontFamily: F.ui }}>
      {!no3d && (
        <div className="pointer-events-none absolute inset-0">
          <Suspense fallback={null}>
            <Oracle3D mood={mood} scroll={scroll} onFail={() => setNo3d(true)} />
          </Suspense>
        </div>
      )}
      <style>{`
        .or-btn:focus-visible, .or-wrap textarea:focus-visible { outline: 2px solid ${C.gold}; outline-offset: 2px; }
        .or-enter { animation: orEnter 1.1s cubic-bezier(.16,1,.3,1) both; }
        @keyframes orEnter { from { opacity: 0; transform: translateY(14px); filter: blur(6px); } to { opacity: 1; transform: none; filter: blur(0); } }
        .or-rise { animation: orRise 2.4s cubic-bezier(.16,1,.3,1) both; }
        @keyframes orRise { from { opacity: 0; transform: translateY(30px) scale(.97); filter: blur(10px); letter-spacing: .04em; } to { opacity: 1; transform: none; filter: blur(0); letter-spacing: 0; } }
        @keyframes orFlame { 0%,100% { transform: scale(1,1) } 50% { transform: scale(.88,1.18) } }
        @keyframes orSmoke { 0% { opacity: 0; transform: translate(0,0) scale(.6) } 25% { opacity: .35 } 100% { opacity: 0; transform: translate(var(--sx), -150px) scale(1.8) } }
        @keyframes orGlow { 0%,100% { opacity: .75 } 50% { opacity: 1 } }
        @keyframes orTwinkle { 0%,100% { opacity: .25 } 50% { opacity: .9 } }
        .or-flame { transform-box: fill-box; transform-origin: 50% 100%; animation: orFlame .85s ease-in-out infinite; }
        .or-smoke { animation: orSmoke 6s ease-out infinite; transform-box: fill-box; transform-origin: center; }
        .or-glow { animation: orGlow 3s ease-in-out infinite; }
        .or-star { animation: orTwinkle 3.6s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) { .or-enter, .or-rise, .or-flame, .or-smoke, .or-glow, .or-star { animation: none; } }
      `}</style>

      <header className="relative z-[1] flex items-center gap-3 border-b px-4 py-2" style={{ borderColor: C.line, background: 'rgba(11,13,17,.72)', backdropFilter: 'blur(6px)', paddingTop: 'max(8px, env(safe-area-inset-top))' }}>
        <button type="button" onClick={() => navigate('/app')} className="or-btn flex h-11 w-11 items-center justify-center rounded-full" aria-label="Back to the sanctuary">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex flex-col">
          <span style={{ fontFamily: F.display, fontSize: 19 }}>The Oracle</span>
          <span style={{ fontFamily: F.inscr, fontSize: 10, fontWeight: 600, letterSpacing: '.26em', color: C.gilt }}>{prettyDate(date).toUpperCase()}</span>
        </div>
      </header>

      <main className="or-wrap relative z-[1] min-h-0 flex-1 overflow-y-auto" onScroll={(e) => setScroll(e.currentTarget.scrollTop / Math.max(1, e.currentTarget.clientHeight))}>
        {/* the fire shows through the top of the page; the words sit on a dark wash below it */}
        {no3d ? (
          <div className="mx-auto flex max-w-[620px] justify-center px-5">
            <OracleFlame />
          </div>
        ) : (
          <div style={{ height: 'min(46svh, 420px)' }} aria-hidden="true" />
        )}
        <div className="relative mx-auto flex max-w-[620px] flex-col items-center px-5 pb-10" style={no3d ? undefined : { paddingTop: 8 }}>
          {!no3d && (
            <div
              className="pointer-events-none absolute inset-x-[-50vw] -top-28 bottom-0 -z-[1]"
              style={{ background: 'linear-gradient(180deg, rgba(11,13,17,0) 0%, rgba(11,13,17,.6) 110px, rgba(11,13,17,.8) 280px)' }}
              aria-hidden="true"
            />
          )}

          {loading && (
            <div className="or-enter -mt-2 flex justify-center">
              <Thinking text="The smoke is gathering into a question" />
            </div>
          )}

          {day && (
            <div className={`${no3d ? '-mt-4' : ''} flex w-full flex-col items-center gap-3 text-center`}>
              <span className="or-enter" style={{ fontFamily: F.inscr, fontSize: 10.5, fontWeight: 600, letterSpacing: '.28em', color: C.gilt }}>
                TODAY’S QUESTION
              </span>
              <h1 className="or-rise m-0" style={{ fontFamily: F.display, fontWeight: 400, fontSize: 'clamp(26px, 7vw, 38px)', lineHeight: 1.12, textWrap: 'balance' }}>
                {day.question}
              </h1>
              <p className="or-enter" style={{ fontFamily: F.read, fontStyle: 'italic', fontSize: 16, lineHeight: 1.55, color: C.body, animationDelay: '1.2s', maxWidth: '52ch' }}>
                {day.context}
              </p>
            </div>
          )}

          {error && (
            <div className="mt-6 flex w-full flex-col items-center gap-3 text-center">
              <p style={{ fontFamily: F.read, color: C.ember }}>{error}</p>
              {!day && (
                <button type="button" onClick={retryQuestion} className="btn-bronze or-btn min-h-[46px] rounded border px-5" style={{ borderColor: C.lineStrong, color: '#E9D5A6' }}>
                  Ask again
                </button>
              )}
            </div>
          )}

          {day && !day.answer && (
            <div className="or-enter mt-8 flex w-full flex-col gap-2.5" style={{ animationDelay: '1.8s' }}>
              <label htmlFor="oracle-answer" style={{ fontFamily: F.inscr, fontSize: 10.5, fontWeight: 600, letterSpacing: '.24em', color: C.gilt }}>
                YOUR ANSWER
              </label>
              <div className="relative">
                <textarea
                  id="oracle-answer"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  onKeyDown={(e) => {
                    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') offer()
                  }}
                  rows={3}
                  placeholder="A sentence or two. There is no wrong answer, only an unexamined one."
                  className="panel-stone w-full resize-none rounded p-3.5 pr-12 outline-none"
                  style={{ background: C.raised, border: `1px solid ${C.lineStrong}`, color: C.ivory, fontFamily: F.read, fontSize: 16, lineHeight: 1.55 }}
                />
                {stt.supported && (
                  <button
                    type="button"
                    onClick={() => (stt.listening ? stt.stop() : stt.start((t) => setAnswer((p) => (p.trim() ? `${p.trim()} ${t}` : t))))}
                    aria-label={stt.listening ? 'Stop dictating' : 'Dictate your answer'}
                    className="or-btn absolute bottom-2 right-2 flex h-11 w-11 items-center justify-center rounded-full"
                    style={stt.listening ? { background: C.ember, color: C.night } : { color: C.muted }}
                  >
                    <Mic className="h-4 w-4" />
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={offer}
                disabled={!answer.trim() || thinking}
                className="btn-gilt or-btn min-h-[50px] rounded transition-colors disabled:opacity-40"
                style={{ background: C.gilt, color: C.night, fontWeight: 600, fontSize: 16 }}
              >
                {thinking ? 'The Oracle is considering…' : 'Offer your answer'}
              </button>
              {thinking && (
                <div className="flex justify-center pt-1">
                  <Thinking text="The fire is reading your answer" />
                </div>
              )}
            </div>
          )}

          {day?.answer && day.reply && (
            <div className="mt-8 flex w-full flex-col gap-3">
              <Card label="YOU ANSWERED" color={C.gilt} delay={0}>
                <p style={{ fontFamily: F.read, fontSize: 15.5, lineHeight: 1.6, color: C.body }}>{day.answer}</p>
              </Card>
              <Card label="THE ORACLE" color={C.gold} delay={0.2}>
                <p style={{ fontFamily: F.display, fontSize: 19, lineHeight: 1.4 }}>{day.reply}</p>
              </Card>
              {(day.perspectives ?? []).map((p, i) => {
                const ph = philosopherById(p.philosopherId)
                return (
                  <Card key={p.philosopherId} label={`${(ph?.name ?? p.philosopherId).toUpperCase()} WOULD SAY`} color={i === 0 ? C.ember : C.iris} delay={0.4 + i * 0.15}>
                    <p style={{ fontFamily: F.read, fontSize: 15.5, lineHeight: 1.6, color: C.ivory }}>{p.view}</p>
                  </Card>
                )
              })}
              {day.followUp && (
                <div className="or-enter mt-2 flex flex-col items-center gap-3 text-center" style={{ animationDelay: '.8s' }}>
                  <span style={{ fontFamily: F.inscr, fontSize: 10.5, fontWeight: 600, letterSpacing: '.24em', color: C.gilt }}>TO CARRY WITH YOU</span>
                  <p style={{ fontFamily: F.display, fontSize: 21, lineHeight: 1.25, textWrap: 'balance' }}>{day.followUp}</p>
                  <div className="flex w-full gap-2.5">
                    <button
                      type="button"
                      onClick={() => navigate('/app/symposium', { state: { prefill: `${day.question} I said: ${day.answer}` } })}
                      className="btn-bronze or-btn min-h-[50px] flex-1 rounded border"
                      style={{ borderColor: C.lineStrong, color: '#E9D5A6', fontWeight: 500 }}
                    >
                      Talk it over at the Symposium
                    </button>
                    <button type="button" onClick={() => navigate('/app')} className="btn-gilt or-btn min-h-[50px] flex-1 rounded" style={{ background: C.gilt, color: C.night, fontWeight: 600 }}>
                      Back to the sanctuary
                    </button>
                  </div>
                  <p style={{ fontFamily: F.read, fontStyle: 'italic', fontSize: 14, color: C.muted }}>A new question appears tomorrow.</p>
                </div>
              )}
            </div>
          )}

          {earlier.length > 0 && (
            <section className="mt-12 w-full" aria-labelledby="oracle-earlier">
              <h2 id="oracle-earlier" className="mb-3 text-center" style={{ fontFamily: F.inscr, fontSize: 10.5, fontWeight: 600, letterSpacing: '.24em', color: C.gilt }}>
                EARLIER QUESTIONS
              </h2>
              <ul className="m-0 flex list-none flex-col gap-2 p-0">
                {earlier.map((d) => (
                  <li key={d.date} className="panel-stone rounded p-3.5" style={{ background: C.raised }}>
                    <span style={{ fontFamily: F.inscr, fontSize: 9.5, fontWeight: 600, letterSpacing: '.18em', color: C.muted }}>{prettyDate(d.date).toUpperCase()}</span>
                    <p className="mt-1" style={{ fontFamily: F.display, fontSize: 17, lineHeight: 1.3 }}>
                      {d.question}
                    </p>
                    <p className="mt-1" style={{ fontFamily: F.read, fontSize: 14.5, lineHeight: 1.55, color: C.body }}>
                      You said: {d.answer}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </main>
    </div>,
    document.body,
  )
}

function Card({ label, color, delay, children }: { label: string; color: string; delay: number; children: ReactNode }) {
  return (
    <article className="panel-stone or-enter flex flex-col gap-1.5 rounded p-4" style={{ background: C.raised, borderLeft: `2px solid ${color}`, animationDelay: `${delay}s` }}>
      <span style={{ fontFamily: F.inscr, fontSize: 10.5, fontWeight: 600, letterSpacing: '.22em', color }}>{label}</span>
      {children}
    </article>
  )
}

/** The Oracle's rock, tripod and flame, with smoke rising into the stars. */
function OracleFlame() {
  const stars = Array.from({ length: 40 }, (_, i) => {
    const r = (n: number) => {
      const x = Math.sin(i * 12.9898 + n * 78.233) * 43758.5453
      return x - Math.floor(x)
    }
    return { x: r(1) * 360, y: r(2) * 150, s: 0.5 + r(3), d: r(4) * 4 }
  })
  return (
    <svg viewBox="0 0 360 300" width="100%" style={{ maxWidth: 420 }} aria-hidden="true">
      <defs>
        <radialGradient id="orWarm">
          <stop offset="0" stopColor="#FFC27A" stopOpacity=".85" />
          <stop offset=".4" stopColor="#F09A50" stopOpacity=".3" />
          <stop offset="1" stopColor="#F09A50" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="orSmokeG">
          <stop offset="0" stopColor="#C8D2E8" stopOpacity=".5" />
          <stop offset="1" stopColor="#C8D2E8" stopOpacity="0" />
        </radialGradient>
      </defs>
      {stars.map((s, i) => (
        <circle key={i} className="or-star" cx={s.x} cy={s.y} r={s.s} fill="#EDE6D6" style={{ animationDelay: `-${s.d}s` }} />
      ))}
      <circle className="or-glow" cx="180" cy="196" r="110" fill="url(#orWarm)" />
      {[0, 1, 2, 3].map((i) => (
        <circle key={i} className="or-smoke" cx="180" cy="160" r="16" fill="url(#orSmokeG)" style={{ animationDelay: `${i * 1.5}s`, ['--sx' as string]: `${(i % 2 ? 1 : -1) * (10 + i * 6)}px` }} />
      ))}
      {/* rock */}
      <path d="M96 292 C 110 250, 150 236, 180 236 C 214 236, 252 250, 266 292 Z" fill="#141924" />
      <path d="M96 292 C 110 250, 150 236, 180 236 C 214 236, 252 250, 266 292" fill="none" stroke="#232a37" strokeWidth="2" />
      {/* tripod and bowl */}
      <path d="M160 236 L180 196 L200 236 M180 196 L180 236" stroke="#8a6a3c" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M158 196 Q180 214 202 196 Z" fill="#8a6a3c" />
      <ellipse cx="180" cy="196" rx="22" ry="4" fill="#a07a44" />
      {/* flame */}
      <path className="or-flame" d="M180 194 C 166 180, 172 158, 180 140 C 188 158, 194 180, 180 194 Z" fill="#FFB066" />
      <path className="or-flame" d="M180 192 C 173 182, 176 170, 180 160 C 184 170, 187 182, 180 192 Z" fill="#FFF0C8" style={{ animationDelay: '-.3s' }} />
    </svg>
  )
}
