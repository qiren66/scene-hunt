import { defineStore } from 'pinia'
import { ref } from 'vue'
import { worksApi, locationsApi, searchApi, favoritesApi } from '@/services/api'
import type { ApiWork, ApiWorkDetail, ApiLocation, SearchResult, ApiFavorite } from '@/services/api'

export const useDataStore = defineStore('data', () => {
  // ============================================
  // 作品相关
  // ============================================
  const works = ref<ApiWork[]>([])
  const currentWork = ref<ApiWorkDetail | null>(null)
  const worksLoading = ref(false)

  async function fetchWorks() {
    worksLoading.value = true
    try {
      const res = await worksApi.list({ pageSize: 100 })
      works.value = res.data
    } finally {
      worksLoading.value = false
    }
  }

  async function fetchWorkDetail(id: string) {
    worksLoading.value = true
    try {
      currentWork.value = await worksApi.get(id)
      return currentWork.value
    } finally {
      worksLoading.value = false
    }
  }

  // ============================================
  // 取景地相关
  // ============================================
  const locations = ref<ApiLocation[]>([])
  const currentLocation = ref<ApiLocation | null>(null)
  const locationsLoading = ref(false)

  async function fetchLocations(workId: string) {
    locationsLoading.value = true
    try {
      locations.value = await worksApi.locations(workId)
    } finally {
      locationsLoading.value = false
    }
  }

  async function fetchLocationDetail(id: string) {
    locationsLoading.value = true
    try {
      currentLocation.value = await locationsApi.get(id)
      return currentLocation.value
    } finally {
      locationsLoading.value = false
    }
  }

  async function fetchNearbyLocations(lat: number, lng: number, radius = 50) {
    locationsLoading.value = true
    try {
      const res = await locationsApi.nearby(lat, lng, radius)
      locations.value = res.data
    } finally {
      locationsLoading.value = false
    }
  }

  // ============================================
  // 搜索
  // ============================================
  const searchResults = ref<SearchResult[]>([])
  const searchLoading = ref(false)

  async function search(query: string) {
    if (!query.trim()) {
      searchResults.value = []
      return
    }
    searchLoading.value = true
    try {
      const res = await searchApi.search({ q: query })
      searchResults.value = res.data
    } finally {
      searchLoading.value = false
    }
  }

  // ============================================
  // 收藏
  // ============================================
  const favoriteList = ref<ApiFavorite[]>([])
  const favoriteLoading = ref(false)

  async function fetchFavorites(params?: { userId?: string; type?: string }) {
    favoriteLoading.value = true
    try {
      const res = await favoritesApi.list(params)
      favoriteList.value = res.data
    } finally {
      favoriteLoading.value = false
    }
  }

  async function addFavorite(locationId: string, type: 'want_to_go' | 'checked_in', note?: string) {
    const fav = await favoritesApi.add({ locationId, type, note })
    favoriteList.value.unshift(fav)
    return fav
  }

  async function removeFavorite(id: string) {
    await favoritesApi.remove(id)
    favoriteList.value = favoriteList.value.filter(f => f.id !== id)
  }

  async function removeFavoriteByLocation(locationId: string, type?: string) {
    await favoritesApi.removeByLocation(locationId, { type })
    favoriteList.value = favoriteList.value.filter(f => f.locationId !== locationId)
  }

  function isFavorite(locationId: string): boolean {
    return favoriteList.value.some(f => f.locationId === locationId)
  }

  function isCheckedIn(locationId: string): boolean {
    return favoriteList.value.some(f => f.locationId === locationId && f.type === 'checked_in')
  }

  return {
    // 作品
    works,
    currentWork,
    worksLoading,
    fetchWorks,
    fetchWorkDetail,
    // 取景地
    locations,
    currentLocation,
    locationsLoading,
    fetchLocations,
    fetchLocationDetail,
    fetchNearbyLocations,
    // 搜索
    searchResults,
    searchLoading,
    search,
    // 收藏
    favoriteList,
    favoriteLoading,
    fetchFavorites,
    addFavorite,
    removeFavorite,
    removeFavoriteByLocation,
    isFavorite,
    isCheckedIn,
  }
})
