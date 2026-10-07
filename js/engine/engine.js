/* =========================================================
 * 海贼王：伟大航路卡牌对战 — 战斗引擎
 * 纯数据驱动：所有状态可 JSON 序列化（支持战斗中刷新恢复）
 * 无 DOM、无闭包状态；Node 单测与浏览器共用同一份逻辑
 * ========================================================= */
'use strict';

function createEngine(D) {
  const { getCard, TOKEN_CARDS, isCharCard, isEquipCard, RARITY } = D.cards;

  /* ---------- 可序列化 RNG ---------- */
  function rngNext(state) {
    state.rngS = (state.rngS + 0x6D2B79F5) | 0;
    let t = state.rngS;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function roll(B, chance) { return rngNext(B.rng) < chance; }
  function pick(B, arr) { return arr[Math.floor(rngNext(B.rng) * arr.length)]; }

  let UID = 1;
  function newUid(B) { return 'u' + (B.uidCounter++); }

  /* ---------- 建单位 ---------- */
  function makeUnit(B, cardId, side, opts) {
    const c = getCard(cardId);
    if (!c) throw new Error('unknown card: ' + cardId);
    const o = opts || {};
    const scale = o.scale || 1;
    const u = {
      uid: newUid(B), cardId, side,
      name: c.name, faction: c.faction, rarity: c.rarity,
      atk: Math.round(c.atk * scale), def: Math.round(c.def * scale),
      hp: Math.round(c.hp * scale), maxHp: Math.round(c.hp * scale),
      shield: 0, equips: [], statuses: [],
      hasAttacked: false, summonedTurn: B.turn, hasRevived: false,
      skillCdLeft: 0, token: !!c.token,
      permAtk: 0, permDef: 0,
    };
    if (c.skill) {
      u.skillId = c.skill.id; u.skillName = c.skill.name; u.skillType = c.skill.type;
      u.skillCdMax = Math.max(1, c.skill.cd || 1);
    }
    return u;
  }

  /* ---------- 数值计算（含光环/装备/buff） ---------- */
  function auraValue(B, unit, stat) {
    let v = 0;
    forSide(B, unit.side, function (ally) {
      if (ally.uid === unit.uid || ally.hp <= 0) return;
      const c = getCard(ally.cardId);
      if (!c || !c.skill || c.skill.type !== 'passive') return;
      (c.skill.effects || []).forEach(function (e) {
        if (e.type === 'aura' && e.stat === stat && e.scope === 'allies') v += e.value;
      });
    });
    return v;
  }
  function equipBonus(unit, stat) {
    let v = 0;
    unit.equips.forEach(function (eqId) {
      const e = getCard(eqId); if (!e || !e.bonus) return;
      v += (e.bonus[stat] || 0);
    });
    return v;
  }
  function hasEquipFlag(unit, flag) {
    return unit.equips.some(function (eqId) { return eqId === flag; });
  }
  function statusSum(unit, kind) {
    let v = 0;
    unit.statuses.forEach(function (s) { if (s.kind === kind) v += (s.value || 0); });
    return v;
  }
  function hasStatus(unit, kind) {
    return unit.statuses.some(function (s) { return s.kind === kind && s.remaining > 0; });
  }
  function effAtk(B, unit) {
    let a = unit.atk + unit.permAtk + equipBonus(unit, 'atk') + auraValue(B, unit, 'atk') + statusSum(unit, 'buffAtk');
    /* 誓约（和道一文字）：HP<30% 攻击+30% */
    if (hasEquipFlag(unit, 'eq_wado') && unit.hp < unit.maxHp * 0.3) a = Math.round(a * 1.3);
    return Math.max(0, a);
  }
  function effDef(B, unit) {
    return Math.max(0, unit.def + unit.permDef + equipBonus(unit, 'def') + auraValue(B, unit, 'def') + statusSum(unit, 'buffDef'));
  }
  function dmgReduce(B, unit) { return auraValue(B, unit, 'dmgReduce'); }
  function ccImmune(B, unit) {
    if (hasEquipFlag(unit, 'eq_admiral_coat')) return true;
    return hasStatus(unit, 'ccImmune');
  }
  function canAct(unit) { return !hasStatus(unit, 'stun') && !hasStatus(unit, 'freeze') && !hasStatus(unit, 'bind'); }
  function silenced(unit) { return hasStatus(unit, 'silence'); }

  /* ---------- 工具 ---------- */
  function forSide(B, side, fn) { B.sides[side].field.forEach(fn); }
  function alive(B, side) { return B.sides[side].field.filter(function (u) { return u.hp > 0; }); }
  function findUnit(B, uid) {
    for (const s of ['p', 'e']) {
      const u = B.sides[s].field.find(function (x) { return x.uid === uid; });
      if (u) return u;
    }
    return null;
  }
  function log(B, text) { B.log.push({ turn: B.turn, text }); if (B.log.length > 200) B.log.splice(0, B.log.length - 200); }

  /* =========================================================
   * 伤害管线
   * opts: { pierce, element, ignoreShield, cannotMiss, lifesteal,
   *         executeBelow, bonusIfDot, backlineBonus, vsHumanBonus,
   *         allyDeathBonus, isSkill, skillRaw }
   * ========================================================= */
  function computeDamage(B, attacker, target, raw, opts) {
    opts = opts || {};
    if (!opts.cannotMiss) {
      const eva = statusSum(target, 'eva');
      if (eva > 0 && roll(B, Math.min(0.6, eva))) { log(B, `☁ ${target.name} 闪避了攻击！`); return { dmg: 0, missed: true }; }
    }
    let base = raw;
    if (opts.bonusIfDot && hasStatus(target, opts.bonusIfDot)) base = Math.round(base * (1 + (opts.bonus || 0.3)));
    /* 装备：海楼石刀对恶魔果实系 +15%（敌方阵营近似判定：boss/七武海/革命军为能力者概率高） */
    if (attacker && hasEquipFlag(attacker, 'eq_kairoseki_blade') && target.faction !== 'marine') base = Math.round(base * 1.15);
    if (opts.allyDeathBonus) {
      const deadAllies = B.sides[attacker.side].graveyard.length;
      base = Math.round(base * (1 + opts.allyDeathBonus * deadAllies));
    }
    const pierce = (opts.pierce || 0) + (attacker && hasEquipFlag(attacker, 'eq_enma') ? 0.3 : 0);
    const defEff = effDef(B, target) * (1 - Math.min(1, pierce));
    let dmg = Math.max(Math.floor(base * 0.15), Math.round(base * (1 - defEff / (defEff + 60))));
    if (attacker) dmg = Math.round(dmg * (1 - dmgReduce(B, target)));
    if (opts.isSkill && attacker && hasEquipFlag(attacker, 'eq_dial')) dmg = Math.round(dmg * 1.15);
    return { dmg: Math.max(1, dmg), missed: false };
  }

  function dealDamage(B, attacker, target, raw, opts, sourceLabel) {
    opts = opts || {};
    const res = computeDamage(B, attacker, target, raw, opts);
    if (res.missed) return res;
    let dmg = res.dmg;
    if (!opts.ignoreShield && target.shield > 0) {
      const absorbed = Math.min(target.shield, dmg);
      target.shield -= absorbed; dmg -= absorbed;
      if (absorbed > 0) log(B, `🛡 ${target.name} 的护盾吸收了 ${absorbed} 点伤害`);
    }
    /* 见闻色预感（克比被动） */
    if (attacker && target.side !== attacker.side) {
      forSide(B, target.side, function (ally) {
        if (dmg <= 0 || ally.hp <= 0) return;
        const c = getCard(ally.cardId);
        if (!c || !c.skill || c.skill.type !== 'passive') return;
        (c.skill.effects || []).forEach(function (e) {
          if (e.type === 'guard' && e.on === 'onAllyAttacked' && roll(B, e.chance) && dmg > 0) {
            const cut = Math.min(dmg, e.reduce);
            dmg -= cut;
            log(B, `👁 ${ally.name} 的见闻色预感为 ${target.name} 减免了 ${cut} 点伤害`);
          }
        });
      });
    }
    /* 桑尼号：保留 1 HP */
    if (dmg >= target.hp && hasEquipFlag(target, 'eq_thousand_sunny') && !target.sunnyUsed) {
      target.sunnyUsed = true; dmg = target.hp - 1;
      log(B, `🚢 桑尼号应急通道启动！${target.name} 以 1 HP 险存`);
    }
    target.hp -= dmg;
    log(B, `${sourceLabel || '💥'} ${target.name} 受到 ${dmg} 点伤害（HP ${Math.max(0, target.hp)}/${target.maxHp}）`);
    /* 秋水反弹 */
    if (attacker && !opts.noCounter && dmg > 0 && hasEquipFlag(target, 'eq_shusui') && roll(B, 0.25)) {
      attacker.hp -= 10;
      log(B, `🗡 ${target.name} 的秋水居合反弹了 10 点伤害给 ${attacker.name}`);
    }
    /* 海楼石手铐束缚攻击者 */
    if (attacker && !opts.noCounter && dmg > 0 && hasEquipFlag(target, 'eq_kairoseki') && roll(B, 0.35) && !ccImmune(B, attacker)) {
      addStatus(B, attacker, { kind: 'bind', remaining: 1 });
      log(B, `⛓ 海楼石手铐束缚了 ${attacker.name}`);
    }
    /* 凯多钢之鳞反伤 */
    const thorns = statusSum(target, 'thorns');
    if (attacker && thorns > 0 && !opts.noCounter) {
      attacker.hp -= thorns;
      log(B, `🐉 ${target.name} 的钢之鳞反弹 ${thorns} 点伤害`);
    }
    if (attacker && opts.lifesteal && dmg > 0) {
      const healV = Math.round(dmg * opts.lifesteal);
      healUnit(B, attacker, healV);
      log(B, `🩸 ${attacker.name} 汲取了 ${healV} 点生命`);
    }
    /* 三代鬼彻剧毒 */
    if (attacker && hasEquipFlag(attacker, 'eq_sandai') && roll(B, 0.2)) {
      addStatus(B, target, { kind: 'poison', value: 6, remaining: 2 });
      log(B, `☠ 妖刀诅咒使 ${target.name} 中毒`);
    }
    checkDeaths(B);
    if (target.hp <= 0) onUnitDeath(B, target, attacker);
    return res;
  }

  function healUnit(B, unit, v) {
    const real = Math.min(unit.maxHp - unit.hp, v);
    if (real > 0) { unit.hp += real; log(B, `💚 ${unit.name} 回复了 ${real} 点 HP`); }
  }

  function addStatus(B, unit, s) {
    /* 同类控制不叠加，刷新时长 */
    const ctrl = ['stun', 'freeze', 'bind', 'silence'];
    if (ctrl.indexOf(s.kind) >= 0 && ccImmune(B, unit)) { log(B, `✨ ${unit.name} 免疫控制`); return; }
    const exist = unit.statuses.find(function (x) { return x.kind === s.kind && (x.tag || '') === (s.tag || ''); });
    if (exist) { exist.remaining = Math.max(exist.remaining, s.remaining); if (s.value) exist.value = Math.max(exist.value || 0, s.value); }
    else unit.statuses.push(Object.assign({}, s));
  }

  /* =========================================================
   * 效果执行器（技能 DSL）
   * ========================================================= */
  function resolveTarget(B, side, actor, spec, chosenUid) {
    const enemySide = side === 'p' ? 'e' : 'p';
    const enemies = alive(B, enemySide);
    const allies = alive(B, side);
    switch (spec) {
      case 'enemy': return chosenUid ? findUnit(B, chosenUid) : (enemies[0] || null);
      case 'enemyAll': return 'ALL:' + enemySide;
      case 'self': return actor;
      case 'allyAll': return 'ALL:' + side;
      case 'enemyMaxAtk': return enemies.slice().sort(function (a, b) { return effAtk(B, b) - effAtk(B, a); })[0] || null;
      case 'enemyMaxEnergy': return enemies[0] || null; /* 近似：先手单位 */
      default: return chosenUid ? findUnit(B, chosenUid) : null;
    }
  }

  function applyEffect(B, side, actor, e, chosenUid, ctx) {
    ctx = ctx || {};
    const t = resolveTarget(B, side, actor, e.target, chosenUid);
    const eachTarget = function (unit, fn) {
      if (!unit) return;
      if (unit === String(unit) && unit.indexOf('ALL:') === 0) {
        alive(B, unit.slice(4)).forEach(fn);
      } else fn(unit);
    };
    switch (e.type) {
      case 'damage': case 'aoeDamage': {
        if (!t) break;
        const raw = e.value;
        eachTarget(t, function (unit) {
          if (unit.hp <= 0) return;
          const opts = {
            pierce: e.pierce, element: e.element, ignoreShield: e.ignoreShield,
            cannotMiss: e.cannotMiss, lifesteal: e.lifesteal, noCounter: e.noCounter,
            bonusIfDot: e.bonusIfDot, bonus: e.bonus, backlineBonus: e.backlineBonus,
            vsHumanBonus: e.vsHumanBonus, allyDeathBonus: e.allyDeathBonus, isSkill: true,
          };
          let value = raw;
          if (e.executeBelow && unit.hp < unit.maxHp * e.executeBelow) {
            unit.hp = 0;
            log(B, `⚔ ${actor.name} 的斩杀！${unit.name} 被直接摧毁`);
            checkDeaths(B); onUnitDeath(B, unit, actor);
            return;
          }
          const r = dealDamage(B, actor, unit, value, opts, `✨${actor.skillName || ''}`);
          ctx.lastKill = ctx.lastKill || (unit.hp <= 0);
          ctx.dealt = (ctx.dealt || 0) + r.dmg;
        });
        break;
      }
      case 'dot': {
        if (!t) break;
        eachTarget(t, function (unit) {
          if (unit.hp <= 0) return;
          if (e.chance && !roll(B, e.chance)) return;
          addStatus(B, unit, { kind: e.kind || 'poison', value: e.value, remaining: e.duration });
          log(B, `🔥 ${unit.name} 陷入${e.kind === 'burn' ? '灼烧' : '中毒'}（每回合 ${e.value} 点，${e.duration} 回合）`);
        });
        break;
      }
      case 'debuff': {
        if (!t) break;
        eachTarget(t, function (unit) {
          if (unit.hp <= 0) return;
          if (e.chance && !roll(B, e.chance)) return;
          addStatus(B, unit, { kind: e.kind, remaining: e.duration });
          const names = { stun: '眩晕', freeze: '冰冻', bind: '束缚', silence: '封印' };
          log(B, `🌀 ${unit.name} 陷入${names[e.kind] || e.kind} ${e.duration} 回合`);
        });
        break;
      }
      case 'selfBuff': {
        if (!actor || actor.hp <= 0) break;
        const st = { kind: e.stat === 'atk' ? 'buffAtk' : (e.stat === 'def' ? 'buffDef' : e.stat), value: e.value, remaining: e.duration, tag: e.tag };
        if (e.stat === 'eva') { st.kind = 'eva'; st.value = e.chance || 0.3; }
        addStatus(B, actor, st);
        log(B, `⬆ ${actor.name} 获得${e.tag || e.stat}（${e.duration >= 99 ? '常驻' : e.duration + ' 回合'}）`);
        break;
      }
      case 'permBuff': { if (actor && actor.hp > 0) { if (e.stat === 'atk') actor.permAtk += e.value; else if (e.stat === 'def') actor.permDef += e.value; log(B, `⬆ ${actor.name} 永久+${e.value} ${e.stat}`); } break; }
      case 'selfHurt': { if (actor && actor.hp > 0) { actor.hp -= e.value; log(B, `💢 ${actor.name} 受到 ${e.value} 点反噬伤害`); checkDeaths(B); if (actor.hp <= 0) onUnitDeath(B, actor, null); } break; }
      case 'heal': { if (!t) break; eachTarget(t, function (u) { if (u.hp > 0) healUnit(B, u, e.value); }); break; }
      case 'conditionalHeal': { if (ctx.lastKill && t) eachTarget(t, function (u) { if (u.hp > 0) healUnit(B, u, e.value); }); break; }
      case 'shield': { if (!t) break; eachTarget(t, function (u) { if (u.hp > 0) { u.shield += e.value; log(B, `🛡 ${u.name} 获得 ${e.value} 点护盾`); } }); break; }
      case 'draw': { drawCards(B, side, e.count || 1); break; }
      case 'gainEnergy': { B.sides[side].energy = Math.min(B.sides[side].energyMax, B.sides[side].energy + (e.value || 1)); break; }
      case 'dispel': { if (t) eachTarget(t, function (u) { u.statuses = u.statuses.filter(function (s) { return ['buffAtk', 'buffDef', 'shield'].indexOf(s.kind) < 0; }); u.shield = 0; log(B, `🌪 ${u.name} 的增益被拍飞！`); }); break; }
      case 'statSteal': { if (t && t !== 'ALL:x') { eachTarget(t, function (u) { u.permAtk -= e.value; if (actor) actor.permAtk += e.value; log(B, `👥 ${actor.name} 偷走了 ${u.name} 的 ${e.value} 点攻击`); }); } break; }
      case 'energyBurn': {
        const es = B.sides[side === 'p' ? 'e' : 'p'];
        const burned = Math.min(es.energy, e.value);
        es.energy -= burned;
        if (burned > 0) log(B, `🌪 ${actor.name} 吹飞了敌方 ${burned} 点能量`);
        break;
      }
      case 'drain': { if (t) eachTarget(t, function (u) { const r = dealDamage(B, actor, u, e.value, { isSkill: true }, '🌙'); if (actor && actor.hp > 0) healUnit(B, actor, r.dmg); }); break; }
      case 'summonToken': {
        const n = e.count || 1;
        for (let i = 0; i < n; i++) {
          if (alive(B, side).length >= 5) break;
          const u = makeUnit(B, e.token, side, {});
          B.sides[side].field.push(u);
          log(B, `🍪 ${actor.name} 召唤了 ${u.name}`);
        }
        break;
      }
      case 'revive': break; /* 死亡钩子处理 */
      case 'guard': break;
      case 'aura': break;
      default: break;
    }
  }

  /* ---------- 死亡与被动 ---------- */
  function checkDeaths(B) {
    ['p', 'e'].forEach(function (s) {
      B.sides[s].field.forEach(function (u) { if (u.hp <= 0 && !u.deadPending) u.deadPending = true; });
    });
  }
  function onUnitDeath(B, unit, killer) {
    if (unit.hp > 0 || unit.deadDone) return;
    /* 乔巴复活 / 装备复活类 */
    const c = getCard(unit.cardId);
    if (c && c.skill && c.skill.type === 'passive') {
      (c.skill.effects || []).forEach(function (e) {
        if (e.type === 'revive' && e.on === 'death' && e.oncePerBattle && !unit.hasRevived) {
          unit.hasRevived = true; unit.hp = e.hp; unit.permAtk += e.atkBonus || 0; unit.deadPending = false;
          log(B, `🦌 ${unit.name} 暴走复活！（HP ${e.hp}，攻击+${e.atkBonus}）`);
          return;
        }
      });
      if (unit.hp > 0) return;
    }
    /* 草帽：阵亡全队增益 */
    if (hasEquipFlag(unit, 'eq_strawhat_item')) {
      forSide(B, unit.side, function (ally) {
        if (ally.hp > 0) addStatus(B, ally, { kind: 'buffAtk', value: 8, remaining: 1, tag: '香克斯的寄托' });
      });
      log(B, `👒 草帽的寄托：${unit.side === 'p' ? '我方' : '敌方'}全体攻击+8`);
    }
    unit.deadDone = true;
    B.sides[unit.side].graveyard.push(unit.cardId);
    log(B, `☠ ${unit.name} 退场`);
    cleanupDead(B);
    checkGameEnd(B);
  }
  function cleanupDead(B) {
    ['p', 'e'].forEach(function (s) {
      B.sides[s].field = B.sides[s].field.filter(function (u) { return !(u.hp <= 0 && u.deadDone); });
    });
  }

  /* ---------- 回合钩子 ---------- */
  function tickStatuses(B, side) {
    forSide(B, side, function (u) {
      /* DOT 结算 */
      let dotDmg = 0;
      u.statuses.forEach(function (s) {
        if ((s.kind === 'burn' || s.kind === 'poison') && s.remaining > 0) dotDmg += s.value || 0;
      });
      if (dotDmg > 0) { u.hp -= dotDmg; log(B, `🔥 ${u.name} 受到 ${dotDmg} 点持续伤害`); }
      /* 回血类 */
      const regen = statusSum(u, 'regen');
      if (regen > 0 && u.hp > 0) healUnit(B, u, regen);
      u.statuses.forEach(function (s) { if (s.remaining > 0 && s.kind !== 'eva') s.remaining--; });
      u.statuses = u.statuses.filter(function (s) { return s.remaining > 0; });
      if (u.hp <= 0) onUnitDeath(B, u, null);
    });
  }

  function passiveHook(B, side, hook, ctx) {
    forSide(B, side, function (u) {
      if (u.hp <= 0) return;
      const c = getCard(u.cardId);
      if (!c || !c.skill || c.skill.type !== 'passive') return;
      (c.skill.effects || []).forEach(function (e) {
        if (e.on !== hook) return;
        if (e.type === 'permBuff' && hook === 'turnStart') {
          u.permStacks = (u.permStacks || 0) + 1;
          if (u.permStacks <= 10) {
            if (e.stat === 'atk') u.permAtk += e.value;
            log(B, `💊 ${u.name} 狂化：攻击永久+${e.value}`);
          }
        }
      });
    });
  }

  /* ---------- 抽牌/能量 ---------- */
  function drawCards(B, side, n) {
    const S = B.sides[side];
    for (let i = 0; i < n; i++) {
      if (S.deck.length === 0) {
        if (S.graveyardReshuffle && S.graveyard.length > 0) {
          /* 冒险模式敌方牌库最多重洗 2 轮（防止小兵无限复活拖成僵局） */
          if (side === 'e' && B.mode === 'adventure') {
            S.reshuffles = (S.reshuffles || 0) + 1;
            if (S.reshuffles > 2) { S.fatigue = (S.fatigue || 0) + 1; continue; }
          }
          S.deck = S.graveyard.slice(); S.graveyard = [];
          shuffleArr(B, S.deck);
          log(B, side === 'p' ? '📦 牌库耗尽，弃牌重洗' : '📦 敌方牌库重洗');
        } else {
          S.fatigue = (S.fatigue || 0) + 1;
          /* 冒险模式敌方 BOSS 不吃疲劳（防止拖延自灭）；玩家疲劳封顶 8 点 */
          if (!(B.mode === 'adventure' && side === 'e')) {
            damageCaptain(B, side, Math.min(8, S.fatigue * 2), '牌库耗尽疲劳');
          }
          continue;
        }
      }
      if (S.hand.length >= 8) { log(B, '✋ 手牌已满（8 张），抽牌作废'); break; }
      S.hand.push(S.deck.shift());
    }
  }
  function shuffleArr(B, arr) { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rngNext(B.rng) * (i + 1)); const t = arr[i]; arr[i] = arr[j]; arr[j] = t; } }
  function damageCaptain(B, side, v, why) {
    const S = B.sides[side];
    S.captain.hp -= v;
    log(B, `⚓ ${side === 'p' ? '我方' : '敌方'}船长受到 ${v} 点伤害${why ? '（' + why + '）' : ''}（HP ${Math.max(0, S.captain.hp)}/${S.captain.maxHp}）`);
    checkGameEnd(B);
  }

  /* =========================================================
   * 战斗创建
   * config: {
   *   pDeck:[cardId...], pCaptainHp, pName,
   *   mode:'adventure'|'pvp'|'ai',
   *   stage:{ id, name, waves:[[id..]..], enemyHp, scale, strategy },
   *   difficulty:'easy'|'normal'|'hard',
   *   seed
   * }
   * ========================================================= */
  function createBattle(config) {
    const B = {
      v: 1, mode: config.mode, stageId: config.stage ? config.stage.id : null,
      turn: 1, active: 'p', status: 'running', winner: null,
      rng: { rngS: (config.seed || 12345) | 0 },
      uidCounter: 1,
      waveIndex: 0, waves: config.stage ? config.stage.waves : [],
      strategy: config.stage ? config.stage.strategy : 'aggro',
      difficulty: config.difficulty || 'normal',
      perfectScore: config.stage && config.stage.perfectScore ? config.stage.perfectScore : 150,
      turnsTaken: 0, score: 0, perfect: false,
      log: [], events: [],
      sides: {
        p: { name: config.pName || '草帽团', captain: { hp: config.pCaptainHp || 100, maxHp: config.pCaptainHp || 100 }, energy: 2, energyMax: 10, deck: config.pDeck.slice(), hand: [], graveyard: [], field: [], graveyardReshuffle: true, fatigue: 0 },
        e: { name: config.stage ? config.stage.name : '对手', captain: { hp: config.stage ? config.stage.enemyHp : 120, maxHp: config.stage ? config.stage.enemyHp : 120 }, energy: 2, energyMax: 10, deck: config.stage ? config.stage.enemyDeck.slice() : config.eDeck.slice(), hand: [], graveyard: [], field: [], graveyardReshuffle: true, fatigue: 0 }
      }
    };
    shuffleArr(B, B.sides.p.deck);
    shuffleArr(B, B.sides.e.deck);
    B.setupDone = false; /* 初始化阶段不结算胜负/波次 */
    drawCards(B, 'p', 4); drawCards(B, 'e', 4);
    /* 电话虫：开局抽牌 */
    spawnWave(B);
    B.setupDone = true;
    log(B, `⚔ 战斗开始：${B.sides.p.name} vs ${B.sides.e.name}`);
    return B;
  }

  function spawnWave(B) {
    const wave = B.waves[B.waveIndex];
    if (!wave) return;
    B.sides.e.field = B.sides.e.field.filter(function (u) { return u.hp > 0; });
    const scale = (B.stageScale || 1);
    wave.forEach(function (cid) {
      const u = makeUnit(B, cid, 'e', { scale: scale });
      /* 波次单位同样遵守召唤失调：落地回合不能攻击（与玩家对称，防止白嫖节奏） */
      u.summonedTurn = B.turn + 1;
      B.sides.e.field.push(u);
    });
    log(B, `🌊 第 ${B.waveIndex + 1}/${B.waves.length} 波敌人登场：${wave.map(function (c) { return getCard(c).name; }).join('、')}`);
  }

  /* =========================================================
   * 玩家动作 API（全部校验 + 可序列化）
   * ========================================================= */
  function startTurn(B, side) {
    B.active = side; B.turnsTaken++;
    const S = B.sides[side];
    S.energy = Math.min(S.energyMax, S.energy + (side === 'e' && B.mode === 'adventure' ? 2 : 3));
    /* 回合上限：40 轮仍未分胜负 → 按船长剩余血量比判定，平局/劣势归敌方（进攻方必须破局） */
    if (B.turnsTaken > 80 && B.status === 'running') {
      const pR = B.sides.p.captain.hp / B.sides.p.captain.maxHp;
      const eR = B.sides.e.captain.hp / B.sides.e.captain.maxHp;
      finishBattle(B, eR >= pR ? 'e' : 'p');
      log(B, eR >= pR ? '⏳ 航程耗尽，攻略失败……' : '⏳ 航程耗尽，我方坚持到了最后！');
      return;
    }
    forSide(B, side, function (u) { u.hasAttacked = false; if (u.skillCdLeft > 0) u.skillCdLeft--; });
    passiveHook(B, side, 'turnStart');
    tickStatuses(B, side);
    drawCards(B, side, 1);
    /* 记录指针：抽牌 */
    forSide(B, side, function (u) {
      if (hasEquipFlag(u, 'eq_logpose') && roll(B, 0.3)) drawCards(B, side, 1);
    });
    log(B, `▶ ${side === 'p' ? '我方' : '敌方'}第 ${Math.ceil(B.turnsTaken / 2)} 回合开始（能量 ${S.energy}）`);
    checkGameEnd(B);
  }

  function canSummon(B, side, handIdx) {
    const S = B.sides[side];
    const card = S.hand[handIdx];
    if (!card || B.status !== 'running' || B.active !== side) return false;
    const c = getCard(card);
    return isCharCard(c) && S.energy >= c.cost && alive(B, side).length < 5;
  }
  function summon(B, side, handIdx) {
    if (!canSummon(B, side, handIdx)) return null;
    const S = B.sides[side];
    const cid = S.hand.splice(handIdx, 1)[0];
    const c = getCard(cid);
    S.energy -= c.cost;
    const u = makeUnit(B, cid, side, {});
    S.field.push(u);
    log(B, `🚩 ${side === 'p' ? '' : '敌方 '}${c.name} 登场！（${c.rarity}·${c.cost}费 ${c.atk}/${c.def}/${c.hp}）`);
    /* 电话虫开局抽牌在召唤时触发一次 */
    onSummonPassives(B, side, u);
    return u;
  }
  function onSummonPassives(B, side, u) { /* 光环类被动在 effAtk 实时计算，无需注册 */ }

  function canEquip(B, side, handIdx, targetUid) {
    const S = B.sides[side];
    const card = S.hand[handIdx];
    if (!card || B.status !== 'running' || B.active !== side) return false;
    const c = getCard(card);
    if (!isEquipCard(c)) return false;
    if (S.energy < c.cost) return false;
    const t = findUnit(B, targetUid);
    if (!t || t.side !== side || t.hp <= 0) return false;
    const kindCount = t.equips.filter(function (e) { return getCard(e).kind === c.kind; }).length;
    return kindCount < 1; /* 每类装备限 1 件 */
  }
  function equip(B, side, handIdx, targetUid) {
    if (!canEquip(B, side, handIdx, targetUid)) return false;
    const S = B.sides[side];
    const cid = S.hand.splice(handIdx, 1)[0];
    const c = getCard(cid);
    S.energy -= c.cost;
    const t = findUnit(B, targetUid);
    t.equips.push(cid);
    if (c.bonus.hp) { t.hp += c.bonus.hp; t.maxHp += c.bonus.hp; }
    log(B, `🗡 ${t.name} 装备了【${c.name}】${c.passive ? '：' + c.passive : ''}`);
    return true;
  }

  function canAttack(B, side, unitUid) {
    const u = findUnit(B, unitUid);
    if (!u || B.status !== 'running' || B.active !== side) return false;
    if (u.side !== side || u.hp <= 0) return false;
    if (u.hasAttacked || u.summonedTurn >= B.turn) return false; /* 召唤回合不能攻击（除非先攻） */
    if (!canAct(u)) return false;
    return true;
  }
  /* 可攻击目标：敌方存活单位；无单位时可打船长 */
  function attackTargets(B, side) {
    const enemySide = side === 'p' ? 'e' : 'p';
    const es = alive(B, enemySide);
    return es.length > 0 ? es.map(function (u) { return u.uid; }) : ['captain'];
  }
  function attack(B, side, unitUid, targetUid) {
    if (!canAttack(B, side, unitUid)) return false;
    const u = findUnit(B, unitUid);
    const enemySide = side === 'p' ? 'e' : 'p';
    if (targetUid === 'captain') {
      if (alive(B, enemySide).length > 0) return false;
      u.hasAttacked = true;
      const dmg = Math.round(effAtk(B, u) * 0.6); /* 清空敌方场面后可直接攻击船长 */
      damageCaptain(B, enemySide, dmg, `${u.name} 的直接攻击`);
      log(B, `⚓ ${u.name} 直接攻击了敌方船长！`);
      return true;
    }
    const t = findUnit(B, targetUid);
    if (!t || t.hp <= 0 || t.side === side) return false;
    u.hasAttacked = true;
    dealDamage(B, u, t, effAtk(B, u), { isSkill: false }, `⚔ ${u.name} 攻击`);
    return true;
  }

  function canUseSkill(B, side, unitUid) {
    const u = findUnit(B, unitUid);
    if (!u || B.status !== 'running' || B.active !== side) return false;
    if (u.side !== side || u.hp <= 0) return false;
    const c = getCard(u.cardId);
    if (!c || !c.skill || c.skill.type !== 'active') return false;
    if (silenced(u)) return false;
    if (!canAct(u)) return false;
    if (u.skillCdLeft > 0) return false;
    if (B.sides[side].energy < (c.skill.energy || 1)) return false;
    return true;
  }
  function skillNeedsTarget(B, unitUid) {
    const u = findUnit(B, unitUid);
    if (!u) return false;
    const c = getCard(u.cardId);
    if (!c || !c.skill) return false;
    return c.skill.effects.some(function (e) { return e.target === 'enemy' || e.target === 'enemyMaxAtk'; });
  }
  function useSkill(B, side, unitUid, chosenUid) {
    if (!canUseSkill(B, side, unitUid)) return false;
    const u = findUnit(B, unitUid);
    const c = getCard(u.cardId);
    B.sides[side].energy -= (c.skill.energy || 1);
    /* 蓝波球：CD-1 */
    const cd = Math.max(1, u.skillCdMax - (hasEquipFlag(u, 'eq_rumble') ? 1 : 0));
    u.skillCdLeft = cd;
    log(B, `✨【${c.skill.name}】${u.name} 发动技能！`);
    /* 技能数值随单位 scale 缩放（BOSS 关卡强度同步到技能） */
    const baseCard = getCard(u.cardId);
    const scale = baseCard && baseCard.hp ? (u.maxHp / baseCard.hp) : 1;
    const ctx = { lastKill: false };
    c.skill.effects.forEach(function (e) { applyEffect(B, side, u, scaleEffect(e, scale), chosenUid, ctx); });
    checkGameEnd(B);
    return true;
  }
  function scaleEffect(e, scale) {
    if (!scale || Math.abs(scale - 1) < 0.001) return e;
    const c = Object.assign({}, e);
    if (typeof c.value === 'number') c.value = Math.round(c.value * scale);
    return c;
  }

  function endTurn(B) {
    const side = B.active;
    passiveHook(B, side, 'turnEnd');
    tickStatuses(B, side); /* 回合结束 DOT 二次判定（保险，避免跳过） */
    const other = side === 'p' ? 'e' : 'p';
    B.turn++;
    if (B.status === 'running') startTurn(B, other);
  }

  function checkGameEnd(B) {
    if (B.status !== 'running' || B.setupDone === false) return;
    if (B.sides.e.captain.hp <= 0) { finishBattle(B, 'p'); return; }
    if (B.sides.p.captain.hp <= 0) { finishBattle(B, 'e'); return; }
    /* 带波次的模式（冒险/对战）：当前波全灭→立即刷下一波；最后一波全灭→胜利 */
    if (B.waves.length > 0) {
      if (alive(B, 'e').length === 0 && B.waveIndex < B.waves.length - 1) {
        B.waveIndex++;
        spawnWave(B);
      }
      if (B.waveIndex >= B.waves.length - 1 && alive(B, 'e').length === 0) finishBattle(B, 'p');
      return;
    }
    if (alive(B, 'e').length === 0 && B.sides.e.deck.length === 0 && B.sides.e.hand.length === 0 && B.sides.e.field.length === 0) finishBattle(B, 'p');
  }

  function finishBattle(B, winner) {
    B.status = 'done'; B.winner = winner;
    log(B, winner === 'p' ? '🏆 胜利！' : '💀 战败……');
    if (winner === 'p') {
      const S = B.sides.p;
      const hpRatio = S.captain.hp / S.captain.maxHp;
      const aliveCnt = alive(B, 'p').length;
      B.score = Math.max(40, 60 + B.waves.length * 10 + Math.floor(hpRatio * 80) + aliveCnt * 6 - Math.floor(B.turnsTaken / 2) * 4);
      B.perfect = (S.captain.hp >= S.captain.maxHp) || (B.score >= B.perfectScore);
      log(B, `📊 积分 ${B.score}${B.perfect ? '（完美通关！）' : ''}`);
    }
  }

  /* ---------- 战斗恢复用：数据健全性检查 ---------- */
  function validateBattle(B) {
    try {
      if (!B || !B.sides || !B.sides.p || !B.sides.e || !B.rng) return false;
      if (typeof B.rng.rngS !== 'number') return false;
      ['p', 'e'].forEach(function (s) {
        if (!Array.isArray(B.sides[s].field) || !Array.isArray(B.sides[s].hand) || !Array.isArray(B.sides[s].deck)) throw new Error('bad side');
        B.sides[s].field.forEach(function (u) {
          if (!getCard(u.cardId)) throw new Error('bad card ref ' + u.cardId);
        });
      });
      return true;
    } catch (e) { return false; }
  }

  return {
    createBattle, startTurn, summon, equip, attack, useSkill, endTurn,
    canSummon, canEquip, canAttack, canUseSkill, skillNeedsTarget, attackTargets,
    effAtk, effDef, alive, findUnit, validateBattle,
    dealDamage, healUnit, addStatus, drawCards, damageCaptain,
    _internal: { computeDamage, applyEffect, makeUnit, spawnWave, tickStatuses, rngNext }
  };
}

/* 浏览器/Node 双端导出 */
if (typeof module !== 'undefined' && module.exports) { module.exports = createEngine; }
if (typeof window !== 'undefined') { window.createEngine = createEngine; }
