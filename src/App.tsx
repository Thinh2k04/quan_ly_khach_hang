import { useEffect, useMemo, useState } from 'react'
import { deleteCustomer, getCustomers, type Customer } from './api'
import CustomerDetailModal from './components/CustomerDetailModal'
import CustomerReportModal from './components/CustomerReportModal'
import { CREATOR_NAME_MAP, MAPPED_CREATOR_CODES } from './constants/creatorNames'
import { formatDate, getDateKey, normalizeSearchText, sameDay } from './utils/customerFormatters'
import type { CustomerDetail } from './types/customer'

type Status = 'idle' | 'loading' | 'ready' | 'error'

function App() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [status, setStatus] = useState<Status>('loading')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [creatorFilter, setCreatorFilter] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [removingId, setRemovingId] = useState<number | null>(null)
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDetail | null>(null)
  const [isReportOpen, setIsReportOpen] = useState(false)

  const loadCustomers = async () => {
    setStatus('loading')
    setError(null)

    try {
      const data = await getCustomers()
      setCustomers(data)
      setStatus('ready')
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Không thể tải dữ liệu khách hàng')
      setStatus('error')
    }
  }

  useEffect(() => {
    void loadCustomers()
  }, [])

  const creatorOptions = useMemo(() => {
    const creators = new Set<string>(MAPPED_CREATOR_CODES)

    customers
      .map((customer) => customer.nguoi_tao?.toUpperCase().trim())
      .filter((value): value is string => Boolean(value))
      .forEach((creatorCode) => creators.add(creatorCode))

    return Array.from(creators).sort()
  }, [customers])

  const filteredCustomers = useMemo(() => {
    const keyword = normalizeSearchText(search)

    return customers.filter((customer) => {
      const creatorCode = customer.nguoi_tao?.toUpperCase()
      const isMappedCreator =
        typeof creatorCode === 'string' &&
        Object.prototype.hasOwnProperty.call(CREATOR_NAME_MAP, creatorCode)
      const matchesCreator = !creatorFilter || creatorCode === creatorFilter
      const matchesDate = !dateFilter || getDateKey(customer.ngay_tao) === dateFilter

      if (!matchesCreator || !matchesDate) {
        return false
      }

      if (!keyword) {
        return true
      }

      const creatorFullName = isMappedCreator ? CREATOR_NAME_MAP[creatorCode] : undefined
      const values = Object.values(customer).filter(
        (value) => value !== null && value !== undefined && value !== '',
      )

      const searchFields = [
        ...values,
        customer.ngay_tao,
        formatDate(customer.ngay_tao),
        creatorCode,
        creatorFullName,
      ]

      return searchFields.some((field) =>
        normalizeSearchText(String(field ?? '')).includes(keyword),
      )
    })
  }, [creatorFilter, customers, dateFilter, search])

  const metrics = useMemo(() => {
    const stores = new Set(customers.map((customer) => customer.npp).filter(Boolean))
    const categories = new Set(customers.map((customer) => customer.loai).filter(Boolean))
    const todayCreated = customers.filter((customer) => sameDay(customer.ngay_tao)).length

    return {
      total: customers.length,
      stores: stores.size,
      categories: categories.size,
      todayCreated,
    }
  }, [customers])

  const handleDelete = async (customer: Customer) => {
    const confirmed = window.confirm(`Xóa khách hàng "${customer.ten}"?`)

    if (!confirmed) {
      return
    }

    setRemovingId(customer.id)
    setNotice(null)

    try {
      await deleteCustomer(customer.id)
      setCustomers((current) => current.filter((item) => item.id !== customer.id))
      setNotice(`Đã xóa khách hàng ${customer.ten}`)
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Không thể xóa khách hàng')
      setStatus('error')
    } finally {
      setRemovingId(null)
    }
  }

  const openDetail = (customer: Customer) => {
    setSelectedCustomer(customer as CustomerDetail)
  }

  return (
    <div className="app-shell">
      <div className="ambient ambient-left" />
      <div className="ambient ambient-right" />

      <header className="hero">
        <div>
          <p className="eyebrow">Màn quản lý bán hàng</p>
          <h1>Khách hàng</h1>
          <p className="hero-copy">
            Theo dõi danh sách khách hàng
          </p>
        </div>
      </header>

      <section className="stats-grid" aria-label="Thống kê khách hàng">
        <article className="stat-card">
          <span>Tổng khách hàng</span>
          <strong>{metrics.total}</strong>
        </article>
        <article className="stat-card">
          <span>Khách tạo hôm nay</span>
          <strong>{metrics.todayCreated}</strong>
        </article>
        <article className="stat-card">
          <span>NPP khác nhau</span>
          <strong>{metrics.stores}</strong>
        </article>
        <article className="stat-card">
          <span>Loại khách hàng</span>
          <strong>{metrics.categories}</strong>
        </article>
      </section>

      <section className="toolbar">
        <div className="toolbar__filters">
          <label className="search-box" htmlFor="customer-search">
            <span>Tìm kiếm</span>
            <input
              id="customer-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Nhập tên, loại, ngành hàng, NPP..."
            />
          </label>

          <label className="combo-box" htmlFor="creator-filter">
            <span>Người tạo</span>
            <select
              id="creator-filter"
              value={creatorFilter}
              onChange={(event) => setCreatorFilter(event.target.value)}
            >
              <option value="">Tất cả người tạo</option>
              {creatorOptions.map((creatorCode) => (
                <option key={creatorCode} value={creatorCode}>
                  {creatorCode}
                  {CREATOR_NAME_MAP[creatorCode] ? ` - ${CREATOR_NAME_MAP[creatorCode]}` : ''}
                </option>
              ))}
            </select>
          </label>

          <label className="combo-box" htmlFor="date-filter">
            <span>Ngày tạo</span>
            <input
              id="date-filter"
              type="date"
              value={dateFilter}
              onChange={(event) => setDateFilter(event.target.value)}
            />
          </label>
        </div>

        <div className="toolbar__actions">
          <button className="report-button" type="button" onClick={() => setIsReportOpen(true)}>
            Báo cáo
          </button>
          <button className="refresh-button" type="button" onClick={() => void loadCustomers()}>
            Làm mới dữ liệu
          </button>
        </div>
      </section>

      {notice ? <div className="notice" role="status">{notice}</div> : null}
      {error ? <div className="error-banner" role="alert">{error}</div> : null}

      <main className="panel">
        <div className="panel__header">
          <div>
            <h2>Danh sách khách hàng</h2>
            <p>{filteredCustomers.length} bản ghi phù hợp với bộ lọc hiện tại</p>
          </div>
          <span className="panel__badge">{status === 'loading' ? 'Đang tải...' : 'Sẵn sàng'}</span>
        </div>

        {status === 'loading' ? (
          <div className="empty-state">Đang tải dữ liệu khách hàng...</div>
        ) : filteredCustomers.length === 0 ? (
          <div className="empty-state">
            <strong>Không có kết quả phù hợp.</strong>
            <span>Thử xóa nội dung tìm kiếm hoặc làm mới dữ liệu.</span>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="customer-table">
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Khách hàng</th>
                  <th>Loại</th>
                  <th>Ngành hàng</th>
                  <th>NPP</th>
                  <th>Ngày tạo</th>
                  <th>Người tạo</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((customer, index) => {
                  return (
                    <tr key={customer.id}>
                      <td>{index + 1}</td>
                      <td>
                        <div className="customer-cell">
                          <div>
                            <strong>{customer.ten}</strong>
                            <span>Mã #{customer.id}</span>
                          </div>
                        </div>
                      </td>
                      <td>{customer.loai ?? '—'}</td>
                      <td>{customer.nganh_hang ?? '—'}</td>
                      <td>{customer.npp ?? '—'}</td>
                      <td>{formatDate(customer.ngay_tao)}</td>
                      <td>{customer.nguoi_tao ?? '—'}</td>
                      <td>
                        <div className="action-group">
                          <button
                            className="detail-button"
                            type="button"
                            onClick={() => openDetail(customer)}
                          >
                            Xem chi tiết
                          </button>
                          <button
                            className="delete-button"
                            type="button"
                            onClick={() => void handleDelete(customer)}
                            disabled={removingId === customer.id}
                          >
                            {removingId === customer.id ? 'Đang xóa...' : 'Xóa'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {status === 'error' ? (
          <button className="retry-button" type="button" onClick={() => void loadCustomers()}>
            Tải lại
          </button>
        ) : null}
      </main>

      <CustomerDetailModal customer={selectedCustomer} onClose={() => setSelectedCustomer(null)} />
      <CustomerReportModal customers={filteredCustomers} isOpen={isReportOpen} onClose={() => setIsReportOpen(false)} />
    </div>
  )
}

export default App