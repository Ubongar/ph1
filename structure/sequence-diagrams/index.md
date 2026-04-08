# SHR Role Sequence Diagrams

This folder contains role-specific sequence diagrams for the major operational flows.

## Files

- [student-sequence.md](student-sequence.md)
- [medical-staff-sequence.md](medical-staff-sequence.md)
- [technician-sequence.md](technician-sequence.md)
- [pharmacy-sequence.md](pharmacy-sequence.md)
- [specialist-sequence.md](specialist-sequence.md)
- [admin-sequence.md](admin-sequence.md)

## Modeling Notes

- Diagrams focus on runtime behavior in the current implementation.
- `localStorage` is the primary persistence layer in the client app.
- The Sync API appears only where online reconciliation is involved.
