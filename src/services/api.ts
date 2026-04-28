/**
 * SceneHunt API 客户端
 * 统一封装所有后端 API 调用
 */

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001/api'

// ============================================
// 通用请求函数
// ============================================

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error(error.message || `API Error: ${res.status}`)
  }

  return res.json()
}

// ============================================
// 类型定义
// ============================================

export interface ApiWork {
  id: string
  title: string
  titleEn?: string
  year: number
  director: string
  genre: string[]
  description: string
  poster: string
  color: string
  locationCount: number
  source: string
  sourceId?: string
  actors: string[]
  createdAt: string
  updatedAt: string
}

export interface ApiWorkDetail extends ApiWork {
  locations: ApiLocation[]
}

export interface ApiLocation {
  id: string
  workId: string
  name: string
  address: string
  latitude: number
  longitude: number
  sceneDescription: string
  episode?: string
  timestamp?: string
  screenshotUrl: string
  realPhotoUrl: string
  behindStory?: string
  tags: string[]
  status: string
  source: string
  work?: { id: string; title: string; color: string }
}

export interface ApiFavorite {
  id: string
  userId?: string
  locationId: string
  type: 'want_to_go' | 'checked_in'
  note?: string
  photoUrl?: string
  createdAt: string
  location?: ApiLocation
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

export interface SearchResult {
  type: 'work' | 'location'
  data: any
}

// ============================================
// 作品 API
// ============================================

export const worksApi = {
  /** 获取作品列表 */
  list(params?: { page?: number; pageSize?: number; source?: string }): Promise<PaginatedResponse<ApiWork>> {
    const query = new URLSearchParams()
    if (params?.page) query.set('page', String(params.page))
    if (params?.pageSize) query.set('pageSize', String(params.pageSize))
    if (params?.source) query.set('source', params.source)
    return request(`/works?${query}`)
  },

  /** 获取作品详情 */
  get(id: string): Promise<ApiWorkDetail> {
    return request(`/works/${id}`)
  },

  /** 创建作品 */
  create(data: Partial<ApiWork>): Promise<ApiWork> {
    return request('/works', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  /** 更新作品 */
  update(id: string, data: Partial<ApiWork>): Promise<ApiWork> {
    return request(`/works/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  /** 删除作品 */
  delete(id: string): Promise<{ success: boolean }> {
    return request(`/works/${id}`, { method: 'DELETE' })
  },

  /** 获取作品的取景地列表 */
  locations(workId: string, params?: { status?: string; tag?: string }): Promise<ApiLocation[]> {
    const query = new URLSearchParams()
    if (params?.status) query.set('status', params.status)
    if (params?.tag) query.set('tag', params.tag)
    return request(`/works/${workId}/locations?${query}`)
  },
}

// ============================================
// 取景地 API
// ============================================

export const locationsApi = {
  /** 获取取景地列表 */
  list(params?: { page?: number; pageSize?: number; workId?: string; status?: string; tag?: string }): Promise<PaginatedResponse<ApiLocation>> {
    const query = new URLSearchParams()
    if (params?.page) query.set('page', String(params.page))
    if (params?.pageSize) query.set('pageSize', String(params.pageSize))
    if (params?.workId) query.set('workId', params.workId)
    if (params?.status) query.set('status', params.status)
    if (params?.tag) query.set('tag', params.tag)
    return request(`/locations?${query}`)
  },

  /** 获取取景地详情 */
  get(id: string): Promise<ApiLocation> {
    return request(`/locations/${id}`)
  },

  /** 创建取景地 */
  create(data: Partial<ApiLocation>): Promise<ApiLocation> {
    return request('/locations', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  /** 更新取景地 */
  update(id: string, data: Partial<ApiLocation>): Promise<ApiLocation> {
    return request(`/locations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  /** 删除取景地 */
  delete(id: string): Promise<{ success: boolean }> {
    return request(`/locations/${id}`, { method: 'DELETE' })
  },

  /** 附近取景地 */
  nearby(lat: number, lng: number, radius?: number): Promise<{ data: (ApiLocation & { distance: number })[] }> {
    return request(`/locations/nearby/${lat}/${lng}?radius=${radius || 50}`)
  },
}

// ============================================
// 搜索 API
// ============================================

export const searchApi = {
  /** 全局搜索 */
  search(params: { q: string; type?: string; page?: number; pageSize?: number }): Promise<{ data: SearchResult[]; query: string }> {
    const query = new URLSearchParams()
    query.set('q', params.q)
    if (params.type) query.set('type', params.type)
    if (params.page) query.set('page', String(params.page))
    if (params.pageSize) query.set('pageSize', String(params.pageSize))
    return request(`/search?${query}`)
  },
}

// ============================================
// 收藏 API
// ============================================

export const favoritesApi = {
  /** 获取收藏列表 */
  list(params?: { userId?: string; type?: string; locationId?: string }): Promise<{ data: ApiFavorite[] }> {
    const query = new URLSearchParams()
    if (params?.userId) query.set('userId', params.userId)
    if (params?.type) query.set('type', params.type)
    if (params?.locationId) query.set('locationId', params.locationId)
    return request(`/favorites?${query}`)
  },

  /** 添加收藏/打卡 */
  add(data: { locationId: string; type: 'want_to_go' | 'checked_in'; userId?: string; note?: string }): Promise<ApiFavorite> {
    return request('/favorites', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  /** 删除收藏 */
  remove(id: string): Promise<{ success: boolean }> {
    return request(`/favorites/${id}`, { method: 'DELETE' })
  },

  /** 按地点删除收藏 */
  removeByLocation(locationId: string, params?: { userId?: string; type?: string }): Promise<{ success: boolean }> {
    const query = new URLSearchParams()
    if (params?.userId) query.set('userId', params.userId)
    if (params?.type) query.set('type', params.type)
    return request(`/favorites/by-location/${locationId}?${query}`, { method: 'DELETE' })
  },

  /** 获取统计数据 */
  stats(userId?: string): Promise<{ wantToGo: number; checkedIn: number; total: number }> {
    const query = new URLSearchParams()
    if (userId) query.set('userId', userId)
    return request(`/favorites/stats?${query}`)
  },
}
