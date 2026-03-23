import { Clock, CheckCircle, XCircle, Bell, Package, Ban } from 'lucide-react'
import type { RequisitionStatus } from '../../types/types'

interface StatusBadgeProps {
  status: RequisitionStatus
  className?: string
}

const config: Record<
  RequisitionStatus,
  { label: string; classes: string; Icon: React.ElementType }
> = {
  'Pending Review': {
    label: 'Pending Review',
    classes: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    Icon: Clock,
  },
  Approved: {
    label: 'Approved',
    classes: 'bg-blue-100 text-blue-800 border-blue-200',
    Icon: CheckCircle,
  },
  Rejected: {
    label: 'Rejected',
    classes: 'bg-red-100 text-red-800 border-red-200',
    Icon: XCircle,
  },
  'Ready for Pickup': {
    label: 'Ready for Pickup',
    classes: 'bg-green-100 text-green-800 border-green-200',
    Icon: Bell,
  },
  Dispensed: {
    label: 'Dispensed',
    classes: 'bg-gray-100 text-gray-700 border-gray-200',
    Icon: Package,
  },
  Cancelled: {
    label: 'Cancelled',
    classes: 'bg-gray-100 text-gray-500 border-gray-200',
    Icon: Ban,
  },
}

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const { label, classes, Icon } = config[status]
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${classes} ${className}`}
    >
      <Icon className="w-3 h-3" />
      {label}
    </span>
  )
}
