import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { ChevronLeft, User } from 'lucide-react'
import { CrucibleMark } from './CrucibleMark'

// Each screen mounts its own backdrop (RotatingBackdrop or, for an active
// debate, DebateBackdrop) rather than one shared here — only one route is
// ever visible at a time, and this lets Debate swap backdrops based on
// whether opponents have been picked yet.
export function AppShell() {
  const { pathname } = useLocation()
  // The sanctuary is the home of the app and draws its own full-screen
  // world, so it gets none of the frame below.
  if (pathname === '/app' || pathname === '/app/') return <Outlet />
  return (
    <div className="relative flex min-h-svh flex-col">
      <header className="sticky top-0 z-10 border-b border-parchment-300 bg-parchment-50/90 backdrop-blur">
        <div className="reading-container flex items-center justify-between gap-2 px-6 py-3">
          {/* The places of the app live on the sanctuary's hill, so the way
              between them is back to the sanctuary rather than a tab bar. */}
          <Link to="/app" className="flex items-center gap-2" aria-label="Back to the sanctuary">
            <ChevronLeft className="h-4 w-4 text-parchment-500" />
            <span
              className="flex h-7 w-7 items-center justify-center rounded-md"
              style={{ background: 'linear-gradient(155deg, #e8a33d 0%, #c2531d 55%, #8a2a12 100%)' }}
            >
              <CrucibleMark size={16} className="text-parchment-50" />
            </span>
            <span className="font-display text-base font-semibold text-parchment-900">The Crucible</span>
          </Link>
          {/* Profile/Settings moved out of the primary tab bar — reached
              here instead, so the 5 main experiences (Reflect/Debate/
              Library/My Thinking/Training) keep the primary nav to
              themselves. */}
          <NavLink
            to="/app/profile"
            aria-label="Profile and settings"
            className={({ isActive }) =>
              `flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
                isActive ? 'bg-forge-ember text-parchment-50' : 'text-parchment-500 hover:text-forge-ember'
              }`
            }
            style={{ boxShadow: 'var(--shadow-embossed)' }}
          >
            <User className="h-4 w-4" />
          </NavLink>
        </div>
      </header>
      {/* No shared width constraint here — each screen picks its own
          container tier (reading/standard/wide, see index.css) since
          Reflect/Debate's conversations, My Thinking/Profile's pages, and
          Library's grid all want different desktop measures. */}
      <div className="relative z-[1] flex-1 overflow-y-auto">
        <Outlet />
      </div>
    </div>
  )
}
