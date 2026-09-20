/**
 * 研习插图。先天 / 后天盘由 JS 算出 disks[]，WXML 循环渲染，WXSS 画多层盘面。
 * 方位约定：0° = 上 = 南，顺时针。爻画取 TRIGRAMS.lines（下标 0 = 初爻）。
 */
const { buildBaguaDisk } = require('../../data/bagua')

const DISK_KEYS = {
  'xiantian-bagua': ['xiantian'],
  'houtian-bagua': ['houtian'],
  bagua: ['houtian'],
  'bagua-table': ['xiantian', 'houtian']
}

Component({
  properties: {
    name: { type: String, value: 'taiji' },
    caption: { type: String, value: '' }
  },
  data: {
    showDisks: false,
    compare: false,
    disks: []
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
