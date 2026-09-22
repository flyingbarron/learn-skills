import https from 'node:https';
import { resolve as resolvePath } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

// ---------------------------------------------------------------------------
// Query pre-flight: import the shared CREDENTIAL_HARVESTING patterns from the
// security verifier, then extend with query-specific raw-token patterns that
// the file-content scanner doesn't need but a search query scanner does.
// ---------------------------------------------------------------------------
const VERIFIER_PATH = pathToFileURL(
  resolvePath(fileURLToPath(import.meta.url), '..', '..', 'code-awareness', 'skill-security-verifier.mjs')
).href;
const { CREDENTIAL_HARVESTING: _filePatterns } = await import(VERIFIER_PATH);

// Patterns that only make sense as raw query-token checks (not in file content)
const QUERY_SPECIFIC_PATTERNS = [
  /AKIA[0-9A-Z]{16}/,                              // AWS access key ID
  /ASIA[0-9A-Z]{16}/,                              // AWS temporary access key
  /ghp_[A-Za-z0-9]{36}/,                           // GitHub PAT (classic)
  /github_pat_[A-Za-z0-9_]{82}/,                   // GitHub PAT (fine-grained)
  /gho_[A-Za-z0-9]{36}/,                           // GitHub OAuth token
  /sk-[A-Za-z0-9]{32,}/,                           // OpenAI / generic sk- tokens
  /xox[baprs]-[0-9A-Za-z-]{10,}/,                  // Slack tokens
  /Bearer\s+[A-Za-z0-9\-._~+/]{20,}/i,             // Bare Bearer token value
  /[0-9a-f]{32,64}/,                               // Raw hex secret (md5–sha256 length)
  /[A-Za-z0-9+/]{40,}={0,2}/,                      // Raw base64-encoded secret
];

// Combined: all patterns from the verifier + query-specific additions
const ALL_QUERY_PATTERNS = [..._filePatterns, ...QUERY_SPECIFIC_PATTERNS];

/**
 * Runs before every outgoing search or fetch.
 *
 * Returns { safe: true }  when no credential is detected.
 * Returns { safe: false, redacted: string, matches: string[] } when a
 * credential pattern fires — the caller MUST abort the HTTP request.
 */
function queryPreflightCheck(query) {
  const matches = [];
  let redacted = query;

  for (const pattern of ALL_QUERY_PATTERNS) {
    // Use a fresh regex each iteration to avoid lastIndex drift on /g flags
    const re = new RegExp(pattern.source, pattern.flags.replace('g', ''));
    if (re.test(redacted)) {
      matches.push(pattern.toString());
      redacted = redacted.replace(re, '[REDACTED]');
    }
  }

  if (matches.length === 0) return { safe: true };
  return { safe: false, redacted, matches };
}

// ---------------------------------------------------------------------------
// In-memory search cache  (TTL: 15 minutes)
// ---------------------------------------------------------------------------
const CACHE_TTL_MS = 15 * 60 * 1000;
/** @type {Map<string, { ts: number, result: object }>} */
const searchCache = new Map();

function cacheGet(key) {
  const entry = searchCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) {
    searchCache.delete(key);
    return null;
  }
  return entry.result;
}

function cacheSet(key, result) {
  searchCache.set(key, { ts: Date.now(), result });
}

// ---------------------------------------------------------------------------
// HTTP fetch — rejects with a typed RateLimitError on HTTP 429
// ---------------------------------------------------------------------------
class RateLimitError extends Error {
  constructor(retryAfterSeconds) {
    super(`HTTP 429 Too Many Requests (retry-after: ${retryAfterSeconds}s)`);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfterSeconds;
  }
}

function fetchUrl(url, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const options = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        ...extraHeaders
      }
    };

    https.get(options, (res) => {
      // Reject immediately on 429 so the retry layer can handle it
      if (res.statusCode === 429) {
        const retryAfter = parseInt(res.headers['retry-after'] || '5', 10);
        res.resume(); // drain the socket
        return reject(new RateLimitError(retryAfter));
      }

      // Handle redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        let redirectUrl = res.headers.location;
        if (!redirectUrl.startsWith('http')) {
          redirectUrl = new URL(redirectUrl, url).href;
        }
        return resolve(fetchUrl(redirectUrl));
      }

      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

// ---------------------------------------------------------------------------
// Exponential backoff retry — used only for search requests (max 3 retries)
// Delays: 1s → 2s → 4s  (jitter: ±200 ms to avoid thundering herd)
// ---------------------------------------------------------------------------
const MAX_RETRIES = 3;

async function fetchWithRetry(url, extraHeaders = {}, attempt = 0) {
  try {
    return await fetchUrl(url, extraHeaders);
  } catch (err) {
    const isRetryable = err instanceof RateLimitError ||
                        err.code === 'ECONNRESET' ||
                        err.code === 'ETIMEDOUT' ||
                        err.code === 'ENOTFOUND';

    if (!isRetryable || attempt >= MAX_RETRIES) throw err;

    // Use server-supplied retry-after when available, else exponential backoff
    const baseDelay = err instanceof RateLimitError
      ? err.retryAfter * 1000
      : Math.pow(2, attempt) * 1000;
    const jitter = Math.floor(Math.random() * 400) - 200; // ±200 ms
    const delay = Math.max(200, baseDelay + jitter);

    process.stderr.write(
      `[web-browse] ${err.name || 'NetworkError'} on attempt ${attempt + 1}/${MAX_RETRIES} — retrying in ${delay}ms\n`
    );
    await new Promise(r => setTimeout(r, delay));
    return fetchWithRetry(url, extraHeaders, attempt + 1);
  }
}

function cleanHtml(html) {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

// Fetch GitHub repo metadata for ranking: stars, last push, open issues
async function evaluateSkillMetadata(ownerRepo) {
  try {
    const json = await fetchUrl(
      `https://api.github.com/repos/${ownerRepo}`,
      { 'User-Agent': 'web-browse-skill', 'Accept': 'application/vnd.github+json' }
    );
    const r = JSON.parse(json);
    if (r.message) return { popularityScore: 0, stars: 0, lastPush: null, type: 'unknown' };
    const daysSincePush = Math.floor((Date.now() - new Date(r.pushed_at)) / 86400000);
    // Score = stars * 10 + freshness bonus (max 100 for push <30d)
    const freshnessBonus = Math.max(0, 100 - daysSincePush);
    const popularityScore = (r.stargazers_count || 0) * 10 + freshnessBonus;
    return {
      popularityScore,
      stars: r.stargazers_count || 0,
      lastPush: r.pushed_at,
      daysSincePush,
      openIssues: r.open_issues_count || 0,
      type: r.owner?.type === 'Organization' ? 'vendor' : 'community-free'
    };
  } catch {
    return { popularityScore: 0, stars: 0, lastPush: null, type: 'unknown' };
  }
}

async function searchDuckDuckGo(query) {
  const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const html = await fetchWithRetry(searchUrl);

  const results = [];

  // Alternative cleaner snippet extraction
  const linkRegex = /<a class="result__snippet[^"]*" href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;

  let match;
  while ((match = linkRegex.exec(html)) !== null && results.length < 5) {
    let rawUrl = match[1];
    let snippet = cleanHtml(match[2]);
    
    // DuckDuckGo redirects wrapped in /l/?uddg=...
    if (rawUrl.includes('uddg=')) {
      const matchUrl = rawUrl.match(/uddg=([^&]+)/);
      if (matchUrl) {
        rawUrl = decodeURIComponent(matchUrl[1]);
      }
    }

    if (rawUrl.startsWith('http')) {
      results.push({ url: rawUrl, snippet });
    }
  }

  return results;
}

// Fallback: GitHub repo search via public API, enriched with ranking metadata
async function searchGitHub(query) {
  const apiUrl = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&per_page=8&sort=stars&order=desc`;
  const json = await fetchWithRetry(apiUrl, { 'User-Agent': 'web-browse-skill', 'Accept': 'application/vnd.github+json' });
  try {
    const data = JSON.parse(json);
    if (!data.items) return [];
    return data.items.slice(0, 8).map(r => {
      const daysSincePush = Math.floor((Date.now() - new Date(r.pushed_at)) / 86400000);
      const freshnessBonus = Math.max(0, 100 - daysSincePush);
      const score = (r.stargazers_count || 0) * 10 + freshnessBonus;
      return {
        url: r.html_url,
        snippet: `${r.full_name} — ${r.description || ''} (⭐${r.stargazers_count}, updated ${daysSincePush}d ago)`,
        _rank: { score, stars: r.stargazers_count, daysSincePush, owner: r.owner?.login, ownerType: r.owner?.type }
      };
    }).sort((a, b) => b._rank.score - a._rank.score);
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Fallback 3: Brave Search API — free tier (2,000 req/month, no CC required)
// Requires BRAVE_SEARCH_API_KEY env var.  Skipped silently when key is absent.
// Sign up: https://brave.com/search/api
// ---------------------------------------------------------------------------
async function searchBrave(query) {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY;
  if (!apiKey) return [];   // degrade gracefully — key not configured

  const apiUrl = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=8&search_lang=en`;
  try {
    const json = await fetchWithRetry(apiUrl, {
      'Accept': 'application/json',
      'Accept-Encoding': 'gzip',
      'X-Subscription-Token': apiKey
    });
    const data = JSON.parse(json);
    const hits = data?.web?.results ?? [];
    return hits.slice(0, 8).map(r => ({
      url: r.url,
      snippet: r.description || r.title || ''
    }));
  } catch {
    return [];
  }
}

async function searchWithFallback(query) {
  // Pre-flight: abort before any network call if the query contains credentials
  const preflight = queryPreflightCheck(query);
  if (!preflight.safe) {
    return {
      engine: 'blocked',
      results: [],
      error: 'CREDENTIAL_LEAK_PREVENTED',
      redactedQuery: preflight.redacted,
      matchedPatterns: preflight.matches,
      message: 'Search query contained sensitive credential patterns. The request was aborted. See redactedQuery for the sanitised version.'
    };
  }

  // Cache check — normalise key to lowercase trimmed string
  const cacheKey = query.toLowerCase().trim();
  const cached = cacheGet(cacheKey);
  if (cached) {
    process.stderr.write(`[web-browse] cache hit for query: "${query}"\n`);
    return { ...cached, cached: true };
  }

  // 1. Try DuckDuckGo first
  const ddgResults = await searchDuckDuckGo(query);
  if (ddgResults.length > 0) {
    const result = { engine: 'duckduckgo', results: ddgResults };
    cacheSet(cacheKey, result);
    return result;
  }

  // 2. DuckDuckGo blocked/empty — fall back to GitHub API (repo-level results)
  const ghQuery = query.replace(/site:\S+/g, '').trim();
  const ghResults = await searchGitHub(ghQuery);
  if (ghResults.length > 0) {
    const result = { engine: 'github', results: ghResults };
    cacheSet(cacheKey, result);
    return result;
  }

  // 3. GitHub returned nothing — try Brave Search API (full web, key-gated)
  const braveResults = await searchBrave(query);
  if (braveResults.length > 0) {
    const result = { engine: 'brave', results: braveResults };
    cacheSet(cacheKey, result);
    return result;
  }

  return { engine: 'none', results: [] };
}

async function fetchPageContent(url) {
  // Pre-flight: check the URL string itself for embedded secrets (e.g. token= params)
  const preflight = queryPreflightCheck(url);
  if (!preflight.safe) {
    return JSON.stringify({
      error: 'CREDENTIAL_LEAK_PREVENTED',
      redactedUrl: preflight.redacted,
      matchedPatterns: preflight.matches,
      message: 'The URL contained sensitive credential patterns. The request was aborted.'
    });
  }
  const html = await fetchUrl(url);
  const text = cleanHtml(html);
  return text.slice(0, 8000); // return top 8000 chars of readable text
}

async function main() {
  const mode = process.argv[2]; // "search" | "fetch"
  const target = process.argv.slice(3).join(' ');

  if (!mode || !target) {
    console.error('Usage: node web-browse.mjs [search|fetch] <query_or_url>');
    process.exit(1);
  }

  try {
    if (mode === 'search') {
      const searchResult = await searchWithFallback(target);
      if (searchResult.engine === 'blocked') {
        // Credential leak prevented — print structured warning and exit 2
        process.stderr.write('[web-browse] SECURITY: outgoing request blocked — credential pattern detected in query\n');
        console.log(JSON.stringify(searchResult, null, 2));
        process.exit(2);
      }
      const { engine, results, cached } = searchResult;
      if (engine !== 'duckduckgo' && engine !== 'none' && engine !== 'blocked') {
        process.stderr.write(`[web-browse] DuckDuckGo unavailable — using fallback: ${engine}\n`);
        if (engine === 'brave' && !process.env.BRAVE_SEARCH_API_KEY) {
          process.stderr.write('[web-browse] tip: set BRAVE_SEARCH_API_KEY for full-web Brave Search fallback\n');
        }
      }
      // Strip internal _rank fields from output (used only for sorting)
      const cleanResults = results.map(({ _rank, ...r }) => r);
      console.log(JSON.stringify({ query: target, count: cleanResults.length, engine, cached: cached ?? false, results: cleanResults }, null, 2));
    } else if (mode === 'fetch') {
      const content = await fetchPageContent(target);
      console.log(JSON.stringify({ url: target, text: content }, null, 2));
    } else if (mode === 'rank') {
      // rank <owner/repo> — evaluate a specific GitHub repo for skill quality
      const meta = await evaluateSkillMetadata(target);
      console.log(JSON.stringify({ repo: target, ...meta }, null, 2));
    } else {
      console.error('Usage: node web-browse.mjs [search|fetch|rank] <query_or_url_or_owner/repo>');
      process.exit(1);
    }
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}




main();
