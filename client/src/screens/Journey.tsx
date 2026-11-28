import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { AiNote } from '../night/AiNote'
import { mindful } from '../night/support'
import { createPortal } from 'react-dom'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight } from '../night/icons'
import { NIGHT as C, NIGHT_FONT as F } from '../night/theme'
import { NightSky } from '../night/NightSky'
import { Thinking } from '../night/Thinking'
import { useAmbience } from '../night/useAmbience'
import { ALL_STOPS, CHAPTERS, EXPERIMENT_STOPS, isOpen } from '../data/journey'
import { EXPERIMENTS } from '../data/experiments'
import { PHILOSOPHER_TAGS, philosopherById } from '../data/philosophers'
import { loadExperiments, loadJourney, saveJourneyStop, type JourneyStop } from '../lib/storage'
import { usePreferencesContext } from '../context/PreferencesContext'
import * as api from '../lib/api'

/**
 * The Journey: a road through the history of philosophy, chapter by chapter.
 * At each stop you meet one thinker: they ask you something about your own
 * life and answer what you say, or invite you to play the thought
 * experiment they devised. Meeting them opens the next stop, and marks them
 * in the Hall of Minds.
 */
export function Journey() {
  useAmbience('landscape')
  const { id } = useParams()
  const navigate = useNavigate()
  const [met, setMet] = useState(() => loadJourney())
  const done = useMemo(() => new Set(Object.keys(met)), [met])

  // a stop whose thought experiment has been played counts as met
  useEffect(() => {
    const played = loadExperiments()
    let changed = false
    for (const [pid, s] of Object.entries(EXPERIMENT_STOPS)) {
      if (!met[pid] && played[s.experiment] && isOpen(pid, done)) {
        saveJourneyStop(pid, { experiment: s.experiment, at: Date.now() })
        changed = true
      }
    }
    if (changed) setMet(loadJourney())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const stop = id ? ALL_STOPS.find((s) => s.id === id) : undefined
  const [chapter, setChapter] = useState(() => {
    if (stop) return stop.chapter
    const firstOpen = ALL_STOPS.find((s) => !done.has(s.id))
    return firstOpen ? firstOpen.chapter : 0
  })

  return createPortal(
    <div className="fixed inset-0 z-[60] flex flex-col" style={{ background: C.night, color: C.ivory, fontFamily: F.ui }}>
      <NightSky />
      <header className="relative z-[1] flex items-center gap-3 border-b px-4 py-2" style={{ borderColor: C.line, background: 'rgba(11,13,17,.7)', paddingTop: 'max(8px, env(safe-area-inset-top))' }}>
        <button type="button" onClick={() => navigate(stop ? '/app/journey' : '/app')} className="night-btn flex h-11 w-11 items-center justify-center rounded-full" aria-label={stop ? 'Back to the road' : 'Back to the sanctuary'}>
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex flex-col">
          <h1 className="m-0" style={{ fontFamily: F.display, fontWeight: 400, fontSize: 19 }}>
            The Journey
          </h1>
          <span style={{ fontFamily: F.inscr, fontSize: 10, fontWeight: 600, letterSpacing: '.26em', color: C.gilt }}>
            {done.size} OF {ALL_STOPS.length} MET
          </span>
        </div>
      </header>
      <main className="relative z-[1] min-h-0 flex-1 overflow-y-auto">
        {stop ? (
          <Meeting
            key={stop.id}
            id={stop.id}
            open={isOpen(stop.id, done)}
            met={met[stop.id]}
            onMet={(s) => {
              saveJourneyStop(stop.id, s)
              setMet(loadJourney())
            }}
            onNext={() => {
              const i = ALL_STOPS.findIndex((s) => s.id === stop.id)
              const next = ALL_STOPS[i + 1]
              navigate(next ? `/app/journey/${next.id}` : '/app/journey')
            }}
          />
        ) : (
          <Road chapter={chapter} setChapter={setChapter} done={done} onOpen={(sid) => navigate(`/app/journey/${sid}`)} />
        )}
      </main>
    </div>,
    document.body,
  )
}

/* ---------------------------------- the road ---------------------------------- */

function Road({ chapter, setChapter, done, onOpen }: { chapter: number; setChapter: (n: number) => void; done: Set<string>; onOpen: (id: string) => void }) {
  const ch = CHAPTERS[chapter]
  const n = ch.stops.length
  const ROW = 118
  const H = n * ROW + 80
  // the road winds down the page, the stops on alternate sides of it
  const xAt = (i: number) => 50 + 26 * Math.sin(i * 1.25 + 0.4)
  const path = Array.from({ length: n * 8 + 1 }, (_, k) => {
    const t = k / 8
    return `${k === 0 ? 'M' : 'L'} ${xAt(t).toFixed(2)} ${(40 + t * ROW).toFixed(1)}`
  }).join(' ')

  return (
    <div className="night-enter mx-auto flex w-full max-w-[720px] flex-col gap-5 px-4 pb-14 pt-5">
      <nav aria-label="Chapters" className="flex gap-2 overflow-x-auto pb-1">
        {CHAPTERS.map((c) => {
          const on = c.index === chapter
          const count = c.stops.filter((s) => done.has(s.id)).length
          return (
            <button key={c.name} type="button" onClick={() => setChapter(c.index)} aria-current={on} className={`${on ? 'btn-gilt ' : 'btn-bronze '}night-btn min-h-[40px] shrink-0 rounded-full border px-3.5 text-sm`} style={on ? { background: C.gilt, borderColor: C.gilt, color: C.night, fontWeight: 600 } : { borderColor: C.line, color: C.body }}>
              {c.name}
              <span style={{ opacity: 0.7 }}> · {count}/{c.stops.length}</span>
            </button>
          )
        })}
      </nav>
      <div className="flex flex-col items-center gap-1 text-center">
        <span style={{ fontFamily: F.inscr, fontSize: 10.5, fontWeight: 600, letterSpacing: '.28em', color: C.gilt }}>CHAPTER {chapter + 1}</span>
        <h2 className="m-0" style={{ fontFamily: F.display, fontWeight: 400, fontSize: 'clamp(26px, 6vw, 34px)' }}>{ch.name}</h2>
        <span style={{ fontFamily: F.inscr, fontSize: 9.5, fontWeight: 600, letterSpacing: '.22em', color: C.muted }}>{ch.sub}</span>
      </div>

      <div className="relative w-full" style={{ height: H }}>
        <svg className="absolute inset-0 h-full w-full" viewBox={`0 0 100 ${H}`} preserveAspectRatio="none" aria-hidden="true">
          <path d={path} fill="none" stroke="#2a2620" strokeWidth="5.5" vectorEffect="non-scaling-stroke" strokeLinecap="round" style={{ strokeWidth: 18 }} />
          <path d={path} fill="none" stroke="#6b5f4b" strokeWidth="1" vectorEffect="non-scaling-stroke" strokeDasharray="2 9" />
        </svg>
        {ch.stops.map((s, i) => {
          const p = philosopherById(s.id)
          const isDone = done.has(s.id)
          const open = isOpen(s.id, done)
          const x = xAt(i)
          const left = x > 50
          return (
            <button
              key={s.id}
              type="button"
              disabled={!open && !isDone}
              onClick={() => onOpen(s.id)}
              className="night-btn absolute flex items-center gap-3 disabled:cursor-not-allowed"
              style={{ top: 40 + i * ROW - 28, left: `${x}%`, transform: left ? 'translateX(calc(-100% + 28px))' : 'translateX(-28px)', flexDirection: left ? 'row-reverse' : 'row', textAlign: left ? 'right' : 'left' }}
              aria-label={`${p?.name}${isDone ? ', met' : open ? ', waiting for you' : ', not yet reached'}`}
            >
              <Medallion state={isDone ? 'met' : open ? 'open' : 'locked'} letter={(p?.name ?? '?')[0]} />
              <span className="flex flex-col" style={{ opacity: isDone || open ? 1 : 0.45 }}>
                <span style={{ fontFamily: F.display, fontSize: 18, lineHeight: 1.1, color: isDone ? C.gold : C.ivory }}>{p?.name}</span>
                <span style={{ fontFamily: F.inscr, fontSize: 8.5, fontWeight: 600, letterSpacing: '.16em', color: C.gilt }}>{(PHILOSOPHER_TAGS[s.id] ?? '').toUpperCase()}</span>
                {open && !isDone && <span style={{ fontFamily: F.read, fontStyle: 'italic', fontSize: 13, color: C.body }}>{EXPERIMENT_STOPS[s.id] ? 'has a puzzle for you' : 'is waiting for you'}</span>}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function Medallion({ state, letter }: { state: 'met' | 'open' | 'locked'; letter: string }) {
  const ring = state === 'met' ? '#e3c27a' : state === 'open' ? '#c2a15e' : '#4a463e'
  return (
    <span className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full" style={{ background: 'radial-gradient(circle at 40% 35%, #23262d, #0e1014)', boxShadow: state === 'open' ? `0 0 0 2px ${ring}, 0 0 22px rgba(240,190,100,.45)` : `0 0 0 2px ${ring}` }}>
      {state === 'open' && <span className="absolute inset-0 animate-ping rounded-full" style={{ boxShadow: `0 0 0 2px ${ring}`, opacity: 0.35, animationDuration: '2.4s' }} />}
      <span style={{ fontFamily: "'Cinzel', Georgia, serif", fontWeight: 700, fontSize: 20, color: state === 'locked' ? '#5a554b' : '#ecd9a8' }}>{state === 'met' ? '✓' : letter}</span>
    </span>
  )
}

/* -------------------------------- the meeting -------------------------------- */

function Meeting({ id, open, met, onMet, onNext }: { id: string; open: boolean; met?: JourneyStop; onMet: (s: JourneyStop) => void; onNext: () => void }) {
  const navigate = useNavigate()
  const { preferences } = usePreferencesContext()
  const p = philosopherById(id)
  const exp = EXPERIMENT_STOPS[id]
  const expData = exp ? EXPERIMENTS.find((e) => e.id === exp.experiment) : undefined
  const [opening, setOpening] = useState<api.JourneyOpening | null>(null)
  const [answer, setAnswer] = useState('')
  const [reply, setReply] = useState<{ reply: string; takeaway: string } | null>(met?.reply ? { reply: met.reply, takeaway: met.takeaway ?? '' } : null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || exp || met?.reply) return
    setError(null)
    api
      .openJourneyStop(id, { language: preferences.language, depth: preferences.depth })
      .then(setOpening)
      .catch((e) => setError((e as Error)?.message || `${p?.name} could not be reached just now.`))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, open])

  async function send() {
    const q = opening?.question ?? met?.question
    if (!answer.trim() || !q || busy) return
    if (!(await mindful(answer))) return
    setBusy(true)
    setError(null)
    try {
      const r = await api.replyJourneyStop({ philosopherId: id, question: q, answer: answer.trim(), language: preferences.language, depth: preferences.depth }, (part) => {
        // the reply appears as it is written
        if (part.reply) setReply({ reply: part.reply, takeaway: part.takeaway ?? '' })
      })
      setReply(r)
      onMet({ question: q, answer: answer.trim(), reply: r.reply, takeaway: r.takeaway, at: Date.now() })
    } catch (e) {
      setReply(null)
      setError((e as Error)?.message || `${p?.name} could not answer just now.`)
    } finally {
      setBusy(false)
    }
  }

  if (!p) return null
  return (
    <div className="mx-auto flex w-full max-w-[640px] flex-col gap-5 px-5 pb-16 pt-7">
      <div className="night-enter flex flex-col items-center gap-1.5 text-center">
        <span style={{ fontFamily: F.inscr, fontSize: 10.5, fontWeight: 600, letterSpacing: '.28em', color: C.gilt }}>{CHAPTERS[ALL_STOPS.find((s) => s.id === id)!.chapter].name.toUpperCase()}</span>
        <h2 className="m-0" style={{ fontFamily: F.display, fontWeight: 400, fontSize: 'clamp(32px, 8vw, 44px)', lineHeight: 1.05 }}>{p.name}</h2>
        <span style={{ fontSize: 13, color: C.muted }}>{p.era}</span>
      </div>

      {!open && !met ? (
        <p className="panel-stone m-0 rounded p-5 text-center" style={{ fontFamily: F.read, fontSize: 16, color: C.body }}>
          The road has not reached {p.name} yet. Meet the thinkers before them in this chapter first.
        </p>
      ) : exp && expData ? (
        <>
          <Panel label={`${p.name.toUpperCase()} SAYS`}>
            <p className="m-0" style={{ fontFamily: F.read, fontSize: 18, lineHeight: 1.6, color: C.ivory }}>“{exp.invite}”</p>
          </Panel>
          {met ? (
            <p className="m-0 text-center" style={{ fontFamily: F.read, fontStyle: 'italic', color: C.gold }}>You have played {expData.title}. {p.name} has been met.</p>
          ) : null}
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <button type="button" onClick={() => navigate(`/app/experiments/${expData.id}`)} className={`${met ? 'btn-bronze' : 'btn-gilt'} night-btn min-h-[50px] rounded border`} style={met ? { borderColor: C.lineStrong, color: '#E9D5A6' } : { background: C.gilt, borderColor: C.gilt, color: C.night, fontWeight: 600 }}>
              {met ? 'Play it again' : `Play ${expData.title}`}
            </button>
            {met && (
              <button type="button" onClick={onNext} className="btn-gilt night-btn flex min-h-[50px] items-center justify-center gap-2 rounded" style={{ background: C.gilt, color: C.night, fontWeight: 600 }}>
                Continue the journey <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </>
      ) : (
        <>
          {!opening && !reply && !error && (
            <div className="flex justify-center py-4">
              <Thinking text={`Walking toward ${p.name}`} />
            </div>
          )}
          {opening && !met && (
            <>
              <p className="night-enter m-0 text-center" style={{ fontFamily: F.read, fontStyle: 'italic', fontSize: 16.5, lineHeight: 1.6, color: C.body }}>{opening.setting}</p>
              <Panel label={`${p.name.toUpperCase()} SAYS`}>
                <p className="m-0" style={{ fontFamily: F.read, fontSize: 17.5, lineHeight: 1.6, color: C.ivory }}>{opening.greeting}</p>
                <AiNote className="mt-3" />
              </Panel>
            </>
          )}
          {(opening?.question || met?.question) && (
            <p className="night-enter m-0 text-center" style={{ fontFamily: F.display, fontSize: 'clamp(22px, 5vw, 27px)', lineHeight: 1.22, textWrap: 'balance' }}>
              {opening?.question ?? met?.question}
            </p>
          )}
          {met?.answer && (
            <div className="flex items-baseline gap-3 px-1">
              <span style={{ fontFamily: F.inscr, fontSize: 9.5, fontWeight: 600, letterSpacing: '.22em', color: C.muted }}>YOU SAID</span>
              <span style={{ fontFamily: F.read, fontStyle: 'italic', color: C.gold }}>{met.answer}</span>
            </div>
          )}
          {opening && !reply && (
            <div className="night-enter flex flex-col gap-2.5">
              <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') send()
                }}
                rows={3}
                aria-label={`Your answer to ${p.name}`}
                placeholder="Answer honestly, in your own words."
                className="panel-stone w-full resize-none rounded p-3.5 outline-none"
                style={{ border: `1px solid ${C.lineStrong}`, color: C.ivory, fontFamily: F.read, fontSize: 16, lineHeight: 1.5 }}
              />
              <button type="button" onClick={send} disabled={!answer.trim() || busy} className="btn-gilt night-btn min-h-[50px] rounded disabled:opacity-40" style={{ background: C.gilt, color: C.night, fontWeight: 600, fontSize: 16 }}>
                Answer {p.name}
              </button>
              {busy && (
                <div className="flex justify-center">
                  <Thinking text={`${p.name} is considering what you said`} />
                </div>
              )}
            </div>
          )}
          {error && <p className="m-0 text-center" style={{ fontFamily: F.read, color: C.ember }}>{error}</p>}
          {reply && (
            <>
              <Panel label={p.name.toUpperCase()}>
                <p className={`m-0 ${busy && !reply.takeaway ? 'live-text' : ''}`} style={{ fontFamily: F.read, fontSize: 17, lineHeight: 1.6, color: C.ivory }}>{reply.reply}</p>
              </Panel>
              {reply.takeaway && (
                <div className="night-enter flex flex-col items-center gap-1.5 py-1 text-center">
                  <span style={{ fontFamily: F.inscr, fontSize: 10.5, fontWeight: 600, letterSpacing: '.24em', color: C.gilt }}>TO CARRY ON WITH YOU</span>
                  <p className="m-0" style={{ fontFamily: F.display, fontSize: 21, lineHeight: 1.25, color: C.gold, textWrap: 'balance' }}>{reply.takeaway}</p>
                </div>
              )}
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <button type="button" onClick={() => navigate('/app/symposium', { state: { withIds: [id], only: true } })} className="btn-bronze night-btn min-h-[50px] rounded border" style={{ borderColor: C.lineStrong, color: '#E9D5A6' }}>
                  Talk more with {p.name}
                </button>
                <button type="button" onClick={onNext} className="btn-gilt night-btn flex min-h-[50px] items-center justify-center gap-2 rounded" style={{ background: C.gilt, color: C.night, fontWeight: 600 }}>
                  Continue the journey <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}

function Panel({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="panel-stone night-enter rounded p-5" style={{ border: `1px solid ${C.line}` }}>
      <div className="greek-key mb-3" aria-hidden="true" />
      <span style={{ fontFamily: F.inscr, fontSize: 10.5, fontWeight: 600, letterSpacing: '.24em', color: C.gilt }}>{label}</span>
      <div className="mt-2">{children}</div>
    </section>
  )
}
