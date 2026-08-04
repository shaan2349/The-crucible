import Anthropic from '@anthropic-ai/sdk'

const apiKey = process.env.ANTHROPIC_API_KEY
if (!apiKey) {
  throw new Error('ANTHROPIC_API_KEY is not set. Copy .env.example to .env and fill it in.')
}

export const anthropic = new Anthropic({ apiKey })

export const CLAUDE_MODEL = process.env.CLAUDE_MODEL ?? 'claude-sonnet-4-5'

/**
 * Runs a prompt and forces Claude to respond through a single tool call
 * matching `schema`, so the response is guaranteed-parseable JSON instead
 * of free text. Sidesteps the prototype's old problem of unescaped quotes
 * breaking hand-parsed delimiter output — the model can't return
 * malformed JSON here because it isn't returning JSON text at all, it's
 * filling in a tool call the SDK parses for us.
 */
export async function structured<T>(opts: {
  system: string
  prompt: string
  toolName: string
  toolDescription: string
  schema: Anthropic.Tool.InputSchema
  maxTokens?: number
}): Promise<T> {
  const response = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: opts.maxTokens ?? 1024,
    system: opts.system,
    messages: [{ role: 'user', content: opts.prompt }],
    tools: [
      {
        name: opts.toolName,
        description: opts.toolDescription,
        input_schema: opts.schema,
      },
    ],
    tool_choice: { type: 'tool', name: opts.toolName },
  })

  const toolUse = response.content.find((block) => block.type === 'tool_use')
  if (!toolUse || toolUse.type !== 'tool_use') {
    throw new Error('Claude did not return a tool_use block')
  }

  return toolUse.input as T
}
