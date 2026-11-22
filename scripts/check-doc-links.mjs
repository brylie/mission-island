// Checks relative links and heading anchors in the project's Markdown docs.
// Usage: node scripts/check-doc-links.mjs. Exits nonzero and lists each broken link.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import process from 'node:process'

const roots = ['docs', '.agents', 'AGENTS.md', 'README.md', 'CONTRIBUTING.md']
const markdown = /\.md$/
const link = /\[[^\]]*\]\(([^)\s]+)\)/g
const heading = /^#{1,6}\s+(.+)$/gm
const external = /^[a-z][a-z0-9+.-]*:/i

function files(path) {
  if (!existsSync(path)) return []
  if (statSync(path).isFile()) return markdown.test(path) ? [path] : []
  return readdirSync(path).flatMap((name) => files(join(path, name)))
}

// GitHub's heading slugs: lower case, punctuation dropped, spaces to hyphens.
const slug = (text) => text.trim().toLowerCase().replace(/[^\p{L}\p{N}\s_-]/gu, '').replace(/\s/g, '-')

const anchorCache = new Map()
function anchors(path) {
  if (!anchorCache.has(path)) {
    const text = readFileSync(path, 'utf8').replace(/```[\s\S]*?```/g, '')
    anchorCache.set(path, new Set([...text.matchAll(heading)].map((match) => slug(match[1].replace(/[*`]/g, '')))))
  }
  return anchorCache.get(path)
}

const broken = []
for (const file of roots.flatMap(files)) {
  const text = readFileSync(file, 'utf8').replace(/```[\s\S]*?```/g, '')
  for (const [, target] of text.matchAll(link)) {
    if (external.test(target) || target.startsWith('#!')) continue
    const [path, anchor] = target.split('#')
    const resolved = path ? resolve(dirname(file), decodeURIComponent(path)) : resolve(file)
    if (!existsSync(resolved)) broken.push(`${file}: ${target} (no such file)`)
    else if (anchor && markdown.test(resolved) && !anchors(resolved).has(anchor)) broken.push(`${file}: ${target} (no such heading)`)
  }
}

for (const line of broken) process.stdout.write(relative('.', line) + '\n')
process.stdout.write(`${broken.length} broken link${broken.length === 1 ? '' : 's'}\n`)
process.exitCode = Number(broken.length > 0)
