/* gv.html, tab 📝 Bài test: ⭐ Điểm cộng của từng lớp + gửi "Điểm của mình" cho học viên.
   - Sổ điểm cộng của thầy: Firestore config/pts = { v: JSON {mã lớp: {tên chuẩn hoá: [{id, d, n, why, t}]}}, t } (config/ chỉ thầy đọc/ghi).
   - Bản riêng cho học viên: priv/{uid} = { name, lop, pts, sc, sct, at } — chỉ chính chủ đọc (luật trong firebase/them-luat-priv.txt).
   Chỉ gửi cho tài khoản ghép chắc chắn (ghép tay > email trên ERP > trùng đúng họ tên), để không bao giờ gửi nhầm điểm sang bạn khác.
   Cần window.GVX (gv.html: ros, nm, cls) và window.GVSC (điểm bài test của lớp đang xem, renderTests tạo). */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function num(v) { return (Math.round(v * 10) / 10).toString().replace('.', ','); }
  function today() { var d = new Date(Date.now() + 7 * 36e5); return d.toISOString().slice(0, 10); }
  function dm(d) { var m = String(d || '').match(/^\d{4}-(\d\d)-(\d\d)/); return m ? m[2] + '/' + m[1] : ''; }
  var PTS = null, PT = 0, USERS = null, UT = 0, ERR = '', NEEDRULE = null, WHY = 'Thắng Kahoot', DAY = today(), UNDO = [], OPEN = {}, MSG = '', busy = false;
  function fs() { return window.MACC && MACC.fs ? MACC.fs() : Promise.reject({ code: 'no-acc' }); }
  function denied(e) { return e && /permission/.test(e.code || e.message || ''); }

  function loadPts(force) {
    if (PTS && !force && Date.now() - PT < 120000) return Promise.resolve(PTS);
    return fs().then(function (x) { return x.F.getDoc(x.F.doc(x.db, 'config', 'pts')); }).then(function (sn) {
      var v = {}; try { v = sn.exists() ? JSON.parse(sn.data().v || '{}') || {} : {}; } catch (e) {}
      PTS = v; PT = Date.now(); ERR = ''; return v;
    });
  }
  function loadUsers(force) {
    if (USERS && !force && Date.now() - UT < 120000) return Promise.resolve(USERS);
    return fs().then(function (x) { return x.F.getDocs(x.F.collection(x.db, 'users')); }).then(function (qs) {
      var L = []; qs.forEach(function (d) { var v = d.data() || {}; if (v.email) L.push({ uid: d.id, e: String(v.email).toLowerCase(), n: v.name || '', at: v.at && v.at.toMillis ? v.at.toMillis() : 0 }); });
      USERS = L; UT = Date.now(); return L;
    });
  }
  // có luật priv/ chưa: thầy đọc thử priv/{uid của thầy} (có luật thì đọc được, kể cả khi chưa có tài liệu)
  function probe() {
    if (NEEDRULE !== null) return Promise.resolve(NEEDRULE);
    return fs().then(function (x) { if (!x.user) return null; return x.F.getDoc(x.F.doc(x.db, 'priv', x.user.uid)).then(function () { return (NEEDRULE = false); }, function (e) { return (NEEDRULE = denied(e) ? true : null); }); });
  }
  // ghép học viên trên ERP với tài khoản Google — chỉ cách chắc chắn: ghép tay (3) > email trên ERP (2) > trùng đúng họ tên (1)
  function accounts(code, S) {
    var X = window.GVX, R = X.ros(), nm = X.nm, best = S.map(function () { return { lv: 0, L: [] }; });
    (USERS || []).forEach(function (u) {
      var i = -1, lv = 0, L = R.link[u.e];
      if (L) { if (L === '-') return; var p = L.split('|'); if (p[0] !== code || !S[+p[1]]) return; i = +p[1]; lv = 3; }
      if (i < 0) { i = S.findIndex(function (s) { return s.e && s.e === u.e; }); if (i >= 0) lv = 2; }
      if (i < 0) {
        var d = nm(u.n); if (!d) return; var ws = d.split(' '), alt = [d];
        for (var k = 1; k < ws.length; k++) alt.push(ws.slice(k).concat(ws.slice(0, k)).join(' '));
        var eq = S.map(function (s, j) { return [s.n].concat(s.a || []).some(function (x) { return alt.indexOf(nm(x)) >= 0; }) ? j : -1; }).filter(function (j) { return j >= 0; });
        if (eq.length !== 1) return; i = eq[0]; lv = 1;
      }
      var b = best[i]; if (lv > b.lv) { b.lv = lv; b.L = [u]; } else if (lv === b.lv) b.L.push(u);
    });
    return best.map(function (b) { return b.L.length === 1 ? { u: b.L[0], lv: b.lv } : b.L.length > 1 ? { many: b.L } : null; });
  }
  function scoresOf(code, i) { var G = window.GVSC; return G && G.code === code && G.rows ? G.rows[i] || [] : null; }
  function privDoc(code, s, list, sc, F) {
    var o = { name: String(s.n).slice(0, 80), lop: code, pts: list.map(function (p) { return { d: p.d, n: p.n, why: String(p.why || '').slice(0, 80), t: p.t || 0 }; }), at: F.serverTimestamp() };
    if (sc) { o.sc = sc.map(function (r) { return { k: r.k, v: typeof r.v === 'number' ? r.v : null, src: r.src }; }); o.sct = Date.now(); }
    return o;
  }
  function pushOne(code, s, acc) {
    if (!acc || !acc.u) return Promise.resolve('none');
    var list = (PTS[code] || {})[window.GVX.nm(s.n)] || [];
    return fs().then(function (x) { return x.F.setDoc(x.F.doc(x.db, 'priv', acc.u.uid), privDoc(code, s, list, scoresOf(code, S_IDX(code, s)), x.F), { merge: true }); })
      .then(function () { NEEDRULE = false; return 'ok'; }, function (e) { if (denied(e)) NEEDRULE = true; return 'err'; });
  }
  function S_IDX(code, s) { var C = window.GVX.ros().cls[code]; return C ? C.s.indexOf(s) : -1; }
  function mutate(code, key, fn) {
    return fs().then(function (x) {
      var ref = x.F.doc(x.db, 'config', 'pts');
      return x.F.getDoc(ref).then(function (sn) {
        var v = {}; try { v = sn.exists() ? JSON.parse(sn.data().v || '{}') || {} : {}; } catch (e) {}
        v[code] = v[code] || {}; v[code][key] = v[code][key] || []; fn(v[code][key]); if (!v[code][key].length) delete v[code][key];
        return x.F.setDoc(ref, { v: JSON.stringify(v), t: Date.now() }).then(function () { PTS = v; PT = Date.now(); });
      });
    });
  }
  function change(code, i, fn, undoable) {
    var X = window.GVX, C = X.ros().cls[code]; if (!C || busy) return; var s = C.s[i], key = X.nm(s.n); busy = true;
    return mutate(code, key, fn).then(function () {
      var acc = accounts(code, C.s)[i]; return pushOne(code, s, acc);
    }).then(function (r) {
      MSG = r === 'ok' ? '✓ Đã lưu và gửi cho ' + s.n + '.' : r === 'none' ? '✓ Đã lưu cho ' + s.n + ' (chưa ghép tài khoản nên bạn ấy chưa xem được).' : '✓ Đã lưu trong sổ của thầy · chưa gửi được cho học viên (cần thêm luật Firestore).';
    }, function (e) { MSG = '⚠ Không lưu được (' + ((e && e.code) || 'lỗi') + ').'; if (undoable) UNDO.pop(); }).then(function () { busy = false; paint(); });
  }
  function add(code, i, n) {
    var why = String(WHY || '').trim() || (n > 0 ? 'Điểm cộng' : 'Trừ điểm'), e = { id: Math.random().toString(36).slice(2, 9), d: DAY || today(), n: n, why: why.slice(0, 80), t: Date.now() };
    var C = window.GVX.ros().cls[code]; UNDO.push({ code: code, i: i, id: e.id, txt: (n > 0 ? '+' : '') + n + ' ' + C.s[i].n + ' (' + e.why + ')' }); if (UNDO.length > 20) UNDO.shift();
    change(code, i, function (L) { L.push(e); }, true);
  }
  function remove(code, i, id) { UNDO = UNDO.filter(function (u) { return u.id !== id; }); change(code, i, function (L) { var k = L.findIndex(function (p) { return p.id === id; }); if (k >= 0) L.splice(k, 1); }); }
  function pushAll(code) {
    var C = window.GVX.ros().cls[code]; if (!C || busy) return; busy = true; MSG = 'Đang gửi…'; paint();
    var A = accounts(code, C.s), ok = 0, none = 0, err = 0, noSc = !scoresOf(code, 0);
    Promise.all(C.s.map(function (s, i) { return pushOne(code, s, A[i]).then(function (r) { if (r === 'ok') ok++; else if (r === 'err') err++; else none++; }); })).then(function () {
      busy = false;
      MSG = err ? '⚠ Chưa gửi được cho học viên: cần thêm luật Firestore (xem hướng dẫn bên dưới).' : '✓ Đã gửi điểm cho ' + ok + '/' + C.s.length + ' bạn' + (none ? ' · ' + none + ' bạn chưa ghép tài khoản' : '') + (noSc ? ' · bảng điểm bài test chưa tải xong nên chỉ gửi điểm cộng' : '') + '.';
      paint();
    });
  }

  var seq = 0;
  function paint(force) {
    var box = $('tkptBox'), X = window.GVX; if (!box || !X) return;
    var code = X.cls(), C = X.ros().cls[code];
    if (!C) { box.innerHTML = ''; return; }
    if (!window.MACC || !MACC.user || !MACC.user()) { box.innerHTML = '<h2>⭐ Điểm cộng</h2><div class="card"><p class="note">Đăng nhập Google bằng tài khoản của thầy để ghi điểm cộng.</p></div>'; return; }
    var my = ++seq;
    if (!PTS || !USERS || force) { if (!box.innerHTML) box.innerHTML = '<h2>⭐ Điểm cộng lớp ' + esc(code) + '</h2><p class="note">Đang tải…</p>'; }
    Promise.all([loadPts(force), loadUsers(force), probe()]).then(function () { if (my === seq) draw(box, code, C.s); }, function (e) {
      if (my !== seq) return;
      box.innerHTML = '<h2>⭐ Điểm cộng lớp ' + esc(code) + '</h2><div class="card"><p class="note" style="color:#c14636">' + (denied(e) ? 'Tài khoản này không có quyền giáo viên.' : 'Không tải được sổ điểm (' + esc((e && e.code) || 'lỗi') + ').') + '</p></div>';
    });
  }
  function draw(box, code, S) {
    var X = window.GVX, P = PTS[code] || {}, A = accounts(code, S), G = window.GVSC && window.GVSC.code === code ? window.GVSC : null;
    var tot = S.map(function (s) { return (P[X.nm(s.n)] || []).reduce(function (a, p) { return a + (+p.n || 0); }, 0); });
    var linked = A.filter(function (a) { return a && a.u; }).length, last = UNDO.filter(function (u) { return u.code === code; }).slice(-1)[0];
    var h = '<h2>⭐ Điểm cộng lớp ' + esc(code) + '</h2>';
    if (NEEDRULE) h += '<div class="card" style="background:#fff6dd;border-color:#f0d996;margin-bottom:10px"><b>⚠ Cần thêm luật Firestore cho <code>priv/</code></b><p class="note">Điểm vẫn được lưu trong sổ của thầy, nhưng học viên chưa xem được. Thêm đoạn luật trong file <code>firebase/them-luat-priv.txt</code> (repo mangomint1805.github.io) vào Firebase Console → Firestore → Rules, rồi tải lại trang và bấm “📤 Cập nhật điểm cho học viên”.</p></div>';
    h += '<div class="card"><div class="flt"><label class="note" style="margin:0">Lý do <input id="tkptWhy" list="tkptWhyL" value="' + esc(WHY) + '" style="font:inherit;font-size:15px;padding:8px 10px;border:1.5px solid var(--line);border-radius:10px;width:220px;max-width:100%"></label>' +
      '<datalist id="tkptWhyL"><option value="Thắng Kahoot"><option value="Top 3 Minto Quiz"><option value="Phát biểu xây dựng bài"><option value="Làm bài tập đầy đủ"><option value="Quên làm bài tập"></datalist>' +
      '<label class="note" style="margin:0">Ngày <input id="tkptDay" type="date" value="' + esc(DAY) + '" style="font:inherit;font-size:15px;padding:7px 10px;border:1.5px solid var(--line);border-radius:10px"></label>' +
      (last ? '<button type="button" class="btn" data-ptundo="1" title="Bỏ lần ghi điểm vừa rồi">↶ Hoàn tác: ' + esc(last.txt) + '</button>' : '') + '</div>' +
      '<p class="note">Bấm +1 / +2 / +3 / −1 cạnh tên để ghi điểm với lý do và ngày ở trên (VD “Thắng Kahoot buổi 12”). Mỗi bạn chỉ xem được điểm của chính mình trong Hồ sơ; không có bảng xếp hạng.</p>' +
      (MSG ? '<p class="note" style="color:var(--ink);font-weight:600">' + esc(MSG) + '</p>' : '') + '</div>';
    h += '<div class="tw"><table><thead><tr><th class="nm">Học viên</th><th>Tổng</th><th>Ghi điểm</th><th>Tài khoản</th></tr></thead><tbody>' + S.map(function (s, i) {
      var L = (P[X.nm(s.n)] || []).slice().sort(function (a, b) { return String(b.d).localeCompare(String(a.d)) || b.t - a.t; }), a = A[i];
      var acc = a && a.u ? '<span style="color:#1f8f6c">✓</span> <small style="display:inline;color:var(--dim)">' + esc(a.u.e) + (a.lv === 1 ? ' (trùng tên)' : '') + '</small>' : a && a.many ? '<span style="color:#b45309">' + a.many.length + ' tài khoản trùng tên — ghép tay ở tab 📈</span>' : '<span style="color:var(--dim)">chưa ghép tài khoản</span>';
      return '<tr><td class="nm">' + esc(s.n) + '</td><td><button type="button" data-ptopen="' + i + '" style="font:inherit;font-weight:700;border:0;background:none;cursor:pointer;color:' + (tot[i] < 0 ? '#c14636' : tot[i] ? '#1f8f6c' : 'var(--dim)') + '" title="Xem lịch sử">' + (tot[i] > 0 ? '+' : '') + num(tot[i]) + (L.length ? ' <small style="display:inline;color:var(--dim);font-weight:400">(' + L.length + ') ▾</small>' : '') + '</button></td>' +
        '<td style="white-space:normal;min-width:118px">' + [-1, 1, 2, 3].map(function (n) { return '<button type="button" class="btn" data-ptadd="' + i + '|' + n + '" style="padding:6px 10px;margin:1px;' + (n < 0 ? 'border-color:#c14636;color:#c14636' : '') + '"' + (busy ? ' disabled' : '') + '>' + (n > 0 ? '+' : '−') + Math.abs(n) + '</button>'; }).join('') + '</td>' +
        '<td style="text-align:left;font-size:13px">' + acc + '</td></tr>' +
        (OPEN[code + '|' + i] && L.length ? '<tr><td colspan="4" style="text-align:left;white-space:normal;background:var(--paper)">' + L.map(function (p) { return '<span style="display:inline-flex;gap:6px;align-items:center;margin:2px 10px 2px 0;font-size:13.5px"><b style="color:' + (p.n < 0 ? '#c14636' : '#1f8f6c') + '">' + (p.n > 0 ? '+' : '') + num(p.n) + '</b> ' + esc(p.why) + ' <small style="display:inline;color:var(--dim)">' + dm(p.d) + '</small><button type="button" data-ptdel="' + i + '|' + esc(p.id) + '" title="Xoá dòng này" style="border:0;background:none;color:#c14636;cursor:pointer;font-size:14px">✕</button></span>'; }).join('') + '</td></tr>' : '');
    }).join('') + '</tbody></table></div>';
    h += '<div class="card" style="margin-top:12px"><div class="flt"><button type="button" class="btn" data-ptpush="1"' + (busy ? ' disabled' : '') + '>📤 Cập nhật điểm cho học viên</button><span class="note" style="margin:0">' + linked + '/' + S.length + ' bạn đã ghép tài khoản' + (G ? '' : ' · đợi bảng bài test phía trên tải xong để gửi kèm điểm Minitest / Mock test') + '</span></div>' +
      '<p class="note">Gửi tổng điểm cộng và điểm Minitest / Mock test (ưu tiên điểm ERP, chưa có thì lấy điểm online cao nhất) vào trang Hồ sơ của từng bạn. Điểm cộng tự gửi mỗi lần thầy bấm; điểm bài test thì bấm nút này sau khi nhập ERP. Bạn chưa ghép tài khoản: ghép ở tab 📈 Truy cập web (cột Ghép).</p></div>';
    box.innerHTML = h;
  }
  document.addEventListener('input', function (e) { if (e.target.id === 'tkptWhy') WHY = e.target.value; if (e.target.id === 'tkptDay') DAY = e.target.value; });
  document.addEventListener('click', function (e) {
    var box = $('tkptBox'); if (!box || !box.contains(e.target) || !window.GVX) return;
    var code = window.GVX.cls(), b;
    if ((b = e.target.closest('[data-ptadd]'))) { var p = b.dataset.ptadd.split('|'); add(code, +p[0], +p[1]); }
    else if ((b = e.target.closest('[data-ptdel]'))) { var q = b.dataset.ptdel.split('|'); if (confirm('Xoá dòng điểm này?')) remove(code, +q[0], q[1]); }
    else if ((b = e.target.closest('[data-ptopen]'))) { var k = code + '|' + b.dataset.ptopen; OPEN[k] = !OPEN[k]; paint(); }
    else if ((b = e.target.closest('[data-ptundo]'))) { var u = UNDO.filter(function (x) { return x.code === code; }).pop(); if (u) { UNDO.splice(UNDO.indexOf(u), 1); change(code, u.i, function (L) { var j = L.findIndex(function (x) { return x.id === u.id; }); if (j >= 0) L.splice(j, 1); }); MSG = ''; } }
    else if (e.target.closest('[data-ptpush]')) pushAll(code);
  });
  // vẽ lại khi thầy vừa đăng nhập xong (acc.js gọi MACCPAINT mỗi khi trạng thái tài khoản đổi)
  var prevPaint = window.MACCPAINT, lastUid = '';
  window.MACCPAINT = function () { if (prevPaint) try { prevPaint(); } catch (e) {} var u = window.MACC && MACC.user && MACC.user(), id = u ? u.uid : ''; if (id !== lastUid) { lastUid = id; NEEDRULE = null; PTS = USERS = null; if ($('vTests') && !$('vTests').hidden) paint(); } };
  window.GVDIEM = { paint: paint };
})();
