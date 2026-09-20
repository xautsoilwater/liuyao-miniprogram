/**
 * 研习插图。先天 / 后天盘由 JS 算出 disks[]，WXML 循环渲染，WXSS 画多层盘面。
 * 方位约定：0° = 上 = 南，顺时针。爻画取 TRIGRAMS.lines（下标 0 = 初爻）。
 */
const { buildBaguaDisk, TRIGRAMS } = require('../../data/bagua')

/** 研习文稿里所有罗盘八卦图都走这一套：先天盘 / 后天盘 / 对照双盘 */
const DISK_KEYS = {
  'xiantian-bagua': ['xiantian'],
  'houtian-bagua': ['houtian'],
  bagua: ['houtian'],
  'bagua-table': ['xiantian', 'houtian']
}

const GRID_KEYS = ['qian', 'dui', 'li', 'zhen', 'xun', 'kan', 'gen', 'kun']
const BAGUA_GRID = GRID_KEYS.map((key) => {
  const t = TRIGRAMS[key]
  return {
    key: t.key,
    name: t.name,
    nature: t.nature,
    wuxing: t.wuxing,
    lines: t.lines.slice()
  }
})

const VOLS8 = ['开宗', '易理', '象数', '卜卦', '排盘', '断卦', '梅花', '附录']
const STEPS6 = ['取用', '旺衰', '动变', '生克', '应期', '裁断']
const WUXING = ['木', '火', '土', '金', '水']

Component({
  properties: {
    name: { type: String, value: 'taiji' },
    caption: { type: String, value: '' }
  },
  data: {
    showDisks: false,
    compare: false,
    disks: [],
    baguaGrid: BAGUA_GRID,
    vols8: VOLS8,
    steps6: STEPS6,
    wuxing: WUXING
  },
  observers: {
    name() {
      this.syncFigure()
    }
  },
  lifetimes: {
    attached() {
      this.syncFigure()
    }
  },
  methods: {
    syncFigure() {
      const kinds = DISK_KEYS[this.properties.name]
      if (!kinds) {
        this.setData({ showDisks: false, compare: false, disks: [] })
        return
      }
      this.setData({
        showDisks: true,
        compare: kinds.length > 1,
        disks: kinds.map((kind) => buildBaguaDisk(kind))
      })
    }
  }
})
