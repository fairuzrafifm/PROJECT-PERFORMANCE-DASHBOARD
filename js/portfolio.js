// ============================================================
//  ATW Solar — Skor Portofolio
//  Menghitung ringkasan kesehatan lintas-proyek (skor rata-rata
//  & distribusi) dari analyzeProject() (diagnosa.js). Dipakai
//  untuk mengisi kartu KPI "Skor Portofolio" di tab Overview.
//  Detail per-proyek ada di Project Status Cards (tidak diduplikasi).
// ============================================================
(function () {
  'use strict';

  function portfolioScore() {
    if (typeof analyzeProject !== 'function') return null;
    var projs = (typeof P !== 'undefined' ? P : []);
    if (!projs.length) return { n: 0, avg: 0, sehat: 0, perhatian: 0, kritis: 0, color: 'var(--mt)' };

    var rows = [];
    projs.forEach(function (p) {
      var a = null;
      try { a = analyzeProject(p.id); } catch (e) { a = null; }
      if (a) rows.push(a);
    });
    if (!rows.length) return { n: 0, avg: 0, sehat: 0, perhatian: 0, kritis: 0, color: 'var(--mt)' };

    var n = rows.length;
    var avg = Math.round(rows.reduce(function (s, a) { return s + (+a.score || 0); }, 0) / n);
    var sehat = rows.filter(function (a) { return a.score >= 80; }).length;
    var perhatian = rows.filter(function (a) { return a.score >= 55 && a.score < 80; }).length;
    var kritis = rows.filter(function (a) { return a.score < 55; }).length;
    var color = avg >= 80 ? 'var(--gn)' : avg >= 55 ? 'var(--yw)' : 'var(--rd)';

    return { n: n, avg: avg, sehat: sehat, perhatian: perhatian, kritis: kritis, color: color };
  }

  window.portfolioScore = portfolioScore;
})();
