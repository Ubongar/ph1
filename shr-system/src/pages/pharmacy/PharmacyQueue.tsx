import { useState, useCallback } from 'react';
import { List, LayoutGrid, Download } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getAll, update, createAuditEntry, StorageKey } from '../../services/storage';
import type { MedicationRequisition, Student } from '../../types/types';
import { useToast } from '../../components/shared/Toast';
import { useSimulatedPolling } from '../../hooks/useSimulatedPolling';
import { ConfirmDialog } from '../../components/shared/ConfirmDialog';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { PageHeader } from '../../components/shared/PageHeader';

function getStudentName(studentId: string, students: Student[]): string {
  return students.find(s => s.id === studentId)?.name ?? studentId;
}

function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

export default function PharmacyQueue() {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [view, setView] = useState<'kanban' | 'list'>('kanban');
  const [searchQuery, setSearchQuery] = useState('');
  const [dispenseTarget, setDispenseTarget] = useState<MedicationRequisition | null>(null);

  const loadData = useCallback(() => {
    return {
      requisitions: getAll<MedicationRequisition>(StorageKey.REQUISITIONS),
      students: getAll<Student>(StorageKey.STUDENTS),
    };
  }, []);

  const [data, setData] = useState(loadData);
  useSimulatedPolling(15000, () => setData(loadData()));

  const { requisitions, students } = data;
  const now = Date.now();
  const oneDayAgo = now - 24 * 60 * 60 * 1000;

  const toPrepare = requisitions.filter(r => r.status === 'Approved')
    .sort((a, b) => (a.priority === 'Urgent' ? -1 : 1) - (b.priority === 'Urgent' ? -1 : 1));
  const readyForPickup = requisitions.filter(r => r.status === 'Ready for Pickup')
    .sort((a, b) => (a.priority === 'Urgent' ? -1 : 1) - (b.priority === 'Urgent' ? -1 : 1));
  const dispensedToday = requisitions.filter(r => r.status === 'Dispensed' && r.dispensedAt && new Date(r.dispensedAt).getTime() >= oneDayAgo);

  const markReady = (req: MedicationRequisition) => {
    update<MedicationRequisition>(
      StorageKey.REQUISITIONS,
      req.id,
      { status: 'Ready for Pickup' },
      { autoAudit: false },
    );
    createAuditEntry({ userId: currentUser!.id, userName: currentUser!.name, userRole: currentUser!.role,
      action: 'DISPENSE_MEDICATION', resourceType: 'Requisition', resourceId: req.id,
      resourceDescription: `Marked ready for pickup: ${getStudentName(req.studentId, students)}`,
      status: 'Success' });
    toast('Marked as Ready for Pickup', 'success');
    setData(loadData());
  };

  const confirmDispense = () => {
    if (!dispenseTarget || !currentUser) return;
    update<MedicationRequisition>(
      StorageKey.REQUISITIONS,
      dispenseTarget.id,
      { status: 'Dispensed', dispensedAt: new Date().toISOString() },
      { autoAudit: false },
    );
    createAuditEntry({ userId: currentUser.id, userName: currentUser.name, userRole: currentUser.role,
      action: 'DISPENSE_MEDICATION', resourceType: 'Requisition', resourceId: dispenseTarget.id,
      resourceDescription: `Dispensed to: ${getStudentName(dispenseTarget.studentId, students)}`,
      status: 'Success' });
    toast('Medication dispensed', 'success');
    setDispenseTarget(null);
    setData(loadData());
  };

  const Card = ({ req }: { req: MedicationRequisition }) => {
    const name = getStudentName(req.studentId, students);
    const isUrgent = req.priority === 'Urgent';
    return (
      <div className={`bg-white rounded-lg border ${isUrgent ? 'border-t-4 border-yellow-400 animate-pulse' : 'border-gray-200'} p-4 shadow-sm`}>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold">{getInitials(name)}</div>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm truncate">{name}</div>
          </div>
          {isUrgent && <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs rounded-full font-medium">Urgent</span>}
        </div>
        <div className="text-xs text-gray-600 mb-1">
          {req.approvedMedications?.map(m => `${m.name} ${m.dosage}`).join(', ') ?? req.requestedMedications.join(', ')}
        </div>
        {req.reviewedByStaffName && <div className="text-xs text-gray-400">Dr. {req.reviewedByStaffName} • {new Date(req.reviewedAt ?? '').toLocaleDateString()}</div>}
      </div>
    );
  };

  const filteredAll = requisitions.filter(r => {
    const name = getStudentName(r.studentId, students).toLowerCase();
    return name.includes(searchQuery.toLowerCase());
  });

  return (
    <div className="p-6">
      <PageHeader title="Pharmacy Queue"
        actions={
          <div className="flex gap-2">
            <button onClick={() => setView('kanban')} className={`p-2 rounded-lg ${view === 'kanban' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}><LayoutGrid className="w-4 h-4" /></button>
            <button onClick={() => setView('list')} className={`p-2 rounded-lg ${view === 'list' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}><List className="w-4 h-4" /></button>
          </div>
        }
      />
      {view === 'kanban' ? (
        <div className="grid grid-cols-3 gap-6">
          <div className="bg-gray-50 rounded-xl p-4">
            <h3 className="font-semibold text-gray-700 mb-3">To Prepare <span className="ml-1 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{toPrepare.length}</span></h3>
            <div className="space-y-3">
              {toPrepare.map(req => (
                <div key={req.id}>
                  <Card req={req} />
                  <button onClick={() => markReady(req)} className="mt-2 w-full text-xs py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors">Mark Ready for Pickup</button>
                </div>
              ))}
              {toPrepare.length === 0 && <div className="text-sm text-gray-400 text-center py-8">No items</div>}
            </div>
          </div>
          <div className="bg-gray-50 rounded-xl p-4">
            <h3 className="font-semibold text-gray-700 mb-3">Ready for Pickup <span className="ml-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{readyForPickup.length}</span></h3>
            <div className="space-y-3">
              {readyForPickup.map(req => (
                <div key={req.id}>
                  <Card req={req} />
                  <button onClick={() => setDispenseTarget(req)} className="mt-2 w-full text-xs py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">Confirm Dispensed</button>
                </div>
              ))}
              {readyForPickup.length === 0 && <div className="text-sm text-gray-400 text-center py-8">No items</div>}
            </div>
          </div>
          <div className="bg-gray-50 rounded-xl p-4">
            <h3 className="font-semibold text-gray-700 mb-3">Dispensed Today <span className="ml-1 text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">{dispensedToday.length}</span></h3>
            <div className="space-y-3">
              {dispensedToday.map(req => <Card key={req.id} req={req} />)}
              {dispensedToday.length === 0 && <div className="text-sm text-gray-400 text-center py-8">No items</div>}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-4 border-b flex items-center gap-4">
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search by student name..."
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <button onClick={() => toast('Queue exported (simulated)', 'info')} className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm">
              <Download className="w-4 h-4" /> Export Queue
            </button>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
              <tr>
                {['Student','Priority','Medications','Date','Doctor','Status','Actions'].map(h => <th key={h} className="px-4 py-3 text-left">{h}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredAll.map(req => (
                <tr key={req.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{getStudentName(req.studentId, students)}</td>
                  <td className="px-4 py-3">{req.priority === 'Urgent' ? <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs rounded-full">Urgent</span> : <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">Normal</span>}</td>
                  <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{req.approvedMedications?.map(m => m.name).join(', ') ?? req.requestedMedications.join(', ')}</td>
                  <td className="px-4 py-3 text-gray-500">{new Date(req.submittedAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-gray-600">{req.reviewedByStaffName ?? '—'}</td>
                  <td className="px-4 py-3"><StatusBadge status={req.status} /></td>
                  <td className="px-4 py-3">
                    {req.status === 'Approved' && <button onClick={() => markReady(req)} className="text-xs text-green-600 hover:underline">Mark Ready</button>}
                    {req.status === 'Ready for Pickup' && <button onClick={() => setDispenseTarget(req)} className="text-xs text-blue-600 hover:underline">Dispense</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <ConfirmDialog
        isOpen={dispenseTarget !== null}
        title="Confirm Dispensing"
        message="Please verify student ID before dispensing medication."
        confirmLabel="Confirm Dispensed"
        confirmVariant="primary"
        onConfirm={confirmDispense}
        onCancel={() => setDispenseTarget(null)}
      />
    </div>
  );
}
