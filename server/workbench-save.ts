import { renameSync, rmSync, writeFileSync } from 'node:fs'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { join } from 'node:path'
import type { Plugin } from 'vite'
import { readRoadLayouts, roadsSource } from '../src/road-layout-source.ts'
import { roadSavePath, workbenchSaveHeader } from '../src/workbench-save-contract.ts'

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
const httpOk = 204
const httpBadRequest = 400
const httpForbidden = 403
const httpTooLarge = 413
const httpServerError = 500

// Writes a file whole or not at all: the text goes to a temporary file beside it, which is then
// renamed over it. Vite, the type check and the bakes never read a half-written roads.ts, and a
// failed write leaves the old one in place.
export function writeFileAtomically(path: string, text: string) {
  const temporary = `${path}.${process.pid}.tmp`
  try {
    writeFileSync(temporary, text)
    renameSync(temporary, path)
  }
  catch (error) {
    rmSync(temporary, { force: true })
    throw error
  }
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
            writeFileAtomically(join(root, roadsFile), roadsSource(roads))
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
