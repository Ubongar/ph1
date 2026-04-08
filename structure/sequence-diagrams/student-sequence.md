# Student Sequence

## Primary Flow: Submit Symptom and Track Requisition

```mermaid
sequenceDiagram
  autonumber
  participant Student
  participant UI as Student UI
  participant Store as LocalStorage
  participant Queue as Offline Outbox
  participant Sync as Sync API
  participant Staff as Medical Staff
  participant Pharm as Pharmacy

  Student->>UI: Submit symptom report + OTC request
  UI->>Store: Create MedicationRequisition (Pending)
  UI->>Store: Create AuditLog entry
  UI->>Queue: Enqueue create mutation
  UI-->>Student: Show requisition tracking status

  Note over Staff,Store: Staff reviews and updates requisition later
  Staff->>Store: Set status Approved or Rejected
  Staff->>Queue: Enqueue update mutation

  alt Approved path
    Pharm->>Store: Set status Ready for Pickup
    Pharm->>Store: Set status Dispensed
  else Rejected path
    Staff->>Store: Add rejection note
  end

  UI->>Store: Read latest requisition state
  UI-->>Student: Timeline reflects current status

  opt Online sync available
    Queue->>Sync: POST /api/sync/batch
    Sync-->>Queue: synced or conflict result
  end
```

## Status Highlights

- `Pending` -> `Approved` -> `Ready for Pickup` -> `Dispensed`
- `Pending` -> `Rejected`

## Data Touchpoints

- Medication requisitions
- Audit logs
- Offline mutation outbox
