// Checks that each quote in docs/sources.yaml appears word for word on its source page.
// Usage: node scripts/check-source-quotes.mjs [--write]
// Each quote is reported as exact, not-found or unfetchable. With --write, the result and
// today's date are recorded as `quote-match:` under the quote. This never marks a claim
// checked: whether the quote supports the claim is a person's call.
import { readFileSync, writeFileSync } from 'node:fs'
import process from 'node:process'

const register = 'docs/sources.yaml'
const timeoutMs = 60_000
const okStatus = 200
const redirectStatus = 300
const isoDateLength = 10
const userAgent = 'MissionIslandDocs/1.0 (knowledge base quote check)'
const write = process.argv.includes('--write')
const quotePrefix = '      quote: "'
const quoteMatchPrefix = '      quote-match: '

const normalise = (text) => text
  .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;|&#160;/g, ' ')
  .replace(/&amp;/g, '&')
  .replace(/&#39;|&rsquo;|&lsquo;|[‘’]/g, '\'')
  .replace(/&quot;|&ldquo;|&rdquo;|[“”]/g, '"')
  .replace(/[–—]/g, '-')
  .replace(/\s+/g, ' ')
  .toLowerCase()
  .trim()

async function fetchPage(url) {
  try {
    const response = await globalThis.fetch(url, { headers: { 'user-agent': userAgent }, signal: globalThis.AbortSignal.timeout(timeoutMs) })
    const type = response.headers.get('content-type') ?? ''
    if (response.status < okStatus || response.status >= redirectStatus || !type.includes('html')) return undefined
    return normalise(await response.text())
  }
  catch {
    return undefined
  }
}

const text = readFileSync(register, 'utf8')
const entries = text.split(/^(?=- id: )/m)
const today = new Date().toISOString().slice(0, isoDateLength)
const counts = { 'exact': 0, 'not-found': 0, 'unfetchable': 0 }
const updated = []

for (const entry of entries) {
  const id = entry.match(/^- id: (\S+)/m)?.[1]
  const url = entry.match(/^ {2}url: (\S+)/m)?.[1]
  const opened = /^ {2}opened: true$/m.test(entry)
  if (!id || !url || !opened) {
    updated.push(entry)
    continue
  }
  const page = await fetchPage(url)
  const lines = []
  for (const line of entry.split('\n')) {
    if (line.startsWith(quoteMatchPrefix)) continue
    lines.push(line)
    if (!line.startsWith(quotePrefix)) continue
    const quote = line.slice(quotePrefix.length).replace(/"$/, '').replace(/\\"/g, '"')
    if (!quote || quote.startsWith('(')) continue
    const outcome = page === undefined ? 'unfetchable' : page.includes(normalise(quote)) ? 'exact' : 'not-found'
    counts[outcome]++
    process.stdout.write(`${outcome.padEnd('unfetchable'.length)}  ${id}: ${quote}\n`)
    lines.push(`${quoteMatchPrefix}${outcome} (${today})`)
  }
  const result = lines.join('\n')
  updated.push(result)
}

process.stdout.write(`exact ${counts.exact} · not-found ${counts['not-found']} · unfetchable ${counts.unfetchable}\n`)
if (write) writeFileSync(register, updated.join(''))
