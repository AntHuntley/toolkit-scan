import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { ToolkitSunburst, siUrl, hexRgba, type Tool, type ToolkitData } from './Sunburst'

// ── Types ──────────────────────────────────────────────────────────────────────
// ── Tool usage (from DB via /api/toolkit/usage) ────────────────────────────────
interface UsageItem { toolkit_item: string; count: number }

// ── Heat map: dark blue (rarely used) → dark green (often used), log-scaled ──────
const HEAT_LO = [59, 130, 246], HEAT_HI = [22, 163, 74]
function heatOf(uses: number | undefined, max: number) {
  if (!max) return 0
  return Math.log1p(uses || 0) / Math.log1p(max)
}
function heatRgb(t: number) { return HEAT_LO.map((c, i) => Math.round(c + (HEAT_HI[i] - c) * t)).join(',') }
const fmtUses = (n: number) => n >= 10000 ? `${Math.round(n / 1000)}k` : n.toLocaleString('en-US')

// ── Status helpers ─────────────────────────────────────────────────────────────
function statusLabel(s: string) {
  if (s === 'preferred')   return 'HIGH'
  if (s === 'want-to-try') return 'TRY'
  return 'LOW'
}
function isPreferred(s: string) { return s === 'preferred' }

// ── Stat card ──────────────────────────────────────────────────────────────────
function StatCard({ label, value, color }: { label: string; value: number | string; color?: string }) {
  const c = color || '#4ec9b0'
  const bg     = `linear-gradient(135deg, ${hexRgba(c, 0.16)} 0%, ${hexRgba(c, 0.03)} 100%)`
  const border = hexRgba(c, 0.28)
  return (
    <div style={{
      background: bg, border: `1px solid ${border}`, borderRadius: 12,
      padding: '18px 22px', textAlign: 'center', flex: 1,
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Top accent line */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 2,
        background: `linear-gradient(90deg, transparent, ${hexRgba(c, 0.7)}, transparent)`,
      }} />
      <div style={{ fontSize: 32, fontWeight: 300, letterSpacing: '-0.04em', color: c, marginBottom: 6 }}>
        {value}
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8.5, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#b0b0b0' }}>
        {label}
      </div>
    </div>
  )
}

// ── Bar chart keyframes (injected once) ───────────────────────────────────────
const BAR_ANIM_ID = 'toolkit-bar-anim'
if (typeof document !== 'undefined' && !document.getElementById(BAR_ANIM_ID)) {
  const s = document.createElement('style')
  s.id = BAR_ANIM_ID
  s.textContent = `
    @keyframes barEnter {
      from { transform: scaleX(0); }
      to   { transform: scaleX(1); }
    }
  `
  document.head.appendChild(s)
}

// ── Statistics bar chart ───────────────────────────────────────────────────────
function StatisticsChart({
  title, data, color, colorFunction, textColorFunction,
}: {
  title: string
  data: { label: string; count: number }[]
  color?: string
  colorFunction?: (label: string) => string
  textColorFunction?: (label: string) => string
}) {
  const max = Math.max(...data.map(d => d.count), 1)
  const defaultColor = color || '#4ec9b0'
  const getColor   = (label: string) => colorFunction   ? colorFunction(label)   : defaultColor
  const getTextClr = (label: string) => textColorFunction ? textColorFunction(label) : 'var(--text-dim)'

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      padding: '18px 22px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Top accent line in chart colour */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 2,
        background: `linear-gradient(90deg, transparent, ${defaultColor}80, transparent)`,
      }} />

      <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', marginBottom: 16 }}>{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {data.map(({ label, count }, i) => {
          const barColor = getColor(label)
          const pct = (count / max) * 100
          return (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
              <div style={{
                width: 150, fontSize: 8, color: getTextClr(label),
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                textAlign: 'right', flexShrink: 0, fontWeight: 500,
                fontFamily: 'var(--font-mono)', letterSpacing: '0.05em', textTransform: 'uppercase',
              }}>
                {label}
              </div>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
                <div style={{ width: 24, fontSize: 9, color: 'var(--text-dim)', textAlign: 'right', flexShrink: 0, fontWeight: 500, fontFamily: 'var(--font-mono)' }}>
                  {count}
                </div>
                {/* Track */}
                <div style={{
                  flex: 1, height: 14,
                  background: `${barColor}10`,
                  border: `1px solid ${barColor}20`,
                  borderRadius: 3,
                  position: 'relative',
                  overflow: 'hidden',
                }}>
                  {/* Gradient fill bar */}
                  <div style={{
                    position: 'absolute', height: '100%',
                    width: `${pct}%`,
                    background: `linear-gradient(90deg, ${barColor}55 0%, ${barColor} 100%)`,
                    borderRadius: 3,
                    boxShadow: `0 0 8px ${barColor}55, 0 0 2px ${barColor}`,
                    transformOrigin: 'left center',
                    animation: `barEnter 0.55s cubic-bezier(0.4,0,0.2,1) ${i * 0.045}s both`,
                    overflow: 'hidden',
                  }}>
                    {/* Glass top-edge shine */}
                    <div style={{
                      position: 'absolute', top: 0, left: 0, right: 0,
                      height: '45%',
                      background: 'linear-gradient(180deg, rgba(255,255,255,0.15), transparent)',
                      borderRadius: '3px 3px 0 0',
                    }} />
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Status colours ─────────────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  preferred:    '#22c55e',
  familiar:     '#3b82f6',
  'want-to-try': '#f59e0b',
}
function statusBarColor(label: string) { return STATUS_COLORS[label] ?? '#4ec9b0' }
function statusTextColor(label: string) { return STATUS_COLORS[label] ?? 'var(--text-dim)' }

// ── Drawer ─────────────────────────────────────────────────────────────────────
function Drawer({ tool, onClose }: { tool: Tool | null; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const open = tool !== null

  return (
    <>
      <div onClick={onClose} style={{ display: open ? 'block' : 'none', position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(3px)' }} />
      <div style={{
        position: 'fixed', top: 0, bottom: 0, zIndex: 201,
        right: open ? 0 : -480, width: 460, maxWidth: '94vw',
        background: '#0c0c0e', borderLeft: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        transition: 'right 0.25s cubic-bezier(0.4,0,0.2,1)', overflow: 'hidden',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <button onClick={onClose} style={{ background: 'none', border: '1px solid var(--border-hi)', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', fontSize: 11, padding: '4px 10px', borderRadius: 5, cursor: 'pointer', flexShrink: 0 }}>
            ✕ Close
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--teal)', flexShrink: 0 }} />
            <span style={{ fontSize: 15, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tool?.name}</span>
          </div>
        </div>
        {tool && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 22px 32px' }}>
            {tool.desc && <p style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.65, marginBottom: 20 }}>{tool.desc}</p>}
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8.5, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                details <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              </div>
              {tool.url && (
                <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 11 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', width: 80, flexShrink: 0 }}>url</span>
                  <a href={tool.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--teal)', textDecoration: 'none', wordBreak: 'break-all' }}
                    onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                    onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
                  >{tool.url}</a>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  )
}

// ── Tool card ──────────────────────────────────────────────────────────────────
function ToolCard({ tool, onClick, heat }: { tool: Tool; onClick: () => void; heat?: number | null }) {
  const preferred = isPreferred(tool.status)
  const [hovered, setHovered] = useState(false)

  const hasHeat = heat !== null && heat !== undefined
  const rgb = hasHeat ? heatRgb(heat as number) : preferred ? '34,197,94' : '59,130,246'
  const a = hasHeat ? 0.15 + (heat as number) * 0.24 : 0.15   // keep even the "hot" end dark enough for white text
  const borderColor = `rgba(${rgb},${hasHeat ? 0.3 + (heat as number) * 0.25 : 0.28})`
  const bgIdle      = `linear-gradient(135deg, rgba(${rgb},${a}) 0%, rgba(${rgb},${a * 0.2}) 100%)`
  const bgHover     = `linear-gradient(135deg, rgba(${rgb},${a + 0.11}) 0%, rgba(${rgb},${a * 0.2 + 0.04}) 100%)`
  const borderHover = `rgb(${rgb})`
  const accentColor = `rgb(${hasHeat ? heatRgb(Math.min(1, (heat as number) + 0.25)) : preferred ? '34,197,94' : '59,130,246'})`

  return (
    <div onClick={onClick} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', flexDirection: 'column', padding: '7px 9px 6px',
        background: hovered ? bgHover : bgIdle,
        border: `1px solid ${hovered ? borderHover : borderColor}`,
        borderRadius: 7, cursor: 'pointer',
        transform: hovered ? 'translateY(-1px)' : 'none',
        boxShadow: hovered ? '0 4px 20px rgba(0,0,0,0.6)' : 'none',
        transition: 'border-color 0.15s, background 0.15s, transform 0.15s, box-shadow 0.15s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
        {tool.simpleIcon ? (
          <img src={siUrl(tool.simpleIcon)} alt="" width={17} height={17}
            style={{ flexShrink: 0, objectFit: 'contain', filter: 'brightness(0) invert(1)' }}
            onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
        ) : (
          <span style={{ width: 17, height: 17, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600, color: accentColor, flexShrink: 0 }}>
            {tool.name[0].toUpperCase()}
          </span>
        )}
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 600, opacity: 0.95, letterSpacing: '0.04em', color: accentColor }}>
          {tool.uses !== undefined ? (tool.uses ? `${fmtUses(tool.uses)}×` : 'UNUSED') : statusLabel(tool.status)}
        </span>
      </div>
      <div style={{ fontSize: 11, fontWeight: 600, color: '#fff', letterSpacing: '-0.01em', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {tool.name}
      </div>
      {tool.desc && (
        <div style={{ fontSize: 8.5, fontWeight: 300, color: '#888', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {tool.desc.slice(0, 90)}{tool.desc.length > 90 ? '…' : ''}
        </div>
      )}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function Toolkit() {
  const [data, setData]       = useState<ToolkitData | null>(null)
  const [error, setError]     = useState<string | null>(null)
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null)
  const [usage, setUsage]     = useState<UsageItem[]>([])
  const [showStats, setShowStats] = useState(true)
  const [heatOn, setHeatOn] = useState(true)

  useEffect(() => {
    fetch('/api/toolkit')
      .then(r => r.json())
      .then(d => { if (d.error) setError(d.error); else setData(d) })
      .catch(e => setError(e.message))
  }, [])

  useEffect(() => {
    fetch('/api/toolkit/usage')
      .then(r => r.json())
      .then(d => { if (d.items) setUsage(d.items) })
      .catch(() => {})
  }, [])

  const stats = useMemo(() => {
    if (!data) return null
    const allTools = data.categories.flatMap(c => c.subcats.flatMap(s => s.tools))
    const preferred  = allTools.filter(t => t.status === 'preferred').length
    const wantToTry  = allTools.filter(t => t.status === 'want-to-try').length
    const subcatCount = data.categories.reduce((n, c) => n + c.subcats.length, 0)
    const byCat      = data.categories.map(c => ({ label: c.category, count: c.count }))
    const allSubcats = data.categories.flatMap(c => c.subcats.map(s => ({ label: s.subcat, count: s.tools.length })))
    const topSubcats = [...allSubcats].sort((a, b) => b.count - a.count).slice(0, 8)
    return { preferred, wantToTry, subcatCount, byCat, topSubcats }
  }, [data])

  const maxUses = useMemo(() => Math.max(0, ...(data?.categories.flatMap(c => c.subcats.flatMap(sc => sc.tools.map(t => t.uses || 0))) ?? [])), [data])

  const mostUsed = useMemo(() =>
    usage.slice(0, 8).map(u => ({ label: u.toolkit_item, count: u.count }))
  , [usage])


  if (error) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontSize: 12, color: '#f48771' }}>{error}</div>
  )
  if (!data) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-dim)', letterSpacing: '0.18em' }}>LOADING…</div>
  )

  return (
    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '36px 32px 0', maxWidth: 1600, margin: '0 auto', width: '100%', textAlign: 'center', boxSizing: 'border-box' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.22em', color: 'var(--text-muted)', marginBottom: 14, textTransform: 'uppercase', display: 'block' }}>
          Detected from your agent transcripts
        </span>
        <h1 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 300, letterSpacing: '-0.03em', color: '#fff', marginBottom: 6 }}>
          My <em style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', color: 'var(--teal)' }}>Toolkit</em>
        </h1>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#888', letterSpacing: '0.1em', marginBottom: 8, display: 'block' }}>
          {data.total} tools · click any card for details
        </span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#888', letterSpacing: '0.08em', marginBottom: 20, display: 'block' }}>
          Counts come from deterministic parsing of your Claude Code and Codex transcripts. Nothing leaves this machine.
        </span>
      </div>


      {/* Statistics section */}
      {stats && (
        <div style={{ padding: '0 32px 40px', maxWidth: 1600, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
          {/* Controls */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 14, marginBottom: 16, flexWrap: 'wrap' }}>
            <button onClick={() => setShowStats(s => !s)}
              style={{ background: 'none', border: '1px solid var(--border-hi)', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '5px 12px', borderRadius: 5, cursor: 'pointer', transition: 'all 0.15s' }}
            >{showStats ? '− Hide Statistics' : '+ Show Statistics'}</button>
          </div>

          {showStats && <>
            {/* Sunburst */}
            <ToolkitSunburst data={data} />

            {/* Stat cards */}
            <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
              <StatCard label="Total Tools"    value={data.total}              color="#4ec9b0"     />
              <StatCard label="Categories"     value={data.categories.length}  color="#b478ff"     />
              <StatCard label="Subcategories"  value={stats.subcatCount}       color="#6395ff"     />
            </div>

            {/* Charts */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
              <StatisticsChart title="Tools by Category"  data={stats.byCat}      color="#4ec9b0" />
              <StatisticsChart title="Top Subcategories"  data={stats.topSubcats} color="#6395ff" />
            </div>

            {/* Most Used Tools */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '24px 28px', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 20 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>Most Used Tools</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8.5, color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>counted from your transcripts</div>
                {mostUsed.length > 0 && <div style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 8.5, color: 'var(--text-muted)', letterSpacing: '0.1em' }}>top {mostUsed.length} of all time</div>}
              </div>
              {mostUsed.length === 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 0' }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--border-hi)', flexShrink: 0 }} />
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.12em' }}>
                    No data yet — counts populate automatically from Claude Code MCP tool calls via the PostToolUse hook.
                  </span>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {mostUsed.map(({ label, count }, i) => {
                    const max = mostUsed[0].count, pct = (count / max) * 100, isTop = i === 0
                    return (
                      <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
                        <div style={{ width: 18, fontSize: 8, fontFamily: 'var(--font-mono)', color: isTop ? 'var(--teal)' : 'var(--text-muted)', textAlign: 'right', flexShrink: 0, fontWeight: 600 }}>{i + 1}</div>
                        <div style={{ width: 140, fontSize: 9, color: isTop ? '#fff' : 'var(--text-dim)', fontWeight: isTop ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0, fontFamily: 'var(--font-mono)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{label}</div>
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                          <div style={{ width: 36, fontSize: 9, color: isTop ? 'var(--teal)' : 'var(--text-dim)', textAlign: 'right', flexShrink: 0, fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{count.toLocaleString()}</div>
                          <div style={{ flex: 1, height: 12, background: 'var(--card)', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: isTop ? 'var(--teal)' : `rgba(78,201,176,${0.25 + (pct/100)*0.5})`, borderRadius: 3, transition: 'width 0.4s ease', boxShadow: isTop ? '0 0 6px rgba(78,201,176,0.4)' : 'none' }} />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </>}
        </div>
      )}

      {/* Heat map controls: sit right above the tiles they colour */}
      <div style={{ padding: '0 32px 18px', maxWidth: 1600, margin: '0 auto', width: '100%', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 14, flexWrap: 'wrap' }}>
            {heatOn && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-mono)', fontSize: 8.5, letterSpacing: '0.1em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                <span>Rarely used</span>
                <div style={{ width: 120, height: 8, borderRadius: 4, background: `linear-gradient(90deg, rgba(${heatRgb(0)},0.4), rgba(${heatRgb(0.5)},0.5), rgba(${heatRgb(1)},0.62))` }} />
                <span>Often used</span>
              </div>
            )}
            <button onClick={() => setHeatOn(h => !h)}
              style={{ background: heatOn ? 'rgba(78,201,176,0.08)' : 'none', border: '1px solid var(--teal)', color: 'var(--teal)', fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '5px 12px', borderRadius: 5, cursor: 'pointer', transition: 'all 0.15s' }}
            >{heatOn ? '◉ Heat map' : '○ Heat map'}</button>
      </div>

      {/* Categories */}
      <div style={{ padding: '0 32px 40px', display: 'flex', flexDirection: 'column', gap: 32, maxWidth: 1600, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
        {data.categories.map(cat => (
          <div key={cat.category}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 10, marginBottom: 16, borderBottom: '1px solid #3a3a3a' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#fff', letterSpacing: '-0.01em' }}>{cat.category}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-dim)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 4, padding: '1px 6px' }}>{cat.count}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 14, alignItems: 'start' }}>
              {cat.subcats.map(sub => (
                <div key={sub.subcat} style={{ background: 'rgba(12,12,14,0.55)', border: '1px solid #3a3a3a', borderRadius: 10, padding: '14px 16px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 8, marginBottom: 12, borderBottom: '1px solid #3a3a3a' }}>
                    <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.01em', color: '#fff' }}>{sub.subcat}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-dim)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 4, padding: '1px 6px' }}>{sub.tools.length}</span>
                  </div>
                  {sub.groups ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      {sub.groups.map(g => (
                        <div key={g.group ?? '__ungrouped__'}>
                          {g.group && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{g.group}</span>
                              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--border-hi)' }}>{g.tools.length}</span>
                            </div>
                          )}
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8 }}>
                            {g.tools.map(tool => <ToolCard key={tool.name} tool={tool} heat={heatOn ? heatOf(tool.uses, maxUses) : null} onClick={() => setSelectedTool(tool)} />)}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8 }}>
                      {sub.tools.map(tool => <ToolCard key={tool.name} tool={tool} heat={heatOn ? heatOf(tool.uses, maxUses) : null} onClick={() => setSelectedTool(tool)} />)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <footer style={{ textAlign: 'center', padding: 32, fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
        Toolkit Scan · {data.total} tools · counted from your agent transcripts
      </footer>

      <Drawer tool={selectedTool} onClose={() => setSelectedTool(null)} />
    </div>
  )
}
