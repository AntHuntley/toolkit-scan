// Friends' fingerprints live only in this browser (localStorage). Nothing is uploaded: a friend's file is parsed here.
import { useSyncExternalStore } from 'react'

export interface Row {
  name: string; uses: number; sessions: number
  first?: string; last?: string; category?: string; source?: string; installed?: boolean
}
export interface SlimFp {
  generatedAt?: string
  scan?: { files?: number; sessions?: number }
  installedCounts?: { skills: number; mcp: number; tools: number }
  tools: Row[]; skills: Row[]; mcp: Row[]; subagents: Row[]
  agentSplit: Record<string, number>   // claude / codex share of tool calls
}
export interface Friend { id: string; name: string; addedAt: string; fp: SlimFp }

const KEY = 'toolkit-scan.friends.v1'
const slimRow = (r: Row): Row => ({ name: r.name, uses: r.uses || 0, sessions: r.sessions || 0, first: r.first, last: r.last, category: r.category, source: r.source, installed: r.installed })

// Reduce a full fingerprint to what comparison needs (smaller to store, nothing extra kept).
export function slim(fp: any): SlimFp {
  const rows = (x: unknown): Row[] => (Array.isArray(x) ? (x as Row[]).filter(r => r && typeof r.name === 'string').map(slimRow) : [])
  const split: Record<string, number> = {}
  for (const r of [...(fp.builtin || []), ...(fp.mcp || [])]) for (const [a, n] of Object.entries((r.agents || {}) as Record<string, number>)) { const k = a.split(':')[0]; split[k] = (split[k] || 0) + n }
  return { generatedAt: fp.generatedAt, scan: { files: fp.scan?.files, sessions: fp.scan?.sessions }, installedCounts: fp.installedCounts, tools: rows(fp.tools), skills: rows(fp.skills), mcp: rows(fp.mcp), subagents: rows(fp.subagents), agentSplit: split }
}

// Accepts: the compare file from `--export`, a raw fingerprint, or the one-file HTML from `--share`.
export function parseImport(text: string, filename = ''): { name: string; fp: SlimFp } {
  const base = filename.replace(/\.[^.]+$/, '').replace(/^toolkit-scan-?/i, '').replace(/[-_]+/g, ' ').trim()
  let obj: any
  const t = text.trim()
  try {
    if (t.startsWith('<')) {
      const m = t.indexOf('window.__TS_DATA__=')
      if (m < 0) throw new Error('This HTML file has no Toolkit Scan data in it.')
      obj = JSON.parse(t.slice(m + 'window.__TS_DATA__='.length, t.indexOf('</script>', m)))
    } else obj = JSON.parse(t)
  } catch (e) {
    throw new Error(e instanceof Error && e.message.startsWith('This HTML') ? e.message : "That doesn't look like a Toolkit Scan file. Ask your friend to run the export and send the .json (or the shared .html).")
  }
  const fp = obj?.toolkitScan ? obj.fingerprint : obj?.fingerprint && obj.fingerprint.tools ? obj.fingerprint : obj
  if (!fp || !Array.isArray(fp.tools) || !Array.isArray(fp.skills)) throw new Error("That file doesn't contain tool and skill data.")
  return { name: (obj?.name && obj.name !== 'Friend' ? obj.name : base) || 'Friend', fp: slim(fp) }
}

// ── tiny external store
let friends: Friend[] = load()
const listeners = new Set<() => void>()
function load(): Friend[] { try { const v = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(v) ? v : [] } catch { return [] } }
function save() { try { localStorage.setItem(KEY, JSON.stringify(friends)) } catch { /* private mode / quota: keep in memory only */ } listeners.forEach(l => l()) }

export function addFriend(name: string, fp: SlimFp): string {
  const id = Math.random().toString(36).slice(2, 8)
  friends = [...friends, { id, name: name.trim() || 'Friend', addedAt: new Date().toISOString(), fp }]
  save()
  return id
}
export function removeFriend(id: string) { friends = friends.filter(f => f.id !== id); save() }
export function useFriends(): Friend[] {
  return useSyncExternalStore(cb => { listeners.add(cb); return () => { listeners.delete(cb) } }, () => friends)
}
