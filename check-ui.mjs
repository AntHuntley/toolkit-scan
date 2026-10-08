// Headless render check: loads each page, records console errors / failed requests, saves screenshots.
// Usage: node check-ui.mjs [baseUrl]   (needs a playwright install; set PW to its path)
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PW || 'playwright')
const base = process.argv[2] || 'http://localhost:4747'
const pages = ['/workflows/toolkit', '/workflows/skills', '/workflows/overview']
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {})
for (const p of pages) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
  const errs = [], bad = []
  page.on('console', m => m.type() === 'error' && errs.push(m.text().slice(0, 140)))
  page.on('requestfailed', r => bad.push(r.url().slice(0, 100)))
  await page.goto(base + p, { waitUntil: 'networkidle' }).catch(e => errs.push('goto: ' + e.message))
  await page.waitForTimeout(1500)
  const text = (await page.innerText('body')).replace(/\s+/g, ' ')
  const shot = `out/ui${p.replaceAll('/', '-')}.png`
  await page.screenshot({ path: shot })
  console.log(p, '| chars', text.length, '| has "14,97"', /14,9\d\d uses/.test(text), '| has "wrap-up"', text.includes('wrap-up'), '| errors', errs.length, '| failed', bad.length)
  errs.slice(0, 3).forEach(e => console.log('   err:', e))
  bad.slice(0, 3).forEach(e => console.log('   failed:', e))
  console.log('   text:', text.slice(0, 200))
  await page.close()
}
await browser.close()
