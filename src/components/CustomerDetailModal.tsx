import type { Customer } from '../api'
import type { CustomerDetail } from '../types/customer'
import {
  createInitials,
  formatDate,
  formatDetailValue,
  isLinkLikeValue,
  resolveImageUrl,
} from '../utils/customerFormatters'

type CustomerDetailModalProps = {
  customer: CustomerDetail | null
  onClose: () => void
}

export default function CustomerDetailModal({ customer, onClose }: CustomerDetailModalProps) {
  if (!customer) {
    return null
  }

  const detailEntries = Object.entries(customer)
  const linkEntries = detailEntries.filter(
    (entry): entry is [string, string] => entry[0] !== 'anh' && isLinkLikeValue(entry[1]),
  )

  return (
    <div className="modal-overlay" role="presentation" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="customer-detail-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal__header">
          <div>
            <p className="eyebrow">Xem chi tiết</p>
            <h2 id="customer-detail-title">{customer.ten}</h2>
            <p>Mã khách hàng #{customer.id}</p>
          </div>
          <button className="close-button" type="button" onClick={onClose}>
            Đóng
          </button>
        </div>

        <div className="modal__hero">
          {resolveImageUrl(customer.anh) ? (
            <img className="modal__image" src={resolveImageUrl(customer.anh)} alt={customer.ten} />
          ) : (
            <div className="modal__image modal__image--fallback">{createInitials(customer.ten)}</div>
          )}

          <div className="modal__summary">
            <div>
              <span>Loại</span>
              <strong>{customer.loai ?? '—'}</strong>
            </div>
            <div>
              <span>NPP</span>
              <strong>{customer.npp ?? '—'}</strong>
            </div>
            <div>
              <span>Ngành hàng</span>
              <strong>{customer.nganh_hang ?? '—'}</strong>
            </div>
          </div>
        </div>

        <div className="detail-grid">
          {detailEntries
            .filter(([key]) => key !== 'anh')
            .map(([key, value]) => (
              <div className="detail-item" key={key}>
                <span>{key}</span>
                {key === 'ngay_tao' ? (
                  <strong>{formatDate(String(value))}</strong>
                ) : isLinkLikeValue(value) ? (
                  <a className="detail-link" href={value} target="_blank" rel="noreferrer">
                    {value}
                  </a>
                ) : (
                  <strong>{formatDetailValue(value)}</strong>
                )}
              </div>
            ))}
        </div>

        {linkEntries.length > 0 ? (
          <section className="link-section">
            <h3>Đường dẫn dữ liệu</h3>
            <div className="link-list">
              {linkEntries.map(([key, value]) => (
                <a className="link-chip" href={value} key={key} target="_blank" rel="noreferrer">
                  <span>{key}</span>
                  <strong>{value}</strong>
                </a>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  )
}