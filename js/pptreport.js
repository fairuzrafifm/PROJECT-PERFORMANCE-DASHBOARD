// ===============================================================
// pptreport.js — Export laporan ke PowerPoint (.pptx)
// ATW Solar Project Performance Dashboard
// ---------------------------------------------------------------
// Gaya visual: template ATW biru-geometris (parallelogram, navy, emas).
// Konten mengacu pada format ATW Solar Weekly Report.
//   • generateClientPPT()      → Progress proyek (untuk CLIENT)
//        - TANPA CPI / informasi biaya
//        - dilengkapi slide STATUS PROCUREMENT
//   • generateManagementPPT()  → Review portfolio (INTERNAL / manajemen)
// Library PptxGenJS dimuat lazy via CDN saat tombol diklik.
// ===============================================================
(function () {
  'use strict';

  // ── Palette template ATW ───────────────────────────────────────
  var C = {
    blue: '2C7FB8', blueDk: '1B4F7E', navy: '14304D', sky: '5AA0D0',
    pale: 'E8F1F8', paleBlue: 'D4E6F4', gold: 'F0A500', goldDk: 'C98A00',
    ink: '1E2A38', ink2: '34465A', mute: '7A8896', line: 'DCE5EE',
    white: 'FFFFFF', bg2: 'F4F8FB',
    good: '2BA67A', warn: 'E0A93B', crit: 'D9534F', ring: 'E3EBF2'
  };
  var HEAD = 'Poppins', BODY = 'Segoe UI';
  var PW = 13.333, PH = 7.5, MX = 0.62;

  // ── Format helpers ─────────────────────────────────────────────
  function num(v) { var x = +v; return isNaN(x) ? 0 : x; }
  function pct1(v) { return (Math.round(num(v) * 10) / 10).toFixed(1) + '%'; }
  function f2(v) { return (v == null || isNaN(+v)) ? '\u2014' : (+v).toFixed(2); }
  function rpShort(v) {
    if (typeof fmtRpShort === 'function') return fmtRpShort(v);
    var x = num(v);
    return x >= 1e9 ? 'Rp ' + (x / 1e9).toFixed(1) + 'M' : x >= 1e6 ? 'Rp ' + (x / 1e6).toFixed(1) + 'jt' : 'Rp ' + x.toLocaleString('id-ID');
  }
  function dID(d) {
    if (!d) return '\u2014';
    var dt = new Date(d); if (isNaN(dt.getTime())) return String(d).slice(0, 10);
    return dt.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  function statusColor(s) { return s === 'On Track' ? C.good : s === 'Delayed' ? C.warn : s === 'Critical' ? C.crit : s === 'Done' ? C.blue : C.sky; }
  function spiColor(v) { return v == null ? C.mute : v >= 0.95 ? C.good : v >= 0.85 ? C.warn : C.crit; }
  function cpiColor(v) { return v == null ? C.mute : v >= 1.0 ? C.good : v >= 0.9 ? C.warn : C.crit; }
  function healthColor(s) { return s == null ? C.mute : s >= 80 ? C.good : s >= 55 ? C.warn : C.crit; }
  function _toast(m) { if (typeof toast === 'function') toast(m); else console.log(m); }

  // ── Lazy-load PptxGenJS ────────────────────────────────────────
  function loadPptxLib() {
    return new Promise(function (resolve, reject) {
      if (window.PptxGenJS) return resolve(window.PptxGenJS);
      var urls = [
        'https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js',
        'https://cdnjs.cloudflare.com/ajax/libs/pptxgenjs/3.12.0/pptxgen.bundle.js',
        'https://unpkg.com/pptxgenjs@3.12.0/dist/pptxgen.bundle.js'
      ];
      var i = 0;
      (function tryNext() {
        if (i >= urls.length) return reject(new Error('Gagal memuat PptxGenJS'));
        var s = document.createElement('script');
        s.src = urls[i++]; s.onload = function () { window.PptxGenJS ? resolve(window.PptxGenJS) : tryNext(); }; s.onerror = tryNext;
        document.head.appendChild(s);
      })();
    });
  }

  // ── Data: S-curve kumulatif ────────────────────────────────────
  function scurveData(projId) {
    var SC = (typeof SCURVE !== 'undefined') ? SCURVE : [];
    var rows = SC.filter(function (d) { return String(d.projId) === String(projId); }).sort(function (a, b) { return (+a.week) - (+b.week); });
    if (!rows.length) return null;
    var lastAct = rows.filter(function (d) { return num(d.wAct) > 0 || d.cAct != null; }).reduce(function (m, d) { return Math.max(m, +d.week); }, 0);
    var labels = [], plan = [], actual = [], cp = 0, ca = 0;
    rows.forEach(function (d) {
      cp += num(d.wPlan);
      labels.push('W' + String(d.week).padStart(2, '0'));
      plan.push(Math.round(((d.cPlan != null) ? num(d.cPlan) : cp) * 10) / 10);
      if (+d.week <= lastAct) { ca += num(d.wAct); if (d.cAct != null) ca = num(d.cAct); actual.push(Math.round(ca * 10) / 10); }
      else actual.push(null);
    });
    return { labels: labels, plan: plan, actual: actual, lastAct: lastAct };
  }

  // ── Data: progress WBS per kategori ────────────────────────────
  function wbsByCategory(projId) {
    var W = (typeof WBS !== 'undefined') ? WBS : [];
    var all = W.filter(function (w) { return String(w.projId) === String(projId); });
    if (!all.length) return [];
    var byParent = {};
    all.forEach(function (w) { (byParent[w.parentId] = byParent[w.parentId] || []).push(w); });
    var kids = function (id) { return all.filter(function (w) { return String(w.parentId) === String(id); }); };
    var cats = all.filter(function (w) { return w.type === 'cat'; }).sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
    return cats.map(function (cat) {
      // kumpulkan seluruh item daun di bawah kategori (lewat subcat)
      var items = [];
      function collect(id) { kids(id).forEach(function (c) { if (c.type === 'item') items.push(c); else collect(c.id); }); }
      collect(cat.id);
      // bila kategori langsung punya item
      if (!items.length) items = all.filter(function (w) { return w.type === 'item' && String(w.parentId) === String(cat.id); });
      var bobot = items.reduce(function (s, x) { return s + num(x.bobot); }, 0);
      var pct = bobot > 0 ? items.reduce(function (s, x) { return s + num(x.bobot) * num(x.cumActual); }, 0) / bobot : 0;
      return { name: cat.name || cat.nama || '\u2014', bobot: Math.round(bobot * 10) / 10, pct: Math.round(pct * 10) / 10 };
    });
  }
  function catStatus(pct) { return pct >= 99.5 ? { t: 'Selesai', c: C.good } : pct > 0 ? { t: 'Berjalan', c: C.blue } : { t: 'Belum mulai', c: C.mute }; }

  // ── Data: ringkasan procurement ────────────────────────────────
  var PROC_ORDER = ['Waiting Approval', 'PO Issued', 'On Production', 'In Transit', 'On Site', 'Done'];
  function procSummary(projId) {
    var PR = (typeof PROC !== 'undefined') ? PROC : [];
    var items = PR.filter(function (i) { return String(i.projId) === String(projId); });
    var byStatus = {}; PROC_ORDER.forEach(function (s) { byStatus[s] = 0; });
    var today = new Date(); today.setHours(0, 0, 0, 0);
    var open = 0, done = 0, onsite = 0, overdue = 0, overdueItems = [];
    items.forEach(function (i) {
      var st = i.status || 'Waiting Approval'; if (byStatus[st] == null) byStatus[st] = 0; byStatus[st]++;
      var isOpen = st !== 'On Site' && st !== 'Done';
      if (st === 'Done' || st === 'On Site') { done += (st === 'Done' ? 1 : 0); onsite += (st === 'On Site' ? 1 : 0); }
      if (isOpen) { open++; if (i.due) { var d = new Date(i.due); d.setHours(0, 0, 0, 0); if (!isNaN(d.getTime()) && d < today) { overdue++; overdueItems.push({ name: i.nama || i.item || i.name || 'Item', due: i.due }); } } }
    });
    overdueItems.sort(function (a, b) { return new Date(a.due) - new Date(b.due); });
    return { total: items.length, byStatus: byStatus, open: open, done: done, onsite: onsite, overdue: overdue, overdueItems: overdueItems };
  }

  function _asset(k) { try { return (window.ATW_PPT_ASSETS || {})[k] || ''; } catch (e) { return ''; } }
  function getLogo() {
    var a = _asset('logo'); if (a) return a;
    try { var l = localStorage.getItem('atw_dash_logo') || (document.getElementById('dashLogoImg') || {}).src || ''; return (l && l.indexOf('data:') === 0) ? l : ''; } catch (e) { return ''; }
  }

  // ===============================================================
  //  CHROME TEMPLATE (parallelogram, logo, header, footer)
  // ===============================================================
  var P_; // pptx instance shortcut (di-set per deck)
  var LOGO_AR = 2.517; // rasio lebar:tinggi logo ATW (700x278)

  // Logo ATW (pakai gambar asli; chip putih bila latar gelap)
  function logoMark(slide, x, y, h, dark) {
    var logo = getLogo();
    if (logo) {
      var w = h * LOGO_AR;
      if (dark) slide.addShape(P_.ShapeType.roundRect, { x: x - 0.12, y: y - 0.09, w: w + 0.4, h: h + 0.18, rectRadius: 0.05, fill: { color: 'FFFFFF' }, line: { type: 'none' }, shadow: { type: 'outer', color: '0A1A2E', blur: 5, offset: 2, angle: 90, opacity: 0.35 } });
      try { slide.addImage({ data: logo, x: x + (dark ? 0.06 : 0), y: y, w: w, h: h, sizing: { type: 'contain', w: w, h: h } }); return; } catch (e) { }
    }
    drawnMark(slide, x, y, h, dark);
  }
  // Fallback: mark digambar bila gambar tidak tersedia
  function drawnMark(slide, x, y, h, dark) {
    var bw = h * 0.42, gap = h * 0.10;
    slide.addShape(P_.ShapeType.parallelogram, { x: x, y: y + h * 0.05, w: bw, h: h * 0.9, fill: { color: C.navy }, line: { type: 'none' } });
    slide.addShape(P_.ShapeType.parallelogram, { x: x + bw - gap, y: y, w: bw, h: h, fill: { color: C.blue }, line: { type: 'none' } });
    slide.addShape(P_.ShapeType.parallelogram, { x: x + (bw - gap) * 2, y: y + h * 0.12, w: bw * 0.8, h: h * 0.76, fill: { color: C.sky }, line: { type: 'none' } });
    slide.addText([{ text: 'ATW', options: { bold: true, color: dark ? C.white : C.navy } }, { text: 'Solar', options: { bold: true, color: C.blue } }],
      { x: x + bw * 2.5, y: y - h * 0.1, w: h * 3.0, h: h * 1.2, fontFace: HEAD, fontSize: h * 26, align: 'left', valign: 'middle' });
  }

  // Frame foto miring berbingkai putih (gaya template ATW)
  function photoFrame(slide, x, y, w, h, rot, img) {
    img = img || _asset('hero');
    // bayangan + bingkai putih
    slide.addShape(P_.ShapeType.rect, { x: x, y: y, w: w, h: h, rotate: rot, fill: { color: 'FFFFFF' }, line: { type: 'none' }, shadow: { type: 'outer', color: '0A2540', blur: 10, offset: 4, angle: 90, opacity: 0.4 } });
    var pad = 0.09;
    if (img) { try { slide.addImage({ data: img, x: x + pad, y: y + pad, w: w - pad * 2, h: h - pad * 2, rotate: rot, sizing: { type: 'cover', w: w - pad * 2, h: h - pad * 2 } }); } catch (e) { } }
    else slide.addShape(P_.ShapeType.rect, { x: x + pad, y: y + pad, w: w - pad * 2, h: h - pad * 2, rotate: rot, fill: { color: C.sky }, line: { type: 'none' } });
  }

  // Aksen geometris sudut (subtle) untuk slide konten
  function cornerAccent(slide) {
    slide.addShape(P_.ShapeType.parallelogram, { x: PW - 1.5, y: PH - 0.9, w: 1.1, h: 0.55, fill: { color: C.pale }, line: { type: 'none' } });
    slide.addShape(P_.ShapeType.parallelogram, { x: PW - 1.0, y: PH - 0.78, w: 0.8, h: 0.42, fill: { color: C.paleBlue }, line: { type: 'none' } });
  }

  function header(slide, title, sub, audienceTag) {
    // label kiri-atas
    slide.addText([
      { text: 'PMO & ENGINEERING DIVISION', options: { color: C.mute, bold: true } },
      { text: '   |   PROJECT MONITORING', options: { color: C.blue, bold: true } }
    ], { x: MX, y: 0.24, w: 8, h: 0.3, fontFace: BODY, fontSize: 8.5, align: 'left', valign: 'middle', charSpacing: 1 });
    // label kanan-atas
    slide.addText(audienceTag || 'CONFIDENTIAL \u00b7 INTERNAL USE ONLY', { x: PW - MX - 5, y: 0.24, w: 5, h: 0.3, fontFace: BODY, fontSize: 8.5, color: C.mute, align: 'right', valign: 'middle', charSpacing: 1 });
    // tab geometris + judul
    slide.addShape(P_.ShapeType.parallelogram, { x: MX, y: 0.72, w: 0.34, h: 0.46, fill: { color: C.blue }, line: { type: 'none' } });
    slide.addShape(P_.ShapeType.parallelogram, { x: MX + 0.22, y: 0.72, w: 0.18, h: 0.46, fill: { color: C.gold }, line: { type: 'none' } });
    slide.addText(title, { x: MX + 0.55, y: 0.6, w: PW - MX * 2 - 0.55, h: 0.62, fontFace: HEAD, fontSize: 26, bold: true, color: C.navy, align: 'left', valign: 'middle' });
    if (sub) slide.addText(sub, { x: MX + 0.57, y: 1.22, w: PW - MX * 2, h: 0.3, fontFace: BODY, fontSize: 11.5, color: C.mute, align: 'left', valign: 'middle' });
    // garis emas pendek
    slide.addShape(P_.ShapeType.rect, { x: MX + 0.57, y: 1.56, w: 0.9, h: 0.045, fill: { color: C.gold }, line: { type: 'none' } });
    slide.addShape(P_.ShapeType.line, { x: MX + 1.55, y: 1.585, w: PW - MX - (MX + 1.55), h: 0, line: { color: C.line, width: 1 } });
  }

  function footer(slide, page) {
    slide.addShape(P_.ShapeType.line, { x: MX, y: PH - 0.5, w: PW - MX * 2, h: 0, line: { color: C.line, width: 0.75 } });
    logoMark(slide, MX, PH - 0.42, 0.22, false);
    slide.addText('PT. ATW Solar Indonesia \u00b7 Triputra Group', { x: MX + 1.7, y: PH - 0.46, w: 6, h: 0.3, fontFace: BODY, fontSize: 8, color: C.mute, align: 'left', valign: 'middle' });
    if (page) slide.addText(String(page), { x: PW - MX - 1, y: PH - 0.46, w: 1, h: 0.3, fontFace: BODY, fontSize: 9, color: C.blue, bold: true, align: 'right', valign: 'middle' });
  }

  // KPI card bergaya template (shadow halus, accent atas)
  function kpiCard(slide, x, y, w, h, value, label, sub, color) {
    color = color || C.blue;
    slide.addShape(P_.ShapeType.roundRect, {
      x: x, y: y, w: w, h: h, rectRadius: 0.06, fill: { color: C.white }, line: { color: C.line, width: 1 },
      shadow: { type: 'outer', color: '9FB2C4', blur: 6, offset: 2, angle: 90, opacity: 0.28 }
    });
    slide.addShape(P_.ShapeType.parallelogram, { x: x + 0.16, y: y + 0.16, w: 0.5, h: 0.12, fill: { color: color }, line: { type: 'none' } });
    slide.addText(String(value), { x: x + 0.12, y: y + 0.30, w: w - 0.24, h: h * 0.42, fontFace: HEAD, fontSize: 26, bold: true, color: color, align: 'left', valign: 'middle' });
    slide.addText(String(label).toUpperCase(), { x: x + 0.16, y: y + h * 0.66, w: w - 0.28, h: 0.24, fontFace: BODY, fontSize: 9, bold: true, color: C.ink, align: 'left', charSpacing: 0.5 });
    if (sub) slide.addText(String(sub), { x: x + 0.16, y: y + h * 0.81, w: w - 0.28, h: 0.2, fontFace: BODY, fontSize: 8, color: C.mute, align: 'left' });
  }

  // Ring gauge (doughnut) + label tengah
  function ring(slide, cx, cy, dia, ratio, big, small, color) {
    var fill = Math.max(0, Math.min(1, ratio == null ? 0 : ratio)) * 100;
    slide.addChart(P_.ChartType.doughnut, [{ name: 'g', labels: ['v', 'r'], values: [Math.round(fill * 10) / 10, Math.round((100 - fill) * 10) / 10] }], {
      x: cx - dia / 2, y: cy - dia / 2, w: dia, h: dia, holeSize: 66, showLegend: false, showTitle: false, showValue: false,
      chartColors: [color, C.ring], dataBorder: { pt: 1.5, color: 'FFFFFF' }
    });
    slide.addText(big, { x: cx - dia / 2, y: cy - 0.32, w: dia, h: 0.4, fontFace: HEAD, fontSize: 18, bold: true, color: color, align: 'center', valign: 'middle' });
    if (small) slide.addText(small, { x: cx - dia / 2, y: cy + 0.06, w: dia, h: 0.24, fontFace: BODY, fontSize: 8, color: C.mute, align: 'center', valign: 'middle' });
  }

  function statusPill(slide, x, y, label, color) {
    var w = Math.max(1.3, 0.13 * label.length + 0.5);
    slide.addShape(P_.ShapeType.roundRect, { x: x, y: y, w: w, h: 0.4, rectRadius: 0.2, fill: { color: color }, line: { type: 'none' } });
    slide.addText(label.toUpperCase(), { x: x, y: y, w: w, h: 0.4, fontFace: BODY, fontSize: 10.5, bold: true, color: 'FFFFFF', align: 'center', valign: 'middle', charSpacing: 1 });
    return w;
  }

  // Banner status (navy box + heading emas)
  function banner(slide, x, y, w, h, heading, body, accent) {
    accent = accent || C.gold;
    slide.addShape(P_.ShapeType.roundRect, { x: x, y: y, w: w, h: h, rectRadius: 0.06, fill: { color: C.navy }, line: { type: 'none' } });
    slide.addShape(P_.ShapeType.parallelogram, { x: x + 0.2, y: y + h / 2 - 0.22, w: 0.16, h: 0.44, fill: { color: accent }, line: { type: 'none' } });
    slide.addText(heading.toUpperCase(), { x: x + 0.55, y: y + 0.18, w: w - 0.8, h: 0.34, fontFace: HEAD, fontSize: 14, bold: true, color: accent, align: 'left', valign: 'middle', charSpacing: 0.5 });
    slide.addText(body, { x: x + 0.55, y: y + 0.56, w: w - 0.85, h: h - 0.7, fontFace: BODY, fontSize: 10.5, color: 'DCE7F2', align: 'left', valign: 'top', lineSpacingMultiple: 1.05 });
  }

  // ── Cover ──────────────────────────────────────────────────────
  function coverSlide(opts) {
    var s = P_.addSlide(); s.background = { color: C.white };
    // ── panel geometris kanan (backdrop) ──
    s.addShape(P_.ShapeType.parallelogram, { x: PW - 3.7, y: -1.2, w: 4.4, h: PH + 2.4, fill: { color: C.navy }, line: { type: 'none' } });
    s.addShape(P_.ShapeType.parallelogram, { x: PW - 5.1, y: -1.2, w: 2.1, h: PH + 2.4, fill: { color: C.blue }, line: { type: 'none' } });
    s.addShape(P_.ShapeType.parallelogram, { x: PW - 5.85, y: 1.0, w: 0.85, h: 4.6, fill: { color: C.gold }, line: { type: 'none' } });
    // ── foto proyek dalam frame miring (collage) ──
    photoFrame(s, PW - 4.55, 0.95, 3.95, 2.75, -7, _asset('hero'));
    s.addShape(P_.ShapeType.parallelogram, { x: PW - 2.0, y: 3.7, w: 1.3, h: 2.0, fill: { color: C.sky }, line: { type: 'none' } });
    photoFrame(s, PW - 3.85, 3.95, 2.7, 2.0, 5, _asset('hero2'));
    // ── logo asli ──
    logoMark(s, MX, 0.62, 0.52, false);
    // ── label & judul ──
    s.addText(opts.audience || 'INTERNAL', { x: MX, y: 2.25, w: 7, h: 0.34, fontFace: BODY, fontSize: 12, bold: true, color: C.gold, align: 'left', charSpacing: 3 });
    s.addText(opts.kicker, { x: MX, y: 2.6, w: 7.5, h: 0.4, fontFace: BODY, fontSize: 13, bold: true, color: C.blue, align: 'left', charSpacing: 2 });
    s.addText(opts.title, { x: MX, y: 3.05, w: 7.7, h: 1.6, fontFace: HEAD, fontSize: 34, bold: true, color: C.navy, align: 'left', valign: 'top', lineSpacingMultiple: 0.96 });
    if (opts.subtitle) s.addText(opts.subtitle, { x: MX, y: 4.55, w: 7.7, h: 0.5, fontFace: BODY, fontSize: 14.5, color: C.ink2, align: 'left' });
    s.addShape(P_.ShapeType.rect, { x: MX, y: 5.6, w: 0.9, h: 0.04, fill: { color: C.gold }, line: { type: 'none' } });
    s.addText(opts.meta || '', { x: MX, y: 5.75, w: 7.7, h: 0.9, fontFace: BODY, fontSize: 11.5, color: C.ink2, align: 'left', lineSpacingMultiple: 1.2 });
    return s;
  }

  // ── Section divider (full navy + nomor) ────────────────────────
  function dividerSlide(no, title) {
    var s = P_.addSlide(); s.background = { color: C.navy };
    s.addShape(P_.ShapeType.parallelogram, { x: -1, y: -1, w: 5, h: PH + 2, fill: { color: C.blueDk }, line: { type: 'none' } });
    s.addShape(P_.ShapeType.parallelogram, { x: 1.5, y: -1, w: 1.0, h: PH + 2, fill: { color: C.blue }, line: { type: 'none' } });
    s.addShape(P_.ShapeType.parallelogram, { x: 2.4, y: 2.4, w: 0.5, h: 2.6, fill: { color: C.gold }, line: { type: 'none' } });
    logoMark(s, PW - 3.2, 0.5, 0.3, true);
    s.addText(no, { x: 4.0, y: 2.7, w: 2, h: 1, fontFace: HEAD, fontSize: 30, bold: true, color: C.gold, align: 'left' });
    s.addText(title, { x: 4.0, y: 3.5, w: 8, h: 1.4, fontFace: HEAD, fontSize: 34, bold: true, color: C.white, align: 'left', valign: 'top', lineSpacingMultiple: 0.98 });
    return s;
  }

  // ===============================================================
  //  CLIENT DECK (tanpa CPI/biaya, + procurement)
  // ===============================================================
  function buildClientDeck(proj) {
    var a = (typeof analyzeProject === 'function') ? analyzeProject(proj.id) : null;
    var act = a ? num(a.act) : num(proj.actual);
    var plan = a ? num(a.cp) : num(proj.plan);
    var variance = a ? num(a.variance) : (act - plan);
    var spi = a ? a.spi : (plan > 0 ? act / plan : null);
    var accent = statusColor(proj.status);
    var today = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
    var TAG = 'DISIAPKAN UNTUK CLIENT';

    // 1. Cover
    coverSlide({
      audience: 'DISIAPKAN UNTUK CLIENT',
      kicker: 'LAPORAN PROGRESS PROYEK',
      title: proj.nama || 'Proyek',
      subtitle: (proj.kode ? proj.kode + '   \u00b7   ' : '') + (proj.lokasi || ''),
      meta: 'Client       : ' + (proj.client || '\u2014') + '\nPeriode    : ' + today + '\nStatus      : ' + (proj.status || '\u2014')
    });

    // 2. Ringkasan Eksekutif (TANPA CPI)
    var s2 = P_.addSlide(); s2.background = { color: C.white };
    header(s2, 'Ringkasan Eksekutif', 'Status progres proyek per ' + today, TAG);
    statusPill(s2, PW - MX - 2.0, 0.66, proj.status || '\u2014', accent);
    var cw = (PW - MX * 2 - 0.4 * 3) / 4, cy = 1.95, ch = 1.7;
    kpiCard(s2, MX + (cw + 0.4) * 0, cy, cw, ch, pct1(act), 'Progress Aktual', 'kumulatif terkini', accent);
    kpiCard(s2, MX + (cw + 0.4) * 1, cy, cw, ch, pct1(plan), 'Rencana', 'target saat ini', C.blue);
    kpiCard(s2, MX + (cw + 0.4) * 2, cy, cw, ch, (variance >= 0 ? '+' : '') + (Math.round(variance * 10) / 10) + '%', 'Deviasi', variance >= 0 ? 'di atas rencana' : 'di bawah rencana', variance >= -3 ? C.good : variance >= -10 ? C.warn : C.crit);
    kpiCard(s2, MX + (cw + 0.4) * 3, cy, cw, ch, f2(spi), 'SPI (Jadwal)', '< 1 = tertinggal', spiColor(spi));
    // banner status (jadwal saja, tanpa biaya)
    var bHead = spi == null ? 'BELUM ADA DATA JADWAL' : spi >= 0.95 ? 'JADWAL SESUAI RENCANA' : spi >= 0.85 ? 'PERHATIAN \u2014 JADWAL SEDIKIT TERTINGGAL' : 'PERLU PERHATIAN \u2014 JADWAL TERTINGGAL';
    var bBody = spi == null ? 'Lengkapi kurva-S & realisasi progres untuk menilai kinerja jadwal.'
      : (variance < 0 ? 'Progres fisik ' + Math.abs(Math.round(variance * 10) / 10) + '% di bawah rencana. ' : 'Progres fisik di atas/sesuai rencana. ')
      + (a && (a.esFinish || a.fcFinish) ? 'Proyeksi selesai \u2248 ' + dID(a.esFinish || a.fcFinish) + (((a.esDelay != null ? a.esDelay : a.fcDelay) > 0) ? ' (' + (a.esDelay != null ? a.esDelay : a.fcDelay) + ' hari lebih lambat). ' : '. ') : '')
      + 'Lihat rencana tindak lanjut pada slide berikut.';
    banner(s2, MX, 4.05, PW - MX * 2, 1.55, bHead, bBody, spi == null ? C.mute : spi >= 0.95 ? C.good : C.gold);
    cornerAccent(s2); footer(s2, 2);

    // 3. Kurva-S Progress + Bacaan Kunci
    var s3 = P_.addSlide(); s3.background = { color: C.white };
    header(s3, 'Kurva-S Progress', 'Rencana kumulatif vs aktual kumulatif (%)', TAG);
    var sc = scurveData(proj.id);
    if (sc) {
      s3.addChart(P_.ChartType.line, [
        { name: 'Rencana', labels: sc.labels, values: sc.plan },
        { name: 'Aktual', labels: sc.labels, values: sc.actual }
      ], {
        x: MX, y: 1.85, w: PW - MX * 2 - 3.3, h: 4.5, chartColors: [C.sky, accent], lineSize: 2.5, lineSmooth: true,
        showLegend: true, legendPos: 'b', legendFontSize: 11, legendColor: C.ink2,
        catAxisLabelColor: C.mute, catAxisLabelFontSize: 9, catAxisLineColor: C.line,
        valAxisLabelColor: C.mute, valAxisLabelFontSize: 9, valAxisMinVal: 0, valAxisMaxVal: 100, valAxisMajorUnit: 20,
        valGridLine: { color: 'EEF3F8', size: 1 }, catGridLine: { style: 'none' }, showTitle: false, lineDataSymbol: 'circle', lineDataSymbolSize: 5
      });
      var qx = PW - MX - 2.95;
      s3.addShape(P_.ShapeType.roundRect, { x: qx, y: 1.95, w: 2.95, h: 4.3, rectRadius: 0.06, fill: { color: C.bg2 }, line: { color: C.line, width: 1 } });
      s3.addText('BACAAN KUNCI', { x: qx + 0.22, y: 2.12, w: 2.5, h: 0.3, fontFace: HEAD, fontSize: 11, bold: true, color: C.navy, charSpacing: 1 });
      var keys = [];
      keys.push('Aktual ' + pct1(act) + ' vs rencana ' + pct1(plan) + ' (deviasi ' + (variance >= 0 ? '+' : '') + (Math.round(variance * 10) / 10) + '%)');
      if (sc.lastAct) keys.push('Data aktual terisi hingga W' + String(sc.lastAct).padStart(2, '0'));
      if (a && a.svt != null) keys.push('Earned Schedule SV(t) = ' + (a.svt > 0 ? '+' : '') + a.svt + ' minggu');
      if (a && a.procOverdue > 0) keys.push(a.procOverdue + ' material overdue menahan pemasangan');
      keys.push(variance < -3 ? 'Fokus percepatan untuk mengejar kurva rencana' : 'Pertahankan ritme sesuai kurva rencana');
      var ky = 2.5;
      keys.slice(0, 6).forEach(function (k) {
        s3.addShape(P_.ShapeType.parallelogram, { x: qx + 0.24, y: ky + 0.05, w: 0.12, h: 0.12, fill: { color: C.gold }, line: { type: 'none' } });
        s3.addText(k, { x: qx + 0.46, y: ky - 0.04, w: 2.4, h: 0.55, fontFace: BODY, fontSize: 9.5, color: C.ink2, align: 'left', valign: 'top' });
        ky += 0.62;
      });
    } else { s3.addText('Belum ada data S-curve.', { x: MX, y: 3, w: PW - MX * 2, h: 1, fontFace: BODY, fontSize: 14, color: C.mute, align: 'center' }); }
    cornerAccent(s3); footer(s3, 3);

    // 4. Progress per Kategori (WBS)
    var s4 = P_.addSlide(); s4.background = { color: C.white };
    header(s4, 'Progress per Kategori', 'Capaian pekerjaan menurut kategori WBS', TAG);
    var cats = wbsByCategory(proj.id);
    if (cats.length) {
      var hdr = ['Kategori Pekerjaan', 'Bobot', '% Selesai', 'Status'];
      var rows = [hdr.map(function (h, i) { return { text: h, options: { bold: true, color: 'FFFFFF', fill: { color: C.navy }, fontSize: 11.5, align: i === 0 ? 'left' : 'center', valign: 'middle', fontFace: BODY } }; })];
      cats.slice(0, 9).forEach(function (c, idx) {
        var st = catStatus(c.pct); var zebra = idx % 2 ? C.bg2 : 'FFFFFF';
        rows.push([
          { text: c.name, options: { color: C.ink, fill: { color: zebra }, fontSize: 10.5, align: 'left', valign: 'middle', bold: true, fontFace: BODY } },
          { text: c.bobot + '%', options: { color: C.ink2, fill: { color: zebra }, fontSize: 10.5, align: 'center', valign: 'middle', fontFace: BODY } },
          { text: pct1(c.pct), options: { color: st.c, fill: { color: zebra }, fontSize: 11, align: 'center', valign: 'middle', bold: true, fontFace: BODY } },
          { text: st.t, options: { color: 'FFFFFF', fill: { color: st.c }, fontSize: 10, align: 'center', valign: 'middle', bold: true, fontFace: BODY } }
        ]);
      });
      s4.addTable(rows, { x: MX, y: 1.85, w: PW - MX * 2, colW: [6.4, 1.7, 1.9, 2.0], border: { type: 'solid', color: C.line, pt: 1 }, rowH: 0.46, valign: 'middle', autoPage: false });
    } else { s4.addText('Belum ada data WBS untuk proyek ini.', { x: MX, y: 3, w: PW - MX * 2, h: 1, fontFace: BODY, fontSize: 14, color: C.mute, align: 'center' }); }
    cornerAccent(s4); footer(s4, 4);

    // 5. Status Procurement (NEW, pengganti slide biaya)
    var s5 = P_.addSlide(); s5.background = { color: C.white };
    header(s5, 'Status Procurement', 'Pengadaan & ketersediaan material', TAG);
    var pr = procSummary(proj.id);
    if (pr.total) {
      // KPI atas
      var cw5 = (PW - MX * 2 - 0.4 * 3) / 4;
      kpiCard(s5, MX + (cw5 + 0.4) * 0, 1.85, cw5, 1.35, String(pr.total), 'Total Item', 'paket pengadaan', C.blue);
      kpiCard(s5, MX + (cw5 + 0.4) * 1, 1.85, cw5, 1.35, String(pr.onsite + pr.done), 'Tiba / Selesai', 'On Site + Done', C.good);
      kpiCard(s5, MX + (cw5 + 0.4) * 2, 1.85, cw5, 1.35, String(pr.open), 'Masih Proses', 'belum on site', C.gold);
      kpiCard(s5, MX + (cw5 + 0.4) * 3, 1.85, cw5, 1.35, String(pr.overdue), 'Overdue', pr.overdue > 0 ? 'melewati due date' : 'tidak ada', pr.overdue > 0 ? C.crit : C.good);
      // pipeline bar (per status)
      s5.addText('PIPELINE PENGADAAN', { x: MX, y: 3.45, w: 6, h: 0.3, fontFace: HEAD, fontSize: 11, bold: true, color: C.navy, charSpacing: 1 });
      var py = 3.85, barX = MX + 2.5, barMaxW = 4.0, maxV = Math.max.apply(null, PROC_ORDER.map(function (s) { return pr.byStatus[s] || 0; }).concat([1]));
      var stColors = { 'Waiting Approval': C.mute, 'PO Issued': C.sky, 'On Production': C.blue, 'In Transit': C.gold, 'On Site': '3FA9C9', 'Done': C.good };
      PROC_ORDER.forEach(function (st) {
        var v = pr.byStatus[st] || 0;
        s5.addText(st, { x: MX, y: py - 0.02, w: 2.3, h: 0.3, fontFace: BODY, fontSize: 9.5, color: C.ink2, align: 'left', valign: 'middle' });
        s5.addShape(P_.ShapeType.roundRect, { x: barX, y: py + 0.02, w: barMaxW, h: 0.24, rectRadius: 0.04, fill: { color: 'EFF4F8' }, line: { type: 'none' } });
        var bw = Math.max(0.04, barMaxW * v / maxV);
        s5.addShape(P_.ShapeType.roundRect, { x: barX, y: py + 0.02, w: bw, h: 0.24, rectRadius: 0.04, fill: { color: stColors[st] || C.blue }, line: { type: 'none' } });
        s5.addText(String(v), { x: barX + barMaxW + 0.12, y: py - 0.02, w: 0.6, h: 0.3, fontFace: BODY, fontSize: 10, bold: true, color: C.ink, align: 'left', valign: 'middle' });
        py += 0.42;
      });
      // panel overdue kanan
      var ox = MX + 7.4, ow = PW - MX - ox;
      s5.addShape(P_.ShapeType.roundRect, { x: ox, y: 3.5, w: ow, h: 2.85, rectRadius: 0.06, fill: { color: pr.overdue > 0 ? 'FCEFEF' : C.bg2 }, line: { color: pr.overdue > 0 ? 'F0C9C9' : C.line, width: 1 } });
      s5.addText(pr.overdue > 0 ? 'MATERIAL OVERDUE' : 'TIDAK ADA OVERDUE', { x: ox + 0.22, y: 3.66, w: ow - 0.4, h: 0.3, fontFace: HEAD, fontSize: 11, bold: true, color: pr.overdue > 0 ? C.crit : C.good, charSpacing: 0.5 });
      if (pr.overdueItems.length) {
        var oy = 4.05;
        pr.overdueItems.slice(0, 6).forEach(function (it) {
          s5.addText([{ text: '\u25cf  ', options: { color: C.crit, fontSize: 9 } }, { text: it.name + '  ', options: { color: C.ink2, fontSize: 9.5, bold: true } }, { text: 'due ' + dID(it.due), options: { color: C.mute, fontSize: 8.5 } }], { x: ox + 0.22, y: oy, w: ow - 0.4, h: 0.3, fontFace: BODY, align: 'left', valign: 'middle' });
          oy += 0.36;
        });
      } else {
        s5.addText('Seluruh item pengadaan dalam jadwal. Tidak ada yang melewati due date.', { x: ox + 0.22, y: 4.1, w: ow - 0.44, h: 1.5, fontFace: BODY, fontSize: 10, color: C.ink2, valign: 'top' });
      }
    } else { s5.addText('Belum ada data procurement untuk proyek ini.', { x: MX, y: 3, w: PW - MX * 2, h: 1, fontFace: BODY, fontSize: 14, color: C.mute, align: 'center' }); }
    cornerAccent(s5); footer(s5, 5);

    // 6. Status & Peringatan (tanpa item biaya)
    var s6 = P_.addSlide(); s6.background = { color: C.white };
    header(s6, 'Status & Peringatan', 'Hal yang memerlukan tindakan', TAG);
    var alerts = [];
    if (spi != null && spi < 0.85) alerts.push({ sev: 'KRITIS', c: C.crit, t: 'Jadwal Tertinggal', d: 'SPI ' + f2(spi) + ' \u2014 progres ' + Math.abs(Math.round(variance * 10) / 10) + '% di bawah rencana. Diperlukan percepatan.' });
    else if (spi != null && spi < 0.95) alerts.push({ sev: 'WASPADA', c: C.warn, t: 'Jadwal Sedikit Tertinggal', d: 'SPI ' + f2(spi) + '. Jaga ritme & tutup gap secara bertahap.' });
    if (a && a.procOverdue > 0) alerts.push({ sev: 'KRITIS', c: C.crit, t: a.procOverdue + ' Item Procurement Overdue', d: 'Sejumlah PO melewati due date. Menahan pemasangan \u2014 percepat IR material kritis.' });
    if (a && a.recent7 === 0 && act > 0 && act < 99) alerts.push({ sev: 'WASPADA', c: C.warn, t: 'Tidak Ada Aktivitas Manpower 7 Hari', d: 'Tidak ada mandays tercatat minggu terakhir. Pastikan tenaga kerja terjadwal.' });
    if (a && a.issHigh > 0) alerts.push({ sev: 'WASPADA', c: C.warn, t: a.issHigh + ' Issue Prioritas Tinggi', d: 'Tetapkan PIC & target closing; angkat di rapat koordinasi.' });
    if (!alerts.length) alerts.push({ sev: 'INFO', c: C.good, t: 'Tidak Ada Peringatan Kritis', d: 'Proyek berjalan sesuai rencana. Pertahankan ritme & monitoring rutin.' });
    var ay = 1.95, half = (PW - MX * 2 - 0.4) / 2;
    alerts.slice(0, 4).forEach(function (al, i) {
      var ax = MX + (i % 2) * (half + 0.4); var row = Math.floor(i / 2); var yy = ay + row * 1.75;
      s6.addShape(P_.ShapeType.roundRect, { x: ax, y: yy, w: half, h: 1.55, rectRadius: 0.06, fill: { color: C.white }, line: { color: C.line, width: 1 }, shadow: { type: 'outer', color: '9FB2C4', blur: 5, offset: 2, angle: 90, opacity: 0.22 } });
      s6.addShape(P_.ShapeType.rect, { x: ax, y: yy, w: 0.1, h: 1.55, fill: { color: al.c }, line: { type: 'none' } });
      statusPill(s6, ax + 0.28, yy + 0.22, al.sev, al.c);
      s6.addText(al.t, { x: ax + 0.28, y: yy + 0.66, w: half - 0.5, h: 0.34, fontFace: HEAD, fontSize: 13.5, bold: true, color: C.navy, align: 'left', valign: 'middle' });
      s6.addText(al.d, { x: ax + 0.28, y: yy + 1.0, w: half - 0.5, h: 0.5, fontFace: BODY, fontSize: 10, color: C.ink2, align: 'left', valign: 'top', lineSpacingMultiple: 1.02 });
    });
    cornerAccent(s6); footer(s6, 6);

    // 7. Rencana Tindak Lanjut
    var s7 = P_.addSlide(); s7.background = { color: C.white };
    header(s7, 'Rencana Tindak Lanjut', 'Prioritas tindakan untuk mengejar kurva rencana', TAG);
    var recs = (a && a.recs) ? a.recs.slice(0, 4) : [];
    if (!recs.length) recs = ['Pertahankan ritme pemasangan sesuai kurva rencana.', 'Lanjutkan monitoring progres & material secara rutin.'];
    var ry = 1.95, rh = (4.3) / Math.max(recs.length, 1) - 0.25;
    rh = Math.min(1.1, Math.max(0.8, rh));
    recs.forEach(function (r, i) {
      var yy = ry + i * (rh + 0.25);
      s7.addShape(P_.ShapeType.roundRect, { x: MX, y: yy, w: PW - MX * 2, h: rh, rectRadius: 0.06, fill: { color: C.bg2 }, line: { color: C.line, width: 1 } });
      s7.addShape(P_.ShapeType.parallelogram, { x: MX + 0.18, y: yy + rh / 2 - 0.28, w: 0.62, h: 0.56, fill: { color: C.blue }, line: { type: 'none' } });
      s7.addText(String(i + 1), { x: MX + 0.18, y: yy + rh / 2 - 0.28, w: 0.62, h: 0.56, fontFace: HEAD, fontSize: 18, bold: true, color: 'FFFFFF', align: 'center', valign: 'middle' });
      s7.addText(r, { x: MX + 1.1, y: yy, w: PW - MX * 2 - 1.3, h: rh, fontFace: BODY, fontSize: 12.5, color: C.ink, align: 'left', valign: 'middle', lineSpacingMultiple: 1.05 });
    });
    cornerAccent(s7); footer(s7, 7);

    // 8. Closing
    var s8 = P_.addSlide(); s8.background = { color: C.navy };
    s8.addShape(P_.ShapeType.parallelogram, { x: -1, y: -1, w: 4.0, h: PH + 2, fill: { color: C.blueDk }, line: { type: 'none' } });
    s8.addShape(P_.ShapeType.parallelogram, { x: 1.2, y: 2.2, w: 0.55, h: 3.0, fill: { color: C.gold }, line: { type: 'none' } });
    // foto proyek di kanan
    s8.addShape(P_.ShapeType.parallelogram, { x: PW - 4.0, y: -1, w: 4.6, h: PH + 2, fill: { color: C.blueDk }, line: { type: 'none' } });
    photoFrame(s8, PW - 4.35, 2.0, 3.6, 2.6, -6, _asset('hero2'));
    logoMark(s8, MX, 0.55, 0.4, true);
    s8.addText('Terima Kasih', { x: 2.4, y: 2.85, w: 6.5, h: 1, fontFace: HEAD, fontSize: 40, bold: true, color: C.white, align: 'left' });
    s8.addText('Laporan ini dihasilkan oleh ATW Solar Project Performance Dashboard.', { x: 2.4, y: 3.95, w: 6.0, h: 0.7, fontFace: BODY, fontSize: 13, color: 'BFD2E4', align: 'left', lineSpacingMultiple: 1.1 });
    s8.addText('PT ATW Solar Indonesia \u00b7 Triputra Group', { x: 2.4, y: 4.7, w: 6, h: 0.4, fontFace: BODY, fontSize: 11, color: C.sky, align: 'left' });
  }

  // ===============================================================
  //  MANAGEMENT DECK (internal — tetap dengan CPI/biaya)
  // ===============================================================
  function buildManagementDeck(list) {
    var today = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
    var TAG = 'CONFIDENTIAL \u00b7 INTERNAL USE ONLY';
    var rows = list.map(function (p) { var a = (typeof analyzeProject === 'function') ? analyzeProject(p.id) : null; return { p: p, a: a, spi: a ? a.spi : null, cpi: a ? a.cpi : null, score: a ? a.score : null }; });
    rows.sort(function (x, y) { return (x.score == null ? 999 : x.score) - (y.score == null ? 999 : y.score); });
    var cnt = { 'On Track': 0, 'Delayed': 0, 'Critical': 0, 'Done': 0 };
    var totRab = 0, totReal = 0, spiSum = 0, spiN = 0, scoreSum = 0, scoreN = 0;
    rows.forEach(function (r) {
      cnt[r.p.status] = (cnt[r.p.status] || 0) + 1;
      if (r.a) { totRab += num(r.a.rab); totReal += num(r.a.costReal); }
      if (r.spi != null) { spiSum += r.spi; spiN++; }
      if (r.score != null) { scoreSum += r.score; scoreN++; }
    });
    var avgSpi = spiN ? spiSum / spiN : null, avgScore = scoreN ? Math.round(scoreSum / scoreN) : null;

    // 1. Cover
    coverSlide({
      audience: 'INTERNAL \u00b7 MANAGEMENT',
      kicker: 'REVIEW KINERJA PORTFOLIO',
      title: 'Ringkasan Portfolio Proyek',
      subtitle: 'ATW Solar Indonesia \u00b7 Triputra Group',
      meta: 'Periode          : ' + today + '\nTotal proyek  : ' + list.length + '\nStatus            : On Track ' + cnt['On Track'] + ' \u00b7 Delayed ' + cnt['Delayed'] + ' \u00b7 Critical ' + cnt['Critical']
    });

    // 2. Portfolio Snapshot
    var s2 = P_.addSlide(); s2.background = { color: C.white };
    header(s2, 'Portfolio Snapshot', 'Indikator agregat seluruh proyek', TAG);
    var cw = (8.2 - 0.4 * 2) / 3, cy = 1.95, ch = 1.55;
    kpiCard(s2, MX, cy, cw, ch, String(list.length), 'Total Proyek', cnt['Done'] + ' selesai', C.blue);
    kpiCard(s2, MX + (cw + 0.4), cy, cw, ch, f2(avgSpi), 'Rata-rata SPI', 'kinerja jadwal', spiColor(avgSpi));
    kpiCard(s2, MX + (cw + 0.4) * 2, cy, cw, ch, avgScore == null ? '\u2014' : avgScore + '/100', 'Rata-rata Health', 'skor kesehatan', healthColor(avgScore));
    kpiCard(s2, MX, cy + ch + 0.3, cw, ch, rpShort(totRab), 'Total Nilai (RAB)', 'akumulasi kontrak', C.navy);
    kpiCard(s2, MX + (cw + 0.4), cy + ch + 0.3, cw, ch, rpShort(totReal), 'Realisasi Biaya', totRab > 0 ? 'serapan ' + Math.round(totReal / totRab * 100) + '%' : '', C.sky);
    kpiCard(s2, MX + (cw + 0.4) * 2, cy + ch + 0.3, cw, ch, String(cnt['Critical'] + cnt['Delayed']), 'Perlu Perhatian', cnt['Critical'] + ' kritis \u00b7 ' + cnt['Delayed'] + ' delayed', cnt['Critical'] > 0 ? C.crit : C.warn);
    var dx = 9.0;
    s2.addText('KOMPOSISI STATUS', { x: dx, y: 1.9, w: 3.6, h: 0.3, fontFace: HEAD, fontSize: 10.5, bold: true, color: C.navy, charSpacing: 1 });
    s2.addChart(P_.ChartType.doughnut, [{ name: 'St', labels: ['On Track', 'Delayed', 'Critical', 'Done'], values: [cnt['On Track'], cnt['Delayed'], cnt['Critical'], cnt['Done']] }], {
      x: dx, y: 2.25, w: 3.6, h: 3.6, holeSize: 54, showLegend: true, legendPos: 'b', legendFontSize: 10, legendColor: C.ink2,
      chartColors: [C.good, C.warn, C.crit, C.blue], dataBorder: { pt: 2, color: 'FFFFFF' }, showTitle: false, showValue: true, dataLabelColor: 'FFFFFF', dataLabelFontSize: 11, dataLabelFontBold: true
    });
    cornerAccent(s2); footer(s2, 2);

    // 3. Matriks Kesehatan
    var s3 = P_.addSlide(); s3.background = { color: C.white };
    header(s3, 'Matriks Kesehatan Proyek', 'Diurutkan dari paling perlu perhatian', TAG);
    var head = ['Proyek', 'Status', 'Aktual', 'SPI', 'CPI', 'Health'];
    var tRows = [head.map(function (h, i) { return { text: h, options: { bold: true, color: 'FFFFFF', fill: { color: C.navy }, fontSize: 11.5, align: i === 0 ? 'left' : 'center', valign: 'middle', fontFace: BODY } }; })];
    rows.slice(0, 11).forEach(function (r, idx) {
      var p = r.p, a = r.a, zebra = idx % 2 ? C.bg2 : 'FFFFFF', sc = statusColor(p.status);
      tRows.push([
        { text: (p.nama || '') + (p.kode ? '  (' + p.kode + ')' : ''), options: { color: C.ink, fill: { color: zebra }, fontSize: 10, align: 'left', valign: 'middle', bold: true, fontFace: BODY } },
        { text: p.status || '\u2014', options: { color: 'FFFFFF', fill: { color: sc }, fontSize: 9.5, align: 'center', valign: 'middle', bold: true, fontFace: BODY } },
        { text: a ? pct1(a.act) : '\u2014', options: { color: C.ink2, fill: { color: zebra }, fontSize: 10, align: 'center', valign: 'middle', fontFace: BODY } },
        { text: f2(r.spi), options: { color: spiColor(r.spi), fill: { color: zebra }, fontSize: 10, align: 'center', valign: 'middle', bold: true, fontFace: BODY } },
        { text: f2(r.cpi), options: { color: cpiColor(r.cpi), fill: { color: zebra }, fontSize: 10, align: 'center', valign: 'middle', bold: true, fontFace: BODY } },
        { text: r.score == null ? '\u2014' : String(r.score), options: { color: 'FFFFFF', fill: { color: healthColor(r.score) }, fontSize: 10, align: 'center', valign: 'middle', bold: true, fontFace: BODY } }
      ]);
    });
    s3.addTable(tRows, { x: MX, y: 1.85, w: PW - MX * 2, colW: [4.6, 1.7, 1.2, 1.1, 1.1, 1.39], border: { type: 'solid', color: C.line, pt: 1 }, rowH: 0.42, valign: 'middle', autoPage: false });
    if (list.length > 11) s3.addText('+ ' + (list.length - 11) + ' proyek lainnya', { x: MX, y: PH - 0.78, w: 6, h: 0.3, fontFace: BODY, fontSize: 9, italic: true, color: C.mute });
    cornerAccent(s3); footer(s3, 3);

    // 4. Perbandingan Kinerja
    var s4 = P_.addSlide(); s4.background = { color: C.white };
    header(s4, 'Perbandingan Kinerja', 'SPI (jadwal) & CPI (biaya) per proyek \u2014 ideal = 1,00', TAG);
    var topN = rows.slice(0, 10), labels = topN.map(function (r) { return r.p.kode || (r.p.nama || '').slice(0, 10); });
    s4.addChart(P_.ChartType.bar, [
      { name: 'SPI', labels: labels, values: topN.map(function (r) { return r.spi == null ? 0 : Math.round(r.spi * 100) / 100; }) },
      { name: 'CPI', labels: labels, values: topN.map(function (r) { return r.cpi == null ? 0 : Math.round(r.cpi * 100) / 100; }) }
    ], {
      x: MX, y: 1.85, w: PW - MX * 2, h: 4.5, barDir: 'col', barGrouping: 'clustered', chartColors: [C.blue, C.gold],
      showLegend: true, legendPos: 'b', legendFontSize: 11, legendColor: C.ink2, catAxisLabelColor: C.ink2, catAxisLabelFontSize: 10,
      valAxisLabelColor: C.mute, valAxisLabelFontSize: 9, valAxisMinVal: 0, valGridLine: { color: 'EEF3F8', size: 1 }, showTitle: false, barGapWidthPct: 50
    });
    cornerAccent(s4); footer(s4, 4);

    // 5. Tinjauan Anggaran
    var s5 = P_.addSlide(); s5.background = { color: C.white };
    header(s5, 'Tinjauan Anggaran', 'RAB vs Realisasi biaya per proyek (juta Rupiah)', TAG);
    var bRows = rows.filter(function (r) { return r.a && num(r.a.rab) > 0; }).slice(0, 10);
    if (bRows.length) {
      var bl = bRows.map(function (r) { return r.p.kode || (r.p.nama || '').slice(0, 10); });
      s5.addChart(P_.ChartType.bar, [
        { name: 'RAB', labels: bl, values: bRows.map(function (r) { return Math.round(num(r.a.rab) / 1e6); }) },
        { name: 'Realisasi', labels: bl, values: bRows.map(function (r) { return Math.round(num(r.a.costReal) / 1e6); }) }
      ], {
        x: MX, y: 1.85, w: PW - MX * 2, h: 4.5, barDir: 'col', barGrouping: 'clustered', chartColors: [C.sky, C.navy],
        showLegend: true, legendPos: 'b', legendFontSize: 11, legendColor: C.ink2, catAxisLabelColor: C.ink2, catAxisLabelFontSize: 10,
        valAxisLabelColor: C.mute, valAxisLabelFontSize: 9, valGridLine: { color: 'EEF3F8', size: 1 }, showTitle: false, barGapWidthPct: 50
      });
    } else { s5.addText('Belum ada data RAB.', { x: MX, y: 3, w: PW - MX * 2, h: 1, fontFace: BODY, fontSize: 14, color: C.mute, align: 'center' }); }
    cornerAccent(s5); footer(s5, 5);

    // 6. Fokus Manajemen
    var s6 = P_.addSlide(); s6.background = { color: C.white };
    header(s6, 'Fokus Manajemen', 'Proyek prioritas & isu lintas portfolio', TAG);
    var crit = rows.filter(function (r) { return r.score != null && r.score < 55; });
    var attn = rows.filter(function (r) { return r.score != null && r.score >= 55 && r.score < 80; });
    var totOv = 0, totIss = 0; rows.forEach(function (r) { if (r.a) { totOv += num(r.a.procOverdue); totIss += num(r.a.issHigh); } });
    var cw6 = (PW - MX * 2 - 0.4 * 2) / 3;
    kpiCard(s6, MX, 1.9, cw6, 1.25, String(crit.length), 'Proyek Kritis (<55)', 'perlu intervensi', C.crit);
    kpiCard(s6, MX + (cw6 + 0.4), 1.9, cw6, 1.25, String(totOv), 'Material Overdue', 'total item telat', totOv > 0 ? C.warn : C.good);
    kpiCard(s6, MX + (cw6 + 0.4) * 2, 1.9, cw6, 1.25, String(totIss), 'Issue Prioritas Tinggi', 'belum closed', totIss > 0 ? C.warn : C.good);
    s6.addText('PROYEK PRIORITAS', { x: MX, y: 3.4, w: 8, h: 0.3, fontFace: HEAD, fontSize: 11, bold: true, color: C.navy, charSpacing: 1 });
    var prio = crit.concat(attn).slice(0, 5);
    if (prio.length) {
      var py = 3.8;
      prio.forEach(function (r) {
        var p = r.p, a = r.a, col = healthColor(r.score);
        s6.addShape(P_.ShapeType.roundRect, { x: MX, y: py, w: PW - MX * 2, h: 0.6, rectRadius: 0.05, fill: { color: C.bg2 }, line: { color: C.line, width: 0.75 } });
        s6.addShape(P_.ShapeType.rect, { x: MX, y: py, w: 0.09, h: 0.6, fill: { color: col }, line: { type: 'none' } });
        var tf = (a && a.findings) ? (a.findings.filter(function (f) { return f.sev === 'crit'; })[0] || a.findings.filter(function (f) { return f.sev === 'warn'; })[0]) : null;
        s6.addText([{ text: (p.nama || '') + '   ', options: { bold: true, fontSize: 11, color: C.navy } }, { text: tf ? tf.t : (p.status || ''), options: { fontSize: 9.5, color: C.ink2 } }], { x: MX + 0.24, y: py, w: PW - MX * 2 - 2.0, h: 0.6, fontFace: BODY, valign: 'middle', align: 'left' });
        s6.addText('Health ' + (r.score == null ? '\u2014' : r.score), { x: PW - MX - 1.7, y: py, w: 1.5, h: 0.6, fontFace: HEAD, fontSize: 12, bold: true, color: col, align: 'right', valign: 'middle' });
        py += 0.66;
      });
    } else { s6.addText('Seluruh proyek dalam kondisi sehat.', { x: MX, y: 3.85, w: PW - MX * 2, h: 0.6, fontFace: BODY, fontSize: 13, color: C.good }); }
    cornerAccent(s6); footer(s6, 6);
  }

  // ===============================================================
  //  ENTRYPOINTS
  // ===============================================================
  function withLib(fn) {
    _toast('Menyiapkan engine PPT\u2026');
    loadPptxLib().then(function () { try { fn(); } catch (e) { console.error(e); _toast('Gagal membuat PPT: ' + e.message); } })
      .catch(function (e) { console.error(e); _toast('Tidak dapat memuat library PPT. Cek koneksi internet.'); });
  }
  function newDeck() { var p = new window.PptxGenJS(); p.layout = 'LAYOUT_WIDE'; p.author = 'ATW Solar Dashboard'; p.company = 'ATW Solar Indonesia'; return p; }
  function safeName(s) { return String(s || 'report').replace(/[^a-zA-Z0-9_\- ]/g, '').trim().replace(/\s+/g, '_').slice(0, 50); }

  window.generateClientPPT = function () {
    var P2 = (typeof P !== 'undefined') ? P : [];
    if (!P2.length) { _toast('Belum ada proyek.'); return; }
    var proj = P2.find(function (x) { return String(x.id) === String(typeof selId !== 'undefined' ? selId : ''); });
    if (!proj) { _toast('Pilih/buka satu proyek dulu (klik kartu proyek), lalu export PPT Client.'); return; }
    withLib(function () {
      if (typeof window.__apBegin === 'function') window.__apBegin();
      P_ = newDeck(); buildClientDeck(proj);
      if (typeof window.__apEnd === 'function') window.__apEnd();
      P_.writeFile({ fileName: 'Report_' + safeName(proj.kode || proj.nama) + '_' + new Date().toISOString().slice(0, 10) + '.pptx' }).then(function () { _toast('\u2713 PPT Client tersimpan'); });
    });
  };
  window.generateManagementPPT = function () {
    var P2 = (typeof P !== 'undefined') ? P : [];
    if (!P2.length) { _toast('Belum ada proyek.'); return; }
    withLib(function () {
      if (typeof window.__apBegin === 'function') window.__apBegin();
      P_ = newDeck(); buildManagementDeck(P2.slice());
      if (typeof window.__apEnd === 'function') window.__apEnd();
      P_.writeFile({ fileName: 'Portfolio_Review_' + new Date().toISOString().slice(0, 10) + '.pptx' }).then(function () { _toast('\u2713 PPT Portfolio tersimpan'); });
    });
  };

})();
