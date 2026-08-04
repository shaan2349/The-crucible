import { Router } from 'express'
import { structured } from '../claude.js'

export const trainRouter = Router()

const LEVELS = ['easy', 'medium', 'hard'] as const
const DIRECTIONS = ['forward', 'reverse'] as const

function isLevel(v: unknown): v is (typeof LEVELS)[number] {
  return typeof v === 'string' && (LEVELS as readonly string[]).includes(v)
}
function isDirection(v: unknown): v is (typeof DIRECTIONS)[number] {
  return typeof v === 'string' && (DIRECTIONS as readonly string[]).includes(v)
}

/* --------------------------------- generate -------------------------------- */

interface ForwardChallenge {
  topic: string
  passage: string
}
interface ReverseChallenge {
  conclusion: string
}

trainRouter.post('/generate', async (req, res) => {
  const { level, direction } = req.body ?? {}
  if (!isLevel(level)) return res.status(400).json({ error: 'level must be easy, medium, or hard' })
  if (!isDirection(direction)) return res.status(400).json({ error: 'direction must be forward or reverse' })

  try {
    if (direction === 'forward') {
      const result = await structured<ForwardChallenge>({
        system:
          'Write an ORIGINAL short persuasive passage (80-150 words, op-ed or speech style) arguing for a ' +
          'real-world position, entirely in your own words — do not quote, closely paraphrase, or imitate ' +
          'the specific wording of any real, identifiable speech, article, or public figure. Embed 2-4 ' +
          `premises leading to a conclusion; at least one premise should be implicit/unstated. Difficulty: ${level}.`,
        prompt: 'Generate a new challenge now, on a fresh topic.',
        toolName: 'record_challenge',
        toolDescription: 'Records the generated passage and its topic label.',
        schema: {
          type: 'object',
          properties: {
            topic: { type: 'string', description: 'Short topic label' },
            passage: { type: 'string' },
          },
          required: ['topic', 'passage'],
        },
        maxTokens: 500,
      })
      res.json({ direction, ...result })
    } else {
      const result = await structured<ReverseChallenge>({
        system:
          'Generate a single provocative conclusion/claim on a real-world topic for a student to construct ' +
          `a supporting argument for. Difficulty: ${level}.`,
        prompt: 'Generate a new conclusion now, on a fresh topic.',
        toolName: 'record_conclusion',
        toolDescription: 'Records the generated conclusion.',
        schema: {
          type: 'object',
          properties: { conclusion: { type: 'string' } },
          required: ['conclusion'],
        },
        maxTokens: 150,
      })
      res.json({ direction, ...result })
    }
  } catch (err) {
    console.error('train/generate failed', err)
    res.status(502).json({ error: 'Claude request failed' })
  }
})

/* ---------------------------------- score ---------------------------------- */

interface ForwardScoreResult {
  score: number
  trueConclusion: string
  truePremises: string[]
  feedback: string
}
interface ReverseScoreResult {
  score: number
  feedback: string
}

trainRouter.post('/score', async (req, res) => {
  const { direction, passage, conclusion, userConclusion, userPremises } = req.body ?? {}
  if (!isDirection(direction)) return res.status(400).json({ error: 'direction must be forward or reverse' })
  if (!Array.isArray(userPremises) || !userPremises.some((p) => typeof p === 'string' && p.trim())) {
    return res.status(400).json({ error: 'userPremises is required' })
  }
  const premisesText = userPremises
    .filter((p): p is string => typeof p === 'string' && p.trim().length > 0)
    .map((p, i) => `${i + 1}. ${p}`)
    .join('\n')

  try {
    if (direction === 'forward') {
      if (typeof passage !== 'string' || !passage.trim()) return res.status(400).json({ error: 'passage is required' })
      const result = await structured<ForwardScoreResult>({
        system:
          'Given this passage and the user\'s attempted extraction of its premises and conclusion, evaluate ' +
          'accuracy. Note what they got right, what they missed — especially any implicit/hidden premise — ' +
          'and give a score out of 5. Be specific and encouraging but honest.',
        prompt: `Passage: "${passage}"\n\nUser's extracted conclusion: "${userConclusion ?? ''}"\nUser's extracted premises:\n${premisesText}`,
        toolName: 'record_score',
        toolDescription: 'Records the score and feedback.',
        schema: {
          type: 'object',
          properties: {
            score: { type: 'integer', minimum: 0, maximum: 5 },
            trueConclusion: { type: 'string' },
            truePremises: { type: 'array', items: { type: 'string' } },
            feedback: { type: 'string' },
          },
          required: ['score', 'trueConclusion', 'truePremises', 'feedback'],
        },
        maxTokens: 500,
      })
      res.json(result)
    } else {
      if (typeof conclusion !== 'string' || !conclusion.trim()) return res.status(400).json({ error: 'conclusion is required' })
      const result = await structured<ReverseScoreResult>({
        system:
          "Given this conclusion and the user's constructed premises meant to support it, evaluate whether " +
          'the argument is valid (premises actually lead to the conclusion) and sound (premises are ' +
          'plausible). Give a score out of 5 and specific, honest feedback.',
        prompt: `Conclusion: "${conclusion}"\nUser's premises:\n${premisesText}`,
        toolName: 'record_score',
        toolDescription: 'Records the score and feedback.',
        schema: {
          type: 'object',
          properties: {
            score: { type: 'integer', minimum: 0, maximum: 5 },
            feedback: { type: 'string' },
          },
          required: ['score', 'feedback'],
        },
        maxTokens: 400,
      })
      res.json(result)
    }
  } catch (err) {
    console.error('train/score failed', err)
    res.status(502).json({ error: 'Claude request failed' })
  }
})
