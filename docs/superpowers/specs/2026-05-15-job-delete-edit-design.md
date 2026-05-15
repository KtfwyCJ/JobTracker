# Job Delete & Edit

**Date:** 2026-05-15

## Problem

There is no way to edit a job after creation or remove one that is no longer relevant. Users are stuck with mistakes and stale entries.

## Design

### Data layer (`app/_lib/store.tsx`)

Two new actions added to the reducer:

**`UPDATE_JOB`** payload: `{ jobId, companyName, title, location, description, appliedAt, requiresGerman }`
- Finds or creates the target company by name (same logic as `ADD_JOB`)
- Updates all editable fields on the matched job in place

**`DELETE_JOB`** payload: `{ jobId }`
- Removes the job from `jobs`
- Removes all `timelineEvents` where `jobId` matches
- Removes all `interviews` where `jobId` matches
- The component is responsible for resetting `selectedJobId` to null after dispatch

Both actions are exposed as helper functions on the store context: `updateJob(...)` and `deleteJob(jobId)`.

### Edit modal (`app/_components/AddJobModal.tsx`)

`AddJobModal` receives an optional `job?: Job` prop alongside the existing `onClose`.

- When `job` is present: modal title is "Edit Job", all fields are pre-filled from `job`, submit calls `updateJob`
- When `job` is absent: existing "Add Job" behaviour unchanged
- Company field is editable — the user can reassign a job to a different or new company

`DashboardShell` cannot be reached from `JobDetail` via props (they are separated by the page layer). Instead, `editingJobId: string | null` and `setEditingJobId` are added to the **store context** (alongside the existing `selectedJobId`). `JobDetail` calls `setEditingJobId(job.id)` when the user clicks Edit. `DashboardShell` reads `editingJobId` from the store and renders `AddJobModal` in edit mode when it is non-null; closing the modal calls `setEditingJobId(null)`.

### Delete confirmation (`app/_components/JobDetail.tsx`)

Two small buttons — **Edit** and **Delete** — are added to the JobDetail header, right below the status dropdown.

Clicking **Edit** opens `AddJobModal` in edit mode (via `DashboardShell` state).

Clicking **Delete** replaces those two buttons with an inline confirmation row:
> "Delete this job? **Confirm** · Cancel"

- **Confirm**: calls `deleteJob(job.id)`, then `setSelectedJobId(null)`
- **Cancel**: reverts the buttons back to the Edit / Delete pair
- The confirmation state is local to `JobDetail` (`useState`)

No separate modal is needed for deletion.

## Out of scope

- Editing a job from the Kanban card (delete/edit only accessible via the detail panel)
- Bulk delete
- Undo / restore after deletion
