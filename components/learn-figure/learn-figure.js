/**
 * 先天八卦（伏羲）方位：上南下北，乾南坤北、离东坎西
 * 后天八卦（文王）方位：上南下北，离南坎北、震东兑西
 * 盘面 0° = 上（南）、180° = 下（北）、90° = 右（西）、270° = 左（东）
 */

function buildXiantianBagua() {
  // 先天（伏羲）正确方位：0°=南顺时针
  // 乾南0、巽西南45、坎西90、艮西北135、坤北180、震东北225、离东270、兑东南315
  return [
    { name: '乾', tip: '天·金', lines: [1, 1, 1], deg: 0, tone: 'qian' },
    { name: '巽', tip: '风·木', lines: [0, 1, 1], deg: 45, tone: 'xun' },
    { name: '坎', tip: '水', lines: [0, 1, 0], deg: 90, tone: 'kan' },
    { name: '艮', tip: '山·土', lines: [0, 0, 1], deg: 135, tone: 'gen' },
    { name: '坤', tip: '地·土', lines: [0, 0, 0], deg: 180, tone: 'kun' },
    { name: '震', tip: '雷·木', lines: [1, 0, 0], deg: 225, tone: 'zhen' },
    { name: '离', tip: '火', lines: [1, 0, 1], deg: 270, tone: 'li' },
    { name: '兑', tip: '泽·金', lines: [1, 1, 0], deg: 315, tone: 'dui' }
  ]
}

function buildHoutianBagua() {
  // 后天（文王）正确方位：0°=南顺时针
  // 离南0、坤西南45、兑西90、乾西北135、坎北180、艮东北225、震东270、巽东南315
  return [
    { name: '离', tip: '火', lines: [1, 0, 1], deg: 0, tone: 'li' },
    { name: '坤', tip: '地·土', lines: [0, 0, 0], deg: 45, tone: 'kun' },
    { name: '兑', tip: '泽·金', lines: [1, 1, 0], deg: 90, tone: 'dui' },
    { name: '乾', tip: '天·金', lines: [1, 1, 1], deg: 135, tone: 'qian' },
    { name: '坎', tip: '水', lines: [0, 1, 0], deg: 180, tone: 'kan' },
    { name: '艮', tip: '山·土', lines: [0, 0, 1], deg: 225, tone: 'gen' },
    { name: '震', tip: '雷·木', lines: [1, 0, 0], deg: 270, tone: 'zhen' },
    { name: '巽', tip: '风·木', lines: [0, 1, 1], deg: 315, tone: 'xun' }
  ]
}

function buildHoutianDirs() {
  return [
    { name: '南', deg: 0 },
    { name: '西', deg: 90 },
    { name: '北', deg: 180 },
    { name: '东', deg: 270 }
  ]
}

function buildTicks() {
  return Array.from({ length: 24 }, (_, i) => {
    const deg = i * 15
    return { deg, major: deg % 45 === 0 }
  })
}

function buildSpokes() {
  return [45, 135, 225, 315]
}

Component({
  properties: {
    name: { type: String, value: 'taiji' },
    caption: { type: String, value: '' }
  },
  data: {
    xiantianBagua: buildXiantianBagua(),
    houtianBagua: buildHoutianBagua(),
    houtianDirs: buildHoutianDirs(),
    xiantianTicks: buildTicks(),
    houtianTicks: buildTicks(),
    xiantianSpokes: buildSpokes(),
    houtianSpokes: buildSpokes()
  }
})
