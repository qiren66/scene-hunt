<template>
  <div class="scene-card" @click="$emit('click')">
    <div class="scene-thumbnail">
      <img :src="scene.screenshotUrl" :alt="scene.sceneDescription" loading="lazy" />
      <div v-if="scene.timestamp" class="scene-timestamp">{{ scene.timestamp }}</div>
      <div v-if="scene.episode" class="scene-episode">{{ scene.episode }}</div>
    </div>
    <div class="scene-info">
      <h3 class="scene-name">{{ scene.name }}</h3>
      <p class="scene-desc">{{ scene.sceneDescription }}</p>
      <div class="scene-tags">
        <span v-for="tag in scene.tags.slice(0, 3)" :key="tag" class="tag">{{ tag }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Location } from '@/types'

defineProps<{
  scene: Location
}>()

defineEmits<{
  (e: 'click'): void
}>()
</script>

<style lang="scss" scoped>
@use '@/styles/variables' as *;

.scene-card {
  display: flex;
  gap: $spacing-md;
  padding: $spacing-md;
  background: $color-bg-card;
  border-radius: $radius-lg;
  border: 1px solid rgba($color-accent, 0.05);
  transition: all $transition-fast;
  cursor: pointer;

  &:active {
    transform: scale(0.98);
    background: $color-bg-card-hover;
  }
}

.scene-thumbnail {
  position: relative;
  width: 120px;
  height: 90px;
  flex-shrink: 0;
  border-radius: $radius-sm;
  overflow: hidden;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.scene-timestamp {
  position: absolute;
  bottom: 4px;
  right: 4px;
  background: rgba(0, 0, 0, 0.7);
  color: $color-accent;
  font-size: 11px;
  padding: 1px 6px;
  border-radius: $radius-full;
  font-family: 'SF Mono', 'Menlo', monospace;
}

.scene-episode {
  position: absolute;
  top: 4px;
  left: 4px;
  background: rgba($color-danger, 0.85);
  color: #fff;
  font-size: 11px;
  padding: 1px 6px;
  border-radius: $radius-full;
}

.scene-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: $spacing-xs;
}

.scene-name {
  font-size: $fs-subtitle;
  font-weight: 600;
  color: $color-text;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.scene-desc {
  font-size: $fs-caption;
  color: $color-text-secondary;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.scene-tags {
  display: flex;
  gap: $spacing-xs;
  flex-wrap: wrap;
  margin-top: auto;
}
</style>
