import { Router } from 'express'
import { structured } from '../claude.js'
import { philosopherById, philosopherVoice } from '../data/philosophers.js'
import { constitutionBlock } from '../data/constitutions.js'
import { styleBlock } from '../preferences.js'
import { AUTHENTICITY_RULES } from '../authenticity.js'

/**
 * The Journey: meeting the thinkers one by one. /open writes how a thinker
 * greets you and the question they put to you; it is the same for everyone,
 * so it is written once by the lighter model and kept. /reply answers what
 * you said, in their voice, with one idea to carry on.
 */
export const journeyRouter = Router()

interface Opening {
  setting: string
  greeting: string
  question: string
}
const openings = new Map<string, Promise<Opening>>()

function writeOpening(id: string, language: unknown): Promise<Opening> {
  const p = philosopherById(id)!
  const voice = philosopherVoice(id)
  return structured<Opening>({
    tier: 'light',
    system: `You write one stop on a journey through the history of philosophy, in which a young visitor meets ${p.name} (${p.era}). Framework: ${p.framework}.${voice ? `\nVoice: ${voice.style}` : ''}${constitutionBlock(id)}

Write:
- setting: one or two sentences, second person, placing the visitor where this thinker really lived or worked (a real place and moment from their life), vivid but plain. 25-45 words.
- greeting: what ${p.name} says on meeting the visitor, in first person, in their own manner: who they are in a phrase and what they care about most. 30-55 words. No lecture.
- question: one question ${p.name} would genuinely ask this visitor about THEIR OWN life, which leads straight into ${p.name}'s central idea. Concrete and personal (friendship, school, choices, fairness, fear, happiness...), answerable in a sentence or two. Under 30 words.
${AUTHENTICITY_RULES}${styleBlock(language, undefined)}`,
    prompt: `Write the stop for ${p.name}.`,
    toolName: 'record_stop',
    toolDescription: 'Records the setting, greeting and question for this stop.',
    schema: {
      type: 'object',
      properties: { setting: { type: 'string' }, greeting: { type: 'string' }, question: { type: 'string' } },
      required: ['setting', 'greeting', 'question'],
    },
    maxTokens: 700,
  })
}

journeyRouter.post('/open', async (req, res) => {
  const id = typeof req.body?.philosopherId === 'string' ? req.body.philosopherId : ''
  if (!philosopherById(id)) {
    res.status(400).json({ error: 'philosopherId is invalid' })
    return
  }
  const language = req.body?.language
  const key = `${id}|${language ?? ''}`
  try {
    let pending = openings.get(key)
    if (!pending) {
      pending = writeOpening(id, language)
      openings.set(key, pending)
      pending.catch(() => openings.delete(key))
    }
    res.json(await pending)
  } catch (err) {
    console.error('journey/open failed', err)
    res.status(502).json({ error: 'Claude request failed' })
  }
})

interface Reply {
  reply: string
  takeaway: string
}

journeyRouter.post('/reply', async (req, res) => {
  const { philosopherId, question, answer, language, depth } = req.body ?? {}
  const p = typeof philosopherId === 'string' ? philosopherById(philosopherId) : undefined
  if (!p) return void res.status(400).json({ error: 'philosopherId is invalid' })
  if (typeof question !== 'string' || !question.trim() || question.length > 400) return void res.status(400).json({ error: 'question is required' })
  if (typeof answer !== 'string' || !answer.trim() || answer.length > 1500) return void res.status(400).json({ error: 'answer is required' })
  const voice = philosopherVoice(p.id)
  try {
    const result = await structured<Reply>({
      system: `You are ${p.name} (${p.era}). Framework: ${p.framework}.${voice ? `\nYour voice: ${voice.style}\nYour signature move: ${voice.signature}` : ''}${constitutionBlock(p.id)}

A young visitor on a journey through philosophy has met you. You asked them a question and they answered. Reply to THEIR answer, specifically, in first person and in your own manner: take what they said seriously, show them how your central idea bears on it, and where you disagree, say so plainly but warmly. 70-120 words. Then give one short takeaway: the single idea of yours they should carry on with them, in plain words, under 20 words.
${AUTHENTICITY_RULES}${styleBlock(language, depth)}`,
      prompt: `You asked: "${question}"\nThey answered: "${answer}"`,
      toolName: 'record_reply',
      toolDescription: 'Records your reply and the takeaway.',
      schema: { type: 'object', properties: { reply: { type: 'string' }, takeaway: { type: 'string' } }, required: ['reply', 'takeaway'] },
      maxTokens: 700,
    })
    res.json(result)
  } catch (err) {
    console.error('journey/reply failed', err)
    res.status(502).json({ error: 'Claude request failed' })
  }
})
