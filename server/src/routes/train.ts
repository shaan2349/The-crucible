import { Router } from 'express'
import { structured } from '../claude.js'

export const trainRouter = Router()

const LEVELS = ['easy', 'medium', 'hard'] as const
const EXERCISE_TYPES = ['deconstruct', 'construct', 'spot-flaw', 'steelman', 'framework-lens', 'premise-audit'] as const

type Level = (typeof LEVELS)[number]
type ExerciseType = (typeof EXERCISE_TYPES)[number]

function isLevel(v: unknown): v is Level {
  return typeof v === 'string' && (LEVELS as readonly string[]).includes(v)
}
function isExerciseType(v: unknown): v is ExerciseType {
  return typeof v === 'string' && (EXERCISE_TYPES as readonly string[]).includes(v)
}

// A small, named set of frameworks for framework-lens — deliberately not
// tied to the 47-philosopher roster (that couples an exercise about
// understanding an idea to trivia about who's on the roster this week).
// Picking well-known named schools keeps the exercise about the
// framework's actual reasoning pattern.
const FRAMEWORKS = [
  'utilitarianism',
  'Kantian deontology',
  'virtue ethics',
  'existentialism',
  'stoicism',
  'social contract theory',
  'natural rights liberalism',
  'care ethics',
]

function badRequest(res: import('express').Response, message: string) {
  res.status(400).json({ error: message })
}

// A deliberately broad set of everyday domains — without this, the
// generator kept drifting back to the same handful of "safe" abstract
// topics (AI regulation, free will, government) across many consecutive
// challenges. Sampling a random subset per request, plus explicitly
// excluding the user's own recently-attempted topics, is what actually
// produces variety rather than just asking for it once and hoping.
const TOPIC_DOMAINS = [
  'friendships', 'family', 'school', 'university', 'careers', 'money', 'ambition', 'relationships', 'love',
  'jealousy', 'loyalty', 'honesty', 'lying', 'social media', 'privacy', 'technology', 'AI', 'sport', 'competition',
  'art', 'beauty', 'religion', 'death', 'happiness', 'suffering', 'meaning', 'free will', 'punishment', 'justice',
  'inequality', 'politics', 'government', 'war', 'the environment', 'animals', 'responsibility', 'conformity',
  'freedom', 'identity', 'education', 'work', 'success', 'failure', 'risk', 'obligations to friends', 'charity',
  'consumerism', 'fame', 'revenge', 'forgiveness',
]

function topicDiversityBlock(recentTopics: unknown): string {
  const recent = Array.isArray(recentTopics) ? recentTopics.filter((t): t is string => typeof t === 'string').slice(-15) : []
  const domainSample = [...TOPIC_DOMAINS].sort(() => Math.random() - 0.5).slice(0, 12).join(', ')
  const recentBlock = recent.length > 0 ? ` The user has recently done challenges on: ${recent.join('; ')} — pick a genuinely different theme, not a variation on any of these.` : ''
  return `\n\nDraw from a wide range of everyday domains, for example: ${domainSample}. Do not default repeatedly to AI regulation, free will, government, or public libraries — those are overused defaults, not the only interesting topics.${recentBlock}`
}

/* -------------------------------- generate -------------------------------- */

trainRouter.post('/generate', async (req, res) => {
  const { level, exerciseType, recentTopics } = req.body ?? {}
  if (!isLevel(level)) return badRequest(res, 'level must be easy, medium, or hard')
  if (!isExerciseType(exerciseType)) return badRequest(res, 'exerciseType is invalid')
  const diversity = topicDiversityBlock(recentTopics)

  try {
    if (exerciseType === 'deconstruct') {
      const result = await structured<{ topic: string; passage: string }>({
        system:
          'Write an ORIGINAL short persuasive passage (80-150 words, op-ed or speech style) arguing for a ' +
          'real-world position, entirely in your own words — do not quote, closely paraphrase, or imitate ' +
          'the specific wording of any real, identifiable speech, article, or public figure. Embed 2-4 ' +
          `premises leading to a conclusion; at least one premise should be implicit/unstated. Difficulty: ${level}.${diversity}`,
        prompt: 'Generate a new challenge now, on a fresh topic.',
        toolName: 'record_challenge',
        toolDescription: 'Records the generated passage and its topic label.',
        schema: {
          type: 'object',
          properties: { topic: { type: 'string', description: 'Short topic label' }, passage: { type: 'string' } },
          required: ['topic', 'passage'],
        },
        maxTokens: 500,
      })
      return res.json({ exerciseType, ...result })
    }

    if (exerciseType === 'construct') {
      const result = await structured<{ topic: string; conclusion: string }>({
        system:
          'Generate a single provocative conclusion/claim on a real-world topic for a student to construct ' +
          `a supporting argument for. Difficulty: ${level}.${diversity}`,
        prompt: 'Generate a new conclusion now, on a fresh topic.',
        toolName: 'record_conclusion',
        toolDescription: 'Records the generated conclusion.',
        schema: {
          type: 'object',
          properties: { topic: { type: 'string', description: 'Short topic label' }, conclusion: { type: 'string' } },
          required: ['topic', 'conclusion'],
        },
        maxTokens: 200,
      })
      return res.json({ exerciseType, ...result })
    }

    if (exerciseType === 'spot-flaw') {
      const result = await structured<{ topic: string; passage: string }>({
        system:
          'Write an ORIGINAL short argument (80-140 words) on a real-world topic, entirely in your own words ' +
          '(never quoting or imitating a real identifiable speech or article), that contains exactly ONE clear ' +
          'logical flaw — pick one of: strawman, false dilemma, ad hominem, hasty generalization, appeal to ' +
          'authority, circular reasoning, slippery slope, or post hoc. Do not name or hint at the flaw in the ' +
          `text itself — it should be discoverable, not announced. Subtlety scales with difficulty: ${level}.${diversity}`,
        prompt: 'Generate a new flawed argument now, on a fresh topic.',
        toolName: 'record_flawed_argument',
        toolDescription: 'Records the generated passage and its topic label.',
        schema: {
          type: 'object',
          properties: { topic: { type: 'string', description: 'Short topic label' }, passage: { type: 'string' } },
          required: ['topic', 'passage'],
        },
        maxTokens: 400,
      })
      return res.json({ exerciseType, ...result })
    }

    if (exerciseType === 'steelman') {
      const result = await structured<{ topic: string; claim: string }>({
        system:
          'Generate one real-world claim that people commonly dismiss too quickly or strawman rather than ' +
          `engage with seriously — something genuinely contentious, not a strawman itself. Difficulty: ${level} ` +
          `(harder = more counterintuitive or unpopular the claim).${diversity}`,
        prompt: 'Generate a new claim now, on a fresh topic.',
        toolName: 'record_claim',
        toolDescription: 'Records the generated claim and its topic label.',
        schema: {
          type: 'object',
          properties: { topic: { type: 'string', description: 'Short topic label' }, claim: { type: 'string' } },
          required: ['topic', 'claim'],
        },
        maxTokens: 200,
      })
      return res.json({ exerciseType, ...result })
    }

    if (exerciseType === 'framework-lens') {
      const framework = FRAMEWORKS[Math.floor(Math.random() * FRAMEWORKS.length)]
      const result = await structured<{ topic: string; scenario: string }>({
        system:
          'Write a short, concrete real-world scenario (60-110 words) that raises a genuine ethical or ' +
          `practical question — a situation, not an abstract debate topic. Difficulty: ${level}.${diversity}`,
        prompt: 'Generate a new scenario now, on a fresh topic.',
        toolName: 'record_scenario',
        toolDescription: 'Records the generated scenario and its topic label.',
        schema: {
          type: 'object',
          properties: { topic: { type: 'string', description: 'Short topic label' }, scenario: { type: 'string' } },
          required: ['topic', 'scenario'],
        },
        maxTokens: 300,
      })
      return res.json({ exerciseType, framework, ...result })
    }

    // premise-audit
    const result = await structured<{ topic: string; argument: string; conclusion: string; premises: { id: string; text: string }[] }>({
      system:
        'Write an ORIGINAL short argument (2-4 numbered premises leading to a conclusion) on a real-world ' +
        `topic, entirely in your own words. One premise should be genuinely more contestable than the others ` +
        `— not absurd, just the weakest link. Difficulty: ${level}.${diversity}`,
      prompt: 'Generate a new argument now, on a fresh topic.',
      toolName: 'record_argument',
      toolDescription: 'Records the generated argument, its premises, and conclusion.',
      schema: {
        type: 'object',
        properties: {
          topic: { type: 'string', description: 'Short topic label' },
          argument: { type: 'string', description: 'The full argument as flowing prose, 60-120 words' },
          premises: {
            type: 'array',
            items: {
              type: 'object',
              properties: { id: { type: 'string' }, text: { type: 'string' } },
              required: ['id', 'text'],
            },
            minItems: 2,
            maxItems: 4,
          },
          conclusion: { type: 'string' },
        },
        required: ['topic', 'argument', 'premises', 'conclusion'],
      },
      maxTokens: 500,
    })
    res.json({ exerciseType, ...result })
  } catch (err) {
    console.error('train/generate failed', err)
    res.status(502).json({ error: 'Claude request failed' })
  }
})

/* ---------------------------------- score ---------------------------------- */

trainRouter.post('/score', async (req, res) => {
  const body = req.body ?? {}
  const { exerciseType } = body
  if (!isExerciseType(exerciseType)) return badRequest(res, 'exerciseType is invalid')

  try {
    if (exerciseType === 'deconstruct') {
      const { passage, userConclusion, userPremises } = body
      if (typeof passage !== 'string' || !passage.trim()) return badRequest(res, 'passage is required')
      const premisesText = formatUserPremises(userPremises)
      const result = await structured({
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
      return res.json(result)
    }

    if (exerciseType === 'construct') {
      const { conclusion, userPremises } = body
      if (typeof conclusion !== 'string' || !conclusion.trim()) return badRequest(res, 'conclusion is required')
      const premisesText = formatUserPremises(userPremises)
      const result = await structured({
        system:
          "Given this conclusion and the user's constructed premises meant to support it, evaluate whether " +
          'the argument is valid (premises actually lead to the conclusion) and sound (premises are ' +
          'plausible). Give a score out of 5 and specific, honest feedback.',
        prompt: `Conclusion: "${conclusion}"\nUser's premises:\n${premisesText}`,
        toolName: 'record_score',
        toolDescription: 'Records the score and feedback.',
        schema: {
          type: 'object',
          properties: { score: { type: 'integer', minimum: 0, maximum: 5 }, feedback: { type: 'string' } },
          required: ['score', 'feedback'],
        },
        maxTokens: 400,
      })
      return res.json(result)
    }

    if (exerciseType === 'spot-flaw') {
      const { passage, userAnswer } = body
      if (typeof passage !== 'string' || !passage.trim()) return badRequest(res, 'passage is required')
      if (typeof userAnswer !== 'string' || !userAnswer.trim()) return badRequest(res, 'userAnswer is required')
      const result = await structured({
        system:
          'This passage contains exactly one logical flaw. Independently identify the actual flaw and where it ' +
          "occurs, then evaluate whether the user's answer correctly names or clearly describes that same flaw " +
          '(exact terminology is not required — recognizing the actual reasoning error is what matters). Score ' +
          'out of 5 and give specific, honest feedback.',
        prompt: `Passage: "${passage}"\n\nUser's answer: "${userAnswer}"`,
        toolName: 'record_score',
        toolDescription: 'Records the score, the actual flaw, and feedback.',
        schema: {
          type: 'object',
          properties: {
            score: { type: 'integer', minimum: 0, maximum: 5 },
            actualFlaw: { type: 'string', description: 'Name and brief explanation of the real flaw, one or two sentences' },
            feedback: { type: 'string' },
          },
          required: ['score', 'actualFlaw', 'feedback'],
        },
        maxTokens: 400,
      })
      return res.json(result)
    }

    if (exerciseType === 'steelman') {
      const { claim, userArgument } = body
      if (typeof claim !== 'string' || !claim.trim()) return badRequest(res, 'claim is required')
      if (typeof userArgument !== 'string' || !userArgument.trim()) return badRequest(res, 'userArgument is required')
      const result = await structured({
        system:
          "Evaluate the user's attempt to steelman this claim — build the strongest possible case for it, " +
          'regardless of whether they personally agree. Judge on charity (did they engage with the most ' +
          'defensible version, not a weak one), rigor (real reasons, not just assertion), and plausibility ' +
          '(would a genuine, thoughtful advocate actually argue this way). Score out of 5, honest feedback.',
        prompt: `Claim: "${claim}"\n\nUser's steelman:\n"${userArgument}"`,
        toolName: 'record_score',
        toolDescription: 'Records the score and feedback.',
        schema: {
          type: 'object',
          properties: { score: { type: 'integer', minimum: 0, maximum: 5 }, feedback: { type: 'string' } },
          required: ['score', 'feedback'],
        },
        maxTokens: 400,
      })
      return res.json(result)
    }

    if (exerciseType === 'framework-lens') {
      const { scenario, framework, userAnswer } = body
      if (typeof scenario !== 'string' || !scenario.trim()) return badRequest(res, 'scenario is required')
      if (typeof framework !== 'string' || !framework.trim()) return badRequest(res, 'framework is required')
      if (typeof userAnswer !== 'string' || !userAnswer.trim()) return badRequest(res, 'userAnswer is required')
      const result = await structured({
        system:
          `Evaluate whether the user's reasoning about this scenario is actually consistent with ${framework}'s ` +
          'own internal logic — not just any reasonable-sounding answer, but reasoning a genuine adherent of ' +
          'that specific framework would recognize as their own. Score out of 5, honest feedback that names ' +
          'what a truer application of the framework would have emphasized if they missed it.',
        prompt: `Scenario: "${scenario}"\n\nFramework: ${framework}\n\nUser's reasoning:\n"${userAnswer}"`,
        toolName: 'record_score',
        toolDescription: 'Records the score and feedback.',
        schema: {
          type: 'object',
          properties: { score: { type: 'integer', minimum: 0, maximum: 5 }, feedback: { type: 'string' } },
          required: ['score', 'feedback'],
        },
        maxTokens: 400,
      })
      return res.json(result)
    }

    // premise-audit
    const { argument, premises, conclusion, userPremiseId, userExplanation } = body
    if (typeof argument !== 'string' || !argument.trim()) return badRequest(res, 'argument is required')
    if (!Array.isArray(premises) || premises.length === 0) return badRequest(res, 'premises is required')
    if (typeof userPremiseId !== 'string' || !userPremiseId.trim()) return badRequest(res, 'userPremiseId is required')
    if (typeof userExplanation !== 'string' || !userExplanation.trim()) return badRequest(res, 'userExplanation is required')
    const premisesText = premises.map((p: { id: string; text: string }) => `${p.id}: ${p.text}`).join('\n')
    const userPremiseText = premises.find((p: { id: string; text: string }) => p.id === userPremiseId)?.text ?? userPremiseId
    const result = await structured({
      system:
        'Independently judge which premise of this argument is genuinely the weakest/most contestable, then ' +
        "evaluate the user's pick and explanation against that judgment — not just whether they matched, but " +
        'whether their reasoning for why it\'s weak actually holds up under scrutiny. Score out of 5, honest ' +
        'feedback, and name which premise you consider genuinely weakest (by its id).',
      prompt: `Argument: "${argument}"\nConclusion: "${conclusion ?? ''}"\nPremises:\n${premisesText}\n\nUser picked "${userPremiseId}" (${userPremiseText}) and said:\n"${userExplanation}"`,
      toolName: 'record_score',
      toolDescription: 'Records the score, the model\'s own pick, and feedback.',
      schema: {
        type: 'object',
        properties: {
          score: { type: 'integer', minimum: 0, maximum: 5 },
          modelPick: { type: 'string', description: 'The id of the premise judged genuinely weakest' },
          feedback: { type: 'string' },
        },
        required: ['score', 'modelPick', 'feedback'],
      },
      maxTokens: 400,
    })
    res.json(result)
  } catch (err) {
    console.error('train/score failed', err)
    res.status(502).json({ error: 'Claude request failed' })
  }
})

function formatUserPremises(userPremises: unknown): string {
  if (!Array.isArray(userPremises)) return ''
  return userPremises
    .filter((p): p is string => typeof p === 'string' && p.trim().length > 0)
    .map((p, i) => `${i + 1}. ${p}`)
    .join('\n')
}
