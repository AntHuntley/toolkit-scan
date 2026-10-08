// Turns a scan fingerprint into the JSON payloads the UI's /api endpoints return (shared by server.mjs and share.mjs).
const ICONS = { Git: 'git', 'GitHub CLI': 'github', Docker: 'docker', 'Node.js': 'nodedotjs', Python: 'python', npm: 'npm', Homebrew: 'homebrew', TypeScript: 'typescript', Playwright: 'playwright', Vitest: 'vitest', 'Claude Code': 'anthropic', 'Codex CLI': 'openai', ffmpeg: 'ffmpeg', 'Cargo/Rust': 'rust', Go: 'go', Bun: 'bun', ESLint: 'eslint', Prettier: 'prettier', Jest: 'jest', Terraform: 'terraform', kubectl: 'kubernetes', pnpm: 'pnpm', Yarn: 'yarn', SQLite: 'sqlite', pandoc: 'pandoc', 'AWS CLI': 'amazonaws', gcloud: 'googlecloud', 'VS Code CLI': 'visualstudiocode', tmux: 'tmux' }
const num = n => n.toLocaleString('en-US')
const blurb = r => (r.uses ? `${num(r.uses)} ${r.uses === 1 ? 'use' : 'uses'} · ${r.sessions} ${r.sessions === 1 ? 'session' : 'sessions'}${r.last ? ` · last ${r.last}` : ''}` : 'Installed, never used')

export function build(fp) {
  const groups = new Map()
  const add = (cat, sub, item) => { const k = cat + '\0' + sub; (groups.get(k) || groups.set(k, { cat, sub, tools: [] }).get(k)).tools.push(item) }
  const item = (r) => ({ name: r.name, desc: blurb(r), simpleIcon: ICONS[r.name] || '', url: '', group: null, uses: r.uses })
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
