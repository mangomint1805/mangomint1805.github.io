/* Minto English — tổng hợp tiến độ học từ cả web TOEIC và IELTS (cùng tên miền nên dùng chung dữ liệu trên máy). */
(function () {
  'use strict';
  var SRC = null; // khi xem dữ liệu của học sinh khác (trang giáo viên): { khoá: chuỗi JSON }
  function raw(k) { return SRC ? (SRC.hasOwnProperty(k) ? SRC[k] : null) : localStorage.getItem(k); }
  function keys() { if (SRC) return Object.keys(SRC); var a = []; for (var i = 0; i < localStorage.length; i++) a.push(localStorage.key(i)); return a; }
  function J(k, d) { try { var v = JSON.parse(raw(k)); return v == null ? d : v; } catch (e) { return d; } }
  function dkey(t) { var d = t instanceof Date ? t : new Date(t); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  var BOOKS = [17, 18, 19, 20, 21, 'v7'];
  function BN(b) { return /^v/.test(b) ? 'Original Exams VOL ' + String(b).slice(1) : 'Cambridge IELTS ' + b; }
  function BD(b) { return /^v/.test(b) ? String(b) : 'c' + b; }
  var TMODE = { full: 'Full test', lc: 'Listening', rc: 'Reading' }; for (var i = 1; i <= 7; i++) TMODE['p' + i] = 'Luyện Part ' + i;

  function summary() {
    var days = {}, o = { today: dkey(new Date()), acc: J('mt.acc', null) };
    o.lop = (raw('cam20.lop') || '').trim(); o.name = (raw('cam20.name') || '').trim() || (o.acc && o.acc.name) || '';
    var act = J('mt.act', {}); Object.keys(act).forEach(function (k) { if (act[k] > 0) days[k] = 1; }); o.act = act;
    // TOEIC
    var th = J('ets26.hist', []), T = { subs: 0, best: 0, full: 0, mini: 0 };
    th.forEach(function (r) { if (!r) return; T.subs++; if (r.at) days[dkey(r.at)] = 1; if (r.lcS && r.rcS) { T.best = Math.max(T.best, r.lcS + r.rcS); T.full++; } });
    var md = J('ets26.mini.days', {}); Object.keys(md).forEach(function (k) { days[k] = 1; }); T.mini = Object.keys(md).length; T.miniToday = !!md[o.today];
    // IELTS
    var I = { subs: 0, bestL: 0, bestR: 0, ws: 0 };
    BOOKS.forEach(function (b) { J('cam' + b + '.hist', []).forEach(function (r) { if (!r) return; I.subs++; if (r.t) days[dkey(r.t)] = 1; if (r.total === 40) { var bd = +r.band || 0; if (r.sec === 'L') I.bestL = Math.max(I.bestL, bd); else I.bestR = Math.max(I.bestR, bd); } }); });
    J('cam.ws.hist', []).forEach(function (r) { if (r && r.t) { days[dkey(r.t)] = 1; I.ws++; } });
    // Kiến thức nền, flashcard, huy hiệu, xếp lớp
    o.nen = {}; ['toeic', 'ielts'].forEach(function (s) { var n = J('mt.nen.' + s, {}); o.nen[s] = Object.keys(n).filter(function (k) { return k.indexOf('mh-') !== 0; }).length; Object.keys(n).forEach(function (k) { if (n[k] && n[k].t) days[dkey(n[k].t)] = 1; }); });
    var cards = J('vocab.cards', {}); o.cards = Object.keys(cards || {}).length; o.cardsDue = Object.keys(cards || {}).filter(function (k) { var c = cards[k]; return c && (!c.due || c.due <= o.today); }).length;
    o.badges = { toeic: Object.keys(J('mt.badges.toeic', {})).length, ielts: Object.keys(J('mt.badges.ielts', {})).length };
    o.place = { toeic: J('mt.place.toeic', null), ielts: J('mt.place.ielts', null) };
    o.toeic = T; o.ielts = I; o.days = days; o.ndays = Object.keys(days).length;
    var n = 0, d = new Date(); if (!days[dkey(d)]) d.setDate(d.getDate() - 1); while (days[dkey(d)]) { n++; d.setDate(d.getDate() - 1); } o.streak = n;
    // bài đang làm dở
    var U = [];
    var KS = keys();
    for (var k = 0; k < KS.length; k++) {
      var key = KS[k], m;
      if ((m = /^ets26\.t(\d+)\.(full|lc|rc|p[1-7])$/.exec(key))) {
        var s = J(key, null); if (!s || s.done || !s.ans) continue; var na = Object.keys(s.ans).length; if (!na) continue;
        U.push({ site: 'toeic', label: (+m[1] > 10 ? 'ETS 2024 · Test ' + (m[1] - 10) : 'ETS 2026 · Test ' + m[1]), sub: TMODE[m[2]] + ' · đã chọn ' + na + ' câu', href: 'toeic/test.html?t=' + m[1] + '&m=' + m[2], at: s.t0 || 0 });
      } else if ((m = /^cam(\d+|v\d+)\.t(\d+)(?:\.([LR]\d?))?(\.thi)?$/.exec(key))) {
        var st = J(key, null); if (!st || !st.ans) continue; var secs = {};
        Object.keys(st.ans).forEach(function (q) { if (st.ans[q] !== '' && st.ans[q] != null) secs[q.charAt(0)] = (secs[q.charAt(0)] || 0) + 1; });
        var open = Object.keys(secs).filter(function (x) { return !(st.done && st.done[x]); }); if (!open.length) continue;
        var mode = m[3] || '', cnt = open.reduce(function (a, x) { return a + secs[x]; }, 0);
        U.push({ site: 'ielts', label: BN(m[1]) + ' · Test ' + m[2], sub: (open.indexOf('L') >= 0 && open.indexOf('R') >= 0 ? 'Listening + Reading' : open[0] === 'L' ? 'Listening' : 'Reading') + (mode && mode.length > 1 ? (mode[0] === 'L' ? ' Part ' : ' Passage ') + mode.slice(1) : '') + (m[4] ? ' · thi thử' : '') + ' · đã làm ' + cnt + ' câu', href: 'cam/' + BD(m[1]) + '/test-' + m[2] + '.html' + (mode ? '?part=' + mode + (m[4] ? '&thi=1' : '') : ''), at: (st.time && 0) || 0 });
      }
    }
    o.unfinished = U;
    // bài nộp gần đây
    var R = [];
    th.forEach(function (r) { if (r && r.at) R.push({ site: 'toeic', at: +new Date(r.at), label: (r.test > 10 ? 'ETS 2024 · Test ' + (r.test - 10) : 'ETS 2026 · Test ' + r.test) + ' · ' + (r.name || ''), res: r.got + '/' + r.total + (r.lcS || r.rcS ? ' · ~' + ((r.lcS || 0) + (r.rcS || 0)) : ''), href: r.ans && r.mode ? 'toeic/test.html?t=' + r.test + '&m=' + r.mode + '&xem=' + r.at : '', src: 'ets26.hist', rk: String(r.at) }); });
    BOOKS.forEach(function (b) { J('cam' + b + '.hist', []).forEach(function (r) { if (r && r.t) R.push({ site: 'ielts', at: +r.t, label: BN(b).replace('Cambridge IELTS', 'Cambridge') + ' · Test ' + r.test + ' · ' + (r.sec === 'L' ? 'Listening' : r.sec === 'R' ? 'Reading' : (r.sec || '')), res: r.got + '/' + r.total + (r.band ? ' · band ' + r.band : ''), href: r.ans ? 'cam/' + BD(b) + '/test-' + r.test + '.html?xem=' + r.t : '', src: 'cam' + b + '.hist', rk: String(r.t) }); }); });
    o.recent = R.sort(function (a, b) { return b.at - a.at; }).slice(0, 8);
    // điểm tuần (giống bảng xếp hạng)
    var dd = new Date(), mon = new Date(dd.getFullYear(), dd.getMonth(), dd.getDate() - (dd.getDay() + 6) % 7), wp = 0, wd = 0;
    for (var j = 0; j < 7; j++) { var x = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + j), c = act[dkey(x)] || 0; if (c) { wd++; wp += 20 + Math.min(40, c * 3); } }
    o.week = { pts: wp, days: wd };
    return o;
  }

  // lịch các ngày đã học (kiểu ô vuông), 'weeks' tuần gần nhất
  function heat(days, act, weeks) {
    weeks = weeks || 20; var end = new Date(), start = new Date(end.getFullYear(), end.getMonth(), end.getDate() - (end.getDay() + 6) % 7 - (weeks - 1) * 7);
    var h = '<div class="mheat" role="img" aria-label="Các ngày đã học trong ' + weeks + ' tuần gần đây">', WD = ['T2', '', 'T4', '', 'T6', '', 'CN'];
    h += '<div class="mh-l">' + WD.map(function (w) { return '<i>' + w + '</i>'; }).join('') + '</div><div class="mh-g">';
    for (var w = 0; w < weeks; w++) {
      h += '<div class="mh-c">';
      for (var d = 0; d < 7; d++) {
        var x = new Date(start.getFullYear(), start.getMonth(), start.getDate() + w * 7 + d), k = dkey(x), fut = x > end, n = (act && act[k]) || (days[k] ? 1 : 0);
        var lv = fut ? -1 : !n ? 0 : n < 3 ? 1 : n < 7 ? 2 : 3;
        h += '<i class="l' + lv + '" title="' + k.split('-').reverse().join('/') + (n ? ' · có học' : '') + '"></i>';
      }
      h += '</div>';
    }
    return h + '</div></div>';
  }
  var css = document.createElement('style');
  css.textContent = '.mheat{display:flex;gap:4px;overflow-x:auto;padding-bottom:2px}.mh-l,.mh-c{display:grid;grid-template-rows:repeat(7,13px);gap:3px}.mh-l i{font:500 9.5px/13px "IBM Plex Sans",sans-serif;color:#8a8f99;font-style:normal;width:16px}' +
    '.mh-g{display:flex;gap:3px}.mh-c i{width:13px;height:13px;border-radius:3px;background:#eee7da}.mh-c i.l1{background:#f2d08f}.mh-c i.l2{background:#d9a248}.mh-c i.l3{background:#a8691a}.mh-c i.l-1{background:transparent}';
  document.head.appendChild(css);
  function summaryFrom(map) { SRC = map || {}; try { return summary(); } finally { SRC = null; } }
  window.MPROG = { summary: summary, summaryFrom: summaryFrom, heat: heat, esc: esc, dkey: dkey };
})();
