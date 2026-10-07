/* =========================================================
 * AI 对手 — 三档难度 + 冒险模式策略风格
 * easy:   随机决策、不主动用技能
 * normal: 贪心决策、血量<50% 时用技能
 * hard:   评分制决策（击杀优先、集火、技能时机）
 * strategy 风格由关卡数据提供：aggro/control/turtle/boss/summon/tanky
 * ========================================================= */
'use strict';

function createAI(lookup) {

  /* 对一个动作打分；hard 模式加威胁预判 */
  function scoreAction(E, B, action, hardBias) {
    let s = 0;
    const myField = E.alive(B, 'e');
    const opField = E.alive(B, 'p');
    if (action.type === 'summon') {
      s += 10 + action.card.atk * 0.3 + action.card.cost * 1.2; /* 高费大哥优先登场 */
      if (myField.length === 0) s += 15;
    } else if (action.type === 'equip') {
      s += 8;
    } else if (action.type === 'attack') {
      const u = E.findUnit(B, action.unit);
      const t = action.target === 'captain' ? null : E.findUnit(B, action.target);
      if (!t) { s += 20 + u.atk * 0.2; } /* 打脸 */
      else {
        const est = estimateDamage(E, B, u, t);
        if (est >= t.hp) s += 40; /* 击杀 */
        else s += 12 + est * 0.25;
        /* 集火残血 */
        if (t.hp < t.maxHp * 0.4) s += 10;
        /* hard：预判玩家后续威胁，优先杀攻击最高的 */
        if (t._threat == null) t._threat = E.effAtk(B, t);
        if (hardBias && t._threat > 40) s += 8;
      }
    } else if (action.type === 'skill') {
      s += 18;
      const u = E.findUnit(B, action.unit);
      if (u && u.skillName) s += 5;
      if (B.turnsTaken < 4) s -= 8; /* 别太早交技能 */
    }
    return s;
  }

  function estimateDamage(E, B, attacker, target) {
    const raw = E.effAtk(B, attacker);
    const def = E.effDef(B, target);
    return Math.max(1, Math.round(raw * (1 - def / (def + 60))));
  }

  /* 确定性随机：使用战斗状态内的种子（支持刷新恢复后重放一致） */
  function rnd(engine, B) { return engine && engine._internal ? engine._internal.rngNext(B.rng) : Math.random(); }

  /* 列出所有可行动作 */
  function listActions(E, B) {
    const S = B.sides.e;
    const actions = [];
    /* 召唤：冒险模式敌方不扙手牌（兵力由波次脚本控制），对战模式正常使用 */
    if (B.mode !== 'adventure') {
      S.hand.forEach(function (cid, i) {
        const c = cardOf(cid);
        if (c && E.canSummon(B, 'e', i)) actions.push({ type:'summon', handIdx:i, card:c });
      });
    }
    /* 装备 */
    S.hand.forEach(function (cid, i) {
      const c = cardOf(cid);
      if (c && c.kind) {
        E.alive(B, 'e').forEach(function (u) {
          if (E.canEquip(B, 'e', i, u.uid)) actions.push({ type:'equip', handIdx:i, unit:u.uid });
        });
      }
    });
    /* 攻击 */
    E.alive(B, 'e').forEach(function (u) {
      if (E.canAttack(B, 'e', u.uid)) {
        const targets = E.attackTargets(B, 'e');
        targets.forEach(function (tid) {
          actions.push({ type:'attack', unit:u.uid, target:tid });
        });
      }
    });
    /* 技能 */
    E.alive(B, 'e').forEach(function (u) {
      if (E.canUseSkill(B, 'e', u.uid)) {
        if (E.skillNeedsTarget(B, u.uid)) {
          E.alive(B, 'p').forEach(function (t) {
            actions.push({ type:'skill', unit:u.uid, target:t.uid });
          });
        } else {
          actions.push({ type:'skill', unit:u.uid });
        }
      }
    });
    return actions;
  }

  function cardOf(cid) {
    if (lookup) return lookup(cid);
    return (typeof window !== 'undefined' ? window.getCard : global.getCard)(cid);
  }

  /* 冒险模式策略倾向微调 */
  function strategyBias(strategy, action) {
    switch (strategy) {
      case 'aggro': return action.type === 'attack' && action.target === 'captain' ? 12 : 0;
      case 'control': return action.type === 'skill' ? 8 : 0;
      case 'turtle': return action.type === 'summon' ? 6 : (action.type === 'equip' ? 6 : 0);
      case 'boss': return action.type === 'skill' ? 6 : (action.type === 'attack' ? 4 : 0);
      case 'summon': return action.type === 'summon' ? 10 : 0;
      case 'tanky': return action.type === 'equip' ? 8 : 0;
      default: return 0;
    }
  }

  /* 执行一个敌方回合；返回是否做了任何动作 */
  function enemyTurn(E, B, difficulty) {
    if (B.status !== 'running' || B.active !== 'e') return false;
    let acted = false;
    let guard = 0;
    const failed = {}; /* 动作签名→失败标记，避免重复选中失败动作后卡死 */
    while (B.status === 'running' && B.active === 'e' && guard++ < 60) {
      let actions = listActions(E, B).filter(function (a) {
        return !failed[a.type + ':' + (a.unit || '') + ':' + (a.handIdx != null ? a.handIdx : '') + ':' + (a.target || '')];
      });
      if (actions.length === 0) break;
      let choice = null;
      if (difficulty === 'easy') {
        /* 随机，且 40% 概率直接跳过攻击阶段 */
        choice = actions[Math.floor(rnd(E, B) * actions.length)];
        if (choice.type === 'attack' && rnd(E, B) < 0.4) { /* pass */ choice = actions.find(a => a.type !== 'attack') || null; }
        if (choice && choice.type === 'skill' && rnd(E, B) < 0.5) choice = actions.find(a => a.type !== 'skill') || null;
      } else if (difficulty === 'normal') {
        let best = null, bestS = -1;
        actions.forEach(function (a) {
          const s = scoreAction(E, B, a) + strategyBias(B.strategy, a) + rnd(E, B) * 6;          if (s > bestS) { bestS = s; best = a; }
        });
        choice = best;
      } else { /* hard */
        let best = null, bestS = -1;
        actions.forEach(function (a) {
          const s = scoreAction(E, B, a, true) + strategyBias(B.strategy, a) * 1.5 + rnd(E, B) * 3;
          if (s > bestS) { bestS = s; best = a; }
        });
        guard = guard; /* keep looping */
        choice = best;
      }
      if (!choice) break;
      /* 执行 */
      let ok = false;
      if (choice.type === 'summon') ok = !!E.summon(B, 'e', choice.handIdx);
      else if (choice.type === 'equip') ok = E.equip(B, 'e', choice.handIdx, choice.unit);
      else if (choice.type === 'attack') ok = E.attack(B, 'e', choice.unit, choice.target);
      else if (choice.type === 'skill') ok = E.useSkill(B, 'e', choice.unit, choice.target);
      if (!ok) {
        failed[choice.type + ':' + (choice.unit || '') + ':' + (choice.handIdx != null ? choice.handIdx : '') + ':' + (choice.target || '')] = true;
        continue; /* 换次优动作，不中断回合 */
      }
      acted = true;
      if (B.status !== 'running' || B.active !== 'e') break;
    }
    E.endTurn(B);
    return acted;
  }

  return { enemyTurn, listActions, scoreAction };
}

/* 双端导出 */
if (typeof module !== 'undefined' && module.exports) { module.exports = createAI; }
if (typeof window !== 'undefined') { window.createAI = createAI; }
