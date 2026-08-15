import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, Compass, Settings as SettingsIcon, Sparkles } from 'lucide-react'
import { RotatingBackdrop } from '../components/RotatingBackdrop'
import { loadDebates, loadReflectSessions } from '../lib/storage'

/**
 * Reached only from the avatar icon in the header — deliberately thin.
 * The "who you're becoming, philosophically" insights that used to live
 * here moved to My Thinking's own Profile tab (they're the same
 * question My Thinking already asks about your sessions; keeping a
 * second, separate copy of that logic behind a hard-to-find icon was
 * the actual problem, not the insights themselves). This screen is now
 * just quick account-level navigation: a one-line honest count of your
 * history, then My Thinking / Training / Settings.
 */
export function Profile() {
  const [sessionCount, setSessionCount] = useState(0)
  const navigate = useNavigate()

  useEffect(() => {
    setSessionCount(loadDebates().length + loadReflectSessions().length)
  }, [])

  return (
    <>
      <RotatingBackdrop screen="profile" />
      <div className="standard-container relative z-[1] px-6 pb-10 pt-8">
        <header className="mb-6">
          <p className="mb-1 font-display text-xs uppercase tracking-[0.15em] text-parchment-500">Profile</p>
          <h1 className="font-display text-2xl font-medium text-parchment-900">
            {sessionCount > 0 ? `${sessionCount} session${sessionCount === 1 ? '' : 's'} so far` : 'Nothing yet'}
          </h1>
          <p className="mt-1 text-sm text-parchment-600">
            The full picture of your intellectual history — patterns, threads, and changed beliefs — lives in My Thinking.
          </p>
        </header>

        <div className="space-y-3">
          <button
            type="button"
            onClick={() => navigate('/app/mythinking')}
            className="flex w-full items-center gap-3 rounded-2xl bg-parchment-50 px-4 py-3.5 text-left transition-transform duration-150 hover:-translate-y-0.5 focus-visible:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forge-ember"
            style={{ boxShadow: 'var(--shadow-card)' }}
          >
            <Sparkles className="h-5 w-5 shrink-0 text-forge-ember" />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-parchment-900">My Thinking</span>
              <span className="block text-xs text-parchment-500">Your intellectual history and philosophical profile</span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/app/train')}
            className="flex w-full items-center gap-3 rounded-2xl bg-parchment-50 px-4 py-3.5 text-left transition-transform duration-150 hover:-translate-y-0.5 focus-visible:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forge-ember"
            style={{ boxShadow: 'var(--shadow-card)' }}
          >
            <BookOpen className="h-5 w-5 shrink-0 text-forge-ember" />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-parchment-900">Train your reasoning</span>
              <span className="block text-xs text-parchment-500">Six ways to practice thinking well</span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/app/archive')}
            className="flex w-full items-center gap-3 rounded-2xl bg-parchment-50 px-4 py-3.5 text-left transition-transform duration-150 hover:-translate-y-0.5 focus-visible:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forge-ember"
            style={{ boxShadow: 'var(--shadow-card)' }}
          >
            <Compass className="h-5 w-5 shrink-0 text-forge-ember" />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-parchment-900">Browse the Library</span>
              <span className="block text-xs text-parchment-500">47 thinkers, centuries of arguments</span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/app/settings')}
            className="flex w-full items-center gap-3 rounded-2xl bg-parchment-50 px-4 py-3.5 text-left transition-transform duration-150 hover:-translate-y-0.5 focus-visible:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forge-ember"
            style={{ boxShadow: 'var(--shadow-card)' }}
          >
            <SettingsIcon className="h-5 w-5 shrink-0 text-parchment-600" />
            <span className="text-sm font-medium text-parchment-900">Settings</span>
          </button>
        </div>
      </div>
    </>
  )
}
