type ReportPoint = {
  label: string
  value: number
}

type PieChartProps = {
  points: ReportPoint[]
  size?: number
}

const DEFAULT_COLORS = [
  '#2563eb',
  '#06b6d4',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
  '#64748b',
]

export default function PieChart({ points, size = 160 }: PieChartProps) {
  const total = points.reduce((s, p) => s + p.value, 0)

  if (!points || points.length === 0 || total === 0) {
    return <div className="pie-chart empty">Chưa có dữ liệu để hiển thị.</div>
  }

  // build conic-gradient stops
  let angleAccum = 0
  const stops: string[] = []

  points.forEach((p, idx) => {
    const portion = (p.value / total) * 100
    const start = angleAccum
    const end = angleAccum + portion
    const color = DEFAULT_COLORS[idx % DEFAULT_COLORS.length]
    stops.push(`${color} ${start}% ${end}%`)
    angleAccum = end
  })

  const bg = `conic-gradient(${stops.join(', ')})`

  return (
    <div className="pie-chart">
      <div className="pie-chart__visual" style={{ width: size, height: size, background: bg }} />
      <ul className="pie-chart__legend">
        {points.map((p, idx) => (
          <li key={p.label}>
            <span className="pie-chart__swatch" style={{ background: DEFAULT_COLORS[idx % DEFAULT_COLORS.length] }} />
            <span className="pie-chart__label">{p.label}</span>
            <strong className="pie-chart__value">{Math.round((p.value / total) * 100)}%</strong>
          </li>
        ))}
      </ul>
    </div>
  )
}
