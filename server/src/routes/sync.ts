import { FastifyInstance } from 'fastify'
import { fullSync, incrementalSync, getSyncStatus } from '../services/anitabi-sync.js'

export default async function syncRoutes(app: FastifyInstance) {
  // 获取同步状态
  app.get('/status', async () => {
    const status = await getSyncStatus()
    return status
  })

  // 触发全量同步
  app.post('/full', async (req, reply) => {
    // 异步执行，立即返回
    reply.send({ message: '全量同步已开始', mode: 'full' })

    fullSync((progress) => {
      // 进度日志（实际生产环境可用 WebSocket 推送）
      if (progress.phase === 'done') {
        console.log('📊 全量同步完成:', progress)
      }
    }).catch(console.error)
  })

  // 触发增量同步
  app.post('/incremental', async (req, reply) => {
    reply.send({ message: '增量同步已开始', mode: 'incremental' })

    incrementalSync((progress) => {
      if (progress.phase === 'done') {
        console.log('📊 增量同步完成:', progress)
      }
    }).catch(console.error)
  })

  // 获取地图数据（作品 + 地标，供前端地图页使用）
  app.get('/map-data', async (req) => {
    const { source, thumb } = req.query as any

    // thumb 参数：是否返回缩略图URL
    // 'true'/'1' = 标准缩略图（封面 120x168 q85，截图 360x270 q80）
    // 'hd' = 高清缩略图（封面 240x336 q92，截图 720x540 q88）
    const useThumb = thumb === 'true' || thumb === '1' || thumb === 'hd'
    const isHD = thumb === 'hd'

    const works = await app.prisma.work.findMany({
      where: source ? { source } : {},
      select: {
        id: true,
        title: true,
        titleEn: true,
        color: true,
        city: true,
        latitude: true,
        longitude: true,
        zoom: true,
        poster: true,
        posterLocal: true,
        locationCount: true,
        source: true,
        sourceId: true,
        locations: {
          select: {
            id: true,
            name: true,
            cn: true,
            latitude: true,
            longitude: true,
            screenshotUrl: true,
            screenshotLocal: true,
            episode: true,
            ep: true,
            s: true,
            origin: true,
            originURL: true,
          },
          where: { status: 'active' },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { locationCount: 'desc' },
    })

    // 优先使用本地路径，并添加尺寸参数
    return {
      total: works.length,
      data: works.map(work => {
        const posterUrl = work.posterLocal || work.poster
        const screenshotBase = work.screenshotLocal || work.screenshotUrl

        return {
          ...work,
          poster: useThumb && posterUrl.startsWith('/images/')
            ? isHD
              ? `/images/resize/${posterUrl.replace('/images/', '')}?w=240&h=336&q=92`
              : `/images/resize/${posterUrl.replace('/images/', '')}?w=120&h=168&q=85`
            : posterUrl,
          locations: work.locations.map(loc => {
            const locUrl = loc.screenshotLocal || loc.screenshotUrl
            return {
              ...loc,
              screenshotUrl: useThumb && locUrl.startsWith('/images/')
                ? isHD
                  ? `/images/resize/${locUrl.replace('/images/', '')}?w=720&h=540&q=88`
                  : `/images/resize/${locUrl.replace('/images/', '')}?w=360&h=270&q=80`
                : locUrl,
            }
          }),
        }
      }),
    }
  })
}
