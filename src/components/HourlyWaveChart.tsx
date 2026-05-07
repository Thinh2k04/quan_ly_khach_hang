import type { ReportPoint } from '../utils/reportData'

type HourlyWaveChartProps = {
  points: ReportPoint[]
}

function buildPolylinePoints(points: ReportPoint[], width: number, height: number) {
  const maxValue = Math.max(...points.map((item) => item.value), 1)
  const paddingX = 16
  const paddingY = 18
  const chartWidth = width - paddingX * 2
  const chartHeight = height - paddingY * 2

  return points
    .map((point, index) => {
      const x = paddingX + (chartWidth * index) / (points.length - 1 || 1)
      const y = paddingY + chartHeight - (point.value / maxValue) * chartHeight
      return `${x},${y}`
    })
    .join(' ')
}

function buildAreaPath(points: ReportPoint[], width: number, height: number) {
  const maxValue = Math.max(...points.map((item) => item.value), 1)
  const paddingX = 16
  const paddingY = 18
  const chartWidth = width - paddingX * 2
  const chartHeight = height - paddingY * 2

  if (points.length === 0) {
    return ''
  }

  const startX = paddingX
  const endX = paddingX + chartWidth
  const bottomY = paddingY + chartHeight

  const pointList = points.map((point, index) => {
    const x = paddingX + (chartWidth * index) / (points.length - 1 || 1)
    const y = paddingY + chartHeight - (point.value / maxValue) * chartHeight
    return { x, y }
  })

  return [
    `M ${startX} ${bottomY}`,
    `L ${pointList[0].x} ${pointList[0].y}`,
    ...pointList.slice(1).map((point) => `L ${point.x} ${point.y}`),
    `L ${endX} ${bottomY}`,
    'Z',
  ].join(' ')
}

export default function HourlyWaveChart({ points }: HourlyWaveChartProps) {
  const width = 960
  const height = 220
  const polylinePoints = buildPolylinePoints(points, width, height)
  const areaPath = buildAreaPath(points, width, height)

  return (
    <div className="wave-chart">
      <svg className="wave-chart__svg" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Biểu đồ sóng theo giờ">
        <defs>
          <linearGradient id="waveFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.04" />
          </linearGradient>
          <linearGradient id="waveStroke" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="50%" stopColor="#0ea5e9" />
            <stop offset="100%" stopColor="#38bdf8" />
          </linearGradient>
        </defs>

        <rect x="0" y="0" width={width} height={height} rx="22" fill="rgba(15, 23, 42, 0.75)" />
        <path d={areaPath} fill="url(#waveFill)" />
        <polyline
          points={polylinePoints}
          fill="none"
          stroke="url(#waveStroke)"
          strokeWidth="4"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {points.map((point, index) => {
          const x = 16 + ((width - 32) * index) / (points.length - 1 || 1)
          const maxValue = Math.max(...points.map((item) => item.value), 1)
          const y = 18 + (height - 36) - (point.value / maxValue) * (height - 36)

          return (
            <g key={point.label}>
              <circle cx={x} cy={y} r="4.5" fill="#e0f2fe" />
              <circle cx={x} cy={y} r="9" fill="rgba(14, 165, 233, 0.15)" />
            </g>
          )
        })}
      </svg>

      <div className="wave-chart__axis" aria-hidden="true">
        {points.map((point) => (
          <span key={point.label}>{point.label}</span>
        ))}
      </div>
    </div>
  )
}