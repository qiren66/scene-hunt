import { FastifyInstance } from 'fastify'
import { PrismaClient } from '@prisma/client'
import { fullSync, incrementalSync, getSyncStatus } from '../services/anitabi-sync.js'

const prisma = new PrismaClient()

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
    const { source } = req.query as any

    const works = await prisma.work.findMany({
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

    return {
      total: works.length,
      data: works,
    }
  })
}
