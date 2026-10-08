// Pure comparison logic. Histories differ in length, so we compare PRESENCE (who uses what) and SHARE of usage
// within each kind, never raw totals.
import type { Row, SlimFp } from './friends'

export type Kind = 'mcp' | 'skill' | 'tool'
export const KINDS: Kind[] = ['mcp', 'skill', 'tool']
export const KIND_LABEL: Record<Kind, string> = { mcp: 'MCP servers', skill: 'Skills', tool: 'Tools' }
export const KIND_ONE: Record<Kind, string> = { mcp: 'MCP server', skill: 'skill', tool: 'tool' }
export const KIND_COLOR: Record<Kind, string> = { mcp: '99,149,255', skill: '180,120,255', tool: '78,201,176' }

export interface Item extends Row { kind: Kind; share: number }
export interface Pair { name: string; kind: Kind; me: Item; them: Item; gap: number }   // gap = log2(myShare / theirShare)
export interface Comparison {
  both: Pair[]; onlyMe: Item[]; onlyThem: Item[]
  union: number; overlapPct: number
  perKind: Record<Kind, { both: number; onlyMe: number; onlyThem: number }>
  common: Pair[]; diverging: Pair[]
  lean: { me: number | null; them: number | null }
  agents: { me: Record<string, number>; them: Record<string, number> }
  categories: { name: string; me: number; them: number }[]
  breadth: { me: Record<Kind, number>; them: Record<Kind, number> }
  window: { me: [string, string]; them: [string, string] }
}

function itemsOf(fp: SlimFp): Map<string, Item> {
  const out = new Map<string, Item>()
  const add = (rows: Row[], kind: Kind) => {
    const total = rows.reduce((n, r) => n + r.uses, 0) || 1
    for (const r of rows) out.set(`${kind}|${r.name.toLowerCase()}`, { ...r, kind, share: r.uses / total })
  }
  add(fp.mcp, 'mcp'); add(fp.skills, 'skill'); add(fp.tools, 'tool')
  return out
}
const pct = (m: Record<string, number>) => { const t = Object.values(m).reduce((a, b) => a + b, 0) || 1; return Object.fromEntries(Object.entries(m).map(([k, v]) => [k, v / t])) }
const lean = (fp: SlimFp) => { const inst = [...fp.mcp, ...fp.skills, ...fp.tools].filter(r => r.installed); return inst.length ? inst.filter(r => r.uses > 0).length / inst.length : null }
const win = (fp: SlimFp): [string, string] => { const d = [...fp.tools, ...fp.skills, ...fp.mcp].flatMap(r => [r.first, r.last]).filter(Boolean).sort() as string[]; return [d[0] || '', d[d.length - 1] || ''] }
function catShare(fp: SlimFp) {
  const m: Record<string, number> = {}; let t = 0
  for (const r of fp.tools) if (r.category) { m[r.category] = (m[r.category] || 0) + r.uses; t += r.uses }
  return Object.fromEntries(Object.entries(m).map(([k, v]) => [k, t ? v / t : 0]))
}

export function compare(meFp: SlimFp, themFp: SlimFp): Comparison {
  const A = itemsOf(meFp), B = itemsOf(themFp)
  const both: Pair[] = [], onlyMe: Item[] = [], onlyThem: Item[] = []
  for (const [k, a] of A) {
    const b = B.get(k)
    if (a.uses > 0 && b && b.uses > 0) both.push({ name: a.name, kind: a.kind, me: a, them: b, gap: Math.log2(a.share / b.share) })
    else if (a.uses > 0) onlyMe.push(a)
  }
  for (const [k, b] of B) { const a = A.get(k); if (b.uses > 0 && !(a && a.uses > 0)) onlyThem.push(b) }
  const byUses = (x: Item, y: Item) => y.uses - x.uses
  onlyMe.sort(byUses); onlyThem.sort(byUses)
  const union = both.length + onlyMe.length + onlyThem.length
  const perKind = Object.fromEntries(KINDS.map(k => [k, { both: both.filter(p => p.kind === k).length, onlyMe: onlyMe.filter(i => i.kind === k).length, onlyThem: onlyThem.filter(i => i.kind === k).length }])) as Comparison['perKind']
  const common = [...both].sort((x, y) => (y.me.share + y.them.share) - (x.me.share + x.them.share))
  const diverging = both.filter(p => Math.max(p.me.share, p.them.share) >= 0.01 && Math.min(p.me.uses, p.them.uses) >= 5).sort((x, y) => Math.abs(y.gap) - Math.abs(x.gap))
  const cm = catShare(meFp), ct = catShare(themFp)
  const categories = [...new Set([...Object.keys(cm), ...Object.keys(ct)])].map(name => ({ name, me: cm[name] || 0, them: ct[name] || 0 })).sort((x, y) => (y.me + y.them) - (x.me + x.them)).slice(0, 8)
  const used = (fp: SlimFp): Record<Kind, number> => ({ mcp: fp.mcp.filter(r => r.uses > 0).length, skill: fp.skills.filter(r => r.uses > 0).length, tool: fp.tools.filter(r => r.uses > 0).length })
  return {
    both, onlyMe, onlyThem, union, overlapPct: union ? both.length / union : 0, perKind, common, diverging,
    lean: { me: lean(meFp), them: lean(themFp) },
    agents: { me: pct(meFp.agentSplit), them: pct(themFp.agentSplit) },
    categories, breadth: { me: used(meFp), them: used(themFp) }, window: { me: win(meFp), them: win(themFp) },
  }
}

export function matchLabel(p: number): string {
  if (p < 0.15) return 'Very different toolboxes: lots to learn from each other'
  if (p < 0.35) return 'Some common ground, plenty to swap'
  if (p < 0.6) return 'Similar setups with a few differences'
  return 'Near twins'
}
export const ratio = (gap: number) => `${Math.pow(2, Math.abs(gap)).toFixed(Math.abs(gap) >= 3.3 ? 0 : 1)}×`
