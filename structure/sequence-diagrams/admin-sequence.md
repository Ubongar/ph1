# Admin Sequence

## Primary Flow: Governance, Reconciliation, and Audit Oversight

```mermaid
sequenceDiagram
  autonumber
  participant Admin
  participant UI as Admin UI
  participant Store as LocalStorage
  participant Sync as Sync API
  participant SDB as Server Sync DB

  Admin->>UI: Open governance and audit pages
  UI->>Store: Load local audits, conflicts, policy, requests

  opt User governance action
    Admin->>UI: Create/edit/deactivate/reactivate user
    UI->>Store: Persist user change
    UI->>Store: Write audit entry
  end

  opt Policy/data rights governance
    Admin->>UI: Publish policy version or review data request
    UI->>Store: Persist policy/request updates
    UI->>Store: Write audit entry
  end

  opt Server conflict reconciliation
    UI->>Sync: GET /api/admin/reconciliation/conflicts
    Sync->>SDB: Read pending conflicts
    SDB-->>Sync: Conflict list
    Sync-->>UI: Pending conflicts

    Admin->>UI: Choose keep_local or keep_remote
    UI->>Sync: POST /api/admin/reconciliation/resolve
    Sync->>SDB: Apply resolution + append server audit log
    Sync-->>UI: Resolution result
  end

  UI->>Sync: GET /api/admin/audit-logs
  Sync->>SDB: Read resolution log stream
  SDB-->>Sync: Logs
  Sync-->>UI: Server reconciliation audit history
```

## Data Touchpoints

- System users
- Policy versions and acceptances
- Data requests
- Local and server reconciliation conflicts
- Local audit logs and server admin resolution logs
