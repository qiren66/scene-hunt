<template>
  <div class="explore-page">
    <!-- 全屏地图 -->
    <div ref="mapEl" class="map-container"></div>

    <!-- 顶部工具栏 -->
    <div class="top-bar">
      <div class="brand" @click="resetView">
        <span class="brand-icon">🎬</span>
        <span class="brand-text">SceneHunt</span>
      </div>

      <!-- 搜索框 -->
      <div class="search-box" :class="{ focused: searchFocused }">
        <span class="search-icon">🔍</span>
        <input
          v-model="searchQuery"
          class="search-input"
          placeholder="搜索作品名称..."
          @focus="searchFocused = true"
          @blur="onSearchBlur"
          @input="onSearchInput"
        />
        <button v-if="searchQuery" class="search-clear" @click="clearSearch">✕</button>

        <!-- 搜索结果下拉 -->
        <div v-if="searchQuery && searchResults.length > 0" class="search-dropdown">
          <div
            v-for="work in searchResults"
            :key="work.id"
            class="search-result-item"
            @mousedown.prevent="selectSearchResult(work)"
          >
            <div class="result-dot" :style="{ background: work.color }"></div>
            <div class="result-info">
              <span class="result-title">{{ work.title }}</span>
              <span class="result-meta">{{ work.locationCount }} 地点 · {{ work.city || '日本' }}</span>
            </div>
          </div>
        </div>
        <div v-else-if="searchQuery && searchResults.length === 0 && !isSearching" class="search-dropdown">
          <div class="search-empty">未找到匹配的作品</div>
        </div>
      </div>

      <div class="top-actions">
        <button
          v-for="style in mapStyles"
          :key="style.id"
          class="top-btn"
          :class="{ active: currentStyle === style.id }"
          @click="changeMapStyle(style.id)"
          :title="style.label"
        >{{ style.icon }}</button>
        <button class="top-btn" @click="locateUser" title="定位">📍</button>
      </div>
    </div>

    <!-- 左侧作品列表面板 -->
    <div class="side-panel" :class="{ open: panelOpen }">
      <div class="panel-header">
        <h2 class="panel-title">作品列表</h2>
        <span class="panel-count">{{ anitabiWorks.length }} 部</span>
        <button class="panel-close" @click="panelOpen = false">✕</button>
      </div>

      <div class="panel-body">
        <!-- 加载进度 -->
        <div v-if="loadingProgress < 100" class="progress-bar">
          <div class="progress-fill" :style="{ width: loadingProgress + '%' }"></div>
          <span class="progress-text">{{ loadedCount }}/{{ totalCount }}</span>
        </div>

        <!-- 作品列表 -->
        <div class="work-list">
          <div
            v-for="item in anitabiWorks"
            :key="item.id"
            class="work-item"
            :class="{ active: hoveredWorkId === item.id }"
            @mouseenter="highlightWork(item.id)"
            @mouseleave="unhighlightWork()"
            @click="flyToWork(item)"
          >
            <div class="work-dot" :style="{ background: item.color }"></div>
            <div class="work-info">
              <span class="work-name">{{ item.title }}</span>
              <span class="work-meta">{{ item.locationCount }} 地点 · {{ item.city || '日本' }}</span>
            </div>
          </div>
        </div>

        <div v-if="anitabiWorks.length === 0 && !loading" class="empty-hint">
          加载失败，请刷新重试
        </div>
      </div>
    </div>

    <!-- 面板开关按钮 -->
    <button
      v-if="!panelOpen"
      class="panel-toggle-btn"
      @click="panelOpen = true"
    >
      📋 作品列表
    </button>

    <!-- 底部状态栏 -->
    <div class="status-bar">
      <span v-if="loading" class="status-loading">正在加载标记点...</span>
      <span v-else-if="selectedWorkId" class="status-filtered">
        🔍 已筛选: {{ anitabiWorks.find(w => w.id === selectedWorkId)?.title }} ({{ totalMarkers }} 个标记)
        <button class="filter-clear-btn" @click="clearSearchFilter">清除筛选</button>
      </span>
      <span v-else class="status-done">✓ {{ totalMarkers }} 个标记点</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import L from 'leaflet'
import {
  createMap as createLeafletMap,
  switchTileLayer,
  flyToWGS84,
  createCircleMarker,
  createImagePopup,
  updateMarkerCoord,
  getCurrentPosition,
  MAP_STYLES,
  getStreetViewUrl,
  getGoogleMapsUrl,
} from '@/utils/leaflet-map'
import type { Map as LeafletMap } from 'leaflet'
import type { MapStyle } from '@/utils/leaflet-map'
const API_BASE = import.meta.env.VITE_API_BASE || '/api'

// === 本地后端数据类型 ===
interface MapLocation {
  id: string
  name: string
  cn?: string
  latitude: number
  longitude: number
  screenshotUrl: string
  episode?: string
  ep?: number
  s?: number
  origin?: string
  originURL?: string
}

interface MapWork {
  id: string
  title: string
  titleEn?: string
  color: string
  city?: string
  latitude: number
  longitude: number
  zoom: number
  poster: string
  locationCount: number
  source: string
  sourceId?: string
  locations: MapLocation[]
}

// === State ===
const mapEl = ref<HTMLDivElement>()
const panelOpen = ref(false)
const currentStyle = ref<MapStyle>('satellite')
const loading = ref(false)
const loadedCount = ref(0)
const totalCount = ref(0)
const hoveredWorkId = ref<string | null>(null)
const totalMarkers = ref(0)
const anitabiWorks = ref<MapWork[]>([])
const mapStyles = MAP_STYLES

// === 搜索状态 ===
const searchQuery = ref('')
const searchFocused = ref(false)
const isSearching = ref(false)
const searchResults = ref<MapWork[]>([])
const selectedWorkId = ref<string | null>(null)

// Map internals
let map: LeafletMap | null = null
let allMarkers: L.CircleMarker[] = []
const workMarkerMap = new Map<string, L.CircleMarker[]>()

const loadingProgress = computed(() =>
  totalCount.value > 0 ? Math.round((loadedCount.value / totalCount.value) * 100) : 0
)

onMounted(() => {
  initMap()
  loadAllDataProgressive()
})

onUnmounted(() => {
  allMarkers.forEach((m) => m.remove())
  map?.remove()
})

// === 地图初始化 ===
function initMap() {
  if (!mapEl.value) return

  map = createLeafletMap(mapEl.value, {
    center: [35.0, 137.0],
    zoom: 5,
  })

  map.on('click', () => {
    map?.closePopup()
  })
}

// === 渐进式数据加载 ===
async function loadAllDataProgressive() {
  loading.value = true
  loadedCount.value = 0
  let markerCount = 0

  try {
    // 从本地后端获取所有作品和地标数据
    const res = await fetch(`${API_BASE}/sync/map-data`)
    if (!res.ok) throw new Error(`API error: ${res.status}`)
    const json = await res.json()
    const works: MapWork[] = json.data || []

    // 只加载有地标的作品
    const worksWithLocations = works.filter(w => w.locations && w.locations.length > 0)
    totalCount.value = worksWithLocations.length

    // 渐进式加载：每批 10 部作品
    const BATCH_SIZE = 10
    for (let i = 0; i < worksWithLocations.length; i += BATCH_SIZE) {
      const batch = worksWithLocations.slice(i, i + BATCH_SIZE)
      for (const work of batch) {
        anitabiWorks.value.push(work)
        const markers = addWorkMarkers(work)
        workMarkerMap.set(work.id, markers)
        markerCount += markers.length
        totalMarkers.value = markerCount
        loadedCount.value++
      }
      // 让 UI 有时间更新
      if (i + BATCH_SIZE < worksWithLocations.length) {
        await new Promise(r => setTimeout(r, 50))
      }
    }
  } catch (err) {
    console.error('加载数据失败:', err)
  }

  loading.value = false
}

// === 为一部作品添加标记点 ===
function addWorkMarkers(work: MapWork): L.CircleMarker[] {
  if (!map) return []

  const markers: L.CircleMarker[] = []
  const color = work.color || '#D4AF37'

  for (const point of work.locations) {
    const marker = createCircleMarker(map, point.latitude, point.longitude, {
      radius: 5,
      fillColor: color,
      color: 'rgba(255,255,255,0.7)',
      weight: 1.5,
      fillOpacity: 0.85,
    })

    // 点击弹窗
    marker.on('click', (e: L.LeafletMouseEvent) => {
      L.DomEvent.stopPropagation(e)
      showPointPopup(work, point, marker)
    })

    // hover 高亮
    marker.on('mouseover', () => {
      marker.setStyle({ radius: 8, weight: 2.5, color: '#fff', fillOpacity: 1 })
      marker.bringToFront()
    })
    marker.on('mouseout', () => {
      if (hoveredWorkId.value !== work.id) {
        marker.setStyle({
          radius: 5,
          weight: 1.5,
          color: 'rgba(255,255,255,0.7)',
          fillOpacity: 0.85,
        })
      }
    })

    markers.push(marker)
  }

  allMarkers.push(...markers)
  return markers
}

// === 标记点弹窗 ===
function showPointPopup(
  work: MapWork,
  point: MapLocation,
  marker: L.CircleMarker
) {
  if (!map) return

  const imageUrl = point.screenshotUrl ? getImageUrl(point.screenshotUrl, 'h360') : ''
  const title = point.cn || point.name
  const subtitle = `${work.title}${point.ep ? ` · 第${point.ep}话` : ''}`

  const popup = createImagePopup(
    imageUrl,
    title,
    subtitle,
    point.latitude,
    point.longitude,
  )
  marker.bindPopup(popup).openPopup()
}

/** 获取图片 URL（指定尺寸） */
function getImageUrl(path: string, plan: 'h160' | 'h360' | 'original' = 'h160'): string {
  if (!path || plan === 'original') return path
  const sep = path.includes('?') ? '&' : '?'
  return `${path}${sep}plan=${plan}`
}

// === 飞到作品区域 ===
function flyToWork(work: MapWork) {
  if (!map) return
  flyToWGS84(map, work.latitude, work.longitude, work.zoom || 12)
  panelOpen.value = false
}

// === 高亮/取消高亮作品标记 ===
function highlightWork(workId: string) {
  hoveredWorkId.value = workId
  const markers = workMarkerMap.get(workId)
  if (!markers) return

  markers.forEach((m) => {
    m.setStyle({ radius: 7, weight: 2.5, color: '#fff', fillOpacity: 1 })
    m.bringToFront()
  })
}

function unhighlightWork() {
  const workId = hoveredWorkId.value
  hoveredWorkId.value = null
  if (!workId) return

  const markers = workMarkerMap.get(workId)
  if (!markers) return

  markers.forEach((m) => {
    m.setStyle({
      radius: 5,
      weight: 1.5,
      color: 'rgba(255,255,255,0.7)',
      fillOpacity: 0.85,
    })
  })
}

// === 切换地图样式 ===
function changeMapStyle(style: MapStyle) {
  if (!map) return
  currentStyle.value = style
  switchTileLayer(map, style)

  // 更新所有标记坐标（高德需要 GCJ02 转换）
  const works = anitabiWorks.value
  for (const work of works) {
    const markers = workMarkerMap.get(work.id)
    if (!markers) continue
    work.locations.forEach((point, i) => {
      if (markers[i]) {
        updateMarkerCoord(markers[i], point.latitude, point.longitude)
      }
    })
  }
}

// === 工具功能 ===
async function locateUser() {
  try {
    const pos = await getCurrentPosition()
    map?.flyTo([pos.lat, pos.lng], 13, { duration: 1.2 })
  } catch {
    alert('无法获取定位，请确保已开启权限')
  }
}

function resetView() {
  if (!map) return
  // 清除搜索筛选，显示所有标记
  clearSearchFilter()
  flyToWGS84(map, 35.0, 137.0, 5)
}

// === 搜索功能 ===
let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null

function onSearchInput() {
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer)
  searchDebounceTimer = setTimeout(() => {
    performSearch()
  }, 200)
}

function onSearchBlur() {
  // 延迟关闭，让点击事件先触发
  setTimeout(() => {
    searchFocused.value = false
  }, 200)
}

function performSearch() {
  const query = searchQuery.value.trim().toLowerCase()
  if (!query) {
    searchResults.value = []
    return
  }

  isSearching.value = true
  searchResults.value = anitabiWorks.value
    .filter(w =>
      w.title.toLowerCase().includes(query) ||
      (w.titleEn && w.titleEn.toLowerCase().includes(query)) ||
      (w.city && w.city.toLowerCase().includes(query))
    )
    .slice(0, 20) // 最多显示 20 条结果
  isSearching.value = false
}

function selectSearchResult(work: MapWork) {
  selectedWorkId.value = work.id
  searchQuery.value = work.title
  searchResults.value = []

  // 隐藏所有标记，只显示选中作品的标记
  showOnlyWork(work.id)

  // 飞到作品位置
  flyToWork(work)
}

function showOnlyWork(workId: string) {
  // 隐藏所有标记
  for (const marker of allMarkers) {
    marker.setStyle({ opacity: 0, fillOpacity: 0 })
  }

  // 只显示选中作品的标记
  const markers = workMarkerMap.get(workId)
  if (markers) {
    const work = anitabiWorks.value.find(w => w.id === workId)
    const color = work?.color || '#D4AF37'
    markers.forEach(m => {
      m.setStyle({
        opacity: 1,
        fillOpacity: 0.85,
        fillColor: color,
        radius: 6,
        weight: 2,
        color: '#fff',
      })
      m.bringToFront()
    })
    totalMarkers.value = markers.length
  }
}

function clearSearchFilter() {
  selectedWorkId.value = null
  searchQuery.value = ''
  searchResults.value = []

  // 恢复所有标记显示
  for (const [workId, markers] of workMarkerMap) {
    const work = anitabiWorks.value.find(w => w.id === workId)
    const color = work?.color || '#D4AF37'
    markers.forEach(m => {
      m.setStyle({
        opacity: 1,
        fillOpacity: 0.85,
        fillColor: color,
        radius: 5,
        weight: 1.5,
        color: 'rgba(255,255,255,0.7)',
      })
    })
  }

  // 恢复总数
  let count = 0
  for (const markers of workMarkerMap.values()) {
    count += markers.length
  }
  totalMarkers.value = count
}

function clearSearch() {
  clearSearchFilter()
}
</script>

<style lang="scss">
/* Leaflet 全局样式 */
@import 'leaflet/dist/leaflet.css';

/* 弹窗样式 */
.scene-hunt-popup {
  .leaflet-popup-content-wrapper {
    padding: 0;
    border-radius: 10px;
    overflow: hidden;
    background: #1a1a2e;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.6);
    border: 1px solid rgba(255, 255, 255, 0.08);
  }

  .leaflet-popup-tip {
    background: #1a1a2e;
  }

  .leaflet-popup-content {
    margin: 0;
    min-width: 0;
  }

  .leaflet-popup-close-button {
    color: #888;
    font-size: 18px;
    top: 4px;
    right: 6px;

    &:hover {
      color: #fff;
    }
  }

  .map-popup {
    .popup-image {
      width: 100%;
      height: 120px;
      object-fit: cover;
      display: block;
    }

    .popup-content {
      padding: 6px 10px;
    }

    .popup-title {
      font-size: 12px;
      font-weight: 600;
      color: #e8e8e8;
      line-height: 1.3;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .popup-subtitle {
      font-size: 10px;
      color: #888;
      margin-top: 1px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .popup-streetview {
      display: inline-block;
      margin-top: 4px;
      font-size: 11px;
      color: #6ea8fe;
      text-decoration: none;

      &:hover {
        text-decoration: underline;
      }
    }
  }
}
</style>

<style lang="scss" scoped>
@use '@/styles/variables' as *;

.explore-page {
  position: relative;
  width: 100vw;
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
  background: #f5f5f5;
}

.map-container {
  position: absolute;
  inset: 0;
  z-index: 0;
}

// === 顶部工具栏 ===
.top-bar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  pointer-events: none;

  > * {
    pointer-events: auto;
  }
}

.brand {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-radius: 20px;
  border: 1px solid rgba(0, 0, 0, 0.06);
  cursor: pointer;
  transition: box-shadow 0.2s;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);

  &:hover {
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  }
}

.brand-icon {
  font-size: 20px;
}

.brand-text {
  font-size: 15px;
  font-weight: 700;
  color: #1a1a2e;
  letter-spacing: 0.3px;
}

.top-actions {
  display: flex;
  gap: 6px;
}

// === 搜索框 ===
.search-box {
  position: relative;
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-radius: 20px;
  border: 1px solid rgba(0, 0, 0, 0.06);
  padding: 0 12px;
  min-width: 240px;
  max-width: 360px;
  flex: 1;
  transition: all 0.2s;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  pointer-events: auto;

  &.focused {
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
    border-color: rgba(26, 26, 46, 0.2);
  }
}

.search-icon {
  font-size: 14px;
  margin-right: 8px;
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  border: none;
  background: transparent;
  padding: 8px 0;
  font-size: 13px;
  color: #1a1a2e;
  outline: none;
  min-width: 0;

  &::placeholder {
    color: #999;
  }
}

.search-clear {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.06);
  border-radius: 10px;
  color: #666;
  font-size: 10px;
  margin-left: 8px;
  flex-shrink: 0;
  transition: all 0.15s;

  &:hover {
    background: rgba(0, 0, 0, 0.1);
    color: #333;
  }
}

// === 搜索下拉 ===
.search-dropdown {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  border: 1px solid rgba(0, 0, 0, 0.06);
  max-height: 300px;
  overflow-y: auto;
  z-index: 100;

  &::-webkit-scrollbar {
    width: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.1);
    border-radius: 4px;
  }
}

.search-result-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  cursor: pointer;
  transition: background 0.15s;

  &:hover {
    background: rgba(26, 26, 46, 0.04);
  }

  &:not(:last-child) {
    border-bottom: 1px solid rgba(0, 0, 0, 0.04);
  }
}

.result-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
  border: 1.5px solid rgba(0, 0, 0, 0.1);
}

.result-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.result-title {
  font-size: 13px;
  font-weight: 500;
  color: #1a1a2e;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.result-meta {
  font-size: 11px;
  color: #999;
}

.search-empty {
  padding: 20px;
  text-align: center;
  color: #999;
  font-size: 13px;
}

.top-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-radius: 18px;
  border: 1px solid rgba(0, 0, 0, 0.06);
  font-size: 16px;
  transition: all 0.15s;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);

  &:hover {
    background: #fff;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  }

  &:active {
    transform: scale(0.92);
  }

  &.active {
    background: #1a1a2e;
    border-color: #1a1a2e;
  }
}

// === 左侧面板 ===
.side-panel {
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  z-index: 25;
  width: 280px;
  background: rgba(255, 255, 255, 0.96);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-right: 1px solid rgba(0, 0, 0, 0.06);
  transform: translateX(-100%);
  transition: transform 0.25s ease;
  display: flex;
  flex-direction: column;
  box-shadow: 4px 0 24px rgba(0, 0, 0, 0.08);

  &.open {
    transform: translateX(0);
  }

  @media (max-width: 768px) {
    width: 100%;
    top: auto;
    bottom: 0;
    max-height: 50vh;
    border-right: none;
    border-top: 1px solid rgba(0, 0, 0, 0.06);
    border-radius: 16px 16px 0 0;
    transform: translateY(100%);
    box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.08);

    &.open {
      transform: translateY(0);
    }
  }
}

.panel-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  flex-shrink: 0;
}

.panel-title {
  font-size: 15px;
  font-weight: 700;
  color: #1a1a2e;
  flex: 1;
}

.panel-count {
  font-size: 12px;
  color: #888;
  background: rgba(0, 0, 0, 0.04);
  padding: 2px 8px;
  border-radius: 10px;
}

.panel-close {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #888;
  font-size: 14px;
  border-radius: 14px;
  transition: all 0.15s;

  &:hover {
    background: rgba(0, 0, 0, 0.05);
    color: #333;
  }
}

.panel-body {
  flex: 1;
  overflow-y: auto;
  padding: 8px;

  &::-webkit-scrollbar {
    width: 3px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.08);
    border-radius: 3px;
  }
}

// 进度条
.progress-bar {
  position: relative;
  height: 20px;
  background: rgba(0, 0, 0, 0.04);
  border-radius: 10px;
  margin: 4px 8px 8px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #1a1a2e, #3a3a5e);
  border-radius: 10px;
  transition: width 0.3s ease;
}

.progress-text {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  color: #666;
  font-weight: 600;
}

// 作品列表
.work-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.work-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s;

  &:hover {
    background: rgba(0, 0, 0, 0.03);
  }

  &.active {
    background: rgba(26, 26, 46, 0.06);
  }
}

.work-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
  border: 1.5px solid rgba(0, 0, 0, 0.1);
}

.work-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.work-name {
  font-size: 13px;
  font-weight: 500;
  color: #1a1a2e;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.work-meta {
  font-size: 11px;
  color: #999;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.empty-hint {
  text-align: center;
  padding: 32px;
  color: #999;
  font-size: 13px;
}

// === 面板开关按钮 ===
.panel-toggle-btn {
  position: absolute;
  top: 60px;
  left: 12px;
  z-index: 20;
  padding: 8px 14px;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-radius: 16px;
  border: 1px solid rgba(0, 0, 0, 0.06);
  color: #666;
  font-size: 12px;
  transition: all 0.15s;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);

  &:hover {
    background: #fff;
    color: #1a1a2e;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  }

  &:active {
    transform: scale(0.95);
  }
}

// === 底部状态栏 ===
.status-bar {
  position: absolute;
  bottom: 8px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 15;
  padding: 4px 12px;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border-radius: 12px;
  font-size: 11px;
  pointer-events: none;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

.status-loading {
  color: #888;
}

.status-done {
  color: #4a8c5c;
}

.status-filtered {
  color: #1a1a2e;
  display: flex;
  align-items: center;
  gap: 8px;
}

.filter-clear-btn {
  padding: 2px 8px;
  background: rgba(26, 26, 46, 0.1);
  border-radius: 8px;
  font-size: 10px;
  color: #666;
  transition: all 0.15s;

  &:hover {
    background: rgba(26, 26, 46, 0.2);
    color: #333;
  }
}
</style>
