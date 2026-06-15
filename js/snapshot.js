// ============================================================
//  ATW Solar — Snapshot Mingguan & Tren
//  Simpan metrik (progres/SPI/CPI) per minggu ke Supabase,
//  lalu tampilkan tren "membaik / memburuk" di detail proyek.
// ============================================================
(function () {
  'use strict';

  function _isoWeek(d) {
    const dt = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const day = dt.getUTCDay() || 7;
    dt.setUTCDate(dt.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(dt.getUTCFullYear(), 0, 1));
    const wk = Math.ceil((((dt - yearStart) / 86400000) + 1) / 7);
    return dt.getUTCFullYear() + '-W' + String(wk).padStart(2, '0');
  }

  function _snapMetrics(p) {
    const pid = String(p.id);
    const cp = (typeof _calcProjCurrentPlan === 'function') ? _calcProjCurrentPlan(p.id) : (+p.plan || 0);
    const act = +p.actual || 0;
    const spi = cp > 0 ? (act / cp) : null;
    const rab = (typeof RAB !== 'undefined' ? RAB : []).filter(r => String(r.projId) === pid && r.type === 'item').reduce((s, r) => s + (+r.total || 0), 0);
    const costReal = (typeof COSTS !== 'undefined' ? COSTS : []).filter(c => String(c.projId) === pid && !c._deleted).reduce((s, c) => s + (+c.amount || 0), 0);
    const ev = rab * (act / 100);
    const cpi = costReal > 0 ? (ev / costReal) : null;
    return {
      actual: Math.round(act * 10) / 10,
      plan: Math.round(cp * 10) / 10,
      spi: spi != null ? Math.round(spi * 100) / 100 : null,
      cpi: cpi != null ? Math.round(cpi * 100) / 100 : null
    };
  }

  function takeSnapshot(projId, silent) {
    const p = (typeof P !== 'undefined' ? P : []).find(x => String(x.id) === String(projId));
    if (!p) return;
    if (typeof canEditProj === 'function' && !canEditProj(projId)) { if (!silent && typeof toast === 'function') toast('Tidak punya akses edit ke proyek ini', 'error'); return; }
    if (typeof SNAPSHOTS === 'undefined') { window.SNAPSHOTS = []; }
    const wk = _isoWeek(new Date());
    const m = _snapMetrics(p);
    const today = new Date().toISOString().slice(0, 10);
    let snap = SNAPSHOTS.find(s => String(s.projId) === String(projId) && s.week === wk);
    if (snap) { Object.assign(snap, m, { date: today }); }
    else {
      snap = Object.assign({ id: (typeof genId === 'function' ? genId() : 'snap_' + Date.now()), projId: String(projId), week: wk, date: today }, m);
      SNAPSHOTS.push(snap);
    }
    if (typeof sbSaveSnapshot === 'function') {
      sbSaveSnapshot(snap).catch(e => { if (!silent && typeof toast === 'function') toast('Gagal simpan snapshot: ' + (e && e.message || e), 'error'); });
    }
    if (!silent) {
      if (typeof toast === 'function') toast('Snapshot minggu ' + wk + ' tersimpan \u2713', 'success');
      if (typeof renderDetail === 'function') renderDetail(projId);
    }
  }

  let _autoDone = false;
  function autoSnapshotWeekly() {
    if (_autoDone) return; _autoDone = true;
    if (typeof SNAPSHOTS === 'undefined') return;
    const wk = _isoWeek(new Date());
    (typeof P !== 'undefined' ? P : []).forEach(p => {
      const act = +p.actual || 0;
      if (act <= 0 || act >= 100) return;          // hanya proyek berjalan
      if (typeof canEditProj === 'function' && !canEditProj(p.id)) return; // hanya proyek yang boleh diedit
      const has = SNAPSHOTS.some(s => String(s.projId) === String(p.id) && s.week === wk);
      if (!has) takeSnapshot(p.id, true);
    });
  }

  // ── Tren SVG (SPI & CPI dengan baseline 1.0) ──────────────
  function _trendSVG(snaps) {
    const W = 600, H = 150, padL = 30, padR = 12, padT = 12, padB = 26;
    const n = snaps.length;
    const xs = i => padL + (n <= 1 ? 0 : i * (W - padL - padR) / (n - 1));
    const vals = [];
    snaps.forEach(s => { if (s.spi != null) vals.push(s.spi); if (s.cpi != null) vals.push(s.cpi); });
    const maxV = Math.max(1.2, Math.round((Math.max.apply(null, vals.length ? vals : [1.2]) + 0.1) * 10) / 10);
    const ys = v => padT + (1 - (v / maxV)) * (H - padT - padB);
    const line = (key, color) => {
      let d = '', started = false;
      snaps.forEach((s, i) => { const v = s[key]; if (v == null) return; d += (started ? 'L' : 'M') + xs(i).toFixed(1) + ' ' + ys(v).toFixed(1) + ' '; started = true; });
      return d ? '<path d="' + d + '" style="fill:none;stroke:' + color + ';stroke-width:2"/>' : '';
    };
    const dots = (key, color) => snaps.map((s, i) => s[key] == null ? '' : '<circle cx="' + xs(i).toFixed(1) + '" cy="' + ys(s[key]).toFixed(1) + '" r="2.6" style="fill:' + color + '"/>').join('');
    const baseY = ys(1.0);
    const yl = v => '<text x="' + (padL - 5) + '" y="' + (ys(v) + 3).toFixed(1) + '" style="fill:var(--mt)" font-size="8" text-anchor="end">' + v.toFixed(1) + '</text>';
    let xlabels = '';
    [0, Math.floor((n - 1) / 2), n - 1].filter((v, i, a) => a.indexOf(v) === i).forEach(i => {
      xlabels += '<text x="' + xs(i).toFixed(1) + '" y="' + (H - 8) + '" style="fill:var(--mt)" font-size="8" text-anchor="middle">' + String(snaps[i].week || '').replace(/^\d+-/, '') + '</text>';
    });
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" style="width:100%;height:auto;margin-top:10px;overflow:visible">'
      + '<line x1="' + padL + '" y1="' + baseY.toFixed(1) + '" x2="' + (W - padR) + '" y2="' + baseY.toFixed(1) + '" style="stroke:var(--mt)" stroke-width="1" stroke-dasharray="4 4" opacity=".5"/>'
      + yl(0) + yl(1.0) + yl(maxV) + xlabels
      + line('spi', 'var(--bl)') + line('cpi', 'var(--gn)') + dots('spi', 'var(--bl)') + dots('cpi', 'var(--gn)')
      + '<text x="' + (W - padR) + '" y="' + (padT + 2) + '" style="fill:var(--bl)" font-size="8" text-anchor="end" font-weight="700">SPI</text>'
      + '<text x="' + (W - padR) + '" y="' + (padT + 13) + '" style="fill:var(--gn)" font-size="8" text-anchor="end" font-weight="700">CPI</text>'
      + '</svg>';
  }

  function _box(label, value, deltaHtml) {
    return '<div style="background:var(--sf2);border:1px solid var(--bd);border-radius:10px;padding:10px 12px">'
      + '<div style="font-size:9px;letter-spacing:.6px;color:var(--mt);text-transform:uppercase;margin-bottom:4px">' + label + '</div>'
      + '<div style="font-size:15px;font-weight:700;color:var(--tx)">' + value + '</div>'
      + '<div style="font-size:10px;margin-top:2px">' + deltaHtml + '</div></div>';
  }

  function buildSnapshotPanel(projId) {
    const canEdit = (typeof canEditProj === 'function') ? canEditProj(projId) : true;
    const snaps = (typeof SNAPSHOTS !== 'undefined' ? SNAPSHOTS : []).filter(s => String(s.projId) === String(projId))
      .slice().sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : (a.week < b.week ? -1 : 1)));
    const btn = canEdit
      ? '<div style="display:flex;gap:6px"><button class="btn btn-sm" onclick="fillSampleSnapshots(\'' + projId + '\')" title="Isi data contoh untuk pratinjau tren (tidak disimpan ke server)">Data Contoh</button><button class="btn btn-sm bp" onclick="takeSnapshot(\'' + projId + '\')">+ Ambil Snapshot</button></div>'
      : '<span style="font-size:9px;color:var(--mt)">hanya-baca</span>';
    let html = '<div class="' + (typeof cardCls === 'function' ? cardCls('snapshot') : 'card') + '" style="margin-bottom:9px"><div class="ct" style="display:flex;align-items:center;justify-content:space-between"><span>' + (typeof cardChev === 'function' ? cardChev('snapshot') : '') + 'SNAPSHOT MINGGUAN & TREN</span>' + btn + '</div>';
    if (snaps.length < 2) {
      html += '<div style="font-size:11px;color:var(--mt);margin-top:8px;line-height:1.5">' + (snaps.length ? 'Baru ada 1 snapshot. ' : 'Belum ada snapshot. ') + 'Tren muncul setelah \u22652 snapshot. Snapshot diambil otomatis tiap minggu (saat aplikasi dibuka), atau klik tombol di atas.</div></div>';
      return html;
    }
    const last = snaps[snaps.length - 1], prev = snaps[snaps.length - 2];
    const delta = (cur, pre) => {
      if (cur == null || pre == null) return '<span style="color:var(--mt)">\u2014</span>';
      const d = Math.round((cur - pre) * 100) / 100;
      if (Math.abs(d) < 0.01) return '<span style="color:var(--mt)">\u25cf tetap</span>';
      const up = d > 0;
      return '<span style="color:' + (up ? 'var(--gn)' : 'var(--rd)') + '">' + (up ? '\u25b2' : '\u25bc') + ' ' + Math.abs(d) + '</span>';
    };
    html += '<div class="metric-grid" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-top:6px">'
      + _box('Progres', last.actual.toFixed(1) + '%', delta(last.actual, prev.actual))
      + _box('SPI', last.spi != null ? last.spi.toFixed(2) : '\u2014', delta(last.spi, prev.spi))
      + _box('CPI', last.cpi != null ? last.cpi.toFixed(2) : '\u2014', delta(last.cpi, prev.cpi))
      + '</div>';
    html += _trendSVG(snaps);
    html += '<div style="font-size:9px;color:var(--mt);margin-top:8px">' + snaps.length + ' snapshot \u00b7 garis putus = baseline 1.0 (SPI/CPI ideal) \u00b7 \u25b2 hijau = membaik, \u25bc merah = memburuk.</div></div>';
    return html;
  }

  function _isoWeekOffset(weeksBack) {
    const d = new Date(); d.setDate(d.getDate() - weeksBack * 7);
    return { week: _isoWeek(d), date: d.toISOString().slice(0, 10) };
  }
  function fillSampleSnapshots(projId) {
    if (typeof canEditProj === 'function' && !canEditProj(projId)) { if (typeof toast === 'function') toast('Tidak punya akses', 'error'); return; }
    if (typeof SNAPSHOTS === 'undefined') window.SNAPSHOTS = [];
    const p = (typeof P !== 'undefined' ? P : []).find(x => String(x.id) === String(projId));
    const baseAct = p ? (+p.actual || 6) : 6;
    for (let i = 5; i >= 1; i--) {
      const w = _isoWeekOffset(i);
      const f = (5 - i) / 5;
      const spi = Math.round((0.4 + 0.18 * f) * 100) / 100;
      const cpi = Math.round((0.9 + 0.08 * f) * 100) / 100;
      const actual = Math.round(Math.max(0, baseAct * (0.2 + 0.16 * (5 - i))) * 10) / 10;
      if (SNAPSHOTS.some(s => String(s.projId) === String(projId) && s.week === w.week)) continue;
      SNAPSHOTS.push({ id: 'sample_' + projId + '_' + w.week, projId: String(projId), week: w.week, date: w.date, actual: actual, plan: Math.round(actual * 3 * 10) / 10, spi: spi, cpi: cpi, _sample: true });
    }
    if (typeof toast === 'function') toast('Data contoh ditambahkan (pratinjau, tidak disimpan ke server)', 'info');
    if (typeof renderDetail === 'function') renderDetail(projId);
  }

  window.takeSnapshot = takeSnapshot;
  window.autoSnapshotWeekly = autoSnapshotWeekly;
  window.buildSnapshotPanel = buildSnapshotPanel;
  window.fillSampleSnapshots = fillSampleSnapshots;
})();
