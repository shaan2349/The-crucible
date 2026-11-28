import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { AiNote } from '../night/AiNote'
import { mindful } from '../night/support'
import { createPortal } from 'react-dom'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight } from '../night/icons'
import { NIGHT as C, NIGHT_FONT as F } from '../night/theme'
import { NightSky } from '../night/NightSky'
import { Thinking } from '../night/Thinking'
import { useAmbience } from '../night/useAmbience'
import { DOMAIN_COLOURS, EXPERIMENTS, experimentOfTheDay, type Choice, type Experiment } from '../data/experiments'
import { philosopherById } from '../data/philosophers'
import { loadExperiments, saveExperiment, type ExperimentResult } from '../lib/storage'
import { usePreferencesContext } from '../context/PreferencesContext'
import * as api from '../lib/api'

/**
 * Thought Experiments: the great puzzles of philosophy, played rather than
 * read. A scene and a choice, a twist that tests it, a second choice, then
 * two philosophers respond to what you chose and the famous thinkers' own
 * answers are revealed. One is highlighted each day.
 */

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX', 'XXI', 'XXII', 'XXIII', 'XXIV', 'XXV']

export function Experiments() {
  useAmbience('landscape')
  const { id } = useParams()
  const navigate = useNavigate()
  const [results, setResults] = useState(() => loadExperiments())
  const exp = id ? EXPERIMENTS.find((e) => e.id === id) : undefined
  const played = Object.keys(results).length

  return createPortal(
    <div className="fixed inset-0 z-[60] flex flex-col" style={{ background: C.night, color: C.ivory, fontFamily: F.ui }}>
      <NightSky />
      <header className="relative z-[1] flex items-center gap-3 border-b px-4 py-2" style={{ borderColor: C.line, background: 'rgba(11,13,17,.7)', paddingTop: 'max(8px, env(safe-area-inset-top))' }}>
        <button type="button" onClick={() => navigate(exp ? '/app/experiments' : '/app')} className="night-btn flex h-11 w-11 items-center justify-center rounded-full" aria-label={exp ? 'Back to all thought experiments' : 'Back to the sanctuary'}>
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex flex-col">
          <h1 className="m-0" style={{ fontFamily: F.display, fontWeight: 400, fontSize: 19 }}>
            Thought Experiments
          </h1>
          <span style={{ fontFamily: F.inscr, fontSize: 10, fontWeight: 600, letterSpacing: '.26em', color: C.gilt }}>
            {exp ? exp.title.toUpperCase() : `${played} OF ${EXPERIMENTS.length} PLAYED`}
          </span>
        </div>
      </header>
      <main className="relative z-[1] min-h-0 flex-1 overflow-y-auto">
        {exp ? (
          <Play
            key={exp.id}
            exp={exp}
            onDone={(r) => {
              saveExperiment(exp.id, r)
              setResults(loadExperiments())
            }}
            onNext={() => {
              const next = EXPERIMENTS.find((e) => !results[e.id] && e.id !== exp.id) ?? EXPERIMENTS[(EXPERIMENTS.indexOf(exp) + 1) % EXPERIMENTS.length]
              navigate(`/app/experiments/${next.id}`)
            }}
          />
        ) : (
          <Library results={results} onOpen={(e) => navigate(`/app/experiments/${e.id}`)} />
        )}
      </main>
    </div>,
    document.body,
  )
}

/* -------------------------------- the library -------------------------------- */

function Library({ results, onOpen }: { results: Record<string, ExperimentResult>; onOpen: (e: Experiment) => void }) {
  const today = experimentOfTheDay()
  const [domain, setDomain] = useState<Experiment['domain'] | 'All'>('All')
  const domains = useMemo(() => ['All', ...Array.from(new Set(EXPERIMENTS.map((e) => e.domain)))] as const, [])
  const shown = EXPERIMENTS.filter((e) => domain === 'All' || e.domain === domain)

  return (
    <div className="night-enter mx-auto flex w-full max-w-[980px] flex-col gap-6 px-5 pb-14 pt-6">
      <button type="button" onClick={() => onOpen(today)} className="panel-stone night-btn flex flex-col gap-3 rounded p-5 text-left sm:flex-row sm:items-center sm:gap-6" style={{ border: `1px solid ${C.lineStrong}` }}>
        <Emblem n={EXPERIMENTS.indexOf(today)} colour={DOMAIN_COLOURS[today.domain]} size={86} />
        <span className="flex min-w-0 flex-1 flex-col gap-1.5">
          <span style={{ fontFamily: F.inscr, fontSize: 10.5, fontWeight: 600, letterSpacing: '.28em', color: C.gold }}>TODAY’S DILEMMA</span>
          <span style={{ fontFamily: F.display, fontSize: 'clamp(26px, 5vw, 34px)', lineHeight: 1.1 }}>{today.title}</span>
          <span style={{ fontFamily: F.read, fontSize: 16, lineHeight: 1.5, color: C.body }}>{today.teaser}</span>
          <span style={{ fontSize: 13, color: C.muted }}>{today.origin}</span>
        </span>
        <span className="btn-gilt flex min-h-[46px] shrink-0 items-center justify-center gap-2 rounded px-5" style={{ background: C.gilt, color: C.night, fontWeight: 600 }}>
          {results[today.id] ? 'Play again' : 'Play'} <ArrowRight className="h-4 w-4" />
        </span>
      </button>

      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Filter by subject">
        {domains.map((d) => {
          const on = domain === d
          return (
            <button key={d} type="button" role="radio" aria-checked={on} onClick={() => setDomain(d)} className={`${on ? 'btn-gilt ' : 'btn-bronze '}night-btn min-h-[38px] rounded-full border px-3.5 text-sm`} style={on ? { background: C.gilt, borderColor: C.gilt, color: C.night, fontWeight: 600 } : { borderColor: C.line, color: C.body }}>
              {d}
            </button>
          )
        })}
      </div>

      <ul className="m-0 grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((e) => {
          const n = EXPERIMENTS.indexOf(e)
          const done = !!results[e.id]
          return (
            <li key={e.id}>
              <button type="button" onClick={() => onOpen(e)} className="panel-stone night-btn flex h-full w-full items-start gap-3.5 rounded p-4 text-left" style={{ border: `1px solid ${C.line}` }}>
                <Emblem n={n} colour={DOMAIN_COLOURS[e.domain]} size={54} dim={!done} />
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="flex items-center gap-2">
                    <span style={{ fontFamily: F.inscr, fontSize: 9.5, fontWeight: 600, letterSpacing: '.2em', color: DOMAIN_COLOURS[e.domain] }}>{e.domain.toUpperCase()}</span>
                    {done && <span style={{ fontFamily: F.inscr, fontSize: 9.5, fontWeight: 600, letterSpacing: '.2em', color: C.gold }}>· PLAYED</span>}
                  </span>
                  <span style={{ fontFamily: F.display, fontSize: 19, lineHeight: 1.15 }}>{e.title}</span>
                  <span style={{ fontFamily: F.read, fontSize: 14, lineHeight: 1.45, color: C.body }}>{e.teaser}</span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/** A bronze medallion with a Greek-key ring and the experiment's numeral. */
function Emblem({ n, colour, size, dim }: { n: number; colour: string; size: number; dim?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" className="shrink-0" style={{ opacity: dim ? 0.78 : 1 }}>
      <defs>
        <radialGradient id={`em-${n}`} cx="40%" cy="35%" r="70%">
          <stop offset="0" stopColor="#e9cf8e" />
          <stop offset=".6" stopColor="#a8823f" />
          <stop offset="1" stopColor="#5f4521" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="47" fill={`url(#em-${n})`} />
      <circle cx="50" cy="50" r="41" fill="#14171d" />
      <circle cx="50" cy="50" r="38" fill="none" stroke={colour} strokeOpacity=".55" strokeWidth="1.2" strokeDasharray="5 3 1 3" />
      <circle cx="50" cy="50" r="31" fill="none" stroke="#c9a85e" strokeOpacity=".5" strokeWidth=".8" />
      <text x="50" y="58" textAnchor="middle" fill="#ecd9a8" style={{ fontFamily: "'Cinzel', Georgia, serif", fontWeight: 700, fontSize: (ROMAN[n] ?? '').length > 3 ? 17 : 22 }}>
        {ROMAN[n] ?? n + 1}
      </text>
    </svg>
  )
}

/* ---------------------------------- playing ---------------------------------- */

type Stage = 'setup' | 'twist' | 'why' | 'reveal'

function Play({ exp, onDone, onNext }: { exp: Experiment; onDone: (r: ExperimentResult) => void; onNext: () => void }) {
  const navigate = useNavigate()
  const { preferences } = usePreferencesContext()
  const [stage, setStage] = useState<Stage>('setup')
  const [choice, setChoice] = useState<Choice | null>(null)
  const [twistChoice, setTwistChoice] = useState<Choice | null>(null)
  const [why, setWhy] = useState('')
  const [reply, setReply] = useState<api.ExperimentReply | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // bring each new part of the story into view as it appears
  const fresh = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (stage === 'setup') {
      document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    const id = window.setTimeout(() => fresh.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120)
    return () => window.clearTimeout(id)
  }, [stage, !!reply])
  const mark = <div ref={fresh} aria-hidden="true" style={{ scrollMarginTop: 84 }} />

  async function reveal(withWhy: string) {
    if (!choice || !twistChoice) return
    if (withWhy && !(await mindful(withWhy))) return
    setStage('reveal')
    setLoading(true)
    setError(null)
    const base: ExperimentResult = { choice: choice.id, twistChoice: twistChoice.id, why: withWhy || undefined, at: Date.now() }
    onDone(base)
    try {
      const r = await api.reactToExperiment({
        title: exp.title,
        setup: exp.setup,
        question: exp.question,
        choice: choice.label,
        twist: exp.twist,
        twistQuestion: exp.twistQuestion,
        twistChoice: twistChoice.label,
        why: withWhy || undefined,
        thinkers: exp.takes.map((t) => t.id).filter(Boolean) as string[],
        language: preferences.language,
        depth: preferences.depth,
      })
      setReply(r)
      onDone({ ...base, reading: r.reading, reactions: r.reactions, question: r.question })
    } catch (e) {
      setError((e as Error)?.message || 'The philosophers could not be reached just now.')
    } finally {
      setLoading(false)
    }
  }

  const colour = DOMAIN_COLOURS[exp.domain]

  return (
    <div className="mx-auto flex w-full max-w-[680px] flex-col gap-5 px-5 pb-16 pt-7">
      <div className="night-enter flex flex-col items-center gap-2 text-center">
        <span style={{ fontFamily: F.inscr, fontSize: 10.5, fontWeight: 600, letterSpacing: '.28em', color: colour }}>{exp.domain.toUpperCase()}</span>
        <h2 className="m-0" style={{ fontFamily: F.display, fontWeight: 400, fontSize: 'clamp(30px, 7vw, 42px)', lineHeight: 1.08 }}>
          {exp.title}
        </h2>
        <span style={{ fontSize: 13, color: C.muted }}>{exp.origin}</span>
      </div>

      <Scene label="THE SCENE" text={exp.setup} />

      {stage === 'setup' && <Ask question={exp.question} choices={exp.choices} onPick={(c) => (setChoice(c), setStage('twist'))} />}

      {choice && stage !== 'setup' && <Chosen label="YOU CHOSE" text={choice.label} />}

      {stage === 'twist' && mark}
      {stage !== 'setup' && (
        <>
          <Scene label="BUT THEN…" text={exp.twist} accent />
          {stage === 'twist' && <Ask question={exp.twistQuestion} choices={exp.twistChoices} onPick={(c) => (setTwistChoice(c), setStage('why'))} />}
        </>
      )}

      {stage === 'why' && mark}
      {twistChoice && (stage === 'why' || stage === 'reveal') && <Chosen label="YOU ANSWERED" text={twistChoice.label} />}

      {stage === 'why' && (
        <div className="night-enter flex flex-col gap-2.5">
          <label htmlFor="exp-why" style={{ fontFamily: F.inscr, fontSize: 10.5, fontWeight: 600, letterSpacing: '.24em', color: C.gilt }}>
            IN A SENTENCE, WHY? (OPTIONAL)
          </label>
          <textarea
            id="exp-why"
            value={why}
            onChange={(e) => setWhy(e.target.value)}
            rows={2}
            placeholder="What made the difference, or why didn’t it?"
            className="panel-stone w-full resize-none rounded p-3.5 outline-none"
            style={{ border: `1px solid ${C.lineStrong}`, color: C.ivory, fontFamily: F.read, fontSize: 16, lineHeight: 1.5 }}
          />
          <button type="button" onClick={() => reveal(why.trim())} className="btn-gilt night-btn min-h-[50px] rounded" style={{ background: C.gilt, color: C.night, fontWeight: 600, fontSize: 16 }}>
            See what the thinkers make of it
          </button>
        </div>
      )}

      {stage === 'reveal' && (
        <div className="flex flex-col gap-4">
          {mark}
          {loading && (
            <div className="flex justify-center py-2">
              <Thinking text="The philosophers are weighing your choices" />
            </div>
          )}
          {error && (
            <div className="panel-stone flex flex-col items-center gap-2.5 rounded p-4 text-center">
              <p className="m-0" style={{ fontFamily: F.read, color: C.ember }}>{error}</p>
              <button type="button" onClick={() => reveal(why.trim())} className="btn-bronze night-btn min-h-[42px] rounded border px-4" style={{ borderColor: C.lineStrong, color: C.body }}>
                Try again
              </button>
            </div>
          )}
          {reply && (
            <>
              <AiNote className="text-center" />
              <Card label="WHAT YOUR CHOICES SAY" colour={C.gold}>
                <p className="m-0" style={{ fontFamily: F.display, fontSize: 19, lineHeight: 1.4 }}>{reply.reading}</p>
              </Card>
              {reply.reactions.map((r, i) => (
                <Card key={r.philosopherId} label={(philosopherById(r.philosopherId)?.name ?? r.philosopherId).toUpperCase()} colour={i === 0 ? C.ember : C.iris}>
                  <p className="m-0" style={{ fontFamily: F.read, fontSize: 16, lineHeight: 1.6, color: C.ivory }}>{r.text}</p>
                </Card>
              ))}
            </>
          )}
          {(reply || error) && (
            <>
              <section className="night-enter flex flex-col gap-2.5" aria-labelledby="exp-takes">
                <h3 id="exp-takes" className="m-0 text-center" style={{ fontFamily: F.inscr, fontSize: 10.5, fontWeight: 600, letterSpacing: '.24em', color: C.gilt }}>
                  HOW THE GREAT THINKERS SAW IT
                </h3>
                {exp.takes.map((t) => (
                  <div key={t.name} className="panel-stone rounded p-3.5" style={{ border: `1px solid ${C.line}` }}>
                    <span style={{ fontFamily: F.display, fontSize: 16 }}>{t.name}</span>
                    <p className="m-0 mt-1" style={{ fontFamily: F.read, fontSize: 15, lineHeight: 1.55, color: C.body }}>{t.take}</p>
                  </div>
                ))}
              </section>
              <div className="night-enter flex flex-col items-center gap-2 py-2 text-center">
                <span style={{ fontFamily: F.inscr, fontSize: 10.5, fontWeight: 600, letterSpacing: '.24em', color: C.gilt }}>WHAT IT IS REALLY ASKING</span>
                <p className="m-0" style={{ fontFamily: F.read, fontStyle: 'italic', fontSize: 17, lineHeight: 1.5, color: C.ivory, maxWidth: '46ch' }}>{exp.point}</p>
                {reply?.question && (
                  <>
                    <span className="mt-3" style={{ fontFamily: F.inscr, fontSize: 10.5, fontWeight: 600, letterSpacing: '.24em', color: C.gilt }}>TO CARRY WITH YOU</span>
                    <p className="m-0" style={{ fontFamily: F.display, fontSize: 21, lineHeight: 1.25, textWrap: 'balance' }}>{reply.question}</p>
                  </>
                )}
              </div>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => navigate('/app/symposium', { state: { prefill: `${exp.title}: ${exp.question} I said "${choice?.label}". Then: ${exp.twistQuestion} I said "${twistChoice?.label}".` } })}
                  className="btn-bronze night-btn min-h-[50px] rounded border"
                  style={{ borderColor: C.lineStrong, color: '#E9D5A6' }}
                >
                  Talk it over at the Symposium
                </button>
                <button type="button" onClick={onNext} className="btn-gilt night-btn min-h-[50px] rounded" style={{ background: C.gilt, color: C.night, fontWeight: 600 }}>
                  Next experiment
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function Scene({ label, text, accent }: { label: string; text: string; accent?: boolean }) {
  return (
    <section className="panel-stone night-enter rounded p-5" style={{ border: `1px solid ${accent ? C.lineStrong : C.line}` }}>
      <div className="greek-key mb-3" aria-hidden="true" />
      <span style={{ fontFamily: F.inscr, fontSize: 10.5, fontWeight: 600, letterSpacing: '.24em', color: accent ? C.gold : C.gilt }}>{label}</span>
      <p className="m-0 mt-2" style={{ fontFamily: F.read, fontSize: 17.5, lineHeight: 1.65, color: C.ivory }}>{text}</p>
    </section>
  )
}

function Ask({ question, choices, onPick }: { question: string; choices: [Choice, Choice]; onPick: (c: Choice) => void }) {
  return (
    <div className="night-enter flex flex-col gap-3" style={{ animationDelay: '.25s' }}>
      <p className="m-0 text-center" style={{ fontFamily: F.display, fontSize: 'clamp(22px, 5vw, 27px)', lineHeight: 1.2 }}>{question}</p>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2" role="group" aria-label={question}>
        {choices.map((c) => (
          <button key={c.id} type="button" onClick={() => onPick(c)} className="btn-bronze night-btn min-h-[64px] rounded border px-4 py-3 text-left" style={{ borderColor: C.lineStrong, color: C.ivory, fontFamily: F.read, fontSize: 16, lineHeight: 1.4 }}>
            {c.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function Chosen({ label, text }: { label: string; text: string }) {
  return (
    <div className="night-enter flex items-baseline gap-3 px-1">
      <span className="shrink-0" style={{ fontFamily: F.inscr, fontSize: 9.5, fontWeight: 600, letterSpacing: '.22em', color: C.muted }}>{label}</span>
      <span style={{ fontFamily: F.read, fontStyle: 'italic', fontSize: 15.5, color: C.gold }}>{text}</span>
    </div>
  )
}

function Card({ label, colour, children }: { label: string; colour: string; children: ReactNode }) {
  return (
    <article className="panel-stone night-enter flex flex-col gap-2 rounded p-4" style={{ borderLeft: `2px solid ${colour}` }}>
      <span style={{ fontFamily: F.inscr, fontSize: 10.5, fontWeight: 600, letterSpacing: '.22em', color: colour }}>{label}</span>
      {children}
    </article>
  )
}
