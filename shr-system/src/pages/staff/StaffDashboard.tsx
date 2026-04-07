import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, Users, ClipboardList, FlaskConical, Search } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import {
  getAll,
  getPendingRequisitions,
  getAuditLogs,
  StorageKey,
} from '../../services/storage'
import type {
  Student,
  MedicationRequisition,
  AuditLog,
  Encounter,
  DiagnosticResult,
  Referral,
} from '../../types/types'
import { SeverityBadge } from '../../components/shared'

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function StaffDashboard() {
  const { currentUser } = useAuth()
  const navigate = useNavigate()

  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Student[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const pendingRequisitions = getPendingRequisitions()
  const allEncounters = getAll<Encounter>(StorageKey.ENCOUNTERS)
  const allResults = getAll<DiagnosticResult>(StorageKey.RESULTS)
  const auditLogs = getAuditLogs()
    .sort((a: AuditLog, b: AuditLog) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 10)

  const today = new Date().toISOString().split('T')[0]
  const todayEncounters = allEncounters.filter((e) => e.date.startsWith(today))
  const criticalAlerts = allResults.filter((r) => r.criticalFlag)
  const pendingResults = allResults.filter(
    (r) => r.status === 'Pending' || r.status === 'Processing',
  )
  const myReferralFeedback = getAll<Referral>(StorageKey.REFERRALS).filter(
    (r) => r.requestingStaffId === currentUser?.id && r.status === 'Completed',
  )

  const topRequisitions = [...pendingRequisitions]
    .sort((a: MedicationRequisition, b: MedicationRequisition) => {
      if (a.priority === 'Urgent' && b.priority !== 'Urgent') return -1
      if (b.priority === 'Urgent' && a.priority !== 'Urgent') return 1
      return new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime()
    })
    .slice(0, 5)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!searchQuery.trim()) {
      setSearchResults([])
      setShowDropdown(false)
      return
    }
    debounceRef.current = setTimeout(() => {
      const students = getAll<Student>(StorageKey.STUDENTS)
      const q = searchQuery.toLowerCase()
      setSearchResults(students.filter((s) => s.name.toLowerCase().includes(q)).slice(0, 8))
      setShowDropdown(true)
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [searchQuery])

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div className="p-4 sm:p-6 min-h-screen bg-gray-50">
      <div className="max-w-screen-xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome, {currentUser?.name ?? 'Doctor'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">Medical Staff Dashboard</p>
        </div>

        {/* Search */}
        <div className="mb-6 relative" ref={searchRef}>
          <div className="relative max-w-lg">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search patients by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>
          {showDropdown && (
            <div className="absolute top-full mt-1 left-0 w-full max-w-lg bg-white border border-gray-200 rounded-lg shadow-lg z-50">
              {searchResults.length === 0 ? (
                <div className="px-4 py-3 text-sm text-gray-500">No patients found</div>
              ) : (
                searchResults.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      navigate(`/staff/patient/${s.id}`)
                      setShowDropdown(false)
                      setSearchQuery('')
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-blue-50 text-left border-b border-gray-100 last:border-0"
                  >
                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {s.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">{s.name}</div>
                      <div className="text-xs text-gray-500">
                        {s.department} · {s.level}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3 sm:gap-4 mb-6">
          <div className="bg-white rounded-xl border border-yellow-200 p-4 sm:p-5 flex items-center gap-4">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <ClipboardList className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-gray-900">{pendingRequisitions.length}</div>
              <div className="text-sm text-gray-500">Pending Requests</div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-blue-200 p-4 sm:p-5 flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-gray-900">{todayEncounters.length}</div>
              <div className="text-sm text-gray-500">Patients Seen Today</div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-red-200 p-4 sm:p-5 flex items-center gap-4">
            <div className="p-3 bg-red-100 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-gray-900">{criticalAlerts.length}</div>
              <div className="text-sm text-gray-500">Critical Alerts</div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-purple-200 p-4 sm:p-5 flex items-center gap-4">
            <div className="p-3 bg-purple-100 rounded-lg">
              <FlaskConical className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-gray-900">{pendingResults.length}</div>
              <div className="text-sm text-gray-500">Pending Lab Results</div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-indigo-200 p-4 sm:p-5 flex items-center gap-4">
            <div className="p-3 bg-indigo-100 rounded-lg">
              <ClipboardList className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-gray-900">{myReferralFeedback.length}</div>
              <button
                type="button"
                onClick={() => navigate('/staff/referral-feedback')}
                className="text-sm text-indigo-600 hover:underline"
              >
                Referral Feedback
              </button>
            </div>
          </div>
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-4 sm:gap-6">
          {/* Left: Pending Requests (60%) */}
          <div className="xl:col-span-3 bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Urgent Pending Requests</h2>
              <button
                type="button"
                onClick={() => navigate('/staff/review-queue')}
                className="text-xs text-blue-600 hover:underline font-medium"
              >
                View All
              </button>
            </div>
            <div className="divide-y divide-gray-100">
              {topRequisitions.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-gray-500">
                  No pending requests
                </div>
              ) : (
                topRequisitions.map((req) => (
                  <div
                    key={req.id}
                    className="px-4 sm:px-5 py-4 flex items-start gap-3 sm:gap-4 hover:bg-gray-50 cursor-pointer"
                    onClick={() => navigate('/staff/review-queue')}
                  >
                    <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-gray-700 text-xs font-bold shrink-0">
                      {req.studentName
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-gray-900">{req.studentName}</span>
                        {req.priority === 'Urgent' && (
                          <span className="px-1.5 py-0.5 rounded text-xs font-semibold bg-orange-100 text-orange-700">
                            Urgent
                          </span>
                        )}
                        <SeverityBadge severity={req.severity} />
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {req.symptoms.slice(0, 3).join(', ')}
                        {req.symptoms.length > 3 && ` +${req.symptoms.length - 3} more`}
                      </div>
                    </div>
                    <div className="text-xs text-gray-400 shrink-0">
                      {relativeTime(req.submittedAt)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right: Audit Activity (40%) */}
          <div className="xl:col-span-2 bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Recent Activity</h2>
            </div>
            <div className="divide-y divide-gray-100 overflow-auto max-h-96">
              {auditLogs.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-gray-500">
                  No recent activity
                </div>
              ) : (
                auditLogs.map((log) => (
                  <div key={log.id} className="px-5 py-3 flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-gray-800 truncate">
                        {log.action.replace(/_/g, ' ')}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {log.userName} · {log.resourceDescription}
                      </div>
                    </div>
                    <div className="text-xs text-gray-400 shrink-0">
                      {relativeTime(log.timestamp)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
