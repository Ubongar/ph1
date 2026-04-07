import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { PlusCircle, Trash2, ArrowLeft, AlertTriangle, Save } from 'lucide-react'
import { getAll, getById, create, createAuditEntry, StorageKey } from '../../services/storage'
import { useAuth } from '../../context/AuthContext'
import { useFormDraft } from '../../hooks/useFormDraft'
import type {
  Student,
  SystemUser,
  Encounter,
  Vitals,
  Diagnosis,
  Prescription,
} from '../../types/types'
import { useToast } from '../../components/shared'

const ICD10_CODES: { code: string; description: string }[] = [
  { code: 'J06.9', description: 'Acute upper respiratory infection, unspecified' },
  { code: 'J00', description: 'Acute nasopharyngitis [common cold]' },
  { code: 'A09', description: 'Infectious gastroenteritis and colitis' },
  { code: 'K29.7', description: 'Gastritis, unspecified' },
  { code: 'R51', description: 'Headache' },
  { code: 'R50.9', description: 'Fever, unspecified' },
  { code: 'R05', description: 'Cough' },
  { code: 'J02.9', description: 'Acute pharyngitis, unspecified' },
  { code: 'K59.0', description: 'Constipation' },
  { code: 'K52.9', description: 'Noninfective gastroenteritis and colitis, unspecified' },
  { code: 'M54.5', description: 'Low back pain' },
  { code: 'R42', description: 'Dizziness and giddiness' },
  { code: 'L50.0', description: 'Allergic urticaria' },
  { code: 'J30.1', description: 'Allergic rhinitis due to pollen' },
  { code: 'E11.9', description: 'Type 2 diabetes mellitus without complications' },
  { code: 'I10', description: 'Essential (primary) hypertension' },
  { code: 'J45.9', description: 'Asthma, unspecified' },
  { code: 'N39.0', description: 'Urinary tract infection, site not specified' },
  { code: 'B50.9', description: 'Plasmodium falciparum malaria, unspecified' },
  { code: 'K21.0', description: 'Gastro-oesophageal reflux disease with oesophagitis' },
  { code: 'G43.9', description: 'Migraine, unspecified' },
  { code: 'F41.1', description: 'Generalized anxiety disorder' },
  { code: 'A90', description: 'Dengue fever' },
  { code: 'B19.9', description: 'Unspecified viral hepatitis' },
]

interface DiagRow {
  uid: string
  icd10Code: string
  description: string
  type: Diagnosis['type']
}

interface PrescRow {
  uid: string
  medicationName: string
  dosage: string
  frequency: string
  duration: string
  route: Prescription['route']
  notes: string
}

interface EncounterFormData {
  facility: Encounter['facility']
  date: string
  time: string
  chiefComplaint: string
  subjectiveNotes: string
  objectiveNotes: string
  bpSystolic: string
  bpDiastolic: string
  heartRate: string
  temperature: string
  respiratoryRate: string
  oxygenSaturation: string
  weight: string
  height: string
  diagnoses: DiagRow[]
  treatmentPlan: string
  followUpRequired: boolean
  followUpDate: string
  prescriptions: PrescRow[]
  status: Encounter['status']
}

function genUid(): string {
  return `uid-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function calcBmi(weight: string, height: string): number | null {
  const w = parseFloat(weight)
  const h = parseFloat(height)
  if (!w || !h || h <= 0) return null
  return Math.round((w / Math.pow(h / 100, 2)) * 10) / 10
}

function bmiLabel(bmi: number): { label: string; color: string } {
  if (bmi < 18.5) return { label: 'Underweight', color: 'text-blue-600' }
  if (bmi < 25) return { label: 'Normal', color: 'text-green-600' }
  if (bmi < 30) return { label: 'Overweight', color: 'text-yellow-600' }
  return { label: 'Obese', color: 'text-red-600' }
}

function formatDraftTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

const defaultForm = (): EncounterFormData => ({
  facility: 'Amphi Clinic',
  date: new Date().toISOString().split('T')[0],
  time: new Date().toTimeString().slice(0, 5),
  chiefComplaint: '',
  subjectiveNotes: '',
  objectiveNotes: '',
  bpSystolic: '',
  bpDiastolic: '',
  heartRate: '',
  temperature: '',
  respiratoryRate: '',
  oxygenSaturation: '',
  weight: '',
  height: '',
  diagnoses: [{ uid: genUid(), icd10Code: '', description: '', type: 'Primary' }],
  treatmentPlan: '',
  followUpRequired: false,
  followUpDate: '',
  prescriptions: [],
  status: 'Active',
})

export default function NewEncounter() {
  const { studentId } = useParams<{ studentId: string }>()
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const { toast } = useToast()
  const { saveDraft, draftTime } = useFormDraft<EncounterFormData>(
    `encounter-${studentId ?? 'unknown'}`,
  )

  const [student, setStudent] = useState<Student | null>(null)
  const [systemUser, setSystemUser] = useState<SystemUser | null>(null)
  const [form, setForm] = useState<EncounterFormData>(defaultForm)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const autoSaveRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const formRef = useRef(form)
  formRef.current = form

  useEffect(() => {
    if (!studentId) return
    const s = getById<Student>(StorageKey.STUDENTS, studentId)
    if (s) {
      setStudent(s)
      const users = getAll<SystemUser>(StorageKey.USERS)
      setSystemUser(users.find((u) => u.id === s.userId) ?? null)
    }
  }, [studentId])

  // Auto-save every 30s
  useEffect(() => {
    autoSaveRef.current = setInterval(() => {
      saveDraft(formRef.current)
    }, 30000)
    return () => {
      if (autoSaveRef.current) clearInterval(autoSaveRef.current)
    }
  }, [saveDraft])

  const setField = useCallback(
    <K extends keyof EncounterFormData>(key: K, value: EncounterFormData[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }))
    },
    [],
  )

  function updateDiag(uid: string, field: keyof DiagRow, value: string) {
    setForm((prev) => ({
      ...prev,
      diagnoses: prev.diagnoses.map((d) => {
        if (d.uid !== uid) return d
        if (field === 'icd10Code') {
          const found = ICD10_CODES.find((c) => c.code === value)
          return { ...d, icd10Code: value, description: found?.description ?? d.description }
        }
        return { ...d, [field]: value }
      }),
    }))
  }

  function addDiag() {
    setForm((prev) => ({
      ...prev,
      diagnoses: [
        ...prev.diagnoses,
        { uid: genUid(), icd10Code: '', description: '', type: 'Primary' },
      ],
    }))
  }

  function removeDiag(uid: string) {
    setForm((prev) => ({
      ...prev,
      diagnoses: prev.diagnoses.filter((d) => d.uid !== uid),
    }))
  }

  function updatePresc(uid: string, field: keyof PrescRow, value: string) {
    setForm((prev) => ({
      ...prev,
      prescriptions: prev.prescriptions.map((p) =>
        p.uid === uid ? { ...p, [field]: value } : p,
      ),
    }))
  }

  function addPresc() {
    setForm((prev) => ({
      ...prev,
      prescriptions: [
        ...prev.prescriptions,
        {
          uid: genUid(),
          medicationName: '',
          dosage: '',
          frequency: '',
          duration: '',
          route: 'Oral',
          notes: '',
        },
      ],
    }))
  }

  function removePresc(uid: string) {
    setForm((prev) => ({
      ...prev,
      prescriptions: prev.prescriptions.filter((p) => p.uid !== uid),
    }))
  }

  function validate(): boolean {
    const errs: Record<string, string> = {}
    if (!form.chiefComplaint.trim()) errs.chiefComplaint = 'Required'
    if (!form.subjectiveNotes.trim()) errs.subjectiveNotes = 'Required'
    if (!form.objectiveNotes.trim()) errs.objectiveNotes = 'Required'
    if (!form.bpSystolic) errs.bpSystolic = 'Required'
    if (!form.bpDiastolic) errs.bpDiastolic = 'Required'
    if (!form.heartRate) errs.heartRate = 'Required'
    if (!form.temperature) {
      errs.temperature = 'Required'
    } else {
      const t = parseFloat(form.temperature)
      if (t < 30 || t > 45) errs.temperature = 'Must be 30–45°C'
    }
    if (!form.respiratoryRate) errs.respiratoryRate = 'Required'
    if (!form.oxygenSaturation) {
      errs.oxygenSaturation = 'Required'
    } else {
      const s = parseFloat(form.oxygenSaturation)
      if (s < 70 || s > 100) errs.oxygenSaturation = 'Must be 70–100%'
    }
    if (!form.weight) errs.weight = 'Required'
    if (!form.height) errs.height = 'Required'
    if (form.diagnoses.length === 0 || !form.diagnoses[0].icd10Code) {
      errs.diagnoses = 'At least one diagnosis required'
    }
    if (!form.treatmentPlan.trim()) errs.treatmentPlan = 'Required'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSubmit() {
    if (!validate() || !student || !currentUser) return
    setSubmitting(true)
    await new Promise<void>((resolve) => setTimeout(resolve, 1000))

    const vitals: Vitals = {
      bloodPressureSystolic: parseInt(form.bpSystolic),
      bloodPressureDiastolic: parseInt(form.bpDiastolic),
      heartRate: parseInt(form.heartRate),
      temperature: parseFloat(form.temperature),
      respiratoryRate: parseInt(form.respiratoryRate),
      oxygenSaturation: parseFloat(form.oxygenSaturation),
      weight: parseFloat(form.weight),
      height: parseFloat(form.height),
    }
    const bmi = calcBmi(form.weight, form.height)
    if (bmi !== null) vitals.bmi = bmi

    const diagnoses: Diagnosis[] = form.diagnoses
      .filter((d) => d.icd10Code)
      .map((d, i) => ({
        id: `diag-${Date.now()}-${i}`,
        icd10Code: d.icd10Code,
        description: d.description,
        type: d.type,
      }))

    const prescriptions: Prescription[] = form.prescriptions
      .filter((p) => p.medicationName)
      .map((p, i) => ({
        id: `presc-${Date.now()}-${i}`,
        medicationName: p.medicationName,
        dosage: p.dosage,
        frequency: p.frequency,
        duration: p.duration,
        route: p.route,
        notes: p.notes || undefined,
      }))

    const encounter: Encounter = {
      id: `enc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      studentId: student.id,
      date: `${form.date}T${form.time}:00`,
      facility: form.facility,
      attendingStaffId: currentUser.id,
      attendingStaffName: currentUser.name,
      chiefComplaint: form.chiefComplaint,
      subjectiveNotes: form.subjectiveNotes,
      objectiveNotes: form.objectiveNotes,
      vitals,
      diagnoses,
      treatmentPlan: form.treatmentPlan,
      prescriptions,
      followUpRequired: form.followUpRequired,
      followUpDate: form.followUpRequired ? form.followUpDate : undefined,
      status: form.status,
    }

    create<Encounter>(StorageKey.ENCOUNTERS, encounter, { autoAudit: false })

    createAuditEntry({
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      action: 'CREATE_RECORD',
      resourceType: 'Student',
      resourceId: student.id,
      resourceDescription: `Created encounter for ${student.name}: ${form.chiefComplaint}`,
      status: 'Success',
    })

    toast('Encounter saved successfully', 'success')
    setSubmitting(false)
    navigate(`/staff/patient/${student.id}`)
  }

  const bmi = calcBmi(form.weight, form.height)
  const bmiInfo = bmi !== null ? bmiLabel(bmi) : null

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        {draftTime && (
          <span className="text-xs text-gray-400 flex items-center gap-1">
            <Save className="w-3 h-3" />
            Draft auto-saved at {formatDraftTime(draftTime)}
          </span>
        )}
      </div>

      <div className="max-w-screen-xl mx-auto p-4 sm:p-6 flex flex-col xl:flex-row gap-4 sm:gap-6">
        {/* Left sidebar (25%) */}
        {student && (
          <div className="w-full xl:w-[25%] shrink-0">
            <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5 xl:sticky xl:top-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold">
                  {student.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{student.name}</p>
                  {systemUser?.matricNumber && (
                    <p className="text-xs text-gray-500">{systemUser.matricNumber}</p>
                  )}
                </div>
              </div>
              <div className="space-y-1 text-xs mb-4">
                <div className="flex justify-between">
                  <span className="text-gray-500">Blood Group</span>
                  <span className="font-medium text-gray-900">{student.bloodGroup}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Genotype</span>
                  <span className="font-medium text-gray-900">{student.genotype}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Department</span>
                  <span className="font-medium text-gray-900">{student.department}</span>
                </div>
              </div>
              {student.allergies.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Allergies</p>
                  <div className="space-y-1">
                    {student.allergies.map((a) => (
                      <div
                        key={a.id}
                        className={`flex items-center gap-1 text-xs px-2 py-1 rounded border ${
                          a.severity === 'Life-threatening'
                            ? 'bg-red-50 border-red-300 text-red-700'
                            : 'bg-gray-50 border-gray-200 text-gray-700'
                        }`}
                      >
                        {a.severity === 'Life-threatening' && (
                          <AlertTriangle className="w-3 h-3 shrink-0" />
                        )}
                        {a.allergen}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Right form (75%) */}
        <div className="flex-1 space-y-6">
          <h1 className="text-xl font-bold text-gray-900">New Encounter</h1>

          {/* Section 1: Visit Info */}
          <section className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Visit Information</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Facility</label>
                <select
                  value={form.facility}
                  disabled={submitting}
                  onChange={(e) => setField('facility', e.target.value as Encounter['facility'])}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                >
                  {(['Amphi Clinic', 'BUTH', 'Radiology', 'Lab'] as const).map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Date</label>
                <input
                  type="date"
                  value={form.date}
                  disabled={submitting}
                  onChange={(e) => setField('date', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Time</label>
                <input
                  type="time"
                  value={form.time}
                  disabled={submitting}
                  onChange={(e) => setField('time', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">
                Chief Complaint <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={2}
                value={form.chiefComplaint}
                disabled={submitting}
                onChange={(e) => setField('chiefComplaint', e.target.value)}
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 resize-none ${errors.chiefComplaint ? 'border-red-400' : 'border-gray-200'}`}
                placeholder="Patient's primary complaint..."
              />
              {errors.chiefComplaint && (
                <p className="text-xs text-red-500 mt-1">{errors.chiefComplaint}</p>
              )}
            </div>
          </section>

          {/* Section 2: SOAP Notes */}
          <section className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">SOAP Notes</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">
                  Subjective <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={4}
                  value={form.subjectiveNotes}
                  disabled={submitting}
                  onChange={(e) => setField('subjectiveNotes', e.target.value)}
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 resize-none ${errors.subjectiveNotes ? 'border-red-400' : 'border-gray-200'}`}
                  placeholder="Patient's subjective complaints..."
                />
                {errors.subjectiveNotes && (
                  <p className="text-xs text-red-500 mt-1">{errors.subjectiveNotes}</p>
                )}
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">
                  Objective <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={4}
                  value={form.objectiveNotes}
                  disabled={submitting}
                  onChange={(e) => setField('objectiveNotes', e.target.value)}
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 resize-none ${errors.objectiveNotes ? 'border-red-400' : 'border-gray-200'}`}
                  placeholder="Clinical observations..."
                />
                {errors.objectiveNotes && (
                  <p className="text-xs text-red-500 mt-1">{errors.objectiveNotes}</p>
                )}
              </div>
            </div>
          </section>

          {/* Section 3: Vitals */}
          <section className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">
              Vitals <span className="text-red-500">*</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              {[
                { label: 'BP Systolic (mmHg)', key: 'bpSystolic' as const },
                { label: 'BP Diastolic (mmHg)', key: 'bpDiastolic' as const },
                { label: 'Heart Rate (bpm)', key: 'heartRate' as const },
                { label: 'Temperature (°C)', key: 'temperature' as const },
                { label: 'Respiratory Rate (br/min)', key: 'respiratoryRate' as const },
                { label: 'SpO₂ (%)', key: 'oxygenSaturation' as const },
                { label: 'Weight (kg)', key: 'weight' as const },
                { label: 'Height (cm)', key: 'height' as const },
              ].map(({ label, key }) => (
                <div key={key}>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">{label}</label>
                  <input
                    type="number"
                    step="0.1"
                    value={form[key]}
                    disabled={submitting}
                    onChange={(e) => setField(key, e.target.value)}
                    className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 ${errors[key] ? 'border-red-400' : 'border-gray-200'}`}
                  />
                  {errors[key] && <p className="text-xs text-red-500 mt-1">{errors[key]}</p>}
                </div>
              ))}
            </div>

            {/* BMI Display */}
            {bmi !== null && bmiInfo && (
              <div className="mt-4 inline-flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                <span className="text-xs text-gray-500">BMI:</span>
                <span className={`text-sm font-bold ${bmiInfo.color}`}>{bmi}</span>
                <span className={`text-xs font-medium ${bmiInfo.color}`}>— {bmiInfo.label}</span>
              </div>
            )}
          </section>

          {/* Section 4: Diagnoses */}
          <section className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-900">
                Diagnoses <span className="text-red-500">*</span>
              </h2>
              <button
                type="button"
                onClick={addDiag}
                disabled={submitting}
                className="flex items-center gap-1 px-3 py-1.5 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-medium transition-colors disabled:opacity-60"
              >
                <PlusCircle className="w-3 h-3" />
                Add Diagnosis
              </button>
            </div>
            {errors.diagnoses && <p className="text-xs text-red-500 mb-2">{errors.diagnoses}</p>}
            <div className="space-y-3">
              {form.diagnoses.map((diag) => (
                <div key={diag.uid} className="grid grid-cols-1 md:grid-cols-[180px_1fr_140px_auto] gap-2 md:gap-3 items-start">
                  <select
                    value={diag.icd10Code}
                    disabled={submitting}
                    onChange={(e) => updateDiag(diag.uid, 'icd10Code', e.target.value)}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                  >
                    <option value="">Select ICD-10</option>
                    {ICD10_CODES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.code}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={diag.description}
                    disabled={submitting}
                    onChange={(e) => updateDiag(diag.uid, 'description', e.target.value)}
                    placeholder="Description"
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                  />
                  <select
                    value={diag.type}
                    disabled={submitting}
                    onChange={(e) => updateDiag(diag.uid, 'type', e.target.value)}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                  >
                    {(['Primary', 'Secondary', 'Differential'] as const).map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  {form.diagnoses.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeDiag(diag.uid)}
                      disabled={submitting}
                      className="p-2 text-red-400 hover:text-red-600 disabled:opacity-60 justify-self-start md:justify-self-auto"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Section 5: Treatment Plan */}
          <section className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Treatment Plan</h2>
            <textarea
              rows={3}
              value={form.treatmentPlan}
              disabled={submitting}
              onChange={(e) => setField('treatmentPlan', e.target.value)}
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 resize-none mb-4 ${errors.treatmentPlan ? 'border-red-400' : 'border-gray-200'}`}
              placeholder="Treatment plan..."
            />
            {errors.treatmentPlan && (
              <p className="text-xs text-red-500 -mt-3 mb-3">{errors.treatmentPlan}</p>
            )}
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer mb-3">
              <input
                type="checkbox"
                checked={form.followUpRequired}
                disabled={submitting}
                onChange={(e) => setField('followUpRequired', e.target.checked)}
                className="rounded"
              />
              Follow-up required
            </label>
            {form.followUpRequired && (
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">
                  Follow-up Date
                </label>
                <input
                  type="date"
                  value={form.followUpDate}
                  disabled={submitting}
                  onChange={(e) => setField('followUpDate', e.target.value)}
                  className="w-full sm:w-auto border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                />
              </div>
            )}
            <div className="mt-4">
              <label className="text-xs font-medium text-gray-600 mb-1 block">
                Encounter Status
              </label>
              <select
                value={form.status}
                disabled={submitting}
                onChange={(e) => setField('status', e.target.value as Encounter['status'])}
                className="w-full sm:w-auto border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
              >
                {(['Active', 'Resolved', 'Referred'] as const).map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </section>

          {/* Section 6: Prescriptions */}
          <section className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-900">Prescriptions (Optional)</h2>
              <button
                type="button"
                onClick={addPresc}
                disabled={submitting}
                className="flex items-center gap-1 px-3 py-1.5 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-medium transition-colors disabled:opacity-60"
              >
                <PlusCircle className="w-3 h-3" />
                Add Prescription
              </button>
            </div>
            {form.prescriptions.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No prescriptions added</p>
            ) : (
              <div className="space-y-3">
                {form.prescriptions.map((p) => (
                  <div
                    key={p.uid}
                    className="grid grid-cols-1 md:grid-cols-6 gap-2 items-start border border-gray-100 rounded-lg p-3 bg-gray-50"
                  >
                    <input
                      type="text"
                      value={p.medicationName}
                      disabled={submitting}
                      onChange={(e) => updatePresc(p.uid, 'medicationName', e.target.value)}
                      placeholder="Medication"
                      className="md:col-span-2 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                    />
                    <input
                      type="text"
                      value={p.dosage}
                      disabled={submitting}
                      onChange={(e) => updatePresc(p.uid, 'dosage', e.target.value)}
                      placeholder="Dosage"
                      className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                    />
                    <input
                      type="text"
                      value={p.frequency}
                      disabled={submitting}
                      onChange={(e) => updatePresc(p.uid, 'frequency', e.target.value)}
                      placeholder="Frequency"
                      className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                    />
                    <input
                      type="text"
                      value={p.duration}
                      disabled={submitting}
                      onChange={(e) => updatePresc(p.uid, 'duration', e.target.value)}
                      placeholder="Duration"
                      className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                    />
                    <div className="flex gap-2 md:col-span-1">
                      <select
                        value={p.route}
                        disabled={submitting}
                        onChange={(e) =>
                          updatePresc(p.uid, 'route', e.target.value)
                        }
                        className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                      >
                        {(
                          [
                            'Oral',
                            'Topical',
                            'Intravenous',
                            'Intramuscular',
                            'Inhaled',
                          ] as const
                        ).map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => removePresc(p.uid)}
                        disabled={submitting}
                        className="p-1.5 text-red-400 hover:text-red-600 disabled:opacity-60"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Submit */}
          <div className="flex justify-stretch sm:justify-end pb-8">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {submitting ? 'Saving...' : 'Save Encounter'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
