import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import type { Favorite } from '@/types'

const STORAGE_KEY = 'scene-hunt-favorites'

function loadFavorites(): Favorite[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export const useFavoritesStore = defineStore('favorites', () => {
  const favorites = ref<Favorite[]>(loadFavorites())

  watch(favorites, (val) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(val))
  }, { deep: true })

  function addFavorite(locationId: string, type: Favorite['type'], note?: string) {
    const existing = favorites.value.find(f => f.locationId === locationId)
    if (existing) {
      existing.type = type
      existing.note = note
    } else {
      favorites.value.push({ locationId, type, createdAt: Date.now(), note })
    }
  }

  function removeFavorite(locationId: string) {
    favorites.value = favorites.value.filter(f => f.locationId !== locationId)
  }

  function getFavorite(locationId: string): Favorite | undefined {
    return favorites.value.find(f => f.locationId === locationId)
  }

  function isFavorite(locationId: string): boolean {
    return favorites.value.some(f => f.locationId === locationId)
  }

  function getFavoritesByType(type: Favorite['type']): Favorite[] {
    return favorites.value.filter(f => f.type === type)
  }

  function toggleFavorite(locationId: string, type: Favorite['type']) {
    if (isFavorite(locationId)) {
      removeFavorite(locationId)
    } else {
      addFavorite(locationId, type)
    }
  }

  function isCheckedIn(locationId: string): boolean {
    return favorites.value.some(f => f.locationId === locationId && f.type === 'checked_in')
  }

  return {
    favorites,
    addFavorite,
    removeFavorite,
    getFavorite,
    isFavorite,
    getFavoritesByType,
    toggleFavorite,
    isCheckedIn,
  }
})
