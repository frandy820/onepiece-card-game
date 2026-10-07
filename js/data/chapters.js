/* =========================================================
 * 海贼王：伟大航路卡牌对战 — 剧情章节与关卡数据（最终版）
 * 章节严格按原著顺序解锁；每关 = 第一波小弟×2 + 第二波 BOSS+随从
 * BOSS 只在第二波登场一次（不重复复活）
 * reward: 通关必得 / perfectReward: 满血或满积分通关额外 SSS
 * ========================================================= */
'use strict';

const CHAPTERS = [
  {
    id:'ch1', name:'东海·冒险黎明', subtitle:'一切的起点', color:'#2f9e44',
    story:'每个传奇都从一句誓言开始。风车村的男孩戴上了草帽：「我要成为海贼王！」',
    stages: [
      { id:'ch1-1', name:'铁棒亚尔丽塔', boss:'alvida',
        waves:[ ['morgan','coby'], ['alvida','coby'] ],
        enemyHp:40, enemyDeck:['alvida','morgan','coby','hina'], enemyStrategy:'aggro',
        intro:'亚尔丽塔的海贼船袭击了客船，护送可雅出航的时刻到了！',
        reward:{ gold:120, cards:['luffy_gear2'] },
        perfectReward:{ cards:['shanks'] }, scale:0.85 },
      { id:'ch1-2', name:'斧皇·摩根上校', boss:'morgan',
        waves:[ ['coby','hina'], ['morgan','hina'] ],
        enemyHp:45, enemyDeck:['morgan','coby','alvida','hina'], enemyStrategy:'aggro',
        intro:'海军153支部上校「斧皇」摩根挡在处刑台前。',
        reward:{ gold:150, cards:['zoro_tatsumaki'] },
        perfectReward:{ cards:['mihawk'] }, scale:0.88 },
      { id:'ch1-3', name:'小丑巴基', boss:'buggy',
        waves:[ ['alvida','morgan'], ['buggy','mr3_galdino'] ],
        enemyHp:50, enemyDeck:['buggy','alvida','morgan','mr3_galdino'], enemyStrategy:'aggro',
        intro:'「四分五裂」巴基与他的马戏团来了，小心巴基弹！',
        reward:{ gold:180, cards:['nami_clima'] },
        perfectReward:{ cards:['whitebeard'] }, scale:0.90 }
    ]
  },
  {
    id:'ch2', name:'东海·强化月', subtitle:'黑猫与海上餐厅', color:'#40c057',
    story:'可雅的管家是杀人犯？海上餐厅漂来一位不速之客……东海篇的高潮，在巴拉蒂埃拉开帷幕。',
    stages: [
      { id:'ch2-1', name:'百计·克洛', boss:'kuro',
        waves:[ ['buggy','satori'], ['kuro','buggy'] ],
        enemyHp:55, enemyDeck:['kuro','buggy','alvida','satori'], enemyStrategy:'aggro',
        intro:'克洛船长的「杓死」三分钟屠杀计划启动！',
        reward:{ gold:200, cards:['usopp_sogeking'] },
        perfectReward:{ cards:['garp_fist'] }, scale:0.92 },
      { id:'ch2-2', name:'东海霸主·克立德', boss:'don_krieg',
        waves:[ ['hina','smoker_enforcer'], ['don_krieg','smoker_enforcer'] ],
        enemyHp:60, enemyDeck:['don_krieg','kuro','buggy','hina','smoker_enforcer'], enemyStrategy:'control',
        intro:'50 艘舰队的东海霸主克立德，钢铁铠甲与大玛赫炮齐发！',
        reward:{ gold:220, cards:['eq_wado'] },
        perfectReward:{ cards:['law'] }, scale:0.95 },
      { id:'ch2-3', name:'鱼人·阿龙', boss:'arlong',
        waves:[ ['hody','kuro'], ['arlong','hody'] ],
        enemyHp:65, enemyDeck:['arlong','hody','kuro','don_krieg'], enemyStrategy:'aggro',
        intro:'可可西亚村的悲剧不能重演！阿龙帝国的野心在此终结。',
        reward:{ gold:260, cards:['sanji_diable'] },
        perfectReward:{ cards:['luffy_gear5'] }, scale:1.00 }
    ]
  },
  {
    id:'ch3', name:'伟大航路入口·双子岬', subtitle:'逆转的灯塔', color:'#74c0fc',
    story:'翻越颠倒山，库洛卡斯与拉布守着灯塔。真正的考验，从伟大航路的第一道浪开始。',
    stages: [
      { id:'ch3-1', name:'哨戒舰队', boss:'smoker_enforcer',
        waves:[ ['hina','coby'], ['smoker_enforcer','hina'] ],
        enemyHp:70, enemyDeck:['smoker_enforcer','hina','morgan','coby'], enemyStrategy:'control',
        intro:'罗格镇的烟雾拦截！白猎人斯摩格盯上了草帽。',
        reward:{ gold:280, cards:['eq_denden'] },
        perfectReward:{ cards:['dragon'] }, scale:1.02 },
      { id:'ch3-2', name:'巨人决斗（Dorry & Brogy）', boss:'dorry_brogy',
        waves:[ ['morgan','coby'], ['dorry_brogy','morgan'] ],
        enemyHp:80, enemyDeck:['dorry_brogy','smoker_enforcer','hina','morgan'], enemyStrategy:'tanky',
        intro:'小花园的两位巨人战士已决斗 100 年——别站错阵营！',
        reward:{ gold:300, cards:['chopper_monster'] },
        perfectReward:{ cards:['shanks'] }, scale:1.05 }
    ]
  },
  {
    id:'ch4', name:'阿拉巴斯坦·沙漠王国', subtitle:'1-2 争夺战', color:'#e9a23b',
    story:'雨没有落下已经三年。薇薇公主的祖国，正被巴洛克工作社推向内战边缘。',
    stages: [
      { id:'ch4-1', name:'Mr.3 蜡之城', boss:'mr3_galdino',
        waves:[ ['mr2_bon','buggy'], ['mr3_galdino','mr2_bon'] ],
        enemyHp:75, enemyDeck:['mr3_galdino','mr2_bon','buggy','alvida'], enemyStrategy:'turtle',
        intro:'蜡烛冠军服把同伴变成了蜡像！快打碎它！',
        reward:{ gold:320, cards:['eq_dial'] },
        perfectReward:{ cards:['law'] }, scale:1.05 },
      { id:'ch4-2', name:'Mr.1 快斩', boss:'mr1_daz',
        waves:[ ['mr2_bon','mr3_galdino'], ['mr1_daz','mr3_galdino'] ],
        enemyHp:80, enemyDeck:['mr1_daz','mr2_bon','mr3_galdino','kuro'], enemyStrategy:'aggro',
        intro:'快斩果实达兹·波涅——索隆的刀是否足够锋利？',
        reward:{ gold:340, cards:['eq_sandai'] },
        perfectReward:{ cards:['mihawk'] }, scale:1.06 },
      { id:'ch4-3', name:'沙鳄鱼·克洛克达尔', boss:'crocodile',
        waves:[ ['mr1_daz','mr2_bon'], ['crocodile','mr1_daz'] ],
        enemyHp:95, enemyDeck:['crocodile','mr1_daz','mr2_bon','mr3_galdino'], enemyStrategy:'boss',
        intro:'「我是不会被击败的」——沙漠之王在雨葬殿堂等待。',
        reward:{ gold:400, cards:['robin_bloom'] },
        perfectReward:{ cards:['luffy_gear5'] }, scale:1.08 }
    ]
  },
  {
    id:'ch4x', name:'空岛 SKYPIEA', subtitle:'神的领域', color:'#66d9e8',
    story:'被冲上 1 万米高空的岛屿。神·艾尼路与他的「心网」支配着天空。',
    stages: [
      { id:'ch4x-1', name:'神官萨托里', boss:'satori',
        waves:[ ['mr2_bon','buggy'], ['satori','mr2_bon'] ],
        enemyHp:85, enemyDeck:['satori','mr2_bon','mr3_galdino','buggy'], enemyStrategy:'control',
        intro:'森之大悟萨托里的冲击贝与心网试炼！',
        reward:{ gold:360, cards:['eq_logpose'] },
        perfectReward:{ cards:['katakuri'] }, scale:1.10 },
      { id:'ch4x-2', name:'神·艾尼路', boss:'enel',
        waves:[ ['satori','mr1_daz'], ['enel','satori'] ],
        enemyHp:100, enemyDeck:['enel','satori','mr2_bon','mr1_daz'], enemyStrategy:'boss',
        intro:'以雷霆为名的神，在黄金钟前接受橡胶的审判！',
        reward:{ gold:420, cards:['usopp_pop'] },
        perfectReward:{ cards:['luffy_gear5'] }, scale:1.12 }
    ]
  },
  {
    id:'ch5', name:'司法岛 ENIES LOBBY', subtitle:'正义之门', color:'#5c7cfa',
    story:'「罗宾说过想活下去！」冲击世界的屠魔令，在司法岛的正门炸响。',
    stages: [
      { id:'ch5-1', name:'CP9 前卫', boss:'spandam',
        waves:[ ['hina','coby'], ['spandam','lucci'] ],
        enemyHp:95, enemyDeck:['spandam','hina','coby','morgan'], enemyStrategy:'control',
        intro:'CP9 的门卫战——斯潘达姆的正义之剑其实很弱！',
        reward:{ gold:380, cards:['eq_kairoseki'] },
        perfectReward:{ cards:['garp_fist'] }, scale:1.12 },
      { id:'ch5-2', name:'CP9 最强·路奇', boss:'lucci',
        waves:[ ['spandam','hina'], ['lucci','spandam'] ],
        enemyHp:105, enemyDeck:['lucci','spandam','hina','smoker_enforcer'], enemyStrategy:'boss',
        intro:'六王枪 vs 二档！猫猫果实豹形态的路奇挡在命运之塔前。',
        reward:{ gold:450, cards:['franky_shogun'] },
        perfectReward:{ cards:['luffy_gear5'] }, scale:1.14 }
    ]
  },
  {
    id:'ch6', name:'恐怖三桅帆船', subtitle:'影子的坟墓', color:'#9775fa',
    story:'世界上最大的海贼船。影被夺走的噩梦，在浓雾中张开大口。',
    stages: [
      { id:'ch6-1', name:'梦魇·莫利亚', boss:'moriah_boss',
        waves:[ ['absalom','satori'], ['moriah_boss','absalom'] ],
        enemyHp:110, enemyDeck:['moriah_boss','absalom','satori','mr2_bon'], enemyStrategy:'boss',
        intro:'1000 个影子的梦魇——奥兹在咆哮！',
        reward:{ gold:460, cards:['brook_soul'] },
        perfectReward:{ cards:['kaido'] }, scale:1.15 },
      { id:'ch6-2', name:'七武海·暴君熊', boss:'kuma',
        waves:[ ['satori','mr2_bon'], ['kuma','satori'] ],
        enemyHp:115, enemyDeck:['kuma','moriah_boss','lucci','spandam'], enemyStrategy:'tanky',
        intro:'和平主义者的原型。掌心可以把人拍飞到世界尽头……',
        reward:{ gold:480, cards:['eq_rumble'] },
        perfectReward:{ cards:['shanks'] }, scale:1.16 }
    ]
  },
  {
    id:'ch7', name:'推进城 & 顶上战争', subtitle:'英雄的时代', color:'#fa5252',
    story:'为了艾斯，闯入深海大监狱；为了艾斯，直面世界最强。马林梵多的天空被战火染红。',
    stages: [
      { id:'ch7-1', name:'毒王·麦哲伦', boss:'magellan',
        waves:[ ['hannyabal','spandam'], ['magellan','hannyabal'] ],
        enemyHp:102, enemyDeck:['magellan','hannyabal','lucci','spandam'], enemyStrategy:'boss',
        intro:'LEVEL 4 火烧地狱的署长——毒之巨兵凯珊德拉！',
        reward:{ gold:500, cards:['jinbe_karakusa'] },
        perfectReward:{ cards:['blackbeard'] }, scale:1.17 },
      { id:'ch7-2', name:'海军英雄·卡普', boss:'garp_fist',
        waves:[ ['coby','hina'], ['garp_fist','smoker'] ],
        enemyHp:106, enemyDeck:['garp_fist','coby','smoker','hina'], enemyStrategy:'boss',
        intro:'处刑台前的家族对决。铁拳不含水分！',
        reward:{ gold:520, cards:['eq_admiral_coat'] },
        perfectReward:{ cards:['garp_fist'] }, scale:1.18 },
      { id:'ch7-3', name:'元帅·赤犬', boss:'akainu',
        waves:[ ['coby','smoker_enforcer'], ['akainu','coby'] ],
        enemyHp:110, enemyDeck:['coby','hina','smoker_enforcer','garp_fist'], enemyStrategy:'boss',
        intro:'「彻底的正义」燃烧成岩浆——克比的那一刻，你也必须在场。',
        reward:{ gold:560, cards:['aokiji'] },
        perfectReward:{ cards:['whitebeard'] }, scale:1.19 }
    ]
  },
  {
    id:'ch8', name:'鱼人岛', subtitle:'一万米下的约定', color:'#0ca678',
    story:'阳光照进深海。乙姬王妃的梦想与霍迪的仇恨，在鱼人岛的圆顶屋内相撞。',
    stages: [
      { id:'ch8-1', name:'新鱼人海贼团·霍迪', boss:'hody',
        waves:[ ['arlong','smoker_enforcer'], ['hody','arlong'] ],
        enemyHp:112, enemyDeck:['hody','arlong','smoker_enforcer','mr2_bon'], enemyStrategy:'aggro',
        intro:'凶药 E.S. 十连发——复仇的鱼人狂化突进！',
        reward:{ gold:540, cards:['eq_kairoseki_blade'] },
        perfectReward:{ cards:['whitebeard'] }, scale:1.20 },
      { id:'ch8-2', name:'BIG MOM 之声', boss:'bigmom_char',
        waves:[ ['hody','arlong'], ['bigmom_char','arlong'] ],
        enemyHp:116, enemyDeck:['bigmom_char','cracker','hody','arlong'], enemyStrategy:'boss',
        intro:'灵魂之歌响彻海底——BIG MOM 来要债了！',
        reward:{ gold:580, cards:['nami_zeus'] },
        perfectReward:{ cards:['bigmom_char'] }, scale:1.21 }
    ]
  },
  {
    id:'ch9', name:'德雷斯罗萨', subtitle:'玩具之国的悲鸣', color:'#e8590c',
    story:'斗技场的火焰与暗巷的哭泣。明哥的鸟笼正在收紧，卡拉班吉卡的悲剧不能重演。',
    stages: [
      { id:'ch9-1', name:'格斗军团·克力架', boss:'cracker',
        waves:[ ['smoker_enforcer','mr2_bon'], ['cracker','lucci'] ],
        enemyHp:106, enemyDeck:['cracker','lucci','hody','mr2_bon'], enemyStrategy:'boss',
        intro:'无穷无尽的饼干士兵——千军饼干压境！',
        reward:{ gold:600, cards:['eq_thousand_sunny'] },
        perfectReward:{ cards:['doflamingo_boss'] }, scale:1.22 },
      { id:'ch9-2', name:'天夜叉·明哥', boss:'doflamingo_boss',
      waves:[ ['smoker_enforcer','hina'], ['doflamingo_boss','smoker_enforcer'] ],
        enemyHp:120, enemyDeck:['lucci','kuma','magellan','smoker_enforcer'], enemyStrategy:'boss',
        intro:'「神诛杀」降临斗技场——四档 vs 觉醒线控！',
        reward:{ gold:640, cards:['law'] },
        perfectReward:{ cards:['doflamingo_boss'] }, scale:1.23 }
    ]
  },
  {
    id:'ch10', name:'和之国·鬼岛', subtitle:'最终的堡垒', color:'#c92a2a',
    story:'斩龙传说之地。凯多与大蛇的鬼岛，最恶一代迎来世界最大的决战。',
    stages: [
      { id:'ch10-1', name:'飞六胞·猛袭', boss:'katakuri',
      waves:[ ['smoker_enforcer','mr1_daz'], ['katakuri','mr1_daz'] ],
        enemyHp:90, enemyDeck:['katakuri','cracker','lucci','hody'], enemyStrategy:'boss',
        intro:'见闻色未来视——最强甜点将的麻花流星！',
        reward:{ gold:680, cards:['eq_enma'] },
        perfectReward:{ cards:['katakuri'] }, scale:1.05 },
      { id:'ch10-2', name:'最强生物·凯多', boss:'kaido',
      waves:[ ['smoker_enforcer','mr1_daz'], ['kaido','mr2_bon'] ],
        enemyHp:94, enemyDeck:['kaido','katakuri','cracker','magellan'], enemyStrategy:'boss',
        intro:'雷鸣八卦！「活下去的意志」与最强生物对撞！',
        reward:{ gold:760, cards:['zoro_enma'] },
        perfectReward:{ cards:['kaido'] }, scale:1.06 },
      { id:'ch10-3', name:'五档·终局', boss:'luffy_gear5',
      waves:[ ['smoker_enforcer','mr1_daz'], ['kaido','smoker_enforcer'] ],
        enemyHp:98, enemyDeck:['katakuri','cracker','hody','smoker_enforcer'], enemyStrategy:'final',
        intro:'太阳神尼卡觉醒——解放的战士们，最后的舞台是鬼岛之巅！',
        reward:{ gold:900, cards:['luffy_gear5'] },
        perfectReward:{ cards:['luffy_gear5'] }, scale:1.07 }
    ]
  }
];

/* ---------- 章节解锁规则 ---------- */
const CHAPTER_ORDER = ['ch1','ch2','ch3','ch4','ch4x','ch5','ch6','ch7','ch8','ch9','ch10'];

function stageList() {
  const list = [];
  CHAPTER_ORDER.forEach(cid => {
    const ch = CHAPTERS.find(c => c.id === cid);
    ch.stages.forEach(s => list.push({ chapter: ch, stage: s }));
  });
  return list;
}

function getStage(stageId){ return stageList().find(x => x.stage.id === stageId) || null; }
function nextStage(stageId) {
  const list = stageList(); const i = list.findIndex(x => x.stage.id === stageId);
  if (i < 0 || i >= list.length - 1) return null;
  return list[i + 1];
}

/* 抽卡概率（普通池 / 高级池） */
const GACHA = {
  basic: { cost: 200, rates: { N:0.50, R:0.32, SR:0.14, SSR:0.035, SSS:0.005 }, pool:'normal' },
  premium: { cost: 520, costCurrency:'berry', rates: { N:0.28, R:0.36, SR:0.24, SSR:0.10, SSS:0.02 }, pool:'premium' }
};

/* 商店定价 */
const SHOP = {
  eq_enma_price: 2000,
  eq_strawhat_item_price: 1800
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CHAPTERS, CHAPTER_ORDER, stageList, getStage, nextStage, GACHA, SHOP };
}
