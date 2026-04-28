/**
 * 从本地 bangumi-ids.json 文件同步数据到数据库
 * 比直接请求 API 更可靠，因为列表已预先下载
 */
import { PrismaClient } from '@prisma/client'
import fs from 'fs'

const prisma = new PrismaClient()
const API_BASE = 'https://api.anitabi.cn'

interface BangumiBrief {
  id: number
  cn: string
  title: string
  city?: string | null
  color: string
  geo: [number, number]
  zoom: number
  cat?: string | null
}

async function fetchWithRetry(url: string, retries = 3): Promise<any> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(30000) })
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
  const mode = process.argv[2] || 'full' // full 或 incremental
  const limit = process.argv[3] ? parseInt(process.argv[3]) : 0 // 限制数量，0=全部

  // 读取本地作品列表
  const list: BangumiBrief[] = JSON.parse(
    fs.readFileSync('prisma/bangumi-ids.json', 'utf8')
  )

  console.log(`📋 本地列表: ${list.length} 部作品`)
  console.log(`🔄 模式: ${mode}${limit > 0 ? ` (限 ${limit} 部)` : ''}`)

  // 增量模式：只同步本地没有的
  let toSync = list
  if (mode === 'incremental') {
    const existing = await prisma.work.findMany({
      where: { source: 'anitabi' },
      select: { sourceId: true },
    })
    const existingIds = new Set(existing.map((w) => w.sourceId))
    toSync = list.filter((b) => !existingIds.has(String(b.id)))
    console.log(`📊 已有 ${existing.length} 部，需同步 ${toSync.length} 部`)
  }

  if (limit > 0) {
    toSync = toSync.slice(0, limit)
  }

  let synced = 0
  let failed = 0
  let totalPoints = 0

  for (let i = 0; i < toSync.length; i++) {
    const brief = toSync[i]
    const sourceId = String(brief.id)

    try {
      // 1. 获取作品 lite 数据
      const lite = await fetchWithRetry(`${API_BASE}/bangumi/${brief.id}/lite`)
      if (!lite) {
        console.log(`  ⚠️ [${i + 1}/${toSync.length}] ${brief.cn} - 不存在，跳过`)
        failed++
        continue
      }

      // 2. 获取全部地标详情
      const detailPoints = await fetchWithRetry(
        `${API_BASE}/bangumi/${brief.id}/points/detail?haveImage=true`
      ) || []

      // 3. 合并地标数据
      const liteMap = new Map((lite.litePoints || []).map((p: any) => [p.id, p]))
      const allPoints: any[] = detailPoints.map((dp: any) => ({
        ...dp,
        cn: liteMap.get(dp.id)?.cn || undefined,
      }))

      // 4. Upsert 作品（用 findFirst 避免复合唯一键问题）
      let work = await prisma.work.findFirst({
        where: { source: 'anitabi', sourceId },
      })

      if (work) {
        work = await prisma.work.update({
          where: { id: work.id },
          data: {
            title: lite.cn || brief.cn,
            titleEn: lite.title || brief.title,
            poster: lite.cover || '',
            color: lite.color || brief.color,
            city: lite.city || brief.city || null,
            latitude: lite.geo?.[0] ?? brief.geo?.[0] ?? 0,
            longitude: lite.geo?.[1] ?? brief.geo?.[1] ?? 0,
            zoom: lite.zoom ?? brief.zoom ?? 12,
            locationCount: allPoints.length,
            syncedAt: new Date(),
          },
        })
      } else {
        work = await prisma.work.create({
          data: {
            title: lite.cn || brief.cn,
            titleEn: lite.title || brief.title,
            poster: lite.cover || '',
            color: lite.color || brief.color,
            city: lite.city || brief.city || null,
            latitude: lite.geo?.[0] ?? brief.geo?.[0] ?? 0,
            longitude: lite.geo?.[1] ?? brief.geo?.[1] ?? 0,
            zoom: lite.zoom ?? brief.zoom ?? 12,
            locationCount: allPoints.length,
            source: 'anitabi',
            sourceId,
            syncedAt: new Date(),
          },
        })
      }

      // 5. 删除旧地标 + 重新插入
      await prisma.location.deleteMany({
        where: { workId: work.id, source: 'anitabi' },
      })

      if (allPoints.length > 0) {
        await prisma.location.createMany({
          data: allPoints.map((point: any, index: number) => {
            // 数据清洗：确保类型正确
            const ep = point.ep != null ? parseInt(String(point.ep)) : null
            const s = point.s != null ? parseInt(String(point.s)) : null
            const episode = ep && !isNaN(ep) ? `第${ep}话` : null

            return {
              workId: work!.id,
              name: point.cn || point.name || '',
              cn: point.cn || null,
              latitude: point.geo?.[0] ?? 0,
              longitude: point.geo?.[1] ?? 0,
              screenshotUrl: point.image || '',
              episode,
              ep: ep && !isNaN(ep) ? ep : null,
              s: s && !isNaN(s) ? s : null,
              origin: point.origin || null,
              originURL: point.originURL || null,
              sortOrder: index,
              source: 'anitabi',
              sourceId: point.id || String(index),
            }
          }),
        })
      }

      synced++
      totalPoints += allPoints.length
      console.log(`  ✅ [${i + 1}/${toSync.length}] ${lite.cn || brief.cn} — ${allPoints.length} 地标`)
    } catch (err: any) {
      failed++
      console.log(`  ❌ [${i + 1}/${toSync.length}] ${brief.cn} — ${err.message}`)
    }

    // 请求间隔
    await new Promise((r) => setTimeout(r, 200))
  }

  // 最终统计
  const workCount = await prisma.work.count({ where: { source: 'anitabi' } })
  const locationCount = await prisma.location.count({ where: { source: 'anitabi' } })

  console.log(`\n🎉 同步完成！`)
  console.log(`  本次: 成功 ${synced}, 失败 ${failed}, 总地标 ${totalPoints}`)
  console.log(`  数据库: ${workCount} 部作品, ${locationCount} 个取景地`)

  await prisma.$disconnect()
}

main().catch((err) => {
  console.error('同步失败:', err)
  prisma.$disconnect()
})
