import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// 从前端数据导入的原始数据
const WORKS_DATA = [
  {
    id: 'kuangbiao',
    title: '狂飙',
    titleEn: 'The Knockout',
    year: 2023,
    director: '徐纪周',
    genre: ['犯罪', '剧情', '悬疑'],
    description: '京海市一线民警安欣与黑恶势力斗智斗勇的故事。通过2000年、2006年、2021年三段时间线，展现了黑恶势力坐大的过程，以及政法队伍清除内鬼、扫黑除恶的艰辛历程。',
    poster: 'https://img2.doubanio.com/view/photo/s_ratio_poster/public/p2883259585.jpg',
    color: '#8B0000',
    actors: ['张译', '张颂文', '李一桐', '张志坚', '吴刚'],
    locations: [
      { id: 'kuangbiao-001', name: '三十三墟街', address: '广东省江门市蓬江区仓后街道三十三墟街', latitude: 22.5925, longitude: 113.0815, sceneDescription: '高启强卖鱼的旧市场，剧中最重要的标志性场景。安欣与高启强多次在此相遇，从陌生人到对手的命运交织由此开始。', episode: '第1-10集', timestamp: '00:15:30', screenshotUrl: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=600&h=400&fit=crop', realPhotoUrl: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=600&h=400&fit=crop', behindStory: '三十三墟街是江门最老的骑楼街区，有着上百年的历史。', tags: ['室外', '经典', '市场'] },
      { id: 'kuangbiao-002', name: '长堤历史文化街区', address: '广东省江门市蓬江区长堤路', latitude: 22.588, longitude: 113.078, sceneDescription: '安欣与高启强在江边散步对话的经典场景，夜色下的长堤灯火阑珊。', episode: '第5集', timestamp: '00:32:15', screenshotUrl: 'https://images.unsplash.com/photo-1514565131-fceaa8011d7d?w=600&h=400&fit=crop', realPhotoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=400&fit=crop', behindStory: '长堤的夜景是剧中最具电影感的画面之一。', tags: ['室外', '夜景', '滨水'] },
      { id: 'kuangbiao-003', name: '江门市华侨中学', address: '广东省江门市蓬江区华园中路23号', latitude: 22.585, longitude: 113.085, sceneDescription: '剧中高启盛就读的学校。', episode: '第3集', timestamp: '00:22:45', screenshotUrl: 'https://images.unsplash.com/photo-1562774053-70194806d4d3?w=600&h=400&fit=crop', realPhotoUrl: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=600&h=400&fit=crop', tags: ['室外', '建筑'] },
      { id: 'kuangbiao-004', name: '白水带公园', address: '广东省江门市江海区白水带大道', latitude: 22.568, longitude: 113.092, sceneDescription: '安欣独自跑步思考案情的场景。', episode: '第8集', timestamp: '00:08:20', screenshotUrl: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=600&h=400&fit=crop', realPhotoUrl: 'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=600&h=400&fit=crop', behindStory: '张译坚持每天凌晨4点到场排练跑步状态。', tags: ['室外', '自然风光'] },
      { id: 'kuangbiao-005', name: '东湖公园', address: '广东省江门市蓬江区东华一路', latitude: 22.595, longitude: 113.09, sceneDescription: '安欣与孟钰约会散步的公园。', episode: '第6集', timestamp: '00:28:10', screenshotUrl: 'https://images.unsplash.com/photo-1580217593608-61931ceac53e?w=600&h=400&fit=crop', realPhotoUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&h=400&fit=crop', tags: ['室外', '自然风光'] },
      { id: 'kuangbiao-007', name: '开平碉楼', address: '广东省江门市开平市塘口镇自力村', latitude: 22.382, longitude: 112.698, sceneDescription: '高启强家族的权力象征——碉楼群。', episode: '第15-20集', timestamp: '00:05:30', screenshotUrl: 'https://images.unsplash.com/photo-1590523741831-ab7e8b8f9c7f?w=600&h=400&fit=crop', realPhotoUrl: 'https://images.unsplash.com/photo-1528164344705-47542687000d?w=600&h=400&fit=crop', behindStory: '开平碉楼是世界文化遗产。', tags: ['室外', '建筑', '经典'] },
      { id: 'kuangbiao-008', name: '赤坎古镇', address: '广东省江门市开平市赤坎镇', latitude: 22.368, longitude: 112.682, sceneDescription: '剧中2000年代老街的取景地。', episode: '第1-5集', timestamp: '00:18:45', screenshotUrl: 'https://images.unsplash.com/photo-1513475382580-d574f6e3468b?w=600&h=400&fit=crop', realPhotoUrl: 'https://images.unsplash.com/photo-1504198453319-5ce911b1de19?w=600&h=400&fit=crop', behindStory: '赤坎古镇有超过350年历史。', tags: ['室外', '市场', '经典'] },
      { id: 'kuangbiao-015', name: '小鸟天堂', address: '广东省江门市新会区天马河畔', latitude: 22.472, longitude: 113.042, sceneDescription: '巴金笔下的"鸟的天堂"，剧中安欣与孟钰谈心之处。', episode: '第11集', timestamp: '00:30:40', screenshotUrl: 'https://images.unsplash.com/photo-1515251980331-567e3c7a4e3c?w=600&h=400&fit=crop', realPhotoUrl: 'https://images.unsplash.com/photo-1504893524553-b3daa06f4c06?w=600&h=400&fit=crop', tags: ['室外', '自然风光', '滨水'] },
    ],
  },
  {
    id: 'zhenhuanzhuan',
    title: '甄嬛传',
    titleEn: 'Empresses in the Palace',
    year: 2011,
    director: '郑晓龙',
    genre: ['古装', '宫廷', '剧情'],
    description: '甄嬛从一个不谙世事的单纯少女成长为一个善于谋权的深宫妇人。',
    poster: 'https://img2.doubanio.com/view/photo/s_ratio_poster/public/p2184979463.jpg',
    color: '#8B0000',
    actors: ['孙俪', '陈建斌', '蔡少芬', '蒋欣', '李东学'],
    locations: [
      { id: 'zhenhuanzhuan-001', name: '横店明清宫苑', address: '浙江省金华市东阳市横店镇明清宫苑景区', latitude: 29.175, longitude: 120.232, sceneDescription: '甄嬛传的主要取景地，1:1复制的故宫。', episode: '全剧', timestamp: '00:01:00', screenshotUrl: 'https://images.unsplash.com/photo-1548013146-72479768bada?w=600&h=400&fit=crop', realPhotoUrl: 'https://images.unsplash.com/photo-1599707367812-042e6a0f7343?w=600&h=400&fit=crop', behindStory: '横店明清宫苑是亚洲最大的实景影视基地。', tags: ['室外', '建筑', '经典'] },
      { id: 'zhenhuanzhuan-002', name: '圆明园遗址公园', address: '北京市海淀区清华西路28号', latitude: 40.009, longitude: 116.298, sceneDescription: '剧中甄嬛避暑的圆明园场景。', episode: '第10-15集', timestamp: '00:20:30', screenshotUrl: 'https://images.unsplash.com/photo-1508804185872-d7bad9308f3f?w=600&h=400&fit=crop', realPhotoUrl: 'https://images.unsplash.com/photo-1547981609-4b6f71d8fa58?w=600&h=400&fit=crop', tags: ['室外', '自然风光', '滨水'] },
      { id: 'zhenhuanzhuan-005', name: '故宫博物院', address: '北京市东城区景山前街4号', latitude: 39.9163, longitude: 116.3972, sceneDescription: '部分外景和航拍镜头使用的是真实的故宫。', episode: '第1集', timestamp: '00:02:00', screenshotUrl: 'https://images.unsplash.com/photo-1584646098378-0874589d76b1?w=600&h=400&fit=crop', realPhotoUrl: 'https://images.unsplash.com/photo-1599707367812-042e6a0f7343?w=600&h=400&fit=crop', behindStory: '真实的故宫取景非常困难。', tags: ['室外', '建筑', '经典'] },
      { id: 'zhenhuanzhuan-006', name: '避暑山庄', address: '河北省承德市双桥区丽正门路', latitude: 40.976, longitude: 117.934, sceneDescription: '剧中皇家避暑山庄的取景地。', episode: '第25-30集', timestamp: '00:18:30', screenshotUrl: 'https://images.unsplash.com/photo-1547981609-4b6f71d8fa58?w=600&h=400&fit=crop', realPhotoUrl: 'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=600&h=400&fit=crop', tags: ['室外', '建筑', '自然风光'] },
    ],
  },
  {
    id: 'harry-potter',
    title: '哈利·波特',
    titleEn: 'Harry Potter',
    year: 2001,
    director: '克里斯·哥伦布 / 阿方索·卡隆 / 迈克·纽维尔 / 大卫·叶茨',
    genre: ['奇幻', '冒险', '家庭'],
    description: '孤儿哈利·波特在11岁生日时得知自己是巫师，进入霍格沃茨魔法学校学习。',
    poster: 'https://img2.doubanio.com/view/photo/s_ratio_poster/public/p2614979463.jpg',
    color: '#2D5016',
    actors: ['丹尼尔·雷德克里夫', '艾玛·沃森', '鲁伯特·格林特'],
    locations: [
      { id: 'harry-potter-001', name: '国王十字车站9¾站台', address: 'Pancras Rd, London N1C 4QP, UK', latitude: 51.532, longitude: -0.126, sceneDescription: '哈利通往魔法世界的入口。', episode: '全系列', timestamp: '00:25:00', screenshotUrl: 'https://images.unsplash.com/photo-1474487548417-781cb71495f3?w=600&h=400&fit=crop', realPhotoUrl: 'https://images.unsplash.com/photo-1504198453319-5ce911b1de19?w=600&h=400&fit=crop', behindStory: '如今国王十字车站已设立了9¾站台的纪念打卡点。', tags: ['室内', '经典'] },
      { id: 'harry-potter-002', name: '牛津大学基督堂学院', address: 'St Aldates, Oxford OX1 1DP, UK', latitude: 51.746, longitude: -1.256, sceneDescription: '霍格沃茨大礼堂的灵感来源。', episode: '全系列', timestamp: '00:35:00', screenshotUrl: 'https://images.unsplash.com/photo-1523050854058-8df90110c476?w=600&h=400&fit=crop', realPhotoUrl: 'https://images.unsplash.com/photo-1548013146-72479768bada?w=600&h=400&fit=crop', behindStory: '基督堂学院的大厅是霍格沃茨大礼堂的真实原型。', tags: ['室内', '建筑', '经典'] },
      { id: 'harry-potter-005', name: '格伦芬南高架桥', address: 'Glenfinnan, Highland PH37 4LT, UK', latitude: 56.933, longitude: -5.438, sceneDescription: '霍格沃茨特快列车经过的标志性高架桥。', episode: '哈利·波特与密室', timestamp: '00:15:20', screenshotUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&h=400&fit=crop', realPhotoUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=600&h=400&fit=crop', behindStory: '每年夏季都有专门的哈利·波特主题列车往返于此。', tags: ['室外', '自然风光', '经典'] },
      { id: 'harry-potter-006', name: '阿尼克城堡', address: 'Alnwick, Northumberland NE66 1NQ, UK', latitude: 55.415, longitude: -1.706, sceneDescription: '霍格沃茨飞行课的取景地。', episode: '哈利·波特与魔法石', timestamp: '00:55:30', screenshotUrl: 'https://images.unsplash.com/photo-1538108149393-fbbd81895907?w=600&h=400&fit=crop', realPhotoUrl: 'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=600&h=400&fit=crop', behindStory: '哈利·波特电影播出后，城堡游客量激增了300%。', tags: ['室外', '建筑', '经典'] },
    ],
  },
]

async function main() {
  console.log('🌱 开始填充数据...')

  for (const workData of WORKS_DATA) {
    // 创建演员
    const actorRecords = []
    for (const actorName of workData.actors) {
      const actor = await prisma.actor.upsert({
        where: { name: actorName },
        update: {},
        create: { name: actorName },
      })
      actorRecords.push(actor)
    }

    // 创建作品
    const work = await prisma.work.upsert({
      where: { id: workData.id },
      update: {
        title: workData.title,
        titleEn: workData.titleEn,
        year: workData.year,
        director: workData.director,
        genre: JSON.stringify(workData.genre),
        description: workData.description,
        poster: workData.poster,
        color: workData.color,
        locationCount: workData.locations.length,
      },
      create: {
        id: workData.id,
        title: workData.title,
        titleEn: workData.titleEn,
        year: workData.year,
        director: workData.director,
        genre: JSON.stringify(workData.genre),
        description: workData.description,
        poster: workData.poster,
        color: workData.color,
        locationCount: workData.locations.length,
        actors: {
          create: actorRecords.map(actor => ({
            actorId: actor.id,
          })),
        },
      },
    })

    // 创建取景地
    for (let i = 0; i < workData.locations.length; i++) {
      const loc = workData.locations[i]
      await prisma.location.upsert({
        where: { id: loc.id },
        update: {
          name: loc.name,
          address: loc.address,
          latitude: loc.latitude,
          longitude: loc.longitude,
          sceneDescription: loc.sceneDescription,
          episode: loc.episode,
          timestamp: loc.timestamp,
          screenshotUrl: loc.screenshotUrl,
          realPhotoUrl: loc.realPhotoUrl,
          behindStory: loc.behindStory,
          tags: JSON.stringify(loc.tags),
          sortOrder: i,
        },
        create: {
          id: loc.id,
          workId: work.id,
          name: loc.name,
          address: loc.address,
          latitude: loc.latitude,
          longitude: loc.longitude,
          sceneDescription: loc.sceneDescription,
          episode: loc.episode,
          timestamp: loc.timestamp,
          screenshotUrl: loc.screenshotUrl,
          realPhotoUrl: loc.realPhotoUrl,
          behindStory: loc.behindStory,
          tags: JSON.stringify(loc.tags),
          sortOrder: i,
        },
      })
    }

    console.log(`  ✅ ${workData.title} - ${workData.locations.length} 个取景地`)
  }

  const workCount = await prisma.work.count()
  const locationCount = await prisma.location.count()
  const actorCount = await prisma.actor.count()

  console.log(`\n🎉 填充完成！`)
  console.log(`  📊 作品: ${workCount}`)
  console.log(`  📊 取景地: ${locationCount}`)
  console.log(`  📊 演员: ${actorCount}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
