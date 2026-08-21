# Bugfix: Partial Save Hidden Behind Generic Error (Company Settings)

**File:** `AdminCompanySettingsPage.jsx`  
**Location:** `saveGeneralMutation` (~lines 65–81)  
**Severity:** Medium / UX  
**Excel Task No.:** 42
**Resolved Date:** 21-08-2026
---

## What was the bug?

Three independent settings upserts ran under a single `Promise.all`:

```javascript
await Promise.all([
  companySettingsApi.upsert("office_address", …),
  companySettingsApi.upsert("google_maps_link", …),
  companySettingsApi.upsert("company_perks", …),
]);
```

If any one request failed, the whole promise rejected — even when the other two had already succeeded.

---

## What issue did it cause?

- UI always showed one generic toast: **“Failed to save general settings”**
- No indication that some fields had actually been saved on the server
- Form looked unchanged; admin might re-edit and overwrite good data
- Cache was not invalidated on partial success, so the page could stay stale until a full reload

---

## Solution implemented

Switch to `Promise.allSettled`, inspect each result, invalidate the cache when anything wrote, and toast with explicit success / partial / failure messaging.

### Where

`AdminCompanySettingsPage.jsx` → `saveGeneralMutation` (`mutationFn` + `onSuccess` / `onError`).

### What changed

**Before:** one `Promise.all` → any failure → generic error, no partial feedback.

**After:**
```javascript
const results = await Promise.allSettled(
  keys.map((key) =>
    companySettingsApi.upsert(key, {
      value: settings[key],
      updated_by: user.id,
    }),
  ),
);

// Classify succeeded vs failed keys…
// Invalidate queries if anything succeeded
// Toast:
//   - all OK      → success
//   - all failed  → generic error
//   - mixed       → “Partially saved (X). Failed: Y.”
```

---

## How it resolves the bug

| Outcome | Before | After |
|---------|--------|-------|
| All 3 succeed | Success toast | Success toast |
| All 3 fail | Generic error | Generic error |
| 2 succeed, 1 fails | Generic error only; silent partial write | Cache refreshed + toast lists what saved vs failed |

Admins see the real outcome, can retry only the failed fields, and the form refetches whatever did save.

---

## Notes

- No API or backend changes required.
- Labels used in the partial toast: “Office address”, “Google Maps link”, “Company perks”.
- `onError` remains as a safety net for unexpected throws outside the settled results.
- WiFi network mutations on the same page are unchanged (single-request paths).