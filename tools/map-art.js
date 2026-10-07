/* =========================================================
 * 卡面图片接入管线 tools/map-art.js
 * 从 D:\one-piece-cards（官方TCG扫描图）为每张卡挑选最合适的图，
 * 复制为 assets/cards/<cardId>.jpg，并生成 js/data/artmap.js 清单。
 * 规则：精确基础名优先（排除パラレル等变体），其次稀有度对齐。
 * 新图片到位后重跑: node tools/map-art.js
 * ========================================================= */
'use strict';
const fs = require('fs');
const path = require('path');

const GAME_ROOT = path.join(__dirname, '..');
const SRC_ROOT = 'D:\\one-piece-cards';
const INDEX = path.join(SRC_ROOT, '.name-index.json');
const OUT_DIR = path.join(GAME_ROOT, 'assets', 'cards');

/* 卡牌ID → 日文候选名（按优先级） */
const NAME_MAP = {
  /* 草帽团 & 盟友 */
  luffy_gear2: ['モンキー・D・ルフィ', 'ルフィ'],
  luffy_gear5: ['ゴムゴムの巨人', 'ニカ', 'モンキー・D・ルフィ'],
  zoro_tatsumaki: ['ロロノア・ゾロ', 'ゾロ'],
  zoro_enma: ['ゾロ十郎', 'ロロノア・ゾロ'],
  nami_clima: ['ナミ', 'おナミ'],
  nami_zeus: ['おナミ', 'ナミ'],
  usopp_sogeking: ['そげキング', 'ウソップ'],
  usopp_pop: ['ウソップ', 'そげキング'],
  sanji_diable: ['サンジ'],
  chopper_monster: ['トニートニー・チョッパー', 'チョッパー'],
  robin_bloom: ['ニコ・ロビン'],
  franky_shogun: ['フランキー'],
  brook_soul: ['ブルック'],
  jinbe_karakusa: ['ジンベエ'],
  jinbe_old: ['ジンベエ'],
  sabo: ['サボ'],
  law: ['トラファルガー・ロー', 'トラファルガー'],
  /* 四皇 & 传说 */
  whitebeard: ['エドワード・ニューゲート', '白ひげ'],
  shanks: ['シャンクス'],
  kaido: ['カイドウ'],
  bigmom_char: ['シャーロット・リンリン', 'ビッグ・マム', 'BIG・MAM'],
  blackbeard: ['マーシャル・D・ティーチ', 'ティーチ', '黒ひげ'],
  mihawk: ['ジュラキュール・ミホーク', 'ミホーク'],
  dragon: ['モンキー・D・ドラゴン', 'ドラゴン'],
  garp_fist: ['モンキー・D・ガープ', 'ガープ'],
  /* 海军 */
  akainu: ['サカズキ', '赤犬'],
  aokiji: ['クザン', '青雉'],
  kizaru: ['ボルサリーノ', '黄猿'],
  smoker: ['スモーカー'],
  smoker_enforcer: ['スモーカー'],
  hina: ['ヒナ'],
  coby: ['コビー'],
  spandam: ['スパンダム'],
  /* 七武海 & 反派 */
  crocodile: ['クロコダイル'],
  doflamingo: ['ドンキホーテ・ドフラミンゴ', 'ドフラミンゴ'],
  doflamingo_boss: ['ドンキホーテ・ドフラミンゴ', 'ドフラミンゴ'],
  moriah: ['ゲッコー・モリア', 'モリア'],
  moriah_boss: ['ゲッコー・モリア', 'モリア'],
  kuma: ['バーソロミュー・くま', 'くま'],
  boa_hancock: ['ボア・ハンコック', 'ハンコック'],
  lucci: ['ロブ・ルッチ', 'ルッチ'],
  magellan: ['マゼラン'],
  hannyabal: ['ハンニャバル'],
  enel: ['エネル'],
  satori: ['サトリ'],
  katakuri: ['シャーロット・カタクリ', 'カタクリ'],
  cracker: ['シャーロット・クラッカー', 'クラッカー'],
  arlong: ['アーロン'],
  hody: ['ホーディ・ジョーンズ', 'ホーディ'],
  buggy: ['バギー'],
  kuro: ['クロ'],
  don_krieg: ['クリーク'],
  alvida: ['アルビダ'],
  morgan: ['モーガン'],
  mr1_daz: ['Mr.1(ダズ・ボーネス)', 'ダズ・ボーネス', 'Mr.1'],
  mr2_bon: ['Mr.2・ボン・クレー(ベンサム)', 'Mr.2ボン・クレー(ベンサム)', 'ボン・クレー', 'ベンサム'],
  mr3_galdino: ['ギャルディーノ', 'Mr.3', 'ゴールデンウィーク'],
  absalom: ['アブサロム'],
  wapol: ['ワポル'],
  dorry_brogy: ['ドリー', 'ブロギー', 'ドリー&ブロギー'],
};

/* 稀有度对齐：我们的稀有度 → 优先取的TCG稀有度顺序 */
const RARITY_PREF = {
  SSS: ['L', 'SEC', 'SP', 'SR', 'R', 'C'],
  SSR: ['SR', 'SEC', 'SP', 'R', 'L', 'C'],
  SR: ['SR', 'R', 'SP', 'SEC', 'L', 'C'],
  R: ['R', 'C', 'SR'],
  N: ['C', 'R'],
};

const cardsMod = require(path.join(GAME_ROOT, 'js', 'data', 'cards.js'));
const allCards = cardsMod.CARDS || cardsMod.allCards || [];
const idx = JSON.parse(fs.readFileSync(INDEX, 'utf8'));

let cardRarity = {};
allCards.forEach(c => { cardRarity[c.id] = c.rarity || 'N'; });

fs.mkdirSync(OUT_DIR, { recursive: true });
const manifest = {};
const misses = [];
let copied = 0, totalKB = 0;

Object.keys(NAME_MAP).forEach(cid => {
  const wants = NAME_MAP[cid];
  const rarity = cardRarity[cid] || 'N';
  const pref = RARITY_PREF[rarity] || RARITY_PREF.N;
  let chosen = null;
  for (const want of wants) {
    /* 1) 精确基础名（无变体后缀） */
    const exact = (idx[want] || []);
    if (exact.length) {
      exact.sort((a, b) => pref.indexOf(a.rarity) - pref.indexOf(b.rarity));
      chosen = exact[0]; break;
    }
    /* 2) 前缀匹配（基础名+变体），基础版优先，其次稀有度对齐 */
    const keys = Object.keys(idx).filter(k => k.startsWith(want + '(') || k.startsWith(want));
    if (!keys.length) continue;
    keys.sort((a, b) => a.length - b.length);
    let pool = [];
    keys.forEach(k => idx[k].forEach(e => pool.push(e)));
    pool.sort((a, b) => {
      const base = (e) => e.file.indexOf('(' + e.rarity + ' ' + want) >= 0 ? 0 : 1;
      if (base(a) !== base(b)) return base(a) - base(b);
      return pref.indexOf(a.rarity) - pref.indexOf(b.rarity);
    });
    if (pool.length) { chosen = pool[0]; break; }
  }
  if (chosen) {
    const src = path.join(SRC_ROOT, chosen.dir, chosen.file);
    const dst = path.join(OUT_DIR, cid + '.jpg');
    fs.copyFileSync(src, dst);
    manifest[cid] = { src: chosen.dir + '/' + chosen.file, rarity: chosen.rarity };
    copied++;
    totalKB += fs.statSync(dst).size / 1024;
  } else {
    misses.push(cid + ' (' + wants.join('|') + ')');
  }
});

/* 生成 artmap.js */
const ids = Object.keys(manifest).sort();
const artmapJs = `/* 自动生成 by tools/map-art.js — 有真实卡面图的卡牌ID清单（勿手改） */\n'use strict';\nconst REAL_ART_IDS = ${JSON.stringify(ids)};\nif (typeof module !== 'undefined' && module.exports) { module.exports = { REAL_ART_IDS }; }\nif (typeof window !== 'undefined') { window.REAL_ART_IDS = REAL_ART_IDS; }\n`;
fs.writeFileSync(path.join(GAME_ROOT, 'js', 'data', 'artmap.js'), artmapJs, 'utf8');

console.log('copied:', copied, '/', Object.keys(NAME_MAP).length, ' total:', Math.round(totalKB) + 'KB');
if (misses.length) { console.log('--- 未匹配 ---'); misses.forEach(m => console.log('  ' + m)); }
