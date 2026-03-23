import { useState } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import { ChevronDown, ChevronUp, User, Phone, Mail, Calendar, Droplets } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { SeverityBadge } from '../../components/shared';
import { StorageKey, getAll } from '../../services/storage';
import type { Encounter } from '../../types/types';

export default function StudentProfile() {
  const { currentUser, currentStudent } = useAuth();
  const [openEncounterId, setOpenEncounterId] = useState<string | null>(null);

  const encounters = currentStudent
    ? getAll<Encounter>(StorageKey.ENCOUNTERS)
        .filter((e) => e.studentId === currentStudent.id)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    : [];

  const encounterStatusColor: Record<Encounter['status'], string> = {
    Active: 'bg-blue-100 text-blue-800',
    Resolved: 'bg-green-100 text-green-800',
    Referred: 'bg-orange-100 text-orange-800',
  };

  return (
    <div className="max-w-lg mx-auto md:max-w-2xl space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-lg">
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
          <h1 className="text-lg font-bold text-gray-900">{currentUser?.name ?? 'Student'}</h1>
          {currentUser?.matricNumber && (
            <p className="text-sm text-gray-500">Matric: {currentUser.matricNumber}</p>
          )}
        </div>
      </div>

      <Tabs.Root defaultValue="personal">
        <Tabs.List className="flex bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <Tabs.Trigger
            value="personal"
            className="flex-1 py-2.5 text-sm font-medium border-b-2 bg-white transition-colors data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=inactive]:border-transparent data-[state=inactive]:text-gray-500 hover:text-gray-700"
          >
            Personal Info
          </Tabs.Trigger>
          <Tabs.Trigger
            value="allergies"
            className="flex-1 py-2.5 text-sm font-medium border-b-2 bg-white transition-colors data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=inactive]:border-transparent data-[state=inactive]:text-gray-500 hover:text-gray-700"
          >
            Allergies
          </Tabs.Trigger>
          <Tabs.Trigger
            value="history"
            className="flex-1 py-2.5 text-sm font-medium border-b-2 bg-white transition-colors data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=inactive]:border-transparent data-[state=inactive]:text-gray-500 hover:text-gray-700"
          >
            Visits
          </Tabs.Trigger>
        </Tabs.List>

        {/* ── Tab 1: Personal Info ── */}
        <Tabs.Content value="personal" className="mt-4 space-y-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Personal Details
            </h2>
            {(
              [
                { label: 'Full Name', value: currentStudent?.name ?? currentUser?.name, Icon: User },
                { label: 'Matric Number', value: currentUser?.matricNumber ?? '—', Icon: User },
                { label: 'Department', value: currentStudent?.department, Icon: User },
                { label: 'Level', value: currentStudent?.level, Icon: User },
                { label: 'Blood Group', value: currentStudent?.bloodGroup, Icon: Droplets },
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
                { label: 'Phone', value: currentStudent?.phoneNumber, Icon: Phone },
              ] as { label: string; value: string | undefined; Icon: React.ElementType }[]
            ).map(({ label, value, Icon }) => (
              <div key={label} className="flex items-center gap-3">
                <Icon className="w-4 h-4 text-gray-400 shrink-0" />
                <div className="flex-1 flex justify-between items-center pb-2 border-b border-gray-50">
                  <span className="text-xs text-gray-500">{label}</span>
                  <span className="text-sm font-medium text-gray-800">{value ?? '—'}</span>
                </div>
              </div>
            ))}
          </div>

          {currentStudent?.emergencyContact && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Emergency Contact
              </h2>
              {(
                [
                  { label: 'Name', value: currentStudent.emergencyContact.name },
                  { label: 'Relationship', value: currentStudent.emergencyContact.relationship },
                  { label: 'Phone', value: currentStudent.emergencyContact.phoneNumber },
                ] as { label: string; value: string }[]
              ).map(({ label, value }) => (
                <div
                  key={label}
                  className="flex justify-between items-center pb-2 border-b border-gray-50"
                >
                  <span className="text-xs text-gray-500">{label}</span>
                  <span className="text-sm font-medium text-gray-800">{value}</span>
                </div>
              ))}
            </div>
          )}
        </Tabs.Content>

        {/* ── Tab 2: Allergies & Conditions ── */}
        <Tabs.Content value="allergies" className="mt-4 space-y-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Allergies
            </h2>
            {currentStudent?.allergies.length ? (
              <div className="space-y-3">
                {currentStudent.allergies.map((allergy) => (
                  <div
                    key={allergy.id}
                    className="flex items-start justify-between gap-2 p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{allergy.allergen}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Reaction: {allergy.reaction}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
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
              <p className="text-sm text-gray-400 text-center py-6">No allergies recorded.</p>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Chronic Conditions
            </h2>
            {currentStudent?.chronicConditions.length ? (
              <div className="flex flex-wrap gap-2">
                {currentStudent.chronicConditions.map((condition) => (
                  <span
                    key={condition}
                    className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-800 border border-blue-100"
                  >
                    {condition}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-4">
                No chronic conditions on file.
              </p>
            )}
          </div>
        </Tabs.Content>

        {/* ── Tab 3: Visit History ── */}
        <Tabs.Content value="history" className="mt-4">
          {encounters.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center">
              <p className="text-sm text-gray-400">No visits recorded yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {encounters.map((enc) => {
                const isOpen = openEncounterId === enc.id;
                return (
                  <div
                    key={enc.id}
                    className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenEncounterId(isOpen ? null : enc.id)}
                      className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-800">
                          {enc.chiefComplaint}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {new Date(enc.date).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}{' '}
                          · {enc.facility}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded-full ${encounterStatusColor[enc.status]}`}
                        >
                          {enc.status}
                        </span>
                        {isOpen ? (
                          <ChevronUp className="w-4 h-4 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                    </button>

                    {isOpen && (
                      <div className="px-4 pb-4 space-y-3 border-t border-gray-100">
                        {enc.diagnoses.length > 0 && (
                          <div className="mt-3">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                              Diagnoses
                            </p>
                            <ul className="space-y-1">
                              {enc.diagnoses.map((d) => (
                                <li key={d.id} className="flex items-start gap-2">
                                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                                  <span className="text-sm text-gray-700">{d.description}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {enc.prescriptions.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                              Prescriptions
                            </p>
                            <div className="space-y-2">
                              {enc.prescriptions.map((rx) => (
                                <div key={rx.id} className="bg-blue-50 rounded-lg px-3 py-2">
                                  <p className="text-sm font-medium text-blue-900">
                                    {rx.medicationName} {rx.dosage}
                                  </p>
                                  <p className="text-xs text-blue-700 mt-0.5">
                                    {rx.frequency} · {rx.duration}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        <p className="text-xs text-gray-400">Dr. {enc.attendingStaffName}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Tabs.Content>
      </Tabs.Root>
    </div>
  );
}
