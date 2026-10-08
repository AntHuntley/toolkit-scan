// Headless render check: loads each page, records console errors / failed requests, saves screenshots to out/.
// Usage: CHROME=<chrome binary> PW=<playwright path> TAG=<name> node check-ui.mjs <baseUrl>
//   e.g. http://localhost:4747/   or   file:///Users/me/.toolkit-scan/toolkit-scan-share.html
import { createRequire } from 'node:module'
import fs from 'node:fs'
const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PW || 'playwright')
const base = process.argv[2] || 'http://localhost:4747/'
const tag = process.env.TAG || 'ui'
const pages = [['overview', ''], ['tools', '#/toolkit'], ['skills', '#/skills']]
fs.mkdirSync('out', { recursive: true })
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {})
for (const [name, hash] of pages) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
  const errs = [], bad = []
  page.on('console', m => m.type() === 'error' && errs.push(m.text().slice(0, 140)))
  page.on('pageerror', e => errs.push('pageerror: ' + e.message.slice(0, 140)))
  page.on('requestfailed', r => bad.push(r.url().slice(0, 100)))
  await page.goto(base + hash, { waitUntil: 'networkidle' }).catch(e => errs.push('goto: ' + e.message))
  await page.waitForTimeout(1500)
  const text = (await page.innerText('body')).replace(/\s+/g, ' ')
  await page.screenshot({ path: `out/${tag}-${name}.png` })
  console.log(name.padEnd(9), '| chars', text.length, '| errors', errs.length, '| failed', bad.length, '|', text.slice(0, 110))
  errs.slice(0, 3).forEach(e => console.log('   err:', e))
  bad.slice(0, 3).forEach(e => console.log('   failed:', e))
  await page.close()
}
await browser.close()
