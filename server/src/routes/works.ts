import { FastifyInstance } from 'fastify'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default async function workRoutes(app: FastifyInstance) {
  // 获取作品列表
  app.get('/', async (req) => {
    const { page = '1', pageSize = '20', source } = req.query as any
    const skip = (parseInt(page) - 1) * parseInt(pageSize)
    const take = parseInt(pageSize)

    const where = source ? { source } : {}

    const [works, total] = await Promise.all([
      prisma.work.findMany({
        where,
        skip,
        take,
        orderBy: { updatedAt: 'desc' },
        include: {
          actors: { include: { actor: true } },
          _count: { select: { locations: true } },
        },
      }),
      prisma.work.count({ where }),
    ])

    return {
      data: works.map(w => ({
        ...w,
        genre: JSON.parse(w.genre),
        actors: w.actors.map(a => ({
          ...a.actor,
          role: a.role,
        })),
        locationCount: w._count.locations,
      })),
      pagination: {
        page: parseInt(page),
        pageSize: take,
        total,
        totalPages: Math.ceil(total / take),
      },
    }
  })

  // 获取作品详情
  app.get('/:id', async (req) => {
    const { id } = req.params as any

    const work = await prisma.work.findUnique({
      where: { id },
      include: {
        actors: { include: { actor: true } },
        locations: {
          where: { status: 'active' },
          orderBy: { sortOrder: 'asc' },
        },
      },
    })

    if (!work) {
      return app.httpErrors.notFound('作品不存在')
    }

    return {
      ...work,
      genre: JSON.parse(work.genre),
      actors: work.actors.map(a => ({
        ...a.actor,
        role: a.role,
      })),
      locations: work.locations.map(l => ({
        ...l,
        tags: JSON.parse(l.tags),
      })),
    }
  })

  // 创建作品
  app.post('/', async (req) => {
    const body = req.body as any

    // 确保演员存在
    const actorRecords = await Promise.all(
      (body.actors || []).map(async (name: string) => {
        return prisma.actor.upsert({
          where: { name },
          update: {},
          create: { name },
        })
      })
    )

    const work = await prisma.work.create({
      data: {
        title: body.title,
        titleEn: body.titleEn,
        year: body.year,
        director: body.director,
        genre: JSON.stringify(body.genre || []),
        description: body.description,
        poster: body.poster,
        color: body.color || '#D4AF37',
        source: body.source || 'local',
        sourceId: body.sourceId,
        actors: {
          create: actorRecords.map(actor => ({
            actorId: actor.id,
            role: undefined,
          })),
        },
      },
      include: {
        actors: { include: { actor: true } },
      },
    })

    return { ...work, genre: JSON.parse(work.genre) }
  })

  // 更新作品
  app.put('/:id', async (req) => {
    const { id } = req.params as any
    const body = req.body as any

    const work = await prisma.work.update({
      where: { id },
      data: {
        title: body.title,
        titleEn: body.titleEn,
        year: body.year,
        director: body.director,
        genre: body.genre ? JSON.stringify(body.genre) : undefined,
        description: body.description,
        poster: body.poster,
        color: body.color,
      },
    })

    return { ...work, genre: JSON.parse(work.genre) }
  })

  // 删除作品
  app.delete('/:id', async (req) => {
    const { id } = req.params as any

    await prisma.work.delete({ where: { id } })
    return { success: true }
  })

  // 获取作品的取景地列表
  app.get('/:id/locations', async (req) => {
    const { id } = req.params as any
    const { status, tag } = req.query as any

    const where: any = { workId: id }
    if (status) where.status = status
    if (tag) where.tags = { contains: tag }

    const locations = await prisma.location.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
    })

    return locations.map(l => ({
      ...l,
      tags: JSON.parse(l.tags),
    }))
  })
}
