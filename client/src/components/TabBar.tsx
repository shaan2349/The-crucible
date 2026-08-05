import { NavLink } from 'react-router-dom'
import { clsx } from 'clsx'

const TABS = [
  { to: '/app/reflect', label: 'Reflect' },
  { to: '/app/council', label: 'Council' },
  { to: '/app/journal', label: 'Journal' },
  { to: '/app/archive', label: 'Archive' },
  { to: '/app/profile', label: 'Profile' },
] as const

export function TabBar() {
  return (
    <nav className="sticky bottom-0 z-20 border-t border-parchment-300 bg-parchment-50/95 backdrop-blur">
      <ul className="reading-container flex">
        {TABS.map((tab) => (
          <li key={tab.to} className="min-w-0 flex-1">
            <NavLink
              to={tab.to}
              className={({ isActive }) =>
                clsx(
                  'flex flex-col items-center gap-1 py-3 font-display text-xs transition-colors',
                  isActive ? 'text-forge-ember' : 'text-parchment-500 hover:text-parchment-700',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={clsx(
                      'h-1.5 w-1.5 rounded-full transition-opacity',
                      isActive ? 'opacity-100' : 'opacity-0',
                    )}
                    style={{ background: 'linear-gradient(135deg, #e8a33d, #8a2a12)' }}
                  />
                  {tab.label}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
