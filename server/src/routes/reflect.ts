import { Router } from 'express'
import { structured } from '../claude.js'
import { PHILOSOPHERS, philosopherById, philosopherVoice } from '../data/philosophers.js'
import { constitutionBlock } from '../data/constitutions.js'
import { styleBlock } from '../preferences.js'
import { AUTHENTICITY_RULES } from '../authenticity.js'

export const reflectRouter = Router()

const PHILOSOPHER_IDS = PHILOSOPHERS.map((p) => p.id)

function badRequest(res: import('express').Response, message: string) {
  res.status(400).json({ error: message })
}

interface TurnInput {
  philosopherId: string
  text: string
}

interface RoundInput {
  round: number
  turns: TurnInput[]
  userMessage: string | null
}

function validRounds(rounds: unknown): rounds is RoundInput[] {
  return (
    Array.isArray(rounds) &&
    rounds.every(
      (r) =>
        r &&
        Array.isArray(r.turns) &&
        r.turns.every((t: unknown) => t && typeof (t as TurnInput).philosopherId === 'string' && typeof (t as TurnInput).text === 'string'),
    )
  )
}

function formatHistory(openings: Record<string, string>, rounds: RoundInput[]): string {
  const openingLines = Object.entries(openings)
    .map(([id, take]) => `${philosopherById(id)?.name ?? id}: ${take}`)
    .join('\n')
  const roundLines = rounds
    .map(
      (r) =>
        `${r.turns.map((t) => `${philosopherById(t.philosopherId)?.name ?? t.philosopherId}: ${t.text}`).join('\n')}${
          r.userMessage ? `\nUser: ${r.userMessage}` : ''
        }`,
    )
    .join('\n\n')
  return `Opening perspectives:\n${openingLines}${roundLines ? `\n\nConversation since:\n${roundLines}` : ''}`
}

/* ------------------------------- begin ------------------------------- */

interface BeginResult {
  philosopherIds: string[]
  openings: { philosopherId: string; take: string }[]
}

reflectRouter.post('/begin', async (req, res) => {
  const situation = typeof req.body?.situation === 'string' ? req.body.situation.trim() : ''
  if (!situation) return badRequest(res, 'situation is required')
  if (situation.length > 2000) return badRequest(res, 'situation is too long')
  const { language, depth } = req.body ?? {}

  const list = PHILOSOPHERS.map((p) => `${p.id}: ${p.name} — ${p.framework}`).join('\n')

  try {
    const result = await structured<BeginResult>({
      system: `You help someone think through a real personal situation — a decision, worry, or uncertainty — by bringing in philosophers who see it genuinely differently from each other. This is NOT a debate: nobody is attacking a claim or extracting premises to challenge. The user should feel helped, not prosecuted.

Choose exactly 2-3 philosophers from the list whose frameworks would lead them to notice DIFFERENT things about this specific situation — not philosophers who'd agree with each other, but who'd genuinely point the user's attention somewhere different (one toward character/habit, one toward authenticity/choice, one toward what's actually controllable, etc. — whatever fits THIS situation, don't force a formula).

For each chosen philosopher, write a short opening take (aim for 15-30 words) that names the specific angle they'd bring to THIS situation — not a debate position, a way of SEEING it. Stay philosophically authentic to their actual framework; do not write generic life-coach language. Example register: "Question whether the safe option reflects genuine choice or fear of choosing yourself" (Kierkegaard) — specific, philosophically grounded, not therapeutic filler.
${AUTHENTICITY_RULES}
${styleBlock(language, depth)}`,
      prompt: `The user's situation: "${situation}"\n\nPhilosophers:\n${list}`,
      toolName: 'begin_reflection',
      toolDescription: 'Records the chosen thinkers and each one\'s opening take on the situation.',
      schema: {
        type: 'object',
        properties: {
          philosopherIds: {
            type: 'array',
            items: { type: 'string', enum: PHILOSOPHER_IDS },
            minItems: 2,
            maxItems: 3,
          },
          openings: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                philosopherId: { type: 'string', enum: PHILOSOPHER_IDS },
                take: { type: 'string', description: 'Their specific angle on this situation, 15-30 words.' },
              },
              required: ['philosopherId', 'take'],
            },
            minItems: 2,
            maxItems: 3,
          },
        },
        required: ['philosopherIds', 'openings'],
      },
      maxTokens: 500,
    })

    const ids = result.philosopherIds.filter((id) => philosopherById(id))
    const openings = result.openings.filter((o) => ids.includes(o.philosopherId))
    res.json({ philosopherIds: ids, openings })
  } catch (err) {
    console.error('reflect/begin failed', err)
    res.status(502).json({ error: 'Claude request failed' })
  }
})

/* ------------------------------ respond ------------------------------- */

interface RespondResult {
  text: string
  spokenText: string
}

reflectRouter.post('/respond', async (req, res) => {
  const { situation, openings, rounds, philosopherId, userMessage, language, depth } = req.body ?? {}
  if (typeof situation !== 'string' || !situation.trim()) return badRequest(res, 'situation is required')
  if (!openings || typeof openings !== 'object') return badRequest(res, 'openings is required')
  if (!validRounds(rounds)) return badRequest(res, 'rounds is required')
  const philosopher = typeof philosopherId === 'string' ? philosopherById(philosopherId) : undefined
  if (!philosopher) return badRequest(res, 'philosopherId is invalid')

  const voice = philosopherVoice(philosopher.id)
  const voiceBlock = voice
    ? `\n\nYour voice, specifically: ${voice.style}\nYour signature move: ${voice.signature}`
    : ''

  try {
    const result = await structured<RespondResult>({
      system: `You are ${philosopher.name} (${philosopher.era}). Framework: ${philosopher.framework}.${voiceBlock}
${constitutionBlock(philosopher.id)}

You are helping the user think through a real personal situation, in the same register you already opened with — this is a conversation, not a debate, and not therapy. Stay a real philosopher: philosophically authentic, specific to your actual framework, never a generic life coach.

Reason through this before writing, but do NOT label these steps in your output — they're structure, not headings:
1. What you see: the real, competing considerations in the user's situation — not just one side.
2. What the other side genuinely gets right: name the strongest case for whatever you are NOT going to land on. Do not strawman it.
3. Where you land: your actual position, grounded specifically in your framework. A real philosopher takes a side — "I understand why that matters, but I still think..." is the right register. Acknowledging the other side is not the same as staying neutral forever.
4. What this means for them: translate your philosophy into something concrete about THEIR actual situation, not a generic version of it.
5. A question, only if one would genuinely move them forward — not required every turn.

Rules:
- Target length 70-130 words, hard maximum 160.
- Speak in first person, in your own register and era.
- Reference what the user actually said, not a generic version of their situation.
- Do not become generic therapy — never "that sounds difficult," "your feelings are valid," "take care of yourself." Warmth is fine; vague affirmation is not the product. You are here to be intellectually useful.
- Do not moralize or lecture. Do not conclude with a summary platitude.
- Also write a spokenText version of the same guidance — shorter sentences, contractions, natural discourse markers, the way you'd actually say it out loud, not read a formal paragraph.
${AUTHENTICITY_RULES}
${styleBlock(language, depth)}`,
      prompt: `Situation: "${situation}"\n\n${formatHistory(openings, rounds)}${
        userMessage ? `\n\nUser just said: "${userMessage}"` : ''
      }`,
      toolName: 'record_reflection_response',
      toolDescription: 'Records this philosopher\'s next response in the conversation.',
      schema: {
        type: 'object',
        properties: {
          text: { type: 'string' },
          spokenText: { type: 'string' },
        },
        required: ['text', 'spokenText'],
      },
      maxTokens: 400,
    })
    res.json(result)
  } catch (err) {
    console.error('reflect/respond failed', err)
    res.status(502).json({ error: 'Claude request failed' })
  }
})

/* ------------------------------- ending -------------------------------- */

interface EndingResult {
  tension: string
  whatMatters: string
  perspectives: { philosopherId: string; summary: string }[]
  question: string
}

reflectRouter.post('/ending', async (req, res) => {
  const { situation, openings, rounds, language, depth } = req.body ?? {}
  if (typeof situation !== 'string' || !situation.trim()) return badRequest(res, 'situation is required')
  if (!openings || typeof openings !== 'object') return badRequest(res, 'openings is required')
  if (!validRounds(rounds)) return badRequest(res, 'rounds is required')

  const ids = Object.keys(openings)

  try {
    const result = await structured<EndingResult>({
      system: `Close a Reflect session honestly — this is NOT a verdict or a winner, it's a summary of real ground covered. Never invent anything the user didn't actually say or that the philosophers didn't actually say. If the conversation was brief, keep every section short and modest rather than padding it out.${styleBlock(language, depth)}`,
      prompt: `Situation: "${situation}"\n\n${formatHistory(openings, rounds)}\n\nWrite:\n1. tension: the main tension in the situation, one or two sentences, grounded in what was actually discussed.\n2. whatMatters: what seems to matter most to the user, based ONLY on what they actually said — if they said very little, keep this modest and honest rather than inventing depth.\n3. perspectives: a very short (one sentence each) summary of each philosopher's strongest point from this conversation.\n4. question: one genuinely open question worth carrying forward — not a rhetorical wrap-up, an actual unresolved question.`,
      toolName: 'record_reflection_ending',
      toolDescription: 'Records the closing summary of the reflection.',
      schema: {
        type: 'object',
        properties: {
          tension: { type: 'string' },
          whatMatters: { type: 'string' },
          perspectives: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                philosopherId: { type: 'string', enum: ids.length > 0 ? ids : PHILOSOPHER_IDS },
                summary: { type: 'string' },
              },
              required: ['philosopherId', 'summary'],
            },
          },
          question: { type: 'string' },
        },
        required: ['tension', 'whatMatters', 'perspectives', 'question'],
      },
      maxTokens: 500,
    })
    res.json(result)
  } catch (err) {
    console.error('reflect/ending failed', err)
    res.status(502).json({ error: 'Claude request failed' })
  }
})
