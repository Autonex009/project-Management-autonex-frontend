# Frontend Project Page Architecture & Issues

## Overview
The `ProjectsPage.jsx` component is the main hub for displaying, filtering, creating, and editing projects in the Autonex PM Portal. It serves multiple user roles (Admin, Project Manager, Team Lead) and is currently one of the largest and most complex files in the frontend repository (at over 3,800 lines of code).

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

### 1. Unnecessary / Heavy API Payloads
The page fetches massive amounts of data on initial load that are largely unnecessary for the main list view.
*   **Employees**: Calls `employeeApi.getAll()` and `getAll({ status: "archived" })`, pulling 188KB of full employee profiles (including razorpay IDs, phone numbers, and full skill arrays) just to resolve PM/Lead names and populate dropdowns.
    *   **Solution**: Needs to switch to `/api/employees/slim`.
*   **Leaves & WFH**: Calls `leaveApi.getAll()` and `wfhApi.getAll()` which downloads the entire historical record of all leaves and WFH requests in the database (200KB+), just to compute which employees are off *today* for a small UI badge.
    *   **Solution**: Needs to switch to `/api/leaves/today-ids` and `/api/wfh/today-ids`.
*   **Allocations**: Downloads all 300+ allocation rows (`allocationApi.getAll()`) to count the current manpower for projects.
    *   **Solution**: Switch to `/api/allocations/slim` or rely entirely on the backend `capacity` metrics now provided in the paginated response.
*   **Guidelines**: Pulls down all project guidelines globally, even though they are only viewed one project at a time.

### 2. Large Code Redundancy & Duplicity
*   **Massive File Size**: At 3,850+ lines, the file acts as a monolith. 
*   **Duplicate Multi-Select Components**: The page defines SkillMultiSelect, EmployeeMultiSelect, TeamLeadMultiSelect, and PmMultiSelect completely inline. These do almost the exact same thing. Furthermore, another MultiSelectDropdown is defined inline over in EmployeesPage.jsx. All of these should be consolidated into a single reusable <MultiSelect /> component inside src/components/ui/.
*   **Inline Project Card**: The massive ProjectCard component is defined inline instead of living in its own file (src/components/projects/ProjectCard.jsx).
*   **Modal Duplication**: The "Add Project" and "Edit Project" modals share almost identical form fields, states, and validation logic, but are coded within the same massive component rather than being abstracted into a separate `<ProjectFormModal />` component.
*   **Inline Components**: Complex UI pieces like `SkillMultiSelect`, `EmployeeMultiSelect`, and `ProjectCard` are defined directly inside or alongside the main file instead of living in `src/components/projects/`.
*   **State Management Hell**: Dozens of `useState` hooks are used to track search, filters, pagination, modal states, and form inputs simultaneously.

### 3. Client-Side Processing Overhead
*   The frontend uses `useMemo` heavily to cross-reference the massive `employees`, `allocations`, and `leaves` arrays to manually calculate whether a project is "balanced" or "overburdened", and who is currently on leave.
*   Because the backend API `paginated` endpoint now handles this capacity calculation natively in the payload (`capacity.status` and `capacity.recommendation`), the frontend is wasting CPU cycles running redundant checks.

### 4. Over-fetching in Modals
*   The `skills` and `vendors` APIs are fetched even when the modal isn't open (though they have an `enabled` flag, they can clutter the cache).

## Recommended Action Plan (Next Steps)
1. **API Swap**: Find and replace `employeeApi.getAll()`, `allocationApi.getAll()`, etc., with their `.getSlim()` or `.getTodayIds()` counterparts in `src/services/api.js` and `ProjectsPage.jsx`.
2. **Component Splitting**: Break `ProjectsPage.jsx` into:
   - `ProjectsPage.jsx` (Main wrapper & query loading)
   - `ProjectList.jsx` (The grid/table view)
   - `ProjectCard.jsx` (Extracted card component)
   - `ProjectFormModal.jsx` (Add/Edit project logic)
3. **Remove Client-Side Math**: Delete the complex frontend `leaveEmployeeIds` and `wfhEmployeeIds` intersection math. Trust the backend `capacity` object directly.
