import { Router } from 'express'
import { structured } from '../claude.js'
import { philosopherById } from '../data/philosophers.js'

export const libraryRouter = Router()

interface BioResult {
  life: string
  works: string
  legacy: string
  coreIdeas: string[]
  modernTakes: { topic: string; take: string }[]
}

libraryRouter.post('/bio', async (req, res) => {
  const philosopherId = typeof req.body?.philosopherId === 'string' ? req.body.philosopherId : ''
  const philosopher = philosopherById(philosopherId)
  if (!philosopher) {
    res.status(400).json({ error: 'philosopherId is invalid' })
    return
  }

  try {
    const result = await structured<BioResult>({
      system: 'You write short, engaging, accurate accounts of philosophers for a curious student.',
      prompt: `Philosopher: ${philosopher.name} (${philosopher.era})`,
      toolName: 'record_bio',
      toolDescription: "Records the philosopher's biography.",
      schema: {
        type: 'object',
        properties: {
          life: {
            type: 'string',
            description:
              '2-3 sentences on who they were, their historical context, and their central ideas, written engagingly not like a dry encyclopedia.',
          },
          works: {
            type: 'string',
            description: 'Their 2-4 most significant works or texts, comma separated, with a one-clause note on each if helpful.',
          },
          legacy: {
            type: 'string',
            description: '1-2 sentences on why they still matter today, ideally tied to a live modern debate or field.',
          },
          coreIdeas: {
            type: 'array',
            minItems: 3,
            maxItems: 5,
            items: { type: 'string' },
            description:
              'Their core ideas as short, punchy one-line principles, not paragraphs — e.g. "Treat persons as ends, never merely means." Each should stand alone.',
          },
          modernTakes: {
            type: 'array',
            minItems: 2,
            maxItems: 3,
            items: {
              type: 'object',
              properties: {
                topic: {
                  type: 'string',
                  description: 'A genuinely modern topic this specific thinker illuminates well, e.g. "Artificial intelligence", "Social media", "Climate change" — pick topics that fit THIS philosopher, not a generic list.',
                },
                take: {
                  type: 'string',
                  description: "One to two sentences on how they'd approach that topic, reasoned from their actual framework — not a generic modern opinion wearing their name.",
                },
              },
              required: ['topic', 'take'],
            },
            description: 'How this philosopher would approach 2-3 genuinely modern topics, reasoned from their real framework.',
          },
        },
        required: ['life', 'works', 'legacy', 'coreIdeas', 'modernTakes'],
      },
      maxTokens: 700,
    })
    res.json(result)
  } catch (err) {
    console.error('bio failed', err)
    res.status(502).json({ error: 'Claude request failed' })
  }
})
