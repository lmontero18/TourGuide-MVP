interface MetricCardProps {
  label: string
  value: number | string
}

export function MetricCard({ label, value }: MetricCardProps) {
  return (
    <div>
      <p>{value}</p>
      <p>{label}</p>
    </div>
  )
}
