import { createRoot } from 'react-dom/client'
import { NIGHT as C, NIGHT_FONT as F } from './theme'

/**
 * Care before philosophy. Words that sound like someone may be in danger
 * (about themselves, not a thesis such as "suicide is never justified")
 * open a gentle card with real places to turn, before anything is sent.
 * The philosophers' prompts carry the same rule on the server as a backstop.
 */
const SIGNS = [
  /\b(kill|killing|hurt|hurting|harm|harming|cut|cutting|starve|starving) (myself|my self)\b/i,
  /\b(end|ending|take|taking) my (own )?life\b/i,
  /\b(i|i'm|im|i am) (so )?(suicidal|going to die by suicide)\b/i,
  /\bsuicidal\b/i,
  /\b(want|wanna|wish|going|planning) to (die|be dead|disappear forever)\b/i,
  /\bdon'?t want to (be alive|live|exist|wake up)( anymore)?\b/i,
  /\b(no|nothing) (reason|point) (to|in) (live|living|going on)\b/i,
  /\b(better off|be better) (dead|without me)\b/i,
  /\bself[- ]?harm(ing)?\b.*\b(i|me|my)\b|\b(i|me|my)\b.*\bself[- ]?harm(ing)?\b/i,
  /\b(he|she|they|someone|my \w+) (hits|beats|hurts|abuses|touches) me\b/i,
  /\b(i'?m|i am) (being )?(abused|in danger)\b/i,
]

export function soundsLikeCrisis(text: string) {
  return SIGNS.some((r) => r.test(text))
}

let open = false

/** Resolves true to carry on, false to go back. Instant when nothing is wrong.
 * With `strict` (the Temple, where a thesis is attacked) there is no carrying on. */
export function mindful(text: string, strict = false): Promise<boolean> {
  if (!soundsLikeCrisis(text) || open) return Promise.resolve(true)
  open = true
  return new Promise((resolve) => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const root = createRoot(host)
    const done = (go: boolean) => {
      root.unmount()
      host.remove()
      open = false
      resolve(go)
    }
    root.render(<SupportCard onBack={() => done(false)} onContinue={strict ? undefined : () => done(true)} />)
  })
}

const LINES = [
  { where: 'UK and Ireland', who: 'Samaritans, any time', how: 'Call 116 123', href: 'tel:116123' },
  { where: 'United States', who: '988 Suicide & Crisis Lifeline', how: 'Call or text 988', href: 'tel:988' },
  { where: 'Anywhere else', who: 'Find a free helpline near you', how: 'findahelpline.com', href: 'https://findahelpline.com' },
]

function SupportCard({ onBack, onContinue }: { onBack: () => void; onContinue?: () => void }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="support-title"
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
      style={{ background: 'rgba(6,7,10,.78)', backdropFilter: 'blur(4px)' }}
      onKeyDown={(e) => e.key === 'Escape' && onBack()}
    >
      <div className="panel-stone flex w-full max-w-[460px] flex-col gap-4 rounded p-5" style={{ background: C.raised, border: `1px solid ${C.lineStrong}`, color: C.ivory }}>
        <h2 id="support-title" className="m-0" style={{ fontFamily: F.display, fontWeight: 400, fontSize: 24, lineHeight: 1.2 }}>
          Before we go on
        </h2>
        <p className="m-0" style={{ fontFamily: F.read, fontSize: 16, lineHeight: 1.6, color: C.body }}>
          What you wrote sounds like it might be about something painful in your own life. If it is, you deserve to talk to a real person, not an AI
          philosopher. You don’t have to be in a crisis to call, and it’s free.
        </p>
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {LINES.map((l) => (
            <li key={l.where}>
              <a
                href={l.href}
                target={l.href.startsWith('http') ? '_blank' : undefined}
                rel="noreferrer"
                className="flex flex-col rounded border px-3.5 py-2.5 no-underline"
                style={{ borderColor: C.line, color: C.ivory }}
              >
                <span style={{ fontFamily: F.inscr, fontSize: 10, fontWeight: 600, letterSpacing: '.2em', color: C.gilt }}>{l.where.toUpperCase()}</span>
                <span style={{ fontFamily: F.display, fontSize: 18 }}>{l.how}</span>
                <span style={{ fontSize: 13, color: C.muted }}>{l.who}</span>
              </a>
            </li>
          ))}
        </ul>
        <p className="m-0" style={{ fontSize: 13.5, lineHeight: 1.5, color: C.muted }}>
          If you are in danger right now, call your local emergency number (999 in the UK, 911 in the US). Talking to someone you trust, like a friend,
          family member or teacher, helps too.
        </p>
        {!onContinue && (
          <p className="m-0" style={{ fontFamily: F.read, fontStyle: 'italic', fontSize: 14.5, lineHeight: 1.5, color: C.body }}>
            The Temple is built to attack ideas, so it won’t take this one. If you’d like to think it through, the Symposium is a gentler place to talk.
          </p>
        )}
        <div className={`grid grid-cols-1 gap-2 ${onContinue ? 'sm:grid-cols-2' : ''}`}>
          <button autoFocus type="button" onClick={onBack} className="btn-gilt min-h-[48px] rounded" style={{ background: C.gilt, color: C.night, fontWeight: 600, fontSize: 15 }}>
            Go back
          </button>
          {onContinue && <button type="button" onClick={onContinue} className="btn-bronze min-h-[48px] rounded border" style={{ borderColor: C.lineStrong, color: '#E9D5A6', fontSize: 15 }}>
            I’m okay, carry on
          </button>}
        </div>
      </div>
    </div>
  )
}
