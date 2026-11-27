import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight } from '../night/icons'
import { loadDebates, loadInterests, loadOracleDays, loadReflectSessions } from '../lib/storage'
import { endingOf, ENDING_COPY } from '../temple/ending'
import { NIGHT as C, NIGHT_FONT as F } from '../night/theme'
import { NightPage, Panel } from '../night/NightPage'

/** Your seat in the sanctuary: what you have done here so far, and the way to Settings. */
export function Profile() {
  const navigate = useNavigate()
  const [stats] = useState(() => {
    const debates = loadDebates().filter((d) => d.premises?.length)
    const counts = { victory: 0, reshaped: 0, contested: 0, collapse: 0, untested: 0 }
    debates.forEach((d) => (counts[endingOf(d)] += 1))
    return {
      temples: debates.length,
      lamps: loadReflectSessions().length,
      oracle: loadOracleDays().filter((d) => d.answer).length,
      counts,
      interests: loadInterests(),
    }
  })
  const nothing = stats.temples + stats.lamps + stats.oracle === 0

  return (
    <NightPage title="Your seat" eyebrow="WHAT YOU HAVE DONE HERE">
      <div className="grid grid-cols-3 gap-2.5">
        {[
          ['Temples', stats.temples, '/app/landscape'],
          ['Lamps', stats.lamps, '/app/landscape'],
          ['Oracle answers', stats.oracle, '/app/oracle'],
        ].map(([label, n, to]) => (
          <button key={label as string} type="button" onClick={() => navigate(to as string)} className="panel-stone night-btn flex flex-col items-center gap-1 rounded px-2 py-4" style={{ background: 'rgba(17,20,26,.85)', border: `1px solid ${C.line}` }}>
            <span style={{ fontFamily: F.display, fontSize: 32, lineHeight: 1, color: C.ivory }}>{n as number}</span>
            <span style={{ fontFamily: F.inscr, fontSize: 9.5, fontWeight: 600, letterSpacing: '.18em', color: C.gilt }}>{(label as string).toUpperCase()}</span>
          </button>
        ))}
      </div>

      {nothing ? (
        <p className="m-0 text-center" style={{ fontFamily: F.read, fontStyle: 'italic', color: C.muted }}>
          Nothing yet. Every belief you test raises a temple; every conversation leaves a lamp.
        </p>
      ) : (
        stats.temples > 0 && (
          <Panel label="HOW YOUR BELIEFS HAVE FARED">
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {(Object.keys(stats.counts) as (keyof typeof stats.counts)[])
                .filter((k) => stats.counts[k] > 0)
                .map((k) => (
                  <li key={k} className="flex items-baseline justify-between">
                    <span style={{ fontFamily: F.inscr, fontSize: 11, fontWeight: 600, letterSpacing: '.16em', color: C.body }}>{ENDING_COPY[k].eyebrow}</span>
                    <span style={{ fontFamily: F.display, fontSize: 20, color: ENDING_COPY[k].color }}>{stats.counts[k]}</span>
                  </li>
                ))}
            </ul>
          </Panel>
        )
      )}

      {stats.interests.length > 0 && (
        <Panel label="WHAT DRAWS YOU IN">
          <p className="m-0" style={{ fontFamily: F.read, color: C.body }}>{stats.interests.join(' · ')}</p>
        </Panel>
      )}

      <button type="button" onClick={() => navigate('/app/settings')} className="panel-stone night-btn flex min-h-[56px] w-full items-center justify-between rounded px-4" style={{ background: 'rgba(17,20,26,.85)', border: `1px solid ${C.lineStrong}` }}>
        <span className="flex flex-col items-start">
          <span style={{ fontFamily: F.display, fontSize: 18 }}>Settings</span>
          <span style={{ fontSize: 13, color: C.muted }}>How they speak, voice, motion, your data</span>
        </span>
        <ChevronRight className="h-5 w-5" style={{ color: C.gilt }} />
      </button>
    </NightPage>
  )
}
