import { useState } from 'react';
import { Pencil, Key, UserX, UserCheck, Plus, X, Copy } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getAll, create, update, createAuditEntry, StorageKey } from '../../services/storage';
import type { SystemUser, UserRole } from '../../types/types';
import { useToast } from '../../components/shared/Toast';
import { ConfirmDialog } from '../../components/shared/ConfirmDialog';
import { PageHeader } from '../../components/shared/PageHeader';

const ROLES: UserRole[] = ['student','medical_staff','technician','pharmacy','admin'];
const ROLE_LABELS: Record<UserRole, string> = { student:'Student', medical_staff:'Medical Staff', technician:'Technician', pharmacy:'Pharmacy', admin:'Admin' };
const ROLE_COLORS: Record<UserRole, string> = {
  student: 'bg-blue-100 text-blue-700',
  medical_staff: 'bg-green-100 text-green-700',
  technician: 'bg-purple-100 text-purple-700',
  pharmacy: 'bg-orange-100 text-orange-700',
  admin: 'bg-red-100 text-red-700',
};
const PAGE_SIZE = 15;

function genPassword() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#';
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

interface FormData { name: string; email: string; role: UserRole; department: string; staffId: string; matricNumber: string; }

export default function UserManagement() {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState(() => getAll<SystemUser>(StorageKey.USERS));
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [panelOpen, setPanelOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<SystemUser | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<SystemUser | null>(null);
  const [resetTarget, setResetTarget] = useState<SystemUser | null>(null);
  const [generatedPwd, setGeneratedPwd] = useState('');
  const [resetPwd, setResetPwd] = useState('');
  const [form, setForm] = useState<FormData>({ name:'', email:'', role:'student', department:'', staffId:'', matricNumber:'' });

  const reload = () => setUsers(getAll<SystemUser>(StorageKey.USERS));

  const filtered = users.filter(u => {
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    const q = search.toLowerCase();
    const matchSearch = u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    return matchRole && matchSearch;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const openAdd = () => {
    const pwd = genPassword();
    setGeneratedPwd(pwd);
    setForm({ name:'', email:'', role:'student', department:'', staffId:'', matricNumber:'' });
    setEditTarget(null);
    setPanelOpen(true);
  };

  const openEdit = (u: SystemUser) => {
    setEditTarget(u);
    setForm({ name: u.name, email: u.email, role: u.role, department: u.department ?? '', staffId: u.staffId ?? '', matricNumber: u.matricNumber ?? '' });
    setPanelOpen(true);
  };

  const saveUser = () => {
    if (!currentUser) return;
    if (editTarget) {
      update<SystemUser>(StorageKey.USERS, editTarget.id, { name: form.name, email: form.email, department: form.department, staffId: form.staffId, matricNumber: form.matricNumber });
      createAuditEntry({ userId: currentUser.id, userName: currentUser.name, userRole: currentUser.role, action: 'EDIT_RECORD', resourceType: 'User', resourceId: editTarget.id, resourceDescription: `Edited user: ${form.name}`, status: 'Success' });
      toast('User updated', 'success');
    } else {
      const newUser: SystemUser = { id: `user-${Date.now()}`, name: form.name, email: form.email, role: form.role, department: form.department, staffId: form.staffId || undefined, matricNumber: form.matricNumber || undefined, isActive: true, createdAt: new Date().toISOString(), createdBy: currentUser.id };
      create<SystemUser>(StorageKey.USERS, newUser);
      createAuditEntry({ userId: currentUser.id, userName: currentUser.name, userRole: currentUser.role, action: 'CREATE_USER', resourceType: 'User', resourceId: newUser.id, resourceDescription: `Created user: ${form.name}`, status: 'Success' });
      createAuditEntry({ userId: currentUser.id, userName: currentUser.name, userRole: currentUser.role, action: 'RESET_PASSWORD', resourceType: 'User', resourceId: newUser.id, resourceDescription: `Generated initial password for: ${form.name}`, status: 'Success' });
      toast('User created', 'success');
    }
    setPanelOpen(false);
    reload();
  };

  const deactivate = () => {
    if (!deactivateTarget || !currentUser) return;
    update<SystemUser>(StorageKey.USERS, deactivateTarget.id, { isActive: false });
    createAuditEntry({ userId: currentUser.id, userName: currentUser.name, userRole: currentUser.role, action: 'DEACTIVATE_USER', resourceType: 'User', resourceId: deactivateTarget.id, resourceDescription: `Deactivated: ${deactivateTarget.name}`, status: 'Success' });
    toast('User deactivated', 'success');
    setDeactivateTarget(null);
    reload();
  };

  const reactivate = (u: SystemUser) => {
    if (!currentUser) return;
    update<SystemUser>(StorageKey.USERS, u.id, { isActive: true });
    createAuditEntry({ userId: currentUser.id, userName: currentUser.name, userRole: currentUser.role, action: 'EDIT_RECORD', resourceType: 'User', resourceId: u.id, resourceDescription: `Reactivated: ${u.name}`, status: 'Success' });
    toast('User reactivated', 'success');
    reload();
  };

  const openResetPwd = (u: SystemUser) => { setResetTarget(u); setResetPwd(genPassword()); };

  const confirmReset = () => {
    if (!resetTarget || !currentUser) return;
    createAuditEntry({ userId: currentUser.id, userName: currentUser.name, userRole: currentUser.role, action: 'RESET_PASSWORD', resourceType: 'User', resourceId: resetTarget.id, resourceDescription: `Reset password for: ${resetTarget.name}`, status: 'Success' });
    toast('Password reset', 'success');
    setResetTarget(null);
  };

  const start = (page - 1) * PAGE_SIZE + 1;
  const end = Math.min(page * PAGE_SIZE, filtered.length);

  return (
    <div className="p-6">
      <PageHeader title="User Management" actions={<button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"><Plus className="w-4 h-4" />Add New User</button>} />
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex gap-1 flex-wrap">
          {(['all',...ROLES] as const).map(r => (
            <button key={r} onClick={() => { setRoleFilter(r); setPage(1); }} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${roleFilter === r ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {r === 'all' ? 'All' : ROLE_LABELS[r]}
            </button>
          ))}
        </div>
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search by name or email..."
          className="flex-1 min-w-48 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
            <tr>{['','Name','Email','Role','Department','ID','Status','Last Login','Actions'].map(h => <th key={h} className="px-3 py-3 text-left">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {paginated.map(u => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-3 py-3"><div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">{u.name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()}</div></td>
                <td className="px-3 py-3 font-medium text-gray-900">{u.name}</td>
                <td className="px-3 py-3 text-gray-600">{u.email}</td>
                <td className="px-3 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[u.role]}`}>{ROLE_LABELS[u.role]}</span></td>
                <td className="px-3 py-3 text-gray-600">{u.department ?? '—'}</td>
                <td className="px-3 py-3 text-gray-500 font-mono text-xs">{u.staffId ?? u.matricNumber ?? '—'}</td>
                <td className="px-3 py-3">{u.isActive ? <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">Active</span> : <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full">Inactive</span>}</td>
                <td className="px-3 py-3 text-gray-500 text-xs">{u.lastLogin ? new Date(u.lastLogin).toLocaleDateString() : 'Never'}</td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2">
                    <button onClick={() => openEdit(u)} title="Edit"><Pencil className="w-4 h-4 text-gray-500 hover:text-blue-600" /></button>
                    {u.isActive ? <button onClick={() => setDeactivateTarget(u)} title="Deactivate"><UserX className="w-4 h-4 text-gray-500 hover:text-red-600" /></button> : <button onClick={() => reactivate(u)} title="Reactivate"><UserCheck className="w-4 h-4 text-gray-500 hover:text-green-600" /></button>}
                    <button onClick={() => openResetPwd(u)} title="Reset Password"><Key className="w-4 h-4 text-gray-500 hover:text-orange-600" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-600">
          <span>Showing {filtered.length > 0 ? start : 0}–{end} of {filtered.length} users</span>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1} className="px-3 py-1.5 rounded-lg bg-gray-100 disabled:opacity-40">Previous</button>
            <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page >= totalPages} className="px-3 py-1.5 rounded-lg bg-gray-100 disabled:opacity-40">Next</button>
          </div>
        </div>
      </div>

      {/* Slide-over panel */}
      {panelOpen && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <div className="fixed inset-0 bg-black/40" onClick={() => setPanelOpen(false)} />
          <div className="relative w-full max-w-[480px] bg-white shadow-xl h-full overflow-y-auto p-6 z-50">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold">{editTarget ? 'Edit User' : 'Add New User'}</h2>
              <button onClick={() => setPanelOpen(false)}><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Name</label><input value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Email</label><input type="email" value={form.email} onChange={e => setForm(f=>({...f,email:e.target.value}))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                {editTarget ? <div className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${ROLE_COLORS[form.role]}`}>{ROLE_LABELS[form.role]}</div> :
                  <select value={form.role} onChange={e => setForm(f=>({...f,role:e.target.value as UserRole}))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                  </select>}
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Department</label><input value={form.department} onChange={e => setForm(f=>({...f,department:e.target.value}))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
              {form.role === 'student' ? <div><label className="block text-sm font-medium text-gray-700 mb-1">Matric Number</label><input value={form.matricNumber} onChange={e => setForm(f=>({...f,matricNumber:e.target.value}))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div> : <div><label className="block text-sm font-medium text-gray-700 mb-1">Staff ID</label><input value={form.staffId} onChange={e => setForm(f=>({...f,staffId:e.target.value}))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>}
              {!editTarget && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Auto-generated Password</label>
                  <div className="flex items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <code className="flex-1 text-sm font-mono">{generatedPwd}</code>
                    <button type="button" onClick={() => { navigator.clipboard.writeText(generatedPwd); toast('Copied', 'success'); }} className="text-blue-600 hover:text-blue-800"><Copy className="w-4 h-4" /></button>
                  </div>
                </div>
              )}
              <button onClick={saveUser} className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium">Save</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog isOpen={deactivateTarget !== null} title={`Deactivate ${deactivateTarget?.name ?? ''}?`} message="This user will no longer be able to log in." confirmLabel="Deactivate" confirmVariant="danger" onConfirm={deactivate} onCancel={() => setDeactivateTarget(null)} />

      {resetTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/40" onClick={() => setResetTarget(null)} />
          <div className="relative bg-white rounded-xl shadow-xl p-6 w-full max-w-md z-50">
            <h2 className="text-lg font-semibold mb-4">Reset Password — {resetTarget.name}</h2>
            <div className="flex items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-lg mb-4">
              <code className="flex-1 text-sm font-mono">{resetPwd}</code>
              <button type="button" onClick={() => { navigator.clipboard.writeText(resetPwd); toast('Copied','success'); }}><Copy className="w-4 h-4 text-blue-600" /></button>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setResetTarget(null)} className="px-4 py-2 bg-gray-100 rounded-lg text-sm">Cancel</button>
              <button onClick={confirmReset} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">Confirm Reset</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
