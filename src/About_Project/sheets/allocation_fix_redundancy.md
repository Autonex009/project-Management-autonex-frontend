# Fix: Duplicated Allocation Response Dict

**File:** `app/api/allocations.py`
**Functions:** `enrich_allocation_response`, `get_allocations`
**Severity:** Low — Redundancy
**Excel Task No.:** 117
**Resolved Date:** 24-08-2026

---

## Bug

The same **18-field allocation response dictionary** was built in two places:

1. `enrich_allocation_response` — used by create, update, by-project, and by-employee endpoints.
2. Inline loop inside `get_allocations` — used by the list-all endpoint, which already performs batch loading.

Any field addition, rename, or default-value change required editing both copies.

---

## Impact

* **Code drift risk:** One copy could get out of sync with the other.
* **Harder maintenance:** The same response shape was defined twice in the same file.
* **Unnecessary duplication:** Both implementations produced the same response structure without any behavioural difference.

---

## Solution

### 1. Create a Single Response Builder

Extract:

```python
_allocation_to_dict(allocation, employee, sub_project)
```

as the **single source of truth** for the allocation response shape.

### 2. Update `enrich_allocation_response`

Keep `enrich_allocation_response` as a thin wrapper that:

1. Performs its existing employee and project lookups.
2. Passes the resolved objects to `_allocation_to_dict`.
3. Returns the resulting response dictionary.

### 3. Update `get_allocations`

Replace the duplicated inline response dictionary with:

```python
_allocation_to_dict(allocation, emp, proj)
```

using the employee and project objects from the existing batch-loaded maps.

This preserves the existing batch-loading approach and does **not** introduce N+1 queries.

---

## Resolution

| Before                                                        | After                                                   |
| ------------------------------------------------------------- | ------------------------------------------------------- |
| Identical 18-field dictionary defined in 2 places             | One `_allocation_to_dict` response builder              |
| Field changes required edits in multiple locations            | Response shape updated in a single place                |
| `get_allocations` uses an inline response dictionary          | `get_allocations` uses `_allocation_to_dict`            |
| `get_allocations` uses batch-loaded employee/project maps     | Unchanged — still batch-loaded with no N+1              |
| Create / update / by-* paths use `enrich_allocation_response` | Unchanged — wrapper now delegates to the common builder |

**Response shape and behaviour remain unchanged. Only the redundancy has been removed.**

---

## Behaviour Preserved

* All 18 response fields and their defaults.
* `project_id` backward-compatibility alias.
* `employee_name` enrichment.
* `project_name` enrichment.
* `sub_project_name` enrichment.
* Batch loading in `get_allocations` with no N+1 queries.
* Single-row lookup path through `enrich_allocation_response`.
* Create, update, by-project, and by-employee callers remain unchanged.

---

## Summary

The duplicated allocation response dictionary was consolidated into `_allocation_to_dict()` to provide a **single source of truth** for the allocation response structure.

No API response fields, values, defaults, query behaviour, or endpoint functionality were changed. The fix only improves maintainability and eliminates the risk of the two response-building implementations drifting apart.
