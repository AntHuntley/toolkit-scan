#!/usr/bin/env node
// One command: scan your agent transcripts, then open the dashboard on localhost.
//   node toolkit-scan.mjs            scan + open http://localhost:4747
//   node toolkit-scan.mjs --share    scan + write one shareable HTML file (no server)
//   node toolkit-scan.mjs --cached   skip the scan, reuse the last result
//   node toolkit-scan.mjs --discover list the transcript folders that were found
// Extra flags (--source <dir>, --no-open, ...) are passed through to the scan and the server.
import { spawnSync, spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const args = process.argv.slice(2)
const has = f => args.includes(f)
const node = process.execPath

if (has('--help') || has('-h')) {
  console.log(fsHelp())
  process.exit(0)
}
function fsHelp() {
  return `toolkit-scan — see which tools, skills and MCP servers you actually use.\n\n  node toolkit-scan.mjs            scan, then open the dashboard\n  --share                          write a single shareable HTML file instead\n  --export --name "Sam"            write a small file to send to a friend for the Compare tab\n  --cached                         reuse the previous scan\n  --discover                       list transcript folders found, then exit\n  --demo                           open the dashboard with sample data (no transcripts needed)\n  --source <dir>                   add a transcript folder (repeatable)\n  --no-open                        don't launch the browser\n\nTranscript folders are also read from ~/.toolkit-scan/sources.json ({"paths":[...]}), CLAUDE_CONFIG_DIR and CODEX_HOME.`
}

// --demo: show the dashboard with synthetic sample data (no transcripts needed). Add --share to export it as a file.
if (has('--demo')) {
  const demo = path.join(here, 'demo/fingerprint.demo.json')
  if (has('--share')) process.exit(spawnSync(node, [path.join(here, 'share.mjs'), '--data', demo, '--out', path.join(here, 'demo/toolkit-scan-demo.html')], { stdio: 'inherit' }).status ?? 1)
  spawn(node, [path.join(here, 'server.mjs'), '--data', demo, ...args.filter(a => a === '--no-open')], { stdio: 'inherit' })
} else {
if (has('--discover')) process.exit(spawnSync(node, [path.join(here, 'scan.mjs'), ...args], { stdio: 'inherit' }).status ?? 1)

if (!has('--cached')) {
  const scanArgs = args.filter(a => a !== '--share' && a !== '--cached' && a !== '--no-open')
  const r = spawnSync(node, [path.join(here, 'scan.mjs'), ...scanArgs], { stdio: 'inherit' })
  if (r.status !== 0) process.exit(r.status ?? 1)
}

if (has('--share')) process.exit(spawnSync(node, [path.join(here, 'share.mjs')], { stdio: 'inherit' }).status ?? 1)

// --export [--name "Sam"]: write the small compare file to send to a friend (see the "Compare with a Friend" tab)
if (has('--export')) {
  const i = args.indexOf('--name')
  const nameArgs = i >= 0 && args[i + 1] ? ['--name', args[i + 1]] : []
  process.exit(spawnSync(node, [path.join(here, 'share.mjs'), '--json', ...nameArgs], { stdio: 'inherit' }).status ?? 1)
}

spawn(node, [path.join(here, 'server.mjs'), ...args.filter(a => a === '--no-open')], { stdio: 'inherit' })
}
