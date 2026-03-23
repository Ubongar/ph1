# SHR System User Guide

This guide explains how to use the project in day-to-day testing and demos.

## 1) Before You Begin

### Prerequisites

- Node.js 18+
- npm 9+

### Run the app

```bash
cd shr-system
npm install
npm run dev
```

Open the Vite URL in your browser.

## 2) Login and Role Switching

The login page supports two paths:

1. Pick a demo role from the **Demo Role Switcher**
2. Enter email + password manually

All demo passwords are:

```text
password
```

### Demo accounts

- Student → `student@babcock.edu.ng`
- Medical Staff → `doctor@babcock.edu.ng`
- Technician → `technician@babcock.edu.ng`
- Pharmacist → `pharmacist@babcock.edu.ng`
- Specialist → `specialist@babcock.edu.ng`
- Administrator → `admin@babcock.edu.ng`

### Quick role switching (inside app)

Use navbar avatar menu → **Switch User**.

## 3) Navigation Basics

### Shared app controls

- **Sidebar**: Role-specific navigation links
- **Notification bell**: Unread alert count, view and resolve alerts
- **Quick Search**: Command palette with `Ctrl/Cmd + K`
- **Scroll Progress**: Top page progress indicator
- **Top button**: Appears after scrolling down

### Student mobile behavior

Student role includes bottom navigation for small screens.

## 4) Role Workflows (Recommended Test Paths)

## A) Student flow

1. Login as student
2. Open **Submit Symptom Report**
3. Complete symptom selection and medication request
4. Submit requisition
5. Open **My Requisitions** to track status changes

Expected result: request appears with lifecycle updates from staff/pharmacy actions.

## B) Medical Staff flow

1. Login as medical staff
2. Open **Doctor Review Queue**
3. Select a pending requisition
4. Add doctor note
5. Approve, reject, or request clinic visit
6. Use **Student Search** and **Patient Profile** for deeper context
7. Create a **New Encounter** if needed

Expected result: requisition status and audit logs update.

## C) Technician flow

1. Login as technician
2. Open **Upload Results**
3. Select patient
4. Enter test data and findings
5. Optionally set **Critical Flag** + reason
6. Submit upload

Expected result: diagnostic result is stored; critical context surfaces through alerts and downstream pages.

## D) Pharmacy flow

1. Login as pharmacist
2. Open **Dispensing Queue**
3. Process approved/ready requisitions
4. Mark requisitions as dispensed when complete

Expected result: status transitions propagate to student tracking and reports.

## E) Specialist flow

1. Login as specialist
2. Open **Referrals** / dashboard
3. Review referral details
4. Accept or process consultation updates
5. Check analytics page for specialist metrics

Expected result: referral status and notes update with audit trace.

## F) Admin flow

1. Login as admin
2. Open **User Management** to inspect role accounts
3. Open **Audit Logs** to review action history
4. Open **Reports** and **Referral Compliance** for oversight

Expected result: centralized operational visibility across all roles.

## 5) Notifications and Alerts

The notification center in the navbar supports:

- Unread tracking
- Mark all as read
- Mark individual alert as resolved
- Type badges (`Critical`, `Warning`, `Info`)

Notes:

- Read IDs are tracked in browser storage (`shr_alert_read_ids`)
- Alert resolution updates the stored alert record

## 6) Data Reset and Troubleshooting

## Reset all mock data

1. Open browser dev tools console
2. Run:

```js
localStorage.clear()
```

3. Refresh app

The app reseeds default data at startup.

## Common issues

### App opens but no data shown

- Ensure browser local storage is enabled
- Clear storage and refresh

### Login fails

- Use one of the demo emails above
- Confirm password is `password`

### Lint check

```bash
cd shr-system
npm run lint
```

## 7) Suggested QA Regression Checklist

- Login redirects correctly per role
- Each role dashboard loads
- Core actions produce toast feedback
- Requisition approval/rejection updates status
- Alerts can be read/resolved
- Command palette navigates to correct routes
- Audit logs update after state-changing actions

## 8) Where to Learn More

- Project setup and high-level overview: `README.md`
- Deep internal architecture and workflow design: `structure/workflow.md`

## 9) License Notice

This software is proprietary and not open source.

- All rights are reserved by the owner.
- You may not use, copy, modify, distribute, or create derivative works without
	prior written authorization.
- See `license.md` for complete legal terms.
