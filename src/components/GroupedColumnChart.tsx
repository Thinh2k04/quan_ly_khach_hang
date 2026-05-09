type Series = { name: string; values: number[] }

type GroupedColumnChartProps = {
  categories: string[]
  series: Series[]
  height?: number
  caption?: string
  compact?: boolean
}

export default function GroupedColumnChart({ categories, series, height = 240, caption, compact = false }: GroupedColumnChartProps) {
  if (!categories.length || !series.length) return <div className="grouped-chart empty">Không có dữ liệu.</div>

  const groups = categories.length
  const seriesCount = series.length
  const max = Math.max(...series.flatMap((s) => s.values), 1)
  const leftMargin = compact ? 52 : 64
  const topMargin = compact ? 12 : 18
  const bottomMargin = compact ? 68 : 92
  const chartH = Math.max(40, height - topMargin - bottomMargin)
  const barWidthBase = seriesCount === 1 ? (compact ? 30 : 34) : (compact ? 20 : 26)
  const gapBase = seriesCount === 1 ? (compact ? 10 : 14) : (compact ? 5 : 8)
  const groupGap = compact ? 22 : 32

  const width = Math.max(compact ? 320 : 360, leftMargin + groups * (seriesCount * (barWidthBase + gapBase) + groupGap))

  // compute totals per category to render percentages
  const totals = categories.map((_, gi) => series.reduce((acc, s) => acc + (s.values[gi] ?? 0), 0))

  const palette = ['#2563eb', '#ef4444', '#06b6d4', '#10b981', '#f59e0b', '#8b5cf6', '#ef6aa7', '#14b8a6']

  const ticks = 4
  const tickValues = Array.from({ length: ticks + 1 }, (_, i) => Math.round((i * max) / ticks))

  const valueFontSize = compact ? 7 : 11
  const percentFontSize = compact ? 6 : 10
  const seriesLabelFontSize = compact ? 6 : 9
  const categoryLabelFontSize = compact ? 8 : 12

  return (
    <div className="grouped-chart" style={{ minHeight: height, overflowX: 'auto', overflowY: 'hidden' }}>
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet" style={{ width: '100%', minWidth: width, height: '100%', display: 'block' }}>
        <g transform={`translate(0,${topMargin})`}>
          {/* y-axis ticks and labels */}
          {tickValues.map((tv, i) => {
            const y = (chartH * (ticks - i)) / ticks
            return (
              <g key={i}>
                <line x1={leftMargin - 6} x2={width - 12} y1={y} y2={y} stroke="#e6eef8" strokeWidth={1} />
                <text x={leftMargin - 12} y={y + 4} fontSize={compact ? 8 : 11} textAnchor="end" fill="#475569">{tv}</text>
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
                        <text x={x + barWidth / 2} y={y - 6} fontSize={valueFontSize} textAnchor="middle" fill="#0f172a">{v}</text>
                        <text x={x + barWidth / 2} y={y - 18} fontSize={percentFontSize} textAnchor="middle" fill="#475569">{pct}%</text>
                        <text
                          x={x + barWidth / 2}
                          y={chartH + 16}
                          fontSize={seriesLabelFontSize}
                          textAnchor="middle"
                          fill="#475569"
                          transform={`rotate(-28 ${x + barWidth / 2} ${chartH + 16})`}
                        >
                          {s.name}
                        </text>
                      </g>
                    )
                  })}
                  <text x={groupX + (seriesCount * (barWidthBase + gapBase) - gapBase) / 2} y={chartH + 42} fontSize={categoryLabelFontSize} textAnchor="middle" fill="#475569">{cat}</text>
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
