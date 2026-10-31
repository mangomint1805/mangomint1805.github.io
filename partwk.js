/* Tiến bộ theo Part (TOEIC): tóm tắt số câu đúng / tổng theo tuần, lưu ở localStorage 'mt.partwk'
   (khóa mt.* được acc.js đồng bộ lên tài khoản, nên thầy xem được ở hồ sơ học sinh).
   mt.partwk = { "YYYY-MM-DD" (Thứ Hai đầu tuần): { "1": [đúng, tổng], ..., "7": [đúng, tổng] } }, giữ 16 tuần.
   File này giống hệt ở toeic/assets/partwk.js và mangomint1805.github.io/partwk.js. */
(function () {
  'use strict';
  var KEY = 'mt.partwk', KEEP = 16;
  function get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }
  function put(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function dk(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function monday(t) { var d = new Date(t || Date.now()); return dk(new Date(d.getFullYear(), d.getMonth(), d.getDate() - (d.getDay() + 6) % 7)); }
  function partOf(n) { n = +n; return n <= 6 ? 1 : n <= 31 ? 2 : n <= 70 ? 3 : n <= 100 ? 4 : n <= 130 ? 5 : n <= 146 ? 6 : 7; }
  function trim(o) { var ks = Object.keys(o).sort(); while (ks.length > KEEP) delete o[ks.shift()]; return o; }
  // list: [[part, 0|1], ...]
  function addList(o, list, at) {
    var w = o[monday(at)] || (o[monday(at)] = {});
    list.forEach(function (x) { var p = String(x[0]); if (!(+p >= 1 && +p <= 7)) return; var c = w[p] || (w[p] = [0, 0]); c[0] += x[1] ? 1 : 0; c[1] += 1; });
  }
  function add(list, at) { var o = get(KEY) || {}; addList(o, list, at); put(KEY, trim(o)); }
  // r = { số câu: 0|1 } như trong ets26.hist
  function addR(r, at) { add(Object.keys(r || {}).map(function (n) { return [partOf(n), r[n] ? 1 : 0]; }), at); }
  // lần đầu: dựng lại từ lịch sử đã nộp trên máy
  function backfill() {
    if (localStorage.getItem('mt.partwk.v') === '1') return;
    var o = get(KEY) || {}, H = get('ets26.hist') || [];
    if (!Object.keys(o).length) H.forEach(function (h) { if (h && h.r && h.at) addList(o, Object.keys(h.r).map(function (n) { return [partOf(n), h.r[n] ? 1 : 0]; }), h.at); });
    put(KEY, trim(o)); try { localStorage.setItem('mt.partwk.v', '1'); } catch (e) {}
  }

  var NAME = { 1: 'Mô tả tranh', 2: 'Hỏi – đáp', 3: 'Hội thoại', 4: 'Bài nói', 5: 'Điền câu', 6: 'Điền đoạn văn', 7: 'Đọc hiểu' };
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  // vẽ 7 biểu đồ nhỏ (mỗi Part một ô), 8 tuần gần nhất; o = dữ liệu mt.partwk (object hoặc chuỗi JSON)
  function render(el, o, opt) {
    if (!el) return; opt = opt || {};
    if (typeof o === 'string') try { o = JSON.parse(o); } catch (e) { o = null; }
    o = o || {};
    var weeks = [], now = new Date(), m0 = new Date(monday()); for (var i = 7; i >= 0; i--) weeks.push(dk(new Date(m0.getFullYear(), m0.getMonth(), m0.getDate() - 7 * i)));
    var any = weeks.some(function (w) { return o[w] && Object.keys(o[w]).length; });
    if (!any) { el.innerHTML = '<p class="pw-empty">' + (opt.empty || 'Chưa có dữ liệu. Nộp vài bài luyện Part hoặc đề mini, biểu đồ sẽ hiện ở đây theo từng tuần.') + '</p>'; return; }
    var W = 180, H = 90, pl = 4, pr = 4, pt = 8, pb = 8, ups = [], weak = [];
    function x(i) { return pl + i * (W - pl - pr) / 7; }
    function y(v) { return pt + (H - pt - pb) * (1 - v / 100); }
    var cells = '';
    for (var p = 1; p <= 7; p++) {
      var pts = [], tot = 0, ok = 0;
      weeks.forEach(function (w, i) { var c = o[w] && o[w][p]; if (c && c[1]) { pts.push([i, Math.round(c[0] / c[1] * 100), c[0], c[1]]); } });
      weeks.slice(-4).forEach(function (w) { var c = o[w] && o[w][p]; if (c) { ok += c[0]; tot += c[1]; } });
      if (tot >= 5) weak.push([ok / tot, p]);
      if (pts.length >= 2) ups.push([pts[pts.length - 1][1] - pts[0][1], p, pts[0][1], pts[pts.length - 1][1]]);
      var g = '<line x1="' + pl + '" x2="' + (W - pr) + '" y1="' + y(50) + '" y2="' + y(50) + '" class="pw-mid"/>', d = '', segs = [];
      // nối các tuần liền nhau, tuần không làm thì ngắt nét
      pts.forEach(function (q, k) { var prev = pts[k - 1]; d += (prev && prev[0] === q[0] - 1 ? 'L' : 'M') + x(q[0]).toFixed(1) + ' ' + y(q[1]).toFixed(1); });
      if (d) g += '<path d="' + d + '" class="pw-line"/>';
      pts.forEach(function (q) { g += '<circle cx="' + x(q[0]).toFixed(1) + '" cy="' + y(q[1]).toFixed(1) + '" r="3.6" class="pw-dot"><title>Tuần ' + weeks[q[0]].slice(8) + '/' + weeks[q[0]].slice(5, 7) + ': ' + q[1] + '% (' + q[2] + '/' + q[3] + ' câu)</title></circle>'; });
      var lastv = pts.length ? pts[pts.length - 1][1] + '%' : '–';
      cells += '<div class="pw-cell"><div class="pw-h"><b>Part ' + p + '</b><span>' + NAME[p] + '</span><em>' + lastv + '</em></div>' +
        '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" role="img" aria-label="Part ' + p + ': ' + (pts.length ? pts.map(function (q) { return q[1] + '%'; }).join(', ') : 'chưa làm') + '">' + g + '</svg></div>';
    }
    var tips = [];
    ups.sort(function (a, b) { return b[0] - a[0]; });
    if (ups.length && ups[0][0] >= 5) tips.push('📈 Part ' + ups[0][1] + ' tăng từ ' + ups[0][2] + '% lên ' + ups[0][3] + '%' + (opt.who ? '' : ', giỏi lắm!'));
    weak.sort(function (a, b) { return a[0] - b[0]; });
    if (weak.length && weak[0][0] < 0.7) tips.push('🎯 Nên luyện thêm Part ' + weak[0][1] + ' (' + NAME[weak[0][1]] + ': đúng ' + Math.round(weak[0][0] * 100) + '% trong 4 tuần gần đây)');
    el.innerHTML = (tips.length ? '<p class="pw-tip">' + tips.map(esc).join('<br>') + '</p>' : '') + '<div class="pw-grid">' + cells + '</div>' +
      '<p class="pw-note">Mỗi ô là % câu đúng theo tuần, 8 tuần gần nhất (trái → phải). Rê chuột / chạm vào chấm để xem số câu.</p>';
  }
  var CSS = '.pw-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:10px}' +
    '.pw-cell{border:1px solid var(--line,#ddd7c9);border-radius:10px;padding:8px 10px 4px;background:var(--card,#fff)}' +
    '.pw-h{display:flex;align-items:baseline;gap:6px;font-size:13px}.pw-h b{color:var(--ink,#1e232b)}.pw-h span{color:var(--dim,#666e7a);flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pw-h em{font-style:normal;font-weight:700;color:var(--brand-ink,#6b4410)}' +
    '.pw-line{fill:none;stroke:var(--brand,#a8691a);stroke-width:2.2;stroke-linejoin:round}.pw-dot{fill:var(--card,#fff);stroke:var(--brand,#a8691a);stroke-width:2}.pw-mid{stroke:var(--line,#ddd7c9);stroke-dasharray:3 3}' +
    '.pw-tip{margin:0 0 10px;font-weight:600;color:var(--ink,#1e232b);line-height:1.6}.pw-note,.pw-empty{margin:8px 0 0;font-size:13px;color:var(--dim,#666e7a)}';
  if (!document.getElementById('pw-css')) { var st = document.createElement('style'); st.id = 'pw-css'; st.textContent = CSS; (document.head || document.documentElement).appendChild(st); }
  window.MPARTWK = { add: add, addR: addR, backfill: backfill, render: render, partOf: partOf, monday: monday };
  try { backfill(); } catch (e) {}
})();
