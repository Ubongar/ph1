# Technician Sequence

## Primary Flow: Upload Diagnostic Result and Flag Critical Findings

```mermaid
sequenceDiagram
  autonumber
  participant Tech as Technician
  participant UI as Technician UI
  participant Scope as Access Scope Service
  participant Store as LocalStorage
  participant Queue as Offline Outbox
  participant Staff as Medical Staff

  Tech->>UI: Search/select student
  UI->>Scope: Validate role-scoped access
  Scope-->>UI: Access allowed

  Tech->>UI: Enter test metadata and findings
  alt Critical result
    Tech->>UI: Mark critical and provide reason
  end

  UI->>Store: Create DiagnosticResult
  UI->>Store: Write audit entry
  UI->>Queue: Enqueue create mutation

  opt Referral review update in same session
    Tech->>UI: Update referral notes/status
    UI->>Store: Persist referral changes
    UI->>Queue: Enqueue update mutation
  end

  Staff->>Store: Reads new diagnostic result
  Staff-->>UI: Uses result for encounter/referral decisions
```

## Data Touchpoints

- Diagnostic results
- Referrals (optional review edits)
- Audit logs
- Offline outbox
