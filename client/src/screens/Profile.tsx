import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, Settings as SettingsIcon } from 'lucide-react'
import { Card } from '../components/Card'
import { EmptyState } from '../components/EmptyState'
import { RotatingBackdrop } from '../components/RotatingBackdrop'
import { PortraitFrame } from '../components/PortraitFrame'
import { PHILOSOPHER_CATEGORIES, philosopherById } from '../data/philosophers'
import { loadDebates } from '../lib/storage'
import type { Debate } from '../types'

function categoryNameOf(id: string): string | null {
  const cat = PHILOSOPHER_CATEGORIES.find((c) => (c.ids as readonly string[]).includes(id))
  return cat?.name ?? null
}

export function Profile() {
  const [debates, setDebates] = useState<Debate[]>([])
  const navigate = useNavigate()

  useEffect(() => {
    setDebates(loadDebates())
  }, [])

  const stats = useMemo(() => {
    const reflections = debates.filter((d) => d.userReflection?.trim()).length
    const thinkerCounts: Record<string, number> = {}
    const schools = new Set<string>()
    debates.forEach((d) => {
      d.philosopherIds.forEach((id) => {
        thinkerCounts[id] = (thinkerCounts[id] ?? 0) + 1
        const school = categoryNameOf(id)
        if (school) schools.add(school)
      })
    })
    const favourites = Object.entries(thinkerCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id, count]) => ({ id, count }))
    return {
      questionsExplored: debates.length,
      reflectionsWritten: reflections,
      thinkersEncountered: Object.keys(thinkerCounts).length,
      schoolsExplored: schools.size,
      favourites,
    }
  }, [debates])

  return (
    <>
      <RotatingBackdrop />
      <div className="relative z-[1] px-6 pb-10 pt-8">
        <header className="mb-6">
          <p className="mb-1 font-display text-xs uppercase tracking-[0.15em] text-parchment-500">Profile</p>
          <h1 className="font-display text-2xl font-medium text-parchment-900">Your thinking journey</h1>
          <p className="mt-1 text-sm text-parchment-600">Not how much you've done. How you've changed.</p>
        </header>

        {debates.length === 0 ? (
          <EmptyState
            headline="Nothing to show yet"
            body="Finish a reflection in the Crucible and your journey starts building here."
          />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Card className="p-4">
                <p className="font-display text-2xl font-medium text-parchment-900">{stats.questionsExplored}</p>
                <p className="mt-0.5 text-xs text-parchment-500">Questions explored</p>
              </Card>
              <Card className="p-4">
                <p className="font-display text-2xl font-medium text-parchment-900">{stats.reflectionsWritten}</p>
                <p className="mt-0.5 text-xs text-parchment-500">Reflections written</p>
              </Card>
              <Card className="p-4">
                <p className="font-display text-2xl font-medium text-parchment-900">{stats.thinkersEncountered}</p>
                <p className="mt-0.5 text-xs text-parchment-500">Thinkers encountered</p>
              </Card>
              <Card className="p-4">
                <p className="font-display text-2xl font-medium text-parchment-900">{stats.schoolsExplored}</p>
                <p className="mt-0.5 text-xs text-parchment-500">Schools explored</p>
              </Card>
            </div>

            {stats.favourites.length > 0 && (
              <Card className="mt-5 p-4">
                <p className="mb-3 font-display text-[13px] italic text-forge-ember">Favourite thinkers</p>
                <div className="flex flex-wrap gap-3">
                  {stats.favourites.map(({ id, count }) => {
                    const p = philosopherById(id)
                    if (!p) return null
                    return (
                      <div key={id} className="w-16 text-center">
                        <PortraitFrame id={id} size={200} className="w-full" />
                        <p className="mt-1 truncate text-[11px] font-medium text-parchment-800">{p.name}</p>
                        <p className="text-[10px] text-parchment-500">{count}×</p>
                      </div>
                    )
                  })}
                </div>
              </Card>
            )}
          </>
        )}

        <button
          type="button"
          onClick={() => navigate('/app/train')}
          className="mt-5 flex w-full items-center gap-3 rounded-2xl bg-parchment-50 px-4 py-3.5 text-left"
          style={{ boxShadow: 'var(--shadow-card)' }}
        >
          <BookOpen className="h-5 w-5 shrink-0 text-forge-ember" />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium text-parchment-900">Train your reasoning</span>
            <span className="block text-xs text-parchment-500">Extract premises from real-style arguments</span>
          </span>
        </button>

        <button
          type="button"
          onClick={() => navigate('/app/settings')}
          className="mt-3 flex w-full items-center gap-3 rounded-2xl bg-parchment-50 px-4 py-3.5 text-left"
          style={{ boxShadow: 'var(--shadow-card)' }}
        >
          <SettingsIcon className="h-5 w-5 shrink-0 text-parchment-600" />
          <span className="text-sm font-medium text-parchment-900">Settings</span>
        </button>
      </div>
    </>
  )
}
