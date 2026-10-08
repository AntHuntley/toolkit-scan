#!/usr/bin/env python3
"""Generates SYNTHETIC demo data (generic names, invented numbers, no real user data). Deterministic (seeded).
  demo/fingerprint.demo.json  - the sample user shown in README screenshots and `--demo`
  demo/friend.demo.json       - a sample friend ("Sam") with a different toolbox, for the Compare tab
"""
import json, os, random

MONTHS = ['2026-07', '2026-08', '2026-09', '2026-10']
WEIGHTS = [0.12, 0.22, 0.36, 0.30]
LAST = {'2026-07': '07-28', '2026-08': '08-30', '2026-09': '09-29', '2026-10': '10-07'}
HERE = os.path.dirname(os.path.abspath(__file__))


def row(name, uses, claude_share, source=None, installed=True, **extra):
    r = {'name': name, 'uses': uses, 'sessions': 0}
    if uses:
        r['sessions'] = max(1, int(uses / random.uniform(6, 14)))
        r['byMonth'] = {m: int(uses * w * random.uniform(0.85, 1.15)) for m, w in zip(MONTHS, WEIGHTS)}
        c = int(uses * claude_share)
        r['agents'] = {'claude': c, 'codex': uses - c}
        r['first'] = f"2026-07-{random.randint(1, 20):02d}"
        r['last'] = '2026-' + LAST[random.choice(MONTHS[-2:])]
    if source:
        r['source'] = source
    r['installed'] = installed
    r.update(extra)
    return r


def gen(seed, claude_share, tools, mcp, subagents, builtin, skills, meta):
    random.seed(seed)
    tool_rows = [row(n, u, claude_share, category=c) for n, c, u in tools]
    skill_rows = []
    for n, u, src in skills:
        r = row(n, u, claude_share, source=src, installed=(src == 'user'))
        if u:
            r['agents'] = {'claude:agent': int(u * 0.8), 'claude:user': u - int(u * 0.8)}
        skill_rows.append(r)
    by_uses = lambda rows: sorted(rows, key=lambda r: -r['uses'])
    return {
        'generatedAt': '2026-10-08T12:00:00.000Z', 'demo': True, 'scan': meta['scan'],
        'installedCounts': {'skills': sum(1 for s in skills if s[2] == 'user'), 'mcp': len(mcp), 'tools': len(tools), 'vscodeExtensions': 22},
        'tools': by_uses(tool_rows), 'skills': by_uses(skill_rows),
        'mcp': by_uses([row(n, u, claude_share) for n, u in mcp]), 'mcpTools': [],
        'subagents': by_uses([row(n, u, claude_share) for n, u in subagents]),
        'builtin': by_uses([row(n, u, claude_share) for n, u in builtin]),
    }


YOU = gen(
    7, 0.62,
    tools=[
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
    ],
    mcp=[('github', 2100), ('playwright', 1500), ('notion', 640), ('context7', 520), ('linear', 380), ('slack', 120), ('postgres', 0)],
    subagents=[('Explore', 310), ('general-purpose', 190), ('Plan', 64), ('code-reviewer', 41)],
    builtin=[('Bash', 9800), ('Read', 8400), ('Edit', 6100), ('Grep', 4200), ('Write', 2300), ('Glob', 1900), ('TodoWrite', 1700),
             ('Agent', 520), ('WebSearch', 380), ('WebFetch', 260), ('NotebookEdit', 35)],
    skills=(
        [(n, u, 'user') for n, u in [('brainstorming', 148), ('test-driven-development', 132), ('code-review', 96), ('systematic-debugging', 88),
                                     ('writing-plans', 77), ('frontend-design', 61), ('pdf', 44), ('docx', 39), ('xlsx', 22), ('mcp-builder', 18),
                                     ('skill-creator', 12), ('data-viz', 9), ('pptx', 7), ('changelog', 0), ('release-notes', 0), ('db-migrations', 0),
                                     ('i18n-audit', 0), ('a11y-check', 0)]]
        + [(n, u, 'plugin') for n, u in [('commit-commands', 55), ('pr-review-toolkit', 31), ('feature-dev', 4)]]
        + [(n, u, 'bundled') for n, u in [('init', 40), ('simplify', 35), ('security-review', 28), ('loop', 14), ('claude-api', 8)]]
    ),
    meta={'scan': {'files': 1480, 'mb': 3120, 'seconds': 14.2, 'sessions': 612, 'lines': 402113, 'parsed': 118902}},
)

SAM = gen(
    21, 0.28,   # mostly Codex
    tools=[
        ('Git', 'Version Control', 7400), ('GitHub CLI', 'Version Control', 1900),
        ('Python', 'Languages & Runtimes', 9800), ('Node.js', 'Languages & Runtimes', 900), ('Go', 'Languages & Runtimes', 3300),
        ('Cargo/Rust', 'Languages & Runtimes', 1700), ('TypeScript', 'Languages & Runtimes', 350),
        ('uv', 'Package & Env', 2600), ('pip', 'Package & Env', 150), ('Homebrew', 'Package & Env', 640), ('npm', 'Package & Env', 400),
        ('Docker', 'Infrastructure', 5200), ('kubectl', 'Infrastructure', 3900), ('Terraform', 'Infrastructure', 2700),
        ('AWS CLI', 'Infrastructure', 2200), ('SSH', 'Infrastructure', 1500), ('gcloud', 'Infrastructure', 480), ('Helm', 'Infrastructure', 1200),
        ('curl', 'Network', 1800), ('ripgrep', 'Search', 3100), ('fd', 'Search', 940), ('jq', 'Data', 2400), ('SQLite', 'Data', 160),
        ('psql', 'Data', 1350), ('pytest', 'Testing', 2100), ('k6', 'Testing', 260),
        ('Ruff', 'Quality', 1500), ('ShellCheck', 'Quality', 410), ('make', 'Build', 1700), ('just', 'Build', 620),
        ('tmux', 'Terminal', 1900), ('fzf', 'Terminal', 380), ('Claude Code', 'AI Agents', 90), ('Codex CLI', 'AI Agents', 1250),
    ],
    mcp=[('github', 1100), ('postgres', 1250), ('sentry', 640), ('datadog', 410), ('figma', 0)],
    subagents=[('general-purpose', 150), ('Explore', 120), ('security-auditor', 85)],
    builtin=[('Bash', 11200), ('Read', 5200), ('Edit', 4100), ('Grep', 2900), ('Write', 1100), ('Glob', 800), ('TodoWrite', 400),
             ('Agent', 355), ('WebSearch', 210)],
    skills=(
        [(n, u, 'user') for n, u in [('incident-triage', 118), ('terraform-plan-review', 96), ('test-driven-development', 84), ('sql-review', 71),
                                     ('runbook-writer', 58), ('code-review', 47), ('pdf', 21), ('k8s-debug', 66), ('cost-audit', 33), ('release-notes', 29),
                                     ('threat-model', 14), ('postmortem', 11)]]
        + [(n, u, 'plugin') for n, u in [('commit-commands', 92), ('pr-review-toolkit', 40)]]
        + [(n, u, 'bundled') for n, u in [('security-review', 63), ('init', 22), ('simplify', 18), ('loop', 9)]]
    ),
    meta={'scan': {'files': 940, 'mb': 2210, 'seconds': 11.6, 'sessions': 388, 'lines': 251004, 'parsed': 80211}},
)


def write(name, fp):
    out = os.path.join(HERE, name)
    json.dump(fp, open(out, 'w'), indent=1)
    print('wrote', name, len(fp['tools']), 'tools', len(fp['skills']), 'skills', len(fp['mcp']), 'mcp')


write('fingerprint.demo.json', YOU)
# friend file: the same envelope `toolkit-scan.mjs --export` writes
json.dump({'toolkitScan': 1, 'name': 'Sam', 'exportedAt': '2026-10-08T12:00:00.000Z', 'fingerprint': SAM},
          open(os.path.join(HERE, 'friend.demo.json'), 'w'), indent=1)
print('wrote friend.demo.json')
