import { useState, useRef, useEffect, useCallback } from 'react';
import { Search, Upload, X, FileText, Image, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getAll, create, createAuditEntry, StorageKey } from '../../services/storage';
import type { Student, DiagnosticResult, ResultType } from '../../types/types';
import { useToast } from '../../components/shared/Toast';
import { PageHeader } from '../../components/shared/PageHeader';

interface FileInfo { name: string; size: number; type: string }

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

export default function TechnicianUploadPortal() {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Student[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Student | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [testType, setTestType] = useState<ResultType>('Blood Test');
  const [testName, setTestName] = useState('');
  const [doctorName, setDoctorName] = useState(currentUser?.name ?? '');
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null);
  const [findings, setFindings] = useState('');
  const [criticalFlag, setCriticalFlag] = useState(false);
  const [criticalReason, setCriticalReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const search = useCallback((q: string) => {
    const students = getAll<Student>(StorageKey.STUDENTS);
    const lower = q.toLowerCase();
    setResults(students.filter(s => s.name.toLowerCase().includes(lower)).slice(0, 8));
    setShowDropdown(true);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) { setResults([]); setShowDropdown(false); return; }
    debounceRef.current = setTimeout(() => search(query), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, search]);

  const selectPatient = (s: Student) => {
    setSelectedPatient(s);
    setQuery('');
    setShowDropdown(false);
  };

  const handleFile = (file: File) => {
    setFileInfo({ name: file.name, size: file.size, type: file.type });
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const disabled = !selectedPatient;

  const resetForm = () => {
    setTestType('Blood Test'); setTestName(''); setDoctorName(currentUser?.name ?? '');
    setFileInfo(null); setFindings(''); setCriticalFlag(false); setCriticalReason('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient || !currentUser) return;
    if (findings.length < 20) { toast('Findings must be at least 20 characters', 'error'); return; }
    if (criticalFlag && !criticalReason.trim()) { toast('Critical reason required', 'error'); return; }
    setSubmitting(true);
    await new Promise(r => setTimeout(r, 1500));
    const ext = fileInfo?.name.split('.').pop()?.toLowerCase() ?? '';
    const fileType: DiagnosticResult['fileType'] = ext === 'pdf' ? 'PDF' : ext === 'dcm' ? 'DICOM' : ext === 'png' ? 'PNG' : 'JPEG';
    const result: DiagnosticResult = {
      id: `res-${Date.now()}`,
      studentId: selectedPatient.id,
      requestingStaffId: currentUser.id,
      requestingStaffName: doctorName,
      type: testType,
      testName,
      facility: testType === 'Imaging' ? 'Radiology' : 'Lab',
      uploadedByTechnicianId: currentUser.id,
      uploadedByTechnicianName: currentUser.name,
      uploadedAt: new Date().toISOString(),
      status: 'Completed',
      findings,
      fileSimulatedUrl: fileInfo ? `simulated://${fileInfo.name}` : 'simulated://no-file',
      fileType,
      criticalFlag,
      criticalFlagReason: criticalFlag ? criticalReason : undefined,
    };
    create(StorageKey.RESULTS, result);
    createAuditEntry({
      userId: currentUser.id, userName: currentUser.name, userRole: currentUser.role,
      action: 'UPLOAD_RESULT', resourceType: 'DiagnosticResult', resourceId: result.id,
      resourceDescription: `Uploaded ${testName} for ${selectedPatient.name}`,
      status: 'Success', changeDetails: JSON.stringify({ testType, criticalFlag }),
    });
    toast('Result uploaded successfully', 'success');
    setSubmitting(false);
    resetForm();
  };

  const testTypes: ResultType[] = ['Blood Test','Urinalysis','Imaging','Microbiology','Histology','ECG','Other'];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader title="Upload Diagnostic Results" subtitle="Search for a patient and upload test results" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Patient Search */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Patient Search</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search by student name..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {showDropdown && results.length > 0 && (
              <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-64 overflow-y-auto">
                {results.map(s => (
                  <button key={s.id} type="button" onClick={() => selectPatient(s)}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors">
                    <div className="font-medium text-gray-900 text-sm">{s.name}</div>
                    <div className="text-xs text-gray-500">{s.department} • Level {s.level}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
          {selectedPatient ? (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-semibold text-gray-900">{selectedPatient.name}</div>
                  <div className="text-sm text-gray-600 mt-1">ID: {selectedPatient.id}</div>
                  <div className="text-sm text-gray-600">Blood Group: <span className="font-medium text-red-600">{selectedPatient.bloodGroup}</span></div>
                  {selectedPatient.allergies.length > 0 && (
                    <div className="mt-2">
                      <span className="text-xs font-medium text-orange-700">Allergies: </span>
                      <span className="text-xs text-orange-600">{selectedPatient.allergies.map(a => a.allergen).join(', ')}</span>
                    </div>
                  )}
                </div>
                <button type="button" onClick={() => setSelectedPatient(null)}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium">Clear</button>
              </div>
            </div>
          ) : (
            <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg text-center text-sm text-gray-500">
              Search for a student to view their profile
            </div>
          )}
        </div>

        {/* Right: Upload Form */}
        <div className={`bg-white rounded-xl border rounded-xl p-6 relative ${disabled ? 'opacity-60' : ''}`}>
          {disabled && (
            <div className="absolute inset-0 bg-white/60 z-10 flex items-center justify-center rounded-xl">
              <div className="bg-gray-800 text-white text-sm px-4 py-2 rounded-lg">Select a patient first to enable upload</div>
            </div>
          )}
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Upload Form</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Test Type</label>
              <select value={testType} onChange={e => setTestType(e.target.value as ResultType)} disabled={disabled}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {testTypes.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Test Name *</label>
              <input required value={testName} onChange={e => setTestName(e.target.value)} disabled={disabled}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. Full Blood Count" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Requesting Doctor</label>
              <input value={doctorName} onChange={e => setDoctorName(e.target.value)} disabled={disabled}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">File Attachment</label>
              <input ref={fileInputRef} type="file" className="hidden"
                onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />
              {fileInfo ? (
                <div className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  {fileInfo.name.endsWith('.pdf') ? <FileText className="w-5 h-5 text-red-500" /> : <Image className="w-5 h-5 text-blue-500" />}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{fileInfo.name}</div>
                    <div className="text-xs text-gray-500">{formatBytes(fileInfo.size)}</div>
                  </div>
                  <button type="button" onClick={() => setFileInfo(null)} className="text-gray-400 hover:text-red-500"><X className="w-4 h-4" /></button>
                </div>
              ) : (
                <div onDrop={onDrop} onDragOver={e => e.preventDefault()}
                  onClick={() => !disabled && fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">Drag & Drop or click to browse</p>
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Findings * (min 20 chars)</label>
              <textarea required value={findings} onChange={e => setFindings(e.target.value)} disabled={disabled} rows={4}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="Describe the test findings in detail..." />
              <div className="text-xs text-gray-400 text-right">{findings.length} chars</div>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">Critical Flag</label>
                <button type="button" onClick={() => setCriticalFlag(!criticalFlag)} disabled={disabled}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${criticalFlag ? 'bg-red-500 ring-2 ring-red-300' : 'bg-gray-300'}`}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${criticalFlag ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
              {criticalFlag && (
                <div className="mt-3 space-y-2">
                  <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                    <span className="text-sm text-red-700">⚠️ This result will be flagged for immediate review</span>
                  </div>
                  <input required value={criticalReason} onChange={e => setCriticalReason(e.target.value)} disabled={disabled}
                    placeholder="Critical reason (required)"
                    className="w-full border border-red-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
                </div>
              )}
            </div>
            <button type="submit" disabled={disabled || submitting}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              {submitting ? 'Uploading...' : 'Submit Result'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
