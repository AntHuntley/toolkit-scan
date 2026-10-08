import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Checkmark, Copy, Events, TrashCan, Upload } from '@carbon/icons-react'
import { addFriend, parseImport, removeFriend, slim, useFriends, type SlimFp } from './friends'
import { compare } from './compareLogic'
import { Reveal, num } from './Overview'

const REPO = 'https://github.com/AntHuntley/toolkit-scan'
const PROMPT = `Please set up Toolkit Scan and export my toolkit file so a friend can compare it with theirs: ${REPO}

1. Check Node.js 18+ is installed (\`node --version\`). If it isn't, tell me and stop. Don't install anything without asking.
2. Clone the repo into ~/toolkit-scan (skip if it's already there) and cd into it.
3. Run \`node toolkit-scan.mjs --export --name "<MY FIRST NAME>"\`. If it can't find my transcripts, run \`node toolkit-scan.mjs --discover\`, help me find them, and ask before adding any folder to ~/.toolkit-scan/sources.json.
4. Open ~/.toolkit-scan/toolkit-scan-compare.json and show me every skill and MCP-server name in it. Tell me if anything looks private or client-specific, and wait for my OK.
5. Tell me the file's full path so I can send it. Don't upload or send it anywhere yourself.

Don't edit any files in the repo. Transcripts are read-only.`

export function CopyButton({ text, label = 'Copy prompt' }: { text: string; label?: string }) {
  const [done, setDone] = useState(false)
  const copy = async () => {
    try { await navigator.clipboard.writeText(text) } catch {
      const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select()
      try { document.execCommand('copy') } catch { /* nothing else to try */ }
      ta.remove()
    }
    setDone(true); setTimeout(() => setDone(false), 1800)
  }
  return (
    <button onClick={copy} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: done ? 'rgba(78,201,176,0.16)' : 'rgba(78,201,176,0.08)', border: '1px solid var(--teal)', color: 'var(--teal)', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '8px 14px', borderRadius: 6, cursor: 'pointer' }}>
      {done ? <Checkmark size={14} /> : <Copy size={14} />}{done ? 'Copied' : label}
    </button>
  )
}

function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <Reveal delay={n * 90}>
      {() => (
        <section style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '24px 28px', height: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <span style={{ width: 26, height: 26, borderRadius: '50%', border: '1px solid rgba(78,201,176,0.5)', color: 'var(--teal)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontSize: 11 }}>{n}</span>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: '#fff' }}>{title}</h2>
          </div>
          {children}
        </section>
      )}
    </Reveal>
  )
}

const dim = { fontSize: 12, lineHeight: 1.6, color: 'var(--text-dim)' } as const

export default function CompareStart() {
  const nav = useNavigate()
  const friends = useFriends()
  const [me, setMe] = useState<SlimFp | null>(null)
  const [pending, setPending] = useState<{ name: string; fp: SlimFp } | null>(null)
  const [error, setError] = useState('')
  const [over, setOver] = useState(false)
  const [paste, setPaste] = useState(false)
  const [sample, setSample] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/fingerprint').then(r => r.json()).then(d => !d.error && setMe(slim(d))).catch(() => {})
    fetch('/api/sample-friend').then(r => (r.ok ? r.json() : null)).then(d => d && setSample(true)).catch(() => {})
  }, [])

  const load = (text: string, filename = '') => {
    try { setPending(parseImport(text, filename)); setError('') } catch (e) { setPending(null); setError(e instanceof Error ? e.message : String(e)) }
  }
  const readFile = async (f: File | undefined) => { if (f) load(await f.text(), f.name) }
  const confirm = () => { if (pending) nav(`/compare/${addFriend(pending.name, pending.fp)}`) }
  const trySample = async () => { const t = await (await fetch('/api/sample-friend')).text(); load(t, 'sam.json') }

  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 32px 64px', display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div style={{ textAlign: 'center', marginBottom: 8 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.22em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 14 }}>Compare</div>
          <h1 style={{ fontSize: 'clamp(26px, 3.6vw, 40px)', fontWeight: 300, letterSpacing: '-0.03em', color: '#fff', marginBottom: 12 }}>
            Compare your toolkit with a <em style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', color: 'var(--teal)' }}>Friend</em>
          </h1>
          <p style={{ ...dim, fontSize: 13, maxWidth: 640, margin: '0 auto' }}>
            Ever wondered what tools your friends use with their agents? See what you share, what's different, and which tools, skills and MCP servers are worth borrowing.
          </p>
        </div>

        <Step n={1} title="Ask a friend to run Toolkit Scan">
          <p style={{ ...dim, marginBottom: 14 }}>Send them this prompt. They paste it into Claude Code, Codex or any coding agent; it sets everything up and writes <b style={{ color: '#ddd' }}>one small file</b> of names and usage counts. No prompts, code or file paths.</p>
          <pre style={{ background: '#0b0b0b', border: '1px solid var(--border)', borderRadius: 8, padding: '16px 18px', fontFamily: 'var(--font-mono)', fontSize: 10.5, lineHeight: 1.65, color: '#b8b8b8', whiteSpace: 'pre-wrap', maxHeight: 220, overflowY: 'auto', marginBottom: 14 }}>{PROMPT}</pre>
          <CopyButton text={PROMPT} />
        </Step>

        <Step n={2} title="They send you the file">
          <p style={dim}>It's called <code style={{ color: 'var(--teal)' }}>toolkit-scan-compare.json</code> (about 50 KB). If they'd rather, their shared dashboard (<code style={{ color: 'var(--teal)' }}>.html</code> from <code style={{ color: 'var(--teal)' }}>--share</code>) works too. Any message app, email or AirDrop is fine.</p>
        </Step>

        <Step n={3} title="Drop it here">
          <div
            onDragOver={e => { e.preventDefault(); setOver(true) }} onDragLeave={() => setOver(false)}
            onDrop={e => { e.preventDefault(); setOver(false); readFile(e.dataTransfer.files[0]) }}
            onClick={() => fileRef.current?.click()}
            style={{ border: `1.5px dashed ${over ? 'var(--teal)' : 'rgba(255,255,255,0.18)'}`, background: over ? 'rgba(78,201,176,0.07)' : 'rgba(255,255,255,0.02)', borderRadius: 10, padding: '34px 20px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.15s' }}>
            <Upload size={26} style={{ color: 'var(--teal)', margin: '0 auto 10px' }} />
            <div style={{ fontSize: 13, color: '#e6e6e6', marginBottom: 4 }}>Drop your friend's file here, or click to choose it</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, letterSpacing: '0.1em', color: 'var(--text-muted)' }}>.JSON OR .HTML · READ IN YOUR BROWSER, NOT UPLOADED</div>
            <input ref={fileRef} type="file" accept=".json,.html,application/json,text/html" style={{ display: 'none' }} onChange={e => readFile(e.target.files?.[0])} />
          </div>
          <div style={{ display: 'flex', gap: 18, marginTop: 12, flexWrap: 'wrap' }}>
            <button onClick={() => setPaste(p => !p)} style={linkBtn}>{paste ? 'Hide' : 'Or paste the file contents'}</button>
            {sample && <button onClick={trySample} style={linkBtn}>Try it with a sample friend</button>}
          </div>
          {paste && <textarea placeholder="Paste the contents of toolkit-scan-compare.json" onChange={e => e.target.value.trim() && load(e.target.value)} style={{ width: '100%', height: 90, marginTop: 10, background: '#0b0b0b', border: '1px solid var(--border)', borderRadius: 8, color: '#bbb', fontFamily: 'var(--font-mono)', fontSize: 10, padding: 10 }} />}
          {error && <div style={{ marginTop: 12, fontSize: 12, color: '#f48771' }}>{error}</div>}
          {pending && (
            <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', background: 'rgba(78,201,176,0.07)', border: '1px solid rgba(78,201,176,0.35)', borderRadius: 10, padding: '14px 18px' }}>
              <Checkmark size={20} style={{ color: 'var(--teal)' }} />
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontSize: 12.5, color: '#fff', marginBottom: 2 }}>Found a toolkit: {pending.fp.tools.filter(t => t.uses).length} tools, {pending.fp.skills.filter(s => s.uses).length} skills, {pending.fp.mcp.filter(m => m.uses).length} MCP servers</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, color: 'var(--text-muted)' }}>{num(pending.fp.scan?.sessions || 0)} sessions analysed</div>
              </div>
              <input value={pending.name} onChange={e => setPending({ ...pending, name: e.target.value })} aria-label="Friend's name" style={{ background: '#0b0b0b', border: '1px solid var(--border-hi)', borderRadius: 6, color: '#fff', fontSize: 13, padding: '8px 12px', width: 150 }} />
              <button onClick={confirm} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--teal)', border: 'none', color: '#04110e', fontWeight: 600, fontSize: 12, padding: '9px 16px', borderRadius: 6, cursor: 'pointer' }}>Compare <ArrowRight size={14} /></button>
            </div>
          )}
        </Step>

        {friends.length > 0 && (
          <Reveal>
            {() => (
              <section style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '22px 28px' }}>
                <h2 style={{ fontSize: 14, fontWeight: 600, color: '#fff', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 9 }}><Events size={20} style={{ color: 'var(--teal)' }} />Your comparisons</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {friends.map(f => (
                    <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 14, background: '#0b0b0b', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px' }}>
                      <Link to={`/compare/${f.id}`} style={{ flex: 1, color: '#fff', fontSize: 13 }}>You × {f.name}</Link>
                      {me && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)' }}>{Math.round(compare(me, f.fp).overlapPct * 100)}% overlap</span>}
                      <button onClick={() => removeFriend(f.id)} aria-label={`Remove ${f.name}`} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><TrashCan size={16} /></button>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </Reveal>
        )}

        <div style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 9.5, letterSpacing: '0.08em', color: 'var(--text-muted)' }}>
          FILES ARE READ IN THIS BROWSER AND STORED ONLY IN ITS LOCAL STORAGE · NOTHING IS UPLOADED
        </div>
      </div>
    </div>
  )
}

const linkBtn = { background: 'none', border: 'none', color: 'var(--teal)', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', padding: 0 } as const
