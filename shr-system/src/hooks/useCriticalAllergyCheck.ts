import { useMemo } from 'react'
import type { Allergy, Student } from '../types/types'
import { StorageKey, getAll } from '../services/storage'

export function useCriticalAllergyCheck(studentId: string): Allergy[] {
  return useMemo(() => {
    const students = getAll<Student>(StorageKey.STUDENTS)
    const student = students.find((s) => s.id === studentId)
    if (!student) return []
    return student.allergies.filter((a) => a.severity === 'Life-threatening')
  }, [studentId])
}
