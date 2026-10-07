/* 平衡矩阵 v2：智能脚本玩家 */
'use strict';
const { simulate, cards } = require('./lib-sim.js');
const chapters = require('../js/data/chapters.js');

function deckOf(level) {
  /* 真实费用曲线：低费骨架 + 中费主力 + 高费终结者 */
  const base = ['luffy_gear2','zoro_tatsumaki','nami_clima','usopp_sogeking','eq_dial','coby','hina','smoker'];
  const mid = ['luffy_gear2','zoro_tatsumaki','nami_clima','usopp_sogeking','coby','hina','smoker',
               'sanji_diable','chopper_monster','robin_bloom','arlong','mr1_daz','eq_wado','smoker_enforcer','eq_sandai'];
  const top = ['luffy_gear2','zoro_tatsumaki','nami_clima','usopp_sogeking','coby','hina',
               'sanji_diable','chopper_monster','robin_bloom','arlong','mr1_daz','eq_wado','eq_sandai','eq_kairoseki',
               'mihawk','law','jinbe_karakusa','aokiji','kizaru','eq_enma','eq_strawhat_item'];
  if (level === 'starter') return base.concat(base.slice(0, 7));
  if (level === 'mid') return mid;
  return top;
}

const stages = {
  'ch1-3(东海终)': chapters.getStage('ch1-3').stage,
  'ch4-3(阿拉巴斯坦)': chapters.getStage('ch4-3').stage,
  'ch5-2(司法岛)': chapters.getStage('ch5-2').stage,
  'ch7-3(顶上)': chapters.getStage('ch7-3').stage,
  'ch10-3(和之国)': chapters.getStage('ch10-3').stage,
};
const N = 12;
console.log('=== 平衡矩阵 v2（智能脚本玩家 × normal AI，每格 ' + N + ' 场）===');
console.log('关卡\\卡组        starter   mid       top');
for (const [sname, st] of Object.entries(stages)) {
  const row = [sname.padEnd(14)];
  for (const lvl of ['starter', 'mid', 'top']) {
    let w = 0;
    for (let i = 0; i < N; i++) if (simulate(st, deckOf(lvl), 'normal', 500 + i * 13).winner === 'p') w++;
    row.push(((w + '/' + N).padEnd(10)));
  }
  console.log(row.join(' '));
}
console.log('done');
