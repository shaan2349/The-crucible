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

interface ProfileInsight {
  label: string
  value: string
}

function categoryNameOf(id: string): string | null {
  const cat = PHILOSOPHER_CATEGORIES.find((c) => (c.ids as readonly string[]).includes(id))
  return cat?.name ?? null
}

/** Only counts sessions with real participation — a session ended
 * without ever responding has a `leanedFramework` describing the
 * starting claim alone, not anything the user actually engaged with, so
 * it shouldn't count toward a profile of "who you're becoming". Debates
 * saved before participation tracking existed (no field either way)
 * still count, rather than silently losing older history. */
function tallyFrameworks(debates: Debate[]): [string, number][] {
  const counts: Record<string, number> = {}
  debates.forEach((d) => {
    if (d.participationLevel === 'none') return
    if (d.verdict?.leanedFramework) counts[d.verdict.leanedFramework] = (counts[d.verdict.leanedFramework] ?? 0) + 1
  })
  return Object.entries(counts).sort((a, b) => b[1] - a[1])
}

/** Every line here is computed directly from stored debates — nothing
 * is invented. Each insight is independently gated on having a real
 * pattern behind it (not just one data point), so a thin history
 * produces fewer lines rather than weak or misleading ones. */
function thinkingProfile(debates: Debate[]): ProfileInsight[] {
  if (debates.length < 3) return []
  const insights: ProfileInsight[] = []
  const sorted = [...debates].sort((a, b) => a.id - b.id)

  const recentFrameworks = tallyFrameworks(sorted.slice(-5))
  const currentStyle = recentFrameworks.length > 0 && recentFrameworks[0][1] >= 2 ? recentFrameworks[0][0] : null
  if (currentStyle) {
    insights.push({ label: 'Current intellectual style', value: currentStyle })
  }

  const allFrameworks = tallyFrameworks(debates)
  if (allFrameworks.length > 0 && allFrameworks[0][1] >= 2 && allFrameworks[0][0] !== currentStyle) {
    insights.push({ label: 'Most explored framework', value: allFrameworks[0][0] })
  }

  const philosopherCounts: Record<string, number> = {}
  debates.forEach((d) => d.philosopherIds.forEach((id) => (philosopherCounts[id] = (philosopherCounts[id] ?? 0) + 1)))
  const philosopherEntries = Object.entries(philosopherCounts).sort((a, b) => b[1] - a[1])
  if (philosopherEntries.length > 0) {
    const [topId, topCount] = philosopherEntries[0]
    const runnerUp = philosopherEntries[1]?.[1] ?? 0
    if (topCount >= 3 && topCount > runnerUp) {
      const name = philosopherById(topId)?.name
      if (name) insights.push({ label: 'Thinker you return to', value: name })
    }
  }

  if (allFrameworks.length >= 2 && allFrameworks[0][1] >= 2 && allFrameworks[1][1] >= 2) {
    insights.push({ label: 'Recurring tension', value: `${allFrameworks[0][0]} vs ${allFrameworks[1][0]}` })
  }

  if (sorted.length >= 4) {
    const mid = Math.floor(sorted.length / 2)
    const earlyTop = tallyFrameworks(sorted.slice(0, mid))[0]
    const lateTop = tallyFrameworks(sorted.slice(mid))[0]
    if (earlyTop && lateTop && earlyTop[0] !== lateTop[0]) {
      insights.push({ label: 'Recent shift', value: `From ${earlyTop[0]} toward ${lateTop[0]}` })
    }
  }

  return insights
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

  const insights = useMemo(() => thinkingProfile(debates), [debates])

  return (
    <>
      <RotatingBackdrop screen="profile" />
      <div className="standard-container relative z-[1] px-6 pb-10 pt-8">
        <header className="mb-6">
          <p className="mb-1 font-display text-xs uppercase tracking-[0.15em] text-parchment-500">
            Your thinking profile
          </p>
          <h1 className="font-display text-2xl font-medium text-parchment-900">Who you're becoming, philosophically</h1>
        </header>

        {debates.length === 0 ? (
          <EmptyState
            headline="Nothing to show yet"
            body="Finish a reflection in the Crucible and your journey starts building here."
          />
        ) : (
          <>
            {insights.length > 0 ? (
              <div className="space-y-4">
                {insights.map((insight) => (
                  <div key={insight.label}>
                    <p className="text-xs font-medium uppercase tracking-wide text-parchment-500">
                      {insight.label}
                    </p>
                    <p className="mt-0.5 font-display text-2xl leading-snug text-parchment-900">{insight.value}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="font-display text-lg leading-snug text-parchment-700">
                Your thinking profile develops as you question, debate, and reflect.
              </p>
            )}

            {/* Stats stay visually secondary to the insights above: smaller
                numbers, four-across on desktop rather than a prominent 2x2
                block, plain metadata-weight captions. */}
            <div className="mt-9 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Card className="p-4">
                <p className="font-display text-xl font-medium text-parchment-800">{stats.questionsExplored}</p>
                <p className="mt-0.5 text-xs text-parchment-500">Questions explored</p>
              </Card>
              <Card className="p-4">
                <p className="font-display text-xl font-medium text-parchment-800">{stats.reflectionsWritten}</p>
                <p className="mt-0.5 text-xs text-parchment-500">Reflections written</p>
              </Card>
              <Card className="p-4">
                <p className="font-display text-xl font-medium text-parchment-800">{stats.thinkersEncountered}</p>
                <p className="mt-0.5 text-xs text-parchment-500">Thinkers encountered</p>
              </Card>
              <Card className="p-4">
                <p className="font-display text-xl font-medium text-parchment-800">{stats.schoolsExplored}</p>
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
                      <button
                        key={id}
                        type="button"
                        onClick={() => navigate('/app/archive')}
                        className="w-16 rounded-lg text-center transition-transform duration-150 hover:-translate-y-0.5 focus-visible:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forge-ember"
                      >
                        <PortraitFrame id={id} size={200} className="w-full" />
                        <p className="mt-1 truncate text-xs font-medium text-parchment-800">{p.name}</p>
                        <p className="text-[11px] text-parchment-500">{count}×</p>
                      </button>
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
          className="mt-5 flex w-full items-center gap-3 rounded-2xl bg-parchment-50 px-4 py-3.5 text-left transition-transform duration-150 hover:-translate-y-0.5 focus-visible:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forge-ember"
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
          className="mt-3 flex w-full items-center gap-3 rounded-2xl bg-parchment-50 px-4 py-3.5 text-left transition-transform duration-150 hover:-translate-y-0.5 focus-visible:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forge-ember"
          style={{ boxShadow: 'var(--shadow-card)' }}
        >
          <SettingsIcon className="h-5 w-5 shrink-0 text-parchment-600" />
          <span className="text-sm font-medium text-parchment-900">Settings</span>
        </button>
      </div>
    </>
  )
}
