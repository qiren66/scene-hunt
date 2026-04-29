import { FastifyInstance } from 'fastify'

export default async function searchRoutes(app: FastifyInstance) {
  // 全局搜索
  app.get('/', async (req) => {
    const { q, type, page = '1', pageSize = '20' } = req.query as any

    if (!q || q.trim().length === 0) {
      return { data: [], pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 } }
    }

    const keyword = q.trim()
    const skip = (parseInt(page) - 1) * parseInt(pageSize)
    const take = parseInt(pageSize)

    const results: any[] = []

    // 搜索作品
    if (!type || type === 'work') {
      const works = await app.prisma.work.findMany({
        where: {
          OR: [
            { title: { contains: keyword } },
            { titleEn: { contains: keyword } },
            { director: { contains: keyword } },
          ],
        },
        include: {
          actors: { include: { actor: true } },
          _count: { select: { locations: true } },
        },
        take: type === 'work' ? take : 10,
        skip: type === 'work' ? skip : 0,
      })

      results.push(...works.map(w => ({
        type: 'work',
        data: {
          ...w,
          genre: JSON.parse(w.genre),
          actors: w.actors.map(a => a.actor.name),
          locationCount: w._count.locations,
        },
      })))
    }

    // 搜索取景地
    if (!type || type === 'location') {
      const locations = await app.prisma.location.findMany({
        where: {
          OR: [
            { name: { contains: keyword } },
            { address: { contains: keyword } },
          ],
        },
        include: {
          work: { select: { id: true, title: true, color: true } },
        },
        take: type === 'location' ? take : 10,
        skip: type === 'location' ? skip : 0,
      })

      results.push(...locations.map(l => ({
        type: 'location',
        data: {
          ...l,
          tags: JSON.parse(l.tags),
        },
      })))
    }

    // 按演员搜索
    if (!type || type === 'work') {
      const actorWorks = await app.prisma.workActor.findMany({
        where: {
          actor: { name: { contains: keyword } },
        },
        include: {
          work: {
            include: {
              _count: { select: { locations: true } },
            },
          },
          actor: true,
        },
        take: 5,
      })

      for (const aw of actorWorks) {
        // 避免重复
        if (!results.some(r => r.type === 'work' && r.data.id === aw.work.id)) {
          results.push({
            type: 'work',
            data: {
              ...aw.work,
              genre: JSON.parse(aw.work.genre),
              matchedActor: aw.actor.name,
              locationCount: aw.work._count.locations,
            },
          })
        }
      }
    }

    return {
      data: results,
      query: keyword,
    }
  })
}
