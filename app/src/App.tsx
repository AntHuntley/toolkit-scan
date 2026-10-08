import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
import { Compare as CompareIcon, Cube, Events, Tools } from '@carbon/icons-react'
import Overview from './Overview'
import Toolkit from './Toolkit'
import Skills from './Skills'
import CompareStart from './Compare'
import Versus from './Versus'
import { useFriends } from './friends'

export default function App() {
  const friends = useFriends()
  const tabs = [
    { to: '/', label: 'Overview', end: true, Icon: null },
    { to: '/toolkit', label: 'Tools', Icon: Tools },
    { to: '/skills', label: 'Skills', Icon: Cube },
    { to: '/compare', label: 'Compare with a Friend', end: true, Icon: Events },
    ...friends.map(f => ({ to: `/compare/${f.id}`, label: `You × ${f.name}`, Icon: CompareIcon })),
  ]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 28, padding: '0 28px', height: 54, borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#fff', letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>
          Toolkit <em style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontWeight: 400, color: 'var(--teal)' }}>Scan</em>
        </div>
        <nav style={{ display: 'flex', gap: 6, overflowX: 'auto', minWidth: 0 }}>
          {tabs.map(t => (
            <NavLink key={t.to} to={t.to} end={t.end}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 7, whiteSpace: 'nowrap',
                fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '0.16em', textTransform: 'uppercase',
                padding: '7px 14px', borderRadius: 6,
                color: isActive ? 'var(--teal)' : 'var(--text-dim)',
                background: isActive ? 'rgba(78,201,176,0.10)' : 'transparent',
              })}>
              {t.Icon && <t.Icon size={15} />}
              {t.label}
            </NavLink>
          ))}
        </nav>
        <div style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.1em', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
          LOCAL ONLY · NOTHING LEAVES THIS MACHINE
        </div>
      </header>
      <main style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <Routes>
          <Route path="/" element={<Overview />} />
          <Route path="/toolkit" element={<Toolkit />} />
          <Route path="/skills" element={<Skills />} />
          <Route path="/compare" element={<CompareStart />} />
          <Route path="/compare/:id" element={<Versus />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}
