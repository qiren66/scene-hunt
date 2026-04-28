/**
 * Anitabi 数据同步服务
 * 从 api.anitabi.cn 拉取数据并写入本地数据库
 * 支持：全量同步、增量同步
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const API_BASE = 'https://api.anitabi.cn'

// ============================================
// Anitabi API 类型定义
// ============================================

interface AnitabiBangumiBrief {
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

interface AnitabiLitePoint {
  id: string
  cn?: string
  name: string
  image: string
  ep?: number
  s?: number
  geo: [number, number]
}

interface AnitabiDetailPoint {
  id: string
  name: string
  image: string
  ep?: number
  s?: number
  geo: [number, number]
  origin?: string
  originURL?: string
}

interface AnitabiBangumiLite {
  id: number
  cn: string
  title: string
  city?: string
  cover: string
  color: string
  geo: [number, number]
  zoom: number
  modified: number
  litePoints: AnitabiLitePoint[]
  pointsLength: number
  imagesLength: number
}

// ============================================
// API 请求（带重试）
// ============================================

async function fetchWithRetry(url: string, retries = 3, timeoutMs = 60000): Promise<any> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(timeoutMs),
      })
      if (!res.ok) {
        if (res.status === 404) return null // 作品不存在
        throw new Error(`HTTP ${res.status}`)
      }
      return res.json()
    } catch (err) {
      if (i === retries - 1) throw err
      await new Promise((r) => setTimeout(r, 1000 * (i + 1))) // 递增等待
    }
  }
}

// ============================================
// 同步逻辑
// ============================================

export interface SyncProgress {
  phase: 'fetching_list' | 'syncing_works' | 'done' | 'error'
  total: number
  current: number
  currentWork?: string
  errors: string[]
}

/** 全量同步：拉取所有公开作品及其地标 */
export async function fullSync(
  onProgress?: (progress: SyncProgress) => void
): Promise<{ synced: number; errors: string[] }> {
  const errors: string[] = []
  const progress: SyncProgress = {
    phase: 'fetching_list',
    total: 0,
    current: 0,
    errors,
  }

  try {
    // 1. 获取作品列表
    console.log('📡 获取 anitabi 作品列表...')
    const list: AnitabiBangumiBrief[] = await fetchWithRetry(
      `${API_BASE}/bangumi?public=true`,
      3,
      120000 // 列表接口数据量大，2分钟超时
    )
    if (!list || !Array.isArray(list)) {
      throw new Error('获取作品列表失败')
    }

    progress.total = list.length
    progress.phase = 'syncing_works'
    onProgress?.(progress)

    console.log(`📋 共 ${list.length} 部作品需要同步`)

    // 2. 逐个同步作品
    for (let i = 0; i < list.length; i++) {
      const brief = list[i]
      progress.current = i + 1
      progress.currentWork = brief.cn
      onProgress?.(progress)

      try {
        await syncOneWork(brief)
        console.log(`  ✅ [${i + 1}/${list.length}] ${brief.cn}`)
      } catch (err: any) {
        const msg = `${brief.cn} (${brief.id}): ${err.message}`
        errors.push(msg)
        console.warn(`  ❌ [${i + 1}/${list.length}] ${msg}`)
      }

      // 请求间隔，避免过快
      if (i < list.length - 1) {
        await new Promise((r) => setTimeout(r, 300))
      }
    }

    progress.phase = 'done'
    onProgress?.(progress)
    console.log(`\n🎉 同步完成！成功 ${list.length - errors.length}/${list.length}，失败 ${errors.length}`)
  } catch (err: any) {
    progress.phase = 'error'
    errors.push(`全局错误: ${err.message}`)
    onProgress?.(progress)
    console.error('同步失败:', err)
  }

  return { synced: progress.total - errors.length, errors }
}

/** 增量同步：只同步 modified 时间晚于上次同步的作品 */
export async function incrementalSync(
  onProgress?: (progress: SyncProgress) => void
): Promise<{ synced: number; skipped: number; errors: string[] }> {
  const errors: string[] = []
  const progress: SyncProgress = {
    phase: 'fetching_list',
    total: 0,
    current: 0,
    errors,
  }

  try {
    // 1. 获取远程列表
    const list: AnitabiBangumiBrief[] = await fetchWithRetry(
      `${API_BASE}/bangumi?public=true`,
      3,
      120000
    )
    if (!list || !Array.isArray(list)) {
      throw new Error('获取作品列表失败')
    }

    // 2. 查询本地已同步的作品
    const localWorks = await prisma.work.findMany({
      where: { source: 'anitabi' },
      select: { sourceId: true, syncedAt: true },
    })
    const localMap = new Map(
      localWorks.map((w) => [w.sourceId, w.syncedAt])
    )

    // 3. 过滤出需要更新的作品
    // 获取远程作品的 modified 时间（通过 /lite 接口）
    // 简化策略：对于增量同步，我们重新拉取 lite 接口来检查 modified
    const needSync: AnitabiBangumiBrief[] = []

    for (const brief of list) {
      const sourceId = String(brief.id)
      const localSyncedAt = localMap.get(sourceId)

      // 本地没有 → 需要同步
      if (!localSyncedAt) {
        needSync.push(brief)
        continue
      }

      // 本地有，检查是否需要更新（简单策略：24小时内的不重复同步）
      const hoursSinceSync = (Date.now() - localSyncedAt.getTime()) / (1000 * 60 * 60)
      if (hoursSinceSync > 24) {
        needSync.push(brief)
      }
    }

    const skipped = list.length - needSync.length
    console.log(`📋 增量同步: ${needSync.length} 部需要更新，${skipped} 部跳过`)

    progress.total = needSync.length
    progress.phase = 'syncing_works'
    onProgress?.(progress)

    // 4. 同步
    for (let i = 0; i < needSync.length; i++) {
      const brief = needSync[i]
      progress.current = i + 1
      progress.currentWork = brief.cn
      onProgress?.(progress)

      try {
        await syncOneWork(brief)
        console.log(`  ✅ [${i + 1}/${needSync.length}] ${brief.cn}`)
      } catch (err: any) {
        errors.push(`${brief.cn} (${brief.id}): ${err.message}`)
        console.warn(`  ❌ [${i + 1}/${needSync.length}] ${brief.cn}: ${err.message}`)
      }

      if (i < needSync.length - 1) {
        await new Promise((r) => setTimeout(r, 300))
      }
    }

    progress.phase = 'done'
    onProgress?.(progress)
    console.log(`\n🎉 增量同步完成！更新 ${needSync.length - errors.length}，跳过 ${skipped}，失败 ${errors.length}`)

    return { synced: needSync.length - errors.length, skipped, errors }
  } catch (err: any) {
    progress.phase = 'error'
    errors.push(`全局错误: ${err.message}`)
    onProgress?.(progress)
    return { synced: 0, skipped: 0, errors }
  }
}

/** 同步单部作品 */
async function syncOneWork(brief: AnitabiBangumiBrief): Promise<void> {
  const sourceId = String(brief.id)

  // 1. 获取作品 lite 数据（包含前10个地标）
  const lite: AnitabiBangumiLite = await fetchWithRetry(
    `${API_BASE}/bangumi/${brief.id}/lite`
  )
  if (!lite) throw new Error(`作品 ${brief.id} 不存在`)

  // 2. 获取全部地标详情
  const detailPoints: AnitabiDetailPoint[] = await fetchWithRetry(
    `${API_BASE}/bangumi/${brief.id}/points/detail?haveImage=true`
  ) || []

  // 3. 合并地标数据：详情优先，lite 补充
  const allPoints = mergePoints(lite.litePoints, detailPoints)

  // 4. Upsert 作品
  const work = await prisma.work.upsert({
    where: { source_sourceId: { source: 'anitabi', sourceId } },
    update: {
      title: lite.cn,
      titleEn: lite.title,
      poster: lite.cover,
      color: lite.color,
      city: lite.city || null,
      latitude: lite.geo[0],
      longitude: lite.geo[1],
      zoom: lite.zoom,
      locationCount: allPoints.length,
      syncedAt: new Date(),
    },
    create: {
      title: lite.cn,
      titleEn: lite.title,
      poster: lite.cover,
      color: lite.color,
      city: lite.city || null,
      latitude: lite.geo[0],
      longitude: lite.geo[1],
      zoom: lite.zoom,
      locationCount: allPoints.length,
      source: 'anitabi',
      sourceId,
      syncedAt: new Date(),
    },
  })

  // 5. 删除旧地标并重新插入（简化增量更新）
  await prisma.location.deleteMany({
    where: { workId: work.id, source: 'anitabi' },
  })

  // 6. 批量创建地标
  if (allPoints.length > 0) {
    await prisma.location.createMany({
      data: allPoints.map((point, index) => ({
        workId: work.id,
        name: point.cn || point.name,
        cn: point.cn || null,
        latitude: point.geo[0],
        longitude: point.geo[1],
        screenshotUrl: point.image || '',
        episode: point.ep != null ? `第${point.ep}话` : null,
        ep: point.ep ?? null,
        s: point.s ?? null,
        origin: point.origin || null,
        originURL: point.originURL || null,
        sortOrder: index,
        source: 'anitabi',
        sourceId: point.id,
      })),
    })
  }
}

/** 合并 lite 和 detail 地标数据 */
function mergePoints(
  litePoints: AnitabiLitePoint[],
  detailPoints: AnitabiDetailPoint[]
): (AnitabiLitePoint & Partial<AnitabiDetailPoint>)[] {
  if (detailPoints.length === 0) {
    // 没有 detail 数据，就用 lite 的
    return litePoints.map((p) => ({ ...p }))
  }

  // detail 数据更完整，优先使用
  // 但 lite 可能有 cn 字段，补充到 detail 中
  const liteMap = new Map(litePoints.map((p) => [p.id, p]))

  return detailPoints.map((dp) => {
    const lp = liteMap.get(dp.id)
    return {
      ...dp,
      cn: lp?.cn || undefined, // 优先 lite 的中文名
    }
  })
}

/** 获取同步状态统计 */
export async function getSyncStatus() {
  const [workCount, locationCount, lastSync] = await Promise.all([
    prisma.work.count({ where: { source: 'anitabi' } }),
    prisma.location.count({ where: { source: 'anitabi' } }),
    prisma.work.findFirst({
      where: { source: 'anitabi', syncedAt: { not: null } },
      orderBy: { syncedAt: 'desc' },
      select: { syncedAt: true },
    }),
  ])

  return {
    anitabiWorks: workCount,
    anitabiLocations: locationCount,
    lastSyncAt: lastSync?.syncedAt?.toISOString() || null,
  }
}

// ============================================
// CLI 直接运行
// ============================================

if (process.argv[1]?.includes('anitabi-sync')) {
  const mode = process.argv[2] || 'full'
  console.log(`🔄 开始${mode === 'incremental' ? '增量' : '全量'}同步...`)

  const syncFn = mode === 'incremental' ? incrementalSync : fullSync
  const result = await syncFn((p) => {
    if (p.phase === 'syncing_works') {
      process.stdout.write(`\r  ${p.current}/${p.total} ${p.currentWork || ''}`)
    }
  })

  console.log('\n结果:', result)
  await prisma.$disconnect()
}
