import { useEffect, useState } from 'react'
import { Shuffle, RotateCcw } from 'lucide-react'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { Loader } from '../components/Loader'
import { RotatingBackdrop } from '../components/RotatingBackdrop'
import { generateChallenge, scoreChallenge, type TrainDirection, type TrainLevel, type TrainGenerateResponse, type TrainScoreResponse } from '../lib/api'
import { loadTrainingStats, saveTrainingStats } from '../lib/storage'

export function Train() {
  const [level, setLevel] = useState<TrainLevel>('easy')
  const [direction, setDirection] = useState<TrainDirection>('forward')
  const [challenge, setChallenge] = useState<TrainGenerateResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [conclusionInput, setConclusionInput] = useState('')
  const [premiseInputs, setPremiseInputs] = useState(['', ''])
  const [feedback, setFeedback] = useState<TrainScoreResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState({ correct: 0, total: 0 })

  useEffect(() => {
    setStats(loadTrainingStats())
  }, [])

  async function generate() {
    setLoading(true)
    setChallenge(null)
    setFeedback(null)
    setError(null)
    setPremiseInputs(['', ''])
    setConclusionInput('')
    try {
      const result = await generateChallenge(level, direction)
      setChallenge(result)
    } catch (e) {
      setError((e as Error)?.message || 'Something went wrong generating the challenge.')
    }
    setLoading(false)
  }

  async function submit() {
    if (!challenge) return
    setLoading(true)
    setError(null)
    try {
      const result = await scoreChallenge({
        direction,
        passage: challenge.passage,
        conclusion: challenge.conclusion,
        userConclusion: conclusionInput,
        userPremises: premiseInputs,
      })
      setFeedback(result)
      const nextStats = { correct: stats.correct + (result.score >= 3 ? 1 : 0), total: stats.total + 1 }
      setStats(nextStats)
      saveTrainingStats(nextStats)
    } catch (e) {
      setError((e as Error)?.message || 'Something went wrong scoring your answer.')
    }
    setLoading(false)
  }

  function updatePremise(i: number, val: string) {
    setPremiseInputs((prev) => {
      const copy = [...prev]
      copy[i] = val
      return copy
    })
  }

  return (
    <>
      <RotatingBackdrop />
      <div className="relative z-[1] px-6 pb-10 pt-8">
        <header className="mb-6">
          <p className="mb-1 font-display text-xs uppercase tracking-[0.15em] text-parchment-500">
            The Study Desk
          </p>
          <h1 className="font-display text-2xl font-medium text-parchment-900">Deconstruction training</h1>
          <p className="mt-1 text-sm text-parchment-600">
            {stats.total > 0
              ? `${stats.correct}/${stats.total} solid extractions so far.`
              : 'Extract hidden premises from real-style arguments, or build one from scratch.'}
          </p>
        </header>

        <div className="flex flex-wrap gap-2">
          <div
            className="flex gap-1 rounded-lg border border-parchment-300/70 bg-parchment-200 p-1"
            style={{ boxShadow: 'var(--shadow-embossed)' }}
          >
            {(['easy', 'medium', 'hard'] as const).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLevel(l)}
                className={`rounded-md px-3 py-1 text-xs capitalize transition-colors ${level === l ? 'bg-forge-ember font-semibold text-parchment-50' : 'text-parchment-700'}`}
              >
                {l}
              </button>
            ))}
          </div>
          <div
            className="flex gap-1 rounded-lg border border-parchment-300/70 bg-parchment-200 p-1"
            style={{ boxShadow: 'var(--shadow-embossed)' }}
          >
            <button
              type="button"
              onClick={() => setDirection('forward')}
              className={`rounded-md px-3 py-1 text-xs transition-colors ${direction === 'forward' ? 'bg-forge-ember font-semibold text-parchment-50' : 'text-parchment-700'}`}
            >
              Deconstruct
            </button>
            <button
              type="button"
              onClick={() => setDirection('reverse')}
              className={`rounded-md px-3 py-1 text-xs transition-colors ${direction === 'reverse' ? 'bg-forge-ember font-semibold text-parchment-50' : 'text-parchment-700'}`}
            >
              Construct
            </button>
          </div>
        </div>

        {!challenge && !loading && !error && (
          <Button className="mt-5" onClick={generate}>
            <Shuffle className="-mt-0.5 mr-1.5 inline h-4 w-4" />
            Generate a challenge
          </Button>
        )}
        {loading && <Loader label="Working…" />}
        {error && !loading && (
          <Card className="mt-5 border-rose-300/70 bg-rose-50 p-4">
            <p className="mb-3 text-sm text-rose-700">Something went wrong: {error}</p>
            <Button onClick={challenge ? submit : generate}>Retry</Button>
          </Card>
        )}

        {challenge && !loading && (
          <div className="mt-5" style={{ animation: 'revealUp 0.4s ease both' }}>
            {direction === 'forward' ? (
              <Card className="relative overflow-hidden p-5">
                <div
                  className="pointer-events-none absolute inset-0 opacity-[0.35]"
                  style={{
                    backgroundImage:
                      'repeating-linear-gradient(180deg, transparent, transparent 27px, rgba(74,61,42,0.08) 28px)',
                  }}
                />
                <p className="relative font-body text-[15px] leading-loose text-parchment-800 first-letter:float-left first-letter:mr-2 first-letter:font-display first-letter:text-5xl first-letter:font-medium first-letter:leading-[0.8] first-letter:text-forge-ember">
                  {challenge.passage}
                </p>
              </Card>
            ) : (
              <Card variant="hero" className="p-5">
                <p className="mb-1.5 font-display text-[13px] italic text-forge-ember">The conclusion</p>
                <p className="font-display text-lg leading-snug text-parchment-900">{challenge.conclusion}</p>
              </Card>
            )}

            {!feedback && (
              <div className="mt-5 space-y-3">
                {direction === 'forward' && (
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-parchment-500">
                      What is the passage's conclusion?
                    </span>
                    <input
                      value={conclusionInput}
                      onChange={(e) => setConclusionInput(e.target.value)}
                      placeholder="Write it here…"
                      className="w-full border-0 border-b-2 border-dashed border-parchment-400 bg-transparent px-1 py-1.5 font-display text-[15px] text-parchment-900 outline-none placeholder:font-body placeholder:italic placeholder:text-parchment-400 focus:border-forge-ember"
                    />
                  </label>
                )}
                {premiseInputs.map((p, i) => (
                  <label key={i} className="block">
                    <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-parchment-500">
                      Premise {i + 1}
                    </span>
                    <input
                      value={p}
                      onChange={(e) => updatePremise(i, e.target.value)}
                      placeholder="Write it here…"
                      className="w-full border-0 border-b-2 border-dashed border-parchment-400 bg-transparent px-1 py-1.5 font-display text-[15px] text-parchment-900 outline-none placeholder:font-body placeholder:italic placeholder:text-parchment-400 focus:border-forge-ember"
                    />
                  </label>
                ))}
                <button
                  type="button"
                  onClick={() => setPremiseInputs((p) => [...p, ''])}
                  className="text-xs text-parchment-500 hover:text-forge-ember"
                >
                  + add another premise
                </button>
                <div className="flex gap-2 pt-2">
                  <Button onClick={submit} disabled={!premiseInputs.some(Boolean)}>
                    Submit
                  </Button>
                  <Button variant="ghost" onClick={generate}>
                    <RotateCcw className="-mt-0.5 mr-1 inline h-3.5 w-3.5" />
                    New challenge
                  </Button>
                </div>
              </div>
            )}

            {feedback && (
              <Card className="mt-5 p-5" style={{ animation: 'revealUp 0.4s ease both' }}>
                <div className="mb-3 flex items-center gap-3">
                  <div
                    className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full font-display text-lg font-bold text-parchment-50"
                    style={{
                      background: 'linear-gradient(155deg, #e8a33d 0%, #c2531d 55%, #8a2a12 100%)',
                      boxShadow: 'var(--shadow-embossed)',
                    }}
                  >
                    {feedback.score}/5
                  </div>
                  <p className="font-display text-sm uppercase tracking-wide text-forge-ember">
                    {feedback.score >= 4 ? 'Sharp reading' : feedback.score >= 3 ? 'Solid attempt' : 'Worth another pass'}
                  </p>
                </div>
                {feedback.trueConclusion && (
                  <p className="mb-1 text-xs text-parchment-600">
                    <span className="font-medium text-parchment-700">Actual conclusion:</span> {feedback.trueConclusion}
                  </p>
                )}
                {feedback.truePremises && (
                  <p className="mb-3 text-xs text-parchment-600">
                    <span className="font-medium text-parchment-700">Actual premises:</span>{' '}
                    {feedback.truePremises.join(' · ')}
                  </p>
                )}
                <p className="text-sm leading-relaxed text-parchment-800">{feedback.feedback}</p>
                <Button className="mt-4" onClick={generate}>
                  Next challenge
                </Button>
              </Card>
            )}
          </div>
        )}
      </div>
    </>
  )
}
