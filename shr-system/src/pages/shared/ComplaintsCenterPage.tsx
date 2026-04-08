import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import {
  AlertTriangle,
  ArrowRightCircle,
  CheckCircle2,
  Clock3,
  Eye,
  MessageSquareWarning,
  PhoneCall,
  Send,
  ShieldAlert,
  Siren,
  Star,
} from 'lucide-react';
import { PageHeader } from '../../components/shared/PageHeader';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../hooks';
import { getScopedComplaintsForUser } from '../../services/accessScope';
import {
  buildComplaintTicketId,
  buildOwnershipDueAt,
  COMPLAINT_DEPARTMENTS,
  COMPLAINT_SEVERITIES,
  complaintSeverityToAlertType,
  createTimelineEvent,
  evaluateComplaintEscalation,
  getComplaintSlaMatrixRows,
  getComplaintSlaHours,
  getEscalationLadderConfig,
  getEscalationStepDueAt,
  getOwnershipStatus,
  getRecommendedResponseTemplates,
  hasComplaintBreachedSla,
  hasOwnershipTimedOut,
  inferForwardRoleFromDepartment,
  isComplaintAssignedToUserOrRoleQueue,
  shouldTriggerAdminAlert,
  shouldTriggerCriticalIncident,
} from '../../services/complaints';
import { pushNotification } from '../../services/notifications';
import { create, createAuditEntry, getAll, StorageKey, update } from '../../services/storage';
import type {
  Complaint,
  ComplaintContactChannel,
  ComplaintEvidenceItem,
  ComplaintSeverity,
  ComplaintStatus,
  ComplaintTimelineEvent,
  SystemAlert,
  SystemUser,
  UserRole,
} from '../../types/types';

const STATUS_STYLES: Record<ComplaintStatus, string> = {
  Submitted: 'bg-blue-100 text-blue-700',
  'Under Review': 'bg-amber-100 text-amber-700',
  Forwarded: 'bg-purple-100 text-purple-700',
  'Awaiting Department Feedback': 'bg-orange-100 text-orange-700',
  Resolved: 'bg-emerald-100 text-emerald-700',
  Closed: 'bg-slate-200 text-slate-700',
};

const SEVERITY_STYLES: Record<ComplaintSeverity, string> = {
  Low: 'bg-slate-100 text-slate-700',
  Moderate: 'bg-amber-100 text-amber-700',
  High: 'bg-orange-100 text-orange-700',
  Critical: 'bg-red-100 text-red-700',
};

const CHANNELS: ComplaintContactChannel[] = ['in-app', 'sms', 'email', 'call'];

const CHANNEL_LABELS: Record<ComplaintContactChannel, string> = {
  'in-app': 'In-App',
  sms: 'SMS',
  email: 'Email',
  call: 'Call',
};

interface RatingDraft {
  score: '' | '1' | '2' | '3' | '4' | '5';
  comment: string;
}

function notificationSeverityFromComplaint(severity: ComplaintSeverity): 'info' | 'warning' | 'critical' {
  if (severity === 'Critical') return 'critical';
  if (severity === 'High') return 'warning';
  return 'info';
}

function getAdminUserIds(users: SystemUser[]): string[] {
  return users
    .filter((user) => user.isActive && user.role === 'admin')
    .map((user) => user.id);
}

function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + (value.codePointAt(index) ?? 0)) >>> 0;
  }
  return hash;
}

function getDeterministicDepartmentAssignee(
  users: SystemUser[],
  role: UserRole | undefined,
  complaintId: string,
  excludedUserId?: string,
): SystemUser | undefined {
  if (!role) return undefined;

  const departmentUsers = users
    .filter((user) => user.isActive && user.role === role && user.id !== excludedUserId)
    .sort((left, right) => left.id.localeCompare(right.id));

  if (departmentUsers.length === 0) return undefined;

  const index = hashString(complaintId) % departmentUsers.length;
  return departmentUsers[index];
}

function appendTimeline(complaint: Complaint, ...events: ComplaintTimelineEvent[]): ComplaintTimelineEvent[] {
  return [...(complaint.timeline ?? []), ...events]
    .sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime());
}

function getRenderableTimeline(complaint: Complaint): ComplaintTimelineEvent[] {
  if (complaint.timeline && complaint.timeline.length > 0) return complaint.timeline;

  return [
    {
      id: `fallback-${complaint.id}`,
      createdAt: complaint.createdAt,
      actorUserId: complaint.submittedByUserId,
      actorName: complaint.submittedByName,
      actorRole: complaint.submittedByRole,
      eventType: 'Submitted',
      note: 'Complaint submitted.',
    },
  ];
}

function isComplaintTerminal(status: ComplaintStatus): boolean {
  return status === 'Resolved' || status === 'Closed';
}

function formatDateTime(value: string | undefined): string {
  if (!value) return 'Not yet';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Not yet';
  return parsed.toLocaleString();
}

export default function ComplaintsCenterPage() {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const isAdmin = currentUser?.role === 'admin';

  const readReceiptRef = useRef<Set<string>>(new Set());
  const submitComplaintSectionRef = useRef<HTMLElement | null>(null);
  const myComplaintsSectionRef = useRef<HTMLElement | null>(null);
  const assignedComplaintsSectionRef = useRef<HTMLElement | null>(null);
  const adminSlaSectionRef = useRef<HTMLElement | null>(null);
  const adminQueueSectionRef = useRef<HTMLElement | null>(null);
  const adminDetailSectionRef = useRef<HTMLElement | null>(null);

  const [refreshKey, setRefreshKey] = useState(0);

  const [subject, setSubject] = useState('');
  const [details, setDetails] = useState('');
  const [department, setDepartment] = useState<string>(COMPLAINT_DEPARTMENTS[0]);
  const [severity, setSeverity] = useState<ComplaintSeverity>('Moderate');
  const [isLifeThreatening, setIsLifeThreatening] = useState(false);
  const [evidenceLabel, setEvidenceLabel] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [evidenceNote, setEvidenceNote] = useState('');

  const [activeComplaintId, setActiveComplaintId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<ComplaintStatus | 'all'>('all');
  const [severityFilter, setSeverityFilter] = useState<ComplaintSeverity | 'all'>('all');

  const [forwardDepartment, setForwardDepartment] = useState<string>(COMPLAINT_DEPARTMENTS[0]);
  const [forwardToUserId, setForwardToUserId] = useState('');
  const [forwardNote, setForwardNote] = useState('');
  const [adminResponse, setAdminResponse] = useState('');
  const [selectedTemplateKey, setSelectedTemplateKey] = useState('');
  const [rootCauseSummary, setRootCauseSummary] = useState('');
  const [correctiveAction, setCorrectiveAction] = useState('');
  const [preventionAction, setPreventionAction] = useState('');

  const [feedbackDraftByComplaint, setFeedbackDraftByComplaint] = useState<Record<string, string>>({});
  const [ratingDraftByComplaint, setRatingDraftByComplaint] = useState<Record<string, RatingDraft>>({});
  const [threadDraftByComplaint, setThreadDraftByComplaint] = useState<Record<string, string>>({});

  const users = useMemo(() => {
    if (refreshKey < 0) return [];
    return getAll<SystemUser>(StorageKey.USERS).filter((user) => user.isActive);
  }, [refreshKey]);

  const complaints = useMemo(() => {
    if (!currentUser) return [];
    if (refreshKey < 0) return [];
    return getScopedComplaintsForUser(currentUser.role, currentUser.id);
  }, [currentUser, refreshKey]);

  const adminFilteredComplaints = useMemo(() => {
    if (!isAdmin) return [];

    return complaints.filter((complaint) => {
      if (statusFilter !== 'all' && complaint.status !== statusFilter) return false;
      if (severityFilter !== 'all' && complaint.severity !== severityFilter) return false;
      return true;
    });
  }, [complaints, isAdmin, statusFilter, severityFilter]);

  const activeComplaint = useMemo(() => {
    if (!isAdmin) return null;
    if (activeComplaintId) {
      return complaints.find((item) => item.id === activeComplaintId) ?? null;
    }
    return adminFilteredComplaints[0] ?? null;
  }, [isAdmin, activeComplaintId, complaints, adminFilteredComplaints]);

  const visibleAssignedToMe = useMemo(() => {
    if (!currentUser || isAdmin) return [];
    return complaints.filter((complaint) => (
      complaint.submittedByUserId !== currentUser.id
      && isComplaintAssignedToUserOrRoleQueue(complaint, currentUser.role, currentUser.id)
    ));
  }, [complaints, currentUser, isAdmin]);

  const visibleFiledByMe = useMemo(() => {
    if (!currentUser || isAdmin) return [];
    return complaints.filter((complaint) => complaint.submittedByUserId === currentUser.id);
  }, [complaints, currentUser, isAdmin]);

  const assignableUsers = useMemo(() => {
    const role = inferForwardRoleFromDepartment(forwardDepartment);
    return users.filter((user) => {
      if (user.role === 'admin') return false;
      if (!role) return true;
      return user.role === role;
    });
  }, [forwardDepartment, users]);

  const recommendedTemplates = useMemo(() => {
    if (!activeComplaint) return [];
    return getRecommendedResponseTemplates(activeComplaint);
  }, [activeComplaint]);

  const selectedTemplate = useMemo(
    () => recommendedTemplates.find((template) => template.key === selectedTemplateKey),
    [recommendedTemplates, selectedTemplateKey],
  );

  const slaMatrixRows = useMemo(() => getComplaintSlaMatrixRows(), []);
  const escalationConfig = useMemo(() => getEscalationLadderConfig(), []);

  const roleLeadDashboard = useMemo(() => {
    if (!isAdmin) return null;

    const openComplaints = complaints.filter((complaint) => !isComplaintTerminal(complaint.status));
    const overdueComplaints = openComplaints.filter((complaint) => hasComplaintBreachedSla(complaint));

    const resolutionDurationsHours: number[] = [];
    const repeatCounter = new Map<string, number>();
    const byDepartment = new Map<string, {
      backlog: number;
      overdue: number;
      resolvedDurations: number[];
    }>();

    complaints.forEach((complaint) => {
      const departmentKey = complaint.forwardedToDepartment ?? complaint.concernedDepartment;
      if (!byDepartment.has(departmentKey)) {
        byDepartment.set(departmentKey, {
          backlog: 0,
          overdue: 0,
          resolvedDurations: [],
        });
      }

      const bucket = byDepartment.get(departmentKey);
      if (!bucket) return;

      const repeatKey = `${departmentKey}:${complaint.submittedByUserId}`;
      repeatCounter.set(repeatKey, (repeatCounter.get(repeatKey) ?? 0) + 1);

      if (!isComplaintTerminal(complaint.status)) {
        bucket.backlog += 1;
      }

      if (!isComplaintTerminal(complaint.status) && hasComplaintBreachedSla(complaint)) {
        bucket.overdue += 1;
      }

      if (complaint.adminRespondedAt) {
        const createdMs = new Date(complaint.createdAt).getTime();
        const resolvedMs = new Date(complaint.adminRespondedAt).getTime();
        if (!Number.isNaN(createdMs) && !Number.isNaN(resolvedMs) && resolvedMs > createdMs) {
          const hours = (resolvedMs - createdMs) / (60 * 60 * 1000);
          resolutionDurationsHours.push(hours);
          bucket.resolvedDurations.push(hours);
        }
      }
    });

    const avgResolutionHours = resolutionDurationsHours.length > 0
      ? resolutionDurationsHours.reduce((sum, item) => sum + item, 0) / resolutionDurationsHours.length
      : null;

    const repeatPatterns = Array.from(repeatCounter.values()).filter((count) => count > 1).length;

    const rows = Array.from(byDepartment.entries()).map(([departmentName, bucket]) => {
      const avgHours = bucket.resolvedDurations.length > 0
        ? bucket.resolvedDurations.reduce((sum, item) => sum + item, 0) / bucket.resolvedDurations.length
        : null;

      return {
        departmentName,
        backlog: bucket.backlog,
        overdue: bucket.overdue,
        avgHours,
      };
    }).sort((left, right) => right.overdue - left.overdue);

    return {
      backlog: openComplaints.length,
      overdue: overdueComplaints.length,
      avgResolutionHours,
      repeatPatterns,
      rows,
    };
  }, [complaints, isAdmin]);

  useEffect(() => {
    if (!activeComplaint) return;

    setForwardDepartment(activeComplaint.forwardedToDepartment ?? activeComplaint.concernedDepartment);
    setForwardToUserId(activeComplaint.forwardedToUserId ?? '');
    setForwardNote(activeComplaint.forwardNote ?? '');
    setAdminResponse(activeComplaint.adminResponse ?? '');
    setSelectedTemplateKey(activeComplaint.responseTemplateKey ?? '');
    setRootCauseSummary(activeComplaint.rootCauseSummary ?? '');
    setCorrectiveAction(activeComplaint.correctiveAction ?? '');
    setPreventionAction(activeComplaint.preventionAction ?? '');
  }, [activeComplaint]);

  useEffect(() => {
    if (!isAdmin || !activeComplaintId) return;
    if (globalThis.matchMedia === undefined) return;

    const isMobileViewport = globalThis.matchMedia('(max-width: 1023px)').matches;
    if (!isMobileViewport) return;

    adminDetailSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [activeComplaintId, isAdmin]);

  useEffect(() => {
    if (!currentUser) return;

    const nowIso = new Date().toISOString();
    let updatedReadReceipts = 0;

    if (isAdmin) {
      if (activeComplaint) {
        const receiptKey = `admin:${activeComplaint.id}`;
        if (!readReceiptRef.current.has(receiptKey) && !activeComplaint.adminLastViewedAt) {
          readReceiptRef.current.add(receiptKey);

          const updatedComplaint = update<Complaint>(
            StorageKey.COMPLAINTS,
            activeComplaint.id,
            {
              adminLastViewedAt: nowIso,
              timeline: appendTimeline(
                activeComplaint,
                createTimelineEvent(currentUser.id, currentUser.name, currentUser.role, 'ReadReceipt', 'Admin viewed complaint.'),
              ),
            },
            { autoAudit: false },
          );

          if (updatedComplaint) updatedReadReceipts += 1;
        }
      }
    } else {
      visibleFiledByMe.forEach((complaint) => {
        const receiptKey = `complainant:${complaint.id}`;
        if (readReceiptRef.current.has(receiptKey) || complaint.complainantLastViewedAt) return;

        readReceiptRef.current.add(receiptKey);
        const updatedComplaint = update<Complaint>(
          StorageKey.COMPLAINTS,
          complaint.id,
          {
            complainantLastViewedAt: nowIso,
            timeline: appendTimeline(
              complaint,
              createTimelineEvent(currentUser.id, currentUser.name, currentUser.role, 'ReadReceipt', 'Complainant viewed complaint status.'),
            ),
          },
          { autoAudit: false },
        );
        if (updatedComplaint) updatedReadReceipts += 1;
      });

      visibleAssignedToMe.forEach((complaint) => {
        const receiptKey = `assignee:${complaint.id}`;
        if (readReceiptRef.current.has(receiptKey) || complaint.assigneeLastViewedAt) return;

        readReceiptRef.current.add(receiptKey);
        const updatedComplaint = update<Complaint>(
          StorageKey.COMPLAINTS,
          complaint.id,
          {
            assigneeLastViewedAt: nowIso,
            timeline: appendTimeline(
              complaint,
              createTimelineEvent(currentUser.id, currentUser.name, currentUser.role, 'ReadReceipt', 'Assigned staff viewed complaint.'),
            ),
          },
          { autoAudit: false },
        );
        if (updatedComplaint) updatedReadReceipts += 1;
      });
    }

    if (updatedReadReceipts > 0) {
      setRefreshKey((value) => value + 1);
    }
  }, [activeComplaint, currentUser, isAdmin, visibleAssignedToMe, visibleFiledByMe]);

  const triggerCriticalIncidentChannels = useCallback((baseComplaint: Complaint, reason: string): Complaint | null => {
    if (!currentUser) return null;

    const adminIds = getAdminUserIds(users);
    const nowIso = new Date().toISOString();

    CHANNELS.forEach((channel) => {
      create<SystemAlert>(
        StorageKey.ALERTS,
        {
          type: 'Critical',
          title: `${CHANNEL_LABELS[channel]} alert: ${baseComplaint.ticketId}`,
          message: `Mock ${CHANNEL_LABELS[channel]} channel triggered for ${baseComplaint.ticketId}. ${reason}`,
          timestamp: nowIso,
          isResolved: false,
        },
        { autoAudit: false },
      );
    });

    pushNotification({
      title: `Critical incident: ${baseComplaint.ticketId}`,
      message: `Emergency channels (in-app, SMS, email, call) were triggered in mock mode.`,
      severity: 'critical',
      roleTargets: ['admin'],
      userTargetIds: adminIds,
      actionPath: '/complaints',
    });

    return update<Complaint>(
      StorageKey.COMPLAINTS,
      baseComplaint.id,
      {
        criticalIncidentChannels: CHANNELS,
        timeline: appendTimeline(
          baseComplaint,
          createTimelineEvent('system', 'Workflow Engine', 'system', 'CriticalIncidentTriggered', reason, JSON.stringify(CHANNELS)),
        ),
        updatedAt: nowIso,
      },
      { autoAudit: false },
    );
  }, [currentUser, users]);

  useEffect(() => {
    if (!isAdmin || !currentUser) return;

    const now = new Date();
    const nowIso = now.toISOString();
    const adminIds = getAdminUserIds(users);
    const adminLead = users
      .filter((user) => user.role === 'admin')
      .sort((left, right) => left.id.localeCompare(right.id))[0];

    let automationActions = 0;

    complaints.forEach((complaint) => {
      if (isComplaintTerminal(complaint.status)) return;

      if (hasOwnershipTimedOut(complaint, now)) {
        const reassigned = getDeterministicDepartmentAssignee(
          users,
          complaint.forwardedToRole,
          complaint.id,
          complaint.forwardedToUserId,
        );

        const timeoutNote = reassigned
          ? `Ownership acknowledgement timed out. Complaint reassigned to ${reassigned.name}.`
          : 'Ownership acknowledgement timed out and no reassignment candidate was found.';

        const ownershipUpdate = update<Complaint>(
          StorageKey.COMPLAINTS,
          complaint.id,
          {
            status: reassigned ? 'Awaiting Department Feedback' : 'Under Review',
            updatedAt: nowIso,
            ownershipStatus: reassigned ? 'Pending Acknowledgement' : 'Timed Out',
            ownershipDueAt: reassigned ? buildOwnershipDueAt(now) : undefined,
            acknowledgedAt: undefined,
            acknowledgedByUserId: undefined,
            acknowledgedByUserName: undefined,
            acknowledgementTimeoutCount: (complaint.acknowledgementTimeoutCount ?? 0) + 1,
            forwardedToUserId: reassigned?.id,
            forwardedToUserName: reassigned?.name,
            timeline: appendTimeline(
              complaint,
              createTimelineEvent('system', 'Workflow Engine', 'system', 'OwnershipTimedOut', timeoutNote),
            ),
          },
          { autoAudit: false },
        );

        if (ownershipUpdate) {
          pushNotification({
            title: `Ownership timeout: ${ownershipUpdate.ticketId}`,
            message: timeoutNote,
            severity: 'warning',
            roleTargets: ['admin'],
            userTargetIds: adminIds,
            actionPath: '/complaints',
          });

          if (reassigned) {
            pushNotification({
              title: `Complaint reassigned: ${ownershipUpdate.ticketId}`,
              message: 'Please acknowledge ownership promptly to avoid further escalation.',
              severity: 'warning',
              roleTargets: [reassigned.role],
              userTargetIds: [reassigned.id],
              actionPath: '/complaints',
            });
          }

          automationActions += 1;
        }

        return;
      }

      const escalationDecision = evaluateComplaintEscalation(complaint, now);
      if (!escalationDecision.shouldEscalate || !escalationDecision.route) return;

      let targetDepartment = complaint.forwardedToDepartment ?? complaint.concernedDepartment;
      let targetRole = complaint.forwardedToRole ?? inferForwardRoleFromDepartment(targetDepartment);
      let assignee: SystemUser | undefined;

      if (escalationDecision.route === 'department-lead') {
        assignee = getDeterministicDepartmentAssignee(users, targetRole, complaint.id);
      }

      if (escalationDecision.route === 'admin-lead') {
        targetDepartment = 'Administration';
        targetRole = 'admin';
        assignee = adminLead;
      }

      let escalationMessage = 'Complaint escalated to emergency path due to unresolved critical risk.';

      if (escalationDecision.route === 'department-lead') {
        let assigneeLabel = '';
        if (assignee?.name) {
          assigneeLabel = ` (${assignee.name})`;
        }
        escalationMessage = `SLA breach escalated to department lead${assigneeLabel}.`;
      } else if (escalationDecision.route === 'admin-lead') {
        let assigneeLabel = '';
        if (assignee?.name) {
          assigneeLabel = ` (${assignee.name})`;
        }
        escalationMessage = `Complaint escalated to admin lead${assigneeLabel}.`;
      }

      const escalatedComplaint = update<Complaint>(
        StorageKey.COMPLAINTS,
        complaint.id,
        {
          updatedAt: nowIso,
          escalationLevel: escalationDecision.nextLevel,
          escalationRoute: escalationDecision.route,
          lastEscalationAt: nowIso,
          slaEscalatedAt: complaint.slaEscalatedAt ?? nowIso,
          escalationStepDueAt: getEscalationStepDueAt(escalationDecision.nextLevel, now),
          forwardedToDepartment: targetDepartment,
          forwardedToRole: targetRole,
          forwardedToUserId: assignee?.id,
          forwardedToUserName: assignee?.name,
          status: assignee ? 'Awaiting Department Feedback' : 'Under Review',
          ownershipStatus: assignee && assignee.role !== 'admin' ? 'Pending Acknowledgement' : complaint.ownershipStatus,
          ownershipDueAt: assignee && assignee.role !== 'admin' ? buildOwnershipDueAt(now) : complaint.ownershipDueAt,
          timeline: appendTimeline(
            complaint,
            createTimelineEvent(
              'system',
              'Workflow Engine',
              'system',
              'Escalated',
              escalationMessage,
              JSON.stringify({ route: escalationDecision.route, level: escalationDecision.nextLevel }),
            ),
          ),
        },
        { autoAudit: false },
      );

      if (!escalatedComplaint) return;

      create<SystemAlert>(
        StorageKey.ALERTS,
        {
          type: 'Critical',
          title: `Escalation level ${escalationDecision.nextLevel}: ${escalatedComplaint.ticketId}`,
          message: escalationMessage,
          timestamp: nowIso,
          isResolved: false,
        },
        { autoAudit: false },
      );

      pushNotification({
        title: `Complaint escalated: ${escalatedComplaint.ticketId}`,
        message: escalationMessage,
        severity: 'critical',
        roleTargets: ['admin'],
        userTargetIds: adminIds,
        actionPath: '/complaints',
      });

      if (assignee) {
        pushNotification({
          title: `Escalated complaint assigned: ${escalatedComplaint.ticketId}`,
          message: 'This complaint requires urgent attention and acknowledgement.',
          severity: 'critical',
          roleTargets: [assignee.role],
          userTargetIds: [assignee.id],
          actionPath: '/complaints',
        });
      }

      if (escalationDecision.route === 'emergency') {
        triggerCriticalIncidentChannels(
          escalatedComplaint,
          `Escalation ladder reached emergency route for ${escalatedComplaint.ticketId}.`,
        );
      }

      automationActions += 1;
    });

    if (automationActions > 0) {
      setRefreshKey((value) => value + 1);
      toast(`${automationActions} complaint workflow automation action(s) executed.`, 'warning');
    }
  }, [complaints, currentUser, isAdmin, toast, triggerCriticalIncidentChannels, users]);

  if (!currentUser) return null;

  function refresh(): void {
    setRefreshKey((value) => value + 1);
  }

  function handleSubmitComplaint(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (!currentUser) return;

    const trimmedSubject = subject.trim();
    const trimmedDetails = details.trim();
    const trimmedEvidenceLabel = evidenceLabel.trim();
    const trimmedEvidenceUrl = evidenceUrl.trim();
    const trimmedEvidenceNote = evidenceNote.trim();

    if (trimmedSubject.length < 6) {
      toast('Please provide a clear complaint subject.', 'warning');
      return;
    }

    if (trimmedDetails.length < 16) {
      toast('Please provide enough details so admin can act quickly.', 'warning');
      return;
    }

    if ((trimmedEvidenceLabel || trimmedEvidenceNote) && !trimmedEvidenceUrl) {
      toast('Add an evidence URL when entering evidence details.', 'warning');
      return;
    }

    const nowIso = new Date().toISOString();
    const ticketId = buildComplaintTicketId();

    const evidenceItems: ComplaintEvidenceItem[] = [];
    const timelineEvents: ComplaintTimelineEvent[] = [
      createTimelineEvent(currentUser.id, currentUser.name, currentUser.role, 'Submitted', 'Complaint submitted.'),
    ];

    if (trimmedEvidenceUrl) {
      evidenceItems.push({
        id: crypto.randomUUID(),
        label: trimmedEvidenceLabel || 'Evidence link',
        url: trimmedEvidenceUrl,
        uploadedAt: nowIso,
        uploadedByUserId: currentUser.id,
        uploadedByUserName: currentUser.name,
        note: trimmedEvidenceNote || undefined,
      });

      timelineEvents.push(
        createTimelineEvent(
          currentUser.id,
          currentUser.name,
          currentUser.role,
          'EvidenceAdded',
          `Evidence attached: ${trimmedEvidenceLabel || 'Evidence link'}.`,
          trimmedEvidenceUrl,
        ),
      );
    }

    const createdComplaint = create<Complaint>(
      StorageKey.COMPLAINTS,
      {
        ticketId,
        submittedByUserId: currentUser.id,
        submittedByName: currentUser.name,
        submittedByRole: currentUser.role,
        subject: trimmedSubject,
        details: trimmedDetails,
        concernedDepartment: department,
        severity,
        status: 'Submitted',
        createdAt: nowIso,
        updatedAt: nowIso,
        ownershipStatus: 'Unassigned',
        escalationLevel: 0,
        isLifeThreatening,
        evidenceItems,
        timeline: timelineEvents,
      },
      { autoAudit: false },
    );

    createAuditEntry({
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      action: 'SUBMIT_COMPLAINT',
      resourceType: 'Complaint',
      resourceId: createdComplaint.id,
      resourceDescription: `Submitted complaint ${ticketId}`,
      status: 'Success',
      changeDetails: JSON.stringify({ severity, concernedDepartment: department, isLifeThreatening }),
    });

    const adminIds = getAdminUserIds(users);

    pushNotification({
      title: `New ${severity} Complaint`,
      message: `${currentUser.name} submitted ${ticketId} for ${department}.`,
      severity: notificationSeverityFromComplaint(severity),
      roleTargets: ['admin'],
      userTargetIds: adminIds,
      actionPath: '/complaints',
    });

    if (shouldTriggerAdminAlert(severity)) {
      create<SystemAlert>(
        StorageKey.ALERTS,
        {
          type: complaintSeverityToAlertType(severity),
          title: `${severity} complaint escalation: ${ticketId}`,
          message: `${currentUser.name} raised a ${severity.toLowerCase()} complaint for ${department}. Immediate review is recommended.`,
          timestamp: nowIso,
          isResolved: false,
        },
        { autoAudit: false },
      );
    }

    if (shouldTriggerCriticalIncident(createdComplaint)) {
      triggerCriticalIncidentChannels(
        createdComplaint,
        'Complaint was marked critical/life-threatening at submission and emergency channels were activated in mock mode.',
      );
    }

    setSubject('');
    setDetails('');
    setDepartment(COMPLAINT_DEPARTMENTS[0]);
    setSeverity('Moderate');
    setIsLifeThreatening(false);
    setEvidenceLabel('');
    setEvidenceUrl('');
    setEvidenceNote('');

    refresh();
    toast(`Complaint submitted successfully. Ticket: ${ticketId}`, 'success');
  }

  function handleForwardComplaint(): void {
    if (!isAdmin || !activeComplaint || !currentUser) return;

    const selectedAssignee = forwardToUserId
      ? users.find((user) => user.id === forwardToUserId)
      : undefined;

    if (forwardToUserId && !selectedAssignee) {
      toast('Selected assignee is no longer available.', 'error');
      return;
    }

    const forwardRole = selectedAssignee?.role ?? inferForwardRoleFromDepartment(forwardDepartment);
    const queueAssignee = selectedAssignee
      ? undefined
      : getDeterministicDepartmentAssignee(users, forwardRole, activeComplaint.id);
    const assignee = selectedAssignee ?? queueAssignee;

    const now = new Date();
    const nowIso = now.toISOString();
    const nextStatus: ComplaintStatus = assignee ? 'Awaiting Department Feedback' : 'Forwarded';

    const forwardedComplaint = update<Complaint>(
      StorageKey.COMPLAINTS,
      activeComplaint.id,
      {
        status: nextStatus,
        updatedAt: nowIso,
        adminReviewerId: currentUser.id,
        adminReviewerName: currentUser.name,
        forwardedAt: nowIso,
        forwardedToDepartment: forwardDepartment,
        forwardedToRole: forwardRole,
        forwardedToUserId: assignee?.id,
        forwardedToUserName: assignee?.name,
        forwardNote: forwardNote.trim() || undefined,
        ownershipStatus: assignee ? 'Pending Acknowledgement' : 'Unassigned',
        ownershipDueAt: assignee ? buildOwnershipDueAt(now) : undefined,
        acknowledgedAt: undefined,
        acknowledgedByUserId: undefined,
        acknowledgedByUserName: undefined,
        departmentFeedback: undefined,
        departmentFeedbackAt: undefined,
        departmentFeedbackByUserId: undefined,
        departmentFeedbackByUserName: undefined,
        timeline: appendTimeline(
          activeComplaint,
          createTimelineEvent(
            currentUser.id,
            currentUser.name,
            currentUser.role,
            'Forwarded',
            assignee
              ? `Complaint forwarded to ${assignee.name} (${assignee.role}).`
              : `Complaint forwarded to ${forwardDepartment} queue.`,
            JSON.stringify({ forwardNote: forwardNote.trim() || null }),
          ),
        ),
      },
      { autoAudit: false },
    );

    if (!forwardedComplaint) {
      toast('Unable to forward complaint. Please retry.', 'error');
      return;
    }

    createAuditEntry({
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      action: 'FORWARD_COMPLAINT',
      resourceType: 'Complaint',
      resourceId: forwardedComplaint.id,
      resourceDescription: `Forwarded ${forwardedComplaint.ticketId}`,
      status: 'Success',
      changeDetails: JSON.stringify({
        forwardedToDepartment: forwardDepartment,
        forwardedToUserId: assignee?.id,
        ownershipStatus: forwardedComplaint.ownershipStatus,
      }),
    });

    if (assignee) {
      pushNotification({
        title: `Complaint assigned: ${forwardedComplaint.ticketId}`,
        message: `Please acknowledge ownership within 2 hours to avoid auto-reassignment.`,
        severity: 'warning',
        roleTargets: [assignee.role],
        userTargetIds: [assignee.id],
        actionPath: '/complaints',
      });
    }

    refresh();
    toast(
      assignee
        ? `Complaint forwarded to ${assignee.name}.`
        : 'Complaint marked as forwarded to department queue.',
      'success',
    );
  }

  function handleAcknowledgeOwnership(complaint: Complaint): void {
    if (!currentUser) return;
    if (complaint.forwardedToUserId !== currentUser.id) {
      toast('Only the assigned owner can acknowledge this complaint.', 'warning');
      return;
    }

    const nowIso = new Date().toISOString();

    const acknowledgedComplaint = update<Complaint>(
      StorageKey.COMPLAINTS,
      complaint.id,
      {
        status: 'Under Review',
        updatedAt: nowIso,
        ownershipStatus: 'Acknowledged',
        acknowledgedAt: nowIso,
        acknowledgedByUserId: currentUser.id,
        acknowledgedByUserName: currentUser.name,
        timeline: appendTimeline(
          complaint,
          createTimelineEvent(currentUser.id, currentUser.name, currentUser.role, 'Acknowledged', 'Ownership acknowledged by assigned user.'),
        ),
      },
      { autoAudit: false },
    );

    if (!acknowledgedComplaint) {
      toast('Could not acknowledge ownership right now.', 'error');
      return;
    }

    const adminIds = getAdminUserIds(users);
    pushNotification({
      title: `Ownership acknowledged: ${acknowledgedComplaint.ticketId}`,
      message: `${currentUser.name} has acknowledged complaint ownership.`,
      severity: 'info',
      roleTargets: ['admin'],
      userTargetIds: adminIds,
      actionPath: '/complaints',
    });

    refresh();
    toast('Ownership acknowledged successfully.', 'success');
  }

  function handleSubmitFeedback(complaint: Complaint): void {
    if (!currentUser) return;

    const assignedToCurrentUser = isComplaintAssignedToUserOrRoleQueue(
      complaint,
      currentUser.role,
      currentUser.id,
    );

    if (!assignedToCurrentUser || complaint.submittedByUserId === currentUser.id) {
      toast('Only the assigned user or department queue member can submit feedback.', 'warning');
      return;
    }

    if (getOwnershipStatus(complaint) === 'Pending Acknowledgement' && complaint.forwardedToUserId === currentUser.id) {
      toast('Please acknowledge ownership before submitting feedback.', 'warning');
      return;
    }

    const draft = (feedbackDraftByComplaint[complaint.id] ?? '').trim();
    if (draft.length < 10) {
      toast('Please provide more detailed feedback for admin.', 'warning');
      return;
    }

    const nowIso = new Date().toISOString();

    const updatedComplaint = update<Complaint>(
      StorageKey.COMPLAINTS,
      complaint.id,
      {
        status: 'Under Review',
        updatedAt: nowIso,
        departmentFeedback: draft,
        departmentFeedbackAt: nowIso,
        departmentFeedbackByUserId: currentUser.id,
        departmentFeedbackByUserName: currentUser.name,
        timeline: appendTimeline(
          complaint,
          createTimelineEvent(currentUser.id, currentUser.name, currentUser.role, 'DepartmentFeedback', 'Department feedback submitted to admin.', draft),
        ),
      },
      { autoAudit: false },
    );

    if (!updatedComplaint) {
      toast('Could not submit department feedback.', 'error');
      return;
    }

    createAuditEntry({
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      action: 'SUBMIT_COMPLAINT_FEEDBACK',
      resourceType: 'Complaint',
      resourceId: updatedComplaint.id,
      resourceDescription: `Submitted department feedback for ${updatedComplaint.ticketId}`,
      status: 'Success',
    });

    const adminIds = getAdminUserIds(users);
    pushNotification({
      title: `Feedback received: ${updatedComplaint.ticketId}`,
      message: `${currentUser.name} submitted department feedback for admin review.`,
      severity: 'info',
      roleTargets: ['admin'],
      userTargetIds: adminIds,
      actionPath: '/complaints',
    });

    setFeedbackDraftByComplaint((prev) => ({ ...prev, [complaint.id]: '' }));
    refresh();
    toast('Feedback sent to admin successfully.', 'success');
  }

  function handlePostThreadMessage(complaint: Complaint): void {
    if (!currentUser) return;

    const draft = (threadDraftByComplaint[complaint.id] ?? '').trim();
    if (draft.length < 4) {
      toast('Enter a short message before posting to the complaint thread.', 'warning');
      return;
    }

    const nowIso = new Date().toISOString();
    const updatedComplaint = update<Complaint>(
      StorageKey.COMPLAINTS,
      complaint.id,
      {
        updatedAt: nowIso,
        timeline: appendTimeline(
          complaint,
          createTimelineEvent(currentUser.id, currentUser.name, currentUser.role, 'ThreadMessage', draft),
        ),
      },
      { autoAudit: false },
    );

    if (!updatedComplaint) {
      toast('Could not post thread message right now.', 'error');
      return;
    }

    const adminIds = getAdminUserIds(users);

    if (currentUser.role === 'admin') {
      const targetUserIds = Array.from(new Set([
        updatedComplaint.submittedByUserId,
        updatedComplaint.forwardedToUserId,
      ].filter((id): id is string => Boolean(id) && id !== currentUser.id)));

      if (targetUserIds.length > 0) {
        const roleTargets = Array.from(new Set(
          targetUserIds
            .map((id) => users.find((user) => user.id === id)?.role)
            .filter((role): role is UserRole => Boolean(role)),
        ));

        pushNotification({
          title: `Thread update: ${updatedComplaint.ticketId}`,
          message: `${currentUser.name} posted a message on the complaint thread.`,
          severity: 'info',
          roleTargets: roleTargets.length > 0 ? roleTargets : [updatedComplaint.submittedByRole],
          userTargetIds: targetUserIds,
          actionPath: '/complaints',
        });
      }
    } else {
      pushNotification({
        title: `Thread update: ${updatedComplaint.ticketId}`,
        message: `${currentUser.name} posted a message on the complaint thread.`,
        severity: 'info',
        roleTargets: ['admin'],
        userTargetIds: adminIds,
        actionPath: '/complaints',
      });
    }

    setThreadDraftByComplaint((prev) => ({ ...prev, [complaint.id]: '' }));
    refresh();
    toast('Message posted to complaint thread.', 'success');
  }

  function handleApplyTemplate(): void {
    if (!selectedTemplate) {
      toast('Select a response template first.', 'warning');
      return;
    }

    setAdminResponse(selectedTemplate.body);
    toast('Response template applied.', 'success');
  }

  function handleSendAdminResponse(): void {
    if (!isAdmin || !activeComplaint || !currentUser) return;

    const trimmedResponse = adminResponse.trim();
    const trimmedRootCause = rootCauseSummary.trim();
    const trimmedCorrectiveAction = correctiveAction.trim();
    const trimmedPreventionAction = preventionAction.trim();

    if (trimmedResponse.length < 10) {
      toast('Please include a complete response before sending.', 'warning');
      return;
    }

    if (trimmedRootCause.length < 8 || trimmedCorrectiveAction.length < 8 || trimmedPreventionAction.length < 8) {
      toast('Please capture root cause, corrective action, and prevention action before resolving.', 'warning');
      return;
    }

    const nowIso = new Date().toISOString();

    const updatedComplaint = update<Complaint>(
      StorageKey.COMPLAINTS,
      activeComplaint.id,
      {
        status: 'Resolved',
        updatedAt: nowIso,
        adminReviewerId: currentUser.id,
        adminReviewerName: currentUser.name,
        adminResponse: trimmedResponse,
        adminRespondedAt: nowIso,
        adminResponderId: currentUser.id,
        adminResponderName: currentUser.name,
        rootCauseSummary: trimmedRootCause,
        correctiveAction: trimmedCorrectiveAction,
        preventionAction: trimmedPreventionAction,
        responseTemplateKey: selectedTemplateKey || undefined,
        timeline: appendTimeline(
          activeComplaint,
          createTimelineEvent(
            currentUser.id,
            currentUser.name,
            currentUser.role,
            'RootCauseUpdated',
            'Root cause and prevention actions documented.',
            JSON.stringify({
              rootCauseSummary: trimmedRootCause,
              correctiveAction: trimmedCorrectiveAction,
              preventionAction: trimmedPreventionAction,
            }),
          ),
          createTimelineEvent(currentUser.id, currentUser.name, currentUser.role, 'AdminResponse', 'Admin final response sent to complainant.'),
        ),
      },
      { autoAudit: false },
    );

    if (!updatedComplaint) {
      toast('Unable to send admin response right now.', 'error');
      return;
    }

    createAuditEntry({
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      action: 'RESPOND_COMPLAINT',
      resourceType: 'Complaint',
      resourceId: updatedComplaint.id,
      resourceDescription: `Responded to ${updatedComplaint.ticketId}`,
      status: 'Success',
    });

    pushNotification({
      title: `Complaint update: ${updatedComplaint.ticketId}`,
      message: 'Admin has posted an official response to your complaint.',
      severity: 'info',
      roleTargets: [updatedComplaint.submittedByRole],
      userTargetIds: [updatedComplaint.submittedByUserId],
      actionPath: '/complaints',
    });

    refresh();
    toast('Response sent to complainant.', 'success');
  }

  function handleSubmitResolutionRating(complaint: Complaint): void {
    if (!currentUser) return;
    if (complaint.submittedByUserId !== currentUser.id) {
      toast('Only the original complainant can rate the resolution.', 'warning');
      return;
    }

    const draft = ratingDraftByComplaint[complaint.id] ?? { score: '', comment: '' };
    const numericScore = Number(draft.score);
    if (![1, 2, 3, 4, 5].includes(numericScore)) {
      toast('Select a rating score between 1 and 5.', 'warning');
      return;
    }

    if (draft.comment.trim().length < 6) {
      toast('Please share a short comment about response quality.', 'warning');
      return;
    }

    const nowIso = new Date().toISOString();

    const updatedComplaint = update<Complaint>(
      StorageKey.COMPLAINTS,
      complaint.id,
      {
        resolutionRating: numericScore as 1 | 2 | 3 | 4 | 5,
        resolutionRatingComment: draft.comment.trim(),
        resolutionRatedAt: nowIso,
        resolutionRatedByUserId: currentUser.id,
        timeline: appendTimeline(
          complaint,
          createTimelineEvent(
            currentUser.id,
            currentUser.name,
            currentUser.role,
            'ResolutionRated',
            `Complainant submitted a ${numericScore}/5 resolution rating.`,
            draft.comment.trim(),
          ),
        ),
      },
      { autoAudit: false },
    );

    if (!updatedComplaint) {
      toast('Could not submit rating right now.', 'error');
      return;
    }

    const adminIds = getAdminUserIds(users);
    pushNotification({
      title: `Resolution rated: ${updatedComplaint.ticketId}`,
      message: `${currentUser.name} submitted a ${numericScore}/5 post-resolution rating.`,
      severity: 'info',
      roleTargets: ['admin'],
      userTargetIds: adminIds,
      actionPath: '/complaints',
    });

    setRatingDraftByComplaint((prev) => ({
      ...prev,
      [complaint.id]: { score: '', comment: '' },
    }));

    refresh();
    toast('Resolution rating submitted. Thank you.', 'success');
  }

  function scrollToSection(section: HTMLElement | null): void {
    section?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <div className="space-y-5 px-3 py-4 sm:p-6">
      <PageHeader
        title="Complaints Center"
        subtitle={
          isAdmin
            ? 'Mock workflow mode: SLA matrix, escalation ladder, ownership controls, timeline, and quality tracking are active.'
            : 'Submit complaints, attach evidence, monitor read receipts, and track admin-led resolution progress.'
        }
      />

      <div className="rounded-xl border border-gray-200 bg-white p-3 lg:hidden">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Quick Jump</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {isAdmin ? (
            <>
              <button
                type="button"
                onClick={() => scrollToSection(adminSlaSectionRef.current)}
                className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700"
              >
                SLA & Ladder
              </button>
              <button
                type="button"
                onClick={() => scrollToSection(adminQueueSectionRef.current)}
                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700"
              >
                Complaint Queue
              </button>
              <button
                type="button"
                onClick={() => scrollToSection(adminDetailSectionRef.current)}
                className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700"
              >
                Active Ticket
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => scrollToSection(submitComplaintSectionRef.current)}
                className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700"
              >
                Submit Form
              </button>
              <button
                type="button"
                onClick={() => scrollToSection(myComplaintsSectionRef.current)}
                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700"
              >
                My Tickets
              </button>
              <button
                type="button"
                onClick={() => scrollToSection(assignedComplaintsSectionRef.current)}
                className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700"
              >
                Assigned
              </button>
            </>
          )}
        </div>
      </div>

      {!isAdmin && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <div className="flex items-start gap-2">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              High and critical complaints trigger immediate admin alerts. Mark life-threatening incidents to activate mock emergency channels (in-app, SMS, email, call).
            </p>
          </div>
        </div>
      )}

      {!isAdmin && (
        <section ref={submitComplaintSectionRef} className="rounded-xl border border-gray-200 bg-white p-4">
          <h2 className="mb-3 text-base font-semibold text-gray-900">Submit New Complaint</h2>
          <form onSubmit={handleSubmitComplaint} className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label htmlFor="complaint-subject" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Subject</label>
              <input
                id="complaint-subject"
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                placeholder="Short summary of the issue"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="complaint-department" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Affected Department</label>
              <select
                id="complaint-department"
                value={department}
                onChange={(event) => setDepartment(event.target.value)}
                aria-label="Affected department"
                title="Affected department"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {COMPLAINT_DEPARTMENTS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="complaint-severity" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Seriousness</label>
              <select
                id="complaint-severity"
                value={severity}
                onChange={(event) => setSeverity(event.target.value as ComplaintSeverity)}
                aria-label="Complaint seriousness"
                title="Complaint seriousness"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {COMPLAINT_SEVERITIES.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label htmlFor="complaint-details" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Details</label>
              <textarea
                id="complaint-details"
                rows={4}
                value={details}
                onChange={(event) => setDetails(event.target.value)}
                placeholder="Explain what happened, what has been affected, and what help you need."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="md:col-span-2 rounded-lg border border-red-200 bg-red-50 p-3">
              <label className="flex items-start gap-2 text-sm font-medium text-red-900">
                <input
                  type="checkbox"
                  checked={isLifeThreatening}
                  onChange={(event) => setIsLifeThreatening(event.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-red-300 text-red-600 focus:ring-red-500"
                />
                {' '}
                <span>Mark as life-threatening (mock emergency escalation channels will trigger immediately)</span>
              </label>
            </div>

            <div>
              <label htmlFor="complaint-evidence-label" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Evidence Label (Optional)</label>
              <input
                id="complaint-evidence-label"
                value={evidenceLabel}
                onChange={(event) => setEvidenceLabel(event.target.value)}
                placeholder="Screenshot, report, incident log"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label htmlFor="complaint-evidence-url" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Evidence URL (Optional)</label>
              <input
                id="complaint-evidence-url"
                value={evidenceUrl}
                onChange={(event) => setEvidenceUrl(event.target.value)}
                placeholder="https://example.com/evidence"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            <div className="md:col-span-2">
              <label htmlFor="complaint-evidence-note" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Evidence Note (Optional)</label>
              <textarea
                id="complaint-evidence-note"
                rows={2}
                value={evidenceNote}
                onChange={(event) => setEvidenceNote(event.target.value)}
                placeholder="Brief context for attached evidence"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            <div className="md:col-span-2">
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                <Send className="h-4 w-4" />
                Submit Complaint
              </button>
            </div>
          </form>
        </section>
      )}

      {isAdmin && (
        <section ref={adminSlaSectionRef} className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-base font-semibold text-gray-900">SLA Matrix And Escalation Ladder (Mock)</h2>

          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-3 py-2">Department</th>
                  <th className="px-3 py-2">Low</th>
                  <th className="px-3 py-2">Moderate</th>
                  <th className="px-3 py-2">High</th>
                  <th className="px-3 py-2">Critical</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {slaMatrixRows.map((row) => (
                  <tr key={row.department}>
                    <td className="px-3 py-2 font-medium text-gray-800">{row.department}</td>
                    <td className="px-3 py-2 text-gray-700">{row.slaHours.Low}h</td>
                    <td className="px-3 py-2 text-gray-700">{row.slaHours.Moderate}h</td>
                    <td className="px-3 py-2 text-gray-700">{row.slaHours.High}h</td>
                    <td className="px-3 py-2 text-red-700">{row.slaHours.Critical}h</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900">
            <p className="font-semibold uppercase tracking-wide">Escalation Ladder</p>
            <p className="mt-1">1) SLA breach auto-forwards to department lead.</p>
            <p className="mt-1">2) If unresolved after {escalationConfig.toAdminLeadHours}h, auto-forward to admin lead.</p>
            <p className="mt-1">3) If still unresolved after another {escalationConfig.toEmergencyHours}h on critical/life-threatening complaints, emergency path is triggered.</p>
            <p className="mt-1">4) Ownership acknowledgement is required within {escalationConfig.ownershipAckWindowHours}h or reassignment runs automatically.</p>
          </div>
        </section>
      )}

      {isAdmin && roleLeadDashboard && (
        <section className="rounded-xl border border-gray-200 bg-white p-4">
          <h2 className="text-base font-semibold text-gray-900">Role Lead Dashboard (Mock Analytics)</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-4">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
              <p className="text-xs uppercase tracking-wide text-gray-500">Backlog</p>
              <p className="mt-1 text-xl font-semibold text-gray-900">{roleLeadDashboard.backlog}</p>
            </div>
            <div className="rounded-lg border border-red-200 bg-red-50 p-3">
              <p className="text-xs uppercase tracking-wide text-red-700">Overdue</p>
              <p className="mt-1 text-xl font-semibold text-red-800">{roleLeadDashboard.overdue}</p>
            </div>
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
              <p className="text-xs uppercase tracking-wide text-emerald-700">Avg Resolution</p>
              <p className="mt-1 text-xl font-semibold text-emerald-800">
                {roleLeadDashboard.avgResolutionHours === null ? 'N/A' : `${roleLeadDashboard.avgResolutionHours.toFixed(1)}h`}
              </p>
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="text-xs uppercase tracking-wide text-amber-700">Repeat Patterns</p>
              <p className="mt-1 text-xl font-semibold text-amber-800">{roleLeadDashboard.repeatPatterns}</p>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-3 py-2">Department</th>
                  <th className="px-3 py-2">Backlog</th>
                  <th className="px-3 py-2">Overdue</th>
                  <th className="px-3 py-2">Avg Resolution</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {roleLeadDashboard.rows.map((row) => (
                  <tr key={row.departmentName}>
                    <td className="px-3 py-2 text-gray-800">{row.departmentName}</td>
                    <td className="px-3 py-2 text-gray-700">{row.backlog}</td>
                    <td className="px-3 py-2 text-red-700">{row.overdue}</td>
                    <td className="px-3 py-2 text-gray-700">{row.avgHours === null ? 'N/A' : `${row.avgHours.toFixed(1)}h`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {isAdmin ? (
        <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
          <section ref={adminQueueSectionRef} className="rounded-xl border border-gray-200 bg-white">
            <div className="flex flex-wrap items-center gap-3 border-b border-gray-100 p-4">
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as ComplaintStatus | 'all')}
                aria-label="Filter complaints by status"
                title="Filter complaints by status"
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="all">All statuses</option>
                <option value="Submitted">Submitted</option>
                <option value="Under Review">Under Review</option>
                <option value="Forwarded">Forwarded</option>
                <option value="Awaiting Department Feedback">Awaiting Department Feedback</option>
                <option value="Resolved">Resolved</option>
                <option value="Closed">Closed</option>
              </select>

              <select
                value={severityFilter}
                onChange={(event) => setSeverityFilter(event.target.value as ComplaintSeverity | 'all')}
                aria-label="Filter complaints by severity"
                title="Filter complaints by severity"
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="all">All severities</option>
                {COMPLAINT_SEVERITIES.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-3 py-2">Ticket</th>
                    <th className="px-3 py-2">Complainant</th>
                    <th className="px-3 py-2">Department</th>
                    <th className="px-3 py-2">Severity</th>
                    <th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {adminFilteredComplaints.map((complaint) => (
                    <tr
                      key={complaint.id}
                      onClick={() => setActiveComplaintId(complaint.id)}
                      className={`cursor-pointer ${activeComplaint?.id === complaint.id ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                    >
                      <td className="px-3 py-2 font-semibold text-gray-800">{complaint.ticketId}</td>
                      <td className="px-3 py-2 text-gray-700">{complaint.submittedByName}</td>
                      <td className="px-3 py-2 text-gray-700">{complaint.concernedDepartment}</td>
                      <td className="px-3 py-2">
                        <span className={`rounded-md px-2 py-1 text-xs font-semibold ${SEVERITY_STYLES[complaint.severity]}`}>
                          {complaint.severity}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span className={`rounded-md px-2 py-1 text-xs font-semibold ${STATUS_STYLES[complaint.status]}`}>
                          {complaint.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section ref={adminDetailSectionRef} className="rounded-xl border border-gray-200 bg-white p-4">
            {activeComplaint ? (
              <div className="space-y-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">Selected Complaint</p>
                  <p className="text-base font-semibold text-gray-900">{activeComplaint.ticketId}</p>
                  <p className="mt-1 text-sm text-gray-600">{activeComplaint.subject}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                    <span className={`rounded-md px-2 py-1 font-semibold ${SEVERITY_STYLES[activeComplaint.severity]}`}>{activeComplaint.severity}</span>
                    <span className={`rounded-md px-2 py-1 font-semibold ${STATUS_STYLES[activeComplaint.status]}`}>{activeComplaint.status}</span>
                    <span className="rounded-md bg-slate-100 px-2 py-1 font-semibold text-slate-700">
                      SLA: {getComplaintSlaHours(activeComplaint) ?? 'N/A'}h
                    </span>
                    <span className="rounded-md bg-indigo-100 px-2 py-1 font-semibold text-indigo-700">
                      Escalation Level {activeComplaint.escalationLevel ?? 0}
                    </span>
                  </div>
                </div>

                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
                  {activeComplaint.details}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="font-semibold text-gray-500">Submitted By</p>
                    <p className="mt-0.5 text-gray-700">{activeComplaint.submittedByName} ({activeComplaint.submittedByRole})</p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-500">Concerned Department</p>
                    <p className="mt-0.5 text-gray-700">{activeComplaint.concernedDepartment}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-500">Ownership</p>
                    <p className="mt-0.5 text-gray-700">{getOwnershipStatus(activeComplaint)}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-500">Acknowledge Due</p>
                    <p className="mt-0.5 text-gray-700">{formatDateTime(activeComplaint.ownershipDueAt)}</p>
                  </div>
                </div>

                <div className="rounded-lg border border-gray-200 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Read Receipts</p>
                  <div className="mt-2 grid gap-2 text-xs text-gray-700">
                    <p className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" /> Complainant viewed: {formatDateTime(activeComplaint.complainantLastViewedAt)}</p>
                    <p className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" /> Assigned staff viewed: {formatDateTime(activeComplaint.assigneeLastViewedAt)}</p>
                    <p className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" /> Admin viewed: {formatDateTime(activeComplaint.adminLastViewedAt)}</p>
                  </div>
                </div>

                <div className="rounded-lg border border-gray-200 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Critical Incident Channels (Mock)</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(activeComplaint.criticalIncidentChannels ?? []).length === 0 ? (
                      <span className="text-xs text-gray-500">Not triggered</span>
                    ) : (
                      activeComplaint.criticalIncidentChannels?.map((channel) => (
                        <span key={channel} className="rounded-md bg-red-100 px-2 py-1 text-xs font-semibold text-red-700">
                          {CHANNEL_LABELS[channel]}
                        </span>
                      ))
                    )}
                  </div>
                </div>

                {activeComplaint.evidenceItems && activeComplaint.evidenceItems.length > 0 && (
                  <div className="rounded-lg border border-gray-200 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Evidence</p>
                    <div className="mt-2 space-y-2">
                      {activeComplaint.evidenceItems.map((item) => (
                        <div key={item.id} className="rounded-md border border-gray-200 bg-gray-50 p-2 text-xs">
                          <p className="font-semibold text-gray-800">{item.label}</p>
                          <a className="break-all text-blue-700 underline" href={item.url} target="_blank" rel="noreferrer">{item.url}</a>
                          <p className="mt-1 text-gray-600">{item.note ?? 'No additional note provided.'}</p>
                          <p className="mt-1 text-gray-500">{item.uploadedByUserName} • {formatDateTime(item.uploadedAt)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2 rounded-lg border border-gray-200 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Forward To Department / User</p>

                  <select
                    value={forwardDepartment}
                    onChange={(event) => {
                      setForwardDepartment(event.target.value);
                      setForwardToUserId('');
                    }}
                    aria-label="Select department to forward complaint"
                    title="Select department to forward complaint"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  >
                    {COMPLAINT_DEPARTMENTS.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>

                  <select
                    value={forwardToUserId}
                    onChange={(event) => setForwardToUserId(event.target.value)}
                    aria-label="Select specific user for complaint forwarding"
                    title="Select specific user for complaint forwarding"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  >
                    <option value="">Department queue only (no specific user)</option>
                    {assignableUsers.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name} ({user.role})
                      </option>
                    ))}
                  </select>

                  <textarea
                    value={forwardNote}
                    onChange={(event) => setForwardNote(event.target.value)}
                    rows={3}
                    placeholder="What should the target department/user investigate?"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />

                  <button
                    type="button"
                    onClick={handleForwardComplaint}
                    className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                  >
                    <ArrowRightCircle className="h-4 w-4" />
                    Forward Complaint
                  </button>
                </div>

                <div className="space-y-2 rounded-lg border border-gray-200 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Response Template & Knowledge Hint</p>

                  <select
                    value={selectedTemplateKey}
                    onChange={(event) => setSelectedTemplateKey(event.target.value)}
                    aria-label="Select response template"
                    title="Select response template"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  >
                    <option value="">No template selected</option>
                    {recommendedTemplates.map((template) => (
                      <option key={template.key} value={template.key}>{template.title}</option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={handleApplyTemplate}
                    className="inline-flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Apply Template
                  </button>

                  {selectedTemplate && (
                    <p className="rounded-md border border-indigo-200 bg-indigo-50 p-2 text-xs text-indigo-900">
                      Knowledge hint: {selectedTemplate.knowledgeHint}
                    </p>
                  )}
                </div>

                <div className="space-y-2 rounded-lg border border-gray-200 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Root Cause And Prevention Tracking</p>
                  <textarea
                    rows={2}
                    value={rootCauseSummary}
                    onChange={(event) => setRootCauseSummary(event.target.value)}
                    placeholder="Root cause summary"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                  <textarea
                    rows={2}
                    value={correctiveAction}
                    onChange={(event) => setCorrectiveAction(event.target.value)}
                    placeholder="Corrective action taken"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                  <textarea
                    rows={2}
                    value={preventionAction}
                    onChange={(event) => setPreventionAction(event.target.value)}
                    placeholder="Prevention action for recurrence"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>

                <div className="space-y-2 rounded-lg border border-gray-200 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Admin Final Response</p>
                  <textarea
                    rows={4}
                    value={adminResponse}
                    onChange={(event) => setAdminResponse(event.target.value)}
                    placeholder="Only admin can publish this response to the complainant."
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    onClick={handleSendAdminResponse}
                    className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                  >
                    <Send className="h-4 w-4" />
                    Send Response To Complainant
                  </button>
                </div>

                <div className="rounded-lg border border-gray-200 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Message Thread (Mock)</p>
                  <div className="mt-2 max-h-40 space-y-2 overflow-y-auto pr-1 text-xs">
                    {getRenderableTimeline(activeComplaint).filter((event) => event.eventType === 'ThreadMessage').length === 0 ? (
                      <p className="text-gray-500">No thread messages yet.</p>
                    ) : (
                      getRenderableTimeline(activeComplaint)
                        .filter((event) => event.eventType === 'ThreadMessage')
                        .slice()
                        .reverse()
                        .map((event) => (
                          <div key={event.id} className="rounded-md border border-gray-200 bg-gray-50 p-2">
                            <p className="font-semibold text-gray-800">{event.actorName} ({event.actorRole})</p>
                            <p className="mt-1 text-gray-700">{event.note}</p>
                            <p className="mt-1 text-gray-500">{formatDateTime(event.createdAt)}</p>
                          </div>
                        ))
                    )}
                  </div>

                  <textarea
                    rows={2}
                    value={threadDraftByComplaint[activeComplaint.id] ?? ''}
                    onChange={(event) => setThreadDraftByComplaint((prev) => ({
                      ...prev,
                      [activeComplaint.id]: event.target.value,
                    }))}
                    placeholder="Post a visible thread update for complainant and assigned teams."
                    className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />

                  <button
                    type="button"
                    onClick={() => handlePostThreadMessage(activeComplaint)}
                    className="mt-2 inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-200"
                  >
                    <MessageSquareWarning className="h-4 w-4" />
                    Post Thread Message
                  </button>
                </div>

                <div className="rounded-lg border border-gray-200 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Complaint Timeline</p>
                  <div className="mt-2 max-h-64 space-y-2 overflow-y-auto pr-1">
                    {getRenderableTimeline(activeComplaint)
                      .slice()
                      .reverse()
                      .map((event) => (
                        <div key={event.id} className="rounded-md border border-gray-200 bg-gray-50 p-2 text-xs">
                          <p className="font-semibold text-gray-800">{event.eventType}</p>
                          <p className="mt-0.5 text-gray-700">{event.note}</p>
                          {event.metadata && <p className="mt-1 text-gray-500">{event.metadata}</p>}
                          <p className="mt-1 text-gray-500">{event.actorName} ({event.actorRole}) • {formatDateTime(event.createdAt)}</p>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">Select a complaint to review, forward, or respond.</p>
            )}
          </section>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <section ref={myComplaintsSectionRef} className="rounded-xl border border-gray-200 bg-white p-4">
            <h2 className="text-base font-semibold text-gray-900">My Complaints</h2>
            <div className="mt-3 space-y-3">
              {visibleFiledByMe.length === 0 && (
                <p className="text-sm text-gray-500">You have not submitted any complaints yet.</p>
              )}

              {visibleFiledByMe.map((complaint) => {
                const ratingDraft = ratingDraftByComplaint[complaint.id] ?? { score: '', comment: '' };
                const timeline = getRenderableTimeline(complaint);
                const threadEvents = timeline.filter((event) => event.eventType === 'ThreadMessage');

                return (
                  <article key={complaint.id} className="rounded-lg border border-gray-200 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-gray-900">{complaint.ticketId}</p>
                      <div className="flex items-center gap-2">
                        <span className={`rounded-md px-2 py-1 text-xs font-semibold ${SEVERITY_STYLES[complaint.severity]}`}>
                          {complaint.severity}
                        </span>
                        <span className={`rounded-md px-2 py-1 text-xs font-semibold ${STATUS_STYLES[complaint.status]}`}>
                          {complaint.status}
                        </span>
                      </div>
                    </div>

                    <p className="mt-1 text-sm font-medium text-gray-800">{complaint.subject}</p>
                    <p className="mt-1 text-xs text-gray-600">Department: {complaint.concernedDepartment}</p>
                    <p className="mt-2 text-sm text-gray-700">{complaint.details}</p>

                    <div className="mt-2 rounded-md border border-gray-200 bg-gray-50 p-2 text-xs text-gray-700">
                      <p className="font-semibold text-gray-800">Communication transparency</p>
                      <p className="mt-1 flex items-center gap-1"><Eye className="h-3.5 w-3.5" /> Admin viewed: {formatDateTime(complaint.adminLastViewedAt)}</p>
                      <p className="mt-1 flex items-center gap-1"><ArrowRightCircle className="h-3.5 w-3.5" /> Forwarded: {formatDateTime(complaint.forwardedAt)}</p>
                      <p className="mt-1 flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> Responded: {formatDateTime(complaint.adminRespondedAt)}</p>
                      <p className="mt-1 flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" /> Last workflow update: {formatDateTime(complaint.updatedAt)}</p>
                    </div>

                    {complaint.adminResponse && (
                      <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 p-2 text-sm text-emerald-900">
                        <p className="font-semibold">Admin response</p>
                        <p className="mt-1">{complaint.adminResponse}</p>
                        <p className="mt-1 text-xs text-emerald-700">
                          {complaint.adminResponderName ?? 'Admin'} • {formatDateTime(complaint.adminRespondedAt ?? complaint.updatedAt)}
                        </p>
                      </div>
                    )}

                    {complaint.evidenceItems && complaint.evidenceItems.length > 0 && (
                      <div className="mt-3 rounded-md border border-gray-200 bg-gray-50 p-2 text-xs">
                        <p className="font-semibold uppercase tracking-wide text-gray-600">Evidence Attachments</p>
                        <div className="mt-2 space-y-1.5">
                          {complaint.evidenceItems.map((item) => (
                            <div key={item.id} className="rounded border border-gray-200 bg-white p-2">
                              <p className="font-semibold text-gray-800">{item.label}</p>
                              <a className="break-all text-blue-700 underline" href={item.url} target="_blank" rel="noreferrer">{item.url}</a>
                              <p className="mt-1 text-gray-600">{item.note ?? 'No additional note provided.'}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="mt-3 rounded-md border border-gray-200 bg-gray-50 p-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">Message Thread (Mock)</p>
                      <div className="mt-2 max-h-36 space-y-1 overflow-y-auto pr-1 text-xs text-gray-700">
                        {threadEvents.length === 0 ? (
                          <p>No thread messages yet.</p>
                        ) : (
                          threadEvents
                            .slice()
                            .reverse()
                            .map((event) => (
                              <p key={event.id}>
                                {event.actorName}: {event.note} ({formatDateTime(event.createdAt)})
                              </p>
                            ))
                        )}
                      </div>

                      <textarea
                        rows={2}
                        value={threadDraftByComplaint[complaint.id] ?? ''}
                        onChange={(event) => setThreadDraftByComplaint((prev) => ({
                          ...prev,
                          [complaint.id]: event.target.value,
                        }))}
                        className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-xs"
                        placeholder="Add a follow-up message for admins and assigned teams."
                      />

                      <button
                        type="button"
                        onClick={() => handlePostThreadMessage(complaint)}
                        className="mt-2 inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-800 hover:bg-slate-200"
                      >
                        <MessageSquareWarning className="h-3.5 w-3.5" />
                        Post Thread Message
                      </button>
                    </div>

                    {(complaint.status === 'Resolved' || complaint.status === 'Closed') && !complaint.resolutionRating && (
                      <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-amber-900">Rate Resolution Quality</p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <select
                            value={ratingDraft.score}
                            onChange={(event) => setRatingDraftByComplaint((prev) => ({
                              ...prev,
                              [complaint.id]: {
                                score: event.target.value as RatingDraft['score'],
                                comment: prev[complaint.id]?.comment ?? '',
                              },
                            }))}
                            aria-label={`Resolution rating for ${complaint.ticketId}`}
                            title={`Resolution rating for ${complaint.ticketId}`}
                            className="rounded-lg border border-amber-300 bg-white px-2 py-1 text-xs"
                          >
                            <option value="">Select score</option>
                            <option value="1">1 - Poor</option>
                            <option value="2">2 - Fair</option>
                            <option value="3">3 - Good</option>
                            <option value="4">4 - Very Good</option>
                            <option value="5">5 - Excellent</option>
                          </select>
                        </div>
                        <textarea
                          rows={2}
                          value={ratingDraft.comment}
                          onChange={(event) => setRatingDraftByComplaint((prev) => ({
                            ...prev,
                            [complaint.id]: {
                              score: prev[complaint.id]?.score ?? '',
                              comment: event.target.value,
                            },
                          }))}
                          className="mt-2 w-full rounded-lg border border-amber-300 bg-white px-2 py-1.5 text-xs"
                          placeholder="How satisfied are you with speed and quality of response?"
                        />
                        <button
                          type="button"
                          onClick={() => handleSubmitResolutionRating(complaint)}
                          className="mt-2 inline-flex items-center gap-1 rounded-lg bg-amber-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-amber-700"
                        >
                          <Star className="h-3.5 w-3.5" />
                          Submit Rating
                        </button>
                      </div>
                    )}

                    {complaint.resolutionRating && (
                      <div className="mt-3 rounded-md border border-yellow-200 bg-yellow-50 p-2 text-xs text-yellow-900">
                        <p className="font-semibold">Post-resolution rating</p>
                        <p className="mt-1">Score: {complaint.resolutionRating}/5</p>
                        <p className="mt-1">{complaint.resolutionRatingComment}</p>
                        <p className="mt-1 text-yellow-700">Rated at: {formatDateTime(complaint.resolutionRatedAt)}</p>
                      </div>
                    )}

                    <div className="mt-3 rounded-md border border-gray-200 bg-gray-50 p-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">Timeline</p>
                      <div className="mt-2 max-h-40 space-y-1 overflow-y-auto pr-1 text-xs text-gray-700">
                        {timeline
                          .slice()
                          .reverse()
                          .map((event) => (
                            <p key={event.id}>• {event.eventType}: {event.note} ({formatDateTime(event.createdAt)})</p>
                          ))}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <section ref={assignedComplaintsSectionRef} className="rounded-xl border border-gray-200 bg-white p-4">
            <h2 className="text-base font-semibold text-gray-900">Assigned To Me / My Department</h2>
            <div className="mt-3 space-y-3">
              {visibleAssignedToMe.length === 0 && (
                <p className="text-sm text-gray-500">No complaints are currently assigned to you.</p>
              )}

              {visibleAssignedToMe.map((complaint) => {
                const timeline = getRenderableTimeline(complaint);
                const threadEvents = timeline.filter((event) => event.eventType === 'ThreadMessage');

                return (
                  <article key={complaint.id} className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-amber-900">{complaint.ticketId}</p>
                      <span className={`rounded-md px-2 py-1 text-xs font-semibold ${STATUS_STYLES[complaint.status]}`}>
                        {complaint.status}
                      </span>
                    </div>

                    <p className="mt-1 text-sm font-medium text-amber-900">{complaint.subject}</p>
                    <p className="mt-1 text-xs text-amber-800">Forwarded note: {complaint.forwardNote ?? 'No additional forwarding note provided.'}</p>

                    <div className="mt-2 rounded-md border border-amber-300 bg-white p-2 text-xs text-amber-900">
                      <p className="font-semibold">Ownership status: {getOwnershipStatus(complaint)}</p>
                      <p className="mt-1">Acknowledge by: {formatDateTime(complaint.ownershipDueAt)}</p>
                      {complaint.forwardedToUserId === currentUser.id && getOwnershipStatus(complaint) === 'Pending Acknowledgement' && (
                        <button
                          type="button"
                          onClick={() => handleAcknowledgeOwnership(complaint)}
                          className="mt-2 inline-flex items-center gap-1 rounded-lg bg-amber-700 px-2.5 py-1 text-xs font-semibold text-white hover:bg-amber-800"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Acknowledge Ownership
                        </button>
                      )}
                    </div>

                    <textarea
                      rows={3}
                      value={feedbackDraftByComplaint[complaint.id] ?? complaint.departmentFeedback ?? ''}
                      onChange={(event) => setFeedbackDraftByComplaint((prev) => ({
                        ...prev,
                        [complaint.id]: event.target.value,
                      }))}
                      placeholder="Provide your feedback to admin."
                      className="mt-2 w-full rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm"
                    />

                    <button
                      type="button"
                      onClick={() => handleSubmitFeedback(complaint)}
                      className="mt-2 inline-flex items-center gap-2 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700"
                    >
                      <MessageSquareWarning className="h-4 w-4" />
                      Send Feedback To Admin
                    </button>

                    <div className="mt-3 rounded-md border border-amber-300 bg-white p-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-amber-900">Message Thread (Mock)</p>
                      <div className="mt-2 max-h-36 space-y-1 overflow-y-auto pr-1 text-xs text-amber-900">
                        {threadEvents.length === 0 ? (
                          <p>No thread messages yet.</p>
                        ) : (
                          threadEvents
                            .slice()
                            .reverse()
                            .map((event) => (
                              <p key={event.id}>
                                {event.actorName}: {event.note} ({formatDateTime(event.createdAt)})
                              </p>
                            ))
                        )}
                      </div>

                      <textarea
                        rows={2}
                        value={threadDraftByComplaint[complaint.id] ?? ''}
                        onChange={(event) => setThreadDraftByComplaint((prev) => ({
                          ...prev,
                          [complaint.id]: event.target.value,
                        }))}
                        className="mt-2 w-full rounded-lg border border-amber-300 bg-white px-2 py-1.5 text-xs"
                        placeholder="Post a thread update for admin and complainant."
                      />

                      <button
                        type="button"
                        onClick={() => handlePostThreadMessage(complaint)}
                        className="mt-2 inline-flex items-center gap-1 rounded-lg border border-amber-400 bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-900 hover:bg-amber-200"
                      >
                        <MessageSquareWarning className="h-3.5 w-3.5" />
                        Post Thread Message
                      </button>
                    </div>

                    <div className="mt-3 rounded-md border border-amber-300 bg-white p-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-amber-900">Status Timeline</p>
                      <div className="mt-2 max-h-32 space-y-1 overflow-y-auto pr-1 text-xs text-amber-900">
                        {timeline
                          .slice()
                          .reverse()
                          .map((event) => (
                            <p key={event.id}>• {event.eventType}: {event.note} ({formatDateTime(event.createdAt)})</p>
                          ))}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </div>
      )}

      {isAdmin && complaints.some((item) => item.severity === 'Critical' && !isComplaintTerminal(item.status)) && (
        <div className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-800">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            <p>
              Critical complaints are active. Escalation ladder and emergency channel simulation run automatically when SLA and follow-up thresholds are breached.
            </p>
          </div>
        </div>
      )}

      {isAdmin && complaints.some((item) => item.criticalIncidentChannels && item.criticalIncidentChannels.length > 0) && (
        <div className="rounded-xl border border-fuchsia-300 bg-fuchsia-50 p-3 text-sm text-fuchsia-900">
          <div className="flex items-center gap-2">
            <Siren className="h-4 w-4" />
            <p>
              Critical incident channel simulation is active for one or more complaints. In mock mode, SMS/email/call are represented by system alerts and notifications.
            </p>
          </div>
        </div>
      )}

      {isAdmin && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1 rounded-md bg-blue-100 px-2 py-1 font-semibold"><Clock3 className="h-3.5 w-3.5" /> SLA matrix by department + severity</span>
            <span className="inline-flex items-center gap-1 rounded-md bg-blue-100 px-2 py-1 font-semibold"><ArrowRightCircle className="h-3.5 w-3.5" /> Escalation ladder (dept lead to admin lead to emergency)</span>
            <span className="inline-flex items-center gap-1 rounded-md bg-blue-100 px-2 py-1 font-semibold"><PhoneCall className="h-3.5 w-3.5" /> Critical channel simulation</span>
            <span className="inline-flex items-center gap-1 rounded-md bg-blue-100 px-2 py-1 font-semibold"><Eye className="h-3.5 w-3.5" /> Read receipts</span>
          </div>
        </div>
      )}
    </div>
  );
}
