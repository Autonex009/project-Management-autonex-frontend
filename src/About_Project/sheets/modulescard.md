# Bugfix: Invalid correctIndex on Excel Quiz Import

**File:** `ModuleSectionCard.jsx` (or equivalent path under components)  
**Location:** `handleQuizFileImport` — Excel row mapping (~lines 110–121)  
**Severity:** Medium  
**Excel Task No.:** 41
**Resolved Date:** 21-08-2026

---

## What was the bug?

When importing quiz questions from Excel, the correct answer index was parsed with no validation:

```javascript
correctIndex: parseInt(row.correctOption?.toString() || "1") - 1,
```

There was no check for:
- Non-numeric values → `NaN`
- Out-of-range values (e.g. `0`, `5`, `-1`)
- Empty or missing cells

Malformed rows silently produced an invalid grading index.

---

## What issue did it cause?

- Quiz questions could store `correctIndex` as `NaN` or outside `0–3`
- Grading marked the wrong option (or no option) as correct
- Candidates could pass/fail incorrectly with no visible error on import
- Hard to spot in the UI until someone took the quiz

---

## Solution implemented

Parse the Excel value safely, default when invalid, and clamp to a valid option index.

### Where

`handleQuizFileImport` inside `ModuleSectionCard.jsx` — the `.map()` that builds `newQuestions` from sheet rows.

### What changed

**Before:**
```javascript
correctIndex: parseInt(row.correctOption?.toString() || "1") - 1,
```

**After:**
```javascript
const options = [
  row.option1?.toString() || "",
  row.option2?.toString() || "",
  row.option3?.toString() || "",
  row.option4?.toString() || "",
];
// Excel uses 1-based correctOption. Guard against NaN / out-of-range.
const raw = parseInt(String(row.correctOption ?? "1").trim(), 10);
const oneBased = Number.isFinite(raw) ? raw : 1;
const correctIndex = Math.max(
  0,
  Math.min(options.length - 1, oneBased - 1),
);
```

---

## How it resolves the bug

| Input (`correctOption`) | Before | After |
|-------------------------|--------|-------|
| `1`–`4` | Valid index | Valid index |
| Missing / empty | `NaN` or wrong | Defaults to index `0` |
| `"abc"` / non-numeric | `NaN` | Defaults to index `0` |
| `0`, `5`, `-1`, `99` | Invalid index | Clamped to `0`–`3` |

Every imported question now has a `correctIndex` that always points at a real option. Grading stays consistent with the UI (four options, indices 0–3).

---

## Notes

- Excel template still uses **1-based** option numbers (`1` = first option).
- Default when invalid is option 1 (index `0`) — same as the previous soft default of `"1"`.
- No backend or API changes required.
- Only the Excel import path is affected; manually added questions already set a valid `correctIndex`.