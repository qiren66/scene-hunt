<template>
  <div class="home-page">
    <!-- 顶部 Header -->
    <header class="home-header">
      <div class="brand">
        <span class="brand-icon">🎬</span>
        <div class="brand-text">
          <h1 class="brand-name">SceneHunt</h1>
          <p class="brand-slogan">带着电影去旅行</p>
        </div>
      </div>
    </header>

    <!-- 搜索区域 -->
    <section class="search-section">
      <div class="search-wrapper">
        <SearchBar
          placeholder="搜索剧名、地名、演员..."
          @select="onSearchSelect"
        />
      </div>
    </section>

    <!-- 探索地图入口 -->
    <section class="section">
      <div class="explore-banner" @click="router.push({ name: 'explore' })">
        <div class="explore-banner-bg"></div>
        <div class="explore-banner-content">
          <div class="explore-banner-text">
            <h2 class="explore-banner-title">🗺️ 探索取景地地图</h2>
            <p class="explore-banner-desc">全屏地图 · 动画巡礼 · 影视取景 · 实时定位</p>
          </div>
          <span class="explore-banner-arrow">→</span>
        </div>
      </div>
    </section>

    <!-- 热门推荐 -->
    <section class="section">
      <h2 class="section-title">🔥 热门作品</h2>
      <div class="works-scroll">
        <div
          v-for="work in allWorks"
          :key="work.id"
          class="work-card"
          @click="goToWork(work.id)"
        >
          <div class="work-poster">
            <img :src="work.poster" :alt="work.title" loading="lazy" />
            <div class="work-badge">{{ work.locationCount }}个取景地</div>
          </div>
          <div class="work-meta">
            <h3 class="work-title">{{ work.title }}</h3>
            <p class="work-sub">{{ work.year }} · {{ work.director }}</p>
            <div class="work-genres">
              <span v-for="g in work.genre" :key="g" class="tag">{{ g }}</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 最近浏览 -->
    <section v-if="recentWorks.length > 0" class="section">
      <h2 class="section-title">🕐 最近浏览</h2>
      <div class="recent-list">
        <div
          v-for="work in recentWorks"
          :key="work.id"
          class="recent-item"
          @click="goToWork(work.id)"
        >
          <img :src="work.poster" :alt="work.title" class="recent-poster" />
          <div class="recent-info">
            <h3 class="recent-title">{{ work.title }}</h3>
            <p class="recent-sub">{{ work.locationCount }}个取景地</p>
          </div>
          <span class="recent-arrow">›</span>
        </div>
      </div>
    </section>

    <!-- 底部空状态占位 -->
    <section class="section footer-section">
      <div class="footer-hint">
        <div class="footer-icon">🐱</div>
        <p>数据持续更新中，更多作品即将上线</p>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import SearchBar from '@/components/SearchBar.vue'
import { getAllWorks, getRecentWorks } from '@/utils/search'
import type { Work, SearchResult } from '@/types'

const router = useRouter()
const allWorks = ref<Work[]>([])
const recentWorks = ref<Work[]>([])

onMounted(() => {
  allWorks.value = getAllWorks()
  recentWorks.value = getRecentWorks(5)
})

function goToWork(workId: string) {
  router.push({ name: 'work-detail', params: { id: workId } })
}

function onSearchSelect(result: SearchResult) {
  if (result.type === 'work') {
    goToWork(result.data.id)
  } else {
    router.push({ name: 'location-detail', params: { id: result.data.id } })
  }
}
</script>

<style lang="scss" scoped>
@use '@/styles/variables' as *;

.home-page {
  min-height: 100vh;
  padding-bottom: calc($spacing-2xl + env(safe-area-inset-bottom, 0px));
}

.home-header {
  padding: $spacing-lg $spacing-lg $spacing-md;
  padding-top: calc($spacing-lg + env(safe-area-inset-top, 0px));
}

.brand {
  display: flex;
  align-items: center;
  gap: $spacing-md;
}

.brand-icon {
  font-size: 40px;
}

.brand-text {
  display: flex;
  flex-direction: column;
}

.brand-name {
  font-size: $fs-hero;
  font-weight: 800;
  color: $color-accent;
  letter-spacing: 1px;
  line-height: 1.2;
}

.brand-slogan {
  font-size: $fs-caption;
  color: $color-text-secondary;
  margin-top: 2px;
}

// 搜索
.search-section {
  padding: 0 $spacing-lg $spacing-lg;
}

.search-wrapper {
  position: relative;
}

// 通用 section
.section {
  padding: 0 $spacing-lg;
  margin-bottom: $spacing-xl;
}

.section-title {
  font-size: $fs-subtitle;
  font-weight: 700;
  color: $color-text;
  margin-bottom: $spacing-md;
}

// 热门作品横向滚动
.works-scroll {
  display: flex;
  gap: $spacing-md;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
  padding-bottom: $spacing-sm;

  &::-webkit-scrollbar {
    display: none;
  }
}

.work-card {
  flex-shrink: 0;
  width: 200px;
  background: $color-bg-card;
  border-radius: $radius-lg;
  overflow: hidden;
  border: 1px solid rgba($color-accent, 0.05);
  scroll-snap-align: start;
  cursor: pointer;
  transition: all $transition-fast;

  &:active {
    transform: scale(0.97);
  }
}

.work-poster {
  position: relative;
  width: 100%;
  height: 260px;
  overflow: hidden;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform $transition-slow;
  }
}

.work-badge {
  position: absolute;
  bottom: $spacing-sm;
  right: $spacing-sm;
  background: rgba($color-danger, 0.9);
  color: #fff;
  font-size: $fs-tag;
  padding: 2px 8px;
  border-radius: $radius-full;
  font-weight: 600;
}

.work-meta {
  padding: $spacing-md;
}

.work-title {
  font-size: $fs-body;
  font-weight: 600;
  color: $color-text;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.work-sub {
  font-size: $fs-caption;
  color: $color-text-secondary;
  margin-bottom: $spacing-sm;
}

.work-genres {
  display: flex;
  gap: $spacing-xs;
  flex-wrap: wrap;
}

// 最近浏览
.recent-list {
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
}

.recent-item {
  display: flex;
  align-items: center;
  gap: $spacing-md;
  padding: $spacing-md;
  background: $color-bg-card;
  border-radius: $radius-md;
  cursor: pointer;
  transition: all $transition-fast;

  &:active {
    transform: scale(0.98);
    background: $color-bg-card-hover;
  }
}

.recent-poster {
  width: 48px;
  height: 64px;
  border-radius: $radius-sm;
  object-fit: cover;
  flex-shrink: 0;
}

.recent-info {
  flex: 1;
  min-width: 0;
}

.recent-title {
  font-size: $fs-body;
  font-weight: 600;
  color: $color-text;
}

.recent-sub {
  font-size: $fs-caption;
  color: $color-text-secondary;
  margin-top: 2px;
}

.recent-arrow {
  font-size: 20px;
  color: $color-text-muted;
}

// 底部
.footer-section {
  text-align: center;
  padding-top: $spacing-xl;
}

.footer-hint {
  color: $color-text-muted;
  font-size: $fs-caption;

  p {
    margin-top: $spacing-sm;
  }
}

.footer-icon {
  font-size: 48px;
}

// 探索地图入口 banner
.explore-banner {
  position: relative;
  border-radius: $radius-lg;
  overflow: hidden;
  cursor: pointer;
  transition: all $transition-fast;

  &:active {
    transform: scale(0.98);
  }
}

.explore-banner-bg {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, #1a1a2e 0%, #0d0d0d 50%, #2a1a0d 100%);
  z-index: 0;
}

.explore-banner-content {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: $spacing-lg $spacing-xl;
}

.explore-banner-text {
  min-width: 0;
}

.explore-banner-title {
  font-size: $fs-subtitle;
  font-weight: 700;
  color: $color-accent;
  margin-bottom: 4px;
}

.explore-banner-desc {
  font-size: $fs-caption;
  color: $color-text-secondary;
}

.explore-banner-arrow {
  font-size: 24px;
  color: $color-accent;
  flex-shrink: 0;
}
</style>
