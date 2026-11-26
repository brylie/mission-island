import { execFileSync } from 'node:child_process'
import { appendFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { basename, isAbsolute, join, resolve } from 'node:path'
import { markFolderName, markLimits, playtestMarkVersion, readMarkUpload, type MarkUpload } from '../src/playtest-mark.ts'

// Saves playtest marks from the game page into a folder a code agent can read. Only the dev
// server mounts it (`vite` and `vite --mode playtest`, not `vite preview`), and only a crewmate
// who has joined this host can save: the request carries their crew token, which no other page
// can send. Seat tokens are chosen by the client, so in practice anyone who can reach the port
// and join can save. Every path is chosen here; the page sends only the record, two notes and a JPEG.

const httpCreated = 201
const httpBadRequest = 400
const httpForbidden = 403
const httpMethodNotAllowed = 405
const httpTooLarge = 413
const httpServerError = 500
const jsonIndent = 2
// A second mark in the same second of the same thing gets a numbered folder.
const maximumSameNameFolders = 100

// MISSION_ISLAND_NOTES_DIR sends every checkout's marks to one folder; otherwise they stay in the
// checkout that serves the game, under playtest-notes/ (ignored by git and by the dev server).
export function notesDirectory(root: string, configured = process.env.MISSION_ISLAND_NOTES_DIR) {
  if (!configured) return join(root, 'playtest-notes')
  return isAbsolute(configured) ? configured : resolve(root, configured)
}

function commitOf(root: string) {
  try {
    return execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
  }
  catch {
    return null
  }
}

function freshFolder(directory: string, name: string) {
  for (let copy = 1; copy <= maximumSameNameFolders; copy++) {
    const folder = join(directory, copy === 1 ? name : `${name}-${copy}`)
    if (!existsSync(folder)) return folder
  }
  throw new Error('Too many marks with the same name in one second.')
}

// Writes `<folder>/mark.json` and `<folder>/shot.jpg`, and adds a line to `marks.jsonl` so a
// long session's marks can be scanned without opening every folder.
export function saveMark(directory: string, upload: MarkUpload, now: Date, commit: string | null) {
  mkdirSync(directory, { recursive: true })
  const folder = freshFolder(directory, markFolderName(now, upload.record.label))
  mkdirSync(folder)
  const savedAt = now.toISOString()
  const mark = { ...upload.record, version: playtestMarkVersion, savedAt, commit, notes: upload.notes, screenshot: 'shot.jpg' }
  writeFileSync(join(folder, 'shot.jpg'), Buffer.from(upload.jpeg, 'base64'))
  writeFileSync(join(folder, 'mark.json'), JSON.stringify(mark, null, jsonIndent) + '\n')
  appendFileSync(join(directory, 'marks.jsonl'), JSON.stringify({ folder, savedAt, label: upload.record.label, notes: upload.notes }) + '\n')
  return folder
}

function reply(response: ServerResponse, status: number, body: string, type = 'text/plain; charset=utf-8') {
  response.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' }).end(body)
}

export function playtestMarkHandler(root: string, isCrew: (authorization: string | undefined) => boolean, directory = notesDirectory(root)) {
  return (request: IncomingMessage, response: ServerResponse) => {
    if (request.method !== 'POST') {
      reply(response, httpMethodNotAllowed, 'Use POST.')
      return
    }
    if (!isCrew(request.headers.authorization)) {
      reply(response, httpForbidden, 'Join the crew first.')
      return
    }
    let body = ''
    let tooLarge = false
    request.setEncoding('utf8')
    request.on('data', (chunk: string) => {
      if (tooLarge) return
      body += chunk
      if (body.length > markLimits.bodyBytes) {
        // Refuse now and drop the rest of the upload as it arrives.
        tooLarge = true
        body = ''
        response.setHeader('Connection', 'close')
        reply(response, httpTooLarge, 'The mark is too large.')
      }
    })
    request.on('end', () => {
      if (tooLarge) return
      const upload = readMarkUpload(body)
      if (typeof upload === 'string') {
        reply(response, httpBadRequest, upload)
        return
      }
      try {
        const folder = saveMark(directory, upload, new Date(), commitOf(root))
        console.info(`Playtest mark saved: ${folder}`)
        // The page gets the folder's name; the host's own path stays in its log.
        reply(response, httpCreated, JSON.stringify({ name: basename(folder) }), 'application/json')
      }
      catch (error) {
        reply(response, httpServerError, `Could not save the mark: ${(error as Error).message}`)
      }
    })
  }
}
