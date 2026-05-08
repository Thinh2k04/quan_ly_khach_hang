import { useMemo, useRef, useState } from 'react'
import type { Store } from '../api'
import { resolveImageUrl } from '../utils/customerFormatters'

type StoreReportModalProps = {
  stores: Store[]
  isOpen: boolean
  onClose: () => void
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

function getImageUrl(store: Store): string | null {
  const value = store.HinhAnh ?? store['hinh_anh'] ?? store['AnhCH'] ?? store['anh']

  if (typeof value === 'string' && value.trim()) {
    return value.trim()
  }

  return null
}

function getStoreDateKey(store: Store): string {
  const rawDate =
    store['ngay_tao'] ??
    store['NgayTao'] ??
    store['created_at'] ??
    store['CreatedAt'] ??
    store['ngayTao']

  if (typeof rawDate !== 'string' || !rawDate.trim()) {
    return ''
  }

  const value = rawDate.trim()
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/.exec(value)
  if (isoMatch) {
    const [, year, month, day] = isoMatch
    return `${year}-${month}-${day}`
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return ''
  }

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getStoreCreatedAt(store: Store): string {
  const rawDate =
    store['ngay_tao'] ??
    store['NgayTao'] ??
    store['created_at'] ??
    store['CreatedAt'] ??
    store['ngayTao']

  if (typeof rawDate !== 'string' || !rawDate.trim()) {
    return 'Chưa có'
  }

  const value = rawDate.trim()
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/.exec(value)
  if (isoMatch) {
    const [, year, month, day, hour, minute] = isoMatch
    return `${hour}:${minute} ${Number(day)} thg ${Number(month)}, ${year}`
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

export default function StoreReportModal({ stores, isOpen, onClose }: StoreReportModalProps) {
  const [creatorFilter, setCreatorFilter] = useState('')
  const [dateFilterMode, setDateFilterMode] = useState<DateFilterMode>('day')
  const [dateFilterValue, setDateFilterValue] = useState('')
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

      return matchesCreator && matchesDate
    })
  }, [creatorFilter, dateFilterMode, dateFilterValue, stores])

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

  const imageItems = useMemo(() => {
    return filteredStores
      .map((store) => ({
        id: String(store.id ?? store.Id ?? store.ID ?? store.ma_ch ?? store.MaCH ?? store.TenCH ?? Math.random()),
        name: String(store.TenCH ?? 'Cửa hàng'),
        address: String(store.DiaChi ?? 'Chưa có địa chỉ'),
        createdAt: getStoreCreatedAt(store),
        image: resolveImageUrl(getImageUrl(store) ?? ''),
      }))
      .filter((item) => Boolean(item.image))
      .slice(0, 8)
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
            <p>Dữ liệu hiển thị theo timestamp gốc từ API</p>
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
            </label>
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
          <article className="report-kpi-card">
            <span>Số ảnh thực địa</span>
            <strong>{imageItems.length}</strong>
          </article>
        </div>

        <div className="report-grid">
          <ReportBars title="Theo người tạo" items={byCreator} barClassName="report-bar report-bar--creator" />
          <ReportBars title="Theo tỉnh/thành" items={byProvince} barClassName="report-bar report-bar--day" />

          <section className="report-card report-card--full">
            <h3>Ảnh thực địa từ dữ liệu</h3>
            {imageItems.length === 0 ? (
              <p className="report-empty">Không có ảnh trong dữ liệu hiện tại.</p>
            ) : (
              <div className="store-image-grid">
                {imageItems.map((item) => (
                  <article className="store-image-card" key={item.id}>
                    <img src={item.image} alt={item.name} loading="lazy" />
                    <div>
                      <strong>{item.name}</strong>
                      <span>{item.address}</span>
                      <span>Ngày tạo: {item.createdAt}</span>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="report-card report-card--full">
            <h3>Bảng tỷ lệ thực địa theo người tạo</h3>
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
                      <th colSpan={7}>Vỉ Treo</th>
                      <th colSpan={9}>Bao Phủ</th>
                    </tr>
                    <tr>
                      <th colSpan={2}>ACBT</th>
                      <th colSpan={5}>Đối thủ</th>
                      <th colSpan={2}>ACBT</th>
                      <th colSpan={5}>Đối thủ</th>
                      <th colSpan={2}>Chân Gà</th>
                      <th colSpan={5}>Bim Khô</th>
                      <th colSpan={2}>Bim Ướt</th>
                    </tr>
                    <tr>
                      <th>Có kệ</th>
                      <th>Trả thưởng TB</th>
                      <th>Có hàng đối thủ không</th>
                      <th>Lay&apos;s</th>
                      <th>Oishi</th>
                      <th>Poca</th>
                      <th>Khác</th>
                      <th>Có vị</th>
                      <th>Có hàng đối thủ không</th>
                      <th>Lay&apos;s</th>
                      <th>Oishi</th>
                      <th>Poca</th>
                      <th>Khác</th>
                      <th>Chân Gà ACBT</th>
                      <th>Chân Gà Đối Thủ</th>
                      <th>Bim ACBT</th>
                      <th>Lay&apos;s</th>
                      <th>Oishi</th>
                      <th>Poca</th>
                      <th>Khác</th>
                      <th>Bim Ướt ACBT</th>
                      <th>Bim Ướt Đối Thủ</th>
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
          </section>
        </div>
      </div>
    </div>
  )
}
