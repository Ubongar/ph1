import { useEffect, useMemo, useState } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import {
  Activity,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Copy,
  Download,
  Droplets,
  FileClock,
  FlaskConical,
  HeartPulse,
  Mail,
  Phone,
  Pill,
  Search,
  Siren,
  User,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { SeverityBadge, useToast } from '../../components/shared';
import {
  StorageKey,
  createAuditEntry,
  getAll,
  getRequisitionsByStudentId,
} from '../../services/storage';
import type { DiagnosticResult, Encounter, MedicationRequisition } from '../../types/types';
import { getHospitalNumber } from '../../utils/studentIdentifiers';
import { VitalsCard } from '../../components/shared/VitalsCard';

const AMBULANCE_CONTACTS = [
  { label: 'Campus Ambulance', phone: '+2348000000011' },
  { label: 'BUTH Emergency Line', phone: '+2348000000012' },
];

export default function StudentProfile() {
  const { currentUser, currentStudent } = useAuth();
  const { toast } = useToast();

  const [openEncounterId, setOpenEncounterId] = useState<string | null>(null);
  const [encounterQuery, setEncounterQuery] = useState('');
  const [encounterStatusFilter, setEncounterStatusFilter] =
    useState<Encounter['status'] | 'All'>('All');
  const [diagnosticTypeFilter, setDiagnosticTypeFilter] =
    useState<DiagnosticResult['type'] | 'All'>('All');
  const [criticalOnly, setCriticalOnly] = useState(false);
  const [takenMedicationIds, setTakenMedicationIds] = useState<string[]>([]);

  const encounters = useMemo(
    () =>
      currentStudent
        ? getAll<Encounter>(StorageKey.ENCOUNTERS)
            .filter((e) => e.studentId === currentStudent.id)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        : [],
    [currentStudent],
  );

  const results = useMemo(
    () =>
      currentStudent
        ? getAll<DiagnosticResult>(StorageKey.RESULTS)
            .filter((result) => result.studentId === currentStudent.id)
            .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())
        : [],
    [currentStudent],
  );

  const requisitions = useMemo(
    () =>
      currentStudent
        ? getRequisitionsByStudentId(currentStudent.id).sort(
            (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime(),
          )
        : [],
    [currentStudent],
  );

  const hospitalNumber = currentStudent
    ? getHospitalNumber(currentUser?.matricNumber, currentStudent.id)
    : '—';

  const latestEncounter = encounters[0] ?? null;
  const pendingRequisition = requisitions.find(
    (item) =>
      item.status === 'Pending Review'
      || item.status === 'Approved'
      || item.status === 'Ready for Pickup',
  );

  const criticalAllergies =
    currentStudent?.allergies.filter((allergy) => allergy.severity === 'Life-threatening') ?? [];

  const upcomingFollowUps = encounters
    .filter((encounter) => encounter.followUpRequired && Boolean(encounter.followUpDate))
    .filter((encounter) => new Date(encounter.followUpDate as string).getTime() >= Date.now())
    .sort(
      (a, b) =>
        new Date(a.followUpDate as string).getTime()
        - new Date(b.followUpDate as string).getTime(),
    )
    .slice(0, 3);

  const filteredEncounters = encounters.filter((encounter) => {
    const statusMatch =
      encounterStatusFilter === 'All' || encounter.status === encounterStatusFilter;
    const query = encounterQuery.trim().toLowerCase();
    const queryMatch =
      query.length === 0
      || encounter.chiefComplaint.toLowerCase().includes(query)
      || encounter.facility.toLowerCase().includes(query)
      || encounter.attendingStaffName.toLowerCase().includes(query);
    return statusMatch && queryMatch;
  });

  const filteredResults = results.filter((result) => {
    const typeMatch =
      diagnosticTypeFilter === 'All' || result.type === diagnosticTypeFilter;
    const criticalMatch = !criticalOnly || result.criticalFlag;
    return typeMatch && criticalMatch;
  });

  const uniqueDiagnosticTypes = useMemo(
    () =>
      ['All', ...new Set(results.map((item) => item.type))] as Array<
        DiagnosticResult['type'] | 'All'
      >,
    [results],
  );

  const medicationChecklistItems = useMemo(
    () =>
      requisitions
        .filter((req) => req.approvedMedications?.length)
        .flatMap((req) =>
          (req.approvedMedications ?? []).map((medication, index) => ({
            id: `${req.id}-${medication.name}-${index}`,
            status: req.status,
            medication,
          })),
        ),
    [requisitions],
  );

  const timelineItems = useMemo(() => {
    const encounterItems = encounters.map((encounter) => ({
      id: `enc-${encounter.id}`,
      date: encounter.date,
      label: 'Clinical Visit',
      detail: `${encounter.chiefComplaint} · ${encounter.facility}`,
      tone: 'text-blue-700 bg-blue-50 border-blue-100',
    }));

    const resultItems = results.map((result) => ({
      id: `res-${result.id}`,
      date: result.uploadedAt,
      label: 'Diagnostic Result',
      detail: `${result.testName} · ${result.status}`,
      tone: result.criticalFlag
        ? 'text-red-700 bg-red-50 border-red-100'
        : 'text-emerald-700 bg-emerald-50 border-emerald-100',
    }));

    const requisitionItems = requisitions.map((requisition) => ({
      id: `req-${requisition.id}`,
      date: requisition.submittedAt,
      label: 'Medication Request',
      detail: `${requisition.status} · ${requisition.symptoms.slice(0, 2).join(', ') || 'No symptom tags'}`,
      tone:
        requisition.priority === 'Urgent'
          ? 'text-orange-700 bg-orange-50 border-orange-100'
          : 'text-slate-700 bg-slate-50 border-slate-100',
    }));

    return [...encounterItems, ...resultItems, ...requisitionItems]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 8);
  }, [encounters, requisitions, results]);

  const wellnessScore = useMemo(() => {
    let score = 58;

    if (criticalAllergies.length === 0) score += 10;
    if (results.some((result) => result.criticalFlag)) score -= 9;
    if (pendingRequisition) score -= pendingRequisition.priority === 'Urgent' ? 9 : 4;
    if (latestEncounter?.status === 'Resolved') score += 8;
    if (latestEncounter?.vitals.temperature && latestEncounter.vitals.temperature > 38.5) {
      score -= 6;
    }
    if (
      latestEncounter?.vitals.oxygenSaturation
      && latestEncounter.vitals.oxygenSaturation < 95
    ) {
      score -= 6;
    }
    if (upcomingFollowUps.length > 0) score += 4;

    return Math.max(0, Math.min(100, score));
  }, [
    criticalAllergies.length,
    latestEncounter,
    pendingRequisition,
    results,
    upcomingFollowUps.length,
  ]);

  const wellnessProgressClass =
    wellnessScore >= 75
      ? '[&::-webkit-progress-value]:bg-emerald-500 [&::-moz-progress-bar]:bg-emerald-500'
      : wellnessScore >= 50
        ? '[&::-webkit-progress-value]:bg-amber-500 [&::-moz-progress-bar]:bg-amber-500'
        : '[&::-webkit-progress-value]:bg-rose-500 [&::-moz-progress-bar]:bg-rose-500';

  useEffect(() => {
    if (!currentStudent) return;
    const key = `shr_medication_taken_${currentStudent.id}`;
    try {
      const saved = localStorage.getItem(key);
      if (!saved) return;
      const parsed = JSON.parse(saved) as unknown;
      if (Array.isArray(parsed) && parsed.every((item) => typeof item === 'string')) {
        setTakenMedicationIds(parsed);
      }
    } catch {
      setTakenMedicationIds([]);
    }
  }, [currentStudent]);

  useEffect(() => {
    if (!currentStudent) return;
    const key = `shr_medication_taken_${currentStudent.id}`;
    localStorage.setItem(key, JSON.stringify(takenMedicationIds));
  }, [currentStudent, takenMedicationIds]);

  const toggleMedicationTaken = (id: string) => {
    setTakenMedicationIds((previous) =>
      previous.includes(id) ? previous.filter((item) => item !== id) : [...previous, id],
    );
  };

  const copyHospitalNumber = async () => {
    if (!hospitalNumber || hospitalNumber === '—') {
      toast('Hospital number unavailable', 'error');
      return;
    }

    try {
      await navigator.clipboard.writeText(hospitalNumber);
      toast('Hospital number copied', 'success');
    } catch {
      toast('Unable to copy hospital number', 'error');
    }
  };

  const downloadMedicalRecords = () => {
    if (!currentStudent || !currentUser) {
      toast('Unable to export records right now', 'error');
      return;
    }

    const lines: string[] = [
      'STUDENT HEALTH RECORD EXPORT',
      `Generated: ${new Date().toLocaleString('en-GB')}`,
      '',
      'Student Details',
      `Name: ${currentStudent.name}`,
      `Matric Number: ${currentUser.matricNumber ?? '—'}`,
      `Hospital Number: ${hospitalNumber}`,
      `Department: ${currentStudent.department}`,
      `Level: ${currentStudent.level}`,
      `Blood Group: ${currentStudent.bloodGroup}`,
      `Genotype: ${currentStudent.genotype}`,
      '',
      `Encounters (${encounters.length})`,
    ];

    encounters.forEach((enc, index) => {
      lines.push(
        `${index + 1}. ${new Date(enc.date).toLocaleDateString('en-GB')} - ${enc.facility}`,
        `   Complaint: ${enc.chiefComplaint}`,
        `   Status: ${enc.status}`,
        `   Attending Staff: ${enc.attendingStaffName}`,
      );
      if (enc.diagnoses.length > 0) {
        lines.push(`   Diagnoses: ${enc.diagnoses.map((d) => d.description).join(', ')}`);
      }
      if (enc.prescriptions.length > 0) {
        lines.push(
          `   Prescriptions: ${enc.prescriptions
            .map((rx) => `${rx.medicationName} ${rx.dosage}`)
            .join(', ')}`,
        );
      }
    });

    lines.push('', `Diagnostic Results (${results.length})`);
    results.forEach((result, index) => {
      lines.push(
        `${index + 1}. ${result.testName} (${result.type})`,
        `   Uploaded: ${new Date(result.uploadedAt).toLocaleDateString('en-GB')}`,
        `   Facility: ${result.facility}`,
        `   Status: ${result.status}`,
        `   Findings: ${result.findings}`,
        `   File: ${result.fileSimulatedUrl}`,
      );
    });

    lines.push('', `Medication Requisitions (${requisitions.length})`);
    requisitions.forEach((req: MedicationRequisition, index) => {
      lines.push(
        `${index + 1}. Submitted: ${new Date(req.submittedAt).toLocaleDateString('en-GB')}`,
        `   Status: ${req.status}`,
        `   Symptoms: ${req.symptoms.join(', ') || '—'}`,
      );
      if (req.approvedMedications?.length) {
        lines.push(
          `   Approved Medications: ${req.approvedMedications
            .map((med) => `${med.name} ${med.dosage}`)
            .join(', ')}`,
        );
      }
    });

    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const safeName = currentStudent.name.toLowerCase().replace(/\s+/g, '-');
    link.href = url;
    link.download = `${safeName}-medical-records.txt`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);

    createAuditEntry({
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      action: 'EXPORT_REPORT',
      resourceType: 'Report',
      resourceId: currentStudent.id,
      resourceDescription: `Exported medical records for ${currentStudent.name}`,
      status: 'Success',
    });

    toast('Medical records downloaded', 'success');
  };

  const encounterStatusColor: Record<Encounter['status'], string> = {
    Active: 'bg-blue-100 text-blue-800',
    Resolved: 'bg-green-100 text-green-800',
    Referred: 'bg-orange-100 text-orange-800',
  };

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="relative overflow-hidden rounded-3xl border border-sky-100 bg-gradient-to-br from-sky-700 via-blue-700 to-cyan-700 p-5 text-white shadow-lg md:p-7">
        <div className="pointer-events-none absolute -right-8 -top-8 h-36 w-36 rounded-full bg-white/10 blur-sm" />
        <div className="pointer-events-none absolute -bottom-14 left-10 h-40 w-40 rounded-full bg-cyan-300/20 blur-md" />

        <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 text-lg font-bold ring-1 ring-white/30 backdrop-blur">
              {currentUser
                ? currentUser.name
                    .split(' ')
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase()
                : '??'}
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-cyan-100">
                Student Health Command Center
              </p>
              <h1 className="text-xl font-bold md:text-2xl">{currentUser?.name ?? 'Student'}</h1>
              <p className="text-sm text-blue-100">
                {currentStudent?.department ?? 'Department'} · Level{' '}
                {currentStudent?.level ?? '—'} · Hospital No: {hospitalNumber}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center md:min-w-[270px]">
            <div className="rounded-xl bg-white/10 px-3 py-2 ring-1 ring-white/20">
              <p className="text-[11px] text-blue-100">Visits</p>
              <p className="text-lg font-semibold">{encounters.length}</p>
            </div>
            <div className="rounded-xl bg-white/10 px-3 py-2 ring-1 ring-white/20">
              <p className="text-[11px] text-blue-100">Results</p>
              <p className="text-lg font-semibold">{results.length}</p>
            </div>
            <div className="rounded-xl bg-white/10 px-3 py-2 ring-1 ring-white/20">
              <p className="text-[11px] text-blue-100">Requests</p>
              <p className="text-lg font-semibold">{requisitions.length}</p>
            </div>
          </div>
        </div>

        <div className="relative mt-5 rounded-2xl bg-white/10 p-4 ring-1 ring-white/20 backdrop-blur-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold">Wellness Index</p>
            <span className="text-xs text-blue-100">Live profile summary</span>
          </div>
          <progress
            className={`mt-3 h-2 w-full overflow-hidden rounded-full bg-white/20 [&::-webkit-progress-bar]:bg-white/20 ${wellnessProgressClass}`}
            max={100}
            value={wellnessScore}
            aria-label="Wellness score"
          />
          <div className="mt-2 flex items-center justify-between text-xs text-blue-100">
            <span>{wellnessScore}/100</span>
            <span>
              {wellnessScore >= 75
                ? 'Stable'
                : wellnessScore >= 50
                  ? 'Needs Attention'
                  : 'High Attention'}
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-red-200 bg-gradient-to-br from-red-50 to-rose-50 p-4">
          <div className="mb-3 flex items-center gap-2 text-red-700">
            <Siren className="h-4 w-4" />
            <p className="text-xs font-semibold uppercase tracking-wide">Emergency Dispatch</p>
          </div>
          <div className="space-y-2">
            {AMBULANCE_CONTACTS.map((contact) => (
              <a
                key={contact.phone}
                href={`tel:${contact.phone}`}
                className="flex items-center justify-between rounded-lg border border-red-100 bg-white px-3 py-2 transition-colors hover:bg-red-100"
              >
                <span className="text-xs text-slate-600">{contact.label}</span>
                <span className="text-sm font-semibold text-red-700">{contact.phone}</span>
              </a>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-50 p-4">
          <div className="mb-3 flex items-center gap-2 text-amber-700">
            <FileClock className="h-4 w-4" />
            <p className="text-xs font-semibold uppercase tracking-wide">Care Priorities</p>
          </div>
          <div className="space-y-2 text-sm text-slate-700">
            <p>
              Critical allergies:{' '}
              <span className="font-semibold">{criticalAllergies.length}</span>
            </p>
            <p>
              Pending medication request:{' '}
              <span className="font-semibold">
                {pendingRequisition ? pendingRequisition.status : 'None'}
              </span>
            </p>
            <p>
              Upcoming follow-ups:{' '}
              <span className="font-semibold">{upcomingFollowUps.length}</span>
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-cyan-200 bg-gradient-to-br from-cyan-50 to-sky-50 p-4">
          <div className="mb-3 flex items-center gap-2 text-cyan-700">
            <ClipboardList className="h-4 w-4" />
            <p className="text-xs font-semibold uppercase tracking-wide">Quick Tools</p>
          </div>
          <div className="space-y-2">
            <button
              type="button"
              onClick={copyHospitalNumber}
              className="w-full rounded-lg border border-cyan-100 bg-white px-3 py-2 text-left text-sm font-medium text-cyan-700 transition-colors hover:bg-cyan-100"
            >
              <span className="inline-flex items-center gap-2">
                <Copy className="h-4 w-4" /> Copy Hospital Number
              </span>
            </button>
            <button
              type="button"
              onClick={downloadMedicalRecords}
              className="w-full rounded-lg border border-cyan-100 bg-white px-3 py-2 text-left text-sm font-medium text-cyan-700 transition-colors hover:bg-cyan-100"
            >
              <span className="inline-flex items-center gap-2">
                <Download className="h-4 w-4" /> Export Health Record
              </span>
            </button>
          </div>
        </div>
      </div>

      <Tabs.Root defaultValue="overview">
        <Tabs.List className="grid grid-cols-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:grid-cols-6">
          {[
            { value: 'overview', label: 'Overview' },
            { value: 'personal', label: 'Personal' },
            { value: 'allergies', label: 'Allergies' },
            { value: 'history', label: 'Visit History' },
            { value: 'diagnostics', label: 'Diagnostics' },
            { value: 'medications', label: 'Medications' },
          ].map((tab) => (
            <Tabs.Trigger
              key={tab.value}
              value={tab.value}
              className="border-b-2 border-transparent px-3 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 transition-colors data-[state=active]:border-blue-600 data-[state=active]:text-blue-700 hover:text-slate-700"
            >
              {tab.label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        <Tabs.Content value="overview" className="mt-4 space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Latest Visit
              </p>
              {latestEncounter ? (
                <>
                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    {latestEncounter.chiefComplaint}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {new Date(latestEncounter.date).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}{' '}
                    · {latestEncounter.facility}
                  </p>
                  <p className="mt-2 inline-flex rounded-full bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-700">
                    Attended by {latestEncounter.attendingStaffName}
                  </p>
                </>
              ) : (
                <p className="mt-3 text-sm text-slate-400">No visits yet.</p>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Critical Signals
              </p>
              <div className="mt-2 space-y-2 text-sm">
                <p className="flex items-center justify-between rounded-lg bg-red-50 px-3 py-2 text-red-700">
                  <span className="inline-flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4" /> Life-threatening allergies
                  </span>
                  <span className="font-semibold">{criticalAllergies.length}</span>
                </p>
                <p className="flex items-center justify-between rounded-lg bg-amber-50 px-3 py-2 text-amber-700">
                  <span className="inline-flex items-center gap-1.5">
                    <FlaskConical className="h-4 w-4" /> Critical diagnostic flags
                  </span>
                  <span className="font-semibold">
                    {results.filter((item) => item.criticalFlag).length}
                  </span>
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Follow-up Agenda
              </p>
              {upcomingFollowUps.length > 0 ? (
                <ul className="mt-2 space-y-2">
                  {upcomingFollowUps.map((encounter) => (
                    <li
                      key={encounter.id}
                      className="rounded-lg border border-cyan-100 bg-cyan-50 px-3 py-2"
                    >
                      <p className="text-sm font-medium text-cyan-900">
                        {encounter.chiefComplaint}
                      </p>
                      <p className="text-xs text-cyan-700">
                        Follow-up:{' '}
                        {new Date(encounter.followUpDate as string).toLocaleDateString('en-GB')}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-slate-400">
                  No follow-up appointments scheduled.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-slate-900">Unified Health Timeline</h2>
              <span className="text-xs text-slate-500">Recent 8 events</span>
            </div>
            {timelineItems.length > 0 ? (
              <div className="mt-4 space-y-2">
                {timelineItems.map((item) => (
                  <div key={item.id} className={`rounded-xl border px-3 py-2 ${item.tone}`}>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-semibold uppercase tracking-wide">
                        {item.label}
                      </p>
                      <p className="text-[11px]">
                        {new Date(item.date).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                    <p className="mt-1 text-sm font-medium">{item.detail}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-400">No timeline entries available yet.</p>
            )}
          </div>
        </Tabs.Content>

        <Tabs.Content value="personal" className="mt-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Personal Details
              </h2>
              {(
                [
                  {
                    label: 'Full Name',
                    value: currentStudent?.name ?? currentUser?.name,
                    Icon: User,
                  },
                  {
                    label: 'Matric Number',
                    value: currentUser?.matricNumber ?? '—',
                    Icon: User,
                  },
                  { label: 'Hospital Number', value: hospitalNumber, Icon: Activity },
                  { label: 'Department', value: currentStudent?.department, Icon: User },
                  { label: 'Level', value: currentStudent?.level, Icon: User },
                  {
                    label: 'Blood Group',
                    value: currentStudent?.bloodGroup,
                    Icon: Droplets,
                  },
                  { label: 'Genotype', value: currentStudent?.genotype, Icon: Droplets },
                  {
                    label: 'Date of Birth',
                    value: currentStudent?.dateOfBirth
                      ? new Date(currentStudent.dateOfBirth).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })
                      : '—',
                    Icon: Calendar,
                  },
                  {
                    label: 'Email',
                    value: currentStudent?.email ?? currentUser?.email,
                    Icon: Mail,
                  },
                  {
                    label: 'Phone',
                    value: currentStudent?.phoneNumber,
                    Icon: Phone,
                  },
                ] as { label: string; value: string | undefined; Icon: React.ElementType }[]
              ).map(({ label, value, Icon }) => (
                <div key={label} className="flex items-center gap-3">
                  <Icon className="h-4 w-4 shrink-0 text-slate-400" />
                  <div className="flex flex-1 items-center justify-between border-b border-slate-100 pb-2">
                    <span className="text-xs text-slate-500">{label}</span>
                    <span className="text-sm font-medium text-slate-800">{value ?? '—'}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-4">
              {currentStudent?.emergencyContact && (
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Emergency Contact
                  </h2>
                  <div className="mt-3 space-y-2">
                    {(
                      [
                        { label: 'Name', value: currentStudent.emergencyContact.name },
                        {
                          label: 'Relationship',
                          value: currentStudent.emergencyContact.relationship,
                        },
                        {
                          label: 'Phone',
                          value: currentStudent.emergencyContact.phoneNumber,
                        },
                      ] as { label: string; value: string }[]
                    ).map(({ label, value }) => (
                      <div
                        key={label}
                        className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2"
                      >
                        <span className="text-xs text-slate-500">{label}</span>
                        <span className="text-sm font-semibold text-slate-800">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {latestEncounter && (
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="mb-3 flex items-center gap-2 text-slate-700">
                    <HeartPulse className="h-4 w-4" />
                    <h2 className="text-xs font-semibold uppercase tracking-wide">
                      Latest Vitals Snapshot
                    </h2>
                  </div>
                  <VitalsCard vitals={latestEncounter.vitals} />
                </div>
              )}
            </div>
          </div>
        </Tabs.Content>

        <Tabs.Content value="allergies" className="mt-4 space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Allergies
            </h2>
            {currentStudent?.allergies.length ? (
              <div className="space-y-3">
                {currentStudent.allergies.map((allergy) => (
                  <div
                    key={allergy.id}
                    className="flex items-start justify-between gap-2 rounded-xl bg-slate-50 p-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{allergy.allergen}</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        Reaction: {allergy.reaction}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-400">
                        Recorded:{' '}
                        {new Date(allergy.dateRecorded).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                    <SeverityBadge severity={allergy.severity} />
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-6 text-center text-sm text-slate-400">No allergies recorded.</p>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Chronic Conditions
            </h2>
            {currentStudent?.chronicConditions.length ? (
              <div className="flex flex-wrap gap-2">
                {currentStudent.chronicConditions.map((condition) => (
                  <span
                    key={condition}
                    className="inline-flex items-center rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700"
                  >
                    {condition}
                  </span>
                ))}
              </div>
            ) : (
              <p className="py-4 text-center text-sm text-slate-400">
                No chronic conditions on file.
              </p>
            )}
          </div>
        </Tabs.Content>

        <Tabs.Content value="history" className="mt-4 space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="grid gap-3 md:grid-cols-[1fr_auto]">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={encounterQuery}
                  onChange={(event) => setEncounterQuery(event.target.value)}
                  type="search"
                  placeholder="Search by complaint, facility, or doctor"
                  className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-400"
                />
              </label>
              <select
                aria-label="Filter visit history by status"
                value={encounterStatusFilter}
                onChange={(event) =>
                  setEncounterStatusFilter(event.target.value as Encounter['status'] | 'All')
                }
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400"
              >
                <option value="All">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Resolved">Resolved</option>
                <option value="Referred">Referred</option>
              </select>
            </div>
          </div>

          {filteredEncounters.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
              <p className="text-sm text-slate-400">No visit records match this filter.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredEncounters.map((encounter) => {
                const isOpen = openEncounterId === encounter.id;
                return (
                  <div
                    key={encounter.id}
                    className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenEncounterId(isOpen ? null : encounter.id)}
                      className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-slate-50"
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-800">
                          {encounter.chiefComplaint}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {new Date(encounter.date).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}{' '}
                          · {encounter.facility}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${encounterStatusColor[encounter.status]}`}
                        >
                          {encounter.status}
                        </span>
                        {isOpen ? (
                          <ChevronUp className="h-4 w-4 text-slate-400" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-slate-400" />
                        )}
                      </div>
                    </button>

                    {isOpen && (
                      <div className="space-y-3 border-t border-slate-100 px-4 pb-4">
                        <div className="mt-3">
                          <VitalsCard vitals={encounter.vitals} />
                        </div>

                        {encounter.diagnoses.length > 0 && (
                          <div>
                            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Diagnoses
                            </p>
                            <ul className="space-y-1">
                              {encounter.diagnoses.map((diagnosis) => (
                                <li key={diagnosis.id} className="flex items-start gap-2">
                                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
                                  <span className="text-sm text-slate-700">
                                    {diagnosis.description}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {encounter.prescriptions.length > 0 && (
                          <div>
                            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Prescriptions
                            </p>
                            <div className="space-y-2">
                              {encounter.prescriptions.map((prescription) => (
                                <div key={prescription.id} className="rounded-lg bg-blue-50 px-3 py-2">
                                  <p className="text-sm font-semibold text-blue-900">
                                    {prescription.medicationName} {prescription.dosage}
                                  </p>
                                  <p className="mt-0.5 text-xs text-blue-700">
                                    {prescription.frequency} · {prescription.duration}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <p className="text-xs text-slate-400">
                          Attending clinician: Dr. {encounter.attendingStaffName}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Tabs.Content>

        <Tabs.Content value="diagnostics" className="mt-4 space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="grid gap-3 md:grid-cols-[auto_auto_1fr] md:items-center">
              <select
                aria-label="Filter diagnostic results by type"
                value={diagnosticTypeFilter}
                onChange={(event) =>
                  setDiagnosticTypeFilter(
                    event.target.value as DiagnosticResult['type'] | 'All',
                  )
                }
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400"
              >
                {uniqueDiagnosticTypes.map((type) => (
                  <option key={type} value={type}>
                    {type === 'All' ? 'All Test Types' : type}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setCriticalOnly((value) => !value)}
                className={`rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                  criticalOnly
                    ? 'bg-red-100 text-red-700'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {criticalOnly ? 'Showing Critical Only' : 'Show Critical Only'}
              </button>
              <p className="text-xs text-slate-500 md:text-right">
                {filteredResults.length} result(s) visible
              </p>
            </div>
          </div>

          {filteredResults.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
              <p className="text-sm text-slate-400">
                No diagnostic results match the selected filters.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {filteredResults.map((result) => (
                <article
                  key={result.id}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{result.testName}</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {result.type} · {result.facility}
                      </p>
                    </div>
                    {result.criticalFlag ? (
                      <span className="rounded-full bg-red-100 px-2 py-1 text-[11px] font-semibold text-red-700">
                        Critical
                      </span>
                    ) : (
                      <span className="rounded-full bg-emerald-100 px-2 py-1 text-[11px] font-semibold text-emerald-700">
                        Normal Flag
                      </span>
                    )}
                  </div>
                  <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
                    {result.findings}
                  </p>
                  <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                    <span>Status: {result.status}</span>
                    <span>
                      {new Date(result.uploadedAt).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </Tabs.Content>

        <Tabs.Content value="medications" className="mt-4 space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-slate-900">Medication Plan Tracker</h2>
              <span className="text-xs text-slate-500">
                {takenMedicationIds.length}/{medicationChecklistItems.length} marked as taken
              </span>
            </div>

            {medicationChecklistItems.length > 0 ? (
              <div className="mt-3 space-y-2">
                {medicationChecklistItems.map((item) => {
                  const isTaken = takenMedicationIds.includes(item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => toggleMedicationTaken(item.id)}
                      className={`flex w-full items-center justify-between rounded-xl border px-3 py-3 text-left transition-colors ${
                        isTaken
                          ? 'border-emerald-200 bg-emerald-50'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <div className={`mt-0.5 ${isTaken ? 'text-emerald-600' : 'text-slate-400'}`}>
                          {isTaken ? (
                            <CheckCircle2 className="h-4 w-4" />
                          ) : (
                            <Pill className="h-4 w-4" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-800">
                            {item.medication.name} {item.medication.dosage}
                          </p>
                          <p className="text-xs text-slate-500">
                            {item.medication.frequency} · {item.medication.duration} · Qty{' '}
                            {item.medication.quantity}
                          </p>
                        </div>
                      </div>
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600">
                        {item.status}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-400">
                No approved medications available yet.
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-slate-900">Requisition Status Board</h2>
            {requisitions.length > 0 ? (
              <div className="space-y-2">
                {requisitions.map((requisition) => (
                  <div
                    key={requisition.id}
                    className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-medium text-slate-800">
                        {requisition.symptoms.slice(0, 2).join(', ') || 'General request'}
                      </p>
                      <span className="rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-slate-600">
                        {requisition.status}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      Submitted{' '}
                      {new Date(requisition.submittedAt).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400">No requisitions submitted yet.</p>
            )}
          </div>
        </Tabs.Content>
      </Tabs.Root>
    </div>
  );
}
