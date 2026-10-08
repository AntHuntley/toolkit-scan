import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import * as d3 from 'd3'

// ── Types ──────────────────────────────────────────────────────────────────────
interface Tool {
  name: string
  desc: string
  status: 'preferred' | 'familiar' | 'want-to-try' | string
  simpleIcon: string
  url: string
  group: string | null
  uses?: number
}
interface ToolGroup {
  group: string | null
  tools: Tool[]
}
interface Subcat {
  subcat: string
  tools: Tool[]
  groups?: ToolGroup[]
}
interface Category {
  category: string
  count: number
  subcats: Subcat[]
}
interface ToolkitData {
  categories: Category[]
  total: number
}

// ── Tool usage (from DB via /api/toolkit/usage) ────────────────────────────────
interface UsageItem { toolkit_item: string; count: number }

// ── Simple icon URL ────────────────────────────────────────────────────────────
function siUrl(slug: string) {
  return `https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/${slug}.svg`
}

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

// ── Hex → rgba helper ─────────────────────────────────────────────────────────
function hexRgba(hex: string, alpha: number) {
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16)
  return `rgba(${r},${g},${b},${alpha})`
}

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

// ── Sunburst colours ────────────────────────────────────────────────────────────
const SUNBURST_COLORS = ['#4ec9b0','#569cd6','#b478ff','#50dc82','#ce9178','#c586c0','#ffc83c']
function dimColor(hex: string, alpha: number) {
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16)
  return `rgba(${r},${g},${b},${alpha})`
}

// ── Detail panel state type ──────────────────────────────────────────────────
interface DetailEntry { name: string; count: number; isCategory: boolean; color: string; parentCat: string | null }

// ── Toolkit sunburst ──────────────────────────────────────────────────────────
function ToolkitSunburst({ data }: { data: ToolkitData }) {
  const svgRef       = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [detail, setDetail] = useState<DetailEntry | null>(null)
  const [pinned, setPinned] = useState<DetailEntry | null>(null)
  const hoverRef = useRef<DetailEntry | null>(null)

  const showEntry = useCallback((e: DetailEntry | null) => {
    hoverRef.current = e
    setDetail(e)
  }, [])

  useEffect(() => {
    const el = svgRef.current
    if (!el || !data) return
    const svg = d3.select(el)
    svg.selectAll('*').remove()

    const SIZE = 520, cx = SIZE / 2, cy = SIZE / 2
    const INNER_R = 60, CAT_R = 148, SUB_R = 214

    svg.attr('width', SIZE).attr('height', SIZE).style('overflow','visible')
    const g = svg.append('g').attr('transform', `translate(${cx},${cy})`)

    const hierarchyData = {
      name: 'root',
      children: data.categories.map(cat => ({
        name: cat.category,
        children: cat.subcats.map(sub => ({ name: sub.subcat, value: sub.tools.length }))
      }))
    }

    type SunburstDatum = { name: string; children?: { name: string; value?: number; children?: { name: string; value: number }[] }[] }
    // partition() mutates the hierarchy nodes with x0/x1/y0/y1 and returns them
    // as HierarchyRectangularNode — capture the typed return so cat/sub node
    // reads (cat.x0, cat.x1, …) type-check.
    const root = d3.partition<SunburstDatum>().size([2 * Math.PI, 1])(
      d3.hierarchy<SunburstDatum>(hierarchyData).sum((d: any) => d.value || 0)
    )

    const catArc = d3.arc<any>()
      .startAngle(d => d.x0).endAngle(d => d.x1)
      .padAngle(0.018).padRadius(CAT_R)
      .innerRadius(INNER_R + 6).outerRadius(CAT_R - 4).cornerRadius(3)

    const subArc = d3.arc<any>()
      .startAngle(d => d.x0).endAngle(d => d.x1)
      .padAngle(0.012).padRadius(SUB_R)
      .innerRadius(CAT_R + 6).outerRadius(SUB_R - 4).cornerRadius(3)

    const labelArc    = d3.arc<any>().startAngle(d => d.x0).endAngle(d => d.x1)
      .innerRadius((INNER_R + CAT_R) / 2).outerRadius((INNER_R + CAT_R) / 2)
    const subLabelArc = d3.arc<any>().startAngle(d => d.x0).endAngle(d => d.x1)
      .innerRadius((CAT_R + SUB_R) / 2).outerRadius((CAT_R + SUB_R) / 2)

    // Rim highlight arcs — bright strip at the outer edge of each ring
    const catRimArc = d3.arc<any>()
      .startAngle(d => d.x0).endAngle(d => d.x1)
      .padAngle(0.018).padRadius(CAT_R)
      .innerRadius(CAT_R - 8).outerRadius(CAT_R - 4).cornerRadius(2)
    const subRimArc = d3.arc<any>()
      .startAngle(d => d.x0).endAngle(d => d.x1)
      .padAngle(0.012).padRadius(SUB_R)
      .innerRadius(SUB_R - 7).outerRadius(SUB_R - 4).cornerRadius(2)

    // Animation timing
    const INNER_MS  = 900   // inner ring sweep duration
    const OUTER_DEL = 650   // delay before outer ring starts
    const OUTER_MS  = 900   // outer ring sweep duration
    const LABEL_DEL = OUTER_DEL + OUTER_MS * 0.65  // labels fade in near end

    const catNodes = root.children || []
    const total    = root.value || 0

    const measurer = svg.append('text').attr('visibility','hidden').attr('font-family','Inter, sans-serif')
    function wrapText(str: string, maxPx: number, fontSize: number) {
      measurer.attr('font-size', fontSize)
      const words = str.replace(/\n/g,' ').split(/\s+/).filter(Boolean)
      const lines: string[] = []; let line = ''
      for (const word of words) {
        const candidate = line ? line + ' ' + word : word
        measurer.text(candidate)
        if ((measurer.node() as SVGTextElement).getComputedTextLength() > maxPx && line) {
          lines.push(line); line = word
        } else { line = candidate }
      }
      if (line) lines.push(line)
      return lines
    }

    function drawInline(parentG: any, lines: string[], midPt: [number,number], angle: number, fontSize: number, lh: number, fw: number, op: number) {
      const rotate = (angle * 180 / Math.PI) - 90
      const flip   = angle > Math.PI
      const lg = parentG.append('g')
        .attr('transform', `translate(${midPt[0]},${midPt[1]}) rotate(${rotate + (flip ? 180 : 0)})`)
        .attr('pointer-events','none')
      lines.forEach((ln, li) => {
        lg.append('text')
          .attr('text-anchor','middle').attr('dy', ((li - (lines.length - 1) / 2) * lh) + 'px')
          .attr('dominant-baseline','middle').attr('font-size', fontSize)
          .attr('font-weight', fw).attr('fill','#fff').attr('opacity', op)
          .attr('letter-spacing','0.04em').text(ln)
      })
    }

    const CAT_LR = (INNER_R + CAT_R) / 2
    const SUB_LR = (CAT_R + SUB_R) / 2
    const CAT_RH = CAT_R - INNER_R - 10
    const SUB_RH = SUB_R - CAT_R - 10
    const extLabels: { angle: number; text: string; color: string; isCat: boolean }[] = []

    // ── SVG defs: per-color radial gradients + glow filter ──────────────────
    const defs = svg.append('defs')

    SUNBURST_COLORS.forEach((hex, idx) => {
      const r = parseInt(hex.slice(1,3),16), gg = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16)
      // Cat ring: dark at center → rich at outer edge
      const cg = defs.append('radialGradient').attr('id', `cg-${idx}`)
        .attr('cx', 0).attr('cy', 0).attr('r', CAT_R).attr('gradientUnits', 'userSpaceOnUse')
      cg.append('stop').attr('offset', '0%').attr('stop-color', `rgba(${r},${gg},${b},0.22)`)
      cg.append('stop').attr('offset', '100%').attr('stop-color', `rgba(${r},${gg},${b},0.75)`)
      // Sub ring: lighter, brightens toward outer edge
      const sg = defs.append('radialGradient').attr('id', `sg-${idx}`)
        .attr('cx', 0).attr('cy', 0).attr('r', SUB_R).attr('gradientUnits', 'userSpaceOnUse')
      sg.append('stop').attr('offset', '0%').attr('stop-color', `rgba(${r},${gg},${b},0.08)`)
      sg.append('stop').attr('offset', '100%').attr('stop-color', `rgba(${r},${gg},${b},0.40)`)
    })

    // Center circle gradient
    const ctrGrad = defs.append('radialGradient').attr('id', 'ctrGrad').attr('cx','50%').attr('cy','50%').attr('r','50%')
    ctrGrad.append('stop').attr('offset', '0%').attr('stop-color', '#1e1e1e')
    ctrGrad.append('stop').attr('offset', '100%').attr('stop-color', '#070707')

    // Glow filter (subtle drop shadow on each segment)
    const glowFlt = defs.append('filter').attr('id', 'segGlow')
      .attr('x','-30%').attr('y','-30%').attr('width','160%').attr('height','160%')
    glowFlt.append('feDropShadow').attr('dx',0).attr('dy',0).attr('stdDeviation',5)
      .attr('flood-color','#ffffff').attr('flood-opacity',0.07)

    // Label groups — start hidden, fade in after segments are mostly drawn
    const inlineLabelG = g.append('g').attr('pointer-events','none').attr('opacity', 0)
    const extG         = g.append('g').attr('pointer-events','none').attr('opacity', 0)

    catNodes.forEach((cat, i) => {
      const color   = SUNBURST_COLORS[i % SUNBURST_COLORS.length]
      const catName = cat.data.name
      const catDel  = (cat.x0 / (2 * Math.PI)) * INNER_MS * 0.55

      // ── Cat segment ────────────────────────────────────────────────────────
      const catPath = g.append('path').datum(cat)
        .attr('d', catArc({...cat, x1: cat.x0}))
        .attr('fill', `url(#cg-${i})`).attr('stroke', color)
        .attr('stroke-width', 1.5).attr('stroke-opacity', 0)
        .attr('filter', 'url(#segGlow)')
        .style('cursor','pointer')
        .on('mouseenter', function() {
          d3.select(this).attr('fill', dimColor(color, 0.88)).attr('stroke-opacity', 1)
          const entry: DetailEntry = { name: catName, count: cat.value!, isCategory: true, color, parentCat: null }
          showEntry(entry)
        })
        .on('mouseleave', function() {
          d3.select(this).attr('fill', `url(#cg-${i})`).attr('stroke-opacity', 0.55)
          showEntry(pinned)
        })
        .on('click', function() {
          const entry: DetailEntry = { name: catName, count: cat.value!, isCategory: true, color, parentCat: null }
          setPinned(prev => {
            const next = prev?.name === catName && prev?.isCategory ? null : entry
            showEntry(next ?? hoverRef.current)
            return next
          })
        })

      catPath.transition().delay(catDel).duration(INNER_MS * 0.75).ease(d3.easeCubicOut)
        .attr('stroke-opacity', 0.55)
        .attrTween('d', (d: any) => {
          const interp = d3.interpolate(d.x0, d.x1)
          return (t: number) => catArc({...d, x1: interp(t)}) ?? ''
        })

      // ── Cat rim highlight ─────────────────────────────────────────────────
      g.append('path').datum(cat)
        .attr('d', catRimArc({...cat, x1: cat.x0}))
        .attr('fill', color).attr('opacity', 0).attr('pointer-events', 'none')
        .transition().delay(catDel).duration(INNER_MS * 0.75).ease(d3.easeCubicOut)
        .attr('opacity', 0.5)
        .attrTween('d', (d: any) => {
          const interp = d3.interpolate(d.x0, d.x1)
          return (t: number) => catRimArc({...d, x1: interp(t)}) ?? ''
        })

      // ── Sub segments + rims ───────────────────────────────────────────────
      cat.children?.forEach(sub => {
        const subDel = OUTER_DEL + (sub.x0 / (2 * Math.PI)) * OUTER_MS * 0.55

        const subPath = g.append('path').datum(sub)
          .attr('d', subArc({...sub, x1: sub.x0}))
          .attr('fill', `url(#sg-${i})`).attr('stroke', color)
          .attr('stroke-width', 0.8).attr('stroke-opacity', 0)
          .style('cursor','pointer')
          .on('mouseenter', function() {
            d3.select(this).attr('fill', dimColor(color, 0.58)).attr('stroke-opacity', 0.9)
            const entry: DetailEntry = { name: sub.data.name, count: sub.value!, isCategory: false, color, parentCat: catName }
            showEntry(entry)
          })
          .on('mouseleave', function() {
            d3.select(this).attr('fill', `url(#sg-${i})`).attr('stroke-opacity', 0.38)
            showEntry(pinned)
          })
          .on('click', function() {
            const entry: DetailEntry = { name: sub.data.name, count: sub.value!, isCategory: false, color, parentCat: catName }
            setPinned(prev => {
              const next = prev?.name === sub.data.name && !prev?.isCategory ? null : entry
              showEntry(next ?? hoverRef.current)
              return next
            })
          })

        subPath.transition().delay(subDel).duration(OUTER_MS * 0.75).ease(d3.easeCubicOut)
          .attr('stroke-opacity', 0.38)
          .attrTween('d', (d: any) => {
            const interp = d3.interpolate(d.x0, d.x1)
            return (t: number) => subArc({...d, x1: interp(t)}) ?? ''
          })

        // Sub rim highlight
        g.append('path').datum(sub)
          .attr('d', subRimArc({...sub, x1: sub.x0}))
          .attr('fill', color).attr('opacity', 0).attr('pointer-events', 'none')
          .transition().delay(subDel).duration(OUTER_MS * 0.75).ease(d3.easeCubicOut)
          .attr('opacity', 0.35)
          .attrTween('d', (d: any) => {
            const interp = d3.interpolate(d.x0, d.x1)
            return (t: number) => subRimArc({...d, x1: interp(t)}) ?? ''
          })
      })

      // ── Category label ────────────────────────────────────────────────────
      const spanA = cat.x1 - cat.x0
      if (spanA >= 0.06) {
        const fontSize = spanA > 0.5 ? 9.5 : 8.5, lh = fontSize + 2.5
        const angle    = (cat.x0 + cat.x1) / 2
        const chordW   = 2 * CAT_LR * Math.sin(spanA / 2) * 0.78
        if (chordW >= lh * 1.2) {
          const lines = wrapText(catName, CAT_RH * 0.88, fontSize)
          if (lines.length * lh <= chordW) { drawInline(inlineLabelG, lines, labelArc.centroid(cat), angle, fontSize, lh, 600, 1) }
          else { extLabels.push({ angle, text: catName, color, isCat: true }) }
        } else { extLabels.push({ angle, text: catName, color, isCat: true }) }
      }

      // ── Subcategory labels ────────────────────────────────────────────────
      cat.children?.forEach(sub => {
        const sa = sub.x1 - sub.x0
        if (sa < 0.06) return
        const fontSize = sa > 0.35 ? 8 : 7, lh = fontSize + 2
        const angle    = (sub.x0 + sub.x1) / 2
        const chordW   = 2 * SUB_LR * Math.sin(sa / 2) * 0.78
        if (chordW >= lh * 1.2) {
          const lines = wrapText(sub.data.name, SUB_RH * 0.88, fontSize)
          if (lines.length * lh <= chordW) { drawInline(inlineLabelG, lines, subLabelArc.centroid(sub), angle, fontSize, lh, 400, 0.85); return }
        }
        extLabels.push({ angle, text: sub.data.name, color, isCat: false })
      })
    })

    // External spoke labels (already in extG, built above)
    extLabels.forEach(lbl => {
      const a  = lbl.angle - Math.PI / 2, ad = a * 180 / Math.PI
      const ax = SUB_R * Math.cos(a), ay = SUB_R * Math.sin(a)
      const kR = SUB_R + 12, kx = kR * Math.cos(a), ky = kR * Math.sin(a)
      const tR = kR + 5,    tx = tR * Math.cos(a), ty = tR * Math.sin(a)
      const isLeft = Math.cos(a) < 0
      extG.append('line').attr('x1',ax).attr('y1',ay).attr('x2',kx).attr('y2',ky)
        .attr('stroke',lbl.color).attr('stroke-width',0.8).attr('stroke-opacity',0.5)
      extG.append('circle').attr('cx',kx).attr('cy',ky).attr('r',1.5)
        .attr('fill',lbl.color).attr('opacity',0.6)
      extG.append('text').attr('x',tx).attr('y',ty)
        .attr('transform',`rotate(${isLeft ? ad+180 : ad},${tx},${ty})`)
        .attr('text-anchor',isLeft ? 'end' : 'start').attr('dominant-baseline','middle')
        .attr('font-size',7.5).attr('font-weight',lbl.isCat ? 600 : 400)
        .attr('fill','#fff').attr('opacity',lbl.isCat ? 1 : 0.85)
        .attr('letter-spacing','0.03em').text(lbl.text)
    })

    // Fade in label groups after segments finish drawing
    inlineLabelG.transition().delay(LABEL_DEL).duration(350).attr('opacity', 1)
    extG.transition().delay(LABEL_DEL).duration(350).attr('opacity', 1)

    // Separator ring between cat and sub
    g.append('circle').attr('r', CAT_R + 1).attr('fill','none')
      .attr('stroke','#2a2a2a').attr('stroke-width',1).attr('stroke-dasharray','2,5').attr('opacity',0.6)

    // Centre
    g.append('circle').attr('r',INNER_R).attr('fill','url(#ctrGrad)').attr('stroke','#3c3c3c').attr('stroke-width',1.5)
    g.append('text').attr('text-anchor','middle').attr('dy','-4px')
      .attr('font-size',22).attr('font-weight',200).attr('letter-spacing','-0.05em').attr('fill','#4ec9b0').text(total)
    g.append('text').attr('text-anchor','middle').attr('dy','16px')
      .attr('font-size',7.5).attr('font-weight',300).attr('letter-spacing','0.2em').attr('fill','#888888').text('TOOLS')

    return () => { svg.selectAll('*').remove() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data])

  useEffect(() => { hoverRef.current = pinned }, [pinned])

  const displayed = detail || pinned

  const detailSubcats = useMemo(() => {
    if (!displayed?.isCategory || !data) return null
    return data.categories.find(c => c.category === displayed.name)?.subcats ?? null
  }, [displayed, data])

  const detailTools = useMemo(() => {
    if (!displayed || displayed.isCategory || !data) return []
    const cat = data.categories.find(c => c.category === (displayed.parentCat ?? ''))
    return cat?.subcats.find(s => s.subcat === displayed.name)?.tools ?? []
  }, [displayed, data])

  // Shared tool row renderer — icon + name + teal description, no status tag
  function ToolRow({ tool, color }: { tool: Tool; color: string }) {
    const [imgFailed, setImgFailed] = useState(false)
    return (
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9, padding: '5px 14px' }}>
        <div style={{
          width: 22, height: 22, borderRadius: 5, flexShrink: 0, marginTop: 1,
          background: 'var(--card)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {tool.simpleIcon && !imgFailed ? (
            <img
              src={siUrl(tool.simpleIcon)}
              width={13} height={13}
              alt=""
              style={{ objectFit: 'contain', filter: 'brightness(0) invert(1)', opacity: 0.85 }}
              onError={() => setImgFailed(true)}
            />
          ) : (
            <span style={{ fontSize: 8, fontWeight: 700, color }}>{tool.name[0].toUpperCase()}</span>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {tool.name}
          </div>
          {tool.desc && (
            <div style={{ fontSize: 9.5, color: 'var(--teal)', opacity: 0.75, marginTop: 1, lineHeight: 1.35, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {tool.desc}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} style={{ display: 'flex', gap: 28, alignItems: 'flex-start', marginBottom: 60, justifyContent: 'flex-start', paddingLeft: 32, position: 'relative' }}>
      <div style={{ flexShrink: 0, width: 700, height: 660, overflow: 'visible', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg ref={svgRef} />
      </div>

      {/* Detail panel — sticky so it stays visible while scrolling within the content area */}
      <div style={{
          width: 320,
          flexShrink: 0,
          background: displayed
            ? `linear-gradient(135deg, ${hexRgba(displayed.color, 0.13)} 0%, ${hexRgba(displayed.color, 0.02)} 100%), var(--surface)`
            : 'var(--surface)',
          border: `1px solid ${
            pinned    ? hexRgba(displayed!.color, 0.7) :
            displayed ? hexRgba(displayed.color, 0.35) :
            'var(--border)'
          }`,
          borderRadius: 10, overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
          transition: 'background 0.25s, border-color 0.2s',
          position: 'sticky',
          top: 16,
          alignSelf: 'flex-start',
          maxHeight: 'calc(100vh - 120px)',
        }}>
          {/* Top accent line — tracks segment color */}
          {displayed && (
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: 2,
              background: `linear-gradient(90deg, transparent, ${hexRgba(displayed.color, 0.8)}, transparent)`,
            }} />
          )}
          <div style={{ padding: '12px 14px 10px', borderBottom: `1px solid ${displayed ? hexRgba(displayed.color, 0.18) : 'var(--border)'}`, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', lineHeight: 1.3 }}>
                {displayed?.name ?? 'Hover a segment'}
              </div>
              {displayed && (
                <div style={{ fontSize: 9, color: hexRgba(displayed.color, 0.7), marginTop: 3, fontFamily: 'var(--font-mono)', letterSpacing: '0.05em' }}>
                  {displayed.isCategory ? `${detailSubcats?.length ?? 0} subcategories` : displayed.parentCat ?? ''}
                </div>
              )}
            </div>
            {displayed && (
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 300, color: displayed.color, lineHeight: 1, flexShrink: 0 }}>
                {displayed.count}
              </div>
            )}
          </div>

          {displayed && (
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 7.5, color: pinned ? 'var(--teal)' : 'var(--text-muted)', letterSpacing: '0.08em', padding: '5px 14px 0' }}>
              {pinned ? 'pinned · click again to release' : 'click to pin'}
            </div>
          )}

          <div style={{ overflowY: 'auto', flex: 1, padding: '6px 0 8px', maxHeight: 480 }}>
            {!displayed ? (
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, color: 'var(--text-muted)', textAlign: 'center', padding: '28px 16px', letterSpacing: '0.06em', lineHeight: 1.6 }}>
                hover or click a segment<br />to see its tools
              </div>
            ) : displayed.isCategory ? (
              detailSubcats?.map(sub => (
                <div key={sub.subcat}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', padding: '8px 14px 3px' }}>
                    {sub.subcat}
                  </div>
                  {sub.tools.map(tool => <ToolRow key={tool.name} tool={tool} color={displayed.color} />)}
                </div>
              ))
            ) : (
              detailTools.map(tool => <ToolRow key={tool.name} tool={tool} color={displayed.color} />)
            )}
          </div>
        </div>
    </div>
  )
}

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
