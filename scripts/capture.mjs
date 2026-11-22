import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs'
import { basename, join, relative, resolve } from 'node:path'
import process from 'node:process'
import { parseArgs } from 'node:util'
import { chromium } from 'playwright'
import { createServer } from 'vite'
import { captureSettle, captureViewport, contactSheet, turntableAngles } from '../src/assets/recipes/capture-presets.ts'
import { planCaptures, readCaptureOptions } from '../src/capture-plan.ts'
import { writeDifference, writeSheet } from './capture-sheets.mjs'

const usage = `Usage: npm run capture -- [--preset all|name,name] [--seed N] [--hour H] [--weather clear|mist|overcast|rain]
                        [--mode all|color,greyscale,silhouette] [--overlay slope,wildfire,...] [--grid] [--revision <git-ref>]
       npm run capture -- --compare <run-or-ref>,<run-or-ref> [--preset ...] [--mode ...]
Writes captures/<preset>/<name>.png and .json, or captures/rev-<sha>/... for --revision, plus captures/index.html.`
const checkout = resolve(import.meta.dirname, '..')
const captureRoot = join(checkout, 'captures')
const browserArgs = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']
// CAPTURE_BROWSER points at another Chromium build when Playwright's own download is unavailable.
const launchBrowser = () => chromium.launch({ args: browserArgs, ...(process.env.CAPTURE_BROWSER && { executablePath: process.env.CAPTURE_BROWSER }) })
const jsonIndent = 2
const degreesPerTurn = 360
const percent = 100

const git = (...args) => execFileSync('git', args, { cwd: checkout, encoding: 'utf8' }).trim()

// A revision renders from its own detached worktree, sharing this checkout's dependencies.
function revisionCheckout(ref) {
  const sha = git('rev-parse', '--short', `${ref}^{commit}`)
  const folder = join(captureRoot, '.revisions', sha)
  if (!existsSync(folder)) {
    git('worktree', 'add', '--detach', folder, sha)
    symlinkSync(join(checkout, 'node_modules'), join(folder, 'node_modules'), 'dir')
  }
  return { sha, folder }
}

async function startHost(root) {
  const server = await createServer({ root, configFile: join(root, 'vite.config.ts'), mode: 'playtest', logLevel: 'error', server: { port: 0, host: '127.0.0.1' } })
  await server.listen()
  return { server, base: server.resolvedUrls.local[0] }
}

async function captureShot(browser, shot, folder) {
  const page = await browser.newPage({ viewport: captureViewport })
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto(shot.url)
  // Revisions older than the dev view have no perf readout: wait out a settle delay and record perf as null.
  const readout = await page.waitForSelector('.perf-readout[data-fps]', { timeout: captureSettle.firstFrameTimeoutMs }).catch(() => undefined)
  await page.waitForTimeout(captureSettle.settleMs)
  const viewError = await page.locator('body').getAttribute('data-dev-view-error')
  if (viewError || errors.length) throw new Error(`${shot.name}: ${viewError ?? errors[0]}`)
  await page.waitForTimeout(captureSettle.perfSampleMs)
  const perf = readout ? await readout.evaluate((element) => ({ ...element.dataset })) : undefined
  const canvas = page.locator('canvas#stage, canvas#island').first()
  const png = join(folder, `${shot.name}.png`)
  // A clipped page screenshot skips Playwright's stability wait, which a slow software-rendered canvas can miss.
  await page.screenshot({ path: png, clip: await canvas.boundingBox(), timeout: captureSettle.firstFrameTimeoutMs })
  await page.close()
  return { png, perf: perf ? Object.fromEntries(Object.entries(perf).map(([key, value]) => [key, Number(value)])) : null }
}

async function captureRun(options, root, runFolder, commit) {
  const { server, base } = await startHost(root)
  const browser = await launchBrowser()
  const written = []
  try {
    for (const shot of planCaptures(base, options)) {
      const folder = join(runFolder, shot.preset)
      mkdirSync(folder, { recursive: true })
      const { png, perf } = await captureShot(browser, shot, folder)
      const sidecar = { ...shot.meta, preset: shot.preset, mode: shot.mode, commit, url: shot.url.replace(base, '/'), viewport: captureViewport, capturedAt: new Date().toISOString(), perf }
      writeFileSync(png.replace(/\.png$/, '.json'), JSON.stringify(sidecar, null, jsonIndent) + '\n')
      written.push({ shot, png, sidecar })
      process.stderr.write(`${relative(checkout, png)} · ${perf ? `${perf.fps} fps · ${perf.drawCalls} draws` : 'no perf readout'}\n`)
    }
    if (options.grid) await writeTurntableSheets(browser, written, runFolder)
  }
  finally {
    await browser.close()
    await server.close()
  }
  return written
}

async function writeTurntableSheets(browser, written, runFolder) {
  const page = await browser.newPage()
  const groups = Map.groupBy(written.filter(({ shot }) => shot.meta.angle !== undefined), ({ shot }) => `${shot.preset}/${shot.mode}`)
  for (const [key, shots] of groups) {
    const [preset, mode] = key.split('/')
    const out = join(runFolder, preset, `${preset}-turntable-${mode}.png`)
    await writeSheet(page, shots.map(({ png, shot }) => ({ path: png, label: `seed ${shot.meta.seed} · ${shot.meta.angle * degreesPerTurn / turntableAngles}°` })), out, turntableAngles)
    process.stderr.write(`${relative(checkout, out)}\n`)
  }
  await page.close()
}

// A run is a folder of captures: `captures` for this checkout, or a git ref captured into captures/rev-<sha>.
async function resolveRun(name, options) {
  const folder = resolve(checkout, name)
  if (existsSync(folder) && readdirSync(folder).length) return { label: basename(folder), folder }
  const { sha, folder: root } = revisionCheckout(name)
  const runFolder = join(captureRoot, `rev-${sha}`)
  await captureRun({ ...options, compare: undefined }, root, runFolder, sha)
  return { label: `${name} (${sha})`, folder: runFolder }
}

async function compareRuns(options) {
  const [before, after] = [await resolveRun(options.compare[0], options), await resolveRun(options.compare[1], options)]
  const out = join(captureRoot, 'compare', `${basename(before.folder)}-vs-${basename(after.folder)}`)
  mkdirSync(out, { recursive: true })
  const browser = await launchBrowser()
  const page = await browser.newPage()
  const report = []
  for (const preset of options.presets) {
    for (const mode of options.modes) {
      const name = `${preset}-${mode}`
      const a = join(before.folder, preset, `${name}.png`), b = join(after.folder, preset, `${name}.png`)
      if (!existsSync(a) || !existsSync(b)) continue
      const heat = join(out, `${name}-diff.png`)
      const difference = await writeDifference(page, a, b, heat)
      const sheet = join(out, `${name}.png`)
      await writeSheet(page, [{ path: a, label: before.label }, { path: b, label: after.label }, { path: heat, label: `difference · ${(difference.changedShare * percent).toFixed(1)}% changed` }], sheet, contactSheet.compareColumns)
      report.push({ preset, mode, sheet: relative(out, sheet), ...difference })
      process.stderr.write(`${relative(checkout, sheet)} · ${(difference.changedShare * percent).toFixed(1)}% changed\n`)
    }
  }
  await browser.close()
  writeFileSync(join(out, 'compare.json'), JSON.stringify({ before: before.label, after: after.label, note: 'Render modes and overlays apply only on revisions that include the dev view.', report }, null, jsonIndent) + '\n')
  return out
}

// One page that shows the newest capture of every preset and mode, with its perf numbers.
function writeIndex() {
  const rows = []
  const presets = existsSync(captureRoot) ? readdirSync(captureRoot, { withFileTypes: true }).filter((entry) => entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'compare' && !entry.name.startsWith('rev-')) : []
  for (const preset of presets) {
    for (const file of readdirSync(join(captureRoot, preset.name)).filter((name) => name.endsWith('.json')).sort()) {
      const meta = JSON.parse(readFileSync(join(captureRoot, preset.name, file), 'utf8'))
      const image = `${preset.name}/${file.replace(/\.json$/, '.png')}`
      rows.push(`<figure><a href="${image}"><img src="${image}" alt="${meta.label} · ${meta.mode}" loading="lazy"></a><figcaption><b>${meta.label}</b> · ${meta.mode}<br>${meta.perf ? `${meta.perf.fps} fps · ${meta.perf.frameMs} ms · ${meta.perf.drawCalls} draws · ${meta.perf.triangles} tris` : 'no perf readout'}<br><small>${meta.commit} · ${meta.capturedAt}</small></figcaption></figure>`)
    }
  }
  const page = `<!doctype html><meta charset="utf-8"><title>Mission Island captures</title><style>body{font:14px system-ui;background:#15181c;color:#e9ecef;margin:16px}main{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:12px}img{width:100%;display:block}figure{margin:0;background:#22272e;padding:6px}</style><h1>Latest captures</h1><main>${rows.join('')}</main>`
  writeFileSync(join(captureRoot, 'index.html'), page)
}

async function main() {
  const text = { type: 'string' }
  const { values } = parseArgs({ options: { preset: text, seed: text, hour: text, weather: text, mode: text, overlay: text, revision: text, compare: text, grid: { type: 'boolean' }, help: { type: 'boolean' } } })
  if (values.help) return void process.stdout.write(usage + '\n')
  const options = readCaptureOptions(values)
  if (options.compare) {
    const out = await compareRuns(options)
    return void process.stdout.write(`Wrote comparison sheets to ${relative(checkout, out)}\n`)
  }
  const revision = options.revision && revisionCheckout(options.revision)
  const runFolder = revision ? join(captureRoot, `rev-${revision.sha}`) : captureRoot
  const written = await captureRun(options, revision?.folder ?? checkout, runFolder, revision?.sha ?? git('rev-parse', '--short', 'HEAD'))
  if (!revision) writeIndex()
  process.stdout.write(`Wrote ${written.length} captures to ${relative(checkout, runFolder) || 'captures'}${revision ? '' : ' and captures/index.html'}\n`)
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n${usage}\n`)
  process.exitCode = 1
})
