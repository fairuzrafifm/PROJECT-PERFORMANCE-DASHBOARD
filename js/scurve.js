// ===============================================================
// S-CURVE
// ===============================================================
function renderSCurve(){
  // Populate project dropdown
  const sel=$('scProjSel');
  if(sel){
    const cur=sel.value;
    sel.innerHTML=P.map(p=>`<option value="${p.id}">${p.kode} \u2014 ${p.nama}</option>`).join('');
    if(cur)sel.value=cur;
  }
  const projId=sel?.value||P[0]?.id;
  if(!projId){
    $('scChart').innerHTML='<div style="text-align:center;color:var(--mt);padding:30px">Belum ada project</div>';
    return;
  }
  const proj=P.find(p=>String(p.id)===String(projId));
  if(!proj)return;

  // Get S-Curve data for this project
  const data=SCURVE.filter(d=>String(d.projId)===String(projId)).sort((a,b)=>a.week-b.week);

  // Auto-calculate cumulative if not set
  let cumPlan=0,cumAct=0;
  const weeks=data.map(d=>{
    cumPlan+=(+d.wPlan||0);
    cumAct+=(+d.wAct||0);
    return {
      ...d,
      cPlan:d.cPlan!=null?+d.cPlan:Math.round(cumPlan*10)/10,
      cAct:d.cAct!=null?+d.cAct:Math.round(cumAct*10)/10
    };
  });

  // Current week (last with actual data)
  const lastW=weeks.filter(w=>w.wAct>0||w.cAct>0).slice(-1)[0];
  const weekNum=lastW?lastW.week:0;

  // KPIs
  $('sc-proj').textContent=proj.kode;
  $('sc-dur').textContent=proj.durasi?proj.durasi+' minggu':'\u2014';
  $('sc-cplan').textContent=(lastW?.cPlan||0).toFixed(1)+'%';
  $('sc-cact').textContent=(lastW?.cAct||0).toFixed(1)+'%';
  const varr=((lastW?.cAct||0)-(lastW?.cPlan||0));
  $('sc-var').textContent=(varr>=0?'+':'')+varr.toFixed(1)+'%';
  $('sc-var').style.color=varr>=0?'var(--gn)':varr>=-5?'var(--yw)':'var(--rd)';
  $('sc-var-lbl').textContent=varr>=0?'Ahead':'Behind';
  $('sc-week').textContent=weekNum?'W'+String(weekNum).padStart(2,'0'):'\u2014';
  $('sc-wdate').textContent=lastW?.dateStart||'\u2014';
  $('scChartTitle').textContent=proj.nama;

  // Draw chart
  drawSCurveChart(weeks, proj);
  renderScTable(weeks);
}

function drawSCurveChart(weeks, proj) {
      if (!weeks || !weeks.length) {
        var sc = document.getElementById('scChart');
        if (sc) sc.innerHTML = '<div style="text-align:center;color:var(--mt);padding:40px;font-size:12px">Belum ada data — klik ＋ Input Minggu Ini untuk mulai</div>';
        return;
      }
      if (typeof Chart === 'undefined') {
        var sc2 = document.getElementById('scChart');
        if (sc2) sc2.innerHTML = '<div style="text-align:center;color:var(--mt);padding:40px;font-size:12px">Memuat Chart.js…</div>';
        setTimeout(function () { window.drawSCurveChart(weeks, proj); }, 3000);
        return;
      }
      var light = document.documentElement.classList.contains('light');
      var BL = '#3b82f6', OR = '#f97316', BLLT = '#93c5fd', ORLT = '#fdba74';
      var GRID = light ? 'rgba(0,0,0,.05)' : 'rgba(255,255,255,.05)';
      var TICK = light ? '#94a3b8' : '#64748b';
      var TTBG = light ? '#1e293b' : '#0f172a';
      var labels    = weeks.map(function(w){ return 'W'+String(w.week).padStart(2,'0'); });
      var wPlanData = weeks.map(function(w){ return +(+w.wPlan||0).toFixed(2); });
      var wActData  = weeks.map(function(w){ return +(+w.wAct||0).toFixed(2); });
      var cPlanData = weeks.map(function(w){ return +(+w.cPlan||0).toFixed(2); });
      var cActData  = weeks.map(function(w){
        var v=+w.cAct; return (w.wAct>0||w.cAct>0)?+v.toFixed(2):null;
      });
      if (window._scChart) { window._scChart.destroy(); window._scChart=null; }
      var scEl = document.getElementById('scChart');
      if (!scEl) return;
      var mkLeg = function(col,dash,lbl){
        var s=dash
          ?'<svg width="22" height="12" style="vertical-align:middle"><line x1="0" y1="6" x2="22" y2="6" stroke="'+col+'" stroke-width="2" stroke-dasharray="5,3"/><circle cx="11" cy="6" r="3" fill="'+col+'"/></svg>'
          :'<svg width="22" height="12" style="vertical-align:middle"><line x1="0" y1="6" x2="22" y2="6" stroke="'+col+'" stroke-width="2"/><circle cx="11" cy="6" r="3" fill="'+col+'"/></svg>';
        return '<span style="display:inline-flex;align-items:center;gap:5px;font-size:10px;color:'+TICK+';background:'+(light?'#f1f5f9':'rgba(255,255,255,.05)')+';padding:3px 10px;border-radius:20px;border:1px solid '+(light?'#e2e8f0':'rgba(255,255,255,.08)')+'">'+s+lbl+'</span>';
      };
      var mkBar = function(col,lbl){
        return '<span style="display:inline-flex;align-items:center;gap:5px;font-size:10px;color:'+TICK+';background:'+(light?'#f1f5f9':'rgba(255,255,255,.05)')+';padding:3px 10px;border-radius:20px;border:1px solid '+(light?'#e2e8f0':'rgba(255,255,255,.08)')+'"><span style="width:12px;height:10px;background:'+col+';border-radius:2px;display:inline-block"></span>'+lbl+'</span>';
      };
      scEl.innerHTML =
        '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;padding:0 2px">'+
          mkBar(BLLT+'CC','W.Plan')+mkBar(OR+'CC','W.Actual')+
          mkLeg(BL,false,'Cum. Plan')+mkLeg(OR,true,'Cum. Actual')+
        '</div>'+
        '<div style="position:relative;width:100%;height:360px">'+
          '<canvas id="scCanvas" role="img" aria-label="S-Curve progress"></canvas>'+
        '</div>';
      setTimeout(function(){
        var ctx=document.getElementById('scCanvas'); if(!ctx)return;
        var grad=ctx.getContext('2d').createLinearGradient(0,0,0,360);
        grad.addColorStop(0,BL+'30'); grad.addColorStop(1,BL+'00');
        window._scChart=new Chart(ctx,{
          data:{labels:labels,datasets:[
            {type:'bar',label:'W.Plan',data:wPlanData,backgroundColor:BLLT+'80',borderColor:BLLT,borderWidth:1,borderRadius:2,borderSkipped:'bottom',yAxisID:'yBar',order:4},
            {type:'bar',label:'W.Actual',data:wActData,backgroundColor:OR+'99',borderColor:OR,borderWidth:1,borderRadius:2,borderSkipped:'bottom',yAxisID:'yBar',order:3},
            {type:'line',label:'Cum. Plan',data:cPlanData,borderColor:BL,backgroundColor:grad,borderWidth:2.5,pointBackgroundColor:BL,pointRadius:3,pointHoverRadius:5,fill:true,tension:0.4,yAxisID:'yCum',order:2,clip:false},
            {type:'line',label:'Cum. Actual',data:cActData,borderColor:OR,backgroundColor:'transparent',borderWidth:2.5,borderDash:[7,4],pointBackgroundColor:OR,pointRadius:3.5,pointHoverRadius:6,fill:false,tension:0.4,spanGaps:false,yAxisID:'yCum',order:1,clip:false},
          ]},
          options:{
            responsive:true,maintainAspectRatio:false,
            layout:{padding:{top:12,right:8}},
            interaction:{mode:'index',intersect:false},
            plugins:{
              legend:{display:false},
              tooltip:{backgroundColor:TTBG,titleColor:'#e2e8f0',bodyColor:'#94a3b8',borderColor:'rgba(255,255,255,.08)',borderWidth:1,padding:12,cornerRadius:8,titleFont:{size:11,weight:'600'},bodyFont:{size:10},
                callbacks:{
                  title:function(i){return 'Minggu '+i[0].label;},
                  label:function(i){var v=i.raw;if(v===null||v===undefined)return null;return '  '+['W.Plan','W.Actual','Cum.Plan','Cum.Actual'][i.datasetIndex]+': '+(+v).toFixed(1)+'%';}
                }
              }
            },
            scales:{
              x:{grid:{color:GRID,drawBorder:false},ticks:{color:TICK,font:{size:10},maxRotation:0,autoSkip:weeks.length>14},border:{display:false}},
              yBar:{type:'linear',position:'left',title:{display:true,text:'Weekly %',color:TICK,font:{size:9}},grid:{display:false},ticks:{color:TICK,font:{size:9},callback:function(v){return v+'%';}},border:{display:false},min:0,suggestedMax:Math.max.apply(null,wPlanData.concat(wActData).filter(Boolean).concat([8]))*1.3},
              yCum:{type:'linear',position:'right',title:{display:true,text:'Kumulatif %',color:TICK,font:{size:9}},grid:{color:GRID,drawBorder:false},ticks:{color:TICK,font:{size:9},callback:function(v){return v>100?'':v+'%';}},border:{display:false},min:0,max:105}
            }
          }
        });
      },50);
    };

function renderScTable(weeks){
  if(!weeks.length){$('scTable').innerHTML='';return;}
  const light=document.documentElement.classList.contains('light');
  const rows=weeks.map(w=>{
    const varW=((+w.wAct||0)-(+w.wPlan||0));
    const varC=((+w.cAct||0)-(+w.cPlan||0));
    const vc=varC>=0?'var(--gn)':varC>=-5?'var(--yw)':'var(--rd)';
    return `<tr>
      <td style="font-family:var(--fm);font-weight:600;color:var(--bl)">W${String(w.week).padStart(2,'0')}</td>
      <td style="color:var(--mt);font-size:10px">${w.dateStart||'\u2014'}</td>
      <td style="font-family:var(--fm);color:#3b82f6">${(+w.wPlan||0).toFixed(1)}%</td>
      <td style="font-family:var(--fm);color:var(--or)">${(+w.wAct||0).toFixed(1)}%</td>
      <td style="font-family:var(--fm);color:${varW>=0?'var(--gn)':'var(--rd)'}">${(varW>=0?'+':'')+varW.toFixed(1)}%</td>
      <td style="font-family:var(--fm);color:var(--gn)">${(+w.cPlan||0).toFixed(1)}%</td>
      <td style="font-family:var(--fm);color:var(--yw)">${(+w.cAct||0).toFixed(1)}%</td>
      <td style="font-family:var(--fm);font-weight:600;color:${vc}">${(varC>=0?'+':'')+varC.toFixed(1)}%</td>
      <td class="edit-only"><button class="btn btn-sm brd" style="padding:1px 6px;font-size:10px" onclick="delScWeek('${w.projId}',${w.week})"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;display:inline-block"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg></button></td>
    </tr>`;
  }).join('');
  $('scTable').innerHTML=`<table class="tbl"><thead><tr>
    <th>Minggu</th><th>Tanggal</th>
    <th style="color:#3b82f6">W.Plan</th><th style="color:var(--or)">W.Actual</th><th>Variance</th>
    <th style="color:var(--gn)">Cum.Plan</th><th style="color:var(--yw)">Cum.Actual</th><th>Var.Cum</th><th></th>
  </tr></thead><tbody>${rows}</tbody></table>`;
}

// ── S-CURVE PLAN INPUT ───────────────────────────────────────
function renderPlanInputRows(){
  const dur=+$('scPlanDur').value||20;
  const projId=$('scPlanProj')?.value;
  const existing=SCURVE.filter(d=>String(d.projId)===String(projId));
  let rows='';
  let cumTotal=0;
  for(let w=1;w<=dur;w++){
    const ex=existing.find(d=>d.week===w);
    const val=ex?(+ex.wPlan||0).toFixed(1):'';
    cumTotal+=ex?(+ex.wPlan||0):0;
    rows+=`<div style="display:grid;grid-template-columns:60px 1fr 80px;align-items:center;gap:8px;padding:5px 6px;border-bottom:1px solid var(--bd)">
      <label style="font-family:var(--fm);font-size:11px;font-weight:600;color:var(--bl)">W${String(w).padStart(2,'0')}</label>
      <input type="range" min="0" max="30" step="0.1" value="${val||0}" id="spR${w}"
        oninput="$('spV${w}').value=parseFloat(this.value).toFixed(1);calcPlanTotal()"
        style="flex:1">
      <input type="number" min="0" max="100" step="0.1" value="${val||0}" id="spV${w}"
        oninput="$('spR${w}').value=this.value;calcPlanTotal()"
        style="width:72px;padding:3px 6px;font-size:11px;text-align:right" class="fi">
    </div>`;
  }
  $('planInputRows').innerHTML=rows;
  calcPlanTotal();
}

function calcPlanTotal(){
  const dur=+$('scPlanDur').value||20;
  let total=0;
  for(let w=1;w<=dur;w++){
    const el=$('spV'+w);
    if(el)total+=parseFloat(el.value)||0;
  }
  const el=$('planTotal');
  if(el){
    el.textContent=total.toFixed(1)+'%';
    el.style.color=Math.abs(total-100)<0.5?'var(--gn)':total>100?'var(--rd)':'var(--yw)';
  }
}

function saveSCurvePlan(){
  const projId=$('scPlanProj').value;
  if(!projId){toast('Pilih project','error');return;}
  const dur=+$('scPlanDur').value||20;
  const proj=P.find(p=>String(p.id)===String(projId));
  let cumPlan=0;
  for(let w=1;w<=dur;w++){
    const wPlan=parseFloat($('spV'+w)?.value)||0;
    cumPlan+=wPlan;
    // Get existing actual
    const ex=SCURVE.find(d=>String(d.projId)===String(projId)&&d.week===w);
    let dateStart='';
    if(proj?.mulai){
      const d=new Date(proj.mulai);d.setDate(d.getDate()+(w-1)*7);
      dateStart=d.toLocaleDateString('id-ID',{day:'2-digit',month:'short',year:'numeric'});
    }
    if(ex){
      ex.wPlan=wPlan;
      ex.cPlan=Math.round(cumPlan*10)/10;
      ex.dateStart=dateStart;
    }else{
      SCURVE.push({projId,week:w,wPlan,wAct:0,cPlan:Math.round(cumPlan*10)/10,cAct:null,dateStart});
    }
  }
  // Sync project.plan dari cumulative plan S-Curve
  const proj2=P.find(p=>String(p.id)===String(projId));
  if(proj2){proj2.plan=Math.round(cumPlan*10)/10;}

  dirty();cm('scPlan');
  render(); // full render
  toast(`✓ Plan ${dur} minggu disimpan`);gsSync();
}

// ── S-CURVE ACTUAL UPDATE ────────────────────────────────────
function scFillActualWeek(){
  const projId=$('scActProj')?.value;
  if(!projId)return;
  const data=SCURVE.filter(d=>String(d.projId)===String(projId));
  const lastActWeek=data.filter(d=>+d.wAct>0||+d.cAct>0).reduce((m,d)=>Math.max(m,d.week),0);
  const nextWeek=Math.min(lastActWeek+1,24);
  const sel=$('scActWeek');
  const isInit=sel?.dataset.init!=='1';
  if(sel&&isInit){sel.value=nextWeek;sel.dataset.init='1';}
  const week=+(sel?.value||nextWeek);
  const entry=data.find(d=>d.week===week);
  const cumPlan=data.filter(d=>d.week<=week).reduce((s,d)=>s+(+d.wPlan||0),0);
  if(entry&&+entry.wAct>0)sv('scActWAct',(+entry.wAct).toFixed(1));
  if($('scActWPlan'))$('scActWPlan').textContent=entry?(+entry.wPlan||0).toFixed(1)+'%':'\u2014';
  if($('scActCPlan'))$('scActCPlan').textContent=cumPlan.toFixed(1)+'%';
  scPreviewCumActual();
}

function scPreviewCumActual(){
  const projId=$('scActProj')?.value;
  const week=+($('scActWeek')?.value||1);
  const wAct=parseFloat($('scActWAct')?.value)||0;
  const data=SCURVE.filter(d=>String(d.projId)===String(projId));
  const prevCumAct=data.filter(d=>d.week<week&&(+d.wAct>0||+d.cAct>0))
    .reduce((s,d)=>s+(+d.wAct||0),0);
  const cumAct=Math.round((prevCumAct+wAct)*10)/10;
  const cumPlan=data.filter(d=>d.week<=week).reduce((s,d)=>s+(+d.wPlan||0),0);
  const varr=(cumAct-cumPlan).toFixed(1);
  if($('scActCumPreview'))$('scActCumPreview').textContent=cumAct.toFixed(1)+'%';
  if($('scActVarPreview'))$('scActVarPreview').innerHTML=` &nbsp; Variance: <b style="color:${+varr>=0?'var(--gn)':'var(--rd)'}">${+varr>=0?'+':''}${varr}%</b>`;
}

function saveSCurveActual(){
  const projId=$('scActProj')?.value;
  if(!projId){toast('Pilih project','error');return;}
  const week=+($('scActWeek')?.value||1);
  const wAct=parseFloat($('scActWAct')?.value)||0;
  const cActRaw=$('scActCAct')?.value;
  const cAct=cActRaw!==''&&cActRaw!=null?parseFloat(cActRaw):null;
  _doSaveSCurveActual(projId,week,wAct,cAct);
}

function _doSaveSCurveActual(projId,week,wAct,cAct){
  const proj=P.find(p=>String(p.id)===String(projId));
  const data=SCURVE.filter(d=>String(d.projId)===String(projId));
  const ex=SCURVE.find(d=>String(d.projId)===String(projId)&&d.week===week);

  let dateStart='';
  if(proj?.mulai){
    const d=new Date(proj.mulai);d.setDate(d.getDate()+(week-1)*7);
    dateStart=d.toLocaleDateString('id-ID',{day:'2-digit',month:'short',year:'numeric'});
  }
  if(ex){ex.wAct=wAct;if(cAct!==null)ex.cAct=cAct;ex.dateStart=ex.dateStart||dateStart;}
  else{SCURVE.push({projId,week,wPlan:0,wAct,cPlan:null,cAct,dateStart});}

  // ── Sync progress project dari S-Curve ──────────────────────
  if(proj){
    // Hitung cumulative actual dari akumulasi wAct
    const allData=SCURVE.filter(d=>String(d.projId)===String(projId)).sort((a,b)=>a.week-b.week);
    let cumAct=0,cumPlan=0;
    allData.forEach(d=>{cumAct+=(+d.wAct||0);cumPlan+=(+d.wPlan||0);});
    // Gunakan cAct jika di-set manual di entry terakhir
    const lastEntry=[...allData].filter(d=>+d.wAct>0||d.cAct!=null).slice(-1)[0];
    const finalAct=lastEntry?.cAct!=null?+lastEntry.cAct:Math.round(cumAct*10)/10;
    const finalPlan=lastEntry?.cPlan!=null?+lastEntry.cPlan:Math.round(cumPlan*10)/10;

    proj.actual=Math.round(finalAct*10)/10;
    proj.plan=Math.round(finalPlan*10)/10;

    // Auto-update status berdasarkan variance
    const variance=finalAct-finalPlan;
    if(finalAct>=100)proj.status='Done';
    else if(variance>=-3)proj.status='On Track';
    else if(variance>=-10)proj.status='Delayed';
    else proj.status='Critical';

    // Tambah ke history
    if(!proj.history)proj.history=[];
    proj.history.push({
      date:new Date().toLocaleDateString('id-ID'),
      actual:proj.actual,plan:proj.plan,
      notes:`Update dari S-Curve W${String(week).padStart(2,'0')}`
    });

    toast(`✓ W${String(week).padStart(2,'0')} disimpan · Progress ${proj.actual}% (${proj.status})`);
  }else{
    toast(`✓ W${String(week).padStart(2,'0')} Actual disimpan`);
  }

  dirty();cm('scActual');
  render();
  if(selId)renderDetail(selId);
  gsSync();
}

// Sync project selection from plan panel to actual panel in combined modal
function scSyncActProj(){
  const projId=$('scPlanProj')?.value;
  if(projId){
    // Sync to the week dropdown in right panel
    const wsel=$('scActWeek');if(wsel)wsel.dataset.init='';
    scFillActualWeek();
  }
}

// Standalone actual modal (ov-scActual) functions
function scFillActualWeek2(){
  const projId=$('scActProj')?.value;
  if(!projId)return;
  const data=SCURVE.filter(d=>String(d.projId)===String(projId));
  const sel=$('scActWeek2');
  const isInit=sel?.dataset.init!=='1';
  if(sel&&isInit){
    const lastActWeek=data.filter(d=>+d.wAct>0||+d.cAct>0).reduce((m,d)=>Math.max(m,d.week),0);
    sel.value=Math.min(lastActWeek+1,24);
    sel.dataset.init='1';
  }
  const week=+(sel?.value||1);
  const entry=data.find(d=>d.week===week);
  const cumPlan=data.filter(d=>d.week<=week).reduce((s,d)=>s+(+d.wPlan||0),0);
  if(entry&&+entry.wAct>0)sv('scActWAct2',(+entry.wAct).toFixed(1));
  if($('scActWPlan2'))$('scActWPlan2').textContent=entry?(+entry.wPlan||0).toFixed(1)+'%':'\u2014';
  if($('scActCPlan2'))$('scActCPlan2').textContent=cumPlan.toFixed(1)+'%';
  scPreviewCumActual2();
}
function scPreviewCumActual2(){
  const projId=$('scActProj')?.value;
  const week=+($('scActWeek2')?.value||1);
  const wAct=parseFloat($('scActWAct2')?.value)||0;
  const data=SCURVE.filter(d=>String(d.projId)===String(projId));
  const prevCum=data.filter(d=>d.week<week&&(+d.wAct>0||+d.cAct>0)).reduce((s,d)=>s+(+d.wAct||0),0);
  const cumAct=Math.round((prevCum+wAct)*10)/10;
  const cumPlan=data.filter(d=>d.week<=week).reduce((s,d)=>s+(+d.wPlan||0),0);
  const varr=(cumAct-cumPlan).toFixed(1);
  if($('scActCumPreview2'))$('scActCumPreview2').textContent=cumAct.toFixed(1)+'%';
  if($('scActVarPreview2'))$('scActVarPreview2').innerHTML=` &nbsp;Variance: <b style="color:${+varr>=0?'var(--gn)':'var(--rd)'}">${+varr>=0?'+':''}${varr}%</b>`;
}
function saveSCurveActual2(){
  // Route to main saveSCurveActual using the 2-suffix inputs
  const projId=$('scActProj').value;
  if(!projId){toast('Pilih project','error');return;}
  const week=+$('scActWeek2').value;
  const wAct=parseFloat($('scActWAct2').value)||0;
  const cActRaw=$('scActCAct2').value;
  const cAct=cActRaw!==''?parseFloat(cActRaw):null;
  _doSaveSCurveActual(projId,week,wAct,cAct);
  cm('scActual');
}

function delScWeek(projId,week){
  showConfirm('Hapus data minggu ini?',()=>{_doDelScWeek(projId,week);});return;}
function _doDelScWeek(projId,week){
  SCURVE=SCURVE.filter(d=>!(String(d.projId)===String(projId)&&d.week===week));
  dirty();renderSCurve();renderScManageTable();toast('Data dihapus','warn');gsSync();
}

function renderScManageTable(){
  const projId=$('scMgProj')?.value;
  if(!projId)return;
  const data=SCURVE.filter(d=>String(d.projId)===String(projId)).sort((a,b)=>a.week-b.week);
  if(!data.length){$('scMgTable').innerHTML='<div style="text-align:center;color:var(--mt);padding:20px">Belum ada data S-Curve untuk project ini</div>';return;}
  $('scMgTable').innerHTML=`<table class="tbl"><thead><tr><th>Minggu</th><th>W.Plan%</th><th>W.Actual%</th><th>Cum.Plan%</th><th>Cum.Actual%</th><th></th></tr></thead><tbody>
    ${data.map(d=>`<tr>
      <td style="font-family:var(--fm)">W${String(d.week).padStart(2,'0')}</td>
      <td>${(+d.wPlan||0).toFixed(1)}%</td><td>${(+d.wAct||0).toFixed(1)}%</td>
      <td>${d.cPlan!=null?(+d.cPlan).toFixed(1)+'%':'auto'}</td>
      <td>${d.cAct!=null?(+d.cAct).toFixed(1)+'%':'auto'}</td>
      <td><button class="btn btn-sm brd" style="padding:1px 6px;font-size:10px" onclick="delScWeek('${d.projId}',${d.week});renderScManageTable()"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;display:inline-block"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg></button></td>
    </tr>`).join('')}
  </tbody></table>`;
}


(function(){
  const DASH_VER='3.82';
  try{
    if(localStorage.getItem('atw_ver')!==DASH_VER){
      // Upgrade versi \u2014 hanya hapus cache UI, BUKAN data project
      // Data akan di-load ulang dari GSheet (source of truth)
      // Keys yang DIPERTAHANKAN: semua data + config penting
      const keepKeys=[
        'atw_gs','atw_pw','atw_dash_logo','atw_logos',
        'atw_theme','atw_session','atw_data','atw_sb_hidden'
      ];
      const saved={};
      keepKeys.forEach(k=>{const v=localStorage.getItem(k);if(v!=null)saved[k]=v;});
      localStorage.clear();
      Object.entries(saved).forEach(([k,v])=>localStorage.setItem(k,v));
      localStorage.setItem('atw_ver',DASH_VER);
      // Tidak perlu log ke console \u2014 normal behavior saat upgrade
    }
  }catch(e){}
})();

