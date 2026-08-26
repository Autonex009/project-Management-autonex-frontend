# Fix: N+1 Queries in Employee Allocation Status

**File:** `app/services/allocation_validator.py`  
**Functions:** `get_all_employees_allocation_status`, `get_employee_allocation_status`  
**Severity:** LowPerf / N+1
**Excel Task No.:** 114
**Resolved Date:** 21-08-2026

---

## Bug

`get_all_employees_allocation_status` loaded all employees, then called `get_employee_allocation_status` **inside a loop** for each one.

Each call issued two extra DB queries:

1. Re-fetch the employee by ID  
2. Fetch that employee’s active allocations  

**Result:** ~2N + 1 queries for N employees.

---

## Impact

- Slow response as employee count grows  
- Unnecessary DB load on a frequently used status endpoint  
- Same data fetched repeatedly instead of once  

---

## Solution

1. Load all relevant employees in **one query**.  
2. Load all active allocations for those employees in **one query** (`WHERE employee_id IN (...)`).  
3. Group allocations in memory by `employee_id`.  
4. Compute status in pure Python (no extra queries).

`get_employee_allocation_status` now accepts optional pre-loaded `employee` and `allocations`. Existing single-employee callers are unchanged.

---

## Resolution

| Before              | After                          |
|---------------------|--------------------------------|
| 1 + 2N queries      | **2 queries total**            |
| Per-employee loop   | Bulk load + in-memory group    |
| Return shape        | Unchanged                      |
| Status rules        | Unchanged                      |

Public API and results stay the same. Only the query pattern changed.

---

## Behaviour Preserved

- Status thresholds: `0` → unallocated, `≥ capacity` → full, else partial  
- Capacity: `working_hours_per_day or 8`  
- “Current” allocation filter (active + date overlap with today)  
- Returned dict fields and bulk grouping keys  
- Single-employee call signature (new args are optional)