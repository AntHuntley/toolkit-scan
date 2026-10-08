#!/usr/bin/env python3
"""Generates demo/fingerprint.demo.json: a SYNTHETIC fingerprint (generic tool names, invented numbers) used for
README screenshots and `node toolkit-scan.mjs --demo`. Contains no real user data. Deterministic (seeded)."""
import json, random, os

random.seed(7)
MONTHS = ['2026-07', '2026-08', '2026-09', '2026-10']
WEIGHTS = [0.12, 0.22, 0.36, 0.30]
LAST = {'2026-07': '07-28', '2026-08': '08-30', '2026-09': '09-29', '2026-10': '10-07'}

def row(name, uses, claude_share=0.62, source=None, installed=True, **extra):
    r = {'name': name, 'uses': uses, 'sessions': 0}
    if uses:
        r['sessions'] = max(1, int(uses / random.uniform(6, 14)))
        by = {m: int(uses * w * random.uniform(0.85, 1.15)) for m, w in zip(MONTHS, WEIGHTS)}
        r['byMonth'] = by
        c = int(uses * claude_share)
        r['agents'] = {'claude': c, 'codex': uses - c}
        r['first'] = f"2026-07-{random.randint(1, 20):02d}"
        r['last'] = '2026-' + LAST[random.choice(MONTHS[-2:])]
    if source:
        r['source'] = source
    r['installed'] = installed
    r.update(extra)
    return r

tools = [
    ('Git', 'Version Control', 11200), ('GitHub CLI', 'Version Control', 4300),
    ('Python', 'Languages & Runtimes', 7600), ('Node.js', 'Languages & Runtimes', 3100),
    ('TypeScript', 'Languages & Runtimes', 1900), ('Go', 'Languages & Runtimes', 420), ('Cargo/Rust', 'Languages & Runtimes', 0),
    ('npm', 'Package & Env', 3600), ('pnpm', 'Package & Env', 840), ('uv', 'Package & Env', 520),
    ('pip', 'Package & Env', 410), ('Homebrew', 'Package & Env', 190),
    ('Docker', 'Infrastructure', 1450), ('kubectl', 'Infrastructure', 310), ('Terraform', 'Infrastructure', 0),
    ('AWS CLI', 'Infrastructure', 260), ('SSH', 'Infrastructure', 920), ('gcloud', 'Infrastructure', 0),
    ('curl', 'Network', 2800), ('ripgrep', 'Search', 2100), ('jq', 'Data', 1100), ('SQLite', 'Data', 480),
    ('Playwright', 'Testing', 640), ('Vitest', 'Testing', 760), ('Jest', 'Testing', 210), ('pytest', 'Testing', 560),
    ('ESLint', 'Quality', 390), ('Prettier', 'Quality', 270), ('Ruff', 'Quality', 330),
    ('make', 'Build', 450), ('tmux', 'Terminal', 380), ('ffmpeg', 'Creative', 90), ('pandoc', 'Documents', 0),
    ('Claude Code', 'AI Agents', 120), ('Codex CLI', 'AI Agents', 210),
]
tool_rows = [row(n, u, category=c) for n, c, u in tools]

mcp = [('github', 2100), ('playwright', 1500), ('notion', 640), ('context7', 520), ('linear', 380), ('slack', 120), ('postgres', 0)]
subagents = [('Explore', 310), ('general-purpose', 190), ('Plan', 64), ('code-reviewer', 41)]
builtin = [('Bash', 9800), ('Read', 8400), ('Edit', 6100), ('Grep', 4200), ('Write', 2300), ('Glob', 1900), ('TodoWrite', 1700),
           ('Agent', 520), ('WebSearch', 380), ('WebFetch', 260), ('NotebookEdit', 35)]

skills = (
    [(n, u, 'user') for n, u in [('brainstorming', 148), ('test-driven-development', 132), ('code-review', 96), ('systematic-debugging', 88),
                                  ('writing-plans', 77), ('frontend-design', 61), ('pdf', 44), ('docx', 39), ('xlsx', 22), ('mcp-builder', 18),
                                  ('skill-creator', 12), ('data-viz', 9), ('pptx', 7), ('changelog', 0), ('release-notes', 0), ('db-migrations', 0),
                                  ('i18n-audit', 0), ('a11y-check', 0)]]
    + [(n, u, 'plugin') for n, u in [('commit-commands', 55), ('pr-review-toolkit', 31), ('feature-dev', 4)]]
    + [(n, u, 'bundled') for n, u in [('init', 40), ('simplify', 35), ('security-review', 28), ('loop', 14), ('claude-api', 8)]]
)
skill_rows = []
for n, u, src in skills:
    r = row(n, u, source=src, installed=(src == 'user'))
    if u:
        r['agents'] = {'claude:agent': int(u * 0.8), 'claude:user': u - int(u * 0.8)}
    skill_rows.append(r)

fp = {
    'generatedAt': '2026-10-08T12:00:00.000Z',
    'demo': True,
    'scan': {'files': 1480, 'mb': 3120, 'seconds': 14.2, 'sessions': 612, 'lines': 402113, 'parsed': 118902},
    'installedCounts': {'skills': 18, 'mcp': 7, 'tools': sum(1 for t in tools), 'vscodeExtensions': 22},
    'tools': sorted(tool_rows, key=lambda r: -r['uses']),
    'skills': sorted(skill_rows, key=lambda r: -r['uses']),
    'mcp': sorted([row(n, u) for n, u in mcp], key=lambda r: -r['uses']),
    'mcpTools': [],
    'subagents': sorted([row(n, u) for n, u in subagents], key=lambda r: -r['uses']),
    'builtin': sorted([row(n, u) for n, u in builtin], key=lambda r: -r['uses']),
}
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'fingerprint.demo.json')
json.dump(fp, open(out, 'w'), indent=1)
print('wrote', out, len(fp['tools']), 'tools', len(fp['skills']), 'skills')
