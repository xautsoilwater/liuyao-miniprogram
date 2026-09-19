/**
 * 问法事体域分类（与答复形态正交）
 *
 * 两层分类：
 * - answerShape / mode：要听什么形式的答案（几点、有没有、怎么办…）
 * - domain：在问哪一类生活事（感情、事业、家宅、失物…）
 */

const DOMAINS = [
  {
    key: 'emotion',
    label: '感情婚姻',
    topicHint: 'marriage',
    re: /婚|恋|感情|对象|分手|复合|相亲|女友|男友|老婆|丈夫|表白|相处|桃花|姻缘|第三者|喜不喜欢|见家长|断联|彩礼|嫁妆|条件/
  },
  {
    key: 'family',
    label: '家庭亲眷',
    topicHint: 'general',
    re: /家里|家和|父母|父亲|母亲|孩子|子女|亲眷|家人|婆媳|家事|择校|长辈/
  },
  {
    key: 'pregnancy',
    label: '孕产生育',
    topicHint: 'health',
    re: /怀孕|受孕|胎|生产|顺产|剖腹|胎儿|生男|生女|孕产/
  },
  {
    key: 'exam',
    label: '学业考试',
    topicHint: 'exam',
    re: /考试|考研|考公|面试|录取|论文|答辩|过关|上岸|分数|笔试|升学|证书|执照|事业编|调剂|留学|驾考|资格考/
  },
  {
    key: 'career',
    label: '事业职场',
    topicHint: 'career',
    re: /升职|晋升|工作|跳槽|入职|转正|岗位|职称|项目|官运|功名|辞职|上级|职场|裁员|降薪|创业|副业|续约|绩效|考核/
  },
  {
    key: 'wealth',
    label: '求财经营',
    topicHint: 'wealth',
    re: /财|钱|回款|进账|生意|合同|签约|成交|利润|赚|亏|货款|收债|求财|借款|借出|担保|尾款|毁约/
  },
  {
    key: 'invest',
    label: '投资理财',
    topicHint: 'wealth',
    re: /投资|理财|股票|基金|收益|出手|入场|加仓|减仓|止损/
  },
  {
    key: 'property',
    label: '置业买卖',
    topicHint: 'wealth',
    re: /买房|卖房|买车|卖车|置业|房产|车子|租金|收租/
  },
  {
    key: 'partner',
    label: '合伙合作',
    topicHint: 'wealth',
    re: /合伙|合作|合伙人|搭伙/
  },
  {
    key: 'health',
    label: '疾病健康',
    topicHint: 'health',
    re: /病|疾|疼|痛|手术|住院|康复|治疗|身体|发烧|炎症|体检|痊愈|好转|严重|病情|就医|调养|复查|慢性/
  },
  {
    key: 'visit',
    label: '来客来访',
    topicHint: 'travel',
    re: /客人|来客|来访|访客|有人来|谁来|上门|拜访|串门|作客|做客|见客|会客|宾客/
  },
  {
    key: 'seek',
    label: '寻人来找',
    topicHint: 'travel',
    re: /找我|来找|有人找|来电找|打电话来|联系我|人找/
  },
  {
    key: 'meeting',
    label: '会见约见',
    topicHint: 'travel',
    re: /见面|约见|会见|见他|见她|约出来|见一面|宜见|应酬/
  },
  {
    key: 'message',
    label: '来电信息',
    topicHint: 'travel',
    re: /来电|电话|短信|微信消息|重要消息|通知/
  },
  {
    key: 'delivery',
    label: '送达到来',
    topicHint: 'travel',
    re: /快递|包裹|外卖|送到|到货|邮包|信件到|东西到/
  },
  {
    key: 'arrival',
    label: '行人到达',
    topicHint: 'travel',
    re: /到家|到达|归来|回来|抵达|什么时候到|几点到|能到吗|到了吗/
  },
  {
    key: 'travel',
    label: '出行路途',
    topicHint: 'travel',
    re: /出行|出门|旅行|出差|航班|火车|路途|远行|路顺|车次/
  },
  {
    key: 'document',
    label: '文书审批',
    topicHint: 'exam',
    re: /申请|签证|审批|批复|手续|办证|证件|贷款批|公文|落户|理赔|报销|再签/
  },
  {
    key: 'home',
    label: '家宅迁居',
    topicHint: 'travel',
    re: /搬家|迁居|租房|装修|动土|家宅|居住|住这里|开业|安床|邻里|物业/
  },
  {
    key: 'social',
    label: '人际应酬',
    topicHint: 'general',
    re: /求人|托人|帮得上|人情|关系网/
  },
  {
    key: 'weather',
    label: '天气雨晴',
    topicHint: 'general',
    re: /下雨|雨|下雪|雪|天晴|晴天|阴天|台风|刮风|降温|天气|雷阵雨/
  },
  {
    key: 'lawsuit',
    label: '官司是非',
    topicHint: 'lawsuit',
    re: /官司|诉讼|起诉|纠纷|是非|仲裁|法院|警察|告状|口舌|和解|报警|诈骗|被骗|劳动仲裁|离婚/
  },
  {
    key: 'lost',
    label: '失物寻人',
    topicHint: 'lost',
    re: /丢|失物|找回|找不着|遗失|钥匙|手机丢|找得到|寻物|寻人|失踪|宠物|账号/
  }
]

function detectDomain(raw) {
  const q = String(raw || '')
  for (let i = 0; i < DOMAINS.length; i++) {
    if (DOMAINS[i].re.test(q)) {
      return {
        domain: DOMAINS[i].key,
        domainLabel: DOMAINS[i].label,
        topicHint: DOMAINS[i].topicHint
      }
    }
  }
  return { domain: 'general', domainLabel: '综合事务', topicHint: 'general' }
}

/**
 * 成否细分：
 * occur  事情发不发生（客人来、下雨、人找我）
 * have   有无某种状态/情感（感情、机会）
 * should 宜不宜 / 要不要
 * suit   适不适合
 * can    能不能 / 成不成
 * find   找不找得到
 */
function refineYesKind(raw) {
  const q = String(raw || '')
  if (/宜不宜|当不当|应不应|要不要|该不该|辞不辞|去不去|离不离/.test(q)) return 'should'
  if (/适不适合|适合不适合|合不合适|适合吗|合适吗|适合.+吗|合适.+吗/.test(q)) return 'suit'
  if (/找不找得到|找得到吗|还能找到|找得回来吗|寻得回/.test(q)) return 'find'
  if (
    /(有没有|会不会|有无|可不可能).{0,8}(客人|来客|人来|来访|来找|上门|人找|来电|口舌)/.test(q)
    || /(客人|来客|访客|人).{0,6}(来吗|来不|来得|来访|来得了)/.test(q)
    || /有没有客人|会不会有人来|明天有人来吗|今天有人来吗/.test(q)
    || /(会不会|有没有|能不能).{0,4}(下雨|下雪|停雨|天晴|降温)/.test(q)
    || /雨会不会|雪会不会/.test(q)
    || /(快递|包裹|外卖).{0,6}(到|来|丢)/.test(q)
    || /能到吗|到得了吗|到了吗/.test(q)
  ) {
    return 'occur'
  }
  if (/有没有|还有没有/.test(q)) return 'have'
  return 'can'
}

function isDegreeQuestion(raw) {
  return /严不严重|轻不轻|重不重|大不大|多不多|强不强|远不远|快不快|高不高|深不深|难不难/.test(String(raw || ''))
}

/** 发生类事件的自然短语 */
function occurPhrase(domain, focus) {
  const f = focus || '此事'
  if (domain === 'visit') {
    if (/客|访|宾/.test(f)) return '客人来'
    return `${f}来访`
  }
  if (domain === 'seek') return '有人来找'
  if (domain === 'message') return '重要来电/消息'
  if (domain === 'delivery') {
    if (/丢/.test(f)) return '包裹丢失'
    return `${f}送达`
  }
  if (domain === 'arrival') return `${f}到达`
  if (domain === 'weather') {
    if (/停/.test(f)) return f
    if (/雨/.test(f)) return '下雨'
    if (/雪|降温/.test(f)) return '雨雪降温'
    return f
  }
  if (domain === 'meeting') return '见到所约之人'
  if (domain === 'lawsuit' && /口舌/.test(f)) return '口舌是非'
  return f
}

function listDomains() {
  return DOMAINS.map((d) => ({ key: d.key, label: d.label, topicHint: d.topicHint }))
}

module.exports = {
  DOMAINS,
  detectDomain,
  refineYesKind,
  isDegreeQuestion,
  occurPhrase,
  listDomains
}
