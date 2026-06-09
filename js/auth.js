// ================================================================
// js/auth.js — ATW Solar Dashboard
// Modul Auth: login, session, role management
// Depends on: utils.js, supabase.js
// ================================================================

// Variabel global auth (var agar accessible dari mana saja)
var selectedRoleLogin = null;
var currentRole = null;
var MYPROJ = null; // Fase 3: null = admin (semua proyek), Set = proj_id yang boleh diedit editor

// ── ROLE SELECTION ──────────────────────────────────────────────
function selectRole(role) {
  selectedRoleLogin = role;
  document.querySelectorAll('.role-btn').forEach(function(b) { b.classList.remove('selected'); });
  var rb = document.getElementById('rb-' + role);
  if (rb) rb.classList.add('selected');
  var pw = document.getElementById('authPw');
  if (pw) pw.focus();
  var err = document.getElementById('authErr');
  if (err) err.style.display = 'none';
}
window._selectRole = selectRole;

// ── QUICK VIEWER LOGIN ──────────────────────────────────────────
function quickViewerLogin() {
  currentRole = 'viewer';
  selectedRoleLogin = 'viewer';
  localStorage.setItem('atw_session', JSON.stringify({role:'viewer', ts:Date.now()}));
  var screen = document.getElementById('authScreen');
  if (screen) screen.style.display = 'none';
  applyRole('viewer');
  // Panggil fungsi startup yang mungkin belum ada saat auth.js dimuat
  if (typeof autoLoadOnStart === 'function') autoLoadOnStart();
  if (typeof loadDashLogo === 'function') loadDashLogo();
  if (typeof loadTheme === 'function') loadTheme();
  if (typeof initFromUrlParams === 'function') initFromUrlParams();
  if (typeof restoreSidebarState === 'function') restoreSidebarState();
  setTimeout(function() {
    if (typeof loadLogosCache === 'function') loadLogosCache();
    if (typeof render === 'function') render();
  }, 300);
}
window._quickViewerLogin = quickViewerLogin;

// Helper: tunggu _loginSuccess tersedia (backward compat early login stub)
function _waitAndLogin(role) {
  var tries = 0;
  var poll = setInterval(function() {
    tries++;
    if (typeof window._loginSuccess === 'function') {
      clearInterval(poll);
      window._loginSuccess(role);
    } else if (tries > 300) {
      clearInterval(poll);
      location.reload();
    }
  }, 200);
}

// ── MAIN LOGIN (Supabase) ───────────────────────────────────────
async function doLogin() {
  // Viewer: langsung masuk tanpa email/password
  if (selectedRoleLogin === 'viewer') {
    _loginSuccess('viewer'); return;
  }

  var email = (document.getElementById('loginEmail') && document.getElementById('loginEmail').value || '').trim();
  var pw    = ($('authPw') && $('authPw').value || '').trim();

  if (!selectedRoleLogin) { toast('Pilih role dulu', 'error'); return; }
  if (!email) {
    $('authErr').textContent = 'Email tidak boleh kosong';
    $('authErr').style.display = 'block'; return;
  }
  if (!pw) {
    $('authErr').textContent = 'Password tidak boleh kosong';
    $('authErr').style.display = 'block'; return;
  }

  var btn = $('authBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'Memverifikasi...'; }
  if ($('authErr')) $('authErr').style.display = 'none';

  try {
    await sbLogin(email, pw);
    var role = await sbGetRole();

    if (btn) { btn.disabled = false; btn.textContent = 'Masuk'; }

    if (selectedRoleLogin === 'admin' && role !== 'admin') {
      $('authErr').textContent = 'Akun ini bukan admin';
      $('authErr').style.display = 'block';
      await (_initSb()).auth.signOut();
      return;
    }

    _loginSuccess(role);
    await loadFromSupabase();
    await sbInitPresence();

  } catch(e) {
    if (btn) { btn.disabled = false; btn.textContent = 'Masuk'; }
    $('authErr').textContent = 'Login gagal: ' + (e.message || 'Cek email & password');
    $('authErr').style.display = 'block';
    $('authPw').value = ''; $('authPw').focus();
    var box = $('authScreen').querySelector('.auth-box');
    if (box) { box.style.animation = 'none'; box.offsetHeight; box.style.animation = 'shake .4s ease'; }
  }
}
window._doLogin = doLogin;

// ── LOGIN SUCCESS ───────────────────────────────────────────────
function _loginSuccess(role) {
  currentRole = role;
  localStorage.setItem('atw_session', JSON.stringify({role: role, ts: Date.now()}));
  $('authScreen').style.display = 'none';
  applyRole(role);
  if (typeof autoLoadOnStart === 'function') autoLoadOnStart();
  if (typeof loadDashLogo === 'function') loadDashLogo();
  if (typeof loadTheme === 'function') loadTheme();
  if (typeof initFromUrlParams === 'function') initFromUrlParams();
  if (typeof restoreSidebarState === 'function') restoreSidebarState();
  setTimeout(function() {
    if (typeof loadLogosCache === 'function') loadLogosCache();
    if (typeof render === 'function') render();
  }, 300);
}
window._loginSuccess = _loginSuccess;

// ── APPLY ROLE ──────────────────────────────────────────────────
function applyRole(role) {
  var labels = {
    admin:  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;display:inline-block"><path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14"/></svg>',
    editor: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;display:inline-block"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
    viewer: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;display:inline-block"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>'
  };
  var cls = {admin:'rb-admin', editor:'rb-editor', viewer:'rb-viewer'};
  // Tandai admin di body → CSS menyembunyikan kontrol admin-only (tambah/clone project) utk non-admin.
  document.body.classList.toggle('is-admin', role === 'admin');
  var badge = $('roleBadgeHdr');
  if (badge) {
    badge.innerHTML = labels[role] || role;
    badge.className = 'role-badge ' + (cls[role] || 'rb-viewer');
    badge.style.display = 'inline-flex';
    badge.title = {admin:'Admin', editor:'Editor', viewer:'Viewer'}[role] || role;
  }
  $('btnLogout').style.display = 'inline-flex';
  if ($('btnChangePw')) $('btnChangePw').style.display = role === 'admin' ? 'inline-flex' : 'none';
  if (role === 'viewer') {
    document.body.classList.add('viewer-mode');
  } else {
    document.body.classList.remove('viewer-mode');
  }
  if (role === 'editor') {
    document.querySelectorAll('.brd').forEach(function(b) {
      if (!b.closest('.mfoot')) b.style.display = 'none';
    });
  }
  // Fase 3: muat daftar proyek yang boleh diedit user ini (dipakai gating frontend)
  loadMyProjects();
}

// ── PROJECT-LEVEL ACCESS (Fase 3) ───────────────────────────────
// Memuat proj_id yang boleh diedit user saat ini ke MYPROJ.
// admin → MYPROJ=null (semua boleh). editor → Set hasil project_members.
// viewer/pending → Set kosong (read-only). RLS di DB tetap penegak utama.
async function loadMyProjects() {
  try {
    if (currentRole === 'admin') { MYPROJ = null; return; }
    if (currentRole !== 'editor') { MYPROJ = new Set(); return; }
    var cl = (typeof sb !== 'undefined' ? sb : null) || window.sb;
    if (!cl) { MYPROJ = new Set(); return; }
    var u = await cl.auth.getUser();
    var uid = (u && u.data && u.data.user) ? u.data.user.id : null;
    if (!uid) { MYPROJ = new Set(); return; }
    var res = await cl.from('project_members').select('proj_id').eq('user_id', uid);
    MYPROJ = new Set((res.data || []).map(function (r) { return String(r.proj_id); }));
    _refreshDetailAfterAccess();
  } catch (e) {
    MYPROJ = new Set(); // gagal → fail-safe: anggap tak ada akses edit (server tetap menolak via RLS)
    _refreshDetailAfterAccess();
  }
}

// Render ulang detail proyek aktif setelah MYPROJ termuat (hindari gating basi pada editor)
function _refreshDetailAfterAccess() {
  try {
    if (typeof selId !== 'undefined' && selId && typeof renderDetail === 'function') renderDetail(selId);
  } catch (e) { /* abaikan */ }
  try { recomputeProjLock(); } catch (e) { /* abaikan */ }
}

// Refresh MYPROJ tanpa logout: query ulang project_members, dan kalau akses berubah,
// render ulang tampilan yang ber-gating + recompute lock + toast. Hanya untuk editor.
async function _refreshMyProjAccess() {
  if (typeof currentRole === 'undefined' || currentRole !== 'editor') return;
  if (_refreshMyProjAccess._busy) return;
  _refreshMyProjAccess._busy = true;
  try {
    var cl = (typeof sb !== 'undefined' ? sb : null) || window.sb;
    if (cl) {
      var u = await cl.auth.getUser();
      var uid = (u && u.data && u.data.user) ? u.data.user.id : null;
      if (uid) {
        var res = await cl.from('project_members').select('proj_id').eq('user_id', uid);
        var next = new Set((res.data || []).map(function (r) { return String(r.proj_id); }));
        var before = MYPROJ ? Array.from(MYPROJ).sort().join(',') : '';
        var after = Array.from(next).sort().join(',');
        if (before !== after) {
          MYPROJ = next;
          try { if (typeof selId !== 'undefined' && selId && typeof renderDetail === 'function') renderDetail(selId); } catch (e) {}
          try { if (typeof renderWBS === 'function') renderWBS(); } catch (e) {}
          try { if (typeof renderDocs === 'function' && typeof DOCS !== 'undefined' && DOCS) renderDocs(); } catch (e) {}
          try { recomputeProjLock(); } catch (e) {}
          if (window.toast) window.toast('Akses proyek diperbarui', 'ok');
        }
      }
    }
  } catch (e) { /* abaikan */ }
  _refreshMyProjAccess._busy = false;
}
window._refreshMyProjAccess = _refreshMyProjAccess;

// Apakah user saat ini boleh mengedit proyek tertentu?
function canEditProj(projId) {
  if (currentRole === 'admin') return true;
  if (currentRole !== 'editor') return false;
  if (!MYPROJ) return false; // belum termuat → fail-safe
  return MYPROJ.has(String(projId));
}
window.canEditProj = canEditProj;
window.loadMyProjects = loadMyProjects;

// ── Fase 3c: kunci tampilan read-only untuk proyek yang tak boleh diedit editor ──
// Tab single-project (WBS/Daily/S-curve): kalau proyek di selektornya bukan milik editor,
// pasang body.proj-readonly (CSS kembar viewer-mode) → semua tombol/input edit tersembunyi/nonaktif,
// tapi selektor proyek tetap bisa dipakai untuk navigasi. Admin/viewer ditangani oleh role-nya.
function recomputeProjLock() {
  var lock = false;
  if (typeof currentRole !== 'undefined' && currentRole === 'editor') {
    var active = document.querySelector('.tp.active');
    var t = active ? active.id.replace('tp-', '') : '';
    var map = { wbs: 'wbsProjSel', daily: 'drProjSel', scurve: 'scProjSel' };
    var selId2 = map[t];
    if (selId2) {
      var el = document.getElementById(selId2);
      var pid = el ? el.value : '';
      if (pid && typeof canEditProj === 'function' && !canEditProj(pid)) lock = true;
    }
  }
  document.body.classList.toggle('proj-readonly', lock);
}
window.recomputeProjLock = recomputeProjLock;

// ── Fase 3d-2: di modal, editor hanya boleh memilih proyek miliknya ──
// Saat overlay modal (ov-*) terbuka, hapus opsi proyek non-miliknya dari setiap <select> proyek.
// Tab-filter selector (di luar modal) tidak tersentuh → editor tetap bisa "lihat semua" (Opsi A).
function _filterModalProjSelects(el) {
  if (!el) return;
  if (typeof currentRole === 'undefined' || currentRole !== 'editor') return;
  if (typeof MYPROJ === 'undefined' || !MYPROJ) return;
  if (_filterModalProjSelects._busy) return;
  _filterModalProjSelects._busy = true;
  try {
    var SKIP = { cloneRabSrc: 1, cloneDocSrc: 1 }; // sumber clone (RAB & Dokumen): boleh dari proyek mana pun
    var projSet = {};
    (typeof P !== 'undefined' && P ? P : []).forEach(function (p) { projSet[String(p.id)] = 1; });
    var selects = el.querySelectorAll('select');
    Array.prototype.forEach.call(selects, function (sel) {
      if (SKIP[sel.id]) return;
      var opts = Array.prototype.slice.call(sel.options);
      var isProjSelect = opts.some(function (o) { return projSet[String(o.value)]; });
      if (!isProjSelect) return;
      opts.forEach(function (o) {
        if (projSet[String(o.value)] && !MYPROJ.has(String(o.value))) o.remove();
      });
      if (sel.value && projSet[String(sel.value)] && !MYPROJ.has(String(sel.value))) {
        var firstOk = Array.prototype.slice.call(sel.options).filter(function (o) {
          return MYPROJ.has(String(o.value));
        })[0];
        if (firstOk) { sel.value = firstOk.value; sel.dispatchEvent(new Event('change', { bubbles: true })); }
      }
    });
  } catch (e) { /* abaikan */ }
  _filterModalProjSelects._busy = false;
}
window._filterModalProjSelects = _filterModalProjSelects;

(function _initProjLock() {
  function injectCss() {
    if (document.getElementById('_projLockCss')) return;
    var s = document.createElement('style');
    s.id = '_projLockCss';
    s.textContent =
      'body.proj-readonly .edit-only{display:none!important}' +
      'body.proj-readonly .btn.bg:not(.view-ok){display:none!important}' +
      'body.proj-readonly .btn.bp:not(.view-ok){display:none!important}' +
      'body.proj-readonly .btn.brd{display:none!important}' +
      'body.proj-readonly input,body.proj-readonly textarea,' +
      'body.proj-readonly select:not(#wbsProjSel):not(#drProjSel):not(#scProjSel)' +
      '{pointer-events:none;opacity:.7}' +
      // Tambah Project = admin-only → sembunyikan tombol pembukanya untuk non-admin.
      'body:not(.is-admin) [onclick*="openModal(\'addProj\')"]{display:none!important}';
    (document.head || document.documentElement).appendChild(s);
  }
  function wire() {
    injectCss();
    document.addEventListener('change', function (e) {
      var id = e.target && e.target.id;
      if (id === 'wbsProjSel' || id === 'drProjSel' || id === 'scProjSel') recomputeProjLock();
    }, true);
    document.addEventListener('click', function (e) {
      if (e.target && e.target.closest && e.target.closest('.tab')) setTimeout(recomputeProjLock, 0);
    }, true);
    // Auto-refresh akses (MYPROJ) tanpa logout: saat tab kembali aktif + berkala tiap 90 detik.
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible') _refreshMyProjAccess();
    });
    setInterval(function () { _refreshMyProjAccess(); }, 90000);
    // Pilih proyek dari sidebar/card memanggil selProj() yang menyetel selektor secara
    // programatik (tanpa event 'change'), jadi bungkus selProj agar lock dihitung ulang.
    var _origSelProj = window.selProj;
    if (typeof _origSelProj === 'function' && !_origSelProj._lockWrapped) {
      window.selProj = function () {
        var r = _origSelProj.apply(this, arguments);
        try { recomputeProjLock(); } catch (e) { /* abaikan */ }
        return r;
      };
      window.selProj._lockWrapped = true;
    }
    // Saat overlay modal (ov-*) mendapat class 'open', filter dropdown proyeknya untuk editor.
    try {
      var _mo = new MutationObserver(function (muts) {
        for (var i = 0; i < muts.length; i++) {
          var t = muts[i].target;
          if (t && t.id && t.id.indexOf('ov-') === 0 && t.classList && t.classList.contains('open')) {
            try { _filterModalProjSelects(t); } catch (e) { /* abaikan */ }
          }
        }
      });
      _mo.observe(document.body, { attributes: true, attributeFilter: ['class'], subtree: true });
    } catch (e) { /* MutationObserver tak tersedia → guard save tetap menjaga */ }
  }
  if (document.readyState !== 'loading') wire();
  else document.addEventListener('DOMContentLoaded', wire);
})();


// ── LOGOUT ──────────────────────────────────────────────────────
function doLogout() {
  currentRole = null;
  MYPROJ = null; // Fase 3: bersihkan akses proyek user sebelumnya
  localStorage.removeItem('atw_session');
  document.body.classList.remove('viewer-mode');
  var badge = $('roleBadgeHdr');
  if (badge) badge.style.display = 'none';
  $('btnLogout').style.display = 'none';
  if ($('btnChangePw')) $('btnChangePw').style.display = 'none';
  var btnSync = $('btnSync'); if (btnSync) btnSync.style.display = 'none';
  var btnLoad = $('btnLoad'); if (btnLoad) btnLoad.style.display = 'none';
  var shareBtn = $('btnShareUrl'); if (shareBtn) shareBtn.style.display = 'none';
  if ($('authPw')) $('authPw').value = '';
  if ($('authErr')) $('authErr').style.display = 'none';
  document.querySelectorAll('.role-btn').forEach(function(b) { b.classList.remove('selected'); });
  selectedRoleLogin = null;
  var as = $('authScreen');
  if (as) {
    as.style.cssText = 'position:fixed;inset:0;background:linear-gradient(135deg,#12162b 0%,#171c33 50%,#1c2240 100%);z-index:9999;display:flex;align-items:center;justify-content:center;flex-direction:column';
  }
}

// ── CHANGE PASSWORD (Supabase) ──────────────────────────────────
function saveNewPw() {
  var role = gv('cpRole');
  var np = (gv('cpNewPw') || '').trim();
  var cp = (gv('cpConfPw') || '').trim();
  if (np.length < 4) { toast('Password minimal 4 karakter', 'error'); return; }
  if (np !== cp) { toast('Konfirmasi password tidak sama', 'error'); return; }
  // Update via Supabase Auth (jika perlu ubah password user sendiri)
  cm('changePw');
  toast('✓ Password berhasil diupdate');
}

// ── CHECK SESSION (validasi ulang role ke Supabase) ─────────────
async function checkSession() {
  var s;
  try { s = JSON.parse(localStorage.getItem('atw_session') || '{}'); } catch (e) { s = {}; }

  // Tidak ada sesi tersimpan, atau sudah lewat 8 jam → wajib login ulang
  if (!s.role || (Date.now() - s.ts) >= 28800000) {
    localStorage.removeItem('atw_session');
    return false;
  }

  // VIEWER: tidak punya sesi server (login tanpa email) → percayai (akses read-only)
  if (s.role === 'viewer') {
    currentRole = 'viewer';
    $('authScreen').style.display = 'none';
    applyRole('viewer');
    return true;
  }

  // ADMIN / EDITOR: role di localStorage TIDAK dipercaya begitu saja.
  // Wajib ada sesi Supabase yang sah; role aktual diambil dari server (anti-tamper).
  var client = _initSb();
  var hasSession = false;
  try {
    var sres = await client.auth.getSession();          // baca token lokal (tanpa jaringan)
    hasSession = !!(sres && sres.data && sres.data.session);
  } catch (e) { hasSession = false; }

  if (!hasSession) {
    // Klaim admin/editor tanpa sesi Supabase → tolak (mis. localStorage diubah manual)
    localStorage.removeItem('atw_session');
    return false;
  }

  // OFFLINE: tak bisa verifikasi ke server, tapi sesi Supabase lokal ADA →
  // percayai role tersimpan sementara (token = bukti autentikasi). Menjaga mode offline.
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    currentRole = s.role;
    $('authScreen').style.display = 'none';
    applyRole(s.role);
    return true;
  }

  // ONLINE: ambil role AKTUAL dari server. Inilah sumber kebenaran (bukan localStorage).
  try {
    var serverRole = await sbGetRole();                 // 'admin' | 'editor' | 'viewer'
    currentRole = serverRole;
    localStorage.setItem('atw_session', JSON.stringify({ role: serverRole, ts: Date.now() }));
    $('authScreen').style.display = 'none';
    applyRole(serverRole);
    return true;
  } catch (e) {
    // Verifikasi ke server gagal saat online → demi keamanan, login ulang
    localStorage.removeItem('atw_session');
    return false;
  }
}

// ── SHAKE ANIMATION CSS ─────────────────────────────────────────
(function() {
  var shakeStyle = document.createElement('style');
  shakeStyle.textContent = '@keyframes shake{0%,100%{transform:none}20%{transform:translateX(-8px)}40%{transform:translateX(8px)}60%{transform:translateX(-5px)}80%{transform:translateX(5px)}}';
  document.head.appendChild(shakeStyle);
})();

// ── INIT AUTH ───────────────────────────────────────────────────
async function initAuth() {
  try {
    var saved = localStorage.getItem('atw_dash_logo');
    if (saved) { var ai = $('authLogoImg'); if (ai) ai.src = saved; }
  } catch(e) {}
  var ok = await checkSession();
  if (!ok) {
    var as = $('authScreen');
    if (as) as.style.cssText = 'position:fixed;inset:0;background:linear-gradient(135deg,#12162b 0%,#171c33 50%,#1c2240 100%);z-index:9999;display:flex;align-items:center;justify-content:center;flex-direction:column';
  } else {
    // Session valid — startup akan dipanggil oleh checkSession → applyRole → _loginSuccess chain
    if (typeof autoLoadOnStart === 'function') autoLoadOnStart();
    if (typeof loadDashLogo === 'function') loadDashLogo();
    if (typeof loadTheme === 'function') loadTheme();
    if (typeof initFromUrlParams === 'function') initFromUrlParams();
    setTimeout(function() {
      if (typeof loadLogosCache === 'function') loadLogosCache();
      if (typeof render === 'function') render();
    }, 300);
  }
}
// initAuth() dipanggil di akhir main script (setelah semua fungsi didefinisikan)
// Ini karena initAuth membutuhkan render(), loadDashLogo(), dll yang ada di main script

// === patch1 merged ===
﻿
  // ============================================================
// ATW Dashboard - Feature Patch
// Tambahkan kode ini SEBELUM tag </body> di index.html
// Fitur: Registrasi + Admin Approval + Edit Lock & Notifikasi
// ============================================================
(function () {
  'use strict';

  const LOCK_MINUTES = 5;
  let _patchUserId = null;
  let _patchUserName = '';
  let _lockChannel = null;
  let _activeLocks = new Map();

  // ── HELPER ────────────────────────────────────────────────
  function toast(msg, isErr) {
    // Delegasikan ke toast aplikasi agar tampilan konsisten (window.toast menormalkan true/'error'→error, lainnya→success).
    if (typeof window.toast === 'function' && window.toast !== toast) { window.toast(msg, isErr); return; }
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.style.cssText = 'display:block;opacity:1;background:' + (isErr ? 'var(--rd)' : 'var(--gn)');
    clearTimeout(t._tid);
    t._tid = setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.style.display = 'none', 300); }, 3000);
  }

  function getSb() { return (typeof sb !== 'undefined' ? sb : null) || window.sb || null; }

  // ── HALAMAN REGISTRASI ────────────────────────────────────
  function injectRegisterLink() {
    if (document.getElementById('_patchRegLink')) return;
    const authBtn = document.getElementById('authBtn');
    if (!authBtn) return;

    const wrap = document.createElement('div');
    wrap.id = '_patchRegLink';
    wrap.style.cssText = 'text-align:center;margin-top:14px;font-size:12px;color:var(--mt)';
    wrap.innerHTML = 'Belum punya akun? <a href="#" style="color:var(--or);text-decoration:none" id="_btnGoRegister">Daftar di sini</a>';
    authBtn.closest('div').appendChild(wrap);

    document.getElementById('_btnGoRegister').onclick = function (e) {
      e.preventDefault();
      showRegModal();
    };
  }

  function showRegModal() {
    if (document.getElementById('_regModal')) {
      document.getElementById('_regModal').style.display = 'flex';
      return;
    }
    const m = document.createElement('div');
    m.id = '_regModal';
    m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.75);display:flex;align-items:center;justify-content:center;z-index:9999999';
    m.innerHTML = `
      <div style="background:var(--sf);border:1px solid var(--bd);border-radius:12px;padding:28px 24px;width:360px;max-width:92vw">
        <h3 style="font-family:var(--fd);letter-spacing:2px;font-size:15px;margin-bottom:18px">DAFTAR AKUN</h3>
        <div style="margin-bottom:10px">
          <div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:var(--mt);margin-bottom:4px">Nama Lengkap</div>
          <input id="_rName" type="text" class="fi" placeholder="Nama Anda" style="width:100%">
        </div>
        <div style="margin-bottom:10px">
          <div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:var(--mt);margin-bottom:4px">Email</div>
          <input id="_rEmail" type="email" class="fi" placeholder="email@perusahaan.com" style="width:100%">
        </div>
        <div style="margin-bottom:10px">
          <div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:var(--mt);margin-bottom:4px">Password (min. 8 karakter)</div>
          <input id="_rPass" type="password" class="fi" placeholder="••••••••" style="width:100%">
        </div>
        <div style="margin-bottom:18px">
          <div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:var(--mt);margin-bottom:4px">Role yang Diminta</div>
          <select id="_rRole" class="fi" style="width:100%">
            <option value="editor">Editor — bisa tambah & edit data</option>
            <option value="viewer">Viewer — hanya lihat</option>
          </select>
        </div>
        <div id="_rErr" style="display:none;background:rgba(244,112,122,.1);border:1px solid var(--rd);border-radius:6px;padding:8px 12px;font-size:11px;color:var(--rd);margin-bottom:10px"></div>
        <div id="_rOk"  style="display:none;background:rgba(61,220,151,.1);border:1px solid var(--gn);border-radius:6px;padding:8px 12px;font-size:11px;color:var(--gn);margin-bottom:10px"></div>
        <div style="display:flex;gap:8px">
          <button id="_rBtn" class="btn bp" style="flex:1" onclick="_patchRegister()">Daftar →</button>
          <button class="btn" onclick="document.getElementById('_regModal').style.display='none'">Batal</button>
        </div>
        <p style="font-size:10px;color:var(--mt);margin-top:12px;text-align:center">Akun aktif setelah disetujui admin ✓</p>
      </div>`;
    document.body.appendChild(m);
  }

  window._patchRegister = async function () {
    const name  = (document.getElementById('_rName').value || '').trim();
    const email = (document.getElementById('_rEmail').value || '').trim();
    const pass  = document.getElementById('_rPass').value || '';
    const role  = document.getElementById('_rRole').value;
    const errEl = document.getElementById('_rErr');
    const okEl  = document.getElementById('_rOk');
    const btn   = document.getElementById('_rBtn');

    errEl.style.display = 'none';
    okEl.style.display  = 'none';

    if (!name)        { errEl.textContent = 'Nama tidak boleh kosong';    errEl.style.display = 'block'; return; }
    if (!email)       { errEl.textContent = 'Email tidak boleh kosong';   errEl.style.display = 'block'; return; }
    if (pass.length < 8) { errEl.textContent = 'Password minimal 8 karakter'; errEl.style.display = 'block'; return; }

    btn.disabled = true;
    btn.textContent = 'Mendaftar...';

    try {
      const cl = getSb();
      if (!cl) throw new Error('Supabase tidak tersedia — coba refresh halaman');
      const { data, error } = await cl.auth.signUp({
        email, password: pass,
        options: { data: { full_name: name, requested_role: role } }
      });
      if (error) throw error;

      // Buat user_profiles manual jika trigger belum ada
      if (data.user) {
        await cl.from('user_profiles').upsert({
          id: data.user.id, email, full_name: name,
          role: 'pending', requested_role: role
        });
      }

      okEl.textContent = '✓ Berhasil! Tunggu persetujuan admin sebelum bisa login.';
      okEl.style.display = 'block';
      btn.textContent = 'Terkirim ✓';
    } catch (e) {
      errEl.textContent = 'Gagal: ' + (e.message || 'Error tidak diketahui');
      errEl.style.display = 'block';
      btn.disabled = false;
      btn.textContent = 'Daftar →';
    }
  };

  // ── PANEL KELOLA USER (Admin) ─────────────────────────────
  window.showUserPanel = async function () {
    if (typeof currentRole === 'undefined' || currentRole !== 'admin') {
      toast('Hanya admin yang bisa mengakses fitur ini', true);
      return;
    }
    let m = document.getElementById('_userPanel');
    if (!m) {
      m = document.createElement('div');
      m.id = '_userPanel';
      m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.75);display:flex;align-items:center;justify-content:center;z-index:9999999';
      m.innerHTML = `
        <div style="background:var(--sf);border:1px solid var(--bd);border-radius:14px;padding:24px 26px;width:600px;max-width:95vw;max-height:85vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.4)">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
            <div>
              <h3 style="font-family:var(--fd);letter-spacing:2px;font-size:16px;margin:0">KELOLA USER</h3>
              <div style="font-size:11px;color:var(--mt);margin-top:2px">Manajemen akses & role pengguna</div>
            </div>
            <button style="background:transparent;border:1px solid var(--bd);border-radius:8px;color:var(--mt);width:30px;height:30px;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;transition:all .15s" onmouseover="this.style.background='var(--sf2)';this.style.color='var(--tx)'" onmouseout="this.style.background='transparent';this.style.color='var(--mt)'" onclick="document.getElementById('_userPanel').style.display='none'">${ic('x',14)}</button>
          </div>
          <div style="font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:var(--mt);margin-bottom:10px;display:flex;align-items:center;gap:6px"><span style="color:var(--yw);display:inline-flex">${ic('clock',13)}</span> Menunggu Persetujuan</div>
          <div id="_pendingList" style="margin-bottom:18px">Memuat...</div>
          <div style="border-top:1px solid var(--bd);margin:16px 0"></div>
          <div style="font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:var(--mt);margin-bottom:10px;display:flex;align-items:center;gap:6px"><span style="display:inline-flex">${ic('users',13)}</span> User Aktif</div>
          <div id="_activeList">Memuat...</div>
        </div>`;
      document.body.appendChild(m);
    }
    m.style.display = 'flex';
    _loadUsers();
  };

  async function _loadUsers() {
    const client = (typeof sb !== 'undefined' ? sb : null) || window.sb;
    if (!client) {
      const pEl = document.getElementById('_pendingList');
      if (pEl) pEl.innerHTML = '<div style="color:var(--rd);font-size:12px">Error: Supabase tidak tersedia</div>';
      return;
    }
    const pEl = document.getElementById('_pendingList');
    const aEl = document.getElementById('_activeList');

    try {
      const [{ data: pending }, { data: active }] = await Promise.all([
        client.from('user_profiles').select('*').eq('role', 'pending').order('created_at', { ascending: false }),
        client.from('user_profiles').select('*').neq('role', 'pending').order('created_at', { ascending: false })
      ]);

      pEl.innerHTML = (pending && pending.length)
        ? pending.map(u => {
            const name = (u.full_name && u.full_name !== '—') ? u.full_name : u.email.split('@')[0];
            const ini  = name.slice(0,2).toUpperCase();
            return `
          <div style="background:rgba(245,196,82,.07);border:1px solid rgba(245,196,82,.2);border-radius:10px;padding:10px 14px;margin-bottom:8px;display:flex;align-items:center;gap:12px">
            <div style="width:38px;height:38px;border-radius:50%;background:#f5c452;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:#fff;flex-shrink:0">${ini}</div>
            <div style="flex:1;min-width:0">
              <div style="font-size:13px;font-weight:600;color:var(--tx)">${name}</div>
              <div style="font-size:11px;color:var(--mt)">${u.email} · minta: <span style="color:var(--bl);font-weight:600">${u.requested_role || 'editor'}</span></div>
            </div>
            <button class="btn btn-sm" style="background:rgba(124,140,240,.15);color:var(--bl);border:1px solid rgba(124,140,240,.3);font-size:11px;padding:4px 10px;border-radius:6px" onclick="_patchApprove('${u.id}','${u.requested_role||'editor'}')">${ic('check',13)} Setuju</button>
            <button class="btn btn-sm" style="background:rgba(244,112,122,.1);color:var(--rd);border:1px solid rgba(244,112,122,.25);font-size:11px;padding:4px 10px;border-radius:6px" onclick="_patchReject('${u.id}')">${ic('x',13)} Tolak</button>
          </div>`;
          }).join('')
        : '<div style="font-size:12px;color:var(--mt);padding:6px 0">Tidak ada pendaftaran baru ✓</div>';

      const _roleConf = {
        admin:  { bg:'rgba(139,92,246,.18)', color:'var(--pu)', label:'Admin',  av:'#8b5cf6' },
        editor: { bg:'rgba(124,140,240,.18)',  color:'var(--bl)', label:'Editor', av:'#7c8cf0' },
        viewer: { bg:'rgba(61,220,151,.18)', color:'var(--gn)', label:'Viewer', av:'#3ddc97' }
      };
      aEl.innerHTML = (active && active.length)
        ? active.map(u => {
            const rc  = _roleConf[u.role] || _roleConf.viewer;
            const name = (u.full_name && u.full_name !== '—') ? u.full_name : u.email.split('@')[0];
            const ini  = name.slice(0,2).toUpperCase();
            return `
          <div style="background:var(--sf2);border-radius:10px;padding:10px 14px;margin-bottom:8px;display:flex;align-items:center;gap:12px;transition:background .15s" onmouseover="this.style.background='var(--ib)'" onmouseout="this.style.background='var(--sf2)'">
            <div style="width:38px;height:38px;border-radius:50%;background:${rc.av};display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:#fff;flex-shrink:0;letter-spacing:.5px">${ini}</div>
            <div style="flex:1;min-width:0">
              <div style="font-size:13px;font-weight:600;color:var(--tx);line-height:1.4">${name}</div>
              <div style="font-size:11px;color:var(--mt);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${u.email}</div>
            </div>
            <span style="font-size:10px;font-weight:600;padding:3px 10px;border-radius:20px;flex-shrink:0;letter-spacing:.5px;text-transform:uppercase;background:${rc.bg};color:${rc.color}">${rc.label}</span>
            ${u.role==='editor' ? `<button class="btn btn-sm" style="background:rgba(124,140,240,.12);color:var(--bl);border:1px solid rgba(124,140,240,.3);font-size:11px;padding:4px 10px;border-radius:6px;flex-shrink:0;cursor:pointer" onclick="_patchAssignProjects('${u.id}','${(u.email||'').replace(/'/g,'')}')">Proyek</button>` : ''}
            <select style="font-size:11px;padding:4px 8px;border-radius:6px;border:1px solid var(--bd);background:var(--ib);color:var(--tx);flex-shrink:0;cursor:pointer;outline:none;transition:border-color .15s" onchange="_patchChangeRole('${u.id}',this.value)" onfocus="this.style.borderColor='var(--bl)'" onblur="this.style.borderColor='var(--bd)'">
              <option value="admin"  ${u.role==='admin' ?'selected':''}>Admin</option>
              <option value="editor" ${u.role==='editor'?'selected':''}>Editor</option>
              <option value="viewer" ${u.role==='viewer'?'selected':''}>Viewer</option>
            </select>
          </div>`;
          }).join('')
        : '<div style="font-size:12px;color:var(--mt);padding:6px">Belum ada user aktif</div>';

    } catch (e) {
      pEl.innerHTML = '<div style="color:var(--rd);font-size:12px">Error: ' + e.message + '</div>';
    }
  }

  window._patchApprove = async function (uid, role) {
    const sb = getSb(); if (!sb) return;
    const { error } = await sb.from('user_profiles').update({ role }).eq('id', uid);
    if (!error) { toast('User disetujui sebagai ' + role); _loadUsers(); _checkPendingBadge(); }
    else toast('Gagal: ' + error.message, true);
  };

  window._patchReject = async function (uid) {
    if (!confirm('Yakin tolak pendaftaran ini?')) return;
    const sb = getSb(); if (!sb) return;
    const { error } = await sb.from('user_profiles').delete().eq('id', uid);
    if (!error) { toast('Pendaftaran ditolak'); _loadUsers(); _checkPendingBadge(); }
    else toast('Gagal: ' + error.message, true);
  };

  window._patchChangeRole = async function (uid, newRole) {
    const sb = getSb(); if (!sb) return;
    const { error } = await sb.from('user_profiles').update({ role: newRole }).eq('id', uid);
    if (!error) toast('Role diubah ke ' + newRole);
    else toast('Gagal mengubah role', true);
  };

  // ── ASSIGN PROYEK PER USER (Admin) ────────────────────────
  window._patchAssignProjects = async function (uid, email) {
    const sb = getSb(); if (!sb) return;
    let m = document.getElementById('_assignPanel');
    if (!m) {
      m = document.createElement('div');
      m.id = '_assignPanel';
      m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;z-index:99999999';
      document.body.appendChild(m);
    }
    m.style.display = 'flex';
    m.innerHTML = `
      <div style="background:var(--sf);border:1px solid var(--bd);border-radius:14px;padding:22px 24px;width:460px;max-width:94vw;max-height:80vh;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,.4)">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
          <h3 style="font-family:var(--fd);letter-spacing:1.5px;font-size:15px;margin:0">AKSES PROYEK</h3>
          <button style="background:transparent;border:1px solid var(--bd);border-radius:8px;color:var(--mt);width:28px;height:28px;cursor:pointer" onclick="document.getElementById('_assignPanel').style.display='none'">${ic('x',14)}</button>
        </div>
        <div style="font-size:11px;color:var(--mt);margin-bottom:14px">Proyek yang boleh diedit oleh <span style="color:var(--bl);font-weight:600">${email}</span></div>
        <div id="_assignList" style="flex:1;overflow-y:auto;margin-bottom:14px;min-height:60px">Memuat...</div>
        <div style="display:flex;gap:8px;justify-content:flex-end">
          <button class="btn btn-sm" style="background:var(--sf2);color:var(--mt);border:1px solid var(--bd);padding:6px 14px;border-radius:8px;cursor:pointer" onclick="document.getElementById('_assignPanel').style.display='none'">Batal</button>
          <button class="btn btn-sm" style="background:var(--bl);color:#fff;border:none;padding:6px 16px;border-radius:8px;cursor:pointer" onclick="_patchSaveAssignments('${uid}')">Simpan</button>
        </div>
      </div>`;
    const listEl = document.getElementById('_assignList');
    try {
      const [{ data: projs, error: e1 }, { data: members, error: e2 }] = await Promise.all([
        sb.from('projects').select('id,kode,nama').order('kode', { ascending: true }),
        sb.from('project_members').select('proj_id').eq('user_id', uid)
      ]);
      if (e1) throw e1; if (e2) throw e2;
      const assigned = new Set((members || []).map(r => String(r.proj_id)));
      if (!projs || !projs.length) {
        listEl.innerHTML = '<div style="font-size:12px;color:var(--mt)">Belum ada proyek</div>';
        return;
      }
      listEl.innerHTML = projs.map(p => {
        const on = assigned.has(String(p.id));
        const nm = (p.nama || '').replace(/</g, '&lt;');
        return `
        <label style="display:flex;align-items:center;gap:10px;padding:9px 10px;border:1px solid var(--bd);border-radius:9px;margin-bottom:6px;cursor:pointer;background:var(--sf2)">
          <input type="checkbox" value="${p.id}" data-orig="${on ? '1' : '0'}" ${on ? 'checked' : ''} style="width:16px;height:16px;cursor:pointer;accent-color:var(--bl)">
          <span style="flex:1;min-width:0"><span style="font-size:12px;font-weight:600;color:var(--tx)">${p.kode || p.id}</span> <span style="font-size:11px;color:var(--mt)">— ${nm}</span></span>
        </label>`;
      }).join('');
    } catch (e) {
      listEl.innerHTML = '<div style="font-size:12px;color:var(--rd)">Error: ' + e.message + '</div>';
    }
  };

  window._patchSaveAssignments = async function (uid) {
    const sb = getSb(); if (!sb) return;
    const boxes = document.querySelectorAll('#_assignList input[type=checkbox]');
    const toInsert = [], toDelete = [];
    boxes.forEach(b => {
      const orig = b.dataset.orig === '1';
      if (b.checked && !orig) toInsert.push({ user_id: uid, proj_id: b.value });
      else if (!b.checked && orig) toDelete.push(b.value);
    });
    if (!toInsert.length && !toDelete.length) {
      document.getElementById('_assignPanel').style.display = 'none';
      return;
    }
    try {
      if (toDelete.length) {
        const { error } = await sb.from('project_members').delete().eq('user_id', uid).in('proj_id', toDelete);
        if (error) throw error;
      }
      if (toInsert.length) {
        const { error } = await sb.from('project_members').insert(toInsert);
        if (error) throw error;
      }
      (window.toast || toast)('Akses proyek diperbarui (+' + toInsert.length + ' / −' + toDelete.length + ')');
      document.getElementById('_assignPanel').style.display = 'none';
    } catch (e) {
      (window.toast || toast)('Gagal: ' + e.message, 'error');
    }
  };

  // ── BADGE NOTIF PENDING ───────────────────────────────────
  async function _checkPendingBadge() {
    const sb = getSb();
    if (!sb || typeof currentRole === 'undefined' || currentRole !== 'admin') return;
    try {
      const { count } = await sb.from('user_profiles')
        .select('*', { count: 'exact', head: true }).eq('role', 'pending');

      const badge = document.getElementById('notifBadge');
      if (!badge) return;

      if (count && count > 0) {
        // Tambah ke dropdown notif
        let ni = document.getElementById('_notifPending');
        if (!ni) {
          ni = document.createElement('div');
          ni.id = '_notifPending';
          ni.className = 'notif-item';
          ni.onclick = () => {
            showUserPanel();
            document.getElementById('notifDropdown')?.classList.remove('open');
          };
          const nl = document.getElementById('notifList');
          if (nl) {
            const empty = nl.querySelector('.notif-empty');
            if (empty) empty.remove();
            nl.prepend(ni);
          }
        }
        ni.innerHTML = `<span class="ni-ico">${ic('user',13)}</span>
          <div class="ni-body">
            <div class="ni-title">${count} pendaftaran menunggu</div>
            <div class="ni-sub">Klik untuk kelola user</div>
          </div>`;
        badge.textContent = parseInt(badge.textContent || '0') + count;
        badge.classList.remove('hidden');
      }
    } catch (e) {}
  }

  // ── EDIT LOCK SYSTEM ──────────────────────────────────────
  window._acquireLock = async function (tbl, rid) {
    const sb = getSb();
    if (!sb || !_patchUserId) return;
    const exp = new Date(Date.now() + LOCK_MINUTES * 60000).toISOString();
    try {
      await sb.from('editing_locks').upsert(
        { table_name: tbl, record_id: rid, locked_by: _patchUserId, locked_by_name: _patchUserName || 'User', expires_at: exp },
        { onConflict: 'table_name,record_id' }
      );
    } catch (e) {}
  };

  window._releaseLock = async function (tbl, rid) {
    const sb = getSb();
    if (!sb || !_patchUserId) return;
    try {
      await sb.from('editing_locks').delete()
        .eq('table_name', tbl).eq('record_id', rid).eq('locked_by', _patchUserId);
    } catch (e) {}
  };

  window._checkAndWarnLock = async function (tbl, rid) {
    const sb = getSb();
    if (!sb || !_patchUserId) return false;
    try {
      const { data } = await sb.from('editing_locks').select('*')
        .eq('table_name', tbl).eq('record_id', rid)
        .gt('expires_at', new Date().toISOString())
        .neq('locked_by', _patchUserId).maybeSingle();
      if (data) {
        toast('⚠️ ' + (data.locked_by_name || 'User lain') + ' sedang mengedit data ini!', true);
        return true; // locked by someone else
      }
    } catch (e) {}
    return false;
  };

  function _subscribeLocks() {
    const sb = getSb();
    if (!sb || _lockChannel) return;
    _lockChannel = sb.channel('patch_locks')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'editing_locks' }, (pl) => {
        if (pl.eventType === 'INSERT' || pl.eventType === 'UPDATE') {
          const lk = pl.new;
          if (lk.locked_by !== _patchUserId) {
            _activeLocks.set(lk.table_name + ':' + lk.record_id, lk);
            toast('🔒 ' + (lk.locked_by_name || 'User lain') + ' mulai mengedit data');
          }
        } else if (pl.eventType === 'DELETE') {
          _activeLocks.delete(pl.old.table_name + ':' + pl.old.record_id);
        }
      }).subscribe();
  }

  // ── TOMBOL "USERS" DI HEADER (Admin) ─────────────────────
  function _injectUserBtn() {
    if (document.getElementById('_btnUsers')) return;
    if (typeof currentRole === 'undefined' || currentRole !== 'admin') return;
    const hr = document.querySelector('.hdr-right');
    if (!hr) return;
    const btn = document.createElement('button');
    btn.id = '_btnUsers';
    btn.className = 'btn btn-sm bgs';
    btn.innerHTML = ic('users',13)+' Users';
    btn.onclick = showUserPanel;
    hr.prepend(btn);
  }

  // ── INIT ──────────────────────────────────────────────────
  let _initDone = false;

  function _tryInit() {
    if (_initDone) return;

    // Inject register link ke auth screen
    const authScreen = document.getElementById('authScreen');
    if (authScreen) injectRegisterLink();

    // Cek apakah sudah login
    const loginDone = authScreen && authScreen.style.display === 'none';
    if (!loginDone) return;

    _initDone = true;

    const sb = getSb();
    if (sb) {
      sb.auth.getUser().then(({ data }) => {
        if (data?.user) {
          _patchUserId = data.user.id;
          window._meEmail = data.user.email || '';
          window._meName = (data.user.email || '').split('@')[0];
          sb.from('user_profiles').select('full_name,email').eq('id', _patchUserId).maybeSingle()
            .then(({ data: p }) => { if (p) { _patchUserName = p.full_name || p.email; window._meName = _patchUserName; } });
        }
      });
    }

    // Admin features
    setTimeout(() => {
      _injectUserBtn();
      _checkPendingBadge();
      _subscribeLocks();
    }, 1200);
  }


  // ── AUTO-RELEASE LOCKS ON NAVIGATION ──────────────────────
  // Release semua lock milik user ini saat halaman ditutup / navigasi

  async function _releaseAllMyLocks() {
    const sb = getSb();
    if (!sb || !_patchUserId) return;
    try {
      await sb.from('editing_locks')
        .delete()
        .eq('locked_by', _patchUserId);
    } catch (e) { /* silent */ }
  }

  // beforeunload: sync best-effort (fetch beacon)
  window.addEventListener('beforeunload', function () {
    const sb = getSb();
    if (!sb || !_patchUserId) return;
    // Gunakan fetch dengan keepalive agar request tetap dikirim walaupun halaman ditutup
    try {
      const url = (typeof _SB_URL !== 'undefined' ? _SB_URL : '')
        + '/rest/v1/editing_locks?locked_by=eq.' + encodeURIComponent(_patchUserId);
      const key = (typeof _SB_ANON !== 'undefined' ? _SB_ANON : '');
      if (url && key) {
        fetch(url, {
          method: 'DELETE',
          headers: { 'apikey': key, 'Authorization': 'Bearer ' + key },
          keepalive: true,
        }).catch(() => {});
      }
    } catch (e) { /* silent */ }
  });

  // visibilitychange: release saat tab di-hide > 30 menit (tab tidak aktif)
  let _hiddenSince = 0;
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      _hiddenSince = Date.now();
    } else {
      _hiddenSince = 0;
    }
  });

  // Periodic: release locks yang sudah expired secara lokal
  setInterval(function () {
    if (!getSb() || !_patchUserId) return;
    // Jika tab sudah hidden > 30 menit, release locks
    if (_hiddenSince && Date.now() - _hiddenSince > 30 * 60000) {
      _releaseAllMyLocks();
      _hiddenSince = 0;
    }
  }, 60000); // cek tiap menit

  // ── LOCK INDICATOR ON RECORD ──────────────────────────────
  // Tambah visual indicator "🔒 dikunci" pada card/row yang sedang di-lock orang lain

  window._showLockIndicator = function(elementId, lockedByName) {
    const el = document.getElementById(elementId);
    if (!el) return;
    // Hapus indicator lama
    el.querySelectorAll('._lockBadge').forEach(b => b.remove());
    const badge = document.createElement('span');
    badge.className = '_lockBadge';
    badge.innerHTML = ic('lock',12)+' ' + (lockedByName || 'Dikunci');
    badge.style.cssText = 'font-size:9px;color:var(--rd);background:rgba(244,112,122,.1);' +
      'padding:1px 6px;border-radius:4px;margin-left:6px;flex-shrink:0';
    el.appendChild(badge);
  };

  window._hideLockIndicator = function(elementId) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.querySelectorAll('._lockBadge').forEach(b => b.remove());
  };

  setInterval(_tryInit, 600);
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(_tryInit, 800);
    const authScreen = document.getElementById('authScreen');
    if (authScreen) injectRegisterLink();
  });

})();


