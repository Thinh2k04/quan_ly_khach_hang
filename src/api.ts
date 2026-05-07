export type Customer = {
  id: number
  ten: string
  loai?: string
  nganh_hang?: string
  ngay_tao?: string
  nguoi_tao?: string
  npp?: string
  anh?: string
  vi_do?: number
  kinh_do?: number
}

const DEFAULT_API_URL = 'https://jsk9x6z4-3000.asse.devtunnels.ms/api/khachhang'

export const API_URL = import.meta.env.VITE_KHACHHANG_API_URL ?? DEFAULT_API_URL

function normalizeCustomers(payload: unknown): Customer[] {
  if (Array.isArray(payload)) {
    return payload as Customer[]
  }

  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>
    const candidate = record.data ?? record.items ?? record.result ?? record.khachhang

    if (Array.isArray(candidate)) {
      return candidate as Customer[]
    }
  }

  return []
}

export async function getCustomers(): Promise<Customer[]> {
  const response = await fetch(API_URL)

  if (!response.ok) {
    throw new Error(`Không thể tải danh sách khách hàng (${response.status})`)
  }

  const payload = (await response.json()) as unknown
  return normalizeCustomers(payload)
}

export async function deleteCustomer(customerId: number): Promise<void> {
  const response = await fetch(`${API_URL}/${customerId}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    throw new Error(`Không thể xóa khách hàng ${customerId} (${response.status})`)
  }
}