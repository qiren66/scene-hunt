import type { Work, Location, SearchResult } from '@/types'
import { works } from '@/data/works'

/** 简单拼音首字母映射（覆盖常见声母） */
const PINYIN_MAP: Record<string, string> = {
  '狂': 'k', '飙': 'b', '甄': 'z', '嬛': 'h', '传': 'c',
  '哈': 'h', '利': 'l', '波': 'b', '特': 't',
  '安': 'a', '欣': 'x', '高': 'g', '启': 'q', '强': 'q',
  '张': 'z', '译': 'y', '颂': 's', '文': 'w',
  '孙': 's', '俪': 'l', '陈': 'c', '建': 'j', '斌': 'b',
  '丹': 'd', '尼': 'n', '尔': 'e', '雷': 'l', '德': 'd', '克': 'k', '里': 'l', '夫': 'f',
  '艾': 'a', '玛': 'm', '沃': 'w', '森': 's',
  '鲁': 'l', '伯': 'b', '特': 't', '格': 'g', '林': 'l',
  '徐': 'x', '纪': 'j', '周': 'z',
  '郑': 'z', '晓': 'x', '龙': 'l',
  '江': 'j', '门': 'm', '开': 'k', '平': 'p',
  '三': 's', '十': 's', '墟': 'x', '街': 'j',
  '赤': 'c', '坎': 'k', '镇': 'z',
}

function getPinyinInitials(text: string): string {
  let result = ''
  for (const char of text) {
    if (PINYIN_MAP[char]) {
      result += PINYIN_MAP[char]
    }
  }
  return result
}

/** 模糊匹配：支持中文、英文、拼音首字母 */
function fuzzyMatch(text: string, query: string): boolean {
  const q = query.toLowerCase().trim()
  if (!q) return false

  const textLower = text.toLowerCase()
  
  // 直接包含
  if (textLower.includes(q)) return true

  // 英文匹配
  const textEn = text.replace(/[^\x00-\x7F]/g, '').toLowerCase()
  if (textEn.includes(q)) return true

  // 拼音首字母匹配
  const pinyin = getPinyinInitials(text)
  if (pinyin.includes(q)) return true

  return false
}

/** 全局搜索 */
export function searchWorksAndLocations(query: string): SearchResult[] {
  if (!query.trim()) return []

  const results: SearchResult[] = []

  for (const work of works) {
    // 搜索作品名
    const titleMatch = fuzzyMatch(work.title, query) ||
      (work.titleEn && work.titleEn.toLowerCase().includes(query.toLowerCase()))
    
    // 搜索导演
    const directorMatch = fuzzyMatch(work.director, query) ||
      work.director.toLowerCase().includes(query.toLowerCase())

    // 搜索演员
    const actorMatch = work.actors.some(a =>
      fuzzyMatch(a, query) || a.toLowerCase().includes(query.toLowerCase())
    )

    if (titleMatch || directorMatch || actorMatch) {
      results.push({ type: 'work', data: work })
    }

    // 搜索取景地
    for (const location of work.locations) {
      const locMatch = fuzzyMatch(location.name, query) ||
        fuzzyMatch(location.address, query) ||
        location.tags.some(t => fuzzyMatch(t, query))

      if (locMatch && !titleMatch) {
        results.push({ type: 'location', data: location, work })
      }
    }
  }

  return results
}

/** 获取所有作品 */
export function getAllWorks(): Work[] {
  return works
}

/** 根据 ID 获取作品 */
export function getWorkById(id: string): Work | undefined {
  return works.find(w => w.id === id)
}

/** 根据 ID 获取取景地 */
export function getLocationById(id: string): { location: Location; work: Work } | undefined {
  for (const work of works) {
    const location = work.locations.find(l => l.id === id)
    if (location) return { location, work }
  }
  return undefined
}

/** 获取最近浏览的作品 */
export function getRecentWorks(limit = 5): Work[] {
  try {
    const raw = localStorage.getItem('scene-hunt-recent')
    const ids: string[] = raw ? JSON.parse(raw) : []
    return ids
      .map(id => works.find(w => w.id === id))
      .filter((w): w is Work => !!w)
      .slice(0, limit)
  } catch {
    return []
  }
}

/** 添加最近浏览 */
export function addRecentWork(workId: string) {
  try {
    const raw = localStorage.getItem('scene-hunt-recent')
    let ids: string[] = raw ? JSON.parse(raw) : []
    ids = ids.filter(id => id !== workId)
    ids.unshift(workId)
    ids = ids.slice(0, 10)
    localStorage.setItem('scene-hunt-recent', JSON.stringify(ids))
  } catch {
    // ignore
  }
}
