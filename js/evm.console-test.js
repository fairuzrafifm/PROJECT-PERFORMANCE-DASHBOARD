/* evm.console-test.js
 * Tes EVM versi BROWSER — paste seluruh isi file ini ke Console DevTools
 * (F12 → tab Console), lalu Enter. Tidak butuh Node, require, atau file lain.
 * Hasil muncul langsung di Console. Tidak mengubah apa pun di dashboard.
 */
(function () {
  'use strict';

  // ── Fungsi EVM (sama dengan _EVM di diagnosa.js) ───────────────
  var DAY = 86400000;
  function r2(n) { return Math.round(n * 100) / 100; }
  function calcSchedule(plan, actual) {
    var cp = +plan || 0, act = +actual || 0;
    return { plan: cp, actual: act, variance: r2(act - cp), spi: cp > 0 ? act / cp : null };
  }
  function calcForecast(mulai, selesai, spi, actual) {
    var sd = mulai ? new Date(mulai) : null, ed = selesai ? new Date(selesai) : null, act = +actual || 0;
    var ok = sd && ed && spi && spi > 0 && !isNaN(sd.getTime()) && !isNaN(ed.getTime()) && act < 99.5;
    if (!ok) return { finish: null, delayDays: null };
    var dur = Math.max(1, (ed - sd) / DAY);
    var finish = new Date(sd.getTime() + (dur / spi) * DAY);
    return { finish: finish, delayDays: Math.round((finish - ed) / DAY) };
  }
  function calcCost(rabTotal, costReal, costEarned, actual) {
    var rab = +rabTotal || 0, real = +costReal || 0, earned = +costEarned || 0, act = +actual || 0;
    var ev = rab * (act / 100);
    var cpi = earned > 0 ? ev / earned : null;
    var eac = (cpi && cpi > 0) ? rab / cpi : null;
    return { rab: rab, ev: ev, cpi: cpi, eac: eac,
      eacOver: eac != null ? eac - rab : null,
      serap: rab > 0 ? Math.round(real / rab * 1000) / 10 : 0 };
  }
  function calcES(points, actual) {
    var act = +actual || 0;
    var pts = [{ w: 0, c: 0 }];
    (points || []).forEach(function (s) { pts.push({ w: +s.w || 0, c: +s.c || 0 }); });
    if (pts.length < 2) return null;
    var last = pts[pts.length - 1], pd = last.w, k, dd;
    for (k = 1; k < pts.length; k++) {
      if (pts[k].c >= 100) { dd = pts[k].c - pts[k - 1].c;
        pd = dd > 0 ? pts[k - 1].w + (100 - pts[k - 1].c) / dd * (pts[k].w - pts[k - 1].w) : pts[k].w; break; }
    }
    var es = null, i, d;
    if (act <= 0) es = 0;
    else {
      for (i = 1; i < pts.length; i++) {
        if (act <= pts[i].c) { d = pts[i].c - pts[i - 1].c;
          es = d > 0 ? pts[i - 1].w + (act - pts[i - 1].c) / d * (pts[i].w - pts[i - 1].w) : pts[i].w; break; }
      }
      if (es == null) es = last.w;
    }
    return { es: Math.round(es * 10) / 10, pd: Math.round(pd * 10) / 10 };
  }

  // ── Runner sederhana ───────────────────────────────────────────
  var pass = 0, fail = 0;
  function ok(cond, msg) {
    if (cond) { pass++; console.log('%c ok   %c' + msg, 'color:#16a34a', 'color:inherit'); }
    else { fail++; console.log('%c FAIL %c' + msg, 'color:#dc2626;font-weight:bold', 'color:#dc2626'); }
  }
  function approx(a, b, eps) { return Math.abs(a - b) <= (eps || 1e-9); }

  console.log('%cTes EVM (browser)', 'font-weight:bold;font-size:13px');

  // SPI / variance
  var s = calcSchedule(50, 40);
  ok(approx(s.spi, 0.8) && s.variance === -10, 'SPI = aktual/rencana (0.8), variance -10');
  ok(calcSchedule(0, 30).spi === null, 'rencana 0 → SPI null (bukan Infinity)');
  ok(calcSchedule('60', '').actual === 0, 'input string/kosong ditoleransi');

  // Forecast
  var f1 = calcForecast('2026-01-01', '2026-04-11', 0.5, 40);
  ok(f1.finish instanceof Date && f1.delayDays > 90 && f1.delayDays < 110, 'proyek telat (SPI 0.5) → telat ~100 hari');
  var f2 = calcForecast('2026-01-01', '2026-04-11', 0.5, 99.6);
  ok(f2.finish === null, 'aktual ≥ 99.5% → tidak ada forecast');
  ok(calcForecast(null, '2026-04-11', 0.8, 50).finish === null, 'tanggal tidak lengkap → null aman');

  // CPI / EAC / serapan
  var c = calcCost(1000, 450, 400, 50);
  ok(approx(c.ev, 500) && approx(c.cpi, 1.25) && approx(c.eac, 800), 'CPI 1.25 & EAC 800 (RAB 1000, aktual 50%, earned 400)');
  ok(approx(c.serap, 45), 'serapan 45% (450/1000)');
  var c0 = calcCost(1000, 100, 0, 20);
  ok(c0.cpi === null && c0.eac === null, 'earned 0 → CPI & EAC null (hindari bagi nol)');
  var co = calcCost(1000, 700, 800, 50);
  ok(co.cpi < 1 && co.eac > 1000 && co.eacOver > 0, 'over-budget: CPI<1 → EAC>RAB');

  // Earned Schedule
  var CURVE = [{ w: 1, c: 25 }, { w: 2, c: 50 }, { w: 3, c: 75 }, { w: 4, c: 100 }];
  ok(approx(calcES(CURVE, 50).pd, 4), 'pd = 4 mgg (plan capai 100% di minggu 4)');
  ok(approx(calcES(CURVE, 50).es, 2), 'aktual 50% → ES 2 mgg');
  ok(calcES(CURVE, 0).es === 0, 'aktual 0% → ES 0');
  ok(approx(calcES(CURVE, 60).es, 2.4), 'interpolasi: aktual 60% → ES 2.4 mgg');
  ok(approx(calcES(CURVE, 110).es, 4), 'aktual > plan maks → ES minggu terakhir');
  ok(calcES([], 50) === null, 'kurva kosong → null');

  console.log('%c' + pass + ' passed, ' + fail + ' failed',
    'font-weight:bold;color:' + (fail ? '#dc2626' : '#16a34a'));
  return pass + ' passed, ' + fail + ' failed';
})();
