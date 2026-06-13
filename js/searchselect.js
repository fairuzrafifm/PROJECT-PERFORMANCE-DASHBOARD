// ============================================================
//  ATW Solar — Searchable Picker (proyek & predecessor)
//  Menyulap <select> panjang menjadi dropdown yang bisa diketik
//  untuk dicari. Native <select> TIDAK dihapus — hanya disembunyikan
//  sebagai pemegang nilai, sehingga value, gv(), addWbsPred(), dan
//  semua handler onchange tetap bekerja apa adanya.
//
//  Popup di-render ke document.body dengan position:fixed agar TIDAK
//  terpotong oleh modal (yang punya overflow-y:auto + transform).
//  Sinkron label: event 'change', MutationObserver (opsi diisi ulang),
//  dan _refreshProjPickers() (dipanggil dari _syncAllProjSelectors).
// ============================================================
(function () {
  'use strict';

  // <select> yang di-upgrade: 6 pemilih proyek per-tab + predecessor (modal WBS)
  var IDS = ['scProjSel', 'wbsProjSel', 'costFiltProj', 'rabFiltProj', 'drProjSel', 'docFiltProj', 'wbsEditPredSel'];
  var _open = null;

  function _esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function _injectCSS() {
    if (document.getElementById('ssel-css')) return;
    var s = document.createElement('style'); s.id = 'ssel-css';
    s.textContent =
      '.ssel{position:relative;display:inline-block;vertical-align:middle}'
      + '.ssel-btn{display:inline-flex;align-items:center;gap:8px;justify-content:space-between;min-width:190px;max-width:320px;background:var(--ib);border:1px solid var(--bd);border-radius:8px;color:var(--tx);font-family:inherit;font-size:11px;padding:5px 10px;cursor:pointer;line-height:1.4}'
      + '.ssel-btn:hover{border-color:var(--ibr)}'
      + '.ssel-lbl{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'
      + '.ssel-ch{color:var(--mt);flex-shrink:0;font-size:9px}'
      + '.ssel-pop{position:fixed;z-index:2000000;min-width:240px;max-width:360px;background:var(--sf2);border:1px solid var(--bd);border-radius:10px;box-shadow:0 12px 30px rgba(0,0,0,.5);padding:7px;display:none}'
      + '.ssel-q{width:100%;box-sizing:border-box;background:var(--ib);border:1px solid var(--bd);border-radius:6px;color:var(--tx);font-size:11px;padding:6px 9px;margin-bottom:6px;outline:none}'
      + '.ssel-q:focus{border-color:var(--bl)}'
      + '.ssel-list{max-height:260px;overflow:auto}'
      + '.ssel-opt{font-size:11.5px;color:var(--tx);padding:7px 9px;border-radius:6px;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'
      + '.ssel-opt:hover,.ssel-opt.active{background:var(--ib)}'
      + '.ssel-opt.sel{color:var(--bl);font-weight:600}'
      + '.ssel-empty{font-size:11px;color:var(--mt);padding:9px;text-align:center}';
    document.head.appendChild(s);
  }

  function _syncLabel(sel, btn) {
    var lbl = btn.querySelector('.ssel-lbl'); if (!lbl) return;
    var o = sel.options[sel.selectedIndex];
    lbl.textContent = o ? o.text : '\u2014';
  }

  function _buildList(sel, list) {
    var html = '';
    for (var i = 0; i < sel.options.length; i++) {
      var o = sel.options[i];
      html += '<div class="ssel-opt' + (o.value === sel.value ? ' sel' : '') + '" data-val="' + _esc(o.value) + '">' + _esc(o.text) + '</div>';
    }
    list.innerHTML = html || '<div class="ssel-empty">Tidak ada pilihan</div>';
    list._active = -1;
  }

  function _visible(list) {
    return Array.prototype.filter.call(list.querySelectorAll('.ssel-opt'), function (o) { return o.style.display !== 'none'; });
  }

  function _filter(list, qv) {
    qv = (qv || '').toLowerCase();
    var opts = list.querySelectorAll('.ssel-opt'), any = false;
    for (var i = 0; i < opts.length; i++) {
      var ok = opts[i].textContent.toLowerCase().indexOf(qv) >= 0;
      opts[i].style.display = ok ? '' : 'none';
      opts[i].classList.remove('active');
      if (ok) any = true;
    }
    var empt = list.querySelector('.ssel-empty'); if (empt) empt.remove();
    if (!any) { var e = document.createElement('div'); e.className = 'ssel-empty'; e.textContent = 'Tidak cocok'; list.appendChild(e); }
    list._active = -1;
  }

  function _setActive(list, dir) {
    var vis = _visible(list); if (!vis.length) return;
    var cur = list._active;
    cur = (cur < 0) ? (dir > 0 ? 0 : vis.length - 1) : cur + dir;
    if (cur < 0) cur = 0; if (cur >= vis.length) cur = vis.length - 1;
    vis.forEach(function (o) { o.classList.remove('active'); });
    vis[cur].classList.add('active');
    vis[cur].scrollIntoView({ block: 'nearest' });
    list._active = cur;
  }

  function _close(pop) { pop.style.display = 'none'; if (_open === pop) _open = null; }
  function _closeAll() { if (_open) _close(_open); }

  function _pick(sel, btn, pop, val) {
    if (sel.value !== val) {
      sel.value = val;
      var ev;
      try { ev = new Event('change', { bubbles: true }); }
      catch (e) { ev = document.createEvent('HTMLEvents'); ev.initEvent('change', true, false); }
      sel.dispatchEvent(ev);
    }
    _syncLabel(sel, btn);
    _close(pop);
  }

  function _positionPop(btn, pop) {
    var r = btn.getBoundingClientRect();
    var vw = window.innerWidth || document.documentElement.clientWidth;
    var vh = window.innerHeight || document.documentElement.clientHeight;
    var w = Math.min(Math.max(r.width, 240), vw - 16);
    pop.style.width = w + 'px';
    pop.style.left = Math.max(8, Math.min(r.left, vw - w - 8)) + 'px';
    var ph = pop.offsetHeight;
    var below = vh - r.bottom;
    if (below < ph + 8 && r.top > below) pop.style.top = Math.max(8, r.top - ph - 4) + 'px';
    else pop.style.top = (r.bottom + 4) + 'px';
  }

  function _openPop(sel, btn, pop, q, list) {
    _closeAll();
    _buildList(sel, list);
    pop.style.visibility = 'hidden';
    pop.style.display = 'block';
    q.value = ''; _filter(list, '');
    _positionPop(btn, pop);
    pop.style.visibility = 'visible';
    _open = pop;
    setTimeout(function () { try { q.focus(); } catch (e) {} }, 10);
  }

  function _enhance(id) {
    var sel = document.getElementById(id);
    if (!sel || sel._ssel) return;
    sel._ssel = true;
    sel.style.display = 'none';

    var wrap = document.createElement('span'); wrap.className = 'ssel'; wrap.setAttribute('data-for', id);
    var btn = document.createElement('button'); btn.type = 'button'; btn.className = 'ssel-btn';
    btn.setAttribute('aria-haspopup', 'listbox');
    btn.innerHTML = '<span class="ssel-lbl">\u2014</span><span class="ssel-ch">\u25be</span>';
    // Ikuti layout flex bila <select> aslinya flex (mis. predecessor di modal)
    if (/flex\s*:/.test(sel.getAttribute('style') || '')) { wrap.style.flex = '1'; wrap.style.minWidth = '0'; wrap.style.display = 'inline-flex'; btn.style.minWidth = '0'; btn.style.flex = '1'; }
    wrap.appendChild(btn);
    sel.parentNode.insertBefore(wrap, sel.nextSibling);

    // Popup ditempel ke body (fixed) agar tidak terpotong modal
    var pop = document.createElement('div'); pop.className = 'ssel-pop';
    var q = document.createElement('input'); q.className = 'ssel-q'; q.type = 'text'; q.placeholder = 'Cari\u2026'; q.setAttribute('aria-label', 'Cari');
    var list = document.createElement('div'); list.className = 'ssel-list';
    pop.appendChild(q); pop.appendChild(list);
    document.body.appendChild(pop);
    sel._sselBtn = btn; sel._sselPop = pop;

    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      if (pop.style.display === 'none' || !pop.style.display) _openPop(sel, btn, pop, q, list);
      else _close(pop);
    });
    pop.addEventListener('click', function (e) { e.stopPropagation(); });
    q.addEventListener('input', function () { _filter(list, q.value); });
    q.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { _close(pop); try { btn.focus(); } catch (er) {} }
      else if (e.key === 'ArrowDown') { e.preventDefault(); _setActive(list, 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); _setActive(list, -1); }
      else if (e.key === 'Enter') {
        e.preventDefault();
        var vis = _visible(list); if (!vis.length) return;
        var pick = (list._active >= 0 && vis[list._active]) ? vis[list._active] : vis[0];
        _pick(sel, btn, pop, pick.getAttribute('data-val'));
      }
    });
    list.addEventListener('click', function (e) {
      var o = e.target.closest ? e.target.closest('.ssel-opt') : null;
      if (o) _pick(sel, btn, pop, o.getAttribute('data-val'));
    });
    sel.addEventListener('change', function () { _syncLabel(sel, btn); });

    // Opsi sering diisi ulang (mis. saat modal dibuka) -> sinkronkan label
    try {
      if (typeof MutationObserver !== 'undefined') {
        var mo = new MutationObserver(function () { _syncLabel(sel, btn); });
        mo.observe(sel, { childList: true });
      }
    } catch (e) {}

    _syncLabel(sel, btn);
  }

  function refreshAll() {
    IDS.forEach(function (id) {
      var sel = document.getElementById(id);
      if (sel && sel._ssel && sel._sselBtn) _syncLabel(sel, sel._sselBtn);
    });
  }
  window._refreshProjPickers = refreshAll;

  // Tutup popup saat klik di luar, scroll, atau resize
  document.addEventListener('click', function () { _closeAll(); });
  window.addEventListener('scroll', function () { _closeAll(); }, true);
  window.addEventListener('resize', function () { _closeAll(); });

  function init() { _injectCSS(); IDS.forEach(_enhance); refreshAll(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
