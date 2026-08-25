# Bugfix: Double-Booking Check Skipped on Allocation Update

**File:** `app/api/allocations.py`  
**Function:** `update_allocation`  
**Severity:** High  
**Excel Task No.:** 22
**Resolved Date:** 21-08-2026

---

## What was the bug?

The double-booking re-check inside `update_allocation` only ran when the request body contained a new `total_daily_hours` value:

```python
if data.total_daily_hours:
    booking_check = check_double_booking(...)
```

If the caller changed only the project, date range, or employee (hours unchanged), the check was skipped entirely.

---

## What issue did it cause?

An employee could be silently over-allocated.

**Example:**
- Employee already has 6 h/day on Project X for next month.
- PM moves a 4 h/day allocation from Project Y onto the same dates (or extends the date range so the periods overlap).
- Hours stay at 4 → condition is false → no overlap check.
- Update succeeds → employee is now booked 10 h/day with no 409 Conflict and no override required.

**Side effects:**
- Capacity / staffing numbers become incorrect
- Leave & availability calculations are wrong
- UI shows people as available when they are overbooked
- Audit log records a normal update with no overbooking warning

The create path always validated; only the update path had this hole.

---

## Solution implemented

Always run the double-booking check on every update. Resolve the final values (new or existing) for employee, hours, start date, and end date, then call `check_double_booking` with those values. Still respect the existing `override_flag`.

### Where the change was made

`app/api/allocations.py` → `update_allocation` (the block that previously gated the check on `if data.total_daily_hours`).

### What changed

**Before:**
```python
if data.total_daily_hours:
    booking_check = check_double_booking(
        db=db,
        employee_id=data.employee_id or allocation.employee_id,
        new_hours=data.total_daily_hours,
        active_start=data.active_start_date or allocation.active_start_date,
        active_end=data.active_end_date or allocation.active_end_date,
        exclude_allocation_id=allocation_id
    )
    ...
```

**After:**
```python
# Always re-validate on update — moving project/dates/employee
# without changing hours can still create overlaps.
resolved_employee_id = data.employee_id if data.employee_id is not None else allocation.employee_id
resolved_hours = (
    data.total_daily_hours
    if data.total_daily_hours is not None
    else (allocation.total_daily_hours or 8)
)
resolved_start = (
    data.active_start_date
    if data.active_start_date is not None
    else allocation.active_start_date
)
resolved_end = (
    data.active_end_date
    if data.active_end_date is not None
    else allocation.active_end_date
)

booking_check = check_double_booking(
    db=db,
    employee_id=resolved_employee_id,
    new_hours=resolved_hours,
    active_start=resolved_start,
    active_end=resolved_end,
    exclude_allocation_id=allocation_id,
)

override_flag = (
    data.override_flag
    if data.override_flag is not None
    else allocation.override_flag
)
if booking_check.get("is_overbooked") and not override_flag:
    raise HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail={
            "message": booking_check["message"],
            "requires_override": True,
            "booking_details": booking_check,
        },
    )
```

---

## How it resolves the bug

| Scenario | Before | After |
|----------|--------|-------|
| Hours changed | Checked | Checked |
| Only dates changed | **Skipped** | Checked |
| Only project changed | **Skipped** | Checked |
| Only employee changed | **Skipped** | Checked |
| Override flag set | Allowed | Allowed |

Every update now validates the final combination of employee + hours + date range against all other active allocations (excluding the row being updated). Overbooking is blocked unless an explicit override is provided — same behaviour as create.

---

## Notes

- Uses explicit `is not None` checks so a legitimate `0`/empty value is not treated as “not provided”.
- Matches the resolution pattern already used by the leave-conflict check a few lines below.
- No schema or model changes required.
- No other files need updates for this fix.