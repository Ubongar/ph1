import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import * as Dialog from '@radix-ui/react-dialog'
import { AlertTriangle, X, CheckCircle, XCircle, Activity } from 'lucide-react'
import { getAll, update, createAuditEntry, StorageKey } from '../../services/storage'
import { useAuth } from '../../context/AuthContext'
import type {
  Student,
  SystemUser,
  MedicationRequisition,
  ApprovedMedication,
} from '../../types/types'
import { StatusBadge, SeverityBadge, useToast } from '../../components/shared'

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function initials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

type StatusFilter = 'All' | MedicationRequisition['status']

const STATUS_FILTERS: StatusFilter[] = ['All', 'Pending Review', 'Approved', 'Rejected']

interface MedConfig {
  name: string
  dosage: string
  quantity: number
  frequency: string
  duration: string
}

export default function DoctorReviewQueue() {
  const { currentUser } = useAuth()
  const { toast } = useToast()

  const [requisitions, setRequisitions] = useState<MedicationRequisition[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [systemUsers, setSystemUsers] = useState<SystemUser[]>([])
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [doctorNote, setDoctorNote] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Allergy conflict modal
  const [showAllergyModal, setShowAllergyModal] = useState(false)
  const [allergyConflicts, setAllergyConflicts] = useState<string[]>([])

  // Medication config modal
  const [showMedModal, setShowMedModal] = useState(false)
  const [medConfigs, setMedConfigs] = useState<MedConfig[]>([])

  function loadData() {
    const reqs = getAll<MedicationRequisition>(StorageKey.REQUISITIONS)
    setRequisitions(reqs)
    setStudents(getAll<Student>(StorageKey.STUDENTS))
    setSystemUsers(getAll<SystemUser>(StorageKey.USERS))
  }

  useEffect(() => {
    loadData()
  }, [])

  const selectedReq = selectedId ? requisitions.find((r) => r.id === selectedId) ?? null : null
  const selectedStudent = selectedReq
    ? students.find((s) => s.id === selectedReq.studentId) ?? null
    : null
  const selectedSystemUser = selectedStudent
    ? systemUsers.find((u) => u.id === selectedStudent.userId) ?? null
    : null

  const filteredReqs = requisitions
    .filter((r) => statusFilter === 'All' || r.status === statusFilter)
    .sort((a, b) => {
      // Oldest pending first
      if (a.status === 'Pending Review' && b.status !== 'Pending Review') return -1
      if (b.status === 'Pending Review' && a.status !== 'Pending Review') return 1
      return new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime()
    })

  function checkAllergyConflicts(req: MedicationRequisition, student: Student): string[] {
    const conflicts: string[] = []
    for (const med of req.requestedMedications) {
      for (const allergy of student.allergies) {
        if (med.toLowerCase().includes(allergy.allergen.toLowerCase())) {
          conflicts.push(
            `${student.name} is allergic to ${allergy.allergen} (${allergy.severity}) — conflicts with "${med}"`,
          )
        }
      }
    }
    return conflicts
  }

  function handleApproveClick() {
    if (!selectedReq || !selectedStudent || !currentUser) return
    if (!doctorNote.trim()) {
      toast('Please add a doctor note before approving', 'warning')
      return
    }

    const conflicts = checkAllergyConflicts(selectedReq, selectedStudent)
    if (conflicts.length > 0) {
      setAllergyConflicts(conflicts)
      setShowAllergyModal(true)
      return
    }

    openMedModal()
  }

  function openMedModal() {
    if (!selectedReq) return
    setMedConfigs(
      selectedReq.requestedMedications.map((name) => ({
        name,
        dosage: '',
        quantity: 1,
        frequency: 'Twice daily',
        duration: '5 days',
      })),
    )
    setShowMedModal(true)
  }

  function handleAllergyOverride() {
    setShowAllergyModal(false)
    openMedModal()
  }

  function closeAllergyModal() {
    setShowAllergyModal(false)
  }

  function closeMedicationModal() {
    setShowMedModal(false)
  }

  async function confirmApproval() {
    if (!selectedReq || !currentUser) return
    setShowMedModal(false)
    setSubmitting(true)
    await new Promise<void>((r) => setTimeout(r, 600))

    const approvedMedications: ApprovedMedication[] = medConfigs.map((m) => ({
      name: m.name,
      dosage: m.dosage,
      quantity: m.quantity,
      frequency: m.frequency,
      duration: m.duration,
    }))

    update<MedicationRequisition>(StorageKey.REQUISITIONS, selectedReq.id, {
      status: 'Approved',
      reviewedByStaffId: currentUser.id,
      reviewedByStaffName: currentUser.name,
      reviewedAt: new Date().toISOString(),
      doctorNotes: doctorNote,
      approvedMedications,
    }, { autoAudit: false })

    createAuditEntry({
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      action: 'APPROVE_REQUISITION',
      resourceType: 'Requisition',
      resourceId: selectedReq.id,
      resourceDescription: `Approved requisition for ${selectedReq.studentName}`,
      status: 'Success',
    })

    toast(`Requisition approved for ${selectedReq.studentName}`, 'success')
    loadData()
    setDoctorNote('')
    setSubmitting(false)
  }

  async function handleReject() {
    if (!selectedReq || !currentUser) return
    if (!doctorNote.trim()) {
      toast('Please add a rejection reason in the doctor note', 'warning')
      return
    }
    setSubmitting(true)
    await new Promise<void>((r) => setTimeout(r, 600))

    update<MedicationRequisition>(StorageKey.REQUISITIONS, selectedReq.id, {
      status: 'Rejected',
      reviewedByStaffId: currentUser.id,
      reviewedByStaffName: currentUser.name,
      reviewedAt: new Date().toISOString(),
      doctorNotes: doctorNote,
    }, { autoAudit: false })

    createAuditEntry({
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      action: 'REJECT_REQUISITION',
      resourceType: 'Requisition',
      resourceId: selectedReq.id,
      resourceDescription: `Rejected requisition for ${selectedReq.studentName}`,
      status: 'Success',
    })

    toast(`Requisition rejected for ${selectedReq.studentName}`, 'info')
    loadData()
    setDoctorNote('')
    setSubmitting(false)
  }

  async function handleClinicVisit() {
    if (!selectedReq || !currentUser) return
    setSubmitting(true)
    await new Promise<void>((r) => setTimeout(r, 600))

    const note = 'Symptoms require in-person assessment at the clinic'
    update<MedicationRequisition>(StorageKey.REQUISITIONS, selectedReq.id, {
      status: 'Rejected',
      reviewedByStaffId: currentUser.id,
      reviewedByStaffName: currentUser.name,
      reviewedAt: new Date().toISOString(),
      doctorNotes: note,
    }, { autoAudit: false })

    createAuditEntry({
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      action: 'REJECT_REQUISITION',
      resourceType: 'Requisition',
      resourceId: selectedReq.id,
      resourceDescription: `Requested clinic visit for ${selectedReq.studentName}`,
      status: 'Success',
    })

    toast('Patient directed to clinic', 'info')
    loadData()
    setDoctorNote('')
    setSubmitting(false)
  }

  async function handleToggleUrgent() {
    if (!selectedReq) return
    const newPriority = selectedReq.priority === 'Urgent' ? 'Normal' : 'Urgent'
    update<MedicationRequisition>(StorageKey.REQUISITIONS, selectedReq.id, {
      priority: newPriority,
    })
    loadData()
    toast(`Priority set to ${newPriority}`, 'info')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
        <h1 className="text-xl font-bold text-gray-900">Doctor Review Queue</h1>
        <p className="text-sm text-gray-500">Review and process student medication requests</p>
      </div>

      <div className="flex flex-1 flex-col xl:flex-row">
        {/* Left list (40%) */}
        <div className="w-full xl:w-[40%] border-b xl:border-b-0 xl:border-r border-gray-200 bg-white flex flex-col max-h-[42vh] xl:max-h-none overflow-hidden">
          {/* Status filter chips */}
          <div className="px-4 py-3 border-b border-gray-100 flex flex-wrap gap-2">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setStatusFilter(f)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  statusFilter === f
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {f}
                {f !== 'All' && (
                  <span className="ml-1">
                    ({requisitions.filter((r) => r.status === f).length})
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
            {filteredReqs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Activity className="w-8 h-8 text-gray-300 mb-3" />
                <p className="text-sm text-gray-500">No requisitions found</p>
              </div>
            ) : (
              filteredReqs.map((req) => (
                <button
                  key={req.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(req.id)
                    setDoctorNote(req.doctorNotes ?? '')
                  }}
                  className={`w-full flex items-start gap-3 px-4 py-4 text-left hover:bg-gray-50 transition-colors ${
                    selectedId === req.id ? 'bg-blue-50 border-r-2 border-blue-600' : ''
                  }`}
                >
                  <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-gray-700 text-xs font-bold shrink-0">
                    {initials(req.studentName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {req.studentName}
                      </span>
                      {req.priority === 'Urgent' && (
                        <span className="px-1.5 py-0.5 rounded text-xs font-semibold bg-orange-100 text-orange-700">
                          Urgent
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-400">{relativeTime(req.submittedAt)}</span>
                      <span className="text-xs bg-gray-100 text-gray-600 rounded-full px-1.5 py-0.5">
                        {req.symptoms.length} symptoms
                      </span>
                      <SeverityBadge severity={req.severity} />
                    </div>
                  </div>
                  <StatusBadge status={req.status} />
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right detail panel (60%) */}
        <div className="flex-1 overflow-y-auto">
          {!selectedReq ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <Activity className="w-12 h-12 text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                Select a requisition
              </h3>
              <p className="text-sm text-gray-500">
                Click on a request from the list to view and process it
              </p>
            </div>
          ) : (
            <div className="p-4 sm:p-6 space-y-5">
              {/* Patient context banner */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
                      {initials(selectedReq.studentName)}
                    </div>
                    <div>
                      <h2 className="font-bold text-gray-900">{selectedReq.studentName}</h2>
                      {selectedSystemUser?.matricNumber && (
                        <p className="text-xs text-gray-500">{selectedSystemUser.matricNumber}</p>
                      )}
                      {selectedStudent && (
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <span className="text-xs text-gray-600">
                            Blood Group: {selectedStudent.bloodGroup}
                          </span>
                          {selectedStudent.allergies
                            .filter((a) => a.severity === 'Life-threatening')
                            .map((a) => (
                              <span
                                key={a.id}
                                className="text-xs bg-red-100 text-red-700 border border-red-200 rounded-full px-2 py-0.5 flex items-center gap-1"
                              >
                                <AlertTriangle className="w-3 h-3" />
                                {a.allergen}
                              </span>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <Link
                    to={`/staff/patient/${selectedReq.studentId}`}
                    className="text-xs text-blue-600 hover:underline sm:self-start"
                  >
                    View Full EHR →
                  </Link>
                </div>
              </div>

              {/* Request details */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center gap-3 mb-4">
                  <h3 className="font-semibold text-gray-900">Request Details</h3>
                  <StatusBadge status={selectedReq.status} />
                  {selectedReq.priority === 'Urgent' && (
                    <span className="px-2 py-0.5 rounded text-xs font-semibold bg-orange-100 text-orange-700">
                      Urgent
                    </span>
                  )}
                </div>

                <p className="text-xs text-gray-500 mb-3">
                  Submitted {new Date(selectedReq.submittedAt).toLocaleString()}
                </p>

                <div className="mb-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Symptoms</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedReq.symptoms.map((s) => (
                      <span
                        key={s}
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700"
                      >
                        {s}
                      </span>
                    ))}
                    <SeverityBadge severity={selectedReq.severity} />
                  </div>
                </div>

                {selectedReq.symptomDescription && (
                  <div className="mb-3">
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-1">
                      Description
                    </p>
                    <p className="text-sm text-gray-700">{selectedReq.symptomDescription}</p>
                  </div>
                )}

                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-1">
                    Requested Medications
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {selectedReq.requestedMedications.map((m, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-blue-50 text-blue-700 border border-blue-200"
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Pending Review actions */}
              {selectedReq.status === 'Pending Review' && (
                <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">Review</h3>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <span className="text-gray-600">Flag Urgent</span>
                      <button
                        type="button"
                        onClick={handleToggleUrgent}
                        disabled={submitting}
                        className={`relative w-10 h-5 rounded-full transition-colors ${
                          selectedReq.priority === 'Urgent' ? 'bg-orange-500' : 'bg-gray-300'
                        } disabled:opacity-60`}
                      >
                        <span
                          className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                            selectedReq.priority === 'Urgent' ? 'left-5' : 'left-0.5'
                          }`}
                        />
                      </button>
                    </label>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">
                      Doctor Note <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      rows={3}
                      value={doctorNote}
                      disabled={submitting}
                      onChange={(e) => setDoctorNote(e.target.value)}
                      placeholder="Add clinical notes, approval instructions, or rejection reason..."
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 resize-none"
                    />
                  </div>

                  <div className="flex gap-3 flex-wrap">
                    <button
                      type="button"
                      onClick={handleApproveClick}
                      disabled={submitting}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={handleReject}
                      disabled={submitting}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60"
                    >
                      <XCircle className="w-4 h-4" />
                      Reject
                    </button>
                    <button
                      type="button"
                      onClick={handleClinicVisit}
                      disabled={submitting}
                      className="flex items-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60"
                    >
                      <Activity className="w-4 h-4" />
                      Request Clinic Visit
                    </button>
                  </div>
                </div>
              )}

              {/* Approved: show approved meds */}
              {selectedReq.status === 'Approved' && (
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h3 className="font-semibold text-gray-900 mb-3">Approval Details</h3>
                  {selectedReq.doctorNotes && (
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs font-semibold text-gray-500 uppercase mb-1">
                        Doctor Notes
                      </p>
                      <p className="text-sm text-gray-700">{selectedReq.doctorNotes}</p>
                    </div>
                  )}
                  {selectedReq.approvedMedications && selectedReq.approvedMedications.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase mb-2">
                        Approved Medications
                      </p>
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[560px] text-xs border border-gray-200 rounded-lg overflow-hidden">
                          <thead className="bg-gray-50">
                            <tr>
                              {['Medication', 'Dosage', 'Qty', 'Frequency', 'Duration'].map((h) => (
                                <th
                                  key={h}
                                  className="px-3 py-2 text-left font-semibold text-gray-500"
                                >
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {selectedReq.approvedMedications.map((m, i) => (
                              <tr key={i}>
                                <td className="px-3 py-2 font-medium text-gray-900">{m.name}</td>
                                <td className="px-3 py-2 text-gray-700">{m.dosage}</td>
                                <td className="px-3 py-2 text-gray-700">{m.quantity}</td>
                                <td className="px-3 py-2 text-gray-700">{m.frequency}</td>
                                <td className="px-3 py-2 text-gray-700">{m.duration}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                  <p className="text-xs text-gray-400 mt-3">
                    Reviewed by {selectedReq.reviewedByStaffName} ·{' '}
                    {selectedReq.reviewedAt
                      ? new Date(selectedReq.reviewedAt).toLocaleString()
                      : ''}
                  </p>
                </div>
              )}

              {/* Rejected: show rejection reason */}
              {selectedReq.status === 'Rejected' && (
                <div className="bg-white rounded-xl border border-red-200 p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <XCircle className="w-4 h-4 text-red-500" />
                    <h3 className="font-semibold text-gray-900">Rejection Details</h3>
                  </div>
                  <div className="p-3 bg-red-50 rounded-lg">
                    <p className="text-sm text-gray-700">
                      {selectedReq.doctorNotes ?? 'No reason provided'}
                    </p>
                  </div>
                  <p className="text-xs text-gray-400 mt-3">
                    Reviewed by {selectedReq.reviewedByStaffName} ·{' '}
                    {selectedReq.reviewedAt
                      ? new Date(selectedReq.reviewedAt).toLocaleString()
                      : ''}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Allergy Conflict Modal */}
      <Dialog.Root open={showAllergyModal} onOpenChange={setShowAllergyModal}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-40" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-1.5rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-4 sm:p-6 shadow-xl focus:outline-none">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <Dialog.Title className="text-lg font-semibold text-gray-900">
                ⚠️ Allergy Conflict Detected
              </Dialog.Title>
              <Dialog.Close asChild>
                <button
                  type="button"
                  onClick={closeAllergyModal}
                  aria-label="Close allergy conflict dialog"
                  title="Close"
                  className="ml-auto p-1 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </Dialog.Close>
            </div>
            <div className="space-y-2 mb-5">
              {allergyConflicts.map((c, i) => (
                <div
                  key={i}
                  className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3"
                >
                  {c}
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-3">
              <Dialog.Close asChild>
                <button
                  type="button"
                  onClick={closeAllergyModal}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </Dialog.Close>
              <button
                type="button"
                onClick={handleAllergyOverride}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
              >
                Override &amp; Proceed
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Medication Config Modal */}
      <Dialog.Root open={showMedModal} onOpenChange={setShowMedModal}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-40" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-1.5rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-4 sm:p-6 shadow-xl focus:outline-none overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between mb-4">
              <Dialog.Title className="text-lg font-semibold text-gray-900">
                Configure Approved Medications
              </Dialog.Title>
              <Dialog.Close asChild>
                <button
                  type="button"
                  onClick={closeMedicationModal}
                  aria-label="Close medication configuration dialog"
                  title="Close"
                  className="p-1 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </Dialog.Close>
            </div>
            <Dialog.Description className="text-sm text-gray-500 mb-5">
              Confirm or edit the dosage, quantity, frequency, and duration for each medication.
            </Dialog.Description>

            <div className="space-y-4 mb-6">
              {medConfigs.map((med, idx) => (
                <div key={idx} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <p className="text-sm font-semibold text-gray-900 mb-3">{med.name}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-gray-600 mb-1 block">Dosage</label>
                      <input
                        type="text"
                        value={med.dosage}
                        onChange={(e) => {
                          const updated = [...medConfigs]
                          updated[idx] = { ...updated[idx], dosage: e.target.value }
                          setMedConfigs(updated)
                        }}
                        placeholder="e.g. 500mg"
                        className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 mb-1 block">
                        Quantity
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={med.quantity}
                        aria-label={`Quantity for ${med.name}`}
                        onChange={(e) => {
                          const updated = [...medConfigs]
                          updated[idx] = { ...updated[idx], quantity: parseInt(e.target.value) || 1 }
                          setMedConfigs(updated)
                        }}
                        className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 mb-1 block">
                        Frequency
                      </label>
                      <input
                        type="text"
                        value={med.frequency}
                        onChange={(e) => {
                          const updated = [...medConfigs]
                          updated[idx] = { ...updated[idx], frequency: e.target.value }
                          setMedConfigs(updated)
                        }}
                        placeholder="e.g. Twice daily"
                        className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 mb-1 block">
                        Duration
                      </label>
                      <input
                        type="text"
                        value={med.duration}
                        onChange={(e) => {
                          const updated = [...medConfigs]
                          updated[idx] = { ...updated[idx], duration: e.target.value }
                          setMedConfigs(updated)
                        }}
                        placeholder="e.g. 5 days"
                        className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3">
              <Dialog.Close asChild>
                <button
                  type="button"
                  onClick={closeMedicationModal}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </Dialog.Close>
              <button
                type="button"
                onClick={confirmApproval}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
              >
                <CheckCircle className="w-4 h-4" />
                Confirm Approval
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  )
}
