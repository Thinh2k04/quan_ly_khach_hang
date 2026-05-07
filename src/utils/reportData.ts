import type { Customer } from '../api'
import { CREATOR_NAME_MAP } from '../constants/creatorNames'
import { getDateKey } from './customerFormatters'

export type ReportPoint = {
  label: string
  value: number
}

export function getReportMetrics(customers: Customer[]) {
  const creatorCount = new Set(customers.map((customer) => customer.nguoi_tao).filter(Boolean)).size
  const nppCount = new Set(customers.map((customer) => customer.npp).filter(Boolean)).size

  return {
    total: customers.length,
    creators: creatorCount,
    npps: nppCount,
  }
}

export function buildCreatorReport(customers: Customer[]): ReportPoint[] {
  const creatorMap = new Map<string, number>()

  customers.forEach((customer) => {
    const creatorCode = customer.nguoi_tao?.toUpperCase().trim()

    if (!creatorCode) {
      return
    }

    const creatorLabel = CREATOR_NAME_MAP[creatorCode]
      ? `${creatorCode} - ${CREATOR_NAME_MAP[creatorCode]}`
      : creatorCode

    creatorMap.set(creatorLabel, (creatorMap.get(creatorLabel) ?? 0) + 1)
  })

  return Array.from(creatorMap.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8)
}

export function buildIndustryReport(customers: Customer[]): ReportPoint[] {
  const industryMap = new Map<string, number>()

  customers.forEach((customer) => {
    const industry = customer.nganh_hang?.trim() || 'Chưa phân loại'
    industryMap.set(industry, (industryMap.get(industry) ?? 0) + 1)
  })

  return Array.from(industryMap.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8)
}

export function buildDailyReport(customers: Customer[]): ReportPoint[] {
  const dayMap = new Map<string, number>()

  customers.forEach((customer) => {
    const day = getDateKey(customer.ngay_tao)

    if (!day) {
      return
    }

    dayMap.set(day, (dayMap.get(day) ?? 0) + 1)
  })

  return Array.from(dayMap.entries())
    .sort(([dayA], [dayB]) => dayA.localeCompare(dayB))
    .slice(-7)
    .map(([day, value]) => ({
      label: new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit' }).format(new Date(day)),
      value,
    }))
}

export function buildHourlyReport(customers: Customer[]): ReportPoint[] {
  const hours = Array.from({ length: 24 }, (_, hour) => ({
    label: `${String(hour).padStart(2, '0')}h`,
    value: 0,
  }))

  customers.forEach((customer) => {
    if (!customer.ngay_tao) {
      return
    }

    const date = new Date(customer.ngay_tao)

    if (Number.isNaN(date.getTime())) {
      return
    }

    const hour = date.getHours()
    hours[hour].value += 1
  })

  return hours
}

export function getPeakHourLabel(points: ReportPoint[]) {
  const peak = points.reduce<ReportPoint | null>((current, candidate) => {
    if (!current || candidate.value > current.value) {
      return candidate
    }

    return current
  }, null)

  return peak ? `${peak.label} (${peak.value})` : 'Chưa có dữ liệu'
}