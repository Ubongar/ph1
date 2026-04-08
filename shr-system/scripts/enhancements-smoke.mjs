import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

const checks = [];

function expect(condition, message) {
  checks.push({ ok: Boolean(condition), message });
}

const router = read('src/router/AppRouter.tsx');
expect(router.includes('path="/workspace"'), 'Workspace route is registered');
expect(router.includes('path="/admin/governance"'), 'Admin governance route is registered');
expect(router.includes('lazy(() => import'), 'Router uses lazy loading for chunk splitting');

const sidebar = read('src/components/layout/Sidebar.tsx');
expect(sidebar.includes("'/workspace'"), 'Sidebar includes workspace navigation entry');
expect(sidebar.includes("'/admin/governance'"), 'Sidebar includes governance navigation entry');

const main = read('src/main.tsx');
expect(main.includes('bootstrapEnhancements()'), 'Enhancements bootstrap runs at startup');

const services = [
  'src/services/inbox.ts',
  'src/services/notifications.ts',
  'src/services/appointments.ts',
  'src/services/clinicalSafety.ts',
  'src/services/dataQuality.ts',
  'src/services/permissions.ts',
  'src/services/observability.ts',
  'src/services/timeline.ts',
  'src/services/i18n.ts',
];

for (const file of services) {
  expect(fs.existsSync(path.join(root, file)), `Service exists: ${file}`);
}

const roleWorkspace = read('src/pages/shared/RoleWorkspacePage.tsx');
expect(roleWorkspace.includes('Role Inbox with SLA'), 'Role workspace includes SLA inbox section');
expect(roleWorkspace.includes('Unified Patient Timeline Search'), 'Role workspace includes timeline search section');
expect(roleWorkspace.includes('Fine-grained permission scopes'), 'Role workspace includes permission model section');

const governance = read('src/pages/admin/AdminGovernanceCenter.tsx');
expect(governance.includes('Data Quality Rules'), 'Governance center includes data quality section');
expect(governance.includes('Fine-Grained Permissions'), 'Governance center includes permissions section');
expect(governance.includes('Observability Telemetry'), 'Governance center includes observability section');
expect(governance.includes('Security Events'), 'Governance center includes security section');

const failed = checks.filter((item) => !item.ok);
for (const item of checks) {
  console.log(`${item.ok ? 'PASS' : 'FAIL'}: ${item.message}`);
}

if (failed.length > 0) {
  console.error(`\nEnhancements smoke failed: ${failed.length}`);
  process.exitCode = 1;
} else {
  console.log('\nEnhancements smoke passed.');
}
