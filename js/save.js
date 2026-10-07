/* =========================================================
 * 存档系统 — localStorage 主存档 + 双备份 + 台账 + 恢复
 * 结构：SAVE_KEY（主）+ SAVE_KEY_BAK（滚动备份，每 3 次写库备份一次）
 * 台账 ledger: [{t, type, cardId, note}] 上限 200 条
 * ========================================================= */
'use strict';

const SAVE_KEY = 'op_card_game_save_v1';
const SAVE_KEY_BAK = 'op_card_game_save_v1_bak';

function createSaveSystem(storage) {
  const S = storage;

  function defaultSave() {
    return {
      version: 3,
      createdAt: Date.now(),
      playerName: '草帽团船长',
      gold: 300, berry: 60,
      /* 拥有卡：{ [cardId]: count }；cardLv 升级记录 */
      cards: { luffy_gear2:1, zoro_tatsumaki:1, nami_clima:1, usopp_sogeking:1, eq_dial:1 },
      deck: ['luffy_gear2','zoro_tatsumaki','nami_clima','usopp_sogeking','eq_dial','eq_dial','coby','hina'],
      progress: { currentChapter: 0, clearedStages: {}, stars: {} }, /* stars[stageId] = 1 普通 / 2 完美 */
      gacha: { basicCount: 0, premiumCount: 0, pity: 0 },
      ledger: [],
      stats: { battles: 0, wins: 0, adventureWins: 0, sssOwned: 0 },
      settings: { sfxOn: true, animOn: true },
      ongoing: null /* 战斗中存档（刷新恢复） */
    };
  }

  function read() {
    try {
      const raw = S.getItem(SAVE_KEY);
      if (!raw) return migrateOrCreate(null);
      const data = JSON.parse(raw);
      return migrateOrCreate(data);
    } catch (e) {
      /* 主存档损坏 → 尝试备份回滚 */
      try {
        const bak = JSON.parse(S.getItem(SAVE_KEY_BAK));
        if (bak && bak.version) { bak._rolledBack = true; return migrateOrCreate(bak); }
      } catch (e2) { /* 备份也坏 → 重置 */ }
      const fresh = defaultSave();
      fresh._rolledBack = true;
      return fresh;
    }
  }

  function migrateOrCreate(data) {
    const d = data || defaultSave();
    const def = defaultSave();
    /* 字段补齐（老档升级） */
    Object.keys(def).forEach(function (k) { if (d[k] === undefined) d[k] = def[k]; });
    if (!d.progress) d.progress = def.progress;
    if (!d.progress.clearedStages) d.progress.clearedStages = {};
    if (!d.progress.stars) d.progress.stars = {};
    if (!Array.isArray(d.ledger)) d.ledger = [];
    if (!d.stats) d.stats = def.stats;
    if (d.version !== 3) d.version = 3;
    return d;
  }

  let writeCount = 0;
  function write(data) {
    data.updatedAt = Date.now();
    try {
      const prev = S.getItem(SAVE_KEY);
      if (prev) S.setItem(SAVE_KEY_BAK, prev); /* 每次写入前备份上一版 */
      S.setItem(SAVE_KEY, JSON.stringify(data));
      if (!prev) S.setItem(SAVE_KEY_BAK, JSON.stringify(data)); /* 首次写入同步备份，保证回滚点存在 */
      writeCount++;
      return { ok: true };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  }

  /* 获得卡 → 台账 */
  function addCard(data, cardId, note) {
    data.cards[cardId] = (data.cards[cardId] || 0) + 1;
    const c = (typeof getCard === 'function' ? getCard(cardId) : null);
    const r = c && c.rarity ? c.rarity : '?';
    data.ledger.unshift({ t: Date.now(), type: 'gain', cardId, rarity: r, note: note || '' });
    if (data.ledger.length > 200) data.ledger.length = 200;
    if (r === 'SSS') data.stats.sssOwned = countSSS(data);
  }
  function removeCard(data, cardId, note) {
    if (!data.cards[cardId]) return false;
    data.cards[cardId]--;
    if (data.cards[cardId] <= 0) delete data.cards[cardId];
    data.ledger.unshift({ t: Date.now(), type: 'consume', cardId, note: note || '' });
    if (data.ledger.length > 200) data.ledger.length = 200;
    return true;
  }
  function countSSS(data) {
    let n = 0;
    Object.keys(data.cards).forEach(function (cid) {
      const c = typeof getCard === 'function' ? getCard(cid) : null;
      if (c && c.rarity === 'SSS') n += data.cards[cid];
    });
    return n;
  }

  /* 战斗中存档（恢复用） */
  function saveOngoing(data, battleSnapshot, meta) {
    data.ongoing = { battle: battleSnapshot, meta: meta || {}, savedAt: Date.now() };
    write(data);
  }
  function clearOngoing(data) { data.ongoing = null; write(data); }

  /* 导出/导入（Base64 JSON） */
  function exportSave(data) {
    const json = JSON.stringify(data);
    return btoaSafe(unescape(encodeURIComponent(json)));
  }
  function importSave(code) {
    const json = decodeURIComponent(escape(atobSafe(code)));
    const data = JSON.parse(json);
    if (!data.version || !data.cards) throw new Error('存档格式不正确');
    return migrateOrCreate(data);
  }
  function btoaSafe(s) {
    if (typeof btoa === 'function') return btoa(s);
    return Buffer.from(s, 'binary').toString('base64');
  }
  function atobSafe(s) {
    if (typeof atob === 'function') return atob(s);
    return Buffer.from(s, 'base64').toString('binary');
  }

  return { read, write, addCard, removeCard, countSSS, saveOngoing, clearOngoing, exportSave, importSave, defaultSave };
}

/* 双端导出 */
if (typeof module !== 'undefined' && module.exports) { module.exports = createSaveSystem; }
if (typeof window !== 'undefined') { window.createSaveSystem = createSaveSystem; }
