import type { Diagnosis } from '../../types/types'

interface DiagnosisTagProps {
  diagnosis: Diagnosis
  className?: string
}

export function DiagnosisTag({ diagnosis, className = '' }: DiagnosisTagProps) {
  const isPrimary = diagnosis.type === 'Primary'
  return (
    <span
      className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-md text-sm border ${
        isPrimary
          ? 'bg-blue-50 border-blue-200 text-blue-900'
          : 'bg-gray-50 border-gray-200 text-gray-700'
      } ${className}`}
    >
      <code className="font-mono text-xs font-semibold tracking-wide">
        {diagnosis.icd10Code}
      </code>
      <span className={isPrimary ? 'font-bold' : 'font-normal'}>{diagnosis.description}</span>
      {isPrimary && (
        <span className="ml-1 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">
          Primary
        </span>
      )}
    </span>
  )
}
