/**
 * 快速同步脚本 - 先同步前 10 部作品验证逻辑
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const API_BASE = 'https://api.anitabi.cn'
const MAX_WORKS = 10

async function fetchWithRetry(url: string, retries = 3, timeoutMs = 30000): Promise<any> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) })
      if (!res.ok) {
        if (res.status === 404) return null
        throw new Error(`HTTP ${res.status}`)
      }
      return res.json()
    } catch (err) {
      if (i === retries - 1) throw err
      await new Promise((r) => setTimeout(r, 1000 * (i + 1)))
    }
  }
}

async function main() {
  console.log(`🔄 开始同步前 ${MAX_WORKS} 部作品...`)

  // 1. 获取列表
  console.log('📡 获取作品列表...')
  const list: any[] = await fetchWithRetry(`${API_BASE}/bangumi?public=true`, 3, 120000)
  if (!list || !Array.isArray(list)) {
    throw new Error('获取列表失败')
  }
  console.log(`📋 共 ${list.length} 部作品，将同步前 ${MAX_WORKS} 部`)

  const batch = list.slice(0, MAX_WORKS)
  let synced = 0
  let totalPoints = 0

  for (let i = 0; i < batch.length; i++) {
    const brief = batch[i]
    const sourceId = String(brief.id)

    try {
      // 2. 获取 lite 数据
      const lite = await fetchWithRetry(`${API_BASE}/bangumi/${brief.id}/lite`)
      if (!lite) {
        console.log(`  ⚠️ [${i + 1}/${MAX_WORKS}] ${brief.cn} - 不存在，跳过`)
        continue
      }

      // 3. 获取全部地标详情
      const detailPoints = await fetchWithRetry(`${API_BASE}/bangumi/${brief.id}/points/detail?haveImage=true`) || []

      // 4. 合并地标数据
      const liteMap = new Map((lite.litePoints || []).map((p: any) => [p.id, p]))
      const allPoints = detailPoints.map((dp: any) => ({
        ...dp,
        cn: liteMap.get(dp.id)?.cn || undefined,
      }))

      // 5. Upsert 作品
      const work = await prisma.work.upsert({
        where: { source_sourceId: { source: 'anitabi', sourceId } },
        update: {
          title: lite.cn,
          titleEn: lite.title,
          poster: lite.cover,
          color: lite.color || '#D4AF37',
          city: lite.city || null,
          latitude: lite.geo?.[0] ?? 0,
          longitude: lite.geo?.[1] ?? 0,
          zoom: lite.zoom ?? 12,
          locationCount: allPoints.length,
          syncedAt: new Date(),
        },
        create: {
          title: lite.cn,
          titleEn: lite.title,
          poster: lite.cover,
          color: lite.color || '#D4AF37',
          city: lite.city || null,
          latitude: lite.geo?.[0] ?? 0,
          longitude: lite.geo?.[1] ?? 0,
          zoom: lite.zoom ?? 12,
          locationCount: allPoints.length,
          source: 'anitabi',
          sourceId,
          syncedAt: new Date(),
        },
      })

      // 6. 删除旧地标 + 重新插入
      await prisma.location.deleteMany({
        where: { workId: work.id, source: 'anitabi' },
      })

      if (allPoints.length > 0) {
        await prisma.location.createMany({
          data: allPoints.map((point: any, index: number) => ({
            workId: work.id,
            name: point.cn || point.name,
            cn: point.cn || null,
            latitude: point.geo?.[0] ?? 0,
            longitude: point.geo?.[1] ?? 0,
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

      synced++
      totalPoints += allPoints.length
      console.log(`  ✅ [${i + 1}/${MAX_WORKS}] ${lite.cn} — ${allPoints.length} 个地标`)
    } catch (err: any) {
      console.log(`  ❌ [${i + 1}/${MAX_WORKS}] ${brief.cn} — ${err.message}`)
    }

    // 请求间隔
    await new Promise((r) => setTimeout(r, 300))
  }

  // 统计
  const workCount = await prisma.work.count({ where: { source: 'anitabi' } })
  const locationCount = await prisma.location.count({ where: { source: 'anitabi' } })

  console.log(`\n🎉 同步完成！本次同步 ${synced} 部，共 ${totalPoints} 个地标`)
  console.log(`📊 数据库总计: ${workCount} 部作品, ${locationCount} 个取景地`)

  await prisma.$disconnect()
}

main().catch((err) => {
  console.error('同步失败:', err)
  prisma.$disconnect()
})
