# Bugfix: N+1 Queries in Project List Enrichment

**File:** `app/api/projects.py` (sub-projects router)  
**Location:** `enrich_project_response` call sites in list / paginated endpoints  
**Severity:** Medium / Performance  
**Excel Task No.:** 50
**Resolved Date:** 21-08-2026

---

## What was the bug?

`list_projects` and `list_projects_paginated` called `enrich_project_response(db, p)` **once per project**. Each call ran its own queries for:

- Allocations for that project  
- Employee designations  
- Approved leaves (for capacity)  
- Employee names for PMs / team leads  

That produced **O(projects × queries)** on every list load.

---

## What issue did it cause?

- Slow list and paginated responses as the roster grew  
- Unnecessary DB load (same allocation/employee/leave data fetched repeatedly)  
- KPI already used a batched path (`bulk_compute_capacity`); list endpoints did not  

Create/update (single project) were fine; only multi-project list paths were affected.

---

## Solution implemented

Added `enrich_projects_bulk(db, projects)` that loads allocations, employees, and leaves **once** for the whole set, then builds the same response shape in memory.

### Where

| Place | Change |
|-------|--------|
| After `enrich_project_response` | New `enrich_projects_bulk` |
| `list_projects` return | `enrich_projects_bulk(db, projects)` |
| `list_projects_paginated` (non-dashboard) | `enrich_projects_bulk(db, paginated_projects)` |

**Unchanged:** create/update still use `enrich_project_response`; KPI still uses `bulk_compute_capacity`; dashboard slim payload unchanged.

---

## How it resolves the bug

| Endpoint | Before | After |
|----------|--------|--------|
| `GET /` (list) | ~4 queries × N projects | ~3–4 queries total |
| `GET /paginated` | ~4 queries × page size | ~3–4 queries total |
| Create / update | Single-project enrich | Unchanged |
| KPI | Already batched | Unchanged |

Response fields stay the same (`capacity`, PM/TL counts, names, ids), so the UI does not need changes.

---

## Notes

- Leave filter uses status `"approved"` (same as the single enricher).  
- Allocations with `active_end_date < today` are still treated as stale.  
- Empty project list returns `[]` without querying.  
- Scope filtering still happens **before** enrich; bulk only enriches the already-visible set.