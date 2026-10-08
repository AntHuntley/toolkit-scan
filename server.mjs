#!/usr/bin/env node
// Serves the vendored AI Studio UI (ui/) on localhost and answers its /api endpoints from out/fingerprint.json.
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const FP = process.argv.includes('--data') ? process.argv[process.argv.indexOf('--data') + 1] : path.join(here, 'out/fingerprint.json')
const PORT0 = Number(process.env.PORT || 4747)
const ICONS = { Git: 'git', 'GitHub CLI': 'github', Docker: 'docker', 'Node.js': 'nodedotjs', Python: 'python', npm: 'npm', Homebrew: 'homebrew', TypeScript: 'typescript', Playwright: 'playwright', Vitest: 'vitest', 'Claude Code': 'anthropic', 'Codex CLI': 'openai', ffmpeg: 'ffmpeg', 'Cargo/Rust': 'rust', Go: 'go', Bun: 'bun', ESLint: 'eslint', Prettier: 'prettier', Jest: 'jest', Terraform: 'terraform', kubectl: 'kubernetes', pnpm: 'pnpm', Yarn: 'yarn', SQLite: 'sqlite', jq: 'jq', pandoc: 'pandoc', 'AWS CLI': 'amazonaws', gcloud: 'googlecloud', 'VS Code CLI': 'visualstudiocode', tmux: 'tmux' }
const num = n => n.toLocaleString('en-US')
const blurb = r => (r.uses ? `${num(r.uses)} uses · ${r.sessions} sessions${r.last ? ` · last ${r.last}` : ''}` : 'Installed, never used')

function build(fp) {
  const groups = new Map()
  const add = (cat, sub, item) => { const k = cat + '\0' + sub; (groups.get(k) || groups.set(k, { cat, sub, tools: [] }).get(k)).tools.push(item) }
  const item = (r) => ({ name: r.name, desc: blurb(r), simpleIcon: ICONS[r.name] || '', url: '', group: null })
  for (const t of fp.tools) add('Command-line tools', t.category || 'Other', item(t))
  for (const m of fp.mcp) add('MCP servers', 'Servers', item(m))
  for (const s of fp.subagents) add('Agents', 'Sub-agents', item(s))
  for (const b of fp.builtin.filter(b => b.uses >= 20).slice(0, 25)) add('Agent built-ins', 'Built-in tools', item(b))
  const byCat = new Map()
  for (const g of groups.values()) (byCat.get(g.cat) || byCat.set(g.cat, []).get(g.cat)).push({ subcat: g.sub, tools: g.tools })
  const categories = [...byCat].map(([category, subcats]) => ({ category, count: subcats.reduce((n, s) => n + s.tools.length, 0), subcats }))
  const toolkit = { categories, total: categories.reduce((n, c) => n + c.count, 0) }
  const usage = { items: [...fp.tools, ...fp.mcp, ...fp.subagents, ...fp.builtin].filter(r => r.uses).map(r => ({ toolkit_item: r.name, count: r.uses })) }

  const label = { user: 'Your skills', plugin: 'Plugin skills', bundled: 'Bundled skills', unknown: 'Other / project skills' }
  const matrix = Object.entries(label).map(([k, name]) => ({ name, skills: fp.skills.filter(s => (s.source || 'unknown') === k).map(s => ({ name: s.name, role: blurb(s), source: k, enabled: true })) })).filter(c => c.skills.length)
  const details = Object.fromEntries(fp.skills.map(s => [s.name, { name: s.name, desc: blurb(s), markdown: `**${s.name}**\n\n${blurb(s)}\n\nAgents: ${Object.entries(s.agents || {}).map(([a, n]) => `${a} ${n}`).join(', ') || 'none'}`, folderPath: '', files: [], source: s.source || 'unknown', enabled: true }]))
  const skills = { matrix, details, total: fp.skills.length, dbSkillsCount: 0 }
  const statistics = { skill_usage: fp.skills.filter(s => s.uses).map(s => ({ name: s.name, count: s.uses })) }
  return { toolkit, usage, skills, statistics }
}

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
    if (p === '/api/modules') return send(res, 200, [{ id: 'workflow-mapper', name: 'Toolkit Scan', description: 'Your tool and skill fingerprint', enabled: true, integrated: true, port: 0, url: '', icon: '', healthy: true }])
    if (p === '/api/feedback') return send(res, 200, { submissions: [] })
    return send(res, 200, {}) // other AI Studio endpoints are out of scope in this read-only build
  }
  const root = path.join(here, 'ui')
  let f = path.join(root, path.normalize(p).replace(/^(\.\.[/\\])+/, ''))
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(root, 'index.html')
  send(res, 200, fs.readFileSync(f), MIME[path.extname(f)] || 'application/octet-stream')
})

let port = PORT0
server.on('error', e => { if (e.code === 'EADDRINUSE' && port < PORT0 + 20) server.listen(++port, '127.0.0.1'); else throw e })
server.on('listening', () => {
  const u = `http://localhost:${port}/workflows/toolkit`
  console.log(`toolkit scan → ${u}   (Ctrl+C to stop)`)
  if (!process.argv.includes('--no-open')) execFile(process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'cmd' : 'xdg-open', process.platform === 'win32' ? ['/c', 'start', u] : [u], () => {})
})
server.listen(port, '127.0.0.1')
