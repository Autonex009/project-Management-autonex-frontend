# Frontend Dashboard Architecture & Optimizations

## Overview
The `Dashboard.jsx` page serves as the main administrative overview of the PM Portal. It renders multiple high-level metrics, line charts, project breakdowns, and a quick-glance table of recent projects.

## Architecture & Component Breakdown
The Dashboard layout relies on several distinct React Query API fetches to populate its components:
1. **Stat Cards**: Powered by `dashboard-kpis` (Total employees, total projects, active leaves/wfh).
2. **Project Breakdowns**: Powered by the new `by_organisation` and `by_vendor` arrays nested inside `dashboard-kpis`.
3. **Most Active Panel**: Powered by `autonex-overview` and `autonex-kpis` (Sparkline charts).
4. **Recent Projects Table**: Powered by `sub-projects-paginated` (`limit=5`) and `analytics-summary` (Platform hours).
5. **Notification Bell**: Powered by the layout-level `unread-summary` query.

## Critical Problems & Technical Debt (Frontend Specific)

### 1. Fake / Incorrect Data Calculations (✅ SOLVED)
*   **Problem**: The frontend used `useMemo` to count `projectsByOrganisation` and `projectsByVendor` based on the `paginatedProjectsData` array. Because that array only held the 5 projects visible on the screen, the frontend was completely ignoring the other 300+ projects in the database, showing fake statistics.
*   **Solution Implemented**: Deleted the frontend math blocks and wired the UI to read from `dashboardKpis.projects.by_organisation` and `by_vendor`, which are now accurately aggregated by the backend.

### 2. Dead Code & Wasted Network (✅ SOLVED)
*   **Problem**: The frontend fired `useQuery(["skillsSummary"])` (1.9 KB), but never actually used the variable in the JSX.
*   **Solution Implemented**: Deleted the unused query entirely.

### 3. Layout Badge Bloat & DDOS-ing (✅ SOLVED)
*   **Problem**: The `NotificationBell` was fetching the entire array of 50 heavy notification objects just to count the unreads. Meanwhile, the `SignupRequests` badge was firing identical network calls concurrently because its `staleTime` and interval polling was too aggressive.
*   **Solution Implemented**: Rewired `NotificationBell` to the slim `/api/notifications/unread-summary` endpoint. Increased `AdminLayout.jsx` `staleTime` to 60,000ms to prevent duplicate simultaneous bursts.

### 4. Over-fetching Massive Payloads (✅ SOLVED)
*   **Problem**: The Analytics Summary query pulled down 18 fields of heavy metadata (32KB) for 55 projects just to read `autonex_platform_hours`. The paginated projects table took 34+ seconds to load because it was triggering heavy backend capacity calculations for all 5 rows.
*   **Solution Implemented**: Appended `?fields=project_id,autonex_platform_hours` and `?is_dashboard=true` to the respective API hooks, telling the backend to skip all the heavy lifting and slice the payloads down.

## Recommended Action Plan (Next Steps)
1. **Dashboard UI Refactoring**: The `Dashboard.jsx` file is 600+ lines. The `MostActivePanel` and `TopUsers` lists can be extracted into their own components (e.g., `src/components/dashboard/MostActivePanel.jsx`).
2. **Suspense boundaries**: Ensure the Dashboard handles loading states gracefully rather than showing blank white spaces during initial load.


## Performance Comparison (Before vs After)
Based on network profiling before and after the architecture changes, here is the dramatic reduction in payload sizes and load times for the Dashboard:

| Endpoint / Data | Before (Payload -> Time) | After (Payload -> Time) | Net Improvement |
|---|---|---|---|
| **Analytics Summary** (/api/analytics/summary) | 32.8 KB -> ~7.7 s | 2.8 KB -> < 100 ms | **91% smaller, 70x faster** (via ?fields= + Fast Path SQL) |
| **Project List** (/api/sub-projects/paginated) | 6.3 KB -> ~34 s | 1.1 KB -> ~964 ms | **82% smaller, 35x faster** (via ?is_dashboard=true) |
| **Notifications** (/api/notifications/unread-summary) | 12.8 KB -> ~2.8 s | 1.5 KB -> ~2.7 s | **88% smaller** (via slim unread-summary projection) |
| **Skills Summary** (/api/skills/summary) | 1.9 KB -> ~1.2 s | 0 KB -> 0 s | **100% eliminated** (dead query removed) |
