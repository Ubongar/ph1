import { useMemo, useState } from 'react';
import { BarChart3, Download, Eye, Lock, ShieldCheck, Sparkles, Wrench } from 'lucide-react';
import { useToast } from '../../hooks';
import { getPermissionOverrides, setRolePermissionOverride } from '../../services/permissions';
import { generateKpiSnapshot, getKpiSnapshots, getSecurityEvents, getTelemetry, trackSecurityEvent, trackTelemetry } from '../../services/observability';
import { runDataQualityScan } from '../../services/dataQuality';
import type { PermissionKey } from '../../types/enhancements';
import type { UserRole } from '../../types/types';

const ROLES: UserRole[] = ['student', 'medical_staff', 'technician', 'pharmacy', 'specialist', 'admin'];

const PERMISSIONS: PermissionKey[] = [
  'inbox.view',
  'notifications.view',
  'appointments.manage',
  'timeline.view',
  'clinical-safety.run',
  'reconciliation.resolve',
  'quality.view',
  'reports.export',
  'security.manage',
  'permissions.manage',
  'observability.view',
];

export default function AdminGovernanceCenter() {
  const { toast } = useToast();
  const [targetRole, setTargetRole] = useState<UserRole>('medical_staff');
  const [allowText, setAllowText] = useState('quality.view, reports.export');
  const [denyText, setDenyText] = useState('');

  const qualityIssues = runDataQualityScan();
  const telemetry = getTelemetry().slice(0, 40);
  const securityEvents = getSecurityEvents().slice(0, 40);
  const kpis = getKpiSnapshots().slice(0, 8);
  const overrides = getPermissionOverrides();

  const qualitySummary = useMemo(() => {
    return {
      high: qualityIssues.filter((item) => item.severity === 'high').length,
      medium: qualityIssues.filter((item) => item.severity === 'medium').length,
      low: qualityIssues.filter((item) => item.severity === 'low').length,
      total: qualityIssues.length,
    };
  }, [qualityIssues]);

  function parsePermissionList(value: string): PermissionKey[] {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter((item): item is PermissionKey => PERMISSIONS.includes(item as PermissionKey));
  }

  function applyPermissionOverride() {
    const allow = parsePermissionList(allowText);
    const deny = parsePermissionList(denyText);
    setRolePermissionOverride(targetRole, allow, deny);
    trackTelemetry({
      name: 'permissions.override.applied',
      level: 'info',
      role: 'admin',
      route: '/admin/governance',
      context: { targetRole, allow, deny },
    });
    trackSecurityEvent({
      category: 'authorization',
      severity: 'medium',
      message: `Permission override updated for ${targetRole}`,
      role: 'admin',
      metadata: { allow, deny },
    });
    toast('Permission override updated.', 'success');
  }

  function createKpiSnapshot() {
    const snapshot = generateKpiSnapshot();
    toast(`KPI snapshot generated (${snapshot.metrics.length} metrics).`, 'success');
  }

  function exportGovernanceReport() {
    const payload = {
      exportedAt: new Date().toISOString(),
      qualitySummary,
      overrideCount: overrides.length,
      telemetryCount: telemetry.length,
      securityCount: securityEvents.length,
      latestKpi: kpis[0] ?? null,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'shr-governance-report.json';
    anchor.click();
    URL.revokeObjectURL(url);
    toast('Governance report exported.', 'success');
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Admin Governance</p>
          <h1 className="mt-1 text-2xl font-bold text-gray-900">Security, Quality, Observability, and Reports</h1>
          <p className="mt-1 text-sm text-gray-600">Central console for the platform hardening capabilities and operational guardrails.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={createKpiSnapshot}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
            >
              <BarChart3 className="h-4 w-4" />
              Generate KPI Snapshot
            </button>
            <button
              type="button"
              onClick={exportGovernanceReport}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
            >
              <Download className="h-4 w-4" />
              Export Governance Report
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-2 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-blue-700" />
              <h2 className="text-sm font-semibold text-gray-900">Data Quality Rules</h2>
            </div>
            <p className="text-xs text-gray-600">Total issues: {qualitySummary.total}</p>
            <div className="mt-2 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-red-50 p-2 text-xs font-semibold text-red-700">High {qualitySummary.high}</div>
              <div className="rounded-lg bg-amber-50 p-2 text-xs font-semibold text-amber-700">Medium {qualitySummary.medium}</div>
              <div className="rounded-lg bg-slate-100 p-2 text-xs font-semibold text-slate-700">Low {qualitySummary.low}</div>
            </div>
            <div className="mt-3 space-y-2">
              {qualityIssues.slice(0, 5).map((item) => (
                <div key={item.id} className="rounded-lg border border-gray-200 p-2">
                  <p className="text-xs font-semibold text-gray-900">{item.title}</p>
                  <p className="mt-1 text-[11px] text-gray-600">{item.description}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm lg:col-span-2">
            <div className="mb-2 flex items-center gap-2">
              <Lock className="h-4 w-4 text-blue-700" />
              <h2 className="text-sm font-semibold text-gray-900">Fine-Grained Permissions</h2>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <label className="text-xs font-medium text-gray-600">
                Role
                <select
                  value={targetRole}
                  onChange={(event) => setTargetRole(event.target.value as UserRole)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-2 py-2 text-xs"
                >
                  {ROLES.map((role) => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-medium text-gray-600 md:col-span-2">
                Allow permissions (comma separated)
                <input
                  value={allowText}
                  onChange={(event) => setAllowText(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-xs"
                />
              </label>
              <label className="text-xs font-medium text-gray-600 md:col-span-3">
                Deny permissions (comma separated)
                <input
                  value={denyText}
                  onChange={(event) => setDenyText(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-xs"
                />
              </label>
            </div>
            <button
              type="button"
              onClick={applyPermissionOverride}
              className="mt-3 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
            >
              <Wrench className="h-4 w-4" />
              Apply Override
            </button>
            <div className="mt-3 space-y-2">
              {overrides.map((item) => (
                <div key={item.role} className="rounded-lg border border-gray-200 p-2 text-xs">
                  <p className="font-semibold text-gray-900">{item.role}</p>
                  <p className="mt-1 text-gray-600">Allow: {item.allow.join(', ') || 'none'}</p>
                  <p className="text-gray-600">Deny: {item.deny.join(', ') || 'none'}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm lg:col-span-2">
            <div className="mb-2 flex items-center gap-2">
              <Eye className="h-4 w-4 text-blue-700" />
              <h2 className="text-sm font-semibold text-gray-900">Observability Telemetry</h2>
            </div>
            <div className="space-y-2">
              {telemetry.length === 0 && <p className="text-xs text-gray-500">No telemetry captured yet.</p>}
              {telemetry.map((entry) => (
                <div key={entry.id} className="rounded-lg border border-gray-200 p-2 text-xs">
                  <p className="font-semibold text-gray-900">{entry.name}</p>
                  <p className="text-gray-600">Level: {entry.level} • Route: {entry.route ?? 'n/a'}</p>
                  <p className="text-gray-500">{new Date(entry.createdAt).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-2 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-blue-700" />
              <h2 className="text-sm font-semibold text-gray-900">Security Events</h2>
            </div>
            <div className="space-y-2">
              {securityEvents.length === 0 && <p className="text-xs text-gray-500">No security events yet.</p>}
              {securityEvents.map((entry) => (
                <div key={entry.id} className="rounded-lg border border-gray-200 p-2 text-xs">
                  <p className="font-semibold text-gray-900">{entry.message}</p>
                  <p className="text-gray-600">{entry.category} • {entry.severity}</p>
                  <p className="text-gray-500">{new Date(entry.createdAt).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
