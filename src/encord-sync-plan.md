# Encord Historical Sync Feature Plan

## Overview
This document outlines the implementation plan for adding a manual "Sync History" feature to the Employee Dashboard. This feature allows Employees, PMs, and Admins to sync a specific user's past Encord data.

## The New Approach: Targeted Period Syncing
Instead of a blind 180-day backfill, the sync feature will allow the user to select exactly which month they want to sync. This approach is significantly more accurate, faster, and gives the user total control.

### 4 Core Optimizations (Reliability First)

1. **Targeted Month Selection:**
   - When clicking "Sync", the user will be presented with options: **Current Month**, **Last Month**, or **Custom Month**.
   - The backend will strictly bound the Encord API query to the selected time range. 

2. **Smart Time-Windowing (Delta Sync within the Period):**
   - Even within the selected month, the backend will check the `encord_daily_time_spent` table to see which days we *already* have data for.
   - It will only fetch the missing days in that month, minimizing unnecessary API calls.

3. **Asynchronous Background Jobs (ARQ/Redis):** 
   - The sync process will NOT run inline with the HTTP request. 
   - Clicking the sync button will enqueue a background job and return a `job_id`. The frontend will poll this ID to show a loading state, completely preventing 504 Gateway Timeouts.

4. **Spam Prevention & Global Locking:**
   - If a sync is actively running for User A, the sync feature will be globally locked for User A. 
   - This prevents users from clicking the button multiple times and flooding the Redis queue.

---

## 1. Database Architecture

We will use a table to track all sync operations. *(Note: The `EncordSyncLog` model has already been added to the backend codebase).*

**Table:** `encord_sync_logs`
* `id`: String UUID (Primary Key)
* `employee_id`: Integer (Foreign Key to employees.id)
* `synced_by_id`: Integer (Foreign Key to employees.id - who clicked the button)
* `status`: Enum (`in_progress`, `success`, `failed`)
* `date_range`: String (e.g., "Current Month: August 2026")
* `records_upserted`: Integer (How many rows were updated/added)
* `created_at`: DateTime
* `completed_at`: DateTime (nullable)

---

## 2. Backend Implementation (FastAPI)

**A. API Endpoints:**
* `POST /api/employee/{employee_id}/encord-sync`: 
  Accepts a JSON payload like `{"period": "current_month"}` or `{"period": "custom", "month": "2026-07"}`. Checks for active locks. Enqueues the sync job to Redis ARQ and creates an `in_progress` log entry.
* `GET /api/employee/{employee_id}/encord-sync/status/{job_id}`:
  Checks the job status for frontend polling.
* `GET /api/employee/{employee_id}/encord-sync-logs`:
  Returns the history of previous syncs for the modal.

**B. Background Worker Service:**
* Create a dedicated `run_user_sync` function.
* Calculate the exact start and end dates based on the requested period (e.g., Aug 1 to Aug 31).
* Calculate the missing time gaps within that month.
* Fetch data from Encord (staggered by 0.5s if chunking is needed).
* Upsert matching data to `encord_daily_time_spent`.
* Update the `encord_sync_logs` record to `success` or `failed` and log `records_upserted`.

---

## 3. Frontend Implementation (React)

**A. UI Elements in `EmployeeDashboard.jsx`:**
* **"Sync History" Button:** Displays a Refresh icon. When clicked, opens a small popover or modal.
* **Period Selector:** Allows choosing "Current Month", "Last Month", or "Custom Month" (via a month picker).
* **"View Logs" Button:** Displays a List icon to view past syncs.

**B. Logic & Notifications:**
* Implements React Query `useMutation` to trigger the sync and poll the status endpoint until complete.
* **Toast Notifications:** 
  * If `records_upserted > 0`: Show a success toast (e.g., "Successfully synced 5 new records!").
  * If `records_upserted == 0`: Show an info toast: **"No new data available for this period."**
* Invalidates the dashboard analytics cache upon success so the UI updates instantly.

**C. Sync Logs Modal:**
* A popup modal that displays a table of the user's past syncs, showing:
  * Date/Time of Sync
  * Status (Spinning icon, Green Check, Red X)
  * Records Added
  * Range Fetched
