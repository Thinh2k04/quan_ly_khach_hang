import { useEffect, useMemo, useState } from 'react'
import {
  deleteStore,
  getStoreById,
  getStores,
  searchStores,
  updateStore,
  type Store,
  type StorePayload,
} from '../api'
import Pagination from './Pagination'
import { getDateKey, resolveImageUrl } from '../utils/customerFormatters'
import ConfirmDialog from './ConfirmDialog'
import StoreReportModal from './StoreReportModal'

type Status = 'idle' | 'loading' | 'ready' | 'error'
const NOTICE_HIDE_DELAY_MS = 2500

type StoreFieldReportPageProps = {
  onBack: () => void
  canModify: boolean
  currentUserCode: string
  currentUserName: string
  canViewAll: boolean
  canExport: boolean
}

function normalizeIdentity(value: string): string {
  return value
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ')
}

function matchesLoggedInUser(rawCreator: string | undefined, currentUserCode: string, currentUserName: string): boolean {
  if (!rawCreator || !rawCreator.trim()) {
    return false
  }

  const creator = normalizeIdentity(rawCreator)
  const code = normalizeIdentity(currentUserCode)
  const name = normalizeIdentity(currentUserName)

  return creator === code || creator === name
}

type DateFilterMode = 'day' | 'week' | 'month' | 'range'

type StringField = 'TenCH' | 'DiaChi' | 'Phuong' | 'NPP' | 'Tinh'
type OptionalTextField = 'GhiChu' | 'HinhAnh'
type BooleanField =
  | 'CoTrenDMS'
  | 'CoKeACBT'
  | 'TraThuongTB'
  | 'CoHangDoiThuKhong'
  | 'DoiThuLays'
  | 'DoiThuOishi'
  | 'DoiThuPoca'
  | 'DoiThuKhac'
  | 'DoiThuOrion'
  | 'CoViACBT'
  | 'CoHangDoiThuVi'
  | 'ViDoiThuLays'
  | 'ViDoiThuOishi'
  | 'ViDoiThuOrion'
  | 'ViDoiThuPoca'
  | 'ViDoiThuKhac'
  | 'ChanGaACBT'
  | 'ChanGaDoiThu'
  | 'BimKhoACBT'
  | 'BimKhoDoiThuLays'
  | 'BimKhoDoiThuOishi'
  | 'BimKhoDoiThuOrion'
  | 'BimKhoDoiThuPoca'
  | 'BimKhoDoiThuKhac'
  | 'BimUotACBT'
  | 'BimUotDoiThu'

type BooleanGroup = {
  title: string
  fields: BooleanField[]
}

const INITIAL_FORM: StorePayload = {
  TenCH: '',
  DiaChi: '',
  Phuong: '',
  NPP: '',
  Tinh: '',
  CoTrenDMS: false,
  CoKeACBT: false,
  TraThuongTB: false,
  CoHangDoiThuKhong: false,
  DoiThuLays: false,
  DoiThuOishi: false,
  DoiThuOrion: false,
  DoiThuPoca: false,
  DoiThuKhac: false,
  CoViACBT: false,
  CoHangDoiThuVi: false,
  ViDoiThuLays: false,
  ViDoiThuOishi: false,
  ViDoiThuOrion: false,
  ViDoiThuPoca: false,
  ViDoiThuKhac: false,
  ChanGaACBT: false,
  ChanGaDoiThu: false,
  BimKhoACBT: false,
  BimKhoDoiThuLays: false,
  BimKhoDoiThuOishi: false,
  BimKhoDoiThuOrion: false,
  BimKhoDoiThuPoca: false,
  BimKhoDoiThuKhac: false,
  BimUotACBT: false,
  BimUotDoiThu: false,
  GhiChu: null,
  HinhAnh: null,
}

const STRING_FIELDS: StringField[] = ['TenCH', 'DiaChi', 'Phuong', 'NPP', 'Tinh']
const OPTIONAL_TEXT_FIELDS: OptionalTextField[] = ['GhiChu', 'HinhAnh']
const BOOLEAN_FIELDS: BooleanField[] = [
  'CoTrenDMS',
  'CoKeACBT',
  'TraThuongTB',
  'CoHangDoiThuKhong',
  'DoiThuLays',
  'DoiThuOishi',
  'DoiThuOrion',
  'DoiThuPoca',
  'DoiThuKhac',
  'CoViACBT',
  'CoHangDoiThuVi',
  'ViDoiThuLays',
  'ViDoiThuOishi',
  'ViDoiThuOrion',
  'ViDoiThuPoca',
  'ViDoiThuKhac',
  'ChanGaACBT',
  'ChanGaDoiThu',
  'BimKhoACBT',
  'BimKhoDoiThuLays',
  'BimKhoDoiThuOishi',
  'BimKhoDoiThuOrion',
  'BimKhoDoiThuPoca',
  'BimKhoDoiThuKhac',
  'BimUotACBT',
  'BimUotDoiThu',
]

const FIELD_LABELS: Record<StringField | OptionalTextField | BooleanField, string> = {
  TenCH: 'Tên cửa hàng',
  DiaChi: 'Địa chỉ',
  Phuong: 'Phường / Quận',
  NPP: 'Nhà phân phối',
  Tinh: 'Tỉnh / Thành phố',
  GhiChu: 'Ghi chú',
  HinhAnh: 'Hình ảnh',
  CoTrenDMS: 'Có trên DMS',
  CoKeACBT: 'Có kệ ACBT',
  TraThuongTB: 'Trả thưởng TB',
  CoHangDoiThuKhong: 'Có hàng đối thủ không',
  DoiThuLays: "Lay's",
  DoiThuOishi: 'Oishi',
  DoiThuPoca: 'Poca',
  DoiThuKhac: 'Khác',
  DoiThuOrion: 'Kệ đối thủ Orion',
  CoViACBT: 'Có vị',
  CoHangDoiThuVi: 'Có hàng đối thủ không',
  ViDoiThuLays: "Lay's",
  ViDoiThuOishi: 'Oishi',
  ViDoiThuOrion: 'Vỉ đối thủ Orion',
  ViDoiThuPoca: 'Poca',
  ViDoiThuKhac: 'Khác',
  ChanGaACBT: 'Chân Gà ACBT',
  ChanGaDoiThu: 'Chân Gà Đối Thủ',
  BimKhoACBT: 'Bim ACBT',
  BimKhoDoiThuLays: "Lay's",
  BimKhoDoiThuOishi: 'Oishi',
  BimKhoDoiThuOrion: 'Snack khô đối thủ',
  BimKhoDoiThuPoca: 'Poca',
  BimKhoDoiThuKhac: 'Khác',
  BimUotACBT: 'Bim Ướt ACBT',
  BimUotDoiThu: 'Bim Ướt Đối Thủ',
}

const DETAIL_LABELS: Record<string, string> = {
  id: 'STT',
  Id: 'STT',
  ID: 'STT',
  stt: 'STT',
  STT: 'STT',
  ngay_tao: 'Ngày tạo',
  NgayTao: 'Ngày tạo',
  created_at: 'Ngày tạo',
  CreatedAt: 'Ngày tạo',
  ma_ch: 'STT',
  MaCH: 'STT',
  ...FIELD_LABELS,
}

const BOOLEAN_GROUPS: BooleanGroup[] = [
  {
    title: 'Kệ Trưng Bày',
    fields: ['CoKeACBT', 'TraThuongTB', 'CoHangDoiThuKhong', 'DoiThuLays', 'DoiThuOishi', 'DoiThuOrion', 'DoiThuPoca', 'DoiThuKhac'],
  },
  {
    title: 'Vị Treo',
    fields: ['CoViACBT', 'CoHangDoiThuVi', 'ViDoiThuLays', 'ViDoiThuOishi', 'ViDoiThuOrion', 'ViDoiThuPoca', 'ViDoiThuKhac'],
  },
  {
    title: 'Bao Phủ - Chân Gà',
    fields: ['ChanGaACBT', 'ChanGaDoiThu'],
  },
  {
    title: 'Bao Phủ - Bim Khô',
    fields: ['BimKhoACBT', 'BimKhoDoiThuLays', 'BimKhoDoiThuOishi', 'BimKhoDoiThuOrion', 'BimKhoDoiThuPoca', 'BimKhoDoiThuKhac'],
  },
  {
    title: 'Bao Phủ - Bim Ướt',
    fields: ['BimUotACBT', 'BimUotDoiThu'],
  },
]

const STORE_ID_KEYS = ['id', 'Id', 'ID', 'ma_ch', 'MaCH', 'stt', 'STT'] as const
const DETAIL_IMAGE_KEYS = ['HinhAnh', 'hinh_anh', 'AnhCH', 'anh']
const DETAIL_CREATOR_KEYS = ['NguoiTao', 'nguoi_tao', 'NguoiThucHien', 'TenNguoiThucHien', 'ten_nguoi_thuc_hien']
const DETAIL_DATE_KEYS = ['ngay_tao', 'NgayTao', 'created_at', 'CreatedAt', 'ngayTao']

function getStoreId(store: Store): number | null {
  for (const key of STORE_ID_KEYS) {
    const candidate = store[key]

    if (typeof candidate === 'number') {
      return candidate
    }

    if (typeof candidate === 'string' && candidate.trim() !== '') {
      const parsed = Number(candidate)

      if (Number.isFinite(parsed)) {
        return parsed
      }
    }
  }

  return null
}

function toPayload(store: Store): StorePayload {
  const payload: StorePayload = { ...INITIAL_FORM }

  for (const field of STRING_FIELDS) {
    const value = store[field]
    payload[field] = typeof value === 'string' ? value : ''
  }

  for (const field of BOOLEAN_FIELDS) {
    payload[field] = Boolean(store[field])
  }

  payload.GhiChu = typeof store.GhiChu === 'string' ? store.GhiChu : null
  payload.HinhAnh = typeof store.HinhAnh === 'string' ? store.HinhAnh : null

  return payload
}

function formatStoreValue(value: unknown): string {
  if (typeof value === 'boolean') {
    return value ? 'Hiện có' : 'Không'
  }

  if (value === null || value === undefined || value === '') {
    return '—'
  }

  return String(value)
}

function getDetailLabel(key: string): string {
  return DETAIL_LABELS[key] ?? key
}


function getStoreCreatorLabel(store: Store): string {
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

  return getDateKey(rawDate)
}

function formatStoreDateTime(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) {
    return '—'
  }

  const rawValue = value.trim()
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/.exec(rawValue)

  if (isoMatch) {
    const [, year, month, day, hour, minute] = isoMatch
    return `${Number(day)}/${Number(month)}/${year} ${hour}:${minute}`
  }

  const date = new Date(rawValue)
  if (Number.isNaN(date.getTime())) {
    return rawValue
  }

  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
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

export default function StoreFieldReportPage({
  onBack,
  canModify,
  currentUserCode,
  currentUserName,
  canViewAll,
  canExport,
}: StoreFieldReportPageProps) {
  const [stores, setStores] = useState<Store[]>([])
  const [status, setStatus] = useState<Status>('loading')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [creatorFilter, setCreatorFilter] = useState('')
  const [dateFilterMode, setDateFilterMode] = useState<DateFilterMode>('day')
  const [dateFilterValue, setDateFilterValue] = useState('')
  const [dateRangeFrom, setDateRangeFrom] = useState('')
  const [dateRangeTo, setDateRangeTo] = useState('')
  const [saving, setSaving] = useState(false)
  const [removingId, setRemovingId] = useState<number | null>(null)
  const [editingStore, setEditingStore] = useState<Store | null>(null)
  const [storeToDelete, setStoreToDelete] = useState<Store | null>(null)
  const [selectedStore, setSelectedStore] = useState<Store | null>(null)
  const [isReportOpen, setIsReportOpen] = useState(false)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [form, setForm] = useState<StorePayload>(INITIAL_FORM)
  const [storePage, setStorePage] = useState(1)

  const loadAllStores = async () => {
    setStatus('loading')
    setError(null)

    try {
      const data = await getStores()
      setStores(data)
      setStatus('ready')
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Không thể tải danh sách cửa hàng')
      setStatus('error')
    }
  }

  useEffect(() => {
    void loadAllStores()
  }, [])

  useEffect(() => {
    if (!notice) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setNotice(null)
    }, NOTICE_HIDE_DELAY_MS)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [notice])

  const handleSearch = async () => {
    setStatus('loading')
    setError(null)

    try {
      if (search.trim()) {
        const data = await searchStores(search.trim())
        setStores(data)
      } else {
        const data = await getStores()
        setStores(data)
      }

      setStatus('ready')
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : 'Không thể tìm kiếm cửa hàng')
      setStatus('error')
    }
  }

  // Debounce search: call handleSearch 300ms after user stops typing
  useEffect(() => {
    const handle = setTimeout(() => {
      void handleSearch()
    }, 300)

    return () => clearTimeout(handle)
  }, [search])



  const openEditForm = (store: Store) => {
    if (!canModify) {
      setNotice('Tài khoản này chỉ có quyền xem')
      return
    }

    setEditingStore(store)
    setForm(toPayload(store))
    setIsFormOpen(true)
  }

  const submitForm = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!canModify) {
      setNotice('Tài khoản này chỉ có quyền xem')
      setIsFormOpen(false)
      return
    }

    setSaving(true)
    setError(null)
    setNotice(null)

    const storeId = editingStore ? getStoreId(editingStore) : null

    if (storeId === null) {
      setError('Không tìm thấy mã cửa hàng để cập nhật')
      setSaving(false)
      return
    }

    try {
      await updateStore(storeId, form)
      setNotice(`Đã cập nhật cửa hàng ${form.TenCH}`)
      setIsFormOpen(false)
      await handleSearch()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Không thể lưu dữ liệu cửa hàng')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteRequest = (store: Store) => {
    if (!canModify) {
      setNotice('Tài khoản này chỉ có quyền xem')
      return
    }

    setStoreToDelete(store)
  }

  const handleDelete = async () => {
    if (!storeToDelete) {
      return
    }

    if (!canModify) {
      setStoreToDelete(null)
      setNotice('Tài khoản này chỉ có quyền xem')
      return
    }

    const store = storeToDelete
    const storeId = getStoreId(store)

    if (storeId === null) {
      setError('Không tìm thấy mã cửa hàng để xóa')
      setStoreToDelete(null)
      return
    }

    setStoreToDelete(null)

    setRemovingId(storeId)
    setError(null)
    setNotice(null)

    try {
      await deleteStore(storeId)
      setNotice(`Đã xóa cửa hàng ${store.TenCH ?? `#${storeId}`}`)
      await handleSearch()
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Không thể xóa cửa hàng')
    } finally {
      setRemovingId(null)
    }
  }

  const openDetail = async (store: Store) => {
    const storeId = getStoreId(store)
    setError(null)

    if (storeId === null) {
      setSelectedStore(store)
      return
    }

    try {
      const detail = await getStoreById(storeId)
      setSelectedStore(detail)
    } catch {
      setSelectedStore(store)
    }
  }

  const creatorOptions = useMemo(() => {
    return Array.from(new Set(stores.map(getStoreCreatorLabel))).sort((a, b) => a.localeCompare(b))
  }, [stores])

  const filteredStores = useMemo(() => {
    return stores.filter((store) => {
      const matchesCreator = !creatorFilter || getStoreCreatorLabel(store) === creatorFilter
      const creatorLabel = getStoreCreatorLabel(store)
      const matchesCurrentUser =
        canViewAll ||
        canModify ||
        !currentUserCode ||
        matchesLoggedInUser(creatorLabel, currentUserCode, currentUserName)
      const dateKey = getStoreDateKey(store)

      const matchesDate = (() => {
        if (dateFilterMode === 'range') {
          if (!dateRangeFrom && !dateRangeTo) {
            return true
          }

          if (!dateKey) {
            return false
          }

          if (dateRangeFrom && dateKey < dateRangeFrom) {
            return false
          }

          if (dateRangeTo && dateKey > dateRangeTo) {
            return false
          }

          return true
        }

        if (!dateFilterValue) {
          return true
        }

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

      return matchesCreator && matchesCurrentUser && matchesDate
    })
  }, [canModify, canViewAll, creatorFilter, currentUserCode, currentUserName, dateFilterMode, dateFilterValue, dateRangeFrom, dateRangeTo, stores])

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setStorePage(1)
  }, [search, creatorFilter, dateFilterMode, dateFilterValue, dateRangeFrom, dateRangeTo])

  const ITEMS_PER_PAGE = 10
  const totalStorePages = Math.ceil(filteredStores.length / ITEMS_PER_PAGE)
  const paginatedStores = filteredStores.slice(
    (storePage - 1) * ITEMS_PER_PAGE,
    storePage * ITEMS_PER_PAGE,
  )

  const metrics = useMemo(() => {
    const hasAcbtRack = filteredStores.filter((store) => Boolean(store.CoKeACBT)).length
    const hasHangingRack = filteredStores.filter((store) => Boolean(store.CoViACBT)).length

    return {
      total: filteredStores.length,
      hasAcbtRack,
      hasHangingRack,
    }
  }, [filteredStores])

  return (
    <div className="app-shell">
      <div className="ambient ambient-left" />
      <div className="ambient ambient-right" />

      <header className="hero">
        <div>
          <p className="eyebrow">Màn quản lý bán hàng</p>
          <h1>Báo cáo thực địa</h1>
          <p className="hero-copy">Theo dõi, cập nhật và kiểm tra thông tin cửa hàng từ thị trường.</p>
        </div>
      </header>

      <div className="field-report-overview">
        <section className="stats-grid field-report-stats" aria-label="Thống kê cửa hàng">
          <article className="stat-card">
            <span>Tổng cửa hàng</span>
            <strong>{metrics.total}</strong>
          </article>
          <article className="stat-card stat-card--split" aria-label="Kệ ACBT và vỉ treo">
            <div className="stat-card__split">
              <div className="stat-card__split-item">
                <span>Có kệ ACBT</span>
                <strong>{metrics.hasAcbtRack}</strong>
              </div>
              <div className="stat-card__split-divider" aria-hidden="true" />
              <div className="stat-card__split-item">
                <span>Có vỉ treo</span>
                <strong>{metrics.hasHangingRack}</strong>
              </div>
            </div>
          </article>
        </section>

        <div className="field-report-filters">
          <label className="combo-box" htmlFor="store-creator-filter">
            <span>Người tạo</span>
            <select
              id="store-creator-filter"
              value={creatorFilter}
              onChange={(event) => setCreatorFilter(event.target.value)}
              disabled={!canModify && !canViewAll}
            >
              <option value="">{canModify || canViewAll ? 'Tất cả người tạo' : 'Tài khoản của bạn'}</option>
              {creatorOptions.map((creator) => (
                <option key={creator} value={creator}>
                  {creator}
                </option>
              ))}
            </select>
          </label>

          <label className="combo-box" htmlFor="store-date-filter">
            <span>Kiểu lọc ngày</span>
            <select
              id="store-date-filter-mode"
              value={dateFilterMode}
              onChange={(event) => {
                setDateFilterMode(event.target.value as DateFilterMode)
                setDateFilterValue('')
                setDateRangeFrom('')
                setDateRangeTo('')
              }}
            >
              <option value="day">Theo ngày</option>
              <option value="week">Theo tuần</option>
              <option value="month">Theo tháng</option>
              <option value="range">Khoảng ngày</option>
            </select>
          </label>

          {dateFilterMode === 'range' ? (
            <>
              <label className="combo-box" htmlFor="store-date-filter-from">
                <span>Từ ngày</span>
                <input
                  id="store-date-filter-from"
                  type="date"
                  value={dateRangeFrom}
                  onChange={(event) => setDateRangeFrom(event.target.value)}
                />
              </label>

              <label className="combo-box" htmlFor="store-date-filter-to">
                <span>Đến ngày</span>
                <input
                  id="store-date-filter-to"
                  type="date"
                  value={dateRangeTo}
                  onChange={(event) => setDateRangeTo(event.target.value)}
                />
              </label>
            </>
          ) : (
            <label className="combo-box" htmlFor="store-date-filter-value">
              <span>{dateFilterMode === 'day' ? 'Ngày tạo' : dateFilterMode === 'week' ? 'Tuần tạo' : 'Tháng tạo'}</span>
              <input
                id="store-date-filter-value"
                type={dateFilterMode === 'day' ? 'date' : dateFilterMode === 'week' ? 'week' : 'month'}
                value={dateFilterValue}
                onChange={(event) => setDateFilterValue(event.target.value)}
              />
            </label>
          )}
        </div>
      </div>

      <section className="toolbar field-report-toolbar">
        <div className="toolbar__filters">
          <label className="search-box" htmlFor="store-search">
            <span>Tìm kiếm cửa hàng</span>
            <input
              id="store-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  void handleSearch()
                }
              }}
              placeholder="Nhập tên cửa hàng, địa chỉ, NPP..."
            />
          </label>
        </div>

        <div className="toolbar__actions">
          <button className="report-button" type="button" onClick={onBack}>
            Về khách hàng
          </button>

          <button className="report-button" type="button" onClick={() => setIsReportOpen(true)}>
            Báo cáo
          </button>
          <button className="refresh-button" type="button" onClick={() => void loadAllStores()}>
            Làm mới dữ liệu
          </button>
        </div>
      </section>

      {notice ? <div className="notice" role="status">{notice}</div> : null}
      {error ? <div className="error-banner" role="alert">{error}</div> : null}

      <main className="panel">
        <div className="panel__header">
          <div>
            <h2>Danh sách cửa hàng</h2>
            <p>{filteredStores.length} bản ghi phù hợp</p>
          </div>
          <span className="panel__badge">{status === 'loading' ? 'Đang tải...' : 'Sẵn sàng'}</span>
        </div>

        {status === 'loading' ? (
          <div className="empty-state">Đang tải dữ liệu cửa hàng...</div>
        ) : filteredStores.length === 0 ? (
          <div className="empty-state">
            <strong>Không có kết quả phù hợp.</strong>
            <span>Thử tìm kiếm lại hoặc làm mới dữ liệu.</span>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="customer-table">
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Tên cửa hàng</th>
                  <th>Địa chỉ</th>
                  <th>Phường</th>
                  <th>Tỉnh</th>
                  <th>NPP</th>
                  <th>Đối thủ</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {paginatedStores.map((store, index) => {
                  const storeId = getStoreId(store)

                  return (
                    <tr key={storeId ?? `${store.TenCH}-${index}`}>
                      <td>{(storePage - 1) * ITEMS_PER_PAGE + index + 1}</td>
                      <td>
                        <div className="customer-cell">
                          <div>
                            <strong>{store.TenCH ?? '—'}</strong>
                            <span>Mã #{storeId ?? 'N/A'}</span>
                          </div>
                        </div>
                      </td>
                      <td>{store.DiaChi ?? '—'}</td>
                      <td>{store.Phuong ?? '—'}</td>
                      <td>{store.Tinh ?? '—'}</td>
                      <td>{store.NPP ?? '—'}</td>
                      <td>{store.CoHangDoiThuKhong ? 'Có' : 'Không'}</td>
                      <td>
                        <div className="action-group">
                          <button className="detail-button" type="button" onClick={() => void openDetail(store)}>
                            Chi tiết
                          </button>
                          <button
                            className="detail-button"
                            type="button"
                            onClick={() => openEditForm(store)}
                            disabled={!canModify}
                            title={!canModify ? 'Tài khoản chỉ có quyền xem' : undefined}
                          >
                            {canModify ? 'Sửa' : 'Chỉ xem'}
                          </button>
                          <button
                            className="delete-button"
                            type="button"
                            onClick={() => handleDeleteRequest(store)}
                            disabled={!canModify || (storeId !== null && removingId === storeId)}
                            title={!canModify ? 'Tài khoản chỉ có quyền xem' : undefined}
                          >
                            {storeId !== null && removingId === storeId ? 'Đang xóa...' : !canModify ? 'Chỉ xem' : 'Xóa'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <Pagination
              currentPage={storePage}
              totalPages={totalStorePages}
              onPageChange={setStorePage}
            />
          </div>
        )}
      </main>

      {isFormOpen ? (
        <div className="modal-overlay" role="presentation" onClick={() => setIsFormOpen(false)}>
          <div className="modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className="modal__header">
              <div>
                <p className="eyebrow">Cập nhật</p>
                <h2>Sửa cửa hàng</h2>
              </div>
              <button className="close-button" type="button" onClick={() => setIsFormOpen(false)}>
                Đóng
              </button>
            </div>

            <form className="store-form-grid" onSubmit={submitForm}>
              {STRING_FIELDS.map((field) => (
                <label key={field} className="combo-box">
                  <span>{FIELD_LABELS[field]}</span>
                  <input
                    type="text"
                    value={form[field] as string}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, [field]: event.target.value }))
                    }
                    required={field === 'TenCH'}
                  />
                </label>
              ))}

              {OPTIONAL_TEXT_FIELDS.map((field) => (
                <label key={field} className="combo-box store-form-grid__full">
                  <span>{FIELD_LABELS[field]}</span>
                  <input
                    type="text"
                    value={(form[field] as string | null) ?? ''}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        [field]: event.target.value.trim() ? event.target.value : null,
                      }))
                    }
                  />
                </label>
              ))}

              <div className="store-form-grid__full">
                <section className="store-section">
                  <h3>Sản phẩm hiện có</h3>
                  <p>Chọn các sản phẩm mà khách hàng đang bán</p>
                </section>

                <label className="boolean-item store-standalone-item">
                  <input
                    type="checkbox"
                    checked={Boolean(form.CoTrenDMS)}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, CoTrenDMS: event.target.checked }))
                    }
                  />
                  <span>{FIELD_LABELS.CoTrenDMS}</span>
                </label>

                {BOOLEAN_GROUPS.map((group) => (
                  <section key={group.title} className="store-section">
                    <h3>{group.title}</h3>
                    <div className="boolean-grid">
                      {group.fields.map((field) => (
                        <label key={field} className="boolean-item">
                          <input
                            type="checkbox"
                            checked={Boolean(form[field])}
                            onChange={(event) =>
                              setForm((prev) => ({ ...prev, [field]: event.target.checked }))
                            }
                          />
                          <span>{FIELD_LABELS[field]}</span>
                        </label>
                      ))}
                    </div>
                  </section>
                ))}
              </div>

              <div className="store-form-actions store-form-grid__full">
                <button className="report-button" type="button" onClick={() => setIsFormOpen(false)}>
                  Hủy
                </button>
                <button className="refresh-button" type="submit" disabled={saving || !canModify}>
                  {saving ? 'Đang lưu...' : !canModify ? 'Chỉ xem' : 'Cập nhật'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {selectedStore ? (
        <div className="modal-overlay" role="presentation" onClick={() => setSelectedStore(null)}>
          <div className="modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className="modal__header">
              <div>
                <p className="eyebrow">Chi tiết cửa hàng</p>
                <h2>{selectedStore.TenCH ?? 'Cửa hàng'}</h2>
              </div>
              <button className="close-button" type="button" onClick={() => setSelectedStore(null)}>
                Đóng
              </button>
            </div>

            <div className="detail-grid">
              {(() => {
                const entries = Object.entries(selectedStore)

                const knownDetailKeys = new Set<string>([
                  ...STORE_ID_KEYS,
                  ...STRING_FIELDS,
                  ...OPTIONAL_TEXT_FIELDS,
                  ...BOOLEAN_FIELDS,
                  ...DETAIL_IMAGE_KEYS,
                  ...DETAIL_CREATOR_KEYS,
                  ...DETAIL_DATE_KEYS,
                ])
                const storeIdKey = STORE_ID_KEYS.find((key) => key in selectedStore)
                const baseRows: Array<[string, unknown]> = [
                  ['__section:base', 'Th&ocirc;ng tin c&#7917;a h&agrave;ng'],
                  ...(storeIdKey ? ([[storeIdKey, selectedStore[storeIdKey]]] as Array<[string, unknown]>) : []),
                  ...STRING_FIELDS.filter((field) => field in selectedStore).map((field) => [field, selectedStore[field]] as [string, unknown]),
                ]
                const booleanRows: Array<[string, unknown]> = BOOLEAN_GROUPS.flatMap((group) => [
                  [`__section:${group.title}`, group.title] as [string, unknown],
                  ...group.fields.map((field) => [field, selectedStore[field]] as [string, unknown]),
                ])
                const noteRows: Array<[string, unknown]> = OPTIONAL_TEXT_FIELDS
                  .filter((field) => field !== 'HinhAnh' && field in selectedStore)
                  .map((field) => [field, selectedStore[field]] as [string, unknown])
                const extraRows = entries.filter(([key]) => !knownDetailKeys.has(key))
                const normal: Array<[string, unknown]> = [
                  ...baseRows,
                  ...booleanRows,
                  ...(noteRows.length ? ([['__section:note', 'Ghi ch&uacute; v&agrave; h&igrave;nh &#7843;nh']] as Array<[string, unknown]>) : []),
                  ...noteRows,
                  ...(extraRows.length ? ([['__section:extra', 'Th&ocirc;ng tin kh&aacute;c']] as Array<[string, unknown]>) : []),
                  ...extraRows,
                ]

                // helper to find first existing key from a list
                const findFirst = (keys: string[]) => {
                  for (const k of keys) {
                    if (k in selectedStore) return k
                  }
                  return null
                }

                const imageKey = findFirst(DETAIL_IMAGE_KEYS)
                const dateKey = findFirst(DETAIL_DATE_KEYS)
                const creatorKey = findFirst(DETAIL_CREATOR_KEYS)

                return (
                  <>
                    {normal.map(([key, value]) => {
                      if (key.startsWith('__section:')) {
                        return (
                          <div className="detail-section-title" key={key}>
                            <h3 dangerouslySetInnerHTML={{ __html: String(value) }} />
                          </div>
                        )
                      }

                      const isBooleanField = BOOLEAN_FIELDS.includes(key as BooleanField)
                      const isActive = isBooleanField && Boolean(value)

                      return (
                        <div
                          className={`detail-item ${isBooleanField ? 'detail-item--status' : ''} ${isActive ? 'detail-item--active' : ''}`}
                          key={key}
                        >
                          <span>{getDetailLabel(key)}</span>
                          <strong>{formatStoreValue(value)}</strong>
                        </div>
                      )
                    })}

                    {!noteRows.length && imageKey && typeof (selectedStore as any)[imageKey] === 'string' && (selectedStore as any)[imageKey].trim() ? (
                      <div className="detail-section-title">
                        <h3>Ghi ch&uacute; v&agrave; h&igrave;nh &#7843;nh</h3>
                      </div>
                    ) : null}

                    {imageKey && typeof (selectedStore as any)[imageKey] === 'string' && (selectedStore as any)[imageKey].trim() ? (
                      <div className="detail-item" key={imageKey}>
                        <span>{getDetailLabel(imageKey)}</span>
                        <img
                          className="store-detail-image"
                          src={resolveImageUrl((selectedStore as any)[imageKey])}
                          alt={selectedStore.TenCH ?? 'Hình ảnh cửa hàng'}
                          loading="lazy"
                        />
                      </div>
                    ) : null}

                    {creatorKey || dateKey ? (
                      <div className="detail-section-title">
                        <h3>Th&ocirc;ng tin c&#7853;p nh&#7853;t</h3>
                      </div>
                    ) : null}

                    {creatorKey ? (
                      <div className="detail-item" key={creatorKey}>
                        <span>{getDetailLabel(creatorKey)}</span>
                        <strong>{getStoreCreatorLabel(selectedStore)}</strong>
                      </div>
                    ) : null}

                    {dateKey ? (
                      <div className="detail-item" key={dateKey}>
                        <span>{getDetailLabel(dateKey)}</span>
                        <strong>{formatStoreDateTime((selectedStore as any)[dateKey])}</strong>
                      </div>
                    ) : null}
                  </>
                )
              })()}
            </div>
          </div>
        </div>
      ) : null}

      <StoreReportModal
        stores={filteredStores}
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        canExport={canExport}
        canManagePlan={currentUserCode === '99'}
      />
      <ConfirmDialog
        isOpen={Boolean(storeToDelete)}
        title="Xác nhận xóa cửa hàng"
        message={`Bạn có chắc muốn xóa cửa hàng "${storeToDelete?.TenCH ?? 'N/A'}" không?`}
        confirmText="Xóa"
        cancelText="Không"
        onConfirm={() => void handleDelete()}
        onCancel={() => setStoreToDelete(null)}
        isLoading={removingId !== null}
      />
    </div>
  )
}
