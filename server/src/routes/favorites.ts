import { FastifyInstance } from 'fastify'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default async function favoriteRoutes(app: FastifyInstance) {
  // 获取收藏列表
  app.get('/', async (req) => {
    const { userId, type, locationId } = req.query as any

    const where: any = {}
    if (userId) where.userId = userId
    if (type) where.type = type
    if (locationId) where.locationId = locationId

    const favorites = await prisma.favorite.findMany({
      where,
      include: {
        location: {
          include: {
            work: { select: { id: true, title: true, color: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return {
      data: favorites.map(f => ({
        ...f,
        location: {
          ...f.location,
          tags: JSON.parse(f.location.tags),
        },
      })),
    }
  })

  // 添加收藏/打卡
  app.post('/', async (req) => {
    const body = req.body as any

    // upsert：如果已存在则更新
    const favorite = await prisma.favorite.upsert({
      where: {
        userId_locationId_type: {
          userId: body.userId || 'anonymous',
          locationId: body.locationId,
          type: body.type,
        },
      },
      update: {
        note: body.note,
        photoUrl: body.photoUrl,
      },
      create: {
        userId: body.userId || 'anonymous',
        locationId: body.locationId,
        type: body.type,
        note: body.note,
        photoUrl: body.photoUrl,
      },
    })

    return favorite
  })

  // 取消收藏
  app.delete('/:id', async (req) => {
    const { id } = req.params as any
    await prisma.favorite.delete({ where: { id } })
    return { success: true }
  })

  // 按地点取消收藏
  app.delete('/by-location/:locationId', async (req) => {
    const { locationId } = req.params as any
    const { userId, type } = req.query as any

    const where: any = { locationId }
    if (userId) where.userId = userId
    if (type) where.type = type

    await prisma.favorite.deleteMany({ where })
    return { success: true }
  })

  // 获取统计数据
  app.get('/stats', async (req) => {
    const { userId } = req.query as any

    const where = userId ? { userId } : {}

    const [wantToGo, checkedIn] = await Promise.all([
      prisma.favorite.count({ where: { ...where, type: 'want_to_go' } }),
      prisma.favorite.count({ where: { ...where, type: 'checked_in' } }),
    ])

    return { wantToGo, checkedIn, total: wantToGo + checkedIn }
  })
}
