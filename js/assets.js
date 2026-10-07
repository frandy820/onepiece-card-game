/* =========================================================
 * 占位卡面生成器 — "悬赏令"风格 SVG（运行时生成，零图片依赖）
 * 每张卡按 cardId 哈希生成确定性的悬赏令：WANTED 头 +
 * 程序化剪影（帽子/发型/体型按哈希变化）+ 悬赏金额 + 势力色
 * 真实图片到位后：把 assets/cards/<cardId>.jpg 放入即可自动覆盖
 * ========================================================= */
'use strict';

function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function mulberry(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* 程序化海盗剪影（bust：帽子+头+肩） */
function silhouette(rand, ink) {
  const hatType = Math.floor(rand() * 5);        /* 0 三角帽 1 草帽 2 头巾 3 皇冠 4 牛角盔 */
  const hairSpikes = 3 + Math.floor(rand() * 4); /* 发刺数量 */
  const shoulderW = 52 + Math.floor(rand() * 22);
  const cx = 150, headR = 34 + Math.floor(rand() * 6);
  let s = '';
  /* 肩膀 */
  s += `<path d="M ${cx - shoulderW} 330 Q ${cx} ${252} ${cx + shoulderW} 330 Z" fill="${ink}"/>`;
  /* 头 */
  s += `<circle cx="${cx}" cy="${212}" r="${headR}" fill="${ink}"/>`;
  /* 发刺（帽子下方） */
  for (let i = 0; i < hairSpikes; i++) {
    const a = -0.9 + (i / hairSpikes) * 1.8;
    const x1 = cx + Math.sin(a) * headR, y1 = 212 - Math.cos(a) * headR * 0.9;
    const x2 = cx + Math.sin(a) * (headR + 16 + rand() * 8), y2 = 212 - Math.cos(a) * (headR + 14);
    s += `<path d="M ${x1} ${y1} L ${x2} ${y2} L ${x1 + 7} ${y1 + 3} Z" fill="${ink}"/>`;
  }
  /* 帽子 */
  if (hatType === 0) { /* 三角帽 */
    s += `<path d="M ${cx - 58} 190 Q ${cx} 128 ${cx + 58} 190 Q ${cx} 168 ${cx - 58} 190 Z" fill="${ink}"/>`;
    s += `<rect x="${cx - 62}" y="186" width="124" height="10" rx="4" fill="${ink}"/>`;
  } else if (hatType === 1) { /* 草帽 */
    s += `<ellipse cx="${cx}" cy="188" rx="72" ry="16" fill="${ink}"/>`;
    s += `<path d="M ${cx - 40} 188 Q ${cx} 140 ${cx + 40} 188 Z" fill="${ink}"/>`;
    s += `<rect x="${cx - 40}" y="178" width="80" height="9" fill="${ink}" opacity="0.55"/>`;
  } else if (hatType === 2) { /* 头巾 */
    s += `<path d="M ${cx - headR - 4} 196 Q ${cx} 156 ${cx + headR + 4} 196 L ${cx + headR + 2} 182 Q ${cx} 160 ${cx - headR - 2} 182 Z" fill="${ink}"/>`;
    s += `<path d="M ${cx + headR} 190 l 26 -12 l -4 16 Z" fill="${ink}"/>`;
  } else if (hatType === 3) { /* 皇冠 */
    s += `<path d="M ${cx - 34} 182 L ${cx - 24} 150 L ${cx - 10} 168 L ${cx} 144 L ${cx + 10} 168 L ${cx + 24} 150 L ${cx + 34} 182 Z" fill="${ink}"/>`;
  } else { /* 牛角盔 */
    s += `<path d="M ${cx - 40} 190 Q ${cx} 146 ${cx + 40} 190 Z" fill="${ink}"/>`;
    s += `<path d="M ${cx - 44} 184 q -26 -6 -30 -28 q 22 6 32 18 Z" fill="${ink}"/>`;
    s += `<path d="M ${cx + 44} 184 q 26 -6 30 -28 q -22 6 -32 18 Z" fill="${ink}"/>`;
  }
  return s;
}

function bountyText(atk) {
  const b = atk * 1000000 + 30000000;
  if (b >= 100000000) return (b / 100000000).toFixed(2).replace(/\.?0+$/, '') + '億';
  return Math.round(b / 1000000) + '万';
}

/* 主入口：card → SVG data URI（300x420 卡面） */
function cardArtURI(card, factionColor, rarityColor) {
  const seed = hashStr(card.id || card.name);
  const rand = mulberry(seed);
  const ink = '#2b2118';
  const fc = factionColor || '#8a6d3b';
  const rc = rarityColor || '#9aa5b1';
  const isEquip = !!card.kind;
  /* 装备卡用器物图形 */
  let center = '';
  if (isEquip) {
    const t = seed % 4;
    if (card.kind === 'weapon') {
      center = `<g transform="translate(150,225) rotate(-24)">
        <rect x="-7" y="-130" width="14" height="180" rx="6" fill="${ink}"/>
        <rect x="-24" y="42" width="48" height="12" rx="5" fill="${ink}"/>
        <path d="M -7 -130 L 0 -158 L 7 -130 Z" fill="${ink}"/></g>`;
    } else if (card.kind === 'armor') {
      center = `<g transform="translate(150,225)">
        <path d="M -62 -60 L 62 -60 L 52 66 Q 0 92 -52 66 Z" fill="${ink}"/>
        <rect x="-78" y="-64" width="156" height="14" rx="7" fill="${ink}"/></g>`;
    } else {
      center = `<g transform="translate(150,225)">
        <circle r="58" fill="none" stroke="${ink}" stroke-width="12"/>
        <circle r="26" fill="${ink}"/>
        <rect x="50" y="-10" width="44" height="20" rx="10" fill="${ink}"/></g>`;
    }
  } else {
    center = silhouette(rand, ink);
  }
  const bounty = isEquip ? 'ONE PIECE' : '฿ ' + bountyText(card.atk || 20);
  const nameChars = (card.name || '').split('');
  const nameLines = [];
  let line = '';
  nameChars.forEach(function (ch) {
    if ((line + ch).length > 7) { nameLines.push(line); line = ch; } else line += ch;
  });
  if (line) nameLines.push(line);
  const nameSvg = nameLines.slice(0, 2).map(function (l, i) {
    return `<text x="150" y="${356 + i * 24 - (nameLines.length - 1) * 12}" text-anchor="middle" font-family="'Noto Serif SC',serif" font-size="21" font-weight="900" fill="#2b2118">${l}</text>`;
  }).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="420" viewBox="0 0 300 420">
  <defs>
    <linearGradient id="pg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#f4e4c1"/><stop offset="0.5" stop-color="#e8d5a8"/><stop offset="1" stop-color="#d9c08c"/>
    </linearGradient>
    <linearGradient id="bd" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${rc}" stop-opacity="0.95"/><stop offset="1" stop-color="${rc}" stop-opacity="0.55"/>
    </linearGradient>
  </defs>
  <rect width="300" height="420" rx="14" fill="url(#pg)"/>
  <rect x="6" y="6" width="288" height="408" rx="10" fill="none" stroke="${ink}" stroke-width="3" opacity="0.8"/>
  <rect x="0" y="0" width="300" height="46" rx="14" fill="url(#bd)"/>
  <text x="150" y="33" text-anchor="middle" font-family="Georgia,serif" font-size="24" font-weight="900" letter-spacing="6" fill="#1f1710">WANTED</text>
  <text x="150" y="66" text-anchor="middle" font-family="Georgia,serif" font-size="13" letter-spacing="2" fill="#5a4a33">DEAD OR ALIVE</text>
  <rect x="26" y="80" width="248" height="252" fill="#f7ecd2" stroke="${ink}" stroke-width="2.5"/>
  ${center}
  <rect x="26" y="80" width="248" height="252" fill="none" stroke="${fc}" stroke-width="5" opacity="0.5"/>
  <text x="150" y="352" text-anchor="middle" font-family="'Noto Serif SC',serif" font-size="17" font-weight="700" fill="#6b5233">${bounty}</text>
  ${nameSvg}
  <circle cx="272" cy="404" r="12" fill="${rc}" stroke="#1f1710" stroke-width="2"/>
  <text x="272" y="409" text-anchor="middle" font-size="10" font-weight="900" fill="#fff">${card.rarity || 'N'}</text>
  <text x="28" y="409" font-family="Georgia,serif" font-size="11" fill="#5a4a33">${isEquip ? 'EQUIP' : (card.en || '').slice(0, 18)}</text>
</svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

/* 双端导出 */
if (typeof module !== 'undefined' && module.exports) { module.exports = { cardArtURI, hashStr, bountyText }; }
if (typeof window !== 'undefined') { window.cardArtURI = cardArtURI; }
