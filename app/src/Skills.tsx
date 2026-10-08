import { useEffect, useState } from 'react'
import { marked } from 'marked'
import {
  X, FolderOpen, Copy, Check,
  // category icons
  FileText, Palette, Settings, GitBranch, Package, Wrench, Lightbulb, Code2,
  // skill icons
  Brain, Users, FileSearch, Layers, Share2, Zap, PenLine,
  Cpu, PlayCircle, GitMerge, MessageSquare, Eye, Bot,
  Bug, FlaskConical, GitFork, ShieldCheck, ClipboardList, CheckCircle, CircleDot,
  // auto-icon registry extras
  File, Files, FilePlus, FileEdit, FileCode, FileBarChart, FileSpreadsheet,
  Presentation, LayoutTemplate, Table, Rows,
  Sparkles, Wand2, Terminal, Webhook, SearchCode,
  Settings2, SlidersHorizontal, Lock, Key, Shield,
  Network, Plug, PlugZap, Monitor, AppWindow, Server, Laptop,
  Image, ImagePlus, Layout, Globe, Database, HardDrive, Cloud,
  Calculator, BarChart2, TrendingUp,
  Paintbrush, Brush, Pen, PenTool,
  BookOpen, Book, Bookmark, Star, Award, Trophy,
  Package2, Box, Boxes, Workflow, ArrowRightLeft, Route,
  FolderCode, GitCommit, GitPullRequest, MessageCircle,
  // controls
  ChevronDown,
} from 'lucide-react'

// ── Notion Logo Icon (from Simple Icons) ───────────────────────────────────────
const NotionLogo = ({ size = 24, style }: { size?: number; style?: React.CSSProperties }) => {
  const [loaded, setLoaded] = useState(false)
  return (
    <img
      src="https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/notion.svg"
      width={size}
      height={size}
      style={{ ...style, filter: 'invert(1)', opacity: loaded ? 1 : 0.6, transition: 'opacity 0.2s' }}
      onLoad={() => setLoaded(true)}
      alt="Notion"
    />
  )
}

// ── Icon registry — maps string names (from API) to Lucide components ──────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ICON_REGISTRY: Record<string, React.ComponentType<any>> = {
  FileText, File, Files, FilePlus, FileEdit, FileCode, FileBarChart, FileSearch,
  FileSpreadsheet, FolderOpen, FolderCode,
  Presentation, LayoutTemplate, Table, Rows,
  Brain, Bot, Cpu, Zap, Sparkles, Wand2,
  Terminal, Code2, Webhook, Bug, FlaskConical,
  GitBranch, GitMerge, GitFork, GitCommit, GitPullRequest,
  Users, MessageSquare, MessageCircle,
  Eye, SearchCode, Settings, Settings2, SlidersHorizontal,
  Wrench, Lock, Key, Shield, ShieldCheck,
  Lightbulb, Layers, Share2, Network, Plug, PlugZap,
  PlayCircle, BarChart2, TrendingUp,
  Calculator, Palette, Paintbrush, Brush, Pen, PenLine, PenTool,
  ClipboardList, CheckCircle, CircleDot,
  Package, Package2, Box, Boxes,
  Server, Monitor, Laptop, AppWindow,
  Image, ImagePlus, Layout, Globe, Database, HardDrive, Cloud,
  BookOpen, Book, Bookmark, Star, Award, Trophy,
  Workflow, ArrowRightLeft, Route,
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveIcon(name: string | undefined): React.ComponentType<any> {
  if (!name) return Package
  return ICON_REGISTRY[name] ?? Package
}

// ── Skill icon map — hard-coded overrides take priority over API suggestion ────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SKILL_ICONS: Record<string, React.ComponentType<any>> = {
  // Notion
  'notion-knowledge-capture':       Brain,
  'notion-meeting-intelligence':    Users,
  'notion-research-documentation':  FileSearch,
  'notion-spec-to-implementation':  Layers,
  // Documents
  'session-report':                 FileBarChart,
  'docx':                           FileText,
  'pdf':                            FileSearch,
  'pptx':                           Presentation,
  'xlsx':                           FileSpreadsheet,
  'pptx-ibm':                       Presentation,
  // Visuals
  'drawio':                         Share2,
  'theme-obsidian':                 Palette,
  // Utilities
  'skill-creator':                  Wand2,
  // Meta / Setup
  'using-superpowers':              Zap,
  'writing-skills':                 PenLine,
  // Agent Workflows
  'brainstorming':                  Lightbulb,
  'dispatching-parallel-agents':    Cpu,
  'executing-plans':                PlayCircle,
  'finishing-a-development-branch': GitMerge,
  'receiving-code-review':          MessageSquare,
  'requesting-code-review':         Eye,
  'subagent-driven-development':    Bot,
  'systematic-debugging':           Bug,
  'test-driven-development':        FlaskConical,
  'using-git-worktrees':            GitFork,
  'verification-before-completion': ShieldCheck,
  'writing-plans':                  ClipboardList,
  'finish-issue':                   CheckCircle,
  'start-issue':                    CircleDot,
  'agent-development':              Bot,
  'command-development':            Terminal,
  'hook-development':               Webhook,
  'skill-development':              Sparkles,
  // Claude Code
  'claude-automation-recommender':  Zap,
  'claude-md-improver':             FileEdit,
  'example-command':                Terminal,
  'writing-hookify-rules':          Webhook,
  // Other
  'access':                         Key,
  'configure':                      Settings2,
  'example-skill':                  BookOpen,
  'frontend-design':                Palette,
  'math-olympiad':                  Calculator,
  'build-mcp-app':                  AppWindow,
  'build-mcp-server':               Server,
  'build-mcpb':                     Package2,
  'playground':                     PlayCircle,
  'mcp-integration':                PlugZap,
  'plugin-settings':                SlidersHorizontal,
  'plugin-structure':               FolderCode,
}

// ── Category config ────────────────────────────────────────────────────────────
const CATEGORY_CONFIG: Record<string, { icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>, label: string }> = {
  'Notion':            { icon: NotionLogo,    label: 'Notion' },
  'Documents':         { icon: FileText,      label: 'Documents' },
  'Visuals':           { icon: Palette,       label: 'Visuals' },
  'Utilities':         { icon: Wand2,         label: 'Utilities' },
  'Meta / Setup':      { icon: Wrench,        label: 'Meta /\nSetup' },
  'Agent Workflows':   { icon: GitBranch,     label: 'Agent\nWorkflows' },
  'Claude Code':       { icon: Terminal,      label: 'Claude\nCode' },
  'Other':             { icon: Layers,        label: 'Other' },
}

// ── Types ──────────────────────────────────────────────────────────────────────
interface Skill {
  name: string
  role: string
  source: string
  enabled: boolean
}
interface Category {
  name: string
  skills: Skill[]
}
interface SkillDetail {
  name: string
  desc: string
  markdown: string
  folderPath: string
  files: { name: string; isDir: boolean }[]
  source: string
  enabled: boolean
  icon?: string
}
interface SkillsData {
  matrix: Category[]
  details: Record<string, SkillDetail>
  total: number
}

// ── Source badge colours ───────────────────────────────────────────────────────
const REPO_PALETTE: [string, string, string][] = [
  // bg (rgba), text, border
  ['rgba(180,120,255,0.12)', '#b478ff', 'rgba(180,120,255,0.28)'], // purple  — Superpowers
  ['rgba(99,149,255,0.12)',  '#6395ff', 'rgba(99,149,255,0.28)'],  // blue    — Notion
  ['rgba(255,200,60,0.12)',  '#ffc83c', 'rgba(255,200,60,0.28)'],  // amber
  ['rgba(80,220,130,0.12)',  '#50dc82', 'rgba(80,220,130,0.28)'],  // green
  ['rgba(255,100,180,0.12)', '#ff64b4', 'rgba(255,100,180,0.28)'], // pink
  ['rgba(120,200,255,0.12)', '#78c8ff', 'rgba(120,200,255,0.28)'], // sky
]
const repoIndex: Record<string, number> = {}
let repoCounter = 0

function getSourceDisplay(src: string): string {
  if (!src) return '—'
  if (src === 'Claude') return 'Claude Default'
  return src
}

function getSourceColor(src: string): string {
  if (!src || src === '—')  return '#909090'
  if (src === 'Claude')     return '#909090'
  if (src === 'Custom')     return '#50dc82'
  if (src === 'Superpowers') return '#b478ff'
  if (src === 'Github-Anthropic Agent Skills' || src === 'Anthropic Agent Skills') return '#ffc83c'

  const repo = src.startsWith('Github-') ? src.slice(7) : src
  if (!(repo in repoIndex)) repoIndex[repo] = repoCounter++ % REPO_PALETTE.length
  const [, color] = REPO_PALETTE[repoIndex[repo]]
  return color
}

function getBarColor(src: string): string {
  if (!src || src === '—')  return 'rgba(90,90,90,0.18)'
  if (src === 'Claude')     return 'rgba(90,90,90,0.18)'
  if (src === 'Custom')     return 'rgba(80,220,130,0.12)'
  if (src === 'Superpowers') return 'rgba(180,120,255,0.12)'
  if (src === 'Github-Anthropic Agent Skills' || src === 'Anthropic Agent Skills') return 'rgba(255,200,60,0.12)'

  const repo = src.startsWith('Github-') ? src.slice(7) : src
  if (!(repo in repoIndex)) repoIndex[repo] = repoCounter++ % REPO_PALETTE.length
  const [bg] = REPO_PALETTE[repoIndex[repo]]
  return bg
}

function sourceBadgeStyle(src: string): React.CSSProperties {
  const base: React.CSSProperties = {
    display: 'inline-block',
    fontFamily: 'var(--font-mono)',
    fontSize: 9,
    fontWeight: 600,
    letterSpacing: '0.06em',
    padding: '2px 7px',
    borderRadius: 4,
    textTransform: 'uppercase',
    whiteSpace: 'nowrap',
  }
  if (!src || src === '—')  return { ...base, color: '#909090' }
  if (src === 'Claude')     return { ...base, background: 'rgba(90,90,90,0.18)',   color: '#909090', border: '1px solid rgba(120,120,120,0.3)' }
  if (src === 'Custom')     return { ...base, background: 'rgba(80,220,130,0.12)', color: '#50dc82', border: '1px solid rgba(80,220,130,0.28)' }
  if (src === 'Superpowers') return { ...base, background: 'rgba(180,120,255,0.12)', color: '#b478ff', border: '1px solid rgba(180,120,255,0.28)' }
  if (src === 'Github-Anthropic Agent Skills' || src === 'Anthropic Agent Skills') return { ...base, background: 'rgba(255,200,60,0.12)', color: '#ffc83c', border: '1px solid rgba(255,200,60,0.28)' }

  const repo = src.startsWith('Github-') ? src.slice(7) : src
  if (!(repo in repoIndex)) repoIndex[repo] = repoCounter++ % REPO_PALETTE.length
  const [bg, color, border] = REPO_PALETTE[repoIndex[repo]]
  return { ...base, background: bg, color, border: `1px solid ${border}` }
}

// ── Markdown renderer ──────────────────────────────────────────────────────────
marked.setOptions({ breaks: true })

function MarkdownContent({ md }: { md: string }) {
  if (!md) return <p style={{ color: '#909090', fontFamily: 'var(--font-mono)', fontSize: 11 }}>No content available.</p>
  return (
    <div
      className="md-content"
      dangerouslySetInnerHTML={{ __html: marked.parse(md) as string }}
      style={{ fontSize: 12.5, lineHeight: 1.7, color: 'var(--text)' }}
    />
  )
}

// ── Detail drawer ──────────────────────────────────────────────────────────────
function DetailDrawer({ skill, detail, onClose }: {
  skill: Skill | null
  detail: SkillDetail | null
  onClose: () => void
}) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!skill) return null

  const copyPath = () => {
    if (detail?.folderPath) {
      navigator.clipboard.writeText(detail.folderPath)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 40 }}
      />
      {/* Drawer */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 520,
        background: 'var(--surface)', borderLeft: '1px solid var(--border)',
        zIndex: 50, display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '18px 24px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0,
        }}>
          {(() => {
            const Icon = SKILL_ICONS[skill.name] ?? resolveIcon(detail?.icon)
            return Icon
              ? <Icon size={36} strokeWidth={1} style={{ color: '#fff', flexShrink: 0 }} />
              : <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--teal)', flexShrink: 0 }} />
          })()}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#fff', letterSpacing: '-0.02em', marginBottom: 2 }}>
              {skill.name}
            </div>
            {detail?.desc && (
              <div style={{ fontSize: 11.5, color: 'var(--teal)', lineHeight: 1.5 }}>{detail.desc}</div>
            )}
          </div>
          <span style={sourceBadgeStyle(skill.source)}>{skill.source || '—'}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#909090', padding: 4, display: 'flex' }}>
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          {detail ? (
            <>
              {/* Markdown content */}
              <div style={{ padding: '24px 28px', borderBottom: '1px solid var(--border)' }}>
                <MarkdownContent md={detail.markdown} />
              </div>
              {/* Sidebar meta */}
              <div style={{ padding: '18px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8.5, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#909090', marginBottom: 8 }}>
                    Location
                  </div>
                  <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 5, padding: '7px 9px', fontFamily: 'var(--font-mono)', fontSize: 8.5, color: '#909090', wordBreak: 'break-all', lineHeight: 1.5 }}>
                    {detail.folderPath}
                  </div>
                  <button
                    onClick={copyPath}
                    style={{ marginTop: 6, width: '100%', background: 'none', border: '1px solid var(--border-hi)', color: copied ? 'var(--teal)' : 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 9.5, padding: '5px', borderRadius: 4, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, transition: 'all 0.15s' }}
                  >
                    {copied ? <Check size={11} /> : <Copy size={11} />}
                    {copied ? 'Copied!' : 'Copy path'}
                  </button>
                </div>

                {detail.files.length > 0 && (
                  <div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8.5, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#909090', marginBottom: 8 }}>
                      Files
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {detail.files.map((f) => (
                        <div key={f.name} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 6px', borderRadius: 4, fontFamily: 'var(--font-mono)', fontSize: 9.5, color: 'var(--text-dim)' }}>
                          {f.isDir ? <FolderOpen size={10} /> : <span style={{ width: 10, textAlign: 'center', fontSize: 10 }}>📄</span>}
                          {f.name}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div style={{ padding: 28, color: '#909090', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
              No SKILL.md found for this skill.
            </div>
          )}
        </div>
      </div>
    </>
  )
}

// ── Statistics Chart Component ────────────────────────────────────────────────
function StatisticsChart({
  title,
  data,
  color,
  colorFunction,
  textColorFunction,
  iconFunction,
}: {
  title: string
  data: { label: string; count: number }[]
  color?: string
  colorFunction?: (label: string) => string
  textColorFunction?: (label: string) => string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  iconFunction?: (label: string) => React.ComponentType<any> | null
}) {
  const max = Math.max(...data.map(d => d.count), 1)
  const defaultColor = color || '#4ec9b0'
  const getColor = (label: string) => colorFunction ? colorFunction(label) : defaultColor
  const getTextColor = (label: string) => textColorFunction ? textColorFunction(label) : 'var(--text-dim)'

  return (
    <div style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 60%, rgba(0,0,0,0.15) 100%)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '18px 22px', backdropFilter: 'blur(8px)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 4px 24px rgba(0,0,0,0.3)' }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', marginBottom: 16 }}>
        {title}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {data.map(({ label, count }) => {
          const Icon = iconFunction ? iconFunction(label) : null
          return (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
              <div style={{ width: 150, fontSize: 9, color: getTextColor(label), overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'right', display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'flex-end', flexShrink: 0, fontWeight: 500 }}>
                {Icon && <Icon size={12} strokeWidth={0.75} style={{ flexShrink: 0 }} />}
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: '0.05em', textTransform: 'uppercase', fontSize: 8 }}>{label}</span>
              </div>
              <div style={{ width: 24, fontSize: 9, color: 'var(--text-dim)', textAlign: 'right', flexShrink: 0, fontWeight: 600 }}>
                {count}
              </div>
              <div style={{ flex: 1, height: 10, background: 'var(--card)', borderRadius: 2, overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    background: getColor(label),
                    width: `${(count / max) * 100}%`,
                    transition: 'width 0.3s ease',
                    borderRadius: 2,
                    animation: 'barGlow 5s ease-in-out infinite',
                    boxShadow: `0 0 1px ${getColor(label)}`,
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Skills table ───────────────────────────────────────────────────────────────
export default function Skills() {
  const [data, setData]         = useState<SkillsData | null>(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const [selected, setSelected] = useState<Skill | null>(null)
  const [sourceFilter, setSourceFilter] = useState<string | null>(null)
  const [showSourceMenu, setShowSourceMenu] = useState(false)
  const [toggling, setToggling] = useState<string | null>(null)
  const [skillUsage, setSkillUsage]       = useState<{ label: string; count: number }[]>([])
  const [skillCountMap, setSkillCountMap] = useState<Record<string, number>>({})
  const [hideUnknowns, setHideUnknowns]   = useState(true)
  const [showStats, setShowStats]         = useState(true)

  useEffect(() => {
    fetch('/api/skills')
      .then((r) => r.json())
      .then((d) => { if (d.error) throw new Error(d.error); setData(d) })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetch('/api/statistics')
      .then((r) => r.json())
      .then((d) => {
        const rows: { name: string; count: number }[] = Array.isArray(d?.skill_usage) ? d.skill_usage : []
        setSkillUsage(rows.slice(0, 10).map(r => ({ label: r.name, count: r.count })))
        setSkillCountMap(Object.fromEntries(rows.map(r => [r.name, r.count])))
      })
      .catch(() => {})
  }, [])

  if (loading) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontSize: 11, color: '#909090', letterSpacing: '0.14em' }}>
      LOADING…
    </div>
  )
  if (error) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--red)' }}>
      {error}
    </div>
  )
  if (!data) return null

  const selectedDetail = selected ? data.details[selected.name] ?? null : null

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: 'var(--bg)', ['--border' as string]: '#333333', ['--border-hi' as string]: '#484848' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '36px 160px 60px' }}>

        {/* Page header */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.22em', color: '#909090', textTransform: 'uppercase', display: 'block', marginBottom: 14 }}>
            Scan Results
          </span>
          <h1 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 300, letterSpacing: '-0.03em', margin: '0 0 6px' }}>
            <em style={{ fontFamily: "'Playfair Display', serif", fontStyle: 'italic', color: 'var(--teal)' }}>Skills</em>
            {' '}
            <span style={{ color: '#fff' }}>Overview</span>
          </h1>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#909090', letterSpacing: '0.1em' }}>
            {data.total} skills discovered · click any skill to read its SKILL.md
          </div>
        </div>

        {/* Metric Tiles */}
        {(() => {
          const totalSkills = data.total
          const totalCategories = data.matrix.length
          const sourcesSet = new Set<string>()
          let enabledCount = 0
          for (const cat of data.matrix) {
            for (const skill of cat.skills) {
              sourcesSet.add(skill.source || '—')
              if (skill.enabled) enabledCount++
            }
          }
          const totalSources = sourcesSet.size

          return (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 40 }}>
              {/* Total Skills */}
              <div style={{ background: 'linear-gradient(135deg, rgba(78,201,176,0.08) 0%, rgba(78,201,176,0.02) 100%)', border: '1px solid rgba(78,201,176,0.2)', borderRadius: 8, padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.1em', color: '#909090', textTransform: 'uppercase' }}>Total Skills</div>
                <div style={{ fontSize: '28px', fontWeight: 300, color: '#4ec9b0', letterSpacing: '-0.02em' }}>{totalSkills}</div>
              </div>

              {/* Categories */}
              <div style={{ background: 'linear-gradient(135deg, rgba(156,125,255,0.08) 0%, rgba(156,125,255,0.02) 100%)', border: '1px solid rgba(156,125,255,0.2)', borderRadius: 8, padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.1em', color: '#909090', textTransform: 'uppercase' }}>Categories</div>
                <div style={{ fontSize: '28px', fontWeight: 300, color: '#9c7dff', letterSpacing: '-0.02em' }}>{totalCategories}</div>
              </div>

              {/* Sources */}
              <div style={{ background: 'linear-gradient(135deg, rgba(255,154,158,0.08) 0%, rgba(255,154,158,0.02) 100%)', border: '1px solid rgba(255,154,158,0.2)', borderRadius: 8, padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.1em', color: '#909090', textTransform: 'uppercase' }}>Sources</div>
                <div style={{ fontSize: '28px', fontWeight: 300, color: '#ff9a9e', letterSpacing: '-0.02em' }}>{totalSources}</div>
              </div>

              {/* Enabled Skills */}
              <div style={{ background: 'linear-gradient(135deg, rgba(107,194,157,0.08) 0%, rgba(107,194,157,0.02) 100%)', border: '1px solid rgba(107,194,157,0.2)', borderRadius: 8, padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.1em', color: '#909090', textTransform: 'uppercase' }}>Used</div>
                <div style={{ fontSize: '28px', fontWeight: 300, color: '#6bc29d', letterSpacing: '-0.02em' }}>{Object.values(skillCountMap).filter(n => n > 0).length}</div>
              </div>
            </div>
          )
        })()}

        {/* Controls */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 16 }}>
          <button onClick={() => setShowStats(s => !s)}
            style={{ background: 'none', border: '1px solid var(--border-hi)', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '5px 12px', borderRadius: 5, cursor: 'pointer' }}
          >{showStats ? '− Hide Statistics' : '+ Show Statistics'}</button>
        </div>

        {showStats && <>
          {/* Statistics Charts */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, marginBottom: 40 }}>
            {/* Category Chart */}
            <StatisticsChart
              title="Skills by Category"
              data={data.matrix.map(cat => ({ label: cat.name, count: cat.skills.length }))}
              color="#4ec9b0"
              iconFunction={(label) => {
                const cfg = CATEGORY_CONFIG[label]
                return cfg?.icon ?? null
              }}
            />

            {/* Source Chart */}
            <StatisticsChart
              title="Skills by Source"
              data={(() => {
                const sourceCounts: Record<string, number> = {}
                for (const cat of data.matrix) {
                  for (const skill of cat.skills) {
                    const src = skill.source || '—'
                    sourceCounts[src] = (sourceCounts[src] || 0) + 1
                  }
                }
                return Object.entries(sourceCounts)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 8)
                  .map(([label, count]) => ({ label, count }))
              })()}
              colorFunction={getBarColor}
              textColorFunction={getSourceColor}
            />
          </div>

          {/* Most Invoked Skills */}
          {skillUsage.length > 0 && (() => {
            const UNKNOWN_LABELS = ['unknown', 'Unknown', '', 'undefined', 'null']
            const filtered = hideUnknowns
              ? skillUsage.filter(s => !UNKNOWN_LABELS.includes(s.label?.trim()))
              : skillUsage
            return (
              <div style={{ marginBottom: 40 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                    Most Invoked Skills
                  </span>
                  <button
                    onClick={() => setHideUnknowns(h => !h)}
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 9,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      padding: '3px 9px',
                      borderRadius: 4,
                      border: hideUnknowns ? '1px solid var(--border)' : '1px solid rgba(78,201,176,0.35)',
                      background: hideUnknowns ? 'transparent' : 'rgba(78,201,176,0.08)',
                      color: hideUnknowns ? 'var(--text-muted)' : 'var(--teal)',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    {hideUnknowns ? 'Show unknowns' : 'Hide unknowns'}
                  </button>
                </div>
                <StatisticsChart
                  title=""
                  data={filtered}
                  colorFunction={(label) => {
                    const i = filtered.findIndex(s => s.label === label)
                    const n = filtered.length
                    const t = 1 - i / Math.max(n - 1, 1)
                    return `hsl(168, ${Math.round(55 * t)}%, ${Math.round(18 + 36 * t)}%)`
                  }}
                />
              </div>
            )
          })()}
        </>}

        {/* Table */}
        <div style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 60%, rgba(0,0,0,0.15) 100%)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, overflow: 'hidden', backdropFilter: 'blur(8px)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 4px 24px rgba(0,0,0,0.3)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <colgroup>
              <col style={{ width: 90 }} />
              <col style={{ minWidth: 280 }} />
              <col style={{ width: 150 }} />
              <col style={{ width: 90 }} />
            </colgroup>
            <thead>
              <tr style={{ background: '#0c0c0c', borderBottom: '2px solid var(--border)' }}>
                {['Category', 'Skill', 'Source', 'Use Frequency'].map((h, i) => (
                  <th key={h} style={{ padding: '14px 16px', fontSize: 13, fontWeight: 600, color: '#fff', borderLeft: i === 0 ? 'none' : '1px solid var(--border)', textAlign: 'left', verticalAlign: 'bottom', position: 'relative' }}>
                    {h === 'Skill' && (
                      <div style={{ position: 'absolute', bottom: 8, right: 10, fontFamily: 'var(--font-mono)', fontSize: 7, color: '#fff', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                        Applies to new chats
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {h === 'Use Frequency' ? (
                        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.3 }}>
                          <span>Use</span>
                          <span>Frequency</span>
                        </div>
                      ) : h}
                      {h === 'Source' && (
                        <div style={{ position: 'relative' }}>
                          <button
                            onClick={() => setShowSourceMenu(!showSourceMenu)}
                            style={{
                              background: sourceFilter ? 'rgba(78,201,176,0.15)' : 'transparent',
                              border: sourceFilter ? '1px solid rgba(78,201,176,0.3)' : '1px solid var(--border)',
                              color: sourceFilter ? 'var(--teal)' : 'var(--text-dim)',
                              padding: '3px 6px',
                              borderRadius: 4,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                              fontSize: 10,
                              fontWeight: 500,
                              transition: 'all 0.2s',
                            }}
                            title={sourceFilter ? `Filtered by: ${sourceFilter}` : 'Filter by source'}
                          >
                            <ChevronDown size={12} />
                            {sourceFilter ? sourceFilter.slice(0, 10) : 'Filter'}
                          </button>
                          {showSourceMenu && (
                            <>
                              <div onClick={() => setShowSourceMenu(false)} style={{ position: 'fixed', inset: 0, zIndex: 100 }} />
                              <div style={{
                                position: 'absolute', top: '100%', left: 0, zIndex: 101,
                                background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6,
                                minWidth: 200, maxHeight: 300, overflowY: 'auto',
                                marginTop: 4, boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                              }}>
                                <div style={{ padding: 8 }}>
                                  <button
                                    onClick={() => { setSourceFilter(null); setShowSourceMenu(false) }}
                                    style={{
                                      display: 'block', width: '100%', padding: '6px 10px', fontSize: 11,
                                      background: !sourceFilter ? 'rgba(78,201,176,0.1)' : 'transparent',
                                      border: 'none', color: !sourceFilter ? 'var(--teal)' : 'var(--text-dim)',
                                      cursor: 'pointer', textAlign: 'left', borderRadius: 4, marginBottom: 4,
                                      fontWeight: 500,
                                    }}
                                  >
                                    All Sources
                                  </button>
                                  {(() => {
                                    const sources = new Set<string>()
                                    for (const cat of data.matrix) {
                                      for (const skill of cat.skills) {
                                        if (skill.source) sources.add(skill.source)
                                      }
                                    }
                                    return Array.from(sources).sort().map(src => {
                                      const color = getSourceColor(src)
                                      return (
                                        <button
                                          key={src}
                                          onClick={() => { setSourceFilter(src); setShowSourceMenu(false) }}
                                          style={{
                                            display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '6px 10px', fontSize: 10,
                                            background: sourceFilter === src ? 'rgba(78,201,176,0.1)' : 'transparent',
                                            border: 'none', color: sourceFilter === src ? 'var(--teal)' : 'var(--text-dim)',
                                            cursor: 'pointer', textAlign: 'left', borderRadius: 4, marginBottom: 2,
                                            fontFamily: 'var(--font-mono)', overflow: 'hidden',
                                          }}
                                        >
                                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
                                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {src}
                                          </span>
                                        </button>
                                      )
                                    })
                                  })()}
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.matrix.map((cat) => {
                const filtered = cat.skills
                  .filter(s => !sourceFilter || s.source === sourceFilter)
                return filtered.map((skill, idx) => {
                  const isFirst   = idx === 0
                  const isLast    = idx === filtered.length - 1
                  const isSelected = selected?.name === skill.name

                  return (
                    <tr
                      key={`${cat.name}-${skill.name}`}
                      style={{
                        borderBottom: isLast ? '4px solid var(--border-hi)' : '1px solid var(--border)',
                        background: isSelected ? 'rgba(78,201,176,0.05)' : 'transparent',
                        transition: 'background 0.12s',
                      }}
                      onMouseEnter={(e) => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.012)' }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = isSelected ? 'rgba(78,201,176,0.05)' : 'transparent' }}
                    >
                      {/* Category cell (rowspan) */}
                      {isFirst && (() => {
                        const cfg = CATEGORY_CONFIG[cat.name]
                        const CatIcon = cfg?.icon ?? Package
                        const label = cfg?.label ?? cat.name
                        return (
                          <td
                            rowSpan={filtered.length}
                            style={{
                              background: '#0b0b0b', borderRight: '1px solid var(--border)',
                              padding: '10px 6px', textAlign: 'center', verticalAlign: 'middle',
                            }}
                          >
                            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                              <div style={{ flexShrink: 0, WebkitMaskImage: 'linear-gradient(to bottom left, rgba(255,255,255,1) 20%, rgba(255,255,255,0.45) 100%)', maskImage: 'linear-gradient(to bottom left, rgba(255,255,255,1) 20%, rgba(255,255,255,0.45) 100%)' }}>
                                <CatIcon size={28} style={{ color: '#fff', display: 'block' }} />
                              </div>
                              <span style={{
                                fontFamily: 'var(--font-mono)', fontSize: 16, letterSpacing: '0.13em',
                                textTransform: 'uppercase', color: '#c0c0c0', lineHeight: 1.5,
                                writingMode: 'vertical-rl', transform: 'rotate(180deg)',
                                whiteSpace: 'pre-line',
                              }}>
                                {label}
                              </span>
                            </div>
                          </td>
                        )
                      })()}

                      {/* Skill (clickable) with toggle button */}
                      {(() => {
                        const detail = data.details[skill.name]
                        const SkillIcon = SKILL_ICONS[skill.name] ?? resolveIcon(detail?.icon)
                        return (
                          <td
                            onClick={() => setSelected(skill.name === selected?.name ? null : skill)}
                            style={{ padding: '6px 10px', borderLeft: '1px solid var(--border)', borderBottom: '1px solid var(--border)', verticalAlign: 'middle', cursor: 'pointer', transition: 'background 0.12s', position: 'relative' }}
                            onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.background = 'rgba(78,201,176,0.07)'}
                            onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: skill.enabled === false ? 0.35 : 1, transition: 'opacity 0.2s' }}>
                              <div style={{ flexShrink: 0, WebkitMaskImage: 'linear-gradient(to bottom left, rgba(255,255,255,1) 20%, rgba(255,255,255,0.45) 100%)', maskImage: 'linear-gradient(to bottom left, rgba(255,255,255,1) 20%, rgba(255,255,255,0.45) 100%)' }}>
                                <SkillIcon size={skill.role ? 28 : 16} strokeWidth={0.75} style={{ color: '#fff', display: 'block' }} />
                              </div>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: 12, fontWeight: 500, color: '#fff', overflowWrap: 'break-word', wordBreak: 'break-word', marginBottom: skill.role ? 2 : 0 }}>{skill.name}</div>
                                {skill.role && (
                                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8.5, color: 'var(--teal)', lineHeight: 1.4 }}>
                                    {skill.role}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        )
                      })()}

                      {/* Source */}
                      <td style={{ padding: '5px 10px', borderLeft: '1px solid var(--border)', borderBottom: '1px solid var(--border)', verticalAlign: 'middle' }}>
                        <span style={sourceBadgeStyle(skill.source)}>{getSourceDisplay(skill.source)}</span>
                      </td>

                      {/* Use Frequency */}
                      <td style={{ padding: '5px 10px', borderLeft: '1px solid var(--border)', borderBottom: '1px solid var(--border)', verticalAlign: 'middle' }}>
                        {(() => {
                          const count = skillCountMap[skill.name] ?? 0
                          return (
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: count > 0 ? '#ccc' : '#444', letterSpacing: '0.04em' }}>
                              {count}
                            </span>
                          )
                        })()}
                      </td>
                    </tr>
                  )
                })
              })}
            </tbody>
          </table>
        </div>

        {/* Onboarding completion message */}
        {(
          <div style={{ textAlign: 'center', marginTop: 40, fontFamily: 'var(--font-mono)', fontSize: 10, color: '#909090', letterSpacing: '0.08em' }}>
            Toolkit Scan · {data.total} skills
          </div>
        )}
      </div>

      {/* Detail drawer */}
      <DetailDrawer skill={selected} detail={selectedDetail} onClose={() => setSelected(null)} />

      <style>{`
        @keyframes barGlow {
          0%, 100% { box-shadow: 0 0 1px currentColor; }
          50% { box-shadow: 0 0 3px currentColor; }
        }
        .md-content h1 { font-size:18px; font-weight:600; color:#fff; margin:24px 0 10px; }
        .md-content h2 { font-size:14.5px; font-weight:600; color:#ddd; margin:20px 0 8px; padding-bottom:5px; border-bottom:1px solid var(--border); }
        .md-content h3 { font-size:13px; font-weight:600; color:#ccc; margin:15px 0 6px; }
        .md-content p  { margin:0 0 10px; line-height:1.7; }
        .md-content ul,.md-content ol { margin:0 0 10px 17px; }
        .md-content li { margin-bottom:3px; line-height:1.6; }
        .md-content code { font-family:var(--font-mono); font-size:10.5px; background:#1a1a1a; border:1px solid var(--border); padding:1px 4px; border-radius:3px; color:var(--teal); }
        .md-content pre { background:#111; border:1px solid var(--border); border-radius:7px; padding:12px 14px; margin:0 0 12px; overflow-x:auto; }
        .md-content pre code { background:none; border:none; padding:0; color:#d4d4d4; font-size:10.5px; line-height:1.6; }
        .md-content strong { color:#fff; font-weight:600; }
        .md-content a { color:var(--teal); text-decoration:none; }
        .md-content a:hover { text-decoration:underline; }
        .md-content blockquote { border-left:3px solid var(--teal); padding:6px 13px; background:var(--teal-dim); margin:0 0 10px; border-radius:0 4px 4px 0; color:var(--text-dim); font-size:12px; }
        .md-content hr { border:none; border-top:1px solid var(--border); margin:16px 0; }
        .md-content table { width:100%; border-collapse:collapse; margin:0 0 11px; font-size:11.5px; }
        .md-content th { background:#131313; color:#aaa; font-weight:500; padding:5px 8px; border:1px solid var(--border); text-align:left; }
        .md-content td { padding:5px 8px; border:1px solid var(--border); color:var(--text-dim); }
        .md-content tr:nth-child(even) td { background:#0d0d0d; }
      `}</style>
    </div>
  )
}
