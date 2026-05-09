type Series = { name: string; values: number[] }

type GroupedColumnChartProps = {
  categories: string[]
  series: Series[]
  height?: number
  caption?: string
}

export default function GroupedColumnChart({ categories, series, height = 240, caption }: GroupedColumnChartProps) {
  if (!categories.length || !series.length) return <div className="grouped-chart empty">Không có dữ liệu.</div>

  const groups = categories.length
  const seriesCount = series.length
  const max = Math.max(...series.flatMap((s) => s.values), 1)
  const leftMargin = 56
  const topMargin = 12
  const bottomMargin = 80
  const chartH = Math.max(40, height - topMargin - bottomMargin)
  const barWidthBase = seriesCount === 1 ? 28 : 20
  const gapBase = seriesCount === 1 ? 12 : 6
  const groupGap = 24

  const width = Math.max(600, leftMargin + groups * (seriesCount * (barWidthBase + gapBase) + groupGap))

  // compute totals per category to render percentages
  const totals = categories.map((_, gi) => series.reduce((acc, s) => acc + (s.values[gi] ?? 0), 0))

  const palette = ['#2563eb', '#ef4444', '#06b6d4', '#10b981', '#f59e0b', '#8b5cf6', '#ef6aa7', '#14b8a6']

  const ticks = 4
  const tickValues = Array.from({ length: ticks + 1 }, (_, i) => Math.round((i * max) / ticks))

  return (
    <div className="grouped-chart" style={{ height }}>
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet" style={{ width: '100%', height: '100%' }}>
        <g transform={`translate(0,${topMargin})`}>
          {/* y-axis ticks and labels */}
          {tickValues.map((tv, i) => {
            const y = (chartH * (ticks - i)) / ticks
            return (
              <g key={i}>
                <line x1={leftMargin - 6} x2={width - 12} y1={y} y2={y} stroke="#e6eef8" strokeWidth={1} />
                <text x={leftMargin - 12} y={y + 4} fontSize={11} textAnchor="end" fill="#475569">{tv}</text>
              </g>
            )
          })}

          <g transform={`translate(${leftMargin},0)`}>{/* chart area */}
            {categories.map((cat, gi) => {
              const groupX = gi * (seriesCount * (barWidthBase + gapBase) + groupGap)
              return (
                <g key={cat}>
                  {series.map((s, si) => {
                    const barWidth = barWidthBase
                    const gap = gapBase
                    const x = groupX + si * (barWidth + gap)
                    const v = s.values[gi] ?? 0
                    const h = (v / max) * chartH
                    const y = chartH - h
                    const color = palette[si % palette.length]
                    const total = totals[gi] || 0
                    const pct = total ? Math.round((v / total) * 100) : 0
                    return (
                      <g key={s.name}>
                        <rect x={x} y={y} width={barWidth} height={h} fill={color} rx={4} />
                        <text x={x + barWidth / 2} y={y - 6} fontSize={11} textAnchor="middle" fill="#0f172a">{v}</text>
                        <text x={x + barWidth / 2} y={y - 18} fontSize={10} textAnchor="middle" fill="#475569">{pct}%</text>
                        <text
                          x={x + barWidth / 2}
                          y={chartH + 16}
                          fontSize={9}
                          textAnchor="middle"
                          fill="#475569"
                          transform={`rotate(-35 ${x + barWidth / 2} ${chartH + 16})`}
                        >
                          {s.name}
                        </text>
                      </g>
                    )
                  })}
                  <text x={groupX + (seriesCount * (barWidthBase + gapBase) - gapBase) / 2} y={chartH + 46} fontSize={12} textAnchor="middle" fill="#475569">{cat}</text>
                </g>
              )
            })}
          </g>
        </g>
      </svg>

      {caption ? (
        <div style={{ textAlign: 'center', marginTop: 8, color: '#475569', fontSize: 13 }}>{caption}</div>
      ) : null}
    </div>
  )
}
