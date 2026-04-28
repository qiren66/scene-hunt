<template>
  <div class="search-bar" :class="{ focused }">
    <div class="search-icon">🔍</div>
    <input
      ref="inputRef"
      v-model="query"
      type="text"
      :placeholder="placeholder"
      class="search-input"
      @focus="focused = true"
      @blur="onBlur"
      @input="onInput"
    />
    <button v-if="query" class="clear-btn" @click="clear">✕</button>
  </div>

  <!-- 搜索建议下拉 -->
  <div v-if="showSuggestions && suggestions.length > 0" class="suggestions">
    <div
      v-for="item in suggestions"
      :key="item.type === 'work' ? item.data.id : item.data.id"
      class="suggestion-item"
      @mousedown.prevent="onSelect(item)"
    >
      <span class="suggestion-icon">{{ item.type === 'work' ? '🎬' : '📍' }}</span>
      <div class="suggestion-content">
        <div class="suggestion-title">
          {{ item.type === 'work' ? item.data.title : item.data.name }}
        </div>
        <div class="suggestion-sub">
          {{ item.type === 'work'
            ? `${item.data.year} · ${item.data.director}`
            : item.data.address
          }}
        </div>
      </div>
      <span class="suggestion-type">{{ item.type === 'work' ? '作品' : '取景地' }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { searchWorksAndLocations } from '@/utils/search'
import type { SearchResult } from '@/types'

const props = withDefaults(defineProps<{
  placeholder?: string
}>(), {
  placeholder: '搜索剧名、地名、演员...',
})

const emit = defineEmits<{
  (e: 'select', result: SearchResult): void
  (e: 'search', query: string): void
}>()

const inputRef = ref<HTMLInputElement>()
const query = ref('')
const focused = ref(false)
const suggestions = ref<SearchResult[]>([])

const showSuggestions = computed(() => focused.value && query.value.trim().length > 0)

let debounceTimer: ReturnType<typeof setTimeout>

function onInput() {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    suggestions.value = searchWorksAndLocations(query.value)
  }, 200)
}

function onSelect(item: SearchResult) {
  query.value = ''
  suggestions.value = []
  emit('select', item)
}

function onBlur() {
  setTimeout(() => {
    focused.value = false
  }, 200)
}

function clear() {
  query.value = ''
  suggestions.value = []
  inputRef.value?.focus()
}
</script>

<style lang="scss" scoped>
@use '@/styles/variables' as *;

.search-bar {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  padding: $spacing-md $spacing-lg;
  background: $color-bg-card;
  border: 1px solid transparent;
  border-radius: $radius-full;
  transition: all $transition-fast;

  &.focused {
    border-color: $color-accent;
    box-shadow: 0 0 0 3px rgba($color-accent, 0.15);
  }
}

.search-icon {
  font-size: 18px;
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  font-size: $fs-body;
  color: $color-text;
  min-width: 0;

  &::placeholder {
    color: $color-text-muted;
  }
}

.clear-btn {
  font-size: 14px;
  color: $color-text-secondary;
  padding: 4px 8px;
  border-radius: $radius-full;

  &:active {
    background: rgba(255, 255, 255, 0.1);
  }
}

.suggestions {
  position: absolute;
  left: 0;
  right: 0;
  top: 100%;
  margin-top: $spacing-sm;
  background: $color-bg-card;
  border: 1px solid $color-border;
  border-radius: $radius-md;
  overflow: hidden;
  z-index: 100;
  max-height: 60vh;
  overflow-y: auto;
}

.suggestion-item {
  display: flex;
  align-items: center;
  gap: $spacing-md;
  padding: $spacing-md $spacing-lg;
  transition: background $transition-fast;

  &:active {
    background: $color-bg-card-hover;
  }

  & + & {
    border-top: 1px solid $color-border;
  }
}

.suggestion-icon {
  font-size: 20px;
  flex-shrink: 0;
}

.suggestion-content {
  flex: 1;
  min-width: 0;
}

.suggestion-title {
  font-size: $fs-body;
  color: $color-text;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.suggestion-sub {
  font-size: $fs-caption;
  color: $color-text-secondary;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 2px;
}

.suggestion-type {
  font-size: $fs-tag;
  color: $color-accent;
  background: rgba($color-accent, 0.1);
  padding: 2px 8px;
  border-radius: $radius-full;
  flex-shrink: 0;
}
</style>
