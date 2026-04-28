# SceneHunt 全栈部署说明

## 架构总览

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────┐
│   前端 (Vue 3)   │────▶│  后端 (Fastify)  │────▶│  数据库      │
│  Vite + TS       │     │  Node.js + TS    │     │  SQLite/PG   │
│  端口: 3000      │     │  端口: 3001      │     │  Prisma ORM  │
└──────────────────┘     └──────────────────┘     └──────────────┘
       │                        │
       │   开发环境: Vite Proxy │
       └────────────────────────┘
       生产环境: Nginx 反向代理
```

---

## 一、本地开发环境

### 前置要求

- Node.js 18+
- npm 9+

### 1. 启动后端

```bash
cd server

# 安装依赖
npm install

# 初始化数据库
npx prisma generate
npx prisma db push

# 填充示例数据
npm run db:seed

# 启动开发服务
npm run dev
```

后端运行在 http://localhost:3001

### 2. 启动前端

```bash
# 在项目根目录

# 安装依赖
npm install

# 启动开发服务
npm run dev
```

前端运行在 http://localhost:3000

Vite 已配置代理，前端 `/api/*` 请求会自动转发到后端 `http://localhost:3001`。

### 3. 验证

- 前端: http://localhost:3000
- 后端健康检查: http://localhost:3001/api/health
- 作品列表 API: http://localhost:3001/api/works
- 地图探索: http://localhost:3000/explore

---

## 二、生产部署

### 方案 A：单服务器部署（推荐）

#### 1. 构建前端

```bash
npm run build
# 产出目录: dist/
```

#### 2. 构建后端

```bash
cd server
npm run build
# 产出目录: server/dist/
```

#### 3. 配置 Nginx

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 前端静态资源
    root /var/www/scenehunt/dist;
    index index.html;

    # SPA 路由回退
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API 反向代理
    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 静态资源缓存
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

#### 4. 使用 PM2 管理后端进程

```bash
npm install -g pm2

cd server
pm2 start dist/index.js --name scenehunt-api
pm2 save
pm2 startup
```

#### 5. 切换到 PostgreSQL（生产推荐）

修改 `server/.env`:
```
DATABASE_URL="postgresql://user:password@localhost:5432/scenehunt?schema=public"
```

修改 `server/prisma/schema.prisma`:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

然后重新迁移:
```bash
cd server
npx prisma migrate dev --name init
npm run db:seed
```

### 方案 B：Docker 部署

创建 `docker-compose.yml`:

```yaml
version: '3.8'

services:
  frontend:
    build: .
    ports:
      - "80:80"
    depends_on:
      - api

  api:
    build: ./server
    ports:
      - "3001:3001"
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@db:5432/scenehunt
    depends_on:
      - db

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: scenehunt
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"

volumes:
  pgdata:
```

创建前端 `Dockerfile`:

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

创建后端 `server/Dockerfile`:

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build
EXPOSE 3001
CMD ["node", "dist/index.js"]
```

启动:
```bash
docker-compose up -d
```

---

## 三、API 接口文档

### 作品 API

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/works` | 获取作品列表（分页） |
| GET | `/api/works/:id` | 获取作品详情（含取景地） |
| POST | `/api/works` | 创建作品 |
| PUT | `/api/works/:id` | 更新作品 |
| DELETE | `/api/works/:id` | 删除作品 |
| GET | `/api/works/:id/locations` | 获取作品的取景地列表 |

### 取景地 API

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/locations` | 获取取景地列表（分页/筛选） |
| GET | `/api/locations/:id` | 获取取景地详情 |
| POST | `/api/locations` | 创建取景地 |
| PUT | `/api/locations/:id` | 更新取景地 |
| DELETE | `/api/locations/:id` | 删除取景地 |
| GET | `/api/locations/nearby/:lat/:lng` | 附近取景地搜索 |

### 搜索 API

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/search?q=keyword` | 全局搜索（作品+取景地+演员） |

### 收藏 API

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/favorites` | 获取收藏列表 |
| POST | `/api/favorites` | 添加收藏/打卡 |
| DELETE | `/api/favorites/:id` | 删除收藏 |
| DELETE | `/api/favorites/by-location/:locationId` | 按地点删除收藏 |
| GET | `/api/favorites/stats` | 收藏统计 |

---

## 四、数据库表结构

### ER 关系图

```
Work ──< Location
  │          │
  │          └──< Favorite >── User
  │
  └──< WorkActor >── Actor

Route（独立表）
```

### 表清单

| 表名 | 说明 | 关键字段 |
|---|---|---|
| `Work` | 影视作品 | id, title, year, director, genre(JSON) |
| `Actor` | 演员 | id, name |
| `WorkActor` | 作品-演员关联 | workId, actorId, role |
| `Location` | 取景地 | id, workId, name, lat, lng, tags(JSON) |
| `User` | 用户 | id, nickname, role |
| `Favorite` | 收藏/打卡 | userId, locationId, type |
| `Route` | 主题路线 | id, title, price, locationIds(JSON) |

### 数据库切换

| 环境 | 数据库 | 配置 |
|---|---|---|
| 开发 | SQLite | `DATABASE_URL="file:./dev.db"` |
| 生产 | PostgreSQL | `DATABASE_URL="postgresql://user:pass@host:5432/db"` |

切换只需修改 `.env` 和 `schema.prisma` 中的 `provider`，Prisma 会自动处理。

---

## 五、环境变量

### 前端 (.env)

```env
VITE_API_BASE=/api    # API 基础路径（生产环境用相对路径）
```

### 后端 (.env)

```env
DATABASE_URL=file:./dev.db     # 开发: SQLite
# DATABASE_URL=postgresql://... # 生产: PostgreSQL
PORT=3001                       # 服务端口
# JWT_SECRET=your-secret        # 第二阶段: JWT 认证
```

---

## 六、常用命令速查

```bash
# ===== 后端 =====
cd server
npm run dev          # 启动开发服务器（热重载）
npm run db:push      # 推送 Schema 到数据库
npm run db:seed      # 填充示例数据
npm run db:studio    # 打开 Prisma Studio 可视化管理
npm run build        # 构建生产版本

# ===== 前端 =====
npm run dev          # 启动开发服务器
npm run build        # 构建生产版本
npm run preview      # 预览生产版本

# ===== Docker =====
docker-compose up -d           # 启动所有服务
docker-compose logs -f api     # 查看后端日志
docker-compose down            # 停止所有服务
```
