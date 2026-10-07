/* HTTP 静态托管冒烟测试：模拟 GitHub Pages 环境，验证游戏所有资源可正常加载
 * 用法: node tests/http-smoke.js [端口]  （默认 8919） */
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PORT = Number(process.argv[2] || 8919);
const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8', '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp',
  '.txt': 'text/plain; charset=utf-8', '.md': 'text/markdown; charset=utf-8',
};

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const fp = path.join(ROOT, p);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || !fs.statSync(fp).isFile()) {
    res.writeHead(404); res.end('not found'); return;
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(fp).toLowerCase()] || 'application/octet-stream' });
  fs.createReadStream(fp).pipe(res);
});

server.listen(PORT, async () => {
  const base = `http://127.0.0.1:${PORT}`;
  /* 1) 抓取首页并解析全部引用 */
  const html = await (await fetch(base + '/')).text();
  const refs = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(m => m[1]).filter(u => !/^https?:/.test(u)).map(u => u.startsWith('/') ? u : '/' + u);
  const targets = ['/', ...refs, '/DELIVERY-REPORT.html', '/README.md', '/CARD_ART_REPLACEMENT.md'];
  let pass = 0, fail = 0;
  for (const t of targets) {
    try {
      const r = await fetch(base + t);
      const len = Number(r.headers.get('content-length')) || (await r.arrayBuffer()).byteLength;
      const ok = r.status === 200 && len > 0;
      console.log(`${ok ? 'PASS' : 'FAIL'}  ${r.status}  ${String(len).padStart(6)}B  ${t}`);
      ok ? pass++ : fail++;
    } catch (e) { console.log(`FAIL  ERR  ${t}  ${e.message}`); fail++; }
  }
  /* 2) 首页关键内容抽查：标题、脚本数量、viewport、语言 */
  const checks = [
    ['title-cn', html.includes('海贼王')],
    ['script×7', (html.match(/<script/g) || []).length >= 7],
    ['viewport', html.includes('viewport')],
    ['lang=zh', html.includes('lang="zh-CN"')],
  ];
  checks.forEach(([n, ok]) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}`); ok ? pass++ : fail++; });
  console.log('='.repeat(40));
  console.log(`HTTP SMOKE: ${pass} PASS / ${fail} FAIL`);
  server.close();
  process.exit(fail ? 1 : 0);
});
