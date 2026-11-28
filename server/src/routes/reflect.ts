import { Router } from 'express'
import { replyChannel } from '../reply.js'
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

/** The Symposium: the user can address one philosopher or the whole table,
 * and philosophers who speak later in a round answer the ones before them. */
function symposiumNote(selfId: string, sameRoundTurns: unknown, addressedTo: unknown): string {
  const turns = Array.isArray(sameRoundTurns)
    ? (sameRoundTurns as TurnInput[]).filter((t) => t && typeof t.philosopherId === 'string' && typeof t.text === 'string')
    : []
  let note = ''
  if (typeof addressedTo === 'string' && addressedTo !== 'all') {
    const target = philosopherById(addressedTo)
    if (target && target.id === selfId) note += '\n\nThe user addressed this to you by name. Answer them directly.'
  }
  if (turns.length) {
    note +=
      `\n\nAlready said at the table this round, just before you:\n${turns
        .map((t) => `${philosopherById(t.philosopherId)?.name ?? t.philosopherId}: ${t.text}`)
        .join('\n')}` +
      '\n\nThis is a live conversation around one table, not separate monologues. Respond to what was just said where it matters: ' +
      'agree and sharpen it, or disagree precisely, then still speak to the user\'s situation. Only attribute to another ' +
      'philosopher what they actually said here or genuinely hold; never invent a position for them. Keep it shorter than a ' +
      'first answer when the point has already been made.'
  }
  return note
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
  // From the Hall of Minds: a chosen thinker joins the table, or (with
  // `only`) sits with the user alone for a one-on-one conversation.
  const withIds: string[] = Array.isArray(req.body?.withIds)
    ? (req.body.withIds as unknown[]).filter((id): id is string => typeof id === 'string' && !!philosopherById(id)).slice(0, 3)
    : []
  const only = req.body?.only === true && withIds.length > 0
  const seatNote = only
    ? `\n\nThis is a one-on-one conversation. Choose ONLY these philosophers, no one else: ${withIds.join(', ')}.`
    : withIds.length
      ? `\n\nThe user has asked for ${withIds.map((id) => philosopherById(id)?.name).join(' and ')} to be at the table: include ${withIds.join(', ')} and choose the rest so the perspectives genuinely differ.`
      : ''

  const list = PHILOSOPHERS.map((p) => `${p.id}: ${p.name} — ${p.framework}`).join('\n')

  try {
    const result = await structured<BeginResult>({
      system: `You help someone think through a real personal situation — a decision, worry, or uncertainty — by bringing in philosophers who see it genuinely differently from each other. This is NOT a debate: nobody is attacking a claim or extracting premises to challenge. The user should feel helped, not prosecuted.

Choose exactly 2-3 philosophers from the list whose frameworks would lead them to notice DIFFERENT things about this specific situation — not philosophers who'd agree with each other, but who'd genuinely point the user's attention somewhere different (one toward character/habit, one toward authenticity/choice, one toward what's actually controllable, etc. — whatever fits THIS situation, don't force a formula).

Then open the conversation the way it would really start at a table: NOT everyone speaks. Only the one philosopher most provoked by what the user said speaks first, and at most one other joins in, usually reacting to the first as much as to the user. The rest stay quiet for now and will come in later. ${only && withIds.length === 1 ? '' : 'Usually one opener is enough; add a second only when they genuinely see it differently.'}

Each opening is spoken to the user, 20-45 words, in that philosopher's own voice: the specific thing they notice about THIS situation, said the way they would say it, often ending with a question back to the user. Stay philosophically authentic to their actual framework; do not write generic life-coach language. Example register (Kierkegaard): "You call one option safe. Safe from what, exactly? I suspect it's safe mostly from the anxiety of choosing yourself. Which of the two would you be choosing, and which would be choosing you?"
${AUTHENTICITY_RULES}
${styleBlock(language, depth)}`,
      prompt: `The user's situation: "${situation}"\n\nPhilosophers:\n${list}${seatNote}`,
      toolName: 'begin_reflection',
      toolDescription: 'Records the chosen thinkers and each one\'s opening take on the situation.',
      schema: {
        type: 'object',
        properties: {
          philosopherIds: {
            type: 'array',
            items: { type: 'string', enum: PHILOSOPHER_IDS },
            minItems: only ? withIds.length : 2,
            maxItems: 3,
          },
          openings: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                philosopherId: { type: 'string', enum: PHILOSOPHER_IDS },
                take: { type: 'string', description: 'What they say first, to the user, 20-45 words.' },
              },
              required: ['philosopherId', 'take'],
            },
            minItems: 1,
            maxItems: 2,
          },
        },
        required: ['philosopherIds', 'openings'],
      },
      maxTokens: 500,
    })

    let ids = result.philosopherIds.filter((id) => philosopherById(id))
    if (only) ids = withIds
    else if (withIds.length) ids = [...withIds, ...ids.filter((id) => !withIds.includes(id))].slice(0, 3)
    const openings = result.openings.filter((o, i, all) => ids.includes(o.philosopherId) && all.findIndex((x) => x.philosopherId === o.philosopherId) === i).slice(0, 2)
    if (!openings.length) throw new Error('no opening')
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
  const { situation, openings, rounds, philosopherId, userMessage, sameRoundTurns, addressedTo, language, depth } = req.body ?? {}
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
      }${symposiumNote(philosopher.id, sameRoundTurns, addressedTo)}`,
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

/* ------------------------------- discuss ------------------------------- */

const MOODS = ['answers', 'agrees', 'disagrees', 'builds', 'questions', 'challenges'] as const
const REACTIONS = ['nods', 'shakes', 'thinks'] as const

interface DiscussResult {
  turns: {
    philosopherId: string
    to: string
    mood: (typeof MOODS)[number]
    text: string
    spokenText: string
    reactions?: { philosopherId: string; reaction: (typeof REACTIONS)[number] }[]
  }[]
}

/** How plain the table's English is, chosen as the user sits down. */
function levelBlock(level: unknown): string {
  if (level === 'simple')
    return '\n\nLANGUAGE: Very plain English, as if talking to a curious 12-year-old. Short sentences, everyday words, no jargon at all. Explain any idea with a quick everyday example instead of a term. Still say something real and true to your philosophy.'
  if (level === 'scholarly')
    return '\n\nLANGUAGE: Full philosophical register. Use the real terms of your tradition where they fit and name your own works or concepts when relevant, as you would with a student of philosophy.'
  return '\n\nLANGUAGE: Everyday conversational English. A technical term only if you explain it in the same breath.'
}

/**
 * The next stretch of a live conversation at the table, written in one go:
 * whoever genuinely has something to say speaks, in turn, answering the user
 * and each other. Not everyone has to speak.
 */
reflectRouter.post('/discuss', async (req, res) => {
  const { situation, openings, rounds, userMessage, addressedTo, philosopherIds, level } = req.body ?? {}
  if (typeof situation !== 'string' || !situation.trim()) return badRequest(res, 'situation is required')
  if (!openings || typeof openings !== 'object') return badRequest(res, 'openings is required')
  if (!validRounds(rounds)) return badRequest(res, 'rounds is required')
  if (typeof userMessage !== 'string' || !userMessage.trim()) return badRequest(res, 'userMessage is required')
  if (userMessage.length > 2000) return badRequest(res, 'userMessage is too long')
  const seated = (Array.isArray(philosopherIds) ? philosopherIds : []).map((id: unknown) => (typeof id === 'string' ? philosopherById(id) : undefined)).filter(Boolean) as NonNullable<ReturnType<typeof philosopherById>>[]
  if (!seated.length || seated.length > 3) return badRequest(res, 'philosopherIds is invalid')
  const target = typeof addressedTo === 'string' && addressedTo !== 'all' ? seated.find((p) => p.id === addressedTo) : undefined

  const cast = seated
    .map((p) => {
      const v = philosopherVoice(p.id)
      return `### ${p.name} (id "${p.id}", ${p.era}). Framework: ${p.framework}.${v ? `\nVoice: ${v.style}\nSignature move: ${v.signature}` : ''}${constitutionBlock(p.id)}`
    })
    .join('\n\n')

  const reply = replyChannel<DiscussResult>(req, res)
  try {
    const result = await structured<DiscussResult>({
      onPartial: reply.onPartial,
      system: `You write the next few moments of a real conversation at a symposium table. Seated with the user:

${cast}

This is a conversation, not a panel of answers. Write what would actually happen next at the table:
- Only those who have something worth saying speak. Often that is one or two people, not everyone. Never give everyone a turn just to be fair.
- If the user spoke to someone by name, that person answers first, and others join only if they genuinely want to add, object or ask. If they spoke to the whole table, whoever is most provoked by what they said goes first.
- They talk to each other as well as to the user: by name, picking up a phrase someone just used, agreeing and sharpening it, or disagreeing precisely. Real friction is good; politeness that hides disagreement is not.
- Each turn is short and spoken: 20 to 70 words, a few sentences, the way people actually talk at a table. No speeches, no lists, no summaries.
- 1 to 4 turns in total. The last turn usually hands the conversation back to the user, often with a pointed question about their actual situation.
- Stay specific to what the user said. Every philosopher stays true to their real views and their own manner of speaking; never put words in someone's mouth that they would not hold.
- Not therapy, not a life coach. Warm but intellectually useful.
- For each turn, "to" is who it is addressed to: "user" or the id of the philosopher being answered. "mood" is what the turn does. "reactions" are how the others at the table visibly respond while it is said (a nod, a shake of the head, or thinking), only where it is clear.
- Write each turn the way it would be said aloud at a table: contractions, natural rhythm.
${AUTHENTICITY_RULES}${levelBlock(level)}`,
      prompt: `Situation the user brought: "${situation}"\n\n${formatHistory(openings, rounds)}\n\nUser just said${target ? ` (to ${target.name})` : ' (to everyone)'}: "${userMessage}"`,
      toolName: 'record_conversation',
      cache: true,
      toolDescription: 'Records the next turns of the conversation at the table.',
      schema: {
        type: 'object',
        properties: {
          turns: {
            type: 'array',
            minItems: 1,
            maxItems: 4,
            items: {
              type: 'object',
              properties: {
                philosopherId: { type: 'string', enum: seated.map((p) => p.id) },
                to: { type: 'string', enum: ['user', ...seated.map((p) => p.id)] },
                mood: { type: 'string', enum: [...MOODS] },
                text: { type: 'string' },
                reactions: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      philosopherId: { type: 'string', enum: seated.map((p) => p.id) },
                      reaction: { type: 'string', enum: [...REACTIONS] },
                    },
                    required: ['philosopherId', 'reaction'],
                  },
                },
              },
              required: ['philosopherId', 'to', 'mood', 'text'],
            },
          },
        },
        required: ['turns'],
      },
      maxTokens: 900,
    })
    const ids = new Set(seated.map((p) => p.id))
    const turns = (result.turns ?? [])
      .filter((t) => t && ids.has(t.philosopherId) && typeof t.text === 'string' && t.text.trim())
      .slice(0, 4)
      .map((t) => ({
        philosopherId: t.philosopherId,
        to: t.to === 'user' || (ids.has(t.to) && t.to !== t.philosopherId) ? t.to : 'user',
        mood: MOODS.includes(t.mood) ? t.mood : 'answers',
        text: t.text.trim(),
        spokenText: t.text.trim(),
        reactions: (t.reactions ?? []).filter((r) => r && ids.has(r.philosopherId) && r.philosopherId !== t.philosopherId && REACTIONS.includes(r.reaction)),
      }))
    if (!turns.length) throw new Error('no turns')
    reply.done({ turns })
  } catch (err) {
    console.error('reflect/discuss failed', err)
    reply.fail(502, 'Claude request failed')
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
