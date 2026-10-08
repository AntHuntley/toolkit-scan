import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import './index.css'

// Shared/static build: data is embedded in the page (window.__TS_DATA__), so answer /api calls from it instead of a server.
const D = (window as unknown as { __TS_DATA__?: Record<string, unknown> }).__TS_DATA__
if (D) {
  const routes: Record<string, unknown> = {
    '/api/toolkit': D.toolkit, '/api/toolkit/usage': D.usage, '/api/skills': D.skills,
    '/api/statistics': D.statistics, '/api/fingerprint': D.fingerprint,
  }
  const realFetch = window.fetch.bind(window)
  window.fetch = (input, init) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.pathname : input.url
    const hit = routes[url]
    return hit ? Promise.resolve(new Response(JSON.stringify(hit), { headers: { 'content-type': 'application/json' } })) : realFetch(input, init)
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>
)
