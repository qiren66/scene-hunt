import Fastify from 'fastify'
import cors from '@fastify/cors'
import fastifyStatic from '@fastify/static'
import { PrismaClient } from '@prisma/client'
import path from 'path'
import { fileURLToPath } from 'url'
import sharp from 'sharp'
import fs from 'fs/promises'
import workRoutes from './routes/works.js'
import locationRoutes from './routes/locations.js'
import searchRoutes from './routes/search.js'
import favoriteRoutes from './routes/favorites.js'
import syncRoutes from './routes/sync.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PUBLIC_DIR = path.join(__dirname, '../public')

// 缩略图缓存目录
const THUMB_CACHE_DIR = path.join(PUBLIC_DIR, '_thumb_cache')

// 确保缩略图缓存目录存在
await fs.mkdir(THUMB_CACHE_DIR, { recursive: true })

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient
  }
}

const prisma = new PrismaClient()
const app = Fastify({ logger: true })

app.decorate('prisma', prisma)

// 注册插件
app.register(cors, {
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
})

// ============================================
// 图片裁剪代理路由（在静态文件之前注册）
// ============================================

interface ResizeQuery {
  w?: string
  h?: string
  q?: string
}

app.get('/images/resize/*', async (req, reply) => {
  const { '*': imagePath } = req.params as { '*': string }
  const { w, h, q } = req.query as ResizeQuery

  if (!w && !h) {
    return reply.code(400).send({ error: 'Missing width or height parameter' })
  }

  const width = w ? parseInt(w, 10) : undefined
  const height = h ? parseInt(h, 10) : undefined
  const quality = q ? parseInt(q, 10) : 85

  const acceptHeader = req.headers.accept || ''
  const supportWebp = acceptHeader.includes('image/webp')

  const ext = path.extname(imagePath) || '.jpg'
  const baseName = imagePath.replace(ext, '')
  const format = supportWebp ? 'webp' : 'jpeg'
  const cacheKey = `${baseName}_w${width || 'auto'}_h${height || 'auto'}_q${quality}_${format}${supportWebp ? '.webp' : ext}`
  const cachePath = path.join(THUMB_CACHE_DIR, cacheKey)
  const originalPath = path.join(PUBLIC_DIR, 'images', imagePath)

  try {
    await fs.access(cachePath)
    const buffer = await fs.readFile(cachePath)
    reply.header('Content-Type', supportWebp ? 'image/webp' : `image/${format}`)
    reply.header('Cache-Control', 'public, max-age=2592000, immutable')
    return reply.send(buffer)
  } catch {
    // 缓存未命中
  }

  let buffer: Buffer
  try {
    buffer = await fs.readFile(originalPath)
  } catch {
    return reply.code(404).send({ error: 'Image not found' })
  }

  try {
    const pipeline = sharp(buffer)

    if (width || height) {
      pipeline.resize(width, height, {
        fit: 'cover',
        position: 'center',
      })
    }

    let outputBuffer: Buffer
    if (supportWebp) {
      outputBuffer = await pipeline.webp({
        quality: Math.min(quality, 100),
        effort: 4,
      }).toBuffer()
      reply.header('Content-Type', 'image/webp')
    } else {
      const outputExt = ext.toLowerCase()
      if (outputExt === '.png') {
        outputBuffer = await pipeline.png({ quality: Math.min(quality, 100) }).toBuffer()
        reply.header('Content-Type', 'image/png')
      } else {
        outputBuffer = await pipeline.jpeg({
          quality: Math.min(quality, 100),
          progressive: true,
          mozjpeg: true,
        }).toBuffer()
        reply.header('Content-Type', 'image/jpeg')
      }
    }

    fs.mkdir(path.dirname(cachePath), { recursive: true })
      .then(() => fs.writeFile(cachePath, outputBuffer))
      .catch(() => { /* 忽略缓存写入失败 */ })

    reply.header('Cache-Control', 'public, max-age=2592000, immutable')
    return reply.send(outputBuffer)
  } catch (err) {
    app.log.error('Image resize error:', err)
    return reply.code(500).send({ error: 'Image processing failed' })
  }
})

// 注册静态文件服务
app.register(fastifyStatic, {
  root: PUBLIC_DIR,
  prefix: '/images/',
  maxAge: '30d',
  immutable: true,
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
