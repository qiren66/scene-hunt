import fs from 'fs'

const data = JSON.parse(fs.readFileSync('prisma/bangumi-list.json', 'utf8'))

console.log('Total bangumi:', data.length)

// 用 geo 存在来筛选（有巡礼数据的作品都有 geo）
const withGeo = data.filter((b: any) => b.geo && Array.isArray(b.geo) && b.geo.length === 2)
console.log('With geo (real pilgrimage data):', withGeo.length)

// 提取关键信息
const ids = withGeo.map((b: any) => ({
  id: b.id,
  cn: b.cn || b.title,
  title: b.title,
  city: b.city || null,
  color: b.color || '#D4AF37',
  geo: b.geo,
  zoom: b.zoom || 12,
  cat: b.cat || null,
}))

// 保存紧凑格式（无缩进，减小文件体积）
fs.writeFileSync('prisma/bangumi-ids.json', JSON.stringify(ids))
console.log(`Saved ${ids.length} works to prisma/bangumi-ids.json`)

// 显示统计
const withCn = ids.filter((b: any) => b.cn !== b.title)
console.log('With Chinese name:', withCn.length)

// 显示前20
console.log('\nSample (first 20):')
ids.slice(0, 20).forEach((b: any) => {
  console.log(`  ${b.id} | ${b.cn} | ${b.city || '-'} | cat: ${b.cat || '-'}`)
})

// 按分类统计
const catMap = new Map<string, number>()
ids.forEach((b: any) => {
  const cat = b.cat || 'unknown'
  catMap.set(cat, (catMap.get(cat) || 0) + 1)
})
console.log('\nBy category:')
for (const [cat, count] of catMap) {
  console.log(`  ${cat}: ${count}`)
}
