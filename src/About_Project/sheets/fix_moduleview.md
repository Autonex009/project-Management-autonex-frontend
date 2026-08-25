# Fix: Duplicated Current-Section Index Logic

**File:** `ModuleView.jsx` (onboarding)
**Locations:** ~lines 48–56 and ~124–129
**Severity:** Low — Redundancy
**Excel Task No.:** 99
**Resolved Date:** 24-08-2026

---

## Bug

The **current section index** calculation was implemented twice using nearly identical logic:

1. **Before early returns** — `safeCurrentIndex` / `safeActiveSectionIndex`, required for cleanup `useEffect` dependencies.
2. **After loading/error checks** — `currentIndex` / `activeSectionIndex`, used during rendering.

Both implementations calculated the same rule:

> Select the first incomplete section, or select the last section if all sections are completed.

---

## Impact

* The same logic was maintained in two separate locations.
* Any future change to the active-section rule would require updating both implementations.
* The duplicated calculation added unnecessary code noise without providing any behavioural benefit.
* There was a risk that the two implementations could eventually drift apart.

---

## Solution

### 1. Extract a Common Helper

Create:

```javascript
getActiveSectionIndex(sections, completedSections)
```

This helper becomes the **single source of truth** for determining the active section index.

### 2. Use the Helper Before Early Returns

Use `getActiveSectionIndex()` for the pre-return safe values:

* `safeActiveSectionIndex`
* `safeCurrentSectionId`

This preserves the existing hooks-before-return pattern and ensures cleanup `useEffect` dependencies continue to work correctly.

### 3. Use the Helper After Early Returns

Use the same helper for the render-time values:

* `activeSectionIndex`
* `currentSection`

This removes the duplicated index calculation while keeping the existing rendering flow unchanged.

---

## Resolution

| Before                                           | After                              |
| ------------------------------------------------ | ---------------------------------- |
| Active-section index logic copied in two places  | One `getActiveSectionIndex` helper |
| Rule changes require edits in multiple locations | Rule maintained in a single place  |
| Pre-return safe calculation                      | Uses the common helper             |
| Post-return render calculation                   | Uses the common helper             |
| Hooks-before-return pattern                      | **Unchanged**                      |
| UI and navigation behaviour                      | **Unchanged**                      |

**Response and UI behaviour remain the same. Only the duplicated calculation has been removed.**

---

## Behaviour Preserved

* The **first incomplete section** remains active.
* If **all sections are complete**, the last section remains active.
* The cleanup `useEffect` continues to use the active section ID.
* Sidebar navigation continues to use the same active index.
* Tabs continue to use the same active index.
* Quiz navigation continues to use the same active index.
* Section navigation behaviour remains unchanged.
* Hooks continue to execute before early returns.

---

## Summary

The duplicated current-section index calculation in `ModuleView.jsx` was consolidated into `getActiveSectionIndex(sections, completedSections)`.

The helper is now used both before early returns and during rendering, providing a single source of truth while preserving the existing hooks, navigation flow, and UI behaviour.
