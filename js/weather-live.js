/* ================================================================
 * weather-live.js — Badge CUACA LIVE per proyek (Open-Meteo).
 *
 * - Gratis, TANPA API key, CORS-enabled → jalan langsung dari browser.
 * - Membaca koordinat dari p.lat / p.lon (diisi via modal proyek).
 * - TIDAK menimpa p.weather (catatan manual tetap utuh).
 * - Badge disisipkan ke header detail (#detail .dmeta) sebagai elemen
 *   terpisah, dikelola sepenuhnya oleh modul ini. Tidak menyentuh
 *   fungsi render mana pun.
 * - Cache 30 menit, auto-refresh tiap jam.
 *
 * Dimuat sebagai classic <script> setelah projects.js. Membaca global
 * P dan selId (binding global; diakses secara defensif).
 * ============================================================== */
(function () {
  'use strict';

  var ENDPOINT = 'https://api.open-meteo.com/v1/forecast';
  var TTL = 30 * 60 * 1000;        // cache 30 menit
  var REFRESH = 60 * 60 * 1000;    // refresh tiap jam
  var CACHE = {};                  // projId -> { data, ts }

  // ── Ikon SVG cuaca (stroke currentColor → ikut warna badge) ──
  function svgIcon(inner) {
    return '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"' +
      ' stroke-width="2" stroke-linecap="round" stroke-linejoin="round"' +
      ' style="vertical-align:-2px;flex-shrink:0">' + inner + '</svg>';
  }
  var ICONS = {
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>',
    cloudSun: '<path d="M12 2v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="M20 12h2"/><path d="m19.07 4.93-1.41 1.41"/><path d="M15.947 12.65a4 4 0 0 0-5.925-4.128"/><path d="M13 22H7a5 5 0 1 1 4.9-6H13a3 3 0 0 1 0 6Z"/>',
    cloud: '<path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>',
    fog: '<path d="M16 17H7"/><path d="M17 21H9"/><path d="M17.5 13H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>',
    drizzle: '<path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M8 19v1"/><path d="M8 14v1"/><path d="M16 19v1"/><path d="M16 14v1"/><path d="M12 21v1"/><path d="M12 16v1"/>',
    rain: '<path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M16 14v6"/><path d="M8 14v6"/><path d="M12 16v6"/>',
    snow: '<path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M8 15h.01"/><path d="M8 19h.01"/><path d="M12 17h.01"/><path d="M12 21h.01"/><path d="M16 15h.01"/><path d="M16 19h.01"/>',
    storm: '<path d="M6 16.326A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 .5 8.973"/><path d="m13 12-3 5h4l-3 5"/>'
  };
  // WMO weather code → [label Indonesia, key ikon]
  var WMO = {
    0: ['Cerah', 'sun'], 1: ['Cerah Berawan', 'cloudSun'],
    2: ['Berawan', 'cloudSun'], 3: ['Mendung', 'cloud'],
    45: ['Berkabut', 'fog'], 48: ['Berkabut', 'fog'],
    51: ['Gerimis', 'drizzle'], 53: ['Gerimis', 'drizzle'], 55: ['Gerimis', 'drizzle'],
    56: ['Gerimis Beku', 'drizzle'], 57: ['Gerimis Beku', 'drizzle'],
    61: ['Hujan Ringan', 'rain'], 63: ['Hujan', 'rain'], 65: ['Hujan Lebat', 'rain'],
    66: ['Hujan', 'rain'], 67: ['Hujan', 'rain'],
    71: ['Salju', 'snow'], 73: ['Salju', 'snow'], 75: ['Salju', 'snow'], 77: ['Salju', 'snow'],
    80: ['Hujan Lokal', 'rain'], 81: ['Hujan', 'rain'], 82: ['Hujan Lebat', 'storm'],
    85: ['Salju', 'snow'], 86: ['Salju', 'snow'],
    95: ['Badai Petir', 'storm'], 96: ['Badai Petir', 'storm'], 99: ['Badai Petir', 'storm']
  };
  function describe(code) { return WMO[code] || ['\u2014', 'cloud']; }

  function hasCoords(p) {
    return p && p.lat != null && p.lon != null && p.lat !== '' && p.lon !== '' &&
      !isNaN(parseFloat(p.lat)) && !isNaN(parseFloat(p.lon));
  }

  function getProj(id) {
    var arr = (typeof P !== 'undefined' && P) ? P : [];
    for (var i = 0; i < arr.length; i++) {
      if (String(arr[i].id) === String(id)) return arr[i];
    }
    return null;
  }

  function fetchWx(lat, lon) {
    var url = ENDPOINT +
      '?latitude=' + encodeURIComponent(parseFloat(lat)) +
      '&longitude=' + encodeURIComponent(parseFloat(lon)) +
      '&current=temperature_2m,weather_code&timezone=auto';
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    }).then(function (j) {
      var c = j && j.current;
      if (!c || c.temperature_2m == null) throw new Error('data cuaca kosong');
      return { temp: Math.round(c.temperature_2m), code: c.weather_code };
    });
  }

  // Ambil cuaca (pakai cache). Resolve {temp,code} | null (tak pernah reject).
  function weatherFor(p) {
    if (!hasCoords(p)) return Promise.resolve(null);
    var key = String(p.id);
    var hit = CACHE[key];
    if (hit && (Date.now() - hit.ts) < TTL) return Promise.resolve(hit.data);
    return fetchWx(p.lat, p.lon).then(function (d) {
      CACHE[key] = { data: d, ts: Date.now() };
      return d;
    }).catch(function (e) {
      console.warn('[weather-live] gagal ambil cuaca proyek ' + key + ': ' + e.message);
      return null;
    });
  }

  function badgeInner(d) {
    var w = describe(d.code);
    return svgIcon(ICONS[w[1]] || ICONS.cloud) + d.temp + '\u00B0C \u00B7 ' + w[0];
  }

  // ── Render badge ke header detail proyek terpilih ────────────
  function paintDetail() {
    var dmeta = document.querySelector('#detail .dmeta');
    if (!dmeta) return;
    var id = (typeof selId !== 'undefined') ? selId : null;
    var p = id ? getProj(id) : null;
    var slot = dmeta.querySelector('.wx-live-slot');

    if (!hasCoords(p)) { if (slot) slot.remove(); return; }

    if (!slot) {
      slot = document.createElement('span');
      slot.className = 'wx-live-slot';
      dmeta.appendChild(slot);
    }
    slot.innerHTML = '<span class="wx-live" data-loading="1">' + svgIcon(ICONS.cloud) + '\u2026</span>';

    weatherFor(p).then(function (d) {
      // proyek mungkin sudah berganti saat fetch selesai
      var cur = (typeof selId !== 'undefined') ? selId : null;
      if (String(cur) !== String(p.id)) return;
      var s = dmeta.querySelector('.wx-live-slot');
      if (!s) return;
      if (!d) { s.innerHTML = ''; return; }
      s.innerHTML = '<span class="wx-live" title="Cuaca live \u00B7 Open-Meteo">' + badgeInner(d) + '</span>';
    });
  }

  // ── Styling minimal (selaras CSS variables aplikasi) ─────────
  function injectStyle() {
    if (document.getElementById('wx-live-style')) return;
    var st = document.createElement('style');
    st.id = 'wx-live-style';
    st.textContent =
      '.wx-live{display:inline-flex;align-items:center;gap:4px;font-size:11px;' +
      'padding:2px 8px;border-radius:10px;background:rgba(124,140,240,.12);' +
      'color:var(--bl,#7c8cf0);border:1px solid rgba(124,140,240,.22);' +
      'white-space:nowrap;vertical-align:middle}' +
      '.wx-live[data-loading]{opacity:.6}';
    document.head.appendChild(st);
  }

  // ── Badge di kartu sidebar (#projList .pi) ───────────────────
  function paintSidebar() {
    var host = document.getElementById('projList');
    if (!host) return;
    var cards = host.querySelectorAll('.pi');
    for (var k = 0; k < cards.length; k++) {
      (function (card) {
        var id = card.getAttribute('data-pid');
        var p = id ? getProj(id) : null;
        var loc = card.querySelector('.pi-loc');
        var slot = card.querySelector('.wx-live-slot-sb');
        if (!p || !hasCoords(p) || !loc) { if (slot) slot.remove(); return; }
        if (!slot) {
          slot = document.createElement('span');
          slot.className = 'wx-live-slot-sb';
          slot.style.cssText = 'display:block;margin-top:4px';
          slot.innerHTML = '<span class="wx-live" data-loading="1">' + svgIcon(ICONS.cloud) + '\u2026</span>';
          loc.parentNode.insertBefore(slot, loc.nextSibling);
        }
        weatherFor(p).then(function (d) {
          var s = card.querySelector('.wx-live-slot-sb');
          if (!s) return;
          if (!d) { s.innerHTML = ''; return; }
          s.innerHTML = '<span class="wx-live" title="Cuaca live \u00B7 Open-Meteo">' + badgeInner(d) + '</span>';
        });
      })(cards[k]);
    }
  }

  // ── Observer: cat ulang badge tiap #detail / #projList dirender ──
  // childList saja (BUKAN subtree) → edit badge kita (lebih dalam) tidak
  // memicu observer, jadi tidak ada loop.
  var _t = null;
  function paintAll() { paintDetail(); paintSidebar(); }
  function schedule() { clearTimeout(_t); _t = setTimeout(paintAll, 120); }

  function init() {
    injectStyle();
    var host = document.getElementById('detail');
    if (host) { new MutationObserver(schedule).observe(host, { childList: true }); }
    var sb = document.getElementById('projList');
    if (sb) { new MutationObserver(schedule).observe(sb, { childList: true }); }
    schedule();
    setInterval(function () { CACHE = {}; schedule(); }, REFRESH);
  }

  // Cuaca untuk TANGGAL tertentu (dipakai Daily Report PDF) → Promise<string>
  // mis. "Berawan (24\u201331\u00B0C)". Kosong bila tanpa koordinat / di luar
  // jangkauan API / gagal. Open-Meteo forecast mencakup ~92 hari lampau s/d
  // ~16 hari ke depan; tanggal di luar itu mengembalikan ''.
  window.weatherForDate = function (lat, lon, dateStr) {
    if (lat == null || lon == null || lat === '' || lon === '' ||
        isNaN(parseFloat(lat)) || isNaN(parseFloat(lon)) || !dateStr) {
      return Promise.resolve('');
    }
    var url = ENDPOINT +
      '?latitude=' + encodeURIComponent(parseFloat(lat)) +
      '&longitude=' + encodeURIComponent(parseFloat(lon)) +
      '&daily=weather_code,temperature_2m_max,temperature_2m_min' +
      '&start_date=' + encodeURIComponent(dateStr) +
      '&end_date=' + encodeURIComponent(dateStr) + '&timezone=auto';
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    }).then(function (j) {
      var d = j && j.daily;
      if (!d || !d.weather_code || d.weather_code[0] == null) return '';
      var w = describe(d.weather_code[0]);
      var tmax = Math.round(d.temperature_2m_max[0]);
      var tmin = Math.round(d.temperature_2m_min[0]);
      return w[0] + ' (' + tmin + '\u2013' + tmax + '\u00B0C)';
    }).catch(function (e) {
      console.warn('[weather-live] cuaca tanggal ' + dateStr + ' gagal: ' + e.message);
      return '';
    });
  };

  // API publik: paksa refresh (mis. setelah edit koordinat)
  window.refreshLiveWeather = function () { CACHE = {}; schedule(); };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
