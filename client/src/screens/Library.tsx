import { Bust } from '../components/Bust'

export function Library() {
  return (
    <div className="px-6 pb-10 pt-8">
      <header className="mb-6">
        <h1 className="font-display text-2xl font-medium text-parchment-900">Library</h1>
        <p className="mt-1 text-sm text-parchment-600">47 philosophers, browsable by era</p>
      </header>

      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-parchment-300 py-14 text-center">
        <Bust laurel className="h-16 w-16 text-parchment-400" />
        <p className="max-w-xs text-sm text-parchment-500">
          Roster pending — will populate once the philosopher dataset is ported from the prototype.
        </p>
      </div>
    </div>
  )
}
