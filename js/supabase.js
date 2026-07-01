// ============================================================
//  ATW Solar Dashboard — js/supabase.js
//  Supabase client, data loading, realtime, save helpers,
//  field mappers (map/unmap), presence, photos
//  Dipanggil setelah: supabase CDN, utils.js
//  Bergantung pada global: P, ISS, PROC, MPLOGS, ACCLOGS,
//    SCURVE, WBS, COSTS, RAB, genId, sanitize*, toast, render
// ============================================================
// ============================================================
//  ATW Solar Dashboard — Supabase Client
//  Ganti bagian GAS sync di index.html dengan kode ini
//  Versi: 1.0.0
// ============================================================

// ── 0. CONFIG — isi setelah buat project di supabase.com ──
// SUPABASE_URL sudah dideklarasikan di atas (var)
    var _SB_URL = 'https://mbdhnrhoqwljhtkavsrr.supabase.co';
var _SB_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1iZGhucmhvcXdsamh0a2F2c3JyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxNjIzMDgsImV4cCI6MjA5NDczODMwOH0.N2mTpEcOkzPHYkLJMf9L5vIwZTjvZXUaOeMXcX9sJ_o';

// ── 1. INIT CLIENT ──
// Tambahkan di <head>:
// supabase-js@2 sudah dimuat di atas (lihat <head>)
let sb = null;
function _initSb(){
  if(sb) return sb;
  try{
    const { createClient } = supabase;
    var sbUrl = (typeof SUPABASE_URL !== 'undefined' ? SUPABASE_URL : _SB_URL);
    var sbAnon = (typeof SUPABASE_ANON !== 'undefined' ? SUPABASE_ANON : _SB_ANON);
    sb = createClient(sbUrl, sbAnon);
  }catch(e){ console.warn('Supabase init error:',e); }
  return sb;
}
// init segera jika supabase sudah tersedia, jika tidak tunggu window load
if(typeof supabase !== 'undefined'){ _initSb(); }
else{ window.addEventListener('load', _initSb); }

// ── 2. AUTH ──────────────────────────────────────────────────

/** Login dengan email + password */
async function sbLogin(email, password) {
  const client = _initSb();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

/** Logout */
async function sbLogout() {
  const client = _initSb();
  await client.auth.signOut();
}

/** Get role user yang sedang login */
async function sbGetRole() {
  const client = _initSb();
  const { data } = await client.from('user_profiles')
    .select('role')
    .eq('id', (await client.auth.getUser()).data.user?.id)
    .single();
  return data?.role || 'viewer';
}

/** Listen perubahan auth state */
function _initAuthListener(){
  const client = _initSb();
  if(!client) return;
  client.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN') {
      loadFromSupabase();
    } else if (event === 'SIGNED_OUT') {
      document.getElementById('auth-screen')?.classList.remove('hidden');
    }
  });
}
window.addEventListener('load', _initAuthListener);

// ── 3. LOAD ALL DATA ─────────────────────────────────────────

async function loadFromSupabase() {
  const client = _initSb();
  if(!client){ toast('Supabase belum siap, coba lagi','error'); return; }
  try {
    toast('Memuat data dari server...', 'info');

    const [
      { data: projects },
      { data: history },
      { data: issues },
      { data: procurement },
      { data: manpowerLogs },
      { data: accidentLogs },
      { data: costs },
      { data: rab },
      { data: wbs },
      { data: scurve },
      { data: documents },
      { data: snapshots },
      { data: actionItems },
    ] = await Promise.all([
      (_initSb()).from('projects').select('*').order('created_at'),
      (_initSb()).from('project_history').select('*').order('date'),
      (_initSb()).from('issues').select('*').order('created_at', { ascending: false }),
      (_initSb()).from('procurement').select('*').order('created_at', { ascending: false }),
      (_initSb()).from('manpower_logs').select('*').order('date', { ascending: false }),
      (_initSb()).from('accident_logs').select('*').order('date', { ascending: false }),
      (_initSb()).from('costs').select('*').eq('_deleted', false).order('date', { ascending: false }),
      (_initSb()).from('rab').select('*').order('urutan'),
      (_initSb()).from('wbs').select('*').order('order'),
      (_initSb()).from('scurve').select('*').order('week'),
      (_initSb()).from('documents').select('*').order('created_at', { ascending: false }),
      (_initSb()).from('snapshots').select('*').order('date'),
      (_initSb()).from('action_items').select('*').order('created_at'),
    ]);

    // Map dari snake_case Supabase → camelCase dashboard
    P       = (projects || []).map(mapProject);
    ISS     = (issues || []).map(mapIssue);
    PROC    = (procurement || []).map(mapProcurement);
    MPLOGS  = (manpowerLogs || []).map(mapManpower);
    ACCLOGS = (accidentLogs || []).map(mapAccident);
    COSTS   = (costs || []).map(mapCost);
    RAB     = (rab || []).map(mapRab);
    WBS     = (wbs || []).map(mapWbs);
    SCURVE  = (scurve || []).map(mapScurve);
    if (typeof mapDocument === 'function') {
      DOCS = (documents || []).map(mapDocument);
    }
    if (typeof mapSnapshot === 'function') {
      SNAPSHOTS = (snapshots || []).map(mapSnapshot);
    }
    if (typeof mapActionItem === 'function') {
      ACTIONS = (actionItems || []).map(mapActionItem);
    }

    // Merge history ke masing-masing project
    (history || []).forEach(h => {
      const p = P.find(x => x.id === h.proj_id);
      if (p) {
        p.history = p.history || [];
        p.history.push({
          date: h.date, actual: h.actual, plan: h.plan,
          mp: h.mp, notes: h.notes, status: h.status
        });
      }
    });

    window._sbLoaded = true; window._sbLoadFailed = false;   // data Supabase sudah masuk → overview boleh render data live
    render();
    toast('Data berhasil dimuat ✓');
    if (typeof autoSnapshotWeekly === 'function') setTimeout(autoSnapshotWeekly, 1500);
    sbSubscribeRealtime();           // start listening perubahan realtime

  } catch (err) {
    toast('Gagal load data: ' + err.message, 'error');
    console.error(err);
    // Supabase gagal → izinkan overview tampil dari data cache yang ada (jangan biarkan kosong)
    window._sbLoadFailed = true;
  }
  // ── Jaminan render overview (fix: data Supabase tak muncul sampai pindah tab) ──
  // Data array (P/ISS/PROC/...) sudah ter-assign SEBELUM titik error apa pun di atas,
  // jadi blok ini WAJIB jalan di jalur sukses MAUPUN bila ada error parsial (merge/parse).
  // Double rAF memastikan ini render TERAKHIR yang menimpa render cache lokal (loadLocal).
  if (typeof activeTab === 'undefined' || activeTab === 'overview') {
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        try { if (typeof renderOV === 'function') renderOV(); } catch (e) {}
      });
    });
  }
}

// ── 4. REALTIME SUBSCRIPTION ─────────────────────────────────

let _realtimeChannel = null;

function sbSubscribeRealtime() {
  if (_realtimeChannel) _initSb().removeChannel(_realtimeChannel);

  _realtimeChannel = (_initSb()).channel('atw-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' },
      payload => _handleRealtimeChange('projects', payload))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'issues' },
      payload => _handleRealtimeChange('issues', payload))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'procurement' },
      payload => _handleRealtimeChange('procurement', payload))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'costs' },
      payload => _handleRealtimeChange('costs', payload))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'manpower_logs' },
      payload => _handleRealtimeChange('manpower_logs', payload))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'accident_logs' },
      payload => _handleRealtimeChange('accident_logs', payload))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'wbs' },
      payload => _handleRealtimeChange('wbs', payload))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'scurve' },
      payload => _handleRealtimeChange('scurve', payload))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'photos' },
      payload => _handleRealtimeChange('photos', payload))
    .subscribe();
}

/** Handle perubahan realtime — update array lokal + re-render */
function _handleRealtimeChange(table, payload) {
  const { eventType, new: newRow, old: oldRow } = payload;

  const tableMap = {
    projects:      { arr: () => P,       mapper: mapProject,     key: 'id' },
    issues:        { arr: () => ISS,      mapper: mapIssue,       key: 'id' },
    procurement:   { arr: () => PROC,     mapper: mapProcurement, key: 'id' },
    costs:         { arr: () => COSTS,    mapper: mapCost,        key: 'id' },
    manpower_logs: { arr: () => MPLOGS,   mapper: mapManpower,    key: 'id' },
    accident_logs: { arr: () => ACCLOGS,  mapper: mapAccident,    key: 'id' },
    wbs:           { arr: () => WBS,      mapper: mapWbs,         key: 'id' },
    scurve:        { arr: () => SCURVE,   mapper: mapScurve,      key: 'id' },
  };

  const cfg = tableMap[table];
  if (!cfg) return;

  const arr = cfg.arr();
  const mapped = cfg.mapper(newRow);

  if (eventType === 'INSERT') {
    if (!arr.find(x => x[cfg.key] === mapped[cfg.key])) {
      arr.push(mapped);
    }
  } else if (eventType === 'UPDATE') {
    const idx = arr.findIndex(x => x[cfg.key] === mapped[cfg.key]);
    if (idx >= 0) arr[idx] = { ...arr[idx], ...mapped };
  } else if (eventType === 'DELETE') {
    const idx = arr.findIndex(x => x[cfg.key] === oldRow[cfg.key]);
    if (idx >= 0) arr.splice(idx, 1);
  }

  // Setelah WBS diupdate via realtime, recalculate cumActual dari dailyLogs
  // agar dashboard konsisten tanpa perlu refresh manual
  if (table === 'wbs' && eventType !== 'DELETE') {
    const projId = String(mapped.projId || mapped.proj_id || '');
    if (projId && typeof _syncDailyToProject === 'function') {
      try { _syncDailyToProject(projId); } catch(e) {}
    }
  }

  // Deteksi echo perubahan kita sendiri (baru disimpan) -> hindari render ulang sia-sia
  let _selfEcho = false;
  try {
    const _k = table + ':' + (mapped[cfg.key] != null ? mapped[cfg.key] : (oldRow && oldRow[cfg.key]));
    const _savedTs = (typeof _recordTs !== 'undefined' && _recordTs) ? _recordTs.get(_k) : null;
    if (_savedTs && (Date.now() - Date.parse(_savedTs) < 4000)) _selfEcho = true;
  } catch (e) {}

  // Debounce + render bertarget: hanya render tab aktif bila tabel yg berubah relevan (hemat saat multi-user)
  if (!_selfEcho) {
    _rtChangedTables.add(table);
    clearTimeout(_realtimeRenderTimer);
    _realtimeRenderTimer = setTimeout(_rtFlushRender, 300);
  }
}
let _realtimeRenderTimer = null;
let _rtChangedTables = new Set();
function _rtFlushRender(){
  const ch = _rtChangedTables; _rtChangedTables = new Set();
  // Indikator ringan selalu (murah)
  try { if (typeof updateBadge==='function') updateBadge(); } catch(e){}
  try { if (typeof updateGsBadge==='function') updateGsBadge(); } catch(e){}
  try { if (typeof updateNotif==='function') updateNotif(); } catch(e){}
  // Sidebar hanya bila data proyek berubah
  if (ch.has('projects')) { try { if (typeof renderSB==='function') renderSB(); } catch(e){} }
  const t = (typeof activeTab !== 'undefined') ? activeTab : '';
  const need = {
    overview:    ['projects','wbs','scurve','costs','procurement','issues','manpower_logs','accident_logs'],
    projects:    ['projects','wbs','scurve','costs','procurement'],
    manpower:    ['manpower_logs','accident_logs'],
    issues:      ['issues'],
    procurement: ['procurement','costs'],
    cost:        ['costs','procurement']
  };
  const rel = need[t] || [];
  if (!rel.some(x => ch.has(x))) return; // tak ada yg relevan -> lewati render berat
  try {
    if (t==='overview') renderOV();
    else if (t==='projects') renderProjTab();
    else if (t==='manpower') renderMP();
    else if (t==='issues') renderIssues();
    else if (t==='procurement') renderProc();
    else if (t==='cost'){ renderCost(); renderRab(); }
  } catch(e){}
}


// ══════════════════════════════════════════════════════════════
//  🔀  MULTI-USER MODULE — Conflict Detection, Presence, Realtime
// ══════════════════════════════════════════════════════════════

// ── CONFLICT DETECTION ────────────────────────────────────────

/**
 * Client-side timestamp tracking per record.
 * Key: "table:id", Value: ISO timestamp saat kita TERAKHIR load/save
 */
const _recordTs = new Map();

/** Catat timestamp lokal saat load data */
function sbTrackTs(table, id, ts) {
  if (ts) _recordTs.set(table + ':' + id, ts);
}
window.sbTrackTs = sbTrackTs;


/**
 * Kembalikan nama display user yang sedang login.
 * Dipakai untuk mengisi kolom updated_by saat upsert.
 */
function _sbGetCurrentUserName() {
  if (!_currentUser) return null;
  // Coba dari metadata Supabase (full_name di user_metadata)
  const meta = _currentUser.user_metadata || {};
  return meta.full_name || meta.name || (_currentUser.email || '').split('@')[0] || null;
}
window._sbGetCurrentUserName = _sbGetCurrentUserName;

/**
 * Cek apakah record sudah diubah orang lain sejak kita load.
 * Returns: null (aman) | { changedBy, changedAt, diff } (konflik)
 *
 * Usage sebelum save:
 *   const conflict = await sbCheckConflict('projects', projId);
 *   if (conflict) { showConflictWarning(conflict); return; }
 */
async function sbCheckConflict(table, id) {
  const localTs = _recordTs.get(table + ':' + id);
  if (!localTs) return null; // belum di-track → skip

  try {
    const client = _initSb();
    // Query updated_at + updated_by (updated_by mungkin null jika kolom belum ada)
    const { data, error } = await client
      .from(table)
      .select('id, updated_at, updated_by')
      .eq('id', id)
      .maybeSingle();

    // Jika error (misal kolom updated_at tidak ada di table ini), silent skip
    if (error || !data || !data.updated_at) return null;

    const serverTs = new Date(data.updated_at).getTime();
    const clientTs = new Date(localTs).getTime();

    if (serverTs > clientTs + 2000) { // 2 detik toleransi
      return {
        table,
        id,
        changedBy:  data.updated_by || 'Pengguna lain',
        changedAt:  data.updated_at,
        serverTs,
        clientTs,
      };
    }
  } catch (e) {
    // Silent fail — jangan block save karena gagal cek conflict
    console.warn('[sbCheckConflict]', e.message);
  }
  return null;
}
window.sbCheckConflict = sbCheckConflict;

/**
 * Wrapper: cek konflik → tampilkan warning → biarkan user decide.
 * Jika konflik: tampilkan modal konfirmasi, return false → caller stop.
 * Jika aman / user pilih override: return true → caller lanjut save.
 */
async function sbSafeCheck(table, id, label) {
  const conflict = await sbCheckConflict(table, id);
  if (!conflict) return true; // aman

  const when = new Date(conflict.changedAt).toLocaleTimeString('id-ID');
  const msg = (label || 'Data ini') + ' sudah diubah oleh ' + conflict.changedBy + ' pada ' + when + '.\n\nLanjutkan dan timpa perubahan mereka?';

  return window.confirm(msg);
}
window.sbSafeCheck = sbSafeCheck;

// ── ENHANCED PRESENCE ─────────────────────────────────────────

/** State presence lokal */
let _onlineUsers = [];

/** Update _onlineUsers dan render */
function _updatePresence(users) {
  _onlineUsers = users || [];
  _renderOnlineUsers(_onlineUsers);
  _renderPresencePanel(_onlineUsers);
}

/** Render avatar strip di header */
function _renderOnlineUsers(users) {
  const el = document.getElementById('online-users');
  if (!el) return;

  if (!users.length) { el.innerHTML = ''; return; }

  const colors = ['#7c8cf0','#3ddc97','#7c8cf0','#8b5cf6','#ec4899','#06b6d4'];
  el.innerHTML = users.slice(0, 5).map((u, i) => {
    const initials = (u.name || 'U').split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();
    const color = colors[i % colors.length];
    const proj = u.editingProjId ? ' · editing' : '';
    return '<span title="' + (u.name||'User') + ' (' + (u.role||'?') + ')' + proj + '" ' +
      'style="display:inline-flex;align-items:center;justify-content:center;' +
      'width:24px;height:24px;border-radius:50%;background:' + color + ';' +
      'color:#fff;font-size:9px;font-weight:700;margin-left:-4px;' +
      'border:2px solid var(--sf);cursor:default;flex-shrink:0">' +
      initials + '</span>';
  }).join('') + (users.length > 5 ?
    '<span style="font-size:9px;color:var(--mt);margin-left:4px">+' + (users.length-5) + '</span>' : '');
}

/** Render panel detail presence (untuk modal/popover) */
function _renderPresencePanel(users) {
  const el = document.getElementById('presencePanel');
  if (!el) return;

  if (!users.length) {
    el.innerHTML = '<div style="font-size:11px;color:var(--mt);padding:8px">Hanya kamu yang online</div>';
    return;
  }

  const colors = ['#7c8cf0','#3ddc97','#7c8cf0','#8b5cf6','#ec4899','#06b6d4'];
  el.innerHTML = users.map((u, i) => {
    const color = colors[i % colors.length];
    const initials = (u.name||'U').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
    const projName = u.editingProjId
      ? (typeof P !== 'undefined' ? (P.find(p=>String(p.id)===String(u.editingProjId))?.kode||'Project') : 'Project')
      : null;
    return '<div style="display:flex;align-items:center;gap:8px;padding:5px 8px;' +
      'border-radius:5px;background:rgba(255,255,255,.03);margin-bottom:2px">' +
      '<span style="width:28px;height:28px;border-radius:50%;background:' + color + ';' +
        'color:#fff;font-size:10px;font-weight:700;display:flex;align-items:center;' +
        'justify-content:center;flex-shrink:0">' + initials + '</span>' +
      '<div style="min-width:0">' +
        '<div style="font-size:11px;font-weight:600;color:var(--tx);overflow:hidden;' +
          'text-overflow:ellipsis;white-space:nowrap">' + (u.name||'User') + '</div>' +
        '<div style="font-size:9px;color:var(--mt)">' +
          (projName ? ic('edit',11)+' ' + projName : icDot('currentColor',7)+' Online') +
        '</div>' +
      '</div>' +
      '<span style="margin-left:auto;font-size:8px;color:var(--mt);' +
        'background:rgba(124,140,240,.1);padding:1px 6px;border-radius:10px">' +
        (u.role||'viewer') + '</span>' +
    '</div>';
  }).join('');
}
window._renderPresencePanel = _renderPresencePanel;

/** Expose online users list untuk debugging */
window._getOnlineUsers = function() { return _onlineUsers; };

// ── 5. UPSERT HELPERS (ganti gsSync / syncAllGS) ─────────────

/** Simpan/update satu project */
async function sbSaveProject(proj) {
  const row = { ...unmapProject(proj), updated_by: _sbGetCurrentUserName() };
  const { error } = await (_initSb()).from('projects').upsert(row, { onConflict: 'id' });
  if (error) throw error;
}

/** Simpan/update project_history entries */
async function sbSaveHistory(projId, historyArr) {
  if (!historyArr?.length) return;
  const rows = historyArr.map(h => ({
    proj_id: projId,
    date:    h.date,
    actual:  h.actual,
    plan:    h.plan,
    mp:      h.mp || 0,
    notes:   h.notes || '',
    status:  h.status || null,
  }));
  const { error } = await (_initSb()).from('project_history')
    .upsert(rows, { onConflict: 'proj_id,date', ignoreDuplicates: false });
  if (error) console.warn('history upsert:', error.message);
}

/** Simpan issue */
async function sbSaveIssue(iss) {
  const { error } = await (_initSb()).from('issues').upsert({ ...unmapIssue(iss), updated_by: _sbGetCurrentUserName() }, { onConflict: 'id' });
  if (error) throw error;
}

/** Hapus issue */
async function sbDeleteIssue(id) {
  const { error } = await (_initSb()).from('issues').delete().eq('id', id);
  if (error) throw error;
}

/** Simpan procurement */
async function sbSaveProcurement(proc) {
  const { error } = await (_initSb()).from('procurement').upsert({ ...unmapProcurement(proc), updated_by: _sbGetCurrentUserName() }, { onConflict: 'id' });
  if (error) throw error;
}

/** Simpan cost */
async function sbSaveCost(cost) {
  const { error } = await (_initSb()).from('costs').upsert({ ...unmapCost(cost), updated_by: _sbGetCurrentUserName() }, { onConflict: 'id' });
  if (error) throw error;
}

/** Soft-delete cost */
async function sbDeleteCost(id) {
  const { error } = await (_initSb()).from('costs').update({ _deleted: true }).eq('id', id);
  if (error) throw error;
}

/** Simpan manpower log */
async function sbSaveManpower(mp) {
  const { error } = await (_initSb()).from('manpower_logs').upsert({ ...unmapManpower(mp), updated_by: _sbGetCurrentUserName() }, { onConflict: 'id' });
  if (error) throw error;
}

/** Simpan accident log */
async function sbSaveAccident(acc) {
  const { error } = await (_initSb()).from('accident_logs').upsert({ ...unmapAccident(acc), updated_by: _sbGetCurrentUserName() }, { onConflict: 'id' });
  if (error) throw error;
}

/** Simpan RAB (batch) */
async function sbSaveRab(rabArr) {
  if (!rabArr?.length) return;
  const ub = _sbGetCurrentUserName();
  const { error } = await (_initSb()).from('rab').upsert(rabArr.map(r => ({ ...unmapRab(r), updated_by: ub })), { onConflict: 'id' });
  if (error) throw error;
}

/** Simpan WBS node */
async function sbSaveWbs(node) {
  const { error } = await (_initSb()).from('wbs').upsert({ ...unmapWbs(node), updated_by: _sbGetCurrentUserName() }, { onConflict: 'id' });
  if (error) throw error;
}

/** Simpan S-Curve entry */
async function sbSaveScurve(entry) {
  const { error } = await (_initSb()).from('scurve').upsert(unmapScurve(entry), { onConflict: 'proj_id,week' });
  if (error) throw error;
}

/** Snapshot mingguan: map row <-> objek & simpan */
function mapSnapshot(r){
  return { id:r.id, projId:r.proj_id, week:r.week, date:r.date,
    actual:+r.actual||0, plan:+r.plan||0,
    spi:(r.spi!=null?+r.spi:null), cpi:(r.cpi!=null?+r.cpi:null) };
}
function unmapSnapshot(s){
  return { id:s.id, proj_id:s.projId, week:s.week, date:s.date,
    actual:+s.actual||0, plan:+s.plan||0,
    spi:(s.spi!=null?+s.spi:null), cpi:(s.cpi!=null?+s.cpi:null) };
}
async function sbSaveSnapshot(entry){
  const { error } = await (_initSb()).from('snapshots').upsert(unmapSnapshot(entry), { onConflict: 'proj_id,week' });
  if (error) throw error;
}

/** Action items: map row <-> objek & simpan/hapus */
function mapActionItem(r){
  return { id:r.id, projId:r.proj_id, text:r.text||'', pic:r.pic||'',
    due:r.due||'', done:!!r.done, createdAt:r.created_at||'' };
}
function unmapActionItem(a){
  return { id:a.id, proj_id:a.projId, text:(a.text||'').slice(0,500),
    pic:a.pic||'', due:a.due||null, done:!!a.done };
}
async function sbSaveActionItem(a){
  const { error } = await (_initSb()).from('action_items').upsert(unmapActionItem(a), { onConflict: 'id' });
  if (error) throw error;
}
async function sbDeleteActionItem(id){
  const { error } = await (_initSb()).from('action_items').delete().eq('id', id);
  if (error) throw error;
}

// ── 6. PHOTOS ─────────────────────────────────────────────────

/** Upload foto ke Supabase Storage */
async function sbUploadPhoto(projId, file, caption = '') {
  const ext = file.name.split('.').pop();
  const path = `${projId}/${Date.now()}.${ext}`;

  const { error: upErr } = await (_initSb()).storage
    .from('project-photos')
    .upload(path, file, { cacheControl: '3600', upsert: false });
  if (upErr) throw upErr;

  const { data: { publicUrl } } = (_initSb()).storage
    .from('project-photos')
    .getPublicUrl(path);

  const { error: dbErr } = await (_initSb()).from('photos').insert({
    id: genId(), proj_id: projId, url: publicUrl, caption
  });
  if (dbErr) throw dbErr;

  return publicUrl;
}

/** Hapus foto */
async function sbDeletePhoto(photoId, url) {
  const path = url.split('/project-photos/')[1];
  await (_initSb()).storage.from('project-photos').remove([path]);
  await (_initSb()).from('photos').delete().eq('id', photoId);
}

// ── 7. PRESENCE (siapa sedang online/edit) ───────────────────

let _presenceChannel = null;
let _currentUser = null;

async function sbInitPresence() {
  const { data: { user } } = await (_initSb()).auth.getUser();
  _currentUser = user;

  const { data: profile } = await (_initSb()).from('user_profiles')
    .select('full_name, role').eq('id', user.id).single();

  _presenceChannel = (_initSb()).channel('presence-atw', {
    config: { presence: { key: user.id } }
  });

  _presenceChannel
    .on('presence', { event: 'sync' }, () => {
      const state = _presenceChannel.presenceState();
      _updatePresence(Object.values(state).flat());
    })
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await _presenceChannel.track({
          userId:   user.id,
          name:     profile?.full_name || user.email,
          role:     profile?.role || 'viewer',
          editingProjId: null,        // update saat user buka project
        });
      }
    });
}

/** Update status "sedang edit project X" */
async function sbSetEditing(projId) {
  await _presenceChannel?.track({
    userId: _currentUser?.id,
    editingProjId: projId
  });
}

/** Render badge user online di UI */
function _renderOnlineUsers(users) {
  const el = document.getElementById('online-users');
  if (!el) return;
  el.innerHTML = users.map(u =>
    `<span class="online-badge" title="${u.name} (${u.role})"
      style="background:var(--bl);color:#fff;padding:2px 8px;
             border-radius:12px;font-size:11px;margin-right:4px">
      ${u.name?.split(' ')[0] || 'User'}
    </span>`
  ).join('');
}

// ── 8. FIELD MAPPERS (Supabase snake_case ↔ Dashboard camelCase) ──

function mapProject(r) {
  return {
    id: r.id, kode: r.kode, nama: r.nama, lokasi: r.lokasi,
    client: r.client, mulai: r.mulai, selesai: r.selesai,
    status: r.status, plan: r.plan, actual: r.actual,
    mpPlan: r.mp_plan, mdPlan: r.mp_plan, mhPlan: r.mh_plan,
    mpActual: r.mp_actual, weather: r.weather, notes: r.notes,
    lat: r.lat, lon: r.lon,
    logo: r.logo, picPm: r.pic_pm, picSm: r.pic_sm,
    picEng: r.pic_eng, picProc: r.pic_proc, history: []
  };
}
function unmapProject(p) {
  return {
    id: p.id, kode: p.kode, nama: p.nama, lokasi: p.lokasi,
    client: p.client, mulai: p.mulai || null, selesai: p.selesai || null,
    status: p.status, plan: p.plan, actual: p.actual,
    mp_plan: p.mpPlan || p.mdPlan || 0, mh_plan: p.mhPlan || 0,
    mp_actual: p.mpActual || 0, weather: p.weather, notes: p.notes,
    lat: p.lat ?? null, lon: p.lon ?? null,
    logo: p.logo, pic_pm: p.picPm, pic_sm: p.picSm,
    pic_eng: p.picEng, pic_proc: p.picProc
  };
}

function mapIssue(r) {
  return {
    id: r.id, projId: r.proj_id, tgl: r.tgl, uraian: r.uraian,
    prioritas: r.prioritas, kategori: r.kategori, pj: r.pj,
    due: r.due, status: r.status, done: r.done, action: r.action
  };
}
function unmapIssue(i) {
  return {
    id: i.id, proj_id: i.projId, tgl: i.tgl || null,
    uraian: i.uraian, prioritas: i.prioritas, kategori: i.kategori,
    pj: i.pj, due: i.due || null, status: i.status,
    done: i.done, action: i.action
  };
}

function mapProcurement(r) {
  return {
    id: r.id, projId: r.proj_id, item: r.item, kategori: r.kategori,
    qty: r.qty, satuan: r.satuan, due: r.due, supplier: r.supplier,
    harga: r.harga, status: r.status, notes: r.notes,
    rabKatId: r.rab_kat_id, rabItemId: r.rab_item_id,
    link: r.link || '',
    onsiteDate: r.onsite_date || '',
    logs: Array.isArray(r.logs) ? r.logs : []
  };
}
function unmapProcurement(p) {
  return {
    id: p.id, proj_id: p.projId, item: p.item, kategori: p.kategori,
    qty: p.qty || 0, satuan: p.satuan, due: p.due || null,
    supplier: p.supplier, harga: p.harga || 0, status: p.status,
    notes: p.notes, rab_kat_id: p.rabKatId || null,
    rab_item_id: p.rabItemId || null,
    link: p.link || null,
    onsite_date: p.onsiteDate || null,
    logs: Array.isArray(p.logs) ? p.logs : []
  };
}

function mapManpower(r) {
  return {
    id: r.id, projId: r.proj_id, date: r.date,
    activities: r.activities || [], spv: r.spv, mandor: r.mandor,
    installer: r.installer, tukang: r.tukang, helper: r.helper,
    safety: r.safety, total: r.total,
    mhActual: r.mh_actual || 0,
    timeLost: r.time_lost || 0,
    timeLostReason: r.time_lost_reason || '',
    workHours: (r.work_hours != null ? r.work_hours : 8),
    notes: r.notes || ''
  };
}
function unmapManpower(m) {
  return {
    id: m.id, proj_id: m.projId, date: m.date,
    activities: m.activities || [],
    spv: m.spv || 0, mandor: m.mandor || 0, installer: m.installer || 0,
    tukang: m.tukang || 0, helper: m.helper || 0,
    safety: m.safety || 0, total: m.total || 0,
    mh_actual: m.mhActual || 0,
    time_lost: m.timeLost || 0,
    time_lost_reason: m.timeLostReason || '',
    work_hours: (m.workHours != null ? m.workHours : 8),
    notes: m.notes || ''
  };
}

function mapAccident(r) {
  return {
    id: r.id, projId: r.proj_id, date: r.date,
    fatality: r.fatality, lti: r.lti, minorInjury: r.minor_injury,
    medTreatment: r.med_treatment, propertyDamage: r.property_damage,
    fire: r.fire, traffic: r.traffic, environment: r.environment,
    nearMiss: r.near_miss, timeLost: r.time_lost, notes: r.notes
  };
}
function unmapAccident(a) {
  return {
    id: a.id, proj_id: a.projId, date: a.date,
    fatality: a.fatality || 0, lti: a.lti || 0,
    minor_injury: a.minorInjury || 0, med_treatment: a.medTreatment || 0,
    property_damage: a.propertyDamage || 0, fire: a.fire || 0,
    traffic: a.traffic || 0, environment: a.environment || 0,
    near_miss: a.nearMiss || 0, time_lost: a.timeLost || 0, notes: a.notes
  };
}

function mapCost(r) {
  return {
    id: r.id, projId: r.proj_id, date: r.date, type: r.type,
    kategori: r.kategori, deskripsi: r.deskripsi, amount: r.amount,
    paidBy: r.paid_by, notes: r.notes, ref: r.ref, status: r.status,
    rabKatId: r.rab_kat_id, rabItemId: r.rab_item_id, _deleted: r._deleted
  };
}
function unmapCost(c) {
  return {
    id: c.id, proj_id: c.projId, date: c.date, type: c.type,
    kategori: c.kategori, deskripsi: c.deskripsi, amount: c.amount,
    paid_by: c.paidBy, notes: c.notes, ref: c.ref, status: c.status,
    rab_kat_id: c.rabKatId || null, rab_item_id: c.rabItemId || null,
    _deleted: c._deleted || false
  };
}

function mapRab(r) {
  return {
    id: r.id, projId: r.proj_id, type: r.type, katId: r.kat_id,
    name: r.name, deskripsi: r.deskripsi, satuan: r.satuan,
    volume: r.volume, hargaSatuan: r.harga_satuan, total: r.total,
    notes: r.notes, urutan: r.urutan, isCustom: r.is_custom
  };
}
function unmapRab(r) {
  return {
    id: r.id, proj_id: r.projId, type: r.type, kat_id: r.katId || null,
    // Items (type='item') tidak punya field 'name' di JS — fallback ke deskripsi
    name: (r.name || r.deskripsi || '').slice(0,200),
    deskripsi: r.deskripsi || '', satuan: r.satuan || '',
    volume: r.volume || 0, harga_satuan: r.hargaSatuan || 0,
    notes: r.notes || '', urutan: r.urutan || 1, is_custom: r.isCustom !== false
  };
}

function mapWbs(r) {
  return {
    id: r.id, projId: r.proj_id, type: r.type,
    parentId: r.parent_id, name: r.name, bobot: r.bobot,
    order: r.order, cumPlan: r.cum_plan, cumActual: r.cum_actual,
    startDate: r.start_date, finishDate: r.finish_date,
    weeklyData: r.weekly_data || {}, weeklyPlan: r.weekly_plan || {},
    predecessors: Array.isArray(r.predecessors) ? r.predecessors : (r.predecessors ? JSON.parse(r.predecessors) : []),
    // Daily Report fields
    qtyPlan:   r.qty_plan   != null ? +r.qty_plan : 0,
    satuan:    r.satuan     || '',
    qtySatuan: r.satuan     || '',   // alias agar daily.js & wbs.js kompatibel
    dailyLogs: Array.isArray(r.daily_logs) ? r.daily_logs : (r.daily_logs ? JSON.parse(r.daily_logs) : [])
  };
}
function unmapWbs(w) {
  return {
    id: w.id, proj_id: w.projId, type: w.type,
    parent_id: w.parentId || null,
    name: (w.name || '(unnamed)').slice(0, 200),  // NOT NULL guard
    bobot: w.bobot || 0,
    order: w.order || 0, cum_plan: w.cumPlan || 0, cum_actual: w.cumActual || 0,
    start_date: w.startDate || null, finish_date: w.finishDate || null,
    weekly_data: w.weeklyData || {}, weekly_plan: w.weeklyPlan || {},
    predecessors: Array.isArray(w.predecessors) ? w.predecessors : [],
    // Daily Report fields — simpan ke Supabase
    qty_plan:   w.qtyPlan   != null ? +w.qtyPlan  : 0,
    satuan:     w.satuan    || w.qtySatuan || '',   // support dua alias
    daily_logs: w.dailyLogs || []
  };
}

function mapScurve(r) {
  return {
    id: r.id, projId: r.proj_id, week: r.week,
    wPlan: r.w_plan, wAct: r.w_act,
    cPlan: r.c_plan, cAct: r.c_act, dateStart: r.date_start
  };
}
function unmapScurve(s) {
  return {
    proj_id: s.projId, week: s.week,
    w_plan: s.wPlan, w_act: s.wAct,
    c_plan: s.cPlan, c_act: s.cAct, date_start: s.dateStart
  };
}

// ── 9. MIGRATION HELPER — import dari GSheet JSON ────────────
//  Panggil sekali dari console browser setelah login admin:
//  await migrateFromGSheet(window._gsExportData);

async function migrateFromGSheet(gsData) {
  console.log('🚀 Starting migration from GSheet data...');
  const errors = [];

  // Projects
  for (const p of gsData.projects || []) {
    try {
      await sbSaveProject(p);
      await sbSaveHistory(p.id, p.history || []);
    } catch (e) { errors.push(`project ${p.id}: ${e.message}`); }
  }
  console.log(`✓ Projects: ${gsData.projects?.length || 0}`);

  // Issues
  for (const x of gsData.issues || []) {
    try { await sbSaveIssue(x); } catch (e) { errors.push(`issue ${x.id}: ${e.message}`); }
  }
  console.log(`✓ Issues: ${gsData.issues?.length || 0}`);

  // Procurement
  for (const x of gsData.procurement || []) {
    try { await sbSaveProcurement(x); } catch (e) { errors.push(`proc ${x.id}: ${e.message}`); }
  }
  console.log(`✓ Procurement: ${gsData.procurement?.length || 0}`);

  // Manpower
  for (const x of gsData.manpowerLogs || []) {
    try { await sbSaveManpower(x); } catch (e) { errors.push(`mp ${x.id}: ${e.message}`); }
  }
  console.log(`✓ Manpower: ${gsData.manpowerLogs?.length || 0}`);

  // Accidents
  for (const x of gsData.accidentLogs || []) {
    try { await sbSaveAccident(x); } catch (e) { errors.push(`acc ${x.id}: ${e.message}`); }
  }
  console.log(`✓ Accidents: ${gsData.accidentLogs?.length || 0}`);

  // Costs
  for (const x of gsData.costs || []) {
    try { await sbSaveCost(x); } catch (e) { errors.push(`cost ${x.id}: ${e.message}`); }
  }
  console.log(`✓ Costs: ${gsData.costs?.length || 0}`);

  // RAB (batch)
  try { await sbSaveRab(gsData.rab || []); }
  catch (e) { errors.push(`rab: ${e.message}`); }
  console.log(`✓ RAB: ${gsData.rab?.length || 0}`);

  // WBS
  for (const x of gsData.wbs || []) {
    try { await sbSaveWbs(x); } catch (e) { errors.push(`wbs ${x.id}: ${e.message}`); }
  }
  console.log(`✓ WBS: ${gsData.wbs?.length || 0}`);

  // S-Curve
  for (const x of gsData.scurve || []) {
    try { await sbSaveScurve(x); } catch (e) { errors.push(`scurve ${x.id}: ${e.message}`); }
  }
  console.log(`✓ S-Curve: ${gsData.scurve?.length || 0}`);

  if (errors.length) {
    console.warn('⚠ Errors during migration:', errors);
  } else {
    console.log('🎉 Migration complete — no errors!');
  }
  return errors;
}


// ══════════════════════════════════════════════════════════════
//  SUPABASE SYNC ENGINE — Retry Queue, Offline Mode (merged from patch2)
//  Includes: offline detection, retry queue, save wrappers
// ══════════════════════════════════════════════════════════════
window.addEventListener('load', function _initSyncEngine() {
  'use strict';
  // ── 1. MATIKAN GSHEET SYNC & POLLING ────────────────────
  // gsSync menjadi no-op — semua save kini langsung ke Supabase per fungsi
  window.gsSync = function () {};
  // Hentikan polling GSheet setiap 15 detik
  window._rtPoll = async function () {};

  // Sembunyikan badge & tombol GSheet dari header/toolbar
  function _hideGsUI() {
    const ids = ['gsBadge', 'btnSync', 'btnLoad'];
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
  }
  setTimeout(_hideGsUI, 800);

  // ── 2. HELPER: status bar Supabase ──────────────────────
  function _sbStatusOk() {
    try {
      const dot = document.getElementById('sdot');
      const msg = document.getElementById('smsg');
      const bar = document.getElementById('sbar');
      if (dot) { dot.style.background = 'var(--gn)'; dot.classList.remove('unsaved'); }
      if (msg) msg.textContent = 'Tersimpan ke Supabase ✓ · ' + new Date().toLocaleTimeString('id-ID');
      if (bar) bar.classList.remove('dirty');
      if (typeof isDirty !== 'undefined') window.isDirty = false;
    } catch (e) {}
  }

  function _sbStatusErr(msg) {
    try {
      const dot = document.getElementById('sdot');
      const smsg = document.getElementById('smsg');
      if (dot) dot.style.background = 'var(--rd)';
      if (smsg) smsg.textContent = '⚠ Gagal simpan: ' + (msg || 'cek koneksi');
    } catch (e) {}
  }

  // Surface error dari operasi tulis Supabase yang tidak melempar exception
  // (mis. delete/update diblok RLS → return {error}, bukan throw). Mencegah
  // kelas bug "hilang dari UI, tetap di DB".
  function _sbCheck(res, label) {
    if (res && res.error) {
      console.error('[' + label + ']', res.error);
      if (typeof toast === 'function') toast('Gagal ' + label + ' di Supabase: ' + (res.error.message || res.error.code || res.error), 'error');
      if (typeof _sbStatusErr === 'function') _sbStatusErr(res.error.message || String(res.error));
    }
    return res;
  }

  // ── 3. CENTRAL SUPABASE PERSIST ─────────────────────────
  async function _sbPersist(type, action, data) {
    const client = (typeof _initSb === 'function') ? _initSb() : null;
    if (!client) { console.warn('[sbPersist] client null'); return; }
    try {
      switch (type) {

        case 'project':
          if (action === 'save') await sbSaveProject(data);
          else if (action === 'delete')
            _sbCheck(await client.from('projects').delete().eq('id', data.id), 'hapus project');
          break;

        case 'history':
          // data = { projId, history[] }
          if (action === 'save') await sbSaveHistory(data.projId, data.history || []);
          break;

        case 'issue':
          if (action === 'save') await sbSaveIssue(data);
          else if (action === 'delete') await sbDeleteIssue(data.id);
          break;

        case 'procurement':
          if (action === 'save') await sbSaveProcurement(data);
          else if (action === 'delete')
            _sbCheck(await client.from('procurement').delete().eq('id', data.id), 'hapus procurement');
          break;

        case 'cost':
          if (action === 'save') await sbSaveCost(data);
          else if (action === 'delete')
            _sbCheck(await client.from('costs').update({ _deleted: true }).eq('id', data.id), 'hapus cost');
          break;

        case 'manpower':
          if (action === 'save') await sbSaveManpower(data);
          else if (action === 'delete')
            _sbCheck(await client.from('manpower_logs').delete().eq('id', data.id), 'hapus manpower');
          break;

        case 'accident':
          if (action === 'save') await sbSaveAccident(data);
          else if (action === 'delete')
            _sbCheck(await client.from('accident_logs').delete().eq('id', data.id), 'hapus accident');
          break;

        case 'wbs':
          if (action === 'save') await sbSaveWbs(data);
          else if (action === 'delete')
            _sbCheck(await client.from('wbs').delete().eq('id', data.id), 'hapus WBS');
          break;

        case 'wbs_bulk':
          // Upsert batch — sort cat→subcat→item agar FK parent_id tidak gagal
          if (action === 'save' && data.length) {
            const typeOrder = { cat: 0, subcat: 1, item: 2 };
            const sorted = [...data].sort((a, b) =>
              (typeOrder[a.type] ?? 1) - (typeOrder[b.type] ?? 1));
            const mapped = sorted.map(n => unmapWbs(n));
            const { error } = await client.from('wbs')
              .upsert(mapped, { onConflict: 'id' });
            if (error) {
              console.error('[wbs_bulk upsert error]', error.code, error.message, error.details || '');
              throw error;
            }
          } else if (action === 'delete' && data.length) {
            // Hapus berurutan item→subcat→cat (reverse FK order)
            const typeOrder = { cat: 2, subcat: 1, item: 0 };
            const sorted = [...data].sort((a, b) =>
              (typeOrder[a.type] ?? 0) - (typeOrder[b.type] ?? 0));
            for (const n of sorted) {
              _sbCheck(await client.from('wbs').delete().eq('id', n.id), 'hapus WBS');
            }
          }
          break;

        case 'scurve':
          if (action === 'save') await sbSaveScurve(data);
          else if (action === 'delete')
            _sbCheck(await client.from('scurve').delete().eq('proj_id', data.projId).eq('week', data.week), 'hapus S-curve');
          break;

        case 'rab':
          if (action === 'save') await sbSaveRab(Array.isArray(data) ? data : [data]);
          else if (action === 'delete')
            _sbCheck(await client.from('rab').delete().eq('id', data.id), 'hapus RAB');
          break;

        case 'rab_bulk':
          if (action === 'save') await sbSaveRab(data);
          break;
      }
      _sbStatusOk();
    } catch (e) {
      console.warn('[sbPersist]', type, action, e.message);
      _sbStatusErr(e.message);
    }
  }
  window._sbPersist = _sbPersist;

  // ── ATOMIC PATCH HELPER ──────────────────────────────────
  // Kirim HANYA field tertentu — bukan seluruh objek
  // Ini mencegah User A menimpa perubahan User B di field berbeda
  async function _sbAtomicPatch(table, id, fields) {
    if (!id) return;
    const client = _initSb(); if (!client) return;
    const payload = { ...fields, updated_at: new Date().toISOString() };
    const { error } = await client.from(table).update(payload).eq('id', id);
    if (error) throw error;
  }
  window._sbAtomicPatch = _sbAtomicPatch;

  // ── ATOMIC INSERT HELPER ─────────────────────────────────
  // Untuk record BARU — pakai insert, bukan upsert
  async function _sbAtomicInsert(table, obj) {
    const client = _initSb(); if (!client) return;
    const { error } = await client.from(table).insert(obj);
    if (error) throw error;
  }
  window._sbAtomicInsert = _sbAtomicInsert;

  // ── 4. OVERRIDE autoLoadOnStart → Supabase ───────────────
  window.autoLoadOnStart = async function () {
    // Tampilkan cache lokal dulu (instant) — HANYA sebelum data Supabase pertama masuk.
    // Tanpa guard ini, panggilan autoLoadOnStart berikutnya (checkSession/_loginSuccess/
    // initAuth/returning-user) me-render cache lagi & MENIMPA tampilan Supabase → "data masih cache".
    if (!window._sbLoaded) {
      try {
        if (typeof loadLocal === 'function' && loadLocal()) {
          if (typeof loadLogosCache === 'function') loadLogosCache();
          if (typeof P !== 'undefined' && P.length && !selId) selId = P[0]?.id || null;
          if (typeof render === 'function') render();
        }
      } catch (e) {}
    }

    // Update status bar
    const smsg = document.getElementById('smsg');
    const sdot = document.getElementById('sdot');
    if (smsg) smsg.textContent = 'Menghubungkan ke Supabase...';
    if (sdot) sdot.style.background = 'var(--yw)';

    // Load dari Supabase
    try {
      if (typeof loadFromSupabase === 'function') {
        await loadFromSupabase();
        if (smsg) smsg.textContent = 'Data dimuat dari Supabase ✓';
        if (sdot) { sdot.style.background = 'var(--gn)'; sdot.classList.remove('unsaved'); }
      }
    } catch (e) {
      console.warn('[autoLoadOnStart] Supabase error:', e);
      if (smsg) smsg.textContent = '⚠ Gagal terhubung ke Supabase';
    }
  };

  // ── 5. PROJECT — Atomic PATCH per domain ────────────────
  // saveProj: PATCH hanya field form (metadata)
  // Tidak menyentuh plan/actual/status — itu domain S-Curve & saveUpdate
  const _orig_saveProj = window.saveProj;
  window.saveProj = async function () {
    const prevId = typeof editProjId !== 'undefined' ? editProjId : null;
    const prevPLen = P.length;
    await _orig_saveProj.call(this);
    // Guard: jika original return early (validasi gagal / sbSafeCheck cancel), tidak lanjut
    const proj = prevId ? P.find(p => p.id === prevId)
                        : (P.length > prevPLen ? P[P.length - 1] : null);
    if (!proj) return;
    try {
      if (prevId) {
        // UPDATE existing — PATCH metadata fields only
        await _sbAtomicPatch('projects', prevId, {
          kode: proj.kode, nama: proj.nama,
          lokasi: proj.lokasi || null, client: proj.client || null,
          mulai: proj.mulai || null, selesai: proj.selesai || null,
          mp_plan: proj.mpPlan || 0, mh_plan: proj.mhPlan || 0,
          notes: proj.notes || null, logo: proj.logo || null,
          weather: proj.weather || null,
          lat: proj.lat ?? null, lon: proj.lon ?? null,
          pic_pm: proj.picPm || null, pic_sm: proj.picSm || null,
          pic_eng: proj.picEng || null, pic_proc: proj.picProc || null
        });
        if (typeof sbTrackTs === 'function') sbTrackTs('projects', prevId, new Date().toISOString());
        // ── Koordinat (lat/lon): PATCH terpisah & ter-guard ──
        // Dipisah agar bila kolom belum ada (MIGRATION_weather_coords.sql
        // belum dijalankan), kegagalan di sini TIDAK membatalkan patch
        // metadata di atas. Begitu migrasi jalan, koordinat ikut tersimpan.
        try {
          await _sbAtomicPatch('projects', prevId, {
            lat: proj.lat ?? null, lon: proj.lon ?? null
          });
        } catch (eCoord) {
          console.warn('[saveProj] koordinat belum tersimpan \u2014 jalankan MIGRATION_weather_coords.sql di Supabase.', eCoord && eCoord.message);
        }
      } else {
        // INSERT new project — full upsert (record belum ada di DB)
        await sbSaveProject(proj);
        if (proj && typeof sbTrackTs === 'function') sbTrackTs('projects', proj.id, new Date().toISOString());
      }
      _sbStatusOk();
    } catch(e) { _sbStatusErr(e.message); console.warn('[saveProj patch]', e); }
  };

  const _orig_doDelProj = window._doDelProj;
  window._doDelProj = async function () {
    const pid = typeof editProjId !== 'undefined' ? editProjId : null;
    _orig_doDelProj.call(this);
    if (pid) await _sbPersist('project', 'delete', { id: pid });
  };

  const _orig_executeCloneProject = window.executeCloneProject;
  window.executeCloneProject = async function () {
    const prevLen = P.length;
    const prevWbsLen = WBS.length;
    _orig_executeCloneProject.call(this);
    const newProj = P[P.length - 1];
    if (newProj && P.length > prevLen) {
      await sbSaveProject(newProj);
      const newWbs = WBS.slice(prevWbsLen);
      if (newWbs.length) await _sbPersist('wbs_bulk', 'save', newWbs);
    }
  };

  // saveUpdate: PATCH hanya plan/actual/status/notes — domain progress
  const _orig_saveUpdate = window.saveUpdate;
  window.saveUpdate = async function () {
    const snapSelId = typeof selId !== 'undefined' ? selId : null;
    // Snapshot full state untuk guard + rollback
    const _snapP = snapSelId ? P.find(x => x.id === snapSelId) : null;
    const snapSig = _snapP ? (_snapP.actual + '|' + _snapP.status + '|' + (_snapP.notes||'')) : null;
    const snapData = _snapP ? { actual: _snapP.actual, plan: _snapP.plan, status: _snapP.status, notes: _snapP.notes, mpActual: _snapP.mpActual } : null;
    await _orig_saveUpdate.call(this);
    const p = snapSelId ? P.find(x => x.id === snapSelId) : null;
    if (!p) return;
    const afterSig = p.actual + '|' + p.status + '|' + (p.notes||'');
    if (snapSig !== null && afterSig === snapSig) return;
    // ── OPTIMISTIC: render sidebar/overview segera ──
    try { if(typeof renderSB==='function') renderSB(); } catch(e) {}
    try { if(typeof renderOV==='function' && (typeof activeTab==='undefined'||activeTab==='overview')) renderOV(); } catch(e) {}
    try {
      await _sbAtomicPatch('projects', p.id, {
        plan: p.plan, actual: p.actual,
        mp_actual: p.mpActual || 0, status: p.status,
        notes: p.notes || null
      });
      if (p.history?.length) await _sbPersist('history', 'save', { projId: p.id, history: p.history });
      _sbStatusOk();
    } catch(e) {
      // Rollback: restore snapshot
      if(snapData && p) { p.actual=snapData.actual; p.plan=snapData.plan; p.status=snapData.status; p.notes=snapData.notes; p.mpActual=snapData.mpActual; }
      try { if(typeof renderSB==='function') renderSB(); } catch(err) {}
      _sbStatusErr(e.message);
    }
  };

  // History edit/delete
  const _orig_saveHistEntry = window.saveHistEntry;
  window.saveHistEntry = async function () {
    const projId = document.getElementById('ehProjId')?.value;
    const idx     = +document.getElementById('ehIdx')?.value;
    _orig_saveHistEntry.call(this);
    const p = projId ? P.find(x => String(x.id) === String(projId)) : null;
    if (p) {
      await _sbPersist('history', 'save', { projId: p.id, history: p.history });
      // Jika entri terakhir, sync plan/actual ke project
      if (idx === (p.history?.length ?? 0) - 1) {
        await _sbAtomicPatch('projects', p.id, {
          plan: p.plan, actual: p.actual, status: p.status
        });
      }
      _sbStatusOk();
    }
  };

  const _orig_doDelHist = window._doDelHist;
  window._doDelHist = async function (projId, idx) {
    _orig_doDelHist.call(this, projId, idx);
    const p = P.find(x => x.id === projId);
    if (p) await _sbPersist('history', 'save', { projId: p.id, history: p.history });
  };


  // ── 6. MANPOWER ──────────────────────────────────────────
  const _orig_saveMp = window.saveMp;
  window.saveMp = async function () {
    const projId = document.getElementById('mpProj')?.value || '';
    const date = document.getElementById('mpDate')?.value || new Date().toISOString().slice(0, 10);
    // Guard: snapshot MPLOGS sebelum save untuk deteksi apakah save berhasil
    const prevMpLen = MPLOGS.length;
    const prevEntry = MPLOGS.find(m => String(m.projId) === String(projId) && m.date === date);
    _orig_saveMp.call(this);
    const entry = MPLOGS.find(m => String(m.projId) === String(projId) && m.date === date);
    // Hanya persist jika ada perubahan (entry baru atau entry diupdate)
    const wasChanged = !prevEntry || (entry && entry !== prevEntry) || MPLOGS.length > prevMpLen;
    if (entry && wasChanged) {
      await _sbPersist('manpower', 'save', entry);
      if (typeof sbTrackTs === 'function') sbTrackTs('manpower_logs', entry.id, new Date().toISOString());
    }
    // HSE / accident yang ikut diinput di form harian
    try {
      if (window._mpAccEntry) {
        await _sbPersist('accident', 'save', window._mpAccEntry);
        if (typeof sbTrackTs === 'function') sbTrackTs('accident_logs', window._mpAccEntry.id, new Date().toISOString());
        window._mpAccEntry = null;
      }
    } catch (e) { if (window.console) console.warn('acc persist:', e); }
  };

  const _orig_delMpLog = window.delMpLog;
  window.delMpLog = function (id) {
    const target = id || (typeof editMpId !== 'undefined' ? editMpId : null);
    // Supabase delete HARUS di dalam callback konfirmasi — bukan langsung.
    // (showConfirm berbasis callback; kalau di-await langsung, delete nembak
    //  walau user klik Batal, dan accident-delete di _doDelMpLog jadi balapan.)
    const _commit = async function () {
      if (typeof _doDelMpLog === 'function') _doDelMpLog(id); // hapus lokal + accident
      if (target) await _sbPersist('manpower', 'delete', { id: target });
    };
    if (typeof showConfirm === 'function') showConfirm('Hapus log ini?', _commit);
    else _commit();
  };

  // ── 7. ACCIDENT ──────────────────────────────────────────
  const _orig_saveAcc = window.saveAcc;
  window.saveAcc = async function () {
    _orig_saveAcc.call(this);
    const entry = ACCLOGS[ACCLOGS.length - 1];
    if (entry) await _sbPersist('accident', 'save', entry);
  };

  const _orig_saveAccEdit = window.saveAccEdit;
  window.saveAccEdit = async function () {
    const eaId = document.getElementById('eaId')?.value;
    _orig_saveAccEdit.call(this);
    const entry = eaId ? ACCLOGS.find(a => String(a.id) === String(eaId)) : null;
    if (entry) await _sbPersist('accident', 'save', entry);
  };

  const _orig_delAccLog = window.delAccLog;
  window.delAccLog = async function () {
    const eaId = document.getElementById('eaId')?.value;
    _orig_delAccLog.call(this);
    if (eaId) await _sbPersist('accident', 'delete', { id: eaId });
  };

  // ── 8. ISSUES ────────────────────────────────────────────
  const _orig_saveIss = window.saveIss;
  window.saveIss = async function () {
    const prevId = typeof editIssId !== 'undefined' ? editIssId : null;
    // Conflict check untuk edit existing
    if (prevId && typeof sbSafeCheck === 'function') {
      const ok = await sbSafeCheck('issues', prevId, 'Issue ini');
      if (!ok) return;
    }
    const prevIssLen = ISS.length;
    const snapIss = prevId ? ISS.find(x => String(x.id) === String(prevId)) : null;
    const snapIssData = snapIss ? { ...snapIss } : null;
    _orig_saveIss.call(this);
    const iss = prevId ? ISS.find(x => String(x.id) === String(prevId))
                       : (ISS.length > prevIssLen ? ISS[ISS.length - 1] : null);
    if (iss) {
      // OPTIMISTIC: _orig sudah re-render, persist async
      try {
        await _sbPersist('issue', 'save', iss);
        if (typeof sbTrackTs === 'function') sbTrackTs('issues', iss.id, new Date().toISOString());
      } catch(e) {
        // Rollback issue
        if(snapIssData && prevId) { const i=ISS.findIndex(x=>String(x.id)===String(prevId)); if(i>=0) ISS[i]=snapIssData; }
        else if(iss && !prevId) { ISS.splice(ISS.indexOf(iss),1); }
        try { if(typeof renderIssues==='function') renderIssues(); } catch(err) {}
        _sbStatusErr(e.message);
      }
    }
  };

  window.delIss = function () {
    const id = typeof editIssId !== 'undefined' ? editIssId : null;
    if (typeof showConfirm === 'function') {
      showConfirm('Hapus issue ini?', async () => {
        if (typeof ISS !== 'undefined')
          ISS = ISS.filter(i => String(i.id) !== String(id));
        if (typeof dirty === 'function') dirty();
        if (typeof cm === 'function') cm('addIssue');
        if (typeof renderIssues === 'function') renderIssues();
        if (typeof toast === 'function') toast('Issue dihapus', 'warn');
        if (id) await _sbPersist('issue', 'delete', { id });
      });
    }
  };

  // ── 9. PROCUREMENT ───────────────────────────────────────
  const _orig_saveProc = window.saveProc;
  window.saveProc = async function () {
    const prevId = typeof editProcId !== 'undefined' ? editProcId : null;
    // Conflict check untuk edit existing
    if (prevId && typeof sbSafeCheck === 'function') {
      const ok = await sbSafeCheck('procurement', prevId, 'Item procurement ini');
      if (!ok) return;
    }
    const prevProcLen = PROC.length;
    _orig_saveProc.call(this);
    const proc = prevId ? PROC.find(x => String(x.id) === String(prevId))
                        : (PROC.length > prevProcLen ? PROC[PROC.length - 1] : null);
    if (proc) {
      await _sbPersist('procurement', 'save', proc);
      if (typeof sbTrackTs === 'function') sbTrackTs('procurement', proc.id, new Date().toISOString());
    }
  };

  window.delProc = function () {
    const id = typeof editProcId !== 'undefined' ? editProcId : null;
    if (typeof showConfirm === 'function') {
      showConfirm('Hapus item ini?', async () => {
        if (typeof PROC !== 'undefined')
          PROC = PROC.filter(p => String(p.id) !== String(id));
        if (typeof dirty === 'function') dirty();
        if (typeof cm === 'function') cm('addProc');
        if (typeof renderProc === 'function') renderProc();
        if (typeof toast === 'function') toast('Item dihapus', 'warn');
        if (id) await _sbPersist('procurement', 'delete', { id });
      });
    }
  };

  // ── 10. COST ─────────────────────────────────────────────
  const _orig_saveCost = window.saveCost;
  window.saveCost = async function () {
    const prevId = typeof editCostId !== 'undefined' ? editCostId : null;
    // Conflict check untuk edit existing
    if (prevId && typeof sbSafeCheck === 'function') {
      const ok = await sbSafeCheck('costs', prevId, 'Data cost ini');
      if (!ok) return;
    }
    const prevCostLen = COSTS.length;
    const snapCost = prevId ? COSTS.find(x => String(x.id) === String(prevId)) : null;
    const snapCostData = snapCost ? { ...snapCost } : null;
    _orig_saveCost.call(this);
    const cost = prevId ? COSTS.find(x => String(x.id) === String(prevId))
                        : (COSTS.length > prevCostLen ? COSTS[COSTS.length - 1] : null);
    if (cost) {
      try {
        await _sbPersist('cost', 'save', cost);
        if (typeof sbTrackTs === 'function') sbTrackTs('costs', cost.id, new Date().toISOString());
      } catch(e) {
        if(snapCostData && prevId) { const i=COSTS.findIndex(x=>String(x.id)===String(prevId)); if(i>=0) COSTS[i]=snapCostData; }
        else if(cost && !prevId) { COSTS.splice(COSTS.indexOf(cost),1); }
        try { if(typeof renderCost==='function') renderCost(); } catch(err) {}
        _sbStatusErr(e.message);
      }
    }
  };

  const _orig_delCost = window.delCost;
  window.delCost = async function () {
    const id = typeof editCostId !== 'undefined' ? editCostId : null;
    _orig_delCost.call(this);
    if (id) await _sbPersist('cost', 'delete', { id });
  };

  // ── 11. RAB ──────────────────────────────────────────────
  const _orig_saveRabKat = window.saveRabKat;
  window.saveRabKat = async function () {
    const prevId = typeof editRabCatId !== 'undefined' ? editRabCatId : null;
    const prevRabLen = RAB.length;
    _orig_saveRabKat.call(this);
    const item = prevId ? RAB.find(x => String(x.id) === String(prevId))
                        : (RAB.length > prevRabLen ? RAB[RAB.length - 1] : null);
    if (item) await _sbPersist('rab', 'save', item);
  };

  // delRabKat: pakai original (confirm() di dalamnya), capture ids sebelum
  const _orig_delRabKat = window.delRabKat;
  window.delRabKat = async function () {
    const catId = typeof editRabCatId !== 'undefined' ? editRabCatId : null;
    const childIds = catId ? RAB.filter(r => r.type === 'item' && String(r.katId) === String(catId)).map(r => r.id) : [];
    _orig_delRabKat.call(this); // confirm() synchronous di dalam
    // Cek apakah benar-benar dihapus dari memory
    const deleted = catId && !RAB.find(r => String(r.id) === String(catId));
    if (deleted) {
      await _sbPersist('rab', 'delete', { id: catId });
      for (const id of childIds) await _sbPersist('rab', 'delete', { id });
    }
  };

  const _orig_saveRabItem = window.saveRabItem;
  window.saveRabItem = async function () {
    const prevId = typeof editRabId !== 'undefined' ? editRabId : null;
    const prevRabItemLen = RAB.length;
    _orig_saveRabItem.call(this);
    const item = prevId ? RAB.find(x => String(x.id) === String(prevId))
                        : (RAB.length > prevRabItemLen ? RAB[RAB.length - 1] : null);
    if (item) await _sbPersist('rab', 'save', item);
  };

  // delRabItem: pakai original (confirm() di dalamnya)
  const _orig_delRabItem = window.delRabItem;
  window.delRabItem = async function () {
    const id = typeof editRabId !== 'undefined' ? editRabId : null;
    _orig_delRabItem.call(this); // confirm() di dalam
    const deleted = id && !RAB.find(r => String(r.id) === String(id));
    if (deleted) await _sbPersist('rab', 'delete', { id });
  };

  const _orig_executeCloneRab = window.executeCloneRab;
  window.executeCloneRab = async function () {
    const prevLen = typeof RAB !== 'undefined' ? RAB.length : 0;
    if (_orig_executeCloneRab) _orig_executeCloneRab.call(this);
    const newItems = RAB.slice(prevLen);
    if (newItems.length) await _sbPersist('rab_bulk', 'save', newItems);
  };

  // ── 12. WBS ──────────────────────────────────────────────
  const _orig_saveWbsCat = window.saveWbsCat;
  window.saveWbsCat = async function () {
    _orig_saveWbsCat.call(this);
    const node = WBS[WBS.length - 1];
    if (node) await _sbPersist('wbs', 'save', node);
  };

  const _orig_saveWbsSub = window.saveWbsSub;
  window.saveWbsSub = async function () {
    _orig_saveWbsSub.call(this);
    const node = WBS[WBS.length - 1];
    if (node) await _sbPersist('wbs', 'save', node);
  };

  const _orig_saveWbsItem = window.saveWbsItem;
  window.saveWbsItem = async function () {
    _orig_saveWbsItem.call(this);
    const node = WBS[WBS.length - 1];
    if (node) await _sbPersist('wbs', 'save', node);
  };

  const _orig_saveEditWbs = window.saveEditWbs;
  window.saveEditWbs = async function () {
    const id = document.getElementById('wbsEditId')?.value;
    if (!id) return;
    // Conflict check untuk edit WBS node
    if (typeof sbSafeCheck === 'function') {
      const ok = await sbSafeCheck('wbs', id, 'WBS item ini');
      if (!ok) return;
    }
    // Snapshot sebelum save untuk rollback jika gagal
    const snapNode = WBS.find(w => String(w.id) === String(id));
    const snapData = snapNode ? { ...snapNode } : null;
    _orig_saveEditWbs.call(this);
    const node = WBS.find(w => String(w.id) === String(id));
    if (!node) return;
    // ── OPTIMISTIC: UI sudah diupdate oleh _orig, langsung persist ──
    const rollback = typeof _optimisticUpdate === 'function'
      ? _optimisticUpdate(
          () => { try { if(typeof renderWBS==='function') renderWBS(); } catch(e){} },
          () => { // rollback: restore snapshot
            if(snapData) { const i=WBS.findIndex(w=>String(w.id)===String(id)); if(i>=0) WBS[i]=snapData; }
          }
        )
      : null;
    try {
      await _sbPersist('wbs', 'save', node);
      if (typeof sbTrackTs === 'function') sbTrackTs('wbs', node.id, new Date().toISOString());
    } catch(e) {
      if(rollback) rollback(e.message);
    }
  };

  window.delWbs = function (id) {
    const sid = String(id);
    const node = WBS.find(w => w.id === sid); if (!node) return;
    const childIds = WBS.filter(w => String(w.parentId) === sid).map(w => String(w.id));
    const grandIds = WBS.filter(w => childIds.includes(String(w.parentId))).map(w => String(w.id));
    const toRm = new Set([sid, ...childIds, ...grandIds]);
    const msg = `Hapus "${(node.name||'').slice(0,30)}"${toRm.size > 1 ? ' dan ' + (toRm.size - 1) + ' child-nya' : ''}?`;
    if (typeof showConfirm === 'function') {
      showConfirm(msg, async () => {
        WBS = WBS.filter(w => !toRm.has(String(w.id)));
        if (typeof dirty === 'function') dirty();
        if (typeof renderWBS === 'function') renderWBS();
        if (typeof toast === 'function') toast('Dihapus', 'warn');
        await Promise.all([...toRm].map(wid => _sbPersist('wbs', 'delete', { id: wid })));
      });
    }
  };

  const _orig_saveWbsPlanGrid = window.saveWbsPlanGrid;
  window.saveWbsPlanGrid = async function () {
    const projId = document.getElementById('wbsPlanProj')?.value || '';
    if (!projId) return;
    if (typeof canEditProj === 'function' && !canEditProj(projId)) {
      if (window.toast) window.toast('Tidak punya akses edit ke proyek ini', 'error');
      return;
    }
    // Snapshot cum_plan sebelum save untuk guard jika validasi gagal (errs>0 → early return)
    const snapPlan = WBS.filter(w => String(w.projId) === String(projId))
                        .map(w => w.cumPlan);
    _orig_saveWbsPlanGrid.call(this);
    // Guard: cek apakah ada perubahan (jika errs > 0, original return early → tidak ada perubahan)
    const afterPlan = WBS.filter(w => String(w.projId) === String(projId))
                         .map(w => w.cumPlan);
    const changed = snapPlan.some((v, i) => v !== afterPlan[i]) || snapPlan.length !== afterPlan.length;
    if (!changed) return;
    const nodes = WBS.filter(w => String(w.projId) === String(projId));
    if (nodes.length) await _sbPersist('wbs_bulk', 'save', nodes);
    // Simpan project (plan% terupdate)
    const proj = P.find(p => String(p.id) === String(projId));
    if (proj) await _sbPersist('project', 'save', proj);
    // Simpan SEMUA SCURVE entries project ini (bukan hanya fromWbs)
    const scEntries = SCURVE.filter(s => String(s.projId) === String(projId));
    if (scEntries.length) {
      await Promise.all(scEntries.map(e => _sbPersist('scurve', 'save', e).catch(err => console.warn('[saveWbsPlan scurve]', err))));
    }
  };

  const _orig_saveWbsProgress = window.saveWbsProgress;
  window.saveWbsProgress = async function () {
    const projId = document.getElementById('wbsProgProj')?.value || selId || '';
    if (!projId) return;
    if (typeof canEditProj === 'function' && !canEditProj(projId)) {
      if (window.toast) window.toast('Tidak punya akses edit ke proyek ini', 'error');
      return;
    }
    _orig_saveWbsProgress.call(this);
    // Simpan WBS nodes (weeklyData + cumActual terupdate)
    const nodes = WBS.filter(w => String(w.projId) === String(projId));
    if (nodes.length) await _sbPersist('wbs_bulk', 'save', nodes);
    // Simpan project (actual + plan + status + history terupdate)
    const proj = P.find(p => String(p.id) === String(projId));
    if (proj) {
      await _sbAtomicPatch('projects', proj.id, {
        plan: proj.plan, actual: proj.actual, status: proj.status
      });
      if (proj.history?.length) await _sbPersist('history', 'save', { projId: proj.id, history: proj.history });
    }
    // Simpan SEMUA SCURVE entries (syncWbsToSCurve sudah update SCURVE array)
    const scEntries = SCURVE.filter(s => String(s.projId) === String(projId));
    if (scEntries.length) {
      await Promise.all(scEntries.map(e => _sbPersist('scurve', 'save', e).catch(err => console.warn('[saveWbsProgress scurve]', err))));
    }
  };

  // WBS inline & daily logs
  const _orig_saveWbsInlineDate = window.saveWbsInlineDate;
  if (_orig_saveWbsInlineDate) {
    window.saveWbsInlineDate = async function (nodeId, field, val) {
      var _wn = WBS.find(function (w) { return String(w.id) === String(nodeId); });
      if (_wn && typeof canEditProj === 'function' && !canEditProj(_wn.projId)) {
        if (window.toast) window.toast('Tidak punya akses edit ke proyek ini', 'error');
        return;
      }
      _orig_saveWbsInlineDate.call(this, nodeId, field, val);
      const node = WBS.find(w => String(w.id) === String(nodeId));
      if (node) await _sbPersist('wbs', 'save', node);
    };
  }

  const _orig_saveWbsInlineText = window.saveWbsInlineText;
  if (_orig_saveWbsInlineText) {
    window.saveWbsInlineText = async function (nodeId, field, val) {
      var _wn = WBS.find(function (w) { return String(w.id) === String(nodeId); });
      if (_wn && typeof canEditProj === 'function' && !canEditProj(_wn.projId)) {
        if (window.toast) window.toast('Tidak punya akses edit ke proyek ini', 'error');
        return;
      }
      _orig_saveWbsInlineText.call(this, nodeId, field, val);
      const node = WBS.find(w => String(w.id) === String(nodeId));
      if (node) await _sbPersist('wbs', 'save', node);
    };
  }

  // saveDailyLog (per-item)
  const _orig_saveDailyLog = window.saveDailyLog;
  if (_orig_saveDailyLog) {
    window.saveDailyLog = async function (itemId) {
      var _wn = WBS.find(function (w) { return String(w.id) === String(itemId); });
      if (_wn && typeof canEditProj === 'function' && !canEditProj(_wn.projId)) {
        if (window.toast) window.toast('Tidak punya akses edit ke proyek ini', 'error');
        return;
      }
      _orig_saveDailyLog.call(this, itemId);
      const node = WBS.find(w => String(w.id) === String(itemId));
      if (node) await _sbPersist('wbs', 'save', node);
    };
  }

  // saveDrQtySetup
  const _orig_saveDrQtySetup = window.saveDrQtySetup;
  window.saveDrQtySetup = async function () {
    const projId = document.getElementById('drSetupProj')?.value || '';
    if (typeof canEditProj === 'function' && !canEditProj(projId)) {
      if (window.toast) window.toast('Tidak punya akses edit ke proyek ini', 'error');
      return;
    }
    _orig_saveDrQtySetup.call(this);
    const nodes = WBS.filter(w => String(w.projId) === String(projId));
    if (nodes.length) await _sbPersist('wbs_bulk', 'save', nodes);
  };

  // saveDrInput — Input Harian
  const _orig_saveDrInput = window.saveDrInput;
  if (_orig_saveDrInput) {
    window.saveDrInput = async function () {
      const projId = document.getElementById('drInputProj')?.value || '';
      if (!projId) return;
      if (typeof canEditProj === 'function' && !canEditProj(projId)) {
        if (window.toast) window.toast('Tidak punya akses edit ke proyek ini', 'error');
        return;
      }
      // Snapshot sebelum save — bandingkan cumActual & dailyLogs untuk deteksi perubahan
      // (dailyLogs.length tidak berubah jika user edit entry yang sudah ada)
      const _snapNodes = WBS.filter(w => String(w.projId) === String(projId));
      const snapSig = _snapNodes.map(n => (n.cumActual || 0) + '|' + (n.dailyLogs?.length || 0)).join(',');
      await _orig_saveDrInput.call(this);
      // Guard: skip persist jika benar-benar tidak ada perubahan apapun
      const _afterNodes = WBS.filter(w => String(w.projId) === String(projId));
      const afterSig = _afterNodes.map(n => (n.cumActual || 0) + '|' + (n.dailyLogs?.length || 0)).join(',');
      if (afterSig === snapSig) return;
      // Simpan semua WBS node project ini (dailyLogs, weeklyData, cumActual terupdate)
      const nodes = WBS.filter(w => String(w.projId) === String(projId));
      if (nodes.length) await _sbPersist('wbs_bulk', 'save', nodes);
      // Simpan project (actual progress terupdate)
      const proj = P.find(p => String(p.id) === String(projId));
      if (proj) {
        await _sbAtomicPatch('projects', proj.id, {
          plan: proj.plan, actual: proj.actual, status: proj.status || null
        });
      }
      // Simpan SEMUA SCURVE entries project ini (bukan hanya 1)
      const scEntries = SCURVE.filter(s => String(s.projId) === String(projId));
      if (scEntries.length) {
        await Promise.all(scEntries.map(e => _sbPersist('scurve', 'save', e).catch(err => console.warn('[saveDrInput scurve]', err))));
      }
    };
  }

  // saveAllDailyLogs (bulk)
  const _orig_saveAllDailyLogs = window.saveAllDailyLogs;
  if (_orig_saveAllDailyLogs) {
    window.saveAllDailyLogs = async function () {
      const projId = document.getElementById('wbsDailyProj')?.value || '';
      if (!projId) return;
      _orig_saveAllDailyLogs.call(this);
      const nodes = WBS.filter(w => String(w.projId) === String(projId));
      if (nodes.length) await _sbPersist('wbs_bulk', 'save', nodes);
      const proj = P.find(p => String(p.id) === String(projId));
      if (proj) {
        await _sbAtomicPatch('projects', proj.id, {
          plan: proj.plan, actual: proj.actual, status: proj.status || null
        });
        // Simpan SEMUA SCURVE entries (bukan hanya find 1)
        const scEntries = SCURVE.filter(s => String(s.projId) === String(projId));
        if (scEntries.length) {
          await Promise.all(scEntries.map(e => _sbPersist('scurve', 'save', e).catch(err => console.warn('[saveAllDailyLogs scurve]', err))));
        }
      }
    };
  }

  // ── 13. S-CURVE — atomic PATCH plan/actual ke project ───
  const _orig_doSaveSCurveActual = window._doSaveSCurveActual;
  window._doSaveSCurveActual = async function (projId, week, wAct, cAct) {
    _orig_doSaveSCurveActual.call(this, projId, week, wAct, cAct);
    const entry = SCURVE.find(d => String(d.projId) === String(projId) && d.week === week);
    if (entry) await _sbPersist('scurve', 'save', entry);
    const proj = P.find(p => String(p.id) === String(projId));
    if (proj) {
      // PATCH hanya plan/actual/status — tidak timpa metadata
      await _sbAtomicPatch('projects', proj.id, {
        plan: proj.plan, actual: proj.actual, status: proj.status
      });
      if (proj.history?.length)
        await _sbPersist('history', 'save', { projId: proj.id, history: proj.history });
      _sbStatusOk();
    }
  };

  window._doDelScWeek = async function (projId, week) {
    const _orig = window.__origDoDelScWeek;
    if (_orig) _orig.call(this, projId, week);
    else {
      SCURVE = SCURVE.filter(d => !(String(d.projId) === String(projId) && d.week === week));
      if (typeof dirty === 'function') dirty();
      if (typeof renderSCurve === 'function') renderSCurve();
      if (typeof renderScManageTable === 'function') renderScManageTable();
      if (typeof toast === 'function') toast('Data dihapus', 'warn');
    }
    await _sbPersist('scurve', 'delete', { projId, week });
  };
  // Simpan referensi original sebelum override hilang
  if (!window.__origDoDelScWeek && window._doDelScWeek_orig_backup)
    window.__origDoDelScWeek = window._doDelScWeek_orig_backup;

  const _orig_cm_scPlan = window.cm;
  if (_orig_cm_scPlan) {
    window.cm = function (modalName) {
      _orig_cm_scPlan.call(this, modalName);
      if (modalName === 'scPlan') {
        setTimeout(async () => {
          const projId = document.getElementById('scPlanProj')?.value || selId;
          if (!projId) return;
          const entries = SCURVE.filter(s => String(s.projId) === String(projId));
          await Promise.all(entries.map(e => _sbPersist('scurve', 'save', e)));
          const proj = P.find(p => String(p.id) === String(projId));
          if (proj) {
            await _sbAtomicPatch('projects', proj.id, {
              plan: proj.plan, actual: proj.actual
            });
          }
        }, 300);
      }
    };
  }

  // ── FORCE SYNC ───────────────────────────────────────────────
  // Rescue data dari memory ke Supabase
  // Console: 
  //   await sbForceSync()        → sync project aktif / P[0]
  //   await sbForceSync('id')    → sync project tertentu
  //   await sbForceSync('all')   → sync SEMUA project
  window.sbForceSync = async function(projId) {
    const client = _initSb(); if (!client) return;

    // Mode: sync semua project
    if (projId === 'all') {
      console.log('[sbForceSync] Mode ALL — sync ' + P.length + ' project');
      let totalOk = 0, totalFail = 0;
      for (const proj of P) {
        const r = await window.sbForceSync(proj.id);
        if (r) { totalOk += r.ok; totalFail += r.fail; }
      }
      console.log('[sbForceSync] ALL selesai — ok:' + totalOk + ' fail:' + totalFail);
      return { ok: totalOk, fail: totalFail };
    }

    // Resolve projId
    let _pid = String(projId || selId || '');
    if (!_pid || _pid === 'null' || _pid === 'undefined') {
      const domVal = document.querySelector('#wbsProjSel,#drInputProj,#drProjSel,#mpProj')?.value;
      _pid = domVal || (P[0] ? String(P[0].id) : '');
    }
    if (!_pid || _pid === 'null') {
      console.warn('[sbForceSync] projId tidak ditemukan. Gunakan sbForceSync("all") untuk sync semua.');
      console.log('Projects:', P.map(p => p.id + ' | ' + p.kode));
      return;
    }

    const proj = P.find(p => String(p.id) === _pid);
    const allNodes = WBS.filter(w => String(w.projId) === _pid);
    const scEntries = SCURVE.filter(s => String(s.projId) === _pid);

    console.log('[sbForceSync] ' + (proj ? proj.kode : _pid) + ' | WBS:' + allNodes.length + ' SCURVE:' + scEntries.length);
    let ok = 0, fail = 0;

    if (allNodes.length) {
      // Recalculate cumActual dari dailyLogs untuk SEMUA node (leaf + non-leaf)
      // _syncDailyToProject hanya update leaf nodes, tapi dailyLogs bisa ada di subcat juga
      allNodes.forEach(function(node) {
        const dl = node.dailyLogs || [];
        if (dl.length > 0 && +node.qtyPlan > 0) {
          const totalQty = dl.reduce((s,l) => s + (l.qty != null ? +l.qty : 0), 0);
          node.cumActual = Math.min(100, Math.round(totalQty / node.qtyPlan * 10000) / 100);
        }
      });
      // Kemudian sync via _syncDailyToProject untuk aggregasi ke project
      if (typeof _syncDailyToProject === 'function') {
        try { _syncDailyToProject(_pid); } catch(e) {}
      }

      const typeOrder = { cat: 0, subcat: 1, item: 2 };
      const sorted = [...allNodes].sort((a,b) => (typeOrder[a.type]??1)-(typeOrder[b.type]??1));
      const mapped = sorted.map(n => unmapWbs(n));

      // Log nodes dengan cumActual > 0
      const nonZero = allNodes.filter(n => +n.cumActual > 0);
      console.log('[sbForceSync] cumActual>0: ' + nonZero.length + ' nodes');
      nonZero.forEach(n => console.log('  ', n.name, '→', n.cumActual + '%'));

      const { error } = await client.from('wbs').upsert(mapped, { onConflict: 'id' });
      if (error) {
        console.error('[sbForceSync] WBS error:', error.code, error.message, error.details||'');
        fail++;
      } else {
        console.log('[sbForceSync] WBS OK — ' + allNodes.length + ' nodes tersimpan ke DB');
        ok++;
      }
    }

    // Simpan semua SCURVE
    for (const e of scEntries) {
      const { error } = await client.from('scurve')
        .upsert(unmapScurve(e), { onConflict: 'proj_id,week' });
      if (error) { console.warn('[sbForceSync] scurve W' + e.week + ':', error.message); fail++; }
      else ok++;
    }

    // Update project actual/plan/status
    if (proj) {
      const { error } = await client.from('projects')
        .update({ actual: proj.actual||0, plan: proj.plan||0, status: proj.status||null, updated_at: new Date().toISOString() })
        .eq('id', _pid);
      if (error) { console.warn('[sbForceSync] project:', error.message); fail++; }
      else ok++;
    }

    console.log('[sbForceSync] ' + (proj?.kode||_pid) + ' selesai — ok:' + ok + ' fail:' + fail);
    try { toast(fail===0 ? '✓ Sync berhasil' : '⚠ Sync: ' + fail + ' gagal', fail===0?undefined:'warn'); } catch(e) {}
    return { ok, fail, pid: _pid };
  };

    console.log('✅ Supabase Migration Patch loaded — GSheet sync disabled');

  // ── 16. FIX VIEWER MODE WBS — nama & bobot tersembunyi ──────
  // Masalah: nama subcat/item dibungkus .wbs-inline-text.edit-only
  // yang disembunyikan CSS untuk viewer-mode.
  // Fix: tampilkan sebagai read-only text (input tidak interaktif)
  const _viewerWbsCss = document.createElement('style');
  _viewerWbsCss.textContent = `
    body.viewer-mode .wbs-inline-text.edit-only {
      display: inline-flex !important;
      pointer-events: none !important;
      cursor: default !important;
    }
    body.viewer-mode .wbs-inline-text.edit-only input {
      pointer-events: none !important;
      background: transparent !important;
      border: none !important;
      outline: none !important;
      cursor: text;
      color: inherit;
      -webkit-user-select: text;
      user-select: text;
    }
    body.viewer-mode .wbs-date-cell.edit-only {
      display: table-cell !important;
      pointer-events: none !important;
    }
    body.viewer-mode .wbs-date-cell.edit-only input[type="date"] {
      display: none !important;
    }
  `;
  document.head.appendChild(_viewerWbsCss);

  // ── 15. DISABLE GSHEET PASSWORD LOADING ─────────────────
  // Login sekarang murni Supabase Auth — tidak perlu fetch password dari GSheet
  window.loadPwFromGS = async function () {
    // No-op: skip GSheet request, pakai default values saja
    return Promise.resolve();
  };

  // ══════════════════════════════════════════════════════════
  // FIX 1 — Deduplikasi loadFromSupabase()
  // ══════════════════════════════════════════════════════════
  // Root cause:
  //   a) doLogin() → _loginSuccess() → autoLoadOnStart() → loadFromSupabase() [1]
  //      lalu doLogin() langsung memanggil loadFromSupabase() lagi             [2]
  //   b) _initAuthListener() mendengar SIGNED_IN → loadFromSupabase()          [3]
  //
  // Solusi: Wrap window.loadFromSupabase dengan dedup promise.
  // Semua caller (doLogin, autoLoadOnStart, _initAuthListener) me-resolve
  // window.loadFromSupabase via scope chain → override ini selalu tertangkap.
  (function () {
    const _orig = window.loadFromSupabase;
    if (typeof _orig !== 'function') { console.warn('[Fix1] loadFromSupabase not found'); return; }

    let _running = null; // promise yang sedang berjalan

    window.loadFromSupabase = function () {
      // Jika load sedang berjalan, kembalikan promise yang sama (bukan load baru)
      if (_running) {
        console.log('[loadFromSupabase] Deduplicated — returning in-progress promise');
        return _running;
      }
      // Mulai load baru, simpan promise-nya
      _running = Promise.resolve().then(() => _orig.apply(this, arguments))
        .finally(function () { _running = null; });
      return _running;
    };

    console.log('✅ Fix 1: loadFromSupabase dedup aktif');
  })();

  // ══════════════════════════════════════════════════════════
  // FIX 2 — Verifikasi session Supabase saat halaman dimuat
  // ══════════════════════════════════════════════════════════
  // Root cause:
  //   checkSession() hanya cek localStorage timer 8 jam, tidak verifikasi
  //   token Supabase (expire ~1 jam). Akibatnya user terlihat login di UI
  //   tapi API call ke Supabase bisa dapat 401 secara diam-diam.
  //
  // Solusi:
  //   1. Saat halaman load, cek Supabase session aktif via getSession()
  //   2. Jika token habis, coba refresh. Jika gagal → paksa re-login
  //   3. Jadwalkan auto-refresh token setiap 50 menit (Supabase expire ~1 jam)
  (function () {

    // ── Paksa re-login (tampilkan auth screen) ──────────────
    function _forceRelogin(reason) {
      console.warn('[Session]', reason, '— meminta login ulang');
      localStorage.removeItem('atw_session');
      const as = document.getElementById('authScreen');
      if (as) {
        as.style.cssText = [
          'position:fixed;inset:0;z-index:9999;display:flex;',
          'align-items:center;justify-content:center;flex-direction:column;',
          'background:linear-gradient(135deg,#060a14 0%,#0a0f1e 50%,#0d1525 100%)'
        ].join('');
      }
      try { toast('Sesi berakhir, silakan login kembali', 'error'); } catch (e) {}
      // Sign out dari Supabase agar token lama tidak tersimpan di browser
      try {
        const c = (typeof _initSb === 'function') ? _initSb() : null;
        if (c) c.auth.signOut();
      } catch (e) {}
    }

    // ── Update timestamp localStorage agar 8 jam selalu fresh ──
    function _refreshLocalSession() {
      try {
        const s = JSON.parse(localStorage.getItem('atw_session') || '{}');
        if (s.role) {
          localStorage.setItem('atw_session', JSON.stringify({ role: s.role, ts: Date.now() }));
        }
      } catch (e) {}
    }

    // ── Cek apakah user sedang dalam keadaan logged in ──────
    function _isLoggedIn() {
      const as = document.getElementById('authScreen');
      // auth screen tersembunyi = user sudah login
      return as && (as.style.display === 'none' || !as.style.cssText.includes('fixed'));
    }

    // ── Verifikasi sesi Supabase (async) ────────────────────
    async function _verifySbSession() {
      if (!_isLoggedIn()) return; // belum login, skip

      const client = (typeof _initSb === 'function') ? _initSb() : null;
      if (!client) return;

      try {
        const { data: { session }, error } = await client.auth.getSession();

        if (error) {
          console.warn('[Session] getSession error:', error.message);
          return; // error jaringan, jangan paksa logout
        }

        if (!session) {
          // Token tidak ada di browser — coba refresh
          const { data: refreshData, error: refreshErr } = await client.auth.refreshSession();
          if (refreshErr || !refreshData.session) {
            _forceRelogin('Token Supabase expired dan tidak bisa di-refresh');
            return;
          }
          // Refresh berhasil
          _refreshLocalSession();
          console.log('[Session] Token di-refresh otomatis ✓');
          return;
        }

        // Session valid — perbarui localStorage timestamp
        _refreshLocalSession();

        // Cek apakah token hampir habis (sisa < 5 menit)
        const expiresAt = session.expires_at; // unix timestamp
        if (expiresAt && (expiresAt - Math.floor(Date.now() / 1000)) < 300) {
          const { data: refreshData, error: refreshErr } = await client.auth.refreshSession();
          if (!refreshErr && refreshData.session) {
            _refreshLocalSession();
            console.log('[Session] Token di-refresh preventif (sisa < 5 menit) ✓');
          }
        }

      } catch (e) {
        console.warn('[Session] Verification exception:', e.message);
        // Jangan paksa logout jika terjadi error jaringan
      }
    }

    // ── Auto-refresh token setiap 50 menit ──────────────────
    function _scheduleTokenRefresh() {
      setInterval(async function () {
        if (!_isLoggedIn()) return;
        const client = (typeof _initSb === 'function') ? _initSb() : null;
        if (!client) return;
        try {
          const { data, error } = await client.auth.refreshSession();
          if (!error && data.session) {
            _refreshLocalSession();
            console.log('[Session] Auto-refresh token ✓ —', new Date().toLocaleTimeString('id-ID'));
          } else if (error) {
            // Refresh gagal — cek apakah masih ada session
            const { data: { session } } = await client.auth.getSession();
            if (!session) _forceRelogin('Auto-refresh gagal dan tidak ada session aktif');
          }
        } catch (e) {
          console.warn('[Session] Auto-refresh error:', e.message);
        }
      }, 50 * 60 * 1000); // setiap 50 menit
    }

    // ── Jalankan verifikasi saat page load ──────────────────
    // Untuk user yang sudah login sebelumnya (via checkSession)
    if (document.readyState === 'complete') {
      setTimeout(_verifySbSession, 1000); // delay kecil agar _initSb() sudah siap
    } else {
      window.addEventListener('load', function () {
        setTimeout(_verifySbSession, 1000);
      });
    }

    // Jadwalkan auto-refresh
    _scheduleTokenRefresh();

    // Expose untuk debugging
    window._verifySbSession = _verifySbSession;

    console.log('✅ Fix 2: Session verification + auto-refresh aktif (setiap 50 menit)');
  })();

  // ══════════════════════════════════════════════════════════
  // FIX 3 — Bersihkan referensi GSheet di save bar
  // ══════════════════════════════════════════════════════════
  // Root cause (3 sumber):
  //   a) setInterval(_rtPoll, 15000) memanggil _rtPoll original setiap 15 detik
  //      → _rtPoll set smsg = 'GSheet ✓ · time'
  //      → Fix: gsOk=false agar _rtPoll return early (baris 11009: if(!gsOk||...)return)
  //   b) autoLoadOnStart() original dipanggil dari initAuth() SEBELUM migration patch
  //      → set flabel = 'Google Sheet · time'
  //      → Fix: re-trigger loadFromSupabase + update flabel untuk returning users
  //   c) Dropdown Data masih ada "Sync ke GSheet" / "Load dari GSheet"
  //      → Fix: sembunyikan item-item tersebut
  (function () {

    // ── A. Stop _rtPoll — set gsOk=false ─────────────────────
    // _rtPoll cek: if(!gsOk||!gsUrl||!_rtOnline)return; (line 11009)
    // Dengan gsOk=false, SEMUA call _rtPoll dari setInterval jadi no-op.
    try { gsOk = false; gsUrl = ''; } catch (e) {}

    // ── B. Tampilkan email user di flabel ─────────────────────
    // Menggantikan "Google Sheet · time" dengan info Supabase user.
    async function _updateFlabel() {
      const flabel = document.getElementById('flabel');
      if (!flabel) return;
      try {
        const client = (typeof _initSb === 'function') ? _initSb() : null;
        if (!client) { flabel.textContent = '\u2601 Supabase'; return; }
        const { data } = await client.auth.getUser();
        if (data && data.user) {
          const stored = JSON.parse(localStorage.getItem('atw_session') || '{}');
          const role = stored.role || (typeof currentRole !== 'undefined' ? currentRole : '');
          const shortEmail = (data.user.email || '').split('@')[0];
          flabel.textContent = '\u2601 ' + shortEmail + (role ? ' \u00b7 ' + role : '');
        } else {
          flabel.textContent = '\u2601 Supabase';
        }
      } catch (e) {
        const fl = document.getElementById('flabel');
        if (fl) fl.textContent = '\u2601 Supabase';
      }
    }

    // ── C. Untuk returning users: trigger Supabase load ───────
    // initAuth() memanggil autoLoadOnStart() ORIGINAL sebelum migration patch.
    // Hasilnya: smsg = "Memuat cache lokal — menghubungi GSheet..."
    // Fix: cek jika user sudah login via checkSession → panggil loadFromSupabase
    (function _fixReturningUser() {
      const as = document.getElementById('authScreen');
      const isLoggedIn = as && (as.style.display === 'none' ||
        (as.style.cssText && !as.style.cssText.includes('fixed')));
      if (!isLoggedIn) return; // belum login, skip

      // Update smsg agar tidak tampil pesan GSheet
      const smsg = document.getElementById('smsg');
      const sdot = document.getElementById('sdot');
      if (smsg && (smsg.textContent.includes('GSheet') || smsg.textContent.includes('Google'))) {
        smsg.textContent = 'Menghubungkan ke Supabase...';
      }
      if (sdot) { sdot.style.background = 'var(--yw)'; sdot.classList.remove('unsaved'); }

      // Load data dari Supabase (replace data GSheet jika ada)
      setTimeout(async function () {
        try {
          if (typeof loadFromSupabase === 'function') await loadFromSupabase();
        } catch (e) { console.warn('[Fix3-C]', e.message); }
        _updateFlabel();
      }, 400);
    })();

    // ── D. Patch autoLoadOnStart — tambahkan flabel update ────
    // Agar flabel selalu di-update setelah Supabase load selesai
    // (berlaku untuk new login via doLogin)
    const _origAutoLoad3 = window.autoLoadOnStart;
    window.autoLoadOnStart = async function () {
      if (typeof _origAutoLoad3 === 'function') await _origAutoLoad3.apply(this, arguments);
      setTimeout(_updateFlabel, 500);
    };

    // ── E. Sembunyikan elemen GSheet di save bar ──────────────
    function _cleanSbarGsUI() {
      // Sembunyikan item dropdown GSheet
      ['btnSync', 'btnLoad'].forEach(function (id) {
        const el = document.getElementById(id);
        if (!el) return;
        el.style.display = 'none';
        // Sembunyikan separator setelah item jika ada
        const next = el.nextElementSibling;
        if (next && next.classList && next.classList.contains('sbar-dd-sep')) {
          next.style.display = 'none';
        }
      });

      // Sembunyikan GSheet badge di header (redundant tapi pastikan hilang)
      const badge = document.getElementById('gsBadge');
      if (badge) badge.style.display = 'none';

      // Jika smsg masih menampilkan teks GSheet, ganti
      const smsg = document.getElementById('smsg');
      if (smsg) {
        const t = smsg.textContent || '';
        if (t.includes('GSheet') || t.includes('Google Sheet') ||
            t.includes('cache lokal') || t.includes('menghubungi')) {
          smsg.textContent = 'Siap \u2014 Supabase';
        }
      }
    }
    setTimeout(_cleanSbarGsUI, 600);

    // ── F. Override _sbStatusOk — jaga flabel tetap Supabase ──
    // Setelah setiap save berhasil, pastikan flabel tidak kembali ke GSheet text
    const _origStatusOk2 = window._sbStatusOk;
    window._sbStatusOk = function () {
      if (typeof _origStatusOk2 === 'function') _origStatusOk2.apply(this, arguments);
      const fl = document.getElementById('flabel');
      if (fl && (fl.textContent.includes('Google') || fl.textContent.includes('GSheet') ||
                 fl.textContent === '\u2014' || fl.textContent === 'Belum ada file' ||
                 fl.textContent === 'Lokal' || fl.textContent === 'Cache Offline')) {
        _updateFlabel();
      }
    };

    console.log('\u2705 Fix 3: Save bar GSheet references dibersihkan');
  })();

  // ══════════════════════════════════════════════════════════
  // RETRY QUEUE + OFFLINE MODE
  // ══════════════════════════════════════════════════════════
  // Arsitektur:
  //   Semua save akhirnya memanggil _sbStatusErr saat gagal.
  //   Kita intercept _sbStatusErr + hook tiap window.save* untuk capture data.
  //   Data pending disimpan ke localStorage (atw_sq) → di-flush saat online kembali.
  //   Offline mode: navigator.onLine check di setiap save, queue langsung.
  (function () {

    var QUEUE_KEY = 'atw_sq';
    var MAX_Q = 80;
    var _errFlag = 0; // timestamp terakhir _sbStatusErr dipanggil

    // ── Queue helpers ─────────────────────────────────────────
    function _qLoad() {
      try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]'); } catch (e) { return []; }
    }
    function _qSave(q) {
      try { localStorage.setItem(QUEUE_KEY, JSON.stringify(q.slice(-MAX_Q))); } catch (e) {}
    }
    function _qAdd(op) {
      var q = _qLoad();
      // Dedup: ganti item dengan key yang sama
      if (op.key) {
        var idx = q.findIndex(function (x) { return x.key === op.key; });
        if (idx >= 0) { q[idx] = op; } else { q.push(op); }
      } else {
        q.push(op);
      }
      _qSave(q);
      _uiBadge();
    }
    function _qRemove(opId) {
      _qSave(_qLoad().filter(function (x) { return x.id !== opId; }));
      _uiBadge();
    }
    function _qClear() {
      localStorage.removeItem(QUEUE_KEY);
      _uiBadge();
    }

    // ── Badge UI ──────────────────────────────────────────────
    function _uiBadge() {
      var q = _qLoad();
      var badge = document.getElementById('_sqBadge');
      if (!badge) {
        var info = document.querySelector('#sbar .sbar-info');
        if (!info) return;
        badge = document.createElement('span');
        badge.id = '_sqBadge';
        badge.title = 'Operasi tertunda — klik untuk kirim ulang';
        badge.style.cssText = [
          'display:none;margin-left:8px;padding:1px 8px;border-radius:10px;',
          'font-size:9px;font-family:var(--fm);cursor:pointer;',
          'background:rgba(124,140,240,.15);color:var(--or);',
          'border:1px solid rgba(124,140,240,.3);animation:pulse 2s infinite'
        ].join('');
        badge.onclick = function () { _flush(); };
        info.appendChild(badge);
      }
      if (q.length === 0) {
        badge.style.display = 'none';
      } else {
        badge.style.display = 'inline-block';
        badge.textContent = '\u21bb ' + q.length + ' tertunda';
      }
    }

    // ── Intercept _sbStatusErr ────────────────────────────────
    // Saat error save terdeteksi, tandai waktunya
    var _origSbErr = window._sbStatusErr;
    window._sbStatusErr = function (msg) {
      _errFlag = Date.now();
      if (typeof _origSbErr === 'function') _origSbErr.call(this, msg);
    };
    function _hadErr() { return (Date.now() - _errFlag) < 600; }

    // ── Offline indicator ─────────────────────────────────────
    function _setOfflineUI(on) {
      var smsg = document.getElementById('smsg');
      var sdot = document.getElementById('sdot');
      if (on) {
        if (smsg) smsg.textContent = '\u26a1 Offline \u2014 perubahan tersimpan lokal';
        if (sdot) sdot.style.background = 'var(--or)';
      } else {
        if (sdot) { sdot.style.background = 'var(--gn)'; sdot.classList.remove('unsaved'); }
        var q = _qLoad();
        if (smsg) smsg.textContent = q.length > 0
          ? 'Online \u2014 memproses ' + q.length + ' operasi tertunda...'
          : 'Online \u2014 Supabase';
      }
    }

    // ── Thin wrapper: capture pending op sebelum call ─────────
    // op = { key, fn, retry }
    // fn()    = fungsi async yang melakukan save
    // retry() = fungsi async untuk re-execute saat flush
    async function _withQueue(op, fn) {
      // Cek offline
      if (!navigator.onLine) {
        _qAdd({ id: _uid(), key: op.key, type: op.type, payload: op.payload, ts: Date.now() });
        _setOfflineUI(true);
        try { toast('Offline — akan dikirim otomatis saat koneksi pulih', 'info'); } catch (e) {}
        return;
      }

      _errFlag = 0;
      try {
        await fn();
      } catch (e) {
        _errFlag = Date.now();

        // ── Error classification (gunakan sbClassifyError jika tersedia) ──
        var errType = typeof sbClassifyError === 'function'
          ? sbClassifyError(e)
          : 'unknown';

        // Pesan error yang lebih informatif per tipe
        var userMsg;
        switch (errType) {
          case 'network':
            userMsg = 'Koneksi bermasalah — data akan dikirim ulang otomatis';
            break;
          case 'auth':
            userMsg = 'Sesi login berakhir — silakan login ulang';
            break;
          case 'conflict':
            userMsg = 'Konflik data — data sudah diubah pengguna lain, refresh halaman';
            break;
          case 'validation':
            userMsg = e.message || 'Data tidak valid — periksa input';
            break;
          case 'server':
            userMsg = 'Server error — akan dicoba ulang otomatis';
            break;
          default:
            userMsg = 'Gagal simpan: ' + (e.message || 'unknown error');
        }

        try { _sbStatusErr(userMsg); } catch (ee) {}

        // Jangan queue validation/conflict errors (tidak akan berhasil di-retry)
        if (errType === 'validation' || errType === 'conflict') {
          try { toast('⚠ ' + userMsg, 'error'); } catch (e2) {}
          return; // Keluar tanpa queue
        }
      }

      // Queue untuk network/server/auth/unknown errors
      if (_hadErr() && op.payload) {
        _qAdd({ id: _uid(), key: op.key, type: op.type, payload: op.payload, ts: Date.now() });
        try { toast('⚠ Gagal simpan — akan dicoba ulang otomatis', 'warn'); } catch (e) {}
      }
    }
    function _uid() { return Date.now() + '_' + Math.random().toString(36).slice(2, 7); }

    // ── Flush queue → kirim ke Supabase ──────────────────────
    var _flushing = false;
    async function _flush() {
      if (_flushing || !navigator.onLine) return;
      var q = _qLoad();
      if (!q.length) return;

      _flushing = true;
      var smsg = document.getElementById('smsg');
      if (smsg) smsg.textContent = 'Mengirim ' + q.length + ' operasi tertunda...';

      var ok = 0, fail = 0;
      var client = (typeof _initSb === 'function') ? _initSb() : null;

      for (var i = 0; i < q.length; i++) {
        var op = q[i];
        try {
          await _execOp(op, client);
          _qRemove(op.id);
          ok++;
        } catch (e) {
          console.warn('[SQ flush fail]', op.type, e.message);
          fail++;
        }
      }
      _flushing = false;
      _uiBadge();

      if (ok > 0 && fail === 0) {
        try { toast(ok + ' operasi berhasil tersimpan ke Supabase \u2713'); } catch (e) {}
        if (typeof _sbStatusOk === 'function') _sbStatusOk();
      } else if (fail > 0) {
        try { toast(fail + ' operasi gagal \u2014 klik badge untuk coba lagi', 'error'); } catch (e) {}
      }
    }

    // ── Eksekusi satu operasi queue → langsung ke Supabase ───
    async function _execOp(op, client) {
      if (!client) throw new Error('No Supabase client');
      var p = op.payload;
      var ub = typeof _sbGetCurrentUserName === 'function' ? _sbGetCurrentUserName() : null;
      switch (op.type) {

        case 'patch': {
          var payload = Object.assign({}, p.fields, { updated_at: new Date().toISOString(), updated_by: ub });
          var r = await client.from(p.table).update(payload).eq('id', p.id);
          if (r.error) throw r.error;
          break;
        }
        case 'upsert': {
          var r2 = await client.from(p.table).upsert(Object.assign({}, p.row, { updated_by: ub }), { onConflict: 'id' });
          if (r2.error) throw r2.error;
          break;
        }
        case 'manpower': {
          var r3 = await client.from('manpower_logs').upsert(
            Object.assign({}, typeof unmapManpower === 'function' ? unmapManpower(p.entry) : p.entry, { updated_by: ub }),
            { onConflict: 'id' }
          );
          if (r3.error) throw r3.error;
          break;
        }
        case 'issue': {
          var r4 = await client.from('issues').upsert(
            Object.assign({}, typeof unmapIssue === 'function' ? unmapIssue(p.iss) : p.iss, { updated_by: ub }),
            { onConflict: 'id' }
          );
          if (r4.error) throw r4.error;
          break;
        }
        case 'procurement': {
          var r5 = await client.from('procurement').upsert(
            Object.assign({}, typeof unmapProcurement === 'function' ? unmapProcurement(p.proc) : p.proc, { updated_by: ub }),
            { onConflict: 'id' }
          );
          if (r5.error) throw r5.error;
          break;
        }
        case 'cost': {
          var r6 = await client.from('costs').upsert(
            Object.assign({}, typeof unmapCost === 'function' ? unmapCost(p.cost) : p.cost, { updated_by: ub }),
            { onConflict: 'id' }
          );
          if (r6.error) throw r6.error;
          break;
        }
        case 'wbs': {
          var r7 = await client.from('wbs').upsert(
            Object.assign({}, typeof unmapWbs === 'function' ? unmapWbs(p.node) : p.node, { updated_by: ub }),
            { onConflict: 'id' }
          );
          if (r7.error) throw r7.error;
          break;
        }
        case 'wbs_bulk': {
          var typeOrder = { cat: 0, subcat: 1, item: 2 };
          var sorted = (p.nodes || []).sort(function(a,b){
            return (typeOrder[a.type]||1) - (typeOrder[b.type]||1);
          });
          var mapped = sorted.map(function(n){ return Object.assign({}, typeof unmapWbs === 'function' ? unmapWbs(n) : n, { updated_by: ub }); });
          if (mapped.length) {
            var r8 = await client.from('wbs').upsert(mapped, { onConflict: 'id' });
            if (r8.error) throw r8.error;
          }
          break;
        }
        case 'rab': {
          var r9 = await client.from('rab').upsert(
            Object.assign({}, typeof unmapRab === 'function' ? unmapRab(p.item) : p.item, { updated_by: ub }),
            { onConflict: 'id' }
          );
          if (r9.error) throw r9.error;
          break;
        }
        case 'rab_bulk': {
          if ((p.items || []).length) {
            var r10 = await client.from('rab').upsert(
              p.items.map(function(x){ return Object.assign({}, typeof unmapRab === 'function' ? unmapRab(x) : x, { updated_by: ub }); }),
              { onConflict: 'id' }
            );
            if (r10.error) throw r10.error;
          }
          break;
        }
        case 'scurve': {
          var r11 = await client.from('scurve').upsert(
            Object.assign({}, typeof unmapScurve === 'function' ? unmapScurve(p.entry) : p.entry, { updated_by: ub }),
            { onConflict: 'proj_id,week' }
          );
          if (r11.error) throw r11.error;
          break;
        }
        case 'doc': {
          var r12 = await client.from('documents').upsert(
            Object.assign({}, typeof unmapDocument === 'function' ? unmapDocument(p.doc) : p.doc, { updated_by: ub }),
            { onConflict: 'id' }
          );
          if (r12.error) throw r12.error;
          break;
        }
        default:
          throw new Error('Unknown op type: ' + op.type);
      }
    }

    // ── Re-override save functions paling penting ─────────────

    // saveUpdate (progress — paling kritis)
    var _migSaveUpdate = window.saveUpdate;
    window.saveUpdate = async function () {
      var proj = P.find(function (x) { return x.id === selId; });
      var snap = proj ? {
        id: proj.id, plan: proj.plan, actual: proj.actual,
        status: proj.status, notes: proj.notes, mpActual: proj.mpActual
      } : null;
      await _withQueue(
        { key: 'upd|' + (snap && snap.id), type: 'patch',
          payload: snap ? { table: 'projects', id: snap.id, fields: {
            plan: snap.plan, actual: snap.actual, mp_actual: snap.mpActual || 0,
            status: snap.status, notes: snap.notes || null
          }} : null },
        function () { return _migSaveUpdate.apply(this, arguments); }.bind(this)
      );
    };

    // saveProj (project metadata)
    var _migSaveProj = window.saveProj;
    window.saveProj = async function () {
      await _withQueue(
        { key: 'proj|' + (typeof editProjId !== 'undefined' ? editProjId : '_new'),
          type: 'upsert',
          payload: null }, // payload di-capture setelah original berjalan di flush
        function () { return _migSaveProj.apply(this, arguments); }.bind(this)
      );
    };

    // saveMp (manpower — sering dipakai)
    var _migSaveMp = window.saveMp;
    window.saveMp = async function () {
      var projId = document.getElementById('mpProj') && document.getElementById('mpProj').value || '';
      var date = document.getElementById('mpDate') && document.getElementById('mpDate').value
                 || new Date().toISOString().slice(0, 10);
      // ── Access guard (Fase 3d): editor hanya boleh simpan ke proyek miliknya ──
      if (typeof canEditProj === 'function' && !canEditProj(projId)) {
        if (window.toast) window.toast('Tidak punya akses edit ke proyek ini', 'error');
        return;
      }
      // ── Conflict detection (edit only) ──
      var _mpEl = document.getElementById('mpProj');
      var _mpEditId = (_mpEl && _mpEl.dataset && _mpEl.dataset.editId) || '';
      if (_mpEditId && typeof sbSafeCheck === 'function') {
        var _mpOk = await sbSafeCheck('manpower_logs', _mpEditId, 'Data manpower ini');
        if (!_mpOk) return; // user batal → jangan queue/persist, data orang lain aman
      }
      await _withQueue(
        { key: 'mp|' + projId + '|' + date, type: 'manpower', payload: null },
        async function () {
          await _migSaveMp.apply(this, arguments);
          // Capture entry setelah original memprosesnya
          var entry = MPLOGS.find(function (m) {
            return String(m.projId) === String(projId) && m.date === date;
          });
          if (entry) {
            var q = _qLoad();
            var key = 'mp|' + projId + '|' + date;
            var item = q.find(function (x) { return x.key === key; });
            if (item && !item.payload.entry) {
              item.payload = { entry: entry };
              _qSave(q);
            }
          }
        }.bind(this)
      );
    };

    // saveIss (issues)
    var _migSaveIss = window.saveIss;
    window.saveIss = async function () {
      var prevId = typeof editIssId !== 'undefined' ? editIssId : null;
      // ── Access guard (Fase 3d): editor hanya boleh simpan ke proyek miliknya ──
      var _issProjId = (document.getElementById('iProj') && document.getElementById('iProj').value)
                       || (typeof selId !== 'undefined' ? selId : '') || '';
      if (typeof canEditProj === 'function' && !canEditProj(_issProjId)) {
        if (window.toast) window.toast('Tidak punya akses edit ke proyek ini', 'error');
        return;
      }
      await _withQueue(
        { key: 'iss|' + (prevId || '_new'), type: 'issue', payload: null },
        async function () {
          await _migSaveIss.apply(this, arguments);
          var iss = prevId ? ISS.find(function (x) { return String(x.id) === String(prevId); })
                           : ISS[ISS.length - 1];
          if (iss) {
            var q2 = _qLoad();
            var key2 = 'iss|' + (prevId || '_new');
            var item2 = q2.find(function (x) { return x.key === key2; });
            if (item2) { item2.payload = { iss: iss }; _qSave(q2); }
          }
        }.bind(this)
      );
    };

    // saveProc (procurement)
    var _migSaveProc = window.saveProc;
    window.saveProc = async function () {
      var prevId = typeof editProcId !== 'undefined' ? editProcId : null;
      // ── Access guard (Fase 3d): editor hanya boleh simpan ke proyek miliknya ──
      var _procProjId = (document.getElementById('pProj') && document.getElementById('pProj').value)
                        || (typeof selId !== 'undefined' ? selId : '') || '';
      if (typeof canEditProj === 'function' && !canEditProj(_procProjId)) {
        if (window.toast) window.toast('Tidak punya akses edit ke proyek ini', 'error');
        return;
      }
      await _withQueue(
        { key: 'proc|' + (prevId || '_new'), type: 'procurement', payload: null },
        async function () {
          await _migSaveProc.apply(this, arguments);
          var proc = prevId ? PROC.find(function (x) { return String(x.id) === String(prevId); })
                            : PROC[PROC.length - 1];
          if (proc) {
            var q3 = _qLoad();
            var key3 = 'proc|' + (prevId || '_new');
            var item3 = q3.find(function (x) { return x.key === key3; });
            if (item3) { item3.payload = { proc: proc }; _qSave(q3); }
          }
        }.bind(this)
      );
    };

    // saveCost (biaya)
    var _migSaveCost = window.saveCost;
    window.saveCost = async function () {
      var prevId = typeof editCostId !== 'undefined' ? editCostId : null;
      // ── Access guard (Fase 3d): editor hanya boleh simpan ke proyek miliknya ──
      var _costProjId = (document.getElementById('cProj') && document.getElementById('cProj').value)
                        || (typeof selId !== 'undefined' ? selId : '') || '';
      if (typeof canEditProj === 'function' && !canEditProj(_costProjId)) {
        if (window.toast) window.toast('Tidak punya akses edit ke proyek ini', 'error');
        return;
      }
      await _withQueue(
        { key: 'cost|' + (prevId || '_new'), type: 'cost', payload: null },
        async function () {
          await _migSaveCost.apply(this, arguments);
          var cost = prevId ? COSTS.find(function (x) { return String(x.id) === String(prevId); })
                            : COSTS[COSTS.length - 1];
          if (cost) {
            var q4 = _qLoad();
            var key4 = 'cost|' + (prevId || '_new');
            var item4 = q4.find(function (x) { return x.key === key4; });
            if (item4) { item4.payload = { cost: cost }; _qSave(q4); }
          }
        }.bind(this)
      );
    };

    // saveEditWbs (edit WBS node individual)
    var _migSaveEditWbs = window.saveEditWbs;
    window.saveEditWbs = async function () {
      var id = document.getElementById('wbsEditId') && document.getElementById('wbsEditId').value || '';
      await _withQueue(
        { key: 'wbs|' + (id || '_new'), type: 'wbs', payload: null },
        async function () {
          await _migSaveEditWbs.apply(this, arguments);
          var node = id ? WBS.find(function(w){ return String(w.id) === String(id); }) : null;
          if (node) {
            var q5 = _qLoad();
            var key5 = 'wbs|' + id;
            var item5 = q5.find(function(x){ return x.key === key5; });
            if (item5) { item5.payload = { node: node }; _qSave(q5); }
          }
        }.bind(this)
      );
    };

    // saveWbsPlanGrid (bulk WBS + scurve)
    var _migSaveWbsPlanGrid = window.saveWbsPlanGrid;
    window.saveWbsPlanGrid = async function () {
      var projId = document.getElementById('wbsPlanProj') && document.getElementById('wbsPlanProj').value || '';
      await _withQueue(
        { key: 'wbs_bulk|' + projId, type: 'wbs_bulk', payload: null },
        async function () {
          await _migSaveWbsPlanGrid.apply(this, arguments);
          var nodes = WBS.filter(function(w){ return String(w.projId) === String(projId); });
          if (nodes.length) {
            var q6 = _qLoad();
            var key6 = 'wbs_bulk|' + projId;
            var item6 = q6.find(function(x){ return x.key === key6; });
            if (item6) { item6.payload = { nodes: nodes }; _qSave(q6); }
          }
        }.bind(this)
      );
    };

    // saveRabKat (RAB kategori)
    var _migSaveRabKat = window.saveRabKat;
    window.saveRabKat = async function () {
      var prevId = typeof editRabCatId !== 'undefined' ? editRabCatId : null;
      await _withQueue(
        { key: 'rab|' + (prevId || '_new'), type: 'rab', payload: null },
        async function () {
          await _migSaveRabKat.apply(this, arguments);
          var item7 = prevId ? RAB.find(function(x){ return String(x.id) === String(prevId); })
                             : RAB[RAB.length - 1];
          if (item7) {
            var q7 = _qLoad();
            var key7 = 'rab|' + (prevId || '_new');
            var qItem7 = q7.find(function(x){ return x.key === key7; });
            if (qItem7) { qItem7.payload = { item: item7 }; _qSave(q7); }
          }
        }.bind(this)
      );
    };

    // saveRabItem (RAB item)
    var _migSaveRabItem = window.saveRabItem;
    window.saveRabItem = async function () {
      var prevId = typeof editRabId !== 'undefined' ? editRabId : null;
      await _withQueue(
        { key: 'rab_item|' + (prevId || '_new'), type: 'rab', payload: null },
        async function () {
          await _migSaveRabItem.apply(this, arguments);
          var item8 = prevId ? RAB.find(function(x){ return String(x.id) === String(prevId); })
                             : RAB[RAB.length - 1];
          if (item8) {
            var q8 = _qLoad();
            var key8 = 'rab_item|' + (prevId || '_new');
            var qItem8 = q8.find(function(x){ return x.key === key8; });
            if (qItem8) { qItem8.payload = { item: item8 }; _qSave(q8); }
          }
        }.bind(this)
      );
    };

    // ── saveDrInput offline queue ─────────────────────────────
    // Layer A sudah handle persist saat online.
    // Layer C ini wrap layer A agar saat offline, data di-queue.
    var _migSaveDrInput = window.saveDrInput;
    if (_migSaveDrInput) {
      window.saveDrInput = async function () {
        var projId = document.getElementById('drInputProj') && document.getElementById('drInputProj').value || '';
        if (!projId) { await _migSaveDrInput.apply(this, arguments); return; }
        await _withQueue(
          { key: 'dr_bulk|' + projId, type: 'wbs_bulk', payload: null },
          async function () {
            await _migSaveDrInput.apply(this, arguments);
            // Capture payload setelah save (untuk offline flush)
            var freshNodes = WBS.filter(function(w){ return String(w.projId) === String(projId); });
            if (freshNodes.length) {
              var q = _qLoad();
              var item = q.find(function(x){ return x.key === 'dr_bulk|' + projId; });
              if (item) { item.payload = { nodes: freshNodes }; _qSave(q); }
            }
          }.bind(this)
        );
      };
    }

    // ── saveWbsProgress offline queue ─────────────────────────
    var _migSaveWbsProgress = window.saveWbsProgress;
    if (_migSaveWbsProgress) {
      window.saveWbsProgress = async function () {
        var projId = (document.getElementById('wbsProgProj') && document.getElementById('wbsProgProj').value)
                     || (typeof selId !== 'undefined' ? selId : '') || '';
        if (!projId) { await _migSaveWbsProgress.apply(this, arguments); return; }
        await _withQueue(
          { key: 'wbs_prog|' + projId, type: 'wbs_bulk', payload: null },
          async function () {
            await _migSaveWbsProgress.apply(this, arguments);
            var freshNodes = WBS.filter(function(w){ return String(w.projId) === String(projId); });
            if (freshNodes.length) {
              var q = _qLoad();
              var item = q.find(function(x){ return x.key === 'wbs_prog|' + projId; });
              if (item) { item.payload = { nodes: freshNodes }; _qSave(q); }
            }
          }.bind(this)
        );
      };
    }

    // ── saveAllDailyLogs offline queue ─────────────────────────
    var _migSaveAllDailyLogs2 = window.saveAllDailyLogs;
    if (_migSaveAllDailyLogs2) {
      window.saveAllDailyLogs = async function () {
        var projId = document.getElementById('wbsDailyProj') && document.getElementById('wbsDailyProj').value || '';
        if (!projId) { await _migSaveAllDailyLogs2.apply(this, arguments); return; }
        await _withQueue(
          { key: 'dr_all|' + projId, type: 'wbs_bulk', payload: null },
          async function () {
            await _migSaveAllDailyLogs2.apply(this, arguments);
            var freshNodes = WBS.filter(function(w){ return String(w.projId) === String(projId); });
            if (freshNodes.length) {
              var q = _qLoad();
              var item = q.find(function(x){ return x.key === 'dr_all|' + projId; });
              if (item) { item.payload = { nodes: freshNodes }; _qSave(q); }
            }
          }.bind(this)
        );
      };
    }

    // ── Online / offline events ───────────────────────────────
    window.addEventListener('offline', function () { _setOfflineUI(true); });
    window.addEventListener('online', function () {
      _setOfflineUI(false);
      setTimeout(_flush, 1000); // delay kecil agar koneksi stabil
    });

    // Saat halaman dimuat: cek status & flush jika ada pending
    if (!navigator.onLine) { _setOfflineUI(true); }
    setTimeout(function () {
      _uiBadge();
      if (navigator.onLine && _qLoad().length > 0) {
        var smsg = document.getElementById('smsg');
        if (smsg) smsg.textContent = 'Ditemukan ' + _qLoad().length + ' operasi tertunda dari sesi sebelumnya...';
        setTimeout(_flush, 1500);
      }
    }, 2500);

    // Expose untuk debugging via console
    window._sbQueue = {
      flush: _flush,
      list: _qLoad,
      clear: function () { _qClear(); toast('Queue dibersihkan'); }
    };

    console.log('\u2705 Retry queue + offline mode aktif');
  })();
});

