import { NavLink } from 'react-router-dom'
import { clsx } from 'clsx'

const TABS = [
  { to: '/app/debate', label: 'Debate' },
  { to: '/app/library', label: 'Library' },
  { to: '/app/train', label: 'Train' },
  { to: '/app/history', label: 'History' },
] as const

export function TabBar() {
  return (
    <nav className="sticky bottom-0 z-20 border-t border-parchment-300 bg-parchment-50/95 backdrop-blur">
      <ul className="mx-auto flex max-w-md">
        {TABS.map((tab) => (
          <li key={tab.to} className="flex-1">
            <NavLink
              to={tab.to}
              className={({ isActive }) =>
                clsx(
                  'flex flex-col items-center gap-1 py-3 font-display text-sm transition-colors',
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
