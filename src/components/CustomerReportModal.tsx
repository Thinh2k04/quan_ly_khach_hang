import type { Customer } from '../api'
import { buildCreatorReport, buildDailyReport, buildHourlyReport, buildIndustryReport, getPeakHourLabel, getReportMetrics } from '../utils/reportData'
import HourlyWaveChart from './HourlyWaveChart'

type CustomerReportModalProps = {
  customers: Customer[]
  isOpen: boolean
  onClose: () => void
}

function ReportBars({
  title,
  items,
  barClassName,
}: {
  title: string
  items: Array<{ label: string; value: number }>
  barClassName: string
}) {
  const maxValue = Math.max(...items.map((item) => item.value), 1)

  return (
    <section className="report-card">
      <h3>{title}</h3>
      {items.length === 0 ? (
        <p className="report-empty">Chưa có dữ liệu để hiển thị biểu đồ.</p>
      ) : (
        <div className="report-chart-list">
          {items.map((item) => (
            <div className="report-chart-row" key={item.label}>
              <span>{item.label}</span>
              <div className="report-bar-track">
                <div
                  className={barClassName}
                  style={{ width: `${(item.value / maxValue) * 100}%` }}
                />
              </div>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

export default function CustomerReportModal({ customers, isOpen, onClose }: CustomerReportModalProps) {
  if (!isOpen) {
    return null
  }

  const reportMetrics = getReportMetrics(customers)
  const reportByCreator = buildCreatorReport(customers)
  const reportByIndustry = buildIndustryReport(customers)
  const reportByDay = buildDailyReport(customers)
  const reportByHour = buildHourlyReport(customers)

  return (
    <div className="modal-overlay" role="presentation" onClick={onClose}>
      <div
        className="modal report-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal__header">
          <div>
            <p className="eyebrow">Báo cáo</p>
            <h2 id="report-title">Tổng quan</h2>
            <p>Dữ liệu theo bộ lọc hiện tại</p>
          </div>
          <button className="close-button" type="button" onClick={onClose}>
            Đóng
          </button>
        </div>

        <div className="report-kpis">
          <article className="report-kpi-card">
            <span>Tổng bản ghi</span>
            <strong>{reportMetrics.total}</strong>
          </article>
          <article className="report-kpi-card">
            <span>Người tạo</span>
            <strong>{reportMetrics.creators}</strong>
          </article>
          <article className="report-kpi-card">
            <span>NPP</span>
            <strong>{reportMetrics.npps}</strong>
          </article>
          <article className="report-kpi-card">
            <span>Giờ thêm nhiều nhất</span>
            <strong>{getPeakHourLabel(reportByHour)}</strong>
          </article>
        </div>

        <div className="report-grid">
          <ReportBars title="Theo người tạo" items={reportByCreator} barClassName="report-bar report-bar--creator" />
          <ReportBars title="Theo ngành hàng" items={reportByIndustry} barClassName="report-bar report-bar--industry" />

          <section className="report-card report-card--full">
            <h3>Theo ngày tạo (7 ngày gần nhất trong bộ lọc)</h3>
            {reportByDay.length === 0 ? (
              <p className="report-empty">Chưa có dữ liệu ngày để hiển thị biểu đồ.</p>
            ) : (
              <div className="report-chart-list">
                {reportByDay.map((item) => (
                  <div className="report-chart-row" key={item.label}>
                    <span>{item.label}</span>
                    <div className="report-bar-track">
                      <div
                        className="report-bar report-bar--day"
                        style={{ width: `${(item.value / Math.max(...reportByDay.map((entry) => entry.value), 1)) * 100}%` }}
                      />
                    </div>
                    <strong>{item.value}</strong>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="report-card report-card--full">
            <h3>Biểu đồ sóng thời gian khách thêm theo giờ</h3>
            <HourlyWaveChart points={reportByHour} />
          </section>
        </div>
      </div>
    </div>
  )
}