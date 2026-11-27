import { Router } from 'express'
import { structured } from '../claude.js'
import { PHILOSOPHERS, philosopherById } from '../data/philosophers.js'
import { styleBlock } from '../preferences.js'
import { AUTHENTICITY_RULES } from '../authenticity.js'

/**
 * Thought experiments: the scene, choices and twist are written in advance
 * on the client. This route only reads the visitor's two choices and has
 * two philosophers respond to them, so it stays fast and cheap.
 */
export const experimentsRouter = Router()

const PHILOSOPHER_IDS = PHILOSOPHERS.map((p) => p.id)
const str = (v: unknown, max: number) => (typeof v === 'string' && v.trim() && v.length <= max ? v.trim() : null)

interface ReactResult {
  reading: string
  reactions: { philosopherId: string; text: string }[]
  question: string
}

experimentsRouter.post('/react', async (req, res) => {
  const b = req.body ?? {}
  const title = str(b.title, 120)
  const setup = str(b.setup, 1500)
  const question = str(b.question, 300)
  const choice = str(b.choice, 300)
  const twist = str(b.twist, 1500)
  const twistQuestion = str(b.twistQuestion, 300)
  const twistChoice = str(b.twistChoice, 300)
  const why = typeof b.why === 'string' ? b.why.trim().slice(0, 800) : ''
  if (!title || !setup || !question || !choice || !twist || !twistQuestion || !twistChoice) {
    res.status(400).json({ error: 'the experiment and both choices are required' })
    return
  }
  const suggested = (Array.isArray(b.thinkers) ? b.thinkers : []).filter((id: unknown) => typeof id === 'string' && philosopherById(id as string)).slice(0, 4)
  const list = PHILOSOPHERS.map((p) => `${p.id}: ${p.name} — ${p.framework}`).join('\n')

  try {
    const result = await structured<ReactResult>({
      system: `You are the host of a thought experiment in a philosophy app. The visitor has just played "${title}" and made two choices. Respond to THEIR choices, specifically.

Write:
- reading: 2-3 sentences on what their pair of choices reveals about how they think. Notice especially whether their second answer is consistent with their first, and if it shifted, name the principle that seems to have made the difference. Be warm, sharp and honest; never flattering, never preachy. Address them as "you".
- reactions: exactly two philosophers from the list who would respond to these choices differently from each other (one broadly agreeing, one pressing back is ideal). Each speaks in first person to the visitor, 40-70 words, in their own voice, grounded in what they actually held.${suggested.length ? ` Prefer from: ${suggested.join(', ')}.` : ''}
- question: one short question that would push the visitor's thinking one step further.
${AUTHENTICITY_RULES}
${styleBlock(b.language, b.depth)}`,
      prompt: `The experiment: ${setup}
First question: ${question}
They chose: "${choice}"
The twist: ${twist}
Then: ${twistQuestion}
They chose: "${twistChoice}"${why ? `\nIn their own words: "${why}"` : ''}

Philosophers:
${list}`,
      toolName: 'respond_to_choices',
      toolDescription: 'Records the reading of the visitor\'s choices and two philosophers\' responses.',
      schema: {
        type: 'object',
        properties: {
          reading: { type: 'string' },
          reactions: {
            type: 'array',
            minItems: 2,
            maxItems: 2,
            items: {
              type: 'object',
              properties: { philosopherId: { type: 'string', enum: PHILOSOPHER_IDS }, text: { type: 'string' } },
              required: ['philosopherId', 'text'],
            },
          },
          question: { type: 'string' },
        },
        required: ['reading', 'reactions', 'question'],
      },
      maxTokens: 900,
    })
    const reactions = (result.reactions ?? []).filter((r) => philosopherById(r.philosopherId) && r.text?.trim()).slice(0, 2)
    if (!result.reading || !reactions.length) throw new Error('incomplete')
    res.json({ reading: result.reading, reactions, question: result.question ?? '' })
  } catch (err) {
    console.error('experiments/react failed', err)
    res.status(502).json({ error: 'Claude request failed' })
  }
})

