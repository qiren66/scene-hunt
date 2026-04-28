/** 作品数据模型 */
export interface Work {
  id: string
  title: string
  titleEn?: string
  year: number
  director: string
  actors: string[]
  poster: string
  genre: string[]
  description: string
  locationCount: number
  locations: Location[]
}

/** 取景地数据模型 */
export interface Location {
  id: string
  workId: string
  name: string
  address: string
  latitude: number
  longitude: number
  sceneDescription: string
  episode?: string
  timestamp?: string
  screenshotUrl: string
  realPhotoUrl: string
  behindStory?: string
  tags: string[]
}

/** 收藏数据模型 */
export interface Favorite {
  locationId: string
  type: 'want_to_go' | 'checked_in'
  createdAt: number
  note?: string
}

/** 搜索结果类型 */
export type SearchResult = {
  type: 'work'
  data: Work
} | {
  type: 'location'
  data: Location
  work: Work
}

/** 对比图模式 */
export type CompareMode = 'top-bottom' | 'left-right' | 'overlay'

/** 场景标签枚举 */
export const SCENE_TAGS = {
  indoor: '室内',
  outdoor: '室外',
  night: '夜景',
  classic: '经典',
  hidden: '隐藏彩蛋',
  market: '市场/街巷',
  nature: '自然风光',
  architecture: '建筑',
  waterfront: '滨水',
} as const

export type SceneTag = keyof typeof SCENE_TAGS
