function stripVietnameseDiacritics(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
}

function removeLocationPrefix(value: string): string {
  return value.replace(/^(tỉnh|tinh|thành\s*phố|thanh\s*pho|tp)\.?\s+/i, '')
}

function toVietnameseTitleCase(value: string): string {
  return value
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toLocaleUpperCase('vi-VN') + word.slice(1))
    .join(' ')
}

function normalizeSpacing(value: string): string {
  return value
    .trim()
    .replace(/[,.;]+/g, ' ')
    .replace(/\s+/g, ' ')
}

export function getLocationKey(rawValue: string | null | undefined): string {
  if (!rawValue || !rawValue.trim()) {
    return 'chua-ro'
  }

  const normalized = normalizeSpacing(rawValue)
  const withoutPrefix = removeLocationPrefix(normalized)

  if (!withoutPrefix) {
    return 'chua-ro'
  }

  return stripVietnameseDiacritics(withoutPrefix).toLocaleLowerCase('vi-VN')
}

export function getLocationLabel(rawValue: string | null | undefined): string {
  if (!rawValue || !rawValue.trim()) {
    return 'Chưa rõ'
  }

  const normalized = normalizeSpacing(rawValue)
  const withoutPrefix = removeLocationPrefix(normalized)

  if (!withoutPrefix) {
    return 'Chưa rõ'
  }

  return toVietnameseTitleCase(withoutPrefix.toLocaleLowerCase('vi-VN'))
}
