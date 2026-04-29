import { FastifyInstance } from 'fastify'

export default async function locationRoutes(app: FastifyInstance) {
  // 获取取景地列表（支持分页和筛选）
  app.get('/', async (req) => {
    const { page = '1', pageSize = '50', workId, status, tag } = req.query as any
    const skip = (parseInt(page) - 1) * parseInt(pageSize)
    const take = parseInt(pageSize)

    const where: any = {}
    if (workId) where.workId = workId
    if (status) where.status = status
    if (tag) where.tags = { contains: tag }

    const [locations, total] = await Promise.all([
      app.prisma.location.findMany({
        where,
        skip,
        take,
        orderBy: { sortOrder: 'asc' },
        include: {
          work: { select: { id: true, title: true, color: true } },
        },
      }),
      app.prisma.location.count({ where }),
    ])

    return {
      data: locations.map(l => ({
        ...l,
        tags: JSON.parse(l.tags),
      })),
      pagination: {
        page: parseInt(page),
        pageSize: take,
        total,
        totalPages: Math.ceil(total / take),
      },
    }
  })

  // 获取取景地详情
  app.get('/:id', async (req) => {
    const { id } = req.params as any

    const location = await app.prisma.location.findUnique({
      where: { id },
      include: {
        work: true,
      },
    })

    if (!location) {
      return app.httpErrors.notFound('取景地不存在')
    }

    return {
      ...location,
      tags: JSON.parse(location.tags),
      work: {
        ...location.work,
        genre: JSON.parse(location.work.genre),
      },
    }
  })

  // 创建取景地
  app.post('/', async (req) => {
    const body = req.body as any

    const location = await app.prisma.location.create({
      data: {
        workId: body.workId,
        name: body.name,
        address: body.address,
        latitude: body.latitude,
        longitude: body.longitude,
        sceneDescription: body.sceneDescription,
        episode: body.episode,
        timestamp: body.timestamp,
        screenshotUrl: body.screenshotUrl,
        realPhotoUrl: body.realPhotoUrl,
        behindStory: body.behindStory,
        tags: JSON.stringify(body.tags || []),
        status: body.status || 'active',
        source: body.source || 'local',
        createdBy: body.createdBy,
      },
    })

    // 更新作品的取景地计数
    await app.prisma.work.update({
      where: { id: body.workId },
      data: { locationCount: { increment: 1 } },
    })

    return { ...location, tags: JSON.parse(location.tags) }
  })

  // 更新取景地
  app.put('/:id', async (req) => {
    const { id } = req.params as any
    const body = req.body as any

    const location = await app.prisma.location.update({
      where: { id },
      data: {
        name: body.name,
        address: body.address,
        latitude: body.latitude,
        longitude: body.longitude,
        sceneDescription: body.sceneDescription,
        episode: body.episode,
        timestamp: body.timestamp,
        screenshotUrl: body.screenshotUrl,
        realPhotoUrl: body.realPhotoUrl,
        behindStory: body.behindStory,
        tags: body.tags ? JSON.stringify(body.tags) : undefined,
        status: body.status,
      },
    })

    return { ...location, tags: JSON.parse(location.tags) }
  })

  // 删除取景地
  app.delete('/:id', async (req) => {
    const { id } = req.params as any

    const location = await app.prisma.location.delete({ where: { id } })

    // 更新作品取景地计数
    await app.prisma.work.update({
      where: { id: location.workId },
      data: { locationCount: { decrement: 1 } },
    })

    return { success: true }
  })

  // 附近取景地（基于经纬度搜索）
  app.get('/nearby/:lat/:lng', async (req) => {
    const { lat, lng } = req.params as any
    const { radius = '50' } = req.query as any // km

    const latNum = parseFloat(lat)
    const lngNum = parseFloat(lng)
    const radiusKm = parseFloat(radius)

    // SQLite 不支持原生地理查询，使用 Haversine 公式近似
    // 1度纬度 ≈ 111km, 1度经度 ≈ 111 * cos(lat) km
    const latDelta = radiusKm / 111
    const lngDelta = radiusKm / (111 * Math.cos(latNum * Math.PI / 180))

    const locations = await app.prisma.location.findMany({
      where: {
        latitude: { gte: latNum - latDelta, lte: latNum + latDelta },
        longitude: { gte: lngNum - lngDelta, lte: lngNum + lngDelta },
        status: 'active',
      },
      include: {
        work: { select: { id: true, title: true, color: true } },
      },
    })

    // 计算精确距离并排序
    const withDistance = locations.map(l => {
      const dLat = (l.latitude - latNum) * Math.PI / 180
      const dLng = (l.longitude - lngNum) * Math.PI / 180
      const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(latNum * Math.PI / 180) * Math.cos(l.latitude * Math.PI / 180) *
        Math.sin(dLng / 2) ** 2
      const dist = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

      return { ...l, tags: JSON.parse(l.tags), distance: Math.round(dist * 10) / 10 }
    })

    withDistance.sort((a, b) => a.distance - b.distance)

    return { data: withDistance }
  })
}
