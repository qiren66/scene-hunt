<template>
  <div class="compare-viewer">
    <!-- 模式切换 -->
    <div class="mode-tabs">
      <button
        v-for="mode in modes"
        :key="mode.value"
        class="mode-tab"
        :class="{ active: currentMode === mode.value }"
        @click="currentMode = mode.value"
      >
        {{ mode.icon }} {{ mode.label }}
      </button>
    </div>

    <!-- 上下对比 -->
    <div v-if="currentMode === 'top-bottom'" class="compare-container top-bottom">
      <div class="compare-item">
        <img :src="screenshotUrl" alt="剧照" loading="lazy" />
        <span class="compare-label">🎬 剧照</span>
      </div>
      <div class="compare-divider-h">
        <div class="divider-line"></div>
        <span class="divider-text">VS</span>
        <div class="divider-line"></div>
      </div>
      <div class="compare-item">
        <img :src="realPhotoUrl" alt="实景" loading="lazy" />
        <span class="compare-label">📷 实景</span>
      </div>
    </div>

    <!-- 左右对比 -->
    <div v-if="currentMode === 'left-right'" class="compare-container left-right">
      <div class="compare-item">
        <img :src="screenshotUrl" alt="剧照" loading="lazy" />
        <span class="compare-label">🎬 剧照</span>
      </div>
      <div class="compare-divider-v">
        <div class="divider-line"></div>
        <span class="divider-text">VS</span>
        <div class="divider-line"></div>
      </div>
      <div class="compare-item">
        <img :src="realPhotoUrl" alt="实景" loading="lazy" />
        <span class="compare-label">📷 实景</span>
      </div>
    </div>

    <!-- 叠影模式 -->
    <div v-if="currentMode === 'overlay'" class="compare-container overlay" ref="overlayContainer">
      <div class="overlay-base">
        <img :src="realPhotoUrl" alt="实景" loading="lazy" />
        <span class="compare-label">📷 实景</span>
      </div>
      <div
        class="overlay-layer"
        :style="{ opacity: overlayOpacity / 100 }"
      >
        <img :src="screenshotUrl" alt="剧照" />
      </div>
      <div class="opacity-control">
        <span class="opacity-label">剧照透明度</span>
        <input
          type="range"
          min="0"
          max="100"
          v-model.number="overlayOpacity"
          class="opacity-slider"
        />
        <span class="opacity-value">{{ overlayOpacity }}%</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { CompareMode } from '@/types'

const props = defineProps<{
  screenshotUrl: string
  realPhotoUrl: string
}>()

const currentMode = ref<CompareMode>('top-bottom')
const overlayOpacity = ref(50)

const modes: { value: CompareMode; icon: string; label: string }[] = [
  { value: 'top-bottom', icon: '↕️', label: '上下' },
  { value: 'left-right', icon: '↔️', label: '左右' },
  { value: 'overlay', icon: '🎭', label: '叠影' },
]
</script>

<style lang="scss" scoped>
@use '@/styles/variables' as *;

.compare-viewer {
  width: 100%;
}

.mode-tabs {
  display: flex;
  gap: $spacing-sm;
  margin-bottom: $spacing-md;
  padding: 4px;
  background: $color-bg-card;
  border-radius: $radius-full;
}

.mode-tab {
  flex: 1;
  padding: $spacing-sm $spacing-md;
  font-size: $fs-caption;
  color: $color-text-secondary;
  border-radius: $radius-full;
  transition: all $transition-fast;
  text-align: center;

  &.active {
    background: rgba($color-accent, 0.15);
    color: $color-accent;
    font-weight: 600;
  }
}

.compare-container {
  border-radius: $radius-lg;
  overflow: hidden;
  background: $color-bg-card;
}

// 上下对比
.top-bottom {
  display: flex;
  flex-direction: column;
}

.compare-item {
  position: relative;

  img {
    width: 100%;
    display: block;
  }
}

.compare-label {
  position: absolute;
  top: $spacing-sm;
  left: $spacing-sm;
  background: rgba(0, 0, 0, 0.7);
  color: $color-text;
  font-size: $fs-tag;
  padding: 2px 10px;
  border-radius: $radius-full;
}

.compare-divider-h {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  padding: $spacing-sm $spacing-md;
  background: $color-bg;
}

.compare-divider-v {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: $spacing-sm;
  padding: $spacing-md $spacing-sm;
  background: $color-bg;
}

.divider-line {
  flex: 1;
  height: 1px;
  width: 1px;
  background: $color-accent;
  opacity: 0.3;
}

.divider-text {
  color: $color-accent;
  font-size: $fs-tag;
  font-weight: 700;
  flex-shrink: 0;
}

// 左右对比
.left-right {
  display: flex;

  .compare-item {
    flex: 1;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }
}

// 叠影模式
.overlay {
  position: relative;

  .overlay-base {
    img {
      width: 100%;
      display: block;
    }
  }

  .overlay-layer {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    pointer-events: none;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }
}

.opacity-control {
  display: flex;
  align-items: center;
  gap: $spacing-md;
  padding: $spacing-md $spacing-lg;
  background: $color-bg;
}

.opacity-label {
  font-size: $fs-caption;
  color: $color-text-secondary;
  white-space: nowrap;
}

.opacity-slider {
  flex: 1;
  height: 4px;
  -webkit-appearance: none;
  appearance: none;
  background: $color-border;
  border-radius: $radius-full;
  outline: none;

  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: $color-accent;
    cursor: pointer;
    box-shadow: 0 0 8px rgba($color-accent, 0.4);
  }
}

.opacity-value {
  font-size: $fs-caption;
  color: $color-accent;
  font-weight: 600;
  min-width: 36px;
  text-align: right;
}
</style>
