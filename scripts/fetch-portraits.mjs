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

// Confirmed by an earlier run's diagnostics: this is genuine anonymous
// rate-limiting from Wikimedia's API (HTTP 429 — "You are making too
// many requests"), not a network security tool as first suspected. A
// real browser UA is still good practice, but the actual fix is
// respecting the limit properly below.
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
}

// On a 429, honor the Retry-After header if Wikimedia sends one;
// otherwise back off hard (10s, 20s, 30s...) rather than the previous
// 1s/2s/3s, which was nowhere near long enough for this limit. Reads
// the body as text first so any failure shows the real raw response
// instead of JSON.parse's own truncated error message.
async function fetchJSON(url, attempts = 6) {
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
      if (res.status === 429) {
        const retryAfter = Number(res.headers.get('retry-after'))
        const wait = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 10000 * (i + 1)
        lastErr = new Error(`HTTP 429, waiting ${Math.round(wait / 1000)}s before retry`)
        console.log(`  ...rate limited, waiting ${Math.round(wait / 1000)}s`)
        if (i < attempts - 1) await new Promise((r) => setTimeout(r, wait))
        continue
      }
      if (!res.ok || data.error) {
        throw new Error(`HTTP ${res.status}${data.error ? ' — ' + JSON.stringify(data.error) : ''}`)
      }
      return data
    } catch (e) {
      lastErr = e
      if (i < attempts - 1) await new Promise((r) => setTimeout(r, 2000 * (i + 1)))
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

// Fallback for anyone Wikidata has no P18 (image) claim for: Wikipedia's
// own page-summary endpoint often has an infobox image even when it was
// never synced to Wikidata as a structured claim.
async function findViaWikipediaSummary(name) {
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(name.replace(/ /g, '_'))}`
  try {
    const data = await fetchJSON(url)
    const src = data.originalimage?.source
    if (!src) return null
    return decodeURIComponent(src.split('/').pop())
  } catch {
    return null
  }
}

async function findPortrait(name) {
  const qids = await searchEntity(name)
  if (qids.length > 0) {
    await new Promise((r) => setTimeout(r, 400))
    const entities = await getEntities(qids)

    let chosen = qids.find((qid) => /philosoph/i.test(entities[qid]?.descriptions?.en?.value || ''))
    if (!chosen) chosen = qids[0]

    const claims = entities[chosen]?.claims
    const image = claims?.P18?.[0]?.mainsnak?.datavalue?.value
    if (image) return image
  }

  await new Promise((r) => setTimeout(r, 300))
  return findViaWikipediaSummary(name)
}

// Already confirmed and in the app — skip these so a re-run only spends
// the (very limited) rate-limit budget on philosophers still missing a
// photo, instead of re-fetching everyone from scratch each time.
const ALREADY_HAVE = new Set([
  'socrates', 'plato', 'aristotle', 'epicurus', 'marcus', 'augustine', 'aquinas',
  'descartes', 'hobbes', 'locke', 'hume', 'rousseau', 'kant', 'bentham', 'mill',
  'hegel', 'marx', 'kierkegaard', 'nietzsche', 'berlin', 'hayek', 'keynes',
  'sartre', 'camus', 'beauvoir', 'buddha', 'ibnrushd', 'singer', 'nussbaum', 'sen',
])

async function main() {
  const todo = PHILOSOPHERS.filter((p) => !ALREADY_HAVE.has(p.id))
  console.log(`Skipping ${PHILOSOPHERS.length - todo.length} already-covered philosophers, fetching ${todo.length}.\n`)

  const results = {}
  for (const p of todo) {
    try {
      const filename = await findPortrait(p.name)
      results[p.id] = filename
      console.log(`${filename ? 'OK  ' : 'MISS'} ${p.id.padEnd(16)} ${filename ?? '(no image found)'}`)
    } catch (e) {
      results[p.id] = null
      console.log(`ERR  ${p.id.padEnd(16)} ${e.message}`)
    }
    await new Promise((r) => setTimeout(r, 1500)) // stay well under Wikimedia's anonymous rate limit
  }

  const found = Object.values(results).filter(Boolean).length
  console.log(`\nDone: ${found}/${PHILOSOPHERS.length} portraits found.`)
  console.log('\n--- RESULTS (copy from here down) ---\n')
  console.log(JSON.stringify(results, null, 2))
}

main()
