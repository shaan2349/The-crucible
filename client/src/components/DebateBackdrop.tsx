import { usePortrait } from '../hooks/usePortrait'
import { Bust } from './Bust'
import { SIDE_ACCENT, photoPosition } from '../data/philosophers'

const DUOTONE_FILTER = ['url(#duotone-gold)', 'url(#duotone-indigo)']

/**
 * Backdrop for an active debate: the two actual combatants' portraits,
 * side by side, each in a true duotone matching their gold/indigo
 * accent (see DuotoneDefs) rather than a generic sepia filter — the
 * photo treatment itself carries the two-opposing-sides identity, not
 * just a color tint layered on top. Static per debate — cycling would
 * be confusing mid-argument. Falls back to an accent-tinted bust per
 * side if that philosopher has no mapped photo or it fails to load.
 */
export function DebateBackdrop({ philosopherIds }: { philosopherIds: string[] }) {
  const [id1, id2] = philosopherIds
  const portrait1 = usePortrait(id1)
  const portrait2 = usePortrait(id2)

  return (
    <div className="fixed inset-0 z-0 overflow-hidden bg-parchment-100">
      <div className="absolute inset-0 flex">
        <Side
          url={portrait1.url}
          failed={portrait1.failed}
          accent={SIDE_ACCENT[0]}
          duotone={DUOTONE_FILTER[0]}
          position={id1 ? photoPosition(id1) : undefined}
        />
        <Side
          url={portrait2.url}
          failed={portrait2.failed}
          accent={SIDE_ACCENT[1]}
          duotone={DUOTONE_FILTER[1]}
          position={id2 ? photoPosition(id2) : undefined}
        />
      </div>
      <div
        className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2"
        style={{ background: 'linear-gradient(180deg, transparent, rgba(138,42,18,0.4), transparent)' }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 50% 45%, rgba(248,242,230,0.45) 0%, rgba(248,242,230,0.78) 60%, rgba(248,242,230,0.94) 100%)',
        }}
      />
    </div>
  )
}

function Side({
  url,
  failed,
  accent,
  duotone,
  position,
}: {
  url: string | null
  failed: boolean
  accent: string
  duotone: string
  position?: string
}) {
  return (
    <div className="relative h-full w-1/2 overflow-hidden">
      {url && (
        <div
          key={url}
          className="absolute inset-0 animate-[backdropFade_1s_ease] bg-cover"
          style={{ backgroundImage: `url(${url})`, backgroundPosition: position ?? '50% 18%', filter: duotone }}
        />
      )}
      {!url && failed && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Bust className="h-40 w-40" tone={`${accent}35`} />
        </div>
      )}
    </div>
  )
}
