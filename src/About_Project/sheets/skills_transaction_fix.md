# Fix: Skill Create/Delete and Audit in Separate Transactions

**File:** `app/services/skill.py` (+ skill create/delete API callers)
**Functions:** `create_skill`, `delete_skill`
**Severity:** Low — Transaction
**Excel Task No.:** 113
**Resolved Date:** 24-08-2026

---

## Bug

`create_skill` and `delete_skill` called `db.commit()` directly inside the service layer.

The API then wrote an audit log and committed again, resulting in **two separate transactions**.

If the audit insert failed after the skill operation had already been committed, the skill change remained persisted **without an audit trail**.

---

## Impact

* **Unaudited skills possible:** A skill could be created or deleted without a corresponding audit record if the audit operation failed.
* **Non-atomic domain change and audit:** The skill operation and its audit entry were not part of the same transaction.
* **Audit design violation:** The domain operation and audit record should use the same database session and be committed together.

---

## Solution

### 1. Service Layer

Replace `db.commit()` with `db.flush()` in:

* `create_skill`
* `delete_skill`

`flush()` ensures that:

* Newly created skill IDs are assigned.
* Deletes are staged in the current transaction.
* No transaction is committed inside the service helper.

### 2. API Layer

After the skill operation:

1. Call `audit_service.record(...)`.
2. Perform **one `db.commit()`** for both the skill operation and audit record.

This makes the skill change and audit entry part of the same database transaction.

### 3. Other Callers

Any other caller of `create_skill` or `delete_skill` must explicitly commit the session when it needs the change persisted.

This keeps transaction ownership with the caller rather than the service helper.

---

## Resolution

| Before                                     | After                                             |
| ------------------------------------------ | ------------------------------------------------- |
| Skill operation commits independently      | Skill operation is only flushed                   |
| Audit is committed separately              | Audit is added to the same session                |
| Audit failure can leave an unaudited skill | Audit failure rolls back the skill change with it |
| Two separate transactions                  | **One transaction**                               |
| Service helper owns the commit             | Caller owns the commit                            |

This matches the `audit_service.record` design: **the same database session is used and no commit occurs inside the helper; the caller owns the transaction commit.**

---

## Behaviour Preserved

* Skill is still created or deleted with the same fields.
* `create_skill_if_not_exists` remains unchanged in behaviour and inherits the no-commit create operation.
* Audit records are still created with the same actor, action, entity, and summary information.
* Response shapes remain unchanged.
* HTTP status codes remain unchanged.
* A failed audit operation can no longer leave behind a permanently persisted unaudited skill.

---

## Summary

The skill create/delete operations were changed from committing inside the service layer to flushing within the current transaction.

The API now records the audit entry and performs a **single commit** for both the domain change and audit record. This ensures that the skill operation and its audit trail succeed or fail together.
