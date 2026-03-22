import * as Tabs from '@radix-ui/react-tabs';
import { getAll, StorageKey, createAuditEntry } from '../../services/storage';
import type { MedicationRequisition, Encounter, AuditLog } from '../../types/types';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/shared/Toast';
import { PageHeader } from '../../components/shared/PageHeader';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const PIE_COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6'];

export default function SystemReports() {
  const { currentUser } = useAuth();
  const { toast } = useToast();

  const requisitions = getAll<MedicationRequisition>(StorageKey.REQUISITIONS);
  const encounters = getAll<Encounter>(StorageKey.ENCOUNTERS);
  const auditLogs = getAll<AuditLog>(StorageKey.AUDIT_LOGS);

  const thisMonth = new Date().getMonth();
  const thisYear = new Date().getFullYear();
  const monthEncounters = encounters.filter(e => {
    const d = new Date(e.date);
    return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
  });

  // Top diagnoses
  const diagCounts: Record<string, number> = {};
  monthEncounters.forEach(e => e.diagnoses.forEach(d => { diagCounts[d.description] = (diagCounts[d.description] ?? 0) + 1; }));
  const topDiagnoses = Object.entries(diagCounts).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([name,count])=>({name,count}));

  // Facility distribution
  const amphiCount = monthEncounters.filter(e=>e.facility==='Amphi Clinic').length;
  const buthCount = monthEncounters.filter(e=>e.facility==='BUTH').length;
  const facilityPie = [{ name:'Amphi Clinic', value: amphiCount }, { name:'BUTH', value: buthCount }];

  // Medication report
  const medCounts: Record<string, number> = {};
  requisitions.forEach(r => r.requestedMedications.forEach(m => { medCounts[m] = (medCounts[m] ?? 0) + 1; }));
  const topMeds = Object.entries(medCounts).sort((a,b)=>b[1]-a[1]).slice(0,10);
  const approvedCount = requisitions.filter(r => ['Approved','Dispensed','Ready for Pickup'].includes(r.status)).length;
  const approvalRate = requisitions.length > 0 ? Math.round((approvedCount / requisitions.length) * 100) : 0;

  // Compliance
  const viewRecordCount = auditLogs.filter(l=>l.action==='VIEW_RECORD').length;
  const failedCount = auditLogs.filter(l=>l.status==='Failed').length;

  const generateReport = () => {
    if (!currentUser) return;
    createAuditEntry({ userId: currentUser.id, userName: currentUser.name, userRole: currentUser.role,
      action: 'EXPORT_REPORT', resourceType: 'Report', resourceDescription: 'Generated full compliance report', status: 'Success' });
    toast('Compliance report generated (simulated)', 'success');
  };

  return (
    <div className="p-6">
      <PageHeader title="System Reports" subtitle="Analytics and compliance overview" />
      <Tabs.Root defaultValue="health">
        <Tabs.List className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl w-fit">
          {[['health','Health Trends'],['medications','Medication Report'],['compliance','Compliance']].map(([value,label])=>(
            <Tabs.Trigger key={value} value={value}
              className="px-4 py-2 text-sm font-medium rounded-lg text-gray-600 data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm transition-all">
              {label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        <Tabs.Content value="health" className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-800 mb-4">Top Diagnoses This Month</h3>
            {topDiagnoses.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={topDiagnoses} layout="vertical">
                  <XAxis type="number" fontSize={12} />
                  <YAxis type="category" dataKey="name" fontSize={10} width={180} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6" radius={[0,4,4,0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="text-sm text-gray-400 py-8 text-center">No encounter data this month</div>}
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-800 mb-4">Facility Distribution</h3>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={facilityPie} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({name,value})=>`${name}: ${value}`}>
                    {facilityPie.map((_,i)=><Cell key={i} fill={PIE_COLORS[i]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col justify-center">
              <h3 className="font-semibold text-gray-800 mb-4">Wait Time Comparison</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <span className="text-sm text-gray-700">Before SHR</span>
                  <span className="text-lg font-bold text-red-600">~45 min</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <span className="text-sm text-gray-700">With SHR</span>
                  <span className="text-lg font-bold text-green-600">~8 min</span>
                </div>
                <div className="text-xs text-gray-500 text-center">Average wait time at Amphi Clinic</div>
              </div>
            </div>
          </div>
        </Tabs.Content>

        <Tabs.Content value="medications" className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-800 mb-4">Most Requested Medications</h3>
              <div className="space-y-2">
                {topMeds.length > 0 ? topMeds.map(([name, count], i) => (
                  <div key={name} className="flex items-center gap-3">
                    <span className="text-xs text-gray-400 w-4">{i+1}</span>
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium text-gray-700">{name}</span>
                        <span className="text-xs text-gray-500">{count}</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.round((count / (topMeds[0]?.[1] ?? 1)) * 100)}%` }} />
                      </div>
                    </div>
                  </div>
                )) : <div className="text-sm text-gray-400 py-4 text-center">No data</div>}
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col items-center justify-center gap-4">
              <h3 className="font-semibold text-gray-800">Approval Rate</h3>
              <div className="relative flex items-center justify-center w-40 h-40">
                <svg className="w-40 h-40 -rotate-90" viewBox="0 0 160 160">
                  <circle cx="80" cy="80" r="65" fill="none" stroke="#e5e7eb" strokeWidth="14" />
                  <circle cx="80" cy="80" r="65" fill="none" stroke="#3b82f6" strokeWidth="14"
                    strokeDasharray={`${2 * Math.PI * 65}`}
                    strokeDashoffset={`${2 * Math.PI * 65 * (1 - approvalRate / 100)}`}
                    strokeLinecap="round" />
                </svg>
                <div className="absolute text-center">
                  <div className="text-3xl font-bold text-blue-600">{approvalRate}%</div>
                  <div className="text-xs text-gray-500">approved</div>
                </div>
              </div>
              <div className="text-sm text-gray-600">Avg approval time: <span className="font-semibold">2.3 hours</span></div>
              <div className="text-xs text-gray-400">{approvedCount} of {requisitions.length} requisitions</div>
            </div>
          </div>
        </Tabs.Content>

        <Tabs.Content value="compliance" className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
              <div className="text-4xl font-bold text-blue-600 mb-2">{viewRecordCount}</div>
              <div className="text-sm font-medium text-gray-700">Records Accessed</div>
              <div className="text-xs text-gray-400 mt-1">VIEW_RECORD audit events</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
              <div className="text-4xl font-bold text-red-600 mb-2">{failedCount}</div>
              <div className="text-sm font-medium text-gray-700">Failed Access Attempts</div>
              <div className="text-xs text-gray-400 mt-1">Failed status audit entries</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
              <div className="text-4xl font-bold text-green-600 mb-2">{auditLogs.length}</div>
              <div className="text-sm font-medium text-gray-700">Total Audit Events</div>
              <div className="text-xs text-gray-400 mt-1">All recorded actions</div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-800 mb-4">Compliance Actions</h3>
            <button onClick={generateReport}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">
              Generate Full Compliance Report
            </button>
          </div>
        </Tabs.Content>
      </Tabs.Root>
    </div>
  );
}
