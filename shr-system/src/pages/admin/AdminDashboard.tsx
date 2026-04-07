import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, ClipboardList, FlaskConical, Bell, AlertCircle, AlertTriangle, Info, UserPlus, BookOpen, BarChart2, FileCheck2, FileClock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getAll, update, createAuditEntry, StorageKey } from '../../services/storage';
import type { Student, SystemUser, MedicationRequisition, DiagnosticResult, SystemAlert, Encounter, AuditLog } from '../../types/types';
import { useToast } from '../../components/shared/Toast';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const PIE_COLORS = ['#3b82f6','#f59e0b','#10b981','#ef4444','#8b5cf6','#6b7280'];

export default function AdminDashboard() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const loadData = useCallback(() => ({
    students: getAll<Student>(StorageKey.STUDENTS),
    users: getAll<SystemUser>(StorageKey.USERS),
    requisitions: getAll<MedicationRequisition>(StorageKey.REQUISITIONS),
    results: getAll<DiagnosticResult>(StorageKey.RESULTS),
    alerts: getAll<SystemAlert>(StorageKey.ALERTS),
    encounters: getAll<Encounter>(StorageKey.ENCOUNTERS),
    auditLogs: getAll<AuditLog>(StorageKey.AUDIT_LOGS),
  }), []);

  const [data, setData] = useState(loadData);
  const { students, users, requisitions, results, alerts, encounters } = data;

  const activeAlerts = alerts.filter(a => !a.isResolved);
  const pendingReqs = requisitions.filter(r => r.status === 'Pending Review').length;
  const pendingResults = results.filter(r => r.status === 'Pending' || r.status === 'Processing').length;

  const thisMonth = new Date().getMonth();
  const thisYear = new Date().getFullYear();
  const monthEncounters = encounters.filter(e => {
    const d = new Date(e.date);
    return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
  });
  const amphiCount = monthEncounters.filter(e => e.facility === 'Amphi Clinic').length;
  const buthCount = monthEncounters.filter(e => e.facility === 'BUTH').length;
  const facilityData = [{ name: 'Amphi Clinic', count: amphiCount }, { name: 'BUTH', count: buthCount }];

  const statusCounts: Record<string, number> = {};
  requisitions.forEach(r => { statusCounts[r.status] = (statusCounts[r.status] ?? 0) + 1; });
  const reqPieData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));

  const resolveAlert = (alert: SystemAlert) => {
    if (!currentUser) return;
    update<SystemAlert>(
      StorageKey.ALERTS,
      alert.id,
      { isResolved: true, resolvedBy: currentUser.name },
      { autoAudit: false },
    );
    createAuditEntry({ userId: currentUser.id, userName: currentUser.name, userRole: currentUser.role,
      action: 'EDIT_RECORD', resourceType: 'System', resourceId: alert.id,
      resourceDescription: `Resolved alert: ${alert.title}`, status: 'Success' });
    toast('Alert resolved', 'success');
    setData(loadData());
  };

  const lastBackup = new Date(Date.now() - 2 * 60 * 60 * 1000).toLocaleString();

  const kpis = [
    { label: 'Total Students', value: students.length, color: 'blue', icon: Users },
    { label: 'Active Users', value: users.filter(u => u.isActive).length, color: 'green', icon: Users },
    { label: 'Pending Requisitions', value: pendingReqs, color: 'yellow', icon: ClipboardList },
    { label: 'Pending Lab Results', value: pendingResults, color: 'purple', icon: FlaskConical },
    { label: 'Active Alerts', value: activeAlerts.length, color: activeAlerts.length > 0 ? 'red' : 'gray', icon: Bell },
  ];

  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    green: 'bg-green-50 text-green-700 border-green-200',
    yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    gray: 'bg-gray-50 text-gray-600 border-gray-200',
  };

  return (
    <div className="p-4 sm:p-6 space-y-5 sm:space-y-6">
      <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-xl p-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-6">
        <span className="text-lg font-bold">🟢 OPERATIONAL</span>
        <span className="text-sm/5">99.98% uptime</span>
        <span className="text-sm/5 break-words">Last backup: {lastBackup}</span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5 gap-3 sm:gap-4">
        {kpis.map(({ label, value, color, icon: Icon }) => (
          <div key={label} className={`rounded-xl border p-3 sm:p-4 ${colorMap[color]}`}>
            <div className="flex items-center gap-2 mb-2"><Icon className="w-5 h-5" /></div>
            <div className="text-2xl sm:text-3xl font-bold">{value}</div>
            <div className="text-xs sm:text-sm mt-1 leading-snug">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
          <h3 className="font-semibold text-gray-800 mb-4">Requisitions by Status</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={reqPieData} cx="50%" cy="50%" innerRadius={52} outerRadius={80} dataKey="value" labelLine={false}>
                {reqPieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-3 flex flex-wrap gap-2">
            {reqPieData.map((slice, i) => (
              <span key={slice.name} className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-[11px] text-gray-700">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                {slice.name}: {slice.value}
              </span>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
          <h3 className="font-semibold text-gray-800 mb-4">Encounters by Facility (This Month)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={facilityData}>
              <XAxis dataKey="name" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip />
              <Bar dataKey="count" fill="#3b82f6" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-800 mb-4">Unresolved System Alerts</h3>
        {activeAlerts.length === 0 ? (
          <div className="text-sm text-gray-500 py-4 text-center">No unresolved alerts</div>
        ) : (
          <div className="space-y-3">
            {activeAlerts.map(alert => (
              <div key={alert.id} className="flex flex-col gap-3 p-3 rounded-lg border border-gray-100 sm:flex-row sm:items-start">
                {alert.type === 'Critical' ? <AlertCircle className="w-5 h-5 text-red-500 shrink-0" /> : alert.type === 'Warning' ? <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0" /> : <Info className="w-5 h-5 text-blue-500 shrink-0" />}
                <div className="flex-1">
                  <div className="font-medium text-sm">{alert.title}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{alert.message}</div>
                  <div className="text-xs text-gray-400 mt-1">{new Date(alert.timestamp).toLocaleString()}</div>
                </div>
                <button onClick={() => resolveAlert(alert)} className="text-xs px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 sm:self-start">Resolve</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        {[
          { label: 'Manage Users', icon: Users, path: '/admin/users' },
          { label: 'View Audit Logs', icon: BookOpen, path: '/admin/audit-logs' },
          { label: 'Reports', icon: BarChart2, path: '/admin/reports' },
          { label: 'Add User', icon: UserPlus, path: '/admin/users?create=1' },
          { label: 'Data Requests', icon: FileCheck2, path: '/admin/data-requests' },
          { label: 'Policy Versions', icon: FileClock, path: '/admin/policy-versions' },
        ].map(({ label, icon: Icon, path }) => (
          <button key={label} onClick={() => navigate(path)}
            className="flex flex-col items-center gap-2 p-4 sm:p-6 bg-white border border-gray-200 rounded-xl hover:bg-blue-50 hover:border-blue-200 transition-colors">
            <Icon className="w-6 h-6 text-blue-600" />
            <span className="text-xs sm:text-sm font-medium text-gray-700 text-center leading-snug">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
