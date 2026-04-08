# SHR Internal Structure & Workflow

This document provides an intensive breakdown of how the mock SHR system works internally.

## Related Documentation

- Executive summary: [executive-summary.md](executive-summary.md)
- Full technical deep-dive: [technical-website-breakdown.md](technical-website-breakdown.md)
- Role sequence diagrams index: [sequence-diagrams/index.md](sequence-diagrams/index.md)

## 1) Runtime Boot Sequence

The app boot process is deterministic and local-storage driven:

1. `src/main.tsx`
   - Calls `initializeMockData()` before React render
   - Ensures base data exists in `localStorage`
2. `src/App.tsx`
   - Wraps app in provider chain:
     - `BrowserRouter`
     - `ToastProvider`
     - `AuthProvider`
3. `src/router/AppRouter.tsx`
   - Applies route protection and role-based redirects

## 2) Provider and Context Topology

## `ToastProvider`

Global transient feedback system used by pages and layout actions.

## `AuthProvider`

Auth/session simulator that:

- Resolves user from `StorageKey.AUTH_SESSION`
- Exposes:
  - `currentUser`
  - `currentStudent`
  - `isAuthenticated`
  - `login(userId)`
  - `logout()`
  - `hasRole(role|roles)`

Login is mock-async (`setTimeout`) to emulate network delay.

## 3) Storage Layer Design

All persistent state is browser `localStorage` managed via `src/services/storage.ts`.

## Storage keys

- `shr_students`
- `shr_system_users`
- `shr_encounters`
- `shr_requisitions`
- `shr_referrals`
- `shr_diagnostic_results`
- `shr_audit_logs`
- `shr_system_alerts`
- `shr_auth_session`

## CRUD helpers

- `getAll<T>(key)`
- `getById<T>(key, id)`
- `create<T>(key, item, options)`
- `update<T>(key, id, updates, options)`
- `deleteById(key, id)`

## Auto-audit behavior

`create()` and `update()` auto-create audit entries unless `autoAudit: false` is passed.

This design provides a realistic audit trail without a backend.

## 4) Seed Data Strategy

`initializeMockData()` (`src/data/mockData.ts`) performs idempotent bootstrap:

- On first run: seeds all core datasets
- On subsequent runs:
  - ensures specialist user exists
  - ensures referrals data exists

This allows gradual schema evolution while preserving existing browser data.

## 5) Routing and Access Control

`AppRouter` defines role-scoped route groups.

## Access guard

`ProtectedRoute` logic:

1. If not authenticated → redirect to `/login`
2. If role mismatch → redirect to `/unauthorized`
3. Else render role page inside `AppShell`

## Root redirect

`/` resolves to role default dashboard via `RoleRedirect`.

## 6) Shell and Cross-Cutting UX

`src/components/layout/AppShell.tsx` provides common frame:

- Navbar
- Sidebar
- Student mobile bottom nav
- Scroll progress indicator
- Floating “Top” action

`src/components/layout/Navbar.tsx` contains:

- Page title resolution by route
- Notification center with read/resolved behavior
- Role-based workload chip
- Role quick action shortcut
- Command palette (`Ctrl/Cmd + K`)
- In-app demo user switching

These shell features are cross-role and stateful.

## 7) Domain Workflows

## A) Requisition Lifecycle

Primary entities:

- `MedicationRequisition`
- `SystemAlert` (indirectly for attention events)
- `AuditLog`

Typical transitions:

1. Student submits requisition
2. Medical staff reviews
3. Staff sets notes and action:
   - `Approved`
   - `Rejected`
   - clinic-visit path (modeled as rejection + note)
4. Pharmacy processes approved queue
5. Student tracks final state

Implementation hotspots:

- Student submit page
- Staff review queue
- Pharmacy queue

## B) Encounter Workflow

Medical staff can create encounter records for a student profile.

Encounter payload includes:

- chief complaint
- subjective/objective notes
- vitals
- diagnosis list
- treatment plan
- prescriptions

## C) Diagnostic Result Workflow

Technician upload portal:

1. Select patient
2. Enter test metadata
3. Attach simulated file metadata
4. Add findings
5. Optional critical flag + reason

Critical flags influence alert visibility and downstream urgency.

## D) Referral Workflow

Staff-originated specialist referrals progress through specialist pages and detail screens.

Admin referral compliance pages consume these records for oversight reporting.

## E) Administration Workflow

Admin pages consolidate:

- user governance
- audit trail visibility
- reports generation
- referral compliance review

## 8) Audit and Traceability Model

Manual and automatic audit paths coexist:

- Automatic: storage create/update helpers
- Manual: page-level business actions via `createAuditEntry`

Result:

- meaningful resource descriptions
- action category consistency
- temporal trace for operational review

## 9) Type System and Contracts

Central contracts live in `src/types/types.ts`.

Benefits:

- shared domain language across pages/services
- compile-time guarantees for status enums and payloads
- easier extension when adding new workflows

## 10) Component Organization

`src/components/` is split into:

- `layout/` → global navigation and shell
- `shared/` → reusable UI/state helpers (`StatusBadge`, `SeverityBadge`, `Toast`, etc.)

Pattern:

- pages orchestrate domain logic
- shared components stay presentation-focused

## 11) Extending the System Safely

Recommended approach for new features:

1. Add/extend type definitions in `types.ts`
2. Add storage key + helper functions (if new entity)
3. Seed representative mock data
4. Build page flow using existing shared UI patterns
5. Emit audit entries for state-changing actions
6. Add role-based routing guard

## 12) Operational Constraints

- No backend/API layer
- No real authentication provider
- No server-side persistence
- Browser-specific storage lifecycle (cleared storage resets data)

Treat current implementation as high-fidelity workflow simulation.

## 13) Data Reset and Determinism

For consistent regression testing:

1. Run `localStorage.clear()` in browser console
2. Reload app
3. Re-login with demo role

This restores known-good seed state and reproducible role flows.
