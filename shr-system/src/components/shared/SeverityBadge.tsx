import type { Allergy } from '../../types/types'

type Severity = Allergy['severity']

interface SeverityBadgeProps {
  severity: Severity
  className?: string
}

const config: Record<Severity, string> = {
  Mild: 'bg-green-100 text-green-800 border-green-200',
  Moderate: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  Severe: 'bg-orange-100 text-orange-800 border-orange-200',
  'Life-threatening': 'bg-red-100 text-red-800 border-red-200 animate-pulse',
}

export function SeverityBadge({ severity, className = '' }: SeverityBadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config[severity]} ${className}`}
    >
      {severity}
    </span>
  )
}
