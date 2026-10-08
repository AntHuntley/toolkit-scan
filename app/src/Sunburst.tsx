import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import * as d3 from 'd3'

export interface Tool {
  name: string
  desc: string
  status: 'preferred' | 'familiar' | 'want-to-try' | string
  simpleIcon: string
  url: string
  group: string | null
  uses?: number
}
export interface ToolGroup {
  group: string | null
  tools: Tool[]
}
export interface Subcat {
  subcat: string
  tools: Tool[]
  groups?: ToolGroup[]
}
export interface Category {
  category: string
  count: number
  subcats: Subcat[]
}
export interface ToolkitData {
  categories: Category[]
  total: number
}


// ── Simple icon URL ────────────────────────────────────────────────────────────
export function siUrl(slug: string) {
  return `https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/${slug}.svg`
}


// ── Hex → rgba helper ─────────────────────────────────────────────────────────
export function hexRgba(hex: string, alpha: number) {
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16)
  return `rgba(${r},${g},${b},${alpha})`
}


// ── Sunburst colours ────────────────────────────────────────────────────────────
const SUNBURST_COLORS = ['#4ec9b0','#569cd6','#b478ff','#50dc82','#ce9178','#c586c0','#ffc83c']
function dimColor(hex: string, alpha: number) {
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16)
  return `rgba(${r},${g},${b},${alpha})`
}

// ── Detail panel state type ──────────────────────────────────────────────────
interface DetailEntry { name: string; count: number; isCategory: boolean; color: string; parentCat: string | null }

// ── Toolkit sunburst ──────────────────────────────────────────────────────────
export function ToolkitSunburst({ data, compact = false, noun = 'tools' }: { data: ToolkitData; compact?: boolean; noun?: string }) {
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

    svg.attr('width', compact ? '100%' : SIZE).attr('height', compact ? '100%' : SIZE).attr('viewBox', `0 0 ${SIZE} ${SIZE}`).style('overflow','visible')
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
      .attr('font-size',7.5).attr('font-weight',300).attr('letter-spacing','0.2em').attr('fill','#888888').text(noun.toUpperCase())

    return () => { svg.selectAll('*').remove() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, compact, noun])

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
    <div ref={containerRef} style={compact ? { display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'stretch', position: 'relative' } : { display: 'flex', gap: 28, alignItems: 'flex-start', marginBottom: 60, justifyContent: 'flex-start', paddingLeft: 32, position: 'relative' }}>
      <div style={{ flexShrink: 0, width: compact ? '100%' : 700, height: compact ? 440 : 660, overflow: 'visible', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg ref={svgRef} />
      </div>

      {/* Detail panel — sticky so it stays visible while scrolling within the content area */}
      <div style={{
          width: compact ? '100%' : 320,
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
          position: compact ? 'relative' : 'sticky',
          top: 16,
          alignSelf: compact ? 'stretch' : 'flex-start',
          maxHeight: compact ? 260 : 'calc(100vh - 120px)',
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
                hover or click a segment<br />to see its {noun}
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

