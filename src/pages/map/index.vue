<template>
  <div class="map-page">
    <!-- 地图容器 -->
    <div class="map-container" ref="mapContainer">
      <div id="amap-container" class="amap-box"></div>

      <!-- 无地图时的占位 -->
      <div v-if="!mapReady" class="map-placeholder">
        <div class="loading-clapper">🎬</div>
        <p>地图加载中...</p>
        <p class="hint">如未配置高德地图Key，将使用坐标列表模式</p>
      </div>
    </div>

    <!-- 顶部导航 -->
    <div class="top-bar">
      <button class="back-btn" @click="router.back()">‹ 返回</button>
      <h1 class="top-title">{{ work?.title || '' }} · 取景地</h1>
      <span class="top-count">{{ work?.locations.length || 0 }}处</span>
    </div>

    <!-- 底部抽屉 -->
    <div class="bottom-drawer" :class="{ expanded: drawerExpanded }">
      <div class="drawer-handle" @click="drawerExpanded = !drawerExpanded">
        <div class="handle-bar"></div>
      </div>
      <div class="drawer-header">
        <h2 class="drawer-title">取景地列表</h2>
        <div class="drawer-filters">
          <button
            v-for="filter in filters"
            :key="filter.value"
            class="filter-btn"
            :class="{ active: activeFilter === filter.value }"
            @click="activeFilter = filter.value"
          >
            {{ filter.label }}
          </button>
        </div>
      </div>
      <div class="drawer-list">
        <LocationMarker
          v-for="loc in filteredLocations"
          :key="loc.id"
          :location="loc"
          @click="goToLocation(loc.id)"
        />
        <div v-if="filteredLocations.length === 0" class="empty-hint">
          没有匹配的取景地
        </div>
      </div>
    </div>

    <!-- 定位按钮 -->
    <button class="locate-btn" @click="locateUser">
      📍
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import LocationMarker from '@/components/LocationMarker.vue'
import { getWorkById } from '@/utils/search'
import { loadAMap, getCurrentPosition, calcDistance, formatDistance } from '@/utils/map'
import type { Work, Location } from '@/types'

const route = useRoute()
const router = useRouter()

const work = ref<Work>()
const mapContainer = ref<HTMLDivElement>()
const mapReady = ref(false)
const drawerExpanded = ref(false)
const activeFilter = ref('all')
const userPos = ref<{ lat: number; lng: number }>()

let AMapInstance: any = null
let markers: any[] = []

const filters = [
  { value: 'all', label: '全部' },
  { value: 'outdoor', label: '室外' },
  { value: 'indoor', label: '室内' },
  { value: 'classic', label: '经典' },
]

const filteredLocations = computed(() => {
  if (!work.value) return []
  let locs = work.value.locations

  if (activeFilter.value === 'outdoor') {
    locs = locs.filter(l => l.tags.some(t => t.includes('室外') || t.includes('自然') || t.includes('滨水')))
  } else if (activeFilter.value === 'indoor') {
    locs = locs.filter(l => l.tags.some(t => t.includes('室内')))
  } else if (activeFilter.value === 'classic') {
    locs = locs.filter(l => l.tags.some(t => t.includes('经典')))
  }

  return locs
})

onMounted(async () => {
  const workId = route.params.workId as string
  work.value = getWorkById(workId)
  if (work.value) {
    document.title = `${work.value.title} 取景地地图 - SceneHunt`
  }

  // 尝试加载高德地图
  try {
    const AMap = await loadAMap()
    await initMap(AMap)
    mapReady.value = true
  } catch {
    // 地图加载失败，使用列表模式
    mapReady.value = false
  }

  // 尝试获取用户位置
  try {
    userPos.value = await getCurrentPosition()
  } catch {
    // 定位失败不影响使用
  }
})

async function initMap(AMap: any) {
  if (!work.value) return

  const locations = work.value.locations
  const center = locations.length > 0
    ? [locations[0].longitude, locations[0].latitude]
    : [113.08, 22.58]

  AMapInstance = new AMap.Map('amap-container', {
    zoom: 12,
    center,
    mapStyle: 'amap://styles/dark',
    resizeEnable: true,
  })

  // 添加标记
  markers = locations.map(loc => {
    const marker = new AMap.Marker({
      position: [loc.longitude, loc.latitude],
      title: loc.name,
      label: {
        content: `<div style="background:rgba(13,13,13,0.9);color:#D4AF37;padding:4px 8px;border-radius:12px;font-size:12px;border:1px solid rgba(212,175,55,0.3);white-space:nowrap;">${loc.name}</div>`,
        direction: 'top',
      },
    })

    marker.on('click', () => {
      goToLocation(loc.id)
    })

    return marker
  })

  AMapInstance.add(markers)

  // 自适应缩放
  AMapInstance.setFitView(markers)
}

function locateUser() {
  if (userPos.value && AMapInstance) {
    AMapInstance.setCenter([userPos.value.lng, userPos.value.lat])
    AMapInstance.setZoom(14)
  } else {
    getCurrentPosition().then(pos => {
      userPos.value = pos
      if (AMapInstance) {
        AMapInstance.setCenter([pos.lng, pos.lat])
        AMapInstance.setZoom(14)
      }
    }).catch(() => {
      alert('无法获取您的位置，请确保已开启定位权限')
    })
  }
}

function goToLocation(locationId: string) {
  router.push({ name: 'location-detail', params: { id: locationId } })
}
</script>

<style lang="scss" scoped>
@use '@/styles/variables' as *;

.map-page {
  position: relative;
  width: 100vw;
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
  background: $color-bg;
}

.map-container {
  position: absolute;
  inset: 0;
  z-index: 0;
}

.amap-box {
  width: 100%;
  height: 100%;
}

.map-placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: $color-bg-card;
  color: $color-text-secondary;
  gap: $spacing-md;
  z-index: 1;

  .hint {
    font-size: $fs-caption;
    color: $color-text-muted;
    text-align: center;
    padding: 0 $spacing-xl;
  }
}

// 顶部栏
.top-bar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: $spacing-md;
  padding: $spacing-md $spacing-lg;
  padding-top: calc($spacing-md + env(safe-area-inset-top, 0px));
  background: linear-gradient(to bottom, rgba($color-bg, 0.9) 0%, transparent 100%);
}

.back-btn {
  color: $color-text;
  font-size: $fs-body;
  padding: $spacing-sm $spacing-md;
  background: rgba($color-bg-card, 0.8);
  border-radius: $radius-full;
  backdrop-filter: blur(10px);
  transition: all $transition-fast;

  &:active {
    background: rgba($color-bg-card, 1);
  }
}

.top-title {
  flex: 1;
  font-size: $fs-body;
  font-weight: 600;
  color: $color-text;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.top-count {
  font-size: $fs-caption;
  color: $color-accent;
  background: rgba($color-accent, 0.1);
  padding: 2px 10px;
  border-radius: $radius-full;
  flex-shrink: 0;
}

// 底部抽屉
.bottom-drawer {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 10;
  background: $color-bg;
  border-radius: $radius-xl $radius-xl 0 0;
  max-height: 55vh;
  transition: max-height $transition-normal;
  display: flex;
  flex-direction: column;
  box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.4);

  &.expanded {
    max-height: 80vh;
  }
}

.drawer-handle {
  display: flex;
  justify-content: center;
  padding: $spacing-md 0 $spacing-sm;
  cursor: pointer;
}

.handle-bar {
  width: 40px;
  height: 4px;
  background: $color-border;
  border-radius: $radius-full;
}

.drawer-header {
  padding: 0 $spacing-lg $spacing-sm;
}

.drawer-title {
  font-size: $fs-body;
  font-weight: 700;
  color: $color-text;
  margin-bottom: $spacing-sm;
}

.drawer-filters {
  display: flex;
  gap: $spacing-sm;
  overflow-x: auto;

  &::-webkit-scrollbar {
    display: none;
  }
}

.filter-btn {
  padding: $spacing-xs $spacing-md;
  font-size: $fs-tag;
  color: $color-text-secondary;
  background: $color-bg-card;
  border-radius: $radius-full;
  white-space: nowrap;
  transition: all $transition-fast;

  &.active {
    background: rgba($color-accent, 0.15);
    color: $color-accent;
    font-weight: 600;
  }
}

.drawer-list {
  flex: 1;
  overflow-y: auto;
  padding: $spacing-sm $spacing-lg;
  padding-bottom: calc($spacing-lg + env(safe-area-inset-bottom, 0px));
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
}

.empty-hint {
  text-align: center;
  padding: $spacing-xl;
  color: $color-text-muted;
  font-size: $fs-caption;
}

// 定位按钮
.locate-btn {
  position: absolute;
  right: $spacing-lg;
  bottom: calc(60vh - 60px);
  z-index: 10;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: $color-bg-card;
  border-radius: $radius-full;
  font-size: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
  transition: all $transition-fast;

  &:active {
    transform: scale(0.9);
  }
}
</style>
