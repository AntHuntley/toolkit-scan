#!/usr/bin/env node
// Writes one self-contained HTML file (data embedded, no server, no network except fonts/icons) that can be
// emailed, hosted, or published as a claude.ai artifact. Usage: node share.mjs [--data FILE] [--out FILE]
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from './api.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d }
const data = arg('--data', path.join(os.homedir(), '.toolkit-scan/fingerprint.json'))
const out = arg('--out', path.join(os.homedir(), '.toolkit-scan/toolkit-scan-share.html'))

const fp = JSON.parse(fs.readFileSync(data, 'utf8'))
// Strip anything that identifies the machine or hints at private content: transcript folders (contain the user name),
// the unknown-command tail and non-skill slash commands (can contain private script names).
delete fp.sources; delete fp.unknownCli; delete fp.slashOther
fp.redacted = true
const payload = { ...build(fp), fingerprint: fp }

const template = path.join(here, 'ui-single/index.html')
if (!fs.existsSync(template)) { console.error('ui-single/index.html missing — run `npm run build:single` (maintainers only).'); process.exit(1) }
const json = JSON.stringify(payload).replace(/</g, '\\u003c')
const html = fs.readFileSync(template, 'utf8').replace('<head>', `<head><script>window.__TS_DATA__=${json}</script>`)
fs.mkdirSync(path.dirname(out), { recursive: true })
fs.writeFileSync(out, html)
console.log(`wrote ${out} (${(html.length / 1024).toFixed(0)} KB)`)
console.log('Includes: tool/skill/MCP names with usage counts and dates. Excludes: file paths, unknown commands, prompts, transcript text.')
