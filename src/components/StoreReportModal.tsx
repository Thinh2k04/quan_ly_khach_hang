import { useMemo, useRef, useState } from 'react'
import type { Store } from '../api'
import PieChart from './PieChart'
import GroupedColumnChart from './GroupedColumnChart'

type StoreReportModalProps = {
  stores: Store[]
  isOpen: boolean
  onClose: () => void
  canExport: boolean
}

type DateFilterMode = 'day' | 'week' | 'month'

type ReportPoint = {
  label: string
  value: number
}

type StorePercentRow = {
  creator: string
  total: number
  coTrenDms: string
  coKeAcbt: string
  traThuongTb: string
  hangDoiThuKe: string
  keLays: string
  keOishi: string
  kePoca: string
  keKhac: string
  viAcbt: string
  hangDoiThuVi: string
  viLays: string
  viOishi: string
  viPoca: string
  viKhac: string
  chanGaAcbt: string
  chanGaDoiThu: string
  bimKhoAcbt: string
  bimKhoLays: string
  bimKhoOishi: string
  bimKhoPoca: string
  bimKhoKhac: string
  bimUotAcbt: string
  bimUotDoiThu: string
}

function getCreatorLabel(store: Store): string {
  const value =
    store['NguoiTao'] ??
    store['nguoi_tao'] ??
    store['NguoiThucHien'] ??
    store['TenNguoiThucHien'] ??
    store['ten_nguoi_thuc_hien']

  if (typeof value === 'string' && value.trim()) {
    return value.trim()
  }

  return 'Chưa rõ'
}

function getRawDate(store: Store): string | null {
  const rawDate =
    store['ngay_tao'] ??
    store['NgayTao'] ??
    store['created_at'] ??
    store['CreatedAt'] ??
    store['ngayTao']

  if (typeof rawDate === 'string' && rawDate.trim()) {
    return rawDate.trim()
  }

  return null
}

function getStoreDateKey(store: Store): string {
  const rawDate = getRawDate(store)
  if (!rawDate) {
    return ''
  }

  // Parse and convert to VN timezone (UTC+7)
  const date = new Date(rawDate)
  if (Number.isNaN(date.getTime())) {
    return ''
  }

  // Convert UTC to VN timezone (UTC+7)
  const vnDate = new Date(date.getTime() + 7 * 60 * 60 * 1000)

  const year = vnDate.getUTCFullYear()
  const month = String(vnDate.getUTCMonth() + 1).padStart(2, '0')
  const day = String(vnDate.getUTCDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function getStoreCreatedAt(store: Store): string {
  const rawDate = getRawDate(store)
  if (!rawDate) {
    return 'Chưa có'
  }

  const value = rawDate
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/.exec(value)
  
  if (isoMatch) {
    const [, yearStr, monthStr, dayStr, hourStr, minuteStr] = isoMatch
    
    // Parse as UTC and convert to VN timezone
    const date = new Date(`${yearStr}-${monthStr}-${dayStr}T${hourStr}:${minuteStr}:00Z`)
    const vnDate = new Date(date.getTime() + 7 * 60 * 60 * 1000)
    
    const vnYear = vnDate.getUTCFullYear()
    const vnMonth = vnDate.getUTCMonth() + 1
    const vnDay = vnDate.getUTCDate()
    const vnHour = String(vnDate.getUTCHours()).padStart(2, '0')
    const vnMinute = String(vnDate.getUTCMinutes()).padStart(2, '0')
    
    return `${vnHour}:${vnMinute} ${vnDay} thg ${vnMonth}, ${vnYear}`
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function getWeekKey(dateKey: string): string {
  if (!dateKey) {
    return ''
  }

  const [yearStr, monthStr, dayStr] = dateKey.split('-')
  const year = Number(yearStr)
  const month = Number(monthStr)
  const day = Number(dayStr)

  if (!year || !month || !day) {
    return ''
  }

  const date = new Date(year, month - 1, day)
  const tempDate = new Date(date.getTime())
  const dayNum = (date.getDay() + 6) % 7
  tempDate.setDate(tempDate.getDate() - dayNum + 3)
  const firstThursday = new Date(tempDate.getFullYear(), 0, 4)
  const firstDayNum = (firstThursday.getDay() + 6) % 7
  firstThursday.setDate(firstThursday.getDate() - firstDayNum + 3)
  const weekNo = 1 + Math.round((tempDate.getTime() - firstThursday.getTime()) / 604800000)
  return `${tempDate.getFullYear()}-W${String(weekNo).padStart(2, '0')}`
}

function formatPercent(value: number, total: number): string {
  if (!total) {
    return '0%'
  }

  return `${Math.round((value / total) * 100)}%`
}

function countTruthy(stores: Store[], field: keyof Store): number {
  return stores.filter((store) => Boolean(store[field])).length
}

function ReportBars({
  title,
  items,
  barClassName,
}: {
  title: string
  items: ReportPoint[]
  barClassName: string
}) {
  const maxValue = Math.max(...items.map((item) => item.value), 1)

  return (
    <section className="report-card">
      <h3>{title}</h3>
      {items.length === 0 ? (
        <p className="report-empty">Chưa có dữ liệu để hiển thị.</p>
      ) : (
        <div className="report-chart-list">
          {items.map((item) => (
            <div className="report-chart-row" key={item.label}>
              <span>{item.label}</span>
              <div className="report-bar-track">
                <div className={barClassName} style={{ width: `${(item.value / maxValue) * 100}%` }} />
              </div>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

export default function StoreReportModal({ stores, isOpen, onClose, canExport }: StoreReportModalProps) {
  const [creatorFilter, setCreatorFilter] = useState('')
  const [chartCreatorFilter, setChartCreatorFilter] = useState('')
  const [dateFilterMode, setDateFilterMode] = useState<DateFilterMode>('day')
  const [dateFilterValue, setDateFilterValue] = useState('')
  const [dmsFilter, setDmsFilter] = useState<'all' | 'co' | 'chua'>('all')
  const dragScrollRef = useRef({ isDragging: false, startX: 0, startScrollLeft: 0 })

  const creatorOptions = useMemo(() => {
    return Array.from(new Set(stores.map(getCreatorLabel))).sort((a, b) => a.localeCompare(b))
  }, [stores])

  const filteredStores = useMemo(() => {
    return stores.filter((store) => {
      const matchesCreator = !creatorFilter || getCreatorLabel(store) === creatorFilter
      const dateKey = getStoreDateKey(store)
      const matchesDate = !dateFilterValue || (() => {
        if (!dateKey) {
          return false
        }

        if (dateFilterMode === 'day') {
          return dateKey === dateFilterValue
        }

        if (dateFilterMode === 'week') {
          return getWeekKey(dateKey) === dateFilterValue
        }

        return dateKey.slice(0, 7) === dateFilterValue
      })()

      const isOnDms = Boolean(store.CoTrenDMS)
      const matchesDms = dmsFilter === 'all' || (dmsFilter === 'co' && isOnDms) || (dmsFilter === 'chua' && !isOnDms)

      return matchesCreator && matchesDate && matchesDms
    })
  }, [creatorFilter, dateFilterMode, dateFilterValue, dmsFilter, stores])

  const byCreator = useMemo(() => {
    const map = new Map<string, number>()

    filteredStores.forEach((store) => {
      const creator = getCreatorLabel(store)
      map.set(creator, (map.get(creator) ?? 0) + 1)
    })

    return Array.from(map.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)
  }, [filteredStores])

  const byProvince = useMemo(() => {
    const map = new Map<string, number>()

    filteredStores.forEach((store) => {
      const province = typeof store.Tinh === 'string' && store.Tinh.trim() ? store.Tinh.trim() : 'Chưa rõ'
      map.set(province, (map.get(province) ?? 0) + 1)
    })

    return Array.from(map.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)
  }, [filteredStores])

  const hasCompetitor = filteredStores.filter((store) => Boolean(store.CoHangDoiThuKhong)).length
  const hasACBTRack = filteredStores.filter((store) => Boolean(store.CoKeACBT)).length

  const percentRows = useMemo<StorePercentRow[]>(() => {
    const buckets = new Map<string, Store[]>()

    filteredStores.forEach((store) => {
      const creator = getCreatorLabel(store)
      const current = buckets.get(creator) ?? []
      current.push(store)
      buckets.set(creator, current)
    })

    return Array.from(buckets.entries())
      .map(([creator, creatorStores]) => {
        const total = creatorStores.length
        const dmsCount = countTruthy(creatorStores, 'CoTrenDMS')
        const keAcbtCount = countTruthy(creatorStores, 'CoKeACBT')
        const traThuongCount = countTruthy(creatorStores, 'TraThuongTB')
        const doiThuKeCount = countTruthy(creatorStores, 'CoHangDoiThuKhong')
        const keLaysCount = countTruthy(creatorStores, 'DoiThuLays')
        const keOishiCount = countTruthy(creatorStores, 'DoiThuOishi')
        const kePocaCount = countTruthy(creatorStores, 'DoiThuPoca')
        const keKhacCount = countTruthy(creatorStores, 'DoiThuKhac')
        const viAcbtCount = countTruthy(creatorStores, 'CoViACBT')
        const doiThuViCount = countTruthy(creatorStores, 'CoHangDoiThuVi')
        const viLaysCount = countTruthy(creatorStores, 'ViDoiThuLays')
        const viOishiCount = countTruthy(creatorStores, 'ViDoiThuOishi')
        const viPocaCount = countTruthy(creatorStores, 'ViDoiThuPoca')
        const viKhacCount = countTruthy(creatorStores, 'ViDoiThuKhac')
        const chanGaAcbtCount = countTruthy(creatorStores, 'ChanGaACBT')
        const chanGaDoiThuCount = countTruthy(creatorStores, 'ChanGaDoiThu')
        const bimKhoAcbtCount = countTruthy(creatorStores, 'BimKhoACBT')
        const bimKhoLaysCount = countTruthy(creatorStores, 'BimKhoDoiThuLays')
        const bimKhoOishiCount = countTruthy(creatorStores, 'BimKhoDoiThuOishi')
        const bimKhoPocaCount = countTruthy(creatorStores, 'BimKhoDoiThuPoca')
        const bimKhoKhacCount = countTruthy(creatorStores, 'BimKhoDoiThuKhac')
        const bimUotAcbtCount = countTruthy(creatorStores, 'BimUotACBT')
        const bimUotDoiThuCount = countTruthy(creatorStores, 'BimUotDoiThu')

        return {
          creator,
          total,
          coTrenDms: `${dmsCount} (${formatPercent(dmsCount, total)})`,
          coKeAcbt: `${keAcbtCount} (${formatPercent(keAcbtCount, total)})`,
          traThuongTb: `${traThuongCount} (${formatPercent(traThuongCount, total)})`,
          hangDoiThuKe: `${doiThuKeCount} (${formatPercent(doiThuKeCount, total)})`,
          keLays: `${keLaysCount} (${formatPercent(keLaysCount, total)})`,
          keOishi: `${keOishiCount} (${formatPercent(keOishiCount, total)})`,
          kePoca: `${kePocaCount} (${formatPercent(kePocaCount, total)})`,
          keKhac: `${keKhacCount} (${formatPercent(keKhacCount, total)})`,
          viAcbt: `${viAcbtCount} (${formatPercent(viAcbtCount, total)})`,
          hangDoiThuVi: `${doiThuViCount} (${formatPercent(doiThuViCount, total)})`,
          viLays: `${viLaysCount} (${formatPercent(viLaysCount, total)})`,
          viOishi: `${viOishiCount} (${formatPercent(viOishiCount, total)})`,
          viPoca: `${viPocaCount} (${formatPercent(viPocaCount, total)})`,
          viKhac: `${viKhacCount} (${formatPercent(viKhacCount, total)})`,
          chanGaAcbt: `${chanGaAcbtCount} (${formatPercent(chanGaAcbtCount, total)})`,
          chanGaDoiThu: `${chanGaDoiThuCount} (${formatPercent(chanGaDoiThuCount, total)})`,
          bimKhoAcbt: `${bimKhoAcbtCount} (${formatPercent(bimKhoAcbtCount, total)})`,
          bimKhoLays: `${bimKhoLaysCount} (${formatPercent(bimKhoLaysCount, total)})`,
          bimKhoOishi: `${bimKhoOishiCount} (${formatPercent(bimKhoOishiCount, total)})`,
          bimKhoPoca: `${bimKhoPocaCount} (${formatPercent(bimKhoPocaCount, total)})`,
          bimKhoKhac: `${bimKhoKhacCount} (${formatPercent(bimKhoKhacCount, total)})`,
          bimUotAcbt: `${bimUotAcbtCount} (${formatPercent(bimUotAcbtCount, total)})`,
          bimUotDoiThu: `${bimUotDoiThuCount} (${formatPercent(bimUotDoiThuCount, total)})`,
        }
      })
      .sort((a, b) => b.total - a.total)
  }, [filteredStores])

  const chartRows = useMemo(() => {
    if (!chartCreatorFilter) {
      return percentRows
    }

    return percentRows.filter((row) => row.creator === chartCreatorFilter)
  }, [chartCreatorFilter, percentRows])

  const onTablePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const container = event.currentTarget
    dragScrollRef.current = {
      isDragging: true,
      startX: event.clientX,
      startScrollLeft: container.scrollLeft,
    }
    container.classList.add('is-grabbing')
    container.setPointerCapture(event.pointerId)
  }

  const onTablePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const container = event.currentTarget

    if (!dragScrollRef.current.isDragging) {
      return
    }

    const delta = event.clientX - dragScrollRef.current.startX
    container.scrollLeft = dragScrollRef.current.startScrollLeft - delta
  }

  const onTablePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const container = event.currentTarget
    dragScrollRef.current.isDragging = false
    container.classList.remove('is-grabbing')

    if (container.hasPointerCapture(event.pointerId)) {
      container.releasePointerCapture(event.pointerId)
    }
  }

  const exportReportExcel = () => {
    if (percentRows.length === 0) return

    type MetricKey = keyof Omit<StorePercentRow, 'creator' | 'total'>

    const metricGroups: Array<{ title: string; items: Array<{ key: MetricKey; label: string }> }> = [
      {
        title: 'Kệ Trưng Bày',
        items: [
          { key: 'coKeAcbt', label: 'Có kệ' },
          { key: 'traThuongTb', label: 'Trả thưởng TB' },
          { key: 'hangDoiThuKe', label: 'Có hàng đối thủ' },
          { key: 'keLays', label: "Lay\'s" },
          { key: 'keOishi', label: 'Oishi' },
          { key: 'kePoca', label: 'Poca' },
          { key: 'keKhac', label: 'Khác' },
        ],
      },
      {
        title: 'Vỉ Treo',
        items: [
          { key: 'viAcbt', label: 'Có vỉ' },
          { key: 'hangDoiThuVi', label: 'Có hàng đối thủ' },
          { key: 'viLays', label: "Lay\'s" },
          { key: 'viOishi', label: 'Oishi' },
          { key: 'viPoca', label: 'Poca' },
          { key: 'viKhac', label: 'Khác' },
        ],
      },
      {
        title: 'Bảo Phủ',
        items: [
          { key: 'chanGaAcbt', label: 'Chân Gà ACBT' },
          { key: 'chanGaDoiThu', label: 'Chân Gà Đối Thủ' },
          { key: 'bimKhoAcbt', label: 'Bim ACBT' },
          { key: 'bimKhoLays', label: "Lay\'s" },
          { key: 'bimKhoOishi', label: 'Oishi' },
          { key: 'bimKhoPoca', label: 'Poca' },
          { key: 'bimKhoKhac', label: 'Khác' },
          { key: 'bimUotAcbt', label: 'Bim Ướt ACBT' },
          { key: 'bimUotDoiThu', label: 'Bim Ướt Đối Thủ' },
        ],
      },
    ]

    const flatMetrics = metricGroups.flatMap((group) => group.items)
    const totalSurvey = percentRows.reduce((sum, row) => sum + row.total, 0)

    function extractCount(text: string): number {
      const match = /^\s*(\d+)\b/.exec(String(text))
      return match ? Number(match[1]) : 0
    }

    function extractPercent(text: string): string {
      const match = /\((\d+%)\)/.exec(String(text))
      return match ? match[1] : '0%'
    }

    function renderCell(value: string | number, className = '') {
      return `<td class="${className}">${value}</td>`
    }

    const headerTop = `
      <tr>
        <th rowspan="3" class="sticky-col">Tên người thực hiện</th>
        <th rowspan="3">Tổng số CH<br/>Khảo sát</th>
        <th rowspan="3">Có trên<br/>DMS</th>
        <th colspan="7">Kệ Trưng Bày</th>
        <th colspan="6">Vỉ Treo</th>
        <th colspan="9">Bảo Phủ</th>
      </tr>`

    const headerMid = `
      <tr>
        <th colspan="3">ACBT</th>
        <th colspan="4">Đối thủ</th>
        <th colspan="2">ACBT</th>
        <th colspan="4">Đối thủ</th>
        <th colspan="2">Chân Gà</th>
        <th colspan="5">Bim Khô</th>
        <th colspan="2">Bim Ướt</th>
      </tr>`

    const headerBottom = `
      <tr>
        ${flatMetrics
          .map((metric) => `<th>${metric.label}</th>`)
          .join('')}
      </tr>`

    const bodyRows = percentRows
      .map((row) => {
        const countCells = flatMetrics.map((metric) => renderCell(extractCount(String(row[metric.key])))).join('')
        const percentCells = flatMetrics.map((metric) => renderCell(extractPercent(String(row[metric.key])))).join('')

        const surveyCell = `<td class="survey-cell" rowspan="2">${row.total}</td>`
        const creatorCell = `<td class="creator-cell" rowspan="2">${row.creator}</td>`

        return `
          <tr class="count-row">
            ${creatorCell}
            ${surveyCell}
            ${renderCell(extractCount(String(row.coTrenDms)), 'count-primary')}
            ${countCells}
          </tr>
          <tr class="percent-row">
            ${renderCell(extractPercent(String(row.coTrenDms)), 'percent-primary')}
            ${percentCells}
          </tr>`
      })
      .join('')

    const totalMetrics = {
      coTrenDms: 0,
      coKeAcbt: 0,
      traThuongTb: 0,
      hangDoiThuKe: 0,
      keLays: 0,
      keOishi: 0,
      kePoca: 0,
      keKhac: 0,
      viAcbt: 0,
      hangDoiThuVi: 0,
      viLays: 0,
      viOishi: 0,
      viPoca: 0,
      viKhac: 0,
      chanGaAcbt: 0,
      chanGaDoiThu: 0,
      bimKhoAcbt: 0,
      bimKhoLays: 0,
      bimKhoOishi: 0,
      bimKhoPoca: 0,
      bimKhoKhac: 0,
      bimUotAcbt: 0,
      bimUotDoiThu: 0,
    }

    percentRows.forEach((row) => {
      totalMetrics.coTrenDms += extractCount(row.coTrenDms)
      totalMetrics.coKeAcbt += extractCount(row.coKeAcbt)
      totalMetrics.traThuongTb += extractCount(row.traThuongTb)
      totalMetrics.hangDoiThuKe += extractCount(row.hangDoiThuKe)
      totalMetrics.keLays += extractCount(row.keLays)
      totalMetrics.keOishi += extractCount(row.keOishi)
      totalMetrics.kePoca += extractCount(row.kePoca)
      totalMetrics.keKhac += extractCount(row.keKhac)
      totalMetrics.viAcbt += extractCount(row.viAcbt)
      totalMetrics.hangDoiThuVi += extractCount(row.hangDoiThuVi)
      totalMetrics.viLays += extractCount(row.viLays)
      totalMetrics.viOishi += extractCount(row.viOishi)
      totalMetrics.viPoca += extractCount(row.viPoca)
      totalMetrics.viKhac += extractCount(row.viKhac)
      totalMetrics.chanGaAcbt += extractCount(row.chanGaAcbt)
      totalMetrics.chanGaDoiThu += extractCount(row.chanGaDoiThu)
      totalMetrics.bimKhoAcbt += extractCount(row.bimKhoAcbt)
      totalMetrics.bimKhoLays += extractCount(row.bimKhoLays)
      totalMetrics.bimKhoOishi += extractCount(row.bimKhoOishi)
      totalMetrics.bimKhoPoca += extractCount(row.bimKhoPoca)
      totalMetrics.bimKhoKhac += extractCount(row.bimKhoKhac)
      totalMetrics.bimUotAcbt += extractCount(row.bimUotAcbt)
      totalMetrics.bimUotDoiThu += extractCount(row.bimUotDoiThu)
    })

    const totalPercent = (value: number) => (totalSurvey ? `${Math.round((value / totalSurvey) * 100)}%` : '0%')

    const totalRowCounts = `
      <tr class="total-row count-row">
        <td class="creator-cell total-label">Tổng</td>
        <td class="survey-cell total-value">${totalSurvey}</td>
        <td class="count-primary total-value">${totalMetrics.coTrenDms}</td>
        ${flatMetrics.map((metric) => renderCell(totalMetrics[metric.key], 'total-value')).join('')}
      </tr>`

    const totalRowPercents = `
      <tr class="total-row percent-row">
        <td class="creator-cell total-label"></td>
        <td class="survey-cell total-value"></td>
        <td class="percent-primary total-value">${totalPercent(totalMetrics.coTrenDms)}</td>
        ${flatMetrics.map((metric) => renderCell(totalPercent(totalMetrics[metric.key]), 'total-value')).join('')}
      </tr>`

    const filterSummary = `
      <tr><td colspan="25" class="meta-row">Bộ lọc DMS: ${dmsFilter === 'co' ? 'Có trên DMS' : dmsFilter === 'chua' ? 'Chưa có trên DMS' : 'Tất cả'}</td></tr>
      <tr><td colspan="25" class="meta-row">Người tạo: ${chartCreatorFilter || creatorFilter || 'Tất cả'}</td></tr>
      <tr><td colspan="25" class="meta-row">Khoảng thời gian: ${
        dateFilterValue
          ? dateFilterMode === 'day'
            ? `Ngày ${dateFilterValue}`
            : dateFilterMode === 'week'
              ? `Tuần ${dateFilterValue}`
              : `Tháng ${dateFilterValue}`
          : 'Tất cả'
      }</td></tr>`

    const html = `<!doctype html>
    <html>
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
        <style>
          @page { size: landscape; margin: 12mm; }
          body { font-family: Calibri, Arial, sans-serif; background: #fff; color: #111827; }
          table { border-collapse: collapse; width: 100%; table-layout: fixed; }
          th, td { border: 1px solid #0f172a; text-align: center; vertical-align: middle; padding: 4px 6px; word-wrap: break-word; }
          th { background: #0b6fb7; color: #fff; font-weight: 700; }
          .meta-row { text-align: left; font-size: 12px; background: #f8fafc; font-style: italic; }
          .creator-cell { text-align: left; font-weight: 700; }
          .sticky-col { min-width: 160px; }
          .survey-cell { min-width: 90px; }
          .count-primary { font-weight: 700; }
          .percent-primary { color: #2563eb; }
          .count-row td { height: 28px; }
          .percent-row td { height: 26px; font-size: 12px; color: #0f172a; }
          .total-row td { font-weight: 700; color: #dc2626; }
          .total-label { text-align: left; }
          .total-value { color: #dc2626; }
          .sheet-title { text-align: center; font-size: 18px; font-weight: 700; margin-bottom: 8px; }
          .sheet-subtitle { text-align: center; font-size: 12px; margin-bottom: 10px; color: #475569; }
        </style>
      </head>
      <body>
        <div class="sheet-title">BÁO CÁO THỰC ĐỊA</div>
        <div class="sheet-subtitle">Xuất dữ liệu theo bảng báo cáo thực địa</div>
        <table>
          ${filterSummary}
          ${headerTop}
          ${headerMid}
          ${headerBottom}
          ${bodyRows}
          ${totalRowCounts}
          ${totalRowPercents}
        </table>
      </body>
    </html>`

    const blob = new Blob(['\uFEFF' + html], { type: 'application/vnd.ms-excel;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `bao_cao_thuc_dia_${Date.now()}.xls`
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportStoresToCsv = () => {
    if (filteredStores.length === 0) return

    const escapeHtml = (value: string) =>
      value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')

    const filterSummary = [
      `Bộ lọc DMS: ${dmsFilter === 'co' ? 'Có trên DMS' : dmsFilter === 'chua' ? 'Chưa có trên DMS' : 'Tất cả'}`,
      `Người tạo: ${creatorFilter || 'Tất cả'}`,
      `Khoảng thời gian: ${
        dateFilterValue
          ? dateFilterMode === 'day'
            ? `Ngày ${dateFilterValue}`
            : dateFilterMode === 'week'
              ? `Tuần ${dateFilterValue}`
              : `Tháng ${dateFilterValue}`
          : 'Tất cả'
      }`,
      `Tổng cửa hàng xuất: ${filteredStores.length}`,
    ]

    const rows = filteredStores.map((store, index) => {
      const storeCode = store.MaCH ?? store['ma_ch'] ?? store['MaCH'] ?? ''
      const storeName = store.TenCH ?? store['ten_ch'] ?? store['TenCH'] ?? ''
      const creator = getCreatorLabel(store)
      const createdAt = getStoreCreatedAt(store)
      const onDms = store.CoTrenDMS ? 'Có' : 'Chưa có'

      return `
        <tr class="${index % 2 === 0 ? 'even-row' : 'odd-row'}">
          <td class="code-cell">${escapeHtml(String(storeCode))}</td>
          <td class="name-cell">${escapeHtml(String(storeName))}</td>
          <td class="creator-cell">${escapeHtml(String(creator))}</td>
          <td class="date-cell">${escapeHtml(String(createdAt))}</td>
          <td class="dms-cell ${store.CoTrenDMS ? 'yes' : 'no'}">${onDms}</td>
        </tr>`
    })

    const html = `<!doctype html>
    <html>
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
        <style>
          @page { size: landscape; margin: 12mm; }
          body { font-family: Calibri, Arial, sans-serif; background: #ffffff; color: #111827; }
          .sheet-title { font-size: 20px; font-weight: 700; text-align: center; color: #0f172a; margin: 0 0 4px; }
          .sheet-subtitle { font-size: 12px; text-align: center; color: #64748b; margin: 0 0 12px; }
          .meta { display: grid; grid-template-columns: 1fr; gap: 4px; margin: 0 0 12px; }
          .meta-item { font-size: 12px; color: #334155; padding: 4px 8px; background: #f8fafc; border: 1px solid #cbd5e1; }
          table { width: 100%; border-collapse: collapse; table-layout: fixed; }
          th, td { border: 1px solid #1e3a5f; padding: 6px 8px; font-size: 12px; }
          th { background: #0b6fb7; color: #fff; font-weight: 700; text-align: center; }
          td { background: #fff; }
          .even-row td { background: #f8fbff; }
          .odd-row td { background: #ffffff; }
          .code-cell { width: 90px; text-align: center; }
          .name-cell { width: 240px; text-align: left; }
          .creator-cell { width: 160px; text-align: left; }
          .date-cell { width: 160px; text-align: center; }
          .dms-cell { width: 100px; text-align: center; font-weight: 700; }
          .dms-cell.yes { color: #0f766e; }
          .dms-cell.no { color: #b91c1c; }
          .table-title { margin: 14px 0 6px; font-size: 14px; font-weight: 700; color: #0f172a; }
        </style>
      </head>
      <body>
        <div class="sheet-title">DANH SÁCH CỬA HÀNG</div>
        <div class="sheet-subtitle">Xuất dữ liệu CH theo bộ lọc hiện tại</div>
        <div class="meta">
          ${filterSummary.map((item) => `<div class="meta-item">${escapeHtml(item)}</div>`).join('')}
        </div>
        <div class="table-title">Bảng dữ liệu cửa hàng</div>
        <table>
          <thead>
            <tr>
              <th>Mã CH</th>
              <th>Tên CH</th>
              <th>Người tạo</th>
              <th>Ngày tạo</th>
              <th>Có trên DMS</th>
            </tr>
          </thead>
          <tbody>
            ${rows.join('')}
          </tbody>
        </table>
      </body>
    </html>`

    const blob = new Blob(['\uFEFF' + html], { type: 'application/vnd.ms-excel;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `danh_sach_cua_hang_${Date.now()}.xls`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!isOpen) {
    return null
  }

  return (
    <div className="modal-overlay" role="presentation" onClick={onClose}>
      <div
        className="modal report-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="store-report-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal__header">
          <div>
            <p className="eyebrow">Báo cáo thực địa</p>
            <h2 id="store-report-title">Tổng quan cửa hàng</h2>
          </div>
          <button className="close-button" type="button" onClick={onClose}>
            Đóng
          </button>
        </div>

        <section className="toolbar store-report-toolbar">
          <div className="toolbar__filters">
            <label className="combo-box" htmlFor="store-report-creator">
              <span>Người tạo</span>
              <select
                id="store-report-creator"
                value={creatorFilter}
                onChange={(event) => setCreatorFilter(event.target.value)}
              >
                <option value="">Tất cả người tạo</option>
                {creatorOptions.map((creator) => (
                  <option key={creator} value={creator}>
                    {creator}
                  </option>
                ))}
              </select>
            </label>

            <label className="combo-box" htmlFor="store-report-date-mode">
              <span>Kiểu lọc ngày</span>
              <select
                id="store-report-date-mode"
                value={dateFilterMode}
                onChange={(event) => {
                  setDateFilterMode(event.target.value as DateFilterMode)
                  setDateFilterValue('')
                }}
              >
                <option value="day">Theo ngày</option>
                <option value="week">Theo tuần</option>
                <option value="month">Theo tháng</option>
              </select>
            </label>

            <label className="combo-box" htmlFor="store-report-date-value">
              <span>{dateFilterMode === 'day' ? 'Ngày tạo' : dateFilterMode === 'week' ? 'Tuần tạo' : 'Tháng tạo'}</span>
              <input
                id="store-report-date-value"
                type={dateFilterMode === 'day' ? 'date' : dateFilterMode === 'week' ? 'week' : 'month'}
                value={dateFilterValue}
                onChange={(event) => setDateFilterValue(event.target.value)}
              />

            <label className="combo-box" htmlFor="store-report-dms">
              <span>Có trên DMS</span>
              <select
                id="store-report-dms"
                value={dmsFilter}
                onChange={(event) => setDmsFilter(event.target.value as 'all' | 'co' | 'chua')}
              >
                <option value="all">Tất cả</option>
                <option value="co">Có</option>
                <option value="chua">Chưa có</option>
              </select>
            </label>

            </label>
          </div>

          <div className="toolbar__actions">
            <button className="report-button" type="button" onClick={() => exportStoresToCsv()} disabled={!canExport} title={!canExport ? 'Bạn không có quyền xuất dữ liệu' : ''}>
              Xuất Danh sách CH
            </button>
            <button className="report-button" type="button" onClick={() => exportReportExcel()} disabled={!canExport} title={!canExport ? 'Bạn không có quyền xuất dữ liệu' : ''}>
              Xuất Excel
            </button>
          </div>
        </section>

        <div className="report-kpis">
          <article className="report-kpi-card">
            <span>Tổng cửa hàng</span>
            <strong>{filteredStores.length}</strong>
          </article>
          <article className="report-kpi-card">
            <span>Có kệ ACBT</span>
            <strong>{hasACBTRack}</strong>
          </article>
          <article className="report-kpi-card">
            <span>Có hàng đối thủ</span>
            <strong>{hasCompetitor}</strong>
          </article>
        </div>

        <div className="report-grid">
          <ReportBars title="Theo người tạo" items={byCreator} barClassName="report-bar report-bar--creator" />
          <ReportBars title="Theo tỉnh/thành" items={byProvince} barClassName="report-bar report-bar--day" />

          <section className="report-card report-card--full report-chart-inline">
            <h3>Bảng tỷ lệ thực địa theo người tạo</h3>
            <div style={{ marginTop: 12 }}>
              <PieChart points={byCreator} size={220} />
            </div>
            {percentRows.length === 0 ? (
              <p className="report-empty">Chưa có dữ liệu để tính tỷ lệ.</p>
            ) : (
              <div
                className="table-wrap table-wrap--drag"
                onPointerDown={onTablePointerDown}
                onPointerMove={onTablePointerMove}
                onPointerUp={onTablePointerUp}
                onPointerCancel={onTablePointerUp}
              >
                <table className="customer-table report-percent-table report-percent-table--grouped">
                  <thead>
                    <tr>
                      <th rowSpan={3}>Người tạo</th>
                      <th rowSpan={3}>Tổng CH</th>
                      <th rowSpan={3}>Có trên DMS</th>
                      <th colSpan={7}>Kệ Trưng Bày</th>
                      <th colSpan={6}>Vỉ Treo</th>
                      <th colSpan={9}>Bao Phủ</th>
                    </tr>
                    <tr>
                      <th colSpan={3}>ACBT</th>
                      <th colSpan={4}>Đối thủ</th>
                      <th colSpan={2}>ACBT</th>
                      <th colSpan={4}>Đối thủ</th>
                      <th colSpan={2}>Chân Gà</th>
                      <th colSpan={5}>Snack Khô</th>
                      <th colSpan={3}>Snack Ướt</th>
                    </tr>
                    <tr>
                      <th>Có kệ</th>
                      <th>kệ trả thưởng TB</th>
                      <th>Có hàng đối thủ</th>
                      <th>Lay&apos;s</th>
                      <th>Oishi</th>
                      <th>Poca</th>
                      <th>Khác</th>
                      <th>Có hàng ACBT</th>
                      <th>Có hàng đối thủ</th>
                      <th>Lay&apos;s</th>
                      <th>Oishi</th>
                      <th>Poca</th>
                      <th>Khác</th>
                      <th>Chân Gà ACBT</th>
                      <th>Chân Gà Đối Thủ</th>
                      <th>Snack ACBT</th>
                      <th>Lay&apos;s</th>
                      <th>Oishi</th>
                      <th>Poca</th>
                      <th>Khác</th>
                      <th>Snack Ướt ACBT</th>
                      <th>Snack Ướt Đối Thủ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {percentRows.map((row) => (
                      <tr key={row.creator}>
                        <td>{row.creator}</td>
                        <td>{row.total}</td>
                        <td>{row.coTrenDms}</td>
                        <td>{row.coKeAcbt}</td>
                        <td>{row.traThuongTb}</td>
                        <td>{row.hangDoiThuKe}</td>
                        <td>{row.keLays}</td>
                        <td>{row.keOishi}</td>
                        <td>{row.kePoca}</td>
                        <td>{row.keKhac}</td>
                        <td>{row.viAcbt}</td>
                        <td>{row.hangDoiThuVi}</td>
                        <td>{row.viLays}</td>
                        <td>{row.viOishi}</td>
                        <td>{row.viPoca}</td>
                        <td>{row.viKhac}</td>
                        <td>{row.chanGaAcbt}</td>
                        <td>{row.chanGaDoiThu}</td>
                        <td>{row.bimKhoAcbt}</td>
                        <td>{row.bimKhoLays}</td>
                        <td>{row.bimKhoOishi}</td>
                        <td>{row.bimKhoPoca}</td>
                        <td>{row.bimKhoKhac}</td>
                        <td>{row.bimUotAcbt}</td>
                        <td>{row.bimUotDoiThu}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div style={{ marginTop: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 10 }}>
                <label className="combo-box" htmlFor="store-report-chart-creator" style={{ minWidth: 240 }}>
                  <span>Chọn người xem biểu đồ</span>
                  <select
                    id="store-report-chart-creator"
                    value={chartCreatorFilter}
                    onChange={(event) => setChartCreatorFilter(event.target.value)}
                  >
                    <option value="">Tất cả người tạo</option>
                    {creatorOptions.map((creator) => (
                      <option key={creator} value={creator}>
                        {creator}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <h4 style={{ margin: '0 0 8px 0' }}>Biểu đồ cột — tất cả trường dữ liệu</h4>
              <div style={{ marginTop: 8 }}>
                {/* Build grouped series: ACBT vs Đối thủ totals per creator */}
                {(() => {
                  const categories = chartRows.map((r) => r.creator)
                  function leadNum(text: string | number) {
                    const m = /^\s*(\d+)\b/.exec(String(text))
                    return m ? Number(m[1]) : 0
                  }

                  const acbt = chartRows.map((r) => {
                    return (
                      leadNum(r.coKeAcbt) +
                      leadNum(r.viAcbt) +
                      leadNum(r.bimKhoAcbt) +
                      leadNum(r.bimUotAcbt) +
                      leadNum(r.traThuongTb) +
                      leadNum(r.chanGaAcbt)
                    )
                  })

                  const doi = chartRows.map((r) => {
                    return (
                      leadNum(r.hangDoiThuKe) +
                      leadNum(r.keLays) +
                      leadNum(r.keOishi) +
                      leadNum(r.kePoca) +
                      leadNum(r.keKhac) +
                      leadNum(r.hangDoiThuVi) +
                      leadNum(r.viLays) +
                      leadNum(r.viOishi) +
                      leadNum(r.viPoca) +
                      leadNum(r.viKhac) +
                      leadNum(r.bimKhoLays) +
                      leadNum(r.bimKhoOishi) +
                      leadNum(r.bimKhoPoca) +
                      leadNum(r.bimKhoKhac) +
                      leadNum(r.bimUotDoiThu) +
                      leadNum(r.chanGaDoiThu)
                    )
                  })

                  const series = [
                    { name: 'ACBT', values: acbt },
                    { name: 'Đối thủ', values: doi },
                  ]

                  return <GroupedColumnChart categories={categories} series={series} height={180} compact />
                })()}
              </div>
              <div style={{ marginTop: 12 }}>
                <h4 style={{ margin: '0 0 8px 0' }}>Biểu đồ cột — theo từng trường</h4>
                {(() => {
                  const categories = chartRows.map((r) => r.creator)
                  function leadNum(text: string | number) {
                    const m = /^\s*(\d+)\b/.exec(String(text))
                    return m ? Number(m[1]) : 0
                  }

                  const metrics: { key: keyof StorePercentRow; label: string }[] = [
                    { key: 'coTrenDms', label: 'DMS' },
                    { key: 'coKeAcbt', label: 'Kệ ACBT' },
                    { key: 'traThuongTb', label: 'Kệ TT' },
                    { key: 'hangDoiThuKe', label: 'Kệ ĐT' },
                    { key: 'keLays', label: "Lay's kệ" },
                    { key: 'keOishi', label: 'Oishi kệ' },
                    { key: 'kePoca', label: 'Poca kệ' },
                    { key: 'keKhac', label: 'Khác kệ' },
                    { key: 'viAcbt', label: 'Vỉ ACBT' },
                    { key: 'hangDoiThuVi', label: 'Vỉ ĐT' },
                    { key: 'viLays', label: "Lay's vỉ" },
                    { key: 'viOishi', label: 'Oishi vỉ' },
                    { key: 'viPoca', label: 'Poca vỉ' },
                    { key: 'viKhac', label: 'Khác vỉ' },
                    { key: 'chanGaAcbt', label: 'Gà ACBT' },
                    { key: 'chanGaDoiThu', label: 'Gà ĐT' },
                    { key: 'bimKhoAcbt', label: 'Snack ACBT' },
                    { key: 'bimKhoLays', label: "Lay's snack" },
                    { key: 'bimKhoOishi', label: 'Oishi snack' },
                    { key: 'bimKhoPoca', label: 'Poca snack' },
                    { key: 'bimKhoKhac', label: 'Khác snack' },
                    { key: 'bimUotAcbt', label: 'Ướt ACBT' },
                    { key: 'bimUotDoiThu', label: 'Ướt ĐT' },
                  ]

                  const series = metrics.map((m) => ({
                    name: m.label,
                    values: chartRows.map((r) => leadNum(r[m.key])),
                  }))

                  return (
                    <div style={{ overflowX: 'auto' }}>
                      <GroupedColumnChart categories={categories} series={series} height={220} compact />
                    </div>
                  )
                })()}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
