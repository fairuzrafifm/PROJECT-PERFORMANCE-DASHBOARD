// ===============================================================
// GANTT CHART
// ===============================================================

let _ganttView = 'table'; // 'table' | 'gantt'

function setWbsView(v){
  _ganttView = v;
  const tCard=$('wbsTableCard'), gCard=$('wbsGanttCard');
  const tBtn=$('wbsViewTable'), gBtn=$('wbsViewGantt');
  if(v==='gantt'){
    tCard.style.display='none'; gCard.style.display='block';
    tBtn.style.background=''; tBtn.style.color='var(--mt)';
    gBtn.style.background='var(--bl)'; gBtn.style.color='#fff';
    renderGantt();
  }else{
    gCard.style.display='none'; tCard.style.display='block';
    gBtn.style.background=''; gBtn.style.color='var(--mt)';
    tBtn.style.background='var(--bl)'; tBtn.style.color='#fff';
  }
}

function renderGantt(){
  const projId=$('wbsProjSel')?.value;if(!projId)return;
  const proj=P.find(p=>String(p.id)===String(projId));
  const all=WBS.filter(w=>String(w.projId)===String(projId));
  const _cpRes=(typeof computeCriticalPath==='function')?computeCriticalPath(projId):{critical:new Set()};
  const _crit=_cpRes.critical||new Set();
  const cats=all.filter(w=>w.type==='cat').sort((a,b)=>+a.order-+b.order);
  const zoom=+($('ganttZoom')?.value||30);
  if($('wbsGanttTitle'))$('wbsGanttTitle').textContent=proj?.nama||'';

  // Date range
  const allDates=[];
  all.forEach(w=>{
    if(w.startDate)allDates.push(new Date(w.startDate+'T00:00:00'));
    if(w.finishDate)allDates.push(new Date(w.finishDate+'T00:00:00'));
  });
  if(proj?.mulai)allDates.push(new Date(proj.mulai+'T00:00:00'));
  if(proj?.selesai)allDates.push(new Date(proj.selesai+'T00:00:00'));
  const today=new Date();today.setHours(0,0,0,0);
  let minDate,maxDate;
  if(allDates.length){
    minDate=new Date(Math.min(...allDates));
    maxDate=new Date(Math.max(...allDates));
  }else{
    minDate=new Date(today.getFullYear(),today.getMonth()-1,1);
    maxDate=new Date(today.getFullYear(),today.getMonth()+3,1);
  }
  minDate=new Date(minDate.getTime()-7*86400000);
  maxDate=new Date(maxDate.getTime()+21*86400000);
  if(zoom===30){const dow=minDate.getDay();minDate=new Date(minDate.getTime()-(dow===0?6:dow-1)*86400000);}

  // Columns
  const stepDays=zoom===7?1:zoom===30?7:30;
  const COL_W=zoom===7?28:zoom===30?32:44;
  const pxPerDay=COL_W/stepDays;
  const cols=[];
  let cur=new Date(minDate);
  while(cur<=maxDate){cols.push(new Date(cur));cur=new Date(cur.getTime()+stepDays*86400000);}
  const totalW=Math.max(cols.length*COL_W,400);

  // px helper
  const toX=ds=>{
    if(!ds)return -999;
    return Math.round((new Date(ds+'T00:00:00').getTime()-minDate.getTime())/86400000*pxPerDay);
  };
  const todayX=Math.round((today.getTime()-minDate.getTime())/86400000*pxPerDay);

  // Month header
  let monthHdr='';
  const mmap={};
  cols.forEach(d=>{
    const k=d.getFullYear()+'-'+d.getMonth();
    if(!mmap[k])mmap[k]={label:d.toLocaleDateString('id-ID',{month:'short',year:'2-digit'}),count:0};
    mmap[k].count++;
  });
  Object.values(mmap).forEach(m=>{
    monthHdr+='<div style="width:'+m.count*COL_W+'px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;color:var(--mt);text-transform:uppercase;letter-spacing:.5px;border-right:1px solid var(--bd);box-sizing:border-box">'+m.label+'</div>';
  });

  // Col header
  let colHdr='';
  cols.forEach(d=>{
    const isToday=d.toDateString()===today.toDateString();
    const lbl=zoom===7?d.getDate():zoom===30?d.getDate():d.toLocaleDateString('id-ID',{month:'short'});
    colHdr+='<div style="width:'+COL_W+'px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:8px;border-right:1px solid rgba(128,128,128,.1);box-sizing:border-box;'+(isToday?'color:var(--or);font-weight:700;background:rgba(124,140,240,.10)':'color:var(--mt)')+'">'+lbl+'</div>';
  });

  // Bar builder
  const mkBar=(sd,fd,type,behind,critical)=>{
    if(!sd||!fd)return '';
    const x1=Math.max(0,toX(sd));
    const x2=Math.min(totalW,toX(fd));
    const w=Math.max(6,x2-x1);
    if(x1>=totalW||x2<=0)return '';
    const dur=_ganttDuration(sd,fd);
    let st='position:absolute;left:'+x1+'px;width:'+w+'px;z-index:2;overflow:visible;';
    if(type==='cat')st+='height:16px;top:11px;background:rgba(124,140,240,.15);border:2px solid var(--bl);border-radius:4px';
    else if(type==='sub')st+='height:14px;top:12px;background:var(--bl);border:1px solid var(--bl);border-radius:3px';
    else st+='height:14px;top:12px;background:rgba(124,140,240,.32);border:1px solid rgba(124,140,240,.6);border-radius:3px';
    if(critical)st+=';border:2px solid var(--pu)';
    if(behind)st+=';box-shadow:0 0 0 1.5px var(--rd),0 0 7px rgba(244,112,122,.55)';
    return '<div style="'+st+'">'+(dur&&w>40?'<span style="position:absolute;left:4px;top:50%;transform:translateY(-50%);font-size:8px;font-weight:700;color:#fff;white-space:nowrap">'+dur+'</span>':'')+'</div>';
  };
  const mkAct=(node,sd,fd)=>{
    if(!sd||!fd)return '';
    const pct=Math.min(100,Math.max(0,+node.cumActual||0));
    if(!pct)return '';
    const x1=Math.max(0,toX(sd));
    const x2=Math.min(totalW,toX(fd));
    const fw=Math.max(6,x2-x1);
    const aw=Math.max(3,Math.round(fw*pct/100));
    return '<div style="position:absolute;left:'+x1+'px;width:'+fw+'px;height:8px;top:28px;background:rgba(61,220,151,.22);border-radius:2px;z-index:2"><div style="width:'+aw+'px;height:100%;background:var(--gn);border-radius:2px"></div></div>';
  };
  const tLine='<div style="position:absolute;left:'+todayX+'px;top:0;bottom:0;width:2px;background:var(--or);opacity:.85;z-index:5;pointer-events:none"><span style="position:absolute;top:2px;left:3px;font-size:7px;color:var(--or);font-weight:700;white-space:nowrap">TODAY</span></div>';

  // Date formatter for gantt
  const fmtGD=ds=>{if(!ds)return'—';const d=new Date(ds+'T12:00');return d.toLocaleDateString('id-ID',{day:'2-digit',month:'short'});};
  // Rows
  let leftRows='',rightRows='';
  if(!cats.length){
    leftRows='<div style="height:40px;display:flex;align-items:center;justify-content:center;color:var(--mt);font-size:12px">Belum ada WBS. Tambahkan item dan isi Start/Finish date.</div>';
    rightRows='<div style="height:40px;min-width:'+totalW+'px"></div>';
  }
  cats.forEach((cat,ci)=>{
    const subcats=all.filter(w=>w.type==='subcat'&&String(w.parentId)===String(cat.id)).sort((a,b)=>+a.order-+b.order);
    const items=all.filter(w=>w.type==='item'&&subcats.some(s=>String(s.id)===String(w.parentId)));
    const allNodes=[...subcats,...items];
    const cS=allNodes.map(w=>w.startDate).filter(Boolean).sort();
    const cF=allNodes.map(w=>w.finishDate).filter(Boolean).sort();
    const dur=_ganttDuration(cS[0],cF.slice(-1)[0]);
    leftRows+='<div class="gantt-lrow gl-cat" onclick="toggleGanttCat2(\'gc2_'+cat.id+'\')" style="cursor:pointer"><span id="gc2icon_'+cat.id+'" style="font-size:9px;flex-shrink:0;opacity:.5">'+ic('chevDown',12)+'</span><span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+String.fromCharCode(65+ci)+'. '+safeStr(cat.name)+'</span><span style="display:flex;gap:2px;flex-shrink:0"><span class="gantt-date-val" style="width:62px">'+fmtGD(cS[0])+'</span><span class="gantt-date-val" style="width:62px">'+fmtGD(cF.slice(-1)[0])+'</span></span></div>';
    rightRows+='<div class="gantt-rrow gl-cat" style="width:'+totalW+'px;min-width:'+totalW+'px">'+mkBar(cS[0],cF.slice(-1)[0],'cat')+tLine+'</div>';

    subcats.forEach((sub,si)=>{
      const subItems=items.filter(w=>String(w.parentId)===String(sub.id)).sort((a,b)=>+a.order-+b.order);
      const isLeaf=!subItems.length;
      const subPct=isLeaf?+(sub.cumActual||0):subItems.reduce((s,x)=>s+(+x.cumActual||0),0)/Math.max(1,subItems.length);
      const subSD=isLeaf?sub.startDate:(subItems.map(x=>x.startDate).filter(Boolean).sort()[0]||sub.startDate);
      const subFD=isLeaf?sub.finishDate:(subItems.map(x=>x.finishDate).filter(Boolean).sort().slice(-1)[0]||sub.finishDate);
      leftRows+='<div class="gantt-lrow gl-sub gc2_'+cat.id+'" style="padding-left:22px;'+(isLeaf?'':'cursor:pointer')+'"'+(isLeaf?'':' onclick="toggleGanttCat2(\'gi2_'+sub.id+'\')"')+'>'+(!isLeaf?'<span id="gi2icon_'+sub.id+'" style="font-size:9px;flex-shrink:0;opacity:.5">'+ic('chevDown',12)+'</span>':'<span style="width:10px;flex-shrink:0"></span>')+'<span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+(ci+1)+'.'+(si+1)+' '+safeStr(sub.name)+'</span>'+(subPct>0?'<span style="font-size:9px;color:var(--mt);flex-shrink:0;font-family:var(--fm);margin-right:2px">'+subPct.toFixed(1)+'%</span>':'')+'<span style="display:flex;gap:2px;flex-shrink:0"><span class="gantt-date-val" style="width:62px">'+fmtGD(subSD)+'</span><span class="gantt-date-val" style="width:62px">'+fmtGD(subFD)+'</span></span></div>';
      rightRows+='<div class="gantt-rrow gl-sub gc2_'+cat.id+'" style="width:'+totalW+'px;min-width:'+totalW+'px">'+mkBar(sub.startDate,sub.finishDate,'sub')+(isLeaf?mkAct(sub,sub.startDate,sub.finishDate):'')+tLine+'</div>';

      subItems.forEach((item,ii)=>{
        const pct=+item.cumActual||0;
        const _beh=(pct<99.5)&&(((+item.cumPlan||0)-pct)>5);
        const _isCrit=_crit.has(String(item.id));
        leftRows+='<div class="gantt-lrow gl-item gi2_'+sub.id+'" style="padding-left:36px">'+(_beh?'<span title="Tertinggal dari rencana" style="display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--rd);flex-shrink:0;margin-right:4px"></span>':'')+(_isCrit?'<span title="Jalur kritis (CPM)" style="font-size:8px;font-weight:700;color:var(--pu);border:1px solid var(--pu);border-radius:3px;padding:0 3px;margin-right:4px;flex-shrink:0">CP</span>':'')+'<span style="font-size:9px;color:var(--mt);flex-shrink:0;margin-right:2px">'+(ci+1)+'.'+(si+1)+'.'+(ii+1)+'</span><span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:10px">'+safeStr(item.name)+'</span>'+(pct>0?'<span style="font-size:9px;color:var(--mt);flex-shrink:0;font-family:var(--fm);margin-right:2px">'+pct.toFixed(1)+'%</span>':'')+'<span style="display:flex;gap:2px;flex-shrink:0"><span class="gantt-date-val" style="width:62px">'+fmtGD(item.startDate||sub.startDate)+'</span><span class="gantt-date-val" style="width:62px">'+fmtGD(item.finishDate||sub.finishDate)+'</span></span></div>';
        rightRows+='<div class="gantt-rrow gi2_'+sub.id+'" data-gid="'+item.id+'" data-x1="'+toX(item.startDate||sub.startDate)+'" data-x2="'+toX(item.finishDate||sub.finishDate)+'" style="width:'+totalW+'px;min-width:'+totalW+'px">'+mkBar(item.startDate||sub.startDate,item.finishDate||sub.finishDate,'plan',_beh,_isCrit)+mkAct(item,item.startDate||sub.startDate,item.finishDate||sub.finishDate)+tLine+'</div>';
      });
    });
  });

  $('wbsGanttChart').innerHTML='<div style="display:flex;gap:14px;align-items:center;padding:7px 10px 9px;font-size:9px;color:var(--mt);flex-wrap:wrap"><span style="display:flex;align-items:center;gap:4px"><span style="width:14px;height:9px;background:rgba(124,140,240,.32);border:1px solid rgba(124,140,240,.6);border-radius:2px"></span>Plan</span><span style="display:flex;align-items:center;gap:4px"><span style="width:14px;height:7px;background:var(--gn);border-radius:2px"></span>Aktual</span><span style="display:flex;align-items:center;gap:4px"><span style="width:14px;height:9px;border:2px solid var(--pu);border-radius:2px"></span>Jalur Kritis (CPM)</span><span style="display:flex;align-items:center;gap:4px"><svg width="18" height="8" style="overflow:visible"><line x1="0" y1="4" x2="12" y2="4" style="stroke:var(--pu)" stroke-width="1.3"/><path d="M18 4 l-6 -3 l0 6 z" style="fill:var(--pu)"/></svg>Ketergantungan</span><span style="display:flex;align-items:center;gap:4px"><span style="width:6px;height:6px;border-radius:50%;background:var(--rd)"></span>Item tertinggal dari rencana</span></div><div class="gantt-container"><div class="gantt-left-panel"><div class="gantt-left-header" style="display:flex;justify-content:space-between"><span>ITEM PEKERJAAN</span><span style="display:flex;gap:2px"><span style="width:62px;text-align:center;font-size:9px">START</span><span style="width:62px;text-align:center;font-size:9px">FINISH</span></span></div><div class="gantt-left-subheader" style="display:flex;justify-content:space-between"><span>Bobot / Progress</span><span style="display:flex;gap:2px"><span style="width:62px;text-align:center">dd/mmm</span><span style="width:62px;text-align:center">dd/mmm</span></span></div>'+leftRows+'</div><div class="gantt-right-panel"><div style="display:flex;height:22px;border-bottom:1px solid var(--bd);background:var(--sf2);width:'+totalW+'px;min-width:'+totalW+'px">'+monthHdr+'</div><div style="display:flex;height:20px;border-bottom:2px solid var(--bd);background:var(--sf2);width:'+totalW+'px;min-width:'+totalW+'px">'+colHdr+'</div><div id="wbsGanttRows" style="position:relative;min-width:'+totalW+'px;width:'+totalW+'px">'+rightRows+'</div></div></div>';
  if(typeof requestAnimationFrame==='function')requestAnimationFrame(_drawGanttDeps); else _drawGanttDeps();
}

function _drawGanttDeps(){
  const cont=document.getElementById('wbsGanttRows'); if(!cont) return;
  const old=document.getElementById('wbsDepSvg'); if(old) old.remove();
  if(!cont.offsetHeight) return; // panel tersembunyi → jangan gambar
  const projId=$('wbsProjSel')?.value; if(!projId) return;
  // posisi tiap item (x dari toX, y dari layout sebenarnya → tahan collapse)
  const pos={};
  cont.querySelectorAll('[data-gid]').forEach(el=>{
    pos[el.getAttribute('data-gid')]={
      x1:+el.getAttribute('data-x1'), x2:+el.getAttribute('data-x2'),
      yc: el.offsetTop + 19, vis: el.offsetHeight>0
    };
  });
  const items=(typeof WBS!=='undefined'?WBS:[]).filter(w=>String(w.projId)===String(projId)&&w.type==='item'&&(w.predecessors||[]).length);
  if(!items.length) return;
  let paths='';
  items.forEach(it=>{
    const s=pos[String(it.id)]; if(!s||!s.vis) return;
    (it.predecessors||[]).forEach(p=>{
      const pr=pos[String(p.id)]; if(!pr||!pr.vis) return;
      const type=p.type||'FS';
      let fromX=(type==='SS'||type==='SF')?pr.x1:pr.x2;
      let toXp =(type==='FF'||type==='SF')?s.x2:s.x1;
      if(fromX<-900||toXp<-900) return;
      const fy=pr.yc, ty=s.yc, ex=fromX+8;
      const d='M'+fromX+' '+fy+' H'+ex+' V'+ty+' H'+toXp;
      paths+='<path d="'+d+'" style="fill:none;stroke:var(--pu);stroke-width:1.3;opacity:.65"/>';
      paths+='<path d="M'+toXp+' '+ty+' l-6 -3 l0 6 z" style="fill:var(--pu);opacity:.8"/>';
    });
  });
  if(!paths) return;
  const W=cont.scrollWidth||cont.offsetWidth, H=cont.scrollHeight||cont.offsetHeight;
  cont.insertAdjacentHTML('afterbegin','<svg id="wbsDepSvg" width="'+W+'" height="'+H+'" style="position:absolute;left:0;top:0;pointer-events:none;z-index:4;overflow:visible">'+paths+'</svg>');
}

function toggleGanttCat2(groupClass){
  const rows=document.querySelectorAll('.'+groupClass);
  const id=groupClass.replace('gc2_','').replace('gi2_','');
  const isGc=groupClass.startsWith('gc2_');
  const iconEl=document.getElementById((isGc?'gc2icon_':'gi2icon_')+id);
  const hidden=rows.length&&rows[0].style.display==='none';
  rows.forEach(r=>r.style.display=hidden?'flex':'none');
  if(iconEl)iconEl.innerHTML=hidden?ic('chevDown',12):ic('chevRight',12);
  if(typeof _drawGanttDeps==='function'){if(typeof requestAnimationFrame==='function')requestAnimationFrame(_drawGanttDeps);else _drawGanttDeps();}
}

function _ganttBar(start,finish,dateToX,totalW,type){
  if(!start||!finish)return '';
  const x1=Math.max(0,dateToX(start));
  const x2=Math.min(totalW,dateToX(finish));
  const w=Math.max(8,x2-x1);
  const fmtShort=d=>new Date(d+'T12:00').toLocaleDateString('id-ID',{day:'2-digit',month:'short'});
  const labelStart=fmtShort(start);
  const labelEnd=fmtShort(finish);
  // Show labels outside bar if bar too narrow
  const showInside=w>80;
  const labelHtml=showInside
    ?`<span style="position:absolute;left:4px;top:50%;transform:translateY(-50%);font-size:8px;color:rgba(255,255,255,.9);white-space:nowrap;font-weight:600">${labelStart}</span>
       <span style="position:absolute;right:4px;top:50%;transform:translateY(-50%);font-size:8px;color:rgba(255,255,255,.9);white-space:nowrap;font-weight:600">${labelEnd}</span>`
    :`<span style="position:absolute;left:${w+3}px;top:50%;transform:translateY(-50%);font-size:8px;color:var(--bl);white-space:nowrap;font-weight:600">${labelStart}→${labelEnd}</span>`;
  if(type==='cat')return `<div class="gantt-bar-plan gantt-bar-cat" style="left:${x1}px;width:${w}px;position:absolute">${labelHtml}</div>`;
  if(type==='sub')return `<div class="gantt-bar-plan gantt-bar-sub" style="left:${x1}px;width:${w}px;position:absolute">${labelHtml}</div>`;
  return `<div class="gantt-bar-plan" style="left:${x1}px;width:${w}px;position:absolute">${labelHtml}</div>`;
}

function _ganttActualBar(node,dateToX,totalW,fallbackStart,fallbackFinish){
  const pct=Math.min(100,+node.cumActual||0);if(!pct)return '';
  // Use node dates, or fallback to parent dates
  const start=node.startDate||fallbackStart;
  const finish=node.finishDate||fallbackFinish;
  if(!start||!finish)return `<div style="position:absolute;right:4px;top:22px;font-size:8px;color:var(--gn);font-weight:700">${pct.toFixed(0)}%</div>`;
  const x1=Math.max(0,dateToX(start));
  const x2=Math.min(totalW,dateToX(finish));
  const fullW=Math.max(8,x2-x1);
  const actW=Math.max(4,Math.round(fullW*pct/100));
  const pctLabel=`<span style="position:absolute;left:${actW+3}px;top:50%;transform:translateY(-50%);font-size:8px;color:var(--gn);white-space:nowrap;font-weight:700">${pct.toFixed(0)}%</span>`;
  return `<div class="gantt-bar-actual" style="left:${x1}px;width:${actW}px;position:absolute">${pctLabel}</div>`;
}

function _ganttDuration(start,finish){
  if(!start||!finish)return '';
  const d1=new Date(start+'T00:00:00'),d2=new Date(finish+'T00:00:00');
  const days=Math.round((d2-d1)/86400000)+1;
  return days+'d';
}

function toggleGanttCat(el,groupId){
  const rows=document.querySelectorAll('#'+groupId);
  const icon=el.querySelector('span');
  const hidden=rows.length&&rows[0].style.display==='none';
  rows.forEach(r=>r.style.display=hidden?'flex':'none');
  if(icon)icon.innerHTML=hidden?ic('chevDown',12):ic('chevRight',12);
}

