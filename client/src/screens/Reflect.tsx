import { useNavigate } from 'react-router-dom'
import { Compass } from 'lucide-react'
import { EmptyState } from '../components/EmptyState'
import { RotatingBackdrop } from '../components/RotatingBackdrop'

/**
 * Reflect and Debate are now deliberately different products (see the
 * core-restructure brief): Debate is the existing claim/premise/attack
 * engine, moved to its own tab. Reflect is meant to become something
 * genuinely different — philosophy applied to everyday dilemmas, decisions
 * and uncertainty, WITHOUT automatically turning every thought into
 * premises to be attacked.
 *
 * That real Reflect experience (thinker selection for life situations,
 * practical-philosophy responses, the "What the Council sees" ending) is
 * substantial new product work, deliberately scoped to its own follow-up
 * pass rather than rushed in alongside the navigation/structure change.
 * This is an honest interim state, not a broken one: it explains what's
 * coming rather than silently reusing Debate's attack-a-claim mechanic
 * under a mismatched label.
 */
export function Reflect() {
  const navigate = useNavigate()

  return (
    <>
      <RotatingBackdrop screen="reflect" />
      <div className="reading-container relative z-[1] px-6 pb-16 pt-14 sm:pt-20">
        <p
          className="mb-4 font-display text-xs uppercase tracking-[0.15em] text-parchment-500"
          style={{ animation: 'revealUp 0.4s ease both' }}
        >
          Reflect
        </p>

        <div className="relative mb-10">
          <h1
            className="relative font-display text-[34px] font-medium leading-[1.15] tracking-[-0.02em] text-parchment-900 sm:text-[40px]"
            style={{ animation: 'revealUp 0.5s ease 80ms both' }}
          >
            What's on your mind?
          </h1>
          <p className="mt-3 text-sm text-parchment-500" style={{ animation: 'revealUp 0.5s ease 120ms both' }}>
            Bring a decision, worry or question.
          </p>
        </div>

        <EmptyState
          icon={<Compass className="h-9 w-9 text-parchment-400" />}
          headline="Reflect is being rebuilt into something new"
          body="A space for everyday dilemmas and decisions — philosophy applied to your actual life, not an argument to defend. Coming soon."
          action={{ label: 'Put a belief under pressure instead', onClick: () => navigate('/app/debate') }}
          className="mt-2"
        />
      </div>
    </>
  )
}
