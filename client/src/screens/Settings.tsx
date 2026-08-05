import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Card } from '../components/Card'
import { Button } from '../components/Button'
import { RotatingBackdrop } from '../components/RotatingBackdrop'
import { usePreferencesContext } from '../context/PreferencesContext'
import { exportAllData, deleteAllData } from '../lib/storage'

function downloadJSON(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function Settings() {
  const { preferences, updatePreferences } = usePreferencesContext()
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const navigate = useNavigate()

  function handleExport() {
    const data = exportAllData()
    downloadJSON(data, `crucible-export-${new Date().toISOString().slice(0, 10)}.json`)
  }

  function handleDelete() {
    deleteAllData()
    setConfirmingDelete(false)
    navigate('/app/reflect')
    window.location.reload()
  }

  return (
    <>
      <RotatingBackdrop />
      <div className="relative z-[1] px-6 pb-10 pt-8">
        <button
          type="button"
          onClick={() => navigate('/app/profile')}
          className="mb-5 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-parchment-500 hover:text-forge-ember"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Profile
        </button>

        <header className="mb-6">
          <h1 className="font-display text-2xl font-medium text-parchment-900">Settings</h1>
        </header>

        <Card className="p-4">
          <p className="mb-3 font-display text-[13px] italic text-forge-ember">Reading</p>

          <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-parchment-500">Font size</p>
          <div className="mb-4 flex gap-1 rounded-lg border border-parchment-300/70 bg-parchment-200 p-1">
            {(['normal', 'large'] as const).map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => updatePreferences({ fontSize: size })}
                className={`flex-1 rounded-md px-3 py-1.5 text-xs capitalize transition-colors ${
                  preferences.fontSize === size ? 'bg-forge-ember font-semibold text-parchment-50' : 'text-parchment-700'
                }`}
              >
                {size}
              </button>
            ))}
          </div>

          <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-parchment-500">Reading width</p>
          <div className="flex gap-1 rounded-lg border border-parchment-300/70 bg-parchment-200 p-1">
            {(['comfortable', 'wide'] as const).map((width) => (
              <button
                key={width}
                type="button"
                onClick={() => updatePreferences({ readingWidth: width })}
                className={`flex-1 rounded-md px-3 py-1.5 text-xs capitalize transition-colors ${
                  preferences.readingWidth === width ? 'bg-forge-ember font-semibold text-parchment-50' : 'text-parchment-700'
                }`}
              >
                {width}
              </button>
            ))}
          </div>
        </Card>

        <Card className="mt-3 p-4">
          <p className="mb-3 font-display text-[13px] italic text-forge-ember">Accessibility</p>
          <button
            type="button"
            onClick={() => updatePreferences({ reduceMotion: !preferences.reduceMotion })}
            className="flex w-full items-center justify-between"
          >
            <span className="text-sm text-parchment-800">Reduce motion</span>
            <span
              className="relative h-6 w-11 rounded-full transition-colors"
              style={{ background: preferences.reduceMotion ? 'var(--color-forge-ember)' : 'var(--color-parchment-300)' }}
            >
              <span
                className="absolute top-0.5 h-5 w-5 rounded-full bg-parchment-50 transition-transform"
                style={{ transform: preferences.reduceMotion ? 'translateX(22px)' : 'translateX(2px)' }}
              />
            </span>
          </button>
        </Card>

        <Card className="mt-3 p-4">
          <p className="mb-1 font-display text-[13px] italic text-forge-ember">Privacy</p>
          <p className="mb-3 text-sm text-parchment-800">Your reflections belong only to you.</p>

          <Button variant="ghost" className="w-full" onClick={handleExport}>
            Export all data
          </Button>

          {!confirmingDelete ? (
            <Button
              variant="ghost"
              className="mt-2 w-full border-rose-300 text-rose-700 hover:bg-rose-50"
              onClick={() => setConfirmingDelete(true)}
            >
              Delete all data
            </Button>
          ) : (
            <div className="mt-2 rounded-xl border border-rose-300 bg-rose-50 p-3.5">
              <p className="mb-3 text-sm text-rose-700">Delete permanently? This cannot be undone.</p>
              <div className="flex gap-2">
                <Button className="flex-1" style={{ background: '#be123c' }} onClick={handleDelete}>
                  Delete everything
                </Button>
                <Button variant="ghost" className="flex-1" onClick={() => setConfirmingDelete(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </>
  )
}
