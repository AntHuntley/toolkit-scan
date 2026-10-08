// Captures the README screenshots from the DEMO dataset (no personal data). Maintainers only.
//   node toolkit-scan.mjs --demo --no-open &          (serves on :4747, or PORT=4800 to choose)
//   PW=<path to playwright> CHROME=<chrome binary> node docs/make-screenshots.mjs http://localhost:4800
import { createRequire } from 'node:module'
import fs from 'node:fs'
const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PW || 'playwright')
const base = process.argv[2] || 'http://localhost:4747'
const out = 'docs/raw'
fs.mkdirSync(out, { recursive: true })

const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {})
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 })
const scrollTo = y => page.evaluate(top => { const el = [...document.querySelectorAll('div')].find(d => getComputedStyle(d).overflowY === 'auto' && d.scrollHeight > d.clientHeight); el.scrollTo(0, top) }, y)
const shot = async name => { await page.waitForTimeout(2600); await page.screenshot({ path: `${out}/${name}.png` }); console.log('shot', name) }

// Overview: hero sunbursts with one segment hovered so the detail panel is populated
await page.goto(`${base}/#/`, { waitUntil: 'networkidle' })
await page.waitForTimeout(1200)
// the sunburst is the largest svg on the page (the header icons are small)
const boxes = await Promise.all((await page.$$('svg')).map(e => e.boundingBox()))
const box = boxes.filter(Boolean).sort((a, b) => b.width * b.height - a.width * a.height)[0]
await shot('overview-clean')
await page.mouse.move(box.x + box.width / 2 + 90, box.y + box.height / 2 + 12)
await shot('overview-top')

// Overview: stats + activity + bars (scroll so each block animates in)
await scrollTo(900); await shot('overview-activity')
await scrollTo(1900); await shot('overview-bottom')

// "Consider for pruning" panel on its own (element screenshot, height fitted to its content)
const prune = page.locator('section', { hasText: 'Consider for pruning' })
await prune.scrollIntoViewIfNeeded()
await prune.evaluate(el => { el.style.height = 'auto' })
await page.waitForTimeout(2400)
await prune.screenshot({ path: `${out}/pruning.png` }); console.log('shot pruning')

// Tools: sunburst, then the heat-mapped tiles
await page.goto(`${base}/#/toolkit`, { waitUntil: 'networkidle' })
await shot('tools-top')
await page.getByText('Rarely used').scrollIntoViewIfNeeded()
const legendY = (await page.getByText('Rarely used').boundingBox()).y
await page.evaluate(dy => { const el = [...document.querySelectorAll('div')].find(d => getComputedStyle(d).overflowY === 'auto' && d.scrollHeight > d.clientHeight); el.scrollBy(0, dy) }, legendY - 110)
await shot('tools-heat')

// Skills
await page.goto(`${base}/#/skills`, { waitUntil: 'networkidle' })
await shot('skills-top')
await scrollTo(700); await shot('skills-table')
// Compare with a Friend: the how-to page, then a comparison against the sample friend
await page.setViewportSize({ width: 1440, height: 1500 })
await page.goto(`${base}/#/compare`, { waitUntil: 'networkidle' })
await shot('compare-start')
await page.setViewportSize({ width: 1440, height: 1000 })
await page.getByText('Try it with a sample friend').click()
await page.locator('button', { hasText: 'Compare' }).last().click()
await shot('compare-top')
await scrollTo(760); await shot('compare-try')
await scrollTo(1700); await shot('compare-common')
await browser.close()
