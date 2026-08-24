# Fix: Dead / Confusing Request Fields in Perf Eval API

**File:** `app/api/perf_evals.py`
**Schemas:** `PerfEvalCreate`, `PerfEvalReview`
**Severity:** Low
**Excel Task No.:** 116
**Resolved Date:** 24-08-2026

## Bug

`submitted_by` and `reviewed_by` were accepted in the request schemas:

```python
PerfEvalCreate.submitted_by: Optional[int] = None
PerfEvalReview.reviewed_by: Optional[int] = None
```

Both values were always ignored and overridden server-side using the authenticated session:

```python
submitted_by=current_user.id  # create_eval
ev.reviewed_by = current_user.id  # review_eval
```

Clients could send these fields, but the server never used the submitted values.

## Impact

* **Confusing API surface:** Fields appeared in OpenAPI/documentation but had no effect.
* **Dead input:** Validation accepted values that were subsequently discarded.
* **Mild security smell:** Clients could believe they controlled audit fields such as who submitted or reviewed an evaluation.

## Solution

* Remove `submitted_by` from `PerfEvalCreate`.
* Remove `reviewed_by` from `PerfEvalReview`.
* Keep both fields only on `PerfEvalResponse` as read-only audit data.
* Keep the existing handlers unchanged because they already set these values from `current_user.id`.

## Resolution

| Before                               | After                                                      |
| ------------------------------------ | ---------------------------------------------------------- |
| Fields accepted in request schemas   | Fields removed from request schemas                        |
| Values always overridden server-side | Same — values are still set from the authenticated session |
| Confusing / dead API surface         | Clean API surface with audit fields only on the response   |
| Clients could send unused values     | Clients can no longer send unnecessary audit fields        |

## Behaviour Preserved

* `submitted_by` is always set to the authenticated user when creating an evaluation.
* `reviewed_by` is always set to the authenticated user when reviewing an evaluation.
* `PerfEvalResponse` continues to return both audit fields.
* No changes to status flow.
* No changes to ratings.
* No changes to notifications.
* Existing frontend payloads that previously included these fields remain functionally safe because the server never used their values.

## Summary

The request schemas were cleaned up by removing `submitted_by` and `reviewed_by` because these fields are controlled exclusively by the authenticated server session.

This is an **API schema cleanup only**. Stored values, response data, authentication-based audit behaviour, and all existing functionality remain unchanged.
