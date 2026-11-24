import { writeFileSync } from 'node:fs'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { join } from 'node:path'
import type { Plugin } from 'vite'
import { gradedRoadKinds } from '../src/assets/geometry/road-kinds.ts'
import type { StarterRoadLayout } from '../src/worlds/starter/layout/roads.ts'
import { roadSaveDecimals as decimals, roadSavePath, workbenchSaveHeader } from '../src/workbench-save-contract.ts'

// Lets the Workbench road designer save straight into the source tree while the
// dev server runs. It writes exactly one file, the road layout, and only for a
// request that passes three checks. The loopback check keeps other computers on
// the LAN out. The Workbench's own header makes a browser preflight the request,
// but Vite's dev CORS middleware grants preflights to any localhost page, so the
// header alone does not stop another local site. The same-origin check does: a
// browser sets `Origin` and `Sec-Fetch-Site` itself, and no page can change them,
// and the Host must be a loopback name, which keeps DNS-rebinding pages out.

const roadsFile = 'src/worlds/starter/layout/roads.ts'
const maxBodyBytes = 262_144
const maxRoads = 32
const maxPoints = 400
const minPoints = 2
const islandReachM = 2000
const maxBendM = 200
const maxGrade = 0.4
const idPattern = /^[a-z0-9][a-z0-9-]{0,47}$/
const maxNameLength = 80
const httpOk = 204
const httpBadRequest = 400
const httpForbidden = 403
const httpTooLarge = 413
const httpServerError = 500

type RoadKind = typeof gradedRoadKinds[number]

const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)
const within = (value: unknown, limit: number) => finite(value) && Math.abs(value) <= limit

// `position` names a road in errors until its own name has been read.
function readRoad(raw: unknown, position: number): StarterRoadLayout | string {
  if (!raw || typeof raw !== 'object') return `road ${position} is not a road`
  const { id, name, kind, points, bends, maxGrade: grades } = raw as Record<string, unknown>
  if (typeof name !== 'string' || !name.trim() || name.length > maxNameLength) return `road ${position} needs a name of up to ${maxNameLength} characters`
  const label = name.trim()
  if (typeof id !== 'string' || !idPattern.test(id)) return `${label} needs an id of lowercase letters, digits and hyphens`
  if (!gradedRoadKinds.some((graded) => graded === kind)) return `${label} has an unknown kind`
  if (!Array.isArray(points) || points.length < minPoints || points.length > maxPoints) return `${label} needs ${minPoints} to ${maxPoints} dots`
  const dots = points.map((point: unknown) => point && typeof point === 'object' ? point as Record<string, unknown> : {})
  const offIsland = dots.findIndex((point) => !(within(point.x, islandReachM) && within(point.z, islandReachM)))
  if (offIsland >= 0) return `${label} has dot ${offIsland + 1} off the island`
  if (!Array.isArray(bends) || bends.length !== points.length - 1 || !bends.every((bend) => within(bend, maxBendM))) return `${label} needs one bend per stretch`
  if (grades !== undefined && (!Array.isArray(grades) || grades.length !== bends.length || !grades.every((grade) => grade === null || (finite(grade) && grade > 0 && grade <= maxGrade)))) return `${label} has a bad grade limit`
  return {
    id,
    name: label,
    kind: kind as RoadKind,
    points: dots.map(({ x, z }) => ({ x: Number((x as number).toFixed(decimals)), z: Number((z as number).toFixed(decimals)) })),
    bends: bends.map((bend: number) => Number(bend.toFixed(decimals))),
    ...(grades && { maxGrade: grades as (number | null)[] }),
  }
}

// The road layouts in a request body, or why they were refused.
export function readRoadLayouts(body: string): StarterRoadLayout[] | string {
  let parsed: unknown
  try {
    parsed = JSON.parse(body)
  }
  catch {
    return 'the body is not JSON'
  }
  if (!Array.isArray(parsed) || parsed.length > maxRoads) return `send a list of up to ${maxRoads} roads`
  const roads: StarterRoadLayout[] = []
  for (const [i, raw] of parsed.entries()) {
    const road = readRoad(raw, i + 1)
    if (typeof road === 'string') return road
    const twin = roads.find((other) => other.id === road.id)
    if (twin) return `road ids must be unique: ${twin.name} and ${road.name} are both ${road.id}`
    roads.push(road)
  }
  return roads
}

// roads.ts is authored data and may not import, so its kind type is written out from
// the road kinds at each save. The type check catches a checked-in file that falls
// behind: `readRoad` returns a `RoadKind` as a layout kind, and the designer looks a
// layout kind up in `roadKinds`. Only graded kinds are saved: paved roads are authored elsewhere.
const kindUnion = gradedRoadKinds.map((kind) => `'${kind}'`).join(' | ')

const point = ({ x, z }: { x: number, z: number }) => `{ x: ${x}, z: ${z} }`

// The road layout as the TypeScript source file the game reads.
export function roadsSource(roads: readonly StarterRoadLayout[]) {
  const body = roads.map((road) => [
    '  {',
    `    id: '${road.id}',`,
    `    name: ${JSON.stringify(road.name).replaceAll('\'', '\\\'').replace(/^"|"$/g, '\'')},`,
    `    kind: '${road.kind}',`,
    `    points: [${road.points.map(point).join(', ')}],`,
    `    bends: [${road.bends.join(', ')}],`,
    ...(road.maxGrade ? [`    maxGrade: [${road.maxGrade.map((grade) => grade ?? 'null').join(', ')}],`] : []),
    '  },',
  ].join('\n')).join('\n')
  return `// Generated by the Workbench road designer (workbench.html#road-designer).
// Edit the roads there and save; hand edits are overwritten on the next save.
// Each road runs through its dots; a stretch's bend moves its middle sideways in metres
// (+ left of travel). \`maxGrade\` optionally overrides the kind's grade limit per stretch.

export interface StarterRoadLayout {
  id: string
  name: string
  kind: ${kindUnion}
  points: readonly { x: number, z: number }[]
  bends: readonly number[]
  maxGrade?: readonly (number | null)[]
}

export const starterRoads: readonly StarterRoadLayout[] = [${roads.length ? `\n${body}\n` : ''}]
`
}

// A browser names the page that sent a request in `Origin` and, in current browsers,
// says whether it is this site in `Sec-Fetch-Site`. Either must say it is this server,
// and the server must have been reached by a loopback name. A page on another domain
// that rebinds its DNS to 127.0.0.1 is "same-origin" with itself, so the Host check is
// what refuses it here; Vite's own host check refuses it too, but only while the config
// leaves `allowedHosts` and `https` unset.
const loopbackNames = new Set(['localhost', '127.0.0.1', '[::1]'])
// The name part of a Host header, without its port: `[::1]:5173` gives `[::1]`.
const hostName = (host: string) => host.startsWith('[') ? host.slice(0, host.indexOf(']') + 1) : host.split(':')[0]
export function fromThisSite({ headers }: Pick<IncomingMessage, 'headers'>) {
  const { origin, host } = headers
  if (!host || !loopbackNames.has(hostName(host))) return false
  if (headers['sec-fetch-site'] === 'same-origin') return true
  return origin === `http://${host}` || origin === `https://${host}`
}

export function fromThisComputer(request: Pick<IncomingMessage, 'socket'>) {
  const address = request.socket.remoteAddress ?? ''
  return address === '127.0.0.1' || address === '::1' || address === '::ffff:127.0.0.1'
}

function reply(response: ServerResponse, status: number, message = '') {
  response.statusCode = status
  response.setHeader('content-type', 'text/plain; charset=utf-8')
  response.end(message)
}

export function workbenchSave(root: string): Plugin {
  return {
    name: 'mission-island-workbench-save',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(roadSavePath, (request, response) => {
        if (request.method !== 'POST' || request.headers[workbenchSaveHeader] !== 'save' || !fromThisComputer(request)) {
          reply(response, httpForbidden, 'Workbench saves are accepted only from this computer.')
          return
        }
        if (!fromThisSite(request)) {
          reply(response, httpForbidden, 'Workbench saves are accepted only from the Workbench on this dev server.')
          return
        }
        let body = ''
        request.setEncoding('utf8')
        request.on('data', (chunk: string) => {
          body += chunk
          if (body.length > maxBodyBytes) request.destroy()
        })
        request.on('end', () => {
          if (body.length > maxBodyBytes) {
            reply(response, httpTooLarge, 'The road layout is too large.')
            return
          }
          const roads = readRoadLayouts(body)
          if (typeof roads === 'string') {
            reply(response, httpBadRequest, roads)
            return
          }
          try {
            writeFileSync(join(root, roadsFile), roadsSource(roads))
            reply(response, httpOk)
          }
          catch (error) {
            reply(response, httpServerError, String(error))
          }
        })
      })
    },
  }
}
