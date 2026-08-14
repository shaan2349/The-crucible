import { Router } from 'express'
import { structured } from '../claude.js'
import { PHILOSOPHERS, philosopherById } from '../data/philosophers.js'
import { styleBlock } from '../preferences.js'

export const libraryRouter = Router()

interface BioResult {
  positioning: string
  overview: string
  lifeAndContext: string
  works: string
  legacy: string
  coreIdeas: string[]
  modernTakes: { topic: string; take: string }[]
  conversationStarters: string[]
}

libraryRouter.post('/bio', async (req, res) => {
  const philosopherId = typeof req.body?.philosopherId === 'string' ? req.body.philosopherId : ''
  const philosopher = philosopherById(philosopherId)
  if (!philosopher) {
    res.status(400).json({ error: 'philosopherId is invalid' })
    return
  }

  const { language, depth } = req.body ?? {}

  try {
    const result = await structured<BioResult>({
      system:
        'You write engaging, accurate, editorial-quality profiles of philosophers for a curious student — ' +
        'the register of a well-written magazine profile, not a dry encyclopedia entry or a stitched-together ' +
        `list of facts.${styleBlock(language, depth)}`,
      prompt: `Philosopher: ${philosopher.name} (${philosopher.era}). Framework: ${philosopher.framework}.`,
      toolName: 'record_bio',
      toolDescription: "Records the philosopher's editorial profile.",
      schema: {
        type: 'object',
        properties: {
          positioning: {
            type: 'string',
            description:
              'One punchy sentence capturing their essence, in the style of a magazine subheading — e.g. ' +
              '"The philosopher who turned questioning into a method." Not a summary of their whole career, ' +
              'just the single sharpest thing to say about them.',
          },
          overview: {
            type: 'string',
            description:
              'Two short paragraphs (separate paragraphs joined by a blank line) framing who they were and ' +
              'why their thinking still matters, written to be read as prose, not a list of facts.',
          },
          lifeAndContext: {
            type: 'string',
            description:
              'One to two short paragraphs (joined by a blank line if two) of biographical narrative — their ' +
              'actual life, historical circumstances, and the world that shaped their thinking. Distinct from ' +
              'the overview: this is about their life, not their ideas.',
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
          conversationStarters: {
            type: 'array',
            minItems: 2,
            maxItems: 3,
            items: { type: 'string' },
            description:
              'Real, specific positions or questions a curious student could bring to a debate with this ' +
              'thinker — phrased as a stance to defend (e.g. "Lying is sometimes justified to protect someone ' +
              'you love"), not a vague topic. Each should genuinely provoke pushback from THIS philosopher\'s ' +
              'actual framework.',
          },
        },
        required: [
          'positioning',
          'overview',
          'lifeAndContext',
          'works',
          'legacy',
          'coreIdeas',
          'modernTakes',
          'conversationStarters',
        ],
      },
      maxTokens: 900,
    })
    res.json(result)
  } catch (err) {
    console.error('bio failed', err)
    res.status(502).json({ error: 'Claude request failed' })
  }
})

/* --------------------------------- compare --------------------------------- */

interface CompareResult {
  positionA: string
  positionB: string
  keyDisagreement: string
  sharedGround: string
}

libraryRouter.post('/compare', async (req, res) => {
  const { philosopherAId, philosopherBId, topic } = req.body ?? {}
  const a = typeof philosopherAId === 'string' ? philosopherById(philosopherAId) : undefined
  const b = typeof philosopherBId === 'string' ? philosopherById(philosopherBId) : undefined
  const topicText = typeof topic === 'string' ? topic.trim() : ''
  if (!a || !b) return res.status(400).json({ error: 'philosopherAId and philosopherBId must be valid' })
  if (!topicText) return res.status(400).json({ error: 'topic is required' })
  if (a.id === b.id) return res.status(400).json({ error: 'choose two different philosophers' })

  try {
    const result = await structured<CompareResult>({
      system:
        'You compare two philosophers on a topic for a curious student. Each position must be reasoned ' +
        "from that philosopher's actual framework, in their voice — never a generic modern opinion wearing " +
        'their name. Be concrete: name the actual concept or principle each would invoke, not just a vague ' +
        'stance.',
      prompt: `Topic: "${topicText}"\n\nPhilosopher A: ${a.name} (${a.era}). Framework: ${a.framework}.\nPhilosopher B: ${b.name} (${b.era}). Framework: ${b.framework}.`,
      toolName: 'record_comparison',
      toolDescription: 'Records how each philosopher approaches the topic and where they conflict and agree.',
      schema: {
        type: 'object',
        properties: {
          positionA: { type: 'string', description: `${a.name}'s position on the topic, 2-3 sentences, in their voice.` },
          positionB: { type: 'string', description: `${b.name}'s position on the topic, 2-3 sentences, in their voice.` },
          keyDisagreement: { type: 'string', description: 'The single sharpest point where they actually conflict, 1-2 sentences.' },
          sharedGround: { type: 'string', description: 'Any real common ground between them, if genuine — otherwise say plainly there is none.' },
        },
        required: ['positionA', 'positionB', 'keyDisagreement', 'sharedGround'],
      },
      maxTokens: 600,
    })
    res.json(result)
  } catch (err) {
    console.error('compare failed', err)
    res.status(502).json({ error: 'Claude request failed' })
  }
})

/* ---------------------------------- search --------------------------------- */

interface SearchResult {
  matches: { philosopherId: string; reason: string }[]
}

const PHILOSOPHER_IDS = PHILOSOPHERS.map((p) => p.id)

libraryRouter.post('/search', async (req, res) => {
  const query = typeof req.body?.query === 'string' ? req.body.query.trim() : ''
  if (!query) return res.status(400).json({ error: 'query is required' })
  if (query.length > 300) return res.status(400).json({ error: 'query is too long' })

  const roster = PHILOSOPHERS.map((p) => `${p.id}: ${p.name} (${p.era}) — ${p.framework}`).join('\n')

  try {
    const result = await structured<SearchResult>({
      system:
        'You interpret a free-text search query against a roster of philosophers and return whichever ' +
        'genuinely match — by name, era, school, idea, or relationship to other thinkers (e.g. "who ' +
        'disagreed with Plato" should return philosophers who actually did). Return 0-8 matches. Never ' +
        'invent a philosopher not in the roster, and never include a weak or generic match just to fill ' +
        'the list — an empty result is correct if nothing genuinely fits.',
      prompt: `Query: "${query}"\n\nRoster:\n${roster}`,
      toolName: 'record_search_matches',
      toolDescription: 'Records which philosophers match the query and why.',
      schema: {
        type: 'object',
        properties: {
          matches: {
            type: 'array',
            maxItems: 8,
            items: {
              type: 'object',
              properties: {
                philosopherId: { type: 'string', enum: PHILOSOPHER_IDS },
                reason: { type: 'string', description: 'One short clause on why this thinker matches the query.' },
              },
              required: ['philosopherId', 'reason'],
            },
          },
        },
        required: ['matches'],
      },
      maxTokens: 500,
    })
    res.json(result)
  } catch (err) {
    console.error('search failed', err)
    res.status(502).json({ error: 'Claude request failed' })
  }
})
