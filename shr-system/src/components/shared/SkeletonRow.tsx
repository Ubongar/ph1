interface SkeletonRowProps {
  cols?: number
}

export function SkeletonRow({ cols = 4 }: SkeletonRowProps) {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-gray-200 rounded w-full" />
        </td>
      ))}
    </tr>
  )
}
