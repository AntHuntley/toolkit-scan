import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Cube, Cut, Tools } from '@carbon/icons-react'
import { ToolkitSunburst, type ToolkitData } from './Sunburst'

interface Row {
  name: string
  uses: number
  sessions: number
  first?: string
  last?: string
  installed?: boolean
  source?: string
  agents?: Record<string, number>
  byMonth?: Record<string, number>
}
interface Fingerprint {
  generatedAt: string
  sources?: { dir: string; agent: string; files: number }[]
  scan: { files: number; mb: number; seconds: number; sessions?: number }
  installedCounts: { skills: number; mcp: number; tools: number; vscodeExtensions: number }
  tools: Row[]; skills: Row[]; mcp: Row[]; builtin: Row[]; subagents: Row[]
}

// Same blue → green log scale as the Tools heat map; bars get lighter/brighter towards their tip for a glassy look.
const LO = [59, 130, 246], HI = [22, 163, 74]
export const rgb = (t: number) => LO.map((c, i) => Math.round(c + (HI[i] - c) * t)).join(',')
export const lighten = (c: string, k: number) => c.split(',').map(v => Math.round(+v + (255 - +v) * k)).join(',')
export const heat = (n: number, max: number) => (max ? Math.log1p(n) / Math.log1p(max) : 0)
export const num = (n: number) => n.toLocaleString('en-US')
const AGENT_LABEL: Record<string, string> = { claude: 'Claude Code', codex: 'Codex' }
const AGENT_COLOR: Record<string, string> = { claude: '#e8895a', codex: '#cfcfd4' }
export const EASE = 'cubic-bezier(0.2, 0.8, 0.2, 1)'

// True once the element has scrolled into view (and immediately for reduced-motion users). Fires once.
export function useInView<T extends HTMLElement>(threshold = 0.15) {
  const ref = useRef<T>(null)
  const [shown, setShown] = useState(() => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
  useEffect(() => {
    const el = ref.current
    if (!el || shown) return
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setShown(true); io.disconnect() } }, { threshold })
    io.observe(el)
    return () => io.disconnect()
  }, [shown, threshold])
  return [ref, shown] as const
}

export function Reveal({ children, delay = 0 }: { children: (shown: boolean) => ReactNode; delay?: number }) {
  const [ref, shown] = useInView<HTMLDivElement>()
  return (
    <div ref={ref} style={{ opacity: shown ? 1 : 0, transform: shown ? 'none' : 'translateY(22px)', transition: `opacity 0.7s ease ${delay}ms, transform 0.7s ${EASE} ${delay}ms` }}>
      {children(shown)}
    </div>
  )
}

function Tile({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div style={{ flex: '1 1 150px', background: `linear-gradient(135deg, ${color}29 0%, ${color}08 100%)`, border: `1px solid ${color}47`, borderRadius: 12, padding: '18px 20px' }}>
      <div style={{ fontSize: 30, fontWeight: 300, letterSpacing: '-0.04em', color, marginBottom: 6 }}>{typeof value === 'number' ? num(value) : value}</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#b0b0b0' }}>{label}</div>
      {sub && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

export function Panel({ title, hint, to, icon, children }: { title: string; hint?: string; to?: string; icon?: ReactNode; children: (shown: boolean) => ReactNode }) {
  return (
    <Reveal>
      {shown => (
        <section style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '22px 26px', minWidth: 0, height: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 18 }}>
            <h2 style={{ fontSize: 14, fontWeight: 600, color: '#fff', display: 'flex', alignItems: 'center', gap: 9 }}>{icon}{title}</h2>
            {hint && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{hint}</span>}
            {to && <Link to={to} style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--teal)' }}>View all →</Link>}
          </div>
          {children(shown)}
        </section>
      )}
    </Reveal>
  )
}

// Glassy bar: translucent gradient, slightly brighter towards the tip, faint top sheen, no outer glow.
const darken = (c: string, k: number) => c.split(',').map(v => Math.round(+v * (1 - k))).join(',')
export function glass(c: string, vertical: boolean) {
  const base = darken(c, 0.28)
  return {
    background: `linear-gradient(${vertical ? '0deg' : '90deg'}, rgba(${darken(base, 0.35)},0.55) 0%, rgba(${base},0.78) 60%, rgba(${lighten(base, 0.22)},0.92) 100%)`,
    border: '1px solid rgba(255,255,255,0.1)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2), inset 0 -5px 8px rgba(0,0,0,0.28)',
    backdropFilter: 'blur(3px)',
  } as const
}
export const Sheen = ({ vertical }: { vertical?: boolean }) => (
  <div style={{ position: 'absolute', inset: vertical ? '0 55% 0 0' : '0 0 55% 0', background: `linear-gradient(${vertical ? '90deg' : '180deg'}, rgba(255,255,255,0.13), rgba(255,255,255,0))`, borderRadius: 'inherit', pointerEvents: 'none' }} />
)

export function Bars({ rows, shown }: { rows: Row[]; shown: boolean }) {
  const max = rows[0]?.uses || 0
  if (!rows.length) return <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Nothing found yet.</div>
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {rows.map((r, i) => (
        <div key={r.name} style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <div style={{ width: 150, fontSize: 11, color: '#e8e8e8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0 }} title={r.name}>{r.name}</div>
          <div style={{ flex: 1, height: 14, background: 'var(--card)', borderRadius: 4 }}>
            <div style={{ position: 'relative', height: '100%', width: shown ? `${Math.max(2, (r.uses / max) * 100)}%` : '0%', borderRadius: 4, transition: `width 1s ${EASE} ${i * 70}ms`, ...glass(rgb(heat(r.uses, max)), false) }}>
              <Sheen />
            </div>
          </div>
          <div style={{ width: 92, textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)', flexShrink: 0, opacity: shown ? 1 : 0, transition: `opacity 0.6s ease ${i * 70 + 300}ms` }}>{num(r.uses)} <span style={{ color: 'var(--text-muted)' }}>· {num(r.sessions)}s</span></div>
        </div>
      ))}
    </div>
  )
}

// Skills as a sunburst: ring 1 = where the skill comes from, ring 2 = how heavily it's used.
const SOURCE_LABEL: Record<string, string> = { user: 'Your skills', plugin: 'Plugin skills', bundled: 'Bundled skills', unknown: 'Other / project' }
const BANDS: [string, (n: number) => boolean][] = [
  ['Heavy · 50+ uses', n => n >= 50], ['Regular · 10–49', n => n >= 10 && n < 50], ['Occasional · 1–9', n => n >= 1 && n < 10], ['Never used', n => n === 0],
]
function skillsSunburst(skills: Row[]): ToolkitData {
  const categories = Object.entries(SOURCE_LABEL).map(([src, category]) => {
    const mine = skills.filter(s => (s.source || 'unknown') === src)
    const subcats = BANDS.map(([subcat, test]) => ({
      subcat,
      tools: mine.filter(s => test(s.uses)).sort((a, b) => b.uses - a.uses).map(s => ({
        name: s.name, desc: s.uses ? `${num(s.uses)} uses · ${num(s.sessions)} sessions` : 'Installed, never used', status: '', simpleIcon: '', url: '', group: null, uses: s.uses,
      })),
    })).filter(sc => sc.tools.length)
    return { category, count: mine.length, subcats }
  }).filter(c => c.count)
  return { categories, total: skills.length }
}

export default function Overview() {
  const [fp, setFp] = useState<Fingerprint | null>(null)
  const [toolkit, setToolkit] = useState<ToolkitData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/fingerprint').then(r => r.json()).then(d => (d.error ? setError(d.error) : setFp(d))).catch(e => setError(e.message))
    fetch('/api/toolkit').then(r => r.json()).then(d => { if (!d.error) setToolkit(d) }).catch(() => {})
  }, [])

  const v = useMemo(() => {
    if (!fp) return null
    const used = (rows: Row[]) => rows.filter(r => r.uses > 0)
    const calls = [...fp.builtin, ...fp.mcp]
    const months: Record<string, number> = {}
    for (const r of [...fp.tools, ...fp.mcp, ...fp.builtin]) for (const [m, n] of Object.entries(r.byMonth || {})) months[m] = (months[m] || 0) + n
    const monthRows = Object.entries(months).sort(([a], [b]) => a.localeCompare(b))
    const byAgent: Record<string, number> = {}
    for (const r of calls) for (const [a, n] of Object.entries(r.agents || {})) { const k = a.split(':')[0]; byAgent[k] = (byAgent[k] || 0) + n }
    const dates = [...fp.tools, ...fp.skills, ...fp.mcp, ...fp.builtin].flatMap(r => [r.first, r.last]).filter(Boolean).sort() as string[]
    return {
      toolsUsed: used(fp.tools).length, skillsUsed: used(fp.skills).length, mcpUsed: used(fp.mcp).length,
      calls: calls.reduce((n, r) => n + r.uses, 0), monthRows, byAgent,
      from: dates[0], to: dates[dates.length - 1],
      unusedSkills: fp.skills.filter(s => s.installed && !s.uses),
      unusedTools: fp.tools.filter(t => t.uses === 0),
      unusedMcp: fp.mcp.filter(m => m.uses === 0),
      skillsSb: skillsSunburst(fp.skills),
    }
  }, [fp])

  if (error) return <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontSize: 12, color: '#f48771' }}>{error} — run <code>node toolkit-scan.mjs</code> first.</div>
  if (!fp || !v) return <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-dim)', letterSpacing: '0.18em' }}>LOADING…</div>

  const monthMax = Math.max(1, ...v.monthRows.map(([, n]) => n))
  const agentTotal = Object.values(v.byAgent).reduce((a, b) => a + b, 0) || 1
  const agents = Object.entries(v.byAgent)

  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '40px 32px 56px', display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div style={{ textAlign: 'center', marginBottom: 8 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.22em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 14 }}>Your tool fingerprint</div>
          <h1 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 300, letterSpacing: '-0.03em', color: '#fff', marginBottom: 10 }}>
            What you <em style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', color: 'var(--teal)' }}>actually</em> use
          </h1>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#888', letterSpacing: '0.08em' }}>
            {num(fp.scan.files)} transcripts · {num(fp.scan.sessions ?? 0)} sessions · {v.from} → {v.to}
            {agents.length > 0 && ` · ${agents.map(([a]) => AGENT_LABEL[a] || a).join(' + ')}`}
          </div>
        </div>

        {/* Hero: the two sunbursts */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(560px, 1fr))', gap: 24 }}>
          <Panel title="Tools" hint="hover a segment · click to pin" to="/toolkit" icon={<Tools size={20} style={{ color: '#4ec9b0' }} />}>
            {() => (toolkit ? <ToolkitSunburst data={toolkit} compact noun="tools" /> : null)}
          </Panel>
          <Panel title="Skills" hint="by source and how often used" to="/skills" icon={<Cube size={20} style={{ color: '#b478ff' }} />}>
            {() => <ToolkitSunburst data={v.skillsSb} compact noun="skills" />}
          </Panel>
        </div>

        <Reveal>
          {() => (
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <Tile label="Tools used" value={v.toolsUsed} sub={`${fp.installedCounts.tools} installed`} color="#4ec9b0" />
              <Tile label="Skills used" value={v.skillsUsed} sub={`${fp.installedCounts.skills} installed`} color="#b478ff" />
              <Tile label="MCP servers used" value={v.mcpUsed} sub={`${fp.installedCounts.mcp} configured`} color="#6395ff" />
              <Tile label="Agent tool calls" value={v.calls} color="#50dc82" />
              <Tile label="Never used" value={v.unusedSkills.length + v.unusedTools.length + v.unusedMcp.length} sub="skills, tools + MCP servers" color="#ce9178" />
            </div>
          )}
        </Reveal>

        <Panel title="Activity by month" hint="tool calls · partial months at either end">
          {shown => (
            <>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, height: 170 }}>
                {v.monthRows.map(([m, n], i) => (
                  <div key={m} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%', justifyContent: 'flex-end' }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-dim)', opacity: shown ? 1 : 0, transition: `opacity 0.6s ease ${i * 120 + 500}ms` }}>{num(n)}</div>
                    <div style={{ flex: 1, width: '100%', maxWidth: 70, display: 'flex', alignItems: 'flex-end' }}>
                      <div style={{ position: 'relative', width: '100%', height: shown ? `${Math.max(2, (n / monthMax) * 100)}%` : '0%', borderRadius: '5px 5px 0 0', transition: `height 1.1s ${EASE} ${i * 120}ms`, ...glass(rgb(heat(n, monthMax)), true) }}>
                        <Sheen vertical />
                      </div>
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)' }}>{m}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', marginTop: 18, background: 'var(--card)' }}>
                {agents.map(([a, n]) => <div key={a} title={`${AGENT_LABEL[a] || a}: ${num(n)}`} style={{ width: shown ? `${(n / agentTotal) * 100}%` : '0%', background: AGENT_COLOR[a] || '#888', transition: `width 1.2s ${EASE} 400ms` }} />)}
              </div>
              <div style={{ display: 'flex', gap: 18, marginTop: 8, fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)' }}>
                {agents.map(([a, n]) => <span key={a}><span style={{ color: AGENT_COLOR[a] || '#888' }}>●</span> {AGENT_LABEL[a] || a} {Math.round((n / agentTotal) * 100)}%</span>)}
              </div>
            </>
          )}
        </Panel>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(520px, 1fr))', gap: 24 }}>
          <Panel title="Top tools" hint="uses · sessions" to="/toolkit" icon={<Tools size={20} style={{ color: '#4ec9b0' }} />}>{shown => <Bars rows={fp.tools.filter(t => t.uses).slice(0, 8)} shown={shown} />}</Panel>
          <Panel title="Top skills" hint="uses · sessions" to="/skills" icon={<Cube size={20} style={{ color: '#b478ff' }} />}>{shown => <Bars rows={fp.skills.filter(s => s.uses).slice(0, 8)} shown={shown} />}</Panel>
          <Panel title="MCP servers" hint="calls · sessions" to="/toolkit">{shown => <Bars rows={fp.mcp.filter(m => m.uses).slice(0, 6)} shown={shown} />}</Panel>
          <Panel title="Consider for pruning" hint="installed but never used" to="/skills" icon={<Cut size={20} style={{ color: '#ce9178' }} />}>
            {() => {
              const items = [
                ...v.unusedMcp.map(r => ({ name: r.name, kind: 'MCP', color: '99,149,255' })),
                ...v.unusedSkills.map(r => ({ name: r.name, kind: 'skill', color: '180,120,255' })),
                ...v.unusedTools.map(r => ({ name: r.name, kind: 'tool', color: '78,201,176' })),
              ]
              if (!items.length) return <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Everything installed has been used.</div>
              return (
                <>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {items.slice(0, 30).map(r => (
                      <span key={r.kind + r.name} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-mono)', fontSize: 10, color: '#d8d8d8', border: `1px solid rgba(${r.color},0.35)`, background: `rgba(${r.color},0.08)`, borderRadius: 5, padding: '3px 8px' }}>
                        <span style={{ fontSize: 7.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: `rgb(${r.color})` }}>{r.kind}</span>{r.name}
                      </span>
                    ))}
                    {items.length > 30 && <span style={{ fontSize: 10, color: 'var(--text-muted)', alignSelf: 'center' }}>+{items.length - 30} more</span>}
                  </div>
                  <div style={{ marginTop: 14, fontSize: 10.5, lineHeight: 1.5, color: 'var(--text-muted)' }}>Every enabled skill and MCP server adds to what your agent has to load and choose between. Unused ones are the safest to remove.</div>
                </>
              )
            }}
          </Panel>
        </div>

        <Reveal>
          {() => (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24, marginTop: 8 }}>
              {[
                { to: '/toolkit', title: 'Explore your tools', sub: `${toolkit?.total ?? fp.tools.length + fp.mcp.length} tools, MCP servers and agents · heat map, categories, detail`, color: '78,201,176', Icon: Tools },
                { to: '/skills', title: 'Explore your skills', sub: `${fp.skills.length} skills · usage counts, sources, never-used`, color: '180,120,255', Icon: Cube },
              ].map(c => (
                <Link key={c.to} to={c.to} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '22px 26px', borderRadius: 12, border: `1px solid rgba(${c.color},0.35)`, background: `linear-gradient(135deg, rgba(${c.color},0.14) 0%, rgba(${c.color},0.03) 100%)` }}>
                  <c.Icon size={28} style={{ color: `rgb(${c.color})`, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 16, fontWeight: 500, color: '#fff', marginBottom: 4 }}>{c.title}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, letterSpacing: '0.06em', color: 'var(--text-muted)' }}>{c.sub}</div>
                  </div>
                  <div style={{ fontSize: 22, color: `rgb(${c.color})` }}>→</div>
                </Link>
              ))}
            </div>
          )}
        </Reveal>
      </div>
    </div>
  )
}
