(function () {
  const app = document.getElementById('app')
  const nav = document.getElementById('navTitle')
  const navBack = document.getElementById('navBack')
  const shell = document.getElementById('shell')
  const state = {
    page: 'index',
    question: '',
    askMeta: null,
    selectedGroupKey: '',
    selectedOptionId: '',
    selectedTimeKey: '',
    askNext: 'cast',
    mode: 'shake',
    step: 0,
    yaos: [],
    current: null,
    shaking: false,
    displayCoins: ['', '', ''],
    cast: null,
    meihua: null,
    meihuaMode: 'number',
    meihuaA: '',
    meihuaB: '',
    meihuaRolling: false,
    user: null,
    account: null,
    accountNick: '',
    accountAvatar: '',
    accountConsent: false,
    accountEditing: false,
    accountPolicy: '',
    accountConfirm: '',
    compassHeading: 0,
    compassReady: false,
    plateDeg: -180,
    luckyOpen: false,
    luckyPack: null,
    topicKey: 'general',
    articleId: null,
    guaAlias: null,
    feedbackText: ''
  }
  const stack = [{ page: 'index', articleId: null, topicKey: 'general', guaAlias: null }]
  let touchStartX = 0
  let touchStartY = 0
  let touchStartT = 0

  function snapshot() {
    return {
      page: state.page,
      articleId: state.articleId,
      topicKey: state.topicKey,
      guaAlias: state.guaAlias
    }
  }
  function applySnap(snap) {
    state.page = snap.page
    state.articleId = snap.articleId
    state.topicKey = snap.topicKey || state.topicKey
    state.guaAlias = snap.guaAlias != null ? snap.guaAlias : state.guaAlias
  }
  function updateBackUi() {
    if (!navBack) return
    navBack.classList.toggle('show', stack.length > 1)
  }
  function setNav(t, hidden = false) {
    nav.textContent = t
    if (nav.parentElement) nav.parentElement.classList.toggle('home-hidden', hidden)
    updateBackUi()
  }
  function animatePage() {
    app.style.animation = 'none'
    void app.offsetWidth
    app.style.animation = ''
  }
  function scrollPageTop() {
    try {
      window.scrollTo(0, 0)
      document.documentElement.scrollTop = 0
      document.body.scrollTop = 0
      if (shell) shell.scrollTop = 0
      if (app) app.scrollTop = 0
    } catch (e) {
      // ignore
    }
  }
  function resetAskState() {
    state.selectedGroupKey = ''
    state.selectedOptionId = ''
    state.selectedTimeKey = ''
    state.question = ''
    state.askMeta = null
  }
  function go(page, extra = {}, opts = {}) {
    const replace = !!(opts && opts.replace)
    const enteringAsk = page === 'ask' && state.page !== 'ask'
    if (enteringAsk) resetAskState()
    Object.assign(state, extra, { page })
    if (replace) {
      stack[Math.max(stack.length - 1, 0)] = snapshot()
    } else {
      const top = stack[stack.length - 1]
      const same = top && top.page === state.page && top.articleId === state.articleId && top.guaAlias === state.guaAlias
      if (!same) {
        stack.push(snapshot())
      } else {
        stack[stack.length - 1] = snapshot()
      }
    }
    animatePage()
    render()
    scrollPageTop()
  }
  function back() {
    if (stack.length <= 1) return false
    stack.pop()
    applySnap(stack[stack.length - 1])
    if (state.page === 'ask') resetAskState()
    animatePage()
    render()
    scrollPageTop()
    return true
  }
  function goHomeFromNav() {
    stack.length = 0
    state.page = 'index'
    state.articleId = null
    state.guaAlias = null
    stack.push(snapshot())
    animatePage()
    render()
    scrollPageTop()
  }
  function render() {
    ({
      index: renderIndex,
      ask: renderAsk,
      cast: renderCast,
      result: renderResult,
      interpret: renderInterpret,
      meihua: renderMeihua,
      meihuaResult: renderMeihuaResult,
      account: renderAccount,
      history: renderHistory,
      learn: renderLearn,
      detail: renderDetail,
      guadian: renderGuadian,
      guadianDetail: renderGuadianDetail,
      feedback: renderFeedback
    })[state.page]()
    updateBackUi()
  }
  function corners() {
    return '<i class="corner tl"></i><i class="corner tr"></i><i class="corner bl"></i><i class="corner br"></i>'
  }
  function bindNav() {
    app.querySelectorAll('[data-go]').forEach((el) => {
      el.onclick = () => {
        if (el.hasAttribute('data-back')) { back(); return }
        go(el.dataset.go)
      }
    })
    app.querySelectorAll('[data-back]:not([data-go])').forEach((el) => {
      el.onclick = () => back()
    })
  }

  function polar(cx, cy, r, deg) {
    // 0deg = 屏顶；古图上南，故数据以正南为 0°、顺时针
    const rad = (deg - 90) * Math.PI / 180
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
  }

  function guaBarsSvg(lines, x, y, color) {
    const fill = color || '#140f0c'
    const order = [lines[2], lines[1], lines[0]]
    return order.map((yang, i) => {
      const yy = y - 12 + i * 8
      if (yang) return `<rect x="${x - 14}" y="${yy}" width="28" height="3.6" rx="0.4" fill="${fill}"/>`
      return `<rect x="${x - 14}" y="${yy}" width="10" height="3.6" rx="0.4" fill="${fill}"/><rect x="${x + 4}" y="${yy}" width="10" height="3.6" rx="0.4" fill="${fill}"/>`
    }).join('')
  }

  function buildLuopanSvg(plateDeg) {
    const cx = 200, cy = 200
    const rot = plateDeg == null ? -180 : plateDeg
    const bagua = [
      { n: '离', tip: '火', color: '#3a3028', lines: [1, 0, 1], deg: 0 },
      { n: '坤', tip: '地·土', color: '#3a3028', lines: [0, 0, 0], deg: 45 },
      { n: '兑', tip: '泽·金', color: '#3a3028', lines: [1, 1, 0], deg: 90 },
      { n: '乾', tip: '天·金', color: '#3a3028', lines: [1, 1, 1], deg: 135 },
      { n: '坎', tip: '水', color: '#3a3028', lines: [0, 1, 0], deg: 180 },
      { n: '艮', tip: '山·土', color: '#3a3028', lines: [0, 0, 1], deg: 225 },
      { n: '震', tip: '雷·木', color: '#3a3028', lines: [1, 0, 0], deg: 270 },
      { n: '巽', tip: '风·木', color: '#3a3028', lines: [0, 1, 1], deg: 315 }
    ]
    const wxColor = { 木: '#3a3028', 火: '#3a3028', 土: '#3a3028', 金: '#3a3028', 水: '#3a3028' }
    const mountains = ['子', '癸', '丑', '艮', '寅', '甲', '卯', '乙', '辰', '巽', '巳', '丙', '午', '丁', '未', '坤', '申', '庚', '酉', '辛', '戌', '乾', '亥', '壬']
    const dirs = [{ n: '南', deg: 0 }, { n: '西', deg: 90 }, { n: '北', deg: 180 }, { n: '东', deg: 270 }]
    const ticks = Array.from({ length: 72 }, (_, i) => {
      const deg = i * 5
      const major = deg % 30 === 0
      const mid = deg % 10 === 0 && !major
      const outer = polar(cx, cy, 196, deg)
      const inner = polar(cx, cy, major ? 184 : mid ? 188 : 191, deg)
      return `<line x1="${outer.x}" y1="${outer.y}" x2="${inner.x}" y2="${inner.y}" stroke="${major ? 'rgba(143,38,31,0.55)' : mid ? 'rgba(20,15,12,0.32)' : 'rgba(20,15,12,0.18)'}" stroke-width="${major ? 1.6 : 1}"/>`
    }).join('')
    const spokes = [22.5, 67.5, 112.5, 157.5, 202.5, 247.5, 292.5, 337.5].map((deg) => {
      const a = polar(cx, cy, 88, deg)
      const b = polar(cx, cy, 140, deg)
      return `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="rgba(20,15,12,0.12)" stroke-width="1"/>`
    }).join('')
    const degLabs = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((compass) => {
      const deg = (compass + 180) % 360
      const p = polar(cx, cy, 188, deg)
      return `<text x="${p.x}" y="${p.y + 3}" text-anchor="middle" transform="rotate(${deg} ${p.x} ${p.y})" fill="rgba(20,15,12,0.55)" font-size="9" font-weight="600">${compass}</text>`
    }).join('')
    const mountainTexts = mountains.map((name, i) => {
      const compass = i * 15
      const deg = (compass + 180) % 360
      const p = polar(cx, cy, 168, deg)
      const cardinal = name === '子' || name === '午' || name === '卯' || name === '酉'
      return `<text x="${p.x}" y="${p.y + 4}" text-anchor="middle" transform="rotate(${deg} ${p.x} ${p.y})" fill="${cardinal ? 'rgba(143,38,31,0.95)' : 'rgba(20,15,12,0.5)'}" font-size="${cardinal ? 13 : 10}" font-weight="${cardinal ? 700 : 500}">${name}</text>`
    }).join('')
    const dirTexts = dirs.map((d) => {
      const p = polar(cx, cy, 152, d.deg)
      return `<text x="${p.x}" y="${p.y + 4}" text-anchor="middle" transform="rotate(${d.deg} ${p.x} ${p.y})" fill="rgba(143,38,31,0.75)" font-size="10" font-weight="700">${d.n}</text>`
    }).join('')
    const guaFill = '#3a3028'
    const guaTexts = bagua.map((b) => {
      const p = polar(cx, cy, 112, b.deg)
      return `<g data-lucky-toggle="1" transform="translate(${p.x.toFixed(2)},${p.y.toFixed(2)}) rotate(${b.deg})" style="cursor:pointer">
        <circle cx="0" cy="8" r="28" fill="rgba(0,0,0,0)"/>
        ${guaBarsSvg(b.lines, 0, -10, guaFill)}
        <text x="0" y="14" text-anchor="middle" fill="${guaFill}" font-size="13" font-weight="700">${b.n}</text>
        <text x="0" y="26" text-anchor="middle" fill="${guaFill}" font-size="8" font-weight="600">${b.tip}</text>
      </g>`
    }).join('')
    const luckyMarks = (state.luckyOpen && state.luckyPack && state.luckyPack.marks || []).map((m) => {
      const rim = polar(cx, cy, 200, m.plateDeg)
      const tick = polar(cx, cy, 210, m.plateDeg)
      const label = polar(cx, cy, 232, m.plateDeg)
      return `<g class="lucky-mark" pointer-events="none">
        <line x1="${rim.x.toFixed(1)}" y1="${rim.y.toFixed(1)}" x2="${tick.x.toFixed(1)}" y2="${tick.y.toFixed(1)}" stroke="#a03328" stroke-width="1.8"/>
        <g transform="translate(${label.x.toFixed(1)},${label.y.toFixed(1)}) rotate(${m.plateDeg})">
          <text x="0" y="-8" text-anchor="middle" fill="#a03328" font-size="16" font-weight="700">${m.label}</text>
          <text x="0" y="10" text-anchor="middle" fill="#a03328" font-size="13">${m.dir}</text>
        </g>
      </g>`
    }).join('')
    const wuxing = ['木', '火', '土', '金', '水']
    const wxRow = wuxing.map((w, i) => {
      const x = 56 + i * 72
      return `<rect x="${x - 22}" y="414" width="44" height="26" fill="rgba(250,243,228,0.35)" stroke="rgba(20,15,12,0.14)" stroke-width="0.8"/>
        <text x="${x}" y="432" text-anchor="middle" fill="${wxColor[w]}" font-size="12" font-weight="700">${w}</text>`
    }).join('')

    return `
      <svg viewBox="-40 -48 480 498" overflow="visible" xmlns="http://www.w3.org/2000/svg" aria-label="后天八卦罗盘 · 准星指南针">
        <defs></defs>
        <g id="luopan-plate" transform="rotate(${rot} 200 200)">
          <circle cx="200" cy="200" r="198" fill="#e6d4b0" stroke="#46341c" stroke-width="3"/>
          <circle cx="200" cy="200" r="191" fill="none" stroke="rgba(248,240,222,0.55)" stroke-width="5"/>
          <circle cx="200" cy="200" r="186" fill="none" stroke="rgba(90,70,40,0.22)" stroke-width="1.2"/>
          <circle cx="200" cy="200" r="178" fill="none" stroke="rgba(20,15,12,0.14)" stroke-width="1"/>
          <circle cx="200" cy="200" r="158" fill="none" stroke="rgba(143,38,31,0.2)" stroke-width="1"/>
          <circle cx="200" cy="200" r="108" fill="none" stroke="rgba(20,15,12,0.1)" stroke-width="1"/>
          <circle cx="200" cy="200" r="92" fill="none" stroke="rgba(143,38,31,0.14)" stroke-width="1"/>
          ${ticks}
          ${spokes}
          ${degLabs}
          ${dirTexts}
          ${mountainTexts}
          ${guaTexts}
          ${luckyMarks}
        </g>
        <!-- 固定准星 -->
        <g pointer-events="none">
        <line x1="200" y1="8" x2="200" y2="392" stroke="rgba(160,51,40,0.7)" stroke-width="1.5"/>
        <line x1="40" y1="200" x2="360" y2="200" stroke="rgba(160,51,40,0.35)" stroke-width="1"/>
        <polygon points="200,4 206,16 194,16" fill="#a03328"/>
        <circle cx="200" cy="200" r="4" fill="#a03328" stroke="#faf3e4" stroke-width="1.5"/>
        </g>
        <circle cx="200" cy="200" r="46" fill="#f0e4c8" stroke="rgba(20,15,12,0.16)" stroke-width="1"/>
        <circle cx="200" cy="200" r="46" fill="none" stroke="rgba(143,38,31,0.1)" stroke-width="3"/>
        <circle cx="200" cy="200" r="34" fill="#f6eedc" stroke="rgba(20,15,12,0.42)" stroke-width="1.5"/>
        <g pointer-events="none">
          <animateTransform attributeName="transform" type="rotate" from="0 200 200" to="360 200 200" dur="56s" repeatCount="indefinite"/>
          <path d="M200 166 A34 34 0 0 1 200 234 A17 17 0 0 1 200 200 A17 17 0 0 0 200 166" fill="#140f0c"/>
          <circle cx="200" cy="183" r="17" fill="#140f0c"/>
          <circle cx="200" cy="217" r="17" fill="#f6eedc"/>
          <circle cx="200" cy="183" r="5" fill="#f6eedc"/>
          <circle cx="200" cy="217" r="5" fill="#140f0c"/>
        </g>
        <circle data-lucky-toggle="1" cx="200" cy="200" r="46" fill="rgba(0,0,0,0)" style="cursor:pointer"/>
        ${wxRow}
      </svg>`
  }

  const MOUNTAIN_NAMES = ['子', '癸', '丑', '艮', '寅', '甲', '卯', '乙', '辰', '巽', '巳', '丙', '午', '丁', '未', '坤', '申', '庚', '酉', '辛', '戌', '乾', '亥', '壬']

  function dirNameOf(deg) {
    const d = ((deg % 360) + 360) % 360
    const names = ['北', '东北', '东', '东南', '南', '西南', '西', '西北']
    return names[Math.round(d / 45) % 8]
  }
  function mountainOf(deg) {
    const d = ((deg % 360) + 360) % 360
    return MOUNTAIN_NAMES[Math.round(d / 15) % 24]
  }
  function headingFromPlate(plateDeg) {
    return (((-plateDeg - 180) % 360) + 360) % 360
  }

  function plateFromHeading(heading) {
    return -heading - 180
  }

  function normalizePlate(deg) {
    let n = deg % 360
    if (n > 180) n -= 360
    if (n <= -180) n += 360
    return n
  }

  function paintLuopanLive() {
    if (state.page !== 'index') return
    const plate = document.getElementById('luopan-plate')
    const hudDir = document.getElementById('hud-dir')
    const hudDeg = document.getElementById('hud-deg')
    const hudMountain = document.getElementById('hud-mountain')
    const h = state.compassReady
      ? state.compassHeading
      : headingFromPlate(state.plateDeg)
    if (plate) plate.setAttribute('transform', `rotate(${state.plateDeg} 200 200)`)
    if (hudDir) hudDir.textContent = dirNameOf(h)
    if (hudDeg) hudDeg.textContent = `${(Math.round(h * 10) / 10)}°`
    if (hudMountain) hudMountain.textContent = `${mountainOf(h)}山`
  }

  function applyLiveHeading(heading) {
    if (state._dragging) return
    const h = ((Number(heading) % 360) + 360) % 360
    state.compassHeading = h
    state.compassReady = true
    state.plateDeg = plateFromHeading(h)
    paintLuopanLive()
  }

  function bindLuopanInteractions() {
    const wrap = document.getElementById('luopan-wrap')
    if (!wrap) return
    const centerOf = () => compassCenter(wrap)
    const angleAt = (clientX, clientY, c) =>
      (Math.atan2(clientY - c.y, clientX - c.x) * 180) / Math.PI

    wrap.onmousedown = (e) => {
      if (isLuckyHit(e.target)) return
      e.preventDefault()
      state._didDrag = false
      state._dragging = true
      state._lastDragAng = angleAt(e.clientX, e.clientY, centerOf())
    }
    wrap.onclick = (e) => {
      if (state._didDrag) {
        state._didDrag = false
        return
      }
      if (isLuckyHit(e.target)) {
        e.preventDefault()
        e.stopPropagation()
        toggleLucky()
      }
    }
    wrap.ontouchstart = (e) => {
      const t = e.touches[0]
      if (!t) return
      state._didDrag = false
      if (isLuckyHit(e.target)) {
        state._luckyTap = true
        return
      }
      state._luckyTap = false
      state._dragging = true
      state._lastDragAng = angleAt(t.clientX, t.clientY, centerOf())
    }
    wrap.ontouchmove = (e) => {
      const t = e.touches[0]
      if (!t || !state._dragging) return
      dragMove(t.clientX, t.clientY, centerOf)
    }
    wrap.ontouchend = () => {
      if (state._luckyTap) {
        state._luckyTap = false
        if (!state._didDrag) toggleLucky()
        return
      }
      dragEnd()
    }
    wrap.ontouchcancel = () => dragEnd()
  }

  function compassCenter(wrap) {
    const svg = wrap.querySelector('svg')
    const box = (svg || wrap).getBoundingClientRect()
    const vb = svg && svg.viewBox && svg.viewBox.baseVal
    if (!vb || !vb.width) {
      return { x: box.left + box.width / 2, y: box.top + box.width / 2 }
    }
    const scale = box.width / vb.width
    return {
      x: box.left + (200 - vb.x) * scale,
      y: box.top + (200 - vb.y) * scale
    }
  }

  function isLuckyHit(target) {
    if (!target || !target.closest) return false
    return !!target.closest('[data-lucky-toggle]')
  }

  function toggleLucky() {
    const now = Date.now()
    if (toggleLucky._at && now - toggleLucky._at < 400) return
    toggleLucky._at = now
    state.luckyOpen = !state.luckyOpen
    if (state.luckyOpen && window.LiuYao && window.LiuYao.buildLuckyDirections) {
      state.luckyPack = window.LiuYao.buildLuckyDirections(new Date())
    } else {
      state.luckyPack = null
    }
    render()
  }

  function dragMove(clientX, clientY, centerOf) {
    if (!state._dragging || state._lastDragAng == null) return
    const ang = (Math.atan2(clientY - centerOf().y, clientX - centerOf().x) * 180) / Math.PI
    let delta = ang - state._lastDragAng
    if (delta > 180) delta -= 360
    if (delta < -180) delta += 360
    state._lastDragAng = ang
    state._didDrag = true
    state.plateDeg = normalizePlate(state.plateDeg + delta)
    state.compassHeading = headingFromPlate(state.plateDeg)
    state._dragHint = '拖动转盘中'
    paintLuopanLive()
  }

  function dragEnd() {
    if (!state._dragging) return
    state._dragging = false
    state._lastDragAng = null
    if (state.compassReady) applyLiveHeading(state.compassHeading)
    else {
      state._dragHint = '拖动转盘调整方位'
      paintLuopanLive()
    }
  }

  // 窗口级拖动只绑一次，避免 render 叠加监听
  if (!window.__liuyaoDragBound) {
    window.__liuyaoDragBound = true
    window.addEventListener('mousemove', (e) => {
      if (!state._dragging) return
      const wrap = document.getElementById('luopan-wrap')
      if (!wrap) return
      dragMove(e.clientX, e.clientY, () => compassCenter(wrap))
    })
    window.addEventListener('mouseup', dragEnd)
  }

  function renderIndex() {
    setNav('', true)
    const accountLabel = state.user && state.user.nickName ? state.user.nickName : '登录'
    if (state.compassReady) state.plateDeg = plateFromHeading(state.compassHeading)
    const h = state.compassReady ? state.compassHeading : headingFromPlate(state.plateDeg)
    const luckyHint = state.luckyOpen && state.luckyPack
      ? `今日${state.luckyPack.dayText} · ${state.luckyPack.summary}`
      : '点中间八卦 · 看今日吉位'
    app.innerHTML = `
      <div class="hero quiet">
        <div class="home-brand" aria-label="周易"><img src="./assets/images/brand-zhouyi.svg" alt="周易" /></div>
        <div class="home-brand-sub">
          <span>敬卜以问道</span><i>·</i><span>观变以知几</span><i>·</i><span>明理而不惑</span>
        </div>
      </div>
      <div class="luopan-controls">
        <div class="luopan-hud" id="luopan-hud">
          <div class="hud-main"><span id="hud-dir">${dirNameOf(h)}</span><span id="hud-deg">${(Math.round(h * 10) / 10)}°</span></div>
          <div class="hud-sub"><span id="hud-mountain">${mountainOf(h)}山</span></div>
          <div class="lucky-hint ${state.luckyOpen ? 'on' : ''}" id="lucky-hint">${luckyHint}</div>
        </div>
      </div>
      <div class="luopan-wrap slim" id="luopan-wrap">
        ${buildLuopanSvg(state.plateDeg)}
      </div>
      <div class="actions">
        <span class="act" data-go="learn">研习典要</span>
        <span class="act" id="goAskCast">六爻卜卦</span>
        <span class="act" id="goAskMeihua">梅花易数</span>
      </div>
      <div class="link-row soft">
        <span class="text-link" data-go="account">${accountLabel}</span>
        <span class="dot">·</span>
        <span class="text-link" data-go="history">历史卦例</span>
        <span class="dot">·</span>
        <span class="text-link feedback-cell">
          <span>问题留言</span>
          <button type="button" class="feedback-link" data-go="feedback" aria-label="问题留言"></button>
        </span>
      </div>`
    bindNav()
    bindLuopanInteractions()
    const goAskCast = document.getElementById('goAskCast')
    const goAskMeihua = document.getElementById('goAskMeihua')
    if (goAskCast) goAskCast.onclick = () => { state.askNext = 'cast'; go('ask') }
    if (goAskMeihua) goAskMeihua.onclick = () => { state.askNext = 'meihua'; go('ask') }
  }

  function pushYao(result) {
    state.yaos = state.yaos.concat([result])
    state.step = state.yaos.length
    state.current = result
    state.shaking = false
    state.displayCoins = result.coins
    render()
  }

  function beads() {
    return `<div class="progress">${[0,1,2,3,4,5].map((i) => `<i class="bead ${i < state.step ? 'on' : ''}"></i>`).join('')}</div>`
  }

  function miniGua() {
    const lines = []
    for (let i = 5; i >= 0; i -= 1) {
      const y = state.yaos[i]
      if (!y) lines.push('<div class="mini-yao"></div>')
      else lines.push(`<div class="mini-yao filled ${y.yinYang ? 'yang' : 'yin'} ${y.changing ? 'moving' : ''}"></div>`)
    }
    return `<div class="gua-side"><div class="gua-lab">卦象</div><div class="gua-lines">${lines.join('')}</div></div>`
  }

  function syncAskSelection() {
    if (!state.selectedOptionId || !window.LiuYao.buildAskSelection) {
      state.question = ''
      state.askMeta = null
      return
    }
    const sel = window.LiuYao.buildAskSelection(state.selectedOptionId, state.selectedTimeKey || '')
    if (!sel) {
      state.question = ''
      state.askMeta = null
      return
    }
    state.question = sel.question
    state.askMeta = sel.askMeta
  }

  function ensureAskSelected() {
    if (state.selectedOptionId && state.askMeta) return true
    alert('请先选择所问')
    return false
  }

  function askPickerHtml(emptyHint) {
    const scopes = window.LiuYao.TIME_SCOPES || []
    const groups = window.LiuYao.listGroups ? window.LiuYao.listGroups() : []
    if (!state.selectedGroupKey && state.selectedOptionId) {
      const matched = groups.find((g) => g.options.some((o) => o.id === state.selectedOptionId))
      if (matched) state.selectedGroupKey = matched.key
    }
    const selectedGroup = groups.find((g) => g.key === state.selectedGroupKey)
    if (!selectedGroup) {
      return `
        <div class="ask-picker">
          <div class="field-label">先选类别</div>
          <div class="ask-category-grid">${groups.map((g) => `
            <button type="button" class="ask-category" data-group="${g.key}">
              <span class="ask-category-name">${g.label}</span>
              ${g.tip ? `<span class="ask-category-tip">${g.tip}</span>` : ''}
            </button>`).join('')}</div>
        </div>`
    }
    const timeHtml = scopes.map((t) =>
      `<button type="button" class="ask-chip ${state.selectedTimeKey === t.key ? 'on' : ''}" data-time="${t.key}">${t.label}</button>`
    ).join('')
    return `
      <div class="ask-picker">
        <div class="ask-category-head">
          <div>
            <div class="field-label">当前类别</div>
            <div class="ask-current-category">${selectedGroup.label}</div>
          </div>
          <button type="button" class="change-link ask-change-category" data-change-group>更换类别</button>
        </div>
        ${selectedGroup.tip ? `<div class="ask-group-tip muted">${selectedGroup.tip}</div>` : ''}
        <div class="field-label" style="margin-top:16px">选择具体事项</div>
        <div class="ask-option-list">${selectedGroup.options.map((o) =>
          `<button type="button" class="ask-option ${o.wide ? 'wide' : ''} ${state.selectedOptionId === o.id ? 'on' : ''}" data-opt="${o.id}">${o.label}</button>`
        ).join('')}</div>
        <div class="field-label" style="margin-top:18px">时间范围</div>
        <div class="chip-wrap">${timeHtml}</div>
        <div class="ask-hint muted">${state.question || emptyHint}</div>
      </div>`
  }

  function bindAskPicker() {
    app.querySelectorAll('[data-group]').forEach((el) => {
      el.onclick = () => {
        state.selectedGroupKey = el.dataset.group || ''
        state.selectedOptionId = ''
        syncAskSelection()
        render()
      }
    })
    const changeGroup = app.querySelector('[data-change-group]')
    if (changeGroup) {
      changeGroup.onclick = () => {
        state.selectedGroupKey = ''
        state.selectedOptionId = ''
        syncAskSelection()
        render()
      }
    }
    app.querySelectorAll('[data-time]').forEach((el) => {
      el.onclick = () => {
        state.selectedTimeKey = el.dataset.time || ''
        syncAskSelection()
        render()
      }
    })
    app.querySelectorAll('[data-opt]').forEach((el) => {
      el.onclick = () => {
        state.selectedOptionId = el.dataset.opt || ''
        syncAskSelection()
        render()
      }
    })
  }

  function requirePendingAsk(next) {
    if (state.selectedOptionId && state.askMeta && state.question) return true
    state.askNext = next || 'cast'
    go('ask', {}, { replace: true })
    return false
  }

  function renderAsk() {
    setNav('选择所问')
    const next = state.askNext === 'meihua' ? 'meihua' : 'cast'
    const nextLabel = next === 'meihua' ? '梅花起卦' : '六爻卜卦'
    const confirmLabel = '去卜卦'
    const canConfirm = !!(state.selectedOptionId && state.question)
    app.innerHTML = `
      <div class="title-zh ask-title-center">所问</div>
      <div class="ask-before-note">
        <div>占贵诚敬，一事一问；毋以戏筮，毋再三渎问。</div>
        <div>澄心定念，明所求而后起卦。</div>
      </div>
      ${askPickerHtml('请点选一项')}
      <button class="btn btn-primary" id="askConfirm" ${canConfirm ? '' : 'disabled'}>${canConfirm ? confirmLabel : '选择所问'}</button>
      <button class="btn btn-ghost" data-back style="margin-top:12px">返回</button>`
    bindNav()
    bindAskPicker()
    const confirm = document.getElementById('askConfirm')
    if (confirm) confirm.onclick = () => {
      if (!ensureAskSelected()) return
      state.askNext = next
      if (next === 'meihua') {
        go('meihua')
      } else {
        state.step = 0; state.yaos = []; state.current = null
        state.displayCoins = ['', '', '']
        go('cast')
      }
    }
  }

  function renderCast() {
    setNav('卜卦')
    if (!requirePendingAsk('cast')) return

    const stageBody = state.mode === 'shake' ? `
      <div class="stage-live">
        <div class="coin-stage">
          <div class="coins ${state.shaking ? 'shake' : ''}">
            ${[0,1,2].map((i) => {
              const c = (state.displayCoins && state.displayCoins[i]) || null
              const face = c ? (c === 'yang' ? 'yang' : 'yin') : 'yang idle'
              return `<div class="coin ${face}">
                <i class="coin-shadow"></i>
                <div class="coin-body">
                  <img class="coin-face coin-obverse" src="${window.__COIN_YANG || './assets/coins/qianlong-yang.jpg'}" alt="字阳" />
                  <img class="coin-face coin-reverse" src="${window.__COIN_YIN || './assets/coins/qianlong-yin.jpg'}" alt="背阴" />
                </div>
              </div>`
            }).join('')}
          </div>
          <div class="result-line">${state.current
            ? `<i class="yao-bar lg ${state.current.yinYang ? 'yang' : 'yin'} ${state.current.changing ? 'moving' : ''}"></i>
               <div class="yao-label">${state.current.type}<span class="mark"> ${state.current.mark}</span></div>`
            : '<span class="muted" style="font-size:14px;letter-spacing:.14em">静心片刻，然后摇卦</span>'}</div>
          <button class="btn btn-primary" id="shake" ${state.shaking || state.step >= 6 ? 'disabled' : ''}>${state.step >= 6 ? '六爻已成' : state.shaking ? '摇卦中…' : '摇铜钱'}</button>
        </div>
        ${miniGua()}
      </div>` : `
      <div class="muted center" style="margin-bottom:10px">按实摇结果点选（字阳背阴）</div>
      <div class="manual-grid">
        <div class="manual-item" data-manual="laoYang"><i class="yao-bar yang moving"></i><span>老阳 ○</span></div>
        <div class="manual-item" data-manual="shaoYin"><i class="yao-bar yin"></i><span>少阴 --</span></div>
        <div class="manual-item" data-manual="shaoYang"><i class="yao-bar yang"></i><span>少阳 —</span></div>
        <div class="manual-item" data-manual="laoYin"><i class="yao-bar yin moving"></i><span>老阴 ×</span></div>
      </div>
      <div style="margin-top:16px">${miniGua()}</div>`

    app.innerHTML = `
      <div class="title-zh">卜卦</div>
      <div class="subtitle">六次成爻 · 自下而上</div>
      <div class="mode-row">
        <div class="mode ${state.mode === 'shake' ? 'on' : ''}" id="modeShake">摇铜钱</div>
        <div class="mode ${state.mode === 'manual' ? 'on' : ''}" id="modeManual">手记爻象</div>
      </div>
      <div class="frame">
        ${corners()}
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
          <span class="seal">第 ${Math.min(state.step + 1, 6)} 爻</span>
          <span class="muted">${state.step} / 6</span>
        </div>
        ${beads()}
        ${stageBody}
      </div>
      ${state.step >= 6
        ? `<div class="row"><button class="btn btn-ghost" id="reset">重摇</button><button class="btn btn-primary" id="submit">排卦</button></div>`
        : `<button class="btn btn-ghost" data-back>返回</button>`}`
    bindNav()
    const changeAsk = document.getElementById('changeAsk')
    if (changeAsk) changeAsk.onclick = () => { state.askNext = 'cast'; go('ask') }
    document.getElementById('modeShake').onclick = () => {
      state.mode = 'shake'; state.step = 0; state.yaos = []; state.current = null
      state.displayCoins = ['', '', '']; render()
    }
    document.getElementById('modeManual').onclick = () => {
      state.mode = 'manual'; state.step = 0; state.yaos = []; state.current = null
      state.displayCoins = ['', '', '']; render()
    }
    const shake = document.getElementById('shake')
    if (shake) shake.onclick = () => {
      if (state.shaking || state.step >= 6) return
      if (!ensureAskSelected()) { state.askNext = 'cast'; go('ask'); return }
      const result = window.LiuYao.tossThreeCoins()
      state.shaking = true
      state.current = null
      state.displayCoins = result.coins
      render()
      setTimeout(() => pushYao(result), 1600)
    }
    app.querySelectorAll('[data-manual]').forEach((el) => {
      el.onclick = () => {
        if (state.step >= 6) return
        if (!ensureAskSelected()) { state.askNext = 'cast'; go('ask'); return }
        pushYao(window.LiuYao.manualYao(el.dataset.manual))
      }
    })
    const reset = document.getElementById('reset')
    if (reset) reset.onclick = () => {
      state.step = 0; state.yaos = []; state.current = null
      state.displayCoins = ['', '', '']; render()
    }
    const submit = document.getElementById('submit')
    if (submit) submit.onclick = () => {
      if (!ensureAskSelected()) { state.askNext = 'cast'; go('ask'); return }
      state.cast = window.LiuYao.arrangeCast(state.yaos, {
        question: state.question.trim(),
        askMeta: state.askMeta
      })
      state._topicTouched = false
      state._topicAuto = false
      go('result')
    }
  }

  function renderResult() {
    setNav('排盘')
    const cast = state.cast
    if (!cast) { go('ask', {}, { replace: true }); return }
    const paired = (cast.ben.yaos || []).map((ben, i) => ({
      ben,
      bian: cast.bian && cast.bian.yaos ? cast.bian.yaos[i] : null
    }))
    const rows = paired.map(({ ben, bian }) => `
      <div class="table-row ${ben.changing ? 'moving' : ''} ${ben.kong ? 'kong' : ''}">
        <span>${ben.liushen}</span>
        <span>${ben.liuqin}</span>
        <span class="c-yao-cell"><i class="yao-bar sm ${ben.yinYang ? 'yang' : 'yin'}"></i><span class="yao-mark">${ben.mark || ''}</span></span>
        <span style="color:var(--cinnabar);font-weight:600">${ben.role || ''}</span>
        <span>${ben.ganZhi}${ben.wuxing}</span>
        <span class="c-byao-cell">${bian ? `<i class="yao-bar sm ${bian.yinYang ? 'yang' : 'yin'}"></i>` : '—'}</span>
        <span>${bian ? `${bian.liuqin}${bian.role || ''}` : ''}</span>
      </div>`).join('')
    const tags = cast.ben.yaos.map((y) => y.tagText).filter(Boolean)
    const fushen = cast.fushenMap ? Object.keys(cast.fushenMap).map((k) => cast.fushenMap[k]) : []
    const rel = []
    if (cast.relations) {
      ;(cast.relations.links || []).slice(0, 8).forEach((l) => rel.push(l.text))
      ;(cast.relations.sanhe || []).forEach((s) => rel.push(s.name))
      ;(cast.relations.dayLinks || []).forEach((d) => rel.push(d.text))
    }
    const changes = (cast.ben.yaos || []).filter((y) => y.changing && y.changeTo)
      .map((y) => `${y.name}${y.liuqin} → ${y.changeTo.text}`)

    app.innerHTML = `
      <div class="head">
        <div class="gua-name">${cast.ben.name}</div>
        <div class="muted">${cast.ben.upper.symbol}${cast.ben.upper.name}${cast.ben.upper.nature}／${cast.ben.lower.symbol}${cast.ben.lower.name}${cast.ben.lower.nature} · ${cast.ben.palaceName}宫</div>
        <div class="ornament">${cast.calendar ? `${cast.calendar.year.text} · ${cast.calendar.month.text} · ${cast.calendar.day.text} · 空${cast.calendar.kongwang.text}` : ''}</div>
        <div class="muted">动爻 ${cast.changingIndexes.length || '无'}</div>
      </div>
      <div class="pan-board">
        <div class="pan-heads">
          <div class="ph"><span class="ph-lab">本卦</span><span class="ph-name">${cast.ben.name}</span></div>
          <div class="ph"><span class="ph-lab">变卦</span><span class="ph-name">${cast.bian ? cast.bian.name : '无动'}</span></div>
        </div>
        <div class="table-head">
          <span>神</span><span>亲</span><span>本爻</span><span>位</span><span>支</span><span>变爻</span><span>亲</span>
        </div>
        ${rows}
      </div>
      <div class="row" style="margin:12px 0 8px"><button class="btn btn-ghost" id="recast">再起</button><button class="btn btn-primary" data-go="interpret">断卦</button></div>
      ${tags.length ? `<div class="chip-row" style="margin-bottom:10px">${[...new Set(tags)].slice(0, 8).map((t) => `<span class="chip ${/空|死|囚|日冲/.test(t) ? 'hot' : ''}">${t}</span>`).join('')}</div>` : ''}
      ${fushen.length ? `<div class="block"><div class="block-title">伏神</div>${fushen.map((f) => `<div class="muted">· ${f.text}</div>`).join('')}</div>` : ''}
      ${rel.length ? `<div class="block"><div class="block-title">动爻关系</div><div class="chip-row">${rel.map((t) => `<span class="chip">${t}</span>`).join('')}</div></div>` : ''}
      ${changes.length ? `<div class="block"><div class="block-title">动化</div>${changes.map((t) => `<div class="muted" style="color:var(--cinnabar)">· ${t}</div>`).join('')}</div>` : ''}
      ${(() => {
        const guide = cast.guide && cast.guide.length
          ? cast.guide
          : (window.LiuYao.buildPaipanGuide ? window.LiuYao.buildPaipanGuide(cast) : [])
        if (!guide.length) return ''
        return `<div class="guide">
          <div class="guide-head">
            <div class="guide-title">本卦象辞解读</div>
            <div class="muted" style="margin-top:6px">取象释名与盘面说明；动爻优先，再参世应纳甲。</div>
          </div>
          ${guide.map((sec) => `
            <div class="guide-sec">
              <div class="guide-sec-title">${sec.title}</div>
              ${sec.items.map((line) => `<div class="guide-item">${line}</div>`).join('')}
            </div>`).join('')}
        </div>`
      })()}`
    bindNav()
    document.getElementById('recast').onclick = () => {
      state.step = 0; state.yaos = []; state.current = null
      state.displayCoins = ['', '', '']
      state.askNext = 'cast'
      go('ask')
    }
  }

  function renderInterpret() {
    setNav('断卦')
    if (!state.cast) { go('ask', {}, { replace: true }); return }
    state.topicKey = (state.cast.askMeta && state.cast.askMeta.topicKey) || 'general'
    const result = window.LiuYao.interpret(state.cast, state.topicKey)
    const sections = (result.sections || []).map((sec, idx) => `
      <div class="sec">
        <div class="sec-head"><span class="sec-no">${idx + 1}</span><span class="sec-title">${sec.title.replace(/^[一二三四五六七]、/, '')}</span></div>
        ${sec.items.map((it) => `<div class="point">${it}</div>`).join('')}
      </div>`).join('')
    app.innerHTML = `
      <div class="title-zh">断卦</div>
      <div class="subtitle">先看判断，再看分步依据</div>
      <div class="verdict ${result.tendency ? result.tendency.tone : ''}">
        ${corners()}
        <div class="summary">判断：${result.summary}</div>
        ${result.reply ? `<div class="reply">${result.reply}</div>` : ''}
        <div class="judgment">${result.summaryNote || ''}</div>
        ${result.advice ? `<div class="advice">${result.advice}</div>` : ''}
      </div>
      <div class="frame">${corners()}${sections}</div>
      <div class="row" style="margin:12px 0 8px">
        <button class="btn btn-ghost" data-back>返回排盘</button>
        <button class="btn btn-primary" data-go="index">返回首页</button>
      </div>`
    bindNav()
  }

  function formatMeihuaNow() {
    const d = new Date()
    const pad = (n) => (n < 10 ? '0' + n : '' + n)
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  function renderMeihua() {
    setNav('梅花易数')
    if (!requirePendingAsk('meihua')) return
    const mode = state.meihuaMode || 'number'
    const stage = mode === 'number' ? `
      <div class="hint muted">静心片刻，随口报两个正整数：先上卦、后下卦。两数不是算出来的，宜诚敬一念，报后勿改。</div>
      <div class="num-row">
        <div class="num-field">
          <div class="field-label">上卦数</div>
          <input id="mhA" type="number" placeholder="如 5" value="${String(state.meihuaA || '').replace(/"/g, '&quot;')}" />
        </div>
        <div class="num-field">
          <div class="field-label">下卦数</div>
          <input id="mhB" type="number" placeholder="如 7" value="${String(state.meihuaB || '').replace(/"/g, '&quot;')}" />
        </div>
      </div>
      <div class="tip muted">先天：乾1兑2离3震4巽5坎6艮7坤8；两数之和取动爻。</div>
      <button class="btn btn-primary" id="mhSubmit">起卦</button>
      <div class="howto">
        <div class="howto-title">数一般如何取</div>
        <div class="howto-item">触目成数：眼前人、车、字数、楼层等随手所见</div>
        <div class="howto-item">闻声成数：鸟叫几声、敲门几下、旁人报出的数字</div>
        <div class="howto-item">时间成数：此刻时、分，或手表上跳入眼帘的数</div>
        <div class="howto-item">心念成数：静心时脑海中自然浮现的两数</div>
      </div>` : mode === 'time' ? `
      <div class="hint muted">以此时此刻的农历年支、农历月日、时支起卦。宜诚敬一念，一事一问。</div>
      <div class="time-card">
        <div class="time-lab">此刻</div>
        <div class="time-val">${formatMeihuaNow()}</div>
      </div>
      <div class="tip muted">上卦＝农历年支数＋农历月＋农历日；下卦再加时支数；总数取动爻。</div>
      <button class="btn btn-primary" id="mhSubmit">按此刻起卦</button>` : `
      <div class="hint muted">随机得两数起卦，便于练习体用；正式决疑仍宜报数或时间。</div>
      <button class="btn btn-primary" id="mhSubmit">${state.meihuaRolling ? '起卦中…' : '随机起卦'}</button>`

    app.innerHTML = `
      <div class="title-zh">梅花</div>
      <div class="subtitle">体用生克 · 本互变</div>
      <div class="mode-row">
        <div class="mode ${mode === 'number' ? 'on' : ''}" data-mh-mode="number">报数</div>
        <div class="mode ${mode === 'time' ? 'on' : ''}" data-mh-mode="time">时间</div>
        <div class="mode ${mode === 'random' ? 'on' : ''}" data-mh-mode="random">随机</div>
      </div>
      <div class="frame">
        ${corners()}
        <span class="seal">梅花易数</span>
        ${stage}
      </div>
      <div class="muted center" style="margin-top:14px;font-size:14px;letter-spacing:.12em">教学演示 · 与六爻铜钱法对照学习</div>
      <button class="btn btn-ghost" data-back style="margin-top:12px">返回</button>`
    bindNav()
    const changeAsk = document.getElementById('changeAsk')
    if (changeAsk) changeAsk.onclick = () => { state.askNext = 'meihua'; go('ask') }
    const a = document.getElementById('mhA')
    const b = document.getElementById('mhB')
    if (a) a.oninput = (e) => { state.meihuaA = e.target.value }
    if (b) b.oninput = (e) => { state.meihuaB = e.target.value }
    app.querySelectorAll('[data-mh-mode]').forEach((el) => {
      el.onclick = () => { state.meihuaMode = el.dataset.mhMode; render() }
    })
    const submit = document.getElementById('mhSubmit')
    if (!submit) return
    submit.onclick = () => {
      if (!ensureAskSelected()) { state.askNext = 'meihua'; go('ask'); return }
      const question = (state.question || '').trim()
      const askMeta = state.askMeta
      try {
        if (mode === 'number') {
          if (!String(state.meihuaA || '').trim() || !String(state.meihuaB || '').trim()) {
            alert('请填写两个正整数'); return
          }
          state.meihua = window.LiuYao.castByNumbers(state.meihuaA, state.meihuaB, { question, askMeta })
          go('meihuaResult')
        } else if (mode === 'time') {
          state.meihua = window.LiuYao.castByTime({ question, askMeta })
          go('meihuaResult')
        } else {
          if (state.meihuaRolling) return
          state.meihuaRolling = true
          render()
          setTimeout(() => {
            state.meihua = window.LiuYao.castByRandom({ question, askMeta })
            state.meihuaRolling = false
            go('meihuaResult')
          }, 480)
        }
      } catch (e) {
        alert((e && e.message) || '起卦失败')
      }
    }
  }

  function renderMeihuaResult() {
    setNav('梅花排盘')
    const cast = state.meihua
    if (!cast) { go('ask', {}, { replace: true }); return }
    const tiIsUpper = cast.tiYong.tiSide.indexOf('外') >= 0
    const labels = ['初', '二', '三', '四', '五', '上']
    const yaoRows = []
    for (let i = 5; i >= 0; i -= 1) {
      const pos = i + 1
      const isUpper = pos > 3
      const role = (isUpper && tiIsUpper) || (!isUpper && !tiIsUpper) ? '体' : '用'
      yaoRows.push({
        name: labels[i] + '爻',
        yang: !!cast.ben.lines[i],
        dong: pos === cast.dongYao,
        tag: pos === cast.dongYao ? '动·' + role : role
      })
    }
    const guide = cast.guide || []
    app.innerHTML = `
      <div class="head">
        <div class="gua-name">${cast.ben.name}</div>
        <div class="muted">${cast.ben.text}</div>
        <div class="ornament">${cast.methodLabel} · 动${cast.dongLabel}</div>
      </div>
      <div class="verdict ${cast.verdict.tone || ''}">
        ${corners()}
        <div class="summary">判断：${cast.summary}</div>
        ${cast.reply ? `<div class="reply">${cast.reply}</div>` : ''}
        <div class="judgment">${cast.judgment || cast.verdict.note || ''}</div>
        ${cast.advice ? `<div class="advice">${cast.advice}</div>` : ''}
      </div>
      <div class="tri-board">
        <div class="tri-col">
          <div class="tri-lab">本卦</div>
          <div class="tri-name">${cast.ben.alias || cast.ben.name}</div>
          <div class="tri-sym">${cast.ben.upper.symbol}${cast.ben.lower.symbol}</div>
          <div class="tri-sub">体${cast.tiYong.ti.name} · 用${cast.tiYong.yong.name}</div>
        </div>
        <div class="tri-col">
          <div class="tri-lab">互卦</div>
          <div class="tri-name">${cast.hu.alias || cast.hu.name}</div>
          <div class="tri-sym">${cast.hu.upper.symbol}${cast.hu.lower.symbol}</div>
          <div class="tri-sub">过程</div>
        </div>
        <div class="tri-col">
          <div class="tri-lab">变卦</div>
          <div class="tri-name">${cast.bian.alias || cast.bian.name}</div>
          <div class="tri-sym">${cast.bian.upper.symbol}${cast.bian.lower.symbol}</div>
          <div class="tri-sub">趋向</div>
        </div>
      </div>
      <div class="yao-board">
        ${yaoRows.map((row) => `
          <div class="yao-row">
            <span class="y-name">${row.name}</span>
            <i class="yao-bar ${row.yang ? 'yang' : 'yin'} ${row.dong ? 'moving' : ''}"></i>
            <span class="y-tag">${row.tag}</span>
          </div>`).join('')}
      </div>
      ${guide.length ? `<div class="guide">
        <div class="guide-head">
          <div class="guide-title">梅花体用解读</div>
          <div class="muted" style="margin-top:6px">专业说法并附说明；先本卦，再互、变。</div>
        </div>
        ${guide.map((sec) => `
          <div class="guide-sec">
            <div class="guide-sec-title">${sec.title}</div>
            ${(sec.items || []).map((line) => `<div class="guide-item">${line}</div>`).join('')}
          </div>`).join('')}
      </div>` : ''}
      <div class="row" style="margin:12px 0 8px">
        <button class="btn btn-ghost" id="mhRecast">再起</button>
        <button class="btn btn-primary" data-go="index">返回首页</button>
      </div>`
    bindNav()
    document.getElementById('mhRecast').onclick = () => { state.askNext = 'meihua'; go('ask') }
  }

  function formatAccountTime(iso) {
    if (!iso) return ''
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return ''
    const pad = (n) => (n < 10 ? '0' + n : '' + n)
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  function renderFeedback() {
    setNav('问题留言')
    app.innerHTML = `
      <div class="title-zh">问题留言</div>
      <div class="subtitle">请写下使用中发现的问题</div>
      <div class="feedback-form">
        <textarea class="feedback-textarea" id="feedbackText" maxlength="500" placeholder="请说明出现问题的页面、操作步骤和实际现象">${accountEsc(state.feedbackText || '')}</textarea>
        <div class="feedback-note">真机版提交至微信意见反馈；当前网页预览仅保存在此浏览器。</div>
        <button class="btn btn-primary" id="feedbackSubmit">提交留言</button>
        <button class="btn btn-ghost" data-back style="margin-top:12px">返回</button>
      </div>`
    bindNav()
    const input = document.getElementById('feedbackText')
    const submit = document.getElementById('feedbackSubmit')
    if (input) input.oninput = () => { state.feedbackText = input.value }
    if (submit) submit.onclick = () => {
      const text = String((input && input.value) || '').trim()
      if (text.length < 2) {
        alert('请填写发现的问题')
        return
      }
      const records = JSON.parse(localStorage.getItem('liuyao_preview_feedback') || '[]')
      records.unshift({ text, createdAt: new Date().toISOString() })
      localStorage.setItem('liuyao_preview_feedback', JSON.stringify(records.slice(0, 30)))
      state.feedbackText = ''
      alert('留言已保存，感谢反馈')
      go('index')
    }
  }

  const PREVIEW_ACCOUNT_KEY = 'liuyao_preview_account_v2'
  const PREVIEW_SESSION_KEY = 'liuyao_preview_session_v2'

  function accountEsc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
  }

  function cleanAccountNick(value, fallback = '研习者') {
    const clean = String(value == null ? '' : value)
      .replace(/[\u0000-\u001f\u007f]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
    return Array.from(clean || fallback).slice(0, 20).join('')
  }

  function previewStoreGet(key) {
    try {
      const raw = window.localStorage.getItem(key)
      return raw ? JSON.parse(raw) : null
    } catch (e) {
      return null
    }
  }

  function previewStoreSet(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value))
      return true
    } catch (e) {
      return false
    }
  }

  function previewStoreRemove(key) {
    try {
      window.localStorage.removeItem(key)
    } catch (e) {
      // ignore
    }
  }

  function hydratePreviewAccount() {
    const account = previewStoreGet(PREVIEW_ACCOUNT_KEY)
    const session = previewStoreGet(PREVIEW_SESSION_KEY)
    state.account = account && account.id ? account : null
    state.user = state.account && session && session.accountId === state.account.id
      ? { ...state.account, loginAt: session.issuedAt, authenticated: true, localOnly: true }
      : null
    state.accountNick = state.account ? state.account.nickName : ''
    state.accountAvatar = state.account ? state.account.avatarUrl || '' : ''
  }

  function savePreviewAccount(account, signedIn) {
    state.account = account
    previewStoreSet(PREVIEW_ACCOUNT_KEY, account)
    if (signedIn) {
      const issuedAt = new Date().toISOString()
      const session = { version: 2, accountId: account.id, issuedAt }
      previewStoreSet(PREVIEW_SESSION_KEY, session)
      state.user = { ...account, loginAt: issuedAt, authenticated: true, localOnly: true }
    } else {
      previewStoreRemove(PREVIEW_SESSION_KEY)
      state.user = null
    }
  }

  function accountInitial(account) {
    const name = cleanAccountNick(account && account.nickName)
    return Array.from(name)[0] || '易'
  }

  function accountPolicyHtml() {
    if (!state.accountPolicy) return ''
    const agreement = state.accountPolicy === 'agreement'
    return `
      <div class="account-policy-box">
        <div class="account-policy-title">${agreement ? '用户协议' : '隐私说明'}</div>
        <div class="muted account-policy-copy">${agreement
          ? '本应用用于周易研习与传统规则化推演。卦象仅供学习参考，不构成医疗、法律、投资或其他专业意见。请勿利用本应用实施违法、侵权或伤害他人的行为。'
          : '第一版仅在本机保存昵称、头像、登录时间、卦例与学习记录；不会保存微信临时登录凭证，也不会上传到服务器。清理浏览器数据后资料可能丢失，当前不支持跨设备同步。'}</div>
        <button class="btn btn-ghost" id="accountPolicyClose">我知道了</button>
      </div>`
  }

  function accountConfirmHtml() {
    if (!state.accountConfirm) return ''
    const deleting = state.accountConfirm === 'delete'
    return `
      <div class="account-confirm">
        <div class="account-policy-title">${deleting ? '确认注销本机账户？' : '确认退出登录？'}</div>
        <div class="muted account-policy-copy">${deleting
          ? '将删除昵称、头像和登录资料且无法恢复；历史卦例仍会保留。'
          : '退出后保留本机账户资料和历史卦例，下次可直接登录。'}</div>
        <div class="row">
          <button class="btn btn-ghost" id="accountConfirmCancel">取消</button>
          <button class="btn ${deleting ? 'btn-danger' : 'btn-primary'}" id="accountConfirmOk">${deleting ? '确定注销' : '确定退出'}</button>
        </div>
      </div>`
  }

  let accountRenderTimer = null
  function renderAccountSoon() {
    clearTimeout(accountRenderTimer)
    accountRenderTimer = setTimeout(renderAccount, 60)
  }

  function renderAccount() {
    setNav('账户')
    if (state.user && !state.accountEditing) {
      const account = state.account || state.user
      app.innerHTML = `
        <div class="title-zh">账户</div>
        <div class="subtitle">首次登录即注册 · 无需另设密码</div>
        <div class="frame account-frame account-profile">
          ${corners()}
          <div class="account-status"><i></i>已登录</div>
          <div class="avatar placeholder">${accountEsc(accountInitial(account))}</div>
          <div class="account-name">${accountEsc(account.nickName)}</div>
          <div class="muted account-meta">本机账户 · ${formatAccountTime(state.user.loginAt)}</div>
          <div class="account-facts">
            <div><span>账户状态</span><b>已登录</b></div>
            <div><span>注册时间</span><b>${formatAccountTime(account.registeredAt)}</b></div>
            <div><span>数据同步</span><b>仅此设备</b></div>
          </div>
          <div class="account-note">昵称、头像、卦例与学习记录目前只保存在本机；退出不会删除历史记录。</div>
          <div class="row">
            <button class="btn btn-ghost" id="accountEdit">编辑资料</button>
            <button class="btn btn-ghost" id="accountLogout">退出登录</button>
          </div>
          <button class="account-danger-link" id="accountDelete">注销本机账户</button>
          ${accountConfirmHtml()}
        </div>`
      bindNav()
      document.getElementById('accountEdit').onclick = () => {
        state.accountEditing = true
        state.accountNick = account.nickName
        renderAccountSoon()
      }
      document.getElementById('accountLogout').onclick = () => {
        state.accountConfirm = 'logout'
        renderAccountSoon()
      }
      document.getElementById('accountDelete').onclick = () => {
        state.accountConfirm = 'delete'
        renderAccountSoon()
      }
      const cancel = document.getElementById('accountConfirmCancel')
      if (cancel) cancel.onclick = () => {
        state.accountConfirm = ''
        renderAccountSoon()
      }
      const confirmButton = document.getElementById('accountConfirmOk')
      if (confirmButton) confirmButton.onclick = () => {
        const deleting = state.accountConfirm === 'delete'
        state.accountConfirm = ''
        state.accountEditing = false
        state.accountConsent = false
        if (deleting) {
          previewStoreRemove(PREVIEW_ACCOUNT_KEY)
          previewStoreRemove(PREVIEW_SESSION_KEY)
          state.account = null
          state.user = null
          state.accountNick = ''
          state.accountAvatar = ''
        } else {
          savePreviewAccount(account, false)
        }
        renderAccountSoon()
      }
      return
    }

    if (state.user && state.accountEditing) {
      app.innerHTML = `
        <div class="title-zh">账户</div>
        <div class="subtitle">首次登录即注册 · 无需另设密码</div>
        <div class="frame account-frame">
          ${corners()}
          <div class="account-panel-title">编辑账户资料</div>
          <p class="hint muted">昵称仅用于本机账户展示，可随时修改。</p>
          <div class="field-label">昵称</div>
          <input id="accNick" maxlength="20" placeholder="填写昵称或自取雅号" value="${accountEsc(state.accountNick)}" />
          <div class="row account-actions">
            <button class="btn btn-ghost" id="accountEditCancel">取消</button>
            <button class="btn btn-primary" id="accountEditSave">保存资料</button>
          </div>
        </div>`
      bindNav()
      const nick = document.getElementById('accNick')
      nick.oninput = (e) => { state.accountNick = e.target.value }
      document.getElementById('accountEditCancel').onclick = () => {
        state.accountEditing = false
        state.accountNick = state.account ? state.account.nickName : ''
        renderAccountSoon()
      }
      document.getElementById('accountEditSave').onclick = () => {
        const time = new Date().toISOString()
        const account = {
          ...state.account,
          nickName: cleanAccountNick(state.accountNick),
          updatedAt: time
        }
        previewStoreSet(PREVIEW_ACCOUNT_KEY, account)
        state.account = account
        state.user = { ...state.user, ...account }
        state.accountEditing = false
        renderAccountSoon()
      }
      return
    }

    const account = state.account
    app.innerHTML = `
      <div class="title-zh">账户</div>
      <div class="subtitle">首次登录即注册 · 无需另设密码</div>
      <div class="frame account-frame">
        ${corners()}
        ${account ? `
          <div class="account-welcome">
            <div class="avatar placeholder account-avatar-small">${accountEsc(accountInitial(account))}</div>
            <div>
              <div class="account-welcome-title">欢迎回来，${accountEsc(account.nickName)}</div>
              <div class="muted account-welcome-copy">本机账户已存在，取得登录凭证后即可继续。</div>
            </div>
          </div>` : `
          <div class="account-panel-title">创建本机账户</div>
          <p class="hint muted">微信小程序内取得登录凭证后自动创建本机账户。昵称可选填，不设置则使用默认身份。</p>
          <div class="field-label">昵称（选填）</div>
          <input id="accNick" maxlength="20" placeholder="不填写则显示“研习者”" value="${accountEsc(state.accountNick)}" />`}
        <label class="account-consent">
          <input type="checkbox" id="accountConsent" ${state.accountConsent ? 'checked' : ''} />
          <span>我已阅读并同意</span>
        </label>
        <div class="account-policy-links">
          <button id="accountAgreement">《用户协议》</button><span>和</span><button id="accountPrivacy">《隐私说明》</button>
        </div>
        ${accountPolicyHtml()}
        <button class="btn btn-primary account-login-button" id="btnLogin" ${state.accountConsent ? '' : 'disabled'}>
          ${account ? '微信快捷登录' : '微信登录并注册'}
        </button>
        <div class="account-security">
          <i>安</i>
          <div><b>临时凭证不落盘</b><span class="muted">浏览器仅模拟本机账户；小程序的 wx.login 临时 code 不会保存在手机。</span></div>
        </div>
        <div class="muted center account-foot">暂不登录也可正常起卦、排盘和查看研习内容。</div>
      </div>`
    bindNav()
    const nick = document.getElementById('accNick')
    if (nick) nick.oninput = (e) => { state.accountNick = e.target.value }
    document.getElementById('accountConsent').onchange = (e) => {
      state.accountConsent = !!e.target.checked
      const loginButton = document.getElementById('btnLogin')
      if (loginButton) loginButton.disabled = !state.accountConsent
    }
    document.getElementById('accountAgreement').onclick = () => {
      state.accountPolicy = 'agreement'
      renderAccountSoon()
    }
    document.getElementById('accountPrivacy').onclick = () => {
      state.accountPolicy = 'privacy'
      renderAccountSoon()
    }
    const closePolicy = document.getElementById('accountPolicyClose')
    if (closePolicy) closePolicy.onclick = () => {
      state.accountPolicy = ''
      renderAccountSoon()
    }
    document.getElementById('btnLogin').onclick = () => {
      if (!state.accountConsent) return
      const time = new Date().toISOString()
      const next = account ? {
        ...account,
        policyVersion: '2026-07-30',
        consentedAt: account.consentedAt || time,
        updatedAt: time
      } : {
        version: 2,
        id: `local_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`,
        provider: 'wechat',
        syncMode: 'local',
        nickName: cleanAccountNick(state.accountNick),
        avatarUrl: '',
        registeredAt: time,
        updatedAt: time,
        policyVersion: '2026-07-30',
        consentedAt: time
      }
      savePreviewAccount(next, true)
      state.accountNick = next.nickName
      state.accountConsent = false
      state.accountPolicy = ''
      state.accountConfirm = ''
      renderAccountSoon()
    }
  }

  function renderHistory() {
    setNav('历史卦例')
    const items = []
    if (state.meihua) {
      items.push({
        kind: 'meihua',
        name: state.meihua.ben.name,
        question: state.meihua.question || '未题所问',
        time: state.meihua.createdAt || '',
        tag: '梅花'
      })
    }
    if (state.cast) {
      items.push({
        kind: 'liuyao',
        name: state.cast.ben.name,
        question: state.cast.question || '未题所问',
        time: state.cast.createdAt || '',
        tag: (state.cast.changingIndexes && state.cast.changingIndexes.length)
          ? ('动' + state.cast.changingIndexes.length)
          : '静卦'
      })
    }
    items.sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0))
    app.innerHTML = `
      <div class="title-zh">历史卦例</div>
      <div class="subtitle">本机最近卜卦，点开可回看</div>
      ${items.length ? items.map((it, i) => `
        <div class="frame hist-item" data-hist="${i}" style="margin-top:12px;cursor:pointer">
          ${corners()}
          <div style="display:flex;justify-content:space-between;gap:10px;align-items:center">
            <div style="letter-spacing:.12em;font-weight:600">${it.name}</div>
            <span class="seal">${it.tag}</span>
          </div>
          <div class="muted" style="margin-top:4px;font-size:14px">${it.time || ''}</div>
        </div>`).join('') : `
        <div class="frame" style="margin-top:16px">
          ${corners()}
          <p class="hint muted">暂无历史记录。卜卦或梅花起卦后，会出现在这里。</p>
        </div>`}
      <button class="btn btn-ghost" data-back style="margin-top:12px">返回</button>`
    bindNav()
    app.querySelectorAll('[data-hist]').forEach((el) => {
      el.onclick = () => {
        const it = items[Number(el.dataset.hist)]
        if (!it) return
        if (it.kind === 'meihua') go('meihuaResult')
        else go('result')
      }
    })
  }

  function yaoBar(cls) {
    return `<i class="yao-bar ${cls}"></i>`
  }

  function resolveBaguaDisk(kind) {
    if (window.LiuYao && typeof window.LiuYao.buildBaguaDisk === 'function') {
      return window.LiuYao.buildBaguaDisk(kind)
    }
    return null
  }

  function buildBaguaDiskHtml(kind) {
    const disk = resolveBaguaDisk(kind)
    if (!disk) return '<div class="fig-fallback">☯</div>'
    const ticks = (disk.ticks || []).map((tick) =>
      `<i class="lf-tick${tick.major ? ' major' : ''}${tick.mid ? ' mid' : ''}" style="transform:rotate(${tick.deg}deg)"></i>`
    ).join('')
    const spokes = (disk.spokes || []).map((deg) =>
      `<i class="lf-spoke" style="transform:rotate(${deg}deg)"></i>`
    ).join('')
    const dirs = (disk.dirs || []).map((dir) =>
      `<span class="lf-item" style="transform:rotate(${dir.deg}deg)"><b class="lf-dir-lab">${dir.name}</b></span>`
    ).join('')
    const guas = (disk.bagua || []).map((gua) => {
      const bars = [2, 1, 0].map((idx) =>
        `<i class="lf-bar ${gua.lines[idx] ? 'is-yang' : 'is-yin'}"></i>`
      ).join('')
      return `<span class="lf-item" style="transform:rotate(${gua.deg}deg)"><span class="lf-gua tone-${gua.tone}"><span class="lf-bars">${bars}</span><b class="lf-gua-name">${gua.name}</b><i class="lf-gua-tip">${gua.tip}</i><i class="lf-gua-vol">${gua.vol}</i></span></span>`
    }).join('')
    return `<div class="lf-disk kind-${disk.kind}">
      <div class="lf-halo"></div>
      <div class="lf-plate">
        <i class="lf-rim outer"></i><i class="lf-rim mid"></i><i class="lf-band"></i>
        <i class="lf-ring r-outer"></i><i class="lf-ring r-dir"></i><i class="lf-ring r-gua"></i><i class="lf-ring r-core"></i>
        <div class="lf-layer ticks">${ticks}</div>
        <div class="lf-layer spokes">${spokes}</div>
        <div class="lf-layer dirs">${dirs}</div>
        <div class="lf-layer guas">${guas}</div>
        <b class="lf-south">▲</b>
        <div class="lf-core">
          <div class="lf-taiji"><i class="lf-half yang"></i><i class="lf-half yin"></i><i class="lf-eye top"></i><i class="lf-eye bot"></i><i class="lf-dot top"></i><i class="lf-dot bot"></i></div>
          <em class="lf-core-title">${disk.title}</em>
        </div>
      </div>
      <div class="lf-legend">${disk.subtitle} · ${disk.volLabel}</div>
    </div>`
  }

  function buildFigureHtml(key, caption) {
    const cap = caption ? `<div class="fig-cap">${caption}</div>` : ''
    let body = ''
    if (key === 'taiji') {
      body = `<div class="fig-taiji"><i class="h yang"></i><i class="h yin"></i><i class="e t"></i><i class="e b"></i><i class="d t"></i><i class="d b"></i></div>`
    } else if (key === 'sancai') {
      body = `<div class="fig-sancai">
        <div class="sc"><span>天</span>${yaoBar('yang')}${yaoBar('yin')}<em>五·上</em></div>
        <div class="sc"><span>人</span>${yaoBar('yang')}${yaoBar('yin')}<em>三·四</em></div>
        <div class="sc"><span>地</span>${yaoBar('yang')}${yaoBar('yin')}<em>初·二</em></div>
      </div>`
    } else if (key === 'three-yi') {
      body = `<div class="fig-tri"><div><b>变</b><i>迁流不息</i></div><div><b>简</b><i>执简驭繁</i></div><div><b>常</b><i>变中有则</i></div></div>`
    } else if (key === 'xiang-shu-li') {
      body = `<div class="fig-rings"><span class="r3">象</span><span class="r2">数</span><span class="r1">理</span></div>`
    } else if (key === 'xiantian-bagua') {
      body = `<div class="lf-disks">${buildBaguaDiskHtml('xiantian')}</div>`
    } else if (key === 'houtian-bagua' || key === 'bagua') {
      body = `<div class="lf-disks">${buildBaguaDiskHtml('houtian')}</div>`
    } else if (key === 'bagua-table') {
      body = `<div class="lf-disks is-compare">${buildBaguaDiskHtml('xiantian')}${buildBaguaDiskHtml('houtian')}</div>`
    } else if (key === 'yao-four') {
      body = `<div class="fig-yao4">
        <div>${yaoBar('yang')}<span>少阳 —</span></div>
        <div>${yaoBar('yin')}<span>少阴 --</span></div>
        <div>${yaoBar('yang moving')}<span>老阳 ○</span></div>
        <div>${yaoBar('yin moving')}<span>老阴 ×</span></div>
      </div>`
    } else if (key === 'change-demo') {
      body = `<div class="fig-chg">
        <div><b>本</b>${yaoBar('yin')}${yaoBar('yang moving')}${yaoBar('yin')}</div>
        <em>→</em>
        <div><b>变</b>${yaoBar('yin')}${yaoBar('yin')}${yaoBar('yin')}</div>
      </div>`
    } else if (key === 'coins' || key === 'coin-score') {
      const yang = window.__COIN_YANG || './assets/coins/qianlong-yang.jpg'
      const yin = window.__COIN_YIN || './assets/coins/qianlong-yin.jpg'
      body = `<div class="fig-coins">
        <img class="c-img" src="${yang}" alt="字阳" />
        <img class="c-img" src="${yin}" alt="背阴" />
        <img class="c-img" src="${yang}" alt="字阳" />
      </div>`
    } else if (key === 'shiying' || key === 'zhongzheng') {
      const rows = [['上',''],['五','中'],['四','应'],['三',''],['二','中'],['初','世']]
      body = `<div class="fig-sy">${rows.map((r, i) => `<div><span>${r[0]}</span>${yaoBar(i % 2 ? 'yin' : 'yang')}<em>${r[1]}</em></div>`).join('')}</div>`
    } else if (key === 'liuqin' || key === 'yongshen') {
      body = `<div class="fig-lq"><b>我</b><span class="a">父母</span><span class="b">兄弟</span><span class="c">子孙</span><span class="d">妻财</span><span class="e">官鬼</span></div>`
    } else if (key === 'liushen') {
      body = `<div class="fig-ls"><span>青龙</span><span>朱雀</span><span>勾陈</span><span>螣蛇</span><span>白虎</span><span>玄武</span><em>↑ 初爻起</em></div>`
    } else if (key === 'wangshuai') {
      body = `<div class="fig-ws"><i class="on">旺</i><i class="on">相</i><i>休</i><i>囚</i><i>死</i></div>`
    } else if (key === 'fushen') {
      body = `<div class="fig-fu"><div>飞 ${yaoBar('yang')} 兄弟</div><em>伏 · 妻财</em></div>`
    } else if (key === 'he-chong') {
      body = `<div class="fig-hc"><i>合</i><i>冲</i><i>生</i><i>克</i></div>`
    } else if (key === 'path' || key === 'yingqi') {
      body = `<div class="fig-path">易理 → 象数 → 卜卦 → 回证</div>`
    } else {
      body = `<div class="fig-fallback">☯</div>`
    }
    return `<div class="fig">${body}${cap}</div>`
  }

  function renderBlocks(blocks) {
    return (blocks || []).map((b) => {
      if (b.type === 'p') return `<p class="para">${b.text}</p>`
      if (b.type === 'quote') return `<blockquote class="quote"><div>${b.text}</div>${b.from ? `<cite>—— ${b.from}</cite>` : ''}</blockquote>`
      if (b.type === 'list') return `<ul class="learn-list">${b.items.map((it) => `<li>${it}</li>`).join('')}</ul>`
      if (b.type === 'figure') return buildFigureHtml(b.key, b.caption)
      if (b.type === 'note') return `<div class="note">${b.text}</div>`
      return ''
    }).join('')
  }

  let learnJumping = false
  let learnActiveAnchor = ''

  function learnVolumeGroups() {
    let groups
    if (window.LiuYao.groupByCategory) {
      groups = window.LiuYao.groupByCategory()
    } else {
      const g = {}
      window.LiuYao.ARTICLES.forEach((a) => { (g[a.category] = g[a.category] || []).push(a) })
      const order = window.LiuYao.CATEGORY_ORDER || Object.keys(g)
      groups = order.filter((category) => g[category]).map((category, i) => ({
        category,
        label: category,
        anchorId: `learn-vol-${i + 1}`,
        items: g[category]
      }))
    }
    return groups.map((grp) => {
      if (grp.category !== '象数') return grp
      const items = (grp.items || []).slice()
      const gi = items.findIndex((a) => a.id === 'guadian-catalog')
      if (gi < 0) return grp
      const [entry] = items.splice(gi, 1)
      const after = items.findIndex((a) => a.id === 'liushisi-gua')
      items.splice(after >= 0 ? after + 1 : 0, 0, entry)
      return Object.assign({}, grp, { items })
    })
  }

  function learnJumpOffset() {
    const pageNav = document.querySelector('.nav')
    const volNav = document.querySelector('.vol-nav')
    const navH = pageNav && !pageNav.classList.contains('home-hidden')
      ? pageNav.getBoundingClientRect().height
      : 0
    const volH = volNav ? volNav.getBoundingClientRect().height : 0
    return navH + volH + 8
  }

  function setLearnActive(anchorId) {
    if (!anchorId || anchorId === learnActiveAnchor) return
    learnActiveAnchor = anchorId
    app.querySelectorAll('.vol-chip[data-anchor]').forEach((el) => {
      el.classList.toggle('on', el.dataset.anchor === anchorId)
    })
  }

  function jumpLearnVolume(anchorId) {
    const el = document.getElementById(anchorId)
    if (!el) return
    learnJumping = true
    setLearnActive(anchorId)
    const top = window.scrollY + el.getBoundingClientRect().top - learnJumpOffset()
    window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
    setTimeout(() => { learnJumping = false }, 420)
  }

  function syncLearnActiveFromScroll() {
    if (state.page !== 'learn' || learnJumping) return
    const sections = [...app.querySelectorAll('.learn-vol[id]')]
    if (!sections.length) return
    const y = window.scrollY + learnJumpOffset()
    let current = sections[0].id
    sections.forEach((section) => {
      const top = window.scrollY + section.getBoundingClientRect().top
      if (top <= y + 2) current = section.id
    })
    setLearnActive(current)
  }

  function bindLearnVolumeNav() {
    app.querySelectorAll('.vol-chip[data-anchor]').forEach((el) => {
      el.onclick = () => jumpLearnVolume(el.dataset.anchor)
    })
    const first = app.querySelector('.vol-chip[data-anchor]')
    setLearnActive((first && first.dataset.anchor) || '')
  }

  function renderLearn() {
    setNav('研习典要')
    const groups = learnVolumeGroups()
    app.innerHTML = `
      <div class="learn-hero">
        <span class="seal">读易八卷</span>
        <div class="title-zh" style="text-align:center;margin-top:10px">研习典要</div>
        <div class="subtitle" style="text-align:center">由理入术，由术回理 · 表诀卦例备齐，可当教材用</div>
        <div class="ornament">观象玩辞</div>
      </div>
      <div class="learn-catalog">
        <nav class="vol-nav" aria-label="八卷跳转">
          <div class="vol-nav-label">八卷跳转</div>
          <div class="vol-nav-grid">
            ${groups.map((grp, i) => `
              <button type="button" class="vol-chip${i === 0 ? ' on' : ''}" data-anchor="${grp.anchorId || `learn-vol-${i + 1}`}">
                <span class="vol-chip-vol">${grp.vol || `卷${i + 1}`}</span>
                <span class="vol-chip-name">${grp.category}</span>
              </button>`).join('')}
          </div>
        </nav>
        <div class="guadian-banner" id="openGuadianBanner">
          <span class="gb-seal">京房八宫</span>
          <div class="gb-main">
            <div class="gb-title">六十四卦卦典</div>
            <div class="muted" style="font-size:13px;margin-top:4px">卦画 + 卦名总图 · 点选任意一卦详解</div>
          </div>
          <span class="gb-go">›</span>
        </div>
        ${groups.map((grp, i) => `
          <div class="frame learn-vol" id="${grp.anchorId || `learn-vol-${i + 1}`}" style="margin-top:14px">
            ${corners()}
            <div style="display:flex;align-items:baseline;justify-content:space-between;gap:10px;margin-bottom:6px">
              <div>
                <div class="block-title" style="margin-top:0;color:var(--cinnabar)">${grp.label || grp.category}</div>
                ${grp.subtitle ? `<div class="muted" style="font-size:14px;letter-spacing:.1em;margin-top:2px">${grp.subtitle}</div>` : ''}
              </div>
              <div class="muted" style="font-size:14px;flex-shrink:0">${(grp.items || []).length}篇</div>
            </div>
            ${(grp.items || []).map((a, idx) => `
              <div class="article" data-id="${a.id}">
                <div style="display:flex;justify-content:space-between;gap:10px;align-items:center">
                  <div style="display:flex;gap:10px;flex:1;min-width:0;align-items:flex-start">
                    <span style="color:var(--bronze);opacity:.7;font-size:14px;min-width:14px">${idx + 1}</span>
                    <div style="flex:1;min-width:0">
                      <div style="letter-spacing:.12em;margin-bottom:4px;font-weight:600">${a.title}</div>
                      <div class="muted">${a.summary}</div>
                    </div>
                  </div>
                  <span style="color:var(--bronze);opacity:.8">◇</span>
                </div>
              </div>`).join('')}
          </div>`).join('')}
      </div>
      <div class="muted" style="text-align:center;margin-top:18px;letter-spacing:.1em;font-size:14px">占以决疑，学以修身</div>
      <button class="btn btn-ghost" data-back style="margin-top:12px">返回</button>`
    bindNav()
    bindLearnVolumeNav()
    const banner = app.querySelector('#openGuadianBanner')
    if (banner) banner.onclick = () => go('guadian')
    app.querySelectorAll('[data-id]').forEach((el) => {
      el.onclick = () => {
        const id = el.dataset.id
        if (id === 'guadian-catalog' || id === 'guadian-daodu' || /^guadian-/.test(id)) {
          go('guadian')
          return
        }
        go('detail', { articleId: id })
      }
    })
  }

  function renderGuadian() {
    setNav('六十四卦卦典')
    const palaces = (window.LiuYao.buildPalaceCatalog && window.LiuYao.buildPalaceCatalog()) || []
    const stages = window.LiuYao.GUA_STAGE || ['本宫', '一世', '二世', '三世', '四世', '五世', '游魂', '归魂']
    app.innerHTML = `
      <div class="gd-hero">
        <span class="seal">京房八宫</span>
        <div class="title-zh cast-title" style="margin-top:10px">六十四卦卦典</div>
        <div class="subtitle cast-subtitle">八宫总图 · 点选任意一卦查看详解</div>
      </div>
      <div class="gd-legend">${stages.map((s) => `<span>${s}</span>`).join('')}</div>
      <div class="gd-map">
        ${palaces.map((p) => `
          <div class="palace-card">
            <div class="palace-head">
              <span class="palace-sym">${p.symbol || ''}</span>
              <div class="palace-line">
                <span class="palace-name">${p.title}·${p.wuxing}</span>
                ${p.tip ? `<span class="palace-tip muted">${p.tip}</span>` : ''}
              </div>
            </div>
            <div class="gua-grid">
              ${(p.guas || []).map((g) => `
                <div class="gua-cell" data-alias="${g.alias}">
                  <div class="gua-stage">${g.stage}</div>
                  <div class="mini-gua">${(g.yaoView || []).map((row) => row.yang
                    ? '<div class="mini-yao yang"></div>'
                    : '<div class="mini-yao yin"><i class="seg"></i><i class="gap"></i><i class="seg"></i></div>').join('')}</div>
                  <div class="gua-alias">${g.alias}</div>
                  <div class="muted gua-full">${g.fullName}</div>
                </div>`).join('')}
            </div>
          </div>`).join('')}
      </div>
      <div class="muted" style="text-align:center;margin:16px 0;font-size:13px;letter-spacing:.12em">点选卦名进入详解</div>
      <button class="btn btn-ghost" id="gdBackLearn" style="margin-top:12px">返回研习</button>`
    bindNav()
    const backLearn = app.querySelector('#gdBackLearn')
    if (backLearn) {
      backLearn.onclick = () => {
        back()
        if (state.page !== 'learn') go('learn', {}, { replace: true })
      }
    }
    app.querySelectorAll('[data-alias]').forEach((el) => {
      el.onclick = () => go('guadianDetail', { guaAlias: el.dataset.alias })
    })
  }

  function xiangExplainHtml(xe) {
    if (!xe) return ''
    return `
      <div class="gd-section-head">卦象解释</div>
      <div class="plain-block xiang-block">
        ${xe.structure ? `<div class="xiang-structure">${xe.structure}</div>` : ''}
        ${xe.nameWhy ? `<div class="xiang-classic">${xe.nameWhy}</div>` : ''}
        ${xe.readTip ? `<div class="plain-text xiang-plain">${xe.readTip}</div>` : ''}
      </div>`
  }

  function renderGuadianDetail() {
    const alias = state.guaAlias
    const a = window.LiuYao.getGuaXiangjie && window.LiuYao.getGuaXiangjie(alias)
    if (!a) { go('guadian', {}, { replace: true }); return }
    setNav(a.title || a.fullName || a.alias)
    const board = (a.yaoBoard || []).map((row) => `
      <div class="yao-row ${row.isShi ? 'is-shi' : ''} ${row.isYing ? 'is-ying' : ''}">
        <div class="yao-pos">
          <span class="pos-label">${row.posLabel}</span>
          ${row.isShi ? '<span class="pos-tag">世</span>' : (row.isYing ? '<span class="pos-tag ying">应</span>' : '')}
        </div>
        <div class="yao-bar-wrap">
          ${row.yang
            ? '<div class="yao-bar yang"></div>'
            : '<div class="yao-bar yin"><i class="seg"></i><i class="gap"></i><i class="seg"></i></div>'}
        </div>
        <div class="yao-ci">${row.classic || ''}</div>
      </div>`).join('')
    const plainYao = (a.plainYao || []).map((py) => {
      const classic = py.classic || ''
      const rest = py.rest || [py.tip, py.sage].filter(Boolean).join('')
      return `
      <div class="plain-yao">
        <span class="py-pos">${py.posLabel}</span>
        <div class="py-flow"><span class="py-classic">${classic}</span><span class="py-rest">${rest}</span></div>
      </div>`
    }).join('')
    const plainZhan = (a.plainZhan || []).map((z) => `<div class="plain-zhan">· ${z}</div>`).join('')
    app.innerHTML = `
      <div class="frame gd-detail-frame">
        ${corners()}
        <span class="seal">${a.categoryLabel || '卦典'}</span>
        <div class="title-zh cast-title" style="margin-top:12px">${a.title}</div>
        <div class="gd-struct muted">${a.structureText || a.summary || ''}</div>
        <div class="gd-theme">${a.theme || ''}</div>
        <div class="gd-section-head">卦辞</div>
        ${a.guaci ? `<div class="gd-guaci-box"><div class="gd-guaci-classic">${a.guaci}</div><div class="gd-guaci-from">—— ${a.alias}·卦辞</div></div>` : ''}
        <div class="gd-section-head">卦象 · 爻辞</div>
        <div class="yao-board">${board}</div>
        <div class="yao-board-tip muted">自上而下为上爻→初爻；阳连阴断</div>
        ${xiangExplainHtml(a.xiangExplain)}
        <div class="gd-section-head">卦辞解释</div>
        <div class="plain-block">
          <div class="plain-text">${a.plainGuaci || ''}</div>
        </div>
        <div class="gd-section-head">爻辞解释</div>
        <div class="plain-block">
          ${plainYao}
        </div>
        ${a.plainYili ? `<div class="plain-block"><div class="plain-label">义理提要</div><div class="plain-text">${a.plainYili}</div></div>` : ''}
        ${plainZhan ? `<div class="plain-block"><div class="plain-label">占事要点</div>${plainZhan}</div>` : ''}
        <div class="detail-note muted">断具体人事仍须合用神、动变、日月。解释以十翼为骨，行文中对照儒家与墨家；本篇为卦德与辞象教材，不作绝对预言。</div>
      </div>
      <button class="btn btn-ghost" id="gdBackCatalog" style="margin-top:12px">‹ 返回八宫目录</button>`
    bindNav()
    const backBtn = app.querySelector('#gdBackCatalog')
    if (backBtn) backBtn.onclick = () => go('guadian', {}, { replace: true })
  }

  const guaDianUi = { query: '', part: '全部', palace: '', open: '' }

  function buildGuaDianHtml() {
    const all = window.LiuYao.listGuaDian ? window.LiuYao.listGuaDian() : []
    const list = window.LiuYao.filterGuaDian
      ? window.LiuYao.filterGuaDian(all, guaDianUi)
      : all
    const palaces = window.LiuYao.PALACE_CHIP_ORDER || ['乾', '坎', '艮', '震', '巽', '离', '坤', '兑']
    const parts = ['全部', '上经', '下经'].map((part) =>
      `<button type="button" class="gd-chip${guaDianUi.part === part ? ' on' : ''}" data-gd-part="${part}">${part}</button>`
    ).join('')
    const palaceChips = palaces.map((palace) =>
      `<button type="button" class="gd-chip${guaDianUi.palace === palace ? ' on' : ''}" data-gd-palace="${palace}">${palace}宫</button>`
    ).join('')
    const cards = list.map((g) => {
      const open = guaDianUi.open === g.alias
      const rows = open
        ? `<div class="gd-why">${g.nameWhy}</div>${(g.yaoRows || []).map((yao) =>
          `<div class="gd-yao"><i class="yao-bar sm ${yao.yang ? 'yang' : 'yin'}"></i><span>${yao.text}</span></div>`
        ).join('')}`
        : ''
      return `<div class="gd-card${open ? ' open' : ''}" data-gd-open="${g.alias}">
        <div class="gd-head">
          <b class="gd-idx">${g.idx}</b>
          <div class="gd-main">
            <div class="gd-title">${g.name} · ${g.alias}</div>
            <div class="gd-meta">${g.part} · ${g.palace}宫${g.palaceStep} · ${g.palaceWx}</div>
          </div>
          <em>${open ? '收' : '开'}</em>
        </div>
        <div class="gd-ci">${g.guaci}</div>
        ${open ? `<div class="gd-body">${rows}</div>` : ''}
      </div>`
    }).join('')
    return `<div class="gd">
      <div class="gd-search">
        <input class="gd-input" type="search" value="${guaDianUi.query.replace(/"/g, '&quot;')}" placeholder="检索卦名、卦辞或宫名" />
        ${guaDianUi.query ? '<button type="button" class="gd-clear" data-gd-clear>清除</button>' : ''}
      </div>
      <div class="gd-chips">${parts}</div>
      <div class="gd-chips palace">${palaceChips}</div>
      <div class="gd-count muted">${list.length} / ${all.length} 卦</div>
      ${cards}
    </div>`
  }

  function bindGuaDian() {
    const input = app.querySelector('.gd-input')
    if (input) {
      input.oninput = () => {
        guaDianUi.query = input.value || ''
        renderDetail()
        const next = app.querySelector('.gd-input')
        if (next) {
          next.focus()
          const len = next.value.length
          try { next.setSelectionRange(len, len) } catch (e) {}
        }
      }
    }
    const clear = app.querySelector('[data-gd-clear]')
    if (clear) {
      clear.onclick = () => {
        guaDianUi.query = ''
        renderDetail()
      }
    }
    app.querySelectorAll('[data-gd-part]').forEach((el) => {
      el.onclick = () => {
        guaDianUi.part = el.dataset.gdPart
        renderDetail()
      }
    })
    app.querySelectorAll('[data-gd-palace]').forEach((el) => {
      el.onclick = () => {
        guaDianUi.palace = guaDianUi.palace === el.dataset.gdPalace ? '' : el.dataset.gdPalace
        renderDetail()
      }
    })
    app.querySelectorAll('[data-gd-open]').forEach((el) => {
      el.onclick = () => {
        const alias = el.dataset.gdOpen
        guaDianUi.open = guaDianUi.open === alias ? '' : alias
        renderDetail()
      }
    })
  }

  function renderDetail() {
    if (state.articleId === 'guadian-catalog' || state.articleId === 'guadian-daodu' || /^guadian-/.test(state.articleId || '')) {
      go('guadian', {}, { replace: true })
      return
    }
    const raw = window.LiuYao.ARTICLES.find((x) => x.id === state.articleId)
    if (!raw) { go('learn', {}, { replace: true }); return }
    const a = window.LiuYao.getArticle
      ? window.LiuYao.getArticle(state.articleId)
      : (window.LiuYao.normalizeArticle ? window.LiuYao.normalizeArticle(raw) : raw)
    const blocks = a.blocks || (a.content || []).map((text) => ({ type: 'p', text }))
    const seal = a.categoryLabel || a.category
    const isGuaDian = a.kind === 'gua-dian'
    if (!isGuaDian) {
      guaDianUi.query = ''
      guaDianUi.part = '全部'
      guaDianUi.palace = ''
      guaDianUi.open = ''
    }
    setNav(a.title)
    app.innerHTML = `
      <div class="frame">
        ${corners()}
        <span class="seal">${seal}</span>
        <div class="title-zh" style="margin-top:12px">${a.title}</div>
        <div class="subtitle">${a.summary}</div>
        <div class="article-body">${renderBlocks(blocks)}</div>
        ${isGuaDian ? buildGuaDianHtml() : ''}
      </div>
      <button class="btn btn-ghost" data-back>返回目录</button>`
    bindNav()
    if (isGuaDian) bindGuaDian()
  }

  function onSwipeStart(e) {
    const t = e.changedTouches && e.changedTouches[0]
    if (!t) return
    touchStartX = t.clientX
    touchStartY = t.clientY
    touchStartT = Date.now()
  }
  function onSwipeEnd(e) {
    const t = e.changedTouches && e.changedTouches[0]
    if (!t || stack.length <= 1) return
    const dx = t.clientX - touchStartX
    const dy = t.clientY - touchStartY
    const dt = Date.now() - touchStartT
    if (dt > 600) return
    if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 1.2) return
    const fromEdge = touchStartX <= 28 && dx > 70
    const swipeLeft = dx < -70
    if (!fromEdge && !swipeLeft) return
    back()
  }

  if (navBack) navBack.onclick = () => goHomeFromNav()
  if (shell) {
    shell.addEventListener('touchstart', onSwipeStart, { passive: true })
    shell.addEventListener('touchend', onSwipeEnd, { passive: true })
  }

  let compassTick = 0
  let pendingHeading = null
  let compassBound = false

  function headingFromOrientEvent(e) {
    if (!e) return null
    if (typeof e.webkitCompassHeading === 'number' && !Number.isNaN(e.webkitCompassHeading)) {
      return e.webkitCompassHeading
    }
    if (e.alpha == null || Number.isNaN(Number(e.alpha))) return null
    // 绝对方位优先；相对方位仍可转盘（相对初始朝向）
    return (360 - Number(e.alpha)) % 360
  }

  function flushPreviewCompass() {
    if (pendingHeading == null) return
    const next = pendingHeading
    pendingHeading = null
    applyLiveHeading(next)
  }

  function applyPreviewCompass(heading) {
    pendingHeading = Math.round(((Number(heading) % 360) + 360) % 360)
    const now = Date.now()
    if (now - compassTick < 50) {
      // 保证最后一帧也会刷上
      clearTimeout(applyPreviewCompass._t)
      applyPreviewCompass._t = setTimeout(flushPreviewCompass, 50)
      return
    }
    compassTick = now
    flushPreviewCompass()
  }

  function bindDeviceOrientation() {
    if (typeof window === 'undefined' || !window.DeviceOrientationEvent) return
    if (compassBound) return
    compassBound = true
    const onOrient = (e) => {
      const h = headingFromOrientEvent(e)
      if (h != null && !Number.isNaN(h)) applyPreviewCompass(h)
    }
    window.addEventListener('deviceorientation', onOrient, true)
    window.addEventListener('deviceorientationabsolute', onOrient, true)
  }

  function requestCompassPermission(fromUser) {
    bindDeviceOrientation()
    const DOE = window.DeviceOrientationEvent
    const req = DOE && DOE.requestPermission
    if (typeof req === 'function') {
      req.call(DOE)
        .then((stateName) => {
          if (stateName === 'granted') {
            bindDeviceOrientation()
            if (fromUser) {
              state._dragHint = '已授权，请转动手机'
              paintLuopanLive()
            }
          } else if (fromUser) {
            state._dragHint = '未授权方向感应 · 可拖动转盘'
            paintLuopanLive()
          }
        })
        .catch(() => {
          if (fromUser) {
            state._dragHint = '无法开启方向感应 · 可拖动转盘'
            paintLuopanLive()
          }
        })
      return
    }
    // 非 iOS：直接监听；若仍无数据则提示拖动
    if (fromUser) {
      state._dragHint = '请转动手机；若无反应可拖动转盘'
      paintLuopanLive()
      setTimeout(() => {
        if (!state.compassReady) {
          state._dragHint = '当前环境无罗盘 · 请拖动转盘'
          paintLuopanLive()
        }
      }, 2500)
    }
  }

  function enableCompassOnFirstGesture() {
    let handled = false
    const activate = () => {
      if (handled) return
      handled = true
      requestCompassPermission(true)
      document.removeEventListener('touchend', activate, true)
      document.removeEventListener('click', activate, true)
    }
    document.addEventListener('touchend', activate, { capture: true, once: true })
    document.addEventListener('click', activate, { capture: true, once: true })
  }

  // 预览页默认开启方向监听；受浏览器权限策略限制时仍可手动拖动转盘。
  bindDeviceOrientation()
  requestCompassPermission(false)
  enableCompassOnFirstGesture()

  hydratePreviewAccount()
  window.addEventListener('scroll', syncLearnActiveFromScroll, { passive: true })
  window.__liuyaoPreview = { state, go, back, render, stack }
  render()
})()
