# Pharmacy Sequence

## Primary Flow: Dispense Approved Medication

```mermaid
sequenceDiagram
  autonumber
  participant Pharm as Pharmacy
  participant UI as Pharmacy UI
  participant Store as LocalStorage
  participant Queue as Offline Outbox
  participant Student

  Pharm->>UI: Open approved medication queue
  UI->>Store: Load requisitions with status Approved

  Pharm->>UI: Verify order and prepare package
  UI->>Store: Update requisition status to Ready for Pickup
  UI->>Store: Write audit entry
  UI->>Queue: Enqueue update mutation

  Student->>UI: Arrives for pickup confirmation
  Pharm->>UI: Mark item as dispensed
  UI->>Store: Update requisition status to Dispensed
  UI->>Store: Save dispense timestamp/metadata
  UI->>Store: Write audit entry
  UI->>Queue: Enqueue update mutation

  UI-->>Student: Completion reflected in student tracking view
```

## Status Highlights

- `Approved` -> `Ready for Pickup` -> `Dispensed`

## Data Touchpoints

- Requisitions
- Approved medication details
- Audit logs
- Offline outbox
