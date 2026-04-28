import maplibregl from 'maplibre-gl'
import type { Map, Marker, Popup, LngLatBoundsLike } from 'maplibre-gl'

export type { Map, Marker, Popup }

/** 免费瓦片样式 - 暗色风格 */
const DARK_STYLE = {
  version: 8 as const,
  name: 'SceneHunt Dark',
  sources: {
    'carto-dark': {
      type: 'raster' as const,
      tiles: [
        'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
        'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
        'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
      ],
      tileSize: 256,
      attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
    },
  },
  layers: [
    {
      id: 'carto-dark-layer',
      type: 'raster' as const,
      source: 'carto-dark',
      minzoom: 0,
      maxzoom: 19,
    },
  ],
}

/** 免费瓦片样式 - 亮色风格 */
const LIGHT_STYLE = {
  version: 8 as const,
  name: 'SceneHunt Light',
  sources: {
    'carto-light': {
      type: 'raster' as const,
      tiles: [
        'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png',
        'https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png',
        'https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png',
      ],
      tileSize: 256,
      attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
    },
  },
  layers: [
    {
      id: 'carto-light-layer',
      type: 'raster' as const,
      source: 'carto-light',
      minzoom: 0,
      maxzoom: 19,
    },
  ],
}

/** 创建 MapLibre 地图实例 */
export function createMap(
  container: string | HTMLElement,
  options: {
    center?: [number, number] // [经度, 纬度]
    zoom?: number
    dark?: boolean
  } = {}
): Map {
  const { center = [113.08, 22.58], zoom = 5, dark = true } = options

  return new maplibregl.Map({
    container,
    style: dark ? DARK_STYLE : LIGHT_STYLE,
    center,
    zoom,
    maxZoom: 18,
    minZoom: 2,
    attributionControl: false,
  })
}

/** 创建自定义标记点 DOM 元素 */
export function createMarkerElement(
  color: string,
  label?: string,
  onClick?: () => void
): HTMLDivElement {
  const el = document.createElement('div')
  el.className = 'custom-marker'

  const pin = document.createElement('div')
  pin.className = 'marker-pin'
  pin.style.backgroundColor = color
  pin.style.boxShadow = `0 0 12px ${color}60`

  if (label) {
    const tip = document.createElement('div')
    tip.className = 'marker-label'
    tip.textContent = label
    el.appendChild(tip)
  }

  el.appendChild(pin)

  if (onClick) {
    el.style.cursor = 'pointer'
    el.addEventListener('click', (e) => {
      e.stopPropagation()
      onClick()
    })
  }

  return el
}

/** 创建带缩略图的信息弹窗 */
export function createImagePopup(
  imageUrl: string,
  title: string,
  subtitle?: string,
  onClick?: () => void
): Popup {
  const html = `
    <div class="map-popup" ${onClick ? 'style="cursor:pointer"' : ''}>
      <img src="${imageUrl}" alt="${title}" class="popup-image" loading="lazy" />
      <div class="popup-content">
        <div class="popup-title">${title}</div>
        ${subtitle ? `<div class="popup-subtitle">${subtitle}</div>` : ''}
      </div>
    </div>
  `

  const popup = new maplibregl.Popup({
    offset: 30,
    closeButton: false,
    maxWidth: '240px',
    className: 'scene-hunt-popup',
  }).setHTML(html)

  if (onClick) {
    popup.on('open', () => {
      const el = popup.getElement()
      if (el) {
        el.querySelector('.map-popup')?.addEventListener('click', onClick)
      }
    })
  }

  return popup
}

/** 计算一组坐标的边界 */
export function calcBounds(
  points: { lat: number; lng: number }[]
): LngLatBoundsLike | null {
  if (points.length === 0) return null

  if (points.length === 1) {
    return [points[0].lng, points[0].lat, points[0].lng, points[0].lat]
  }

  let minLng = Infinity, maxLng = -Infinity
  let minLat = Infinity, maxLat = -Infinity

  for (const p of points) {
    minLng = Math.min(minLng, p.lng)
    maxLng = Math.max(maxLng, p.lng)
    minLat = Math.min(minLat, p.lat)
    maxLat = Math.max(maxLat, p.lat)
  }

  return [minLng, minLat, maxLng, maxLat]
}

/** 计算两点间距离（km） */
export function calcDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/** 格式化距离显示 */
export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)}m`
  if (km < 100) return `${km.toFixed(1)}km`
  return `${Math.round(km)}km`
}

/** 获取用户当前位置 */
export function getCurrentPosition(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('浏览器不支持定位'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        })
      },
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 10000 }
    )
  })
}
