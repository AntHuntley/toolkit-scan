#!/usr/bin/env node
// Serves the vendored AI Studio UI (ui/) on localhost and answers its /api endpoints from out/fingerprint.json.
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { execFile } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const FP = process.argv.includes('--data') ? process.argv[process.argv.indexOf('--data') + 1] : path.join(os.homedir(), '.toolkit-scan/fingerprint.json')
const PORT0 = Number(process.env.PORT || 4747)
import { build } from './api.mjs'

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.woff2': 'font/woff2' }
const send = (res, code, body, type = 'application/json') => { res.writeHead(code, { 'content-type': type }); res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body)) }

const server = http.createServer((req, res) => {
  const p = new URL(req.url, 'http://x').pathname
  if (p.startsWith('/api/')) {
    if (req.method !== 'GET') return send(res, 405, { error: 'read-only' })
    let fp; try { fp = JSON.parse(fs.readFileSync(FP, 'utf8')) } catch { return send(res, 500, { error: 'run scan.mjs first' }) }
    const d = build(fp)
    if (p === '/api/toolkit') return send(res, 200, d.toolkit)
    if (p === '/api/toolkit/usage') return send(res, 200, d.usage)
    if (p === '/api/skills') return send(res, 200, d.skills)
    if (p === '/api/statistics') return send(res, 200, d.statistics)
    if (p === '/api/fingerprint') return send(res, 200, fp)
    if (p === '/api/sample-friend') { // synthetic friend for trying the Compare tab without a real file
      try { return send(res, 200, fs.readFileSync(path.join(here, 'demo/friend.demo.json'), 'utf8')) } catch { return send(res, 404, { error: 'no sample' }) }
    }
    return send(res, 404, { error: 'not found' })
  }
  const root = path.join(here, 'ui')
  let f = path.join(root, path.normalize(p).replace(/^(\.\.[/\\])+/, ''))
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(root, 'index.html')
  send(res, 200, fs.readFileSync(f), MIME[path.extname(f)] || 'application/octet-stream')
})

let port = PORT0
server.on('error', e => { if (e.code === 'EADDRINUSE' && port < PORT0 + 20) server.listen(++port, '127.0.0.1'); else throw e })
server.on('listening', () => {
  const u = `http://localhost:${port}/`
  console.log(`toolkit scan → ${u}   (Ctrl+C to stop)`)
  if (!process.argv.includes('--no-open')) execFile(process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'cmd' : 'xdg-open', process.platform === 'win32' ? ['/c', 'start', u] : [u], () => {})
})
server.listen(port, '127.0.0.1')
