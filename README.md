# learn-skills — Bob Skill Lifecycle System

> A workspace for building and learning the automated Skill lifecycle system for IBM Bob.
> The system identifies user requests, searches for a matching Skill (official / community / local),
> and if none exists — generates and installs a new Skill with security and integrity guarantees.

---

## How It Works

When a user sends a request to Bob, the following pipeline runs automatically:

```
User sends Prompt
       |
[UserPromptSubmit Hook] code-awareness-pre-prompt.mjs
       | injects PRE-TASK AWARENESS GATE + first 300 chars of request
       |
Bob runs Skill: code-awareness
       |
  1. Classifies the task type
  2. Checks locally installed Skills
  3. Searches the web (web-browse) — at least 3 search angles
  4. If official Skill found  -> download, scan, install
  5. If not found             -> generate minimal Skill + security scan
  6. Runs the found/generated Skill
       |
[PostToolUse Hook] security-review-post-write.mjs
       | scans every written file — reports findings if any
```

---

## Project Structure

```
learn-skills/
├── .bob/
│   ├── settings.json                          <- Hook configuration
│   ├── hooks/
│   │   ├── code-awareness-pre-prompt.mjs      <- UserPromptSubmit: injects gate + prompt snippet
│   │   └── security-review-post-write.mjs     <- PostToolUse: security scan after every write
│   └── skills/
│       ├── install-log.json                   <- Installation decision log (created at runtime)
│       ├── code-awareness/
│       │   ├── SKILL.md                       <- The orchestrator: search -> install -> run
│       │   └── skill-security-verifier.mjs    <- Content scan, integrity check, install log
│       ├── web-browse/
│       │   ├── SKILL.md                       <- Docs: search / fetch / rank
│       │   └── web-browse.mjs                 <- DuckDuckGo + GitHub fallback + rank + cache
│       ├── airgap-validator/
│       │   └── SKILL.md                       <- Artifact validation before airgap deploy
│       ├── security-review/
│       │   └── SKILL.md                       <- Code security review (6 categories)
│       ├── pizza/
│       │   └── SKILL.md                       <- Pizza dough expert (community skill)
│       └── excel-financial-report/
│           └── SKILL.md                       <- Excel financial report builder (generated)
│
└── docs/
    ├── skills-guide.md                        <- General guide to building Skills
    ├── skills-documentation.md                <- Installed Skills documentation
    └── code-awareness-guide.md                <- Deep dive on code-awareness
```

---

## Core Skills Built

### 1. `code-awareness` — The Meta Skill

**What it does:** Full Skill lifecycle orchestration — from detecting the need to installation.

**When activated:** Automatically on **every** request (via Hook), and manually with `/code-awareness`.

**Skill search priority:**
1. Locally installed Skills (`.bob/skills/`)
2. IBM Official repos (`ibm-watsonx-data-integration-skills`, `ibm-self-serve-assets`)
3. MCP Market (`mcpmarket.com/tools/skills`)
4. GitHub community (ranked by `popularityScore`)
5. Fallback: generated local minimal Skill (only if nothing found)

**Guardrails:**
- Single-Skill Cap: max 1 Skill created per session
- Anti-Recursion: will not create a Skill while editing a Skill
- SHA-256 integrity: every Skill receives a checksum in its frontmatter
- Security scan: `skill-security-verifier.mjs` must pass before installation
- Decision Log: every installation is recorded in `install-log.json`

---

### 2. `web-browse` — Search and Ranking

**What it does:** DuckDuckGo search + GitHub fallback + repo scoring.

```bash
# Search
node .bob/skills/web-browse/web-browse.mjs search "some-skill SKILL.md github IBM"

# Fetch content
node .bob/skills/web-browse/web-browse.mjs fetch "https://raw.githubusercontent.com/..."

# Score a repo
node .bob/skills/web-browse/web-browse.mjs rank "IBM/some-repo"
```

**Features:** credential pre-flight, exponential backoff retry, 15-minute cache.

---

### 3. `security-review` — Security Audit

**What it does:** Code review across 6 categories: Secrets, Injection, Auth, Web, Dependencies, Privacy.

**When activated:** Automatically when requesting "security review", "check for vulnerabilities".

---

### 4. `airgap-validator` — Artifact Validation for Closed Environments

**What it does:** Verifies that a file contains no raw IP addresses, tunneling services,
unauthorized URLs, hardcoded credentials, or remote-exec patterns before deployment.

```bash
node .bob/skills/code-awareness/skill-security-verifier.mjs <path-to-artifact>
```

---

## How Skills Are Created — By User Request

### Scenario 1: Official Skill Found on the Web

```
User: "build a DataStage ETL flow"
       |
code-awareness searches (3 angles):
  1. "datastage skill SKILL.md github IBM"
  2. "datastage skill mcpmarket"
  3. "di-agent-flow-datastage SKILL.md github"
       |
Found: github.com/IBM/ibm-watsonx-data-integration-skills
       |
1. Download SKILL.md
2. Run skill-security-verifier.mjs -> PASS
3. Compute SHA-256, add provenance header
4. Save to .bob/skills/<skill-name>/SKILL.md
5. Run the Skill -> execute the task
```

### Scenario 2: No Skill Found -> Generate New One

```
User: "validate my artifact before airgap deployment"
       |
code-awareness searches (3 angles) -> no official Skill found
       |
Generates minimal SKILL.md (airgap-validator)
       |
1. skill-security-verifier.mjs -> PASS (0 findings)
2. Node computes SHA-256 (no CRLF issues)
3. --verify confirms hash match
4. --log adds entry to install-log.json
```

---

## Hooks — What Runs When

| Hook | Event | What It Does |
|------|-------|-------------|
| `code-awareness-pre-prompt.mjs` | `UserPromptSubmit` | Injects PRE-TASK AWARENESS GATE + first 300 chars of request |
| `security-review-post-write.mjs` | `PostToolUse` (write tools) | Scans every written file, adds findings as model context |

### `settings.json`

```json
{
  "hooks": {
    "UserPromptSubmit": [{
      "hooks": [{ "type": "command", "command": "node .bob/hooks/code-awareness-pre-prompt.mjs", "timeout": 10 }]
    }],
    "PostToolUse": [{
      "matcher": "^(write_file|apply_diff|search_and_replace|insert_content)$",
      "hooks": [{ "type": "command", "command": "node .bob/hooks/security-review-post-write.mjs", "timeout": 15 }]
    }]
  }
}
```

---

## Adding a New Skill

### Automatic (recommended)

Simply describe the need to Bob:
```
"I need a skill that validates DB migrations"
```
`code-awareness` will search, find, and install — or generate if nothing exists.

### Manual

```
1. mkdir .bob/skills/my-skill
2. Create SKILL.md with frontmatter + description + steps
3. Run: node .bob/skills/code-awareness/skill-security-verifier.mjs .bob/skills/my-skill/SKILL.md
4. Open a new conversation — Skills are loaded only at conversation start
```

**Name rule:** `^[a-z0-9]+(-[a-z0-9]+)*$` (kebab-case only)

---

## Provenance Header — Every Installed Skill

Every `SKILL.md` installed by the system receives a header:

```yaml
---
# Source: https://raw.githubusercontent.com/IBM/...  (or: Generated by IBM Bob)
# Checksum-SHA256: <hex>
# Verification: Verified Vendor (IBM) - Security Scan PASSED
name: ...
```

To verify integrity:
```bash
node .bob/skills/code-awareness/skill-security-verifier.mjs --verify .bob/skills/<name>/SKILL.md
```

---

## Additional Documentation

| File | Content |
|------|---------|
| [`docs/skills-guide.md`](docs/skills-guide.md) | General guide — what a Skill is, how to create, best practices |
| [`docs/code-awareness-guide.md`](docs/code-awareness-guide.md) | Deep dive on code-awareness |
| [`docs/skills-documentation.md`](docs/skills-documentation.md) | Installed Skills reference |
