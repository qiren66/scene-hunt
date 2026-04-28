<template>
  <div class="location-marker" @click="$emit('click')">
    <div class="marker-image">
      <img :src="location.screenshotUrl" :alt="location.name" loading="lazy" />
    </div>
    <div class="marker-info">
      <h4 class="marker-name">{{ location.name }}</h4>
      <p class="marker-desc">{{ location.sceneDescription }}</p>
      <div class="marker-meta">
        <span v-if="location.episode" class="marker-episode">📺 {{ location.episode }}</span>
        <span v-if="distance" class="marker-distance">📍 {{ distance }}</span>
      </div>
    </div>
    <div class="marker-arrow">›</div>
  </div>
</template>

<script setup lang="ts">
import type { Location } from '@/types'

defineProps<{
  location: Location
  distance?: string
}>()

defineEmits<{
  (e: 'click'): void
}>()
</script>

<style lang="scss" scoped>
@use '@/styles/variables' as *;

.location-marker {
  display: flex;
  align-items: center;
  gap: $spacing-md;
  padding: $spacing-md;
  background: $color-bg-card;
  border-radius: $radius-lg;
  border: 1px solid rgba($color-accent, 0.05);
  cursor: pointer;
  transition: all $transition-fast;

  &:active {
    transform: scale(0.98);
    background: $color-bg-card-hover;
  }
}

.marker-image {
  width: 72px;
  height: 72px;
  flex-shrink: 0;
  border-radius: $radius-sm;
  overflow: hidden;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.marker-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.marker-name {
  font-size: $fs-body;
  font-weight: 600;
  color: $color-text;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.marker-desc {
  font-size: $fs-caption;
  color: $color-text-secondary;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.marker-meta {
  display: flex;
  gap: $spacing-md;
  font-size: $fs-tag;
  color: $color-text-muted;
}

.marker-episode {
  color: $color-accent;
}

.marker-distance {
  color: $color-text-secondary;
}

.marker-arrow {
  font-size: 24px;
  color: $color-text-muted;
  flex-shrink: 0;
}
</style>
