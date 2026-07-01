/* evm.js — Perhitungan EVM murni (pure functions).
 *
 * Tidak menyentuh global P/RAB/COSTS/DOM. Semua input lewat argumen,
 * semua output lewat return. Karena deterministik & tanpa efek samping,
 * fungsi-fungsi ini bisa di-unit-test tanpa browser/Supabase.
 *
 * Math di sini = ekstraksi 1:1 dari _analyzeProjectImpl() di diagnosa.js.
 */
(function (root) {
  'use strict';

  var DAY = 86400000;
  function round2(n) { return Math.round(n * 100) / 100; }

  // ── Jadwal berbasis nilai (value-based) ────────────────────────
  // plan = rencana% saat ini, actual = aktual%
  function calcSchedule(plan, actual) {
    var cp = +plan || 0;
    var act = +actual || 0;
    return {
      plan: cp,
      actual: act,
      variance: round2(act - cp),
      spi: cp > 0 ? act / cp : null
    };
  }

  // ── Forecast selesai (durasi rencana / SPI) ────────────────────
  // mulai/selesai: Date | string | null. Mengembalikan {finish, delayDays}.
  function calcForecast(mulai, selesai, spi, actual) {
    var sd = mulai ? new Date(mulai) : null;
    var ed = selesai ? new Date(selesai) : null;
    var act = +actual || 0;
    var ok = sd && ed && spi && spi > 0 &&
      !isNaN(sd.getTime()) && !isNaN(ed.getTime()) && act < 99.5;
    if (!ok) return { finish: null, delayDays: null };
    var dur = Math.max(1, (ed - sd) / DAY);
    var finish = new Date(sd.getTime() + (dur / spi) * DAY);
    return { finish: finish, delayDays: Math.round((finish - ed) / DAY) };
  }

  // ── Biaya / EVM nilai ──────────────────────────────────────────
  // rabTotal = total RAB, costReal = realisasi kas, costEarned = biaya
  // yang sudah "earned" (untuk CPI). actual = aktual%.
  function calcCost(rabTotal, costReal, costEarned, actual) {
    var rab = +rabTotal || 0;
    var real = +costReal || 0;
    var earned = +costEarned || 0;
    var act = +actual || 0;
    var ev = rab * (act / 100);
    var cpi = earned > 0 ? ev / earned : null;
    var eac = (cpi && cpi > 0) ? rab / cpi : null;
    return {
      rab: rab,
      ev: ev,
      cpi: cpi,
      eac: eac,
      eacOver: eac != null ? eac - rab : null,
      serap: rab > 0 ? Math.round(real / rab * 1000) / 10 : 0
    };
  }

  // ── Orkestrator: gabung semua dari satu objek input "telanjang" ─
  // Pemanggil bertugas mengisi p{} dari global; evm.js tetap murni.
  function analyze(p) {
    p = p || {};
    var sched = calcSchedule(p.plan, p.actual);
    var fc = calcForecast(p.mulai, p.selesai, sched.spi, p.actual);
    var cost = calcCost(p.rabTotal, p.costReal, p.costEarned, p.actual);
    return {
      spi: sched.spi,
      variance: sched.variance,
      fcFinish: fc.finish,
      fcDelay: fc.delayDays,
      cpi: cost.cpi,
      ev: cost.ev,
      eac: cost.eac,
      eacOver: cost.eacOver,
      serap: cost.serap
    };
  }

  // ── Earned Schedule (ES/SPI-t) ─────────────────────────────────
  // points = [{w:minggu, c:cPlan%}] terurut menaik; actual = aktual%.
  // Mengembalikan {es, pd} (minggu) atau null bila kurva tak memadai.
  function calcES(points, actual) {
    var act = +actual || 0;
    var pts = [{ w: 0, c: 0 }];
    (points || []).forEach(function (s) { pts.push({ w: +s.w || 0, c: +s.c || 0 }); });
    if (pts.length < 2) return null;
    var last = pts[pts.length - 1], pd = last.w, k, dd;
    for (k = 1; k < pts.length; k++) {
      if (pts[k].c >= 100) {
        dd = pts[k].c - pts[k - 1].c;
        pd = dd > 0 ? pts[k - 1].w + (100 - pts[k - 1].c) / dd * (pts[k].w - pts[k - 1].w) : pts[k].w;
        break;
      }
    }
    var es = null, i, d;
    if (act <= 0) es = 0;
    else {
      for (i = 1; i < pts.length; i++) {
        if (act <= pts[i].c) {
          d = pts[i].c - pts[i - 1].c;
          es = d > 0 ? pts[i - 1].w + (act - pts[i - 1].c) / d * (pts[i].w - pts[i - 1].w) : pts[i].w;
          break;
        }
      }
      if (es == null) es = last.w;
    }
    return { es: Math.round(es * 10) / 10, pd: Math.round(pd * 10) / 10 };
  }

  var api = { calcSchedule: calcSchedule, calcForecast: calcForecast,
              calcCost: calcCost, calcES: calcES, analyze: analyze };

  // Browser: gantungkan ke window.EVM. Node/test: module.exports.
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.EVM = api;
})(typeof self !== 'undefined' ? self : this);
