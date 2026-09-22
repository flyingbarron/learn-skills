# Bob Skills — מדריך מקיף לאותנטיק AI

> תיעוד מלא על Skills ב-Bob: מהם, למה הם חשובים, איך יוצרים אותם, ואיך מנהלים אותם נכון.

---

## תוכן עניינים

1. [מהו Skill?](#מהו-skill)
2. [10 ה-Skills החשובים ביותר](#10-ה-skills-החשובים-ביותר)
3. [איך יוצרים Skill](#איך-יוצרים-skill)
4. [צירוף Skills — גלובלי vs. פרויקט](#צירוף-skills--גלובלי-vs-פרויקט)
5. [מה קורה כשיש יותר מדי Skills](#מה-קורה-כשיש-יותר-מדי-skills)
6. [התנגשויות וסתירות בין Skills](#התנגשויות-וסתירות-בין-skills)
7. [Best Practices — סיכום](#best-practices--סיכום)

---

## מהו Skill?

**Skill** הוא קובץ `SKILL.md` שמכיל הוראות פרוצדורליות שמופעלות אוטומטית (או ידנית) כאשר המשימה תואמת לתיאור שלו.

הוא בעצם **"זיכרון מקצועי"** של הסוכן — במקום שהמודל ינחש איך לבצע משימה, ה-Skill מנחה אותו צעד אחר צעד, בצורה עקבית, בכל פעם.

### מתי Skill מופעל?

- **אוטומטי** — Bob מתאים את ה-`description` של ה-Skill להודעת המשתמש. אם יש התאמה, הוא טוען את ה-Skill לתוך ה-context ופועל לפיו.
- **ידני** — המשתמש מקליד `/skill-name` כדי להפעיל אותו במפורש.

---

## 10 ה-Skills החשובים ביותר

### 1. `security-review`
**מה הוא עושה:** בודק PR או קוד לאיתור חולשות אבטחה — authentication, input validation, secrets חשופים, הרשאות.

**למה הוא חשוב:**
כל קוד שיוצא לפרודקשן צריך ביקורת אבטחה עקבית. ללא Skill, כל ביקורת שונה — מפתח אחד בודק secrets, אחר בודק SQL injection, שלישי לא בודק כלום. Skill מבטיח שאף שלב לא מדולג.

**תרומה:** מפחית את הסיכוי לחולשות שנכנסות ל-main ב-80%+ כאשר מיישמים אותו עקבי.

---

### 2. `create-test-suite`
**מה הוא עושה:** מייצר בדיקות unit ו-integration לפי conventions הפרויקט הספציפי.

**למה הוא חשוב:**
ללא Skill, כל מפתח (ו-AI) כותב טסטים בסגנון שונה — שמות שונים, mocking שונה, assertion style שונה. Skill הופך כתיבת טסטים לאחידה ומהירה.

**תרומה:** עקביות בטסטים = קל יותר לקרוא, לתחזק ולהוסיף.

---

### 3. `refactor-code`
**מה הוא עושה:** מנחה refactoring שיטתי — SOLID principles, ניקוי dead code, שיפור naming, הפחתת complexity.

**למה הוא חשוב:**
AI ללא הנחיה יכול "לנקות" קוד ולשבור behavior בדרך. Skill מגדיר: מה מותר לשנות, מה אסור לשנות, ואיך לוודא שלא שברנו כלום.

**תרומה:** Refactoring בטוח ועקבי — לא "השפרתי והסתרתי באג חדש".

---

### 4. `api-design`
**מה הוא עושה:** מגדיר REST/GraphQL endpoints לפי OpenAPI, versioning strategy, error contracts, pagination.

**למה הוא חשוב:**
API גרוע הוא חוב טכני שיחיה שנים. שינוי API שכבר בשימוש = breaking change. Skill מכריח חשיבה נכונה לפני הכתיבה.

**תרומה:** APIs עקביים, מתועדים, ו-backward compatible.

---

### 5. `debug-session`
**מה הוא עושה:** מנחה תהליך debugging שיטתי — איסוף logs, isolation, hypothesis testing, root cause analysis.

**למה הוא חשוב:**
ללא מבנה, debugging = ניחושים אקראיים. Skill מכריח גישה מדעית: תצפית → היפותזה → בדיקה → מסקנה.

**תרומה:** מקצר זמן debugging משמעותית ומונע "תיקנתי את הסימפטום, לא את הגורם".

---

### 6. `code-review`
**מה הוא עושה:** ביקורת קוד כוללת — ביצועים, קריאות, עקביות עם ה-codebase, עקרונות, documentation.

**למה הוא חשוב:**
ביקורת קוד ללא מבנה = הערות אקראיות תלויות במצב רוח. Skill הופך review לתהליך סטנדרטי עם checklist ברור.

**תרומה:** Reviews עקביים שמשפרים את איכות הקוד ומלמדים את הצוות.

---

### 7. `db-migration`
**מה הוא עושה:** מייצר migration scripts, rollback plans, data validation queries, ותיעוד של כל שינוי בסכמה.

**למה הוא חשוב:**
שגיאה ב-migration = downtime, אובדן נתונים, לקוחות כועסים. Skill מונע דילוג על צעדי בטיחות בגלל לחץ זמן.

**תרומה:** כל migration מגיע עם rollback מוכן — לא "אוי, לא חשבנו על זה".

---

### 8. `onboarding-new-feature`
**מה הוא עושה:** מנחה הוספת feature חדש מ-spec עד PR — architecture decisions, implementation, tests, documentation, changelog.

**למה הוא חשוב:**
בלי Skill, מפתחים (ו-AI) כותבים קוד ושוכחים לכתוב docs, לעדכן changelog, לוודא שה-feature נבדק. Skill = definition of done.

**תרומה:** פחות "הכנסתי feature שאף אחד לא יודע עליו".

---

### 9. `ci-cd-setup`
**מה הוא עושה:** מגדיר pipelines, environments, secrets management, health checks, rollback strategies.

**למה הוא חשוב:**
DevOps מורכב ומלא פרטים קטנים שקל לפספס. Skill מבטיח שאף שלב לא נשמט — במיוחד rollback וניהול secrets.

**תרומה:** Pipeline מוכן, בטוח, ומתועד — לא "עובד על המכונה שלי".

---

### 10. `incident-response`
**מה הוא עושה:** מנחה triage, mitigation, communication, ו-postmortem בזמן production incident.

**למה הוא חשוב:**
בזמן לחץ — checklist מנצח זיכרון. Skill = calm under fire. מבטיח שמדווחים, מתקנים, ומתעדים בסדר הנכון.

**תרומה:** incidents שנפתרים מהר יותר + postmortem שמונע את ה-incident הבא.

---

### מה משותף לכל 10 ה-Skills?

כולם **חוזרים על עצמם**, **רגישים לטעויות**, ו**מרוויחים מעקביות**.

ה-AI ללא Skill יכול לבצע כל אחד מהם — אבל בצורה שונה בכל פעם.
**ה-Skill הופך תהליך אינטואיטיבי לתהליך מדיד, חוזר, ואמין.**

---

## איך יוצרים Skill

### מבנה הקבצים

```
.bob/skills/<skill-name>/
    SKILL.md
    (אופציונלי) helper-script.sh / helper-script.py
```

### תבנית SKILL.md מלאה

```markdown
---
name: security-review
description: Use when the user wants to review a PR for security issues — walks through auth, input validation, and secrets handling.
---

# Security Review

Follow these steps:

1. Use `read_file` to read all changed files in the PR
2. Check for hardcoded secrets, API keys, or credentials
3. Verify input validation on all user-facing endpoints
4. Check authentication & authorization logic
5. Look for SQL injection, XSS, and CSRF vulnerabilities
6. Report all findings using `create_html_artifact`
```

### שדות ה-Frontmatter

| שדה | חובה | תיאור |
|-----|------|--------|
| `name` | ✅ | חייב להתאים בדיוק לשם התיקייה |
| `description` | ✅ | **זהו ה-trigger!** כאן Bob מחליט מתי להפעיל אוטומטית |
| `metadata.disable-model-invocation` | ❌ | `true` = רק ידנית עם `/skill-name`, לא אוטומטי |
| `metadata.argument-hint` | ❌ | רמז שמוצג לאחר `/skill-name`, למשל `[pr-number]` |
| `metadata.user-invocable` | ❌ | `false` = רק Bob יכול להפעיל, לא המשתמש |

### כללי שמות — חשוב מאוד!

```
^[a-z0-9]+(-[a-z0-9]+)*$
```

| ✅ תקין | ❌ לא תקין |
|---------|-----------|
| `security-review` | `Security_Review` |
| `api-design` | `API Design` |
| `db-migration` | `--broken` |
| `ci-cd-setup` | `mySkill` |

> ⚠️ **אזהרה קריטית:** שם לא תקין = ה-Skill נטען בשקט ללא שגיאה, אבל **לא עובד בכלל**.

### מתי להוסיף Supporting Script?

הוסף script לצד `SKILL.md` כאשר ה-Skill צריך:

- לשלוף נתונים מ-API חיצוני
- לנתח קבצים ולהחזיר output מובנה
- להריץ סדרת פקודות shell ולהחזיר תוצאה אחת נקייה
- ליצור boilerplate מ-template

```
.bob/skills/my-skill/
    SKILL.md          ← מכיל הוראות + קורא ל-script
    fetch-data.sh     ← עושה את העבודה הפרוגרמטית
```

ב-`SKILL.md` כתוב: `Use execute_command to run fetch-data.sh and act on its output.`

---

## צירוף Skills — גלובלי vs. פרויקט

### מיקומים

```
Global (כל פרויקט):   ~/.bob/skills/<skill-name>/SKILL.md
Workspace (פרויקט):   .bob/skills/<skill-name>/SKILL.md
```

### מתי להשתמש בכל אחד?

| רמה | מיקום | מתי להשתמש |
|-----|--------|-------------|
| **Global** | `~/.bob/skills/` | Skills כלליים — `code-review`, `debug-session`, `security-review` |
| **Workspace** | `.bob/skills/` | Skills ספציפיים — conventions פנימיים, שפה ספציפית, pipeline ייחודי |

### עדיפות (Precedence)

```
Workspace  >  Global  >  Built-in
```

Skill ב-workspace **מנצח בשקט** skill גלובלי עם אותו שם.

**שימוש לטובה:** יש לך `code-review` גלובלי, אבל פרויקט ספציפי דורש Python conventions? צור `code-review` ב-workspace עם הוראות Python — הוא ידרוס את הגלובלי רק בפרויקט הזה.

---

## מה קורה כשיש יותר מדי Skills

### 1. עומס על ה-Context Window

כל Skill שמופעל טוען את ה-`SKILL.md` שלו לתוך ה-context. אם מופעלים **הרבה Skills במקביל**, הם "אוכלים" context שאפשר היה להשתמש בו לקוד, לתוצאות, ולשיח.

```
Context Window = 200,000 tokens (לדוגמה)
Skills פעילים × גודל כל SKILL.md = נאכל מה-context
```

### 2. Activation Noise

Bob מנסה להתאים כל הודעה לכל description של Skill. Skills רבים עם descriptions דומות מגדילים את הסיכוי ל**הפעלה שגויה**.

### 3. Skill Bloat

Skill ענקי (מאות שורות) = בעיה כפולה: נאכל הרבה context + קשה לתחזק.

**הפתרון:** Skill קטן + supporting script שפועל דרך `execute_command`.

### כיצד לנהל Skills בריא

| עקרון | יישום |
|-------|--------|
| כל Skill — דבר אחד בלבד | אל תערבב security-review עם code-review |
| Skills ארוכים → פצל | אם SKILL.md > 100 שורות, שקול לפצל |
| הסר מה שלא בשימוש | Skills מיותרים = noise ועומס |
| Description מדויק | Description ברור = הפעלה נכונה = פחות טעויות |
| Workspace > Global | העבר לגלובלי רק מה שבאמת כולם צריכים |

---

## התנגשויות וסתירות בין Skills

### סוגי התנגשויות

#### 1. התנגשות שמות (Name Collision)

שני Skills עם אותו שם — Workspace מנצח בשקט.

- **בכוונה:** זו פיצ'ר — override של גלובלי עבור פרויקט ספציפי.
- **בתאונה:** זה באג שקשה מאוד לאתר כי אין שגיאה.

**פתרון:** naming convention ברורה + תיעוד אילו skills קיימים.

#### 2. סתירה בהוראות (Instruction Conflict)

דוגמה:
- `code-review` אומר: "תמיד השתמש ב-TypeScript strict mode"
- `refactor-code` אומר: "שמור על הסגנון הקיים גם אם זה JavaScript רגיל"

אם שניהם מופעלים על אותה משימה — המודל מקבל הוראות סותרות ויתנהג בצורה בלתי צפויה.

**פתרון:** הגדר בכל Skill את ה-**scope המדויק** שלו. `code-review` = "רק על קוד חדש". `refactor-code` = "רק כשהמשתמש מבקש refactoring במפורש".

#### 3. Pipeline Conflict

שני Skills שניהם מנסים לבצע `write_file` לאותו קובץ — תוצאה בלתי צפויה ועלולה להיות הרסנית.

**פתרון:** `metadata.disable-model-invocation: true` על Skills "מסוכנים" — הפעלה ידנית בלבד.

### טבלת מניעה

| בעיה | פתרון |
|------|--------|
| שמות זהים בטעות | Naming convention + תיעוד רשימת Skills |
| הוראות סותרות | הגדר scope מדויק בכל skill; אל תחפף |
| הפעלה לא רצויה | `metadata.disable-model-invocation: true` |
| יותר מדי Skills | Global = כלליים; Workspace = ספציפיים; הסר לא בשימוש |
| Skill ענקי | פצל לקטנים + supporting scripts |

---

## Best Practices — סיכום

### ✅ עשה

- כל Skill עושה **דבר אחד** בלבד
- Description ברור עם trigger phrases מדויקים (`"Use when the user wants to..."`)
- שמות ב-`kebab-case` בלבד
- Supporting scripts לעבודה פרוגרמטית
- Global = כלליים; Workspace = ספציפיים
- תעד אילו Skills קיימים ולמה

### ❌ אל תעשה

- אל תכתוב SKILL.md ענקי — פצל
- אל תחפף בין Skills (scope ברור לכל אחד)
- אל תשכח לוודא שמות תקינים (אין uppercase, underscore, spaces)
- אל תכניס Skills גלובליים שרלוונטיים רק לפרויקט ספציפי

---

## TL;DR

```
Skill = זיכרון פרוצדורלי → עקביות → פחות טעויות → AI שעובד כמו Senior Engineer

Skills טובים:   קטנים | ממוקדים | description ברור | scope מוגדר
Skills רעים:    ענקיים | חופפים | descriptions עמומים | ללא scope

Global   ~/.bob/skills/   →  Skills לכל הפרויקטים
Workspace .bob/skills/    →  Skills לפרויקט ספציפי
עדיפות:  Workspace > Global > Built-in

יותר מדי Skills = עומס context + noise + התנגשויות
הפתרון:  מעט Skills ממוקדים > הרבה Skills עמומים
```

---

*תיעוד זה נוצר ב-Bob — IBM Agentic AI*
