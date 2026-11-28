import Anthropic from '@anthropic-ai/sdk'
import { parsePartialJson } from './partialJson.js'
import { recordUsage } from './usage.js'

const apiKey = process.env.ANTHROPIC_API_KEY
if (!apiKey) {
  throw new Error('ANTHROPIC_API_KEY is not set. Copy .env.example to .env and fill it in.')
}

export const anthropic = new Anthropic({ apiKey })

/** The model for everything a user reads a philosopher say. */
export const CLAUDE_MODEL = process.env.CLAUDE_MODEL ?? 'claude-opus-5-5'
/** A cheaper model for behind-the-scenes jobs the user never reads directly
 * (choosing opponents, splitting a belief into premises, search). */
export const CLAUDE_LIGHT_MODEL = process.env.CLAUDE_LIGHT_MODEL ?? 'claude-haiku-5-5'

/**
 * Each part of the app can run on its own model, set on Render without a
 * code change: TEMPLE_MODEL for the objections, judge and verdict;
 * TALK_MODEL for the Symposium, Journey, Thought Experiments and Hall.
 * The Temple falls back to CLAUDE_MODEL; conversation defaults to Haiku.
 */
const TEMPLE_TOOLS = new Set(['record_attack', 'record_statuses', 'record_verdict'])
const TALK_TOOLS = new Set([
  'begin_reflection',
  'record_conversation',
  'record_reflection_response',
  'record_reflection_ending',
  'record_reply',
  'respond_to_choices',
  'record_bio',
  'record_comparison',
])
function modelFor(toolName: string, tier?: 'main' | 'light') {
  if (tier === 'light') return CLAUDE_LIGHT_MODEL
  if (TEMPLE_TOOLS.has(toolName)) return process.env.TEMPLE_MODEL || CLAUDE_MODEL
  // trying the much cheaper Haiku for conversation; set TALK_MODEL on Render to override
  if (TALK_TOOLS.has(toolName)) return process.env.TALK_MODEL || 'claude-haiku-5-5'
  return CLAUDE_MODEL
}

/** Models that accept the server-side refusal fallback (`fallbacks: "default"`). */
const supportsFallbacks = (model: string) => /^claude-(opus-5-5|opus-5$|sonnet-5-5|fable-5)/.test(model)

/**
 * The model thinks before it answers on current Claude models, and that
 * thinking counts toward max_tokens. The small per-route limits the routes
 * pass were written for older models and would cut a response off
 * mid-thought, so they are treated as a floor of 16,000 here. Response
 * length is controlled by each route's prompt, not by this cap.
 */
const MIN_MAX_TOKENS = 16000

/** Routes whose replies are conversational and short, where speed matters more than deep deliberation. */
const QUICK = new Set([
  'record_conversation', // the Symposium's back-and-forth
  'begin_reflection', // who sits at the table and their first words
  'record_reflection_response',
  'record_reply', // the Journey
  'record_stop',
  'respond_to_choices', // thought experiments
  'record_oracle_reply',
  'record_question',
])

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
  /** 'light' runs on the cheaper model; anything a philosopher says stays on the main one. */
  tier?: 'main' | 'light'
  /** How hard the model thinks before answering. Lower is faster. Defaults by route (see QUICK). */
  effort?: 'low' | 'medium' | 'high'
  /** When given, the reply is streamed and this receives the tool input
   * parsed so far, so the words can appear as they are written. */
  onPartial?: (snapshot: Partial<T>) => void
  /** Cache the instructions for reuse: only for calls whose instructions
   * repeat within a few minutes (the judge, a Symposium session). */
  cache?: boolean
}): Promise<T> {
  const model = modelFor(opts.toolName, opts.tier)
  // Short spoken replies and hidden jobs answer at low effort, which is much
  // faster; judging a debate and writing its verdict keep medium.
  const effort = opts.effort ?? (opts.tier === 'light' || QUICK.has(opts.toolName) ? 'low' : 'medium')
  const system = `${opts.system}\n\nAlways respond by calling the ${opts.toolName} tool exactly once. Do not reply in plain text.`
  const tool = { name: opts.toolName, description: opts.toolDescription, input_schema: opts.schema }
  const params = {
    model,
    max_tokens: Math.max(opts.maxTokens ?? 0, MIN_MAX_TOKENS),
    system: opts.cache ? [{ type: 'text' as const, text: system, cache_control: { type: 'ephemeral' as const } }] : system,
    messages: [{ role: 'user' as const, content: opts.prompt }],
    tool_choice: { type: 'auto' as const },
    output_config: { effort },
    ...(supportsFallbacks(model) ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' } : {}),
  }
  const required = (opts.schema.required as string[] | undefined) ?? []

  for (let attempt = 0; attempt < 2; attempt++) {
    let response: Anthropic.Beta.BetaMessage
    if (opts.onPartial) {
      // eager streaming sends each fragment as it is written; the input is
      // then not validated by the API, so it is checked below before use
      const stream = anthropic.beta.messages.stream({
        ...params,
        tools: [{ ...tool, eager_input_streaming: true }],
      } as Anthropic.Beta.MessageCreateParamsStreaming)
      // the SDK's own snapshot hides a string until it is finished, so the
      // raw fragments are read here, keeping half-written words
      let raw = ''
      let last = 0
      let sent = ''
      const emit = () => {
        last = Date.now()
        const snapshot = parsePartialJson(raw)
        const text = JSON.stringify(snapshot ?? {})
        if (text === sent || text === '{}') return
        sent = text
        opts.onPartial!(snapshot as Partial<T>)
      }
      stream.on('inputJson', (delta) => {
        raw += delta
        if (Date.now() - last > 60) emit()
      })
      try {
        response = await stream.finalMessage()
      } catch (err) {
        // input the parser could not read at all: try once more; API errors are real failures
        if (err instanceof Anthropic.APIError || attempt === 1) throw err
        continue
      }
      emit()
    } else {
      response = await anthropic.beta.messages.create({ ...params, tools: [tool] } as Anthropic.Beta.MessageCreateParamsNonStreaming)
    }

    recordUsage(opts.toolName, model, response.usage)
    if (response.stop_reason === 'refusal') {
      throw new Error('Claude declined this request')
    }
    const toolUse = response.content.find((block) => block.type === 'tool_use')
    if (toolUse && toolUse.type === 'tool_use' && response.stop_reason !== 'max_tokens') {
      const input = toolUse.input as Record<string, unknown> | null
      if (input && typeof input === 'object' && required.every((k) => input[k] !== undefined && input[k] !== null)) {
        return input as T
      }
    }
  }
  throw new Error('Claude did not return a tool_use block')
}
