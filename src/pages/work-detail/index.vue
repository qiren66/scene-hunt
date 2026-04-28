<template>
  <div class="work-detail-page" v-if="work">
    <!-- 顶部头图 -->
    <div class="hero-section">
      <div class="hero-backdrop">
        <img :src="work.poster" alt="" />
      </div>
      <div class="hero-overlay"></div>
      <div class="hero-content">
        <button class="back-btn" @click="router.back()">‹ 返回</button>
        <div class="hero-info">
          <img :src="work.poster" :alt="work.title" class="hero-poster" />
          <div class="hero-text">
            <h1 class="hero-title">{{ work.title }}</h1>
            <p v-if="work.titleEn" class="hero-title-en">{{ work.titleEn }}</p>
            <div class="hero-meta">
              <span>{{ work.year }}</span>
              <span class="dot">·</span>
              <span>{{ work.director }}</span>
            </div>
            <div class="hero-actors">
              {{ work.actors.join(' / ') }}
            </div>
            <div class="hero-genres">
              <span v-for="g in work.genre" :key="g" class="tag">{{ g }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 剧情简介 -->
    <section class="section">
      <h2 class="section-title">剧情简介</h2>
      <p class="description" :class="{ expanded: descExpanded }">
        {{ work.description }}
      </p>
      <button
        v-if="work.description.length > 80"
        class="expand-btn"
        @click="descExpanded = !descExpanded"
      >
        {{ descExpanded ? '收起' : '展开全部' }}
      </button>
    </section>

    <!-- 名场面列表 -->
    <section class="section">
      <div class="section-header">
        <h2 class="section-title">🎬 名场面 · {{ work.locations.length }}个取景地</h2>
        <button class="map-btn" @click="goToMap">
          🗺️ 查看地图
        </button>
      </div>
      <div class="scene-list">
        <SceneCard
          v-for="scene in work.locations"
          :key="scene.id"
          :scene="scene"
          @click="goToLocation(scene.id)"
        />
      </div>
    </section>
  </div>

  <!-- 加载/空状态 -->
  <div v-else class="empty-state">
    <div class="loading-clapper">🎬</div>
    <p>正在加载...</p>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import SceneCard from '@/components/SceneCard.vue'
import { getWorkById, addRecentWork } from '@/utils/search'
import type { Work } from '@/types'

const route = useRoute()
const router = useRouter()

const work = ref<Work>()
const descExpanded = ref(false)

onMounted(() => {
  const id = route.params.id as string
  work.value = getWorkById(id)
  if (work.value) {
    addRecentWork(work.value.id)
    document.title = `${work.value.title} - SceneHunt`
  }
})

function goToMap() {
  if (work.value) {
    router.push({ name: 'map', params: { workId: work.value.id } })
  }
}

function goToLocation(locationId: string) {
  router.push({ name: 'location-detail', params: { id: locationId } })
}
</script>

<style lang="scss" scoped>
@use '@/styles/variables' as *;

.work-detail-page {
  min-height: 100vh;
  padding-bottom: calc($spacing-2xl + env(safe-area-inset-bottom, 0px));
}

// 头图区域
.hero-section {
  position: relative;
  height: 380px;
  overflow: hidden;
}

.hero-backdrop {
  position: absolute;
  inset: 0;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    filter: blur(20px) brightness(0.4);
    transform: scale(1.1);
  }
}

.hero-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to bottom,
    rgba($color-bg, 0.3) 0%,
    rgba($color-bg, 0.7) 60%,
    $color-bg 100%
  );
}

.hero-content {
  position: relative;
  z-index: 1;
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: $spacing-lg;
  padding-top: calc($spacing-lg + env(safe-area-inset-top, 0px));
}

.back-btn {
  align-self: flex-start;
  color: $color-text;
  font-size: $fs-body;
  padding: $spacing-sm $spacing-md;
  background: rgba(255, 255, 255, 0.1);
  border-radius: $radius-full;
  backdrop-filter: blur(10px);
  margin-bottom: $spacing-lg;
  transition: all $transition-fast;

  &:active {
    background: rgba(255, 255, 255, 0.2);
  }
}

.hero-info {
  display: flex;
  gap: $spacing-lg;
  margin-top: auto;
}

.hero-poster {
  width: 100px;
  height: 140px;
  border-radius: $radius-md;
  object-fit: cover;
  flex-shrink: 0;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}

.hero-text {
  flex: 1;
  min-width: 0;
}

.hero-title {
  font-size: $fs-hero;
  font-weight: 800;
  color: $color-text;
  line-height: 1.2;
}

.hero-title-en {
  font-size: $fs-caption;
  color: $color-text-secondary;
  margin-top: 2px;
}

.hero-meta {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  font-size: $fs-caption;
  color: $color-accent;
  margin-top: $spacing-sm;

  .dot {
    color: $color-text-muted;
  }
}

.hero-actors {
  font-size: $fs-caption;
  color: $color-text-secondary;
  margin-top: $spacing-xs;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.hero-genres {
  display: flex;
  gap: $spacing-xs;
  margin-top: $spacing-sm;
  flex-wrap: wrap;
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

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: $spacing-md;

  .section-title {
    margin-bottom: 0;
  }
}

// 剧情简介
.description {
  font-size: $fs-body;
  color: $color-text-secondary;
  line-height: 1.8;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  transition: all $transition-normal;

  &.expanded {
    -webkit-line-clamp: unset;
  }
}

.expand-btn {
  color: $color-accent;
  font-size: $fs-caption;
  margin-top: $spacing-sm;
  padding: $spacing-xs 0;
}

// 地图按钮
.map-btn {
  display: inline-flex;
  align-items: center;
  gap: $spacing-xs;
  padding: $spacing-sm $spacing-md;
  background: rgba($color-accent, 0.1);
  color: $color-accent;
  border-radius: $radius-full;
  font-size: $fs-caption;
  font-weight: 600;
  transition: all $transition-fast;

  &:active {
    transform: scale(0.96);
    background: rgba($color-accent, 0.2);
  }
}

// 场景列表
.scene-list {
  display: flex;
  flex-direction: column;
  gap: $spacing-md;
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
