import { Outlet } from 'react-router-dom'
import { TabBar } from './TabBar'
import { RotatingBackdrop } from './RotatingBackdrop'
import { CrucibleMark } from './CrucibleMark'

export function AppShell() {
  return (
    <div className="relative flex min-h-svh flex-col">
      <RotatingBackdrop />
      <header className="sticky top-0 z-10 border-b border-parchment-300 bg-parchment-50/90 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center gap-2 px-6 py-3">
          <span
            className="flex h-7 w-7 items-center justify-center rounded-md"
            style={{ background: 'linear-gradient(155deg, #e8a33d 0%, #c2531d 55%, #8a2a12 100%)' }}
          >
            <CrucibleMark size={16} className="text-parchment-50" />
          </span>
          <span className="font-display text-base font-semibold text-parchment-900">The Crucible</span>
        </div>
      </header>
      <div className="relative z-[1] flex-1 overflow-y-auto">
        <div className="mx-auto max-w-md">
          <Outlet />
        </div>
      </div>
      <TabBar />
    </div>
  )
}
