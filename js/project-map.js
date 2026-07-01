/* ================================================================
 * project-map.js — Peta lokasi proyek (Leaflet + OpenStreetMap).
 *
 * - Gratis, TANPA API key, tiles dari OpenStreetMap (CORS-OK).
 * - Membaca koordinat dari p.lat / p.lon (yang sudah disimpan).
 * - Dirender ke #ovMap di Portfolio Overview (menggantikan bubble chart).
 * - Mengelola siklus hidup peta sendiri: tiap infografis (#ovDash)
 *   re-render, #ovMap dibuat ulang → peta lama dibersihkan & dibuat lagi.
 * - Tidak menyentuh fungsi render mana pun.
 *
 * Dimuat sebagai classic <script> setelah projects.js (butuh global P).
 * ============================================================== */
(function () {
  'use strict';

  var LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
  var LEAFLET_JS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
  var TILE = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
  var ATTR = '\u00A9 OpenStreetMap';

  var _map = null, _mapEl = null, _t = null, _libP = null;

  function getProjects() { return (typeof P !== 'undefined' && P) ? P : []; }

  function coordsOf(p) {
    if (!p || p.lat == null || p.lon == null || p.lat === '' || p.lon === '') return null;
    var la = parseFloat(p.lat), lo = parseFloat(p.lon);
    if (isNaN(la) || isNaN(lo)) return null;
    return [la, lo];
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  // ── Muat Leaflet (CSS + JS) sekali ───────────────────────────
  function loadLeaflet() {
    if (window.L) return Promise.resolve();
    if (_libP) return _libP;
    _libP = new Promise(function (resolve, reject) {
      if (!document.getElementById('leaflet-css')) {
        var lk = document.createElement('link');
        lk.id = 'leaflet-css'; lk.rel = 'stylesheet'; lk.href = LEAFLET_CSS;
        document.head.appendChild(lk);
      }
      var s = document.createElement('script');
      s.src = LEAFLET_JS;
      s.onload = function () { resolve(); };
      s.onerror = function () { _libP = null; reject(new Error('Leaflet gagal dimuat')); };
      document.head.appendChild(s);
    });
    return _libP;
  }

  function popupHtml(p, act) {
    return '<div style="font-size:12px;line-height:1.5;min-width:120px">' +
      '<b>' + esc(p.nama || p.kode || '-') + '</b><br>' +
      '<span style="color:#666">' + esc(p.lokasi || '\u2014') + '</span><br>' +
      'Status: ' + esc(p.status || '\u2014') + '<br>' +
      'Progress: <b>' + act.toFixed(1) + '%</b></div>';
  }

  // ── Fullscreen (Fullscreen API browser, tanpa plugin) ────────
  function injectFsStyle() {
    if (document.getElementById('ovmap-fs-style')) return;
    var st = document.createElement('style');
    st.id = 'ovmap-fs-style';
    st.textContent =
      '#ovMap:fullscreen,#ovMap:-webkit-full-screen{width:100%!important;height:100%!important;border-radius:0}' +
      '.ovmap-fs-btn{width:30px;height:30px;display:flex!important;align-items:center;justify-content:center;' +
      'background:#fff;color:#333;cursor:pointer}.ovmap-fs-btn:hover{background:#f4f4f4}';
    document.head.appendChild(st);
  }
  function toggleFs(el) {
    var fsEl = document.fullscreenElement || document.webkitFullscreenElement;
    if (fsEl) {
      (document.exitFullscreen || document.webkitExitFullscreen || function () {}).call(document);
    } else {
      var req = el.requestFullscreen || el.webkitRequestFullscreen;
      if (req) req.call(el);
    }
  }
  function onFsChange() {
    if (_map) setTimeout(function () { try { _map.invalidateSize(); } catch (e) {} }, 120);
  }

  function buildMap(el) {
    if (el === _mapEl && _map) { try { _map.invalidateSize(); } catch (e) {} return; }
    if (_map) { try { _map.remove(); } catch (e) {} _map = null; }
    _mapEl = el;

    var pts = [];
    getProjects().forEach(function (p) {
      var c = coordsOf(p);
      if (c) pts.push({ p: p, c: c });
    });

    if (!pts.length) {
      _mapEl = null;
      el.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;' +
        'height:100%;font-size:11px;color:var(--mt);text-align:center;padding:16px">' +
        'Belum ada proyek dengan koordinat.<br>Isi Latitude/Longitude di edit proyek ' +
        'untuk menampilkan lokasi di peta.</div>';
      return;
    }

    var center = pts.length === 1 ? pts[0].c : [-2.5, 118];
    var zoom = pts.length === 1 ? 9 : 5;
    _map = L.map(el, { scrollWheelZoom: false, attributionControl: true }).setView(center, zoom);
    L.tileLayer(TILE, { maxZoom: 19, attribution: ATTR }).addTo(_map);

    // Tombol layar penuh
    var FsControl = L.Control.extend({
      options: { position: 'topright' },
      onAdd: function () {
        var b = L.DomUtil.create('a', 'leaflet-bar ovmap-fs-btn');
        b.href = '#'; b.title = 'Layar penuh';
        b.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"' +
          ' stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
          '<path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/>' +
          '<path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/></svg>';
        L.DomEvent.on(b, 'click', function (e) { L.DomEvent.stop(e); toggleFs(el); });
        return b;
      }
    });
    _map.addControl(new FsControl());

    var markers = [];
    pts.forEach(function (it) {
      var act = (it.p.actual != null ? +it.p.actual : 0) || 0;
      var m = L.marker(it.c).addTo(_map).bindPopup(popupHtml(it.p, act));
      markers.push(m);
    });
    if (pts.length > 1) {
      try { _map.fitBounds(L.featureGroup(markers).getBounds().pad(0.35)); } catch (e) {}
    }
    setTimeout(function () { try { _map.invalidateSize(); } catch (e) {} }, 160);
  }

  function ensureMap() {
    var el = document.getElementById('ovMap');
    if (!el) {
      if (_map) { try { _map.remove(); } catch (e) {} _map = null; _mapEl = null; }
      return;
    }
    if (el === _mapEl && _map) { try { _map.invalidateSize(); } catch (e) {} return; }
    loadLeaflet().then(function () {
      var cur = document.getElementById('ovMap');
      if (cur) buildMap(cur);
    }).catch(function (e) {
      console.warn('[project-map] ' + e.message);
      var cur = document.getElementById('ovMap');
      if (cur) cur.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;' +
        'height:100%;font-size:11px;color:var(--mt);padding:16px">Peta gagal dimuat (cek koneksi internet).</div>';
    });
  }

  // ── Observer: #ovDash re-render → bangun ulang peta (debounced) ──
  // childList saja → mutasi internal Leaflet (lebih dalam) tak memicu loop.
  function schedule() { clearTimeout(_t); _t = setTimeout(ensureMap, 160); }

  function init() {
    injectFsStyle();
    document.addEventListener('fullscreenchange', onFsChange);
    document.addEventListener('webkitfullscreenchange', onFsChange);
    var dash = document.getElementById('ovDash');
    if (dash) { new MutationObserver(schedule).observe(dash, { childList: true }); }
    schedule();
  }

  // API publik: paksa bangun ulang (mis. setelah edit koordinat proyek)
  window.refreshProjectMap = function () { _mapEl = null; schedule(); };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
