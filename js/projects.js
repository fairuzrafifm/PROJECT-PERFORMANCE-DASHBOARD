// ── ANIMASI: counter number untuk KPI ────────────────────────
function _countUp(el, target, suffix, duration) {
  if (!el) return;
  const prev = parseFloat(el.dataset.lastVal || 0);
  if (prev === target && !el.classList.contains('skel')) return;
  el.dataset.lastVal = target;
  el.classList.remove('skel');
  el.classList.add('flash');
  setTimeout(() => el.classList.remove('flash'), 400);
  if (duration <= 0 || target === 0) { el.textContent = target + (suffix||''); return; }
  const start = performance.now();
  const step = (ts) => {
    const p = Math.min((ts - start) / duration, 1);
    const e = 1 - Math.pow(1 - p, 3); // ease-out cubic
    el.textContent = Math.round(prev + (target - prev) * e) + (suffix||'');
    if (p < 1) requestAnimationFrame(step);
    else el.textContent = target + (suffix||'');
  };
  requestAnimationFrame(step);
}
function _countUpRp(el, target, duration) {
  if (!el) return;
  const prev = parseFloat(el.dataset.lastVal || 0);
  if (prev === target && !el.classList.contains('skel')) return;
  el.dataset.lastVal = target;
  el.classList.remove('skel');
  el.classList.add('flash');
  setTimeout(() => el.classList.remove('flash'), 400);
  if (duration <= 0 || target === 0) {
    el.textContent = typeof fmtRpShort==='function'?fmtRpShort(target):'Rp 0'; return;
  }
  const start = performance.now();
  const step = (ts) => {
    const p = Math.min((ts - start) / duration, 1);
    const e = 1 - Math.pow(1 - p, 3);
    const cur = Math.round(prev + (target - prev) * e);
    el.textContent = typeof fmtRpShort==='function'?fmtRpShort(cur):'Rp '+cur;
    if (p < 1) requestAnimationFrame(step);
    else el.textContent = typeof fmtRpShort==='function'?fmtRpShort(target):'Rp '+target;
  };
  requestAnimationFrame(step);
}

// ===============================================================
// OVERVIEW TAB
// ===============================================================
// Helper \u2014 update time lost KPI tanpa re-render seluruh overview
function updateTimeLostKPI(){
  const accTL=ACCLOGS.reduce((s,a)=>s+(+a.timeLost||0),0);
  const mpTL=MPLOGS.reduce((s,m)=>s+(+m.timeLost||0),0);
  const totTL=accTL+mpTL;
  const ov5=$('ov5');if(ov5){ov5.textContent=totTL+' hr';ov5.title=`Accident: ${accTL} hr + Weather/Lainnya: ${mpTL} hr`;}
  const tlt=$('tlt');if(tlt)tlt.textContent=totTL+' hrs';
  const tltAcc=$('tltAcc');if(tltAcc)tltAcc.textContent=accTL+' hrs';
  const tltMp=$('tltMp');if(tltMp)tltMp.textContent=mpTL+' hrs';
  const mp4=$('mp4');if(mp4)mp4.textContent=mpTL+' hr'; // mp4 hanya manpower time lost
  // Update breakdown di KPI card
  const ov5el=ov5?.parentElement;
  if(ov5el){
    let det=ov5el.querySelector('.tl-detail');
    if(!det){det=document.createElement('div');det.className='tl-detail';det.style.cssText='font-size:9px;color:var(--mt);margin-top:3px;line-height:1.5';ov5el.appendChild(det);}
    det.innerHTML=`<span style="color:var(--mt)">Acc: ${accTL}hr</span> + <span style="color:var(--mt)">Weather: ${mpTL}hr</span>`;
  }
}

function renderOV(){
  const today=new Date().toISOString().slice(0,10);
  const todayMp=MPLOGS.filter(m=>m.date===today);
  const mhAct=todayMp.reduce((s,m)=>s+(+m.mhActual||0),0);
  const mhPlan=P.reduce((s,p)=>s+(+p.mhPlan||0),0);
  // Kartu KPI "Skor Portofolio" (rata-rata kesehatan) menggantikan Total Projects
  (function(){
    var ps=(typeof portfolioScore==='function')?portfolioScore():null;
    var ov1=$('ov1'), sub=$('ov1sub');
    if(!ps||!ps.n){ if(ov1){ov1.classList.remove('skel');ov1.textContent='\u2014';ov1.style.color='var(--mt)';} if(sub)sub.textContent='Belum ada proyek'; }
    else { if(ov1)ov1.style.color=ps.color; _countUp(ov1,ps.avg,'/100',700); if(sub)sub.innerHTML=ps.n+' proyek aktif \u00b7 kesehatan keseluruhan'; }
  })();
  _countUp($('ov2'),mhAct,' jam',900);
  $('ov2s').textContent='Plan: '+mhPlan+' jam | Var: '+(mhAct-mhPlan>=0?'+':'')+(mhAct-mhPlan);
  $('ov2').style.color='var(--tx)';
  $('ovOT').textContent=P.filter(p=>p.status==='On Track').length;
  $('ovDL').textContent=P.filter(p=>p.status==='Delayed').length;
  $('ovCR').textContent=P.filter(p=>p.status==='Critical').length;
  _countUp($('ov4'),ISS.filter(i=>i.status!=='Closed').length,'',600);
  const accTL=ACCLOGS.reduce((s,a)=>s+(+a.timeLost||0),0);
  const mpTL=MPLOGS.reduce((s,m)=>s+(+m.timeLost||0),0);
  const totTL=accTL+mpTL;
  _countUp($('ov5'),totTL,' hr',750);
  $('ov5').title=`Accident: ${accTL} hr + Weather/Lainnya: ${mpTL} hr`;
  $('tlt').textContent=totTL+' hrs';
  if($('tltAcc'))$('tltAcc').textContent=accTL+' hrs';
  if($('tltMp'))$('tltMp').textContent=mpTL+' hrs';
  // Show breakdown below time lost card
  const ov5el=$('ov5').parentElement;
  let ov5detail=ov5el.querySelector('.tl-detail');
  if(!ov5detail){ov5detail=document.createElement('div');ov5detail.className='tl-detail';ov5detail.style.cssText='font-size:9px;color:var(--mt);margin-top:3px;line-height:1.5';ov5el.appendChild(ov5detail);}
  ov5detail.innerHTML=`<span style="color:var(--mt)">Acc: ${accTL}hr</span> + <span style="color:var(--mt)">Weather: ${mpTL}hr</span>`;
  // Total Cost KPI
  if($('ov6')){
    const allCosts=typeof getAllCosts==='function'?getAllCosts():[];
    const totalCost=allCosts.reduce((s,c)=>s+(+c.amount||0),0);
    const procCost=allCosts.filter(c=>c.type==='procurement').reduce((s,c)=>s+(+c.amount||0),0);
    const opexCost=allCosts.filter(c=>c.type!=='procurement').reduce((s,c)=>s+(+c.amount||0),0);
    _countUpRp($('ov6'),totalCost,900);
    if($('ov6s'))$('ov6s').innerHTML=`<span style="color:var(--mt)">Proc: ${typeof fmtRpShort==='function'?fmtRpShort(procCost):'0'}</span> · <span style="color:var(--mt)">OPEX: ${typeof fmtRpShort==='function'?fmtRpShort(opexCost):'0'}</span>`;
  }

  // WEATHER
  const wmap={'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;display:inline-block"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg> Sunny':'Sunny','Partly Cloudy':'Partly Cloudy','Partly Overcast':'Overcast','Rainy':'Rainy','Thunderstorm':'Thunderstorm','Foggy':'Foggy'};
  const wico={Sunny:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;display:inline-block"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>','Partly Cloudy':'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;display:inline-block"><path d="M12 2v2M4.93 4.93l1.41 1.41M20 12h2M19.07 4.93l-1.41 1.41M15.947 12.65a4 4 0 0 0-5.925-4.128"/><path d="M13 22H7a5 5 0 1 1 4.9-6H13a3 3 0 0 1 0 6z"/></svg>',Overcast:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;display:inline-block"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9z"/></svg>',Rainy:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;display:inline-block"><path d="M20 17.58A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 4 16.25"/><line x1="8" y1="19" x2="8" y2="21"/><line x1="8" y1="13" x2="8" y2="15"/><line x1="16" y1="19" x2="16" y2="21"/><line x1="16" y1="13" x2="16" y2="15"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="12" y1="15" x2="12" y2="17"/></svg>',Thunderstorm:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;display:inline-block"><path d="M19 16.9A5 5 0 0 0 18 7h-1.26a8 8 0 1 0-11.62 9"/><polyline points="13 11 9 17 15 17 11 23"/></svg>',Foggy:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;display:inline-block"><line x1="3" y1="8" x2="21" y2="8"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="16" x2="21" y2="16"/></svg>'};
  const wclr={Sunny:'var(--yw)','Partly Cloudy':'var(--tx)',Overcast:'var(--mt)',Rainy:'var(--bl)',Thunderstorm:'var(--rd)',Foggy:'var(--mt)'};
  const wg=$('weatherGrid');
  if(!P.length){wg.innerHTML='<div style="grid-column:1/-1;text-align:center;color:var(--mt);font-size:12px;padding:20px">Belum ada project</div>';}
  else{wg.innerHTML=P.slice(0,6).map(p=>{
    const raw=p.weather||'Partly Cloudy';
    const desc=wmap[raw]||raw.replace(/^[^\s]+\s/,'');
    return `<div class="wi"><div class="wi-ico">${wico[desc]||''}</div><div class="wi-name">${p.nama.split(' ').slice(0,3).join(' ')}</div><div class="wi-desc" style="color:${wclr[desc]||'var(--tx)'}">${desc}</div></div>`;
  }).join('');
  // Animate progress bars after DOM render
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    const _el=$('projStatusCards');
    if(_el)_el.querySelectorAll('.psc-bar-fill[data-w]').forEach(b=>{
      b.style.width = (b.dataset.w||0)+'%';
    });
  }));
}

  // ACCIDENT LOG aggregate
  const agg={fatality:0,lti:0,minorInjury:0,medTreatment:0,propertyDamage:0,fire:0,traffic:0,environment:0,nearMiss:0};
  ACCLOGS.forEach(a=>Object.keys(agg).forEach(k=>agg[k]+=(+a[k]||0)));
  const rows=[['Fatality Case','fatality',true],['Lost Time Injury','lti',true],['Minor Injury','minorInjury',false],['Medical Treatment','medTreatment',false],['Property Damage','propertyDamage',false],['Fire','fire',false],['Traffic Case','traffic',false],['Near Miss','nearMiss',false]];
  // Summary aggregat
  const summaryHtml=rows.map(([l,k,crit])=>`<div class="acc-row"><span style="color:var(--mt)">${l}</span><span class="acc-val" style="color:${(agg[k]||0)>0?(crit?'var(--rd)':'var(--or)'):'var(--mt)'}">${(agg[k]||0)>0?agg[k]:'\u2014'}</span></div>`).join('');
  // Recent entries list with edit button
  const recentHtml=ACCLOGS.length>0?`
    <div style="margin-top:8px;padding-top:7px;border-top:1px dashed var(--bd);font-size:10px;color:var(--mt);margin-bottom:4px">Log terbaru:</div>
    ${ACCLOGS.slice(-3).reverse().map(a=>{
      const pr=P.find(p=>p.id===a.projId);
      return `<div style="display:flex;align-items:center;gap:6px;padding:3px 0;border-bottom:1px solid rgba(30,45,69,.3);font-size:10px">
        <span style="font-family:var(--fm);color:var(--mt);flex-shrink:0">${fmtDate(a.date)}</span>
        <span style="color:var(--mt);flex-shrink:0">${pr?.kode||'\u2014'}</span>
        <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--mt)">${a.notes||'Kejadian tercatat'}</span>
        ${a.timeLost>0?`<span style="color:var(--rd);font-family:var(--fm);flex-shrink:0">${a.timeLost}hr</span>`:''}
        <button class="btn btn-sm" style="padding:1px 5px;font-size:9px;flex-shrink:0" onclick="editAccLog('${a.id}')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;display:inline-block"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
      </div>`;
    }).join('')}` : '';
  $('accLog').innerHTML=summaryHtml+recentHtml;

  // PROC STATUS
  const ps={Overdue:0,'Due Today':0,'In Transit':0,'On Site':0,'Waiting Approval':0,'PO Issued':0};
  PROC.forEach(i=>{if(ps[i.status]!==undefined)ps[i.status]++;});
  const pc={Overdue:'var(--rd)','Due Today':'var(--yw)','In Transit':'var(--bl)','On Site':'var(--gn)','Waiting Approval':'var(--pu)','PO Issued':'#a9b4f5'};
  $('procGrid').innerHTML=Object.entries(ps).map(([k,v])=>`<div class="proc-item"><div class="proc-dot" style="background:${pc[k]||'var(--mt)'}"></div><div class="proc-lbl">${k}</div><div class="proc-cnt" style="color:${pc[k]||'var(--mt)'}">${v}</div></div>`).join('');

  renderProjStatusCards();
}

// ── Hitung plan% project untuk minggu SAAT INI (dari SCURVE — konsisten dengan WBS tab) ──
function _calcProjCurrentPlan(projId) {
  var proj = P.find(function(p){ return String(p.id)===String(projId); });
  if (!proj) return 0;
  // Current week
  var weekNum = _getProjCurrentWeek(proj);
  if (!weekNum) return +(proj.plan||0);
  // Ambil dari SCURVE (sama persis dengan yang ditampilkan di tab WBS S-Curve)
  if (typeof SCURVE !== 'undefined' && SCURVE.length) {
    var scData = SCURVE.filter(function(s){ return String(s.projId)===String(projId); })
                       .sort(function(a,b){ return a.week-b.week; });
    var todayW = scData.filter(function(s){ return +s.week<=weekNum; }).slice(-1)[0];
    if (todayW) return Math.round((+todayW.cPlan||0)*10)/10;
  }
  return +(proj.plan||0);
}

// ── Ambil current week number untuk project ────────────────────
function _getProjCurrentWeek(proj) {
  if (!proj || !proj.mulai) return 0;
  var ms = new Date(proj.mulai).getTime();
  if (isNaN(ms)) return 0;
  return Math.max(1, Math.ceil((Date.now()-ms)/(7*24*3600*1000)));
}


function renderProjStatusCards(){
  const el=$('projStatusCards');
  if(!el)return;
  if(!P.length){el.innerHTML='<div style="text-align:center;color:var(--mt);font-size:12px;padding:20px;grid-column:1/-1">Belum ada project \u2014 tambah project untuk melihat status cards</div>';return;}
  const q=(gv('ovSearch')||'').toLowerCase();
  const fs=gv('ovFiltStatus')||'';
  const filtered=P.filter(p=>{
    if(fs&&p.status!==fs)return false;
    if(q&&!p.nama?.toLowerCase().includes(q)&&!p.kode?.toLowerCase().includes(q)&&!p.lokasi?.toLowerCase().includes(q))return false;
    return true;
  });
  if(!filtered.length){el.innerHTML='<div style="text-align:center;color:var(--mt);font-size:12px;padding:20px;grid-column:1/-1">Tidak ada project cocok dengan filter</div>';return;}
  // Analisis Diagnosa per kartu (skor/CPI/serapan/flag) + urutkan paling perlu perhatian di atas
  const _pa={};
  filtered.forEach(p=>{ try{ _pa[p.id]=(typeof analyzeProject==='function')?analyzeProject(p.id):null; }catch(e){ _pa[p.id]=null; } });
  filtered.sort((a,b)=>{ const sa=_pa[a.id]?_pa[a.id].score:999, sb=_pa[b.id]?_pa[b.id].score:999; return sa-sb; });
  const _logoFallback='<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>';
  const statusCls={'On Track':'on','Delayed':'del','Critical':'crit','Planning':'plan','Done':'done'};
  const barClr={'On Track':'linear-gradient(90deg,var(--gn),#6fe7b8)','Delayed':'linear-gradient(90deg,var(--yw),#fae3a3)','Critical':'linear-gradient(90deg,var(--rd),#f4707a)','Planning':'linear-gradient(90deg,var(--bl),#a9b4f5)','Done':'linear-gradient(90deg,var(--pu),#a78bfa)'};
  const metClr={'On Track':'var(--gn)','Delayed':'var(--yw)','Critical':'var(--rd)','Planning':'var(--bl)','Done':'var(--pu)'};
  const pillBg={'On Track':'rgba(61,220,151,.15)','Delayed':'rgba(245,196,82,.15)','Critical':'rgba(244,112,122,.15)','Planning':'rgba(124,140,240,.15)','Done':'rgba(139,92,246,.15)'};
  const pillClr={'On Track':'var(--gn)','Delayed':'var(--yw)','Critical':'var(--rd)','Planning':'var(--bl)','Done':'var(--pu)'};
  el.innerHTML=filtered.map(p=>{
    const pIss=ISS.filter(i=>i.projId===p.id&&i.status!=='Closed').length;
    const rem=p.selesai?Math.max(0,Math.ceil((new Date(p.selesai)-new Date())/86400000)):'—';
    const mc=metClr[p.status]||'var(--bl)';
    const bc=barClr[p.status]||'var(--bl)';
    const curWeekPlan=_calcProjCurrentPlan(p.id);
    const curWeekNum=_getProjCurrentWeek(p);
    const spi=curWeekPlan>0?(p.actual/curWeekPlan).toFixed(2):'—';
    const vReal=p.actual-curWeekPlan;
    const varCls=vReal>0?'var-pos':vReal<0?'var-neg':'var-zero';
    const varTxt=(vReal>0?'+':'')+vReal.toFixed(1)+'%';
    const etaClr=p.status==='Critical'?'var(--rd)':vReal<0?'var(--yw)':'var(--tx)';
    const etaTxt=p.status==='Critical'?'Needs Review ●':p.status==='Done'?'Selesai':rem==='\u2014'?'\u2014':new Date(p.selesai).toLocaleDateString('id-ID',{day:'2-digit',month:'short',year:'numeric'});
    const scls=statusCls[p.status]||'plan';
    const _a=_pa[p.id]||null;
    const _hcpi=(_a&&_a.cpi!=null)?_a.cpi.toFixed(2):'\u2014';
    const _hserap=(_a&&_a.serap!=null)?Math.round(_a.serap)+'%':'\u2014';
    const _cpiClr=(_a&&_a.cpi!=null)?(_a.cpi>=1?'var(--gn)':_a.cpi>=0.95?'var(--yw)':'var(--rd)'):'var(--mt)';
    const _hOver=(_a&&_a.eacOver!=null&&_a.eacOver>0)?_a.eacOver:0;
    const _hDelay=(_a&&_a.fcDelay!=null&&_a.fcDelay>0)?_a.fcDelay:0;
    const _chip=(lbl,val,clr,tip)=>`<span title="${tip||''}" style="display:inline-flex;gap:4px;align-items:center;font-size:9.5px;background:var(--sf2);border:1px solid var(--bd);border-radius:6px;padding:2px 7px;color:var(--mt);white-space:nowrap;cursor:${tip?'help':'default'}">${lbl} <b style="color:${clr};font-weight:700">${val}</b></span>`;
    let _diag=_chip('CPI',_hcpi,_cpiClr,'CPI = efisiensi biaya. >1 = hemat, <1 = boros (Earned Value / biaya nyata).')+_chip('Serapan',_hserap,'var(--tx)','Serapan = persentase anggaran RAB yang sudah terpakai (biaya nyata / total RAB).');
    if(_hOver)_diag+=_chip('<span style="color:var(--rd)">Over</span>',(typeof fmtRpShort==='function'?fmtRpShort(_hOver):_hOver),'var(--rd)','Proyeksi biaya akhir (EAC) melebihi RAB sebesar ini.');
    if(_hDelay)_diag+=_chip('<span style="color:var(--yw)">Telat</span>','~'+_hDelay+' hr','var(--yw)','Proyeksi keterlambatan berdasarkan tren progres saat ini.');
    const _diagStrip=_a?`<div style="display:flex;gap:5px;flex-wrap:wrap;margin:0 0 12px">${_diag}</div>`:'';
    const _scoreBadge=(_a&&_a.score!=null)?`<div title="Skor kesehatan dari mesin Diagnosa (0\u2013100), terpisah dari status proyek." style="margin-top:7px;display:flex;align-items:center;gap:5px;white-space:nowrap;cursor:help"><span style="width:7px;height:7px;border-radius:50%;background:${_a.health.c};flex-shrink:0"></span><span style="font-size:9px;color:var(--mt)">Skor</span><b style="font-size:12px;color:${_a.health.c};font-weight:800;line-height:1">${_a.score}</b><span style="font-size:8px;color:var(--mt)">/100 \u00b7 ${_a.health.t}</span></div>`:'';
    return `<div class="psc ${scls}" onclick="selProj('${p.id}');sw('projects',document.querySelectorAll('.tab')[1])">
      <div class="psc-head">
        ${p.logo
          ? `<div style="width:48px;height:48px;background:#fff;border:1px solid var(--bd);border-radius:8px;display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0;padding:4px"><img src="${p.logo}" style="max-width:40px;max-height:40px;object-fit:contain" onerror="this.style.display='none'"></div>`
          : `<div style="width:48px;height:48px;background:var(--sf2);border:1px solid var(--bd);border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0;color:var(--mt)">${_logoFallback}</div>`}
        <div style="flex:1;min-width:0;margin-left:10px">
          <div class="psc-name">${p.nama} <span style="font-family:var(--fm);font-size:9px;color:var(--mt);font-weight:400">\u2014 ${p.kode}</span></div>
          <div class="psc-loc"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;display:inline-block"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg> ${p.lokasi||'\u2014'}${p.client&&!p.logo?' · '+p.client:''}  </div>
          ${(p.picPm||p.picSm)?`<div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:3px">
            ${p.picPm?`<span style="font-size:9px;background:var(--sf2);color:var(--tx);padding:1px 6px;border-radius:6px;border:1px solid var(--bd)"><b>PM</b> ${safeStr(p.picPm)}</span>`:''}
            ${p.picSm?`<span style="font-size:9px;background:var(--sf2);color:var(--tx);padding:1px 6px;border-radius:6px;border:1px solid var(--bd)"><b>SM</b> ${safeStr(p.picSm)}</span>`:''}
          </div>`:''}
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;flex-shrink:0;margin-left:8px">
          <div style="background:${pillBg[p.status]||'rgba(124,140,240,.15)'};color:${pillClr[p.status]||'var(--bl)'};border:1px solid ${pillClr[p.status]||'var(--bl)'}44;border-radius:20px;padding:3px 10px;font-size:10px;font-weight:700;letter-spacing:.5px;white-space:nowrap">${p.status.toUpperCase()}</div>
          ${_scoreBadge}
        </div>
      </div>
      ${_diagStrip}
      <div class="psc-metrics">
        <div class="psc-m">
          <div class="psc-mv" style="color:var(--tx)">${(+p.actual||0).toFixed(1)}%</div>
          <div class="psc-ml">Progress</div>
        </div>
        <div class="psc-m">
          <div class="psc-mv" style="color:${spi==='\u2014'?'var(--mt)':'var(--tx)'}">${spi}</div>
          <div class="psc-ml">SPI</div>
        </div>
        <div class="psc-m">
          <div class="psc-mv" style="color:${(p.mpActual||0)>0?'var(--tx)':'var(--mt)'}">${p.mpActual||0}</div>
          <div class="psc-ml">Workers/hari</div>
        </div>
        <div class="psc-m">
          <div class="psc-mv" style="color:${pIss>0?'var(--tx)':'var(--mt)'}">${pIss}</div>
          <div class="psc-ml">Issues</div>
        </div>
      </div>
      <div class="psc-bar-wrap">
        <div class="psc-bar-lbl"><span>Actual</span><span style="color:var(--tx)">${(+p.actual||0).toFixed(1)}%</span></div>
        <div class="psc-bar"><div class="psc-bar-fill" style="width:0%;background:${bc}" data-w="${p.actual}"></div></div>
      </div>
      <div class="psc-bar-wrap">
        <div class="psc-bar-lbl">
          <span>Plan${curWeekNum?` <span style="font-size:8px;background:rgba(124,140,240,.12);color:var(--bl);border:1px solid rgba(124,140,240,.25);border-radius:8px;padding:0 5px;font-family:var(--fm)">W${String(curWeekNum).padStart(2,'0')}</span>`:''}
          </span>
          <span style="color:var(--tx)">${curWeekPlan.toFixed(1)}%</span>
        </div>
        <div class="psc-bar"><div class="psc-bar-fill" style="width:0%;background:rgba(124,140,240,.45)" data-w="${curWeekPlan}"></div></div>
      </div>
      ${(()=>{
        if(!p.mulai||!p.selesai)return '';
        const start=new Date(p.mulai),end=new Date(p.selesai),now2=new Date();
        const total=end-start,elapsed=Math.min(Math.max(now2-start,0),total);
        const timePct=total>0?Math.round(elapsed/total*100):0;
        const daysLeft=Math.max(0,Math.ceil((end-now2)/86400000));
        const timeClr=timePct>90?'var(--rd)':timePct>70?'var(--yw)':'var(--bl)';
        return `<div class="psc-timeline">
          <div class="psc-timeline-lbl">
            <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;display:inline-block"><path d="M3 12h18"/><circle cx="7" cy="12" r="2"/><circle cx="17" cy="12" r="2"/><path d="M7 7v2m0 6v2M17 7v2m0 6v2"/></svg> Timeline</span>
            <span style="color:var(--tx)">${timePct}% waktu terpakai · ${daysLeft}h lagi</span>
          </div>
          <div class="psc-timeline-track">
            <div class="psc-timeline-fill" style="width:${timePct}%;background:linear-gradient(90deg,${timeClr},${timeClr}88)"></div>
          </div>
        </div>`;
      })()}
      <div class="psc-footer">
        <span style="color:var(--mt)">Variance: <span class="var-badge ${varCls}">${varTxt}</span></span>
        <span style="color:${etaClr}">ETA: ${etaTxt}</span>
      </div>
    </div>`;
  }).join('');
}
function renderProjTab(){
  const n=P.length;
  $('pk1').textContent=n;
  if(!n)return;
  // SPI Portfolio = rata-rata SPI semua project yang punya plan > 0
  const vl=P.filter(p=>typeof _calcProjCurrentPlan==='function'?_calcProjCurrentPlan(p.id)>0:p.plan>0);
  const spiPortfolio=vl.length>0?(vl.reduce((s,p)=>{const cp=typeof _calcProjCurrentPlan==='function'?_calcProjCurrentPlan(p.id):p.plan;return s+(cp>0?p.actual/cp:0);},0)/vl.length):0;
  const spiTxt=vl.length>0?spiPortfolio.toFixed(2):'\u2014';
  const spiClr=spiPortfolio>=1?'var(--gn)':spiPortfolio>=0.85?'var(--yw)':'var(--rd)';
  const spiSub=vl.length>0?(spiPortfolio>=1?'<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;display:inline-block"><polyline points="20 6 9 17 4 12"/></svg> On target':spiPortfolio>=0.85?'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;display:inline-block"><path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><line x1="12" y1="9" x2="12" y2="13"/><circle cx="12" cy="17" r=".5" fill="currentColor"/></svg> Slightly behind':'Behind schedule'):'Belum ada data';
  $('pk2').textContent=spiTxt;
  $('pk2').style.color=spiClr;
  $('pk2s').textContent=spiSub;
  $('pk3').textContent=P.reduce((s,p)=>s+(p.mpActual||0),0);
  $('pk3s').textContent='';
  const critCount=P.filter(p=>p.status==='Critical').length;
  const delCount=P.filter(p=>p.status==='Delayed').length;
  $('pk4').textContent=critCount;
  $('pk4s').textContent=delCount>0?`+ ${delCount} Delayed`:'Semua aman';
  $('pk4s').style.color=delCount>0?'var(--yw)':'var(--mt)';
  $('pk5').textContent=ISS.filter(i=>i.status!=='Closed').length;
  if(selId)renderDetail(selId);
}

function renderDetail(id){
  const p=P.find(x=>x.id===id);if(!p)return;
  const _canEdit=(typeof canEditProj==='function')?canEditProj(p.id):true; // Fase 3b: gating tombol aksi
  // Gunakan plan minggu ini (bukan nilai final p.plan)
  const _cp=typeof _calcProjCurrentPlan==='function'?_calcProjCurrentPlan(id):p.plan;
  const v=Math.round((p.actual-_cp)*100)/100,spi=_cp>0?(p.actual/_cp).toFixed(2):'\u2014';
  const vcl=v>0?'var(--gn)':v<0?'var(--rd)':'var(--mt)';
  const bc={'On Track':'linear-gradient(90deg,var(--gn),#6fe7b8)','Delayed':'linear-gradient(90deg,var(--yw),#fae3a3)','Critical':'linear-gradient(90deg,var(--rd),#f4707a)','Planning':'linear-gradient(90deg,var(--bl),#a9b4f5)','Done':'linear-gradient(90deg,var(--pu),#a78bfa)'}[p.status]||'var(--bl)';
  const sc={'On Track':'p-on','Delayed':'p-del','Critical':'p-crit','Planning':'p-plan','Done':'p-done'};
  const rem=p.selesai?Math.max(0,Math.ceil((new Date(p.selesai)-new Date())/86400000)):'\u2014';
  const pIss=ISS.filter(i=>i.projId===id&&i.status!=='Closed');
  const mdActualDetail=MPLOGS.filter(m=>m.projId===id).reduce((s,m)=>s+(+m.total||0),0);
  const mdPlanDetail=+p.mdPlan||+p.mpPlan||0;
  const mdPct=mdPlanDetail>0?Math.min(Math.round(mdActualDetail/mdPlanDetail*100),100):0;
  // ── Ringkasan Biaya (RAB vs realisasi) + CPI + Procurement + Manpower ──
  const _pid=String(p.id);
  const _rp=x=>(typeof fmtRp==='function')?fmtRp(x):'Rp '+Math.round(+x||0).toLocaleString('id-ID');
  const _rabBudget=RAB.filter(r=>String(r.projId)===_pid&&r.type==='item').reduce((s,r)=>s+(+r.total||0),0);
  const _costsP=COSTS.filter(c=>String(c.projId)===_pid&&!c._deleted);
  const _costProc=_costsP.filter(c=>c.type==='procurement').reduce((s,c)=>s+(+c.amount||0),0);
  const _costOpex=_costsP.filter(c=>c.type!=='procurement').reduce((s,c)=>s+(+c.amount||0),0);
  const _costReal=_costProc+_costOpex;
  const _serapPct=_rabBudget>0?Math.round(_costReal/_rabBudget*1000)/10:0;
  const _ev=_rabBudget*((+p.actual||0)/100);                 // earned value = progres fisik × budget
  const _cpi=_costReal>0?Math.round(_ev/_costReal*100)/100:null; // CPI = EV / biaya aktual
  const _cpiClr=_cpi===null?'var(--mt)':(_cpi>=1?'var(--gn)':_cpi>=0.85?'var(--yw)':'var(--rd)');
  // ── Forecast / Estimasi (jadwal via SPI, biaya via CPI/EAC) ──
  const _spiNum=_cp>0?(p.actual/_cp):null;
  const _startD=p.mulai?new Date(p.mulai):null,_endD=p.selesai?new Date(p.selesai):null;
  let _fcFinish=null,_fcDelay=null;
  if(_startD&&_endD&&_spiNum&&_spiNum>0&&!isNaN(_startD.getTime())&&!isNaN(_endD.getTime())&&(+p.actual||0)<99.5){
    const _plannedDur=Math.max(1,(_endD-_startD)/86400000);
    _fcFinish=new Date(_startD.getTime()+(_plannedDur/_spiNum)*86400000);
    _fcDelay=Math.round((_fcFinish-_endD)/86400000);
  }
  const _eac=(_cpi&&_cpi>0)?_rabBudget/_cpi:null;
  const _eacOver=_eac!=null?(_eac-_rabBudget):null;
  const _fcNote=(+p.actual||0)>=99.5?'<span style="color:var(--gn)">Proyek hampir/sudah selesai</span>'
    :_fcDelay==null?'<span style="color:var(--mt)">Butuh progres aktual untuk estimasi</span>'
    :_fcDelay>3?`<span style="color:var(--rd)">Telat ~${_fcDelay} hari dari rencana</span>`
    :_fcDelay<-3?`<span style="color:var(--gn)">Lebih cepat ~${Math.abs(_fcDelay)} hari</span>`
    :'<span style="color:var(--gn)">\u2248 Sesuai jadwal</span>';
  const _eacNote=_eacOver==null?'<span style="color:var(--mt)">Belum ada data biaya</span>'
    :_eacOver>0?`<span style="color:var(--rd)">Proyeksi over ~${_rp(_eacOver)}</span>`
    :`<span style="color:var(--gn)">Proyeksi hemat ~${_rp(Math.abs(_eacOver))}</span>`;
  const _procP=PROC.filter(i=>String(i.projId)===_pid);
  const _pc=s=>_procP.filter(i=>i.status===s).length;
  const _pDone=_pc('On Site')+_pc('Done');
  const _pOverdue=_pc('Overdue');
  const _pProgress=_pc('In Transit')+_pc('PO Issued')+_pc('Waiting Approval')+_pc('Due Today');
  const _pTotal=_procP.length;
  const _mpP=MPLOGS.filter(m=>String(m.projId)===_pid);
  const _fmtKey=dt=>dt.getFullYear()+'-'+String(dt.getMonth()+1).padStart(2,'0')+'-'+String(dt.getDate()).padStart(2,'0');
  const _td0=new Date();_td0.setHours(0,0,0,0);
  const _last7=[];
  for(let _i=6;_i>=0;_i--){const _dt=new Date(_td0);_dt.setDate(_dt.getDate()-_i);const _k=_fmtKey(_dt);_last7.push({day:_dt.getDate(),val:_mpP.filter(m=>String(m.date).slice(0,10)===_k).reduce((s,m)=>s+(+m.total||0),0)});}
  const _mp7max=Math.max(..._last7.map(d=>d.val),1);
  const _mp7avg=Math.round(_last7.reduce((s,d)=>s+d.val,0)/7*10)/10;
  // ── Analisa Produktivitas (dari MPLOGS) ──
  let _mhTot=0,_tlTot=0,_roles={SPV:0,Mandor:0,Installer:0,Tukang:0,Helper:0,Safety:0};
  _mpP.forEach(m=>{
    _mhTot+=+m.mhActual||0;_tlTot+=+m.timeLost||0;
    (m.activities||[]).forEach(a=>{_roles.SPV+=+a.spv||0;_roles.Mandor+=+a.mandor||0;_roles.Installer+=+a.installer||0;_roles.Tukang+=+a.tukang||0;_roles.Helper+=+a.helper||0;_roles.Safety+=+a.safety||0;});
  });
  const _mdPer1=(+p.actual>0)?(mdActualDetail/+p.actual):null;
  const _projTotMD=_mdPer1!=null?Math.round(_mdPer1*100):null;
  const _roleSum=Object.values(_roles).reduce((s,v)=>s+v,0);
  const _tlRatio=(_mhTot+_tlTot)>0?Math.round(_tlTot/(_mhTot+_tlTot)*1000)/10:0;
  const _prodNote=_mdPer1==null?'<span style="color:var(--mt)">Belum ada progres untuk dihitung</span>'
    :(_projTotMD!=null&&mdPlanDetail>0&&_projTotMD>mdPlanDetail*1.1)?`<span style="color:var(--rd)">Proyeksi ${_projTotMD} MD &gt; plan ${mdPlanDetail} MD</span>`
    :(_projTotMD!=null&&mdPlanDetail>0)?`<span style="color:var(--gn)">Proyeksi ${_projTotMD} MD vs plan ${mdPlanDetail} MD</span>`
    :`<span style="color:var(--mt)">Proyeksi total ~${_projTotMD} MD di 100%</span>`;
  const _tlNote=_tlRatio>10?`<span style="color:var(--rd)">${_tlRatio}% dari total jam</span>`:`<span style="color:var(--mt)">${_tlRatio}% dari total jam</span>`;
  // ── HSE / Safety (dari ACCLOGS) ──
  const _acc=(typeof ACCLOGS!=='undefined'?ACCLOGS:[]).filter(a=>String(a.projId)===String(p.id));
  const _accSum=(f)=>_acc.reduce((s,a)=>s+(+a[f]||0),0);
  const _fatal=_accSum('fatality'),_lti=_accSum('lti'),_minor=_accSum('minorInjury'),_med=_accSum('medTreatment');
  const _nearMiss=_accSum('nearMiss'),_prop=_accSum('propertyDamage'),_fire=_accSum('fire'),_traf=_accSum('traffic'),_env=_accSum('environment');
  const _recordable=_fatal+_lti+_minor+_med;
  const _incDates=_acc.filter(a=>((+a.fatality||0)+(+a.lti||0)+(+a.minorInjury||0)+(+a.medTreatment||0))>0&&a.date).map(a=>new Date(a.date)).filter(d=>!isNaN(d.getTime()));
  let _daysNoInc=null,_incSub='Belum ada insiden tercatat';
  if(_incDates.length){const _lastInc=new Date(Math.max.apply(null,_incDates));_daysNoInc=Math.max(0,Math.floor((new Date()-_lastInc)/86400000));_incSub='sejak insiden terakhir '+(fmtDate(_lastInc)||'');}
  else if(p.mulai){const _sd=new Date(p.mulai);if(!isNaN(_sd.getTime())){_daysNoInc=Math.max(0,Math.floor((new Date()-_sd)/86400000));_incSub='sejak proyek dimulai \u2014 nihil insiden';}}
  const _recSub=_recordable>0?`<span style="color:var(--rd)">Fatal ${_fatal} \u00b7 LTI ${_lti} \u00b7 Ringan ${_minor} \u00b7 Medis ${_med}</span>`:'<span style="color:var(--gn)">Nihil cedera</span>';
  const _otherInc=[['Properti',_prop],['Kebakaran',_fire],['Lalin',_traf],['Lingkungan',_env]].filter(x=>x[1]>0);
  // Strip ringkas (sekilas pandang)
  const _an=(typeof analyzeProject==='function')?analyzeProject(p.id):null;
  const _aToday=new Date().toISOString().slice(0,10);
  const _actAll=(typeof ACTIONS!=='undefined'?ACTIONS:[]).filter(a=>String(a.projId)===String(p.id));
  const _actOpen=_actAll.filter(a=>!a.done).length;
  const _actOvd=_actAll.filter(a=>a.due&&!a.done&&a.due<_aToday).length;
  $('detail').innerHTML=`<div class="fade">
    <div class="dtop" style="margin-bottom:11px">
      <div><div class="dname">${p.nama}</div>
        <div class="dmeta"><span class="pill ${sc[p.status]||'p-plan'}">${p.status}</span><span>${p.kode}</span><span style="color:var(--bd)">·</span><span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;display:inline-block"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>${p.lokasi||'\u2014'}</span><span style="color:var(--bd)">·</span>${p.logo?`<img src="${p.logo}" style="height:36px;max-width:120px;object-fit:contain;border-radius:4px;vertical-align:middle" onerror="this.style.display='none'">`:`<span>${p.client||'\u2014'}</span>`}${p.weather?`<span>${p.weather}</span>`:''}${p.picPm?`<span style="font-size:10px;background:rgba(139,92,246,.12);color:var(--pu);padding:2px 7px;border-radius:10px;border:1px solid rgba(139,92,246,.2)"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;display:inline-block"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> ${p.picPm}</span>`:''}</div>
      </div>
      ${_canEdit ? `<div style="display:flex;gap:6px"><button class="btn btn-sm" onclick="openModal('editProj','${p.id}')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;display:inline-block"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> Edit</button>${(typeof currentRole!=='undefined'&&currentRole==='admin')?`<button class="btn btn-sm" onclick="openCloneModal('${p.id}')" style="border-color:var(--bl);color:var(--bl)" title="Clone WBS ke project baru">${ic('copy',13)} Clone</button>`:''}<button class="btn btn-sm bp" onclick="openModal('updProgress')">${ic('arrowUp',13)} Update</button></div>` : `<div style="display:flex;align-items:center"><span style="font-size:10px;font-weight:600;padding:4px 10px;border-radius:8px;background:rgba(245,196,82,.12);color:var(--yw);border:1px solid rgba(245,196,82,.25);display:inline-flex;align-items:center;gap:5px" title="Anda tidak di-assign ke proyek ini — hanya bisa melihat"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> Read-only</span></div>`}
    </div>
    <div class="g4" style="margin-bottom:9px">
      <div class="metric"><div class="mv" style="color:${vcl}">${v>0?'+':''}${v}%</div><div class="ml">Variance</div></div>
      <div class="metric"><div class="mv" style="color:${spi>=1?'var(--gn)':'var(--rd)'}">${spi}</div><div class="ml">SPI</div></div>
      <div class="metric"><div class="mv" style="color:var(--tx)">${p.mpActual||0}</div><div class="ml">Workers/hari</div></div>
      <div class="metric"><div class="mv" style="color:${typeof rem==='number'&&rem<30?'var(--rd)':'var(--yw)'}">${rem}${typeof rem==='number'?' hr':''}</div><div class="ml">Sisa Hari</div></div>
    </div>
    <div class="detail-summary">
      ${_an?`<span class="dsum-chip"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${_an.health.c}"></span>Kesehatan <b style="color:${_an.health.c}">${_an.health.t} · ${_an.score}/100</b></span>`:''}
      <span class="dsum-chip">Action terbuka <b>${_actOpen}</b>${_actOvd?` <span style="color:var(--rd)">· ${_actOvd} overdue</span>`:''}</span>
      ${_an&&_an.findings&&_an.findings.filter(f=>f.sev==='crit').length?`<span class="dsum-chip"><span style="color:var(--rd)">${_an.findings.filter(f=>f.sev==='crit').length} temuan kritis</span></span>`:''}
    </div>
    <div class="card" style="margin-bottom:9px">
      <div class="ct">PROGRESS PLAN VS ACTUAL</div>
      ${(()=>{const _cp=_calcProjCurrentPlan(p.id);const _wn=_getProjCurrentWeek(p);const _wlbl=_wn?` <span style="font-size:8px;background:rgba(124,140,240,.12);color:var(--bl);border:1px solid rgba(124,140,240,.25);border-radius:8px;padding:0 5px;font-family:var(--fm);font-weight:700">W${String(_wn).padStart(2,'0')}</span>`:'';return `<div class="pr"><div class="pl">Actual</div><div class="pb"><div class="pf" style="width:${p.actual}%;background:${bc}"></div></div><div class="pn" style="color:var(--gn)">${(+p.actual||0).toFixed(1)}%</div></div><div class="pr"><div class="pl">Plan${_wlbl}</div><div class="pb"><div class="pf" style="width:${_cp}%;background:linear-gradient(90deg,var(--bl),#a9b4f5);opacity:.5"></div></div><div class="pn" style="color:var(--tx)">${_cp.toFixed(1)}%</div></div>`;})()}
      <div class="pr"><div class="pl">Mandays</div><div class="pb"><div class="pf" style="width:${mdPct}%;background:linear-gradient(90deg,var(--or),#a9b4f5)"></div></div><div class="pn" style="color:var(--tx)">${mdActualDetail}</div></div>
    </div>
    <div class="${typeof cardCls==='function'?cardCls('forecast'):'card'}" style="margin-bottom:9px">
      <div class="ct">${typeof cardChev==='function'?cardChev('forecast'):''}FORECAST / ESTIMASI</div>
      <div class="metric-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:4px">
        <div style="background:var(--sf2);border:1px solid var(--bd);border-radius:10px;padding:11px 13px">
          <div style="font-size:9px;letter-spacing:.6px;color:var(--mt);text-transform:uppercase;margin-bottom:5px">Estimasi Selesai</div>
          <div style="font-size:16px;font-weight:700;color:var(--tx)">${_fcFinish?fmtDate(_fcFinish):'\u2014'}</div>
          <div style="font-size:10px;margin-top:3px">${_fcNote}</div>
        </div>
        <div style="background:var(--sf2);border:1px solid var(--bd);border-radius:10px;padding:11px 13px">
          <div style="font-size:9px;letter-spacing:.6px;color:var(--mt);text-transform:uppercase;margin-bottom:5px">Estimasi Biaya Akhir (EAC)</div>
          <div style="font-size:16px;font-weight:700;color:var(--tx)">${_eac!=null?_rp(_eac):'\u2014'}</div>
          <div style="font-size:10px;margin-top:3px">${_eacNote}</div>
        </div>
      </div>
      <div style="font-size:9px;color:var(--mt);margin-top:8px">Proyeksi berbasis tren saat ini \u2014 SPI ${spi}${_cpi!=null?' \u00b7 CPI '+_cpi:''}. Makin akurat seiring progres bertambah.</div>
    </div>
    ${typeof buildDiagnosaPanel==='function'?buildDiagnosaPanel(p.id):''}
    ${typeof buildActionPanel==='function'?buildActionPanel(p.id):''}
    <div class="${typeof cardCls==='function'?cardCls('prod'):'card'}" style="margin-bottom:9px">
      <div class="ct">${typeof cardChev==='function'?cardChev('prod'):''}ANALISA PRODUKTIVITAS</div>
      <div class="metric-grid" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-top:4px">
        <div style="background:var(--sf2);border:1px solid var(--bd);border-radius:10px;padding:11px 13px">
          <div style="font-size:9px;letter-spacing:.6px;color:var(--mt);text-transform:uppercase;margin-bottom:5px">MD per 1% Progres</div>
          <div style="font-size:16px;font-weight:700;color:var(--tx)">${_mdPer1!=null?_mdPer1.toFixed(1):'\u2014'}</div>
          <div style="font-size:10px;margin-top:3px">${_prodNote}</div>
        </div>
        <div style="background:var(--sf2);border:1px solid var(--bd);border-radius:10px;padding:11px 13px">
          <div style="font-size:9px;letter-spacing:.6px;color:var(--mt);text-transform:uppercase;margin-bottom:5px">Man-Hours Aktual</div>
          <div style="font-size:16px;font-weight:700;color:var(--tx)">${_mhTot} jam</div>
          <div style="font-size:10px;margin-top:3px;color:var(--mt)">terpakai s/d kini</div>
        </div>
        <div style="background:var(--sf2);border:1px solid var(--bd);border-radius:10px;padding:11px 13px">
          <div style="font-size:9px;letter-spacing:.6px;color:var(--mt);text-transform:uppercase;margin-bottom:5px">Jam Hilang (Time Lost)</div>
          <div style="font-size:16px;font-weight:700;color:var(--tx)">${_tlTot} jam</div>
          <div style="font-size:10px;margin-top:3px">${_tlNote}</div>
        </div>
      </div>
      ${_roleSum>0?`<div style="margin-top:11px"><div style="font-size:9px;letter-spacing:.6px;color:var(--mt);text-transform:uppercase;margin-bottom:6px">Komposisi Tenaga Kerja</div><div style="display:flex;flex-wrap:wrap;gap:6px">${Object.entries(_roles).filter(([k,v])=>v>0).map(([k,v])=>`<span style="font-size:10px;background:var(--sf2);border:1px solid var(--bd);border-radius:8px;padding:3px 9px;color:var(--mt)">${k} <b style="color:var(--tx)">${Math.round(v/_roleSum*100)}%</b></span>`).join('')}</div></div>`:''}
      <div style="font-size:9px;color:var(--mt);margin-top:8px">MD per 1% = total mandays \u00f7 progres aktual (makin kecil makin efisien). Proyeksi = MD per 1% \u00d7 100.</div>
    </div>
    <div class="${typeof cardCls==='function'?cardCls('hse'):'card'}" style="margin-bottom:9px">
      <div class="ct">${typeof cardChev==='function'?cardChev('hse'):''}HSE / SAFETY</div>
      <div class="metric-grid" style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:10px;margin-top:4px">
        <div style="background:var(--sf2);border:1px solid var(--bd);border-radius:10px;padding:11px 13px">
          <div style="font-size:9px;letter-spacing:.6px;color:var(--mt);text-transform:uppercase;margin-bottom:5px">Hari Tanpa Insiden</div>
          <div style="font-size:16px;font-weight:700;color:var(--gn)">${_daysNoInc!=null?_daysNoInc:'\u2014'}</div>
          <div style="font-size:10px;margin-top:3px;color:var(--mt)">${_incSub}</div>
        </div>
        <div style="background:var(--sf2);border:1px solid var(--bd);border-radius:10px;padding:11px 13px">
          <div style="font-size:9px;letter-spacing:.6px;color:var(--mt);text-transform:uppercase;margin-bottom:5px">Total Man-Hours</div>
          <div style="font-size:16px;font-weight:700;color:var(--tx)">${_mhTot} jam</div>
          <div style="font-size:10px;margin-top:3px;color:var(--mt)">jam kerja aman</div>
        </div>
        <div style="background:var(--sf2);border:1px solid var(--bd);border-radius:10px;padding:11px 13px">
          <div style="font-size:9px;letter-spacing:.6px;color:var(--mt);text-transform:uppercase;margin-bottom:5px">Near-Miss</div>
          <div style="font-size:16px;font-weight:700;color:${_nearMiss>0?'var(--yw)':'var(--tx)'}">${_nearMiss}</div>
          <div style="font-size:10px;margin-top:3px;color:var(--mt)">laporan hampir celaka</div>
        </div>
        <div style="background:var(--sf2);border:1px solid var(--bd);border-radius:10px;padding:11px 13px">
          <div style="font-size:9px;letter-spacing:.6px;color:var(--mt);text-transform:uppercase;margin-bottom:5px">Cedera Tercatat</div>
          <div style="font-size:16px;font-weight:700;color:${_recordable>0?'var(--rd)':'var(--gn)'}">${_recordable}</div>
          <div style="font-size:10px;margin-top:3px">${_recSub}</div>
        </div>
      </div>
      ${_otherInc.length?`<div style="margin-top:11px"><div style="font-size:9px;letter-spacing:.6px;color:var(--mt);text-transform:uppercase;margin-bottom:6px">Insiden Lain</div><div style="display:flex;flex-wrap:wrap;gap:6px">${_otherInc.map(([k,v])=>`<span style="font-size:10px;background:var(--sf2);border:1px solid var(--bd);border-radius:8px;padding:3px 9px;color:var(--mt)">${k} <b style="color:var(--tx)">${v}</b></span>`).join('')}</div></div>`:''}
    </div>
    ${typeof buildSnapshotPanel==='function'?buildSnapshotPanel(p.id):''}
    <div class="g2">
      <div class="card"><div class="ct">INFO PROJECT</div>
        <table style="width:100%;font-size:11px;border-collapse:collapse">
          ${[['Mulai',fmtDate(p.mulai)||'\u2014'],['Selesai',fmtDate(p.selesai)||'\u2014'],['Mandays Plan',(mdPlanDetail||'Belum diset')+' MD'],['MD Actual',mdActualDetail+' MD ('+mdPct+'%)'],['MH Plan/hr',(p.mhPlan||0)+' jam'],['Catatan',p.notes||'\u2014']].map(([k,v2])=>`<tr><td style="color:var(--mt);padding:3px 0;width:80px">${k}</td><td style="padding:3px 0">${v2}</td></tr>`).join('')}
        </table>
        ${(p.picPm||p.picSm||p.picEng||p.picProc)?`
        <div style="border-top:1px solid var(--bd);margin-top:8px;padding-top:8px">
          <div style="font-size:9px;letter-spacing:1px;color:var(--mt);text-transform:uppercase;margin-bottom:6px">Tim Project</div>
          <div style="display:flex;flex-wrap:wrap;gap:5px">
            ${p.picPm?`<div style="display:flex;align-items:center;gap:4px;background:var(--sf2);border:1px solid var(--bd);padding:3px 8px;border-radius:8px"><span style="font-size:8px;color:var(--mt);font-weight:700;text-transform:uppercase">PM</span><span style="font-size:11px;color:var(--tx)">${safeStr(p.picPm)}</span></div>`:''}
            ${p.picSm?`<div style="display:flex;align-items:center;gap:4px;background:var(--sf2);border:1px solid var(--bd);padding:3px 8px;border-radius:8px"><span style="font-size:8px;color:var(--mt);font-weight:700;text-transform:uppercase">SM</span><span style="font-size:11px;color:var(--tx)">${safeStr(p.picSm)}</span></div>`:''}
            ${p.picEng?`<div style="display:flex;align-items:center;gap:4px;background:var(--sf2);border:1px solid var(--bd);padding:3px 8px;border-radius:8px"><span style="font-size:8px;color:var(--mt);font-weight:700;text-transform:uppercase">ENG</span><span style="font-size:11px;color:var(--tx)">${safeStr(p.picEng)}</span></div>`:''}
            ${p.picProc?`<div style="display:flex;align-items:center;gap:4px;background:var(--sf2);border:1px solid var(--bd);padding:3px 8px;border-radius:8px"><span style="font-size:8px;color:var(--mt);font-weight:700;text-transform:uppercase">PROC</span><span style="font-size:11px;color:var(--tx)">${safeStr(p.picProc)}</span></div>`:''}
          </div>
        </div>`:''}
      </div>
      <div class="card"><div class="ct">OPEN ISSUES (${pIss.length})</div>
        ${pIss.length===0?'<div style="font-size:11px;color:var(--mt);text-align:center;padding:10px"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;display:inline-block"><polyline points=\"20 6 9 17 4 12\"/></svg> Tidak ada open issue</div>':
          pIss.slice(0,4).map(i=>`<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;border-bottom:1px solid rgba(30,45,69,.4);font-size:11px"><span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${i.uraian}</span><span class="pill" style="margin-left:5px;background:${i.prioritas==='Critical'?'rgba(244,112,122,.2)':'rgba(245,196,82,.2)'};color:${i.prioritas==='Critical'?'var(--rd)':'var(--yw)'};border:none">${i.prioritas}</span></div>`).join('')}
      </div>
    </div>
    <div class="card" style="margin:14px 0">
      <div class="ct">BIAYA &amp; SUMBER DAYA</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:26px">

        <div>
          <div style="font-size:9px;letter-spacing:1px;color:var(--mt);text-transform:uppercase;margin-bottom:6px">Biaya (RAB vs Realisasi)</div>
          <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:3px"><span style="color:var(--mt)">Budget RAB</span><span style="font-family:var(--fm)">${_rp(_rabBudget)}</span></div>
          <div style="height:10px;border-radius:6px;background:var(--sf2);overflow:hidden;display:flex">
            <div style="width:${_rabBudget>0?Math.min(100,_costProc/_rabBudget*100):0}%;background:var(--bl)"></div>
            <div style="width:${_rabBudget>0?Math.min(100,_costOpex/_rabBudget*100):0}%;background:var(--pu)"></div>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:11px;margin-top:4px"><span style="color:var(--mt)">Realisasi</span><span style="font-family:var(--fm);color:${_serapPct>100?'var(--rd)':'var(--gn)'}">${_rp(_costReal)} (${_serapPct}%)</span></div>
          <div style="display:flex;gap:10px;font-size:9px;color:var(--mt);margin-top:3px;flex-wrap:wrap">
            <span><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:var(--bl);vertical-align:-1px"></span> Proc ${_rp(_costProc)}</span>
            <span><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:var(--pu);vertical-align:-1px"></span> Opex ${_rp(_costOpex)}</span>
          </div>
          <div style="margin-top:7px;display:flex;align-items:center;gap:7px">
            <span style="font-size:9px;color:var(--mt);text-transform:uppercase;letter-spacing:1px">CPI</span>
            <span style="font-family:var(--fd);font-size:18px;line-height:1;color:${_cpiClr}">${_cpi===null?'\u2014':_cpi.toFixed(2)}</span>
            <span style="font-size:9px;color:var(--mt)">${_cpi===null?'belum ada biaya':(_cpi>=1?'efisien':'over budget')}</span>
          </div>
        </div>

        <div>
          <div style="font-size:9px;letter-spacing:1px;color:var(--mt);text-transform:uppercase;margin-bottom:6px">Procurement (${_pTotal})</div>
          ${_pTotal===0?'<div style="text-align:center;color:var(--mt);font-size:12px;padding:20px">Belum ada item procurement</div>':`
          <div style="height:10px;border-radius:6px;background:var(--sf2);overflow:hidden;display:flex">
            <div style="width:${_pDone/_pTotal*100}%;background:var(--gn)"></div>
            <div style="width:${_pProgress/_pTotal*100}%;background:var(--bl)"></div>
            <div style="width:${_pOverdue/_pTotal*100}%;background:var(--rd)"></div>
          </div>
          <div style="display:flex;flex-direction:column;gap:3px;margin-top:7px;font-size:11px">
            <div style="display:flex;justify-content:space-between"><span><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:var(--gn);vertical-align:-1px"></span> Diterima / On Site</span><span style="font-family:var(--fm)">${_pDone}</span></div>
            <div style="display:flex;justify-content:space-between"><span><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:var(--bl);vertical-align:-1px"></span> Dalam proses</span><span style="font-family:var(--fm)">${_pProgress}</span></div>
            <div style="display:flex;justify-content:space-between;color:${_pOverdue>0?'var(--rd)':'inherit'}"><span><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:var(--rd);vertical-align:-1px"></span> Terlambat</span><span style="font-family:var(--fm)">${_pOverdue}</span></div>
          </div>`}
        </div>

        <div>
          <div style="font-size:9px;letter-spacing:1px;color:var(--mt);text-transform:uppercase;margin-bottom:6px">Manpower (7 hari terakhir)</div>
          ${_last7.every(d=>d.val===0)?'<div style="font-size:11px;color:var(--mt);padding:12px 0;text-align:center">Belum ada input manpower 7 hari terakhir</div>':`
          <div style="display:flex;align-items:flex-end;gap:4px;height:54px">
            ${_last7.map(d=>`<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%"><span style="font-size:8px;color:var(--tx);line-height:1;margin-bottom:2px">${d.val||''}</span><div style="width:100%;height:${d.val>0?Math.max(10,Math.round(d.val/_mp7max*100)):0}%;background:linear-gradient(180deg,#a9b4f5,var(--or));border-radius:3px 3px 0 0"></div></div>`).join('')}
          </div>
          <div style="display:flex;gap:4px;margin-top:3px">
            ${_last7.map(d=>`<div style="flex:1;text-align:center;font-size:8px;color:var(--mt)">${d.day}</div>`).join('')}
          </div>`}
          <div style="display:flex;flex-direction:column;gap:3px;margin-top:5px;font-size:11px">
            <div style="display:flex;justify-content:space-between"><span style="color:var(--mt)">Total mandays</span><span style="font-family:var(--fm)">${mdActualDetail}${mdPlanDetail>0?' / '+mdPlanDetail:''} MD</span></div>
            <div style="display:flex;justify-content:space-between"><span style="color:var(--mt)">Rata-rata / hari</span><span style="font-family:var(--fm)">${_mp7avg} org</span></div>
          </div>
        </div>

      </div>
    </div>
    ${(p.history||[]).length>0?`<div class="card" style="margin-top:9px">
      <div class="ct">RIWAYAT UPDATE <span style="color:var(--mt)">${p.history.length} entri</span>
        <span style="font-size:10px;color:var(--mt)">(klik <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;display:inline-block"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> untuk edit atau <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;display:inline-block"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg> hapus)</span>
      </div>
      ${p.history.slice().reverse().map((h,ri)=>{
        const realIdx=p.history.length-1-ri;
        return `<div class="hr" style="gap:6px">
          <div class="hd">${fmtDate(h.date)}</div>
          <span style="font-family:var(--fm);color:var(--tx);font-weight:600">${h.actual}%</span>
          <span style="font-size:10px;color:var(--mt);margin:0 2px">vs</span>
          <span style="font-family:var(--fm);color:var(--tx)">${h.plan}%</span>
          <span style="font-family:var(--fm);font-size:10px;color:var(--mt)">${h.mp?h.mp+' org':''}</span>
          <div class="hn">${h.notes||''}</div>
          <button class="btn btn-sm" style="padding:1px 6px;font-size:10px;flex-shrink:0" onclick="editHistEntry(${p.id},${realIdx})"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;display:inline-block"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
          <button class="btn btn-sm brd" style="padding:1px 6px;font-size:10px;flex-shrink:0" onclick="delHistEntry(${p.id},${realIdx})"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;display:inline-block"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg></button>
        </div>`;
      }).join('')}
    </div>`:''}
  </div>`;
}



// ===============================================================
// ISSUES
// ===============================================================
function renderIssues(){
  const fp=$('ifProj');const cur=fp.value;
  fp.innerHTML='<option value="">Semua Project</option>'+P.map(p=>`<option value="${p.id}">${p.kode} \u2014 ${p.nama}</option>`).join('');
  if(cur)fp.value=cur;
  const fP=fp.value,fPri=gv('ifPri'),fSt=gv('ifStat');
  const filtered=ISS.filter(i=>{if(fP&&i.projId!=fP)return false;if(fPri&&i.prioritas!==fPri)return false;if(fSt&&i.status!==fSt)return false;return true;});
  $('ic1').textContent=ISS.filter(i=>i.prioritas==='Critical'&&i.status!=='Closed').length;
  $('ic2').textContent=ISS.filter(i=>i.status==='Open').length;
  $('ic3').textContent=ISS.filter(i=>i.status==='In Progress').length;
  $('ic4').textContent=ISS.filter(i=>i.status==='Closed').length;
  const pc={'Critical':'var(--rd)','High':'var(--or)','Medium':'var(--yw)','Low':'var(--bl)'};
  const sc={'Open':'var(--rd)','In Progress':'var(--yw)','Monitoring':'var(--bl)','Closed':'var(--gn)'};
  if(!filtered.length){$('issueTable').innerHTML='<div style="text-align:center;color:var(--mt);font-size:12px;padding:20px">Tidak ada issue</div>';return;}
  $('issueTable').innerHTML=`<table class="tbl"><thead><tr><th>Project</th><th>Tgl</th><th>Uraian</th><th>Kat.</th><th>Prioritas</th><th>PIC</th><th>Due</th><th>Tindakan</th><th>Status</th><th></th></tr></thead><tbody>
    ${filtered.map(i=>{const pr=P.find(p=>p.id===i.projId);return`<tr>
      <td style="font-family:var(--fm);font-size:10px;color:var(--mt)">${pr?.kode||'\u2014'}</td>
      <td style="color:var(--mt);font-size:10px;white-space:nowrap">${i.tgl||'\u2014'}</td>
      <td style="max-width:170px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${i.uraian}</td>
      <td style="color:var(--mt);font-size:10px">${i.kategori}</td>
      <td><span class="pill" style="background:${pc[i.prioritas]||'var(--mt)'}22;color:${pc[i.prioritas]||'var(--mt)'};border:1px solid ${pc[i.prioritas]||'var(--mt)'}44">${i.prioritas}</span></td>
      <td style="color:var(--mt);font-size:10px">${i.pj||'\u2014'}</td>
      <td style="font-family:var(--fm);font-size:10px;color:${i.status!=='Closed'&&i.due&&parseLocalDate(i.due)<new Date()?'var(--rd)':'var(--mt)'}">${i.due||'\u2014'}</td>
      <td style="max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--mt);font-size:10px">${i.action||'\u2014'}</td>
      <td><span style="color:${sc[i.status]||'var(--mt)'};font-weight:600;font-size:10px">${i.status}</span></td>
      <td><button class="btn btn-sm" style="padding:2px 6px" onclick="openModal('editIssue','${i.id}')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;display:inline-block"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button></td>
    </tr>`}).join('')}
  </tbody></table>`;
  updateBadge();
}

// ===============================================================
// PROCUREMENT
// ===============================================================
function renderProc(){
  // Update project dropdown \u2014 jangan timpa nilai yang sudah di-set manual oleh user
  const fp=$('procFiltProj');
  if(fp){
    const cur=fp.value;
    const wasManual=fp._procFiltManual;
    fp.innerHTML='<option value="">Semua Project</option>'+P.map(p=>`<option value="${p.id}">${p.kode} \u2014 ${p.nama}</option>`).join('');
    fp._procFiltManual=wasManual; // restore flag setelah rebuild innerHTML
    if(wasManual&&cur!==undefined) fp.value=cur; // pertahankan pilihan manual (termasuk "")
    else if(selId) fp.value=selId;
  }
  const filtProj=gv('procFiltProj');
  const filt=gv('procFilt');
  const filtKat=gv('procFiltKat');
  const search=(gv('procSearch')||'').toLowerCase();
  const filtered=PROC.filter(i=>{
    if(filtProj&&String(i.projId)!==String(filtProj))return false;
    if(filt&&i.status!==filt)return false;
    if(filtKat&&i.kategori!==filtKat)return false;
    if(search&&!i.item?.toLowerCase().includes(search)&&!i.supplier?.toLowerCase().includes(search))return false;
    return true;
  });
  const cnt=s=>PROC.filter(i=>i.status===s).length;
  $('pc1').textContent=cnt('Overdue');$('pc2').textContent=cnt('Due Today');
  $('pc3').textContent=cnt('In Transit');$('pc4').textContent=cnt('On Site');
  $('pc5').textContent=cnt('Waiting Approval')+cnt('PO Issued');
  // Due ≤3 hari (tidak termasuk yang sudah overdue/hari ini/done)
  const now2=new Date();now2.setHours(0,0,0,0);
  const dueSoon=filtered.filter(i=>{
    if(i.status==='On Site'||i.status==='Done')return false;
    if(!i.due)return false;
    const d=parseLocalDate(i.due);d.setHours(0,0,0,0);
    const days=Math.ceil((d-now2)/86400000);
    return days>0&&days<=3;
  }).length;
  if($('pc6'))$('pc6').textContent=dueSoon;
  const sc={Overdue:'var(--rd)','Due Today':'var(--yw)','In Transit':'var(--bl)','On Site':'var(--gn)','Waiting Approval':'var(--pu)','PO Issued':'#a9b4f5'};
  if(!filtered.length){$('procTable').innerHTML=`<div style="text-align:center;color:var(--mt);font-size:12px;padding:22px">${PROC.length?'Tidak ada item yang cocok dengan filter':'Belum ada item procurement'}</div>`;return;}
  $('procTable').innerHTML=`<table class="tbl"><thead><tr><th>Project</th><th>Item</th><th>Kat.</th><th>Qty</th><th>Supplier</th><th>Due</th><th>Status</th><th>Harga</th><th>RAB Link</th><th>Catatan</th><th>PR/PO/IR</th><th></th></tr></thead><tbody>
    ${filtered.map(i=>{
      const pr=P.find(p=>p.id===i.projId);
      const item=safeStr(i.item)||'\u2014';
      const kat=safeStr(i.kategori)||'\u2014';
      const qty=safeStr(i.qty)||'\u2014';
      const sat=safeStr(i.satuan)||'';
      const sup=safeStr(i.supplier)||'\u2014';
      const _trimD=v=>{if(!v||v==='\u2014')return v;const s=String(v).trim();return s.includes('T')?s.slice(0,10):s;};
      const due=_trimD(safeStr(i.due))||'\u2014';
      const stat=safeStr(i.status)||'\u2014';
      const notes=safeStr(i.notes)||'\u2014';
      const done=stat==='On Site'||stat==='Done';
      // Hitung sisa hari
      const now=new Date();now.setHours(0,0,0,0);
      const dueDate=i.due?parseLocalDate(i.due):null;
      const daysLeft=dueDate?Math.ceil((dueDate-now)/86400000):null;
      const isOverdue=!done&&dueDate&&daysLeft<0;
      const isWarning=!done&&dueDate&&daysLeft>=0&&daysLeft<=3;
      // Due date cell style + label
      let dueColor='var(--mt)';
      let dueLabel='';
      if(!done&&dueDate){
        if(isOverdue){dueColor='var(--rd)';dueLabel=`<span style="background:rgba(244,112,122,.15);color:var(--rd);font-size:9px;padding:1px 5px;border-radius:3px;margin-left:4px;font-weight:600">OVERDUE</span>`;}
        else if(daysLeft===0){dueColor='var(--rd)';dueLabel=`<span style="background:rgba(244,112,122,.15);color:var(--rd);font-size:9px;padding:1px 5px;border-radius:3px;margin-left:4px;font-weight:600">HARI INI</span>`;}
        else if(isWarning){dueColor='var(--yw)';dueLabel=`<span style="background:rgba(245,196,82,.15);color:var(--yw);font-size:9px;padding:1px 5px;border-radius:3px;margin-left:4px;font-weight:600"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;display:inline-block"><path d=\"m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3\"/><circle cx=\"12\" cy=\"17\" r=\".5\" fill=\"currentColor\"/><line x1=\"12\" y1=\"9\" x2=\"12\" y2=\"13\"/></svg> ${daysLeft}H</span>`;}
      }
      const rowBg=isOverdue?'rgba(244,112,122,.04)':isWarning?'rgba(245,196,82,.04)':'';
      return`<tr style="background:${rowBg}">
      <td style="font-family:var(--fm);font-size:10px;color:var(--mt)">${pr?.kode||'\u2014'}</td>
      <td style="font-weight:500">${item}</td>
      <td style="color:var(--mt)">${kat}</td>
      <td style="font-family:var(--fm)">${qty} ${sat}</td>
      <td style="color:var(--mt)">${sup}</td>
      <td style="font-family:var(--fm);font-size:10px;color:${dueColor};white-space:nowrap">${due}${dueLabel}</td>
      <td><span style="color:${sc[stat]||'var(--mt)'};font-weight:600;font-size:10px">${stat}</span></td>
      <td style="font-family:var(--fm);color:var(--tx);white-space:nowrap;font-size:11px">${i.harga&&+i.harga>0?'Rp '+Number(i.harga).toLocaleString('id-ID'):'—'}</td>
      <td style="white-space:nowrap">
        ${(()=>{
          if(!i.rabItemId&&!i.rabKatId)return'<span style="color:var(--bd);font-size:9px">—</span>';
          const ri=i.rabItemId?RAB.find(r=>String(r.id)===String(i.rabItemId)):null;
          const rk=i.rabKatId?RAB.find(r=>String(r.id)===String(i.rabKatId)):null;
          const lbl=(ri?.deskripsi||ri?.name||rk?.name||'RAB').slice(0,20);
          return`<span title="${ri?.deskripsi||ri?.name||rk?.name||''}" style="font-size:9px;background:rgba(124,140,240,.1);color:var(--bl);padding:1px 6px;border-radius:3px;border:1px solid rgba(124,140,240,.2)">${lbl}</span>`;
        })()}
      </td>
      <td style="color:var(--mt);max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px">${notes}</td>
      <td style="font-family:var(--fm);font-size:9.5px;white-space:nowrap">${(()=>{
        const lg=Array.isArray(i.logs)?i.logs:[];
        if(!lg.length)return '<span style="color:var(--bd)">\u2014</span>';
        const lt=ev=>{const f=lg.filter(l=>l.event===ev).map(l=>l.date).filter(Boolean).sort();return f.length?String(f[f.length-1]).slice(5):'';};
        const seg=(lbl,v,c)=>v?'<span style="color:'+c+'">'+lbl+' '+v+'</span>':'';
        const parts=[seg('PR',lt('PR Submit'),'var(--yw)'),seg('PO',lt('PO Release'),'var(--bl)'),seg('IR',lt('IR (Item Receive)'),'var(--gn)')].filter(Boolean);
        return (parts.length?parts.join(' \u00b7 '):'')+' <span style="color:var(--mt);opacity:.6">('+lg.length+')</span>';
      })()}</td>
      <td><button class="btn btn-sm" style="padding:2px 6px" onclick="openModal('editProc','${i.id}')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;display:inline-block"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button></td>
    </tr>`;}).join('')}
  </tbody></table>`;
}

// ===============================================================
// MODAL OPEN
// ===============================================================
function openModal(type,id=null){
  // Auth: change password
  if(type==='wbsAddCat'){
    $('wbsCatProj').innerHTML=P.map(p=>`<option value="${p.id}">${p.kode} \u2014 ${p.nama}</option>`).join('');
    const cur=selId;if(cur)$('wbsCatProj').value=cur;
    sv('wbsCatName','');sv('wbsCatBobot','');
    show('ov-wbsAddCat');return;
  }
  if(type==='wbsAddSub'){
    $('wbsSubProj').innerHTML=P.map(p=>`<option value="${p.id}">${p.kode} \u2014 ${p.nama}</option>`).join('');
    const cur=selId||$('wbsProjSel')?.value;if(cur)$('wbsSubProj').value=cur;
    populateWbsParents('wbsSubParent','wbsSubProj','cat');
    sv('wbsSubName','');sv('wbsSubBobot','');
    show('ov-wbsAddSub');return;
  }
  if(type==='wbsAddItem'){
    $('wbsItemProj').innerHTML=P.map(p=>`<option value="${p.id}">${p.kode} \u2014 ${p.nama}</option>`).join('');
    const cur=selId||$('wbsProjSel')?.value;if(cur)$('wbsItemProj').value=cur;
    populateWbsParents('wbsItemParent','wbsItemProj','subcat');
    sv('wbsItemName','');sv('wbsItemBobot','');
    show('ov-wbsAddItem');return;
  }
  if(type==='wbsPlan'){
    $('wbsPlanProj').innerHTML=P.map(p=>`<option value="${p.id}">${p.kode} \u2014 ${p.nama}</option>`).join('');
    const cur=id||selId||$('wbsProjSel')?.value;if(cur)$('wbsPlanProj').value=cur;
    renderWbsPlanGrid();show('ov-wbsPlan');return;
  }
  if(type==='wbsActual'){
    $('wbsProgProj').innerHTML=P.map(p=>`<option value="${p.id}">${p.kode} \u2014 ${p.nama}</option>`).join('');
    const cur=id||selId||$('wbsProjSel')?.value;if(cur)$('wbsProgProj').value=cur;
    const projId=$('wbsProgProj').value;
    const allLeaf=WBS.filter(w=>String(w.projId)===String(projId));
    const weekNums=new Set();allLeaf.forEach(w=>Object.keys(w.weeklyData||{}).forEach(k=>weekNums.add(+k)));
    const lastW=weekNums.size?Math.max(...weekNums):0;
    if($('wbsProgWeek'))$('wbsProgWeek').value=Math.min(lastW+1,24);
    renderWbsProgressForm();show('ov-wbsActual');return;
  }
  if(type==='mpReport'){
    $('mrProj').innerHTML='<option value="">Semua Project</option>'+P.map(p=>`<option value="${p.id}">${p.kode} — ${p.nama}</option>`).join('');
    sv('mrProj',id||(selId||''));
    sv('mrPeriod','week');
    const _today=new Date().toISOString().slice(0,10);
    const _mon=new Date();_mon.setDate(_mon.getDate()-_mon.getDay()+1);
    sv('mrDateFrom',_mon.toISOString().slice(0,10));
    sv('mrDateTo',_today);
    toggleMrCustom();
    show('ov-mpReport');return;
  }
  if(type==='weeklyReport'){
    $('wrProj').innerHTML=P.map(p=>`<option value="${p.id}">${p.kode} — ${p.nama}</option>`).join('');
    const cur=id||selId||P[0]?.id;if(cur)$('wrProj').value=cur;
    populateWeekOptions();
    show('ov-weeklyReport');return;
  }
  if(type==='drQtySetup'){
    $('drSetupProj').innerHTML=P.map(p=>`<option value="${p.id}">${p.kode} \u2014 ${p.nama}</option>`).join('');
    const cur=id||selId||$('drProjSel')?.value;if(cur)$('drSetupProj').value=cur;
    renderDrQtySetupForm();
    show('ov-drQtySetup');return;
  }
  if(type==='drInput'){
    $('drInputProj').innerHTML=P.map(p=>`<option value="${p.id}">${p.kode} \u2014 ${p.nama}</option>`).join('');
    const cur=id||selId||$('drProjSel')?.value;if(cur)$('drInputProj').value=cur;
    $('drInputDate').value=$('drDate')?.value||new Date().toISOString().slice(0,10);
    renderDrInputForm();
    show('ov-drInput');return;
  }
  if(type==='wbsDaily'){
    $('wbsDailyProj').innerHTML=P.map(p=>`<option value="${p.id}">${p.kode} \u2014 ${p.nama}</option>`).join('');
    const cur=id||selId||$('wbsProjSel')?.value;if(cur)$('wbsDailyProj').value=cur;
    $('wbsDailyDate').value=new Date().toISOString().slice(0,10);
    renderWbsDailyForm();
    show('ov-wbsDaily');return;
  }
  if(type==='wbsProgress'){
    $('wbsProgProj').innerHTML=P.map(p=>`<option value="${p.id}">${p.kode} \u2014 ${p.nama}</option>`).join('');
    const cur=id||selId||$('wbsProjSel')?.value;if(cur)$('wbsProgProj').value=cur;
    // Auto-detect: minggu terakhir yang ada data + 1 (untuk input baru), default ke 1
    const projId=$('wbsProgProj').value;
    const allLeaf=WBS.filter(w=>String(w.projId)===String(projId));
    const weekNums=new Set();
    allLeaf.forEach(w=>Object.keys(w.weeklyData||{}).forEach(k=>weekNums.add(+k)));
    const lastW=weekNums.size?Math.max(...weekNums):0;
    const nextW=Math.min(lastW+1,24);
    if($('wbsProgWeek'))$('wbsProgWeek').value=nextW;
    renderWbsProgressForm();
    show('ov-wbsProgress');return;
  }
  if(type==='scPlan'){
    $('scPlanProj').innerHTML=P.map(p=>`<option value="${p.id}">${p.kode} \u2014 ${p.nama}</option>`).join('');
    const cur=id||selId||$('scProjSel')?.value;if(cur)$('scPlanProj').value=cur;
    renderPlanInputRows();
    show('ov-scPlan');return;
  }
  if(type==='scActual'){
    $('scActProj').innerHTML=P.map(p=>`<option value="${p.id}">${p.kode} \u2014 ${p.nama}</option>`).join('');
    const cur=id||selId||$('scProjSel')?.value;if(cur)$('scActProj').value=cur;
    const wsel=$('scActWeek');if(wsel)wsel.dataset.init='';
    sv('scActWAct','');sv('scActCAct','');
    scFillActualWeek();
    show('ov-scActual');return;
  }
  if(type==='scManage'){
    $('scMgProj').innerHTML=P.map(p=>`<option value="${p.id}">${p.kode} \u2014 ${p.nama}</option>`).join('');
    const cur=$('scProjSel')?.value;if(cur)$('scMgProj').value=cur;
    renderScManageTable();show('ov-scManage');return;
  }
  if(type==='changePw'){
    sv('cpRole',currentRole==='admin'?'admin':'editor');
    sv('cpNewPw','');sv('cpConfPw','');
    $('ov-changePw')?.classList.add('open');
    return;
  }
  if(type==='addProj'||type==='editProj'){
    editProjId=id;
    $('projMT').textContent=id?'EDIT PROJECT':'TAMBAH PROJECT';
    $('btnSaveProj').innerHTML=id?'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;display:inline-block"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> Simpan':ic('plus',13)+' Tambah';
    $('btnDelProj').style.display=id?'block':'none';
    const p=id?P.find(x=>x.id===id):null;
    sv('fKode',p?.kode||`ATW-${String(P.length+1).padStart(3,'0')}`);
    sv('fNama',p?.nama||'');sv('fLok',p?.lokasi||'');sv('fClient',p?.client||'');
    sv('fMulai',p?.mulai||'');sv('fSelesai',p?.selesai||'');sv('fStat',p?.status||'Planning');
    sv('fMpP',p?.mdPlan||p?.mpPlan||'');sv('fMhP',p?.mhPlan||'');sv('fNotes',p?.notes||'');
    sv('fWeather',p?.weather||'Partly Cloudy');
    // Load logo
    sv('fLogo',p?.logo||'');
    setLogoPreview(p?.logo||'');
    // Load PIC
    sv('fPicPm',p?.picPm||'');sv('fPicSm',p?.picSm||'');
    sv('fPicEng',p?.picEng||'');sv('fPicProc',p?.picProc||'');
    // Autocomplete from existing projects
    const allPm=[...new Set(P.map(x=>x.picPm).filter(Boolean))];
    const allSm=[...new Set(P.map(x=>x.picSm).filter(Boolean))];
    const allEng=[...new Set(P.map(x=>x.picEng).filter(Boolean))];
    const allPrc=[...new Set(P.map(x=>x.picProc).filter(Boolean))];
    $('picPmList').innerHTML=allPm.map(n=>`<option value="${n}">`).join('');
    $('picSmList').innerHTML=allSm.map(n=>`<option value="${n}">`).join('');
    $('picEngList').innerHTML=allEng.map(n=>`<option value="${n}">`).join('');
    $('picProcList').innerHTML=allPrc.map(n=>`<option value="${n}">`).join('');
    // plan & actual dikelola oleh S-Curve \u2014 tidak perlu set manual
    show('ov-addProj');
  }
  if(type==='updProgress'){
    const p=P.find(x=>x.id===selId);if(!p)return;
    $('updNm').textContent=`${p.kode} \u2014 ${p.nama}`;
    $('uPlan').value=p.plan;$('uActual').value=p.actual;
    sv('uMp',p.mpActual||0);sv('uStat',p.status);sv('uNotes','');
    rv('uPlan','uPlanV','uPlanB');rv('uActual','uActualV','uActualB');
    show('ov-updProgress');
  }
  if(type==='inputMp'){
    $('mpProj').innerHTML=P.map(p=>`<option value="${p.id}">${p.kode} \u2014 ${p.nama}</option>`).join('');
    if(selId)$('mpProj').value=selId;
    sv('mpDate',new Date().toISOString().slice(0,10));
    sv('mpSpv',0);sv('mpMandor',0);sv('mpInstaller',0);sv('mpTukang',0);sv('mpHelper',0);sv('mpSafety',0);sv('mpTot',0);
    sv('mpMhAct','');sv('mpTL','0');sv('mpTLReason','');sv('mpNotes','');
    // Jika edit (id diberikan), load existing data
    if(id){
      const ex=MPLOGS.find(m=>m.id===id);
      if(ex){
        sv('mpProj',String(ex.projId));sv('mpDate',ex.date||'');
        sv('mpSpv',ex.spv||0);sv('mpMandor',ex.mandor||0);sv('mpInstaller',ex.installer||0);
        sv('mpTukang',ex.tukang||0);sv('mpHelper',ex.helper||0);sv('mpSafety',ex.safety||0);
        calcMpTot();sv('mpMhAct',ex.mhActual||0);sv('mpTL',ex.timeLost||0);
        sv('mpTLReason',ex.timeLostReason||'');sv('mpNotes',ex.notes||'');
        $('mpProj').dataset.editId=id;
      }
    } else {
      delete $('mpProj').dataset.editId;
    }
    fillMpPlan();
    renderMpActivityRows();
    show('ov-inputMp');
  }
  if(type==='addAccident'){
    $('accProj').innerHTML=P.map(p=>`<option value="${p.id}">${p.kode} \u2014 ${p.nama}</option>`).join('');
    sv('accDate',new Date().toISOString().slice(0,10));
    ['accFat','accLti','accMin','accMed','accProp','accFire','accTraf','accEnv','accNM','accTL'].forEach(k=>sv(k,'0'));
    sv('accNotes','');
    show('ov-addAccident');
  }
  if(type==='editWeather'){
    $('wFields').innerHTML=P.map(p=>`<div class="fg"><label class="fl">${p.kode} \u2014 ${p.nama}</label>
      <select class="fi" id="wf_${p.id}">${['<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;display:inline-block"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg> Sunny','Partly Cloudy','Partly Overcast','Rainy','Thunderstorm','Foggy'].map(w=>`<option ${p.weather===w?'selected':''}>${w}</option>`).join('')}</select>
    </div>`).join('');
    show('ov-editWeather');
  }
  if(type==='addIssue'||type==='editIssue'){
    editIssId=id?String(id):null;
    $('issMT').textContent=id?'EDIT ISSUE':'TAMBAH ISSUE';
    $('btnSaveIss').innerHTML=id?'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;display:inline-block"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> Simpan':ic('plus',13)+' Tambah';
    $('btnDelIss').style.display=id?'block':'none';
    $('iProj').innerHTML=P.map(p=>`<option value="${p.id}">${p.kode} \u2014 ${p.nama}</option>`).join('');
    const iss=id?ISS.find(x=>String(x.id)===String(id)):null;
    sv('iProj',iss?.projId||(selId||''));sv('iTgl',iss?.tgl||new Date().toISOString().slice(0,10));
    sv('iPri',iss?.prioritas||'Medium');sv('iKat',iss?.kategori||'Other');
    sv('iUraian',iss?.uraian||'');sv('iPJ',iss?.pj||'');sv('iDue',iss?.due||'');
    sv('iStat',iss?.status||'Open');sv('iDone',iss?.done||'');sv('iAction',iss?.action||'');
    show('ov-addIssue');
  }
  if(type==='addProc'||type==='editProc'){
    editProcId=id?String(id):null;
    $('procMT').textContent=id?'EDIT ITEM':'TAMBAH ITEM';
    $('btnSaveProc').innerHTML=id?'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;display:inline-block"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> Simpan':ic('plus',13)+' Tambah';
    $('btnDelProc').style.display=id?'block':'none';
    $('pProj').innerHTML=P.map(p=>`<option value="${p.id}">${p.kode} — ${p.nama}</option>`).join('');
    const pr=id?PROC.find(x=>String(x.id)===String(id)):null;
    sv('pProj',pr?.projId||(selId||''));sv('pKat',pr?.kategori||'Material');
    sv('pItem',pr?.item||'');sv('pQty',pr?.qty||'');sv('pSat',pr?.satuan||'');
    sv('pDue',pr?.due||'');sv('pSup',pr?.supplier||'');sv('pStat',pr?.status||'Waiting Approval');sv('pNotes',pr?.notes||'');
    if($('pHarga'))$('pHarga').value=pr?.harga||'';
    toggleProcCost(pr?.status||'Waiting Approval');
    // Reset kategori visibility dulu
    _hideProcKat(false);
    // Populate RAB dropdowns — akan hide kategori jika ada link RAB
    const pProjId=pr?.projId||(selId||'');
    _populateProcRab(pProjId, pr?.rabKatId||'', pr?.rabItemId||'');
    _procLogs = Array.isArray(pr?.logs) ? pr.logs.slice() : [];
    if(typeof _renderProcLogs==='function') _renderProcLogs();
    sv('pLogEvent','PR Submit'); sv('pLogDate', new Date().toISOString().slice(0,10)); sv('pLogNote','');
    sv('pLogBy', (window._meName||'') || (function(){try{return localStorage.getItem('atw_proc_by')||'';}catch(e){return '';}})());
    show('ov-addProc');
  }
  if(type==='addCost'||type==='editCost'){openCostModal(id);return;}
  if(type==='gsConfig'){
    sv('gsSheetUrl',gsSheet||'');
    sv('gsScriptUrl',gsUrl||'');
    $('gsTestRes').style.display='none';
    _gsUrlHint(gsUrl||'');
    // Tampilkan status koneksi saat ini
    const dot=$('gsStatusDot'),msg=$('gsStatusMsg');
    if(gsOk&&gsUrl){
      const lts=_rtLastTs>0?(' · sync: '+new Date(_rtLastTs).toLocaleTimeString('id-ID')):'';
      if(dot){dot.style.background=_rtFailCount>=2?'var(--yw)':'var(--gn)';}
      if(msg){msg.style.color=_rtFailCount>=2?'var(--yw)':'var(--gn)';
        msg.textContent=_rtFailCount>=2?'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;display:inline-block"><path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><line x1="12" y1="9" x2="12" y2="13"/><circle cx="12" cy="17" r=".5" fill="currentColor"/></svg> Koneksi Supabase bermasalah saat ini — coba Test Koneksi':'<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;display:inline-block"><polyline points="20 6 9 17 4 12"/></svg> Terhubung'+lts;}
    }else{
      if(dot)dot.style.background='var(--mt)';
      if(msg){msg.style.color='var(--mt)';msg.textContent='Belum dikonfigurasi';}
    }
    show('ov-gsConfig');return;
  }
}

// ===============================================================
// SAVE ACTIONS
// ===============================================================
async function saveProj(){
  const kode=gv('fKode').trim(),nama=gv('fNama').trim();
  if(!kode||!nama){toast('Kode & Nama wajib diisi','error');return;}
  // Validation
  if(typeof sbValidate==='function'){
    const vr=sbValidate('projects',{nama,kode,actual:+gv('fActual')||0,plan:+gv('fPlan')||0});
    if(!vr.valid){toast('<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;display:inline-block"><path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><line x1="12" y1="9" x2="12" y2="13"/><circle cx="12" cy="17" r=".5" fill="currentColor"/></svg> '+vr.errors[0],'error');return;}
  }
  // Conflict check (edit only)
  if(editProjId && typeof sbSafeCheck==='function'){
    const ok=await sbSafeCheck('projects',editProjId,'Project ini');
    if(!ok)return;
  }
  // plan & actual dikelola S-Curve \u2014 preserve dari data existing
  const existing=editProjId?P.find(p=>p.id===editProjId):null;
  const d={kode,nama,lokasi:gv('fLok').trim(),client:gv('fClient').trim(),
    mulai:gv('fMulai'),selesai:gv('fSelesai'),status:gv('fStat'),
    plan:existing?.plan||0, actual:existing?.actual||0,
    mdPlan:+gv('fMpP')||0,mpPlan:+gv('fMpP')||0,mhPlan:+gv('fMhP')||0,
    weather:gv('fWeather'),notes:gv('fNotes').trim(),
    logo:gv('fLogo')||'',
    picPm:gv('fPicPm').trim(),picSm:gv('fPicSm').trim(),
    picEng:gv('fPicEng').trim(),picProc:gv('fPicProc').trim()};
  if(editProjId){const i=P.findIndex(p=>p.id===editProjId);P[i]={...P[i],...d};toast('Project diupdate ✓');}
  else{d.id=genId();d.history=[];d.mpActual=0;P.push(d);selId=d.id;toast('Project ditambahkan ✓');}
  saveLogosCache();
  dirty();cm('addProj');render()
}
function delProj(){
  showConfirm('Hapus project ini?',()=>{_doDelProj();});return;}

// ── INLINE EDIT di WBS Tabel ───────────────────────────────────
function inlineDateCell(nodeId, field, tdEl){
  const td=tdEl?.closest('td')||document.querySelector(`td[data-wbs-date="${nodeId}-${field}"]`);
  if(!td)return;
  document.querySelectorAll('.wbs-date-cell.editing').forEach(el=>el.classList.remove('editing'));
  td.classList.add('editing');
  const input=td.querySelector('input[type=date]');
  if(input){try{input.showPicker&&input.showPicker();}catch(e){input.focus();}}
}

function saveWbsInlineDate(nodeId, field, val){
  const node=WBS.find(w=>String(w.id)===String(nodeId));
  if(!node)return;
  node[field]=val||'';
  dirty();
  const scrollPos=$('wbsTable')?.scrollTop||0;
  renderWBS();
  setTimeout(()=>{if($('wbsTable'))$('wbsTable').scrollTop=scrollPos;},50);
  if(document.getElementById('wbsGanttChart')?.innerHTML)renderGantt();
}

function saveWbsInlineText(nodeId, field, val){
  const node=WBS.find(w=>String(w.id)===String(nodeId));
  if(!node)return;
  const parsed=field==='bobot'?Math.max(0,Math.min(100,parseFloat(val)||0)):val;
  node[field]=parsed;
  dirty();
  const scrollPos=$('wbsTable')?.scrollTop||0;
  renderWBS();
  setTimeout(()=>{if($('wbsTable'))$('wbsTable').scrollTop=scrollPos;},50);
}

function openCloneModal(srcProjId){
  const src=P.find(p=>String(p.id)===String(srcProjId));
  if(!src){toast('Project sumber tidak ditemukan','error');return;}
  // Fill source info
  $('cloneSourceInfo').textContent=`${src.kode} — ${src.nama}`;
  // Pre-fill new project data
  sv('cloneKode','');sv('cloneNama','');
  sv('cloneClient',src.client||'');sv('cloneLok',src.lokasi||'');
  sv('cloneMulai',src.mulai||'');sv('cloneSelesai',src.selesai||'');
  $('cloneStat').value='Planning';
  // Store source id
  $('ov-cloneProj').dataset.srcId=srcProjId;
  // Preview WBS
  _renderClonePreview(srcProjId);
  show('ov-cloneProj');
}

function _renderClonePreview(srcProjId){
  const wbs=WBS.filter(w=>String(w.projId)===String(srcProjId)).sort((a,b)=>+a.order-+b.order);
  const cats=wbs.filter(w=>w.type==='cat');
  const el=$('cloneWbsPreview');
  if(!wbs.length){el.innerHTML='<div style="color:var(--mt);font-style:italic">Belum ada WBS di project ini.</div>';return;}
  let html='';
  let totalItems=0;
  cats.forEach((cat,ci)=>{
    html+=`<div style="color:var(--gn);font-weight:700;margin-top:4px">${String.fromCharCode(65+ci)}. ${cat.name} <span style="color:var(--mt);font-weight:400">(${cat.bobot||0}%)</span></div>`;
    const subs=wbs.filter(w=>w.type==='subcat'&&String(w.parentId)===String(cat.id));
    subs.forEach((sub,si)=>{
      html+=`<div style="padding-left:10px;color:var(--bl)">${ci+1}.${si+1} ${sub.name} <span style="color:var(--mt)">(${sub.bobot||0}%)</span></div>`;
      const items=wbs.filter(w=>w.type==='item'&&String(w.parentId)===String(sub.id));
      items.forEach((item,ii)=>{
        totalItems++;
        html+=`<div style="padding-left:20px;color:var(--tx)">${ci+1}.${si+1}.${ii+1} ${item.name} <span style="color:var(--mt)">(${item.bobot||0}%)</span></div>`;
      });
    });
  });
  el.innerHTML=`<div style="color:var(--tx);font-weight:600;margin-bottom:6px">Preview WBS: ${cats.length} kategori, ${wbs.filter(w=>w.type==='subcat').length} sub-kategori, ${totalItems} item</div>${html}`;
}

function executeCloneProject(){
  const kode=($('cloneKode')?.value||'').trim();
  const nama=($('cloneNama')?.value||'').trim();
  if(!kode||!nama){toast('Kode & Nama project wajib diisi','error');return;}
  if(P.find(p=>p.kode===kode)){toast('Kode project sudah digunakan','error');return;}

  const srcId=$('ov-cloneProj').dataset.srcId;
  const copyDates=$('cloneCopyDates')?.checked!==false;

  // Buat project baru
  const newProjId=genId();
  const newProj={
    id:newProjId,
    kode,nama,
    lokasi:($('cloneLok')?.value||'').trim(),
    client:($('cloneClient')?.value||'').trim(),
    mulai:$('cloneMulai')?.value||'',
    selesai:$('cloneSelesai')?.value||'',
    status:$('cloneStat')?.value||'Planning',
    plan:0,actual:0,mdPlan:0,mpPlan:0,mpActual:0,mhPlan:0,
    weather:'',notes:'',logo:'',
    picPm:'',picSm:'',picEng:'',picProc:'',history:[]
  };
  P.push(newProj);

  // Clone WBS — buat mapping id lama → id baru
  const srcWbs=WBS.filter(w=>String(w.projId)===String(srcId));
  const idMap={};
  // Pass 1: buat semua id baru
  srcWbs.forEach(w=>{idMap[w.id]=genId();});
  // Pass 2: clone dengan id baru, reset progress
  srcWbs.forEach(w=>{
    WBS.push({
      id:idMap[w.id],
      projId:newProjId,
      type:w.type,
      parentId:w.parentId?idMap[w.parentId]:'',
      name:w.name,
      bobot:w.bobot||0,
      order:w.order||0,
      // Reset semua progress
      cumPlan:0,cumActual:0,
      weeklyData:{},weeklyPlan:{},dailyLogs:[],
      // Copy plan fields
      qtyPlan:w.qtyPlan||0,qtySatuan:w.qtySatuan||'',
      // Copy tanggal jika dipilih
      startDate:copyDates?(w.startDate||''):'',
      finishDate:copyDates?(w.finishDate||''):'',
      // Clone predecessor CPM — remap id lama→baru lewat idMap (sama seperti parentId).
      // Hanya pred yang itemnya ikut ter-clone yang dipertahankan; sisanya di-drop agar tidak menunjuk proyek sumber.
      predecessors:(w.predecessors||[]).filter(function(pr){return idMap[pr.id];}).map(function(pr){return {id:idMap[pr.id],type:pr.type||'FS',lag:+pr.lag||0};}),
    });
  });

  selId=newProjId;
  dirty();cm('cloneProj');render();
  _syncAllProjSelectors(newProjId);
  toast(`✓ Project "${kode}" berhasil dibuat dengan ${srcWbs.length} item WBS`,'ok',4000);
}

function _doDelProj(){
  const pid=editProjId;
  // Hapus project & semua data terkait dari semua array
  P=P.filter(p=>p.id!==pid);
  ISS=ISS.filter(i=>i.projId!==pid);
  PROC=PROC.filter(p=>p.projId!==pid);
  COSTS=COSTS.filter(c=>c.projId!==pid);
  RAB=RAB.filter(r=>r.projId!==pid);
  WBS=WBS.filter(w=>w.projId!==pid);
  MPLOGS=MPLOGS.filter(m=>m.projId!==pid);
  ACCLOGS=ACCLOGS.filter(a=>a.projId!==pid);
  SCURVE=SCURVE.filter(s=>s.projId!==pid);
  if(selId===pid)selId=P[0]?.id||null;
  dirty();cm('addProj');render();toast('Project dihapus','warn');
  
}
async function saveUpdate(){
  const p=P.find(x=>x.id===selId);if(!p)return;
  // Conflict check sebelum update progress
  if(typeof sbSafeCheck==='function'){
    const ok=await sbSafeCheck('projects',selId,'Progress project ini');
    if(!ok)return;
  }
  p.plan=+$('uPlan').value;p.actual=+$('uActual').value;p.mpActual=+gv('uMp')||0;p.status=gv('uStat');
  const notes=gv('uNotes').trim();if(notes)p.notes=notes;
  if(!p.history)p.history=[];
  p.history.push({date:new Date().toLocaleDateString('id-ID'),actual:p.actual,plan:p.plan,mp:p.mpActual,notes});
  dirty();cm('updProgress');render();toast(`Progress: ${p.actual}% actual ✓`)
}
// ── CLIENT LOGO HELPERS ─────────────────────────────────────
// Logo disimpan TERPISAH dari data utama karena base64 terlalu besar untuk GSheet
function saveLogosCache(){
  try{
    const logos={};
    P.forEach(p=>{if(p.logo&&p.logo.startsWith('data:'))logos[p.id]=p.logo;});
    localStorage.setItem('atw_logos',JSON.stringify(logos));
  }catch(e){}
}
function loadLogosCache(){
  try{
    const logos=JSON.parse(localStorage.getItem('atw_logos')||'{}');
    P.forEach(p=>{if(!p.logo&&logos[p.id])p.logo=logos[p.id];});
  }catch(e){}
}
function previewClientLogo(input){
  const file=input.files[0];if(!file)return;
  if(file.size>307200){toast('Ukuran file terlalu besar (maks 300KB)','error');return;}
  const reader=new FileReader();
  reader.onload=e=>{
    sv('fLogo',e.target.result);
    setLogoPreview(e.target.result);
    toast('Logo dipilih ✓');
  };
  reader.readAsDataURL(file);
}
function setLogoPreview(src){
  const img=$('fLogoImg'),empty=$('fLogoEmpty'),preview=$('fLogoPreview');
  if(src){
    img.src=src;img.style.display='block';
    if(empty)empty.style.display='none';
    if(preview)preview.style.background='transparent';
  }else{
    img.src='';img.style.display='none';
    if(empty)empty.style.display='block';
    if(preview)preview.style.background='var(--sf2)';
  }
}
function clearClientLogo(){
  sv('fLogo','');setLogoPreview('');
  $('fLogoFile').value='';
  toast('Logo dihapus','warn');
}
// Ganti logo dashboard utama
function changeDashLogo(input){
  const file=input.files[0];if(!file)return;
  if(file.size>512000){toast('Ukuran file terlalu besar (maks 512KB)','error');return;}
  const reader=new FileReader();
  reader.onload=async e=>{
    const src=e.target.result;
    const img=$('dashLogoImg');if(img)img.src=src;
    try{localStorage.setItem('atw_dash_logo',src);}catch(err){}
    const btn=$('btnResetLogo');if(btn)btn.style.display='flex';
    // Simpan ke Supabase config (sumber kebenaran, berlaku semua browser/device)
    await syncDashLogoToSB(src);
    toast('Logo dashboard diganti ✓');
  };
  reader.readAsDataURL(file);
}
function resetDashLogo(){
  if(!confirm('Reset logo ke default ATW Solar?'))return;
  try{localStorage.removeItem('atw_dash_logo');}catch(e){}
  // Hapus dari Supabase config
  syncDashLogoToSB('');
  // Re-load page to restore original embedded logo
  location.reload();
}
// ── Simpan logo ke Supabase config table ────────────────────
async function syncDashLogoToSB(logoSrc){
  try{
    const client=_initSb();if(!client)return;
    const {error}=await client.from('config').upsert(
      {key:'dash_logo',value:logoSrc||'',updated_at:new Date().toISOString()},
      {onConflict:'key'}
    );
    if(error)console.warn('syncDashLogoToSB error:',error.message);
  }catch(e){console.warn('syncDashLogoToSB exception:',e);}
}
// ── Load logo saat startup: localStorage (instant) → Supabase (sumber kebenaran) ──
async function loadDashLogo(){
  // 1. Tampilkan dari localStorage dulu agar tidak blank saat loading
  try{
    const cached=localStorage.getItem('atw_dash_logo');
    if(cached){
      const img=$('dashLogoImg');if(img)img.src=cached;
      const btn=$('btnResetLogo');if(btn)btn.style.display='flex';
    }
  }catch(e){}
  // 2. Fetch dari Supabase config — ini sumber kebenaran, berlaku lintas device
  try{
    const client=_initSb();if(!client)return;
    const {data,error}=await client.from('config').select('value').eq('key','dash_logo').maybeSingle();
    if(error||!data)return;
    const src=data.value||'';
    if(src){
      const img=$('dashLogoImg');if(img)img.src=src;
      const btn=$('btnResetLogo');if(btn)btn.style.display='flex';
      // Update cache localStorage agar sinkron
      try{localStorage.setItem('atw_dash_logo',src);}catch(e){}
    } else {
      // Logo dikosongkan dari device lain — ikuti
      const hasLocal=!!localStorage.getItem('atw_dash_logo');
      if(hasLocal){
        try{localStorage.removeItem('atw_dash_logo');}catch(e){}
        // Tidak reload agar tidak mengganggu; logo default akan tampil setelah reload manual
      }
    }
  }catch(e){console.warn('loadDashLogo from Supabase failed:',e);}
}
function logoTag(p,h=36){
  if(!p?.logo)return `<span style="font-size:11px;color:var(--mt)">${p?.client||'\u2014'}</span>`;
  return `<img src="${p.logo}" style="height:${h}px;max-width:${h*3.5}px;object-fit:contain;border-radius:4px;vertical-align:middle" title="${p.client||''}" onerror="this.style.display='none'">`;
}

// ── PROCUREMENT KPI & STATUS WORKFLOW (merged from patch5) ───────────────────

var PROC_STATUSES = [
  'Waiting Approval','PO Issued','On Production',
  'In Transit','On Site','Done',
];
var PROC_TERMINAL = ['On Site','Done'];
var PROC_STATUS_COLOR = {
  'Waiting Approval':'var(--pu)', 'PO Issued':'#a9b4f5',
  'On Production':'#06b6d4', 'In Transit':'var(--bl)',
  'On Site':'var(--gn)', 'Done':'var(--mt)',
};

function _calcProcKpi(items) {
  var now = new Date(); now.setHours(0,0,0,0);
  var nowMs = now.getTime(), in3Ms = nowMs + 3*86400000;
  var overdue=0, dueToday=0;
  (items||[]).forEach(function(i){
    if(PROC_TERMINAL.indexOf(i.status)!==-1||!i.due)return;
    var d=typeof parseLocalDate==='function'?parseLocalDate(i.due):new Date(String(i.due).trim().slice(0,10)+'T00:00:00');
    d.setHours(0,0,0,0);
    var dMs=d.getTime();
    if(dMs<nowMs)overdue++;
    else if(dMs===nowMs)dueToday++;
  });
  return {overdue:overdue,dueToday:dueToday};
}

function _applyProcStatusColors() {
  var tbl=document.getElementById('procTable');
  if(!tbl)return;
  tbl.querySelectorAll('td span').forEach(function(span){
    var color=PROC_STATUS_COLOR[(span.textContent||'').trim()];
    if(color)span.style.color=color;
  });
}

function _patchProcFilter() {
  var sel=document.getElementById('procFilt');
  if(!sel||sel.dataset.p5ok)return;
  var html='<option value="">Semua Status</option>';
  PROC_STATUSES.forEach(function(s){html+='<option value="'+s+'">'+s+'</option>';});
  sel.innerHTML=html; sel.dataset.p5ok='1';
}

function toggleProcCost (status) {
    var wrap = document.getElementById('procCostWrap');
    if (!wrap) return;
    wrap.style.display =
      ['PO Issued', 'On Production', 'In Transit', 'On Site'].indexOf(status) !== -1
        ? 'block' : 'none';
  };
