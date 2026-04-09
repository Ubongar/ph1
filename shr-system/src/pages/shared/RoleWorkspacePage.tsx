import { useState } from 'react';
import { CalendarCheck2, CheckCircle2, ListChecks, Search, ShieldAlert, Signal, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../hooks';
import { searchTimelineForUser } from '../../services/timeline';
import { getRoleInbox, updateInboxTaskStatus } from '../../services/inbox';
import { getAppointmentsForRole, updateAppointmentStatus } from '../../services/appointments';
import { runDataQualityScan } from '../../services/dataQuality';
import { getNotificationsForUser, markNotificationRead } from '../../services/notifications';
import { hasPermission } from '../../services/permissions';
import { type LocaleCode, useLocale } from '../../services/i18n';

function getLocalizedRoleName(role: string, t: (key: string) => string): string {
  if (role === 'student') return t('roleStudent');
  if (role === 'medical_staff') return t('roleMedicalStaff');
  if (role === 'technician') return t('roleTechnician');
  if (role === 'pharmacy') return t('rolePharmacy');
  if (role === 'specialist') return t('roleSpecialist');
  if (role === 'admin') return t('roleAdmin');
  return role;
}

function getSlaLabel(status: string, t: (key: string) => string): string {
  if (status === 'overdue') return t('slaOverdue');
  if (status === 'due-soon') return t('slaDueSoon');
  return t('slaOnTrack');
}

function getSlaBadgeClass(status: string): string {
  if (status === 'overdue') return 'bg-red-100 text-red-700';
  if (status === 'due-soon') return 'bg-amber-100 text-amber-700';
  return 'bg-emerald-100 text-emerald-700';
}

function getNotificationClass(isRead: boolean): string {
  return isRead ? 'w-full rounded-lg border p-3 text-left border-gray-200 bg-white' : 'w-full rounded-lg border p-3 text-left border-blue-200 bg-blue-50';
}

function formatTimestamp(value: string, locale: LocaleCode): string {
  return new Date(value).toLocaleString(locale);
}

export default function RoleWorkspacePage() {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [query, setQuery] = useState('');
  const { locale, t } = useLocale();

  if (!currentUser) return null;

  const canQuality = hasPermission(currentUser.role, 'quality.view');
  const canObserve = hasPermission(currentUser.role, 'observability.view');

  const inbox = getRoleInbox(currentUser.role);
  const notifications = getNotificationsForUser(currentUser.role, currentUser.id);
  const appointments = getAppointmentsForRole(currentUser.role, currentUser.id);
  const quality = canQuality ? runDataQualityScan() : [];

  const timeline = searchTimelineForUser(query, currentUser.role, currentUser.id).slice(0, 20);
  const localizedRole = getLocalizedRoleName(currentUser.role, t);
  const observabilityDescription = canObserve ? t('observabilityWithAccessDescription') : t('observabilityNoAccessDescription');

  const roleInboxTitle = t('roleInboxWithSla');
  const timelineTitle = t('unifiedPatientTimelineSearch');

  function completeTask(taskId: string) {
    const next = updateInboxTaskStatus(taskId, 'done');
    if (!next) {
      toast(t('unableUpdateTaskStatus'), 'error');
      return;
    }
    toast(t('taskMarkedDoneToast'), 'success');
  }

  function completeAppointment(id: string) {
    const updated = updateAppointmentStatus(id, 'completed');
    if (!updated) {
      toast(t('unableCompleteAppointment'), 'error');
      return;
    }
    toast(t('appointmentMarkedCompletedToast'), 'success');
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">{t('workflowCenter')}</p>
              <h1 className="mt-1 text-2xl font-bold text-gray-900">{t('roleOperationsWorkspace')}</h1>
              <p className="mt-1 text-sm text-gray-600">{t('roleWorkspaceSubtitle')} ({localizedRole})</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm lg:col-span-1">
            <div className="mb-3 flex items-center gap-2">
              <ListChecks className="h-4 w-4 text-blue-700" />
              <h2 className="text-sm font-semibold text-gray-900">{roleInboxTitle}</h2>
            </div>
            <div className="space-y-2">
              {inbox.slice(0, 8).map((task) => (
                <div key={task.id} className="rounded-xl border border-gray-200 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-gray-900">{task.title}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${getSlaBadgeClass(task.slaStatus)}`}>
                      {getSlaLabel(task.slaStatus, t)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-gray-600">{task.description}</p>
                  <p className="mt-2 text-[11px] text-gray-500">{t('escalationLabel')}: {task.escalationPath}</p>
                  {task.status !== 'done' && (
                    <button
                      type="button"
                      onClick={() => completeTask(task.id)}
                      className="mt-2 inline-flex items-center gap-1 rounded-md bg-blue-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-blue-700"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {t('markDone')}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm lg:col-span-2">
            <div className="mb-3 flex items-center gap-2">
              <Search className="h-4 w-4 text-blue-700" />
              <h2 className="text-sm font-semibold text-gray-900">{timelineTitle}</h2>
            </div>
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t('searchTimelinePlaceholder')}
                className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-400"
              />
            </label>
            <div className="mt-3 space-y-2">
              {timeline.length === 0 && (
                <p className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500">{t('noTimelineFound')}</p>
              )}
              {timeline.map((event) => (
                <div key={event.id} className="rounded-lg border border-gray-200 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-gray-900">{event.title}</p>
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-700">{event.eventType}</span>
                  </div>
                  <p className="mt-1 text-xs text-gray-600">{event.studentName} • {event.details}</p>
                  <p className="mt-1 text-[11px] text-gray-500">{formatTimestamp(event.timestamp, locale)}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <Signal className="h-4 w-4 text-blue-700" />
              <h2 className="text-sm font-semibold text-gray-900">{t('realTimeNotifications')}</h2>
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
                      toast(t('notificationMarkedReadToast'), 'info');
                    }}
                    className={getNotificationClass(isRead)}
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
              <h2 className="text-sm font-semibold text-gray-900">{t('followUpScheduling')}</h2>
            </div>
            <div className="space-y-2">
              {appointments.slice(0, 6).map((item) => (
                <div key={item.id} className="rounded-lg border border-gray-200 p-3">
                  <p className="text-sm font-semibold text-gray-900">{item.studentName}</p>
                  <p className="mt-1 text-xs text-gray-600">{item.reason}</p>
                  <p className="mt-1 text-[11px] text-gray-500">{formatTimestamp(item.scheduledFor, locale)}</p>
                  {item.status === 'scheduled' && (
                    <button
                      type="button"
                      onClick={() => completeAppointment(item.id)}
                      className="mt-2 rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
                    >
                      {t('markCompleted')}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-blue-700" />
              <h2 className="text-sm font-semibold text-gray-900">{t('dataQualitySignals')}</h2>
            </div>
            {!canQuality && (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                {t('qualityRestricted')}
              </p>
            )}
            <div className="space-y-2">
              {quality.map((item) => (
                <div key={item.id} className="rounded-lg border border-gray-200 p-3">
                  <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                  <p className="mt-1 text-xs text-gray-600">{item.description}</p>
                  <p className="mt-1 text-[11px] text-gray-500">{t('suggestionLabel')}: {item.suggestedAction}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-2 flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-blue-700" />
              <h2 className="text-sm font-semibold text-gray-900">{t('securityPermissionModel')}</h2>
            </div>
            <p className="text-xs text-gray-600">
              {t('securityModelDescription')}
            </p>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-2 flex items-center gap-2">
              <Signal className="h-4 w-4 text-blue-700" />
              <h2 className="text-sm font-semibold text-gray-900">{t('observabilityVisibility')}</h2>
            </div>
            <p className="text-xs text-gray-600">
              {observabilityDescription}
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
