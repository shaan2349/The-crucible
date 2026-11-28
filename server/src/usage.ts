import type Anthropic from '@anthropic-ai/sdk'

/**
 * What each call actually costs, written to the server log so the real
 * spend per place can be read from Render's logs, e.g.
 *   [cost] record_attack claude-opus-5-5 in 2412 (cached 0) out 913 = $0.0279 · today $0.61 over 23 calls
 * Prices in dollars per million tokens (Anthropic's published rates).
 */
const PRICES: Record<string, { input: number; output: number; cacheRead: number }> = {
  'claude-opus-5-5': { input: 4, output: 20, cacheRead: 0.2 },
  'claude-sonnet-5-5': { input: 2, output: 10, cacheRead: 0.1 },
  'claude-haiku-5-5': { input: 0.1, output: 0.5, cacheRead: 0.01 },
}

let day = ''
let dayCost = 0
let dayCalls = 0
const byRoute = new Map<string, { calls: number; cost: number }>()

export function recordUsage(route: string, model: string, usage: Anthropic.Beta.BetaUsage | undefined) {
  if (!usage) return
  const price = PRICES[model] ?? PRICES['claude-opus-5-5']
  const input = usage.input_tokens ?? 0
  const cacheWrite = usage.cache_creation_input_tokens ?? 0
  const cacheRead = usage.cache_read_input_tokens ?? 0
  const output = usage.output_tokens ?? 0
  const cost = (input * price.input + cacheWrite * price.input * 1.25 + cacheRead * price.cacheRead + output * price.output) / 1e6
  const today = new Date().toISOString().slice(0, 10)
  if (today !== day) {
    if (day) console.log(`[cost] ${day} total $${dayCost.toFixed(2)} over ${dayCalls} calls: ${summary()}`)
    day = today
    dayCost = 0
    dayCalls = 0
    byRoute.clear()
  }
  dayCost += cost
  dayCalls++
  const r = byRoute.get(route) ?? { calls: 0, cost: 0 }
  r.calls++
  r.cost += cost
  byRoute.set(route, r)
  console.log(
    `[cost] ${route} ${model} in ${input + cacheWrite + cacheRead} (cached ${cacheRead}) out ${output} = $${cost.toFixed(4)} · today $${dayCost.toFixed(2)} over ${dayCalls} calls`,
  )
}

/** Today's spend by route, most expensive first. */
export function summary() {
  return [...byRoute.entries()]
    .sort((a, b) => b[1].cost - a[1].cost)
    .map(([k, v]) => `${k} ${v.calls}× $${v.cost.toFixed(2)}`)
    .join(', ')
}
