import Fastify from 'fastify'
import cors from '@fastify/cors'
import { PrismaClient } from '@prisma/client'
import workRoutes from './routes/works.js'
import locationRoutes from './routes/locations.js'
import searchRoutes from './routes/search.js'
import favoriteRoutes from './routes/favorites.js'
import syncRoutes from './routes/sync.js'

const prisma = new PrismaClient()
const app = Fastify({ logger: true })

// 注册插件
app.register(cors, {
  origin: true, // 开发环境允许所有来源
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
})

// 健康检查
app.get('/api/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() }
})

// 注册路由
app.register(workRoutes, { prefix: '/api/works' })
app.register(locationRoutes, { prefix: '/api/locations' })
app.register(searchRoutes, { prefix: '/api/search' })
app.register(favoriteRoutes, { prefix: '/api/favorites' })
app.register(syncRoutes, { prefix: '/api/sync' })

// 启动服务
const PORT = parseInt(process.env.PORT || '3001', 10)

try {
  await app.listen({ port: PORT, host: '0.0.0.0' })
  console.log(`🚀 SceneHunt API running at http://localhost:${PORT}`)
} catch (err) {
  app.log.error(err)
  process.exit(1)
}

// 优雅关闭
process.on('SIGINT', async () => {
  await prisma.$disconnect()
  await app.close()
  process.exit(0)
})

export { app, prisma }
