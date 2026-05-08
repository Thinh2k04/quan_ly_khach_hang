import { useEffect, useMemo, useState } from 'react'
import { deleteCustomer, getCustomers, type Customer } from './api'
import CustomerDetailModal from './components/CustomerDetailModal'
import ConfirmDialog from './components/ConfirmDialog'
import CustomerReportModal from './components/CustomerReportModal'
import LoginPage from './components/LoginPage'
import StoreFieldReportPage from './components/StoreFieldReportPage'
import { CREATOR_NAME_MAP, MAPPED_CREATOR_CODES } from './constants/creatorNames'
import { formatDateToVnTime, getDateKey, normalizeSearchText, sameDay } from './utils/customerFormatters'
import type { CustomerDetail } from './types/customer'

type Status = 'idle' | 'loading' | 'ready' | 'error'
const NOTICE_HIDE_DELAY_MS = 2500

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem('isLoggedIn') === 'true'
  })
  const [isAuthLoading, setIsAuthLoading] = useState(false)
  const [activePage, setActivePage] = useState<'customers' | 'stores'>('customers')
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
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null)

  const loadCustomers = async (forceReload = false) => {
    setStatus('loading')
    setError(null)

    try {
      const data = await getCustomers(forceReload)
      setCustomers(data)
      setStatus('ready')
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Không thể tải dữ liệu khách hàng')
      setStatus('error')
    }
  }

  const handleRefreshCustomers = async () => {
    setSearch('')
    setCreatorFilter('')
    setDateFilter('')
    setSelectedCustomer(null)
    await loadCustomers(true)
  }

  const handleLogin = async (username: string, password: string) => {
    setIsAuthLoading(true)
    setError(null)

    // Simulate login delay
    await new Promise((resolve) => setTimeout(resolve, 800))

    // Simple validation: username and password must be at least 3 characters
    if (username.length >= 3 && password.length >= 3) {
      localStorage.setItem('isLoggedIn', 'true')
      localStorage.setItem('username', username)
      setIsLoggedIn(true)
    } else {
      setError('Tên đăng nhập và mật khẩu phải có ít nhất 3 ký tự')
    }

    setIsAuthLoading(false)
  }

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn')
    localStorage.removeItem('username')
    setIsLoggedIn(false)
    setActivePage('customers')
    setCustomers([])
  }

  if (!isLoggedIn) {
    return <LoginPage onLogin={handleLogin} isLoading={isAuthLoading} error={error} onErrorClear={() => setError(null)} />
  }

  useEffect(() => {
    void loadCustomers()
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
        formatDateToVnTime(customer.ngay_tao),
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

  const handleDeleteRequest = (customer: Customer) => {
    setCustomerToDelete(customer)
  }

  const handleDelete = async () => {
    if (!customerToDelete) {
      return
    }

    const customer = customerToDelete
    setCustomerToDelete(null)

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

  if (activePage === 'stores') {
    return <StoreFieldReportPage onBack={() => setActivePage('customers')} />
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
          <button className="report-button" type="button" onClick={() => setActivePage('stores')}>
            Báo cáo thực địa
          </button>
          <button className="report-button" type="button" onClick={() => setIsReportOpen(true)}>
            Báo cáo
          </button>
          <button className="refresh-button" type="button" onClick={() => void handleRefreshCustomers()}>
            Làm mới dữ liệu
          </button>
          <button className="logout-button" type="button" onClick={handleLogout}>
            Đăng xuất
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
                      <td>{formatDateToVnTime(customer.ngay_tao)}</td>
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
                            onClick={() => handleDeleteRequest(customer)}
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
      <ConfirmDialog
        isOpen={Boolean(customerToDelete)}
        title="Xác nhận xóa khách hàng"
        message={`Bạn có chắc muốn xóa khách hàng "${customerToDelete?.ten ?? ''}" không?`}
        confirmText="Xóa"
        cancelText="Không"
        onConfirm={() => void handleDelete()}
        onCancel={() => setCustomerToDelete(null)}
        isLoading={removingId !== null}
      />
    </div>
  )
}

export default App