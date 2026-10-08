import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Events, Idea, Share, TrashCan } from '@carbon/icons-react'
import { removeFriend, slim, useFriends, type SlimFp } from './friends'
import { compare, KINDS, KIND_COLOR, KIND_LABEL, KIND_ONE, matchLabel, ratio, type Comparison, type Item, type Kind } from './compareLogic'
import { EASE, glass, num, Panel, Reveal, Sheen } from './Overview'

const ME = '78,201,176', THEM = '229,192,123', BOTH = '225,228,238'
const AGENT_COLOR: Record<string, string> = { claude: '#e8895a', codex: '#cfcfd4' }
const AGENT_LABEL: Record<string, string> = { claude: 'Claude Code', codex: 'Codex' }
const p0 = (x: number) => `${x < 0.1 && x > 0 ? (x * 100).toFixed(1) : Math.round(x * 100)}%`
const mono = { fontFamily: 'var(--font-mono)' } as const
const SOURCE_TAG: Record<string, string> = { user: 'custom', plugin: 'plugin', bundled: 'built-in' }

function useMe() {
  const [me, setMe] = useState<SlimFp | null>(null)
  useEffect(() => { fetch('/api/fingerprint').then(r => r.json()).then(d => !d.error && setMe(slim(d))).catch(() => {}) }, [])
  return me
}

function Seg({ n, total, color, shown, delay, label }: { n: number; total: number; color: string; shown: boolean; delay: number; label: string }) {
  return (
    <div style={{ width: shown ? `${(n / (total || 1)) * 100}%` : '0%', transition: `width 1.1s ${EASE} ${delay}ms`, minWidth: 0 }}>
      <div style={{ position: 'relative', height: 22, ...glass(color, false), borderRadius: 4, marginRight: 3 }}><Sheen /></div>
      <div style={{ ...mono, fontSize: 9.5, letterSpacing: '0.08em', color: `rgb(${color})`, marginTop: 8, whiteSpace: 'nowrap', opacity: shown ? 1 : 0, transition: `opacity 0.6s ease ${delay + 600}ms` }}>
        <b style={{ fontSize: 15, fontWeight: 400, color: '#fff' }}>{n}</b> {label}
      </div>
    </div>
  )
}

function ItemList({ title, hint, icon, items, kinds, who, muted, limit }: { title: string; hint: string; icon: ReactNode; items: Item[]; kinds: Kind[]; who: string; muted?: boolean; limit: number }) {
  const customSkills = items.some(i => i.kind === 'skill' && i.source === 'user')
  return (
    <Panel title={title} hint={hint} icon={icon}>
      {shown => (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))', gap: 28 }}>
            {kinds.map(kind => {
              const rows = items.filter(i => i.kind === kind), top = rows.slice(0, limit), max = top[0]?.uses || 1
              return (
                <div key={kind} style={{ opacity: muted ? 0.9 : 1 }}>
                  <div style={{ ...mono, fontSize: 9.5, letterSpacing: '0.16em', textTransform: 'uppercase', color: `rgb(${KIND_COLOR[kind]})`, marginBottom: 12 }}>{KIND_LABEL[kind]} · {rows.length}</div>
                  {!top.length && <div style={{ fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.5 }}>Nothing here. The other person has no {KIND_ONE[kind]}s you don't already use.</div>}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                    {top.map((it, i) => (
                      <div key={it.name}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
                          <span style={{ fontSize: 12.5, color: '#f0f0f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.name}</span>
                          {it.kind === 'skill' && it.source && <span style={{ ...mono, fontSize: 7.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', border: '1px solid var(--border-hi)', borderRadius: 3, padding: '1px 5px' }}>{SOURCE_TAG[it.source] || it.source}</span>}
                          <span style={{ ...mono, fontSize: 9.5, color: 'var(--text-dim)', marginLeft: 'auto', whiteSpace: 'nowrap' }}>{num(it.uses)} uses</span>
                        </div>
                        <div style={{ height: 8, background: 'var(--card)', borderRadius: 3 }}>
                          <div style={{ position: 'relative', height: '100%', width: shown ? `${Math.max(3, (it.uses / max) * 100)}%` : '0%', borderRadius: 3, transition: `width 1s ${EASE} ${i * 70}ms`, ...glass(KIND_COLOR[kind], false) }}><Sheen /></div>
                        </div>
                        {it.category && <div style={{ ...mono, fontSize: 8.5, color: 'var(--text-muted)', marginTop: 3 }}>{it.category}</div>}
                      </div>
                    ))}
                  </div>
                  {rows.length > limit && <div style={{ ...mono, fontSize: 9.5, color: 'var(--text-muted)', marginTop: 10 }}>+{rows.length - limit} more</div>}
                </div>
              )
            })}
          </div>
          {customSkills && <div style={{ marginTop: 18, fontSize: 11, lineHeight: 1.55, color: 'var(--text-muted)' }}>Skills marked <i>custom</i> belong to {who}. Ask them to share the skill folder if you want it. Plugin and built-in ones you can install yourself.</div>}
        </>
      )}
    </Panel>
  )
}

function Butterfly({ rows, me, them, shown, kind }: { rows: Comparison['common']; me: string; them: string; shown: boolean; kind: Kind }) {
  const max = Math.max(...rows.map(r => Math.max(r.me.share, r.them.share))) || 1
  const side = (share: number, color: string, left: boolean, i: number) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexDirection: left ? 'row' : 'row-reverse' }}>
      <span style={{ ...mono, fontSize: 9.5, color: 'var(--text-dim)', width: 38, textAlign: left ? 'right' : 'left', flexShrink: 0 }}>{p0(share)}</span>
      <div style={{ flex: 1, display: 'flex', justifyContent: left ? 'flex-end' : 'flex-start' }}>
        <div style={{ position: 'relative', height: 13, width: shown ? `${Math.max(2, (share / max) * 100)}%` : '0%', borderRadius: 3, transition: `width 1s ${EASE} ${i * 60}ms`, ...glass(color, false) }}><Sheen /></div>
      </div>
    </div>
  )
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 170px 1fr', gap: 10, ...mono, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 10 }}>
        <span style={{ textAlign: 'right', color: `rgb(${ME})` }}>{me}</span>
        <span style={{ textAlign: 'center', color: `rgb(${KIND_COLOR[kind]})` }}>{KIND_LABEL[kind]}</span>
        <span style={{ color: `rgb(${THEM})` }}>{them}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {rows.map((r, i) => (
          <div key={r.name} style={{ display: 'grid', gridTemplateColumns: '1fr 170px 1fr', gap: 10, alignItems: 'center' }}>
            {side(r.me.share, ME, true, i)}
            <div style={{ textAlign: 'center', fontSize: 11.5, color: '#eee', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.name}>{r.name}</div>
            {side(r.them.share, THEM, false, i)}
          </div>
        ))}
      </div>
    </div>
  )
}

function Person({ name, color, fp, lean, breadth, agents, shown }: { name: string; color: string; fp: SlimFp; lean: number | null; breadth: Record<Kind, number>; agents: Record<string, number>; shown: boolean }) {
  return (
    <div style={{ background: '#0b0b0b', border: `1px solid rgba(${color},0.3)`, borderRadius: 10, padding: '18px 20px' }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: `rgb(${color})`, marginBottom: 14 }}>{name}</div>
      <div style={{ ...mono, fontSize: 8.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>Installed things actually used</div>
      {lean === null ? <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Not available</div> : (
        <>
          <div style={{ fontSize: 26, fontWeight: 300, letterSpacing: '-0.03em', color: '#fff', marginBottom: 6 }}>{Math.round(lean * 100)}%</div>
          <div style={{ height: 10, background: 'var(--card)', borderRadius: 4, marginBottom: 18 }}>
            <div style={{ position: 'relative', height: '100%', width: shown ? `${lean * 100}%` : '0%', borderRadius: 4, transition: `width 1.1s ${EASE}`, ...glass(color, false) }}><Sheen /></div>
          </div>
        </>
      )}
      <div style={{ ...mono, fontSize: 8.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>Breadth (used)</div>
      <div style={{ display: 'flex', gap: 18, marginBottom: 18 }}>
        {KINDS.map(k => <div key={k}><div style={{ fontSize: 20, fontWeight: 300, color: `rgb(${KIND_COLOR[k]})` }}>{breadth[k]}</div><div style={{ ...mono, fontSize: 8.5, color: 'var(--text-muted)' }}>{KIND_LABEL[k]}</div></div>)}
      </div>
      <div style={{ ...mono, fontSize: 8.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>Which agent</div>
      <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', background: 'var(--card)' }}>
        {Object.entries(agents).map(([a, v]) => <div key={a} style={{ width: shown ? `${v * 100}%` : '0%', background: AGENT_COLOR[a] || '#888', transition: `width 1.1s ${EASE} 200ms` }} />)}
      </div>
      <div style={{ display: 'flex', gap: 14, marginTop: 7, ...mono, fontSize: 9, color: 'var(--text-muted)' }}>
        {Object.entries(agents).map(([a, v]) => <span key={a}><span style={{ color: AGENT_COLOR[a] || '#888' }}>●</span> {AGENT_LABEL[a] || a} {Math.round(v * 100)}%</span>)}
      </div>
      <div style={{ ...mono, fontSize: 8.5, color: 'var(--text-muted)', marginTop: 14 }}>{num(fp.scan?.sessions || 0)} sessions analysed</div>
    </div>
  )
}

export default function Versus() {
  const { id } = useParams()
  const nav = useNavigate()
  const friend = useFriends().find(f => f.id === id)
  const me = useMe()
  const c = useMemo(() => (me && friend ? compare(me, friend.fp) : null), [me, friend])

  if (!friend) return <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, color: 'var(--text-dim)' }}>That comparison isn't saved in this browser. <Link to="/compare" style={{ color: 'var(--teal)' }}>Add a friend</Link></div>
  if (!c || !me) return <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', ...mono, fontSize: 11, color: 'var(--text-dim)', letterSpacing: '0.18em' }}>LOADING…</div>

  const N = friend.name
  const heavy = (items: Item[]) => [...items].sort((a, b) => b.share - a.share)[0]
  const tryTop = heavy(c.onlyThem), tellTop = heavy(c.onlyMe), gapTop = c.diverging[0]
  const dom = (m: Record<string, number>) => Object.entries(m).sort((a, b) => b[1] - a[1])[0]
  const dMe = dom(c.agents.me), dThem = dom(c.agents.them)
  const cards: { title: string; body: ReactNode; color: string }[] = [
    { title: 'Overlap', color: BOTH, body: <>You share <b>{c.both.length}</b> of the <b>{c.union}</b> tools, skills and MCP servers either of you uses.</> },
    tryTop && { title: `Worth a look from ${N}`, color: THEM, body: <><b>{tryTop.name}</b> ({KIND_ONE[tryTop.kind]}) is a big part of how {N} works, and you don't use it.</> },
    tellTop && { title: `Something to tell ${N}`, color: ME, body: <>You use <b>{tellTop.name}</b> ({KIND_ONE[tellTop.kind]}) a lot. {N} doesn't use it at all.</> },
    gapTop && { title: 'Biggest difference in habit', color: BOTH, body: <>{gapTop.gap > 0 ? 'You lean' : `${N} leans`} on <b>{gapTop.name}</b> about <b>{ratio(gapTop.gap)}</b> more than {gapTop.gap > 0 ? N : 'you'} do.</> },
    c.lean.me !== null && c.lean.them !== null && Math.abs(c.lean.me - c.lean.them) >= 0.05 && { title: 'Leaner setup', color: BOTH, body: <>{c.lean.me > c.lean.them ? 'You use' : `${N} uses`} <b>{Math.round(Math.max(c.lean.me, c.lean.them) * 100)}%</b> of what's installed, vs <b>{Math.round(Math.min(c.lean.me, c.lean.them) * 100)}%</b>.</> },
    dMe && dThem && { title: 'Which agent', color: BOTH, body: dMe[0] === dThem[0] ? <>You both mostly use <b>{AGENT_LABEL[dMe[0]] || dMe[0]}</b>.</> : <>You mostly use <b>{AGENT_LABEL[dMe[0]] || dMe[0]}</b> ({Math.round(dMe[1] * 100)}%); {N} mostly uses <b>{AGENT_LABEL[dThem[0]] || dThem[0]}</b> ({Math.round(dThem[1] * 100)}%).</> },
  ].filter(Boolean) as { title: string; body: ReactNode; color: string }[]

  const commonByKind = (k: Kind, n: number) => c.common.filter(p => p.kind === k).slice(0, n)
  const maxCat = Math.max(...c.categories.flatMap(x => [x.me, x.them]), 0.001)

  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      <div style={{ maxWidth: 1250, margin: '0 auto', padding: '32px 32px 64px', display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', ...mono, fontSize: 9.5, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
          <Link to="/compare" style={{ color: 'var(--text-dim)' }}>← All comparisons</Link>
          <button onClick={() => { removeFriend(friend.id); nav('/compare') }} style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', ...mono, fontSize: 9.5, letterSpacing: '0.12em', textTransform: 'uppercase' }}><TrashCan size={14} />Remove {N}</button>
        </div>

        {/* Hero: how alike are we */}
        <Reveal>
          {shown => (
            <div style={{ textAlign: 'center' }}>
              <h1 style={{ fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 300, letterSpacing: '-0.03em', color: '#fff', marginBottom: 6 }}>
                You <span style={{ color: 'var(--text-muted)' }}>×</span> <em style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', color: `rgb(${THEM})` }}>{N}</em>
              </h1>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 14, margin: '18px 0 6px' }}>
                <span style={{ fontSize: 64, fontWeight: 200, letterSpacing: '-0.05em', color: '#fff', lineHeight: 1 }}>{Math.round(c.overlapPct * 100)}%</span>
                <span style={{ ...mono, fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>overlap</span>
              </div>
              <div style={{ fontSize: 14, color: 'var(--text-dim)', marginBottom: 26 }}>{matchLabel(c.overlapPct)}</div>
              <div style={{ display: 'flex', maxWidth: 900, margin: '0 auto', textAlign: 'left' }}>
                <Seg n={c.onlyMe.length} total={c.union} color={ME} shown={shown} delay={0} label="only you" />
                <Seg n={c.both.length} total={c.union} color={BOTH} shown={shown} delay={150} label="in common" />
                <Seg n={c.onlyThem.length} total={c.union} color={THEM} shown={shown} delay={300} label={`only ${N}`} />
              </div>
              <div style={{ ...mono, fontSize: 8.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginTop: 26 }}>By kind: <span style={{ color: `rgb(${ME})` }}>only you</span> · <span style={{ color: '#ddd' }}>in common</span> · <span style={{ color: `rgb(${THEM})` }}>only {N}</span></div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 36, marginTop: 12, flexWrap: 'wrap' }}>
                {KINDS.map(k => (
                  <div key={k} style={{ ...mono, fontSize: 9.5, color: 'var(--text-muted)' }}>
                    <span style={{ color: `rgb(${KIND_COLOR[k]})`, letterSpacing: '0.14em', textTransform: 'uppercase' }}>{KIND_LABEL[k]}</span>
                    <div style={{ marginTop: 5 }}><span style={{ color: `rgb(${ME})` }}>{c.perKind[k].onlyMe}</span> · <span style={{ color: '#ddd' }}>{c.perKind[k].both}</span> · <span style={{ color: `rgb(${THEM})` }}>{c.perKind[k].onlyThem}</span></div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Reveal>

        <Reveal>
          {() => (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 14 }}>
              {cards.map(k => (
                <div key={k.title} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderLeft: `3px solid rgb(${k.color})`, borderRadius: 10, padding: '14px 18px' }}>
                  <div style={{ ...mono, fontSize: 8.5, letterSpacing: '0.16em', textTransform: 'uppercase', color: `rgb(${k.color})`, marginBottom: 6 }}>{k.title}</div>
                  <div style={{ fontSize: 13, lineHeight: 1.55, color: '#d8d8d8' }}>{k.body}</div>
                </div>
              ))}
            </div>
          )}
        </Reveal>

        <ItemList title={`Worth trying from ${N}`} hint="ranked by how much they use it" icon={<Idea size={20} style={{ color: `rgb(${THEM})` }} />} items={c.onlyThem} kinds={KINDS} who={N} limit={7} />
        <ItemList title={`You could tell ${N} about`} hint="things you use that they don't" icon={<Share size={20} style={{ color: `rgb(${ME})` }} />} items={c.onlyMe} kinds={KINDS} who="you" limit={5} muted />

        <Panel title="In common" hint={`share of each person's own usage · ${c.both.length} things`} icon={<Events size={20} style={{ color: `rgb(${BOTH})` }} />}>
          {shown => (
            <>
              {KINDS.map(k => commonByKind(k, k === 'tool' ? 8 : 5)).filter(r => r.length).map(rows => <Butterfly key={rows[0].kind} rows={rows} me="You" them={N} shown={shown} kind={rows[0].kind} />)}
              {!c.common.length && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>No overlap yet.</div>}
            </>
          )}
        </Panel>

        {c.diverging.length > 0 && (
          <Panel title="Same tool, different habits" hint="shared things used at very different rates">
            {() => (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {c.diverging.slice(0, 6).map(p => (
                  <div key={p.kind + p.name} style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap', borderBottom: '1px solid var(--border)', paddingBottom: 9 }}>
                    <span style={{ fontSize: 13, color: '#fff', minWidth: 130 }}>{p.name}</span>
                    <span style={{ ...mono, fontSize: 8, letterSpacing: '0.12em', textTransform: 'uppercase', color: `rgb(${KIND_COLOR[p.kind]})` }}>{KIND_ONE[p.kind]}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-dim)' }}><b style={{ color: `rgb(${p.gap > 0 ? ME : THEM})`, fontWeight: 600 }}>{p.gap > 0 ? 'You' : N}</b> {p.gap > 0 ? 'use' : 'uses'} it {ratio(p.gap)} more · {p0(p.me.share)} of your {KIND_LABEL[p.kind].toLowerCase()} vs {p0(p.them.share)} of {N}'s</span>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        )}

        <Panel title="Habits" hint="how each of you works">
          {shown => (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 18, marginBottom: 26 }}>
                <Person name="You" color={ME} fp={me} lean={c.lean.me} breadth={c.breadth.me} agents={c.agents.me} shown={shown} />
                <Person name={N} color={THEM} fp={friend.fp} lean={c.lean.them} breadth={c.breadth.them} agents={c.agents.them} shown={shown} />
              </div>
              {c.categories.length > 0 && (
                <>
                  <div style={{ ...mono, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 12 }}>Where your tool usage goes (share of each person's tool calls)</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 170px 1fr', gap: 10, ...mono, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 10 }}>
                    <span style={{ textAlign: 'right', color: `rgb(${ME})` }}>You</span><span /><span style={{ color: `rgb(${THEM})` }}>{N}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {c.categories.map((x, i) => (
                      <div key={x.name} style={{ display: 'grid', gridTemplateColumns: '1fr 170px 1fr', gap: 10, alignItems: 'center' }}>
                        {[[x.me, ME, true], null, [x.them, THEM, false]].map((s, j) => s === null
                          ? <div key={j} style={{ textAlign: 'center', fontSize: 11.5, color: '#eee' }}>{x.name}</div>
                          : (
                            <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 8, flexDirection: (s as [number, string, boolean])[2] ? 'row' : 'row-reverse' }}>
                              <span style={{ ...mono, fontSize: 9.5, color: 'var(--text-dim)', width: 38, textAlign: (s as [number, string, boolean])[2] ? 'right' : 'left' }}>{p0((s as [number, string, boolean])[0])}</span>
                              <div style={{ flex: 1, display: 'flex', justifyContent: (s as [number, string, boolean])[2] ? 'flex-end' : 'flex-start' }}>
                                <div style={{ position: 'relative', height: 13, width: shown ? `${Math.max(1, ((s as [number, string, boolean])[0] / maxCat) * 100)}%` : '0%', borderRadius: 3, transition: `width 1s ${EASE} ${i * 60}ms`, ...glass((s as [number, string, boolean])[1], false) }}><Sheen /></div>
                              </div>
                            </div>
                          ))}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </Panel>

        <div style={{ textAlign: 'center', ...mono, fontSize: 9, letterSpacing: '0.08em', color: 'var(--text-muted)', lineHeight: 1.8 }}>
          YOU {c.window.me[0]} → {c.window.me[1]} · {N.toUpperCase()} {c.window.them[0]} → {c.window.them[1]}<br />
          HISTORIES DIFFER IN LENGTH, SO WE COMPARE WHO USES WHAT AND EACH PERSON'S SHARE OF USAGE, NOT RAW COUNTS
        </div>
      </div>
    </div>
  )
}
