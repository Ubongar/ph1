import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Eye, AlertTriangle } from 'lucide-react'
import { getAll, StorageKey } from '../../services/storage'
import type { Student, SystemUser, MedicationRequisition, Encounter } from '../../types/types'
import { SkeletonRow, EmptyState } from '../../components/shared'

const ITEMS_PER_PAGE = 10
const DEPARTMENTS = [
  'Engineering',
  'Medicine',
  'Law',
  'Science',
  'Arts',
  'Social Sciences',
  'Education',
  'Business',
]
const BLOOD_GROUPS: Student['bloodGroup'][] = [
  'A+',
  'A-',
  'B+',
  'B-',
  'AB+',
  'AB-',
  'O+',
  'O-',
]

interface StudentRow {
  student: Student
  matricNumber: string
  lastVisit: string
  hasActiveReq: boolean
}

export default function StudentSearch() {
  const navigate = useNavigate()
  const [nameQuery, setNameQuery] = useState('')
  const [department, setDepartment] = useState('')
  const [bloodGroup, setBloodGroup] = useState<Student['bloodGroup'] | ''>('')
  const [hasActiveRequisition, setHasActiveRequisition] = useState(false)
  const [hasCriticalAllergy, setHasCriticalAllergy] = useState(false)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [rows, setRows] = useState<StudentRow[]>([])
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setLoading(true)
    timerRef.current = setTimeout(() => {
      const students = getAll<Student>(StorageKey.STUDENTS)
      const users = getAll<SystemUser>(StorageKey.USERS)
      const encounters = getAll<Encounter>(StorageKey.ENCOUNTERS)
      const requisitions = getAll<MedicationRequisition>(StorageKey.REQUISITIONS)

      let filtered = [...students]
      if (nameQuery.trim()) {
        const q = nameQuery.toLowerCase()
        filtered = filtered.filter((s) => s.name.toLowerCase().includes(q))
      }
      if (department) {
        filtered = filtered.filter((s) => s.department === department)
      }
      if (bloodGroup) {
        filtered = filtered.filter((s) => s.bloodGroup === bloodGroup)
      }
      if (hasCriticalAllergy) {
        filtered = filtered.filter((s) =>
          s.allergies.some((a) => a.severity === 'Life-threatening'),
        )
      }

      const result: StudentRow[] = filtered.map((student) => {
        const user = users.find((u) => u.id === student.userId)
        const studentEncounters = encounters
          .filter((e) => e.studentId === student.id)
          .sort((a, b) => b.date.localeCompare(a.date))
        const studentReqs = requisitions.filter((r) => r.studentId === student.id)
        const activeReq = studentReqs.some(
          (r) => r.status === 'Pending Review' || r.status === 'Approved',
        )
        return {
          student,
          matricNumber: user?.matricNumber ?? '—',
          lastVisit: studentEncounters[0]?.date?.split('T')[0] ?? '—',
          hasActiveReq: activeReq,
        }
      })

      const finalRows = hasActiveRequisition ? result.filter((r) => r.hasActiveReq) : result
      setRows(finalRows)
      setPage(1)
      setLoading(false)
    }, 400)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [nameQuery, department, bloodGroup, hasActiveRequisition, hasCriticalAllergy])

  const totalPages = Math.max(1, Math.ceil(rows.length / ITEMS_PER_PAGE))
  const pageRows = rows.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-screen-xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Student Search</h1>
          <p className="text-sm text-gray-500">Search and filter registered students</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name..."
                value={nameQuery}
                onChange={(e) => setNameQuery(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Departments</option>
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <select
              value={bloodGroup}
              onChange={(e) => setBloodGroup(e.target.value as Student['bloodGroup'] | '')}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Blood Groups</option>
              {BLOOD_GROUPS.map((bg) => (
                <option key={bg} value={bg}>
                  {bg}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer whitespace-nowrap">
              <input
                type="checkbox"
                checked={hasActiveRequisition}
                onChange={(e) => setHasActiveRequisition(e.target.checked)}
                className="rounded"
              />
              Active Request
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer whitespace-nowrap">
              <input
                type="checkbox"
                checked={hasCriticalAllergy}
                onChange={(e) => setHasCriticalAllergy(e.target.checked)}
                className="rounded"
              />
              Critical Allergy
            </label>
          </div>
        </div>

        {/* Results Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Student
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Matric #
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Level
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Blood Group
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Last Visit
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Alerts
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={8} />)
              ) : pageRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-4">
                    <EmptyState
                      icon={<Search className="w-8 h-8" />}
                      title="No students found"
                      description="Try adjusting your search filters"
                    />
                  </td>
                </tr>
              ) : (
                pageRows.map(({ student, matricNumber, lastVisit }) => (
                  <tr key={student.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                          {student.name
                            .split(' ')
                            .map((n) => n[0])
                            .join('')
                            .slice(0, 2)
                            .toUpperCase()}
                        </div>
                        <span className="font-medium text-gray-900">{student.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{matricNumber}</td>
                    <td className="px-4 py-3 text-gray-600">{student.department}</td>
                    <td className="px-4 py-3 text-gray-600">{student.level}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                        {student.bloodGroup}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{lastVisit}</td>
                    <td className="px-4 py-3">
                      {student.allergies.some((a) => a.severity === 'Life-threatening') && (
                        <AlertTriangle
                          className="w-4 h-4 text-red-500"
                          aria-label="Life-threatening allergy"
                        />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => navigate(`/staff/patient/${student.id}`)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg font-medium transition-colors"
                      >
                        <Eye className="w-3 h-3" />
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {!loading && rows.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
              <span className="text-sm text-gray-500">
                Page {page} of {totalPages} ({rows.length} results)
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
