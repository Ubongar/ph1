# SHR System App Module

This folder contains the full React application for the Student Health Records (SHR) system.

For complete project documentation, use the repository-level docs:

- `../README.md` → setup, scripts, overview
- `../GUIDE.md` → operator/tester usage guide
- `../structure/workflow.md` → deep architecture and internal workflow

## Local Commands

Run from this folder:

```bash
npm install
npm run dev
npm run lint
npm run build
npm run preview
```

## Notes

- This app is a browser-local mock system and stores state in `localStorage`.
- Data is automatically seeded at startup if missing.
