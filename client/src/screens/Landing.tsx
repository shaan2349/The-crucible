import { useNavigate } from 'react-router-dom'
import { CrucibleMark } from '../components/CrucibleMark'
import { Bust } from '../components/Bust'

export function Landing() {
  const navigate = useNavigate()

  return (
    <div className="relative min-h-svh overflow-hidden bg-parchment-100">
      <div className="pointer-events-none absolute inset-0 opacity-[0.06]">
        <Bust laurel className="absolute -left-10 top-10 h-64 w-64 -rotate-6 text-parchment-900" />
        <Bust bearded plinth className="absolute -right-14 bottom-0 h-80 w-80 rotate-3 text-parchment-900" />
      </div>

      <div className="relative mx-auto flex min-h-svh max-w-md flex-col items-center justify-center px-8 py-16 text-center">
        <div
          className="mb-8 flex h-20 w-20 items-center justify-center rounded-2xl shadow-embossed"
          style={{ background: 'linear-gradient(155deg, #e8a33d 0%, #c2531d 55%, #8a2a12 100%)' }}
        >
          <CrucibleMark size={44} className="text-parchment-50" />
        </div>

        <p className="mb-2 font-display text-sm tracking-wide text-parchment-600">
          A philosophy debate forge
        </p>
        <h1 className="mb-4 font-display text-5xl font-medium leading-[1.05] text-parchment-900">
          The Crucible
        </h1>
        <p className="mb-12 max-w-sm text-lg leading-relaxed text-parchment-700">
          State a real position. Two philosophers, in genuine opposition, will
          put it under heat. What survives is stronger for it.
        </p>

        <button
          type="button"
          onClick={() => navigate('/app/debate')}
          className="group relative overflow-hidden rounded-full px-9 py-4 font-display text-lg font-medium text-parchment-50 shadow-embossed transition-transform active:scale-[0.98]"
          style={{ background: 'linear-gradient(120deg, #e8a33d 0%, #c2531d 55%, #8a2a12 100%)' }}
        >
          Enter the Crucible
        </button>

        <button
          type="button"
          onClick={() => navigate('/app/library')}
          className="mt-6 font-body text-sm text-parchment-600 underline decoration-parchment-400 underline-offset-4 hover:text-parchment-800"
        >
          Or browse the philosophers first
        </button>
      </div>
    </div>
  )
}
