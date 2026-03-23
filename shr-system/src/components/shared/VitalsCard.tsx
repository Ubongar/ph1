import type { Vitals } from '../../types/types'

interface VitalsCardProps {
  vitals: Vitals
  className?: string
}

function MetricCell({
  label,
  value,
  unit,
  isAbnormal,
}: {
  label: string
  value: number | string
  unit: string
  isAbnormal: boolean
}) {
  return (
    <div className="px-4 py-3">
      <dt className="text-xs text-gray-500 mb-0.5">{label}</dt>
      <dd className="text-sm font-medium">
        <span className={isAbnormal ? 'text-red-600 font-semibold' : 'text-gray-900'}>
          {value}
        </span>{' '}
        <span className="text-gray-500 font-normal text-xs">{unit}</span>
      </dd>
    </div>
  )
}

export function VitalsCard({ vitals, className = '' }: VitalsCardProps) {
  const computedBmi =
    vitals.bmi ?? Math.round((vitals.weight / Math.pow(vitals.height / 100, 2)) * 10) / 10

  return (
    <div className={`rounded-lg border border-gray-200 bg-white overflow-hidden ${className}`}>
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-700">Vitals</h3>
      </div>
      <dl className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y divide-gray-100">
        <div className="px-4 py-3">
          <dt className="text-xs text-gray-500 mb-0.5">Blood Pressure</dt>
          <dd className="text-sm font-medium">
            <span
              className={
                vitals.bloodPressureSystolic > 140 ? 'text-red-600 font-semibold' : 'text-gray-900'
              }
            >
              {vitals.bloodPressureSystolic}/{vitals.bloodPressureDiastolic}
            </span>{' '}
            <span className="text-gray-500 font-normal text-xs">mmHg</span>
          </dd>
        </div>
        <MetricCell
          label="Heart Rate"
          value={vitals.heartRate}
          unit="bpm"
          isAbnormal={vitals.heartRate > 100}
        />
        <MetricCell
          label="Temperature"
          value={vitals.temperature}
          unit="°C"
          isAbnormal={vitals.temperature > 38.5}
        />
        <MetricCell
          label="SpO₂"
          value={vitals.oxygenSaturation}
          unit="%"
          isAbnormal={vitals.oxygenSaturation < 95}
        />
        <MetricCell
          label="Respiratory Rate"
          value={vitals.respiratoryRate}
          unit="br/min"
          isAbnormal={false}
        />
        <MetricCell label="Weight" value={vitals.weight} unit="kg" isAbnormal={false} />
        <MetricCell label="Height" value={vitals.height} unit="cm" isAbnormal={false} />
        <MetricCell label="BMI" value={computedBmi} unit="kg/m²" isAbnormal={false} />
      </dl>
    </div>
  )
}
