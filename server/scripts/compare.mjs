/**
 * Model comparison: runs the same sample requests through the real server on
 * each model and writes a side-by-side report with what every call cost.
 *
 *   ANTHROPIC_API_KEY=... node scripts/compare.mjs            (from server/)
 *
 * Costs well under a dollar in total. The report lands in compare-report.md.
 */
import { spawn } from 'node:child_process'
import { writeFileSync } from 'node:fs'

const MODELS = (process.env.MODELS ?? 'claude-opus-5-5,claude-sonnet-5-5,claude-haiku-5-5').split(',')

const premises = [
  { id: 'p1', text: 'Harm is what makes an act wrong.', status: 'standing' },
  { id: 'p2', text: 'We can usually foresee whether a lie will cause harm.', status: 'standing' },
  { id: 'p3', text: 'The truth itself sometimes causes harm.', status: 'standing' },
]
const claim = 'Lying is only wrong when it causes harm.'
const conclusion = 'Lying is wrong only when it causes harm'

const SAMPLES = [
  {
    label: 'Temple · Kant objects',
    path: '/api/claude/debate/attack',
    body: { claim, conclusion, premises, philosopherId: 'kant', priorRounds: [], sameRoundAttacks: [] },
    show: (r) => `→ ${r.targetPremiseId}: ${r.text}`,
  },
  {
    label: 'Temple · Nietzsche objects',
    path: '/api/claude/debate/attack',
    body: { claim, conclusion, premises, philosopherId: 'nietzsche', priorRounds: [], sameRoundAttacks: [] },
    show: (r) => `→ ${r.targetPremiseId}: ${r.text}`,
  },
  {
    label: 'Temple · the judge',
    path: '/api/claude/debate/evaluate',
    body: {
      claim,
      conclusion,
      premises,
      lastRoundAttacks: [
        { philosopherId: 'kant', targetPremiseId: 'p1', text: 'A lie wrongs the person deceived whatever follows: you have used their reason as a tool for your ends.' },
      ],
      userResponse: 'I think harm includes harm to trust, so even a lie nobody discovers damages something between people.',
    },
    show: (r) => `${r.note}\n${(r.statuses ?? []).map((s) => `  ${s.id} ${s.status}${s.reason ? `: ${s.reason}` : ''}${s.revisedText ? ` (now: ${s.revisedText})` : ''}`).join('\n')}`,
  },
  {
    label: 'Symposium · a turn at the table',
    path: '/api/claude/reflect/discuss',
    body: {
      situation: 'My best friend copied my homework and the teacher thinks I copied hers. Should I tell the truth?',
      openings: { kant: 'Ask first whether you could will a world where everyone stayed silent here.', mill: 'Weigh what follows for everyone, including your friend.', aristotle: 'Ask what a good friend would do, not only a just one.' },
      rounds: [],
      philosopherIds: ['kant', 'mill', 'aristotle'],
      userMessage: "But if I tell, she gets in real trouble and she's my best friend.",
      addressedTo: 'all',
      level: 'standard',
    },
    show: (r) => (r.turns ?? []).map((t) => `${t.philosopherId} (to ${t.to}): ${t.text}`).join('\n'),
  },
  {
    label: 'Journey · Aristotle replies',
    path: '/api/claude/journey/reply',
    body: { philosopherId: 'aristotle', question: 'Who is a true friend to you, and why?', answer: 'Someone who sticks with me even when I mess up, not just when things are fun.' },
    show: (r) => `${r.reply}\nTakeaway: ${r.takeaway}`,
  },
  {
    label: 'Thought experiment · the Trolley',
    path: '/api/claude/experiments/react',
    body: {
      title: 'The Trolley',
      setup: 'A runaway trolley is heading toward five people. You can pull a lever to switch it to a side track, where it will kill one person instead.',
      question: 'Do you pull the lever?',
      choice: 'Pull it: one death is better than five',
      twist: 'Now there is no lever. You are on a footbridge beside a large stranger. If you push him, his body will stop the trolley. The five will live.',
      twistQuestion: 'Do you push him?',
      twistChoice: 'No: this is different',
      why: 'Pushing someone feels like murder, pulling a lever does not.',
      thinkers: ['bentham', 'kant', 'thomson'],
    },
    show: (r) => `${r.reading}\n${(r.reactions ?? []).map((x) => `${x.philosopherId}: ${x.text}`).join('\n')}\nQuestion: ${r.question}`,
  },
]

async function runOn(model, port) {
  // node itself (with the tsx loader), so stopping it stops the whole server
  const server = spawn(process.execPath, ['--import', 'tsx', 'src/index.ts'], {
    env: { ...process.env, PORT: String(port), TEMPLE_MODEL: model, TALK_MODEL: model, DAILY_SESSION_LIMIT: '1000' },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  const costs = []
  server.stdout.on('data', (d) => {
    for (const line of String(d).split('\n')) {
      const m = /^\[cost\] (\S+) (\S+) in (\d+) \(cached (\d+)\) out (\d+) = \$([\d.]+)/.exec(line)
      if (m) costs.push({ tool: m[1], model: m[2], input: +m[3], output: +m[5], cost: +m[6] })
    }
  })
  server.stderr.on('data', (d) => process.stderr.write(d))
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 500))
    try {
      if ((await fetch(`http://localhost:${port}/api/health`)).ok) break
    } catch {
      /* not up yet */
    }
  }
  const results = []
  for (const s of SAMPLES) {
    const before = costs.length
    const t0 = Date.now()
    let text
    try {
      const res = await fetch(`http://localhost:${port}${s.path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(s.body) })
      const data = await res.json()
      text = res.ok ? s.show(data) : `ERROR ${res.status}: ${data.error}`
    } catch (e) {
      text = `ERROR: ${e.message}`
    }
    await new Promise((r) => setTimeout(r, 200))
    const spent = costs.slice(before)
    results.push({ label: s.label, text, secs: (Date.now() - t0) / 1000, cost: spent.reduce((a, c) => a + c.cost, 0), output: spent.reduce((a, c) => a + c.output, 0) })
    console.log(`${model} · ${s.label}: $${results.at(-1).cost.toFixed(4)} in ${results.at(-1).secs.toFixed(1)}s`)
  }
  server.kill()
  return results
}

const all = {}
let port = 8901
for (const m of MODELS) all[m] = await runOn(m, port++)

let md = `# Model comparison\n\nThe same requests on each model. Cost is what each call cost at Anthropic's published prices; time is until the full reply.\n\n`
md += `| | ${MODELS.join(' | ')} |\n|---|${MODELS.map(() => '---').join('|')}|\n`
for (let i = 0; i < SAMPLES.length; i++) {
  md += `| ${SAMPLES[i].label} | ${MODELS.map((m) => `$${all[m][i].cost.toFixed(4)} · ${all[m][i].secs.toFixed(0)}s`).join(' | ')} |\n`
}
md += `| **All six** | ${MODELS.map((m) => `**$${all[m].reduce((a, r) => a + r.cost, 0).toFixed(3)}**`).join(' | ')} |\n\n`
for (let i = 0; i < SAMPLES.length; i++) {
  md += `## ${SAMPLES[i].label}\n\n`
  for (const m of MODELS) md += `### ${m}\n\n${all[m][i].text.replace(/\n/g, '  \n')}\n\n`
}
writeFileSync('compare-report.md', md)
console.log('\nWritten to compare-report.md')
process.exit(0)
