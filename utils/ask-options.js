/**
 * 起卦前「所问」选项表
 *
 * 设计原则：
 * 1. 按生活事体分大类（不是按问句句式）
 * 2. 对齐六爻传统问事：功名、求财、婚姻、疾病、官司、出行、失物、家宅、考试文书…
 * 3. 每类只放高频、可断的细问；答复形态（成否/宜否/何时/方位…）挂在选项上
 * 4. topicKey 必须落到已有用神体系，便于六爻取用
 */

const TIME_SCOPES = [
  { key: '', label: '不限时' },
  { key: '今天', label: '今天' },
  { key: '今晚', label: '今晚' },
  { key: '明天', label: '明天' },
  { key: '本周', label: '本周' },
  { key: '周末', label: '周末' },
  { key: '本月', label: '本月' },
  { key: '近期', label: '近期' },
  { key: '今年', label: '今年' }
]

/** @type {{ key: string, label: string, tip?: string, options: object[] }[]} */
const ASK_GROUPS = 
[
  {
    key: "emotion",
    label: "感情婚姻",
    tip: "恋爱、相处、婚嫁、复合、相亲",
    options: [
      {
        id: "em-have",
        label: "对方还有没有感情",
        topicKey: "marriage",
        focus: "感情",
        mode: "yesno",
        yesKind: "have",
        domain: "emotion",
        modeLabel: "有无"
      },
      {
        id: "em-like",
        label: "对方喜不喜欢我",
        topicKey: "marriage",
        focus: "对方心意",
        mode: "yesno",
        yesKind: "have",
        domain: "emotion",
        modeLabel: "有无"
      },
      {
        id: "em-together",
        label: "能不能在一起",
        topicKey: "marriage",
        focus: "在一起",
        mode: "yesno",
        yesKind: "can",
        domain: "emotion",
        modeLabel: "成否"
      },
      {
        id: "em-marry",
        label: "能不能成婚",
        topicKey: "marriage",
        focus: "成婚",
        mode: "yesno",
        yesKind: "can",
        domain: "emotion",
        modeLabel: "成否"
      },
      {
        id: "em-back",
        label: "会不会复合",
        topicKey: "marriage",
        focus: "复合",
        mode: "yesno",
        yesKind: "can",
        domain: "emotion",
        modeLabel: "成否"
      },
      {
        id: "em-third",
        label: "有没有第三者",
        topicKey: "marriage",
        focus: "第三者",
        mode: "yesno",
        yesKind: "have",
        domain: "emotion",
        modeLabel: "有无",
        negativeEvent: true
      },
      {
        id: "em-blind",
        label: "这次相亲成不成",
        topicKey: "marriage",
        focus: "相亲",
        mode: "yesno",
        yesKind: "can",
        domain: "emotion",
        modeLabel: "成否"
      },
      {
        id: "em-meet-parent",
        label: "见家长顺不顺",
        topicKey: "marriage",
        focus: "见家长",
        mode: "jixiong",
        domain: "emotion",
        modeLabel: "吉凶"
      },
      {
        id: "em-reconnect",
        label: "分手后还会不会再联系",
        topicKey: "marriage",
        focus: "再联系",
        mode: "yesno",
        yesKind: "occur",
        domain: "emotion",
        modeLabel: "发生"
      },
      {
        id: "em-cut",
        label: "要不要断联",
        topicKey: "marriage",
        focus: "断联",
        mode: "yesno",
        yesKind: "should",
        domain: "emotion",
        modeLabel: "宜否"
      },
      {
        id: "em-dowry",
        label: "婚事谈条件利不利",
        topicKey: "marriage",
        focus: "婚事条件",
        mode: "jixiong",
        domain: "emotion",
        modeLabel: "吉凶"
      },
      {
        id: "em-when-say",
        label: "什么时候适合表白",
        topicKey: "marriage",
        focus: "表白",
        mode: "when",
        whenKind: "day",
        domain: "emotion",
        modeLabel: "日期"
      },
      {
        id: "em-when-meet",
        label: "什么时候适合见面",
        topicKey: "marriage",
        focus: "见面",
        mode: "when",
        whenKind: "day",
        domain: "emotion",
        modeLabel: "日期"
      },
      {
        id: "em-choice",
        label: "分还是合",
        topicKey: "marriage",
        focus: "分还是合",
        mode: "choice",
        domain: "emotion",
        modeLabel: "抉择",
        choice: {
          a: "分",
          b: "合"
        }
      },
      {
        id: "em-how",
        label: "这段感情怎么办",
        topicKey: "marriage",
        focus: "感情",
        mode: "how",
        domain: "emotion",
        modeLabel: "对策"
      },
      {
        id: "em-outlook",
        label: "这段感情走势如何",
        topicKey: "marriage",
        focus: "感情走势",
        mode: "outlook",
        domain: "emotion",
        modeLabel: "走势"
      },
      {
        id: "em-jx",
        label: "这段姻缘吉凶",
        topicKey: "marriage",
        focus: "姻缘",
        mode: "jixiong",
        domain: "emotion",
        modeLabel: "吉凶"
      }
    ]
  },
  {
    key: "family",
    label: "家庭亲眷",
    tip: "父母子女、家和、孕产、择校",
    options: [
      {
        id: "fa-harmony",
        label: "家里和不和睦",
        topicKey: "general",
        focus: "家和",
        mode: "jixiong",
        domain: "family",
        modeLabel: "吉凶"
      },
      {
        id: "fa-parent",
        label: "父母近况安不安",
        topicKey: "family_parent",
        focus: "父母安康",
        mode: "jixiong",
        domain: "family",
        modeLabel: "吉凶"
      },
      {
        id: "fa-elder-op",
        label: "长辈手术/住院顺不顺",
        topicKey: "family_parent",
        focus: "长辈就医",
        mode: "jixiong",
        domain: "family",
        modeLabel: "吉凶"
      },
      {
        id: "fa-child",
        label: "孩子近况顺不顺",
        topicKey: "family_child",
        focus: "孩子",
        mode: "jixiong",
        domain: "family",
        modeLabel: "吉凶"
      },
      {
        id: "fa-school",
        label: "孩子择校适不适合",
        topicKey: "family_child",
        focus: "择校",
        mode: "yesno",
        yesKind: "suit",
        domain: "family",
        modeLabel: "适合"
      },
      {
        id: "fa-inlaw",
        label: "婆媳/亲眷关系顺不顺",
        topicKey: "general",
        focus: "亲眷关系",
        mode: "jixiong",
        domain: "family",
        modeLabel: "吉凶"
      },
      {
        id: "fa-preg",
        label: "能不能顺利怀孕",
        topicKey: "pregnancy",
        focus: "怀孕",
        mode: "yesno",
        yesKind: "can",
        domain: "pregnancy",
        modeLabel: "成否"
      },
      {
        id: "fa-birth",
        label: "生产顺不顺利",
        topicKey: "pregnancy",
        focus: "生产",
        mode: "jixiong",
        domain: "pregnancy",
        modeLabel: "吉凶"
      },
      {
        id: "fa-gender",
        label: "孕产应注意什么",
        topicKey: "pregnancy",
        focus: "孕产准备",
        mode: "how",
        domain: "pregnancy",
        modeLabel: "对策"
      },
      {
        id: "fa-how",
        label: "家里事怎么办",
        topicKey: "general",
        focus: "家事",
        mode: "how",
        domain: "family",
        modeLabel: "对策"
      }
    ]
  },
  {
    key: "exam",
    label: "科研学业",
    tip: "论文、科研、考试、升学、证书、考公",
    options: [
      {
        id: "ex-paper",
        label: "论文能不能接收",
        topicKey: "exam",
        focus: "论文接收",
        mode: "yesno",
        yesKind: "can",
        domain: "research",
        modeLabel: "成否"
      },
      {
        id: "ex-experiment",
        label: "实验能不能做成",
        topicKey: "general",
        focus: "实验做成",
        mode: "yesno",
        yesKind: "can",
        domain: "research",
        modeLabel: "成否"
      },
      {
        id: "ex-project",
        label: "项目能不能中标/获批",
        topicKey: "exam",
        focus: "项目中标或获批",
        mode: "yesno",
        yesKind: "can",
        domain: "research",
        modeLabel: "成否"
      },
      {
        id: "ex-pass",
        label: "这场考试能不能过",
        topicKey: "exam",
        focus: "考试过关",
        mode: "yesno",
        yesKind: "can",
        domain: "exam",
        modeLabel: "成否"
      },
      {
        id: "ex-score",
        label: "成绩能不能理想",
        topicKey: "exam",
        focus: "成绩",
        mode: "yesno",
        yesKind: "can",
        domain: "exam",
        modeLabel: "成否"
      },
      {
        id: "ex-admit",
        label: "能不能录取/上岸",
        topicKey: "exam",
        focus: "录取",
        mode: "yesno",
        yesKind: "can",
        domain: "exam",
        modeLabel: "成否"
      },
      {
        id: "ex-civil",
        label: "公考/事业编能不能进面",
        topicKey: "exam",
        focus: "公考进面",
        mode: "yesno",
        yesKind: "can",
        domain: "exam",
        modeLabel: "成否"
      },
      {
        id: "ex-transfer",
        label: "调剂能不能成",
        topicKey: "exam",
        focus: "调剂",
        mode: "yesno",
        yesKind: "can",
        domain: "exam",
        modeLabel: "成否"
      },
      {
        id: "ex-school",
        label: "能不能升入理想学校",
        topicKey: "exam",
        focus: "升学",
        mode: "yesno",
        yesKind: "can",
        domain: "exam",
        modeLabel: "成否"
      },
      {
        id: "ex-abroad",
        label: "留学能不能录取",
        topicKey: "exam",
        focus: "留学录取",
        mode: "yesno",
        yesKind: "can",
        domain: "exam",
        modeLabel: "成否"
      },
      {
        id: "ex-cert",
        label: "证件/执照过不过得了",
        topicKey: "exam",
        focus: "证件过关",
        mode: "yesno",
        yesKind: "can",
        domain: "document",
        modeLabel: "成否"
      },
      {
        id: "ex-drive",
        label: "驾考/资格考过不过得了",
        topicKey: "exam",
        focus: "资格考试",
        mode: "yesno",
        yesKind: "can",
        domain: "exam",
        modeLabel: "成否"
      },
      {
        id: "ex-interview",
        label: "这场面试能不能过",
        topicKey: "exam",
        focus: "面试",
        mode: "yesno",
        yesKind: "can",
        domain: "exam",
        modeLabel: "成否"
      },
      {
        id: "ex-jx",
        label: "这场考试吉凶",
        topicKey: "exam",
        focus: "考试",
        mode: "jixiong",
        domain: "exam",
        modeLabel: "吉凶"
      },
      {
        id: "ex-how",
        label: "备考怎么办更好",
        topicKey: "exam",
        focus: "备考",
        mode: "how",
        domain: "exam",
        modeLabel: "对策"
      }
    ]
  },
  {
    key: "career",
    label: "事业职场",
    tip: "工作、升迁、去留、项目、创业",
    options: [
      {
        id: "ca-job",
        label: "能不能入职/录用",
        topicKey: "career",
        focus: "入职",
        mode: "yesno",
        yesKind: "can",
        domain: "career",
        modeLabel: "成否"
      },
      {
        id: "ca-up",
        label: "能不能升职/提拔",
        topicKey: "career",
        focus: "升职",
        mode: "yesno",
        yesKind: "can",
        domain: "career",
        modeLabel: "成否"
      },
      {
        id: "ca-regular",
        label: "能不能顺利转正",
        topicKey: "career",
        focus: "转正",
        mode: "yesno",
        yesKind: "can",
        domain: "career",
        modeLabel: "成否"
      },
      {
        id: "ca-renew",
        label: "合同续不续得上",
        topicKey: "career",
        focus: "续约",
        mode: "yesno",
        yesKind: "can",
        domain: "career",
        modeLabel: "成否"
      },
      {
        id: "ca-layoff",
        label: "会不会被裁/降薪",
        topicKey: "career",
        focus: "裁员降薪",
        mode: "yesno",
        yesKind: "occur",
        domain: "career",
        modeLabel: "发生",
        negativeEvent: true
      },
      {
        id: "ca-kpi",
        label: "绩效/考核过不过得了",
        topicKey: "career",
        focus: "绩效考核",
        mode: "yesno",
        yesKind: "can",
        domain: "career",
        modeLabel: "成否"
      },
      {
        id: "ca-project",
        label: "这个项目能不能成",
        topicKey: "career",
        focus: "项目",
        mode: "yesno",
        yesKind: "can",
        domain: "career",
        modeLabel: "成否"
      },
      {
        id: "ca-startup",
        label: "适不适合创业/做副业",
        topicKey: "career",
        focus: "创业副业",
        mode: "yesno",
        yesKind: "suit",
        domain: "career",
        modeLabel: "适合"
      },
      {
        id: "ca-quit",
        label: "要不要辞职",
        topicKey: "career",
        focus: "辞职",
        mode: "yesno",
        yesKind: "should",
        domain: "career",
        modeLabel: "宜否"
      },
      {
        id: "ca-switch",
        label: "适不适合跳槽",
        topicKey: "career",
        focus: "跳槽",
        mode: "yesno",
        yesKind: "suit",
        domain: "career",
        modeLabel: "适合"
      },
      {
        id: "ca-boss",
        label: "与上级关系顺不顺",
        topicKey: "career",
        focus: "与上级",
        mode: "jixiong",
        domain: "career",
        modeLabel: "吉凶"
      },
      {
        id: "ca-choice",
        label: "留任还是另谋",
        topicKey: "career",
        focus: "留还是走",
        mode: "choice",
        domain: "career",
        modeLabel: "抉择",
        choice: {
          a: "留任",
          b: "另谋"
        }
      },
      {
        id: "ca-how",
        label: "事业上怎么办",
        topicKey: "career",
        focus: "事业",
        mode: "how",
        domain: "career",
        modeLabel: "对策"
      },
      {
        id: "ca-outlook",
        label: "事业前景如何",
        topicKey: "career",
        focus: "事业前景",
        mode: "outlook",
        domain: "career",
        modeLabel: "走势"
      },
      {
        id: "ca-jx",
        label: "当前事业吉凶",
        topicKey: "career",
        focus: "事业",
        mode: "jixiong",
        domain: "career",
        modeLabel: "吉凶"
      }
    ]
  },
  {
    key: "wealth",
    label: "求财经营",
    tip: "进账、生意、回款、合伙、借贷",
    options: [
      {
        id: "we-gain",
        label: "能不能求到财",
        topicKey: "wealth",
        focus: "求财",
        mode: "yesno",
        yesKind: "can",
        domain: "wealth",
        modeLabel: "成否"
      },
      {
        id: "we-back",
        label: "这笔回款能不能到",
        topicKey: "wealth",
        focus: "回款",
        mode: "yesno",
        yesKind: "can",
        domain: "wealth",
        modeLabel: "成否"
      },
      {
        id: "we-deal",
        label: "这单生意能不能成",
        topicKey: "wealth",
        focus: "成交",
        mode: "yesno",
        yesKind: "can",
        domain: "wealth",
        modeLabel: "成否"
      },
      {
        id: "we-sign",
        label: "合同签不签得下",
        topicKey: "wealth",
        focus: "签约",
        mode: "yesno",
        yesKind: "can",
        domain: "wealth",
        modeLabel: "成否"
      },
      {
        id: "we-breach",
        label: "对方会不会毁约/拖尾款",
        topicKey: "wealth",
        focus: "毁约尾款",
        mode: "yesno",
        yesKind: "occur",
        domain: "wealth",
        modeLabel: "发生",
        negativeEvent: true
      },
      {
        id: "we-partner",
        label: "合伙合不合适",
        topicKey: "wealth",
        focus: "合伙",
        mode: "yesno",
        yesKind: "suit",
        domain: "partner",
        modeLabel: "适合"
      },
      {
        id: "we-lend",
        label: "借出去的钱还不还得回",
        topicKey: "wealth",
        focus: "收回借款",
        mode: "yesno",
        yesKind: "can",
        domain: "wealth",
        modeLabel: "成否"
      },
      {
        id: "we-guarantee",
        label: "适不适合给人担保",
        topicKey: "wealth",
        focus: "担保",
        mode: "yesno",
        yesKind: "suit",
        domain: "wealth",
        modeLabel: "适合"
      },
      {
        id: "we-when",
        label: "什么时候有进账",
        topicKey: "wealth",
        focus: "进账",
        mode: "when",
        whenKind: "day",
        domain: "wealth",
        modeLabel: "日期"
      },
      {
        id: "we-debt",
        label: "这笔债收不收得回",
        topicKey: "wealth",
        focus: "收债",
        mode: "yesno",
        yesKind: "can",
        domain: "wealth",
        modeLabel: "成否"
      },
      {
        id: "we-jx",
        label: "这单生意吉凶",
        topicKey: "wealth",
        focus: "生意",
        mode: "jixiong",
        domain: "wealth",
        modeLabel: "吉凶"
      },
      {
        id: "we-how",
        label: "求财怎么办更好",
        topicKey: "wealth",
        focus: "求财",
        mode: "how",
        domain: "wealth",
        modeLabel: "对策"
      },
      {
        id: "we-outlook",
        label: "财运走势如何",
        topicKey: "wealth",
        focus: "财运",
        mode: "outlook",
        domain: "wealth",
        modeLabel: "走势"
      }
    ]
  },
  {
    key: "invest",
    label: "投资置业",
    tip: "投资、买房买车、卖房、大额出手",
    options: [
      {
        id: "in-ok",
        label: "这笔投资适不适合做",
        topicKey: "wealth",
        focus: "投资",
        mode: "yesno",
        yesKind: "suit",
        domain: "invest",
        modeLabel: "适合"
      },
      {
        id: "in-gain",
        label: "这笔投资能不能赚",
        topicKey: "wealth",
        focus: "投资收益",
        mode: "yesno",
        yesKind: "can",
        domain: "invest",
        modeLabel: "成否"
      },
      {
        id: "in-add",
        label: "适不适合加仓/加码",
        topicKey: "wealth",
        focus: "加仓",
        mode: "yesno",
        yesKind: "suit",
        domain: "invest",
        modeLabel: "适合"
      },
      {
        id: "in-cut",
        label: "适不适合减仓/止损",
        topicKey: "wealth",
        focus: "减仓止损",
        mode: "yesno",
        yesKind: "suit",
        domain: "invest",
        modeLabel: "适合"
      },
      {
        id: "in-house",
        label: "这套房适不适合买",
        topicKey: "wealth",
        focus: "买房",
        mode: "yesno",
        yesKind: "suit",
        domain: "property",
        modeLabel: "适合"
      },
      {
        id: "in-sell-house",
        label: "现在卖房利不利",
        topicKey: "wealth",
        focus: "卖房",
        mode: "yesno",
        yesKind: "suit",
        domain: "property",
        modeLabel: "适合"
      },
      {
        id: "in-rent-out",
        label: "租金收不收得到",
        topicKey: "wealth",
        focus: "收租",
        mode: "yesno",
        yesKind: "can",
        domain: "property",
        modeLabel: "成否"
      },
      {
        id: "in-car",
        label: "这辆车适不适合买",
        topicKey: "wealth",
        focus: "买车",
        mode: "yesno",
        yesKind: "suit",
        domain: "property",
        modeLabel: "适合"
      },
      {
        id: "in-sell",
        label: "现在卖出利不利",
        topicKey: "wealth",
        focus: "卖出",
        mode: "yesno",
        yesKind: "suit",
        domain: "property",
        modeLabel: "适合"
      },
      {
        id: "in-when",
        label: "什么时候适合出手",
        topicKey: "wealth",
        focus: "出手",
        mode: "when",
        whenKind: "day",
        domain: "invest",
        modeLabel: "日期"
      },
      {
        id: "in-jx",
        label: "这笔买卖吉凶",
        topicKey: "wealth",
        focus: "买卖",
        mode: "jixiong",
        domain: "invest",
        modeLabel: "吉凶"
      },
      {
        id: "in-how",
        label: "投资上怎么办",
        topicKey: "wealth",
        focus: "投资",
        mode: "how",
        domain: "invest",
        modeLabel: "对策"
      }
    ]
  },
  {
    key: "health",
    label: "健康疾病",
    tip: "病情、就医、调养、手术",
    options: [
      {
        id: "he-ok",
        label: "身体会不会好转",
        topicKey: "health",
        focus: "好转",
        mode: "yesno",
        yesKind: "can",
        domain: "health",
        modeLabel: "成否"
      },
      {
        id: "he-deg",
        label: "这病严不严重",
        topicKey: "health",
        focus: "病情",
        mode: "degree",
        domain: "health",
        modeLabel: "轻重"
      },
      {
        id: "he-when",
        label: "什么时候能好",
        topicKey: "health",
        focus: "病好",
        mode: "when",
        whenKind: "day",
        domain: "health",
        modeLabel: "日期"
      },
      {
        id: "he-op",
        label: "适不适合做手术",
        topicKey: "health",
        focus: "手术",
        mode: "yesno",
        yesKind: "suit",
        domain: "health",
        modeLabel: "适合"
      },
      {
        id: "he-doc",
        label: "这次就医顺不顺",
        topicKey: "health",
        focus: "就医",
        mode: "jixiong",
        domain: "health",
        modeLabel: "吉凶"
      },
      {
        id: "he-recheck",
        label: "复查结果会不会好转",
        topicKey: "health",
        focus: "复查",
        mode: "yesno",
        yesKind: "can",
        domain: "health",
        modeLabel: "成否"
      },
      {
        id: "he-check",
        label: "体检有没有大问题",
        topicKey: "health",
        focus: "体检异常",
        mode: "yesno",
        yesKind: "have",
        domain: "health",
        modeLabel: "有无",
        negativeEvent: true
      },
      {
        id: "he-chronic",
        label: "慢性病会不会反复",
        topicKey: "health",
        focus: "病情反复",
        mode: "yesno",
        yesKind: "occur",
        domain: "health",
        modeLabel: "发生",
        negativeEvent: true
      },
      {
        id: "he-how",
        label: "调养怎么办",
        topicKey: "health",
        focus: "调养",
        mode: "how",
        domain: "health",
        modeLabel: "对策"
      },
      {
        id: "he-jx",
        label: "当前健康吉凶",
        topicKey: "health",
        focus: "健康",
        mode: "jixiong",
        domain: "health",
        modeLabel: "吉凶"
      }
    ]
  },
  {
    key: "travel",
    label: "出行往来",
    tip: "出门、出差、远行、归期、出境",
    options: [
      {
        id: "tr-go",
        label: "适不适合出行",
        topicKey: "travel",
        focus: "出行",
        mode: "yesno",
        yesKind: "suit",
        domain: "travel",
        modeLabel: "适合"
      },
      {
        id: "tr-jx",
        label: "此行吉凶如何",
        topicKey: "travel",
        focus: "此行",
        mode: "jixiong",
        domain: "travel",
        modeLabel: "吉凶"
      },
      {
        id: "tr-when",
        label: "什么时候适合出门",
        topicKey: "travel",
        focus: "出门",
        mode: "when",
        whenKind: "day",
        domain: "travel",
        modeLabel: "日期"
      },
      {
        id: "tr-dir",
        label: "往哪个方向更顺",
        topicKey: "travel",
        focus: "出行方向",
        mode: "where",
        domain: "travel",
        modeLabel: "方位"
      },
      {
        id: "tr-abroad",
        label: "出境/出国顺不顺",
        topicKey: "travel",
        focus: "出境",
        mode: "jixiong",
        domain: "travel",
        modeLabel: "吉凶"
      },
      {
        id: "tr-back",
        label: "他/她回不回得来",
        topicKey: "travel",
        focus: "归来",
        mode: "yesno",
        yesKind: "can",
        domain: "arrival",
        modeLabel: "成否"
      },
      {
        id: "tr-arrive-day",
        label: "什么时候能到",
        topicKey: "travel",
        focus: "到达",
        mode: "when",
        whenKind: "day",
        domain: "arrival",
        modeLabel: "日期"
      },
      {
        id: "tr-arrive-clock",
        label: "大概几点能到",
        topicKey: "travel",
        focus: "到达",
        mode: "when",
        whenKind: "clock",
        domain: "arrival",
        modeLabel: "时刻"
      },
      {
        id: "tr-smooth",
        label: "一路顺不顺利",
        topicKey: "travel",
        focus: "路途",
        mode: "jixiong",
        domain: "travel",
        modeLabel: "吉凶"
      },
      {
        id: "tr-flight",
        label: "航班/车次顺不顺",
        topicKey: "travel",
        focus: "行程",
        mode: "jixiong",
        domain: "travel",
        modeLabel: "吉凶"
      }
    ]
  },
  {
    key: "social",
    label: "人际往来",
    tip: "来客、约见、来电、应酬、人情",
    options: [
      {
        id: "so-visit",
        label: "有没有客人来",
        topicKey: "travel",
        focus: "客人",
        mode: "yesno",
        yesKind: "occur",
        domain: "visit",
        modeLabel: "发生"
      },
      {
        id: "so-who",
        label: "会是什么人来",
        topicKey: "travel",
        focus: "来客",
        mode: "who",
        domain: "visit",
        modeLabel: "人物"
      },
      {
        id: "so-when",
        label: "客人什么时候来",
        topicKey: "travel",
        focus: "客人来",
        mode: "when",
        whenKind: "day",
        domain: "visit",
        modeLabel: "日期"
      },
      {
        id: "so-clock",
        label: "客人大概几点到",
        topicKey: "travel",
        focus: "客人到",
        mode: "when",
        whenKind: "clock",
        domain: "visit",
        modeLabel: "时刻"
      },
      {
        id: "so-meet",
        label: "宜不宜见客/见对方",
        topicKey: "travel",
        focus: "见客",
        mode: "yesno",
        yesKind: "should",
        domain: "meeting",
        modeLabel: "宜否"
      },
      {
        id: "so-seek",
        label: "有没有人来找我",
        topicKey: "travel",
        focus: "人来找",
        mode: "yesno",
        yesKind: "occur",
        domain: "seek",
        modeLabel: "发生"
      },
      {
        id: "so-call",
        label: "会不会有重要来电",
        topicKey: "travel",
        focus: "重要来电",
        mode: "yesno",
        yesKind: "occur",
        domain: "message",
        modeLabel: "发生"
      },
      {
        id: "so-date",
        label: "这次约见能不能成",
        topicKey: "travel",
        focus: "约见",
        mode: "yesno",
        yesKind: "can",
        domain: "meeting",
        modeLabel: "成否"
      },
      {
        id: "so-help",
        label: "求人能不能帮得上",
        topicKey: "general",
        focus: "求人",
        mode: "yesno",
        yesKind: "can",
        domain: "social",
        modeLabel: "成否"
      },
      {
        id: "so-gift",
        label: "这次送礼/人情适不适合",
        topicKey: "general",
        focus: "人情送礼",
        mode: "yesno",
        yesKind: "suit",
        domain: "social",
        modeLabel: "适合"
      },
      {
        id: "so-rift",
        label: "这段关系会不会决裂",
        topicKey: "general",
        focus: "关系决裂",
        mode: "yesno",
        yesKind: "occur",
        domain: "social",
        modeLabel: "发生",
        negativeEvent: true
      },
      {
        id: "so-jx",
        label: "这场应酬吉凶",
        topicKey: "travel",
        focus: "应酬",
        mode: "jixiong",
        domain: "social",
        modeLabel: "吉凶"
      }
    ]
  },
  {
    key: "delivery",
    label: "物流送达",
    tip: "快递、外卖、到货、清关",
    options: [
      {
        id: "dl-ok",
        label: "快递能不能到",
        topicKey: "travel",
        focus: "快递",
        mode: "yesno",
        yesKind: "occur",
        domain: "delivery",
        modeLabel: "发生"
      },
      {
        id: "dl-when",
        label: "快递什么时候到",
        topicKey: "travel",
        focus: "快递到",
        mode: "when",
        whenKind: "day",
        domain: "delivery",
        modeLabel: "日期"
      },
      {
        id: "dl-clock",
        label: "快递大概几点到",
        topicKey: "travel",
        focus: "快递到",
        mode: "when",
        whenKind: "clock",
        domain: "delivery",
        modeLabel: "时刻"
      },
      {
        id: "dl-food",
        label: "外卖能不能准时到",
        topicKey: "travel",
        focus: "外卖",
        mode: "yesno",
        yesKind: "occur",
        domain: "delivery",
        modeLabel: "发生"
      },
      {
        id: "dl-customs",
        label: "清关/海关顺不顺",
        topicKey: "travel",
        focus: "清关",
        mode: "jixiong",
        domain: "delivery",
        modeLabel: "吉凶"
      },
      {
        id: "dl-lost",
        label: "包裹会不会丢",
        topicKey: "lost",
        focus: "包裹丢失",
        mode: "yesno",
        yesKind: "occur",
        domain: "delivery",
        modeLabel: "发生",
        negativeEvent: true
      }
    ]
  },
  {
    key: "document",
    label: "文书审批",
    tip: "申请、签证、手续、批复、落户",
    options: [
      {
        id: "do-pass",
        label: "这份申请过不过得了",
        topicKey: "exam",
        focus: "申请过关",
        mode: "yesno",
        yesKind: "can",
        domain: "document",
        modeLabel: "成否"
      },
      {
        id: "do-visa",
        label: "签证/证件办不办得下",
        topicKey: "exam",
        focus: "签证",
        mode: "yesno",
        yesKind: "can",
        domain: "document",
        modeLabel: "成否"
      },
      {
        id: "do-visa-retry",
        label: "签证拒签后再签能不能过",
        topicKey: "exam",
        focus: "再签",
        mode: "yesno",
        yesKind: "can",
        domain: "document",
        modeLabel: "成否"
      },
      {
        id: "do-when",
        label: "手续什么时候能批下来",
        topicKey: "exam",
        focus: "批复",
        mode: "when",
        whenKind: "day",
        domain: "document",
        modeLabel: "日期"
      },
      {
        id: "do-loan",
        label: "贷款批不批得下",
        topicKey: "wealth",
        focus: "贷款审批",
        mode: "yesno",
        yesKind: "can",
        domain: "document",
        modeLabel: "成否"
      },
      {
        id: "do-hukou",
        label: "落户/入学材料过不过得了",
        topicKey: "exam",
        focus: "落户入学",
        mode: "yesno",
        yesKind: "can",
        domain: "document",
        modeLabel: "成否"
      },
      {
        id: "do-claim",
        label: "保险理赔/报销批不批得下",
        topicKey: "wealth",
        focus: "理赔报销",
        mode: "yesno",
        yesKind: "can",
        domain: "document",
        modeLabel: "成否"
      },
      {
        id: "do-how",
        label: "手续怎么办更顺",
        topicKey: "exam",
        focus: "办手续",
        mode: "how",
        domain: "document",
        modeLabel: "对策"
      },
      {
        id: "do-jx",
        label: "这桩文书吉凶",
        topicKey: "exam",
        focus: "文书",
        mode: "jixiong",
        domain: "document",
        modeLabel: "吉凶"
      }
    ]
  },
  {
    key: "home",
    label: "家宅迁居",
    tip: "搬家、租售、装修、开业、居住",
    options: [
      {
        id: "ho-move",
        label: "适不适合搬家",
        topicKey: "travel",
        focus: "搬家",
        mode: "yesno",
        yesKind: "suit",
        domain: "home",
        modeLabel: "适合"
      },
      {
        id: "ho-choice",
        label: "搬还是不搬",
        topicKey: "travel",
        focus: "搬家",
        mode: "choice",
        domain: "home",
        modeLabel: "抉择",
        choice: {
          a: "搬",
          b: "不搬"
        }
      },
      {
        id: "ho-rent",
        label: "这处房子适不适合租",
        topicKey: "wealth",
        focus: "租房",
        mode: "yesno",
        yesKind: "suit",
        domain: "home",
        modeLabel: "适合"
      },
      {
        id: "ho-live",
        label: "住这里安不安",
        topicKey: "general",
        focus: "居住",
        mode: "jixiong",
        domain: "home",
        modeLabel: "吉凶"
      },
      {
        id: "ho-reno",
        label: "适不适合装修/动土",
        topicKey: "general",
        focus: "装修",
        mode: "yesno",
        yesKind: "suit",
        domain: "home",
        modeLabel: "适合"
      },
      {
        id: "ho-open",
        label: "适不适合开业/安床",
        topicKey: "general",
        focus: "开业安床",
        mode: "yesno",
        yesKind: "suit",
        domain: "home",
        modeLabel: "适合"
      },
      {
        id: "ho-neighbor",
        label: "邻里/物业纠纷利不利",
        topicKey: "lawsuit",
        focus: "邻里纠纷",
        mode: "jixiong",
        domain: "home",
        modeLabel: "吉凶"
      },
      {
        id: "ho-when",
        label: "什么时候适合迁居",
        topicKey: "travel",
        focus: "迁居",
        mode: "when",
        whenKind: "day",
        domain: "home",
        modeLabel: "日期"
      },
      {
        id: "ho-how",
        label: "家宅事怎么办",
        topicKey: "general",
        focus: "家宅",
        mode: "how",
        domain: "home",
        modeLabel: "对策"
      }
    ]
  },
  {
    key: "lost",
    label: "失物寻人",
    tip: "丢东西、寻人、宠物、下落",
    options: [
      {
        id: "lo-find",
        label: "丢的东西找不找得到",
        topicKey: "lost",
        focus: "失物",
        mode: "yesno",
        yesKind: "find",
        domain: "lost",
        modeLabel: "寻得"
      },
      {
        id: "lo-where",
        label: "东西丢在哪个方向",
        topicKey: "lost",
        focus: "失物",
        mode: "where",
        domain: "lost",
        modeLabel: "方位"
      },
      {
        id: "lo-when",
        label: "什么时候能找回",
        topicKey: "lost",
        focus: "找回",
        mode: "when",
        whenKind: "day",
        domain: "lost",
        modeLabel: "日期"
      },
      {
        id: "lo-person",
        label: "这个人找不找得到",
        topicKey: "lost",
        focus: "寻人",
        mode: "yesno",
        yesKind: "find",
        domain: "lost",
        modeLabel: "寻得"
      },
      {
        id: "lo-pet",
        label: "宠物找不找得到",
        topicKey: "lost",
        focus: "寻宠物",
        mode: "yesno",
        yesKind: "find",
        domain: "lost",
        modeLabel: "寻得"
      },
      {
        id: "lo-account",
        label: "账号/数据找不找得回",
        topicKey: "lost",
        focus: "找回账号",
        mode: "yesno",
        yesKind: "find",
        domain: "lost",
        modeLabel: "寻得"
      },
      {
        id: "lo-who",
        label: "东西会在什么人手里",
        topicKey: "lost",
        focus: "持物之人",
        mode: "who",
        domain: "lost",
        modeLabel: "人物"
      },
      {
        id: "lo-how",
        label: "寻物怎么办",
        topicKey: "lost",
        focus: "寻物",
        mode: "how",
        domain: "lost",
        modeLabel: "对策"
      }
    ]
  },
  {
    key: "lawsuit",
    label: "官司是非",
    tip: "诉讼、纠纷、口舌、官非、仲裁",
    options: [
      {
        id: "la-win",
        label: "官司能不能赢",
        topicKey: "lawsuit",
        focus: "官司赢",
        mode: "yesno",
        yesKind: "can",
        domain: "lawsuit",
        modeLabel: "成否"
      },
      {
        id: "la-sue",
        label: "要不要起诉/报警",
        topicKey: "lawsuit",
        focus: "起诉",
        mode: "yesno",
        yesKind: "should",
        domain: "lawsuit",
        modeLabel: "宜否"
      },
      {
        id: "la-happen",
        label: "会不会惹上官司/官非",
        topicKey: "lawsuit",
        focus: "官非",
        mode: "yesno",
        yesKind: "occur",
        domain: "lawsuit",
        modeLabel: "发生",
        negativeEvent: true
      },
      {
        id: "la-labor",
        label: "劳动仲裁利不利",
        topicKey: "lawsuit",
        focus: "劳动仲裁",
        mode: "jixiong",
        domain: "lawsuit",
        modeLabel: "吉凶"
      },
      {
        id: "la-divorce",
        label: "离婚诉讼/协议顺不顺",
        topicKey: "lawsuit",
        focus: "离婚纠纷",
        mode: "jixiong",
        domain: "lawsuit",
        modeLabel: "吉凶"
      },
      {
        id: "la-scam",
        label: "会不会被骗/遇诈骗",
        topicKey: "lawsuit",
        focus: "诈骗",
        mode: "yesno",
        yesKind: "occur",
        domain: "lawsuit",
        modeLabel: "发生",
        negativeEvent: true
      },
      {
        id: "la-peace",
        label: "能不能和解",
        topicKey: "lawsuit",
        focus: "和解",
        mode: "yesno",
        yesKind: "can",
        domain: "lawsuit",
        modeLabel: "成否"
      },
      {
        id: "la-gossip",
        label: "会不会有口舌是非",
        topicKey: "lawsuit",
        focus: "口舌",
        mode: "yesno",
        yesKind: "occur",
        domain: "lawsuit",
        modeLabel: "发生",
        negativeEvent: true
      },
      {
        id: "la-jx",
        label: "这场是非吉凶",
        topicKey: "lawsuit",
        focus: "是非",
        mode: "jixiong",
        domain: "lawsuit",
        modeLabel: "吉凶"
      },
      {
        id: "la-how",
        label: "纠纷怎么办",
        topicKey: "lawsuit",
        focus: "纠纷",
        mode: "how",
        domain: "lawsuit",
        modeLabel: "对策"
      }
    ]
  },
  {
    key: "weather",
    label: "天气时令",
    tip: "雨晴、出行天气（卦象示意）",
    options: [
      {
        id: "wx-rain",
        label: "会不会下雨",
        topicKey: "weather_rain",
        focus: "下雨",
        mode: "yesno",
        yesKind: "occur",
        domain: "weather",
        modeLabel: "发生"
      },
      {
        id: "wx-clock",
        label: "大概几点下雨",
        topicKey: "weather_rain",
        focus: "下雨",
        mode: "when",
        whenKind: "clock",
        domain: "weather",
        modeLabel: "时刻"
      },
      {
        id: "wx-stop",
        label: "雨会不会停",
        topicKey: "weather_clear",
        focus: "雨停",
        mode: "yesno",
        yesKind: "occur",
        domain: "weather",
        modeLabel: "发生"
      },
      {
        id: "wx-snow",
        label: "会不会下雪/降温",
        topicKey: "weather_rain",
        focus: "雨雪降温",
        mode: "yesno",
        yesKind: "occur",
        domain: "weather",
        modeLabel: "发生"
      },
      {
        id: "wx-out",
        label: "天气适不适合出门",
        topicKey: "travel",
        focus: "出门",
        mode: "yesno",
        yesKind: "suit",
        domain: "weather",
        modeLabel: "适合"
      }
    ]
  },
  {
    key: "choice",
    label: "抉择进退",
    tip: "二选一、去留、甲乙",
    options: [
      {
        id: "ch-ab",
        label: "选甲还是选乙",
        topicKey: "general",
        focus: "甲还是乙",
        mode: "choice",
        domain: "general",
        modeLabel: "抉择",
        choice: {
          a: "甲",
          b: "乙"
        }
      },
      {
        id: "ch-go-stay",
        label: "去还是留",
        topicKey: "general",
        focus: "去还是留",
        mode: "choice",
        domain: "general",
        modeLabel: "抉择",
        choice: {
          a: "去",
          b: "留"
        }
      },
      {
        id: "ch-do-wait",
        label: "现在做还是再等",
        topicKey: "general",
        focus: "做还是等",
        mode: "choice",
        domain: "general",
        modeLabel: "抉择",
        choice: {
          a: "现在做",
          b: "再等"
        }
      },
      {
        id: "ch-accept",
        label: "接受还是放弃",
        topicKey: "general",
        focus: "接受还是放弃",
        mode: "choice",
        domain: "general",
        modeLabel: "抉择",
        choice: {
          a: "接受",
          b: "放弃"
        }
      },
      {
        id: "ch-cities",
        label: "两城/两地选哪个",
        topicKey: "general",
        focus: "两城选择",
        mode: "choice",
        domain: "general",
        modeLabel: "抉择",
        choice: {
          a: "甲地",
          b: "乙地"
        }
      },
      {
        id: "ch-study-work",
        label: "升学还是工作",
        topicKey: "general",
        focus: "升学还是工作",
        mode: "choice",
        domain: "general",
        modeLabel: "抉择",
        choice: {
          a: "升学",
          b: "工作"
        }
      },
      {
        id: "ch-how",
        label: "眼下怎么选更稳",
        topicKey: "general",
        focus: "抉择",
        mode: "how",
        domain: "general",
        modeLabel: "对策"
      }
    ]
  },
  {
    key: "general",
    label: "综合问事",
    tip: "一事一问、类别难归时用",
    options: [
      {
        id: "g-jx",
        label: "此事吉凶如何",
        topicKey: "general",
        focus: "此事",
        mode: "jixiong",
        domain: "general",
        modeLabel: "吉凶"
      },
      {
        id: "g-can",
        label: "这件事能不能成",
        topicKey: "general",
        focus: "成事",
        mode: "yesno",
        yesKind: "can",
        domain: "general",
        modeLabel: "成否"
      },
      {
        id: "g-should",
        label: "要不要做这件事",
        topicKey: "general",
        focus: "做这件事",
        mode: "yesno",
        yesKind: "should",
        domain: "general",
        modeLabel: "宜否"
      },
      {
        id: "g-suit",
        label: "适不适合做这件事",
        topicKey: "general",
        focus: "做这件事",
        mode: "yesno",
        yesKind: "suit",
        domain: "general",
        modeLabel: "适合"
      },
      {
        id: "g-when",
        label: "什么时候有结果",
        topicKey: "general",
        focus: "结果",
        mode: "when",
        whenKind: "day",
        domain: "general",
        modeLabel: "日期"
      },
      {
        id: "g-who",
        label: "关键的是什么人",
        topicKey: "general",
        focus: "关键之人",
        mode: "who",
        domain: "general",
        modeLabel: "人物"
      },
      {
        id: "g-where",
        label: "事情偏哪个方向",
        topicKey: "general",
        focus: "事体方位",
        mode: "where",
        domain: "general",
        modeLabel: "方位"
      },
      {
        id: "g-how",
        label: "眼下怎么办",
        topicKey: "general",
        focus: "此事",
        mode: "how",
        domain: "general",
        modeLabel: "对策"
      },
      {
        id: "g-outlook",
        label: "整体走势如何",
        topicKey: "general",
        focus: "此事",
        mode: "outlook",
        domain: "general",
        modeLabel: "走势"
      }
    ]
  }
]

function flattenOptions() {
  const list = []
  ASK_GROUPS.forEach((g) => {
    g.options.forEach((o) => {
      list.push(Object.assign({ groupKey: g.key, groupLabel: g.label }, o))
    })
  })
  return list
}

const OPTION_MAP = {}
flattenOptions().forEach((o) => {
  OPTION_MAP[o.id] = o
})

function getOption(id) {
  return OPTION_MAP[id] || null
}

function listGroups() {
  return ASK_GROUPS.map((g) => ({
    key: g.key,
    label: g.label,
    tip: g.tip || '',
    options: g.options.map((o) => ({
      id: o.id,
      label: o.label,
      topicKey: o.topicKey,
      // 一律双列；长文案在格内折行，避免大量通栏「一行一项」
      wide: false
    }))
  }))
}

/**
 * 组装所问文案 + askMeta
 * @param {string} optionId
 * @param {string} [timeKey] 今天/明天/…
 */
function buildAskSelection(optionId, timeKey) {
  const opt = getOption(optionId)
  if (!opt) return null
  const timeHint = TIME_SCOPES.some((t) => t.key === timeKey) ? (timeKey || '') : ''
  const question = timeHint ? `${timeHint}${opt.label}` : opt.label
  const domainLabel = opt.groupLabel || (ASK_GROUPS.find((g) => g.key === opt.groupKey) || {}).label || ''
  const askMeta = {
    optionId: opt.id,
    label: opt.label,
    groupKey: opt.groupKey,
    groupLabel: domainLabel,
    topicKey: opt.topicKey || 'general',
    timeHint,
    parsed: {
      raw: question,
      focus: opt.focus || opt.label,
      event: opt.focus || opt.label,
      mode: opt.mode || 'outlook',
      whenKind: opt.whenKind || '',
      yesKind: opt.yesKind || '',
      answerShape: opt.whenKind === 'clock' ? 'clock' : (opt.yesKind || opt.mode || 'outlook'),
      domain: opt.domain || 'general',
      domainLabel: domainLabel || '综合事务',
      topicHint: opt.topicKey || 'general',
      modes: [opt.mode || 'outlook'],
      timeHint,
      shortAsk: timeHint ? `${timeHint}·${opt.focus || opt.label}` : (opt.focus || opt.label),
      modeLabel: opt.modeLabel || '走势',
      choice: opt.choice || null,
      negativeEvent: !!opt.negativeEvent
    }
  }
  return { question, askMeta, topicKey: opt.topicKey || 'general' }
}

module.exports = {
  TIME_SCOPES,
  ASK_GROUPS,
  listGroups,
  getOption,
  flattenOptions,
  buildAskSelection
}
