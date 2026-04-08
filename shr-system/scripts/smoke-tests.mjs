import fs from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();

function read(filePath) {
  return fs.readFileSync(path.join(projectRoot, filePath), 'utf8');
}

function pass(message) {
  console.log(`PASS: ${message}`);
}

function fail(message) {
  console.error(`FAIL: ${message}`);
}

const failures = [];

function check(condition, message) {
  if (condition) {
    pass(message);
    return;
  }

  fail(message);
  failures.push(message);
}

function extractRouteComponent(routerSource, routePath) {
  const escaped = routePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const routeRegex = new RegExp(`path="${escaped}"[\\s\\S]*?<AppShell><([A-Za-z0-9_]+)\\s*\\/?></AppShell>`, 'm');
  const match = routerSource.match(routeRegex);
  return match ? match[1] : null;
}

function run() {
  const routerSource = read('src/router/AppRouter.tsx');
  const dashboardComponent = extractRouteComponent(routerSource, '/specialist/dashboard');
  const referralsComponent = extractRouteComponent(routerSource, '/specialist/referrals');

  check(Boolean(dashboardComponent), 'Specialist dashboard route has mapped component');
  check(Boolean(referralsComponent), 'Specialist referrals route has mapped component');
  check(
    Boolean(dashboardComponent && referralsComponent && dashboardComponent !== referralsComponent),
    'Specialist dashboard and referrals routes use distinct components',
  );

  const manifest = JSON.parse(read('public/manifest.webmanifest'));
  const iconSizes = (manifest.icons ?? []).map((icon) => String(icon.sizes ?? ''));

  check(iconSizes.some((size) => size.includes('192x192')), 'Manifest includes 192x192 icon');
  check(iconSizes.some((size) => size.includes('512x512')), 'Manifest includes 512x512 icon');
  check(Array.isArray(manifest.shortcuts) && manifest.shortcuts.length > 0, 'Manifest has shortcuts configured');
  check(Array.isArray(manifest.screenshots) && manifest.screenshots.length > 0, 'Manifest has screenshots configured');

  const swSource = read('public/sw.js');
  check(swSource.includes("'/offline.html'"), 'Service worker pre-caches offline fallback page');
  check(swSource.includes("caches.match('/offline.html')"), 'Service worker uses offline fallback for document requests');

  const html = read('index.html');
  check(html.includes('<div id="root"></div>'), 'Index HTML contains root mount point');
  check(html.includes('src="/src/main.tsx"'), 'Index HTML references app entry script');

  if (failures.length > 0) {
    console.error(`\nSmoke tests failed (${failures.length}):`);
    failures.forEach((message) => console.error(`- ${message}`));
    process.exitCode = 1;
    return;
  }

  console.log('\nAll smoke tests passed.');
}

run();
