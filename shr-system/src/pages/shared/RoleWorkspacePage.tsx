import { useMemo, useState } from 'react';
import { CalendarCheck2, CheckCircle2, Languages, ListChecks, Search, ShieldAlert, Signal, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../hooks';
import { buildStudentTimeline, searchTimeline } from '../../services/timeline';
import { getRoleInbox, updateInboxTaskStatus } from '../../services/inbox';
import { getAppointmentsForRole, updateAppointmentStatus } from '../../services/appointments';
import { runDataQualityScan } from '../../services/dataQuality';
import { getNotificationsForRole, markNotificationRead } from '../../services/notifications';
import { hasPermission } from '../../services/permissions';
import { getLocale, setLocale } from '../../services/i18n';

export default function RoleWorkspacePage() {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [query, setQuery] = useState('');
  const [locale, setLocaleState] = useState(getLocale());

  const timeline = useMemo(() => {
    if (!currentUser) return [];

    if (query.trim()) return searchTimeline(query).slice(0, 20);

    if (currentUser.role === 'student') {
      const studentId = currentUser.id.replace('student-', 'stu-');
      return buildStudentTimeline(studentId).slice(0, 20);
    }

    return searchTimeline('').slice(0, 20);
  }, [currentUser, query]);

  if (!currentUser) return null;

  const inbox = getRoleInbox(currentUser.role);
  const notifications = getNotificationsForRole(currentUser.role);
  const appointments = getAppointmentsForRole(currentUser.role, currentUser.id);
  const quality = runDataQualityScan();

  const canQuality = hasPermission(currentUser.role, 'quality.view');
  const canObserve = hasPermission(currentUser.role, 'observability.view');

  function completeTask(taskId: string) {
    const next = updateInboxTaskStatus(taskId, 'done');
    if (!next) {
      toast('Unable to update task status.', 'error');
      return;
    }
    toast('Task marked as done.', 'success');
  }

  function completeAppointment(id: string) {
    const updated = updateAppointmentStatus(id, 'completed');
    if (!updated) {
      toast('Unable to complete appointment.', 'error');
      return;
    }
    toast('Appointment marked completed.', 'success');
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Workflow Center</p>
              <h1 className="mt-1 text-2xl font-bold text-gray-900">Role Operations Workspace</h1>
              <p className="mt-1 text-sm text-gray-600">Unified inbox, notifications, follow-ups, timeline, and quality visibility for {currentUser.role} role.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700">
                <Languages className="h-4 w-4 text-gray-500" />
                <span>Language</span>
                <select
                  value={locale}
                  onChange={(event) => {
                    const next = event.target.value as 'en' | 'fr' | 'yo';
                    setLocale(next);
                    setLocaleState(next);
                  }}
                  className="rounded border border-gray-200 px-2 py-1 text-xs"
                >
                  <option value="en">EN</option>
                  <option value="fr">FR</option>
                  <option value="yo">YO</option>
                </select>
              </label>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm lg:col-span-1">
            <div className="mb-3 flex items-center gap-2">
              <ListChecks className="h-4 w-4 text-blue-700" />
              <h2 className="text-sm font-semibold text-gray-900">Role Inbox with SLA</h2>
            </div>
            <div className="space-y-2">
              {inbox.slice(0, 8).map((task) => (
                <div key={task.id} className="rounded-xl border border-gray-200 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-gray-900">{task.title}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      task.slaStatus === 'overdue'
                        ? 'bg-red-100 text-red-700'
                        : task.slaStatus === 'due-soon'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {task.slaStatus}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-gray-600">{task.description}</p>
                  <p className="mt-2 text-[11px] text-gray-500">Escalation: {task.escalationPath}</p>
                  {task.status !== 'done' && (
                    <button
                      type="button"
                      onClick={() => completeTask(task.id)}
                      className="mt-2 inline-flex items-center gap-1 rounded-md bg-blue-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-blue-700"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Mark Done
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm lg:col-span-2">
            <div className="mb-3 flex items-center gap-2">
              <Search className="h-4 w-4 text-blue-700" />
              <h2 className="text-sm font-semibold text-gray-900">Unified Patient Timeline Search</h2>
            </div>
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search timeline by student name, event, or detail"
                className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-400"
              />
            </label>
            <div className="mt-3 space-y-2">
              {timeline.length === 0 && (
                <p className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500">No timeline events found.</p>
              )}
              {timeline.map((event) => (
                <div key={event.id} className="rounded-lg border border-gray-200 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-gray-900">{event.title}</p>
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-700">{event.eventType}</span>
                  </div>
                  <p className="mt-1 text-xs text-gray-600">{event.studentName} • {event.details}</p>
                  <p className="mt-1 text-[11px] text-gray-500">{new Date(event.timestamp).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <Signal className="h-4 w-4 text-blue-700" />
              <h2 className="text-sm font-semibold text-gray-900">Real-Time Notifications</h2>
            </div>
            <div className="space-y-2">
              {notifications.slice(0, 6).map((note) => {
                const isRead = note.isReadBy.includes(currentUser.id);
                return (
                  <button
                    key={note.id}
                    type="button"
                    onClick={() => {
                      markNotificationRead(note.id, currentUser.id);
                      toast('Notification marked as read.', 'info');
                    }}
                    className={`w-full rounded-lg border p-3 text-left ${
                      isRead ? 'border-gray-200 bg-white' : 'border-blue-200 bg-blue-50'
                    }`}
                  >
                    <p className="text-sm font-semibold text-gray-900">{note.title}</p>
                    <p className="mt-1 text-xs text-gray-600">{note.message}</p>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <CalendarCheck2 className="h-4 w-4 text-blue-700" />
              <h2 className="text-sm font-semibold text-gray-900">Follow-Up Scheduling</h2>
            </div>
            <div className="space-y-2">
              {appointments.slice(0, 6).map((item) => (
                <div key={item.id} className="rounded-lg border border-gray-200 p-3">
                  <p className="text-sm font-semibold text-gray-900">{item.studentName}</p>
                  <p className="mt-1 text-xs text-gray-600">{item.reason}</p>
                  <p className="mt-1 text-[11px] text-gray-500">{new Date(item.scheduledFor).toLocaleString()}</p>
                  {item.status === 'scheduled' && (
                    <button
                      type="button"
                      onClick={() => completeAppointment(item.id)}
                      className="mt-2 rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
                    >
                      Mark Completed
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-blue-700" />
              <h2 className="text-sm font-semibold text-gray-900">Data Quality Signals</h2>
            </div>
            {!canQuality && (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                Quality detail requires elevated permission.
              </p>
            )}
            <div className="space-y-2">
              {(canQuality ? quality : quality.slice(0, 4)).map((item) => (
                <div key={item.id} className="rounded-lg border border-gray-200 p-3">
                  <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                  <p className="mt-1 text-xs text-gray-600">{item.description}</p>
                  <p className="mt-1 text-[11px] text-gray-500">Suggestion: {item.suggestedAction}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-2 flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-blue-700" />
              <h2 className="text-sm font-semibold text-gray-900">Security and Permission Model</h2>
            </div>
            <p className="text-xs text-gray-600">
              Fine-grained permission scopes are active for each role. Actions in this workspace are filtered by role capability checks.
            </p>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-2 flex items-center gap-2">
              <Signal className="h-4 w-4 text-blue-700" />
              <h2 className="text-sm font-semibold text-gray-900">Observability Visibility</h2>
            </div>
            <p className="text-xs text-gray-600">
              Telemetry and operational traces are captured globally. {canObserve ? 'You have visibility from admin observability pages.' : 'Admin role can access full observability dashboards.'}
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
