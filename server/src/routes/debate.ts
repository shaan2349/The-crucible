import { Router } from 'express'
import { structured } from '../claude.js'
import { PHILOSOPHERS, philosopherById } from '../data/philosophers.js'

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
}

debateRouter.post('/attack', async (req, res) => {
  const { claim, conclusion, premises, philosopherId, priorRounds, sameRoundAttacks } = req.body ?? {}
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

  try {
    const result = await structured<AttackResult>({
      system: `You are ${philosopher.name} (${philosopher.era}). Framework: ${philosopher.framework}. Your characteristic mode of attack: ${philosopher.attack}.

Rules for your response:
- Somewhere in your response, work in the exact wording or a close paraphrase (2-6 words) of the specific premise you're attacking, so it's clear you engaged with their specific claim — but do NOT make this the first words of your response every time. Vary where it lands: sometimes open with a challenge or a question instead, and fold the quote in mid-response.
- Name at least one specific concept, term, or text genuinely associated with you (e.g. Kant would say "categorical imperative", Rawls would say "veil of ignorance", Nietzsche would say "ressentiment"). A response with no specific terminology is a failure.
- Do NOT write generic philosophical pushback that any philosopher could have said about any topic. Your objection must depend on the actual content of THIS premise.
- Attack exactly one premise, and be precise about which exact word or claim in it is the problem.
- Speak in first person, 2-4 sentences, in a register that fits your era and temperament (e.g. Nietzsche is provocative and cutting; Kant is precise and formal; Confucius is measured).
${sameRoundText ? '- Another thinker has already spoken this round (see below). Engage with what they actually said — agree with a caveat, sharpen their point, or directly contest it — rather than ignoring them and only addressing the user. This is a live discussion between you, not parallel monologues.' : ''}`,
      prompt: `User's original position: "${claim}"\nConclusion: ${conclusion}\nPremises:\n${premises
        .map((pr) => `${pr.id}: ${pr.text} [current status: ${pr.status ?? 'standing'}]`)
        .join('\n')}\n\nPrior rounds:\n${priorText || '(this is round 1)'}${
        sameRoundText ? `\n\nAlready said this round, before you:\n${sameRoundText}` : ''
      }`,
      toolName: 'record_attack',
      toolDescription: 'Records which premise is attacked and the philosopher\'s in-character rebuttal.',
      schema: {
        type: 'object',
        properties: {
          targetPremiseId: { type: 'string', enum: premises.map((p) => p.id) },
          text: { type: 'string' },
        },
        required: ['targetPremiseId', 'text'],
      },
      maxTokens: 400,
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
}

debateRouter.post('/verdict', async (req, res) => {
  const { claim, conclusion, premises, rounds } = req.body ?? {}
  if (typeof claim !== 'string' || !claim.trim()) return badRequest(res, 'claim is required')
  if (typeof conclusion !== 'string' || !conclusion.trim()) return badRequest(res, 'conclusion is required')
  if (!validPremises(premises)) return badRequest(res, 'premises is required')
  if (!Array.isArray(rounds)) return badRequest(res, 'rounds is required')

  const transcript = rounds
    .map(
      (r: { round: number; attacks: { philosopherId: string; text: string }[]; userResponse: string | null }) =>
        `Round ${r.round}:\n${r.attacks
          .map((a) => `${philosopherById(a.philosopherId)?.name ?? a.philosopherId}: ${a.text}`)
          .join('\n')}\nUser: ${r.userResponse}`,
    )
    .join('\n\n')

  try {
    const result = await structured<VerdictResult>({
      system: 'Write a short, honest verdict for this philosophical debate.',
      prompt: `Claim: "${claim}"\nConclusion: ${conclusion}\nFinal premise states:\n${premises
        .map((pr) => `${pr.id}: ${pr.text} [${pr.status ?? 'standing'}]`)
        .join('\n')}\n\nFull transcript:\n${transcript}`,
      toolName: 'record_verdict',
      toolDescription: 'Records the debate verdict.',
      schema: {
        type: 'object',
        properties: {
          weakestPremiseId: { type: 'string', enum: premises.map((p) => p.id) },
          weakestReason: { type: 'string', description: 'Which premise proved weakest and why.' },
          leanedFramework: {
            type: 'string',
            description: 'Which philosopher/school the user leaned on most without fully defending it.',
          },
          sharpenedClaim: { type: 'string', description: 'A sharpened, more defensible version of their original claim.' },
        },
        required: ['weakestPremiseId', 'weakestReason', 'leanedFramework', 'sharpenedClaim'],
      },
      maxTokens: 500,
    })
    res.json(result)
  } catch (err) {
    console.error('verdict failed', err)
    res.status(502).json({ error: 'Claude request failed' })
  }
})
