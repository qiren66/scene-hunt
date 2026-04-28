<template>
  <div class="overlay-camera">
    <!-- 相机视图 -->
    <div class="camera-container" ref="cameraContainer">
      <video ref="videoRef" class="camera-feed" autoplay playsinline></video>

      <!-- 叠加的剧照层 -->
      <div
        class="overlay-image"
        :style="{
          opacity: opacity / 100,
          transform: `scale(${scale / 100}) rotate(${rotation}deg)`,
        }"
      >
        <img :src="screenshotUrl" alt="剧照叠加" draggable="false" />
      </div>

      <!-- 对准辅助线 -->
      <div class="guide-frame">
        <div class="guide-corner top-left"></div>
        <div class="guide-corner top-right"></div>
        <div class="guide-corner bottom-left"></div>
        <div class="guide-corner bottom-right"></div>
      </div>

      <!-- 顶部提示 -->
      <div class="camera-hint">
        📐 调整透明度和位置，对齐剧照与实景
      </div>
    </div>

    <!-- 控制面板 -->
    <div class="controls-panel">
      <div class="control-row">
        <span class="control-label">透明度</span>
        <input
          type="range"
          min="0"
          max="100"
          v-model.number="opacity"
          class="control-slider"
        />
        <span class="control-value">{{ opacity }}%</span>
      </div>
      <div class="control-row">
        <span class="control-label">缩放</span>
        <input
          type="range"
          min="50"
          max="200"
          v-model.number="scale"
          class="control-slider"
        />
        <span class="control-value">{{ scale }}%</span>
      </div>
      <div class="control-row">
        <span class="control-label">旋转</span>
        <input
          type="range"
          min="-180"
          max="180"
          v-model.number="rotation"
          class="control-slider"
        />
        <span class="control-value">{{ rotation }}°</span>
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="action-bar">
      <button class="action-btn secondary" @click="$emit('close')">
        关闭
      </button>
      <button class="action-btn primary" @click="capturePhoto">
        📸 拍摄
      </button>
      <button class="action-btn secondary" @click="resetControls">
        重置
      </button>
    </div>

    <!-- 隐藏的 canvas 用于合成照片 -->
    <canvas ref="canvasRef" style="display: none;"></canvas>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const props = defineProps<{
  screenshotUrl: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'capture', dataUrl: string): void
}>()

const videoRef = ref<HTMLVideoElement>()
const canvasRef = ref<HTMLCanvasElement>()
const cameraContainer = ref<HTMLDivElement>()

const opacity = ref(50)
const scale = ref(100)
const rotation = ref(0)
let stream: MediaStream | null = null

onMounted(async () => {
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false,
    })
    if (videoRef.value) {
      videoRef.value.srcObject = stream
    }
  } catch (err) {
    console.error('无法访问相机:', err)
    alert('无法访问相机，请确保已授予权限。某些浏览器可能需要 HTTPS 环境。')
  }
})

onUnmounted(() => {
  if (stream) {
    stream.getTracks().forEach(track => track.stop())
  }
})

function resetControls() {
  opacity.value = 50
  scale.value = 100
  rotation.value = 0
}

async function capturePhoto() {
  const video = videoRef.value
  const canvas = canvasRef.value
  if (!video || !canvas) return

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  canvas.width = video.videoWidth
  canvas.height = video.videoHeight

  // 绘制相机画面
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

  // 绘制叠加剧照
  const img = new Image()
  img.crossOrigin = 'anonymous'
  img.src = props.screenshotUrl

  await new Promise<void>((resolve) => {
    img.onload = () => {
      ctx.save()
      ctx.globalAlpha = opacity.value / 100
      ctx.translate(canvas.width / 2, canvas.height / 2)
      ctx.rotate((rotation.value * Math.PI) / 180)
      ctx.scale(scale.value / 100, scale.value / 100)
      ctx.drawImage(img, -canvas.width / 2, -canvas.height / 2, canvas.width, canvas.height)
      ctx.restore()
      resolve()
    }
    img.onerror = () => resolve()
  })

  const dataUrl = canvas.toDataURL('image/jpeg', 0.9)
  emit('capture', dataUrl)
}
</script>

<style lang="scss" scoped>
@use '@/styles/variables' as *;

.overlay-camera {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: $color-bg;
  display: flex;
  flex-direction: column;
}

.camera-container {
  flex: 1;
  position: relative;
  overflow: hidden;
  background: #000;
}

.camera-feed {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.overlay-image {
  position: absolute;
  inset: 0;
  pointer-events: none;
  transition: opacity 0.1s ease;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.guide-frame {
  position: absolute;
  inset: 10%;
  pointer-events: none;
}

.guide-corner {
  position: absolute;
  width: 24px;
  height: 24px;
  border-color: $color-accent;
  border-style: solid;
  border-width: 0;

  &.top-left {
    top: 0;
    left: 0;
    border-top-width: 2px;
    border-left-width: 2px;
  }

  &.top-right {
    top: 0;
    right: 0;
    border-top-width: 2px;
    border-right-width: 2px;
  }

  &.bottom-left {
    bottom: 0;
    left: 0;
    border-bottom-width: 2px;
    border-left-width: 2px;
  }

  &.bottom-right {
    bottom: 0;
    right: 0;
    border-bottom-width: 2px;
    border-right-width: 2px;
  }
}

.camera-hint {
  position: absolute;
  top: $spacing-lg;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.6);
  color: $color-text;
  font-size: $fs-caption;
  padding: $spacing-sm $spacing-lg;
  border-radius: $radius-full;
  white-space: nowrap;
}

.controls-panel {
  padding: $spacing-md $spacing-lg;
  background: $color-bg-card;
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
}

.control-row {
  display: flex;
  align-items: center;
  gap: $spacing-md;
}

.control-label {
  font-size: $fs-caption;
  color: $color-text-secondary;
  min-width: 48px;
}

.control-slider {
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

.control-value {
  font-size: $fs-caption;
  color: $color-accent;
  font-weight: 600;
  min-width: 40px;
  text-align: right;
}

.action-bar {
  display: flex;
  gap: $spacing-md;
  padding: $spacing-md $spacing-lg;
  padding-bottom: calc($spacing-lg + env(safe-area-inset-bottom, 0px));
  background: $color-bg-card;
  border-top: 1px solid $color-border;
}

.action-btn {
  flex: 1;
  padding: $spacing-md;
  border-radius: $radius-full;
  font-size: $fs-body;
  font-weight: 600;
  text-align: center;
  transition: all $transition-fast;

  &.primary {
    background: linear-gradient(135deg, $color-accent, $color-accent-dark);
    color: $color-bg;
  }

  &.secondary {
    background: $color-bg;
    color: $color-text;
    border: 1px solid $color-border;
  }

  &:active {
    transform: scale(0.96);
  }
}
</style>
