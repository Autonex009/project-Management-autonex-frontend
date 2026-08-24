# Fix: Duplicated Passing-Score Clamp

**Files:** `ModuleView.jsx`, `ModuleSectionCard.jsx`
**Helper:** `clampPassingScore` (shared utility, e.g. `utils/onboarding.js`)
**Severity:** Low — Redundancy
**Excel Task No.:** 100
**Resolved Date:** 24-08-2026

---

## Bug

The passing-score clamp logic was duplicated in multiple locations:

```javascript
Math.max(0, Math.min(100, Number(...) || 0))
```

The same rule was implemented in three places across two files.

| Location                                        | Use                                        |
| ----------------------------------------------- | ------------------------------------------ |
| `ModuleView.jsx` → `handleQuizSubmit`           | Score used to determine pass/fail          |
| `ModuleView.jsx` → `currentPassingScore`        | Display of "Passing score required"        |
| `ModuleSectionCard.jsx` → quiz field `onChange` | Admin input for section passing percentage |

The rule was identical everywhere:

> Clamp the value between `0` and `100`; treat invalid or missing values as `0`.

---

## Impact

* The same formula was maintained in three separate locations across two files.
* Any future change to the clamping rule would require multiple edits.
* The duplicated logic could potentially drift between files.
* The duplication added unnecessary code without changing behaviour.

---

## Solution

### 1. Extract a Shared Helper

Create a reusable utility:

```javascript id="4m4h8j"
clampPassingScore(value)
```

in the shared onboarding utility module, for example:

```text
utils/onboarding.js
```

The helper encapsulates the existing rule:

* Convert the value to a number.
* Clamp the result between `0` and `100`.
* Treat invalid or missing values as `0`.

### 2. Update `ModuleView.jsx`

Replace both existing inline clamp calculations with `clampPassingScore()`:

* `handleQuizSubmit`
* `currentPassingScore`

### 3. Update `ModuleSectionCard.jsx`

Replace the inline clamp in the quiz field `onChange` handler with `clampPassingScore()`.

The original field sources remain unchanged:

* `quiz_passing_score`
* `quizPassingScore`
* Input value

Only the shared calculation is centralized.

---

## Resolution

| Before                                                                      | After                                |
| --------------------------------------------------------------------------- | ------------------------------------ |
| Clamp logic copied in 3 places                                              | One `clampPassingScore` helper       |
| Rule changes require multi-file edits                                       | Rule maintained in a single location |
| Same formula duplicated across `ModuleView.jsx` and `ModuleSectionCard.jsx` | Both files use the shared helper     |
| Behaviour                                                                   | **Unchanged — 0–100, invalid → 0**   |

**The existing behaviour is preserved. Only the duplicated clamp logic has been consolidated.**

---

## Behaviour Preserved

* Passing scores remain clamped between **0 and 100**.
* Invalid or missing values continue to be treated as **0**.
* Quiz pass/fail comparison remains unchanged.
* The admin section editor continues to constrain the passing-score percentage.
* The **"Passing score required"** display remains unchanged.
* Existing field sources and data flow remain unchanged.

---

## Summary

The duplicated passing-score calculation was consolidated into the shared `clampPassingScore(value)` utility.

`ModuleView.jsx` and `ModuleSectionCard.jsx` now use the same helper, providing a single source of truth for passing-score validation while preserving all existing quiz, display, and admin-editor behaviour.
