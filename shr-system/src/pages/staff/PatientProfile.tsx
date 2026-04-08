import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import * as Tabs from '@radix-ui/react-tabs'
import {
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  PlusCircle,
  Download,
  ArrowLeft,
  Activity,
  Thermometer,
  Heart,
  Wind,
} from 'lucide-react'
import { create, getAll, getById, StorageKey, createAuditEntry } from '../../services/storage'
import { useAuth } from '../../context/AuthContext'
import {
  canAccessStudentForUser,
  getScopedEncountersForUser,
  getScopedRequisitionsForUser,
  getScopedResultsForUser,
} from '../../services/accessScope'
import { getHospitalNumber } from '../../utils/studentIdentifiers'
import type {
  Student,
  SystemUser,
  Encounter,
  DiagnosticResult,
  MedicationRequisition,
  Prescription,
  Referral,
} from '../../types/types'
import { StatusBadge, SeverityBadge, VitalsCard, useToast } from '../../components/shared'

function calcAge(dob: string): number {
  const birth = new Date(dob)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  if (
    today.getMonth() < birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())
  ) {
    age--
  }
  return age
}

function initials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export default function PatientProfile() {
  const { studentId } = useParams<{ studentId: string }>()
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const { toast } = useToast()

  const [student, setStudent] = useState<Student | null>(null)
  const [systemUser, setSystemUser] = useState<SystemUser | null>(null)
  const [encounters, setEncounters] = useState<Encounter[]>([])
  const [results, setResults] = useState<DiagnosticResult[]>([])
  const [requisitions, setRequisitions] = useState<MedicationRequisition[]>([])
  const [expandedContact, setExpandedContact] = useState(false)
  const [expandedEncounters, setExpandedEncounters] = useState<Set<string>>(new Set())
  const [facilityFilter, setFacilityFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [notFound, setNotFound] = useState(false)
  const [showReferralModal, setShowReferralModal] = useState(false)
  const [referralSpecialty, setReferralSpecialty] = useState('Cardiology')
  const [referralPriority, setReferralPriority] = useState<'Routine' | 'Urgent' | 'Emergency'>('Routine')
  const [referralReason, setReferralReason] = useState('')

  useEffect(() => {
    if (!studentId) { setNotFound(true); return }
    const s = getById<Student>(StorageKey.STUDENTS, studentId)
    if (!s) { setNotFound(true); return }

    if (!currentUser || !canAccessStudentForUser(currentUser.role, currentUser.id, studentId)) {
      setNotFound(true)
      return
    }

    setStudent(s)

    const users = getAll<SystemUser>(StorageKey.USERS)
    setSystemUser(users.find((u) => u.id === s.userId) ?? null)

    const allEncounters = getScopedEncountersForUser(currentUser.role, currentUser.id)
    setEncounters(
      allEncounters
        .filter((e) => e.studentId === studentId)
        .sort((a, b) => b.date.localeCompare(a.date)),
    )

    const allResults = getScopedResultsForUser(currentUser.role, currentUser.id)
    setResults(
      allResults
        .filter((r) => r.studentId === studentId)
        .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt)),
    )

    setRequisitions(
      getScopedRequisitionsForUser(currentUser.role, currentUser.id)
        .filter((req) => req.studentId === studentId)
        .sort(
        (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime(),
      ),
    )

    if (currentUser) {
      createAuditEntry({
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'VIEW_RECORD',
        resourceType: 'Student',
        resourceId: studentId,
        resourceDescription: `Viewed patient profile: ${s.name}`,
        status: 'Success',
      })
    }
  }, [studentId, currentUser])

  if (notFound) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center max-w-md">
          <div className="text-6xl font-bold text-gray-200 mb-4">404</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Patient not found</h2>
          <p className="text-sm text-gray-500 mb-6">
            The patient record you are looking for does not exist.
          </p>
          <button
            type="button"
            onClick={() => navigate('/staff/search')}
            className="flex items-center gap-2 mx-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Search
          </button>
        </div>
      </div>
    )
  }

  if (!student) return null

  const hospitalNumber = getHospitalNumber(systemUser?.matricNumber, student.id)

  const latestEncounter = encounters[0]
  const criticalAllergies = student.allergies.filter((a) => a.severity === 'Life-threatening')

  const filteredEncounters = encounters.filter((e) => {
    if (facilityFilter && e.facility !== facilityFilter) return false
    if (dateFrom && e.date.split('T')[0] < dateFrom) return false
    if (dateTo && e.date.split('T')[0] > dateTo) return false
    return true
  })

  // All prescriptions across all encounters
  interface PrescriptionRow extends Prescription {
    encounterDate: string
    encounterId: string
  }
  const allPrescriptions: PrescriptionRow[] = encounters.flatMap((e) =>
    e.prescriptions.map((p) => ({
      ...p,
      encounterDate: e.date.split('T')[0],
      encounterId: e.id,
    })),
  )

  function toggleEncounter(id: string) {
    setExpandedEncounters((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function submitReferral() {
    if (!currentUser || !student || !referralReason.trim()) {
      toast('Referral reason is required', 'error')
      return
    }
    const specialists = getAll<SystemUser>(StorageKey.USERS).filter((u) => u.role === 'specialist' && u.isActive)
    if (specialists.length === 0) {
      toast('No active specialist is available for assignment', 'error')
      return
    }
    const matchedSpecialist = specialists.find((u) =>
      (u.department ?? '').toLowerCase().includes(referralSpecialty.toLowerCase()),
    ) ?? specialists[0]

    const referral = create<Referral>(StorageKey.REFERRALS, {
      studentId: student.id,
      studentName: student.name,
      requestingStaffId: currentUser.id,
      requestingStaffName: currentUser.name,
      specialistId: matchedSpecialist?.id,
      specialistName: matchedSpecialist?.name,
      specialty: referralSpecialty,
      reason: referralReason.trim(),
      priority: referralPriority,
      status: 'Requested',
      requestedAt: new Date().toISOString(),
    }, { autoAudit: false })

    createAuditEntry({
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      action: 'CREATE_REFERRAL',
      resourceType: 'Referral',
      resourceId: referral.id,
      resourceDescription: `Created ${referralSpecialty} referral for ${student.name}`,
      status: 'Success',
    })
    setShowReferralModal(false)
    setReferralReason('')
    setReferralPriority('Routine')
    setReferralSpecialty('Cardiology')
    toast('Referral created', 'success')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Back nav */}
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
      </div>

      <div className="max-w-screen-xl mx-auto p-6 flex gap-6">
        {/* Left Panel (30%) */}
        <div className="w-[30%] space-y-4">
          {/* Identity */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex flex-col items-center text-center mb-4">
              <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center text-white text-xl font-bold mb-3">
                {initials(student.name)}
              </div>
              <h2 className="text-lg font-bold text-gray-900">{student.name}</h2>
              {systemUser?.matricNumber && (
                <p className="text-xs text-gray-500">{systemUser.matricNumber}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="col-span-2">
                <span className="text-xs text-gray-500">Hospital Number</span>
                <p className="font-medium text-gray-900">{hospitalNumber}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500">Age</span>
                <p className="font-medium text-gray-900">{calcAge(student.dateOfBirth)} yrs</p>
              </div>
              <div>
                <span className="text-xs text-gray-500">Gender</span>
                <p className="font-medium text-gray-900">{student.gender}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500">Blood Group</span>
                <p className="font-medium text-gray-900">{student.bloodGroup}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500">Genotype</span>
                <p className="font-medium text-gray-900">{student.genotype}</p>
              </div>
              <div className="col-span-2">
                <span className="text-xs text-gray-500">Department</span>
                <p className="font-medium text-gray-900">
                  {student.department} · {student.level}
                </p>
              </div>
            </div>
          </div>

          {/* Allergies */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Allergies</h3>
            {student.allergies.length === 0 ? (
              <p className="text-xs text-gray-500">No allergies recorded</p>
            ) : (
              <div className="space-y-2">
                {student.allergies.map((allergy) => (
                  <div
                    key={allergy.id}
                    className={`p-2 rounded-lg border text-xs ${
                      allergy.severity === 'Life-threatening'
                        ? 'border-red-300 bg-red-50 animate-pulse'
                        : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-gray-900">{allergy.allergen}</span>
                      <SeverityBadge severity={allergy.severity} />
                    </div>
                    <p className="text-gray-500">{allergy.reaction}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Chronic Conditions */}
          {student.chronicConditions.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Chronic Conditions</h3>
              <div className="space-y-1">
                {student.chronicConditions.map((c, i) => (
                  <div
                    key={i}
                    className="text-xs text-gray-700 bg-orange-50 border border-orange-200 rounded px-2 py-1"
                  >
                    {c}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Emergency Contact */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <button
              type="button"
              onClick={() => setExpandedContact(!expandedContact)}
              className="w-full flex items-center justify-between px-5 py-3 text-sm font-semibold text-gray-900 hover:bg-gray-50"
            >
              Emergency Contact
              {expandedContact ? (
                <ChevronUp className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              )}
            </button>
            {expandedContact && (
              <div className="px-5 pb-4 text-sm space-y-1">
                <p className="font-medium text-gray-900">{student.emergencyContact.name}</p>
                <p className="text-gray-500">{student.emergencyContact.relationship}</p>
                <p className="text-gray-700">{student.emergencyContact.phoneNumber}</p>
              </div>
            )}
          </div>

          {/* Latest Vitals */}
          {latestEncounter && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Most Recent Vitals</h3>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                  <Activity className="w-4 h-4 text-red-500" />
                  <div>
                    <p className="text-xs text-gray-500">BP</p>
                    <p className="text-xs font-semibold text-gray-900">
                      {latestEncounter.vitals.bloodPressureSystolic}/
                      {latestEncounter.vitals.bloodPressureDiastolic}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                  <Heart className="w-4 h-4 text-pink-500" />
                  <div>
                    <p className="text-xs text-gray-500">HR</p>
                    <p className="text-xs font-semibold text-gray-900">
                      {latestEncounter.vitals.heartRate} bpm
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                  <Thermometer className="w-4 h-4 text-orange-500" />
                  <div>
                    <p className="text-xs text-gray-500">Temp</p>
                    <p className="text-xs font-semibold text-gray-900">
                      {latestEncounter.vitals.temperature}°C
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                  <Wind className="w-4 h-4 text-blue-500" />
                  <div>
                    <p className="text-xs text-gray-500">SpO₂</p>
                    <p className="text-xs font-semibold text-gray-900">
                      {latestEncounter.vitals.oxygenSaturation}%
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Add Encounter CTA */}
          {criticalAllergies.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-center gap-2 text-red-700">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-xs font-semibold">
                  {criticalAllergies.length} Life-threatening{' '}
                  {criticalAllergies.length === 1 ? 'allergy' : 'allergies'}
                </span>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => navigate(`/staff/patient/${student.id}/encounter/new`)}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            Add New Encounter
          </button>
          <button
            type="button"
            onClick={() => setShowReferralModal(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-colors"
          >
            Create Referral
          </button>
        </div>

        {/* Right Panel (70%) */}
        <div className="flex-1 min-w-0">
          <Tabs.Root defaultValue="encounters">
            <Tabs.List className="flex border-b border-gray-200 mb-4">
              {[
                { value: 'encounters', label: 'Encounter History' },
                { value: 'results', label: 'Diagnostic Results' },
                { value: 'medications', label: 'Medication History' },
                { value: 'requisitions', label: 'Requisition History' },
              ].map((tab) => (
                <Tabs.Trigger
                  key={tab.value}
                  value={tab.value}
                  className="px-4 py-3 text-sm font-medium text-gray-500 hover:text-gray-900 border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 transition-colors"
                >
                  {tab.label}
                </Tabs.Trigger>
              ))}
            </Tabs.List>

            {/* Encounter History */}
            <Tabs.Content value="encounters">
              {/* Filters */}
              <div className="flex gap-3 mb-4">
                <select
                  value={facilityFilter}
                  onChange={(e) => setFacilityFilter(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Facilities</option>
                  {(['Amphi Clinic', 'BUTH', 'Radiology', 'Lab'] as const).map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {filteredEncounters.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 px-6 py-16 text-center text-sm text-gray-500">
                  No encounters found
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredEncounters.map((enc) => {
                    const isExpanded = expandedEncounters.has(enc.id)
                    return (
                      <div
                        key={enc.id}
                        className="bg-white rounded-xl border border-gray-200 overflow-hidden"
                      >
                        <button
                          type="button"
                          onClick={() => toggleEncounter(enc.id)}
                          className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 text-left"
                        >
                          <div className="flex items-center gap-4">
                            <div>
                              <span className="text-sm font-semibold text-gray-900">
                                {enc.date.split('T')[0]}
                              </span>
                              <span className="ml-2 text-xs text-gray-500">{enc.facility}</span>
                            </div>
                            <span className="text-sm text-gray-700 truncate max-w-xs">
                              {enc.chiefComplaint}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                enc.status === 'Active'
                                  ? 'bg-blue-100 text-blue-700'
                                  : enc.status === 'Resolved'
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-yellow-100 text-yellow-700'
                              }`}
                            >
                              {enc.status}
                            </span>
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-gray-400" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-gray-400" />
                            )}
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="border-t border-gray-100 px-5 py-4 space-y-4">
                            {/* SOAP Notes */}
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">
                                  Subjective
                                </h4>
                                <p className="text-sm text-gray-700">{enc.subjectiveNotes}</p>
                              </div>
                              <div>
                                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">
                                  Objective
                                </h4>
                                <p className="text-sm text-gray-700">{enc.objectiveNotes}</p>
                              </div>
                            </div>

                            <VitalsCard vitals={enc.vitals} />

                            {/* Diagnoses */}
                            {enc.diagnoses.length > 0 && (
                              <div>
                                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                                  Diagnoses
                                </h4>
                                <div className="space-y-1">
                                  {enc.diagnoses.map((d) => (
                                    <div
                                      key={d.id}
                                      className="flex items-center gap-2 text-sm"
                                    >
                                      <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-700">
                                        {d.icd10Code}
                                      </span>
                                      <span className="text-gray-900">{d.description}</span>
                                      <span className="text-xs text-gray-500">({d.type})</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Treatment Plan */}
                            <div>
                              <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">
                                Treatment Plan
                              </h4>
                              <p className="text-sm text-gray-700">{enc.treatmentPlan}</p>
                            </div>

                            {/* Prescriptions */}
                            {enc.prescriptions.length > 0 && (
                              <div>
                                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                                  Prescriptions
                                </h4>
                                <table className="w-full text-xs border border-gray-200 rounded-lg overflow-hidden">
                                  <thead className="bg-gray-50">
                                    <tr>
                                      {['Medication', 'Dosage', 'Frequency', 'Duration', 'Route'].map(
                                        (h) => (
                                          <th
                                            key={h}
                                            className="px-3 py-2 text-left text-gray-500 font-semibold"
                                          >
                                            {h}
                                          </th>
                                        ),
                                      )}
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100">
                                    {enc.prescriptions.map((p) => (
                                      <tr key={p.id}>
                                        <td className="px-3 py-2 font-medium text-gray-900">
                                          {p.medicationName}
                                        </td>
                                        <td className="px-3 py-2 text-gray-700">{p.dosage}</td>
                                        <td className="px-3 py-2 text-gray-700">{p.frequency}</td>
                                        <td className="px-3 py-2 text-gray-700">{p.duration}</td>
                                        <td className="px-3 py-2 text-gray-700">{p.route}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}

                            {/* Follow-up */}
                            {enc.followUpRequired && (
                              <p className="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded px-3 py-2">
                                Follow-up required{enc.followUpDate ? ` on ${enc.followUpDate}` : ''}
                              </p>
                            )}

                            <p className="text-xs text-gray-400">
                              Attending: {enc.attendingStaffName}
                            </p>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </Tabs.Content>

            {/* Diagnostic Results */}
            <Tabs.Content value="results">
              {results.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 px-6 py-16 text-center text-sm text-gray-500">
                  No diagnostic results found
                </div>
              ) : (
                <div className="space-y-3">
                  {results.map((r) => (
                    <div
                      key={r.id}
                      className={`bg-white rounded-xl border overflow-hidden ${
                        r.criticalFlag ? 'border-red-300' : 'border-gray-200'
                      }`}
                    >
                      {r.criticalFlag && (
                        <div className="bg-red-600 text-white text-xs font-bold px-4 py-1.5 flex items-center gap-2">
                          <AlertTriangle className="w-3 h-3" />
                          CRITICAL
                          {r.criticalFlagReason && ` — ${r.criticalFlagReason}`}
                        </div>
                      )}
                      <div className="px-5 py-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-semibold text-gray-900">{r.testName}</h4>
                            <p className="text-xs text-gray-500">
                              {r.type} · {r.facility} ·{' '}
                              {new Date(r.uploadedAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                r.status === 'Completed'
                                  ? 'bg-green-100 text-green-700'
                                  : r.status === 'Flagged'
                                    ? 'bg-red-100 text-red-700'
                                    : 'bg-yellow-100 text-yellow-700'
                              }`}
                            >
                              {r.status}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                toast(
                                  `Simulated download: ${r.testName}.${r.fileType.toLowerCase()}`,
                                  'info',
                                )
                              }
                              className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 hover:bg-gray-50 rounded-lg text-xs text-gray-700 transition-colors"
                            >
                              <Download className="w-3 h-3" />
                              Download
                            </button>
                          </div>
                        </div>
                        <p className="text-sm text-gray-700">{r.findings}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          Uploaded by {r.uploadedByTechnicianName}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Tabs.Content>

            {/* Medication History */}
            <Tabs.Content value="medications">
              {allPrescriptions.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 px-6 py-16 text-center text-sm text-gray-500">
                  No medication history found
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        {[
                          'Medication',
                          'Dosage',
                          'Frequency',
                          'Duration',
                          'Route',
                          'Date',
                        ].map((h) => (
                          <th
                            key={h}
                            className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {allPrescriptions.map((p) => (
                        <tr key={`${p.id}-${p.encounterId}`} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900">
                            {p.medicationName}
                          </td>
                          <td className="px-4 py-3 text-gray-600">{p.dosage}</td>
                          <td className="px-4 py-3 text-gray-600">{p.frequency}</td>
                          <td className="px-4 py-3 text-gray-600">{p.duration}</td>
                          <td className="px-4 py-3 text-gray-600">{p.route}</td>
                          <td className="px-4 py-3 text-gray-600">{p.encounterDate}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Tabs.Content>

            {/* Requisition History */}
            <Tabs.Content value="requisitions">
              {requisitions.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 px-6 py-16 text-center text-sm text-gray-500">
                  No requisitions found
                </div>
              ) : (
                <div className="space-y-3">
                  {requisitions.map((req) => (
                    <div
                      key={req.id}
                      className="bg-white rounded-xl border border-gray-200 px-5 py-4"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="text-xs text-gray-500">
                            {new Date(req.submittedAt).toLocaleString()}
                          </p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {req.symptoms.map((s) => (
                              <span
                                key={s}
                                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700"
                              >
                                {s}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <StatusBadge status={req.status} />
                        </div>
                      </div>
                      {req.doctorNotes && (
                        <p className="text-sm text-gray-700 bg-gray-50 rounded p-2 mt-2">
                          <span className="font-medium text-gray-900">Doctor notes: </span>
                          {req.doctorNotes}
                        </p>
                      )}
                      {req.approvedMedications && req.approvedMedications.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs font-semibold text-gray-500 uppercase mb-1">
                            Approved Medications
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {req.approvedMedications.map((m, i) => (
                              <span
                                key={i}
                                className="text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded px-2 py-0.5"
                              >
                                {m.name} {m.dosage}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Tabs.Content>
          </Tabs.Root>
        </div>
      </div>

      {showReferralModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowReferralModal(false)} />
          <div className="relative bg-white rounded-xl border border-gray-200 shadow-xl w-full max-w-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Create Specialist Referral</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Specialty</label>
                <select
                  value={referralSpecialty}
                  onChange={(e) => setReferralSpecialty(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {['Cardiology', 'Dermatology', 'Neurology', 'ENT', 'Orthopedics', 'Radiology', 'Pathology'].map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <select
                  value={referralPriority}
                  onChange={(e) => setReferralPriority(e.target.value as 'Routine' | 'Urgent' | 'Emergency')}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {['Routine', 'Urgent', 'Emergency'].map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                <textarea
                  rows={4}
                  value={referralReason}
                  onChange={(e) => setReferralReason(e.target.value)}
                  placeholder="Provide concise clinical reason for referral..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowReferralModal(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitReferral}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm"
              >
                Create Referral
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
