// ============================================================
//  ATW Solar — Action Items
//  Ubah rekomendasi jadi tugas yang dilacak: PIC + tenggat + ceklis.
//  Tersimpan di Supabase (tabel action_items).
// ============================================================
(function () {
  'use strict';

  function _attr(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function _addAction(projId, text) {
    if (typeof canEditProj === 'function' && !canEditProj(projId)) { if (typeof toast === 'function') toast('Tidak punya akses edit ke proyek ini', 'error'); return; }
    if (typeof ACTIONS === 'undefined') window.ACTIONS = [];
    const a = {
      id: (typeof genId === 'function' ? genId() : 'act_' + Date.now()),
      projId: String(projId), text: text || '', pic: '', due: '', done: false,
      createdAt: new Date().toISOString()
    };
    ACTIONS.push(a);
    if (typeof sbSaveActionItem === 'function') sbSaveActionItem(a).catch(e => { if (typeof toast === 'function') toast('Gagal simpan: ' + (e && e.message || e), 'error'); });
    if (typeof renderDetail === 'function') renderDetail(projId);
  }

  function createActionFromRec(projId, enc) {
    let text = ''; try { text = decodeURIComponent(enc); } catch (e) { text = enc; }
    _addAction(projId, text);
    if (typeof toast === 'function') toast('Ditambahkan ke Action Items \u2713', 'success');
  }
  function addBlankAction(projId) { _addAction(projId, ''); }

  function updateActionField(id, field, value) {
    const a = ACTIONS.find(x => String(x.id) === String(id)); if (!a) return;
    if (typeof canEditProj === 'function' && !canEditProj(a.projId)) { if (typeof toast === 'function') toast('Tidak punya akses edit ke proyek ini', 'error'); return; }
    a[field] = value;
    if (typeof sbSaveActionItem === 'function') sbSaveActionItem(a).catch(e => { if (typeof toast === 'function') toast('Gagal simpan: ' + (e && e.message || e), 'error'); });
    if (field === 'due' && typeof renderDetail === 'function') renderDetail(a.projId); // refresh status overdue
  }
  function toggleActionDone(id) {
    const a = ACTIONS.find(x => String(x.id) === String(id)); if (!a) return;
    if (typeof canEditProj === 'function' && !canEditProj(a.projId)) { if (typeof toast === 'function') toast('Tidak punya akses edit ke proyek ini', 'error'); if (typeof renderDetail === 'function') renderDetail(a.projId); return; }
    a.done = !a.done;
    if (typeof sbSaveActionItem === 'function') sbSaveActionItem(a).catch(e => { if (typeof toast === 'function') toast('Gagal simpan: ' + (e && e.message || e), 'error'); });
    if (typeof renderDetail === 'function') renderDetail(a.projId);
  }
  function removeAction(id) {
    const a = ACTIONS.find(x => String(x.id) === String(id)); if (!a) return;
    if (typeof canEditProj === 'function' && !canEditProj(a.projId)) { if (typeof toast === 'function') toast('Tidak punya akses edit ke proyek ini', 'error'); return; }
    if (!confirm('Hapus action item ini?')) return;
    const projId = a.projId, i = ACTIONS.indexOf(a); if (i >= 0) ACTIONS.splice(i, 1);
    if (typeof sbDeleteActionItem === 'function') sbDeleteActionItem(id).catch(e => { if (typeof toast === 'function') toast('Gagal hapus: ' + (e && e.message || e), 'error'); });
    if (typeof renderDetail === 'function') renderDetail(projId);
  }

  function buildActionPanel(projId) {
    const canEdit = (typeof canEditProj === 'function') ? canEditProj(projId) : true;
    const items = (typeof ACTIONS !== 'undefined' ? ACTIONS : []).filter(a => String(a.projId) === String(projId));
    const today = new Date().toISOString().slice(0, 10);
    const open = items.filter(a => !a.done).length;
    const ovd = items.filter(a => a.due && !a.done && a.due < today).length;
    let head = 'ACTION ITEMS' + (open ? ' \u00b7 ' + open + ' terbuka' : '') + (ovd ? ' \u00b7 ' + ovd + ' overdue' : '');
    const addBtn = canEdit ? '<button class="btn btn-sm bp" onclick="addBlankAction(\'' + projId + '\')">+ Tugas</button>' : '<span style="font-size:9px;color:var(--mt)">hanya-baca</span>';
    let html = '<div class="' + (typeof cardCls === 'function' ? cardCls('actions') : 'card') + '" style="margin-bottom:9px"><div class="ct" style="display:flex;align-items:center;justify-content:space-between"><span style="color:' + (ovd ? 'var(--rd)' : 'var(--mt)') + '">' + (typeof cardChev === 'function' ? cardChev('actions') : '') + head + '</span>' + addBtn + '</div>';
    if (!items.length) {
      html += '<div style="font-size:11px;color:var(--mt);margin-top:8px;line-height:1.5">' + (canEdit ? 'Belum ada action item. Klik <b>+ Tugas</b>, atau tekan <b>+ Action</b> di panel Diagnosa &amp; Rekomendasi untuk mengubah saran menjadi tugas.' : 'Belum ada action item.') + '</div></div>';
      return html;
    }
    const sorted = items.slice().sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      const ao = (a.due && !a.done && a.due < today) ? 0 : 1, bo = (b.due && !b.done && b.due < today) ? 0 : 1;
      if (ao !== bo) return ao - bo;
      return String(a.due || '~').localeCompare(String(b.due || '~'));
    });
    const dis = canEdit ? '' : 'disabled ';
    html += '<div style="display:flex;flex-direction:column;gap:7px;margin-top:8px">';
    sorted.forEach(a => {
      const overdue = a.due && !a.done && a.due < today;
      html += '<div data-actid="' + a.id + '" style="background:var(--sf2);border:1px solid ' + (overdue ? 'var(--rd)' : 'var(--bd)') + ';border-radius:9px;padding:9px 11px">'
        + '<div style="display:flex;align-items:flex-start;gap:8px">'
        + '<input type="checkbox" ' + (a.done ? 'checked ' : '') + dis + (canEdit ? 'onchange="toggleActionDone(\'' + a.id + '\')" style="cursor:pointer;' : 'style="') + 'margin-top:2px;accent-color:var(--bl);width:15px;height:15px;flex-shrink:0">'
        + '<input value="' + _attr(a.text) + '" placeholder="Tindakan..." ' + (canEdit ? 'onchange="updateActionField(\'' + a.id + '\',\'text\',this.value)"' : 'readonly') + ' style="flex:1;min-width:0;background:transparent;border:none;color:' + (a.done ? 'var(--mt)' : 'var(--tx)') + ';font-size:11.5px;' + (a.done ? 'text-decoration:line-through;' : '') + 'outline:none;padding:0">'
        + (canEdit ? '<button class="btn" onclick="removeAction(\'' + a.id + '\')" style="padding:2px 7px;font-size:11px;flex-shrink:0;line-height:1">\u00d7</button>' : '')
        + '</div>'
        + '<div style="display:flex;gap:10px;align-items:center;margin-top:7px;padding-left:23px;flex-wrap:wrap">'
        + '<label style="display:flex;align-items:center;gap:5px;font-size:9px;color:var(--mt)">PIC <input value="' + _attr(a.pic) + '" placeholder="nama" ' + (canEdit ? 'onchange="updateActionField(\'' + a.id + '\',\'pic\',this.value)"' : 'disabled') + ' style="width:100px;background:var(--ib);border:1px solid var(--bd);border-radius:5px;color:var(--tx);font-size:10px;padding:3px 6px"></label>'
        + '<label style="display:flex;align-items:center;gap:5px;font-size:9px;color:var(--mt)">Tenggat <input type="date" value="' + _attr(a.due) + '" ' + (canEdit ? 'onchange="updateActionField(\'' + a.id + '\',\'due\',this.value)"' : 'disabled') + ' style="background:var(--ib);border:1px solid ' + (overdue ? 'var(--rd)' : 'var(--bd)') + ';border-radius:5px;color:' + (overdue ? 'var(--rd)' : 'var(--tx)') + ';font-size:10px;padding:3px 6px"></label>'
        + (overdue ? '<span style="font-size:9px;color:var(--rd);font-weight:600">Overdue</span>' : '')
        + '</div>'
        + '</div>';
    });
    html += '</div>' + (canEdit ? '<div style="font-size:9px;color:var(--mt);margin-top:8px;text-align:center;opacity:.8">Tahan (atau klik-kanan) item untuk aksi cepat</div>' : '') + '</div>';
    return html;
  }

  window.createActionFromRec = createActionFromRec;
  window.addBlankAction = addBlankAction;
  window.updateActionField = updateActionField;
  window.toggleActionDone = toggleActionDone;
  window.removeAction = removeAction;
  window.buildActionPanel = buildActionPanel;

  // ===== Long-press / klik-kanan -> menu cepat pada item Action =====
  function _findActRow(el) { while (el && el !== document) { if (el.getAttribute && el.getAttribute('data-actid')) return el; el = el.parentNode; } return null; }
  function _closeActMenu() { var m = document.getElementById('actLpMenu'); if (m) m.remove(); document.removeEventListener('click', _closeActMenu, true); document.removeEventListener('scroll', _closeActMenu, true); }
  window._actMenuDo = function (id, act) { _closeActMenu(); if (act === 'toggle') toggleActionDone(id); else if (act === 'del') removeAction(id); };
  function _showActMenu(row) {
    var id = row.getAttribute('data-actid');
    var a = (typeof ACTIONS !== 'undefined' ? ACTIONS : []).find(function (x) { return String(x.id) === String(id); });
    if (!a) return;
    if (typeof canEditProj === 'function' && !canEditProj(a.projId)) { if (typeof toast === 'function') toast('Hanya-baca: tidak bisa mengubah action ini', 'info'); return; }
    try { if (navigator.vibrate) navigator.vibrate(12); } catch (e) {}
    _closeActMenu();
    var r = row.getBoundingClientRect();
    var m = document.createElement('div'); m.id = 'actLpMenu';
    var left = Math.max(8, Math.min(r.left + 14, window.innerWidth - 184));
    var top = Math.min(r.bottom - 8, window.innerHeight - 116);
    m.style.cssText = 'position:fixed;z-index:9999;left:' + left + 'px;top:' + top + 'px;background:var(--sf2);border:1px solid var(--bd);border-radius:11px;box-shadow:0 10px 28px rgba(0,0,0,.45);padding:6px;min-width:172px;animation:cardExpand .15s ease';
    m.innerHTML =
      '<button class="btn" style="width:100%;justify-content:flex-start;margin-bottom:5px" onclick="_actMenuDo(\'' + id + '\',\'toggle\')">' + (a.done ? 'Tandai Belum' : 'Tandai Selesai') + '</button>'
      + '<button class="btn" style="width:100%;justify-content:flex-start;color:var(--rd);border-color:rgba(244,112,122,.35)" onclick="_actMenuDo(\'' + id + '\',\'del\')">Hapus</button>';
    document.body.appendChild(m);
    setTimeout(function () { document.addEventListener('click', _closeActMenu, true); document.addEventListener('scroll', _closeActMenu, true); }, 60);
  }
  var _lpTimer = null;
  function _skipLp(t) { return t && /^(input|textarea|button|select|svg|path)$/i.test(t.tagName); }
  document.addEventListener('touchstart', function (e) {
    if (_skipLp(e.target)) return;
    var row = _findActRow(e.target); if (!row) return;
    _lpTimer = setTimeout(function () { _lpTimer = null; _showActMenu(row); }, 480);
  }, { passive: true });
  function _cancelLp() { if (_lpTimer) { clearTimeout(_lpTimer); _lpTimer = null; } }
  document.addEventListener('touchend', _cancelLp);
  document.addEventListener('touchmove', _cancelLp);
  document.addEventListener('contextmenu', function (e) {
    if (_skipLp(e.target)) return;
    var row = _findActRow(e.target); if (!row) return;
    e.preventDefault(); _showActMenu(row);
  });
})();
