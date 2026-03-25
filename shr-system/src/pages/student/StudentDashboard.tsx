import { Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle, ClipboardList, FileText, Heart, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/shared';
import { StorageKey, getAll, getRequisitionsByStudentId } from '../../services/storage';
import type { Encounter, MedicationRequisition } from '../../types/types';
import { getHospitalNumber } from '../../utils/studentIdentifiers';

const HEALTH_TIPS = [
  'Drink 8 glasses of water daily to stay hydrated.',
  'Get 7–8 hours of sleep every night for better focus and health.',
  'Wash hands regularly for at least 20 seconds to prevent illness.',
  'Exercise at least 30 minutes daily for a healthy heart.',
  'Eat balanced meals with fruits and vegetables every day.',
];

const AMBULANCE_CONTACTS = [
  { label: 'Campus Ambulance', phone: '+2348000000011' },
  { label: 'BUTH Emergency Line', phone: '+2348000000012' },
];

const REQUISITION_STEPS: string[] = [
  'Submitted',
  'Under Review',
  'Approved',
  'Ready for Pickup',
  'Dispensed',
];

function getStepIndex(status: MedicationRequisition['status']): number {
  switch (status) {
    case 'Pending Review': return 1;
    case 'Approved': return 2;
    case 'Ready for Pickup': return 3;
    case 'Dispensed': return 4;
    default: return 0;
  }
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function StudentDashboard() {
  const { currentUser, currentStudent } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const encounters = currentStudent
    ? getAll<Encounter>(StorageKey.ENCOUNTERS).filter((e) => e.studentId === currentStudent.id)
    : [];

  const requisitions = currentStudent ? getRequisitionsByStudentId(currentStudent.id) : [];

  const activeRequisition = requisitions.find(
    (r) => r.status === 'Pending Review' || r.status === 'Approved',
  );

  const lastEncounter = [...encounters].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  )[0];

  const criticalAllergy = currentStudent?.allergies.find(
    (a) => a.severity === 'Life-threatening',
  );

  const hospitalNumber = currentStudent
    ? getHospitalNumber(currentUser?.matricNumber, currentStudent.id)
    : '—';

  const tip = HEALTH_TIPS[new Date().getDay() % HEALTH_TIPS.length];
  const initials = currentUser
    ? currentUser.name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : '??';

  const quickActions = [
    { label: 'Submit Report', Icon: FileText, path: '/student/submit-symptom', color: 'text-blue-600 bg-blue-50' },
    { label: 'Track Requests', Icon: ClipboardList, path: '/student/my-requisitions', color: 'text-purple-600 bg-purple-50' },
    { label: 'My Profile', Icon: User, path: '/student/profile', color: 'text-green-600 bg-green-50' },
    { label: 'Health Tips', Icon: Heart, path: null as string | null, color: 'text-pink-600 bg-pink-50' },
  ];

  return (
    <div className="space-y-4 max-w-lg mx-auto md:max-w-2xl">
      {/* Greeting Card */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-500 rounded-2xl p-5 text-white flex items-center gap-4 shadow-md">
        <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center text-xl font-bold shrink-0">
          {initials}
        </div>
        <div>
          <p className="text-sm text-blue-100">{getGreeting()},</p>
          <h1 className="text-lg font-bold">{currentUser?.name ?? 'Student'}</h1>
          {currentStudent && (
            <>
              <p className="text-xs text-blue-200 mt-0.5">
                {currentStudent.department} · Level {currentStudent.level}
              </p>
              <p className="text-xs text-blue-100 mt-0.5">Hospital No: {hospitalNumber}</p>
            </>
          )}
        </div>
      </div>

      {/* Allergy Alert Banner */}
      {criticalAllergy ? (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
          <p className="text-sm text-red-800 font-medium">
            ⚠️ Life-threatening allergy on file:{' '}
            <span className="font-bold">{criticalAllergy.allergen}</span>
          </p>
        </div>
      ) : (
        <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
          <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
          <p className="text-sm text-green-800 font-medium">✓ No critical allergies on file</p>
        </div>
      )}

      {/* Quick Actions 2×2 grid */}
      <div>
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {quickActions.map(({ label, Icon, path, color }) => (
            <button
              key={label}
              type="button"
              onClick={() => {
                if (path) {
                  navigate(path);
                } else {
                  toast("Stay healthy! Check today's health tip at the bottom.", 'info');
                }
              }}
              className="flex flex-col items-center justify-center gap-2 bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md active:scale-95 transition-all"
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-xs font-medium text-gray-700">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Active Requisition Card */}
      {activeRequisition && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-800">Active Request</h2>
            <span className="text-xs text-gray-400">
              {new Date(activeRequisition.submittedAt).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
              })}
            </span>
          </div>
          {/* 5-step progress stepper */}
          <div className="flex items-start">
            {REQUISITION_STEPS.map((step, idx) => {
              const activeIdx = getStepIndex(activeRequisition.status);
              const done = idx < activeIdx;
              const current = idx === activeIdx;
              const isLast = idx === REQUISITION_STEPS.length - 1;
              return (
                <Fragment key={step}>
                  <div className="flex flex-col items-center gap-1">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0
                        ${done ? 'bg-blue-500 text-white' : current ? 'bg-blue-600 text-white ring-2 ring-blue-200' : 'bg-gray-100 text-gray-400'}`}
                    >
                      {done ? '✓' : idx + 1}
                    </div>
                    <span
                      className={`text-center leading-tight text-[9px] max-w-[42px]
                        ${current ? 'text-blue-600 font-semibold' : 'text-gray-400'}`}
                    >
                      {step}
                    </span>
                  </div>
                  {!isLast && (
                    <div
                      className={`flex-1 h-0.5 mt-3 mx-0.5 ${done ? 'bg-blue-500' : 'bg-gray-200'}`}
                    />
                  )}
                </Fragment>
              );
            })}
          </div>
          {activeRequisition.symptoms.length > 0 && (
            <p className="text-xs text-gray-500 mt-3">
              <span className="font-medium">Symptoms:</span>{' '}
              {activeRequisition.symptoms.slice(0, 3).join(', ')}
              {activeRequisition.symptoms.length > 3 &&
                ` +${activeRequisition.symptoms.length - 3} more`}
            </p>
          )}
          <button
            type="button"
            onClick={() => navigate('/student/my-requisitions')}
            className="mt-3 text-xs text-blue-600 font-medium hover:underline"
          >
            View details →
          </button>
        </div>
      )}

      {/* Recent Visit Summary */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <h2 className="text-sm font-semibold text-gray-800 mb-2">Last Visit</h2>
        {lastEncounter ? (
          <>
            <p className="text-xs text-gray-500">
              {new Date(lastEncounter.date).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}{' '}
              · {lastEncounter.facility}
            </p>
            <p className="text-sm text-gray-700 mt-1 font-medium">{lastEncounter.chiefComplaint}</p>
            <p className="text-xs text-gray-400 mt-1">Dr. {lastEncounter.attendingStaffName}</p>
          </>
        ) : (
          <p className="text-sm text-gray-400">No visits recorded yet.</p>
        )}
      </div>

      {/* Health Tip Card */}
      <div className="bg-gradient-to-r from-teal-50 to-green-50 border border-teal-100 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Heart className="w-5 h-5 text-teal-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-semibold text-teal-700 uppercase tracking-wide mb-1">
              Health Tip of the Day
            </p>
            <p className="text-sm text-teal-800">{tip}</p>
          </div>
        </div>
      </div>

      {/* Emergency Ambulance Contacts */}
      <div className="bg-red-50 border border-red-200 rounded-xl p-4">
        <p className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-2">
          Emergency Ambulance
        </p>
        <div className="space-y-2">
          {AMBULANCE_CONTACTS.map((contact) => (
            <a
              key={contact.phone}
              href={`tel:${contact.phone}`}
              className="flex items-center justify-between px-3 py-2 rounded-lg bg-white border border-red-100 text-sm hover:bg-red-100 transition-colors"
            >
              <span className="text-gray-700">{contact.label}</span>
              <span className="font-semibold text-red-700">{contact.phone}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
