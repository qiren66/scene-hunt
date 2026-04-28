<template>
  <div class="location-detail-page" v-if="locationData">
    <!-- 顶部导航 -->
    <div class="top-bar">
      <button class="back-btn" @click="router.back()">‹ 返回</button>
      <span class="top-title">{{ locationData.location.name }}</span>
      <button
        class="fav-btn"
        :class="{ active: isFav }"
        @click="toggleFav"
      >
        {{ isFav ? '❤️' : '🤍' }}
      </button>
    </div>

    <!-- 主图区域 -->
    <div class="hero-image">
      <img :src="locationData.location.screenshotUrl" :alt="locationData.location.name" />
      <div class="hero-overlay">
        <h1 class="hero-name">{{ locationData.location.name }}</h1>
        <p class="hero-address">📍 {{ locationData.location.address }}</p>
      </div>
    </div>

    <!-- 快捷操作 -->
    <div class="quick-actions">
      <button class="action-item" @click="openNavigation">
        <span class="action-icon">🧭</span>
        <span class="action-label">导航</span>
      </button>
      <button class="action-item" @click="toggleCheckIn">
        <span class="action-icon">{{ isCheckedIn ? '✅' : '📸' }}</span>
        <span class="action-label">{{ isCheckedIn ? '已打卡' : '打卡' }}</span>
      </button>
      <button class="action-item" @click="showCamera = true">
        <span class="action-icon">🎭</span>
        <span class="action-label">叠影拍照</span>
      </button>
      <button class="action-item" @click="shareLocation">
        <span class="action-icon">📤</span>
        <span class="action-label">分享</span>
      </button>
    </div>

    <!-- 场景信息 -->
    <section class="section">
      <h2 class="section-title">🎬 场景信息</h2>
      <div class="info-card">
        <div v-if="locationData.location.episode" class="info-row">
          <span class="info-label">出现集数</span>
          <span class="info-value accent">{{ locationData.location.episode }}</span>
        </div>
        <div v-if="locationData.location.timestamp" class="info-row">
          <span class="info-label">时间戳</span>
          <span class="info-value mono">{{ locationData.location.timestamp }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">场景描述</span>
        </div>
        <p class="info-desc">{{ locationData.location.sceneDescription }}</p>
        <div class="info-tags">
          <span v-for="tag in locationData.location.tags" :key="tag" class="tag">{{ tag }}</span>
        </div>
      </div>
    </section>

    <!-- 对比图工具 -->
    <section class="section">
      <h2 class="section-title">🖼️ 场景复现</h2>
      <CompareViewer
        :screenshot-url="locationData.location.screenshotUrl"
        :real-photo-url="locationData.location.realPhotoUrl"
      />
    </section>

    <!-- 幕后故事 -->
    <section v-if="locationData.location.behindStory" class="section">
      <h2 class="section-title">📖 幕后故事</h2>
      <div class="story-card">
        <p>{{ locationData.location.behindStory }}</p>
      </div>
    </section>

    <!-- 所属作品 -->
    <section class="section">
      <h2 class="section-title">🎬 所属作品</h2>
      <div class="work-card" @click="goToWork">
        <img :src="locationData.work.poster" :alt="locationData.work.title" class="work-poster" />
        <div class="work-info">
          <h3 class="work-title">{{ locationData.work.title }}</h3>
          <p class="work-sub">{{ locationData.work.year }} · {{ locationData.work.director }}</p>
          <p class="work-loc">{{ locationData.work.locationCount }}个取景地</p>
        </div>
        <span class="work-arrow">›</span>
      </div>
    </section>

    <!-- 叠影相机 -->
    <OverlayCamera
      v-if="showCamera"
      :screenshot-url="locationData.location.screenshotUrl"
      @close="showCamera = false"
      @capture="onCapture"
    />
  </div>

  <!-- 空状态 -->
  <div v-else class="empty-state">
    <div class="loading-clapper">🎬</div>
    <p>正在加载...</p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import CompareViewer from '@/components/CompareViewer.vue'
import OverlayCamera from '@/components/OverlayCamera.vue'
import { getLocationById } from '@/utils/search'
import { useFavoritesStore } from '@/stores/favorites'

const route = useRoute()
const router = useRouter()
const favoritesStore = useFavoritesStore()

const locationData = ref<ReturnType<typeof getLocationById>>()
const showCamera = ref(false)

onMounted(() => {
  const id = route.params.id as string
  locationData.value = getLocationById(id)
  if (locationData.value) {
    document.title = `${locationData.value.location.name} - SceneHunt`
  }
})

const isFav = computed(() => {
  if (!locationData.value) return false
  return favoritesStore.isFavorite(locationData.value.location.id)
})

const isCheckedIn = computed(() => {
  if (!locationData.value) return false
  const fav = favoritesStore.getFavorite(locationData.value.location.id)
  return fav?.type === 'checked_in'
})

function toggleFav() {
  if (!locationData.value) return
  favoritesStore.toggleFavorite(locationData.value.location.id, 'want_to_go')
}

function toggleCheckIn() {
  if (!locationData.value) return
  const locId = locationData.value.location.id
  if (isCheckedIn.value) {
    favoritesStore.removeFavorite(locId)
  } else {
    favoritesStore.addFavorite(locId, 'checked_in')
  }
}

function openNavigation() {
  if (!locationData.value) return
  const { latitude, longitude, name } = locationData.value.location
  // 打开地图导航
  const url = `https://uri.amap.com/navigation?to=${longitude},${latitude},${name}&mode=bus`
  window.open(url, '_blank')
}

function shareLocation() {
  if (!locationData.value) return
  const { name, address } = locationData.value.location
  const text = `🎬 ${name}\n📍 ${address}\n——来自 SceneHunt 场景猎手`
  
  if (navigator.share) {
    navigator.share({ title: name, text })
  } else {
    navigator.clipboard.writeText(text).then(() => {
      alert('已复制到剪贴板')
    })
  }
}

function goToWork() {
  if (!locationData.value) return
  router.push({ name: 'work-detail', params: { id: locationData.value.work.id } })
}

function onCapture(dataUrl: string) {
  // 保存叠影照片
  const link = document.createElement('a')
  link.download = `scene-hunt-${Date.now()}.jpg`
  link.href = dataUrl
  link.click()
  showCamera.value = false
}
</script>

<style lang="scss" scoped>
@use '@/styles/variables' as *;

.location-detail-page {
  min-height: 100vh;
  padding-bottom: calc($spacing-2xl + env(safe-area-inset-bottom, 0px));
}

// 顶部栏
.top-bar {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: $spacing-md;
  padding: $spacing-md $spacing-lg;
  padding-top: calc($spacing-md + env(safe-area-inset-top, 0px));
  background: rgba($color-bg, 0.9);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid $color-border;
}

.back-btn {
  color: $color-text;
  font-size: $fs-body;
  padding: $spacing-sm $spacing-md;
  background: $color-bg-card;
  border-radius: $radius-full;
  transition: all $transition-fast;

  &:active {
    background: $color-bg-card-hover;
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

.fav-btn {
  font-size: 22px;
  padding: 4px;
  transition: transform $transition-fast;

  &:active {
    transform: scale(1.3);
  }
}

// 主图
.hero-image {
  position: relative;
  height: 240px;
  overflow: hidden;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.hero-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: $spacing-lg;
  background: linear-gradient(to top, rgba($color-bg, 0.95), transparent);
}

.hero-name {
  font-size: $fs-hero;
  font-weight: 800;
  color: $color-text;
  line-height: 1.2;
}

.hero-address {
  font-size: $fs-caption;
  color: $color-text-secondary;
  margin-top: $spacing-xs;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

// 快捷操作
.quick-actions {
  display: flex;
  justify-content: space-around;
  padding: $spacing-lg;
  margin: 0 $spacing-lg;
  margin-top: -$spacing-lg;
  position: relative;
  z-index: 1;
  background: $color-bg-card;
  border-radius: $radius-lg;
  border: 1px solid rgba($color-accent, 0.05);
}

.action-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: $spacing-xs;
  padding: $spacing-sm;
  transition: all $transition-fast;

  &:active {
    transform: scale(0.92);
  }
}

.action-icon {
  font-size: 28px;
}

.action-label {
  font-size: $fs-tag;
  color: $color-text-secondary;
}

// 通用 section
.section {
  padding: 0 $spacing-lg;
  margin-top: $spacing-xl;
}

.section-title {
  font-size: $fs-subtitle;
  font-weight: 700;
  color: $color-text;
  margin-bottom: $spacing-md;
}

// 场景信息
.info-card {
  padding: $spacing-lg;
  background: $color-bg-card;
  border-radius: $radius-lg;
  border: 1px solid rgba($color-accent, 0.05);
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: $spacing-sm 0;

  & + .info-row {
    border-top: 1px solid $color-border;
  }
}

.info-label {
  font-size: $fs-caption;
  color: $color-text-secondary;
}

.info-value {
  font-size: $fs-body;
  color: $color-text;
  font-weight: 600;

  &.accent {
    color: $color-accent;
  }

  &.mono {
    font-family: 'SF Mono', 'Menlo', 'Consolas', monospace;
    color: $color-accent;
  }
}

.info-desc {
  font-size: $fs-body;
  color: $color-text-secondary;
  line-height: 1.8;
  margin: $spacing-sm 0;
}

.info-tags {
  display: flex;
  gap: $spacing-xs;
  flex-wrap: wrap;
  margin-top: $spacing-sm;
}

// 幕后故事
.story-card {
  padding: $spacing-lg;
  background: $color-bg-card;
  border-radius: $radius-lg;
  border-left: 3px solid $color-accent;

  p {
    font-size: $fs-body;
    color: $color-text-secondary;
    line-height: 1.8;
  }
}

// 所属作品
.work-card {
  display: flex;
  align-items: center;
  gap: $spacing-md;
  padding: $spacing-md;
  background: $color-bg-card;
  border-radius: $radius-lg;
  cursor: pointer;
  transition: all $transition-fast;

  &:active {
    transform: scale(0.98);
    background: $color-bg-card-hover;
  }
}

.work-poster {
  width: 48px;
  height: 64px;
  border-radius: $radius-sm;
  object-fit: cover;
  flex-shrink: 0;
}

.work-info {
  flex: 1;
  min-width: 0;
}

.work-title {
  font-size: $fs-body;
  font-weight: 600;
  color: $color-text;
}

.work-sub {
  font-size: $fs-caption;
  color: $color-text-secondary;
  margin-top: 2px;
}

.work-loc {
  font-size: $fs-tag;
  color: $color-accent;
  margin-top: 2px;
}

.work-arrow {
  font-size: 20px;
  color: $color-text-muted;
}

// 空状态
.empty-state {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: $color-text-secondary;
  font-size: $fs-body;
  gap: $spacing-md;
}
</style>
