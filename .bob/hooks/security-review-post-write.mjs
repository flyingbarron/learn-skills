/**
 * security-review-post-write.mjs
 *
 * PostToolUse hook — fires after write_file, apply_diff, search_and_replace,
 * or insert_content touches a file. Runs skill-security-verifier.mjs on the
 * written file and surfaces any findings as model context.
 *
 * Output (stdout, exit 0): appended to the tool result as model context.
 *   • Nothing  → file is clean, no noise added.
 *   • Findings → structured warning added beside the tool result.
 *
 * The hook never blocks (PostToolUse exit-2 is logged but ignored by Bob).
 */

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

let raw = '';
for await (const chunk of process.stdin) raw += chunk;

let input = {};
try { input = JSON.parse(raw); } catch { /* ignore malformed */ }

// Only scan files touched by write/edit tools
const path = String(input.tool_input?.path ?? '');
if (!path) process.exit(0);

// Resolve from cwd supplied by Bob (or fall back to process.cwd())
const cwd = String(input.cwd ?? process.cwd());
const absPath = resolve(cwd, path);

if (!existsSync(absPath)) process.exit(0);

// Only scan recognised text artifacts (skip binaries, images, etc.)
if (!/\.(md|mjs|js|ts|py|json|yaml|yml|sh|bash|zsh|ps1|txt|env|cfg|conf|toml)$/i.test(path)) {
  process.exit(0);
}

const verifierPath = resolve(cwd, '.bob/skills/code-awareness/skill-security-verifier.mjs');
if (!existsSync(verifierPath)) process.exit(0);

const result = spawnSync(
  'node',
  [verifierPath, absPath],
  { encoding: 'utf8', timeout: 15_000 }
);

if (result.status !== 0 && result.stdout) {
  try {
    const scan = JSON.parse(result.stdout);
    if (!scan.passed && scan.findings?.length > 0) {
      // Format as compact model context
      const lines = [
        `[security-scan] ⚠️  ${scan.findings.length} finding(s) in ${path}:`
      ];
      for (const f of scan.findings.slice(0, 5)) {
        lines.push(`  • [${f.category}] ${f.match}`);
      }
      if (scan.findings.length > 5) {
        lines.push(`  … and ${scan.findings.length - 5} more. Run the full scan manually.`);
      }
      process.stdout.write(lines.join('\n') + '\n');
    }
    // passed=true → exit silently (no noise)
  } catch {
    // Unparseable output — exit silently
  }
}

process.exit(0);
