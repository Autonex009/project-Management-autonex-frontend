# Fix: N+1 Queries in Replacement Candidate Lookup

**File:** `app/services/recommendation_service.py`
**Function:** `_find_replacement_candidates`
**Severity:** LowPerf / N+1
**Excel Task No.:** 115
**Resolved Date:** 24-08-2026

## Bug

`_find_replacement_candidates` loaded all active candidate employees and then queried active allocations inside a loop for each candidate.

Each iteration issued an additional database query:

```python
current_allocations = self.db.query(Allocation).filter(
    Allocation.employee_id == candidate.id,
    Allocation.is_active == True
).all()
```

This resulted in **1 + N database queries for N candidates**.

Since the function is called once per employee on leave, the query cost could multiply further.

## Impact

* Slow response time as the employee/candidate count grows.
* Unnecessary database load on capacity/recommendation endpoints.
* The same allocation data was fetched repeatedly instead of being loaded once.

## Solution

The N+1 query pattern was replaced with bulk loading and in-memory processing:

1. Load all relevant candidate employees in a single query.
2. Load all active allocations for those candidates in a single query using `WHERE employee_id IN (...)`.
3. Group allocations in memory by `employee_id` using `defaultdict`.
4. Calculate available hours and skill matches in pure Python without additional database queries.
5. Keep the existing sorting and top-5 candidate limit unchanged.

## Resolution

| Before                                   | After                                      |
| ---------------------------------------- | ------------------------------------------ |
| `1 + N` queries                          | **2 queries total**                        |
| Database query inside per-candidate loop | Bulk allocation query + in-memory grouping |
| Allocation data fetched repeatedly       | Allocation data fetched once               |
| Per-candidate DB lookup                  | In-memory allocation lookup                |
| Return shape                             | **Unchanged**                              |
| Skill / capacity rules                   | **Unchanged**                              |

## Behaviour Preserved

The following behaviour remains unchanged:

* **Skill matching:** Case-insensitive matching against `project.required_expertise`.
* **Available hours:** `max_capacity - sum(total_daily_hours or 8)`.
* **Capacity source:** `candidate.working_hours_per_day` or `8`.
* **Candidate filter:** Only candidates with `available_hours > 0` are considered.
* **Sorting:** Skill match ratio descending, then available hours descending.
* **Limit:** Top 5 candidates.
* **Returned dictionary fields:** Unchanged.

## Result

The implementation removes the N+1 query pattern while preserving the existing business logic, candidate selection rules, sorting, and response structure.

**Database queries:** `1 + N` → **2 queries total**

**Public behaviour and results remain unchanged. Only the database query pattern has been optimized.**
