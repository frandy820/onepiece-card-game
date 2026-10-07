/* 共享模拟器：脚本玩家（近似真人操作质量） */
'use strict';
const ROOT = 'C:/Users/MY/.openclaw-autoclaw/agents/agent-eb89nd/workspace/DELIVERY/onepiece-card-game';
const cards = require(ROOT + '/js/data/cards.js');
const createEngine = require(ROOT + '/js/engine/engine.js');
const createAI = require(ROOT + '/js/engine/ai.js');
const E = createEngine({ cards });
const AI = createAI(cards.getCard);

/* 智能脚本玩家策略：
   1. 召唤：能召唤的最高费卡优先（填场面）
   2. 装备：武器给攻击最高、防具给防御最高
   3. 技能：能放就放，单体技能打血最少敌人
   4. 攻击：先杀能击杀的目标，否则打血最少的 */
function playerAction(B) {
  const S = B.sides.p;
  /* 召唤：最高费可负担 */
  let bestI = -1, bestCost = -1;
  for (let i = 0; i < S.hand.length; i++) {
    if (E.canSummon(B, 'p', i)) {
      const c = cards.getCard(S.hand[i]);
      if (c.cost > bestCost) { bestCost = c.cost; bestI = i; }
    }
  }
  if (bestI >= 0) { E.summon(B, 'p', bestI); return true; }
  /* 装备 */
  for (let i = 0; i < S.hand.length; i++) {
    const c = S.hand[i] ? cards.getCard(S.hand[i]) : null;
    if (c && c.kind && c.kind !== 'accessory') {
      const allies = E.alive(B, 'p');
      const cand = c.kind === 'weapon'
        ? allies.slice().sort((a, b) => E.effAtk(B, b) - E.effAtk(B, a))[0]
        : allies.slice().sort((a, b) => E.effDef(B, b) - E.effDef(B, a))[0];
      if (cand && E.canEquip(B, 'p', i, cand.uid)) { E.equip(B, 'p', i, cand.uid); return true; }
    }
  }
  /* 技能：单体技能优先打可击杀/血最少目标 */
  for (const u of E.alive(B, 'p')) {
    if (E.canUseSkill(B, 'p', u.uid)) {
      const enemies = E.alive(B, 'e');
      if (E.skillNeedsTarget(B, u.uid)) {
        if (enemies.length) {
          const t = enemies.slice().sort((a, b) => a.hp - b.hp)[0];
          if (E.useSkill(B, 'p', u.uid, t.uid)) return true;
        }
      } else if (E.useSkill(B, 'p', u.uid)) return true;
    }
  }
  /* 攻击：可击杀 > 血最少 */
  for (const u of E.alive(B, 'p')) {
    if (E.canAttack(B, 'p', u.uid)) {
      const targets = E.attackTargets(B, 'p');
      if (!targets.length) continue;
      if (targets[0] === 'captain') { E.attack(B, 'p', u.uid, 'captain'); return true; }
      const sorted = targets.map(uid => E.findUnit(B, uid)).filter(Boolean).sort((a, b) => a.hp - b.hp);
      const atk = E.effAtk(B, u);
      const kill = sorted.find(t => {
        const def = E.effDef(B, t);
        const est = Math.max(1, Math.round(atk * (1 - def / (def + 60))));
        return est >= t.hp;
      });
      const t = kill || sorted[0];
      if (E.attack(B, 'p', u.uid, t.uid)) return true;
    }
  }
  return false;
}

function simulate(stageCfg, deck, enemyDiff, seed) {
  const B = E.createBattle({
    mode: 'adventure', pDeck: deck.slice(), pCaptainHp: 100,
    stage: stageCfg, seed: seed
  });
  B.stageScale = stageCfg.scale || 1;
  B.sides.e.field.forEach(u => {
    const c = cards.getCard(u.cardId); const s = B.stageScale;
    u.atk = Math.round(c.atk * s); u.def = Math.round(c.def * s);
    u.hp = Math.round(c.hp * s); u.maxHp = Math.round(c.hp * s);
  });
  E.startTurn(B, 'p');
  let guard = 0;
  while (B.status === 'running' && guard++ < 500) {
    if (B.active === 'p') {
      let acted = true;
      while (acted && B.status === 'running' && B.active === 'p') acted = playerAction(B);
      if (B.status === 'running' && B.active === 'p') E.endTurn(B);
    } else AI.enemyTurn(E, B, enemyDiff || 'normal');
  }
  return B;
}

module.exports = { simulate, E, AI, cards };
