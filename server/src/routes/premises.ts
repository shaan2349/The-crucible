import { Router } from 'express'
import { structured } from '../claude.js'

export const premisesRouter = Router()

interface PremiseBreakdown {
  conclusion: string
  premises: string[]
}

/**
 * Placeholder endpoint proving the structured-output pattern end to end.
 * The system prompt here is generic — it should be replaced with the
 * prototype's actual wording (tone, framework-matching rules, etc.) once
 * that content is available.
 */
premisesRouter.post('/', async (req, res) => {
  const claim = typeof req.body?.claim === 'string' ? req.body.claim.trim() : ''
  if (!claim) {
    res.status(400).json({ error: 'claim is required' })
    return
  }
  if (claim.length > 2000) {
    res.status(400).json({ error: 'claim is too long' })
    return
  }

  try {
    const result = await structured<PremiseBreakdown>({
      system:
        'You break down a real position someone holds into a formal logical argument. ' +
        'Be precise and charitable. Do not invent claims the person did not make.',
      prompt: `Break this claim into a formal conclusion and 2-4 supporting premises:\n\n"${claim}"`,
      toolName: 'record_breakdown',
      toolDescription: 'Records the formal conclusion and premises extracted from the claim.',
      schema: {
        type: 'object',
        properties: {
          conclusion: { type: 'string', description: 'The claim restated as a formal conclusion.' },
          premises: {
            type: 'array',
            items: { type: 'string' },
            minItems: 2,
            maxItems: 4,
            description: 'The 2-4 premises that support the conclusion.',
          },
        },
        required: ['conclusion', 'premises'],
      },
      maxTokens: 512,
    })

    res.json(result)
  } catch (err) {
    console.error('premises breakdown failed', err)
    res.status(502).json({ error: 'Claude request failed' })
  }
})
