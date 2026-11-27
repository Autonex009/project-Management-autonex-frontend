# Frontend Project Page Architecture & Issues

## Overview
The `ProjectsPage.jsx` component is the main hub for displaying, filtering, creating, and editing projects in the Autonex PM Portal. It serves multiple user roles (Admin, Project Manager, Team Lead) and is currently one of the largest and most complex files in the frontend repository (at over 2,800 lines of code).

## Architecture & Component Breakdown
The following components are imported to render the Project Page:

### External UI Components
- `Button` (`../components/ui/Button.jsx`)
- `Spinner` (`../components/ui/LoadingSpinner.jsx`)
- `SearchBar` (`../components/ui/SearchBar.jsx`)
- `Table` (`../components/ui/Table.jsx`)
- `Dropdown` (`../components/ui/Dropdown.jsx`)
- `ConfirmDialog` (`../components/ui/ConfirmDialog.jsx`)
- `Modal` (`../components/ui/Modal.jsx`)
- `StatCard` (`../components/dashboard/StatCard.jsx`)

### External Project Components
- `AllocationPopover` (`../components/AllocationPopover.jsx`)
- `ProjectCard` (`../components/projects/ProjectCard.jsx`)
- `SkillMultiSelect` (`../components/projects/ProjectDropdowns.jsx`)
- `EmployeeMultiSelect` (`../components/projects/ProjectDropdowns.jsx`)
- `PmMultiSelect` (`../components/projects/ProjectDropdowns.jsx`)
- `TeamLeadMultiSelect` (`../components/projects/ProjectDropdowns.jsx`)

## User Role Differences (Admin vs Project Manager)
The page behaves differently depending on the authenticated user's role:

- **Admin / HR**:
  - `isScoped = false`: Has full access to view, edit, and delete every project in the system.
  - Can view all organizations, all project managers, and all team leads.
  - Can freely assign any employee as a PM or Team Lead to any project.
  
- **Project Manager (PM) / Team Lead**:
  - `isScoped = true`: The user's view is automatically filtered. PMs only see projects where they are explicitly assigned in `assigned_employee_ids`, or projects falling under their `MainProject` scope. Team Leads only see projects where they hold an active allocation with the `Team Lead` tag.
  - Restricted from making organizational-level changes outside their immediate project scope.

## Critical Problems & Technical Debt

### 1. Unnecessary / Heavy API Payloads (✅ SOLVED)
The page fetched massive amounts of data on initial load that were largely unnecessary for the main list view.
*   ✅ **Employees**: Called `employeeApi.getAll()` and `getAll({ status: "archived" })`, pulling 188KB of full employee profiles.
    *   **Solution Implemented**: Switched to `/api/employees/slim` (payload dropped from 188KB to 15KB).
*   ✅ **Leaves & WFH**: Called `leaveApi.getAll()` and `wfhApi.getAll()` downloading 200KB+ of historical records just to compute who is off today.
    *   **Solution Implemented**: Switched to `/api/leaves/today-ids` and `/api/wfh/today-ids` (payload dropped to <1KB).
*   ✅ **Allocations**: Downloaded all 300+ allocation rows to count manpower.
    *   **Solution Implemented**: Switched to `/api/allocations/slim` (payload dropped from 170KB to 20KB) and rely on the backend `capacity` metrics.
*   **Guidelines**: Pulls down all project guidelines globally, even though they are only viewed one project at a time. (Pending).

### 2. Heavy Code Block & Monolithic Architecture (✅ SOLVED)
*   ✅ **Massive File Size**: At 3,850+ lines, the file acted as a monolith, making it extremely hard to maintain.
    *   **Solution Implemented**: Extracted 1,000+ lines of code out of `ProjectsPage.jsx` into separate component files (`ProjectCard.jsx`, `ProjectDropdowns.jsx`) and a global `projectConstants.js` file.
*   **Modal Duplication**: The "Add Project" and "Edit Project" modals share almost identical form fields, states, and validation logic, but are coded within the same massive component.
    *   **Solution**: Abstract into a separate `<ProjectFormModal />` component.
*   **State Management Hell**: Dozens of `useState` hooks are used to track search, filters, pagination, modal states, and form inputs simultaneously.

### 3. Client-Side Processing Overhead (✅ SOLVED)
*   ✅ **Problem**: The frontend used `useMemo` heavily to cross-reference massive `employees`, `allocations`, and `leaves` arrays to manually calculate whether a project was "balanced" or "overburdened", and who was currently on leave.
*   ✅ **Solution Implemented**: Stripped out the massive client-side calculations entirely. The frontend now natively trusts the `capacity` object attached directly to the `paginated` API payload, and accepts a raw array of integer IDs for `leaves` and `wfh`.

### 4. Over-fetching in Modals
*   The `skills` and `vendors` APIs are fetched even when the modal isn't open (though they have an `enabled` flag, they can clutter the cache).

## Completed Refactoring Actions
1. ✅ **API Swap**: Replaced heavy `.getAll()` API calls with `.getSlim()` and `.getTodayIds()`.
2. ✅ **Removed Client-Side Math**: Deleted the complex frontend `leaveEmployeeIds` intersection math. 
3. ✅ **Component Splitting**: Successfully broke apart the `ProjectsPage.jsx` monolith by extracting `ProjectCard.jsx` and `ProjectDropdowns.jsx`.

## Recommended Action Plan (Next Steps)
1. **Consolidate MultiSelects**: Refactor the separated dropdowns to utilize the brand new generic `<MultiSelect />` component found in `src/components/ui/`.
2. **Modal Extraction**: Extract the massive "Add/Edit Project" form into `ProjectFormModal.jsx`.
3. **Lazy Load Queries**: Set `enabled` flags properly on guidelines and vendors so they only fetch when modals are actually opened.
