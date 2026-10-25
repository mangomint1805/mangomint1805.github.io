/* Kiểm tra tự động sau mỗi lần đẩy code: mở mọi trang .html bằng trình duyệt ẩn,
   báo lỗi nếu có lỗi JavaScript hoặc file trong web bị thiếu (404), và kiểm tra cú pháp mọi file .js.
   Biến môi trường: PREFIX = đường dẫn web trên github.io (cam, toeic, summary-new… ; để trống nếu là trang gốc),
   ROOT = thư mục chứa web trong repo (. hoặc docs), SKIP = regex các đường dẫn thuộc repo khác (không báo 404). */
const http = require('http'), fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const PREFIX = (process.env.PREFIX || '').replace(/^\/|\/$/g, ''), ROOT = path.resolve(process.env.ROOT || '.');
const SKIP = process.env.SKIP ? new RegExp(process.env.SKIP) : null;
const BASE = '/' + (PREFIX ? PREFIX + '/' : '');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.webp': 'image/webp' };

function walk(d, out = []) {
  for (const f of fs.readdirSync(d, { withFileTypes: true })) {
    if (f.name.startsWith('.') || f.name === 'node_modules') continue;
    const p = path.join(d, f.name);
    if (f.isDirectory()) walk(p, out); else out.push(p);
  }
  return out;
}
const files = walk(ROOT);
let fail = 0;
const bad = (m) => { fail++; console.log('❌ ' + m); };

// 1) cú pháp file .js
for (const f of files.filter(f => f.endsWith('.js'))) {
  try { execFileSync(process.execPath, ['--check', f], { stdio: 'pipe' }); } catch (e) { bad('Lỗi cú pháp ' + path.relative(ROOT, f) + ': ' + String(e.stderr).split('\n').slice(0, 5).join(' ')); }
}

// 2) máy chủ giả github.io (có hỗ trợ tua audio)
const srv = http.createServer((q, s) => {
  let u = decodeURIComponent(q.url.split('?')[0]);
  if (!u.startsWith(BASE)) { s.writeHead(404); return s.end(); }
  let p = path.join(ROOT, u.slice(BASE.length));
  if (p.endsWith(path.sep) || u.endsWith('/')) p = path.join(p, 'index.html');
  fs.stat(p, (e, st) => {
    if (!e && st.isDirectory()) { p = path.join(p, 'index.html'); try { st = fs.statSync(p); } catch (x) { e = x; } }
    if (e) { s.writeHead(404); return s.end(); }
    const ty = TYPES[path.extname(p)] || 'application/octet-stream', r = q.headers.range;
    if (r) { const [a, b] = r.replace('bytes=', '').split('-'); const st0 = +a, en = b ? +b : st.size - 1; s.writeHead(206, { 'Content-Range': `bytes ${st0}-${en}/${st.size}`, 'Accept-Ranges': 'bytes', 'Content-Length': en - st0 + 1, 'Content-Type': ty }); fs.createReadStream(p, { start: st0, end: en }).pipe(s); }
    else { s.writeHead(200, { 'Content-Length': st.size, 'Content-Type': ty, 'Accept-Ranges': 'bytes' }); fs.createReadStream(p).pipe(s); }
  });
}).listen(0, async () => {
  const port = srv.address().port, origin = 'http://localhost:' + port;
  const { chromium } = require('playwright');
  const b = await chromium.launch();
  const pages = files.filter(f => f.endsWith('.html')).map(f => path.relative(ROOT, f).split(path.sep).join('/'));
  const run = async (rel) => {
    const pg = await b.newPage(), errs = [];
    pg.on('pageerror', e => errs.push('JS: ' + e.message.slice(0, 200)));
    pg.on('response', r => {
      const u = r.url(); if (r.status() < 400 || !u.startsWith(origin)) return;
      const pth = decodeURIComponent(new URL(u).pathname);
      if (!pth.startsWith(BASE) || (SKIP && SKIP.test(pth))) return; // đường dẫn thuộc web khác trên github.io
      errs.push(r.status() + ' ' + pth);
    });
    try { await pg.goto(origin + BASE + rel, { waitUntil: 'load', timeout: 30000 }); await pg.waitForTimeout(800); }
    catch (e) { errs.push('Không mở được: ' + e.message.slice(0, 120)); }
    await pg.close();
    if (errs.length) bad(rel + '\n     ' + [...new Set(errs)].join('\n     ')); else console.log('✅ ' + rel);
  };
  for (let i = 0; i < pages.length; i += 6) await Promise.all(pages.slice(i, i + 6).map(run));
  await b.close(); srv.close();
  console.log('\nĐã kiểm tra ' + pages.length + ' trang, ' + files.filter(f => f.endsWith('.js')).length + ' file .js. ' + (fail ? fail + ' lỗi.' : 'Không có lỗi.'));
  process.exit(fail ? 1 : 0);
});
