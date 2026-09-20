/**
 * 易象图（后天）+ 罗盘
 * 借鉴专业罗盘交互：固定准星、顶部度数/山向、二十四山、盘面随朝向转动。
 * 盘面古式：0°=南（离）、180°=北（坎）；屏顶=手机朝向，坎指正北。
 */
const MOUNTAIN_NAMES = [
  '子', '癸', '丑', '艮', '寅', '甲', '卯', '乙', '辰', '巽', '巳', '丙',
  '午', '丁', '未', '坤', '申', '庚', '酉', '辛', '戌', '乾', '亥', '壬'
]

function buildMountains() {
  // 地磁 0°=正北为子；盘面角 = (地磁角 + 180) % 360
  return MOUNTAIN_NAMES.map((name, i) => {
    const compass = i * 15
    const deg = (compass + 180) % 360
    const cardinal = name === '子' || name === '午' || name === '卯' || name === '酉'
    return { name, deg, cardinal, compass }
  })
}

function buildDegreeLabels() {
  return [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((compass) => {
    const deg = (compass + 180) % 360
    return { text: String(compass), deg }
  })
}

function buildTicks() {
  return Array.from({ length: 72 }, (_, i) => {
    const deg = i * 5
    return {
      deg,
      major: deg % 30 === 0,
      mid: deg % 10 === 0 && deg % 30 !== 0
    }
  })
}

Component({
  properties: {},
  data: {
    plateDeg: -180,
    headingDeg: 0,
    headingDir: '北',
    mountain: '子',
    compassReady: false,
    bagua: [
      { name: '离', tip: '火', lines: [1, 0, 1], deg: 0, tone: 'li' },
      { name: '坤', tip: '地·土', lines: [0, 0, 0], deg: 45, tone: 'kun' },
      { name: '兑', tip: '泽·金', lines: [1, 1, 0], deg: 90, tone: 'dui' },
      { name: '乾', tip: '天·金', lines: [1, 1, 1], deg: 135, tone: 'qian' },
      { name: '坎', tip: '水', lines: [0, 1, 0], deg: 180, tone: 'kan' },
      { name: '艮', tip: '山·土', lines: [0, 0, 1], deg: 225, tone: 'gen' },
      { name: '震', tip: '雷·木', lines: [1, 0, 0], deg: 270, tone: 'zhen' },
      { name: '巽', tip: '风·木', lines: [0, 1, 1], deg: 315, tone: 'xun' }
    ],
    dirs: [
      { name: '南', deg: 0 },
      { name: '西', deg: 90 },
      { name: '北', deg: 180 },
      { name: '东', deg: 270 }
    ],
    spokes: [22.5, 67.5, 112.5, 157.5, 202.5, 247.5, 292.5, 337.5],
    ticks: buildTicks(),
    mountains: buildMountains(),
    degreeLabels: buildDegreeLabels(),
    tiangan: [
      { gan: '甲乙', wx: '木', tone: 'zhen' },
      { gan: '丙丁', wx: '火', tone: 'li' },
      { gan: '戊己', wx: '土', tone: 'kun' },
      { gan: '庚辛', wx: '金', tone: 'qian' },
      { gan: '壬癸', wx: '水', tone: 'kan' }
    ]
  },

  lifetimes: {
    attached() {
      this._heading = 0
      this._smoothHeading = 0
      this._plateDeg = -180
      this._lastPaint = 0
      this._paintTimer = null
      this._watchTimer = null
      this._smoothTimer = null
      this._compassStarted = false
      this._motionStarted = false
      this._compassLiveAt = 0
      this._hasSample = false
      this._compassRetrying = false
      this._dragging = false
      this._lastTouchAngle = null
      this._headingSamples = []
      this._motionIsRadians = null
      this._lastCompass = null
      this._gyroHeading = null
      this._lastGyroTs = 0
      this._onCompass = (res) => {
        if (this._dragging) return
        const dir = res && res.direction
        if (dir == null || Number.isNaN(Number(dir))) return
        const n = ((Number(dir) % 360) + 360) % 360
        if (n < -0.01 || n > 360.01) return
        // 地磁读数几乎不变时不霸占通道，让姿态/陀螺继续驱动盘面
        if (this._lastCompass != null) {
          const d = Math.abs(this.shortestDelta(this._lastCompass, n))
          if (d < 0.3) return
        }
        this._lastCompass = n
        this._compassLiveAt = Date.now()
        this.applyHeadingFast(n)
      }
      // 姿态 alpha + 陀螺积分：与指南针并行，保证手机一转盘就转
      this._onMotion = (res) => {
        if (this._dragging) return
        if (!res) return
        const now = Date.now()
        // 地磁刚有明显变化时优先用地磁，避免两路打架
        if (this._compassLiveAt && now - this._compassLiveAt < 120) return

        // 1) 设备姿态 alpha（绝对或相对朝向）
        if (res.alpha != null && !Number.isNaN(Number(res.alpha))) {
          let a = Number(res.alpha)
          if (this._motionIsRadians === null) {
            this._motionIsRadians = Math.abs(a) <= 6.5
          }
          if (this._motionIsRadians && Math.abs(a) > 7) this._motionIsRadians = false
          if (this._motionIsRadians) a = (a * 180) / Math.PI
          this.applyHeadingFast(((a % 360) + 360) % 360)
          return
        }

        // 2) 角速度积分（部分机型 alpha 缺失时仍可跟手）
        const rr = res.rotationRate
        if (rr && rr.alpha != null && !Number.isNaN(Number(rr.alpha))) {
          let rate = Number(rr.alpha)
          // 若像弧度/秒则转成度/秒
          if (Math.abs(rate) < 0.5) rate = (rate * 180) / Math.PI
          if (!this._lastGyroTs) {
            this._lastGyroTs = now
            if (this._gyroHeading == null) this._gyroHeading = this._heading || 0
            return
          }
          const dt = Math.min(0.05, Math.max(0.001, (now - this._lastGyroTs) / 1000))
          this._lastGyroTs = now
          if (this._gyroHeading == null) this._gyroHeading = this._heading || 0
          // 绕 Z 转动：取反使盘面与手机转向一致观感
          this._gyroHeading = ((this._gyroHeading - rate * dt) % 360 + 360) % 360
          this.applyHeadingFast(this._gyroHeading)
        }
      }
      this.startSensors(true)
    },
    detached() {
      this.clearTimers()
      this.stopCompass()
      this.stopMotion()
    }
  },

  pageLifetimes: {
    show() {
      this._compassLiveAt = 0
      this._hasSample = false
      this.startSensors(true)
    },
    hide() {
      this.clearTimers()
      this.stopCompass()
      this.stopMotion()
    }
  },

  methods: {
    clearTimers() {
      if (this._paintTimer) {
        clearTimeout(this._paintTimer)
        this._paintTimer = null
      }
      if (this._watchTimer) {
        clearTimeout(this._watchTimer)
        this._watchTimer = null
      }
      if (this._smoothTimer) {
        clearTimeout(this._smoothTimer)
        this._smoothTimer = null
      }
    },

    dirName(deg) {
      const d = ((deg % 360) + 360) % 360
      const names = ['北', '东北', '东', '东南', '南', '西南', '西', '西北']
      return names[Math.round(d / 45) % 8]
    },

    mountainName(deg) {
      const d = ((deg % 360) + 360) % 360
      return MOUNTAIN_NAMES[Math.round(d / 15) % 24]
    },

    hudFromHeading(heading) {
      const h = ((heading % 360) + 360) % 360
      return {
        headingDeg: Math.round(h * 10) / 10,
        headingDir: this.dirName(h),
        mountain: this.mountainName(h)
      }
    },

    /** 地磁/姿态朝向 → 盘面旋转：屏顶准星=手机朝向 */
    plateFromHeading(heading) {
      return -heading - 180
    },

    shortestDelta(from, to) {
      let d = to - from
      while (d > 180) d -= 360
      while (d < -180) d += 360
      return d
    },

    /**
     * 传感器跟手专用：少 setData 字段、少节流，避免「收到方向但盘不动」
     */
    applyHeadingFast(heading) {
      if (this._dragging) return
      const h = ((heading % 360) + 360) % 360
      this._heading = h
      this._smoothHeading = h
      this._hasSample = true
      let plateDeg = this.plateFromHeading(h)
      let norm = plateDeg % 360
      if (norm > 180) norm -= 360
      if (norm <= -180) norm += 360
      this._plateDeg = norm
      const now = Date.now()
      if (now - this._lastPaint < 12) {
        if (!this._paintTimer) {
          this._paintTimer = setTimeout(() => {
            this._paintTimer = null
            this._flushHeadingPaint()
          }, 12)
        }
        return
      }
      this._flushHeadingPaint()
    },

    _flushHeadingPaint() {
      if (this._dragging) return
      const h = this._heading
      let norm = this._plateDeg
      this._lastPaint = Date.now()
      if (this._paintTimer) {
        clearTimeout(this._paintTimer)
        this._paintTimer = null
      }
      // 只改跟手可见字段，减轻 setData 压力
      this.setData({
        plateDeg: norm,
        headingDeg: Math.round(h * 10) / 10,
        headingDir: this.dirName(h),
        mountain: this.mountainName(h),
        compassReady: true
      })
    },

    paintPlate(plateDeg, patch) {
      let norm = plateDeg % 360
      if (norm > 180) norm -= 360
      if (norm <= -180) norm += 360
      this._plateDeg = norm
      const now = Date.now()
      const force = !!(patch && patch.force)
      if (!force && now - this._lastPaint < 16 && this.data.compassReady) {
        if (!this._paintTimer) {
          this._paintTimer = setTimeout(() => {
            this._paintTimer = null
            this.paintPlate(this._plateDeg, Object.assign({}, patch || {}, { force: true }))
          }, 16)
        }
        return
      }
      this._lastPaint = now
      if (this._paintTimer) {
        clearTimeout(this._paintTimer)
        this._paintTimer = null
      }
      const data = Object.assign({ plateDeg: norm }, patch || {})
      delete data.force
      delete data.source
      this.setData(data)
    },

    applyHeadingVisual(heading, extra) {
      const h = ((heading % 360) + 360) % 360
      const hud = this.hudFromHeading(h)
      this.paintPlate(this.plateFromHeading(h), Object.assign({
        force: !!(extra && extra.force),
        compassReady: true,
        headingDeg: hud.headingDeg,
        headingDir: hud.headingDir,
        mountain: hud.mountain
      }, extra || {}))
    },

    queueSensorHeading(heading) {
      this.applyHeadingFast(heading)
    },

    queueCompassHeading(heading) {
      this.applyHeadingFast(heading)
    },

    headingFromPlate(plateDeg) {
      // plateDeg = -heading - 180  ⇒  heading = -plateDeg - 180
      return (((-plateDeg - 180) % 360) + 360) % 360
    },

    setManualPlate(plateDeg) {
      let norm = plateDeg % 360
      if (norm > 180) norm -= 360
      if (norm <= -180) norm += 360
      this._plateDeg = norm
      const h = this.headingFromPlate(norm)
      this._heading = h
      this._smoothHeading = h
      const hud = this.hudFromHeading(h)
      // 拖盘时不关掉 compassReady，松手后继续跟手机
      this.paintPlate(norm, {
        force: true,
        headingDeg: hud.headingDeg,
        headingDir: hud.headingDir,
        mountain: hud.mountain
      })
    },

    /** 并行启动指南针 + 设备姿态（姿态不延迟，避免一直等不到地磁） */
    startSensors(force) {
      this.startCompass(force)
      this.startMotion(force)
    },

    /**
     * @param {boolean} [force] 为 true 时先解绑再重开
     */
    startCompass(force) {
      if (typeof wx === 'undefined') return
      if (this._compassStarted && !force) return
      if (force) this.stopCompass()

      if (typeof wx.onCompassChange !== 'function') {
        return
      }

      this._compassStarted = true
      try {
        // 部分机型要求先 start 成功再 on；两边都挂，兼容差异
        const bindListen = () => {
          try {
            wx.onCompassChange(this._onCompass)
          } catch (e) { /* ignore */ }
        }
        if (typeof wx.startCompass === 'function') {
          wx.startCompass({
            success: () => {
              bindListen()
            },
            fail: () => {
              // 失败仍尝试监听（旧基础库 on 会自动 start）
              bindListen()
              this.tryAuthorizeLocationThenRetry()
            }
          })
        } else {
          bindListen()
        }
      } catch (e) {
        this._compassStarted = false
      }
    },

    /** 设备姿态：与指南针同时开，保证无地磁时也能跟手机转 */
    startMotion(force) {
      if (typeof wx === 'undefined') return
      if (typeof wx.onDeviceMotionChange !== 'function') return
      if (this._motionStarted && !force) return
      if (force) this.stopMotion()
      this._motionStarted = true
      this._motionIsRadians = null
      this._lastGyroTs = 0
      try {
        const bindListen = () => {
          try {
            wx.onDeviceMotionChange(this._onMotion)
          } catch (e) { /* ignore */ }
        }
        if (typeof wx.startDeviceMotionListening === 'function') {
          wx.startDeviceMotionListening({
            interval: 'game',
            success: () => {
              bindListen()
            },
            fail: () => {
              // 仍尝试注册；部分机型无需 start
              bindListen()
            }
          })
        } else {
          bindListen()
        }
      } catch (e) {
        this._motionStarted = false
      }
    },

    stopMotion() {
      if (!this._motionStarted) return
      this._motionStarted = false
      try {
        if (typeof wx.offDeviceMotionChange === 'function' && this._onMotion) {
          wx.offDeviceMotionChange(this._onMotion)
        }
        if (typeof wx.stopDeviceMotionListening === 'function') {
          wx.stopDeviceMotionListening({ complete: () => {} })
        }
      } catch (e) {
        // ignore
      }
    },

    tryAuthorizeLocationThenRetry() {
      if (this._compassRetrying) return
      if (typeof wx.getSetting !== 'function' || typeof wx.authorize !== 'function') return
      this._compassRetrying = true
      wx.getSetting({
        success: (setting) => {
          const auth = setting && setting.authSetting ? setting.authSetting : {}
          if (auth['scope.userLocation'] === false) {
            this._compassRetrying = false
            return
          }
          if (auth['scope.userLocation']) {
            this._compassRetrying = false
            this.startCompass(true)
            return
          }
          wx.authorize({
            scope: 'scope.userLocation',
            success: () => {
              this._compassRetrying = false
              this.startCompass(true)
            },
            fail: () => {
              this._compassRetrying = false
            }
          })
        },
        fail: () => {
          this._compassRetrying = false
        }
      })
    },

    stopCompass() {
      this._compassStarted = false
      this._compassLiveAt = 0
      try {
        if (typeof wx.offCompassChange === 'function' && this._onCompass) {
          wx.offCompassChange(this._onCompass)
        }
        if (typeof wx.stopCompass === 'function') {
          wx.stopCompass({ complete: () => {} })
        }
      } catch (e) {
        // ignore
      }
    },

    touchAngleFromEvent(e) {
      const t = (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0])
      if (!t || !this._center) return null
      return (Math.atan2(t.clientY - this._center.y, t.clientX - this._center.x) * 180) / Math.PI
    },

    cacheCenter(cb) {
      this.createSelectorQuery()
        .select('.plate')
        .boundingClientRect((rect) => {
          if (rect && rect.width) {
            this._center = {
              x: rect.left + rect.width / 2,
              y: rect.top + rect.height / 2
            }
          }
          if (cb) cb()
        })
        .exec()
    },

    onPlateTouchStart(e) {
      this._dragging = true
      this._lastTouchAngle = null
      const t = (e.touches && e.touches[0]) || null
      const x = t ? t.clientX : null
      const y = t ? t.clientY : null
      const boot = () => {
        if (!this._center || x == null) return
        this._lastTouchAngle = (Math.atan2(y - this._center.y, x - this._center.x) * 180) / Math.PI
      }
      if (this._center) boot()
      else this.cacheCenter(boot)
    },

    onPlateTouchMove(e) {
      if (!this._dragging) return
      if (!this._center) {
        this.cacheCenter()
        return
      }
      const ang = this.touchAngleFromEvent(e)
      if (ang == null) return
      if (this._lastTouchAngle == null) {
        this._lastTouchAngle = ang
        return
      }
      let delta = ang - this._lastTouchAngle
      if (delta > 180) delta -= 360
      if (delta < -180) delta += 360
      this._lastTouchAngle = ang
      this.setManualPlate(this._plateDeg + delta)
    },

    onPlateTouchEnd() {
      this._dragging = false
      this._lastTouchAngle = null
      if (this._hasSample) {
        this.applyHeadingFast(this._heading)
      } else {
        this.startSensors(true)
      }
    }
  }
})
