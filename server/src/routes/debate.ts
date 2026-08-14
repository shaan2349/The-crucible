import { Router } from 'express'
import { structured } from '../claude.js'
import { PHILOSOPHERS, philosopherById, philosopherVoice } from '../data/philosophers.js'
import { styleBlock } from '../preferences.js'

export const debateRouter = Router()

const PHILOSOPHER_IDS = PHILOSOPHERS.map((p) => p.id)
const PREMISE_STATUSES = ['standing', 'weakened', 'conceded'] as const

function badRequest(res: import('express').Response, message: string) {
  res.status(400).json({ error: message })
}

interface PremiseInput {
  id: string
  text: string
  status?: string
}

function validPremises(premises: unknown): premises is PremiseInput[] {
  return (
    Array.isArray(premises) &&
    premises.length > 0 &&
    premises.every((p) => p && typeof p.id === 'string' && typeof p.text === 'string')
  )
}

/* --------------------------- select opponents --------------------------- */

interface SelectOpponentsResult {
  ids: string[]
}

debateRouter.post('/select-opponents', async (req, res) => {
  const claim = typeof req.body?.claim === 'string' ? req.body.claim.trim() : ''
  if (!claim) return badRequest(res, 'claim is required')
  if (claim.length > 2000) return badRequest(res, 'claim is too long')

  const list = PHILOSOPHERS.map((p) => `${p.id}: ${p.name} — ${p.framework}`).join('\n')

  try {
    const result = await structured<SelectOpponentsResult>({
      system:
        "You select debate opponents for a philosophy app. Given the user's position, choose exactly 2 " +
        'philosophers from the provided list whose frameworks most directly and interestingly conflict ' +
        'with the position, ideally from different traditions.',
      prompt: `Position: "${claim}"\n\nPhilosophers:\n${list}`,
      toolName: 'select_opponents',
      toolDescription: 'Records the two chosen philosopher ids.',
      schema: {
        type: 'object',
        properties: {
          ids: {
            type: 'array',
            items: { type: 'string', enum: PHILOSOPHER_IDS },
            minItems: 2,
            maxItems: 2,
          },
        },
        required: ['ids'],
      },
      maxTokens: 128,
    })

    const ids = result.ids.filter((id) => philosopherById(id)).slice(0, 2)
    if (ids.length !== 2) throw new Error('model did not return two valid ids')
    res.json({ ids })
  } catch (err) {
    console.error('select-opponents failed', err)
    res.status(502).json({ error: 'Claude request failed' })
  }
})

/* --------------------------------- decompose ------------------------------ */

interface DecomposeResult {
  conclusion: string
  premises: { id: string; text: string }[]
}

debateRouter.post('/decompose', async (req, res) => {
  const claim = typeof req.body?.claim === 'string' ? req.body.claim.trim() : ''
  if (!claim) return badRequest(res, 'claim is required')
  if (claim.length > 2000) return badRequest(res, 'claim is too long')

  try {
    const result = await structured<DecomposeResult>({
      system:
        "Break the user's stated position into a formal conclusion and 2-4 supporting premises implied " +
        'by it, made explicit and precise, in their spirit. Extract ONLY the position they actually ' +
        "asserted — if their text describes a situation without clearly staking a claim, reconstruct the " +
        "specific stance they're leaning toward from their own wording, but do not silently hand them the " +
        'strongest or most correct version of it.',
      prompt: `Position: "${claim}"`,
      toolName: 'record_breakdown',
      toolDescription: 'Records the formal conclusion and its supporting premises.',
      schema: {
        type: 'object',
        properties: {
          conclusion: { type: 'string' },
          premises: {
            type: 'array',
            minItems: 2,
            maxItems: 4,
            items: {
              type: 'object',
              properties: {
                id: { type: 'string', description: "e.g. 'p1', 'p2'" },
                text: { type: 'string' },
              },
              required: ['id', 'text'],
            },
          },
        },
        required: ['conclusion', 'premises'],
      },
      maxTokens: 512,
    })
    res.json(result)
  } catch (err) {
    console.error('decompose failed', err)
    res.status(502).json({ error: 'Claude request failed' })
  }
})

/* ---------------------------------- attack --------------------------------- */

interface AttackResult {
  targetPremiseId: string
  text: string
  spokenText: string
}

debateRouter.post('/attack', async (req, res) => {
  const { claim, conclusion, premises, philosopherId, priorRounds, sameRoundAttacks, language, depth } = req.body ?? {}
  if (typeof claim !== 'string' || !claim.trim()) return badRequest(res, 'claim is required')
  if (typeof conclusion !== 'string' || !conclusion.trim()) return badRequest(res, 'conclusion is required')
  if (!validPremises(premises)) return badRequest(res, 'premises is required')
  const philosopher = typeof philosopherId === 'string' ? philosopherById(philosopherId) : undefined
  if (!philosopher) return badRequest(res, 'philosopherId is invalid')

  const priorText = Array.isArray(priorRounds)
    ? priorRounds
        .map((r: { round: number; userResponse: string | null }) => `Round ${r.round} user response: ${r.userResponse || '(none yet)'}`)
        .join('\n')
    : ''

  const sameRoundText = Array.isArray(sameRoundAttacks)
    ? sameRoundAttacks
        .map((a: { philosopherId: string; text: string }) => `${philosopherById(a.philosopherId)?.name ?? a.philosopherId}: ${a.text}`)
        .join('\n')
    : ''

  const voice = philosopherVoice(philosopher.id)
  const voiceBlock = voice
    ? `

Your voice, specifically: ${voice.style}
You would never say things like: ${voice.neverSays.map((s) => `"${s}"`).join(', ')} — these are generic modern clichés no historical thinker in your position would reach for.
Your signature move: ${voice.signature}`
    : ''

  try {
    const result = await structured<AttackResult>({
      system: `You are ${philosopher.name} (${philosopher.era}). Framework: ${philosopher.framework}. Your characteristic mode of challenge: ${philosopher.attack}.${voiceBlock}

You are not trying to defeat the user — you are a real thinker in a live conversation, probing whether their reasoning holds. Expose the assumption hiding in their premise, or ask the question that forces them to defend it more precisely, the way you'd actually needle a student or a rival across a table. A strong response often ends by putting the ball back in their court — a pointed question, a demand they clarify a term — rather than delivering a closing argument.

Rules for your response:
- Target length 60-110 words, hard maximum 140. This is one conversational turn, not an essay — do ONE thing (question an assumption, offer an alternative, clarify a distinction, challenge another philosopher, or ask the user something important), not several things at once.
- Somewhere in your response, work in the exact wording or a close paraphrase (2-6 words) of the specific premise you're challenging, so it's clear you engaged with their specific claim — but do NOT make this the first words of your response every time. Vary where it lands: sometimes open with a challenge or a question instead, and fold the quote in mid-response.
- Name at least one specific concept, term, or text genuinely associated with you (e.g. Kant would say "categorical imperative", Rawls would say "veil of ignorance", Nietzsche would say "ressentiment"). A response with no specific terminology is a failure.
- Do NOT write generic philosophical pushback that any philosopher could have said about any topic. Your objection must depend on the actual content of THIS premise.
- Target exactly one premise, and be precise about which exact word or claim in it is the problem.
- Speak in first person, in a register that fits your era and temperament (e.g. Nietzsche is provocative and cutting; Kant is precise and formal; Confucius is measured).
- Match your depth to how the user has actually been engaging (see their prior responses below): if their answers have been short and simple, ask something equally direct and concrete rather than escalating complexity on them; if they've engaged substantively, you may go deeper. If their most recent response was "I don't know" or similar uncertainty, treat that as a real, meaningful answer worth building on — help them locate WHY it's unclear (missing evidence vs. an unclear principle), don't press harder as if they dodged the question.
${sameRoundText ? "- Another thinker has already spoken this round (see below). This is a live discussion between you, not parallel monologues — agree with a caveat, sharpen their point, or directly and specifically contest what THEY said, not just the user's original premise." : ''}${styleBlock(language, depth)}`,
      prompt: `User's original position: "${claim}"\nConclusion: ${conclusion}\nPremises:\n${premises
        .map((pr) => `${pr.id}: ${pr.text} [current status: ${pr.status ?? 'standing'}]`)
        .join('\n')}\n\nPrior rounds:\n${priorText || '(this is round 1)'}${
        sameRoundText ? `\n\nAlready said this round, before you:\n${sameRoundText}` : ''
      }`,
      toolName: 'record_attack',
      toolDescription: 'Records which premise is challenged and the philosopher\'s in-character, in-voice response.',
      schema: {
        type: 'object',
        properties: {
          targetPremiseId: { type: 'string', enum: premises.map((p) => p.id) },
          text: {
            type: 'string',
            description: 'The formal written response, as displayed on screen. Full sentences, precise wording.',
          },
          spokenText: {
            type: 'string',
            description:
              "The SAME argument, rewritten for speech, not read aloud verbatim from `text`. Use shorter sentences, contractions (\"that's\", \"you're\", \"can't\"), natural discourse markers (\"But\", \"Look,\", \"Now,\"), the occasional sentence fragment or rhetorical question a real person would actually say out loud, and a little less formal precision than the written version — e.g. instead of \"Your underlying assumption appears to be...\" say something like \"But that assumes something important — why?\" Keep the same intellectual content and the same target premise; do not soften or drop the actual challenge, only its register. No filler words like um/uh/like.",
          },
        },
        required: ['targetPremiseId', 'text', 'spokenText'],
      },
      maxTokens: 450,
    })
    res.json(result)
  } catch (err) {
    console.error('attack failed', err)
    res.status(502).json({ error: 'Claude request failed' })
  }
})

/* --------------------------------- evaluate -------------------------------- */

interface EvaluateResult {
  statuses: { id: string; status: string }[]
}

debateRouter.post('/evaluate', async (req, res) => {
  const { claim, conclusion, premises, lastRoundAttacks, userResponse } = req.body ?? {}
  if (typeof claim !== 'string' || !claim.trim()) return badRequest(res, 'claim is required')
  if (typeof conclusion !== 'string' || !conclusion.trim()) return badRequest(res, 'conclusion is required')
  if (!validPremises(premises)) return badRequest(res, 'premises is required')
  if (typeof userResponse !== 'string' || !userResponse.trim()) return badRequest(res, 'userResponse is required')

  const attacksText = Array.isArray(lastRoundAttacks)
    ? lastRoundAttacks
        .map((a: { philosopherId: string; targetPremiseId: string; text: string }) => {
          const p = philosopherById(a.philosopherId)
          return `${p?.name ?? a.philosopherId} attacked ${a.targetPremiseId}: ${a.text}`
        })
        .join('\n')
    : ''

  try {
    const result = await structured<EvaluateResult>({
      system:
        'You update the state of a philosophical argument tree after the user responded to challenges. ' +
        'Judge based on the SPECIFIC substance of what the user actually wrote — not whether they responded ' +
        'at all, and not the topic in general. For each premise, decide if it now stands (they defended it ' +
        'well), is weakened (their defense was partial or shaky), or is conceded (they effectively agreed ' +
        'or had no real answer).',
      prompt: `Claim: "${claim}"\nConclusion: ${conclusion}\nPremises before response:\n${premises
        .map((pr) => `${pr.id}: ${pr.text} [${pr.status ?? 'standing'}]`)
        .join('\n')}\n\nLatest attacks:\n${attacksText}\n\nUser's response: "${userResponse}"`,
      toolName: 'record_statuses',
      toolDescription: 'Records the updated status of every premise.',
      schema: {
        type: 'object',
        properties: {
          statuses: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string', enum: premises.map((p) => p.id) },
                status: { type: 'string', enum: PREMISE_STATUSES },
              },
              required: ['id', 'status'],
            },
          },
        },
        required: ['statuses'],
      },
      maxTokens: 300,
    })
    res.json(result)
  } catch (err) {
    console.error('evaluate failed', err)
    res.status(502).json({ error: 'Claude request failed' })
  }
})

/* --------------------------------- verdict --------------------------------- */

interface VerdictResult {
  weakestPremiseId: string
  weakestReason: string
  leanedFramework: string
  sharpenedClaim: string
  outcome: string
}

const PARTICIPATION_LEVELS = ['none', 'low', 'full'] as const
type ParticipationLevel = (typeof PARTICIPATION_LEVELS)[number]

const OUTCOME_CATEGORIES = ['REINFORCED', 'REVISED', 'SHIFTED', 'SYNTHESISED', 'UNRESOLVED'] as const

// Honesty is the point of this whole endpoint — the model must never
// describe the user as having leaned on, defended, or been persuaded by
// something they never actually said. What it CAN always speak to is the
// starting claim itself, since that's real regardless of what happened
// (or didn't) afterward.
const PARTICIPATION_INSTRUCTIONS: Record<ParticipationLevel, string> = {
  none: `The user submitted their claim and ended the session WITHOUT responding to a single round — there is no participation to describe. Analyze the STARTING CLAIM AND PREMISES ONLY. Never say the user "leaned on", "relied on", "was persuaded by", "defended", or "argued for" anything — none of that happened. Phrase leanedFramework as what the user's starting claim most resembles (e.g. "Your starting claim was closest to Mill's harm principle"), and weakestReason as a property of the original premises alone (e.g. "the most vulnerable assumption in your starting position"), not something they argued for.`,
  low: `The user responded meaningfully only once or twice, without clearly committing to a changed position. Use cautious, hedged language — "your responses remained closer to…", "you did not clearly adopt either position", "your original view remained largely intact". Do not overstate intellectual change from one or two exchanges.`,
  full: `The user engaged substantially across multiple rounds. Stronger, more direct language is appropriate here IF the transcript actually supports it — e.g. "you leaned increasingly on…", "you rejected [X]'s strongest objection", "your final position moved away from your starting claim". Ground every claim in what the transcript actually shows; do not invent agreement or rejection the user didn't express.`,
}

debateRouter.post('/verdict', async (req, res) => {
  const { claim, conclusion, premises, rounds, participationLevel, language, depth } = req.body ?? {}
  if (typeof claim !== 'string' || !claim.trim()) return badRequest(res, 'claim is required')
  if (typeof conclusion !== 'string' || !conclusion.trim()) return badRequest(res, 'conclusion is required')
  if (!validPremises(premises)) return badRequest(res, 'premises is required')
  if (!Array.isArray(rounds)) return badRequest(res, 'rounds is required')
  if (!PARTICIPATION_LEVELS.includes(participationLevel)) return badRequest(res, 'participationLevel is required')

  const transcript = rounds
    .map(
      (r: { round: number; attacks: { philosopherId: string; text: string }[]; userResponse: string | null }) =>
        `Round ${r.round}:\n${r.attacks
          .map((a) => `${philosopherById(a.philosopherId)?.name ?? a.philosopherId}: ${a.text}`)
          .join('\n')}\nUser: ${r.userResponse?.trim() ? r.userResponse : '(no response given)'}`,
    )
    .join('\n\n')

  try {
    const result = await structured<VerdictResult>({
      system: `Write a short, honest verdict for this philosophical debate. Honesty about what actually happened in the conversation matters more than sounding dramatic or conclusive.${styleBlock(language, depth)}`,
      prompt: `Claim: "${claim}"\nConclusion: ${conclusion}\nFinal premise states:\n${premises
        .map((pr) => `${pr.id}: ${pr.text} [${pr.status ?? 'standing'}]`)
        .join('\n')}\n\nParticipation level: ${participationLevel}\n${PARTICIPATION_INSTRUCTIONS[participationLevel as ParticipationLevel]}\n\nFull transcript:\n${transcript}`,
      toolName: 'record_verdict',
      toolDescription: 'Records the debate verdict.',
      schema: {
        type: 'object',
        properties: {
          weakestPremiseId: { type: 'string', enum: premises.map((p) => p.id) },
          weakestReason: {
            type: 'string',
            description:
              'Which premise proved weakest and why — phrased per the participation-level instructions above. Never imply the user actively defended or argued for a premise they never responded to.',
          },
          leanedFramework: {
            type: 'string',
            description:
              'Which philosopher/school the user\'s position most resembles — phrased per the participation-level instructions above. Only describe this as something the user "leaned on" or was "persuaded by" if the transcript shows real engagement; otherwise describe it as what the starting claim resembles.',
          },
          sharpenedClaim: {
            type: 'string',
            description:
              'A sharpened, more defensible version of their claim. With little or no participation, base this on strengthening the original premises alone, not on a conversation that barely happened.',
          },
          outcome: {
            type: 'string',
            enum: [...OUTCOME_CATEGORIES],
            description: `The overall trajectory of this session, using the full transcript: REINFORCED = user engaged and largely retained their starting position. REVISED = user modified or qualified the original position. SHIFTED = user moved substantially toward another framework. SYNTHESISED = user combined elements from multiple thinkers into a stronger position. UNRESOLVED = user participated but the central issue remained open. Choose based on actual transcript evidence, not assumption.`,
          },
        },
        required: ['weakestPremiseId', 'weakestReason', 'leanedFramework', 'sharpenedClaim', 'outcome'],
      },
      maxTokens: 550,
    })
    // Zero participation can never earn a real trajectory category — this
    // is enforced here rather than trusted to the model, since it's the
    // single most important honesty guarantee this endpoint makes.
    if (participationLevel === 'none') result.outcome = 'UNTESTED'
    res.json(result)
  } catch (err) {
    console.error('verdict failed', err)
    res.status(502).json({ error: 'Claude request failed' })
  }
})
