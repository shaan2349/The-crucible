import { useEffect, useState } from 'react'
import { Shuffle, RotateCcw } from 'lucide-react'
import { Button } from '../components/Button'
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
        <h1 className="font-display text-2xl font-medium text-parchment-900">Deconstruction training</h1>
        <p className="mt-1 text-sm text-parchment-600">
          {stats.total > 0
            ? `${stats.correct}/${stats.total} solid extractions so far.`
            : 'Extract hidden premises from real-style arguments, or build one from scratch.'}
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        <div className="flex gap-1 rounded-lg border border-parchment-300 bg-parchment-200 p-1">
          {(['easy', 'medium', 'hard'] as const).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLevel(l)}
              className={`rounded-md px-3 py-1 text-xs capitalize ${level === l ? 'bg-forge-ember font-semibold text-parchment-50' : 'text-parchment-700'}`}
            >
              {l}
            </button>
          ))}
        </div>
        <div className="flex gap-1 rounded-lg border border-parchment-300 bg-parchment-200 p-1">
          <button
            type="button"
            onClick={() => setDirection('forward')}
            className={`rounded-md px-3 py-1 text-xs ${direction === 'forward' ? 'bg-forge-ember font-semibold text-parchment-50' : 'text-parchment-700'}`}
          >
            Deconstruct
          </button>
          <button
            type="button"
            onClick={() => setDirection('reverse')}
            className={`rounded-md px-3 py-1 text-xs ${direction === 'reverse' ? 'bg-forge-ember font-semibold text-parchment-50' : 'text-parchment-700'}`}
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
        <div className="mt-5 rounded-xl border border-rose-300 bg-rose-50 p-4">
          <p className="mb-3 text-sm text-rose-700">Something went wrong: {error}</p>
          <Button onClick={challenge ? submit : generate}>Retry</Button>
        </div>
      )}

      {challenge && !loading && (
        <div className="mt-5">
          {direction === 'forward' ? (
            <div className="rounded-xl border border-parchment-300 bg-parchment-50 p-4 text-sm leading-relaxed text-parchment-800">
              {challenge.passage}
            </div>
          ) : (
            <div className="rounded-xl border border-parchment-300 bg-parchment-50 p-4 text-sm font-medium text-parchment-900">
              {challenge.conclusion}
            </div>
          )}

          {!feedback && (
            <div className="mt-4 space-y-2">
              {direction === 'forward' && (
                <input
                  value={conclusionInput}
                  onChange={(e) => setConclusionInput(e.target.value)}
                  placeholder="What is the passage's conclusion?"
                  className="w-full rounded-lg border border-parchment-300 bg-parchment-50 px-3 py-2 text-sm text-parchment-900 outline-none focus:border-forge-ember"
                />
              )}
              {premiseInputs.map((p, i) => (
                <input
                  key={i}
                  value={p}
                  onChange={(e) => updatePremise(i, e.target.value)}
                  placeholder={`Premise ${i + 1}`}
                  className="w-full rounded-lg border border-parchment-300 bg-parchment-50 px-3 py-2 text-sm text-parchment-900 outline-none focus:border-forge-ember"
                />
              ))}
              <button
                type="button"
                onClick={() => setPremiseInputs((p) => [...p, ''])}
                className="text-xs text-parchment-500 hover:text-forge-ember"
              >
                + add another premise
              </button>
              <div className="flex gap-2 pt-1">
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
            <div className="mt-4 rounded-xl border border-forge-gold/50 bg-side-gold-soft/40 p-4">
              <p className="mb-2 text-sm font-semibold text-forge-ember">Score: {feedback.score}/5</p>
              {feedback.trueConclusion && (
                <p className="mb-1 text-xs text-parchment-700">Actual conclusion: {feedback.trueConclusion}</p>
              )}
              {feedback.truePremises && (
                <p className="mb-2 text-xs text-parchment-700">
                  Actual premises: {feedback.truePremises.join(' · ')}
                </p>
              )}
              <p className="text-sm leading-relaxed text-parchment-800">{feedback.feedback}</p>
              <Button className="mt-3" onClick={generate}>
                Next challenge
              </Button>
            </div>
          )}
        </div>
      )}
      </div>
    </>
  )
}
