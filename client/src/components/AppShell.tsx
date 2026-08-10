import { Outlet } from 'react-router-dom'
import { TabBar } from './TabBar'
import { CrucibleMark } from './CrucibleMark'

// Each screen mounts its own backdrop (RotatingBackdrop or, for an active
// debate, DebateBackdrop) rather than one shared here — only one route is
// ever visible at a time, and this lets Debate swap backdrops based on
// whether opponents have been picked yet.
export function AppShell() {
  return (
    <div className="relative flex min-h-svh flex-col">
      <header className="sticky top-0 z-10 border-b border-parchment-300 bg-parchment-50/90 backdrop-blur">
        <div className="reading-container flex items-center gap-2 px-6 py-3">
          <span
            className="flex h-7 w-7 items-center justify-center rounded-md"
            style={{ background: 'linear-gradient(155deg, #e8a33d 0%, #c2531d 55%, #8a2a12 100%)' }}
          >
            <CrucibleMark size={16} className="text-parchment-50" />
          </span>
          <span className="font-display text-base font-semibold text-parchment-900">The Crucible</span>
        </div>
      </header>
      {/* No shared width constraint here — each screen picks its own
          container tier (reading/standard/wide, see index.css) since
          Reflect's conversation, Journal/Profile's pages, and Library's
          grid all want different desktop measures. */}
      <div className="relative z-[1] flex-1 overflow-y-auto">
        <Outlet />
      </div>
      <TabBar />
    </div>
  )
}
