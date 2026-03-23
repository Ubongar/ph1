# Student Health Records (SHR) System

Comprehensive mock healthcare workflow platform for Babcock University.

This repository contains a role-based web app that simulates end-to-end student clinic operations:

- Student symptom submission and requisition tracking
- Medical staff triage, review, and encounter management
- Technician result upload and critical flagging
- Pharmacy dispensing workflow
- Specialist referral review and consultation flow
- Administrative oversight (users, reports, audit logs, compliance)

## Project Layout

- `shr-system/` → Main React + TypeScript + Vite application
- `ui/` → Reference screenshots used for UI direction (`screen*.png`)
- `structure/workflow.md` → Deep internal architecture and data/workflow mapping
- `GUIDE.md` → Practical usage guide for operators/testers

## Tech Stack

- React 18 + TypeScript
- React Router v6
- Tailwind CSS
- Radix UI primitives
- Lucide icons
- LocalStorage-backed mock data store

## Quick Start

### 1) Install dependencies

```bash
cd shr-system
npm install
```

### 2) Start development server

```bash
npm run dev
```

### 3) Open app

Use the URL shown by Vite (typically `http://localhost:5173`).

## Demo Access

All demo accounts use password:

```text
password
```

Available emails (from login selector):

- `student@babcock.edu.ng`
- `doctor@babcock.edu.ng`
- `technician@babcock.edu.ng`
- `pharmacist@babcock.edu.ng`
- `specialist@babcock.edu.ng`
- `admin@babcock.edu.ng`

## Available Scripts

Run inside `shr-system/`:

- `npm run dev` → Start local dev server
- `npm run build` → Type-check + production build
- `npm run preview` → Preview production build
- `npm run lint` → Run ESLint

## Core UX Features

- Role-based route protection and redirects
- App-wide shell with sidebar, mobile nav (student), and global navbar
- Notification center with unread/resolved states
- Quick command palette (`Ctrl/Cmd + K`) with role-aware shortcuts
- Scroll progress indicator + floating “Top” shortcut
- Toast notifications for user actions

## Data & State Model

The app is intentionally backend-free and uses browser `localStorage`:

- Initial datasets are seeded at boot (`initializeMockData()`)
- Data CRUD flows through `src/services/storage.ts`
- Audit entries are auto-generated for create/update operations (where enabled)
- Auth session is simulated with `StorageKey.AUTH_SESSION`

## Route Overview

- Student: `/student/*`
- Medical staff: `/staff/*`
- Technician: `/technician/upload`
- Pharmacy: `/pharmacy/queue`
- Specialist: `/specialist/*`
- Admin: `/admin/*`

Detailed route and workflow mapping is documented in `structure/workflow.md`.

## Documentation Map

- Start here: `README.md`
- How to operate and test role flows: `GUIDE.md`
- Deep architecture and internals: `structure/workflow.md`
- License terms: `license.md`

## License

This project is proprietary software and is not open source.

- All rights are reserved by the copyright owner.
- No use, copying, modification, redistribution, or derivative works are permitted
	without prior written authorization.
- See `license.md` for full legal terms.

## Resetting Mock Data

If you need a fresh dataset:

1. Open browser dev tools
2. Run `localStorage.clear()`
3. Refresh the app

The app reseeds data on startup.

## Notes

- This is a mock/simulation system, not production medical software.
- No real patient data is used.
