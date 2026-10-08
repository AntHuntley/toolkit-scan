import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
import Overview from './Overview'
import Toolkit from './Toolkit'
import Skills from './Skills'

const TABS = [
  { to: '/', label: 'Overview', end: true },
  { to: '/toolkit', label: 'Tools' },
  { to: '/skills', label: 'Skills' },
]

export default function App() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 28, padding: '0 28px', height: 54, borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#fff', letterSpacing: '-0.01em' }}>
          Toolkit <em style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontWeight: 400, color: 'var(--teal)' }}>Scan</em>
        </div>
        <nav style={{ display: 'flex', gap: 6 }}>
          {TABS.map(t => (
            <NavLink key={t.to} to={t.to} end={t.end}
              style={({ isActive }) => ({
                fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '0.16em', textTransform: 'uppercase',
                padding: '7px 14px', borderRadius: 6,
                color: isActive ? 'var(--teal)' : 'var(--text-dim)',
                background: isActive ? 'rgba(78,201,176,0.10)' : 'transparent',
              })}>
              {t.label}
            </NavLink>
          ))}
        </nav>
        <div style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.1em', color: 'var(--text-muted)' }}>
          LOCAL ONLY · NOTHING LEAVES THIS MACHINE
        </div>
      </header>
      <main style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <Routes>
          <Route path="/" element={<Overview />} />
          <Route path="/toolkit" element={<Toolkit />} />
          <Route path="/skills" element={<Skills />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}
