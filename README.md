# Toolkit Scan

See which tools, skills and MCP servers you **actually** use — counted from your own AI-agent transcripts.

- **Overview** — headline numbers, activity by month, your top tools / skills / MCP servers, and what you've installed but never used.
- **Tools** — radial map of everything you use, plus a **heat map**: dark blue = rarely used, dark green = used a lot.
- **Skills** — every skill with usage counts, grouped by where it came from (yours, plugin, bundled).

The scan is deterministic: no LLM calls, no network, no tokens. It reads the JSONL transcripts Claude Code and Codex already keep on your machine. Nothing leaves your computer unless you choose to share the exported page.

## Run it

Needs [Node.js](https://nodejs.org) 18+. No install step.

```bash
node toolkit-scan.mjs
```

It scans (about 20 seconds for several GB of history) and opens the dashboard at <http://localhost:4747>.

| Command | What it does |
|---|---|
| `node toolkit-scan.mjs` | Scan, then open the dashboard on localhost |
| `node toolkit-scan.mjs --share` | Scan, then write **one self-contained HTML file** (`~/.toolkit-scan/toolkit-scan-share.html`) you can send, host, or publish |
| `node toolkit-scan.mjs --cached` | Skip the scan, reuse the last result |
| `node toolkit-scan.mjs --discover` | List the transcript folders it found, then exit |
| `node toolkit-scan.mjs --source <dir>` | Add a transcript folder (repeatable) |

## Where it looks for transcripts

It checks the usual places and reads the file *format* (not the folder name) to pick the right parser:

- Claude Code: `$CLAUDE_CONFIG_DIR/projects`, `~/.claude/projects`, `~/.config/claude/projects`, plus Windows/macOS app-data variants
- Codex: `$CODEX_HOME/sessions`, `~/.codex/sessions`, `~/.codex/archived_sessions`
- WSL: Windows profile folders under `/mnt/c/Users/*`
- Anything else: `--source <dir>`, or list folders in `~/.toolkit-scan/sources.json`:

```json
{ "paths": ["/path/to/other/transcripts"] }
```

Run `--discover` to see what was found. If it finds nothing it tells you where it looked. **Not supported yet:** Cursor and Copilot (different storage format), Claude/ChatGPT chat apps (not coding-agent transcripts).

Your own coding agent can help: ask it *"find where my agent transcripts are stored and add the folder to `~/.toolkit-scan/sources.json`"*.

## Sharing it

`--share` writes a single HTML file with your data embedded. It contains tool, skill and MCP-server **names with usage counts and dates**. It leaves out file paths, transcript folders, unrecognised commands, prompts and any transcript text. Open it to check before sending.

To get a link, ask Claude Code to publish the file as an artifact (private by default; you choose who can open it).

## What is counted

- **Skills** — each invocation through the agent's Skill tool, plus `/slash` commands you type that match an installed skill. Codex has no Skill tool, so Codex skill use is inferred from reads of `SKILL.md` files.
- **Tools** — the command at the start of each shell command (`git`, `docker`, `npm`…) matched against a built-in catalogue of ~50 CLIs.
- **MCP servers** — tool calls named `mcp__<server>__<tool>`.
- **History window** — only transcripts still on disk. Claude Code deletes transcripts older than 30 days by default (`cleanupPeriodDays` in its settings), so older usage may be missing.

## Develop

```bash
npm install
npm run build        # rebuilds ui/ (localhost app) and ui-single/ (share template)
npm run dev:ui       # hot-reload UI against a running `node server.mjs`
```

The UI source is in `app/`. The built output (`ui/`, `ui-single/`) is committed so users don't need a build step.
