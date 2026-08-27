Fix: employees.py — team KPI on-leave filter used wrong Leave.status case

File: app/api/employees.py
Lines: get_team_kpis (~620)
Severity: Med / Bug
Excel Task No.: 56
Resolved Date: 26-08-2026

Bug

`get_team_kpis` filtered `Leave.status == "Approved"` while leave rows store lowercase statuses (`approved`, `rejected`, …). The on-leave KPI never matched and always reported zero.

Solution

Use `Leave.status == "approved"` (aligned with the rest of the employees/leaves APIs). Optionally align any other capitalized leave-status comparisons in the same module.

Result

On-leave KPI counts employees with approved leave covering today. Other employee endpoints unchanged.

==================================================================================================================================

Fix: business "today" aligned to IST (leave / WFH / employees / onboarding)

File: app/utils/business_time.py; app/api/leaves.py; app/api/wfh.py; app/api/employees.py; app/api/onboarding.py
Severity: Med / Bug
Excel Task No.: 58
Resolved Date: 26-08-2026

Bug

Half-day leave validation used explicit IST, while most other "is this today" checks used naive `date.today()` (server/UTC). Near UTC midnight the calendar day disagreed for today-ids, on-leave filters, delete guards, availability, and active allocations.

Solution

- Add `today_ist()` / `now_ist()` as the single business-calendar source.
- Replace business `date.today()` usages in leaves, WFH, employees, and onboarding with `today_ist()`.
- Point local half-day IST helper at `now_ist()`.

Result

One IST notion of "today" across leave, WFH, roster, and allocation windows. Response contracts unchanged.

==================================================================================================================================

Fix: priority suggestion driven by controlled state (ProjectsPage)

File: ProjectsPage.jsx
Severity: Med / Fragile
Excel Task No.: 61
Resolved Date: 26-08-2026

Bug

The priority-suggestion effect read Autonex Annotators / Reviewers from the live DOM via `document.getElementById("project-form")` + `FormData`, and depended on a `manpowerTrigger` bump from input `onChange`. Adding a new field that should affect the suggestion required wiring both the FormData read and the trigger; missing either failed silently. Suggestion could also lag or miss updates if the form node was not mounted.

Solution

- Add controlled state: `formAutonexAnnotators`, `formAutonexReviewers`.
- Compute the suggestion from that state and `selectedTeamLeadIds` only (same rules: total 0 → P3; only TLs → P2; total ≥ 5 → P0; else P1).
- Wire create / edit / copy / reset to init or clear the controlled counts.
- Make the Autonex Annotators and Autonex Reviewers inputs controlled; leave other team-composition fields uncontrolled with `defaultValue`.
- Remove `manpowerTrigger` and the DOM / FormData read path.

Result

Priority suggestion stays in sync with the Team Composition fields without DOM coupling. Adding a new driver is another piece of state in the effect deps. Submit payload and response contracts unchanged (`name` attrs still feed FormData).

==================================================================================================================================

Fix: shared role-tag constants for allocation modals (no UI change)

File: utils/allocationRoles.js (new); AllocationsPage.jsx; AllocationModalV2.jsx
Severity: Med / Redundancy
Excel Task No.: 62
Resolved Date: 26-08-2026

Bug

AllocationModalV2 and the inline Create Allocation modal on AllocationsPage each owned their own role-tag lists and time-distribution wiring. The lists had already diverged (fixed ROLE_TAGS + Team Lead on AllocationsPage vs free-text suggestions and no Team Lead on V2). Further edits risked widening the gap without a single source of truth.

Solution

- Add utils/allocationRoles.js with TEAM_LEAD_TAG, ROLE_TAGS (AllocationsPage), and ROLE_TAG_SUGGESTIONS (AllocationModalV2).
- AllocationsPage: import TEAM_LEAD_TAG and ROLE_TAGS; remove local definitions; leave modal UI, state, and submit payload unchanged.
- AllocationModalV2: import ROLE_TAG_SUGGESTIONS; remove local suggestions array; leave free-text roles, validation, override, and layout unchanged.
- Do not merge the modals, add Team Lead to V2, or extract a shared TimeDivision UI component (would risk production UI/behavior changes).

Result

One place to update role-tag strings. Existing Allocations multi-employee flow and AllocationModalV2 single-employee/edit flow keep the same UI and API payloads.

=================================================================================================================================

Fix: shared popover positioning hook (no UI change)

File: usePopoverPosition.js (new); AllocationPopover.jsx; CandidateAllocationsPopover.jsx
Severity: Med / Redundancy
Excel Task No.: 63
Resolved Date: 26-08-2026

Bug

`AllocationPopover.jsx:294–396` vs `CandidateAllocationsPopover.jsx:50–136` — near line-for-line duplicate positioning/lifecycle code. Both components independently tracked open state, popover position, trigger/popover refs, and a close-delay timer, and each re-implemented the same `updatePosition` math (center on trigger, clamp to viewport, flip above when space below is tight), the same scroll/resize reposition effects, and the same outside-click/Escape dismissal effects. The lists had already diverged slightly in constants (width/margin/close-delay were hardcoded per file), risking further drift on any future positioning tweak.

Solution

- Add `usePopoverPosition.js` encapsulating: `open` state, `position` state, `triggerRef`, `popoverRef`, `closeTimerRef`, `updatePosition`, the layout/reposition effect, the scroll+resize effect, the outside-click effect, the Escape-key effect, and `scheduleClose`/`cancelClose`.
- `AllocationPopover.jsx`: replace the inline state/refs/effects with a single `usePopoverPosition()` call; keep all JSX, class names, animation keyframes, and the `handleAdd`/list/count logic unchanged.
- `CandidateAllocationsPopover.jsx`: same replacement; keep all JSX and class names unchanged.
- Do not change trigger markup, popover markup, arrow positioning math, animation timing, or any prop/behavior exposed to parent components.

Result

One place to update popover positioning, dismissal, and close-delay behavior. Both the project-allocation popover and the candidate-allocation popover keep identical rendered output, hover/click behavior, and viewport-flip behavior.

===============================================================================================================================

Fix: guard detail-fetch effect against unmounted/stale updates

File: AllocationPopover.jsx
Severity: Med / Bug
Excel Task No.: 64
Resolved Date: 26-08-2026

Bug

`AllocationPopover.jsx:114–127` — the detail-fetch effect had no cancelled/mounted guard. On open, it called `fetchDetail()` and later called `setDetailData`/`setIsLoadingDetail` directly in the `.then`/`.catch` handlers. If the popover closed (or the component unmounted) while the request was still in flight — e.g. a fast hover-away — the promise would still resolve and call `setState` on a component that was no longer showing that request, risking a React "set state on unmounted component" warning and, in the closing-then-reopening case, a stale response overwriting fresher state.

Solution

- Introduce a local `cancelled` flag inside the effect, set to `true` in the effect's cleanup function.
- Check `cancelled` before calling `setDetailData` in `.then` and before calling `setIsLoadingDetail(false)` in `.catch`, so a resolved/rejected promise from a superseded or unmounted effect run is a no-op.
- Leave `fetchDetail`'s call signature, the `detailData`/`isLoadingDetail` state shape, and the loading/empty/list rendering branches unchanged.

Result

Closing the popover or unmounting the page while a detail fetch is pending no longer risks a state update after teardown. Loading and loaded UI behave exactly as before when the fetch completes while the popover is still open.

==================================================================================================================================

Fix: clear stale authentication data and redirect on 401 responses

File: api.js
Severity: Med / Bug
Excel Task No.: 38
Resolved Date: 26-08-2026

Bug

`api.js:33–43` — the 401 response interceptor cleared the `token` and `role` from `localStorage` but did not clear the stale `user` object. Additionally, the redirect to the login page was commented out. As a result, when a user's session expired or the backend returned a 401 response, stale authentication data could remain in browser storage and the user could be left on a broken or unauthorized page instead of being redirected to login.

Solution

* Update the 401 status check to use optional chaining with `error.response?.status === 401`.
* Clear all relevant authentication data from `localStorage`, including `token`, `role`, and `user`.
* Clear the `payroll_passcode` from `sessionStorage` so an expired session does not leave a stale payroll credential behind.
* Enable the redirect to `/login/admin` when a 401 response is received.
* Check the current pathname before redirecting so users who are already on a `/login` page are not redirected again, preventing unnecessary redirect loops.
* Keep the existing `Promise.reject(error)` behavior so the original API error is still propagated to the calling code.

Result

When any API request returns a 401 Unauthorized response, all stale authentication and payroll session data is cleared and the user is redirected to the admin login page. If the user is already on a login page, no additional redirect occurs. This prevents users from remaining on a broken authenticated page after session expiry while preserving the existing API error-handling flow.
