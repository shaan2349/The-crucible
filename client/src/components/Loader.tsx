export function Loader({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 py-6 text-sm text-parchment-700">
      <span className="relative flex h-4 w-4 items-center justify-center">
        <span
          className="absolute h-4 w-4 animate-[emberRing_1.3s_ease-out_infinite] rounded-full"
          style={{ background: '#e8a33d' }}
        />
        <span
          className="absolute h-1.5 w-1.5 rounded-full"
          style={{ background: '#c2531d', boxShadow: '0 0 6px 2px rgba(194,83,29,0.6)' }}
        />
      </span>
      <span>{label}</span>
    </div>
  )
}
