import { useState } from 'react'
import { CrucibleMark } from '../components/CrucibleMark'

type Stage = 'input' | 'forging'

/**
 * Placeholder shell for the core debate loop, used to validate layout
 * and the forge/parchment contrast before real premise-breakdown and
 * philosopher-rebuttal logic is ported in from the prototype.
 */
export function Debate() {
  const [stage, setStage] = useState<Stage>('input')
  const [claim, setClaim] = useState('')

  return (
    <div className="px-6 pb-10 pt-8">
      <header className="mb-8 flex items-center gap-3">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-lg"
          style={{ background: 'linear-gradient(155deg, #e8a33d 0%, #c2531d 55%, #8a2a12 100%)' }}
        >
          <CrucibleMark size={20} className="text-parchment-50" />
        </div>
        <h1 className="font-display text-2xl font-medium text-parchment-900">Debate</h1>
      </header>

      {stage === 'input' && (
        <div>
          <p className="mb-5 text-parchment-700">
            State a position you actually hold. Not a hypothetical — something
            you'd defend at dinner.
          </p>
          <textarea
            value={claim}
            onChange={(e) => setClaim(e.target.value)}
            placeholder="e.g. Voting should be compulsory"
            rows={4}
            className="w-full resize-none rounded-2xl border border-parchment-300 bg-parchment-50 p-4 font-body text-base text-parchment-900 shadow-sm outline-none placeholder:text-parchment-400 focus:border-forge-ember"
          />
          <button
            type="button"
            disabled={!claim.trim()}
            onClick={() => setStage('forging')}
            className="mt-5 w-full rounded-full py-3.5 font-display text-base font-medium text-parchment-50 shadow-embossed transition-opacity disabled:opacity-40"
            style={{ background: 'linear-gradient(120deg, #e8a33d 0%, #c2531d 55%, #8a2a12 100%)' }}
          >
            Enter the Crucible
          </button>
        </div>
      )}

      {stage === 'forging' && (
        <div className="flex flex-col items-center py-16 text-center">
          <div className="mb-5 h-14 w-14 animate-pulse rounded-full" style={{ background: 'linear-gradient(155deg, #e8a33d, #8a2a12)' }} />
          <p className="font-display text-lg text-parchment-800">Breaking your claim into premises…</p>
          <p className="mt-2 text-sm text-parchment-500">
            (placeholder — wired to real premise extraction once prompt logic is ported)
          </p>
        </div>
      )}
    </div>
  )
}
