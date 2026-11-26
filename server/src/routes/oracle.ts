import { Router } from 'express'
import { structured } from '../claude.js'
import { PHILOSOPHERS, philosopherById } from '../data/philosophers.js'
import { styleBlock } from '../preferences.js'
import { AUTHENTICITY_RULES } from '../authenticity.js'

/**
 * The Oracle: one short, intriguing question a day, drawn from everyday
 * life, for when someone is simply curious. The answer is met with a
 * thoughtful reply and two real thinkers' views; never a score.
 */
export const oracleRouter = Router()

const PHILOSOPHER_IDS = PHILOSOPHERS.map((p) => p.id)

function badRequest(res: import('express').Response, message: string) {
  res.status(400).json({ error: message })
}

const DOMAINS = [
  'friendship', 'family', 'love', 'work', 'money', 'school', 'ambition', 'honesty', 'loyalty', 'jealousy', 'kindness',
  'social media', 'privacy', 'technology', 'sport', 'art', 'music', 'beauty', 'death', 'happiness', 'luck', 'fairness',
  'forgiveness', 'revenge', 'promises', 'gifts', 'strangers', 'animals', 'food', 'cities', 'nature', 'time', 'memory',
  'identity', 'growing up', 'regret', 'courage', 'fame', 'rules', 'gratitude',
]

/* ------------------------------- today's question ------------------------------- */

interface QuestionResult {
  question: string
  context: string
  domain: string
}

oracleRouter.post('/question', async (req, res) => {
  const recent = Array.isArray(req.body?.recentQuestions)
    ? (req.body.recentQuestions as unknown[]).filter((q): q is string => typeof q === 'string').slice(-20)
    : []
  const sample = [...DOMAINS].sort(() => Math.random() - 0.5).slice(0, 8).join(', ')
  try {
    const result = await structured<QuestionResult>({
      system:
        'You are the Oracle in a philosophy app: each day you pose ONE question to someone who opened the app out of curiosity. ' +
        'The question must be short (under 20 words), concrete, drawn from ordinary life, and genuinely hard to answer: a real ' +
        'philosophical puzzle hiding inside an everyday situation. It should invite a personal answer, not a textbook one. ' +
        'Good: "If you could erase one painful memory, would you still be you?" "Is it wrong to enjoy a friend’s small failures?" ' +
        'Avoid trolley problems, AI regulation, free will in the abstract, and anything that needs specialist knowledge. ' +
        'context: one sentence (under 25 words) that makes the question bite, without hinting at an answer.',
      prompt: `Draw from one of these areas of life: ${sample}.${
        recent.length ? `\n\nRecent questions to avoid repeating or echoing:\n${recent.map((q) => `- ${q}`).join('\n')}` : ''
      }`,
      toolName: 'record_question',
      toolDescription: "Records today's question.",
      schema: {
        type: 'object',
        properties: {
          question: { type: 'string' },
          context: { type: 'string' },
          domain: { type: 'string' },
        },
        required: ['question', 'context', 'domain'],
      },
    })
    res.json(result)
  } catch (err) {
    console.error('oracle/question failed', err)
    res.status(502).json({ error: 'Claude request failed' })
  }
})

/* ---------------------------------- the answer ---------------------------------- */

interface AnswerResult {
  reply: string
  perspectives: { philosopherId: string; view: string }[]
  followUp: string
}

oracleRouter.post('/answer', async (req, res) => {
  const { question, answer, language, depth } = req.body ?? {}
  if (typeof question !== 'string' || !question.trim()) return badRequest(res, 'question is required')
  if (typeof answer !== 'string' || !answer.trim()) return badRequest(res, 'answer is required')
  if (answer.length > 2000) return badRequest(res, 'answer is too long')
  const list = PHILOSOPHERS.map((p) => `${p.id}: ${p.name} — ${p.framework}`).join('\n')

  try {
    const result = await structured<AnswerResult>({
      system:
        'You are the Oracle in a philosophy app. Someone answered today’s question in their own words. Reply like a wise, ' +
        'curious friend who takes their answer seriously: no grading, no praise for its own sake, no "great answer". ' +
        'reply: 50 to 90 words. Name the assumption their answer rests on, then show what it would mean if it were pushed ' +
        'one step further. Speak to them as "you" and refer to what they actually wrote.\n' +
        'perspectives: exactly two philosophers from the list whose real views would see this question differently from ' +
        'each other. For each, one or two sentences (under 45 words) on how they would see THIS question, framed as an ' +
        'application of their actual ideas, never a claim that they wrote about it.\n' +
        'followUp: one short question (under 18 words) that would take their thinking further.\n' +
        AUTHENTICITY_RULES +
        styleBlock(language, depth),
      prompt: `Today's question: "${question}"\n\nTheir answer: "${answer}"\n\nPhilosophers:\n${list}`,
      toolName: 'record_oracle_reply',
      toolDescription: 'Records the Oracle’s reply and two perspectives.',
      schema: {
        type: 'object',
        properties: {
          reply: { type: 'string' },
          perspectives: {
            type: 'array',
            minItems: 2,
            maxItems: 2,
            items: {
              type: 'object',
              properties: {
                philosopherId: { type: 'string', enum: PHILOSOPHER_IDS },
                view: { type: 'string' },
              },
              required: ['philosopherId', 'view'],
            },
          },
          followUp: { type: 'string' },
        },
        required: ['reply', 'perspectives', 'followUp'],
      },
    })
    result.perspectives = result.perspectives.filter((p) => philosopherById(p.philosopherId)).slice(0, 2)
    res.json(result)
  } catch (err) {
    console.error('oracle/answer failed', err)
    res.status(502).json({ error: 'Claude request failed' })
  }
})

