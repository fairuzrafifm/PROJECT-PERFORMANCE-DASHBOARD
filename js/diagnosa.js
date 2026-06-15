// ============================================================
//  ATW Solar — Diagnosa & Rekomendasi (analisis menyeluruh)
//  Rule-based: merangkum semua aspek proyek -> temuan + saran prioritas.
//  + Generator PROMPT untuk ditempel ke AI mana pun (tanpa API key).
// ============================================================
(function () {
  'use strict';

  var _rp = function (x) {
    return (typeof fmtRp === 'function') ? fmtRp(x)
      : 'Rp ' + Math.round(+x || 0).toLocaleString('id-ID');
  };
  var _fd = function (d) { return (typeof fmtDate === 'function') ? fmtDate(d) : (d || '\u2014'); };
  var _esc = function (s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  };
  var _d0 = function () { var d = new Date(); d.setHours(0, 0, 0, 0); return d; };

  // Earned Schedule: cari minggu (pecahan) di kurva-S rencana yang setara progres 'act'.
  function _calcES(projId, act) {
    if (typeof SCURVE === 'undefined' || !SCURVE.length) return null;
    var sc = SCURVE.filter(function (s) { return String(s.projId) === String(projId); })
      .sort(function (a, b) { return (+a.week) - (+b.week); });
    if (!sc.length) return null;
    var pts = [{ w: 0, c: 0 }];
    sc.forEach(function (s) { pts.push({ w: +s.week || 0, c: +s.cPlan || 0 }); });
    var last = pts[pts.length - 1];
    var pd = last.w;
    for (var k = 1; k < pts.length; k++) {
      if (pts[k].c >= 100) {
        var dd = pts[k].c - pts[k - 1].c;
        pd = dd > 0 ? pts[k - 1].w + (100 - pts[k - 1].c) / dd * (pts[k].w - pts[k - 1].w) : pts[k].w;
        break;
      }
    }
    var es = null;
    if (act <= 0) es = 0;
    else {
      for (var i = 1; i < pts.length; i++) {
        if (act <= pts[i].c) {
          var d = pts[i].c - pts[i - 1].c;
          es = d > 0 ? pts[i - 1].w + (act - pts[i - 1].c) / d * (pts[i].w - pts[i - 1].w) : pts[i].w;
          break;
        }
      }
      if (es == null) es = last.w; // aktual >= plan maksimum (capai/lewati akhir kurva)
    }
    return { es: Math.round(es * 10) / 10, pd: Math.round(pd * 10) / 10 };
  }

  // ── Kumpulkan seluruh metrik proyek ───────────────────────
  // ── Cache analyzeProject selama satu render pass sinkron (Overview memanggilnya berkali-kali
  //    untuk proyek yang sama). Cache otomatis dibersihkan via microtask -> tanpa risiko data basi. ──
  var _apCache = Object.create(null);
  var _apActive = false;
  window.__apBegin = function () {
    _apCache = Object.create(null); _apActive = true;
    Promise.resolve().then(function () { _apActive = false; _apCache = Object.create(null); });
  };
  function analyzeProject(projId) {
    if (!_apActive) return _analyzeProjectImpl(projId);
    var _k = String(projId);
    if (_k in _apCache) return _apCache[_k];
    var _v = _analyzeProjectImpl(projId);
    _apCache[_k] = _v;
    return _v;
  }
  function _analyzeProjectImpl(projId) {
    var P_ = (typeof P !== 'undefined') ? P : [];
    var p = P_.find(function (x) { return x.id === projId; });
    if (!p) return null;
    var pid = String(p.id);
    var today = _d0();

    // Jadwal
    var cp = (typeof _calcProjCurrentPlan === 'function') ? _calcProjCurrentPlan(p.id) : (+p.plan || 0);
    var act = +p.actual || 0;
    var variance = Math.round((act - cp) * 100) / 100;
    var spi = cp > 0 ? (act / cp) : null;
    var rem = p.selesai ? Math.ceil((new Date(p.selesai) - new Date()) / 86400000) : null;

    // Forecast jadwal (durasi rencana / SPI)
    var fcFinish = null, fcDelay = null;
    var sd = p.mulai ? new Date(p.mulai) : null, ed = p.selesai ? new Date(p.selesai) : null;
    if (sd && ed && spi && spi > 0 && !isNaN(sd.getTime()) && !isNaN(ed.getTime()) && act < 99.5) {
      var dur = Math.max(1, (ed - sd) / 86400000);
      fcFinish = new Date(sd.getTime() + (dur / spi) * 86400000);
      fcDelay = Math.round((fcFinish - ed) / 86400000);
    }

    // Earned Schedule (jadwal berbasis WAKTU) — akurat untuk proyek telat
    var at = (typeof _getProjCurrentWeek === 'function') ? _getProjCurrentWeek(p) : 0;
    var es = null, svt = null, spit = null, pd = null, esFinish = null, esDelay = null;
    var _esObj = _calcES(p.id, act);
    if (_esObj && at > 0) {
      es = _esObj.es; pd = _esObj.pd;
      svt = Math.round((es - at) * 10) / 10;
      spit = Math.round((es / at) * 100) / 100;
      if (spit > 0 && pd > 0 && sd && !isNaN(sd.getTime()) && act < 99.5) {
        var _ieacW = pd / spit;
        esFinish = new Date(sd.getTime() + _ieacW * 7 * 86400000);
        if (ed && !isNaN(ed.getTime())) esDelay = Math.round((esFinish - ed) / 86400000);
      }
    }

    // Biaya
    var RAB_ = (typeof RAB !== 'undefined') ? RAB : [];
    var COSTS_ = (typeof COSTS !== 'undefined') ? COSTS : [];
    var rab = RAB_.filter(function (r) { return String(r.projId) === pid && r.type === 'item'; })
      .reduce(function (s, r) { return s + (+r.total || 0); }, 0);
    var allC_ = (typeof getAllCosts === 'function') ? getAllCosts() : COSTS_;
    var costReal = allC_.filter(function (c) { return String(c.projId) === pid && !c._deleted; })
      .reduce(function (s, c) { return s + (+c.amount || 0); }, 0);
    var ev = rab * (act / 100);
    var cpi = costReal > 0 ? (ev / costReal) : null;
    var eac = (cpi && cpi > 0) ? (rab / cpi) : null;
    var eacOver = eac != null ? (eac - rab) : null;
    var serap = rab > 0 ? Math.round(costReal / rab * 1000) / 10 : 0;

    // RAB kategori over/near
    var overKat = [], nearKat = [];
    if (RAB_.length) {
      var kats = RAB_.filter(function (r) { return r.type === 'kat' && String(r.projId) === pid; });
      var ritems = RAB_.filter(function (r) { return r.type === 'item' && String(r.projId) === pid; });
      var actByKat = (typeof getRabActualByKat === 'function') ? getRabActualByKat(p.id) : {};
      kats.forEach(function (k) {
        var rk = ritems.filter(function (i) { return i.katId === k.id; }).reduce(function (s, i) { return s + (+i.total || 0); }, 0);
        var a = actByKat[k.id] || 0;
        if (rk > 0 && a >= rk) overKat.push(k.name);
        else if (rk > 0 && a / rk >= 0.9) nearKat.push(k.name);
      });
    }

    // Manpower
    var MP_ = (typeof MPLOGS !== 'undefined') ? MPLOGS : [];
    var mp = MP_.filter(function (m) { return String(m.projId) === pid; });
    var mdActual = mp.reduce(function (s, m) { return s + (+m.total || 0); }, 0);
    var mdPlan = +p.mdPlan || +p.mpPlan || 0;
    var mdPct = mdPlan > 0 ? Math.round(mdActual / mdPlan * 100) : 0;
    var recent7 = mp.filter(function (m) {
      var d = new Date(m.date); if (isNaN(d.getTime())) return false;
      return Math.ceil((today - d) / 86400000) <= 7 && d <= today;
    }).reduce(function (s, m) { return s + (+m.total || 0); }, 0);

    // Procurement
    var PROC_ = (typeof PROC !== 'undefined') ? PROC : [];
    var proc = PROC_.filter(function (i) { return String(i.projId) === pid; });
    var _open = function (i) { return i.status !== 'On Site' && i.status !== 'Done'; };
    var procOverdue = proc.filter(function (i) {
      if (!_open(i) || !i.due) return false;
      var d = (typeof parseLocalDate === 'function') ? parseLocalDate(i.due) : new Date(i.due);
      d.setHours(0, 0, 0, 0); return d < today;
    }).length;
    var procDone = proc.filter(function (i) { return i.status === 'On Site' || i.status === 'Done'; }).length;

    // Issues
    var ISS_ = (typeof ISS !== 'undefined') ? ISS : [];
    var iss = ISS_.filter(function (i) { return i.projId === p.id && i.status !== 'Closed'; });
    var issHigh = iss.filter(function (i) { return i.prioritas === 'High' || i.priority === 'High'; }).length;

    // Dokumen (filter by projId bila ada)
    var DOCS_ = (typeof DOCS !== 'undefined') ? DOCS : [];
    var docs = DOCS_.filter(function (d) { return String(d.projId || '') === pid; });
    var docRej = docs.filter(function (d) { return d.status === 'Rejected'; }).length;
    var docStale = docs.filter(function (d) {
      if (d.status !== 'On Review' || !d.tglDoc) return false;
      var dt = new Date(d.tglDoc); if (isNaN(dt.getTime())) return false;
      return Math.ceil((today - dt) / 86400000) > 7;
    }).length;

    // ── TEMUAN (findings) + aksi (act) ──────────────────────
    var F = [];
    // Jadwal
    if (spi == null) {
      F.push({ sev: 'warn', t: 'Belum ada baseline/aktual untuk hitung SPI', act: 'Lengkapi plan WBS & input progres aktual.' });
    } else if (spi < 0.6) {
      F.push({ sev: 'crit', t: 'Jadwal sangat tertinggal (SPI ' + spi.toFixed(2) + ', varians ' + variance + '%)', act: 'Tambah manpower pada item bobot besar; pertimbangkan revisi baseline/target.' });
    } else if (spi < 0.85) {
      F.push({ sev: 'warn', t: 'Jadwal tertinggal (SPI ' + spi.toFixed(2) + ', varians ' + variance + '%)', act: 'Percepat item kritis; cek penyebab (material/tenaga).' });
    } else if (spi >= 0.95) {
      F.push({ sev: 'ok', t: 'Jadwal sesuai rencana (SPI ' + spi.toFixed(2) + ')' });
    }
    if (fcDelay != null && fcDelay > 30) {
      F.push({ sev: fcDelay > 90 ? 'crit' : 'warn', t: 'Proyeksi telat ~' + fcDelay + ' hari (estimasi selesai ' + _fd(fcFinish) + ')', act: 'Naikkan SPI: tambah resource / kerja paralel pada lintasan kritis.' });
    }
    if (typeof rem === 'number' && rem >= 0 && rem < 14 && act < 90) {
      F.push({ sev: 'crit', t: 'Sisa waktu tinggal ' + rem + ' hari, progres baru ' + act.toFixed(1) + '%', act: 'Evaluasi kelayakan deadline; siapkan rencana percepatan atau adendum waktu.' });
    }
    // Biaya
    if (cpi != null && cpi < 0.85) {
      F.push({ sev: 'crit', t: 'Biaya boros (CPI ' + cpi.toFixed(2) + ')', act: 'Audit pos biaya terbesar; kendalikan pengeluaran & negosiasi ulang vendor.' });
    } else if (cpi != null && cpi < 1) {
      F.push({ sev: 'warn', t: 'Efisiensi biaya di bawah ideal (CPI ' + cpi.toFixed(2) + ')', act: 'Pantau realisasi vs RAB; cegah pembengkakan lanjutan.' });
    }
    if (eacOver != null && eacOver > 0) {
      F.push({ sev: 'warn', t: 'Proyeksi biaya akhir over ~' + _rp(eacOver) + ' (EAC ' + _rp(eac) + ')', act: 'Siapkan justifikasi/adendum biaya atau cari penghematan.' });
    }
    if (overKat.length) {
      F.push({ sev: 'crit', t: overKat.length + ' kategori RAB OVER budget: ' + overKat.join(', '), act: 'Tahan pengeluaran kategori tsb; review RAB / ajukan adendum.' });
    } else if (nearKat.length) {
      F.push({ sev: 'warn', t: nearKat.length + ' kategori RAB mendekati limit: ' + nearKat.join(', '), act: 'Pantau ketat; siapkan antisipasi bila menembus anggaran.' });
    }
    // Manpower
    if (act > 0 && act < 99.5 && recent7 === 0) {
      F.push({ sev: 'warn', t: 'Tidak ada manpower tercatat 7 hari terakhir', act: 'Assign/jadwalkan tenaga kerja; cek ketersediaan vendor atau subcon.' });
    }
    if (mdPlan > 0 && mdPct > 120) {
      F.push({ sev: 'warn', t: 'Pemakaian mandays melebihi rencana (' + mdPct + '%)', act: 'Tinjau produktivitas & alokasi tenaga agar biaya tidak membengkak.' });
    }
    // Procurement
    if (procOverdue > 0) {
      F.push({ sev: 'crit', t: procOverdue + ' item procurement overdue', act: 'Follow-up vendor & eskalasi PO; minta update ETA pengiriman.' });
    }
    // Issues
    if (issHigh > 0) {
      F.push({ sev: 'warn', t: issHigh + ' issue prioritas High belum closed', act: 'Tetapkan PIC & target closing; angkat di rapat harian.' });
    }
    // Dokumen
    if (docRej > 0) {
      F.push({ sev: 'warn', t: docRej + ' dokumen Rejected', act: 'Perbaiki sesuai catatan reviewer lalu submit ulang.' });
    }
    if (docStale > 0) {
      F.push({ sev: 'warn', t: docStale + ' dokumen On Review >7 hari', act: 'Follow-up approver untuk percepat review.' });
    }

    // Skor kesehatan
    var score = 100;
    F.forEach(function (f) { if (f.sev === 'crit') score -= 22; else if (f.sev === 'warn') score -= 10; });
    score = Math.max(0, Math.min(100, score));
    var health = score >= 80 ? { t: 'Sehat', c: 'var(--gn)' }
      : score >= 55 ? { t: 'Perlu Perhatian', c: 'var(--yw)' }
        : { t: 'Kritis', c: 'var(--rd)' };

    // Rekomendasi prioritas (crit dulu, lalu warn)
    var recs = [];
    F.filter(function (f) { return f.sev === 'crit' && f.act; }).forEach(function (f) { recs.push(f.act); });
    F.filter(function (f) { return f.sev === 'warn' && f.act; }).forEach(function (f) { recs.push(f.act); });
    recs = recs.filter(function (v, i, a) { return a.indexOf(v) === i; }); // unik

    return {
      p: p, cp: cp, act: act, variance: variance, spi: spi, rem: rem,
      fcFinish: fcFinish, fcDelay: fcDelay,
      es: es, at: at, svt: svt, spit: spit, pd: pd, esFinish: esFinish, esDelay: esDelay,
      rab: rab, costReal: costReal, cpi: cpi, eac: eac, eacOver: eacOver, serap: serap,
      overKat: overKat, nearKat: nearKat,
      mdPlan: mdPlan, mdActual: mdActual, mdPct: mdPct, recent7: recent7,
      procOverdue: procOverdue, procDone: procDone, procTotal: proc.length,
      issOpen: iss.length, issHigh: issHigh, docRej: docRej, docStale: docStale,
      findings: F, recs: recs, score: score, health: health
    };
  }

  // ── PROMPT untuk AI (tinggal copy-paste) ──────────────────
  function buildAIPrompt(projId) {
    var a = analyzeProject(projId); if (!a) return '';
    var p = a.p;
    var L = [];
    L.push('Kamu adalah konsultan manajemen proyek konstruksi PLTS (solar). Analisis kondisi proyek berikut, temukan akar masalahnya, dan beri rekomendasi konkret + langkah prioritas.');
    L.push('');
    L.push('=== DATA PROYEK ===');
    L.push('Proyek   : ' + (p.kode || '-') + ' \u2014 ' + (p.nama || '-'));
    L.push('Lokasi   : ' + (p.lokasi || '-') + ' | Status: ' + (p.status || '-'));
    L.push('Periode  : ' + _fd(p.mulai) + ' s/d ' + _fd(p.selesai) + (typeof a.rem === 'number' ? ' (sisa ' + a.rem + ' hari)' : ''));
    L.push('');
    L.push('JADWAL:');
    L.push('- Rencana minggu ini: ' + a.cp.toFixed(1) + '% | Aktual: ' + a.act.toFixed(1) + '% | Varians: ' + a.variance + '%');
    L.push('- SPI: ' + (a.spi != null ? a.spi.toFixed(2) : 'n/a') + (a.fcFinish ? ' | Estimasi selesai (tren saat ini): ' + _fd(a.fcFinish) + ' (telat ~' + a.fcDelay + ' hari)' : ''));
    L.push('- ES (jadwal berbasis waktu): ' + (a.es != null ? a.es.toFixed(1) + ' mgg vs waktu berjalan ' + a.at + ' mgg | SV(t) ' + (a.svt > 0 ? '+' : '') + a.svt.toFixed(1) + ' mgg | SPI(t) ' + (a.spit != null ? a.spit.toFixed(2) : 'n/a') + (a.esFinish ? ' | proyeksi selesai (waktu): ' + _fd(a.esFinish) + (a.esDelay > 0 ? ' (telat ~' + a.esDelay + ' hari)' : '') : '') : 'n/a (butuh kurva-S rencana)'));
    L.push('');
    L.push('BIAYA:');
    L.push('- RAB: ' + _rp(a.rab) + ' | Realisasi: ' + _rp(a.costReal) + ' | Serapan: ' + a.serap + '%');
    L.push('- CPI: ' + (a.cpi != null ? a.cpi.toFixed(2) : 'n/a') + (a.eac != null ? ' | Estimasi biaya akhir (EAC): ' + _rp(a.eac) + (a.eacOver > 0 ? ' (over ~' + _rp(a.eacOver) + ')' : '') : ''));
    if (a.overKat.length) L.push('- Kategori RAB OVER: ' + a.overKat.join(', '));
    L.push('');
    L.push('MANPOWER:');
    L.push('- Mandays plan: ' + (a.mdPlan || 0) + ' | actual: ' + a.mdActual + ' (' + a.mdPct + '%) | 7 hari terakhir: ' + a.recent7 + ' orang-hari');
    L.push('');
    L.push('PROCUREMENT: ' + a.procDone + '/' + a.procTotal + ' selesai, ' + a.procOverdue + ' overdue');
    L.push('ISSUES: ' + a.issOpen + ' open (' + a.issHigh + ' prioritas High)');
    L.push('DOKUMEN: ' + a.docRej + ' rejected, ' + a.docStale + ' on-review >7 hari');
    L.push('');
    L.push('TEMUAN OTOMATIS (skor kesehatan ' + a.score + '/100 \u2014 ' + a.health.t + '):');
    if (a.findings.length) {
      a.findings.forEach(function (f) { L.push('- [' + (f.sev === 'crit' ? 'KRITIS' : f.sev === 'warn' ? 'PERHATIAN' : 'OK') + '] ' + f.t); });
    } else { L.push('- Tidak ada masalah signifikan terdeteksi.'); }
    L.push('');
    L.push('=== PERTANYAAN (disesuaikan kondisi proyek ini) ===');
    var Q = [];
    Q.push('Apa akar masalah utama proyek ini?');
    var schedBad = (a.spi != null && a.spi < 0.95) || (a.fcDelay != null && a.fcDelay > 30);
    var costBad = (a.cpi != null && a.cpi < 1) || (a.eacOver != null && a.eacOver > 0) || a.overKat.length;
    var mpBad = a.recent7 === 0 && a.act > 0 && a.act < 99.5;
    if (schedBad) Q.push('Bagaimana strategi konkret mengejar jadwal (SPI ' + (a.spi != null ? a.spi.toFixed(2) : 'n/a') + (a.fcDelay != null && a.fcDelay > 0 ? ', proyeksi telat ~' + a.fcDelay + ' hari' : '') + ')? Item/pekerjaan mana yang harus diprioritaskan untuk percepatan?');
    if (costBad) Q.push('Bagaimana mengendalikan & memulihkan biaya (CPI ' + (a.cpi != null ? a.cpi.toFixed(2) : 'n/a') + (a.eacOver > 0 ? ', proyeksi over ~' + _rp(a.eacOver) : '') + (a.overKat.length ? ', kategori over: ' + a.overKat.join(', ') : '') + ')? Di pos mana penghematan paling realistis?');
    if (mpBad) Q.push('Mengingat 7 hari terakhir tidak ada manpower tercatat, berapa estimasi tenaga kerja yang perlu ditambah dan di pekerjaan apa agar kejar jadwal?');
    if (a.procOverdue > 0) Q.push('Bagaimana mempercepat ' + a.procOverdue + ' item procurement yang overdue agar tidak menghambat pekerjaan lapangan?');
    if (a.issHigh > 0) Q.push('Bagaimana strategi menutup ' + a.issHigh + ' issue prioritas tinggi yang masih terbuka?');
    if (a.docRej > 0 || a.docStale > 0) Q.push('Bagaimana mempercepat dokumen yang tertahan (' + a.docRej + ' rejected, ' + a.docStale + ' on-review >7 hari)?');
    Q.push('Risiko utama 2\u20134 minggu ke depan dan cara mitigasinya?');
    if (Q.length <= 2) { // proyek relatif sehat → fokus optimasi
      Q = ['Proyek tergolong sehat. Apa langkah optimasi agar tetap on-track dan makin efisien (jadwal & biaya)?',
        'Risiko apa yang tetap perlu diwaspadai 2\u20134 minggu ke depan beserta mitigasinya?'];
    }
    Q.slice(0, 6).forEach(function (q, i) { L.push((i + 1) + '. ' + q); });
    L.push('');
    L.push('Jawab ringkas, praktis, langsung pada solusi, dalam Bahasa Indonesia.');
    return L.join('\n');
  }

  // ── Panel HTML (dipakai di detail proyek) ─────────────────
  function buildDiagnosaPanel(projId) {
    var a = analyzeProject(projId); if (!a) return '';
    var canEdit = (typeof canEditProj === 'function') ? canEditProj(projId) : true;
    var sevDot = function (sev) {
      var c = sev === 'crit' ? 'var(--rd)' : sev === 'warn' ? 'var(--yw)' : 'var(--gn)';
      return '<span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:' + c + ';flex-shrink:0;margin-top:5px"></span>';
    };
    var findHtml = a.findings.length
      ? a.findings.map(function (f) {
        return '<div style="display:flex;gap:7px;align-items:flex-start;margin-bottom:5px"><span style="margin-top:1px">' + sevDot(f.sev) + '</span><span style="font-size:11px;color:var(--tx);line-height:1.4">' + _esc(f.t) + '</span></div>';
      }).join('')
      : '<div style="font-size:11px;color:var(--gn)">\u2713 Tidak ada masalah signifikan terdeteksi.</div>';
    var recHtml = a.recs.length
      ? '<ol style="margin:0;padding-left:18px">' + a.recs.slice(0, 6).map(function (r) {
        return '<li style="font-size:11px;color:var(--tx);line-height:1.5;margin-bottom:5px">' + _esc(r) + (canEdit ? ' <button class="btn" type="button" onclick="createActionFromRec(\'' + a.p.id + '\',\'' + encodeURIComponent(r) + '\')" style="padding:1px 6px;font-size:9px;margin-left:2px;vertical-align:middle">+ Action</button>' : '') + '</li>';
      }).join('') + '</ol>'
      : '<div style="font-size:11px;color:var(--mt)">Pertahankan kinerja \u2014 tidak ada tindakan mendesak.</div>';

    var promptText = buildAIPrompt(projId);

    var _met = function (lbl, val, clr, tip) {
      return '<span title="' + tip + '" style="display:inline-flex;flex-direction:column;gap:1px;background:var(--sf2);border:1px solid var(--bd);border-radius:8px;padding:6px 10px;cursor:help;min-width:62px"><span style="font-size:8px;letter-spacing:.5px;color:var(--mt);text-transform:uppercase">' + lbl + '</span><span style="font-size:13px;font-weight:700;color:' + clr + '">' + val + '</span></span>';
    };
    var _spiC = a.spi == null ? 'var(--mt)' : a.spi >= 1 ? 'var(--gn)' : a.spi >= 0.9 ? 'var(--yw)' : 'var(--rd)';
    var _spitC = a.spit == null ? 'var(--mt)' : a.spit >= 1 ? 'var(--gn)' : a.spit >= 0.9 ? 'var(--yw)' : 'var(--rd)';
    var _svtC = a.svt == null ? 'var(--mt)' : a.svt >= 0 ? 'var(--gn)' : a.svt > -2 ? 'var(--yw)' : 'var(--rd)';
    var schedStrip = '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px">'
      + _met('SPI', a.spi != null ? a.spi.toFixed(2) : '\u2014', _spiC, 'SPI berbasis nilai = aktual% / rencana%. Cenderung menyatu ke 1,0 menjelang selesai.')
      + (a.es != null ? _met('ES', a.es.toFixed(1) + ' mgg', 'var(--tx)', 'Earned Schedule: titik waktu di kurva-S rencana yang setara progres aktual sekarang.') : '')
      + (a.svt != null ? _met('SV(t)', (a.svt > 0 ? '+' : '') + a.svt.toFixed(1) + ' mgg', _svtC, 'Varians jadwal dalam waktu = ES - AT. Negatif berarti telat sekian minggu.') : '')
      + (a.spit != null ? _met('SPI(t)', a.spit.toFixed(2), _spitC, 'SPI berbasis waktu = ES / AT. Tidak menyatu ke 1,0 di akhir, jadi akurat untuk proyek telat.') : '')
      + (a.esFinish ? _met('Proyeksi (ES)', _fd(a.esFinish) + (a.esDelay > 0 ? ' \u00b7 +' + a.esDelay + 'h' : ''), a.esDelay > 0 ? 'var(--rd)' : 'var(--gn)', 'Proyeksi selesai berbasis waktu = durasi rencana / SPI(t).') : '')
      + '</div>';

    return '<div class="' + (typeof cardCls === 'function' ? cardCls('diagnosa') : 'card') + '" style="margin-bottom:9px">'
      + '<div class="ct" style="display:flex;align-items:center;justify-content:space-between">'
      + '<span>' + (typeof cardChev === 'function' ? cardChev('diagnosa') : '') + 'DIAGNOSA & REKOMENDASI</span>'
      + '<span style="display:inline-flex;align-items:center;gap:6px;font-size:10px;font-weight:700;letter-spacing:.3px;color:' + a.health.c + ';text-transform:none">'
      + '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:' + a.health.c + '"></span>'
      + a.health.t + ' \u00b7 ' + a.score + '/100</span>'
      + '</div>'
      + schedStrip
      + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:6px">'
      + '<div><div style="font-size:9px;letter-spacing:.6px;color:var(--mt);text-transform:uppercase;margin-bottom:6px">Temuan</div>' + findHtml + '</div>'
      + '<div><div style="font-size:9px;letter-spacing:.6px;color:var(--mt);text-transform:uppercase;margin-bottom:6px">Rekomendasi Prioritas</div>' + recHtml + '</div>'
      + '</div>'
      + '<div style="border-top:1px solid var(--bd);margin-top:11px;padding-top:10px">'
      + '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap">'
      + '<div style="font-size:10px;color:var(--mt);line-height:1.4">Butuh analisis lebih dalam? Salin prompt ini lalu tempel ke AI favoritmu (ChatGPT / Claude / Gemini).</div>'
      + '<div style="display:flex;gap:6px;flex-shrink:0">'
      + '<button class="btn btn-sm bp" onclick="copyDiagnosaPrompt(\'' + a.p.id + '\')">' + (typeof ic === 'function' ? ic('copy', 13) : '') + ' Salin Prompt AI</button>'
      + '<button class="btn btn-sm" onclick="toggleDiagnosaPrompt(\'' + a.p.id + '\')">Lihat</button>'
      + '</div></div>'
      + '<textarea id="diagPrompt-' + a.p.id + '" readonly style="display:none;width:100%;margin-top:9px;height:200px;background:var(--ib);border:1px solid var(--bd);border-radius:6px;color:var(--tx);font-family:var(--fm);font-size:10.5px;line-height:1.5;padding:9px;resize:vertical;white-space:pre">' + _esc(promptText) + '</textarea>'
      + '</div>'
      + '</div>';
  }

  // ── Aksi tombol ───────────────────────────────────────────
  function copyDiagnosaPrompt(projId) {
    var ta = document.getElementById('diagPrompt-' + projId);
    if (!ta) return;
    var txt = ta.value;
    var ok = function () { if (typeof toast === 'function') toast('Prompt disalin \u2014 tempel ke AI favoritmu', 'success'); };
    var fail = function () {
      ta.style.display = 'block'; ta.focus(); ta.select();
      try { document.execCommand('copy'); ok(); }
      catch (e) { if (typeof toast === 'function') toast('Tekan Ctrl+C untuk menyalin', 'info'); }
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(txt).then(ok).catch(fail);
    } else { fail(); }
  }
  function toggleDiagnosaPrompt(projId) {
    var ta = document.getElementById('diagPrompt-' + projId);
    if (!ta) return;
    ta.style.display = (ta.style.display === 'none' || !ta.style.display) ? 'block' : 'none';
  }

  // expose
  window.analyzeProject = analyzeProject;
  window.buildAIPrompt = buildAIPrompt;
  window.buildDiagnosaPanel = buildDiagnosaPanel;
  window.copyDiagnosaPrompt = copyDiagnosaPrompt;
  window.toggleDiagnosaPrompt = toggleDiagnosaPrompt;
})();
