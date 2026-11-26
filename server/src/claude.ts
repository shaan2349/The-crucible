import Anthropic from '@anthropic-ai/sdk'

const apiKey = process.env.ANTHROPIC_API_KEY
if (!apiKey) {
  throw new Error('ANTHROPIC_API_KEY is not set. Copy .env.example to .env and fill it in.')
}

export const anthropic = new Anthropic({ apiKey })

export const CLAUDE_MODEL = process.env.CLAUDE_MODEL ?? 'claude-opus-5-5'

/** Models that accept the server-side refusal fallback (`fallbacks: "default"`). */
const SUPPORTS_FALLBACKS = /^claude-(opus-5-5|opus-5$|sonnet-5-5|fable-5)/.test(CLAUDE_MODEL)

/**
 * The model thinks before it answers on current Claude models, and that
 * thinking counts toward max_tokens. The small per-route limits the routes
 * pass were written for older models and would cut a response off
 * mid-thought, so they are treated as a floor of 16,000 here. Response
 * length is controlled by each route's prompt, not by this cap.
 */
const MIN_MAX_TOKENS = 16000

/**
 * Runs a prompt and has Claude respond through a single tool call matching
 * `schema`, so the response is parsed JSON instead of free text. Current
 * models no longer accept a forced tool_choice, so the tool is offered with
 * tool_choice "auto" plus an explicit instruction to call it, and the call
 * is retried once if Claude answers in prose instead.
 */
export async function structured<T>(opts: {
  system: string
  prompt: string
  toolName: string
  toolDescription: string
  schema: Anthropic.Tool.InputSchema
  maxTokens?: number
}): Promise<T> {
  const system = `${opts.system}\n\nAlways respond by calling the ${opts.toolName} tool exactly once. Do not reply in plain text.`
  const tool = { name: opts.toolName, description: opts.toolDescription, input_schema: opts.schema }

  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await anthropic.beta.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: Math.max(opts.maxTokens ?? 0, MIN_MAX_TOKENS),
      system,
      messages: [{ role: 'user', content: opts.prompt }],
      tools: [tool],
      tool_choice: { type: 'auto' },
      ...(SUPPORTS_FALLBACKS ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' } : {}),
    } as Anthropic.Beta.MessageCreateParamsNonStreaming)

    if (response.stop_reason === 'refusal') {
      throw new Error('Claude declined this request')
    }
    const toolUse = response.content.find((block) => block.type === 'tool_use')
    if (toolUse && toolUse.type === 'tool_use') {
      return toolUse.input as T
    }
  }
  throw new Error('Claude did not return a tool_use block')
}
