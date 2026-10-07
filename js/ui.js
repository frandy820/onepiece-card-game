/* =========================================================
 * 海贼王：伟大航路卡牌对战 — UI 控制器
 * 依赖：cards.js / chapters.js / engine.js / ai.js / save.js / assets.js
 * 全部通过 window.* 全局共享（经典 script，无构建）
 * ========================================================= */
'use strict';

/* ---------- 全局状态 ---------- */
const G = {
  save: null,            // 存档数据
  battle: null,          // 当前战斗（可序列化）
  battleMeta: null,      // 战斗元信息（stageId 等）
  picking: null,         // 选目标状态 {mode:'attack'|'skill'|'equip', unitUid, handIdx}
  selectedHand: -1,      // 手牌选中
  aiRunning: false,
  collectionFilter: 'all',
};

const E = createEngine({ cards: { getCard: window.getCard, TOKEN_CARDS: window.TOKEN_CARDS, isCharCard: window.isCharCard, isEquipCard: window.isEquipCard } });
const AI = createAI(window.getCard);
const SAVE = createSaveSystem(window.localStorage);
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

function toast(msg, ms) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), ms || 1800);
}
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

/* ---------- 屏幕路由 ---------- */
function show(screenId) {
  $$('.screen').forEach(s => s.classList.remove('active'));
  $('#' + screenId).classList.add('active');
}

/* ---------- 卡面 ---------- */
function artOf(cardId) {
  const c = getCard(cardId);
  if (!c) return '';
  return cardArtURI(c, (FACTIONS[c.faction] || {}).color, (RARITY[c.rarity] || {}).color);
}

/* =========================================================
 * 主菜单
 * ========================================================= */
function renderHome() {
  $('#home-gold').textContent = `฿ ${G.save.gold} · 金币 ${G.save.gold}`;
  const cont = $('#battle-resume');
  if (G.save.ongoing) cont.style.display = '';
  else cont.style.display = 'none';
}

/* =========================================================
 * 冒险模式：章节列表
 * ========================================================= */
function chapterUnlocked(idx) {
  if (idx === 0) return true;
  const prev = CHAPTERS[CHAPTER_ORDER[idx - 1]] || CHAPTER_ORDER[idx - 1];
  const prevCh = CHAPTERS.find(c => c.id === CHAPTER_ORDER[idx - 1]);
  if (!prevCh) return false;
  return prevCh.stages.every(s => G.save.progress.clearedStages[s.id]);
}
function stageUnlocked(stage) {
  const list = stageList();
  const idx = list.findIndex(x => x.stage.id === stage.id);
  if (idx <= 0) return true;
  return !!G.save.progress.clearedStages[list[idx - 1].stage.id];
}

function renderAdventure() {
  const box = $('#chapter-list'); box.innerHTML = '';
  CHAPTER_ORDER.forEach((cid, i) => {
    const ch = CHAPTERS.find(c => c.id === cid);
    const unlocked = chapterUnlocked(i);
    const cleared = ch.stages.filter(s => G.save.progress.clearedStages[s.id]).length;
    const el = document.createElement('div');
    el.className = 'chapter-card' + (unlocked ? '' : ' locked');
    el.innerHTML = `
      <div class="ch-name"><span class="no">${String(i + 1).padStart(2, '0')}</span>${esc(ch.name)}</div>
      <div class="ch-sub">${esc(ch.subtitle)} · ${cleared}/${ch.stages.length} 关</div>
      <div class="ch-story">${esc(ch.story)}</div>
      <div class="stage-list"></div>`;
    const slist = el.querySelector('.stage-list');
    ch.stages.forEach(st => {
      const un = stageUnlocked(st);
      const stars = G.save.progress.stars[st.id] || 0;
      const row = document.createElement('div');
      row.className = 'stage-row' + (un ? '' : ' locked');
      row.innerHTML = `
        <div style="flex:1">
          <div class="st-name">${stars === 2 ? '⭐⭐' : stars === 1 ? '⭐' : ''} ${esc(st.name)}</div>
          <div class="st-info">BOSS ${esc(getCard(st.boss).name)}${st.perfectReward ? ' · 完美通关送 SSS' : ''}</div>
        </div>
        <button class="btn small red go" ${un ? '' : 'disabled'}>出战</button>`;
      row.querySelector('.go').onclick = () => openStageBrief(st, ch);
      slist.appendChild(row);
    });
    box.appendChild(el);
  });
  show('screen-adventure');
}

/* ---------- 关卡简报 ---------- */
function openStageBrief(st, ch) {
  const boss = getCard(st.boss);
  const m = $('#modal');
  m.innerHTML = `
    <div class="modal">
      <h3>🏴‍☠️ ${esc(st.name)}</h3>
      <div class="m-body">
        <p style="margin-bottom:8px">${esc(st.intro)}</p>
        <table class="rich-table" style="width:100%;font-size:12px">
          <tr><td>敌方船长 HP</td><td style="text-align:right">${st.enemyHp}</td></tr>
          <tr><td>波次</td><td style="text-align:right">${st.waves.length} 波</td></tr>
          <tr><td>通关奖励</td><td style="text-align:right">${(st.reward.cards || []).map(c => esc(getCard(c).name)).join('、')} + ${st.reward.gold} 金币</td></tr>
          ${st.perfectReward ? `<tr><td>完美奖励</td><td style="text-align:right;color:#a53406;font-weight:800">SSS·${st.perfectReward.cards.map(c => esc(getCard(c).name)).join('、')}</td></tr>` : ''}
        </table>
        <p style="font-size:11px;color:#6b5233;margin-top:8px">完美通关 = 满血通关 或 积分达标（尽量少损血、快速击败、多保留伙伴）</p>
      </div>
      <div class="m-actions">
        <button class="btn ghost" id="mb-close">返回</button>
        <button class="btn red" id="mb-go">开始战斗</button>
      </div>
    </div>`;
  m.classList.add('show');
  $('#mb-close').onclick = () => m.classList.remove('show');
  $('#mb-go').onclick = () => { m.classList.remove('show'); startAdventureBattle(st, ch); };
}

/* =========================================================
 * 战斗生命周期
 * ========================================================= */
function startAdventureBattle(st, ch) {
  const deck = G.save.deck.slice();
  if (deck.length < 8) { toast('卡组至少 8 张，请先编辑卡组'); return; }
  G.battleMeta = { type: 'adventure', stageId: st.id, stageName: st.name };
  G.battle = E.createBattle({
    mode: 'adventure',
    pDeck: deck, pCaptainHp: 100,
    stage: Object.assign({}, st, { perfectScore: 150 })
  });
  G.battle.stageScale = st.scale || 1;
  /* 应用 scale 到已生成的首波（createBattle 内 spawnWave 使用默认 1） */
  G.battle.sides.e.field.forEach(u => {
    const c = getCard(u.cardId);
    const s = st.scale || 1;
    u.atk = Math.round(c.atk * s); u.def = Math.round(c.def * s);
    u.hp = Math.round(c.hp * s); u.maxHp = Math.round(c.hp * s);
  });
  E.startTurn(G.battle, 'p');
  SAVE.saveOngoing(G.save, G.battle, G.battleMeta);
  renderBattle(); show('screen-battle');
}

function resumeBattle() {
  if (!G.save.ongoing) return;
  const snap = G.save.ongoing.battle;
  if (!E.validateBattle(snap)) {
    toast('战斗存档损坏，已清除'); SAVE.clearOngoing(G.save); renderHome(); return;
  }
  G.battle = snap; G.battleMeta = G.save.ongoing.meta;
  renderBattle(); show('screen-battle');
  toast('已恢复中断的战斗', 2200);
  if (G.battle.active === 'e' && G.battle.status === 'running') setTimeout(aiMove, 600);
}

/* ---------- 战斗渲染 ---------- */
function unitHtml(u, side) {
  const c = getCard(u.cardId);
  const hpPct = Math.max(0, Math.round(u.hp / u.maxHp * 100));
  const actable = side === 'p' && G.battle.active === 'p' && G.battle.status === 'running' && u.hp > 0;
  const canAtk = actable && E.canAttack(G.battle, 'p', u.uid);
  const canSkl = actable && E.canUseSkill(G.battle, 'p', u.uid);
  const badges = [];
  if (u.shield > 0) badges.push(`<span class="u-badge">🛡${u.shield}</span>`);
  if (u.statuses.some(s => s.kind === 'stun' || s.kind === 'freeze' || s.kind === 'bind')) badges.push(`<span class="u-badge">眩晕</span>`);
  if (u.statuses.some(s => s.kind === 'burn')) badges.push(`<span class="u-badge">灼烧</span>`);
  if (u.statuses.some(s => s.kind === 'poison')) badges.push(`<span class="u-badge">中毒</span>`);
  if (u.statuses.some(s => s.kind === 'silence')) badges.push(`<span class="u-badge">封印</span>`);
  return `
  <div class="unit ${side === 'p' ? 'mine' : 'enemy'} ${canAtk || canSkl ? 'actable' : ''}" data-uid="${u.uid}" data-side="${side}">
    <img class="u-art" src="${artOf(u.cardId)}" alt="${esc(u.name)}">
    <div class="u-badges">${badges.join('')}</div>
    ${u.shield > 0 ? `<div class="u-shield">${u.shield}</div>` : ''}
    <div class="u-name">${esc(u.name)}</div>
    <div class="u-stats"><span class="atk">⚔${E.effAtk(G.battle, u)}</span><span>🛡${E.effDef(G.battle, u)}</span></div>
    <div class="u-hpbar"><div class="u-hpfill" style="width:${hpPct}%"></div></div>
    <div class="u-skill ${canSkl ? 'ready' : ''}">${c && c.skill ? (canSkl ? '✨' : '') + esc(c.skill.name) + (u.skillCdLeft > 0 ? ` CD${u.skillCdLeft}` : '') : ''}</div>
    ${u.equips.length ? `<div class="u-eq">${u.equips.map(e => '🗡' + esc(getCard(e).name)).join(' ')}</div>` : ''}
  </div>`;
}

function renderBattle() {
  const B = G.battle; if (!B) return;
  $('#b-stage-name').textContent = (G.battleMeta && G.battleMeta.stageName) || '对战';
  $('#b-wave-tag').textContent = B.mode === 'adventure' ? `第 ${B.waveIndex + 1}/${B.waves.length} 波` : `${B.sides.e.name}`;
  /* HP */
  const p = B.sides.p.captain, e = B.sides.e.captain;
  $('#hp-p .hp-fill').style.width = Math.max(0, p.hp / p.maxHp * 100) + '%';
  $('#hp-e .hp-fill').style.width = Math.max(0, e.hp / e.maxHp * 100) + '%';
  $('#hp-p .hp-label').innerHTML = `<span>🏴‍☠️ 我方船长</span><span>${Math.max(0, p.hp)}/${p.maxHp}</span>`;
  $('#hp-e .hp-label').innerHTML = `<span>👹 敌方船长</span><span>${Math.max(0, e.hp)}/${e.maxHp}</span>`;
  $('#hp-p').classList.toggle('critical', p.hp / p.maxHp < 0.3);
  $('#hp-e').classList.toggle('critical', e.hp / e.maxHp < 0.3);
  /* 场上单位 */
  $('#field-e').innerHTML = E.alive(B, 'e').map(u => unitHtml(u, 'e')).join('') || '<div class="field-label" style="opacity:.5">（暂无敌人）</div>';
  $('#field-p').innerHTML = E.alive(B, 'p').map(u => unitHtml(u, 'p')).join('') || '<div class="field-label" style="opacity:.5">（场上没有伙伴，从手牌召唤）</div>';
  /* 手牌 */
  const S = B.sides.p;
  $('#hand').innerHTML = S.hand.map((cid, i) => {
    const c = getCard(cid);
    const playable = E.canSummon(B, 'p', i) || (isEquipCard(c) && E.alive(B, 'p').some(u => E.canEquip(B, 'p', i, u.uid)));
    return `<div class="hcard ${playable ? 'playable' : ''} ${G.selectedHand === i ? 'selected' : ''}" data-i="${i}">
      <div class="h-cost">${c.cost}</div>
      <div class="h-rar" style="background:${(RARITY[c.rarity] || {}).color}">${c.rarity}</div>
      <img class="h-art" src="${artOf(cid)}" alt="">
      <div class="h-name">${esc(c.name)}</div>
      <div class="h-info">${isEquipCard(c) ? c.kind === 'weapon' ? '🗡 武器' : c.kind === 'armor' ? '🛡 防具' : '💎 饰品' : `⚔${c.atk} 🛡${c.def} ♥${c.hp}`}</div>
    </div>`;
  }).join('') || '<div style="color:#5f7ba6;font-size:12px;padding:8px">手牌为空，回合开始时抽牌</div>';
  /* 能量 */
  $('#energy').innerHTML = Array.from({ length: 10 }, (_, i) => `<div class="orb ${i < S.energy ? 'on' : ''}"></div>`).join('');
  $('#turn-btn').disabled = B.active !== 'p' || B.status !== 'running';
  $('#turn-btn').textContent = B.status !== 'running' ? '战斗结束' : (B.active === 'p' ? '结束回合 ▶' : '敌方行动中…');
  renderLog();
  bindBattleEvents();
}

function renderLog() {
  const el = $('#b-log');
  const lines = G.battle.log.slice(-40).map(l => `<div><span class="t">T${Math.ceil(l.turn / 2)}</span>${esc(l.text)}</div>`).join('');
  el.innerHTML = lines;
  el.scrollTop = el.scrollHeight;
}

/* ---------- 战斗交互 ---------- */
function clearPicking() {
  G.picking = null; G.selectedHand = -1;
  $$('.unit').forEach(u => u.classList.remove('selected', 'target-pick', 'selectable'));
}
function bindBattleEvents() {
  /* 手牌点击 */
  $$('#hand .hcard').forEach(el => {
    el.onclick = () => {
      const i = +el.dataset.i;
      const cid = G.battle.sides.p.hand[i];
      const c = getCard(cid);
      if (isCharCard(c)) {
        if (E.summon(G.battle, 'p', i)) { autosaveBattle(); renderBattle(); }
        else toast(E.alive(G.battle, 'p').length >= 5 ? '场上最多 5 名伙伴' : `能量不足（需要 ${c.cost}）`);
      } else if (isEquipCard(c)) {
        /* 装备：进入选择友军模式 */
        if (!E.alive(G.battle, 'p').some(u => E.canEquip(G.battle, 'p', i, u.uid))) { toast('能量不足或无可装备目标'); return; }
        G.picking = { mode: 'equip', handIdx: i };
        G.selectedHand = i;
        toast('选择要装备的伙伴');
        $$('#field-p .unit').forEach(u => u.classList.add('selectable'));
      }
    };
    el.oncontextmenu = (ev) => { ev.preventDefault(); showCardDetail(el.dataset.i); };
  });
  /* 场上单位点击 */
  $$('.unit').forEach(el => {
    el.onclick = () => onUnitClick(el.dataset.uid, el.dataset.side);
  });
}
function showCardDetail(handIdx) {
  const cid = G.battle.sides.p.hand[handIdx];
  const c = getCard(cid);
  openCardModal(c);
}
function onUnitClick(uid, side) {
  const B = G.battle;
  if (B.status !== 'running') return;
  /* 装备选择 */
  if (G.picking && G.picking.mode === 'equip' && side === 'p') {
    if (E.equip(B, 'p', G.picking.handIdx, uid)) { toast('装备成功'); clearPicking(); autosaveBattle(); renderBattle(); }
    else toast('该类装备已满或目标无效');
    return;
  }
  /* 技能选目标 */
  if (G.picking && G.picking.mode === 'skill') {
    if (side !== 'e') { toast('请选择敌方目标'); return; }
    if (E.useSkill(B, 'p', G.picking.unitUid, uid)) { clearPicking(); autosaveBattle(); renderBattle(); checkBattleEndUi(); }
    else toast('技能发动失败');
    return;
  }
  /* 攻击选目标 */
  if (G.picking && G.picking.mode === 'attack') {
    if (side !== 'e') { toast('请选择敌方目标'); return; }
    if (E.attack(B, 'p', G.picking.unitUid, uid)) { clearPicking(); autosaveBattle(); renderBattle(); checkBattleEndUi(); }
    else toast('无法攻击该目标');
    return;
  }
  if (side === 'e') {
    /* 查看敌方卡 */
    const u = E.findUnit(B, uid);
    if (u) openCardModal(getCard(u.cardId), u);
    return;
  }
  /* 我方单位：弹出行动选择 */
  const u = E.findUnit(B, uid);
  if (!u || u.hp <= 0 || B.active !== 'p') return;
  const canAtk = E.canAttack(B, 'p', uid);
  const canSkl = E.canUseSkill(B, 'p', uid);
  if (!canAtk && !canSkl) {
    if (u.summonedTurn >= B.turn) toast('刚召唤的伙伴下回合才能行动');
    else if (u.hasAttacked) toast('本回合已行动过');
    else if (u.skillCdLeft > 0) toast(`技能冷却中（${u.skillCdLeft} 回合）`);
    return;
  }
  const m = $('#modal');
  const c = getCard(u.cardId);
  m.innerHTML = `<div class="modal">
    <h3>${esc(u.name)} 的行动</h3>
    <div class="m-body">
      ${c && c.skill ? `<p style="margin-bottom:10px"><b>【${esc(c.skill.name)}】</b>${c.skill.type === 'active' ? '（主动·手动发动）' : '（被动·自动生效）'}<br>${esc(c.skill.desc)}</p>` : ''}
    </div>
    <div class="m-actions" style="justify-content:center">
      ${canAtk ? '<button class="btn red" id="ua-atk">⚔ 攻击</button>' : ''}
      ${canSkl && E.skillNeedsTarget(B, uid) === false ? '<button class="btn blue" id="ua-skl">✨ 发动技能</button>' : ''}
      ${canSkl && E.skillNeedsTarget(B, uid) ? '<button class="btn blue" id="ua-skl-t">✨ 选目标发动</button>' : ''}
      <button class="btn ghost" id="ua-close">取消</button>
    </div>
  </div>`;
  m.classList.add('show');
  $('#ua-close').onclick = () => m.classList.remove('show');
  const atkBtn = $('#ua-atk');
  if (atkBtn) atkBtn.onclick = () => { m.classList.remove('show'); G.picking = { mode: 'attack', unitUid: uid }; toast('选择攻击目标'); $$('#field-e .unit').forEach(el => el.classList.add('target-pick')); };
  const sklBtn = $('#ua-skl');
  if (sklBtn) sklBtn.onclick = () => { m.classList.remove('show'); if (E.useSkill(B, 'p', uid)) { autosaveBattle(); renderBattle(); checkBattleEndUi(); } };
  const sklTBtn = $('#ua-skl-t');
  if (sklTBtn) sklTBtn.onclick = () => { m.classList.remove('show'); G.picking = { mode: 'skill', unitUid: uid }; toast('选择技能目标'); $$('#field-e .unit').forEach(el => el.classList.add('target-pick')); };
}

function autosaveBattle() {
  if (G.battle && G.battle.status === 'running') SAVE.saveOngoing(G.save, G.battle, G.battleMeta);
  else if (G.save.ongoing) SAVE.clearOngoing(G.save);
}

function endPlayerTurn() {
  const B = G.battle;
  if (!B || B.active !== 'p' || B.status !== 'running') return;
  clearPicking();
  E.endTurn(B);
  autosaveBattle();
  renderBattle();
  checkBattleEndUi();
  if (B.status === 'running' && B.active === 'e') setTimeout(aiMove, 500);
}

function aiMove() {
  const B = G.battle;
  if (!B || B.status !== 'running' || B.active !== 'e') return;
  const diff = G.battleMeta && G.battleMeta.type === 'adventure'
    ? (B.difficulty || 'normal')
    : (G.battleMeta && G.battleMeta.difficulty) || 'normal';
  AI.enemyTurn(E, B, diff);
  autosaveBattle();
  renderBattle();
  checkBattleEndUi();
  if (B.status === 'running' && B.active === 'e') setTimeout(aiMove, 500);
}

function checkBattleEndUi() {
  const B = G.battle;
  if (!B || B.status !== 'running') {
    if (G.save.ongoing) SAVE.clearOngoing(G.save);
    setTimeout(() => showBattleResult(B), 700);
  }
}

/* ---------- 战斗结算 ---------- */
function showBattleResult(B) {
  const win = B.winner === 'p';
  const meta = G.battleMeta || {};
  let extraHtml = '';
  if (win && meta.type === 'adventure') {
    const stageObj = getStage(meta.stageId);
    const st = stageObj && stageObj.stage;
    const first = !G.save.progress.clearedStages[st.id];
    G.save.progress.clearedStages[st.id] = true;
    const prevStars = G.save.progress.stars[st.id] || 0;
    const stars = B.perfect ? 2 : 1;
    G.save.progress.stars[st.id] = Math.max(prevStars, stars);
    let gained = [];
    (st.reward.cards || []).forEach(cid => { if (first) { SAVE.addCard(G.save, cid, `通关 ${st.name}`); gained.push(cid); } });
    G.save.gold += st.reward.gold || 0;
    let perfectGained = [];
    if (B.perfect && st.perfectReward) {
      st.perfectReward.cards.forEach(cid => {
        if (!G.save.cards[cid] && (prevStars < 2)) { SAVE.addCard(G.save, cid, `完美通关 ${st.name}`); perfectGained.push(cid); }
        else if (G.save.cards[cid] && prevStars < 2) { SAVE.addCard(G.save, cid, `完美通关 ${st.name}（重复）`); perfectGained.push(cid); }
      });
    }
    G.save.stats.battles++; G.save.stats.wins++; G.save.stats.adventureWins++;
    SAVE.write(G.save);
    const cardBox = (cid) => `<div class="rc"><img src="${artOf(cid)}" alt=""><div class="rn">${esc(getCard(cid).name)}</div><div class="rr" style="color:${(RARITY[getCard(cid).rarity] || {}).color}">${getCard(cid).rarity}</div></div>`;
    extraHtml = `
      <div class="r-sub">积分 ${B.score} · ${B.perfect ? '完美通关！' : '通关（再接再厉冲击完美）'}</div>
      ${gained.length ? `<div class="reward-cards">${gained.map(cardBox).join('')}</div>` : ''}
      ${perfectGained.length ? `<div style="font-size:12px;color:#a53406;font-weight:800;margin:6px 0">🌟 满血/满积分额外奖励 SSS：</div><div class="reward-cards">${perfectGained.map(cardBox).join('')}</div>` : ''}
      <div class="r-sub" style="margin-top:6px">+${st.reward.gold} 金币${first ? ' · 首通掉落新卡' : '（重复通关不再掉卡）'}</div>`;
  } else if (win) {
    G.save.stats.battles++; G.save.stats.wins++;
    const gold = 60 + Math.floor(Math.random() * 40);
    G.save.gold += gold;
    SAVE.write(G.save);
    extraHtml = `<div class="r-sub">对战胜利！+${gold} 金币</div>`;
  } else {
    G.save.stats.battles++;
    SAVE.write(G.save);
    extraHtml = `<div class="r-sub">败北……调整卡组再战一次！</div>`;
  }
  const m = $('#modal');
  m.innerHTML = `<div class="modal reward-pop">
    <div class="r-title">${win ? '🏆 胜 利' : '💀 败 北'}</div>
    ${extraHtml}
    <div class="m-actions" style="justify-content:center">
      ${win && meta.type === 'adventure' && nextStage(meta.stageId) ? '<button class="btn red" id="rb-next">下一关 ▶</button>' : ''}
      <button class="btn ghost" id="rb-close">返回</button>
    </div>
  </div>`;
  m.classList.add('show');
  $('#rb-close').onclick = () => { m.classList.remove('show'); G.battle = null; renderHome(); show('screen-home'); renderAdventure(); };
  const nb = $('#rb-next');
  if (nb) nb.onclick = () => {
    m.classList.remove('show'); G.battle = null;
    const ns = nextStage(meta.stageId);
    const nsCh = CHAPTERS.find(c => c.id === ns.chapter.id);
    startAdventureBattle(ns.stage, nsCh);
  };
}

/* =========================================================
 * 对战模式（AI）
 * ========================================================= */
function renderVersus() {
  show('screen-versus');
}
function startVersusBattle(difficulty) {
  /* 按难度分层的敌方卡池：简单 N/R，普通 R/SR，困难 SSR/SSS */
  const pools = {
    easy: ['alvida','morgan','coby','buggy','kuro','hina','hannyabal','wapol','satori','mr3_galdino','spandam','smoker_enforcer','don_krieg','hody','arlong','mr2_bon'],
    normal: ['smoker','hina','arlong','mr1_daz','mr2_bon','kuro','buggy','don_krieg','satori','wapol','chopper_monster','robin_bloom','usopp_pop','brook_soul','franky_shogun','absalom','hannyabal','enel','moriah_boss','magellan','hody','cracker'],
    hard: ['mihawk','boa_hancock','crocodile','doflamingo','law','kuma','moriah','jinbe_old','aokiji','kizaru','enel','lucci','katakuri','cracker','moriah_boss','magellan','doflamingo_boss','bigmom_char','kaido','blackbeard','akainu','garp_fist']
  };
  const pool = pools[difficulty] || pools.normal;
  const deck = [];
  while (deck.length < 12) deck.push(pool[Math.floor(Math.random() * pool.length)]);
  const hpMap = { easy: 70, normal: 100, hard: 150 };
  const scaleMap = { easy: 0.85, normal: 1.05, hard: 1.25 };
  const wavesMap = {
    easy: [['alvida','morgan'],['buggy','kuro']],
    normal: [['smoker','hina'],['arlong','mr1_daz']],
    hard: [['kaido','blackbeard'],['akainu','garp_fist']]
  };
  G.battleMeta = { type: 'versus', difficulty, stageName: `${difficulty === 'easy' ? '简单' : difficulty === 'hard' ? '困难' : '普通'} AI 对战` };
  const fakeStage = { id: 'vs_' + difficulty, name: 'AI 对手', waves: wavesMap[difficulty], enemyHp: hpMap[difficulty], enemyDeck: deck.slice(), scale: scaleMap[difficulty], strategy: 'boss' };
  G.battle = E.createBattle({ mode: 'ai', pDeck: G.save.deck.slice(), pCaptainHp: 100, stage: fakeStage, difficulty });
  G.battle.stageScale = scaleMap[difficulty];
  G.battle.sides.e.field.forEach(u => {
    const c = getCard(u.cardId); const s = scaleMap[difficulty];
    u.atk = Math.round(c.atk * s); u.def = Math.round(c.def * s); u.hp = Math.round(c.hp * s); u.maxHp = Math.round(c.hp * s);
  });
  E.startTurn(G.battle, 'p');
  SAVE.saveOngoing(G.save, G.battle, G.battleMeta);
  renderBattle(); show('screen-battle');
}

/* =========================================================
 * 收藏图鉴
 * ========================================================= */
function renderCollection() {
  const bar = $('#col-filter'); bar.innerHTML = '';
  const filters = [['all', '全部'], ['char', '人物'], ['equip', '装备'], ['owned', '已拥有'], ['SSS', 'SSS'], ['SSR', 'SSR'], ['SR', 'SR'], ['R', 'R'], ['N', 'N']];
  filters.forEach(([k, label]) => {
    const chip = document.createElement('div');
    chip.className = 'f-chip' + (G.collectionFilter === k ? ' on' : '');
    chip.textContent = label;
    chip.onclick = () => { G.collectionFilter = k; renderCollection(); };
    bar.appendChild(chip);
  });
  const grid = $('#col-grid'); grid.innerHTML = '';
  const all = window.CHARACTER_CARDS.concat(window.EQUIP_CARDS);
  const ownedCount = all.filter(c => G.save.cards[c.id]).length;
  $('#col-count').textContent = `图鉴 ${ownedCount}/${all.length} · SSS ${SAVE.countSSS(G.save)} 张`;
  all.forEach(c => {
    const owned = !!G.save.cards[c.id];
    if (G.collectionFilter === 'char' && isEquipCard(c)) return;
    if (G.collectionFilter === 'equip' && !isEquipCard(c)) return;
    if (G.collectionFilter === 'owned' && !owned) return;
    if (['SSS','SSR','SR','R','N'].includes(G.collectionFilter) && c.rarity !== G.collectionFilter) return;
    const el = document.createElement('div');
    el.className = 'col-card ' + (owned ? 'owned' : 'not-owned');
    el.innerHTML = `<img src="${artOf(c.id)}" alt=""><div class="cn">${esc(c.name)}</div>
      <div class="cr" style="color:${(RARITY[c.rarity] || {}).color}">${c.rarity}${owned ? ' ×' + G.save.cards[c.id] : ' 未获得'}</div>
      ${owned ? `<div class="cc">${G.save.cards[c.id]}</div>` : ''}`;
    el.onclick = () => openCardModal(c);
    grid.appendChild(el);
  });
  show('screen-collection');
}

function openCardModal(c, unit) {
  const m = $('#modal');
  const r = RARITY[c.rarity] || {};
  const f = FACTIONS[c.faction] || {};
  m.innerHTML = `<div class="modal">
    <h3><span class="rich-badge" style="background:${r.color}">${c.rarity}</span> ${esc(c.name)}</h3>
    <img class="card-detail-art" src="${artOf(c.id)}" alt="">
    <div class="m-body">
      ${isEquipCard(c)
        ? `<p><b>${c.kind === 'weapon' ? '🗡 武器' : c.kind === 'armor' ? '🛡 防具' : '💎 饰品'}</b>（${f.name || '通用'}）</p>
           <p style="margin:6px 0">装备加成：${Object.entries(c.bonus).map(([k, v]) => ({atk: '攻击', def: '防御', hp: '生命'}[k] || k) + '+' + v).join('、')}</p>
           <p style="font-size:12px;color:#6b5233">${esc(c.passive || '')}</p>`
        : `<p style="font-size:12px;color:#6b5233">${esc(c.title || '')} · ${f.name || ''}</p>
           <table class="rich-table" style="width:100%;font-size:12.5px;margin:8px 0">
             <tr><td>费用</td><td style="text-align:right">${c.cost}</td></tr>
             <tr><td>攻击 / 防御</td><td style="text-align:right">${unit ? E.effAtk(G.battle, unit) + ' / ' + E.effDef(G.battle, unit) : c.atk + ' / ' + c.def}</td></tr>
             <tr><td>生命</td><td style="text-align:right">${unit ? Math.max(0, unit.hp) + '/' + unit.maxHp : c.hp}</td></tr>
           </table>
           ${c.skill ? `<p><b>【${esc(c.skill.name)}】</b>${c.skill.type === 'active' ? '（主动技能·手动发动）' : '（被动技能·自动生效）'}<br>${esc(c.skill.desc)}</p>
           ${c.skill.type === 'active' ? `<p style="font-size:11px;color:#6b5233">耗能 ${c.skill.energy} · 冷却 ${c.skill.cd} 回合</p>` : ''}` : ''}`}
    </div>
    <div class="m-actions"><button class="btn ghost" id="cd-close">关闭</button></div>
  </div>`;
  m.classList.add('show');
  $('#cd-close').onclick = () => m.classList.remove('show');
}

/* =========================================================
 * 卡组编辑
 * ========================================================= */
function renderDeck() {
  const list = $('#deck-list'); list.innerHTML = '';
  G.save.deck.forEach((cid, i) => {
    const c = getCard(cid);
    const row = document.createElement('div');
    row.className = 'deck-row';
    row.innerHTML = `<img src="${artOf(cid)}" alt=""><div style="flex:1"><div class="dn">${esc(c.name)}</div><div class="di">${isEquipCard(c) ? '装备' : `⚔${c.atk} 🛡${c.def} ♥${c.hp}`} · ${c.rarity}</div></div><div class="rm">✕</div>`;
    row.querySelector('.rm').onclick = () => { G.save.deck.splice(i, 1); SAVE.write(G.save); renderDeck(); };
    list.appendChild(row);
  });
  const charCount = G.save.deck.filter(cid => isCharCard(getCard(cid))).length;
  const eqCount = G.save.deck.length - charCount;
  $('#deck-stats').innerHTML = `<span>卡组 ${G.save.deck.length}/15 张</span><span>人物 ${charCount}</span><span>装备 ${eqCount}</span><span>平均费用 ${(G.save.deck.reduce((s, cid) => s + getCard(cid).cost, 0) / Math.max(1, G.save.deck.length)).toFixed(1)}</span>`;
  /* 可添加列表 */
  const grid = $('#deck-add'); grid.innerHTML = '';
  Object.keys(G.save.cards).forEach(cid => {
    const owned = G.save.cards[cid];
    const inDeck = G.save.deck.filter(x => x === cid).length;
    if (inDeck >= owned || inDeck >= 3) return;
    const c = getCard(cid);
    const el = document.createElement('div');
    el.className = 'col-card owned';
    el.innerHTML = `<img src="${artOf(cid)}" alt=""><div class="cn">${esc(c.name)}</div><div class="cr" style="color:${(RARITY[c.rarity] || {}).color}">+ 加入</div>`;
    el.onclick = () => {
      if (G.save.deck.length >= 15) { toast('卡组已满 15 张'); return; }
      G.save.deck.push(cid); SAVE.write(G.save); renderDeck();
    };
    grid.appendChild(el);
  });
  show('screen-deck');
}

/* =========================================================
 * 商店/抽卡
 * ========================================================= */
function renderShop() {
  $('#shop-gold').textContent = `金币 ${G.save.gold}`;
  show('screen-shop');
}
function doGacha(kind) {
  const conf = kind === 'premium' ? { cost: 520, rates: GACHA.premium.rates, name: '高级召唤' } : { cost: 200, rates: GACHA.basic.rates, name: '普通召唤' };
  if (G.save.gold < conf.cost) { toast('金币不足'); return; }
  G.save.gold -= conf.cost;
  /* 保底：累计 40 次未出 SSR 以上必出 SSR */
  G.save.gacha.pity++;
  let rarity = rollRarity(conf.rates);
  if (G.save.gacha.pity >= 40 && ['SSR', 'SSS'].indexOf(rarity) < 0) { rarity = 'SSR'; G.save.gacha.pity = 0; }
  if (['SSR', 'SSS'].indexOf(rarity) >= 0) G.save.gacha.pity = 0;
  const pool = window.CHARACTER_CARDS.concat(window.EQUIP_CARDS).filter(c => c.rarity === rarity && !['luffy_gear5'].includes(c.id) || (rarity === 'SSS' && ['shanks','whitebeard','mihawk'].includes(c.id)));
  const pick = pool[Math.floor(Math.random() * pool.length)];
  SAVE.addCard(G.save, pick.id, `${conf.name}抽取`);
  if (kind === 'premium') G.save.gacha.premiumCount++; else G.save.gacha.basicCount++;
  SAVE.write(G.save);
  const m = $('#modal');
  m.innerHTML = `<div class="modal reward-pop">
    <div class="r-title">${conf.name}结果</div>
    <div class="reward-cards"><div class="rc" style="animation-delay:.1s"><img src="${artOf(pick.id)}" alt=""><div class="rn">${esc(pick.name)}</div><div class="rr" style="color:${(RARITY[pick.rarity] || {}).color}">${pick.rarity}</div></div></div>
    <div class="m-actions" style="justify-content:center"><button class="btn ghost" id="gc-ok">收下</button></div>
  </div>`;
  m.classList.add('show');
  $('#gc-ok').onclick = () => m.classList.remove('show');
  renderShop();
}
function rollRarity(rates) {
  const r = Math.random();
  let acc = 0;
  const order = ['SSS', 'SSR', 'SR', 'R', 'N'];
  for (const k of order) { acc += rates[k] || 0; if (r < acc) return k; }
  return 'N';
}

/* =========================================================
 * 台账 & 设置
 * ========================================================= */
function renderLedger() {
  const box = $('#ledger-list'); box.innerHTML = '';
  (G.save.ledger || []).slice(0, 60).forEach(item => {
    const c = getCard(item.cardId);
    const d = new Date(item.t);
    const el = document.createElement('div');
    el.className = 'deck-row';
    el.innerHTML = `<div style="flex:1"><div class="dn">${c ? esc(c.name) : esc(item.cardId)} <span style="color:${(RARITY[item.rarity] || {}).color}">${item.rarity}</span></div>
      <div class="di">${d.toLocaleString('zh-CN')} · ${esc(item.note || '')}</div></div>
      <div style="font-size:11px;color:${item.type === 'gain' ? '#51cf66' : '#ff8787'}">${item.type === 'gain' ? '获得' : '消耗'}</div>`;
    box.appendChild(el);
  });
  if (!G.save.ledger.length) box.innerHTML = '<div style="color:#9db8dd;font-size:13px;padding:10px">暂无记录</div>';
  show('screen-ledger');
}

function renderSettings() {
  show('screen-settings');
}

/* ---------- 存档导出/导入 ---------- */
function exportSave() {
  const code = SAVE.exportSave(G.save);
  $('#io-area').value = code;
  $('#io-area').select();
  try { document.execCommand('copy'); toast('已导出并复制到剪贴板'); } catch (e) { toast('已导出，请手动复制'); }
}
function importSave() {
  const code = $('#io-area').value.trim();
  if (!code) { toast('请粘贴存档代码'); return; }
  try {
    const data = SAVE.importSave(code);
    G.save = data; SAVE.write(G.save);
    toast('导入成功'); renderHome(); show('screen-home');
  } catch (e) { toast('存档无效：' + e.message); }
}

/* ---------- 危险操作 ---------- */
function resetSave() {
  if (!confirm('确定重置全部进度？此操作不可恢复！')) return;
  G.save = SAVE.defaultSave(); SAVE.write(G.save);
  toast('已重置'); renderHome(); show('screen-home');
}

/* =========================================================
 * 启动
 * ========================================================= */
function boot() {
  G.save = SAVE.read();
  if (G.save._rolledBack) {
    toast(G.save.stats.battles > 0 ? '检测到存档损坏，已自动回滚到最近备份' : '存档初始化', 2600);
  }
  renderHome();
  /* 首次进入给引导 */
  if (!G.save.stats.battles && !localStorage.getItem('op_tutored')) {
    localStorage.setItem('op_tutored', '1');
    setTimeout(() => toast('欢迎出海！先去【冒险】打第一关吧', 3000), 600);
  }
  /* 绑定导航 */
  $('#nav-adventure').onclick = () => renderAdventure();
  $('#nav-versus').onclick = () => renderVersus();
  $('#nav-deck').onclick = () => renderDeck();
  $('#nav-collection').onclick = () => renderCollection();
  $('#nav-shop').onclick = () => renderShop();
  $('#nav-ledger').onclick = () => renderLedger();
  $('#nav-settings').onclick = () => renderSettings();
  $('#btn-resume').onclick = () => resumeBattle();
  $('#btn-back-home').onclick = () => { renderHome(); show('screen-home'); };
  $$('.back-home').forEach(b => b.onclick = () => { renderHome(); show('screen-home'); });
  $('#turn-btn').onclick = endPlayerTurn;
  $('#btn-flee').onclick = () => {
    if (!confirm('放弃这场战斗并返回？（进度不清除）')) return;
    if (G.save.ongoing) SAVE.clearOngoing(G.save);
    G.battle = null; renderHome(); show('screen-home');
  };
  /* 对战 */
  $('#vs-easy').onclick = () => startVersusBattle('easy');
  $('#vs-normal').onclick = () => startVersusBattle('normal');
  $('#vs-hard').onclick = () => startVersusBattle('hard');
  /* 抽卡 */
  $('#gacha-basic').onclick = () => doGacha('basic');
  $('#gacha-premium').onclick = () => doGacha('premium');
  /* 设置 */
  $('#btn-export').onclick = exportSave;
  $('#btn-import').onclick = importSave;
  $('#btn-reset').onclick = resetSave;
  /* 战斗中切后台自动存档 */
  document.addEventListener('visibilitychange', () => { if (document.hidden) autosaveBattle(); });
  window.addEventListener('pagehide', () => { if (G.battle && G.battle.status === 'running') SAVE.saveOngoing(G.save, G.battle, G.battleMeta); });
  show('screen-home');
}

document.addEventListener('DOMContentLoaded', boot);
