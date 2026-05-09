type Point = { label: string; value: number }

type TablePercentColumnChartProps = {
  points: Point[]
  height?: number
}

export default function TablePercentColumnChart({ points, height = 220 }: TablePercentColumnChartProps) {
  if (!points || points.length === 0) {
    return <div className="table-percent-chart empty">Chưa có dữ liệu để hiển thị.</div>
  }

  const max = Math.max(...points.map((p) => p.value), 1)

  return (
    <div className="table-percent-chart" style={{ height }}>
      <div className="table-percent-chart__wrap">
        {points.map((p) => (
          <div key={p.label} className="table-percent-chart__col">
            <div className="table-percent-chart__bar" style={{ height: `${(p.value / max) * 100}%` }} title={`${p.label}: ${p.value}%`} />
            <div className="table-percent-chart__label">{p.label}</div>
            <div className="table-percent-chart__value">{p.value}%</div>
          </div>
        ))}
      </div>
    </div>
  )
}
