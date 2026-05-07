import { useMemo, useState } from 'react'
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
  viAcbt: string
  hangDoiThuVi: string
  chanGaAcbt: string
  chanGaDoiThu: string
  bimKhoAcbt: string
  bimUotAcbt: string
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

  const isoMatch = /^(\d{4}-\d{2}-\d{2})T/.exec(rawDate)

  if (isoMatch) {
    return isoMatch[1]
  }

  const date = new Date(rawDate)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
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
        const viAcbtCount = countTruthy(creatorStores, 'CoViACBT')
        const doiThuViCount = countTruthy(creatorStores, 'CoHangDoiThuVi')
        const chanGaAcbtCount = countTruthy(creatorStores, 'ChanGaACBT')
        const chanGaDoiThuCount = countTruthy(creatorStores, 'ChanGaDoiThu')
        const bimKhoAcbtCount = countTruthy(creatorStores, 'BimKhoACBT')
        const bimUotAcbtCount = countTruthy(creatorStores, 'BimUotACBT')

        return {
          creator,
          total,
          coTrenDms: `${dmsCount} (${formatPercent(dmsCount, total)})`,
          coKeAcbt: `${keAcbtCount} (${formatPercent(keAcbtCount, total)})`,
          traThuongTb: `${traThuongCount} (${formatPercent(traThuongCount, total)})`,
          hangDoiThuKe: `${doiThuKeCount} (${formatPercent(doiThuKeCount, total)})`,
          viAcbt: `${viAcbtCount} (${formatPercent(viAcbtCount, total)})`,
          hangDoiThuVi: `${doiThuViCount} (${formatPercent(doiThuViCount, total)})`,
          chanGaAcbt: `${chanGaAcbtCount} (${formatPercent(chanGaAcbtCount, total)})`,
          chanGaDoiThu: `${chanGaDoiThuCount} (${formatPercent(chanGaDoiThuCount, total)})`,
          bimKhoAcbt: `${bimKhoAcbtCount} (${formatPercent(bimKhoAcbtCount, total)})`,
          bimUotAcbt: `${bimUotAcbtCount} (${formatPercent(bimUotAcbtCount, total)})`,
        }
      })
      .sort((a, b) => b.total - a.total)
  }, [filteredStores])

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
            <p>Dữ liệu cập nhật theo bộ lọc người tạo</p>
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
              <div className="table-wrap">
                <table className="customer-table report-percent-table">
                  <thead>
                    <tr>
                      <th>Người tạo</th>
                      <th>Tổng CH</th>
                      <th>Có trên DMS</th>
                      <th>Có kệ ACBT</th>
                      <th>Trả thưởng TB</th>
                      <th>Đối thủ kệ</th>
                      <th>Có vị ACBT</th>
                      <th>Đối thủ vị</th>
                      <th>Chân gà ACBT</th>
                      <th>Chân gà ĐT</th>
                      <th>Bim khô ACBT</th>
                      <th>Bim ướt ACBT</th>
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
                        <td>{row.viAcbt}</td>
                        <td>{row.hangDoiThuVi}</td>
                        <td>{row.chanGaAcbt}</td>
                        <td>{row.chanGaDoiThu}</td>
                        <td>{row.bimKhoAcbt}</td>
                        <td>{row.bimUotAcbt}</td>
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
