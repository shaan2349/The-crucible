#!/usr/bin/env node
/**
 * Looks up a real, verified portrait filename for each philosopher via
 * Wikidata's API (P18 = "image" property), rather than guessing Wikimedia
 * Commons filenames from memory. Run this from a machine with normal
 * internet access:
 *
 *   node scripts/fetch-portraits.mjs
 *
 * It prints progress as it goes, then a final JSON block — copy
 * everything from "--- RESULTS ---" onward and paste it back into chat.
 */

const PHILOSOPHERS = [
  { id: 'socrates', name: 'Socrates' },
  { id: 'plato', name: 'Plato' },
  { id: 'aristotle', name: 'Aristotle' },
  { id: 'epicurus', name: 'Epicurus' },
  { id: 'marcus', name: 'Marcus Aurelius' },
  { id: 'augustine', name: 'Augustine of Hippo' },
  { id: 'aquinas', name: 'Thomas Aquinas' },
  { id: 'descartes', name: 'René Descartes' },
  { id: 'hobbes', name: 'Thomas Hobbes' },
  { id: 'locke', name: 'John Locke' },
  { id: 'hume', name: 'David Hume' },
  { id: 'rousseau', name: 'Jean-Jacques Rousseau' },
  { id: 'kant', name: 'Immanuel Kant' },
  { id: 'smith', name: 'Adam Smith' },
  { id: 'machiavelli', name: 'Niccolò Machiavelli' },
  { id: 'burke', name: 'Edmund Burke' },
  { id: 'wollstonecraft', name: 'Mary Wollstonecraft' },
  { id: 'bentham', name: 'Jeremy Bentham' },
  { id: 'mill', name: 'John Stuart Mill' },
  { id: 'hegel', name: 'Georg Wilhelm Friedrich Hegel' },
  { id: 'marx', name: 'Karl Marx' },
  { id: 'kierkegaard', name: 'Søren Kierkegaard' },
  { id: 'nietzsche', name: 'Friedrich Nietzsche' },
  { id: 'rawls', name: 'John Rawls' },
  { id: 'nozick', name: 'Robert Nozick' },
  { id: 'wittgenstein', name: 'Ludwig Wittgenstein' },
  { id: 'popper', name: 'Karl Popper' },
  { id: 'arendt', name: 'Hannah Arendt' },
  { id: 'berlin', name: 'Isaiah Berlin' },
  { id: 'hayek', name: 'Friedrich Hayek' },
  { id: 'keynes', name: 'John Maynard Keynes' },
  { id: 'sartre', name: 'Jean-Paul Sartre' },
  { id: 'camus', name: 'Albert Camus' },
  { id: 'beauvoir', name: 'Simone de Beauvoir' },
  { id: 'foucault', name: 'Michel Foucault' },
  { id: 'fanon', name: 'Frantz Fanon' },
  { id: 'confucius', name: 'Confucius' },
  { id: 'mencius', name: 'Mencius' },
  { id: 'laozi', name: 'Laozi' },
  { id: 'buddha', name: 'Gautama Buddha' },
  { id: 'ibnrushd', name: 'Averroes' },
  { id: 'singer', name: 'Peter Singer' },
  { id: 'nussbaum', name: 'Martha Nussbaum' },
  { id: 'thomson', name: 'Judith Jarvis Thomson' },
  { id: 'sen', name: 'Amartya Sen' },
  { id: 'parfit', name: 'Derek Parfit' },
  { id: 'anscombe', name: 'Elizabeth Anscombe' },
]

// A generic browser-style UA — some network security tools (antivirus web
// shields, router-level content filters) intercept traffic with an
// obviously non-browser User-Agent and serve a warning/holding page
// instead of proxying the request through, which is the leading
// suspect for the "You are ma..." errors seen in earlier runs (that
// text isn't a Wikidata error format at all).
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
}

// Wikidata rate-limits fast anonymous requests. Retries with backoff on
// any non-ok response or an error payload, instead of silently treating
// a throttled response as "no image found" (which is what happened
// before this fix — everything past the first few entries went null).
// Reads the body as text first so a failure shows the actual raw
// response (e.g. an intercepted HTML warning page) rather than just
// JSON.parse's own truncated error message.
async function fetchJSON(url, attempts = 4) {
  let lastErr
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, { headers: HEADERS })
      const text = await res.text()
      let data
      try {
        data = JSON.parse(text)
      } catch {
        throw new Error(`Non-JSON response (HTTP ${res.status}): ${text.slice(0, 300)}`)
      }
      if (!res.ok || data.error) {
        throw new Error(`HTTP ${res.status}${data.error ? ' — ' + JSON.stringify(data.error) : ''}`)
      }
      return data
    } catch (e) {
      lastErr = e
      const wait = 1000 * (i + 1)
      if (i < attempts - 1) await new Promise((r) => setTimeout(r, wait))
    }
  }
  throw lastErr
}

async function searchEntity(name) {
  const url = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(name)}&language=en&format=json&type=item&limit=5`
  const data = await fetchJSON(url)
  return (data.search || []).map((c) => c.id)
}

async function getEntities(qids) {
  if (qids.length === 0) return {}
  const url = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${qids.join('|')}&props=descriptions|claims&languages=en&format=json`
  const data = await fetchJSON(url)
  return data.entities || {}
}

async function findPortrait(name) {
  const qids = await searchEntity(name)
  if (qids.length === 0) return null
  await new Promise((r) => setTimeout(r, 400))
  const entities = await getEntities(qids)

  let chosen = qids.find((qid) => /philosoph/i.test(entities[qid]?.descriptions?.en?.value || ''))
  if (!chosen) chosen = qids[0]

  const claims = entities[chosen]?.claims
  const image = claims?.P18?.[0]?.mainsnak?.datavalue?.value
  return image || null
}

async function main() {
  const results = {}
  for (const p of PHILOSOPHERS) {
    try {
      const filename = await findPortrait(p.name)
      results[p.id] = filename
      console.log(`${filename ? 'OK  ' : 'MISS'} ${p.id.padEnd(16)} ${filename ?? '(no image found)'}`)
    } catch (e) {
      results[p.id] = null
      console.log(`ERR  ${p.id.padEnd(16)} ${e.message}`)
    }
    await new Promise((r) => setTimeout(r, 600)) // be polite to the API
  }

  const found = Object.values(results).filter(Boolean).length
  console.log(`\nDone: ${found}/${PHILOSOPHERS.length} portraits found.`)
  console.log('\n--- RESULTS (copy from here down) ---\n')
  console.log(JSON.stringify(results, null, 2))
}

main()
