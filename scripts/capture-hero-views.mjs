// Captures Highwood's hero views from a running Workbench, for Art Director
// reviews and pull-request screenshots. Every capture uses the same eye, target,
// hour, weather and window size, so two runs compare like for like.
//
// Start the game first (npm run dev or npm run playtest), then:
//   npm run capture:heroes -- --base http://localhost:5173 [--view hero-tower-north] [--out DIR] [--browser PATH] [--size 1600x900]
//
// It drives a headless Chrome or Chromium over the DevTools protocol, so it needs
// no extra packages. It finds Google Chrome, Chrome for Testing in the Playwright
// cache, or a path in CHROME_PATH or --browser.
import { Buffer } from 'node:buffer'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { join } from 'node:path'
import process from 'node:process'
import { clearTimeout, setTimeout } from 'node:timers'
import { setTimeout as sleep } from 'node:timers/promises'
import { URL } from 'node:url'
import { parseArgs } from 'node:util'
import { highwoodHeroViews } from '../src/worlds/starter/layout/hero-views.ts'

const readyTimeoutMs = 45_000
const pollMs = 500
const cleanupRetries = 5
// What the page reports when it never becomes ready.
const diagnosis = `({
  webgl: Boolean(document.createElement('canvas').getContext('webgl2')),
  capture: document.body?.classList.contains('workbench-capture'),
  error: document.querySelector('[role=alert], .error, #stage-error')?.textContent ?? '',
  href: location.href,
  title: document.title,
  stage: Boolean(document.querySelector('#stage')),
})`
const launchTimeoutMs = 20_000
const defaultSize = '1600x900'
const defaultBase = 'http://localhost:5173'
const sizePattern = /^(\d{3,4})x(\d{3,4})$/

function findBrowser(explicit) {
  const candidates = [
    explicit,
    process.env.CHROME_PATH,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
  ]
  const playwright = join(homedir(), 'Library', 'Caches', 'ms-playwright')
  if (existsSync(playwright)) {
    for (const folder of readdirSync(playwright).filter((name) => name.startsWith('chromium-')).sort().reverse()) {
      candidates.push(join(playwright, folder, 'chrome-mac-arm64', 'Google Chrome for Testing.app', 'Contents', 'MacOS', 'Google Chrome for Testing'))
      candidates.push(join(playwright, folder, 'chrome-mac', 'Chromium.app', 'Contents', 'MacOS', 'Chromium'))
      candidates.push(join(playwright, folder, 'chrome-linux', 'chrome'))
    }
  }
  const found = candidates.find((path) => path && existsSync(path))
  if (!found) throw new Error('No Chrome or Chromium found. Pass --browser PATH or set CHROME_PATH.')
  return found
}

function launch(browser, size, profile) {
  const child = spawn(browser, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, `--window-size=${size.width},${size.height}`, '--hide-scrollbars', '--mute-audio', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] })
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('The browser did not start its DevTools endpoint.')), launchTimeoutMs)
    let log = ''
    child.stderr.on('data', (chunk) => {
      log += chunk
      const match = /DevTools listening on (ws:\/\/\S+)/.exec(log)
      if (match) {
        clearTimeout(timer)
        resolve({ child, endpoint: match[1] })
      }
    })
    child.on('exit', (code) => reject(new Error(`The browser exited (${code}).`)))
  })
}

function connect(endpoint) {
  const socket = new globalThis.WebSocket(endpoint)
  let next = 0
  const pending = new Map()
  socket.addEventListener('message', ({ data }) => {
    const message = JSON.parse(String(data))
    const waiter = pending.get(message.id)
    if (!waiter) return
    pending.delete(message.id)
    if (message.error) waiter.reject(new Error(message.error.message))
    else waiter.resolve(message.result)
  })
  const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
    const id = ++next
    pending.set(id, { resolve, reject })
    socket.send(JSON.stringify({ id, method, params, ...(sessionId && { sessionId }) }))
  })
  return new Promise((resolve, reject) => {
    socket.addEventListener('open', () => resolve({ send, close: () => socket.close() }))
    socket.addEventListener('error', () => reject(new Error('Could not connect to the browser.')))
  })
}

async function capture(cdp, url, size, path) {
  const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' })
  const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true })
  try {
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: size.width, height: size.height, deviceScaleFactor: 1, mobile: false }, sessionId)
    await cdp.send('Page.enable', {}, sessionId)
    await cdp.send('Page.navigate', { url }, sessionId)
    const deadline = Date.now() + readyTimeoutMs
    for (;;) {
      const { result } = await cdp.send('Runtime.evaluate', { expression: 'document.body?.dataset.captureReady === "true"', returnByValue: true }, sessionId)
      if (result.value) break
      if (Date.now() > deadline) {
        const { result: state } = await cdp.send('Runtime.evaluate', { expression: diagnosis, returnByValue: true }, sessionId)
        throw new Error(`Timed out waiting for ${url}: ${JSON.stringify(state.value)}`)
      }
      await sleep(pollMs)
    }
    const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' }, sessionId)
    writeFileSync(path, Buffer.from(data, 'base64'))
  }
  finally {
    await cdp.send('Target.closeTarget', { targetId })
  }
}

const { values } = parseArgs({ options: { base: { type: 'string' }, view: { type: 'string', multiple: true }, out: { type: 'string' }, browser: { type: 'string' }, size: { type: 'string' } } })
const sizeMatch = sizePattern.exec(values.size ?? defaultSize)
if (!sizeMatch) throw new Error('Use --size WIDTHxHEIGHT, for example 1600x900.')
const size = { width: Number(sizeMatch[1]), height: Number(sizeMatch[2]) }
const base = new URL(values.base ?? defaultBase)
const views = values.view?.length ? highwoodHeroViews.filter(({ id }) => values.view.includes(id)) : highwoodHeroViews
if (!views.length) throw new Error(`Unknown view. Choose from: ${highwoodHeroViews.map(({ id }) => id).join(', ')}`)
const stamp = new Date().toISOString().replace(/[:.]/g, '-')
const out = values.out ?? join(process.cwd(), '.mission-island', 'captures', stamp)
mkdirSync(out, { recursive: true })
const profile = mkdtempSync(join(tmpdir(), 'mission-capture-'))
const { child, endpoint } = await launch(findBrowser(values.browser), size, profile)
try {
  const cdp = await connect(endpoint)
  for (const view of views) {
    const url = new URL(`workbench.html?view=${view.id}&capture#landscape`, base)
    const path = join(out, `${view.id}.png`)
    await capture(cdp, url.href, size, path)
    process.stdout.write(`${view.label} → ${path}\n`)
  }
  cdp.close()
}
finally {
  const exited = once(child, 'exit')
  child.kill()
  await exited
  rmSync(profile, { recursive: true, force: true, maxRetries: cleanupRetries })
}
