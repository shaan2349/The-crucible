import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePreferencesContext } from '../context/PreferencesContext'
import { exportAllData, deleteAllData } from '../lib/storage'
import { NIGHT as C, NIGHT_FONT as F } from '../night/theme'
import { Choice, NightPage, Panel, Toggle } from '../night/NightPage'

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
    downloadJSON(exportAllData(), `crucible-export-${new Date().toISOString().slice(0, 10)}.json`)
  }

  function handleDelete() {
    deleteAllData()
    setConfirmingDelete(false)
    navigate('/app')
    window.location.reload()
  }

  return (
    <NightPage title="Settings" eyebrow="YOUR SEAT" back="/app/profile" backLabel="Back to your seat">
      <Panel label="HOW THE PHILOSOPHERS SPEAK">
        <p className="m-0" style={{ fontSize: 13.5, color: C.muted }}>The default everywhere. At the Symposium you can still choose each time you sit down.</p>
        <Choice
          label="Language"
          value={preferences.language}
          onChange={(language) => updatePreferences({ language })}
          options={[
            { id: 'simple', name: 'Simple' },
            { id: 'standard', name: 'Everyday' },
            { id: 'scholarly', name: 'Philosophical' },
          ]}
        />
        <Choice
          label="Length"
          value={preferences.depth}
          onChange={(depth) => updatePreferences({ depth })}
          options={[
            { id: 'quick', name: 'Short' },
            { id: 'normal', name: 'Normal' },
            { id: 'deep', name: 'Long' },
          ]}
        />
      </Panel>

      <Panel label="VOICE AND MOTION">
        <Toggle label="Read replies aloud" on={preferences.voiceEnabled} onChange={(voiceEnabled) => updatePreferences({ voiceEnabled })} />
        <Toggle label="Reduce motion" on={preferences.reduceMotion} onChange={(reduceMotion) => updatePreferences({ reduceMotion })} />
      </Panel>

      <Panel label="YOUR DATA">
        <p className="m-0" style={{ fontFamily: F.read, color: C.body }}>Everything you write stays on this device. Nothing is sold.</p>
        <button type="button" onClick={handleExport} className="btn-bronze night-btn min-h-[46px] rounded border" style={{ borderColor: C.lineStrong, color: '#E9D5A6' }}>
          Export all data
        </button>
        {!confirmingDelete ? (
          <button type="button" onClick={() => setConfirmingDelete(true)} className="night-btn min-h-[46px] rounded border" style={{ borderColor: 'rgba(224,122,98,.5)', color: C.ember }}>
            Delete all data
          </button>
        ) : (
          <div className="flex flex-col gap-2.5 rounded p-3" style={{ border: `1px solid ${C.ember}` }}>
            <p className="m-0" style={{ color: C.ember }}>Delete every temple, lamp and answer permanently? This cannot be undone.</p>
            <div className="flex gap-2">
              <button type="button" onClick={handleDelete} className="night-btn min-h-[44px] flex-1 rounded" style={{ background: C.ember, color: C.night, fontWeight: 600 }}>
                Delete everything
              </button>
              <button type="button" onClick={() => setConfirmingDelete(false)} className="btn-bronze night-btn min-h-[44px] flex-1 rounded border" style={{ borderColor: C.lineStrong, color: C.body }}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </Panel>
    </NightPage>
  )
}
