export function Loader({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 py-6 text-sm text-parchment-700">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-parchment-400 border-t-forge-ember" />
      <span>{label}</span>
    </div>
  )
}
