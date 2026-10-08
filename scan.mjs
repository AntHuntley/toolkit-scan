#!/usr/bin/env node
// toolkit-scan prototype: deterministic (zero-LLM) fingerprint of tools / skills / MCP servers
// from Claude Code + Codex transcripts, cross-referenced with what is installed.
// Usage: node scan.mjs [--claude DIR] [--codex DIR] [--out FILE] [--limit N files]
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import readline from 'node:readline'
import { execFileSync } from 'node:child_process'

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d }
const HOME = os.homedir()
const STATE_DIR = path.join(HOME, '.toolkit-scan')
const OUT = arg('--out', path.join(STATE_DIR, 'fingerprint.json'))
const LIMIT = Number(arg('--limit', 0))

// ── Catalog: CLI command → display name + category (small seed; the long tail is reported, not guessed)
const CLI = {
  git: ['Git', 'Version Control'], gh: ['GitHub CLI', 'Version Control'], docker: ['Docker', 'Infrastructure'],
  kubectl: ['kubectl', 'Infrastructure'], terraform: ['Terraform', 'Infrastructure'], ssh: ['SSH', 'Infrastructure'],
  npm: ['npm', 'Package & Env'], npx: ['npx', 'Package & Env'], pnpm: ['pnpm', 'Package & Env'], yarn: ['Yarn', 'Package & Env'],
  bun: ['Bun', 'Package & Env'], uv: ['uv', 'Package & Env'], uvx: ['uv', 'Package & Env'], pip: ['pip', 'Package & Env'], pip3: ['pip', 'Package & Env'],
  brew: ['Homebrew', 'Package & Env'], node: ['Node.js', 'Languages & Runtimes'], python3: ['Python', 'Languages & Runtimes'],
  python: ['Python', 'Languages & Runtimes'], cargo: ['Cargo/Rust', 'Languages & Runtimes'], go: ['Go', 'Languages & Runtimes'],
  tsc: ['TypeScript', 'Languages & Runtimes'], vitest: ['Vitest', 'Testing'], jest: ['Jest', 'Testing'], pytest: ['pytest', 'Testing'],
  playwright: ['Playwright', 'Testing'], eslint: ['ESLint', 'Quality'], ruff: ['Ruff', 'Quality'], prettier: ['Prettier', 'Quality'],
  curl: ['curl', 'Network'], jq: ['jq', 'Data'], rg: ['ripgrep', 'Search'], sqlite3: ['SQLite', 'Data'], make: ['make', 'Build'],
  tmux: ['tmux', 'Terminal'], claude: ['Claude Code', 'AI Agents'], codex: ['Codex CLI', 'AI Agents'], aos: ['aos CLI', 'AI Agents'],
  ffmpeg: ['ffmpeg', 'Creative'], whisper: ['Whisper', 'Creative'], pandoc: ['pandoc', 'Documents'], soffice: ['LibreOffice', 'Documents'],
  sops: ['sops', 'Security'], op: ['1Password CLI', 'Security'], gcloud: ['gcloud', 'Infrastructure'], aws: ['AWS CLI', 'Infrastructure'],
  az: ['Azure CLI', 'Infrastructure'], osascript: ['AppleScript', 'macOS'], open: ['open (macOS)', 'macOS'], code: ['VS Code CLI', 'IDE'],
}
const IGNORE = new Set('cd ls echo cat head tail grep sed awk sort uniq wc find xargs tr cut mkdir rm cp mv touch chmod test true false printf export source set which sleep pwd date env read if then else fi for do done while case esac exit return diff tee basename dirname stat ps kill lsof tar unzip zip sh bash zsh [ [[ ln du df next break until continue wait nl disown local shift function select trap eval unset alias'.split(' '))
const BUNDLED_SKILLS = ['claude-api','update-config','run','code-review','simplify','loop','init','security-review','fewer-permission-prompts','keybindings-help','schedule','dataviz','artifact-design','artifact-diagramming','artifact-capabilities','workflow-authoring','plugin-authoring','review','autonomy']
const WRAPPERS = new Set(['sudo', 'time', 'command', 'exec', 'nohup', 'env', 'nice', 'timeout', 'builtin'])

function cmdNames(cmd) {
  const out = new Set()
  cmd = String(cmd || '').split(/<<-?\s*['"]?\w+['"]?/)[0].replace(/'[^']*'|"[^"]*"/gs, '""')
  for (const seg of cmd.split(/\|\||&&|[|;\n]/)) {
    let t = seg.trim().replace(/^[({]+\s*/, '')
    if (!t || t[0] === '#') continue
    let w = t.split(/\s+/)
    while (w.length && (/^[A-Za-z_]\w*=/.test(w[0]) || WRAPPERS.has(w[0]))) w.shift()
    if (!w.length) continue
    let name = path.basename(w[0].replace(/^["']|["']$/g, ''))
    if ((name === 'npx' || name === 'bunx') && w[1]) name = path.basename(w[1])
    if (/^[A-Za-z][\w.+-]*$/.test(name)) out.add(name)
  }
  return out
}

// ── Accumulator: item → {n, sessions:Set, first, last, week:{}, agents:{}}
const acc = { tool: new Map(), skill: new Map(), mcp: new Map(), builtin: new Map(), slash: new Map(), unknownCli: new Map(), subagent: new Map(), mcpTool: new Map() }
function bump(kind, key, { session, ts, agent }) {
  let m = acc[kind].get(key)
  if (!m) acc[kind].set(key, (m = { n: 0, sessions: new Set(), first: ts, last: ts, week: {}, agents: {} }))
  m.n++; m.sessions.add(session)
  if (ts) { if (!m.first || ts < m.first) m.first = ts; if (!m.last || ts > m.last) m.last = ts
    const w = ts.slice(0, 7); m.week[w] = (m.week[w] || 0) + 1 }
  m.agents[agent] = (m.agents[agent] || 0) + 1
}

const stats = { files: 0, bytes: 0, lines: 0, parsed: 0, parseErrors: 0, dupToolUse: 0, perAgent: {} }
const seenToolUse = new Set(), allSessions = new Set()

function recordBash(cmd, ctx) {
  for (const name of cmdNames(cmd)) {
    if (CLI[name]) bump('tool', CLI[name][0], ctx)
    else if (!IGNORE.has(name)) bump('unknownCli', name, ctx)
  }
}

async function scanFile(file, agent) {
  const session = path.basename(file, '.jsonl')
  const rl = readline.createInterface({ input: fs.createReadStream(file), crlfDelay: Infinity })
  for await (const line of rl) {
    stats.lines++
    if (agent === 'claude') {
      const hasTool = line.includes('"tool_use"'), hasSlash = line.includes('<command-name>')
      if (!hasTool && !hasSlash) continue
      let o; try { o = JSON.parse(line) } catch { stats.parseErrors++; continue }
      stats.parsed++
      const ts = o.timestamp, ctx = { session: o.sessionId || session, ts, agent }; allSessions.add(ctx.session)
      const content = o.message?.content
      if (o.type === 'assistant' && Array.isArray(content)) {
        for (const b of content) {
          if (b.type !== 'tool_use') continue
          if (b.id) { if (seenToolUse.has(b.id)) { stats.dupToolUse++; continue } seenToolUse.add(b.id) }
          const n = b.name || ''
          if (n === 'Skill') bump('skill', String(b.input?.skill || '?').toLowerCase(), { ...ctx, agent: 'claude:agent' })
          else if (n.startsWith('mcp__')) { const [, srv, ...t] = n.split('__'); bump('mcp', srv || '?', ctx); bump('mcpTool', `${srv}/${t.join('__')}`, ctx) }
          else if (n === 'Bash') recordBash(b.input?.command, ctx)
          else { bump('builtin', n, ctx); if (n === 'Agent' && b.input?.subagent_type) bump('subagent', b.input.subagent_type, ctx) }
        }
      } else if (o.type === 'user' && typeof content === 'string' && hasSlash && content.startsWith('<command-message>')) {
        const m = content.match(/<command-name>\/?([^<\s]+)<\/command-name>/)
        if (m) bump('slash', m[1].toLowerCase(), { ...ctx, agent: 'claude:user' })
      }
    } else {
      if (!line.includes('"function_call"')) continue
      let o; try { o = JSON.parse(line) } catch { stats.parseErrors++; continue }
      const p = o.payload; if (p?.type !== 'function_call') continue
      stats.parsed++
      const ctx = { session, ts: o.timestamp, agent }
      let args = {}; try { args = JSON.parse(p.arguments || '{}') } catch {}
      const cmd = args.cmd ?? (Array.isArray(args.command) ? args.command.join(' ') : args.command)
      if (p.name === 'exec_command' || p.name === 'shell' || p.name === 'shell_command') {
        const sk = String(cmd || '').match(/skills\/([\w.-]+)\/SKILL\.md/g)
        if (sk) for (const s of new Set(sk)) bump('skill', s.split('/')[1].toLowerCase(), { ...ctx, agent: 'codex:read' })
        recordBash(cmd, ctx)
      } else if (/^mcp__|__/.test(p.name || '')) bump('mcp', String(p.name).split('__')[1] || p.name, ctx)
      else bump('builtin', p.name || '?', ctx)
    }
  }
}

function walk(dir) {
  const out = []
  const rec = d => { let es; try { es = fs.readdirSync(d, { withFileTypes: true }) } catch { return }
    for (const e of es) { const p = path.join(d, e.name); e.isDirectory() ? rec(p) : e.name.endsWith('.jsonl') && out.push(p) } }
  rec(dir); return out
}

// ── Transcript source discovery. Different installs keep transcripts in different places (CLI vs desktop app,
// CLAUDE_CONFIG_DIR / CODEX_HOME overrides, XDG dirs, Windows, WSL). We probe known roots, honour env vars, a
// user config file and --source flags, then sniff the file *format* (not the folder name) to pick the parser.
const argAll = k => process.argv.flatMap((a, i, v) => (a === k && v[i + 1] ? [v[i + 1]] : []))
const env = process.env
const candidates = [
  env.CLAUDE_CONFIG_DIR && path.join(env.CLAUDE_CONFIG_DIR, 'projects'),
  path.join(HOME, '.claude/projects'), path.join(HOME, '.config/claude/projects'),
  env.APPDATA && path.join(env.APPDATA, 'Claude/projects'), env.LOCALAPPDATA && path.join(env.LOCALAPPDATA, 'Claude/projects'),
  path.join(HOME, 'Library/Application Support/Claude/projects'),
  env.CODEX_HOME && path.join(env.CODEX_HOME, 'sessions'), env.CODEX_HOME && path.join(env.CODEX_HOME, 'archived_sessions'),
  path.join(HOME, '.codex/sessions'), path.join(HOME, '.codex/archived_sessions'),
  ...(process.platform === 'linux' ? globWin('/mnt/c/Users/*/.claude/projects').concat(globWin('/mnt/c/Users/*/.codex/sessions')) : []),
  ...argAll('--source'), ...argAll('--claude'), ...argAll('--codex'),
]
function globWin(pat) { // tiny single-level '*' glob for WSL -> Windows profile dirs
  const [pre, post] = pat.split('/*/'); try { return fs.readdirSync(pre).map(u => path.join(pre, u, post)) } catch { return [] } }
try { const j = JSON.parse(fs.readFileSync(path.join(STATE_DIR, 'sources.json'), 'utf8')); candidates.push(...(j.paths || [])) } catch {}
function sniff(file) { // → 'claude' | 'codex' | null, from the first lines of a transcript
  try { const fd = fs.openSync(file, 'r'), b = Buffer.alloc(65536); const n = fs.readSync(fd, b, 0, 65536, 0); fs.closeSync(fd)
    for (const l of b.toString('utf8', 0, n).split('\n').slice(0, 40)) { let o; try { o = JSON.parse(l) } catch { continue }
      if (o.payload && (o.type === 'session_meta' || o.type === 'response_item' || o.type === 'event_msg' || o.type === 'turn_context')) return 'codex'
      if (o.sessionId || (o.message && o.message.role) || o.type === 'user' || o.type === 'assistant') return 'claude' } } catch {}
  return null }
function discoverSources() {
  const seen = new Set(), out = []
  for (const c of candidates.filter(Boolean)) { const dir = path.resolve(c.replace(/^~(?=$|\/)/, HOME)); if (seen.has(dir)) continue; seen.add(dir)
    let files; try { files = fs.statSync(dir).isDirectory() ? walk(dir) : dir.endsWith('.jsonl') ? [dir] : [] } catch { continue }
    if (!files.length) continue
    const kinds = {}; for (const f of files.slice(0, 5)) { const k = sniff(f); if (k) kinds[k] = (kinds[k] || 0) + 1 }
    const agent = Object.entries(kinds).sort((a, b) => b[1] - a[1])[0]?.[0]
    out.push({ dir, agent: agent || 'unrecognised', files: files.length }) }
  return out }

// ── Installed inventory
const sh = c => { try { const win = process.platform === 'win32'; return execFileSync(win ? 'cmd' : '/bin/sh', win ? ['/c', c.replace('command -v', 'where')] : ['-c', c], { stdio: ['ignore', 'pipe', 'ignore'], timeout: 3000 }).toString().trim() } catch { return '' } }
function installed() {
  const ls = d => { try { return fs.readdirSync(d, { withFileTypes: true }).filter(e => e.isDirectory() || e.isSymbolicLink()).map(e => e.name) } catch { return [] } }
  const skills = new Set([...ls(path.join(HOME, '.claude/skills')), ...ls(path.join(HOME, '.codex/skills'))].filter(s => !s.startsWith('.') && !s.startsWith('_')).map(s => s.toLowerCase()))
  const mcp = new Set()
  const plugin = new Set(), bundled = new Set(BUNDLED_SKILLS)
  const walkSkills = (d, depth = 0) => { try { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name)
    if (e.isDirectory() && e.name === 'skills') ls(p).forEach(n => plugin.add(n.toLowerCase()))
    else if (e.isDirectory() && depth < 6 && e.name !== 'node_modules') walkSkills(p, depth + 1) } } catch {} }
  walkSkills(path.join(HOME, '.claude/plugins')); ls(path.join(HOME, '.codex/skills/.system')).forEach(n => bundled.add(n.toLowerCase()))
  for (const f of [path.join(HOME, '.claude.json'), path.join(HOME, '.claude/settings.json')]) {
    try { const j = JSON.parse(fs.readFileSync(f, 'utf8')); Object.keys(j.mcpServers || {}).forEach(k => mcp.add(k)) } catch {}
  }
  const tools = new Set()
  for (const [cmd, [name]] of Object.entries(CLI)) if (sh(`command -v ${cmd}`)) tools.add(name)
  let ext = []; try { ext = fs.readdirSync(path.join(HOME, '.vscode/extensions')).filter(e => e !== 'extensions.json') } catch {}
  return { skills, mcp, tools, plugin, bundled, vscodeExtensions: ext.length }
}

let inst
const rows = (kind, installedSet) => {
  const used = [...acc[kind]].map(([name, m]) => ({ name, uses: m.n, sessions: m.sessions.size, first: m.first?.slice(0, 10), last: m.last?.slice(0, 10), agents: m.agents, byMonth: m.week }))
  if (installedSet) {
    const have = new Set(used.map(u => u.name))
    for (const n of installedSet) if (!have.has(n)) used.push({ name: n, uses: 0, sessions: 0 })
    used.forEach(u => { u.installed = installedSet.has(u.name); u.source = u.installed ? 'user' : inst.plugin.has(u.name) ? 'plugin' : inst.bundled.has(u.name) ? 'bundled' : kind === 'skill' ? 'unknown' : undefined })
  }
  return used.sort((a, b) => b.uses - a.uses)
}

// ── Run
const t0 = Date.now()
const sources = discoverSources()
const targets = sources.filter(x => x.agent !== 'unrecognised').flatMap(x => (fs.statSync(x.dir).isDirectory() ? walk(x.dir) : [x.dir]).map(f => [f, x.agent]))
if (process.argv.includes('--discover')) { console.log(JSON.stringify(sources, null, 1)); process.exit(0) }
if (!targets.length) { console.error('No agent transcripts found. Tried:\n' + candidates.filter(Boolean).map(c => '  ' + c).join('\n') + '\nPoint me at yours: --source <dir>  (or add {"paths":[...]} to ~/.toolkit-scan/sources.json)'); process.exit(2) }
const list = LIMIT ? targets.slice(0, LIMIT) : targets
for (const [f, agent] of list) {
  try { stats.bytes += fs.statSync(f).size } catch {}
  stats.files++; stats.perAgent[agent] = (stats.perAgent[agent] || 0) + 1
  await scanFile(f, agent)
}
const scanMs = Date.now() - t0
inst = installed()

// slash commands that are really skills (installed, or ever invoked through the Skill tool)
const slashSkill = {}, slashOther = []
for (const r of rows('slash')) (inst.skills.has(r.name) || acc.skill.has(r.name) ? (slashSkill[r.name] = r) : slashOther.push(r))
for (const [name, r] of Object.entries(slashSkill)) {
  const m = acc.skill.get(name) || (acc.skill.set(name, { n: 0, sessions: new Set(), first: r.first, last: r.last, week: {}, agents: {} }), acc.skill.get(name))
  m.n += r.uses; m.agents['claude:user'] = (m.agents['claude:user'] || 0) + r.uses; r.sessions && m.sessions.add('slash:' + name)
}

const result = {
  sources,
  generatedAt: new Date().toISOString(),
  scan: { ...stats, mb: +(stats.bytes / 1e6).toFixed(0), seconds: +(scanMs / 1000).toFixed(1), uniqueToolUseIds: seenToolUse.size },
  installedCounts: { skills: inst.skills.size, mcp: inst.mcp.size, tools: inst.tools.size, vscodeExtensions: inst.vscodeExtensions },
  tools: rows('tool', inst.tools), skills: rows('skill', inst.skills), mcp: rows('mcp', inst.mcp),
  mcpTools: rows('mcpTool').slice(0, 60), subagents: rows('subagent'), builtin: rows('builtin'), unknownCli: rows('unknownCli').slice(0, 60), slashOther: slashOther.slice(0, 30),
}
result.scan.sessions = allSessions.size
const catOf = Object.fromEntries(Object.values(CLI)); result.tools.forEach(t => (t.category = catOf[t.name]))
if (process.argv.includes('--redact')) { delete result.unknownCli; delete result.slashOther; result.redacted = true }
fs.mkdirSync(path.dirname(OUT), { recursive: true })
fs.writeFileSync(OUT, JSON.stringify(result, null, 1))

const top = (a, n = 8) => a.slice(0, n).map(r => `${r.name}(${r.uses}/${r.sessions}s)`).join(', ')
console.log(`scanned ${stats.files} files, ${result.scan.mb} MB, ${stats.lines} lines, ${stats.parsed} parsed in ${result.scan.seconds}s; parseErrors=${stats.parseErrors} dupToolUse=${stats.dupToolUse}`)
console.log('TOOLS   ', top(result.tools))
console.log('SKILLS  ', top(result.skills))
console.log('MCP     ', top(result.mcp))
console.log('SUBAGENT', top(result.subagents))
console.log('UNKNOWN ', top(result.unknownCli, 20))
console.log('installed-but-unused skills:', result.skills.filter(s => s.installed && !s.uses).length, '/', inst.skills.size,
  '| used-but-not-installed skills:', result.skills.filter(s => s.uses && !s.installed).length)
console.log('wrote', OUT)
