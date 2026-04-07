import { Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, Phone } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { StatusBadge } from '../../components/shared';
import { getRequisitionsByStudentId } from '../../services/storage';
import type { MedicationRequisition } from '../../types/types';

const STEPS: string[] = ['Submitted', 'Under Review', 'Approved', 'Ready for Pickup', 'Dispensed'];

function getStepIndex(status: MedicationRequisition['status']): number {
  switch (status) {
    case 'Pending Review': return 1;
    case 'Approved': return 2;
    case 'Ready for Pickup': return 3;
    case 'Dispensed': return 4;
    default: return 0;
  }
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

interface StepperProps {
  status: MedicationRequisition['status'];
}

function RequisitionStepper({ status }: StepperProps) {
  const activeIdx = getStepIndex(status);
  return (
    <>
      {/* Horizontal stepper (md+) */}
      <div className="hidden md:flex items-start">
        {STEPS.map((step, idx) => {
          const done = idx < activeIdx;
          const current = idx === activeIdx;
          const isLast = idx === STEPS.length - 1;
          return (
            <Fragment key={step}>
              <div className="flex flex-col items-center gap-1">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0
                    ${done ? 'bg-blue-500 text-white' : current ? 'bg-blue-600 text-white ring-2 ring-blue-200' : 'bg-gray-100 text-gray-400'}`}
                >
                  {done ? '✓' : idx + 1}
                </div>
                <span
                  className={`text-[10px] text-center max-w-[52px] leading-tight
                    ${current ? 'text-blue-600 font-semibold' : 'text-gray-400'}`}
                >
                  {step}
                </span>
              </div>
              {!isLast && (
                <div
                  className={`flex-1 h-0.5 mt-3.5 mx-1 ${done ? 'bg-blue-500' : 'bg-gray-200'}`}
                />
              )}
            </Fragment>
          );
        })}
      </div>

      {/* Vertical stepper (mobile) */}
      <div className="flex md:hidden flex-col gap-0">
        {STEPS.map((step, idx) => {
          const done = idx < activeIdx;
          const current = idx === activeIdx;
          const isLast = idx === STEPS.length - 1;
          return (
            <div key={step} className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0
                    ${done ? 'bg-blue-500 text-white' : current ? 'bg-blue-600 text-white ring-2 ring-blue-200' : 'bg-gray-100 text-gray-400'}`}
                >
                  {done ? '✓' : idx + 1}
                </div>
                {!isLast && <div className={`w-0.5 h-5 ${done ? 'bg-blue-500' : 'bg-gray-200'}`} />}
              </div>
              <span
                className={`text-sm leading-none mt-1 pb-5
                  ${current ? 'text-blue-600 font-semibold' : 'text-gray-400'}`}
              >
                {step}
              </span>
            </div>
          );
        })}
      </div>
    </>
  );
}

export default function RequisitionTracking() {
  const { currentStudent } = useAuth();
  const navigate = useNavigate();

  const requisitions = currentStudent
    ? getRequisitionsByStudentId(currentStudent.id).sort(
        (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime(),
      )
    : [];

  if (requisitions.length === 0) {
    return (
      <div className="max-w-lg mx-auto md:max-w-2xl">
        <h1 className="text-lg font-bold text-gray-900 mb-4">My Requisitions</h1>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10 flex flex-col items-center text-center gap-3">
          <ClipboardList className="w-10 h-10 text-gray-300" />
          <p className="text-sm font-semibold text-gray-500">No requisitions yet</p>
          <p className="text-xs text-gray-400">
            Submit a symptom report to request OTC medications.
          </p>
          <button
            type="button"
            onClick={() => navigate('/student/submit-symptom')}
            className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Submit a Report
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg mx-auto md:max-w-2xl space-y-4">
      <h1 className="text-lg font-bold text-gray-900">My Requisitions</h1>

      {requisitions.map((req) => (
        <div key={req.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-4">
          {/* Header row */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs text-gray-500">{formatDateTime(req.submittedAt)}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
              {req.priority === 'Urgent' && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 border border-orange-200">
                  Urgent
                </span>
              )}
              <StatusBadge status={req.status} />
            </div>
          </div>

          {/* Symptom tags */}
          {req.symptoms.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {req.symptoms.map((s) => (
                <span
                  key={s}
                  className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded-full"
                >
                  {s}
                </span>
              ))}
            </div>
          )}

          {/* Progress stepper */}
          {req.status !== 'Rejected' && req.status !== 'Cancelled' && (
            <RequisitionStepper status={req.status} />
          )}

          {/* Status-based conditional sections */}
          {req.status === 'Pending Review' && (
            <div className="flex items-start gap-2 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2.5">
              <span className="text-yellow-600 text-sm">⏳</span>
              <p className="text-sm text-yellow-800">Your request is being reviewed.</p>
            </div>
          )}

          {req.status === 'Approved' && req.approvedMedications && req.approvedMedications.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-2">
                Approved Medications
              </p>
              <div className="space-y-2">
                {req.approvedMedications.map((med) => (
                  <div key={med.name} className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-2">
                    <div>
                      <p className="text-sm font-medium text-green-900">{med.name} {med.dosage}</p>
                      <p className="text-xs text-green-700">
                        {med.frequency} · {med.duration}
                      </p>
                    </div>
                      <span className="text-xs text-green-600 sm:shrink-0">Qty: {med.quantity}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {req.status === 'Rejected' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-2">
              <p className="text-xs font-semibold text-red-700 uppercase tracking-wide">
                Request Rejected
              </p>
              {req.doctorNotes && (
                <p className="text-sm text-red-800">{req.doctorNotes}</p>
              )}
              <a
                href="tel:+2348000000000"
                className="inline-flex items-center gap-2 mt-1 px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <Phone className="w-4 h-4" />
                Call Clinic
              </a>
            </div>
          )}

          {req.status === 'Ready for Pickup' && (
            <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2.5 flex items-center gap-2">
              <span className="text-green-600 text-sm">🏥</span>
              <p className="text-sm font-medium text-green-800">
                Visit Pharmacy with your student ID
              </p>
            </div>
          )}

          {req.status === 'Dispensed' && req.dispensedAt && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5">
              <p className="text-xs text-gray-500">
                Dispensed on {formatDateTime(req.dispensedAt)}
              </p>
              {req.pharmacyNotes && (
                <p className="text-sm text-gray-700 mt-1">{req.pharmacyNotes}</p>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
