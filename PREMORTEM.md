# toolkit-scan prototype — pre-mortem on real transcripts (2026-10-08)

Run: `node scan.mjs` over 2,997 transcript files (2,070 Claude Code + 927 Codex, 6.2 GB).

## What held up
- **Speed/memory:** 22 s, 273 MB peak, zero LLM calls, zero network. Substring pre-filter + JSON.parse only on candidate lines.
- **Accuracy:** agent-invoked `Skill` counts match an independent Python count exactly (e.g. new-vscode-session-tab 208/208, wrap-up 118/118, code-efficient 86/86). Zero parse errors.
- **Dedupe:** keyed on `tool_use` id; only 4 duplicates found, so resumed sessions do not materially double-count.
- **Cross-reference works:** 28 of 105 installed skills never used; 27 skills used but not in `~/.claude/skills`.

## What would have hurt (fix before building more)
1. **Shell-noise in the unknown-tool tail.** Inline scripts/loops leak keywords (`next`, `break`, `until`, `continue`, `wait`). Quote-stripping fixed most; add shell keywords to IGNORE and treat the unknown tail as candidates for the catalog, not as data.
2. **Catalog is the real work.** Only ~50 CLIs are mapped; real tools sit in the tail (`tsx`, `scp`, `launchctl`, `powershell.exe`, `nlm`, `gitleaks`). Needs a larger seed catalog plus an optional batched LLM classify of unknown names.
3. **Privacy leak in the "unknown" list.** It contained private file names (`bind-session.sh`, memory-file names). A shareable fingerprint must drop the unknown tail, hash or drop custom skill/MCP names (`--redact`), and never include paths.
4. **"Used but not installed" is mostly false positives:** built-in/bundled/plugin/project skills (`claude-api`, `update-config`, `run`, `code-review`, `dataviz`...) and Codex-only skills. Need to scan plugin dirs, project `.claude/skills`, and label bundled skills.
5. **MCP granularity.** `opentabs` = 4,260 calls is one server fronting many plugins. Need a per-tool/plugin breakdown under each server (the tool name after `mcp__server__`).
6. **History window.** Data spans only 2026-06 .. 2026-10 (retention cleanup deleted older transcripts). A fingerprint reflects retained history only; show the covered range in the UI.
7. **Codex dominance.** Codex contributes ~40% of tool calls (e.g. Git 4,267) and its skill use is only detectable as `SKILL.md` reads (heuristic, 1,002 hits). Label it as inferred.
8. **Sessions metric** uses the line `sessionId`; confirm subagent transcripts roll up to their parent session (not verified).

## Not yet tested
Windows/WSL paths, Cursor/Copilot sources, incremental scanning, the UI/localhost server and the Agentic OS module.
