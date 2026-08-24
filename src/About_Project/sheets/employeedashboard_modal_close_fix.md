# Fix: Edit Modal Closed Before Email Change Completes

**File:** `EmployeeDashboard.jsx`
**Functions:** `handleSave`, `saveMutation`
**Severity:** Medium — UX / Bug
**Excel Task No.:** 54
**Resolved Date:** 24-08-2026

---

## Bug

`handleSave` initiated two independent mutations when saving the employee profile:

1. **Profile save** (`saveMutation`) — updates phone, skills, Slack ID, and Encord ID.
2. **Email change** (`changeEmailMutation`) — runs only when the login email has actually changed.

The `saveMutation.onSuccess` handler always called:

```javascript id="1m1qsk"
setIsEditing(false);
```

This caused the edit modal to close as soon as the profile save succeeded, even when the email-change mutation was still pending or later failed.

---

## Impact

* **Email errors were hidden:** If the email-change request failed, the modal had already closed, preventing the user from seeing `emailError`.
* **False sense of success:** The UI appeared to indicate that the entire profile was saved while the email update could still be pending or could have failed.
* **No immediate recovery path:** The user had to reopen the Edit form to discover and correct an email update failure.
* **Poor transaction-like UX:** The modal did not reflect the completion state of all operations initiated by a single Save action.

---

## Solution

### 1. Stop Closing the Modal from `saveMutation`

Remove:

```javascript id="z7t4kn"
setIsEditing(false);
```

from `saveMutation.onSuccess`.

Keep the existing:

* Query invalidation.
* `saveError` clearing.

The profile mutation should no longer independently control the modal's visibility.

### 2. Coordinate Close Timing in `handleSave`

Determine once whether an email update is required:

```javascript id="f2q8hd"
shouldChangeEmail
```

Then coordinate the operations as follows:

1. Run the profile save first.
2. After profile save succeeds:

   * If an email change is required, start `changeEmailMutation`.
   * Close the modal only from the email mutation's `onSuccess`.
3. If no email change is required, close the modal immediately after profile save succeeds.
4. If either operation fails, keep the modal open so the relevant error remains visible.

This makes `handleSave` responsible for determining when the complete Save operation has finished successfully.

---

## Resolution

| Before                                                                          | After                                                                          |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Modal closed as soon as profile save succeeded                                  | Modal closes only after profile success **and** email success, when applicable |
| Email failure could occur after the modal closed                                | Email error remains visible in the open modal                                  |
| `setIsEditing(false)` lived inside `saveMutation.onSuccess`                     | Modal close is controlled by `handleSave` / email mutation success             |
| Profile and email operations ran independently without close-state coordination | Profile runs first, followed by email when required                            |
| Save UI could indicate completion while email was pending                       | Modal remains open until all required operations complete successfully         |

**Profile and email APIs, validation, and button disabled state remain unchanged. Only the modal close timing is fixed.**

---

## Behaviour Preserved

* Profile fields — phone, skills, Slack ID, and Encord ID — continue to save through the same mutation.
* Email changes only when the email is:

  * Valid.
  * Different from the current email.
  * Ending with `@autonexai360.com`.
* `changeEmailMutation` continues to update `localStorage` on success.
* `changeEmailMutation` continues to invalidate the relevant queries on success.
* The Save button remains disabled while either mutation is pending.
* Cancel behaviour remains unchanged.
* Modal close/cancel behaviour remains unchanged when the user explicitly cancels.

---

## Summary

The edit modal previously closed as soon as the profile save succeeded, which could hide a pending or failed email-change operation.

Modal close responsibility was moved out of `saveMutation.onSuccess` and into the coordinated `handleSave` flow. The modal now remains open until all required save operations succeed.

This ensures that email errors remain **visible and actionable** without requiring the user to reopen the edit form.
