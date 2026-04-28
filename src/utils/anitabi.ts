/**
 * Anitabi 开放 API 数据服务
 * API 文档: https://navi.anitabi.cn/docs/api/
 * 数据协议: CC BY-NC-SA 4.0
 */

const API_BASE = 'https://api.anitabi.cn'
const IMAGE_BASE = 'https://image.anitabi.cn'

/** Anitabi 作品轻量信息 */
export interface AnitabiBangumi {
  id: number
  cn: string
  title: string
  city?: string
  cover: string
  color: string
  geo: [number, number] // [纬度, 经度]
  zoom: number
  modified: number
  litePoints: AnitabiLitePoint[]
  pointsLength: number
  imagesLength: number
}

/** Anitabi 地标轻量信息 */
export interface AnitabiLitePoint {
  id: string
  cn?: string
  name: string
  image: string
  ep?: number
  s?: number
  geo: [number, number] // [纬度, 经度]
}

/** Anitabi 地标详情 */
export interface AnitabiDetailPoint {
  id: string
  name: string
  image: string
  ep?: number
  s?: number
  geo: [number, number]
  origin?: string
  originURL?: string
}

/** 获取作品巡礼地标信息（轻量版） */
export async function fetchBangumiLite(subjectId: number): Promise<AnitabiBangumi> {
  const res = await fetch(`${API_BASE}/bangumi/${subjectId}/lite`)
  if (!res.ok) throw new Error(`Failed to fetch bangumi ${subjectId}`)
  return res.json()
}

/** 获取地标详情 */
export async function fetchBangumiPoints(
  subjectId: number,
  haveImage = true
): Promise<AnitabiDetailPoint[]> {
  const params = haveImage ? '?haveImage=true' : ''
  const res = await fetch(`${API_BASE}/bangumi/${subjectId}/points/detail${params}`)
  if (!res.ok) throw new Error(`Failed to fetch points for bangumi ${subjectId}`)
  return res.json()
}

/** 列表 API 返回的简要信息 */
export interface AnitabiBangumiBrief {
  id: number
  cn: string
  title: string
  city?: string
  cover: string
  color: string
  geo: [number, number]
  zoom: number
  pointsLength: number
  imagesLength: number
}

/** 获取公开作品列表 */
export async function fetchBangumiList(): Promise<AnitabiBangumiBrief[]> {
  const res = await fetch(`${API_BASE}/bangumi?public=true`)
  if (!res.ok) throw new Error('Failed to fetch bangumi list')
  return res.json()
}

/** 获取巡礼地图 URL */
export function getAnitabiMapUrl(subjectId: number): string {
  return `https://anitabi.cn/map?bangumiId=${subjectId}`
}

/** 获取图片 URL（指定尺寸） */
export function getImageUrl(path: string, plan: 'h160' | 'h360' | 'original' = 'h160'): string {
  if (plan === 'original') return path
  const sep = path.includes('?') ? '&' : '?'
  return `${path}${sep}plan=${plan}`
}

/**
 * 精选作品列表（硬编码推荐，避免全量拉取）
 * 这些是 anitabi 上数据丰富、标记点多的知名动画作品
 */
export const FEATURED_BANGUMI_IDS = [
  115908,  // 吹响吧！上低音号 - 宇治市
  126461,  // LoveLive! Sunshine!! - 沼津
  105818,  // 你的名字 - 东京/飞驒
  10380,   // 幸运星 - 鹫宫町
  7163,    // CLANNAD - 光坂町
  4336,    // 凉宫春日的忧郁 - 西宫市
  1001,    // 花开伊吕波 - 汤涌温泉
  5515,    // Kanon - 琴美町
  6271,    // Air - 观铃町
  765,     // 某科学的超电磁炮 - 学园都市
]

/** 缓存已加载的作品数据 */
const bangumiCache = new Map<number, AnitabiBangumi>()

/** 获取作品数据（带缓存） */
export async function getBangumiData(subjectId: number): Promise<AnitabiBangumi> {
  if (bangumiCache.has(subjectId)) {
    return bangumiCache.get(subjectId)!
  }
  const data = await fetchBangumiLite(subjectId)
  bangumiCache.set(subjectId, data)
  return data
}

/** 批量获取多个作品数据 */
export async function getMultipleBangumiData(ids: number[]): Promise<AnitabiBangumi[]> {
  const results = await Promise.allSettled(ids.map(id => getBangumiData(id)))
  return results
    .filter((r): r is PromiseFulfilledResult<AnitabiBangumi> => r.status === 'fulfilled')
    .map(r => r.value)
}
