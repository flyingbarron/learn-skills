---
name: web-browse
description: >
  Use when you need to search the web or fetch external web pages, repositories,
  marketplaces, or documentation without requiring an API key (100% free local search).
metadata:
  argument-hint: "[search <query> | fetch <url> | rank <owner/repo>]"
---

# Web Browse & Discovery Skill

## Purpose
Enables autonomous web search, external content retrieval, and GitHub repo quality
ranking to discover skills, MCP servers, and solutions — with built-in security
safeguards and resilient networking.

## Features

| Feature | Details |
|---------|---------|
| **DuckDuckGo search** | Primary search engine, no API key required |
| **GitHub API fallback** | Auto-activates when DuckDuckGo is rate-limited or returns no results (repo-level results only) |
| **Brave Search fallback** | Full-web search fallback when both DDG and GitHub return nothing. Free tier: 2,000 req/month. Requires `BRAVE_SEARCH_API_KEY` env var — skipped silently if absent. |
| **Repo ranking (`rank`)** | Scores GitHub repos by stars × 10 + freshness bonus (max 100 for push < 30d) |
| **Credential pre-flight** | Aborts any outgoing request if the query/URL contains credential patterns (AWS keys, GitHub PATs, Bearer tokens, base64 secrets) |
| **Exponential backoff retry** | Up to 3 retries on 429 / ECONNRESET / ETIMEDOUT / ENOTFOUND — delay: 1 s → 2 s → 4 s ± 200 ms jitter |
| **In-memory cache** | 15-minute TTL — identical queries return instantly with `cached: true` in output |
| **8 000-char fetch limit** | Fetched pages are truncated to 8 000 characters of clean readable text |

## Search Engine Fallback Chain

```
1. DuckDuckGo HTML scrape   — no key, no account, best coverage
       ↓ (if 0 results or rate-limited)
2. GitHub API search        — no key, repo-level results only
       ↓ (if 0 results)
3. Brave Search API         — free 2,000 req/month, full web index
       (skipped silently if BRAVE_SEARCH_API_KEY is not set)
       ↓ (if 0 results or key absent)
4. engine: "none"           — caller sees empty results
```

### Setting up Brave Search (optional but recommended)

1. Go to **https://brave.com/search/api** → sign up (no credit card)
2. Create a free-tier subscription → copy your API key
3. Set the environment variable **before** running Bob:

```bash
# Windows (PowerShell — current session)
$env:BRAVE_SEARCH_API_KEY = "BSA..."

# Windows (permanent — user scope)
[System.Environment]::SetEnvironmentVariable("BRAVE_SEARCH_API_KEY","BSA...","User")

# macOS / Linux
export BRAVE_SEARCH_API_KEY="BSA..."
```

The key is **never stored on disk** — it is only read from `process.env` at runtime.
The `queryPreflightCheck` in `web-browse.mjs` prevents any key-like value from
accidentally appearing in a search query.

## How to Run

Use `execute_command` to invoke the local helper script from the workspace root.

### 1. Search the web

```bash
node .bob/skills/web-browse/web-browse.mjs search "<search terms>"
```

Returns JSON with fields: `query`, `count`, `engine` (`duckduckgo` | `github` | `brave` | `none` | `blocked`), `cached`, `results[]`.

**Example — find an IBM DataStage skill:**
```bash
node .bob/skills/web-browse/web-browse.mjs search "di-agent-flow-datastage SKILL.md github"
```

### 2. Fetch a web page / raw content

```bash
node .bob/skills/web-browse/web-browse.mjs fetch "<url>"
```

Returns JSON with fields: `url`, `text` (up to 8 000 chars, HTML stripped).

**Example — fetch a raw SKILL.md from GitHub:**
```bash
node .bob/skills/web-browse/web-browse.mjs fetch "https://raw.githubusercontent.com/IBM/some-repo/main/skills/foo/SKILL.md"
```

### 3. Rank a GitHub repository

```bash
node .bob/skills/web-browse/web-browse.mjs rank "<owner/repo>"
```

Returns JSON with: `repo`, `popularityScore`, `stars`, `daysSincePush`, `openIssues`, `type` (`vendor` | `community-free` | `unknown`).

**Example:**
```bash
node .bob/skills/web-browse/web-browse.mjs rank "IBM/ibm-watsonx-data-integration-skills"
```

Use `popularityScore` to compare candidates — higher is better. IBM/vendor repos are always preferred over community regardless of score.

## Security: Credential Pre-flight

Every `search` and `fetch` call runs a credential scan on the query/URL **before** any network request is made. If a credential pattern is detected, the request is **immediately aborted** and the output contains:

```json
{
  "engine": "blocked",
  "error": "CREDENTIAL_LEAK_PREVENTED",
  "redactedQuery": "...[REDACTED]...",
  "matchedPatterns": ["..."]
}
```

Patterns checked: AWS access keys, GitHub PATs, OpenAI `sk-` tokens, Slack tokens, Bearer tokens, raw hex/base64 secrets.

## Retry & Resilience

When a network call fails with HTTP 429, `ECONNRESET`, `ETIMEDOUT`, or `ENOTFOUND`:

1. Wait `2^attempt × 1000ms ± 200ms` (jitter to avoid thundering herd).
2. Retry up to **3 times**.
3. On the 4th failure, propagate the error.

On HTTP 429 with a `Retry-After` header, that value is used instead of exponential backoff.

## Output Examples

### `search` (DuckDuckGo engine)
```json
{
  "query": "di-agent-flow-datastage SKILL.md github",
  "count": 3,
  "engine": "duckduckgo",
  "cached": false,
  "results": [
    { "url": "https://github.com/IBM/...", "snippet": "..." }
  ]
}
```

### `search` (GitHub fallback engine)
```json
{
  "query": "datastage skill",
  "count": 5,
  "engine": "github",
  "cached": false,
  "results": [
    { "url": "https://github.com/IBM/...", "snippet": "IBM/repo — description (⭐42, updated 3d ago)" }
  ]
}
```

### `rank`
```json
{
  "repo": "IBM/ibm-watsonx-data-integration-skills",
  "popularityScore": 520,
  "stars": 42,
  "daysSincePush": 8,
  "openIssues": 3,
  "type": "vendor"
}
```
