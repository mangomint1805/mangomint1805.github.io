/* Minto English — "Điểm của mình": điểm cộng và điểm Minitest / Mock test riêng của từng học viên.
   Dữ liệu: Firestore priv/{uid} = { name, lop, pts: [{d: 'YYYY-MM-DD', n: số điểm, why: lý do}], sc: [{k: tên bài, v: điểm, src: 'ERP'|'online'}], sct, at }.
   Chỉ thầy ghi (từ gv.html); chỉ chính chủ (và thầy) đọc được — do luật Firestore quyết định (firebase/them-luat-priv.txt).
   Không có luật / chưa có dữ liệu: trả về null, trang không hiện gì. Không lưu điểm vào localStorage. */
(function () {
  'use strict';
  if (window.MDIEM) return;
  var memo = {};
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function num(v) { return (Math.round(v * 10) / 10).toString().replace('.', ','); }
  function dmy(d) { var m = String(d || '').match(/^(\d{4})-(\d\d)-(\d\d)/); return m ? m[3] + '/' + m[2] + '/' + m[1] : ''; }
  function get(uid) {
    if (!window.MACC || !MACC.fs) return Promise.resolve(null);
    return MACC.ready().then(function () {
      var u = MACC.user(); uid = uid || (u && u.uid); if (!u || !uid) return null;
      if (memo[uid]) return memo[uid];
      memo[uid] = MACC.fs().then(function (x) { return x.F.getDoc(x.F.doc(x.db, 'priv', uid)); })
        .then(function (sn) { return sn && sn.exists() ? sn.data() || {} : null; }, function () { return null; });
      return memo[uid];
    }).catch(function () { return null; });
  }
  function total(d) { return (d && Array.isArray(d.pts) ? d.pts : []).reduce(function (a, p) { return a + (+p.n || 0); }, 0); }
  function card(d, who) {
    var P = Array.isArray(d.pts) ? d.pts.slice() : [], S = Array.isArray(d.sc) ? d.sc : [], t = total(d);
    P.sort(function (a, b) { return String(b.d).localeCompare(String(a.d)) || (b.t || 0) - (a.t || 0); });
    var h = '<h3>⭐ Điểm của ' + (who ? 'bạn này' : 'mình') + '</h3><p class="hint" style="margin:-4px 0 10px">🔒 Chỉ ' + (who ? 'bạn ấy' : 'bạn') + ' và thầy xem được, không có bảng xếp hạng.</p>' +
      '<div class="two"><div><div class="tile" style="margin-bottom:8px"><b>' + (t > 0 ? '+' : '') + num(t) + '</b><span>điểm cộng (' + P.length + ' lần)</span></div><div class="list">' +
      (P.length ? P.slice(0, 30).map(function (p) { var n = +p.n || 0; return '<div><span>' + esc(p.why || 'Điểm cộng') + '<br><small>' + dmy(p.d) + '</small></span><span class="r" style="color:' + (n < 0 ? '#c14636' : 'var(--ok)') + '">' + (n > 0 ? '+' : '') + num(n) + '</span></div>'; }).join('') : '<p class="hint">Chưa có điểm cộng nào. Thắng Minto Quiz trên lớp là có nha!</p>') +
      '</div></div><div><b style="display:block;font-size:14.5px;margin-bottom:4px">📝 Minitest / Mock test</b><div class="list">' +
      (S.length ? S.map(function (s) { return '<div><span>' + esc(s.k) + '<br><small>' + (s.src === 'ERP' ? 'điểm trên ERP' : 'điểm online cao nhất (chưa nhập ERP)') + '</small></span><span class="r">' + (typeof s.v === 'number' ? num(s.v) : '✓') + '</span></div>'; }).join('') : '<p class="hint">Chưa có điểm bài test nào.</p>') +
      '</div>' + (d.sct ? '<p class="hint" style="margin:6px 0 0">Thầy cập nhật ngày ' + new Date(d.sct).toLocaleDateString('vi-VN') + '.</p>' : '') + '</div></div>';
    return h;
  }
  // điền thẻ vào el (ẩn nếu không có dữ liệu); uid: xem hồ sơ của bạn khác (chỉ thầy)
  function fill(el, uid) {
    if (!el) return Promise.resolve(null);
    return get(uid).then(function (d) {
      if (!d || !document.body.contains(el)) { el.hidden = true; return d; }
      el.innerHTML = card(d, !!uid); el.hidden = false; return d;
    });
  }
  window.MDIEM = { get: get, total: total, fill: fill, num: num, reset: function () { memo = {}; } };
})();
