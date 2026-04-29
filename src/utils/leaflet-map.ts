import L from 'leaflet'
import type { Map, TileLayer } from 'leaflet'

export type { Map, Marker, Popup } from 'leaflet'

// 修复 Leaflet 默认图标路径问题
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: '',
  iconUrl: '',
  shadowUrl: '',
})

// =============================================
// 多源瓦片配置
// =============================================

/** CartoDB Voyager — 全球街道，精美清晰 */
const CARTO_VOYAGER = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
/** CartoDB 暗色 — 全球暗色主题 */
const CARTO_DARK = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
/** OpenStreetMap 标准 — 全球街道，开源免费 */
const OSM_STANDARD = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
/** Esri World Imagery — 全球卫星图（免费非商业） */
const ESRI_SATELLITE = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
/** Esri 卫星图标注叠加 */
const ESRI_LABEL = 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}'
/** 高德标准地图（仅中国区域详细） */
const AMAP_STANDARD = 'https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=7&x={x}&y={y}&z={z}'
/** 高德卫星图 */
const AMAP_SATELLITE = 'https://wprd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=6&x={x}&y={y}&z={z}'
/** 高德路网叠加 */
const AMAP_ROAD = 'https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}'

const ATTRIBUTION_OSM = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
const ATTRIBUTION_CARTO = '&copy; <a href="https://carto.com/">CARTO</a>'
const ATTRIBUTION_ESRI = '&copy; Esri'
const ATTRIBUTION_AMAP = '&copy; 高德地图'

// =============================================
// 地图样式类型
// =============================================

export type MapStyle = 'satellite' | 'amap'

export interface MapStyleOption {
  id: MapStyle
  label: string
  icon: string
}

/** 可选的地图样式列表 */
export const MAP_STYLES: MapStyleOption[] = [
  { id: 'satellite', label: '卫星地图', icon: '🛰️' },
  { id: 'amap', label: '高德地图', icon: '🇨🇳' },
]

// =============================================
// WGS84 → GCJ02 坐标转换（仅高德地图需要）
// =============================================

const PI = Math.PI
const A = 6378245.0
const EE = 0.00669342162296594323

function outOfChina(lat: number, lng: number): boolean {
  return lng < 72.004 || lng > 137.8347 || lat < 0.8293 || lat > 55.8271
}

function transformLat(x: number, y: number): number {
  let ret = -100.0 + 2.0 * x + 3.0 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x))
  ret += ((20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0) / 3.0
  ret += ((20.0 * Math.sin(y * PI) + 40.0 * Math.sin((y / 3.0) * PI)) * 2.0) / 3.0
  ret += ((160.0 * Math.sin((y / 12.0) * PI) + 320.0 * Math.sin((y * PI) / 30.0)) * 2.0) / 3.0
  return ret
}

function transformLng(x: number, y: number): number {
  let ret = 300.0 + x + 2.0 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x))
  ret += ((20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0) / 3.0
  ret += ((20.0 * Math.sin(x * PI) + 40.0 * Math.sin((x / 3.0) * PI)) * 2.0) / 3.0
  ret += ((150.0 * Math.sin((x / 12.0) * PI) + 300.0 * Math.sin((x / 30.0) * PI)) * 2.0) / 3.0
  return ret
}

/** WGS84 → GCJ02（仅高德地图使用） */
export function wgs84ToGcj02(wgsLat: number, wgsLng: number): [number, number] {
  if (outOfChina(wgsLat, wgsLng)) return [wgsLat, wgsLng]
  let dLat = transformLat(wgsLng - 105.0, wgsLat - 35.0)
  let dLng = transformLng(wgsLng - 105.0, wgsLat - 35.0)
  const radLat = (wgsLat / 180.0) * PI
  let magic = Math.sin(radLat)
  magic = 1 - EE * magic * magic
  const sqrtMagic = Math.sqrt(magic)
  dLat = (dLat * 180.0) / (((A * (1 - EE)) / (magic * sqrtMagic)) * PI)
  dLng = (dLng * 180.0) / ((A / sqrtMagic) * Math.cos(radLat) * PI)
  return [wgsLat + dLat, wgsLng + dLng]
}

/** 判断当前样式是否使用 GCJ02 坐标系（高德） */
export function isGcj02Style(style: MapStyle): boolean {
  return style === 'amap' || style === 'amap-satellite'
}

/** 根据当前样式转换坐标：高德用 GCJ02，其他用 WGS84 */
export function convertCoord(lat: number, lng: number, style: MapStyle): [number, number] {
  return isGcj02Style(style) ? wgs84ToGcj02(lat, lng) : [lat, lng]
}

// =============================================
// 地图创建与管理
// =============================================

let currentStyle: MapStyle = 'satellite'

/** 获取当前地图样式 */
export function getMapStyle(): MapStyle {
  return currentStyle
}

/** 创建 Leaflet 地图实例 */
export function createMap(
  container: string | HTMLElement,
  options: {
    center?: [number, number] // [纬度, 经度] WGS84
    zoom?: number
  } = {}
): Map {
  const { center = [35.0, 137.0], zoom = 5 } = options

  const map = L.map(container, {
    center,
    zoom,
    zoomControl: false,
    attributionControl: false,
    maxZoom: 18,
    minZoom: 2,
    preferCanvas: true, // Canvas 渲染，标记多时性能更好
  })

  // 默认添加卫星瓦片
  switchTileLayer(map, 'satellite')

  // 缩放控件放右下角
  L.control.zoom({ position: 'bottomright' }).addTo(map)

  return map
}

/** 移除所有瓦片图层 */
function removeAllTileLayers(map: Map): void {
  const layers: TileLayer[] = []
  map.eachLayer((layer) => {
    if (layer instanceof L.TileLayer) {
      layers.push(layer)
    }
  })
  layers.forEach((l) => map.removeLayer(l))
}

/** 切换瓦片图层 */
export function switchTileLayer(map: Map, style: MapStyle): void {
  removeAllTileLayers(map)
  currentStyle = style

  switch (style) {
    case 'voyager':
      L.tileLayer(CARTO_VOYAGER, {
        attribution: ATTRIBUTION_CARTO,
        subdomains: 'abcd',
        maxZoom: 19,
        tileSize: 256,
      }).addTo(map)
      break

    case 'dark':
      L.tileLayer(CARTO_DARK, {
        attribution: ATTRIBUTION_CARTO,
        subdomains: 'abcd',
        maxZoom: 19,
        tileSize: 256,
      }).addTo(map)
      break

    case 'osm':
      L.tileLayer(OSM_STANDARD, {
        attribution: ATTRIBUTION_OSM,
        maxZoom: 19,
        tileSize: 256,
      }).addTo(map)
      break

    case 'satellite':
      L.tileLayer(ESRI_SATELLITE, {
        attribution: ATTRIBUTION_ESRI,
        maxZoom: 18,
        tileSize: 256,
      }).addTo(map)
      // 叠加标注层
      L.tileLayer(ESRI_LABEL, {
        maxZoom: 18,
        tileSize: 256,
        opacity: 0.9,
      }).addTo(map)
      break

    case 'amap':
      L.tileLayer(AMAP_STANDARD, {
        attribution: ATTRIBUTION_AMAP,
        subdomains: ['1', '2', '3', '4'],
        maxZoom: 18,
        tileSize: 256,
      }).addTo(map)
      break

    case 'amap-satellite':
      L.tileLayer(AMAP_SATELLITE, {
        attribution: ATTRIBUTION_AMAP,
        subdomains: ['1', '2', '3', '4'],
        maxZoom: 18,
        tileSize: 256,
      }).addTo(map)
      L.tileLayer(AMAP_ROAD, {
        subdomains: ['1', '2', '3', '4'],
        maxZoom: 18,
        tileSize: 256,
        opacity: 0.7,
      }).addTo(map)
      break
  }
}

// =============================================
// 标记与弹窗
// =============================================

/** 创建圆形标记（自动根据当前样式转换坐标） */
export function createCircleMarker(
  map: Map,
  wgsLat: number,
  wgsLng: number,
  options: {
    radius?: number
    fillColor?: string
    color?: string
    weight?: number
    fillOpacity?: number
  } = {}
): L.CircleMarker {
  const [lat, lng] = convertCoord(wgsLat, wgsLng, currentStyle)

  return L.circleMarker([lat, lng], {
    radius: options.radius ?? 5,
    fillColor: options.fillColor ?? '#D4AF37',
    color: options.color ?? 'rgba(255,255,255,0.6)',
    weight: options.weight ?? 1,
    opacity: 0.9,
    fillOpacity: options.fillOpacity ?? 0.85,
  }).addTo(map)
}

/** 更新标记坐标（切换地图样式后调用） */
export function updateMarkerCoord(marker: L.CircleMarker, wgsLat: number, wgsLng: number): void {
  const [lat, lng] = convertCoord(wgsLat, wgsLng, currentStyle)
  marker.setLatLng([lat, lng])
}

/** 创建带图片和街景按钮的信息弹窗 */
export function createImagePopup(
  imageUrl: string,
  title: string,
  subtitle: string | undefined,
  wgsLat: number,
  wgsLng: number,
  onClick?: () => void
): L.Popup {
  const streetViewUrl = getStreetViewUrl(wgsLat, wgsLng)

  const html = `
    <div class="map-popup" ${onClick ? 'style="cursor:pointer"' : ''}>
      <img src="${imageUrl}" alt="${title}" class="popup-image" loading="lazy"
           onerror="this.style.display='none'" />
      <div class="popup-content">
        <div class="popup-title">${title}</div>
        ${subtitle ? `<div class="popup-subtitle">${subtitle}</div>` : ''}
        <a href="${streetViewUrl}" target="_blank" rel="noopener" class="popup-streetview"
           onclick="event.stopPropagation()">
          🏙️ 查看街景
        </a>
      </div>
    </div>
  `

  const popup = L.popup({
    offset: [0, -8],
    closeButton: true,
    maxWidth: 240,
    minWidth: 200,
    className: 'scene-hunt-popup',
  }).setContent(html)

  if (onClick) {
    popup.on('add', () => {
      const el = popup.getElement()
      if (el) {
        el.querySelector('.map-popup')?.addEventListener('click', (e) => {
          const target = e.target as HTMLElement
          if (!target.closest('.popup-streetview')) {
            onClick()
          }
        })
      }
    })
  }

  return popup
}

// =============================================
// 街景 URL 生成
// =============================================

/** Google 街景 URL */
export function getStreetViewUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/@${lat},${lng},3a,75y,0h,90t/data=!3m6!1e1!3m4!1sAF1QipNm2T4q1Y6qZ1E0xWJ7H8I9J0K1L2M3N4O5P6!2e10!7i16384!8i8192`
}

/** Google Maps 打开位置 URL */
export function getGoogleMapsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
}

/** 高德地图街景 URL */
export function getAmapStreetViewUrl(lat: number, lng: number): string {
  const [gcjLat, gcjLng] = wgs84ToGcj02(lat, lng)
  return `https://uri.amap.com/marker?position=${gcjLng},${gcjLat}&name=巡礼地&callnative=1`
}

// =============================================
// 辅助功能
// =============================================

/** 飞到指定位置（WGS84，自动转换） */
export function flyToWGS84(
  map: Map,
  lat: number,
  lng: number,
  zoom?: number,
  options?: { duration?: number }
): void {
  const [cLat, cLng] = convertCoord(lat, lng, currentStyle)
  map.flyTo([cLat, cLng], zoom, { duration: options?.duration ?? 1.2 })
}

/** 计算一组 WGS84 坐标的边界 */
export function calcBounds(
  points: { lat: number; lng: number }[]
): L.LatLngBounds | null {
  if (points.length === 0) return null
  const latLngs = points.map((p) => {
    const [lat, lng] = convertCoord(p.lat, p.lng, currentStyle)
    return L.latLng(lat, lng)
  })
  return L.latLngBounds(latLngs)
}

/** 获取用户当前位置（WGS84） */
export function getCurrentPosition(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('浏览器不支持定位'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude })
      },
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 10000 }
    )
  })
}
