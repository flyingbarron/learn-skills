# Bob Skills — תיעוד מלא של הפרויקט

> **גרסה:** 2.1
> **עודכן לאחרונה:** 2025
> **מיקום הפרויקט:** `.bob/skills/`
> **ראה גם:** [README.md](../README.md) — סקירה מלאה של מערכת ה-Skill Lifecycle

---

## תוכן עניינים

1. [מבנה הפרויקט](#1-מבנה-הפרויקט)
2. [מהו Skill — תזכורת מהירה](#2-מהו-skill--תזכורת-מהירה)
3. [Skills מותקנים בפרויקט](#3-skills-מותקנים-בפרויקט)
   - [code-awareness](#31-code-awareness)
   - [web-browse](#32-web-browse)
   - [security-review](#33-security-review)
   - [airgap-validator](#34-airgap-validator)
4. [Hooks — אוטומציה ברמת ה-session](#4-hooks--אוטומציה-ברמת-ה-session)
5. [איך מפעילים כל Skill](#5-איך-מפעילים-כל-skill)
6. [Workflow מומלץ — איך לעבוד עם ה-Skills יחד](#6-workflow-מומלץ--איך-לעבוד-עם-ה-skills-יחד)
7. [איך מוסיפים Skill חדש לפרויקט](#7-איך-מוסיפים-skill-חדש-לפרויקט)
8. [שאלות נפוצות](#8-שאלות-נפוצות)

---

## 1. מבנה הפרויקט

```
learn-skills/
├── README.md                                  ← נקודת כניסה ראשית למערכת
├── .bob/
│   ├── settings.json                          ← הגדרות Hooks
│   ├── hooks/
│   │   ├── code-awareness-pre-prompt.mjs      ← UserPromptSubmit hook
│   │   └── security-review-post-write.mjs     ← PostToolUse hook
│   └── skills/
│       ├── install-log.json                   ← לוג התקנות
│       ├── code-awareness/
│       │   ├── SKILL.md
│       │   └── skill-security-verifier.mjs
│       ├── web-browse/
│       │   ├── SKILL.md
│       │   └── web-browse.mjs
│       ├── airgap-validator/
│       │   └── SKILL.md
│       └── security-review/
│           └── SKILL.md
│
└── docs/
    ├── skills-guide.md
    ├── code-awareness-guide.md
    └── skills-documentation.md   ← קובץ זה
```

---

## 2. מהו Skill — תזכורת מהירה

**Skill** = קובץ `SKILL.md` שמנחה את Bob לבצע משימה בצורה עקבית וצעד-אחר-צעד.

```
המשתמש כותב הודעה
        ↓
Bob משווה למה שכתוב ב-description של כל Skill
        ↓
התאמה נמצאה?  → Bob טוען את ה-Skill ופועל לפיו
לא נמצאה?     → Bob פועל ללא Skill (מהניסיון הכללי שלו)
```

### מנגנוני הפעלה

| סוג | כיצד | מתי להשתמש |
|-----|------|-------------|
| **אוטומטי** | Bob מזהה התאמה ל-`description` | ברוב המקרים |
| **ידני** | הקלד `/skill-name` בשיחה | כשרוצים שליטה מדויקת |
| **עם ארגומנט** | `/skill-name [תיאור]` | כשרוצים לכוון את ה-Skill לנושא ספציפי |

### עדיפות (כשיש שמות זהים)

```
Workspace (.bob/skills/)  >  Global (~/.bob/skills/)  >  Built-in
```

---

## 3. Skills מותקנים בפרויקט

### 3.1 `code-awareness`

**קובץ:** [`.bob/skills/code-awareness/SKILL.md`](../.bob/skills/code-awareness/SKILL.md)

**מטרה:** ה-orchestrator המרכזי — מפעיל lifecycle מלא של Skill לכל בקשה.

**מופעל:** אוטומטית דרך ה-Hook על **כל** בקשה. גם ידנית עם `/code-awareness`.

| שלב | מה קורה |
|-----|---------|
| 1 | מסווג סוג המשימה (`feature`, `db`, `security`, `pipeline`, ...) |
| 2 | סורק סיכונים רלוונטיים בלבד |
| 3 | בודק Skills מקומיים → מחפש ברשת (3 זוויות) → מוריד/מייצר |
| 4 | מריץ security scan + integrity verify לפני כל התקנה |
| 5 | מפיק דוח מסכם |

---

### 3.2 `web-browse`

**קובץ:** [`.bob/skills/web-browse/SKILL.md`](../.bob/skills/web-browse/SKILL.md)

**מטרה:** חיפוש, שליפה, ורנקינג של Skills ממקורות חיצוניים.

```bash
node .bob/skills/web-browse/web-browse.mjs search "<query>"
node .bob/skills/web-browse/web-browse.mjs fetch "<url>"
node .bob/skills/web-browse/web-browse.mjs rank "<owner/repo>"
```

**תכונות:** DuckDuckGo + GitHub fallback, credential pre-flight, retry עם backoff, cache 15 דק'.

---

### 3.3 `security-review`

**קובץ:** [`.bob/skills/security-review/SKILL.md`](../.bob/skills/security-review/SKILL.md)

**מטרה:** בדיקת אבטחה ל-6 קטגוריות: Secrets, Injection, Auth, Web, Dependencies, Privacy.

**Trigger:** `"בצע security review"` / `"check for vulnerabilities"` / `"בדוק חולשות אבטחה"`

---

### 3.4 `airgap-validator`

**קובץ:** [`.bob/skills/airgap-validator/SKILL.md`](../.bob/skills/airgap-validator/SKILL.md)

**מטרה:** בדיקת artifacts לפני deploy בסביבה ללא אינטרנט — IPv4, tunneling, unauthorized URLs, credentials, remote-exec.

```bash
node .bob/skills/code-awareness/skill-security-verifier.mjs <path>
```

---

## 4. Hooks — אוטומציה ברמת ה-session

| Hook | Event | מה הוא עושה |
|------|-------|-------------|
| `code-awareness-pre-prompt.mjs` | `UserPromptSubmit` | מזריק PRE-TASK AWARENESS GATE + 300 תווים ראשונים של הבקשה לפני כל עיבוד |
| `security-review-post-write.mjs` | `PostToolUse` (write/edit tools) | סורק כל קובץ שנכתב, מוסיף findings כ-context אם קיימים |

```json
{
  "hooks": {
    "UserPromptSubmit": [{ "hooks": [{ "type": "command", "command": "node .bob/hooks/code-awareness-pre-prompt.mjs" }] }],
    "PostToolUse": [{
      "matcher": "^(write_file|apply_diff|search_and_replace|insert_content)$",
      "hooks": [{ "type": "command", "command": "node .bob/hooks/security-review-post-write.mjs" }]
    }]
  }
}
```

---

## 5. איך מפעילים כל Skill

### `code-awareness` (אוטומטי על כל בקשה)
```bash
/code-awareness
/code-awareness "הוספתי endpoint חדש"
```

### `security-review`
```bash
/security-review
/security-review src/auth/login.ts
"check for vulnerabilities in the auth module"
```

### `web-browse`
```bash
node .bob/skills/web-browse/web-browse.mjs search "some-skill SKILL.md github IBM"
node .bob/skills/web-browse/web-browse.mjs rank "IBM/some-repo"
```

### `airgap-validator`
```bash
node .bob/skills/code-awareness/skill-security-verifier.mjs <path-to-artifact>
```

---

## 6. Workflow מומלץ — איך לעבוד עם ה-Skills יחד

```
1. תאר את המשימה ל-Bob
   ↓ [Hook מזריק gate אוטומטית]
2. code-awareness סורק + מחפש + מתקין Skill מתאים
3. Skill מבצע את המשימה
   ↓ [PostToolUse hook סורק קבצים שנכתבו]
4. אם נמצאו findings → Bob מדווח, אתה מחליט
5. Push / PR ✅
```

---

## 7. איך מוסיפים Skill חדש לפרויקט

### אוטומטי (מומלץ)
```
"אני צריך skill שבודק migrations של DB"
```
`code-awareness` יחפש, ימצא, ויתקין — או ייצר אם לא קיים.

### ידני

```bash
mkdir .bob/skills/my-new-skill
# צור SKILL.md עם frontmatter + description + steps
node .bob/skills/code-awareness/skill-security-verifier.mjs .bob/skills/my-new-skill/SKILL.md
# פתח שיחה חדשה
```

**חוק שמות:** `^[a-z0-9]+(-[a-z0-9]+)*$`

---

## 8. שאלות נפוצות

### ש: האם Skill מופעל אוטומטית כשאני כותב קוד, גם בלי לבקש?

**Skills** — לא. ה-Skill מתאם מול מה שהמשתמש **כותב בשיחה**.
**Hooks** — כן. ה-`security-review-post-write.mjs` סורק כל קובץ שנכתב.

---

### ש: האם שני Skills יכולים להתנגש?

**כן, בשלושה מקרים:**

| מקרה | פתרון |
|------|--------|
| שמות זהים | Workspace מנצח; ודא שזה בכוונה |
| הוראות סותרות | הגדר scope ברור לכל skill |
| Pipeline conflict | `disable-model-invocation: true` |

---

### ש: הכנסתי SKILL.md אבל ה-Skill לא עובד. מה קרה?

1. שם התיקייה תקין? (`^[a-z0-9]+(-[a-z0-9]+)*$`)
2. `name` בפרונטמאטר תואם לשם התיקייה?
3. פתחת שיחה חדשה?
4. ה-`description` ברור מספיק? (נסה `/skill-name` ידנית)

---

*תיעוד זה מתעדכן ידנית. בכל הוספת Skill — עדכן סעיפים 3 ו-5.*
