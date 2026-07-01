// ===============================================================
// WEEKLY REPORT
// ===============================================================

// Weekly report photos \u2014 stored as base64 in memory
const wrPhotos = {}; // {1: {src, caption}, 2: ...}

function loadWrPhoto(n, input){
  const file = input.files[0]; if(!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    wrPhotos[n] = {src: e.target.result, caption: ''};
    // Update preview in modal
    const slot = $('wrPhotoSlot_'+n);
    if(slot){
      slot.innerHTML = `
        <img src="${e.target.result}" style="width:100%;height:90px;object-fit:contain;display:block;background:#f1f5f9">
        <button onclick="clearWrPhoto(${n},event)" style="position:absolute;top:2px;right:2px;background:rgba(239,68,68,.9);color:#fff;border:none;border-radius:50%;width:18px;height:18px;font-size:10px;cursor:pointer;line-height:1;padding:0"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" style="vertical-align:-1px;display:inline-block"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
        <input type="file" id="wrPhotoFile_${n}" accept="image/*" style="display:none" onchange="loadWrPhoto(${n},this)">`;
    }
    toast(`✓ Foto ${n} dimuat`);
  };
  reader.readAsDataURL(file);
}

function clearWrPhoto(n, e){
  e.stopPropagation();
  delete wrPhotos[n];
  const slot = $('wrPhotoSlot_'+n);
  if(slot){
    slot.innerHTML = `
      <span style="font-size:20px"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;display:inline-block"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></span>
      <span style="font-size:9px;color:var(--mt);margin-top:2px">Foto ${n}</span>
      <input type="file" id="wrPhotoFile_${n}" accept="image/*" style="display:none" onchange="loadWrPhoto(${n},this)">`;
    slot.onclick = () => document.getElementById('wrPhotoFile_'+n)?.click();
  }
  if($('wrPhotoCaption_'+n)) $('wrPhotoCaption_'+n).value='';
}

function previewWrPhoto(input, slotId, captionId){} // legacy stub

function populateWeekOptions(){
  const projId=$('wrProj')?.value;if(!projId)return;
  const proj=P.find(p=>String(p.id)===String(projId));
  const all=WBS.filter(w=>String(w.projId)===String(projId));
  const leafNodes=all.filter(w=>(w.type==='item')||(w.type==='subcat'&&!all.some(x=>x.type==='item'&&x.parentId===w.id)));
  const weekSet=new Set();
  leafNodes.forEach(n=>(n.dailyLogs||[]).forEach(l=>{if(l.week)weekSet.add(+l.week);}));
  SCURVE.filter(d=>String(d.projId)===String(projId)).forEach(d=>weekSet.add(+d.week));
  MPLOGS.filter(m=>String(m.projId)===String(projId)).forEach(m=>{
    const wn=getWbsWeekNum(projId,m.date);
    if(wn)weekSet.add(wn);
  });
  // Jika tidak ada data minggu tapi ada MPLOGS → kemungkinan proj.mulai tidak diisi
  // Fallback: gunakan urutan tanggal unik dari MPLOGS sebagai "minggu"
  if(!weekSet.size){
    const mpDates=[...new Set(MPLOGS.filter(m=>String(m.projId)===String(projId)).map(m=>m.date))].sort();
    if(mpDates.length){
      // Coba ambil mulai dari tanggal MP log pertama jika proj.mulai kosong
      const warn=$('wrWeekWarn');
      if(!proj?.mulai){
        if(warn)warn.style.display='block';
        // Estimasi minggu dari tanggal pertama MP log
        const firstDate=mpDates[0];
        mpDates.forEach(d=>{
          const diff=Math.floor((new Date(d)-new Date(firstDate))/86400000);
          weekSet.add(Math.floor(diff/7)+1);
        });
      }
    }
  }else{
    const warn=$('wrWeekWarn');if(warn)warn.style.display='none';
  }
  const weeks=[...weekSet].sort((a,b)=>a-b);
  const sel=$('wrWeek');
  if(!sel)return;
  if(!weeks.length){
    sel.innerHTML='<option value="">Belum ada data</option>';
    const warn=$('wrWeekWarn');
    if(warn){warn.style.display='block';warn.textContent='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;display:inline-block"><path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><line x1="12" y1="9" x2="12" y2="13"/><circle cx="12" cy="17" r=".5" fill="currentColor"/></svg> Pastikan Tanggal Mulai project sudah diisi dan ada data Daily Log / Manpower.';}
    return;
  }
  sel.innerHTML=weeks.map(w=>`<option value="${w}">W${String(w).padStart(2,'0')}</option>`).join('');
  sel.value=weeks[weeks.length-1];
}

function toggleMrCustom(){
  const v=gv('mrPeriod')||'';
  const w=$('mrCustomWrap');if(w)w.style.display=v==='custom'?'flex':'none';
}

function generateMpReport(){
  const projId=gv('mrProj')||'';
  const period=gv('mrPeriod')||'week';
  const today=new Date().toISOString().slice(0,10);
  let dateFrom='',dateTo=today,periodLabel='';

  if(period==='week'){
    const d=new Date();d.setDate(d.getDate()-d.getDay()+1);
    dateFrom=d.toISOString().slice(0,10);
    periodLabel='Minggu Ini ('+dateFrom+' s/d '+dateTo+')';
  } else if(period==='lastweek'){
    const d=new Date();d.setDate(d.getDate()-d.getDay()-6);
    dateFrom=d.toISOString().slice(0,10);
    const d2=new Date();d2.setDate(d2.getDate()-d2.getDay());
    dateTo=d2.toISOString().slice(0,10);
    periodLabel='Minggu Lalu ('+dateFrom+' s/d '+dateTo+')';
  } else if(period==='month'){
    dateFrom=today.slice(0,7)+'-01';
    periodLabel='Bulan Ini ('+dateFrom+' s/d '+dateTo+')';
  } else if(period==='all'){
    dateFrom='';periodLabel='Semua Periode';
  } else if(period==='custom'){
    dateFrom=gv('mrDateFrom')||'';
    dateTo=gv('mrDateTo')||today;
    periodLabel='Periode '+dateFrom+' s/d '+dateTo;
  }

  const proj=projId?P.find(p=>String(p.id)===String(projId)):null;
  const html=buildMpReportHTML(projId,dateFrom,dateTo,periodLabel,proj);
  cm('mpReport');

  const old=document.getElementById('mpReportFrame');if(old)old.remove();
  const oldC=document.getElementById('mpRCloseBtn');if(oldC)oldC.remove();
  const oldP=document.getElementById('mpRPrintBtn');if(oldP)oldP.remove();

  // Ambil logo dari localStorage atau dashLogoImg
  let _pdfLogo=''; try{_pdfLogo=localStorage.getItem('atw_dash_logo')||'';}catch(e){}
  if(!_pdfLogo){const _li=$('dashLogoImg');if(_li&&_li.src&&_li.src.startsWith('data:'))_pdfLogo=_li.src;}
  const _mpPrintDate=new Date().toLocaleDateString('id-ID',{weekday:'long',day:'2-digit',month:'long',year:'numeric'});
  const fullHtml=`<!DOCTYPE html><html><head><meta charset="UTF-8">
    <title>Manpower Report — ${proj?.kode||'All Projects'}</title>
    <style>
      
  /* report sengaja pakai Arial (font cetak profesional) */
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Arial,sans-serif;color:#1e293b;background:#f8fafc;-webkit-print-color-adjust:exact;print-color-adjust:exact;font-size:10px}
  .a4-page{width:794px;min-height:1123px;margin:20px auto;background:#fff;box-shadow:0 4px 24px rgba(0,0,0,.15);border-radius:2px}
  @media screen{body{padding:0 0 40px}}
  .pdf-wrap{width:100%;border-collapse:collapse;table-layout:fixed}
  .pdf-wrap thead td,.pdf-wrap tfoot td{padding:0}
  .pdf-wrap tbody td{padding:0;vertical-align:top}
  .pdf-hdr{display:flex;align-items:center;justify-content:space-between;padding:10px 18px;background:#1e293b;color:#f1f5f9;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .pdf-hdr-logo{height:34px;object-fit:contain;background:#fff;border-radius:3px;padding:2px 5px}
  .pdf-hdr-info{margin-left:12px}
  .pdf-hdr-title{font-size:12px;font-weight:700;letter-spacing:.3px}
  .pdf-hdr-sub{font-size:8px;color:#94a3b8;margin-top:2px;font-weight:400}
  .pdf-hdr-right{text-align:right;font-size:8.5px;color:#94a3b8;white-space:nowrap}
  .pdf-hdr-right strong{display:block;font-size:11px;color:#f1f5f9;margin-bottom:2px;font-weight:700}
  .pdf-hdr-spacer{height:12px}
  .pdf-ftr{display:flex;align-items:center;justify-content:space-between;padding:6px 18px;border-top:2px solid #1e293b;font-size:8px;color:#6b7280;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .pdf-ftr-spacer{height:8px}
  .wr-sec{margin-bottom:16px}
  .wr-sec-title{font-size:8px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;color:#475569;border-bottom:1.5px solid #f1f5f9;padding-bottom:4px;margin-bottom:10px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  table.data-table,table.wr-tbl{width:100%;border-collapse:collapse;font-size:9px}
  table.data-table th,table.wr-tbl th{background:#1e293b;color:#f1f5f9;padding:5px 8px;text-align:left;font-size:8px;letter-spacing:.5px;font-weight:600;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .data-table th.r,.data-table td.r,.wr-tbl th.r,.wr-tbl td.r{text-align:right}
  .data-table th.c,.data-table td.c,.wr-tbl th.c,.wr-tbl td.c{text-align:center}
  table.data-table td,table.wr-tbl td{padding:4px 8px;border-bottom:1px solid #e2e8f0;vertical-align:top;line-height:1.45}
  table.data-table tr:nth-child(even) td,table.wr-tbl tr:nth-child(even) td{background:#f8fafc;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .kat-row td{background:#f1f5f9!important;color:#1e293b!important;font-weight:700;font-size:9px;padding:5px 8px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .sub-row td{background:#f8fafc!important;font-size:8.5px;padding:3px 8px;color:#374151;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .total-row td{background:#1e293b!important;color:#f1f5f9!important;font-weight:700;padding:5px 8px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .badge{display:inline-block;padding:2px 7px;border-radius:4px;font-size:7.5px;font-weight:600;letter-spacing:.3px}
  .pb,.wr-pb{page-break-before:always;break-before:page}
  @media print{
    @page{size:A4 portrait;margin:0}
    body{background:#fff;padding:0 12mm}
    .pdf-wrap>thead>tr>td{padding-top:14mm}
    .pdf-wrap>tfoot>tr>td{padding-bottom:12mm}
    .a4-page{width:100%;min-height:auto;margin:0;box-shadow:none;border-radius:0}
    thead{display:table-header-group}
    tfoot{display:table-footer-group}
    tbody{display:table-row-group}
    tr{break-inside:avoid}
  }
  svg{width:100%!important;height:auto!important}
  svg text{font-size:9px!important;font-family:Arial,sans-serif!important}
  svg text[font-weight='bold']{font-size:10px!important;font-weight:700!important}
  svg text[text-anchor='middle']{font-size:8px!important}
  svg text[text-anchor='end']{font-size:8px!important}
    </style>
  </head><body>
  <table class="pdf-wrap"><thead><tr><td>
    <div class="pdf-hdr">
      <div style="display:flex;align-items:center;flex:1">
        <img class="pdf-hdr-logo" src="${_pdfLogo}" alt="" onerror="this.style.display='none'">
        <div class="pdf-hdr-info">
          <div class="pdf-hdr-title">ATW SOLAR &mdash; PROJECT PERFORMANCE</div>
          <div class="pdf-hdr-sub">Manpower Report &mdash; ${proj?.kode||'All Projects'}</div>
        </div>
      </div>
      <div style="flex:0 0 auto;display:flex;align-items:center;justify-content:center;padding:0 18px">
        ${proj?.logo?('<img src="'+proj.logo+'" style="height:28px;max-width:110px;object-fit:contain;background:#fff;border-radius:3px;padding:2px 5px">'):''}
      </div>
      <div class="pdf-hdr-right" style="flex:0 0 auto">
        <strong>${proj?.name||'All Projects'}</strong>
        <span>Periode: ${periodLabel}</span>
      </div>
    </div>
    <div class="pdf-hdr-spacer"></div>
  </td></tr></thead>
  <tfoot><tr><td>
    <div class="pdf-ftr-spacer"></div>
    <div class="pdf-ftr">
      <span>ATW Solar &mdash; Project Performance</span>
      <span>Dicetak: ${_mpPrintDate}</span>
    </div>
  </td></tr></tfoot>
  <tbody><tr><td>${html}</td></tr></tbody>
  </table>
  </body></html>`;

  const iframe=document.createElement('iframe');
  iframe.id='mpReportFrame';
  iframe.style.cssText='position:fixed;top:0;left:0;width:100%;height:100%;z-index:99999;border:none;background:#fff;display:block';
  document.body.appendChild(iframe);

  // Tulis HTML langsung ke iframe document (aman di semua environment)
  const iDoc=iframe.contentDocument||iframe.contentWindow.document;
  iDoc.open();iDoc.write(fullHtml);iDoc.close();

  setTimeout(()=>{
    const closeBtn=document.createElement('button');
    closeBtn.innerHTML='<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" style="vertical-align:-1px;display:inline-block"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> Tutup';closeBtn.id='mpRCloseBtn';
    closeBtn.style.cssText='position:fixed;top:12px;right:12px;z-index:100000;background:#ef4444;color:#fff;border:none;border-radius:6px;padding:8px 16px;font-size:12px;cursor:pointer;font-weight:600;box-shadow:0 2px 8px rgba(0,0,0,.3)';
    closeBtn.onclick=()=>{iframe.remove();closeBtn.remove();printBtn.remove();const _mb=document.getElementById('wrModeBtn');if(_mb)_mb.remove();};
    document.body.appendChild(closeBtn);
    const printBtn=document.createElement('button');
    printBtn.innerHTML='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;display:inline-block"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg> Print / Save PDF';printBtn.id='mpRPrintBtn';
    printBtn.style.cssText='position:fixed;top:12px;right:100px;z-index:100000;background:#475569;color:#fff;border:none;border-radius:6px;padding:8px 16px;font-size:12px;cursor:pointer;font-weight:600;box-shadow:0 2px 8px rgba(0,0,0,.3)';
    printBtn.onclick=()=>iframe.contentWindow.print();
    document.body.appendChild(printBtn);
  },100);
}

function buildMpReportHTML(projId,dateFrom,dateTo,periodLabel,proj){
  const today=new Date().toISOString().slice(0,10);
  const fmtD=d=>d?d.split('-').reverse().join('/'):'-';
  // Logo: coba localStorage, lalu src dari dashLogoImg
  let logo='';
  try{logo=localStorage.getItem('atw_dash_logo')||'';}catch(e){}
  if(!logo){const img=$('dashLogoImg');if(img&&img.src&&!img.src.includes('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAlg'))logo=img.src;}

  // Filter logs
  const logs=MPLOGS.filter(m=>{
    if(projId&&String(m.projId)!==String(projId))return false;
    if(dateFrom&&m.date<dateFrom)return false;
    if(dateTo&&m.date>dateTo)return false;
    return true;
  }).sort((a,b)=>a.date>b.date?1:-1);

  // Aggregate per WBS item dari activities[]
  const wbsMap=new Map();
  logs.forEach(log=>{
    const pr=P.find(p=>String(p.id)===String(log.projId));
    (log.activities||[]).forEach(act=>{
      const key=(act.wbsId||'_')+'|'+log.projId;
      if(!wbsMap.has(key)) wbsMap.set(key,{
        wbsId:act.wbsId||'',wbsName:act.wbsName||'(tanpa nama)',
        projKode:pr?.kode||'\u2014',projNama:pr?.nama||'',projId:String(log.projId),
        entries:[],spv:0,mandor:0,installer:0,tukang:0,helper:0,safety:0,total:0
      });
      const r=wbsMap.get(key);
      r.entries.push({date:log.date,spv:+act.spv||0,mandor:+act.mandor||0,
        installer:+act.installer||0,tukang:+act.tukang||0,helper:+act.helper||0,
        safety:+act.safety||0,total:+act.total||0,notes:act.notes||''});
      r.spv+=(+act.spv||0);r.mandor+=(+act.mandor||0);r.installer+=(+act.installer||0);
      r.tukang+=(+act.tukang||0);r.helper+=(+act.helper||0);r.safety+=(+act.safety||0);
      r.total+=(+act.total||0);
    });
  });

  const rows=[...wbsMap.values()].sort((a,b)=>a.projId.localeCompare(b.projId)||b.total-a.total);
  const grandTot={spv:0,mandor:0,installer:0,tukang:0,helper:0,safety:0,total:0};
  rows.forEach(r=>{grandTot.spv+=r.spv;grandTot.mandor+=r.mandor;grandTot.installer+=r.installer;
    grandTot.tukang+=r.tukang;grandTot.helper+=r.helper;grandTot.safety+=r.safety;grandTot.total+=r.total;});

  // Daily summary
  const dailyMap=new Map();
  logs.forEach(m=>{
    if(!dailyMap.has(m.date))dailyMap.set(m.date,{spv:0,mandor:0,installer:0,tukang:0,helper:0,safety:0,total:0,mh:0,tl:0});
    const d=dailyMap.get(m.date);
    d.spv+=(+m.spv||0);d.mandor+=(+m.mandor||0);d.installer+=(+m.installer||0);
    d.tukang+=(+m.tukang||0);d.helper+=(+m.helper||0);d.safety+=(+m.safety||0);
    d.total+=(+m.total||0);d.mh+=(+m.mhActual||0);d.tl+=(+m.timeLost||0);
  });
  const dailyRows=[...dailyMap.entries()].sort((a,b)=>a[0]>b[0]?1:-1);
  const totalMD=logs.reduce((s,m)=>s+(+m.total||0),0);
  const totalMH=logs.reduce((s,m)=>s+(+m.mhActual||0),0);
  const totalTL=logs.reduce((s,m)=>s+(+m.timeLost||0),0);

  const logoHtml=logo?`<img src="${logo}" style="height:54px;object-fit:contain">`:
    `<div style="font-weight:900;font-size:22px;color:#475569;letter-spacing:1px">ATW SOLAR</div>`;
  const clientLogoHtml=(proj&&proj.logo)?`<img src="${proj.logo}" style="height:50px;max-width:150px;object-fit:contain">`:'';
  const projLabel=proj?`${proj.kode} \u2014 ${proj.nama}${proj.client?' ('+proj.client+')':''}${proj.mdPlan?' '+proj.mdPlan:''}`:'Semua Project';

  // ── Page 1 ──
  let html=`
  <div style="padding:20px 24px 16px">

    ${'<'}!-- HEADER -->
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:18px;border-bottom:3px solid #475569;padding-bottom:12px">
      <div style="display:flex;align-items:center;gap:16px">${clientLogoHtml}${logoHtml}</div>
      <div style="text-align:right">
        <div style="font-size:13px;font-weight:700;color:#1e293b;margin-bottom:2px">${projLabel}</div>
        <div style="font-size:13px;font-weight:700;color:#475569">${periodLabel}</div>
        <div style="font-size:10px;color:#64748b;margin-top:3px">Dicetak: ${fmtD(today)} | ${logs.length} hari log | ${totalMD} orang-hari</div>
      </div>
    </div>

    ${'<'}!-- KPI CARDS -->
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px">
      ${[
        {l:'TOTAL MANDAYS',v:totalMD+' MD',c:'#475569'},
        {l:'TOTAL MANHOURS',v:totalMH+' Jam',c:'#475569'},
        {l:'TIME LOST',v:totalTL+' Jam',c:totalTL>0?'#ef4444':'#16a34a'},
        {l:'ITEM PEKERJAAN',v:rows.length+' item',c:'#475569'},
      ].map(k=>`<div style="border:1px solid #e2e8f0;border-radius:8px;padding:12px 10px;text-align:center;border-top:3px solid ${k.c}">
        <div style="font-size:8px;color:#64748b;text-transform:uppercase;letter-spacing:.8px;margin-bottom:6px">${k.l}</div>
        <div style="font-size:24px;font-weight:800;color:${k.c}">${k.v}</div>
      </div>`).join('')}
    </div>

    ${'<'}!-- REKAP HARIAN -->
    <div style="margin-bottom:6px;font-size:11px;font-weight:700;color:#1e293b;text-transform:uppercase;letter-spacing:.5px;border-left:4px solid #475569;padding-left:8px">REKAP HARIAN</div>
    <table style="width:100%;border-collapse:collapse;font-size:10px">
      <thead>
        <tr style="background:#1e293b">
          <th style="color:#f1f5f9;padding:6px 8px;text-align:left;font-size:9px;letter-spacing:.4px">Tanggal</th>
          <th style="color:#f1f5f9;padding:6px 8px;text-align:center;font-size:9px">SPV</th>
          <th style="color:#f1f5f9;padding:6px 8px;text-align:center;font-size:9px">Mandor</th>
          <th style="color:#f1f5f9;padding:6px 8px;text-align:center;font-size:9px">Installer</th>
          <th style="color:#f1f5f9;padding:6px 8px;text-align:center;font-size:9px">Tukang</th>
          <th style="color:#f1f5f9;padding:6px 8px;text-align:center;font-size:9px">Helper</th>
          <th style="color:#f1f5f9;padding:6px 8px;text-align:center;font-size:9px">Safety</th>
          <th style="color:#f1f5f9;padding:6px 8px;text-align:center;font-size:9px">Total</th>
          <th style="color:#f1f5f9;padding:6px 8px;text-align:center;font-size:9px">MH (jam)</th>
          <th style="color:#f1f5f9;padding:6px 8px;text-align:center;font-size:9px">TL (jam)</th>
        </tr>
      </thead>
      <tbody>
        ${dailyRows.map(([date,d],i)=>`<tr style="background:${i%2===0?'#fff':'#f8fafc'}">
          <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;font-weight:600">${fmtD(date)}</td>
          <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;text-align:center">${d.spv||'\u2014'}</td>
          <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;text-align:center">${d.mandor||'\u2014'}</td>
          <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;text-align:center">${d.installer||'\u2014'}</td>
          <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;text-align:center">${d.tukang||'\u2014'}</td>
          <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;text-align:center">${d.helper||'\u2014'}</td>
          <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;text-align:center">${d.safety||'\u2014'}</td>
          <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;text-align:center;font-weight:700;color:#475569">${d.total}</td>
          <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;text-align:center">${d.mh||'\u2014'}</td>
          <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;text-align:center;color:${d.tl>0?'#ef4444':'#94a3b8'}">${d.tl||'\u2014'}</td>
        </tr>`).join('')}
        <tr style="background:#1e293b">
          <td style="padding:6px 8px;color:#f1f5f9;font-weight:700">TOTAL</td>
          <td style="padding:6px 8px;color:#f1f5f9;text-align:center;font-weight:700">${grandTot.spv||0}</td>
          <td style="padding:6px 8px;color:#f1f5f9;text-align:center;font-weight:700">${grandTot.mandor||0}</td>
          <td style="padding:6px 8px;color:#f1f5f9;text-align:center;font-weight:700">${grandTot.installer||0}</td>
          <td style="padding:6px 8px;color:#f1f5f9;text-align:center;font-weight:700">${grandTot.tukang||0}</td>
          <td style="padding:6px 8px;color:#f1f5f9;text-align:center;font-weight:700">${grandTot.helper||0}</td>
          <td style="padding:6px 8px;color:#f1f5f9;text-align:center;font-weight:700">${grandTot.safety||0}</td>
          <td style="padding:6px 8px;color:#475569;text-align:center;font-weight:700">${totalMD}</td>
          <td style="padding:6px 8px;color:#f1f5f9;text-align:center;font-weight:700">${totalMH}</td>
          <td style="padding:6px 8px;color:${totalTL>0?'#fca5a5':'#f1f5f9'};text-align:center;font-weight:700">${totalTL||'\u2014'}</td>
        </tr>
      </tbody>
    </table>
  </div>

  ${'<'}!-- PAGE 2: Rekap per Item -->
  <div class="pb" style="padding:20px 24px 16px">

    ${'<'}!-- HEADER PAGE 2 -->
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;border-bottom:3px solid #475569;padding-bottom:10px">
      <div>
        <div style="font-size:16px;font-weight:800;color:#1e293b;letter-spacing:.3px">REKAP MANPOWER PER ITEM PEKERJAAN</div>
        <div style="font-size:10px;color:#64748b;margin-top:2px">${projLabel} | ${periodLabel}</div>
      </div>
      ${logoHtml}
    </div>

    ${'<'}!-- TABLE REKAP -->
    ${rows.length===0?`<div style="text-align:center;color:#94a3b8;padding:40px;font-size:12px">Belum ada data assignment aktivitas pada periode ini</div>`:`
    <table style="width:100%;border-collapse:collapse;font-size:10px;margin-bottom:20px">
      <thead>
        <tr style="background:#1e293b">
          <th style="color:#f1f5f9;padding:6px 8px;text-align:left;font-size:9px">Item Pekerjaan</th>
          <th style="color:#f1f5f9;padding:6px 8px;text-align:left;font-size:9px">Project</th>
          <th style="color:#f1f5f9;padding:6px 8px;text-align:center;font-size:9px">SPV</th>
          <th style="color:#f1f5f9;padding:6px 8px;text-align:center;font-size:9px">Mandor</th>
          <th style="color:#f1f5f9;padding:6px 8px;text-align:center;font-size:9px">Inst</th>
          <th style="color:#f1f5f9;padding:6px 8px;text-align:center;font-size:9px">Tukang</th>
          <th style="color:#f1f5f9;padding:6px 8px;text-align:center;font-size:9px">Helper</th>
          <th style="color:#f1f5f9;padding:6px 8px;text-align:center;font-size:9px">Safety</th>
          <th style="color:#f1f5f9;padding:6px 8px;text-align:center;font-size:9px">Total MD</th>
          <th style="color:#f1f5f9;padding:6px 8px;text-align:center;font-size:9px">%</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map(r=>{
          const pct=grandTot.total>0?Math.round(r.total/grandTot.total*100):0;
          const subRows=r.entries.sort((a,b)=>a.date>b.date?1:-1).map(e=>`
          <tr style="background:#f8fafc">
            <td style="padding:3px 8px 3px 20px;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:9px">${fmtD(e.date)}${e.notes?' \u2014 '+e.notes.slice(0,50):''}</td>
            <td style="padding:3px 8px;border-bottom:1px solid #e2e8f0"></td>
            <td style="padding:3px 8px;border-bottom:1px solid #e2e8f0;text-align:center;font-size:9px">${e.spv||'\u2014'}</td>
            <td style="padding:3px 8px;border-bottom:1px solid #e2e8f0;text-align:center;font-size:9px">${e.mandor||'\u2014'}</td>
            <td style="padding:3px 8px;border-bottom:1px solid #e2e8f0;text-align:center;font-size:9px">${e.installer||'\u2014'}</td>
            <td style="padding:3px 8px;border-bottom:1px solid #e2e8f0;text-align:center;font-size:9px">${e.tukang||'\u2014'}</td>
            <td style="padding:3px 8px;border-bottom:1px solid #e2e8f0;text-align:center;font-size:9px">${e.helper||'\u2014'}</td>
            <td style="padding:3px 8px;border-bottom:1px solid #e2e8f0;text-align:center;font-size:9px">${e.safety||'\u2014'}</td>
            <td style="padding:3px 8px;border-bottom:1px solid #e2e8f0;text-align:center;font-size:9px;font-weight:600;color:#475569">${e.total}</td>
            <td style="padding:3px 8px;border-bottom:1px solid #e2e8f0"></td>
          </tr>`).join('');
          return`<tr style="background:#f8fafc">
            <td style="padding:6px 8px;border-bottom:1px solid #cbd5e1;font-weight:700;color:#1e293b">${r.wbsName}</td>
            <td style="padding:6px 8px;border-bottom:1px solid #cbd5e1;font-size:9px;color:#475569;font-weight:600">${r.projKode}</td>
            <td style="padding:6px 8px;border-bottom:1px solid #cbd5e1;text-align:center">${r.spv||'\u2014'}</td>
            <td style="padding:6px 8px;border-bottom:1px solid #cbd5e1;text-align:center">${r.mandor||'\u2014'}</td>
            <td style="padding:6px 8px;border-bottom:1px solid #cbd5e1;text-align:center">${r.installer||'\u2014'}</td>
            <td style="padding:6px 8px;border-bottom:1px solid #cbd5e1;text-align:center">${r.tukang||'\u2014'}</td>
            <td style="padding:6px 8px;border-bottom:1px solid #cbd5e1;text-align:center">${r.helper||'\u2014'}</td>
            <td style="padding:6px 8px;border-bottom:1px solid #cbd5e1;text-align:center">${r.safety||'\u2014'}</td>
            <td style="padding:6px 8px;border-bottom:1px solid #cbd5e1;text-align:center;font-weight:700;color:#475569">${r.total}</td>
            <td style="padding:6px 8px;border-bottom:1px solid #cbd5e1;text-align:center;font-size:9px;color:#64748b">${pct}%</td>
          </tr>${subRows}`;
        }).join('')}
        <tr style="background:#1e293b">
          <td colspan="2" style="padding:7px 8px;color:#f1f5f9;font-weight:700;font-size:11px">GRAND TOTAL \u2014 ${rows.length} item</td>
          <td style="padding:7px 8px;color:#f1f5f9;text-align:center;font-weight:700">${grandTot.spv||0}</td>
          <td style="padding:7px 8px;color:#f1f5f9;text-align:center;font-weight:700">${grandTot.mandor||0}</td>
          <td style="padding:7px 8px;color:#f1f5f9;text-align:center;font-weight:700">${grandTot.installer||0}</td>
          <td style="padding:7px 8px;color:#f1f5f9;text-align:center;font-weight:700">${grandTot.tukang||0}</td>
          <td style="padding:7px 8px;color:#f1f5f9;text-align:center;font-weight:700">${grandTot.helper||0}</td>
          <td style="padding:7px 8px;color:#f1f5f9;text-align:center;font-weight:700">${grandTot.safety||0}</td>
          <td style="padding:7px 8px;color:#475569;text-align:center;font-weight:700">${grandTot.total}</td>
          <td style="padding:7px 8px;color:#f1f5f9;text-align:center;font-weight:700">100%</td>
        </tr>
      </tbody>
    </table>`}

    ${'<'}!-- SIGNATURE -->
    <div style="margin-top:40px;display:flex;justify-content:space-around">
      ${['Site Manager','Project Manager','Diketahui oleh'].map(role=>`
      <div style="text-align:center">
        <div style="height:44px;border-bottom:1px solid #1e293b;width:150px;margin:0 auto"></div>
        <div style="margin-top:5px;font-size:10px;color:#64748b">${role}</div>
      </div>`).join('')}
    </div>
  </div>`;

  return html;
}

function generateWeeklyReport(){
  const projId=$('wrProj').value;
  const week=+$('wrWeek').value;
  if(!projId||!week){toast('Pilih project dan minggu','warn');return;}

  // Guard: pastikan data project sudah di-load oleh patch4 sebelum generate
  const _wbsLoaded  = WBS.some(w=>String(w.projId)===String(projId));
  const _scLoaded   = SCURVE.some(s=>String(s.projId)===String(projId));
  const _p4loaded   = window._p4 && window._p4.loaded;
  const _alreadyLoaded = _p4loaded
    ? _p4loaded.has(String(projId))
    : (_wbsLoaded || _scLoaded);

  if(!_alreadyLoaded && typeof window.loadProjectData==='function'){
    toast('Memuat data proyek, harap tunggu...','info');
    window.loadProjectData(projId).then(()=>{
      generateWeeklyReport();
    });
    return;
  }

  // Collect captions into wrPhotos before building HTML
  for(let n=1;n<=6;n++){
    const cap=$('wrPhotoCaption_'+n)?.value?.trim()||'';
    if(wrPhotos[n])wrPhotos[n].caption=cap;
  }

  const html=buildWeeklyReportHTML(projId,week,window._wrRecoveryMode||'aggressive');
  cm('weeklyReport');

  const old=document.getElementById('weeklyPrintFrame');if(old)old.remove();
  const oldC=document.getElementById('wrCloseBtn');if(oldC)oldC.remove();
  const oldP=document.getElementById('wrPrintBtn');if(oldP)oldP.remove();
  const oldM=document.getElementById('wrModeBtn');if(oldM)oldM.remove();

  // Ambil logo
  let _wrLogo=''; try{_wrLogo=localStorage.getItem('atw_dash_logo')||'';}catch(e){}
  if(!_wrLogo){const _wli=$('dashLogoImg');if(_wli&&_wli.src&&_wli.src.startsWith('data:'))_wrLogo=_wli.src;}
  const _wrPrintDate=new Date().toLocaleDateString('id-ID',{weekday:'long',day:'2-digit',month:'long',year:'numeric'});
  const _wrProj=P.find(p=>String(p.id)===String(projId));
  const fullHtml=`<!DOCTYPE html><html><head><meta charset="UTF-8">
    <title>Weekly Report W${String(week).padStart(2,'0')}</title>
    <style>
      
  /* report sengaja pakai Arial (font cetak profesional) */
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Arial,sans-serif;color:#1e293b;background:#f8fafc;-webkit-print-color-adjust:exact;print-color-adjust:exact;font-size:10px}
  .a4-page{width:794px;min-height:1123px;margin:20px auto;background:#fff;box-shadow:0 4px 24px rgba(0,0,0,.15);border-radius:2px}
  @media screen{body{padding:0 0 40px}}
  .pdf-wrap{width:100%;border-collapse:collapse;table-layout:fixed}
  .pdf-wrap thead td,.pdf-wrap tfoot td{padding:0}
  .pdf-wrap tbody td{padding:0;vertical-align:top}
  .pdf-hdr{display:flex;align-items:center;justify-content:space-between;padding:10px 18px;background:#1e293b;color:#f1f5f9;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .pdf-hdr-logo{height:34px;object-fit:contain;background:#fff;border-radius:3px;padding:2px 5px}
  .pdf-hdr-info{margin-left:12px}
  .pdf-hdr-title{font-size:12px;font-weight:700;letter-spacing:.3px}
  .pdf-hdr-sub{font-size:8px;color:#94a3b8;margin-top:2px;font-weight:400}
  .pdf-hdr-right{text-align:right;font-size:8.5px;color:#94a3b8;white-space:nowrap}
  .pdf-hdr-right strong{display:block;font-size:11px;color:#f1f5f9;margin-bottom:2px;font-weight:700}
  .pdf-hdr-spacer{height:12px}
  .pdf-ftr{display:flex;align-items:center;justify-content:space-between;padding:6px 18px;border-top:2px solid #1e293b;font-size:8px;color:#6b7280;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .pdf-ftr-spacer{height:8px}
  .wr-sec{margin-bottom:16px}
  .wr-sec-title{font-size:8px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;color:#475569;border-bottom:1.5px solid #f1f5f9;padding-bottom:4px;margin-bottom:10px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  table.data-table,table.wr-tbl{width:100%;border-collapse:collapse;font-size:9px}
  table.data-table th,table.wr-tbl th{background:#1e293b;color:#f1f5f9;padding:5px 8px;text-align:left;font-size:8px;letter-spacing:.5px;font-weight:600;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .data-table th.r,.data-table td.r,.wr-tbl th.r,.wr-tbl td.r{text-align:right}
  .data-table th.c,.data-table td.c,.wr-tbl th.c,.wr-tbl td.c{text-align:center}
  table.data-table td,table.wr-tbl td{padding:4px 8px;border-bottom:1px solid #e2e8f0;vertical-align:top;line-height:1.45}
  table.data-table tr:nth-child(even) td,table.wr-tbl tr:nth-child(even) td{background:#f8fafc;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .kat-row td{background:#f1f5f9!important;color:#1e293b!important;font-weight:700;font-size:9px;padding:5px 8px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .sub-row td{background:#f8fafc!important;font-size:8.5px;padding:3px 8px;color:#374151;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .total-row td{background:#1e293b!important;color:#f1f5f9!important;font-weight:700;padding:5px 8px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .badge{display:inline-block;padding:2px 7px;border-radius:4px;font-size:7.5px;font-weight:600;letter-spacing:.3px}
  .pb,.wr-pb{page-break-before:always;break-before:page}
  @media print{
    @page{size:A4 portrait;margin:0}
    body{background:#fff;padding:0 12mm}
    .pdf-wrap>thead>tr>td{padding-top:14mm}
    .pdf-wrap>tfoot>tr>td{padding-bottom:12mm}
    .a4-page{width:100%;min-height:auto;margin:0;box-shadow:none;border-radius:0}
    thead{display:table-header-group}
    tfoot{display:table-footer-group}
    tbody{display:table-row-group}
    tr{break-inside:avoid}
  }
  svg{width:100%!important;height:auto!important}
  svg text{font-size:9px!important;font-family:Arial,sans-serif!important}
  svg text[font-weight='bold']{font-size:10px!important;font-weight:700!important}
  svg text[text-anchor='middle']{font-size:8px!important}
  svg text[text-anchor='end']{font-size:8px!important}
    </style>
  </head><body>
  <table class="pdf-wrap"><thead><tr><td>
    <div class="pdf-hdr">
      <div style="display:flex;align-items:center;flex:1">
        <img class="pdf-hdr-logo" src="${_wrLogo}" alt="" onerror="this.style.display='none'">
        <div class="pdf-hdr-info">
          <div class="pdf-hdr-title">ATW SOLAR &mdash; PROJECT PERFORMANCE</div>
          <div class="pdf-hdr-sub">Weekly Report &mdash; Week ${String(week).padStart(2,'0')}</div>
        </div>
      </div>
      <div style="flex:0 0 auto;display:flex;align-items:center;justify-content:center;padding:0 18px">
        ${_wrProj?.logo?('<img src="'+_wrProj.logo+'" style="height:28px;max-width:110px;object-fit:contain;background:#fff;border-radius:3px;padding:2px 5px">'):''}
      </div>
      <div class="pdf-hdr-right" style="flex:0 0 auto">
        <strong>${_wrProj?.kode||''} ${_wrProj?.name||''}</strong>
        <span>Week ${String(week).padStart(2,'0')} / ${new Date().getFullYear()}</span>
      </div>
    </div>
    <div class="pdf-hdr-spacer"></div>
  </td></tr></thead>
  <tfoot><tr><td>
    <div class="pdf-ftr-spacer"></div>
    <div class="pdf-ftr">
      <span>ATW Solar &mdash; Project Performance</span>
      <span>Dicetak: ${_wrPrintDate}</span>
    </div>
  </td></tr></tfoot>
  <tbody><tr><td>${html}</td></tr></tbody>
  </table>
  </body></html>`;

  const iframe=document.createElement('iframe');
  iframe.id='weeklyPrintFrame';
  iframe.style.cssText='position:fixed;top:0;left:0;width:100%;height:100%;z-index:99999;border:none;background:#fff;display:block';
  document.body.appendChild(iframe);

  // Tulis HTML langsung ke iframe document (aman di semua environment)
  const iDoc=iframe.contentDocument||iframe.contentWindow.document;
  iDoc.open();iDoc.write(fullHtml);iDoc.close();

  // Tunggu sebentar agar konten render dulu
  setTimeout(()=>{
    const closeBtn=document.createElement('button');
    closeBtn.innerHTML='<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" style="vertical-align:-1px;display:inline-block"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> Tutup Preview';closeBtn.id='wrCloseBtn';
    closeBtn.style.cssText='position:fixed;top:12px;right:12px;z-index:100000;background:#ef4444;color:#fff;border:none;border-radius:6px;padding:8px 16px;font-size:12px;cursor:pointer;font-weight:600;box-shadow:0 2px 8px rgba(0,0,0,.3)';
    closeBtn.onclick=()=>{iframe.remove();closeBtn.remove();printBtn.remove();const _mb=document.getElementById('wrModeBtn');if(_mb)_mb.remove();};
    document.body.appendChild(closeBtn);
    const printBtn=document.createElement('button');
    printBtn.innerHTML='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;display:inline-block"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg> Print / Save PDF';printBtn.id='wrPrintBtn';
    printBtn.style.cssText='position:fixed;top:12px;right:160px;z-index:100000;background:#475569;color:#fff;border:none;border-radius:6px;padding:8px 16px;font-size:12px;cursor:pointer;font-weight:600;box-shadow:0 2px 8px rgba(0,0,0,.3)';
    printBtn.onclick=()=>iframe.contentWindow.print();
    document.body.appendChild(printBtn);
    const modeBtn=document.createElement('button');
    const _rm=window._wrRecoveryMode||'aggressive';
    modeBtn.innerHTML=(_rm==='spread'?'\u26a1 Mode: Realistis (sebar)':'\u26a1 Mode: Agresif (kejar)');
    modeBtn.id='wrModeBtn';
    modeBtn.title='Ganti cara hitung target catch-up di Workplan Next Week';
    modeBtn.style.cssText='position:fixed;top:12px;right:300px;z-index:100000;background:#6366f1;color:#fff;border:none;border-radius:6px;padding:8px 16px;font-size:12px;cursor:pointer;font-weight:600;box-shadow:0 2px 8px rgba(0,0,0,.3)';
    modeBtn.onclick=()=>{window._wrRecoveryMode=(window._wrRecoveryMode==='spread'?'aggressive':'spread');generateWeeklyReport();};
    document.body.appendChild(modeBtn);
  },100);
}


function buildWeeklyReportHTML(projId,week,recoveryMode){
  recoveryMode=recoveryMode||'aggressive';
  const proj=P.find(p=>String(p.id)===String(projId));if(!proj)return '';
  const all=WBS.filter(w=>String(w.projId)===String(projId));
  const cats=all.filter(w=>w.type==='cat').sort((a,b)=>a.order-b.order);
  const leafNodes=all.filter(w=>(w.type==='item')||(w.type==='subcat'&&!all.some(x=>x.type==='item'&&x.parentId===w.id)));

  // Week date range
  let weekStartDate=null,weekEndDate=null,weekStart='',weekEnd='';
  if(proj.mulai){
    const _raw=new Date(proj.mulai+'T00:00:00');
    const _dow=_raw.getDay();const _snap=_dow===0?-6:1-_dow;
    const _base=new Date(_raw.getTime()+_snap*86400000);
    weekStartDate=new Date(_base.getTime()+(week-1)*7*86400000);
    weekEndDate=new Date(weekStartDate.getTime()+6*86400000);
    weekStart=weekStartDate.toLocaleDateString('id-ID',{day:'2-digit',month:'short',year:'numeric'});
    weekEnd=weekEndDate.toLocaleDateString('id-ID',{day:'2-digit',month:'short',year:'numeric'});
  }
  const fmtD=d=>d?new Date(d+'T12:00').toLocaleDateString('id-ID',{day:'2-digit',month:'short',year:'numeric'}):'';

  // S-Curve
  const sc=SCURVE.find(d=>String(d.projId)===String(projId)&&d.week===week)||{};
  const cumPlan=+(sc.cPlan||0);const cumAct=+(sc.cAct||0);
  const wPlan=+(sc.wPlan||0);const wAct=+(sc.wAct||0);
  const variance=cumAct-cumPlan;
  const statusTxt=variance>=-3?'On Track':variance>=-10?'Delayed':'Critical';
  const statusClr=variance>=-3?'#16a34a':variance>=-10?'#d97706':'#dc2626';

  // Manpower this week
  const mpLogs=MPLOGS.filter(m=>m.projId==projId&&getWbsWeekNum(projId,m.date)===week);
  const totalWorkers=mpLogs.reduce((s,m)=>s+(+m.total||0),0);
  const totalMH=mpLogs.reduce((s,m)=>s+(+m.mhActual||0),0);
  const timeLost=mpLogs.reduce((s,m)=>s+(+m.timeLost||0),0);
  const timeLostReasons=[...new Set(mpLogs.filter(m=>+m.timeLost>0).map(m=>m.timeLostReason).filter(Boolean))].join(', ');
  const totalSpv=mpLogs.reduce((s,m)=>s+(+m.spv||0),0);
  const totalMandor=mpLogs.reduce((s,m)=>s+(+m.mandor||0),0);
  const totalInstaller=mpLogs.reduce((s,m)=>s+(+m.installer||0),0);
  const totalTukang=mpLogs.reduce((s,m)=>s+(+m.tukang||0),0);
  const totalHelper=mpLogs.reduce((s,m)=>s+(+m.helper||0),0);
  const totalSafety=mpLogs.reduce((s,m)=>s+(+m.safety||0),0);

  // Daily activities this week
  const dailyData={};
  leafNodes.forEach(node=>{
    (node.dailyLogs||[]).filter(l=>l.week===week).forEach(l=>{
      if(!dailyData[l.date])dailyData[l.date]={items:[],mp:null};
      dailyData[l.date].items.push({node,log:l});
    });
  });
  mpLogs.forEach(m=>{if(!dailyData[m.date])dailyData[m.date]={items:[],mp:null};dailyData[m.date].mp=m;});
  const sortedDates=Object.keys(dailyData).sort();

  // Issues
  const issues=ISS.filter(i=>i.projId==projId&&i.status!=='Closed');

  // Accident logs this week
  const accLogs=ACCLOGS.filter(a=>a.projId==projId&&getWbsWeekNum(projId,a.date)===week);

  // Logo
  // Logo client dari project, logo ATW dari konstant
  const clientLogoHtml=proj.logo
    ?`<img src="${proj.logo}" style="height:50px;max-width:160px;object-fit:contain">`
    :`<div style="width:120px;height:50px;background:#f1f5f9;border:1px dashed #cbd5e1;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:9px;color:#94a3b8">Client Logo</div>`;
  const atwLogoHtml=`<img src="${ATW_LOGO_B64}" style="height:54px;max-width:180px;object-fit:contain">`;

  // Table styles
  const ts=`border:1px solid #d1d5db;border-collapse:collapse;width:100%;font-size:10px`;
  const th=`background:#e2e8f0;color:#1e293b;font-weight:700;padding:4px 6px;border:1px solid #9ca3af;text-align:center;font-size:9px;text-transform:uppercase`;
  const td=`padding:4px 6px;border:1px solid #d1d5db;vertical-align:top;color:#1e293b`;
  const tdc=`padding:4px 6px;border:1px solid #d1d5db;text-align:center;vertical-align:middle;color:#1e293b`;

  let html=`<div style="font-family:Arial,sans-serif;color:#1e293b;background:#fff;padding:20px 24px;max-width:794px;margin:0 auto;font-size:10px">

  ${'<'}!-- PROJECT INFO -->
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">
    <div>
      <table style="${ts}">
        <tr><td style="${td};font-weight:700;background:#475569;color:#fff;width:120px">Project</td><td style="${td}">${proj.kode} \u2014 ${proj.nama}</td></tr>
        <tr><td style="${td};font-weight:700;background:#f9fafb">Client</td><td style="${td}">${proj.client||'\u2014'}</td></tr>
        <tr><td style="${td};font-weight:700;background:#f9fafb">Lokasi</td><td style="${td}">${proj.lokasi||'\u2014'}</td></tr>
        <tr><td style="${td};font-weight:700;background:#f9fafb">Periode</td><td style="${td}">${weekStart} \u2014 ${weekEnd}</td></tr>
        <tr><td style="${td};font-weight:700;background:#f9fafb">Minggu</td><td style="${td};font-weight:700;color:#475569">W${String(week).padStart(2,'0')}</td></tr>
      </table>
    </div>
    <div>
      <table style="${ts}">
        <tr><td style="background:#1e293b;color:#f1f5f9;font-weight:700;padding:5px 6px;border:1px solid #0f172a;text-align:center;font-size:9px;text-transform:uppercase" colspan="4">PROGRESS REPORT</td></tr>
        <tr><th style="${th}">Indikator</th><th style="${th}">Weekly</th><th style="${th}">Kumulatif</th><th style="${th}">Status</th></tr>
        <tr><td style="${td};font-weight:700;color:#3b82f6">Plan</td><td style="${tdc}">${wPlan.toFixed(2)}%</td><td style="${tdc};font-weight:700">${cumPlan.toFixed(2)}%</td><td rowspan="2" style="${tdc};font-weight:700;color:${statusClr};font-size:12px">${statusTxt}</td></tr>
        <tr><td style="${td};font-weight:700;color:#16a34a">Actual</td><td style="${tdc}">${wAct.toFixed(2)}%</td><td style="${tdc};font-weight:700;color:#1e293b">${cumAct.toFixed(2)}%</td></tr>
        <tr><td style="${td};font-weight:700">Variance</td><td colspan="2" style="${tdc};font-weight:700;color:${statusClr}">${variance>=0?'+':''}${variance.toFixed(2)}%</td><td style="${tdc}"></td></tr>
        <tr><td style="${td};font-weight:700">Progress Bar</td><td colspan="3" style="${td}">
          <div style="margin-bottom:4px">
            <div style="font-size:8px;color:#3b82f6;margin-bottom:1px">Plan ${cumPlan.toFixed(1)}%</div>
            <div style="height:8px;background:#e5e7eb;border-radius:3px"><div style="width:${Math.min(100,cumPlan)}%;height:100%;background:#3b82f6;border-radius:3px"></div></div>
          </div>
          <div>
            <div style="font-size:8px;color:#16a34a;margin-bottom:1px">Actual ${cumAct.toFixed(1)}%</div>
            <div style="height:8px;background:#e5e7eb;border-radius:3px"><div style="width:${Math.min(100,cumAct)}%;height:100%;background:#16a34a;border-radius:3px"></div></div>
          </div>
        </td></tr>
      </table>
    </div>
  </div>

  ${'<'}!-- SECTION 1: PEKERJAAN MINGGU INI -->
  <div style="background:#374151;color:#fff;text-align:center;padding:5px;font-weight:700;font-size:11px;margin-bottom:0">PEKERJAAN MINGGU INI (W${String(week).padStart(2,'0')})</div>
  <table style="${ts};margin-bottom:10px">
    <tr>
      <th style="${th};width:40px">#</th>
      <th style="${th}">Item Pekerjaan</th>
      <th style="${th};width:55px">Bobot</th>
      <th style="${th};width:70px">Qty Plan</th>
      <th style="${th};width:80px">Achievement Last Week</th>
      <th style="${th};width:70px">Qty W${String(week).padStart(2,'0')}</th>
      <th style="${th};width:70px">Qty Cum.</th>
      <th style="${th};width:60px">% Selesai</th>
      <th style="${th};width:70px">Kontribusi</th>
      <th style="${th};width:55px">Satuan</th>
    </tr>`;

  // WBS rows
  cats.forEach((cat,ci)=>{
    html+=`<tr style="background:#f1f5f9;color:#1e293b"><td style="${tdc};font-weight:700;color:#334155">${String.fromCharCode(65+ci)}</td><td style="${td};font-weight:700;color:#334155" colspan="9">${cat.name}</td></tr>`;
    all.filter(w=>w.type==='subcat'&&w.parentId===cat.id).sort((a,b)=>a.order-b.order).forEach((sub,si)=>{
      const subItems=all.filter(w=>w.type==='item'&&w.parentId===sub.id).sort((a,b)=>a.order-b.order);
      const isLeaf=subItems.length===0;
      if(isLeaf){html+=_wrItemRowNew(`${ci+1}.${si+1}`,sub,week,th,td,tdc,true);}
      else{
        html+=`<tr style="background:#dcfce7;color:#15803d"><td style="${tdc};color:#15803d">${ci+1}.${si+1}</td><td style="${td};font-weight:600;color:#15803d" colspan="9">${sub.name}</td></tr>`;
        subItems.forEach((item,ii)=>{html+=_wrItemRowNew(`${ci+1}.${si+1}.${ii+1}`,item,week,th,td,tdc,false);});
      }
    });
  });
  // Totals row
  const totalKontrib=leafNodes.reduce((s,n)=>s+_drNodeKontrib(n,weekStartDate?weekEndDate.toISOString().slice(0,10):new Date().toISOString().slice(0,10)),0);
  html+=`<tr style="background:#e2e8f0;color:#1e293b;font-weight:700">
    <td style="${tdc}" colspan="7">TOTAL KONTRIBUSI MINGGU INI</td>
    <td style="${tdc};color:#16a34a">${(totalKontrib*100).toFixed(2)}%</td><td></td>
  </tr>`;
  html+=`</table>`;

  // SECTION 2: AKTIVITAS HARIAN
  html+=`<div style="background:#374151;color:#fff;text-align:center;padding:5px;font-weight:700;font-size:11px;margin-bottom:0;break-after:avoid;page-break-after:avoid">AKTIVITAS HARIAN</div>
  <table style="${ts};margin-bottom:10px;border-top:none">
    <thead style="display:table-header-group">
      <tr>
        <th style="${th};background:#374151;color:#fff;width:80px">Tanggal</th>
        <th style="${th};background:#374151;color:#fff;width:40px">Hari</th>
        <th style="${th};background:#374151;color:#fff">Item Pekerjaan</th>
        <th style="${th};background:#374151;color:#fff;width:80px">Qty Dikerjakan</th>
        <th style="${th};background:#374151;color:#fff;width:60px">Kontribusi</th>
        <th style="${th};background:#374151;color:#fff">Catatan / Kendala</th>
        <th style="${th};background:#374151;color:#fff;width:60px">Pekerja</th>
        <th style="${th};background:#374151;color:#fff;width:55px">MH (jam)</th>
        <th style="${th};background:#374151;color:#fff;width:55px">Time Lost</th>
      </tr>
    </thead>
    <tbody>`;
  if(sortedDates.length){
    sortedDates.forEach(date=>{
      const dd=dailyData[date];
      const d=new Date(date+'T12:00');
      const dayName=d.toLocaleDateString('id-ID',{weekday:'short'});
      const dateLabel=d.toLocaleDateString('id-ID',{day:'2-digit',month:'short',year:'2-digit'});
      const mp=dd.mp||{};
      const tl=+mp.timeLost||0;
      const rowspan=Math.max(1,dd.items.length);
      const mpCell=`<td style="${tdc}" rowspan="${rowspan}">${mp.total||'\u2014'}</td><td style="${tdc}" rowspan="${rowspan}">${mp.mhActual||'\u2014'}</td><td style="${tdc};color:${tl>0?'#dc2626':'#64748b'}" rowspan="${rowspan}">${tl>0?tl+'h':'\u2014'}</td>`;
      if(!dd.items.length){
        html+=`<tr><td style="${tdc}">${dateLabel}</td><td style="${tdc}">${dayName}</td><td style="${td}" colspan="4" style="color:#94a3b8;font-style:italic">Manpower only / No activity logged</td>${mpCell}</tr>`;
      }else{
        dd.items.forEach(({node,log},idx)=>{
          const qty=log.qty!=null?+log.qty:0;
          const qtyPlan=+node.qtyPlan||0;
          const kontrib=qtyPlan>0?(+node.bobot||0)/100*(qty/qtyPlan)*100:0;
          html+=`<tr>
            ${idx===0?`<td style="${tdc}" rowspan="${rowspan}">${dateLabel}</td><td style="${tdc}" rowspan="${rowspan}">${dayName}</td>`:''}
            <td style="${td}">${node.name}</td>
            <td style="${tdc};font-weight:700;color:#16a34a">${qty>0?'+'+qty+' '+(node.qtySatuan||''):'\u2014'}</td>
            <td style="${tdc}">${kontrib>0?kontrib.toFixed(2)+'%':'\u2014'}</td>
            <td style="${td};color:#64748b;font-size:9px">${log.notes||'\u2014'}</td>
            ${idx===0?mpCell:''}
          </tr>`;
        });
      }
    });
  }else{
    html+=`<tr><td colspan="9" style="${tdc};color:#94a3b8;padding:12px">Belum ada data aktivitas harian untuk minggu ini</td></tr>`;
  }
  html+=`</tbody></table>`;

  // SECTION 3: MANPOWER & TIME LOST
  html+=`<div style="background:#374151;color:#fff;text-align:center;padding:5px;font-weight:700;font-size:11px;margin-bottom:0">REKAPITULASI MANPOWER & TIME LOST</div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">
    <table style="${ts}">
      <tr><th style="background:#475569;color:#fff;font-weight:700;padding:5px 6px;border:1px solid #334155;text-align:center;font-size:9px;text-transform:uppercase" colspan="8">MANPOWER WEEKLY SUMMARY</th></tr>
      <tr><th style="${th}">Tgl</th><th style="${th}">SPV</th><th style="${th}">Mdr</th><th style="${th}">Inst</th><th style="${th}">Tkng</th><th style="${th}">Hlpr</th><th style="${th}">Safety</th><th style="${th}">Total</th></tr>`;
  mpLogs.sort((a,b)=>a.date.localeCompare(b.date)).forEach(m=>{
    html+=`<tr><td style="${tdc};font-size:9px">${m.date.slice(5)}</td><td style="${tdc}">${m.spv||0}</td><td style="${tdc}">${m.mandor||0}</td><td style="${tdc}">${m.installer||0}</td><td style="${tdc}">${m.tukang||0}</td><td style="${tdc}">${m.helper||0}</td><td style="${tdc}">${m.safety||0}</td><td style="${tdc};font-weight:700">${m.total||0}</td></tr>`;
  });
  html+=`<tr style="background:#e2e8f0;color:#1e293b;font-weight:700"><td style="${tdc}">TOTAL</td><td style="${tdc}">${totalSpv}</td><td style="${tdc}">${totalMandor}</td><td style="${tdc}">${totalInstaller}</td><td style="${tdc}">${totalTukang}</td><td style="${tdc}">${totalHelper}</td><td style="${tdc}">${totalSafety}</td><td style="${tdc};color:#475569">${totalWorkers}</td></tr>`;
  html+=`</table>
    <table style="${ts}">
      <tr><th style="background:#475569;color:#fff;font-weight:700;padding:5px 6px;border:1px solid #334155;text-align:center;font-size:9px;text-transform:uppercase" colspan="3">TIME LOST RECORD</th></tr>
      <tr><th style="${th}">Tanggal</th><th style="${th}">Jam Lost</th><th style="${th}">Penyebab</th></tr>`;
  const tlLogs=mpLogs.filter(m=>+m.timeLost>0);
  if(tlLogs.length){
    tlLogs.forEach(m=>{html+=`<tr><td style="${tdc};font-size:9px">${m.date}</td><td style="${tdc};color:#dc2626;font-weight:700">${m.timeLost}h</td><td style="${td};font-size:9px">${m.timeLostReason||'\u2014'}</td></tr>`;});
  }else{
    html+=`<tr><td colspan="3" style="${tdc};color:#16a34a">Tidak ada time lost minggu ini</td></tr>`;
  }
  html+=`<tr style="background:#e2e8f0;color:#1e293b;font-weight:700"><td style="${tdc}">TOTAL</td><td style="${tdc};color:${timeLost>0?'#dc2626':'#16a34a'}">${timeLost}h</td><td style="${td};font-size:9px">${timeLostReasons||'\u2014'}</td></tr>`;
  html+=`</table></div>`;

  // SECTION 4: HSE
  const hseItems=['Safety Briefing','Toolbox Meeting','Safety Patrol','P3K Check','APD Check','Fire Extinguisher Check'];
  html+=`<div style="background:#374151;color:#fff;text-align:center;padding:5px;font-weight:700;font-size:11px;margin-bottom:0">HSE PROGRAM</div>
  <table style="${ts};margin-bottom:10px">
    <tr><th style="${th}">Program</th><th style="${th};width:50px">Qty</th><th style="${th}">Remarks</th><th style="${th}">Findings</th><th style="${th};width:50px">Qty</th><th style="${th}">Remarks</th></tr>`;
  hseItems.forEach((item,i)=>{
    html+=`<tr><td style="${td}">${item}</td><td style="${tdc}"></td><td style="${td}"></td>${i===0?`<td style="${td}" rowspan="${hseItems.length}">Near Miss / Incident / Unsafe Act</td><td style="${tdc}" rowspan="${hseItems.length}"></td><td style="${td}" rowspan="${hseItems.length}"></td>`:''}</tr>`;
  });
  html+=`</table>`;

  // SECTION 5: ISSUES
  if(issues.length){
    html+=`<div style="background:#374151;color:#fff;text-align:center;padding:5px;font-weight:700;font-size:11px;margin-bottom:0">OPEN ISSUES & CONSTRAINTS</div>
    <table style="${ts};margin-bottom:10px">
      <tr><th style="${th};width:80px">Tanggal</th><th style="${th}">Uraian</th><th style="${th};width:70px">Prioritas</th><th style="${th}">PIC</th><th style="${th};width:70px">Status</th></tr>`;
    issues.forEach(i=>{
      const pClr=i.prioritas==='Critical'?'#dc2626':i.prioritas==='High'?'#475569':'#334155';
      html+=`<tr><td style="${tdc};font-size:9px">${i.tgl||'\u2014'}</td><td style="${td}">${i.uraian||'\u2014'}</td><td style="${tdc};color:${pClr};font-weight:700">${i.prioritas||'\u2014'}</td><td style="${td}">${i.pj||'\u2014'}</td><td style="${tdc};color:${i.status==='Open'?'#475569':'#16a34a'}">${i.status||'\u2014'}</td></tr>`;
    });
    html+=`</table>`;
  }

  // SECTION 6: WORKPLAN NEXT WEEK
  const _wpTh=`background:#334155;color:#fff;font-weight:700;padding:6px 7px;border:1px solid #64748b;text-align:center;font-size:8.5px;text-transform:uppercase;letter-spacing:.4px;-webkit-print-color-adjust:exact;print-color-adjust:exact`;
  const _wpTd=`padding:5px 8px;border:1px solid #e5e9f0;vertical-align:middle;color:#1e293b;font-size:9.5px`;
  const _wpTdc=`padding:5px 6px;border:1px solid #e5e9f0;text-align:center;vertical-align:middle;color:#475569;font-size:9.5px`;
  html+=`<div style="background:#1e293b;color:#fff;text-align:center;padding:7px;font-weight:700;font-size:11px;letter-spacing:1.2px;border-radius:5px 5px 0 0;-webkit-print-color-adjust:exact;print-color-adjust:exact">WORKPLAN NEXT WEEK \u00b7 W${String(week+1).padStart(2,'0')}</div>
  <table style="border:1px solid #cbd5e1;border-collapse:collapse;width:100%;font-size:9.5px;margin-bottom:9px">
    <tr><th style="${_wpTh};width:34px">#</th><th style="${_wpTh};text-align:left">Item Pekerjaan</th><th style="${_wpTh};width:66px">Target Qty</th><th style="${_wpTh};width:52px">Satuan</th><th style="${_wpTh};width:62px">Target %</th><th style="${_wpTh};text-align:left">Rencana Aktivitas</th></tr>`;
  // Aktual kumulatif per item DIHITUNG SAMPAI minggu laporan (bukan nilai live sekarang),
  // supaya laporan minggu lampau mencerminkan kondisi pada waktunya.
  const _cumActAt=(node)=>{
    if(+node.qtyPlan>0){
      const q=(node.dailyLogs||[]).filter(l=>l.week<=week).reduce((s,l)=>s+(l.qty!=null?+l.qty:0),0);
      return Math.min(100,(q/+node.qtyPlan)*100);
    }
    return +(node.cumActual||0); // item tanpa qty/dailyLogs: tak bisa direkonstruksi historis
  };
  // Item "carry-over": belum selesai aktual (<100%) tetapi tidak ada plan ke depan
  // (plan-nya sudah habis di minggu lampau). Tetap dimasukkan dgn target = sisa ke 100%.
  const _carryOver=(node)=>{
    if(_cumActAt(node)>=100)return false;
    const wpAll=node.weeklyPlan||{};
    let hasPast=false,hasFuture=false;
    Object.keys(wpAll).forEach(k=>{const w=+k,v=+(wpAll[k].wPlan||0);if(v>0){if(w<=week)hasPast=true;if(w>=week+1)hasFuture=true;}});
    return hasPast&&!hasFuture;
  };
  let nwRow=0;
  cats.forEach((cat,ci)=>{
    const catLeaves=[];
    all.filter(w=>w.type==='subcat'&&String(w.parentId)===String(cat.id)).sort((a,b)=>+a.order-+b.order).forEach(sub=>{
      const subItems=all.filter(w=>w.type==='item'&&String(w.parentId)===String(sub.id)).sort((a,b)=>+a.order-+b.order);
      if(subItems.length===0){
        const wp=sub.weeklyPlan&&sub.weeklyPlan[week+1];
        const done=_cumActAt(sub)>=100;
        if(wp&&+(wp.wPlan||0)>0&&!done)catLeaves.push({node:sub,wp,subName:null});
        else if(!done&&_carryOver(sub))catLeaves.push({node:sub,wp:null,subName:null,carry:true});
      } else {
        subItems.forEach(item=>{
          const wp=item.weeklyPlan&&item.weeklyPlan[week+1];
          const done=_cumActAt(item)>=100;
          if(wp&&+(wp.wPlan||0)>0&&!done)catLeaves.push({node:item,wp,subName:sub.name});
          else if(!done&&_carryOver(item))catLeaves.push({node:item,wp:null,subName:sub.name,carry:true});
        });
      }
    });
    if(!catLeaves.length)return;
    // Header kategori — biru gelap
    html+=`<tr style="background:#1e293b;-webkit-print-color-adjust:exact;print-color-adjust:exact">
      <td style="padding:5px 6px;border:1px solid #1e293b;text-align:center;background:#1e293b;color:#fff;font-weight:700;font-size:9px">${String.fromCharCode(65+ci)}</td>
      <td colspan="5" style="padding:5px 8px;border:1px solid #1e293b;font-weight:700;font-size:9px;color:#fff;letter-spacing:.7px;background:#1e293b">${cat.name.toUpperCase()}</td>
    </tr>`;
    let lastSub=null;
    catLeaves.forEach(({node,wp,subName,carry})=>{
      // Sub-header subcategory (mis. agar 'Mobilization' jelas di bawah subcat apa)
      if(subName && subName!==lastSub){
        html+=`<tr style="background:#eef2f7;-webkit-print-color-adjust:exact;print-color-adjust:exact">
          <td style="border:1px solid #dbe3ec;background:#eef2f7"></td>
          <td colspan="5" style="padding:3px 8px 3px 16px;border:1px solid #dbe3ec;border-left:3px solid #64748b;font-weight:700;font-size:7.5px;color:#475569;letter-spacing:.6px;background:#eef2f7;text-transform:uppercase">${subName}</td>
        </tr>`;
        lastSub=subName;
      } else if(!subName){ lastSub=null; }
      nwRow++;
      const _cumAct=_cumActAt(node);
      let _adjTarget,_planW,_rencana,_subLabel;
      if(carry){
        // Pekerjaan tertinggal: target = sisa untuk selesai (100% - aktual)
        _planW=0;
        _adjTarget=Math.max(0,100-_cumAct);
        _rencana=(node.weeklyPlan&&Object.keys(node.weeklyPlan).length)?'Penyelesaian sisa pekerjaan (carry-over)':'';
        _subLabel=`sisa \u2192 100% \u00b7 aktual ${_cumAct.toFixed(1)}%`;
      } else {
        // Target disesuaikan dgn aktual: plan kumulatif s/d minggu depan - aktual kumulatif saat ini
        const _wpAll=node.weeklyPlan||{};
        let _cumPlanNext=+(wp.cumPlan||0);
        if(!(_cumPlanNext>0)){_cumPlanNext=0;for(let _w=1;_w<=week+1;_w++){if(_wpAll[_w])_cumPlanNext+=(+(_wpAll[_w].wPlan)||0);}}
        _planW=+(wp.wPlan||0);
        if(recoveryMode==='spread'){
          let _finishW=week+1;
          Object.keys(_wpAll).forEach(_k=>{const _kn=+_k;if(_kn>_finishW&&((+(_wpAll[_k].wPlan)||0)>0||(+(_wpAll[_k].cumPlan)||0)>0))_finishW=_kn;});
          const _remW=Math.max(1,_finishW-week);
          const _deficit=(_cumPlanNext-_planW)-_cumAct;
          _adjTarget=Math.max(0,_planW+_deficit/_remW);
        } else {
          _adjTarget=Math.max(0,_cumPlanNext-_cumAct);
        }
        _rencana=wp.rencana||'';
        _subLabel=`plan ${_planW.toFixed(1)}%`;
      }
      const _diff=_adjTarget-_planW;
      const _adjClr=carry?'#b91c1c':(_diff>0.05?'#b91c1c':(_diff<-0.05?'#16a34a':'#334155'));
      const qty=+node.qtyPlan?Math.round(+node.qtyPlan*(_adjTarget/100)):'';
      const _tag=carry?` <span style="font-size:6.5px;font-weight:700;color:#b91c1c;border:1px solid #b91c1c;border-radius:3px;padding:0 3px;letter-spacing:.3px;vertical-align:1px">CARRY-OVER</span>`:'';
      const _zebra=(nwRow%2===0)?'background:#f8fafc;':'';
      html+=`<tr style="${_zebra}-webkit-print-color-adjust:exact;print-color-adjust:exact">
        <td style="${_wpTdc};color:#94a3b8;font-size:9px;white-space:nowrap">${nwRow}</td>
        <td style="${_wpTd};padding-left:${subName?26:14}px;font-weight:500">${node.name}${_tag}</td>
        <td style="${_wpTdc};font-family:'Courier New',monospace;font-size:9px;color:#1e293b">${qty}</td>
        <td style="${_wpTdc};color:#64748b;font-size:9px">${node.qtySatuan||''}</td>
        <td style="${_wpTdc};font-weight:700;color:${_adjClr};font-size:10px">${_adjTarget.toFixed(1)}%<div style="font-size:6.5px;color:#94a3b8;font-weight:400;margin-top:1px">${_subLabel}</div></td>
        <td style="${_wpTd};color:#475569;font-size:9px">${_rencana}</td>
      </tr>`;
    });
  });
  html+=`</table>`;
  const _modeNote=recoveryMode==='spread'
    ? 'Mode <b>Realistis</b>: defisit disebar rata ke sisa minggu sampai item selesai (target = plan mingguan + defisit\u00f7sisa minggu).'
    : 'Mode <b>Agresif</b>: seluruh defisit dikejar minggu depan (= plan kumulatif s/d minggu depan \u2212 aktual saat ini).';
  html+=`<div style="font-size:7.5px;color:#64748b;line-height:1.5;background:#f8fafc;border:1px solid #e5e9f0;border-radius:4px;padding:6px 9px;margin:0 0 10px"><b style="color:#475569">Keterangan Target %</b> \u2014 ${_modeNote} <span style="color:#b91c1c;font-weight:700">Merah</span> = perlu mengejar, <span style="color:#16a34a;font-weight:700">hijau</span> = di depan rencana. <b style="color:#b91c1c">CARRY-OVER</b> = pekerjaan belum selesai (aktual &lt;100%) walau plan sudah habis; target = sisa untuk selesai.</div>`;

  // SIGNATURE
  html+=`<table style="${ts};margin-top:8px">
    <tr>
      <td style="${tdc};width:33%;padding:8px"><div style="font-size:9px;color:#64748b;margin-bottom:35px">Dibuat oleh / Prepared by</div><div style="border-top:1px solid #94a3b8;padding-top:4px;font-size:9px;color:#374151">SPV / Project Engineer</div></td>
      <td style="${tdc};width:33%;padding:8px"><div style="font-size:9px;color:#64748b;margin-bottom:35px">Diperiksa oleh / Checked by</div><div style="border-top:1px solid #94a3b8;padding-top:4px;font-size:9px;color:#374151">HSE Officer / Site Manager</div></td>
      <td style="${tdc};width:33%;padding:8px"><div style="font-size:9px;color:#64748b;margin-bottom:35px">Disetujui oleh / Approved by</div><div style="border-top:1px solid #94a3b8;padding-top:4px;font-size:9px;color:#374151">Project Manager</div></td>
    </tr>
  </table>
  <div style="text-align:center;font-size:8px;color:#94a3b8;margin-top:8px">
    Generated by ATW Solar Dashboard \u2014 ${new Date().toLocaleDateString('id-ID',{weekday:'long',day:'2-digit',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'})}
  </div>
  </div>

  ${'<'}!-- =========== PAGE 2 =========== -->
  <div class="wr-pb"></div>
  <div style="font-family:Arial,sans-serif;color:#1e293b;background:#fff;padding:20px 24px;max-width:794px;margin:0 auto;font-size:10px">

  ${'<'}!-- PAGE 2 HEADER -->
  ${'<'}!-- S-CURVE SECTION -->
  <div style="background:#374151;color:#fff;text-align:center;padding:5px;font-weight:700;font-size:11px;margin-bottom:8px">S-CURVE PROGRESS \u2014 W${String(week).padStart(2,'0')}</div>

  ${'<'}!-- S-Curve Table Data -->
  <table style="${ts};margin-bottom:10px">
    <tr><th style="${th}">Minggu</th><th style="${th};text-align:right">W.Plan</th><th style="${th};text-align:right">W.Actual</th><th style="${th};text-align:right">Cum.Plan</th><th style="${th};text-align:right">Cum.Actual</th><th style="${th};text-align:right">Variance</th><th style="${th}">Status</th></tr>
    ${(()=>{
      const scData=(()=>{const _m=new Map();SCURVE.filter(d=>String(d.projId)===String(projId)).forEach(d=>{const _e=_m.get(d.week);if(!_e||((_e.cAct==null||_e.cAct==='')&&d.cAct!=null))_m.set(d.week,d);});return [..._m.values()].sort((a,b)=>a.week-b.week);})();
      if(!scData.length)return`<tr><td colspan="7" style="${tdc};color:#94a3b8;padding:12px">Belum ada data S-Curve</td></tr>`;
      return scData.filter(d=>+d.week<=week).map(d=>{
        const v=(+(d.cAct||0))-(+(d.cPlan||0));
        const clr=v>=-3?'#16a34a':v>=-10?'#d97706':'#dc2626';
        const isThisWeek=d.week===week;
        return`<tr style="${isThisWeek?'background:#f8fafc;color:#475569;font-weight:700':''}">
          <td style="${tdc}${isThisWeek?';color:#475569':''}">${isThisWeek?'\u25B6 ':''}W${String(d.week).padStart(2,'0')}</td>
          <td style="${tdc}">${(+d.wPlan||0).toFixed(2)}%</td>
          <td style="${tdc}">${(+d.wAct||0).toFixed(2)}%</td>
          <td style="${tdc};font-weight:600">${(+d.cPlan||0).toFixed(2)}%</td>
          <td style="${tdc};color:#475569;font-weight:600">${(+d.cAct||0).toFixed(2)}%</td>
          <td style="${tdc};color:${clr};font-weight:600">${v>=0?'+':''}${v.toFixed(2)}%</td>
          <td style="${tdc};font-size:9px;color:${clr}">${v>=-3?'On Track':v>=-10?'Delayed':'Critical'}</td>
        </tr>`;
      }).join('');
    })()}
  </table>

  <!-- S-Curve Line Chart -->
  <div style="margin-bottom:16px;padding:10px 0;background:#fff;border:1px solid #e2e8f0;border-radius:6px">
    <div style="font-size:9px;font-weight:700;color:#374151;margin-bottom:10px;text-transform:uppercase;letter-spacing:1px;padding:0 14px">S-CURVE PROGRESS CHART</div>
    ${(()=>{
      const scData=(()=>{const _m=new Map();SCURVE.filter(d=>String(d.projId)===String(projId)).forEach(d=>{const _e=_m.get(d.week);if(!_e||((_e.cAct==null||_e.cAct==='')&&d.cAct!=null))_m.set(d.week,d);});return [..._m.values()].sort((a,b)=>a.week-b.week);})();
      if(!scData.length)return'<div style="text-align:center;color:#94a3b8;font-size:10px;padding:30px">Belum ada data S-Curve</div>';

      const W=560, H=200;
      const padL=36, padR=20, padT=20, padB=30;
      const chartW=W-padL-padR, chartH=H-padT-padB;
      const n=scData.length;

      // X positions \u2014 evenly spaced weeks
      const xPos=i=>padL+i/(Math.max(n-1,1))*chartW;
      // Y position \u2014 0% at bottom, 100% at top
      const yPos=v=>padT+chartH-(v/100)*chartH;

      // Build plan and actual polyline points
      let planPts='', actPts='';
      let planArea='', actArea='';
      let planFirst=true, actFirst=true;
      let planAreaPts=`${padL},${padT+chartH}`, actAreaPts=`${padL},${padT+chartH}`;

      scData.forEach((d,i)=>{
        const x=xPos(i);
        const yPlan=yPos(+d.cPlan||0);
        const yAct=yPos(+d.cAct||0);
        planPts+=(planFirst?'':' ')+`${x},${yPlan}`;
        planAreaPts+=` ${x},${yPlan}`;
        planFirst=false;
        if((+d.cAct||0)>0||(+d.wAct||0)>0){
          actPts+=(actFirst?'':' ')+`${x},${yAct}`;
          actAreaPts+=` ${x},${yAct}`;
          actFirst=false;
        }
      });
      // Find last actual data point index
      let lastActIdx=0;
      scData.forEach((d,i)=>{if((+d.cAct||0)>0)lastActIdx=i;});
      planAreaPts+=` ${xPos(n-1)},${padT+chartH}`;
      actAreaPts+=` ${xPos(lastActIdx)},${padT+chartH}`;

      // Grid lines Y (0,25,50,75,100)
      let gridY='';
      [0,25,50,75,100].forEach(p=>{
        const y=yPos(p);
        gridY+=`<line x1="${padL}" y1="${y}" x2="${W-padR}" y2="${y}" stroke="#f1f5f9" stroke-width="1"/>`;
        gridY+=`<text x="${padL-4}" y="${y+3}" text-anchor="end" font-size="7" fill="#94a3b8">${p}%</text>`;
      });

      // Grid lines X + week labels
      let gridX='', labels='';
      const step=n<=10?1:n<=20?2:Math.ceil(n/10);
      scData.forEach((d,i)=>{
        if(i%step!==0&&i!==n-1)return;
        const x=xPos(i);
        const isNow=d.week===week;
        gridX+=`<line x1="${x}" y1="${padT}" x2="${x}" y2="${padT+chartH}" stroke="${isNow?'rgba(0,0,0,.18)':'#f1f5f9'}" stroke-width="${isNow?2:1}"/>`;
        labels+=`<text x="${x}" y="${padT+chartH+12}" text-anchor="middle" font-size="7" fill="${isNow?'#475569':'#94a3b8'}" font-weight="${isNow?'bold':'normal'}">W${String(d.week).padStart(2,'0')}</text>`;
      });

      // Data point dots + tooltips
      let dots='';
      scData.forEach((d,i)=>{
        const x=xPos(i);
        const isNow=d.week===week;
        const yP=yPos(+d.cPlan||0);
        const yA=yPos(+d.cAct||0);
        dots+=`<circle cx="${x}" cy="${yP}" r="${isNow?4:2.5}" fill="#3b82f6" opacity="${isNow?1:0.7}"/>`;
        if((+d.cAct||0)>0){
          dots+=`<circle cx="${x}" cy="${yA}" r="${isNow?4:2.5}" fill="#16a34a" opacity="${isNow?1:0.7}"/>`;
        }
        // Label for current week
        if(isNow){
          dots+=`<text x="${x}" y="${yP-6}" text-anchor="middle" font-size="8" fill="#3b82f6" font-weight="bold">${(+d.cPlan||0).toFixed(1)}%</text>`;
          if((+d.cAct||0)>0){
            dots+=`<text x="${x}" y="${yA-6}" text-anchor="middle" font-size="8" fill="#16a34a" font-weight="bold">${(+d.cAct||0).toFixed(1)}%</text>`;
          }
        }
      });

      return`<svg viewBox="0 0 ${W} ${H}" width="100%" style="display:block;overflow:visible">
        <style>text{font-family:Arial,sans-serif;font-size:9px;font-weight:400}text[font-weight="bold"]{font-size:10px}text[text-anchor="middle"]{font-size:8px}text[text-anchor="end"]{font-size:8px}</style>
        ${'<'}!-- Grid -->
        ${gridY}${gridX}
        ${'<'}!-- Axes -->
        <line x1="${padL}" y1="${padT}" x2="${padL}" y2="${padT+chartH}" stroke="#e2e8f0" stroke-width="1.5"/>
        <line x1="${padL}" y1="${padT+chartH}" x2="${W-padR}" y2="${padT+chartH}" stroke="#e2e8f0" stroke-width="1.5"/>
        ${'<'}!-- Plan area fill -->
        <polygon points="${planAreaPts}" fill="rgba(0,0,0,.04)"/>
        ${'<'}!-- Actual area fill -->
        <polygon points="${actAreaPts}" fill="rgba(0,0,0,.04)"/>
        ${'<'}!-- Plan line -->
        <polyline points="${planPts}" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" stroke-dasharray="5,3"/>
        ${'<'}!-- Actual line -->
        <polyline points="${actPts}" fill="none" stroke="#16a34a" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
        ${'<'}!-- Dots -->
        ${dots}
        ${'<'}!-- Week labels -->
        ${labels}
        ${'<'}!-- Legend -->
        <line x1="${W-120}" y1="${padT+8}" x2="${W-104}" y2="${padT+8}" stroke="#3b82f6" stroke-width="2" stroke-dasharray="4,2"/>
        <circle cx="${W-112}" cy="${padT+8}" r="3" fill="#3b82f6"/>
        <text x="${W-100}" y="${padT+12}" font-size="8" fill="#3b82f6">Cum. Plan</text>
        <line x1="${W-120}" y1="${padT+22}" x2="${W-104}" y2="${padT+22}" stroke="#16a34a" stroke-width="2.5"/>
        <circle cx="${W-112}" cy="${padT+22}" r="3" fill="#16a34a"/>
        <text x="${W-100}" y="${padT+26}" font-size="8" fill="#16a34a">Cum. Actual</text>
      </svg>`;
    })()}
  </div>

  ${'<'}!-- DOCUMENTATION PHOTOS SECTION -->
  <div style="background:#374151;color:#fff;text-align:center;padding:5px;font-weight:700;font-size:11px;margin-bottom:8px">DOKUMENTASI FOTO \u2014 W${String(week).padStart(2,'0')}</div>
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:10px">
    ${[1,2,3,4,5,6].map(n=>{
      const photo=wrPhotos[n];
      if(photo&&photo.src){
        return`<div style="border:1px solid #e2e8f0;border-radius:6px;overflow:hidden">
          <img src="${photo.src}" style="width:100%;height:160px;object-fit:contain;display:block;background:#f1f5f9">
          <div style="padding:4px 8px;background:#f8fafc;border-top:1px solid #e2e8f0;font-size:9px;color:#374151;min-height:22px">${photo.caption||'Foto '+n}</div>
        </div>`;
      }else{
        return`<div style="border:1px dashed #e2e8f0;border-radius:6px;height:183px;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#f8fafc;color:#cbd5e1">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
          <span style="font-size:9px;margin-top:4px;color:#e2e8f0">Foto ${n}</span>
        </div>`;
      }
    }).join('')}
  </div>

  ${'<'}!-- PAGE 2 FOOTER -->
  <div style="margin-top:16px;padding-top:8px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;font-size:8px;color:#94a3b8">
    <span>${proj.kode} \u2014 Weekly Report W${String(week).padStart(2,'0')}</span>
    <span>Hal. 2 / 2</span>
    <span>Generated by ATW Solar Dashboard</span>
  </div>
  </div>`;

  return html;
}

function _wrItemRowNew(num,node,week,th,td,tdc,isGn){
  const qtyPlan=+node.qtyPlan||0;
  const dl=node.dailyLogs||[];
  const weekQty=dl.filter(l=>l.week===week).reduce((s,l)=>s+(l.qty!=null?+l.qty:0),0);
  const prevWeekQty=week>1?dl.filter(l=>l.week===week-1).reduce((s,l)=>s+(l.qty!=null?+l.qty:0),0):0;
  const cumQty=Math.min(qtyPlan||999999,dl.filter(l=>l.week<=week).reduce((s,l)=>s+(l.qty!=null?+l.qty:0),0));
  const pct=qtyPlan>0?Math.min(100,cumQty/qtyPlan*100):(+node.cumActual||0);
  const kontrib=qtyPlan>0?(+node.bobot||0)/100*(cumQty/qtyPlan)*100:(+node.bobot||0)*(pct/100);
  const nameStyle=isGn?'font-weight:600;color:#15803d':'';
  return `<tr>
    <td style="${tdc};color:#94a3b8;font-size:9px">${num}</td>
    <td style="${td};${nameStyle};padding-left:${isGn?14:24}px">${node.name}</td>
    <td style="${tdc}">${(+node.bobot||0).toFixed(1)}%</td>
    <td style="${tdc};color:#334155">${qtyPlan?qtyPlan+' '+(node.qtySatuan||''):'\u2014'}</td>
    <td style="${tdc};color:${prevWeekQty>0?'#475569':'#94a3b8'}">${prevWeekQty>0?Math.round(prevWeekQty*100)/100:'\u2014'}</td>
    <td style="${tdc};font-weight:700;color:${weekQty>0?'#16a34a':'#94a3b8'}">${weekQty>0?'+'+(Math.round(weekQty*100)/100):'\u2014'}</td>
    <td style="${tdc};color:#475569">${qtyPlan?Math.round(cumQty*100)/100:pct.toFixed(1)+'%'}</td>
    <td style="${tdc};font-weight:700;color:#475569">${pct.toFixed(1)}%</td>
    <td style="${tdc};color:#16a34a">${kontrib>0?kontrib.toFixed(2)+'%':'\u2014'}</td>
    <td style="${tdc}">${node.qtySatuan||'\u2014'}</td>
  </tr>`;
}




// ============================================================
// DAILY REPORT PDF — print-to-PDF (pola sama dgn laporan lain, Arial/grayscale)
// Satu tanggal terpilih + blok tanda tangan.
// ============================================================
async function generateDailyReportPDF(){
  const projId=($('drProjSel')&&$('drProjSel').value)||(typeof selId!=='undefined'&&selId)||(P[0]&&P[0].id);
  const date=($('drDate')&&$('drDate').value)||new Date().toISOString().slice(0,10);
  if(!projId){toast('Pilih project dulu');return;}
  const proj=P.find(p=>String(p.id)===String(projId));
  // Cuaca live untuk tanggal laporan (Open-Meteo). Timeout 4s agar tak menunda lama.
  let wxText='';
  try{
    if(typeof weatherForDate==='function'&&proj){
      wxText=await Promise.race([
        weatherForDate(proj.lat,proj.lon,date),
        new Promise(r=>setTimeout(()=>r(''),4000))
      ]);
    }
  }catch(e){ wxText=''; }
  const fullHtml=buildDailyReportHTML(projId,date,proj,wxText);

  const iframe=document.createElement('iframe');
  iframe.id='drReportFrame';
  iframe.style.cssText='position:fixed;top:0;left:0;width:100%;height:100%;z-index:99999;border:none;background:#fff;display:block';
  document.body.appendChild(iframe);
  const iDoc=iframe.contentDocument||iframe.contentWindow.document;
  iDoc.open();iDoc.write(fullHtml);iDoc.close();

  setTimeout(function(){
    const closeBtn=document.createElement('button');
    closeBtn.innerHTML='<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" style="vertical-align:-1px;display:inline-block"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> Tutup';
    closeBtn.id='drRCloseBtn';
    closeBtn.style.cssText='position:fixed;top:12px;right:12px;z-index:100000;background:#ef4444;color:#fff;border:none;border-radius:6px;padding:8px 16px;font-size:12px;cursor:pointer;font-weight:600;box-shadow:0 2px 8px rgba(0,0,0,.3)';
    const printBtn=document.createElement('button');
    printBtn.innerHTML='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;display:inline-block"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg> Print / Save PDF';
    printBtn.id='drRPrintBtn';
    printBtn.style.cssText='position:fixed;top:12px;right:100px;z-index:100000;background:#475569;color:#fff;border:none;border-radius:6px;padding:8px 16px;font-size:12px;cursor:pointer;font-weight:600;box-shadow:0 2px 8px rgba(0,0,0,.3)';
    closeBtn.onclick=function(){iframe.remove();closeBtn.remove();printBtn.remove();};
    printBtn.onclick=function(){iframe.contentWindow.print();};
    document.body.appendChild(closeBtn);
    document.body.appendChild(printBtn);
  },120);
}

function buildDailyReportHTML(projId,date,proj,weatherText){
  const fmtD=d=>d?String(d).split('-').reverse().join('/'):'-';
  const weekNum=(typeof getWbsWeekNum==='function')?getWbsWeekNum(projId,date):0;
  let logo='';try{logo=localStorage.getItem('atw_dash_logo')||'';}catch(e){}
  if(!logo){const img=$('dashLogoImg');if(img&&img.src&&img.src.indexOf('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAlg')<0)logo=img.src;}
  const logoHtml=logo?`<img src="${logo}" style="height:48px;object-fit:contain">`:`<div style="font-weight:900;font-size:20px;color:#475569;letter-spacing:1px">ATW SOLAR</div>`;
  const clientLogoHtml=(proj&&proj.logo)?`<img src="${proj.logo}" style="height:46px;max-width:150px;object-fit:contain">`:`<div style="width:110px;height:46px;background:#f1f5f9;border:1px dashed #cbd5e1;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:9px;color:#94a3b8">Client Logo</div>`;
  const atwLogoHtml=(typeof ATW_LOGO_B64!=='undefined'&&ATW_LOGO_B64)?`<img src="${ATW_LOGO_B64}" style="height:44px;object-fit:contain">`:logoHtml;
  const projLabel=proj?`${proj.kode||''} \u2014 ${proj.nama||''}${proj.client?' ('+proj.client+')':''}`:'Project';

  const all=WBS.filter(w=>String(w.projId)===String(projId));
  const cats=all.filter(w=>w.type==='cat').sort((a,b)=>a.order-b.order);

  // KPI (replika renderDailyReport)
  const leafNodes=all.filter(w=>(w.type==='item')||(w.type==='subcat'&&!all.some(x=>x.type==='item'&&x.parentId===w.id)));
  let dayPct=0,cumAct=0,cumPlan=0;
  leafNodes.forEach(function(node){
    const qtyPlan=+node.qtyPlan||0,bobot=+node.bobot||0,dl=node.dailyLogs||[];
    const todayLog=dl.find(l=>l.date===date);
    const todayQty=todayLog&&todayLog.qty!=null?+todayLog.qty:0;
    if(qtyPlan>0&&todayQty>0)dayPct+=(bobot/100)*(todayQty/qtyPlan);
    const totalQty=Math.min(qtyPlan||999999,dl.filter(l=>l.date<=date).reduce((s,l)=>s+(l.qty!=null?+l.qty:0),0));
    if(qtyPlan>0)cumAct+=(bobot/100)*(totalQty/qtyPlan);
    if(weekNum&&node.weeklyPlan&&node.weeklyPlan[weekNum]){
      cumPlan+=(bobot/100)*((+node.weeklyPlan[weekNum].cumPlan||+node.weeklyPlan[weekNum].wPlan||0)/100);
    }else{
      const _wp=node.weeklyPlan||{};
      const _prev=Object.keys(_wp).map(Number).filter(k=>k>0&&k<weekNum).sort((a,b)=>b-a);
      if(_prev.length)cumPlan+=(bobot/100)*((+_wp[_prev[0]].cumPlan||+_wp[_prev[0]].wPlan||0)/100);
    }
  });
  const variance=cumAct-cumPlan;
  const pc=v=>(v*100).toFixed(2)+'%';

  const kontribOf=function(node){
    const qtyPlan=+node.qtyPlan||0,bobot=+node.bobot||0;
    if(!qtyPlan)return (bobot/100)*(+node.cumActual||0)/100;
    const totalQty=Math.min(qtyPlan,(node.dailyLogs||[]).filter(l=>l.date<=date).reduce((s,l)=>s+(l.qty!=null?+l.qty:0),0));
    return (bobot/100)*(totalQty/qtyPlan);
  };
  const tdB='padding:5px 8px;border:1px solid #cbd5e1;font-size:10px';
  const tdR=tdB+';text-align:right';
  const tdC=tdB+';text-align:center';
  const nodeRow=function(num,node,indent){
    const qtyPlan=+node.qtyPlan||0,bobot=+node.bobot||0,dl=node.dailyLogs||[];
    const sat=safeStr(node.qtySatuan||node.satuan)||'';
    const todayLog=dl.find(l=>l.date===date)||{};
    const todayQty=todayLog.qty!=null?+todayLog.qty:0;
    const cumQty=Math.min(qtyPlan||999999,dl.filter(l=>l.date<=date).reduce((s,l)=>s+(l.qty!=null?+l.qty:0),0));
    const pct=qtyPlan>0?Math.min(100,cumQty/qtyPlan*100):(+node.cumActual||0);
    const kontrib=kontribOf(node);
    return `<tr><td style="${tdB};padding-left:${indent}px;white-space:nowrap">${num}</td>`
      +`<td style="${tdB}">${safeStr(node.name)}</td>`
      +`<td style="${tdR}">${bobot.toFixed(2)}%</td>`
      +`<td style="${tdR}">${qtyPlan?qtyPlan:'\u2014'}</td>`
      +`<td style="${tdR};font-weight:700">${todayQty>0?'+'+(Math.round(todayQty*100)/100):'\u2014'}</td>`
      +`<td style="${tdR}">${qtyPlan?Math.round(cumQty*100)/100:'\u2014'}</td>`
      +`<td style="${tdR}">${pct.toFixed(1)}%</td>`
      +`<td style="${tdR}">${(kontrib*100).toFixed(2)}%</td>`
      +`<td style="${tdC}">${sat||'\u2014'}</td></tr>`;
  };

  let rows='';
  cats.forEach(function(cat,ci){
    const catLeaves=all.filter(w=>(w.type==='item'&&all.some(x=>x.type==='subcat'&&x.parentId===cat.id&&x.id===w.parentId))||(w.type==='subcat'&&w.parentId===cat.id&&!all.some(x=>x.type==='item'&&x.parentId===w.id)));
    const catKon=catLeaves.reduce((s,n)=>s+kontribOf(n),0);
    rows+=`<tr style="background:#e2e8f0"><td style="${tdB};font-weight:700">${String.fromCharCode(65+ci)}</td><td style="${tdB};font-weight:700">${safeStr(cat.name)}</td><td colspan="5" style="${tdB}"></td><td style="${tdR};font-weight:700">${(catKon*100).toFixed(2)}%</td><td style="${tdB}"></td></tr>`;
    all.filter(w=>w.type==='subcat'&&w.parentId===cat.id).sort((a,b)=>a.order-b.order).forEach(function(sub,si){
      const subItems=all.filter(w=>w.type==='item'&&w.parentId===sub.id).sort((a,b)=>a.order-b.order);
      if(subItems.length===0){
        rows+=nodeRow(`${ci+1}.${si+1}`,sub,14);
      }else{
        const subKon=subItems.reduce((s,x)=>s+kontribOf(x),0);
        rows+=`<tr style="background:#f1f5f9"><td style="${tdB};font-weight:600">${ci+1}.${si+1}</td><td style="${tdB};font-weight:600">${safeStr(sub.name)}</td><td colspan="5" style="${tdB}"></td><td style="${tdR};font-weight:600">${(subKon*100).toFixed(2)}%</td><td style="${tdB}"></td></tr>`;
        subItems.forEach(function(item,ii){rows+=nodeRow(`${ci+1}.${si+1}.${ii+1}`,item,26);});
      }
    });
  });
  if(!rows)rows=`<tr><td colspan="9" style="${tdC};padding:20px">Belum ada WBS / data harian</td></tr>`;

  const signRoles=['Disiapkan','Diperiksa','Disetujui'];
  const sign=`<div style="display:flex;justify-content:space-between;margin-top:34px;gap:24px">`
    +signRoles.map(function(r){return `<div style="flex:1;text-align:center"><div style="font-size:10px;color:#475569;margin-bottom:46px">${r}</div><div style="border-top:1px solid #334155;padding-top:4px;font-size:10px;color:#64748b">(&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;)</div></div>`;}).join('')
    +`</div>`;

  const kpis=[['Progress Hari Ini',pc(dayPct)],['Kumulatif Aktual',pc(cumAct)],['Kumulatif Rencana',pc(cumPlan)],['Deviasi',(variance>=0?'+':'')+pc(variance)]];
  const heads=['#','Item Pekerjaan','Bobot','Qty Plan','Hari Ini','Qty Cum.','% Selesai','Kontribusi','Satuan'];

  // ── Manpower, HSE, Time Lost, Cuaca untuk tanggal ini ──
  const mp=(typeof MPLOGS!=='undefined'?MPLOGS:[]).find(m=>String(m.projId)===String(projId)&&m.date===date)||{};
  const accAll=(typeof ACCLOGS!=='undefined'?ACCLOGS:[]).filter(a=>String(a.projId)===String(projId)&&a.date===date);
  const accSum=k=>accAll.reduce((q,a)=>q+(+a[k]||0),0);
  const accNotes=accAll.map(a=>safeStr(a.notes)).filter(Boolean).join('; ');
  const mpRoles=[['SPV',+mp.spv||0],['Mandor',+mp.mandor||0],['Installer',+mp.installer||0],['Tukang',+mp.tukang||0],['Helper',+mp.helper||0],['Safety',+mp.safety||0]];
  const mpTotal=+mp.total||mpRoles.reduce((q,r)=>q+r[1],0);
  const mhAct=+mp.mhActual||0;
  const tlTotal=(+mp.timeLost||0)+accSum('timeLost');
  const tlReason=safeStr(mp.timeLostReason||'')||accNotes;
  const weather=safeStr(weatherText||(proj&&proj.weather)||'')||'\u2014';
  const hseItems=[['Fatality',accSum('fatality')],['LTI',accSum('lti')],['Minor Injury',accSum('minorInjury')],['Med. Treatment',accSum('medTreatment')],['Property Damage',accSum('propertyDamage')],['Fire',accSum('fire')],['Traffic',accSum('traffic')],['Environment',accSum('environment')],['Near-Miss',accSum('nearMiss')]];
  const hseNonZero=hseItems.filter(h=>h[1]>0);
  const _bb='border-bottom:1px solid #eef2f7';
  const mpTableRows=mpRoles.map(r=>`<tr><td style="padding:3px 8px;${_bb};font-size:10px">${r[0]}</td><td style="padding:3px 8px;${_bb};font-size:10px;text-align:right;font-weight:600">${r[1]}</td></tr>`).join('');
  const hseHtml=hseNonZero.length
    ? hseNonZero.map(h=>`<div>${h[0]}: <b style="color:#b91c1c">${h[1]}</b></div>`).join('')
    : `<div style="color:#16a34a;font-weight:700">Nihil insiden hari ini</div>`;
  const infoBlock=`
    <div style="display:flex;gap:10px;margin-bottom:14px">
      <div style="flex:1;border:1px solid #cbd5e1;border-radius:6px;overflow:hidden">
        <div style="background:#334155;color:#fff;font-size:9px;font-weight:700;padding:5px 8px;text-transform:uppercase;letter-spacing:.5px">Manpower Hari Ini</div>
        <table style="width:100%;border-collapse:collapse">
          ${mpTableRows}
          <tr style="background:#f1f5f9"><td style="padding:4px 8px;font-size:10px;font-weight:700">TOTAL PEKERJA</td><td style="padding:4px 8px;font-size:10px;font-weight:700;text-align:right">${mpTotal}</td></tr>
          <tr><td style="padding:3px 8px;font-size:10px">Man-Hours Aktual</td><td style="padding:3px 8px;font-size:10px;text-align:right;font-weight:600">${mhAct} jam</td></tr>
        </table>
      </div>
      <div style="flex:1;border:1px solid #cbd5e1;border-radius:6px;overflow:hidden">
        <div style="background:#334155;color:#fff;font-size:9px;font-weight:700;padding:5px 8px;text-transform:uppercase;letter-spacing:.5px">HSE &amp; Kondisi Hari Ini</div>
        <div style="padding:8px;font-size:10px;line-height:1.7">
          <div><b>Cuaca:</b> ${weather}</div>
          <div><b>Time Lost:</b> ${tlTotal>0?tlTotal+' jam':'0 jam'}${tlReason?` <span style="color:#64748b">(${tlReason})</span>`:''}</div>
          <div style="margin-top:5px;border-top:1px solid #eef2f7;padding-top:5px;margin-bottom:2px"><b>Status HSE:</b></div>
          ${hseHtml}
        </div>
      </div>
    </div>`;

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Daily Report ${fmtD(date)}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact;color-adjust:exact}
    body{font-family:Arial,Helvetica,sans-serif;color:#1e293b;background:#fff;padding:0 13mm}
    table{width:100%;border-collapse:collapse}
    .pdf-wrap{width:100%;border-collapse:collapse}
    .pdf-wrap>thead>tr>td,.pdf-wrap>tfoot>tr>td{padding:0}
    .pdf-wrap>tbody>tr>td{padding:0;vertical-align:top}
    @page{size:A4 portrait;margin:0}
    @media screen{body{padding-top:12mm;padding-bottom:12mm}}
    @media print{
      .pdf-wrap>thead>tr>td{padding-top:14mm}
      .pdf-wrap>tfoot>tr>td{padding-bottom:14mm}
      thead{display:table-header-group}
      tfoot{display:table-footer-group}
    }
  </style></head><body>
    <table class="pdf-wrap"><thead><tr><td></td></tr></thead><tbody><tr><td>
    <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid #334155;padding-bottom:10px;margin-bottom:12px">
      <div style="display:flex;align-items:center;gap:16px">${clientLogoHtml}${atwLogoHtml}</div>
      <div style="text-align:right">
        <div style="font-size:16px;font-weight:800;color:#334155">LAPORAN HARIAN PROGRESS</div>
        <div style="font-size:11px;color:#64748b">${projLabel}</div>
      </div>
    </div>
    <div style="display:flex;gap:24px;font-size:11px;margin-bottom:12px">
      <div><b>Tanggal:</b> ${fmtD(date)}</div>
      <div><b>Minggu:</b> ${weekNum?('W'+String(weekNum).padStart(2,'0')):'\u2014'}</div>
    </div>
    <div style="display:flex;gap:10px;margin-bottom:14px">
      ${kpis.map(function(k){return `<div style="flex:1;border:1px solid #cbd5e1;border-radius:6px;padding:8px 10px"><div style="font-size:9px;color:#64748b;text-transform:uppercase;letter-spacing:.5px">${k[0]}</div><div style="font-size:15px;font-weight:800;color:#334155">${k[1]}</div></div>`;}).join('')}
    </div>
    ${infoBlock}
    <table>
      <thead><tr style="background:#334155;color:#fff">
        ${heads.map(function(h,i){return `<th style="padding:6px 8px;border:1px solid #334155;font-size:9px;text-transform:uppercase;letter-spacing:.4px;text-align:${i===0||i===1?'left':(i===8?'center':'right')}">${h}</th>`;}).join('')}
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    ${sign}
    <div style="margin-top:16px;font-size:9px;color:#94a3b8;text-align:right">Dicetak: ${fmtD(new Date().toISOString().slice(0,10))} \u00b7 ATW Solar Project Performance Dashboard</div>
    </td></tr></tbody><tfoot><tr><td></td></tr></tfoot></table>
  </body></html>`;
}
