/** 高德地图 JS API 加载器 */
export function loadAMap(key = 'YOUR_AMAP_KEY'): Promise<any> {
  return new Promise((resolve, reject) => {
    if (window.AMap) {
      resolve(window.AMap)
      return
    }

    window._AMapSecurityConfig = {
      securityJsCode: '',
    }

    const script = document.createElement('script')
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${key}`
    script.onload = () => {
      if (window.AMap) {
        resolve(window.AMap)
      } else {
        reject(new Error('AMap SDK 加载失败'))
      }
    }
    script.onerror = () => reject(new Error('AMap SDK 加载失败'))
    document.head.appendChild(script)
  })
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
    Math.sin(dLng / 2) *
    Math.sin(dLng / 2)
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
