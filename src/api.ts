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
const DEFAULT_STORE_API_URL = 'https://jsk9x6z4-3000.asse.devtunnels.ms/api/cuahang'

export const API_URL = import.meta.env.VITE_KHACHHANG_API_URL ?? DEFAULT_API_URL
export const STORE_API_URL = import.meta.env.VITE_CUAHANG_API_URL ?? DEFAULT_STORE_API_URL

export type Store = {
  id?: number
  Id?: number
  ID?: number
  ma_ch?: number
  MaCH?: number
  TenCH?: string
  DiaChi?: string
  Phuong?: string
  NPP?: string
  Tinh?: string
  CoTrenDMS?: boolean
  CoKeACBT?: boolean
  TraThuongTB?: boolean
  CoHangDoiThuKhong?: boolean
  DoiThuLays?: boolean
  DoiThuOishi?: boolean
  DoiThuPoca?: boolean
  DoiThuOrion?: boolean
  DoiThuKhac?: boolean
  CoViACBT?: boolean
  ViDoiThuOrion?: boolean
  CoHangDoiThuVi?: boolean
  ViDoiThuLays?: boolean
  ViDoiThuOishi?: boolean
  ViDoiThuPoca?: boolean
  ViDoiThuKhac?: boolean
  ChanGaACBT?: boolean
  ChanGaDoiThu?: boolean
  BimKhoACBT?: boolean
  BimKhoDoiThuLays?: boolean
  BimKhoDoiThuOishi?: boolean
  BimKhoDoiThuPoca?: boolean
  BimKhoDoiThuOrion?: boolean
  BimKhoDoiThuKhac?: boolean
  BimUotACBT?: boolean
  BimUotDoiThu?: boolean
  GhiChu?: string | null
  HinhAnh?: string | null
} & Record<string, unknown>

export type StorePayload = {
  TenCH: string
  DiaChi: string
  Phuong: string
  NPP: string
  Tinh: string
  CoTrenDMS: boolean
  CoKeACBT: boolean
  TraThuongTB: boolean
  CoHangDoiThuKhong: boolean
  DoiThuLays: boolean
  DoiThuOishi: boolean
  DoiThuPoca: boolean
  DoiThuOrion: boolean
  DoiThuKhac: boolean
  CoViACBT: boolean
  CoHangDoiThuVi: boolean
  ViDoiThuLays: boolean
  ViDoiThuOishi: boolean
  ViDoiThuPoca: boolean
  ViDoiThuOrion: boolean
  ViDoiThuKhac: boolean
  ChanGaACBT: boolean
  ChanGaDoiThu: boolean
  BimKhoACBT: boolean
  BimKhoDoiThuLays: boolean
  BimKhoDoiThuOishi: boolean
  BimKhoDoiThuPoca: boolean
  BimKhoDoiThuOrion: boolean
  BimKhoDoiThuKhac: boolean
  BimUotACBT: boolean
  BimUotDoiThu: boolean
  GhiChu: string | null
  HinhAnh: string | null
}

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

function normalizeStores(payload: unknown): Store[] {
  if (Array.isArray(payload)) {
    return payload as Store[]
  }

  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>
    const candidate = record.data ?? record.items ?? record.result ?? record.cuahang

    if (Array.isArray(candidate)) {
      return candidate as Store[]
    }
  }

  return []
}

function normalizeStore(payload: unknown): Store {
  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>
    const candidate = record.data ?? record.item ?? record.result ?? record.cuahang

    if (candidate && typeof candidate === 'object') {
      return candidate as Store
    }

    return record as Store
  }

  return {} as Store
}

export async function getCustomers(forceReload = false): Promise<Customer[]> {
  const requestUrl = forceReload
    ? `${API_URL}${API_URL.includes('?') ? '&' : '?'}_ts=${Date.now()}`
    : API_URL

  const response = await fetch(requestUrl, {
    cache: 'no-store',
  })

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

export async function getStores(): Promise<Store[]> {
  const response = await fetch(STORE_API_URL)

  if (!response.ok) {
    throw new Error(`Không thể tải danh sách cửa hàng (${response.status})`)
  }

  const payload = (await response.json()) as unknown
  return normalizeStores(payload)
}

export async function getStoreById(storeId: number): Promise<Store> {
  const response = await fetch(`${STORE_API_URL}/${storeId}`)

  if (!response.ok) {
    throw new Error(`Không thể tải chi tiết cửa hàng ${storeId} (${response.status})`)
  }

  const payload = (await response.json()) as unknown
  return normalizeStore(payload)
}

export async function searchStores(keyword: string): Promise<Store[]> {
  const encodedKeyword = encodeURIComponent(keyword)
  const response = await fetch(`${STORE_API_URL}/timkiem/${encodedKeyword}`)

  if (!response.ok) {
    throw new Error(`Không thể tìm kiếm cửa hàng (${response.status})`)
  }

  const payload = (await response.json()) as unknown
  return normalizeStores(payload)
}

export async function createStore(data: StorePayload): Promise<Store> {
  const response = await fetch(STORE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    throw new Error(`Không thể thêm cửa hàng (${response.status})`)
  }

  const payload = (await response.json()) as unknown
  return normalizeStore(payload)
}

export async function updateStore(storeId: number, data: StorePayload): Promise<Store> {
  const response = await fetch(`${STORE_API_URL}/${storeId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    throw new Error(`Không thể cập nhật cửa hàng ${storeId} (${response.status})`)
  }

  const payload = (await response.json()) as unknown
  return normalizeStore(payload)
}

export async function deleteStore(storeId: number): Promise<void> {
  const response = await fetch(`${STORE_API_URL}/${storeId}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    throw new Error(`Không thể xóa cửa hàng ${storeId} (${response.status})`)
  }
}