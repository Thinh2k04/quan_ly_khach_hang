export function normalizeSearchText(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

const VN_TIME_ZONE = 'Asia/Ho_Chi_Minh'

function parseDateValue(value: string): Date | null {
  const trimmed = value.trim()

  if (!trimmed) {
    return null
  }

  const date = new Date(trimmed)
  if (!Number.isNaN(date.getTime())) {
    return date
  }

  const normalized = trimmed.replace(' ', 'T')
  const fallbackDate = new Date(normalized)
  return Number.isNaN(fallbackDate.getTime()) ? null : fallbackDate
}

function getDatePartsInVnTimeZone(date: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: VN_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)

  const year = parts.find((part) => part.type === 'year')?.value
  const month = parts.find((part) => part.type === 'month')?.value
  const day = parts.find((part) => part.type === 'day')?.value

  if (!year || !month || !day) {
    return null
  }

  return { year, month, day }
}

export function formatDate(value?: string) {
  if (!value) {
    return 'Chưa có'
  }

  // If value looks like ISO timestamp (e.g., "2026-05-07T18:55:37.430Z"), 
  // extract hour and minute directly without timezone conversion
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value.trim())
  
  if (isoMatch) {
    const [, year, month, day, hour, minute] = isoMatch
    const dayNum = String(Number(day))
    const monthNum = String(Number(month))
    return `${hour}:${minute} ${dayNum} thg ${monthNum}, ${year}`
  }

  const date = parseDateValue(value)
  if (!date) {
    return value
  }

  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: VN_TIME_ZONE,
  }).format(date)
}

export function formatDateToVnTime(value?: string) {
  if (!value) {
    return 'Chưa có'
  }

  const date = parseDateValue(value)
  if (!date) {
    return value
  }

  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: VN_TIME_ZONE,
  }).format(date)
}

export function getDateKey(value?: string) {
  if (!value) {
    return ''
  }

  const date = parseDateValue(value)
  if (!date) {
    return ''
  }

  const parts = getDatePartsInVnTimeZone(date)
  if (!parts) {
    return ''
  }

  return `${parts.year}-${parts.month}-${parts.day}`
}

export function resolveImageUrl(path?: string) {
  if (!path) {
    return ''
  }

  const normalizedPath = path.trim().replace(/\\/g, '/')
  const UPLOAD_ORIGIN = 'https://jsk9x6z4-3000.asse.devtunnels.ms'

  if (/^https?:\/\//i.test(normalizedPath)) {
    return normalizedPath
  }

  if (normalizedPath.startsWith('/uploads/') || normalizedPath.startsWith('uploads/')) {
    const uploadPath = normalizedPath.startsWith('/') ? normalizedPath : `/${normalizedPath}`
    return new URL(uploadPath, UPLOAD_ORIGIN).toString()
  }

  try {
    const storeApiUrl = import.meta.env.VITE_CUAHANG_API_URL as string | undefined
    const customerApiUrl = import.meta.env.VITE_KHACHHANG_API_URL as string | undefined

    const fallbackBase =
      typeof window !== 'undefined' && window.location?.origin
        ? window.location.origin
        : UPLOAD_ORIGIN

    const baseUrl = storeApiUrl || customerApiUrl || fallbackBase

    return new URL(normalizedPath, baseUrl).toString()
  } catch {
    return normalizedPath
  }
}

export function createInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)

  if (parts.length === 0) {
    return 'KH'
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase()
  }

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

export function sameDay(dateValue?: string) {
  if (!dateValue) {
    return false
  }

  const date = parseDateValue(dateValue)
  if (!date) {
    return false
  }

  const today = new Date()
  const dateParts = getDatePartsInVnTimeZone(date)
  const todayParts = getDatePartsInVnTimeZone(today)
  if (!dateParts || !todayParts) {
    return false
  }

  return (
    dateParts.year === todayParts.year &&
    dateParts.month === todayParts.month &&
    dateParts.day === todayParts.day
  )
}

export function formatDetailValue(value: unknown): string {
  if (value === null || value === undefined || value === '') {
    return '—'
  }

  if (typeof value === 'string') {
    return value
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }

  if (Array.isArray(value)) {
    return value.length > 0 ? value.map(formatDetailValue).join(', ') : '—'
  }

  return JSON.stringify(value)
}

export function isLinkLikeValue(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    (value.startsWith('/') || /^https?:\/\//i.test(value) || value.includes('://'))
  )
}