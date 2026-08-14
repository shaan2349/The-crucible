import { NavLink } from 'react-router-dom'
import { clsx } from 'clsx'

const TABS = [
  { to: '/app/reflect', label: 'Reflect' },
  { to: '/app/debate', label: 'Debate' },
  { to: '/app/archive', label: 'Library' },
  { to: '/app/mythinking', label: 'My Thinking' },
  { to: '/app/train', label: 'Training' },
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
                  'flex flex-col items-center gap-1 px-0.5 py-3 text-center font-display text-[11px] leading-tight transition-colors sm:text-xs',
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
                  <span className="whitespace-nowrap">{tab.label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
