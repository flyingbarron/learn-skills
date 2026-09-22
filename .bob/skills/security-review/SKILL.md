# ============================================================
# SKILL: security-review
# ============================================================
# 📌 WHAT IS THIS FILE?
#    This is a Bob Skill — a procedural guide that Bob follows
#    automatically (or when called manually) to perform a
#    structured security review of code or a pull request.
#
# 📌 HOW TO ACTIVATE?
#    Automatic: Bob detects a matching request and loads this skill.
#    Manual:    Type `/security-review` in the chat.
#
# 📌 HOW TO CUSTOMIZE?
#    Every section marked with 👉 CUSTOMIZE is a place where
#    you should adjust the instructions to match YOUR project,
#    YOUR tech stack, and YOUR team conventions.
# ============================================================

---
name: security-review

# ------------------------------------------------------------
# DESCRIPTION — THE TRIGGER
# ------------------------------------------------------------
# 🔑 This is the MOST IMPORTANT field.
#    Bob reads this to decide WHEN to auto-activate this skill.
#    Write it with concrete trigger phrases:
#      "Use when the user wants to..."
#      "Use when the user asks to review..."
#    The more specific, the fewer false activations.
#
# 👉 CUSTOMIZE: Add phrases that match how YOUR team talks.
#    Examples:
#      - "...or when the user says 'check for vulnerabilities'"
#      - "...or when reviewing authentication code"
# ------------------------------------------------------------
description: >
  Use when the user wants to perform a security review of code,
  a pull request, a file, or a feature. Also activate when the
  user asks to check for vulnerabilities, security issues,
  secrets, or authentication problems.

# ------------------------------------------------------------
# METADATA (optional)
# ------------------------------------------------------------
# disable-model-invocation: false   ← DEFAULT: Bob auto-activates this skill.
#                                     Set to true if you want MANUAL-ONLY activation.
#                                     When true, only `/security-review` triggers it.
#
# argument-hint: "[file-or-PR]"     ← Shown as autocomplete hint after /security-review
#                                     Example: /security-review src/auth/login.ts
#
# 👉 CUSTOMIZE: Uncomment the lines below to change behavior.
# ------------------------------------------------------------
metadata:
  # disable-model-invocation: false
  argument-hint: "[file, directory, or PR description]"
# ------------------------------------------------------------

---

# Security Review

## Overview

This skill performs a structured, multi-layer security review.
It checks for the most common vulnerability classes and produces
a clear, actionable report.

---

## Step 1 — Understand the Scope

Before reviewing anything, clarify WHAT is being reviewed.

1. If the user provided a **file path** → use `read_file` to load it.
2. If the user provided a **PR description or diff** → ask for the changed files using `ask_followup_question`.
3. If the user said "review everything" → use `glob` to list relevant source files.

> 👉 CUSTOMIZE: Define which directories are in scope for your project.
> Example: only review `src/`, `api/`, `lib/` — skip `tests/`, `docs/`, `scripts/`.

**Default scope (adjust to your project):**
```
src/**/*.ts
src/**/*.js
api/**/*
lib/**/*
```

---

## Step 2 — Run the Checklist

For each file in scope, check the following categories.
Report every finding with: **severity**, **file + line**, **description**, **recommendation**.

---

### 🔐 Category A — Secrets & Credentials

> 👉 CUSTOMIZE: Add patterns specific to your project.
> Example: your internal token format, custom API key prefixes.

Check for:
- [ ] Hardcoded passwords, API keys, tokens, or secrets in source code
- [ ] Credentials committed in config files (`.env`, `config.json`, `appsettings.json`)
- [ ] Private keys or certificates in the repository
- [ ] Secrets passed as plain strings in function arguments
- [ ] Logging statements that print sensitive values

**What to look for (regex-style patterns):**
```
password\s*=\s*["'][^"']+["']
api_key\s*=\s*["'][^"']+["']
token\s*=\s*["'][^"']+["']
secret\s*=\s*["'][^"']+["']
-----BEGIN.*PRIVATE KEY-----
```

**Correct approach:** Use environment variables or a secrets manager.
```ts
// ❌ BAD
const apiKey = "sk-abc123xyz";

// ✅ GOOD
const apiKey = process.env.API_KEY;
```

---

### 🛡️ Category B — Input Validation & Injection

> 👉 CUSTOMIZE: Add the frameworks your project uses.
> Example: if you use Zod, Joi, Yup, express-validator — reference them here.

Check for:
- [ ] All user inputs validated before use (type, format, length, range)
- [ ] SQL queries — are they using parameterized queries or an ORM?
- [ ] Shell commands — is user input ever passed to `exec`, `spawn`, `system()`?
- [ ] Template engines — is user input ever rendered without escaping?
- [ ] File paths — can a user inject `../` path traversal?

**Examples:**
```ts
// ❌ BAD — SQL Injection
db.query(`SELECT * FROM users WHERE id = ${userId}`);

// ✅ GOOD — Parameterized
db.query("SELECT * FROM users WHERE id = ?", [userId]);

// ❌ BAD — Command Injection
exec(`ls ${userInput}`);

// ✅ GOOD — Avoid shell or sanitize strictly
```

---

### 🔑 Category C — Authentication & Authorization

> 👉 CUSTOMIZE: Reference YOUR auth system.
> Example: JWT, OAuth2, SAML, API Keys, session-based auth.
> Add your specific middleware names, permission models, role names.

Check for:
- [ ] All protected routes/endpoints require authentication
- [ ] Authorization checks are performed server-side (not just client-side)
- [ ] JWT tokens: algorithm is not `none`, expiration is set, signature is verified
- [ ] Session tokens: regenerated after login, invalidated on logout
- [ ] Password hashing: using bcrypt/argon2/scrypt — NOT md5 or sha1
- [ ] Broken Object Level Authorization (BOLA/IDOR): can user A access user B's data?

**Example IDOR check:**
```ts
// ❌ BAD — No ownership check
app.get("/invoices/:id", async (req, res) => {
  const invoice = await db.getInvoice(req.params.id);
  res.json(invoice); // Any user can get any invoice!
});

// ✅ GOOD — Ownership verified
app.get("/invoices/:id", async (req, res) => {
  const invoice = await db.getInvoice(req.params.id);
  if (invoice.ownerId !== req.user.id) return res.status(403).json({ error: "Forbidden" });
  res.json(invoice);
});
```

---

### 🌐 Category D — Web-Specific (XSS, CSRF, Headers)

> 👉 CUSTOMIZE: Relevant only for web applications.
> Remove this section if you are reviewing backend-only or CLI code.

Check for:
- [ ] XSS: user input rendered in HTML without escaping (`innerHTML`, `dangerouslySetInnerHTML`)
- [ ] CSRF: state-changing endpoints protected with CSRF tokens or SameSite cookies
- [ ] Security headers present: `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`
- [ ] CORS: `Access-Control-Allow-Origin` is not `*` for authenticated endpoints

---

### 📦 Category E — Dependencies & Supply Chain

> 👉 CUSTOMIZE: Add your package manager (npm, pip, maven, gradle, cargo, etc.)

Check for:
- [ ] Are there known vulnerable packages? (use `execute_command` to run `npm audit` / `pip-audit`)
- [ ] Are dependencies pinned to specific versions or floating (`^`, `~`, `*`)?
- [ ] Are there unused dependencies that increase attack surface?

**Command to run:**
```bash
# 👉 CUSTOMIZE: Change to your package manager
npm audit --audit-level=high
```

---

### 🗄️ Category F — Data Exposure & Privacy

> 👉 CUSTOMIZE: Define what counts as "sensitive data" in your domain.
> Examples: PII, financial data, health records, user emails, phone numbers.

Check for:
- [ ] API responses do not leak internal fields (e.g., `password_hash`, `internal_id`)
- [ ] Error messages do not expose stack traces or internal paths to clients
- [ ] Logs do not contain PII or sensitive user data
- [ ] Data in transit: all external calls use HTTPS/TLS

---

## Step 3 — Run Automated Checks (Optional but Recommended)

> 👉 CUSTOMIZE: Replace these with the actual tools your project uses.

Use `execute_command` to run static analysis tools:

```bash
# JavaScript / TypeScript
npx eslint --rule '{"no-eval": "error"}' src/

# Python
bandit -r src/ -ll

# General secrets scanning
# 👉 CUSTOMIZE: Install trufflehog or gitleaks in your environment
trufflehog filesystem ./src

# Dependency audit
npm audit --audit-level=moderate
```

---

## Step 4 — Produce the Report

Use `create_html_artifact` to generate a structured report with:

1. **Summary table** — total findings by severity (Critical / High / Medium / Low / Info)
2. **Findings list** — for each finding:
   - Severity badge
   - File path + line number
   - Vulnerability class (e.g., "SQL Injection", "Hardcoded Secret")
   - Description of the issue
   - Recommended fix with code example
3. **Overall risk rating** — based on highest severity found
4. **Next steps** — ordered by priority

### Severity Scale

> 👉 CUSTOMIZE: Align with your team's severity definitions or your bug tracking system.

| Severity | Definition | Example |
|----------|-----------|---------|
| 🔴 Critical | Direct exploit possible, data loss or full compromise | Hardcoded DB password in public repo |
| 🟠 High | Serious vulnerability requiring prompt fix | SQL Injection, Missing Auth |
| 🟡 Medium | Vulnerability with limited impact or hard to exploit | Missing CSRF token on low-value endpoint |
| 🔵 Low | Best practice violation, minor risk | Missing security header |
| ⚪ Info | Observation, no immediate risk | Outdated but not vulnerable dependency |

---

## Step 5 — Follow-Up Actions

After delivering the report:

1. Ask the user if they want fixes generated for any specific finding.
2. If yes → use `apply_diff` or `search_and_replace` to apply the fix to the source file.
3. Remind the user to:
   - Run the test suite after fixes
   - Rotate any secrets found (even if they look test/fake — treat all as real)
   - Add the vulnerability pattern to code review checklist to prevent recurrence

> 👉 CUSTOMIZE: Add links to your internal runbooks, Jira project, or security policy here.
> Example: "Open a P1 ticket in Jira project SEC-XXXX for all Critical findings."

---

## Notes for Customization — Quick Reference

Here is a summary of every place in this skill you should customize:

| # | What to customize | Where |
|---|-------------------|-------|
| 1 | Trigger phrases | `description` field in frontmatter |
| 2 | Auto vs manual activation | `metadata.disable-model-invocation` |
| 3 | Files/directories in scope | Step 1 — Default scope |
| 4 | Secret patterns for your project | Step 2 — Category A |
| 5 | Validation libraries you use | Step 2 — Category B |
| 6 | Your auth system (JWT, OAuth, etc.) | Step 2 — Category C |
| 7 | Remove web-specific checks if N/A | Step 2 — Category D |
| 8 | Your package manager | Step 2 — Category E |
| 9 | Your definition of sensitive data | Step 2 — Category F |
| 10 | Static analysis tools you use | Step 3 |
| 11 | Severity definitions | Step 4 — Severity Scale |
| 12 | Jira/ticketing/runbook links | Step 5 |
