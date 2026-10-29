/* Minto English — đăng nhập Google + đồng bộ tiến độ (Firebase). Dùng chung cho mọi web dưới mangomint1805.github.io.
   Dữ liệu: Firestore users/{uid} = { d: {khoá localStorage: giá trị}, t: {khoá: thời điểm sửa}, at }. */
(function () {
  'use strict';
  if (window.MACC) return;
  var CFG = {
    apiKey: 'AIzaSyA7LEweMPy4tSjjR_An_KZaGXSzGI2nQv4',
    // Safari / mọi trình duyệt trên iPhone, iPad chặn dữ liệu giữa hai tên miền, nên đăng nhập qua trang /__/auth/ đặt ngay trên github.io
    authDomain: (/(^|\.)mangomint1805\.github\.io$/.test(location.hostname) && /AppleWebKit/.test(navigator.userAgent) && !/Chrome\/|Chromium|Edg\/|OPR\/|Android/.test(navigator.userAgent)) ? location.hostname : 'minto-english.firebaseapp.com',
    projectId: 'minto-english',
    storageBucket: 'minto-english.firebasestorage.app',
    messagingSenderId: '160119750089',
    appId: '1:160119750089:web:aac59cf8b1f577c035bc18'
  };
  // Safari / mọi trình duyệt trên iPhone, iPad chặn chia sẻ dữ liệu giữa hai tên miền, nên trang đăng nhập ở
  // minto-english.firebaseapp.com báo lỗi "missing initial state". Với các máy này dùng trang đăng nhập đặt ngay trên
  // mangomint1805.github.io/__/auth/ (cùng tên miền). Thử trên máy khác: localStorage mt.authdom = 'self' | 'fb'.
  (function () {
    if (location.hostname !== 'mangomint1805.github.io') return;
    var ua = navigator.userAgent, f = null; try { f = localStorage.getItem('mt.authdom'); } catch (e) {}
    var ios = /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
    var safari = /Safari\//.test(ua) && !/Chrome|Chromium|CriOS|FxiOS|EdgiOS|Edg\/|OPR\/|Android/.test(ua);
    if (f === 'self' || (f !== 'fb' && (ios || safari))) CFG.authDomain = location.hostname;
  })();
  var SDK = 'https://www.gstatic.com/firebasejs/10.12.2/';
  var RE = /^(ets26\.|cam\d+\.|cam\.|cam20\.|mt\.|vocab\.|summaryNew\.|summaryOld\.)/, EXCL = /^mt\.(acc|sync)/;
  var LS = window.localStorage, rawSet = Storage.prototype.setItem, rawDel = Storage.prototype.removeItem;
  function get(k) { try { return LS.getItem(k); } catch (e) { return null; } }
  function J(k, d) { try { var v = JSON.parse(get(k)); return v == null ? d : v; } catch (e) { return d; } }
  function put(k, v) { try { rawSet.call(LS, k, typeof v === 'string' ? v : JSON.stringify(v)); } catch (e) {} }
  function del(k) { try { rawDel.call(LS, k); } catch (e) {} }
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function hash(s) { if (s == null) return ''; var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36) + ':' + s.length; }
  function toast(ic, t, s) { if (window.MTOAST) try { window.MTOAST(ic, t, s); return; } catch (e) {} }
  function extUrl() { var ios = /iPhone|iPad|iPod/i.test(navigator.userAgent), url = location.href.replace(/^https?:\/\//, ''); return ios ? 'x-safari-https://' + url : 'intent://' + url + '#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=' + encodeURIComponent(location.href) + ';end'; }
  function inApp() { return /FBAN|FBAV|FB_IAB|Messenger|Instagram|Zalo|Line\/|MicroMessenger|TikTok|musical_ly/i.test(navigator.userAgent); }

  // ---------- ghi nhận thời điểm sửa từng khoá ----------
  var T = J('mt.sync.t', {}), tTimer = 0;
  function mark(k) { if (!RE.test(k) || EXCL.test(k)) return; T[k] = Date.now(); clearTimeout(tTimer); tTimer = setTimeout(function () { put('mt.sync.t', T); }, 400); schedule(); }
  Storage.prototype.setItem = function (k, v) { rawSet.call(this, k, v); if (this === LS) mark(String(k)); };
  Storage.prototype.removeItem = function (k) { rawDel.call(this, k); if (this === LS) mark(String(k)); };

  // ---------- Firebase (tải khi cần) ----------
  var FB = null, fbP = null, dbP = null;
  function load() {
    if (fbP) return fbP;
    fbP = Promise.all([import(SDK + 'firebase-app.js'), import(SDK + 'firebase-auth.js')]).then(function (m) {
      var app = m[0].initializeApp(CFG), auth = m[1].getAuth(app);
      FB = { A: m[1], F: null, auth: auth, app: app };
      m[1].onAuthStateChanged(auth, function (u) {
        USER = u || null;
        if (u) { put('mt.acc', { uid: u.uid, name: u.displayName || '', email: u.email || '', photo: u.photoURL || '' }); sync('load'); }
        else if (get('mt.acc')) { del('mt.acc'); }
        redraw();
      });
      return FB;
    });
    fbP.catch(function () { fbP = null; });
    return fbP;
  }
  function loadDB() {
    if (dbP) return dbP;
    dbP = load().then(function () { return import(SDK + 'firebase-firestore.js'); }).then(function (F) { FB.F = F; FB.db = F.getFirestore(FB.app); return FB; });
    dbP.catch(function () { dbP = null; });
    return dbP;
  }
  var USER = null, busy = false, again = false, pTimer = 0, lastErr = '';
  function schedule() { if (!get('mt.acc')) return; clearTimeout(pTimer); pTimer = setTimeout(function () { sync('push'); }, 5000); }
  document.addEventListener('visibilitychange', function () { if (document.hidden && USER) { clearTimeout(pTimer); sync('push'); } });

  // ---------- gộp dữ liệu ----------
  function parse(s) { try { return JSON.parse(s); } catch (e) { return undefined; } }
  function isObj(x) { return x && typeof x === 'object' && !Array.isArray(x); }
  function merge(L, R, localNewer) {
    var a = parse(L), b = parse(R), nw = localNewer ? a : b, od = localNewer ? b : a;
    if (Array.isArray(a) && Array.isArray(b)) {
      var seen = {}, out = [];
      od.concat(nw).forEach(function (x) { var k = JSON.stringify(x); if (!seen[k]) { seen[k] = 1; out.push(x); } });
      if (out.every(function (x) { return isObj(x) && x.at != null; })) out.sort(function (x, y) { return (+new Date(x.at)) - (+new Date(y.at)); });
      return JSON.stringify(out);
    }
    if (isObj(a) && isObj(b)) {
      var o = {};
      Object.keys(od).forEach(function (k) { o[k] = od[k]; });
      Object.keys(nw).forEach(function (k) { o[k] = isObj(o[k]) && isObj(nw[k]) ? Object.assign({}, o[k], nw[k]) : nw[k]; });
      return JSON.stringify(o);
    }
    return localNewer ? L : R;
  }
  function sync(why) {
    if (!FB || !USER) return Promise.resolve();
    if (!FB.F) return loadDB().then(function () { return sync(why); }, function () { lastErr = 'không tải được'; redraw(); });
    if (busy) { again = true; return Promise.resolve(); }
    busy = true;
    var F = FB.F, ref = F.doc(FB.db, 'users', USER.uid), last = J('mt.sync.last', { h: {}, at: 0 }), first = !last.at;
    return F.getDoc(ref).then(function (snap) {
      var rem = snap.exists() ? snap.data() : {}, RD = rem.d || {}, RT = rem.t || {}, keys = {}, k, i;
      for (i = 0; i < LS.length; i++) { k = LS.key(i); if (RE.test(k) && !EXCL.test(k)) keys[k] = 1; }
      Object.keys(RD).forEach(function (x) { if (RE.test(x) && !EXCL.test(x)) keys[x] = 1; });
      var upD = {}, upT = {}, nUp = 0, applied = 0, now = Date.now();
      Object.keys(keys).forEach(function (key) {
        var L = get(key), R = RD.hasOwnProperty(key) ? RD[key] : null, lh = last.h[key], hL = hash(L), hR = hash(R);
        if (hL === hR) { last.h[key] = hL; return; }
        var lc = first ? true : hL !== (lh || ''), rc = first ? true : hR !== (lh || ''), val;
        if (!rc) val = L;
        else if (!lc) val = R;
        else if (L == null) val = R;
        else if (R == null) val = L;
        else { var lt = T[key] || (first ? 0 : now), rt = RT[key] || 0; val = merge(L, R, lt > rt); }
        if (val !== L) { if (val == null) del(key); else put(key, val); applied++; }
        if (val !== R) { upD[key] = val == null ? F.deleteField() : val; upT[key] = val == null ? F.deleteField() : (T[key] || now); nUp++; }
        last.h[key] = hash(val);
      });
      var done = function () {
        last.at = Date.now(); put('mt.sync.last', last); lastErr = ''; redraw(); pushBoard();
        if (applied && why !== 'push') {
          var fl = 'mt-acc-reloaded';
          if (!window.MEXAM && !sessionStorage.getItem(fl)) { try { sessionStorage.setItem(fl, '1'); } catch (e) {} toast('check', 'Đã lấy tiến độ từ tài khoản', 'Trang sẽ tải lại để hiện dữ liệu mới.'); setTimeout(function () { location.reload(); }, 1200); }
          else toast('check', 'Đã đồng bộ tiến độ', applied + ' mục được cập nhật từ tài khoản.');
        }
      };
      if (!nUp) return done();
      var size = JSON.stringify(upD).length;
      if (size > 900000) { lastErr = 'Dữ liệu quá lớn để đồng bộ'; redraw(); return; }
      return F.setDoc(ref, { d: upD, t: upT, at: F.serverTimestamp(), name: USER.displayName || '', email: USER.email || '' }, { merge: true }).then(done);
    }).catch(function (e) { console.error('acc sync', e); lastErr = (e && e.code) || 'lỗi mạng'; redraw(); }).then(function () {
      busy = false; if (again) { again = false; schedule(); }
    });
  }

  // ---------- bảng xếp hạng tuần (chỉ khi học sinh bật) ----------
  function dk(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function week() { var d = new Date(), mon = new Date(d.getFullYear(), d.getMonth(), d.getDate() - (d.getDay() + 6) % 7); return { mon: mon, wk: dk(mon) }; }
  function weekPts() {
    // mỗi ngày có học: 20 + 3 điểm mỗi hoạt động (tối đa 60); xong đủ 3 nhiệm vụ hằng ngày (mt.quest.days, ui.js): thêm 15
    var a = J('mt.act', {}), qd = J('mt.quest.days', {}) || {}, w = week(), pts = 0, days = 0, per = [];
    for (var i = 0; i < 7; i++) { var d = new Date(w.mon.getFullYear(), w.mon.getMonth(), w.mon.getDate() + i), n = a[dk(d)] || 0, p = (n ? 20 + Math.min(40, n * 3) : 0) + (qd[dk(d)] ? 15 : 0); if (n) days++; pts += p; per.push(p); }
    return { wk: w.wk, pts: pts, days: days, per: per };
  }
  function boardName() { var a = J('mt.acc', {}); return String((get('cam20.name') || '').trim() || a.name || 'Bạn học').slice(0, 40); }
  function pushBoard(force) {
    if (!USER || !FB || !FB.F) return Promise.resolve();
    var F = FB.F, ref = F.doc(FB.db, 'board', USER.uid), on = get('mt.board.on') === '1';
    if (!on) { if (get('mt.sync.board')) { del('mt.sync.board'); return F.deleteDoc(ref).catch(function () {}); } return Promise.resolve(); }
    var w = weekPts(), lop = String(get('cam20.lop') || '').trim().slice(0, 40), sig = [w.wk, w.pts, w.days, boardName(), lop].join('|');
    if (!force && get('mt.sync.board') === sig) return Promise.resolve();
    return F.setDoc(ref, { name: boardName(), lop: lop, wk: w.wk, pts: w.pts, days: w.days, photo: (USER.photoURL || ''), at: F.serverTimestamp() }).then(function () { put('mt.sync.board', sig); }).catch(function (e) { console.error('board', e); });
  }
  function listBoard(wk) {
    return loadDB().then(function () { var F = FB.F; return F.getDocs(F.query(F.collection(FB.db, 'board'), F.where('wk', '==', wk || week().wk))); })
      .then(function (qs) { var L = []; qs.forEach(function (d) { var x = d.data(); x.me = USER && d.id === USER.uid; L.push(x); }); return L.sort(function (a, b) { return b.pts - a.pts || b.days - a.days; }); });
  }

  // ---------- giao diện trong bảng ⚙ ----------
  var EL = null;
  function redraw() { if (EL && document.body.contains(EL)) render(EL); if (window.MACCPAINT) try { window.MACCPAINT(); } catch (e) {} }
  function fmt(t) { if (!t) return ''; var d = new Date(t); return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2); }
  function isGV(e) { e = String(e || '').toLowerCase(); var x = 2166136261; for (var i = 0; i < e.length; i++) { x ^= e.charCodeAt(i); x = Math.imul(x, 16777619); } return (x >>> 0).toString(36) === '979n45'; }
  function render(el) {
    EL = el; var a = J('mt.acc', null), last = J('mt.sync.last', {});
    if (a) {
      el.innerHTML = '<div class="ma-u">' + (a.photo ? '<img src="' + esc(a.photo) + '" alt="" referrerpolicy="no-referrer">' : '<span class="ma-av">' + esc((a.name || a.email || '?').charAt(0)) + '</span>') +
        '<span><b>' + esc(a.name || 'Tài khoản Google') + '</b><small>' + esc(a.email) + '</small></span></div>' +
        '<small class="ma-st">' + (lastErr ? '⚠ Chưa đồng bộ được (' + esc(lastErr) + ')' : last.at ? '☁ Đã đồng bộ lúc ' + fmt(last.at) : '☁ Đang đồng bộ…') + '</small>' +
        '<div class="ma-l"><a href="/ho-so.html">👤 Hồ sơ của tôi</a><a href="/xep-hang.html">🏆 Xếp hạng tuần</a>' + (isGV(a.email) ? '<a href="/gv.html">🧑‍🏫 Bảng theo dõi lớp</a><a href="/KH/admin.html">🎮 Minto Quiz</a>' : '') + '</div>' +
        '<div class="ma-b"><button type="button" data-a="sync">Đồng bộ ngay</button><button type="button" data-a="out">Đăng xuất</button></div>';
    } else if (inApp()) {
      var ios = /iPhone|iPad|iPod/i.test(navigator.userAgent), ext = extUrl();
      el.innerHTML = '<b class="ma-t">Đăng nhập để lưu tiến độ</b><small class="ma-st">Google không cho đăng nhập ngay trong Zalo / Messenger. Bấm nút dưới để mở trang này bằng ' + (ios ? 'Safari' : 'Chrome') + ' rồi đăng nhập nhé.</small>' +
        '<a class="ma-g" href="' + esc(ext) + '" style="text-decoration:none">🌐 Mở bằng ' + (ios ? 'Safari' : 'Chrome') + '</a>' +
        '<small class="ma-st" style="margin-top:8px">Không mở được? Bấm <b>⋮</b> hoặc <b>…</b> ở góc trên → <b>Mở bằng trình duyệt</b>.</small>';
    } else {
      el.innerHTML = '<b class="ma-t">Lưu tiến độ lên tài khoản</b><small class="ma-st">Đăng nhập Google để giữ bài làm, flashcard, chuỗi ngày học… trên mọi máy.</small>' +
        '<button type="button" class="ma-g" data-a="in"' + (FB ? '' : ' disabled') + '><svg viewBox="0 0 48 48" width="18" height="18" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>' + (FB ? 'Đăng nhập bằng Google' : 'Đang tải…') + '</button>';
      if (!FB) load().then(redraw, function () { var st = el.querySelector('.ma-st'); if (st) st.textContent = 'Không tải được dịch vụ đăng nhập. Kiểm tra mạng rồi thử lại.'; });
    }
    [].forEach.call(el.querySelectorAll('[data-a]'), function (b) {
      b.onclick = function (e) {
        e.stopPropagation(); var act = b.getAttribute('data-a');
        if (act === 'in') signIn();
        if (act === 'sync') { b.textContent = 'Đang đồng bộ…'; (FB ? Promise.resolve() : load()).then(function () { return sync('manual'); }).then(redraw); }
        if (act === 'out') outMenu();
      };
    });
  }
  function signIn() {
    if (!FB) return;
    var A = FB.A, pr = new A.GoogleAuthProvider(); pr.setCustomParameters({ prompt: 'select_account' });
    A.signInWithPopup(FB.auth, pr).then(function (r) {
      var u = r.user; if (u && !(get('cam20.name') || '').trim() && u.displayName) put('cam20.name', u.displayName);
      toast('check', 'Đã đăng nhập', 'Tiến độ sẽ tự lưu vào tài khoản ' + (u.email || '') + '.');
    }).catch(function (e) {
      var c = e && e.code || '';
      if (c === 'auth/popup-closed-by-user' || c === 'auth/cancelled-popup-request') return;
      lastErr = c === 'auth/popup-blocked' ? 'trình duyệt chặn cửa sổ đăng nhập' : c === 'auth/unauthorized-domain' ? 'tên miền chưa được cho phép' : c || 'lỗi';
      if (EL) { var s = EL.querySelector('.ma-st'); if (s) s.textContent = '⚠ Không đăng nhập được: ' + lastErr + '.'; }
      toast('help', c === 'auth/popup-blocked' ? 'Bấm lại nút Đăng nhập nhé' : 'Chưa đăng nhập được', c === 'auth/popup-blocked' ? 'Trình duyệt vừa chặn cửa sổ đăng nhập.' : lastErr);
    });
  }
  function outMenu() {
    if (!EL) return;
    EL.innerHTML = '<b class="ma-t">Đăng xuất?</b><small class="ma-st">Tiến độ vẫn nằm an toàn trong tài khoản. Nếu đây là máy dùng chung, nên xoá luôn dữ liệu trên máy.</small>' +
      '<div class="ma-b col"><button type="button" data-o="keep">Đăng xuất, giữ dữ liệu trên máy</button><button type="button" data-o="wipe">Đăng xuất và xoá dữ liệu trên máy này</button><button type="button" data-o="no">Huỷ</button></div>';
    [].forEach.call(EL.querySelectorAll('[data-o]'), function (b) {
      b.onclick = function (e) {
        e.stopPropagation(); var o = b.getAttribute('data-o');
        if (o === 'no') return render(EL);
        clearTimeout(pTimer);
        (USER ? sync('push') : Promise.resolve()).then(function () { return FB ? FB.A.signOut(FB.auth) : null; }).then(function () {
          ['mt.acc', 'mt.sync.last', 'mt.sync.t'].forEach(del); T = {};
          if (o === 'wipe') { var ks = []; for (var i = 0; i < LS.length; i++) { var k = LS.key(i); if (RE.test(k) && k !== 'mt.skin' && k !== 'mt.fs') ks.push(k); } ks.forEach(del); toast('check', 'Đã đăng xuất', 'Dữ liệu trên máy này đã được xoá.'); setTimeout(function () { location.reload(); }, 900); }
          else { toast('check', 'Đã đăng xuất', 'Dữ liệu trên máy vẫn còn.'); render(EL); }
        });
      };
    });
  }
  var css = document.createElement('style');
  css.textContent = '.mp-acc{border-top:1px dashed #e2dbcd;margin-top:10px;padding-top:10px;font:13.5px/1.4 "IBM Plex Sans",sans-serif;color:inherit}' +
    '.mp-acc .ma-t{display:block;font-size:14px}.mp-acc .ma-st{display:block;color:#7a7f88;font-size:12.5px;margin:3px 0 8px}' +
    '.mp-acc .ma-g{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;font:600 14px/1 "IBM Plex Sans",sans-serif;padding:10px;border:1.5px solid #dadce0;border-radius:10px;background:#fff;color:#3c4043;cursor:pointer}' +
    '.mp-acc .ma-g:disabled{opacity:.6;cursor:wait}' +
    '.mp-acc .ma-u{display:flex;gap:9px;align-items:center}.mp-acc .ma-u img,.mp-acc .ma-av{width:34px;height:34px;border-radius:50%;flex:none;object-fit:cover}' +
    '.mp-acc .ma-av{display:flex;align-items:center;justify-content:center;background:#a8691a;color:#fff;font-weight:700}' +
    '.mp-acc .ma-u span{min-width:0}.mp-acc .ma-u b{display:block}.mp-acc .ma-u small{display:block;color:#7a7f88;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
    '.mp-acc .ma-l{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 6px}.mp-acc .ma-l a{flex:1 1 40%;text-align:center;font:600 12.5px/1.2 "IBM Plex Sans",sans-serif;padding:8px 4px;border-radius:9px;background:#f6efe2;color:#6b4410;text-decoration:none}html[data-theme=dark] .mp-acc .ma-l a{background:#2a2e36;color:#f0c787}' +
    '.mp-acc .ma-b{display:flex;gap:6px}.mp-acc .ma-b.col{flex-direction:column}.mp-acc .ma-b button{flex:1;font:600 12.5px/1.2 "IBM Plex Sans",sans-serif;padding:8px;border:1.5px solid #ddd7c9;border-radius:9px;background:transparent;color:inherit;cursor:pointer}' +
    'html[data-theme=dark] .mp-acc{border-color:#373b44}html[data-theme=dark] .mp-acc .ma-st,html[data-theme=dark] .mp-acc .ma-u small{color:#9aa1ad}html[data-theme=dark] .mp-acc .ma-b button{border-color:#3a3f48}';
  document.head.appendChild(css);

  function quick() {
    if (inApp()) { location.href = extUrl(); return; }
    if (FB) return signIn();
    load().then(signIn, function () { toast('help', 'Chưa tải được đăng nhập', 'Kiểm tra mạng rồi thử lại nhé.'); });
  }
  window.MACC = { render: render, load: load, preload: function () { load().catch(function () {}); }, quick: quick, inApp: inApp, extUrl: extUrl, sync: function () { return sync('manual'); },
    user: function () { return USER; }, ready: function () { return load(); },
    fs: function () { return loadDB().then(function () { return { F: FB.F, db: FB.db, user: USER }; }); },
    board: { week: week, pts: weekPts, push: function () { return (FB && FB.F ? Promise.resolve() : loadDB()).then(function () { return pushBoard(true); }); }, list: listBoard } };
  if (get('mt.acc')) load().catch(function () {});
})();
