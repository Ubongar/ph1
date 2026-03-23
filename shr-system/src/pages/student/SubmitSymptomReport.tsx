import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle, ChevronRight, ClipboardList } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/shared';
import {
  StorageKey,
  create,
  createAuditEntry,
  getRequisitionsByStudentId,
} from '../../services/storage';
import type { MedicationRequisition } from '../../types/types';

const SYMPTOM_OPTIONS = [
  'Headache',
  'Mild Body Pain/Cramps',
  'Runny Nose',
  'Cough (mild)',
  'Sore Throat',
  'Menstrual Cramps',
  'Mild Fever',
  'Eye Irritation',
  'Mild Stomach Ache',
  'Fatigue',
];

const OTC_MEDICATIONS = [
  'Paracetamol 500mg',
  'Ibuprofen 400mg',
  'Loratadine 10mg',
  'Omeprazole 20mg',
  'Vitamin C 500mg',
  'Multivitamin',
  'ORS',
  'Chlorphenamine',
];

const STEPS = ['Symptoms', 'Medications', 'Review & Submit'];
const MAX_DESC_LENGTH = 500;

const SIMULATED_SUBMISSION_DELAY_MS = 1200; // Intentional UX delay for demo purposes

export default function SubmitSymptomReport() {
  const { currentUser, currentStudent } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Check for existing active requisition
  const existingActive = currentStudent
    ? getRequisitionsByStudentId(currentStudent.id).find(
        (r) => r.status === 'Pending Review' || r.status === 'Approved',
      )
    : null;

  const [step, setStep] = useState(1);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<'Mild' | 'Moderate'>('Mild');
  const [selectedMeds, setSelectedMeds] = useState<string[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const toggleSymptom = (symptom: string) => {
    setSelectedSymptoms((prev) =>
      prev.includes(symptom) ? prev.filter((s) => s !== symptom) : [...prev, symptom],
    );
  };

  const toggleMed = (med: string) => {
    setSelectedMeds((prev) =>
      prev.includes(med) ? prev.filter((m) => m !== med) : [...prev, med],
    );
  };

  const handleSubmit = async () => {
    if (!currentStudent || !currentUser) return;
    setSubmitting(true);
    await new Promise<void>((resolve) => setTimeout(resolve, SIMULATED_SUBMISSION_DELAY_MS));

    const newReq: MedicationRequisition = {
      id: `req-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      studentId: currentStudent.id,
      studentName: currentStudent.name,
      submittedAt: new Date().toISOString(),
      symptoms: selectedSymptoms,
      symptomDescription: description,
      severity,
      requestedMedications: selectedMeds,
      status: 'Pending Review',
      priority: 'Normal',
    };

    create<MedicationRequisition>(StorageKey.REQUISITIONS, newReq, { autoAudit: false });

    createAuditEntry({
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      action: 'CREATE_RECORD',
      resourceType: 'Requisition',
      resourceId: newReq.id,
      resourceDescription: `Student ${currentStudent.name} submitted a medication requisition`,
      status: 'Success',
    });

    setSubmitting(false);
    setSubmitted(true);
    toast('Requisition submitted successfully!', 'success');
  };

  // ── Blocking banner ──
  if (existingActive) {
    return (
      <div className="max-w-lg mx-auto md:max-w-2xl">
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-5 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-yellow-800">
              You already have an active request.
            </p>
            <p className="text-xs text-yellow-700 mt-1">
              Please wait for your current request to be resolved before submitting a new one.
            </p>
            <button
              type="button"
              onClick={() => navigate('/student/my-requisitions')}
              className="mt-3 inline-flex items-center gap-1 text-sm text-blue-600 font-medium hover:underline"
            >
              Track it here <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Success screen ──
  if (submitted) {
    return (
      <div className="max-w-lg mx-auto md:max-w-2xl">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 flex flex-col items-center text-center gap-4">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Request Submitted!</h2>
            <p className="text-sm text-gray-500 mt-1">
              Your medication requisition has been submitted and is pending review by the medical
              staff.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/student/my-requisitions')}
            className="w-full max-w-xs py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <ClipboardList className="w-4 h-4" />
            Track My Request
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto md:max-w-2xl space-y-4">
      {/* Step Indicators */}
      <div className="flex items-center gap-0">
        {STEPS.map((label, idx) => {
          const stepNum = idx + 1;
          const done = step > stepNum;
          const current = step === stepNum;
          const isLast = idx === STEPS.length - 1;
          return (
            <div key={label} className="flex items-center flex-1">
              <div className="flex flex-col items-center gap-1 shrink-0">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
                  ${done ? 'bg-blue-500 text-white' : current ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}
                >
                  {done ? '✓' : stepNum}
                </div>
                <span
                  className={`text-[10px] font-medium text-center leading-tight
                  ${current ? 'text-blue-600' : 'text-gray-400'}`}
                >
                  {label}
                </span>
              </div>
              {!isLast && (
                <div className={`flex-1 h-0.5 mb-4 mx-1 ${done ? 'bg-blue-500' : 'bg-gray-200'}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* ── Step 1: Symptoms ── */}
      {step === 1 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-4">
          <h2 className="text-base font-semibold text-gray-800">Select Your Symptoms</h2>
          <div className="flex flex-wrap gap-2">
            {SYMPTOM_OPTIONS.map((symptom) => {
              const selected = selectedSymptoms.includes(symptom);
              return (
                <button
                  key={symptom}
                  type="button"
                  onClick={() => toggleSymptom(symptom)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all
                    ${selected
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                    }`}
                >
                  {symptom}
                </button>
              );
            })}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Additional Description
            </label>
            <textarea
              value={description}
              onChange={(e) => {
                if (e.target.value.length <= MAX_DESC_LENGTH) setDescription(e.target.value);
              }}
              rows={3}
              placeholder="Describe your symptoms in more detail…"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
            <p className="text-xs text-gray-400 mt-1 text-right">
              {description.length}/{MAX_DESC_LENGTH} characters
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Severity</label>
            <div className="flex gap-3">
              {(['Mild', 'Moderate'] as const).map((level) => (
                <label
                  key={level}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-all
                    ${severity === level
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-600 hover:border-blue-200'
                    }`}
                >
                  <input
                    type="radio"
                    name="severity"
                    value={level}
                    checked={severity === level}
                    onChange={() => setSeverity(level)}
                    className="accent-blue-600"
                  />
                  <span className="text-sm font-medium">{level}</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              For severe symptoms, please visit the clinic directly.
            </p>
          </div>

          <button
            type="button"
            disabled={selectedSymptoms.length === 0}
            onClick={() => setStep(2)}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors"
          >
            Next: Select Medications
          </button>
        </div>
      )}

      {/* ── Step 2: Medications ── */}
      {step === 2 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-4">
          <h2 className="text-base font-semibold text-gray-800">Select OTC Medications</h2>
          <p className="text-xs text-gray-500">
            Select the over-the-counter medications you'd like to request.
          </p>
          <div className="space-y-2">
            {OTC_MEDICATIONS.map((med) => {
              const checked = selectedMeds.includes(med);
              return (
                <label
                  key={med}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-all
                    ${checked
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-200'
                    }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleMed(med)}
                    className="accent-blue-600 w-4 h-4"
                  />
                  <span className="text-sm font-medium text-gray-800">{med}</span>
                </label>
              );
            })}
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex-1 py-3 border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-colors"
            >
              Back
            </button>
            <button
              type="button"
              disabled={selectedMeds.length === 0}
              onClick={() => setStep(3)}
              className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors"
            >
              Next: Review
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: Review & Submit ── */}
      {step === 3 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-4">
          <h2 className="text-base font-semibold text-gray-800">Review & Submit</h2>

          <div className="bg-gray-50 rounded-lg p-3 space-y-3">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                Symptoms
              </p>
              <div className="flex flex-wrap gap-1.5">
                {selectedSymptoms.map((s) => (
                  <span
                    key={s}
                    className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
            {description && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  Description
                </p>
                <p className="text-sm text-gray-700">{description}</p>
              </div>
            )}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                Severity
              </p>
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  severity === 'Mild'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}
              >
                {severity}
              </span>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                Requested Medications
              </p>
              <div className="flex flex-wrap gap-1.5">
                {selectedMeds.map((m) => (
                  <span
                    key={m}
                    className="px-2 py-0.5 bg-purple-100 text-purple-800 text-xs rounded-full"
                  >
                    {m}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Disclaimer */}
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-0.5 accent-blue-600 w-4 h-4 shrink-0"
            />
            <span className="text-xs text-gray-600">
              I confirm that the information provided is accurate and that I understand these
              medications are for mild/moderate symptoms only.
            </span>
          </label>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="flex-1 py-3 border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-colors"
            >
              Back
            </button>
            <button
              type="button"
              disabled={!confirmed || submitting}
              onClick={handleSubmit}
              className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors"
            >
              {submitting ? 'Submitting…' : 'Submit Request'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
