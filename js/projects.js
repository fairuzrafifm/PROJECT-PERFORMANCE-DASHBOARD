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

// ============ PORTFOLIO OVERVIEW — INFOGRAFIS (data live + SVG) ============
// Warna ambil dari CSS var tema (otomatis ikut dark/light)
var _OVC={ind:'var(--bl)',grn:'var(--gn)',red:'var(--rd)',amb:'var(--yw)',pur:'var(--pu)',blu:'var(--atb)',teal:'var(--att)',
  tx:'var(--tx)',mut:'var(--mt)',bd:'var(--bd)',sf:'var(--sf)',sf2:'var(--sf2)'};
function _ovIc(p,sz,col,sw){return '<svg viewBox="0 0 24 24" width="'+sz+'" height="'+sz+'" fill="none" stroke="'+(col||_OVC.mut)+'" stroke-width="'+(sw||1.7)+'" stroke-linecap="round" stroke-linejoin="round">'+p+'</svg>';}
var _OVI={pin:'<path d="M12 21s7-6 7-11a7 7 0 1 0-14 0c0 5 7 11 7 11z"/><circle cx="12" cy="10" r="2.4"/>'};
function _ovDonut(segs,cx,cy,r,sw,top,bot){var tot=segs.reduce(function(s,x){return s+x.v;},0)||1,off=0,a='',Cc=2*Math.PI*r;
  segs.forEach(function(s){var len=s.v/tot*Cc;a+='<circle class="ov-arc" data-cc="'+Cc.toFixed(2)+'" data-len="'+len.toFixed(2)+'" cx="'+cx+'" cy="'+cy+'" r="'+r+'" fill="none" stroke="'+s.c+'" stroke-width="'+sw+'" stroke-dasharray="'+len.toFixed(2)+' '+(Cc-len).toFixed(2)+'" stroke-dashoffset="'+(-off).toFixed(2)+'" transform="rotate(-90 '+cx+' '+cy+')"/>';off+=len;});
  if(top!=null)a+='<text x="'+cx+'" y="'+(cy-1)+'" text-anchor="middle" font-size="16" font-weight="700" fill="'+_OVC.tx+'">'+top+'</text>';
  if(bot!=null)a+='<text x="'+cx+'" y="'+(cy+12)+'" text-anchor="middle" font-size="8" font-weight="600" fill="'+_OVC.mut+'">'+bot+'</text>';return a;}
function _ovGauge(val,cx,cy,r,col,label){var segs=[[0,33,_OVC.red],[33,66,_OVC.amb],[66,100,_OVC.grn]],p='';
  segs.forEach(function(s){var s0=Math.PI*(1-s[0]/100),s1=Math.PI*(1-s[1]/100),x0=cx+r*Math.cos(s0),y0=cy-r*Math.sin(s0),x1=cx+r*Math.cos(s1),y1=cy-r*Math.sin(s1);
    p+='<path d="M '+x0.toFixed(1)+' '+y0.toFixed(1)+' A '+r+' '+r+' 0 0 1 '+x1.toFixed(1)+' '+y1.toFixed(1)+'" fill="none" stroke="'+s[2]+'" stroke-width="9" stroke-linecap="round"/>';});
  var na=Math.PI*(1-Math.max(0,Math.min(100,val))/100),nx=cx+(r-3)*Math.cos(na),ny=cy-(r-3)*Math.sin(na);
  p+='<line class="ov-needle" data-cx="'+cx+'" data-cy="'+cy+'" data-r="'+r+'" data-val="'+val+'" x1="'+cx+'" y1="'+cy+'" x2="'+nx.toFixed(1)+'" y2="'+ny.toFixed(1)+'" stroke="'+_OVC.tx+'" stroke-width="2.5" stroke-linecap="round"/><circle cx="'+cx+'" cy="'+cy+'" r="3" fill="'+_OVC.tx+'"/>';
  p+='<text x="'+cx+'" y="'+(cy-12)+'" text-anchor="middle" font-size="18" font-weight="700" fill="'+col+'">'+val+'<tspan font-size="9" fill="'+_OVC.mut+'">/100</tspan></text>';
  p+='<text x="'+cx+'" y="'+(cy-1)+'" text-anchor="middle" font-size="8" font-weight="700" fill="'+col+'" letter-spacing="1">'+label+'</text>';return p;}
function _ovBars(data,x,y,w,h,max,ylab,grp){var n=data.length,gap=w/n,bw=gap*0.58,s='';
  for(var i=0;i<=3;i++){var gy=y+h-(h*i/3),v=max*i/3;s+='<line x1="'+x+'" y1="'+gy.toFixed(1)+'" x2="'+(x+w)+'" y2="'+gy.toFixed(1)+'" stroke="'+_OVC.bd+'" stroke-width="0.5"/>';
    if(ylab!==false)s+='<text x="'+(x-4)+'" y="'+(gy+2.5).toFixed(1)+'" text-anchor="end" font-size="6" fill="'+_OVC.mut+'">'+(typeof ylab==='function'?ylab(v):(max<=2?v.toFixed(1):Math.round(v)))+'</text>';}
  s+='<line x1="'+x+'" y1="'+y+'" x2="'+x+'" y2="'+(y+h)+'" stroke="'+_OVC.mut+'" stroke-width="1.1"/><line x1="'+x+'" y1="'+(y+h)+'" x2="'+(x+w)+'" y2="'+(y+h)+'" stroke="'+_OVC.mut+'" stroke-width="1.1"/>';
  data.forEach(function(d,i){var bh=max?(d.v/max)*h:0,bx=x+gap*i+(gap-bw)/2,by=y+h-bh;
    s+='<rect class="ov-barv" data-by="'+(y+h).toFixed(1)+'" data-h="'+Math.max(0,bh).toFixed(1)+'" x="'+bx.toFixed(1)+'" y="'+by.toFixed(1)+'" width="'+bw.toFixed(1)+'" height="'+Math.max(0,bh).toFixed(1)+'" rx="2" fill="'+d.c+'"/>';
    if(d.l){var lx=(grp&&grp>1)?(x+gap*i+gap*grp/2):(bx+bw/2);s+='<text x="'+lx.toFixed(1)+'" y="'+(y+h+10)+'" text-anchor="middle" font-size="7.5" fill="'+_OVC.mut+'">'+d.l+'</text>';}
    if(d.top!=null)s+='<text x="'+(bx+bw/2).toFixed(1)+'" y="'+(by-3).toFixed(1)+'" text-anchor="middle" font-size="8.5" font-weight="700" fill="'+_OVC.tx+'">'+d.top+'</text>';});return s;}
function _ovFunnel(data,x,y,w,h){var n=data.length,topW=w,botW=w*0.16,cx=x+w/2,bh=h/n,s='';
  var wAt=function(i){return topW-(topW-botW)*(i/n);};
  for(var i=0;i<n;i++){var wT=wAt(i),wB=wAt(i+1),yT=y+i*bh,yB=yT+bh-2;
    s+='<polygon points="'+(cx-wT/2).toFixed(1)+','+yT+' '+(cx+wT/2).toFixed(1)+','+yT+' '+(cx+wB/2).toFixed(1)+','+yB+' '+(cx-wB/2).toFixed(1)+','+yB+'" fill="'+data[i][2]+'"/>';
    s+='<text x="'+cx+'" y="'+(yT+bh/2+1)+'" text-anchor="middle" font-size="8" font-weight="600" fill="#fff">'+data[i][0]+'</text>';
    s+='<text x="'+(x+w+6)+'" y="'+(yT+bh/2+3)+'" font-size="8.5" font-weight="700" fill="'+_OVC.tx+'">'+data[i][1]+'</text>';}
  return s;}
// s-curve group per proyek (toggle via dropdown)
window._ovGoTab=function(t){try{var tabs=document.querySelectorAll('.tab');for(var i=0;i<tabs.length;i++){var oc=tabs[i].getAttribute('onclick')||'';if(oc.indexOf("sw('"+t+"'")>=0){sw(t,tabs[i]);return;}}if(typeof sw==='function')sw(t,tabs[0]);}catch(e){}};
// ── Efek 3D tilt kartu overview (ikut kursor/sentuhan) ───────────────────
(function(){
  if(window._ovTiltInit)return; window._ovTiltInit=true;
  var MAX=8,cur=null;
  function reset(){if(cur){cur.style.transition='transform .3s ease, box-shadow .3s ease';cur.style.transform='';cur.style.boxShadow='';cur=null;}}
  function tilt(e){
    var c=e.target&&e.target.closest?e.target.closest('.ov-clk'):null;
    if(!c){reset();return;}
    if(cur&&cur!==c)reset();
    cur=c;
    var r=c.getBoundingClientRect();if(!r.width||!r.height)return;
    var px=(e.clientX-r.left)/r.width,py=(e.clientY-r.top)/r.height;
    var ry=(Math.max(0,Math.min(1,px))-0.5)*2*MAX,rx=-(Math.max(0,Math.min(1,py))-0.5)*2*MAX;
    c.style.transition='transform .06s linear';
    c.style.transform='perspective(640px) rotateX('+rx.toFixed(2)+'deg) rotateY('+ry.toFixed(2)+'deg) translateZ(6px)';
    c.style.boxShadow='0 16px 32px rgba(0,0,0,.45)';
  }
  function attach(){
    var d=document.getElementById('ovDash');
    if(!d){document.addEventListener('pointermove',tilt);document.addEventListener('pointerup',reset,true);document.addEventListener('pointercancel',reset,true);return;}
    if(d._tilt)return; d._tilt=true;
    d.addEventListener('pointermove',tilt);
    d.addEventListener('pointerdown',tilt);
    d.addEventListener('pointerleave',reset);
    d.addEventListener('pointerup',reset);
    d.addEventListener('pointercancel',reset);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',attach);else attach();
})();
// ── Saat tema berganti, render ulang tab aktif (warna teks SVG via var() di atribut tidak reaktif) ──
(function(){
  if(window._ovThemeObs||typeof MutationObserver==='undefined')return; window._ovThemeObs=true;
  var wasLight=document.documentElement.classList.contains('light');
  var obs=new MutationObserver(function(){
    var isLight=document.documentElement.classList.contains('light');
    if(isLight===wasLight)return; wasLight=isLight;
    if(window._ovInitialBulk)return; // masih load awal — dilewati
    if(typeof window.render==='function'){try{window.render();return;}catch(e){}}
    if(typeof window.renderOV==='function'&&document.getElementById('ovDash')){try{window.renderOV();}catch(e){}}
  });
  obs.observe(document.documentElement,{attributes:true,attributeFilter:['class']});
})();
function _ovCostByRab(costs){var RABa=(typeof RAB!=='undefined')?RAB:[];var by={};costs.forEach(function(c){var nm=null;if(c.rabKatId){var rk=RABa.find(function(r){return String(r.id)===String(c.rabKatId);});if(rk)nm=rk.name||rk.nama;}if(!nm&&c.rabItemId){var ri=RABa.find(function(r){return String(r.id)===String(c.rabItemId);});if(ri){var rk2=RABa.find(function(r){return String(r.id)===String(ri.katId);});if(rk2)nm=rk2.name||rk2.nama;}}if(!nm)nm=c.kategori||'Lainnya';by[nm]=(by[nm]||0)+(+c.amount||0);});return by;}
window._ovScShow=function(id){var gs=document.querySelectorAll('#ovScSvg [id^="ovsc-"]');gs.forEach(function(g){g.style.display=(g.id==='ovsc-'+id)?'':'none';});};
function _ovScurve(curves,w,h){var pL=30,pB=24,pT=8,cw=w-pL-8,ch=h-pB-pT;
  var xx=function(i,n){return pL+(n<=1?0:(i/(n-1))*cw);},yy=function(v){return pT+ch-(Math.max(0,Math.min(100,v))/100)*ch;};
  var axes='';[0,25,50,75,100].forEach(function(t){var gy=pT+ch-(t/100)*ch;axes+='<line x1="'+pL+'" y1="'+gy+'" x2="'+(pL+cw)+'" y2="'+gy+'" stroke="'+_OVC.bd+'" stroke-width="0.5"/><text x="'+(pL-4)+'" y="'+(gy+3)+'" text-anchor="end" font-size="7" fill="'+_OVC.mut+'">'+t+'%</text>';});
  var groups='';curves.forEach(function(cv,idx){var n=Math.max(cv.plan.length,cv.act.length,2);
    var pp=cv.plan.map(function(v,i){return xx(i,cv.plan.length).toFixed(1)+','+yy(v).toFixed(1);}).join(' ');
    var ap=cv.act.map(function(v,i){return xx(i,cv.plan.length).toFixed(1)+','+yy(v).toFixed(1);}).join(' ');
    var g='',lines='';
    if(cv.wk&&cv.wk.length){var np=cv.plan.length||cv.wk.length,st=Math.max(1,Math.ceil(cv.wk.length/7));cv.wk.forEach(function(wn,i){if(i%st===0||i===cv.wk.length-1){g+='<text x="'+xx(i,np).toFixed(1)+'" y="'+(pT+ch+12)+'" text-anchor="middle" font-size="7" fill="'+_OVC.mut+'">W'+wn+'</text>';}});}
    if(cv.plan.length)lines+='<polyline points="'+pp+'" fill="none" stroke="'+_OVC.ind+'" stroke-width="1.8" stroke-dasharray="5 3"/>';
    if(cv.act.length)lines+='<polyline points="'+ap+'" fill="none" stroke="'+_OVC.grn+'" stroke-width="2.2"/>';
    if(!cv.plan.length&&!cv.act.length)g+='<text x="'+(pL+cw/2)+'" y="'+(pT+ch/2)+'" text-anchor="middle" font-size="9" fill="'+_OVC.mut+'">Belum ada data S-Curve</text>';
    if(lines)g+='<clipPath id="ovclip-'+cv.id+'"><rect class="ov-clip" data-w="'+w+'" x="0" y="0" width="'+w+'" height="'+h+'"/></clipPath><g clip-path="url(#ovclip-'+cv.id+')">'+lines+'</g>';
    groups+='<g id="ovsc-'+cv.id+'"'+(idx===0?'':' style="display:none"')+'>'+g+'</g>';});
  return '<svg id="ovScSvg" viewBox="0 0 '+w+' '+h+'" width="100%" height="'+h+'">'+axes+groups+'</svg>';}

function _ovAnimate(root){try{
  var arcs=[].slice.call(root.querySelectorAll('.ov-arc')),needles=[].slice.call(root.querySelectorAll('.ov-needle')),counts=[].slice.call(root.querySelectorAll('.ov-count')),barvs=[].slice.call(root.querySelectorAll('.ov-barv')),barhs=[].slice.call(root.querySelectorAll('.ov-barh')),clips=[].slice.call(root.querySelectorAll('.ov-clip'));
  if(!arcs.length&&!needles.length&&!counts.length&&!barvs.length&&!barhs.length&&!clips.length)return;
  if(typeof requestAnimationFrame!=='function')return;
  if(window._ovRaf)cancelAnimationFrame(window._ovRaf); window._ovAnimating=true; // batalkan animasi lama & tandai berjalan (anti-terpotong render)
  // reset ke 0 (sinkron sebelum paint) -> tanpa kedip; markup tetap berisi nilai final bila JS gagal
  arcs.forEach(function(a){var cc=+a.getAttribute('data-cc');a.setAttribute('stroke-dasharray','0 '+cc.toFixed(2));});
  needles.forEach(function(n){var cx=+n.getAttribute('data-cx'),cy=+n.getAttribute('data-cy'),r=+n.getAttribute('data-r');n.setAttribute('x2',(cx-(r-3)).toFixed(1));n.setAttribute('y2',cy.toFixed?cy.toFixed(1):cy);});
  counts.forEach(function(c){c.textContent='0';});
  barvs.forEach(function(b){var by=+b.getAttribute('data-by');b.setAttribute('height','0');b.setAttribute('y',by.toFixed(1));});
  barhs.forEach(function(b){b.setAttribute('width','0');});
  clips.forEach(function(c){c.setAttribute('width','0');});
  var t0=null,DUR=1700,ease=function(x){return x<0.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;}; // ease-in-out cubic: mulai & selesai lembut (lebih smooth, tidak nyentak)
  function frame(ts){if(t0==null)t0=ts;var p=Math.min(1,(ts-t0)/DUR),e=ease(p);
    arcs.forEach(function(a){var len=+a.getAttribute('data-len'),cc=+a.getAttribute('data-cc');a.setAttribute('stroke-dasharray',(e*len).toFixed(2)+' '+(cc-e*len).toFixed(2));});
    needles.forEach(function(n){var cx=+n.getAttribute('data-cx'),cy=+n.getAttribute('data-cy'),r=+n.getAttribute('data-r'),val=+n.getAttribute('data-val'),v=e*val,ang=Math.PI*(1-Math.max(0,Math.min(100,v))/100);n.setAttribute('x2',(cx+(r-3)*Math.cos(ang)).toFixed(1));n.setAttribute('y2',(cy-(r-3)*Math.sin(ang)).toFixed(1));});
    counts.forEach(function(c){var tg=+c.getAttribute('data-target');c.textContent=Math.round(e*tg);});
    barvs.forEach(function(b){var by=+b.getAttribute('data-by'),hh=+b.getAttribute('data-h'),ch2=hh*e;b.setAttribute('height',ch2.toFixed(1));b.setAttribute('y',(by-ch2).toFixed(1));});
    barhs.forEach(function(b){var ww=+b.getAttribute('data-w');b.setAttribute('width',(ww*e).toFixed(1));});
    clips.forEach(function(c){var ww=+c.getAttribute('data-w');c.setAttribute('width',(ww*e).toFixed(1));});
    if(p<1)window._ovRaf=requestAnimationFrame(frame);
    else{arcs.forEach(function(a){var len=+a.getAttribute('data-len'),cc=+a.getAttribute('data-cc');a.setAttribute('stroke-dasharray',len.toFixed(2)+' '+(cc-len).toFixed(2));});counts.forEach(function(c){c.textContent=c.getAttribute('data-target');});barvs.forEach(function(b){var by=+b.getAttribute('data-by'),hh=+b.getAttribute('data-h');b.setAttribute('height',hh.toFixed(1));b.setAttribute('y',(by-hh).toFixed(1));});barhs.forEach(function(b){b.setAttribute('width',b.getAttribute('data-w'));});clips.forEach(function(c){c.setAttribute('width',c.getAttribute('data-w'));});window._ovAnimating=false;window._ovRaf=0;}
  }
  window._ovRaf=requestAnimationFrame(frame);
}catch(e){window._ovAnimating=false;}}
function _ovCard(t,b,flex,right,tab){var cls='ov-card'+(tab?' ov-clk':'');var oc=tab?(' onclick="_ovGoTab(\''+tab+'\')"'):'';return '<div class="'+cls+'"'+oc+' style="flex:'+flex+';min-width:0;display:flex;flex-direction:column"><div class="ov-ch"><span>'+t+'</span>'+(right||'')+'</div><div class="ov-cb" style="flex:1;display:flex;flex-direction:column;justify-content:center;min-height:0">'+b+'</div></div>';}
function _ovBadge(s){var m={'Critical':[_OVC.red,'rgba(244,112,122,.15)'],'On Track':[_OVC.grn,'rgba(61,220,151,.15)'],'Delayed':[_OVC.amb,'rgba(245,196,82,.15)'],'Done':[_OVC.teal,'rgba(31,158,135,.15)'],'Planning':[_OVC.ind,'rgba(124,140,240,.15)']};var c=m[s]||[_OVC.mut,'var(--sf2)'];return '<span style="background:'+c[1]+';color:'+c[0]+';font-size:7.5px;font-weight:700;padding:2px 6px;border-radius:5px">'+(s||'').toUpperCase()+'</span>';}
function _ovShort(n){n=+n||0;if(n>=1e9)return 'Rp '+(n/1e9).toFixed(n>=1e10?0:1)+' M';if(n>=1e6)return 'Rp '+(n/1e6).toFixed(0)+' jt';if(n>=1e3)return 'Rp '+(n/1e3).toFixed(0)+' rb';return 'Rp '+n;}
function _ovCur(n){var s=_ovShort(n).replace('Rp ',''),m=s.match(/^[\d.,]+/),num=m?m[0]:s,unit=s.slice(num.length);return 'Rp <span style="font-size:.65em"><span class="ov-count" data-target="'+num.replace(/,/g,'')+'">'+num+'</span>'+unit+'</span>';}

function renderOV(){
  var $d=document.getElementById('ovDash'); if(!$d){ if(typeof renderProjStatusCards==='function'){try{renderProjStatusCards();}catch(e){}} return; }
  // ── Tahan paint pertama sampai data sekunder proyek (costs/wbs/scurve) tersedia ──
  // Loader core.js bekerja 2 fase: fase 1 hanya proyek (COSTS dikosongkan), fase 2 baru isi
  // detail per-proyek. Tanpa penahan ini, overview sempat tampil Rp 0 lalu (idealnya) terisi.
  // _ovReady di-set oleh core.js saat data proyek pertama masuk. Fallback timer mencegah nyangkut
  // bila memakai loader lama yang tak men-set flag.
  if(typeof window!=='undefined' && !window._ovReady && !window._ovForce){
    if(!window.__ovFbT){ window.__ovFbT=setTimeout(function(){ window._ovForce=true; try{ if(document.getElementById('ovDash')) renderOV(); }catch(e){} }, 3500); }
    return;
  }
  if(window.__apBegin)window.__apBegin();
  // Resolve warna tema (CSS var) -> nilai nyata, agar fill SVG pasti berwarna di semua browser
  (function(){try{var cs=getComputedStyle(document.documentElement),g=function(n){return (cs.getPropertyValue(n)||'').trim();},m={ind:'--bl',grn:'--gn',red:'--rd',amb:'--yw',pur:'--pu',blu:'--atb',teal:'--att',tx:'--tx',mut:'--mt',bd:'--bd',sf:'--sf',sf2:'--sf2'};Object.keys(m).forEach(function(k){var v=g(m[k]);if(v)_OVC[k]=v;});}catch(e){}})();
  try{
  var projs=(typeof P!=='undefined'?P:[]);
  var A=projs.map(function(p){var a=null;try{a=(typeof analyzeProject==='function')?analyzeProject(p.id):null;}catch(e){a=null;}return {p:p,a:a||{}};});
  var ps={};try{if(typeof portfolioScore==='function')ps=portfolioScore()||{};}catch(e){}
  var health=Math.round(+ps.avg||0), healthColor=ps.color||_OVC.mut, healthLbl=health>=80?'SEHAT':health>=55?'PERHATIAN':'KRITIS';
  // KPI
  var nCrit=A.filter(function(x){return x.p.status==='Critical'||(x.a.score!=null&&x.a.score<55);}).length;
  var allCosts=[];try{if(typeof getAllCosts==='function')allCosts=getAllCosts()||[];}catch(e){}
  var totalCost=allCosts.reduce(function(s,c){return s+(+c.amount||0);},0);
  var procCost=allCosts.filter(function(c){return c.type==='procurement';}).reduce(function(s,c){return s+(+c.amount||0);},0);
  var opexCost=totalCost-procCost;
  var ISSa=(typeof ISS!=='undefined'?ISS:[]), DOCSa=(typeof DOCS!=='undefined'?DOCS:[]), PROCa=(typeof PROC!=='undefined'?PROC:[]), MPa=(typeof MPLOGS!=='undefined'?MPLOGS:[]), ACCa=(typeof ACCLOGS!=='undefined'?ACCLOGS:[]), SCa=(typeof SCURVE!=='undefined'?SCURVE:[]);
  var openIss=ISSa.filter(function(i){return i.status!=='Closed';}).length;

  // KPI strip (tanpa Portfolio Score, ada Health gauge)
  var kf=function(v,l,s,c,tab){var oc=tab?(' onclick="_ovGoTab(\''+tab+'\')"'):'';var isNum=(typeof v==='number')||(/^\d+$/.test(String(v)));var kv=isNum?('<div class="ov-kv ov-count" data-target="'+v+'" style="color:'+(c||_OVC.tx)+'">'+v+'</div>'):('<div class="ov-kv" style="color:'+(c||_OVC.tx)+'">'+v+'</div>');return '<div class="ov-card ov-kpi'+(tab?' ov-clk':'')+'"'+oc+'><div class="ov-kl">'+l+'</div>'+kv+'<div class="ov-ks">'+s+'</div></div>';};
  var _docStat='Seluruh proyek';
  try{
    var _dk=(typeof _DOC_STATUS_KEYS!=='undefined')?_DOC_STATUS_KEYS:['Submitted','On Review','Approved','Approved with Note','Rejected','WIP'];
    var _dcfg=(typeof _DOC_STATUS_CFG!=='undefined')?_DOC_STATUS_CFG:{};
    var _dab={'Submitted':'Sub','On Review':'Review','Approved':'Apv','Approved with Note':'Apv+N','Rejected':'Rej','WIP':'WIP'};
    var _dp=_dk.map(function(s){var c=DOCSa.filter(function(d){return d.status===s;}).length;if(!c)return '';var col=(_dcfg[s]&&_dcfg[s].c)||_OVC.mut;return '<span style="color:'+col+';font-weight:700">'+c+'</span> '+(_dab[s]||s);}).filter(Boolean);
    if(_dp.length)_docStat=_dp.join(' · ');
  }catch(e){}
  var kpis=kf(projs.length,'ACTIVE PROJECT','Proyek Aktif',_OVC.ind,'projects')
   +kf(nCrit,'CRITICAL PROJECT','Skor &lt; 55 / Critical',_OVC.red,'projects')
   +kf(_ovCur(totalCost),'TOTAL COST (PROC+OPEX)','Proc '+_ovShort(procCost)+' · OPEX '+_ovShort(opexCost),_OVC.tx,'cost')
   +kf(openIss,'OPEN ISSUE','Semua proyek',openIss?_OVC.amb:_OVC.grn,'issues')
   +kf(DOCSa.length,'TOTAL DOKUMEN',_docStat,_OVC.pur,'documents');
  var health_c='<div class="ov-card" style="flex:2;min-width:0;padding:8px"><div class="ov-ch" style="justify-content:center">PORTFOLIO HEALTH</div><svg viewBox="0 0 200 86" width="100%" height="84">'+_ovGauge(health,100,70,60,healthColor,healthLbl)+'</svg></div>';

  // Sec1 progress comparison
  var ROWH=62,TOPy=44,bw=120,bx=160,bx2=340,vx=510,BH=18,pcH=TOPy+A.length*ROWH;
  var pc='<svg viewBox="0 0 600 '+pcH+'" width="100%"><text x="'+bx+'" y="26" font-size="14" font-weight="700" fill="'+_OVC.mut+'">PLAN</text><text x="'+bx2+'" y="26" font-size="14" font-weight="700" fill="'+_OVC.mut+'">ACTUAL</text><text x="'+vx+'" y="26" font-size="14" font-weight="700" fill="'+_OVC.mut+'">VARIANCE</text>';
  A.forEach(function(x,i){var ac=(x.a.act!=null?+x.a.act:(+x.p.actual||0)),vr=(x.a.variance!=null?+x.a.variance:0),pl=((x.a.act!=null&&x.a.variance!=null)?Math.round((ac-vr)*10)/10:(+x.a.p||+x.p.plan||0)),cy=TOPy+i*ROWH+ROWH/2,barY=cy-BH/2,nm=(x.p.nama||x.p.kode||'-').replace('PT. ','').slice(0,20);
    pc+='<text x="0" y="'+(cy+5)+'" font-size="15" fill="'+_OVC.tx+'">'+nm+'</text><rect x="'+bx+'" y="'+barY+'" width="'+bw+'" height="'+BH+'" rx="5" fill="'+_OVC.bd+'"/><rect class="ov-barh" data-w="'+(bw*Math.min(100,pl)/100).toFixed(1)+'" x="'+bx+'" y="'+barY+'" width="'+(bw*Math.min(100,pl)/100).toFixed(1)+'" height="'+BH+'" rx="5" fill="'+_OVC.ind+'"/><text x="'+(bx+bw+8)+'" y="'+(cy+5)+'" font-size="13" fill="'+_OVC.mut+'">'+pl.toFixed(0)+'%</text><rect x="'+bx2+'" y="'+barY+'" width="'+bw+'" height="'+BH+'" rx="5" fill="'+_OVC.bd+'"/><rect class="ov-barh" data-w="'+(bw*Math.min(100,ac)/100).toFixed(1)+'" x="'+bx2+'" y="'+barY+'" width="'+(bw*Math.min(100,ac)/100).toFixed(1)+'" height="'+BH+'" rx="5" fill="'+_OVC.grn+'"/><text x="'+(bx2+bw+8)+'" y="'+(cy+5)+'" font-size="13" fill="'+_OVC.mut+'">'+ac.toFixed(0)+'%</text><text x="'+vx+'" y="'+(cy+5)+'" font-size="16" font-weight="700" fill="'+(vr<0?_OVC.red:_OVC.grn)+'">'+(vr>0?'+':'')+vr+'%</text>';});
  pc+='</svg>';
  var sec1a=_ovCard('PETA LOKASI PROYEK','<div id="ovMap" style="width:100%;height:200px;border-radius:8px;overflow:hidden;background:var(--sf2)"></div>',3,null,null);
  var sec1b=_ovCard('1. PROGRESS OVERVIEW',pc,2,null,'projects');

  // Sec2 s-curve + dropdown
  var curves=A.map(function(x){var byW={};SCa.forEach(function(s){if(String(s.projId)===String(x.p.id))byW[+s.week]=s;});var wks=Object.keys(byW).map(Number).sort(function(a,b){return a-b;});
    return {id:x.p.id,name:x.p.nama||x.p.kode,wk:wks,plan:wks.map(function(w){return +byW[w].cPlan||0;}),act:wks.filter(function(w){return byW[w].cAct!=null&&byW[w].cAct!=='';}).map(function(w){return +byW[w].cAct||0;})};});
  var scDrop='<select onchange="_ovScShow(this.value)" onclick="event.stopPropagation()" class="ov-sel">'+A.map(function(x){return '<option value="'+x.p.id+'">'+(x.p.nama||x.p.kode||'-').replace('PT. ','')+'</option>';}).join('')+'</select>';
  var sec2a=_ovCard('2. SCHEDULE PERFORMANCE — S-CURVE',(curves.length?_ovScurve(curves,560,150):'<div style="color:'+_OVC.mut+';font-size:10px;padding:20px">Belum ada proyek</div>')+'<div style="font-size:7.5px;color:'+_OVC.mut+';margin-top:2px"><span style="color:'+_OVC.ind+'">▬▬</span> Plan &nbsp; <span style="color:'+_OVC.grn+'">▬▬</span> Actual</div>',3,curves.length?scDrop:'','wbs');
  // SPI ranking + worst
  var ranked=A.slice().sort(function(a,b){return (+b.a.spi||0)-(+a.a.spi||0);});
  var rk='';ranked.forEach(function(x,i){var spi=+x.a.spi||0,c=spi>=0.95?_OVC.grn:spi>=0.85?_OVC.amb:_OVC.red;rk+='<div class="ov-rrow"><span class="ov-rnum">'+(i+1)+'</span><span style="flex:1;font-size:9px;color:'+_OVC.tx+'">'+(x.p.nama||x.p.kode||'-').replace('PT. ','').slice(0,22)+'</span><span style="font-size:10px;font-weight:700;color:'+_OVC.tx+'">'+spi.toFixed(2)+'</span><span style="width:7px;height:7px;border-radius:50%;background:'+c+';margin-left:6px"></span></div>';});
  var worst=A.slice().sort(function(a,b){return (+a.a.variance||0)-(+b.a.variance||0);})[0];
  if(worst)rk+='<div style="margin-top:7px;padding-top:7px;border-top:1px solid '+_OVC.bd+'"><div class="ov-sub">WORST PROJECT TODAY</div><div style="font-size:10px;color:'+_OVC.tx+'">'+(worst.p.nama||worst.p.kode||'-').replace('PT. ','')+'</div><div style="font-size:17px;font-weight:700;color:'+_OVC.red+'">'+(+worst.a.variance||0)+'%<span style="font-size:8px;color:'+_OVC.mut+';font-weight:400;margin-left:4px">Variance</span></div></div>';
  var sec2b=_ovCard('SPI RANKING',rk||'<div style="color:'+_OVC.mut+';font-size:10px">Belum ada data</div>',2,null,'projects');

  // Sec3 CPI / Budget / Cost breakdown
  var cpiBars=A.map(function(x){var v=+x.a.cpi||0;return {l:(x.p.kode||(x.p.nama||'').slice(0,5)),v:v,top:v.toFixed(2),c:v<0.95?_OVC.red:_OVC.grn};});
  var cpi='<svg viewBox="0 0 190 150" width="100%" height="150">'+_ovBars(cpiBars,28,14,150,118,1.5)+'</svg>';
  var sec3a=_ovCard('CPI (COST PERF. INDEX)',cpi,2,null,'cost');
  var maxBud=Math.max.apply(null,A.map(function(x){return Math.max(+x.a.rab||0,+x.a.costReal||0);}).concat([1]));
  var bvaBars=[];A.forEach(function(x){bvaBars.push({l:(x.p.kode||'').slice(0,5),v:(+x.a.rab||0)/maxBud,c:_OVC.ind});bvaBars.push({l:'',v:(+x.a.costReal||0)/maxBud,c:_OVC.grn});});
  var bva='<svg viewBox="0 0 190 150" width="100%" height="150"><circle cx="18" cy="8" r="3" fill="'+_OVC.ind+'"/><text x="24" y="10.5" font-size="7" fill="'+_OVC.mut+'">Budget</text><circle cx="64" cy="8" r="3" fill="'+_OVC.grn+'"/><text x="70" y="10.5" font-size="7" fill="'+_OVC.mut+'">Actual</text>'+_ovBars(bvaBars,42,18,140,112,1.0,function(v){return _ovShort(v*maxBud).replace('Rp ','').replace(' ','');},2)+'</svg>';
  var sec3b=_ovCard('BUDGET VS ACTUAL',bva,2,null,'cost');
  // cost breakdown by type/kategori
  var byCat=_ovCostByRab(allCosts);
  var catAll=Object.keys(byCat).map(function(k){return {k:k,v:byCat[k]};}).sort(function(a,b){return b.v-a.v;});
  var catArr=catAll.slice(0,6);if(catAll.length>6){var _rest=catAll.slice(6).reduce(function(s,c){return s+c.v;},0);if(_rest>0)catArr.push({k:'Lainnya',v:_rest});}
  var palette=[_OVC.ind,_OVC.grn,_OVC.amb,_OVC.red,_OVC.pur,_OVC.blu,_OVC.teal];
  var cbSegs=catArr.map(function(c,i){return {v:c.v,c:palette[i%palette.length]};});
  var totCB=catArr.reduce(function(s,c){return s+c.v;},0)||1;
  var cbDonut='<svg viewBox="0 0 150 150" width="100%" height="150">'+_ovDonut(cbSegs.length?cbSegs:[{v:1,c:_OVC.bd}],75,75,50,15,_ovShort(totalCost).replace('Rp ',''))+'</svg>';
  var cbLeg=catArr.map(function(c,i){return '<div class="ov-irow"><span style="width:9px;height:9px;border-radius:2px;background:'+palette[i%palette.length]+';flex-shrink:0"></span><span style="flex:1;font-size:8.5px;color:'+_OVC.tx+';overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+c.k+'</span><span style="font-size:8.5px;font-weight:600;color:'+_OVC.mut+'">'+Math.round(c.v/totCB*100)+'%</span></div>';}).join('');
  var sec3c=_ovCard('COST BREAKDOWN','<div style="display:flex;align-items:center;gap:8px"><div style="flex:0 0 42%;max-width:150px">'+cbDonut+'</div><div style="flex:1;min-width:0">'+cbLeg+'</div></div>',3,null,'cost');

  // Sec4 procurement funnel + material status
  var pst={'Waiting Approval':0,'PO Issued':0,'On Production':0,'In Transit':0,'On Site':0,'Done':0};
  var todayD=new Date();todayD.setHours(0,0,0,0);var overdueN=0,prCount=PROCa.length;
  PROCa.forEach(function(i){if(pst[i.status]!=null)pst[i.status]++;var done=(i.status==='On Site'||i.status==='Done');if(!done&&i.due){var d=(typeof parseLocalDate==='function'?parseLocalDate(i.due):new Date(i.due));if(d){d.setHours(0,0,0,0);if(d<todayD)overdueN++;}}});
  var sev={High:0,Medium:0,Low:0};ISSa.filter(function(i){return i.status!=='Closed';}).forEach(function(i){var p=(i.priority||'Medium');if(sev[p]==null)sev[p]=0;sev[p]++;});
  var isTot=sev.High+sev.Medium+sev.Low;
  var isv='<svg viewBox="0 0 110 120" width="100" height="110">'+_ovDonut([{v:sev.High||0.001,c:_OVC.red},{v:sev.Medium,c:_OVC.amb},{v:sev.Low,c:_OVC.grn}],54,58,38,12,String(isTot),'Total')+'</svg>';
  var isLeg=[['High',sev.High,_OVC.red],['Medium',sev.Medium,_OVC.amb],['Low',sev.Low,_OVC.grn]];
  var isleg='';isLeg.forEach(function(x){isleg+='<div class="ov-irow"><span style="width:8px;height:8px;border-radius:2px;background:'+x[2]+'"></span><span style="flex:1;font-size:9px;color:'+_OVC.tx+'">'+x[0]+'</span><span style="font-size:9px;font-weight:700;color:'+_OVC.tx+'">'+x[1]+'</span></div>';});
  var sec4a=_ovCard('4. ISSUE &amp; RISK','<div style="display:flex;align-items:center;gap:6px">'+isv+'<div style="flex:1">'+isleg+'</div></div>',2,null,'issues');
  var arrived=pst['On Site']+pst['Done'];var matSegs=[{v:pst['On Site']||0.001,c:_OVC.grn},{v:pst['In Transit'],c:_OVC.blu},{v:pst['PO Issued']+pst['On Production'],c:_OVC.pur},{v:pst['Waiting Approval'],c:_OVC.amb},{v:overdueN,c:_OVC.red}];
  var totMat=prCount||1;
  var mat='<svg viewBox="0 0 250 160" width="100%" height="160">'+_ovDonut(matSegs,62,82,50,15);
  var matLeg=[['On Site',pst['On Site'],_OVC.grn],['In Transit',pst['In Transit'],_OVC.blu],['PO/Produksi',pst['PO Issued']+pst['On Production'],_OVC.pur],['Waiting Appr.',pst['Waiting Approval'],_OVC.amb],['Overdue',overdueN,_OVC.red]];
  matLeg.forEach(function(x,i){mat+='<rect x="142" y="'+(34+i*24)+'" width="9" height="9" rx="2" fill="'+x[2]+'"/><text x="156" y="'+(42+i*24)+'" font-size="8.5" fill="'+_OVC.tx+'">'+x[0]+'</text><text x="246" y="'+(42+i*24)+'" text-anchor="end" font-size="8.5" fill="'+_OVC.mut+'">'+x[1]+' ('+Math.round(x[1]/totMat*100)+'%)</text>';});
  mat+='</svg>';
  var sec4b=_ovCard('MATERIAL STATUS',mat,3,null,'procurement');

  // Sec5 manpower
  var mpByProj=A.map(function(x){var logs=MPa.filter(function(m){return String(m.projId)===String(x.p.id);}).sort(function(a,b){return (a.date<b.date?1:-1);});return {n:x.p.kode||(x.p.nama||'').slice(0,6),v:logs.length?(+logs[0].total||0):0};}).filter(function(m){return m.v>0;});
  var totMp=mpByProj.reduce(function(s,m){return s+m.v;},0);
  var mpPal=[_OVC.red,_OVC.ind,_OVC.grn,_OVC.amb,_OVC.pur];
  var mpw='<svg viewBox="0 0 230 140" width="100%" height="140">'+_ovDonut(mpByProj.length?mpByProj.map(function(m,i){return {v:m.v,c:mpPal[i%mpPal.length]};}):[{v:1,c:_OVC.bd}],52,72,42,13,String(totMp),'Total');
  var _nL=mpByProj.slice(0,5).length,_lY=72-(_nL-1)*19/2+3;
  mpByProj.slice(0,5).forEach(function(m,i){var yy2=_lY+i*19,col=mpPal[i%mpPal.length];mpw+='<rect x="104" y="'+(yy2-7).toFixed(0)+'" width="9" height="9" rx="2" fill="'+col+'"/><text x="117" y="'+yy2.toFixed(0)+'" font-size="9" fill="'+_OVC.tx+'">'+(m.n||'').slice(0,8)+'</text><text x="174" y="'+yy2.toFixed(0)+'" font-size="9"><tspan font-weight="700" fill="'+_OVC.tx+'">'+m.v+'</tspan> <tspan fill="'+_OVC.mut+'">('+Math.round(m.v/(totMp||1)*100)+'%)</tspan></text>';});
  mpw+='</svg>';
  // manhours last 7 days
  var days=['Min','Sen','Sel','Rab','Kam','Jum','Sab'];var mhTrend=[];var todayObj=new Date();
  for(var dd=6;dd>=0;dd--){var dt=new Date(todayObj);dt.setDate(dt.getDate()-dd);var ds=dt.toISOString().slice(0,10);var sum=MPa.filter(function(m){return m.date===ds;}).reduce(function(s,m){return s+(+m.mhActual||0);},0);mhTrend.push({l:days[dt.getDay()],v:sum});}
  var mhToday=mhTrend[6]?mhTrend[6].v:0, mhYest=mhTrend[5]?mhTrend[5].v:0, mhVar=mhToday-mhYest, mhMax=Math.max.apply(null,mhTrend.map(function(t){return t.v;}).concat([1]));
  var mht='<svg viewBox="0 0 230 140" width="100%" height="140"><text x="6" y="12" font-size="7.5" fill="'+_OVC.mut+'">Total Manhours Hari Ini</text><text x="6" y="30" font-size="17" font-weight="700" fill="'+_OVC.tx+'">'+mhToday+' <tspan font-size="9" fill="'+_OVC.mut+'">jam</tspan></text><text x="6" y="44" font-size="7" fill="'+_OVC.mut+'">Kemarin: '+mhYest+' jam</text><text x="6" y="55" font-size="7" fill="'+(mhVar<0?_OVC.red:_OVC.grn)+'">Variance: '+(mhVar>0?'+':'')+mhVar+' jam</text>'+_ovBars(mhTrend.map(function(t){return {l:t.l,v:t.v,c:_OVC.ind};}),100,22,124,95,mhMax)+'</svg>';
  var sec5=_ovCard('5. MANPOWER &amp; MANHOURS','<div class="ov-g2"><div><div class="ov-sub">MANPOWER DISTRIBUTION</div>'+mpw+'</div><div><div class="ov-sub">MANHOURS TREND (JAM)</div>'+mht+'</div></div>',3,null,'manpower');

  // Sec6 safety
  var aggK={fatality:0,lti:0,minorInjury:0,medTreatment:0,nearMiss:0};
  ACCa.forEach(function(a){Object.keys(aggK).forEach(function(k){aggK[k]+=(+a[k]||0);});});
  var lastInc=null;ACCa.forEach(function(a){var hasInc=(+a.fatality||0)+(+a.lti||0)+(+a.minorInjury||0)+(+a.medTreatment||0)>0;if(hasInc&&a.date){if(!lastInc||a.date>lastInc)lastInc=a.date;}});
  var daysNoAcc;
  if(lastInc){daysNoAcc=Math.max(0,Math.round((todayObj-new Date(lastInc))/86400000));}
  else{var _st=A.map(function(x){return x.p.mulai;}).filter(Boolean).map(function(d){return new Date(d).getTime();}).filter(function(t){return !isNaN(t);});daysNoAcc=_st.length?Math.max(0,Math.round((todayObj-Math.min.apply(null,_st))/86400000)):'—';}
  var incRows=[['Near Miss',aggK.nearMiss,_OVC.amb],['Minor Injury',aggK.minorInjury,_OVC.grn],['Medical',aggK.medTreatment,_OVC.teal],['LTI',aggK.lti,_OVC.red],['Fatality',aggK.fatality,'#9a3a44']];
  var saf='<div style="display:flex;gap:8px"><div style="flex:0 0 84px;text-align:center"><div class="ov-sub">HARI TANPA KECELAKAAN</div><div style="font-size:30px;font-weight:700;color:'+_OVC.grn+';margin:6px 0 0">'+daysNoAcc+'</div><div style="font-size:9px;color:'+_OVC.mut+'">Hari</div></div><div style="flex:1"><div class="ov-sub">RINGKASAN INSIDEN</div>';
  incRows.forEach(function(x){saf+='<div class="ov-irow"><span style="width:7px;height:7px;border-radius:50%;background:'+x[2]+'"></span><span style="flex:1;font-size:9px;color:'+_OVC.tx+'">'+x[0]+'</span><span style="font-size:10px;font-weight:700;color:'+(x[1]?_OVC.tx:_OVC.mut)+'">'+x[1]+'</span></div>';});
  saf+='</div></div>';
  var sec6=_ovCard('6. SAFETY (HSE)',saf,2,null,'manpower');

  // Sec7 issue & risk
  var _dsK=(typeof _DOC_STATUS_KEYS!=='undefined')?_DOC_STATUS_KEYS:['Submitted','On Review','Approved','Approved with Note','Rejected','WIP'];
  var _dsCfg=(typeof _DOC_STATUS_CFG!=='undefined')?_DOC_STATUS_CFG:{};
  var _dsCnt=_dsK.map(function(s){return {k:s,v:DOCSa.filter(function(d){return d.status===s;}).length,c:(_dsCfg[s]&&_dsCfg[s].c)||_OVC.mut};});
  var _dsTot=DOCSa.length;
  var _dsSegs=_dsCnt.filter(function(x){return x.v>0;}).map(function(x){return {v:x.v,c:x.c};});if(!_dsSegs.length)_dsSegs=[{v:1,c:_OVC.bd}];
  var dsv='<svg viewBox="0 0 110 120" width="100" height="110">'+_ovDonut(_dsSegs,54,58,38,12,String(_dsTot),'Dokumen')+'</svg>';
  var _dsAb={'Submitted':'Submitted','On Review':'On Review','Approved':'Approved','Approved with Note':'Approved w/ Note','Rejected':'Rejected','WIP':'WIP'};
  var dsleg='';_dsCnt.forEach(function(x){var pct=_dsTot?Math.round(x.v/_dsTot*100):0;dsleg+='<div class="ov-irow"><span style="width:8px;height:8px;border-radius:2px;background:'+x.c+'"></span><span style="flex:1;font-size:9px;color:'+_OVC.tx+'">'+(_dsAb[x.k]||x.k)+'</span><span style="font-size:9px;font-weight:700;color:'+_OVC.tx+'">'+x.v+'</span><span style="font-size:8px;color:'+_OVC.mut+';width:32px;text-align:right">'+pct+'%</span></div>';});
  var sec7=_ovCard('7. DOCUMENT STATUS','<div class="ov-g2"><div><div class="ov-sub">BY STATUS</div><div style="display:flex;justify-content:center;align-items:center">'+dsv+'</div></div><div><div class="ov-sub">DETAIL</div>'+dsleg+'</div></div>',3,null,'documents');

  // Sec8 summary table
  var rows='';A.forEach(function(x){var a=x.a,p=x.p,ac=(a.act!=null?+a.act:(+p.actual||0)),vr=(a.variance!=null?+a.variance:0),pl=((a.act!=null&&a.variance!=null)?(ac-vr):(+a.p||+p.plan||0)),spi=+a.spi||0,cpi=+a.cpi||0;
    var logs=MPa.filter(function(m){return String(m.projId)===String(p.id);}).sort(function(u,v){return (u.date<v.date?1:-1);});
    var mhTo=0,mhKe=0;if(logs[0]&&logs[0].date===todayObj.toISOString().slice(0,10))mhTo=+logs[0].mhActual||0;
    var risk=p.status==='Critical'?'High':(spi<0.85?'High':spi<0.95?'Medium':'Low');
    rows+='<tr><td style="text-align:left">'+(p.nama||p.kode||'-')+'</td><td>'+_ovBadge(p.status)+'</td><td><div class="ov-mb"><div style="width:'+Math.min(100,pl)+'%;background:'+_OVC.ind+'"></div></div>'+pl.toFixed(0)+'%</td><td><div class="ov-mb"><div style="width:'+Math.min(100,ac)+'%;background:'+_OVC.grn+'"></div></div>'+ac.toFixed(0)+'%</td><td style="color:'+(vr<0?_OVC.red:_OVC.grn)+';font-weight:700">'+(vr>0?'+':'')+vr+'%</td><td style="color:'+(spi<0.85?_OVC.red:_OVC.grn)+';font-weight:700">'+spi.toFixed(2)+'</td><td style="color:'+(cpi<0.95?_OVC.red:_OVC.grn)+';font-weight:700">'+cpi.toFixed(2)+'</td><td>'+(a.procOverdue||0)+'</td><td>'+(a.issOpen||0)+'</td><td style="color:'+(risk==='High'?_OVC.red:risk==='Medium'?_OVC.amb:_OVC.grn)+';font-weight:700">'+risk+'</td></tr>';});
  var sec8='<div class="ov-card ov-clk" onclick="_ovGoTab(\'projects\')" style="flex:1;min-width:0"><div class="ov-ch">8. PROJECT OVERVIEW SUMMARY</div><div style="overflow-x:auto"><table class="ov-sumt"><thead><tr><th style="text-align:left">PROJECT</th><th>STATUS</th><th>PLAN</th><th>ACTUAL</th><th>VARIANCE</th><th>SPI</th><th>CPI</th><th>OVD MAT</th><th>OPEN ISS</th><th>RISK</th></tr></thead><tbody>'+(rows||'<tr><td colspan="10" style="color:var(--mt)">Belum ada proyek</td></tr>')+'</tbody></table></div></div>';

  // project list (kolom kiri)
  var plist='';A.forEach(function(x){var pl=+x.a.p||0,ac=+x.a.act||0;plist+='<div class="ov-pcard"><div style="display:flex;justify-content:space-between;align-items:flex-start;gap:5px"><div style="font-size:9.5px;font-weight:600;color:'+_OVC.tx+';line-height:1.25">'+(x.p.nama||x.p.kode||'-')+'</div>'+_ovBadge(x.p.status)+'</div><div style="display:flex;align-items:center;gap:3px;font-size:8px;color:'+_OVC.mut+';margin:4px 0 5px">'+_ovIc(_OVI.pin,9,_OVC.mut,2)+' '+(x.p.lokasi||'-')+'</div><div style="display:flex;justify-content:space-between;font-size:8px;border-top:1px solid '+_OVC.bd+';padding-top:5px"><span style="color:'+_OVC.mut+'">Act <b style="color:'+_OVC.tx+'">'+ac.toFixed(0)+'%</b></span><span style="color:'+_OVC.mut+'">Plan <b style="color:'+_OVC.tx+'">'+pl.toFixed(0)+'%</b></span></div></div>';});

  var _ovFirst=!!$d.querySelector('.ov-skel'); // masih skeleton = paint pertama → animasikan entrance sekali
  $d.innerHTML='<style>#ovDash .ov-clk{will-change:transform}#ovDash .ov-kpi{padding:14px 16px;display:flex;flex-direction:column;justify-content:center}#ovDash .ov-kl{font-size:clamp(8px,6cqi,11px)!important;margin-bottom:8px}#ovDash .ov-kv{font-size:clamp(20px,19cqi,34px)!important;margin-bottom:6px}#ovDash .ov-ks{font-size:clamp(8px,5cqi,9.5px)!important;line-height:1.35}@media(max-width:768px){#ovDash .ov-r{flex-direction:column;flex-wrap:nowrap}#ovDash .ov-r>.ov-card{flex:0 0 auto!important;width:100%!important;min-width:0}#ovDash .ov-kstrip>.ov-card{flex:1 1 46%!important;min-width:130px}#ovDash .ov-g2{flex-direction:column}}</style><div class="ov-main"><div class="ov-kstrip">'+kpis+health_c+'</div><div class="ov-r">'+sec1a+sec1b+sec2a+sec2b+'</div><div class="ov-r">'+sec3a+sec3b+sec3c+sec4a+sec4b+'</div><div class="ov-r">'+sec5+sec6+sec7+'</div><div class="ov-r">'+sec8+'</div></div>';
  if(_ovFirst||window._ovAnimating){ try{_ovAnimate($d);}catch(e){} } // animasi entrance; ulang bila render menyela di tengah jalan

  }catch(_e){try{if(typeof console!=='undefined'&&console.error)console.error('renderOV error',_e);}catch(__){}}
  if(window.__apEnd)window.__apEnd();
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
  filtered.sort((a,b)=>{ const sa=(_pa[a.id]&&_pa[a.id].score!=null)?_pa[a.id].score:999, sb=(_pa[b.id]&&_pa[b.id].score!=null)?_pa[b.id].score:999; return sa-sb; });
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
    let _diag=_chip('CPI',_hcpi,_cpiClr,'CPI = efisiensi biaya. >1 = hemat, <1 = boros. Earned Value / biaya barang yang sudah IR (Item Receive) + OPEX. PO yang belum diterima tidak dihitung.')+_chip('Serapan',_hserap,'var(--tx)','Serapan = persentase anggaran RAB yang sudah terpakai (biaya nyata / total RAB).');
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
  if(window.__apBegin)window.__apBegin();
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
  const _costsP=(typeof getAllCosts==='function'?getAllCosts():COSTS).filter(c=>String(c.projId)===_pid&&!c._deleted);
  const _costProc=_costsP.filter(c=>c.type==='procurement').reduce((s,c)=>s+(+c.amount||0),0);
  const _costOpex=_costsP.filter(c=>c.type!=='procurement').reduce((s,c)=>s+(+c.amount||0),0);
  const _costReal=_costProc+_costOpex;
  const _costEarned=_costsP.filter(c=>c._src!=='procurement'||c._hasIR).reduce((s,c)=>s+(+c.amount||0),0);
  const _serapPct=_rabBudget>0?Math.round(_costReal/_rabBudget*1000)/10:0;
  const _ev=_rabBudget*((+p.actual||0)/100);                 // earned value = progres fisik × budget
  const _cpi=_costEarned>0?Math.round(_ev/_costEarned*100)/100:null; // CPI = EV / biaya yang sudah diterima (On Site/Done)
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
        <div class="dmeta"><span class="pill ${sc[p.status]||'p-plan'}">${p.status}</span><span>${p.kode}</span><span style="color:var(--bd)">·</span><span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;display:inline-block"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>${p.lokasi||'\u2014'}</span><span style="color:var(--bd)">·</span>${p.logo?`<img src="${p.logo}" style="height:36px;max-width:120px;object-fit:contain;border-radius:4px;vertical-align:middle" onerror="this.style.display='none'">`:`<span>${p.client||'\u2014'}</span>`}${p.picPm?`<span style="font-size:10px;background:rgba(139,92,246,.12);color:var(--pu);padding:2px 7px;border-radius:10px;border:1px solid rgba(139,92,246,.2)"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;display:inline-block"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> ${p.picPm}</span>`:''}</div>
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
      ${_an?`<span class="dsum-chip"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${_an.health.c}"></span>Kesehatan <b style="color:${_an.health.c}">${_an.health.t} · ${_an.score==null?'\u2014':_an.score}/100</b></span>`:''}
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
function _procKatName(i){
  let kid=i.rabKatId;
  if(!kid&&i.rabItemId){ const ri=RAB.find(r=>String(r.id)===String(i.rabItemId)); if(ri)kid=ri.katId; }
  if(kid){ const rk=RAB.find(r=>r.type==='kat'&&String(r.id)===String(kid)); if(rk&&rk.name)return rk.name; }
  return i.kategori||'';
}
function renderProc(){
  // Isi filter Kategori dari kategori RAB (+ kategori procurement yg ada), pertahankan pilihan
  (function(){
    const sel=$('procFiltKat'); if(sel){
      const cur=sel.value||'';
      const fpv=gv('procFiltProj')||'';
      const names=[]; const seen={};
      RAB.filter(r=>r.type==='kat'&&(!fpv||String(r.projId)===String(fpv))).forEach(k=>{const nm=k.name;if(nm&&!seen[nm.toLowerCase()]){seen[nm.toLowerCase()]=1;names.push(nm);}});
      PROC.filter(pp=>!fpv||String(pp.projId)===String(fpv)).forEach(pp=>{const nm=_procKatName(pp);if(nm&&!seen[nm.toLowerCase()]){seen[nm.toLowerCase()]=1;names.push(nm);}});
      names.sort((a,b)=>a.localeCompare(b));
      sel.innerHTML='<option value="">Semua Kategori</option>'+names.map(nm=>'<option'+(nm===cur?' selected':'')+'>'+safeStr(nm)+'</option>').join('');
      sel.value=cur;
    }
  })();
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
    if(filtKat&&_procKatName(i)!==filtKat)return false;
    if(search&&!i.item?.toLowerCase().includes(search)&&!i.supplier?.toLowerCase().includes(search))return false;
    return true;
  });
  // Kartu KPI: lingkup = proyek terpilih (abaikan filter status/cari) agar pipeline penuh selalu tampil.
  // OVERDUE / DUE TODAY / DUE <=3 dihitung dari TANGGAL DUE (bukan status), konsisten dgn badge di tabel.
  const _fpK=gv('procFiltProj')||'';
  const _baseK=PROC.filter(i=>!_fpK||String(i.projId)===String(_fpK));
  const _todayK=new Date();_todayK.setHours(0,0,0,0);
  const _isDoneK=i=>i.status==='On Site'||i.status==='Done';
  const cnt=s=>_baseK.filter(i=>i.status===s).length;
  let _ovdK=0,_dtodayK=0,_dsoonK=0;
  _baseK.forEach(i=>{
    if(_isDoneK(i)||!i.due)return;
    const d=parseLocalDate(i.due);d.setHours(0,0,0,0);
    const days=Math.round((d-_todayK)/86400000);
    if(days<0)_ovdK++; else if(days===0)_dtodayK++; else if(days<=3)_dsoonK++;
  });
  $('pc1').textContent=_ovdK;$('pc2').textContent=_dtodayK;
  $('pc3').textContent=cnt('In Transit');$('pc4').textContent=cnt('On Site');
  $('pc5').textContent=cnt('Waiting Approval')+cnt('PO Issued');
  if($('pc6'))$('pc6').textContent=_dsoonK;
  const sc={Overdue:'var(--rd)','Due Today':'var(--yw)','In Transit':'var(--bl)','On Site':'var(--gn)','Waiting Approval':'var(--pu)','PO Issued':'#a9b4f5'};
  if(!filtered.length){$('procTable').innerHTML=`<div style="text-align:center;color:var(--mt);font-size:12px;padding:22px">${PROC.length?'Tidak ada item yang cocok dengan filter':'Belum ada item procurement'}</div>`;return;}
  $('procTable').innerHTML=`<table class="tbl"><thead><tr><th>Project</th><th>Item</th><th>Kat.</th><th>Qty</th><th>Supplier</th><th>Due</th><th>Status</th><th>Harga</th><th>RAB Link</th><th>Catatan</th><th>PR/PO/IR</th><th>Dok</th><th></th></tr></thead><tbody>
    ${filtered.map(i=>{
      const pr=P.find(p=>p.id===i.projId);
      const item=safeStr(i.item)||'\u2014';
      const kat=safeStr(_procKatName(i))||'\u2014';
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
      // Selisih aktual on-site vs due date (lacak percepatan/keterlambatan)
      let onsiteLine='';
      if(i.onsiteDate){
        const _od=parseLocalDate(i.onsiteDate);_od.setHours(0,0,0,0);
        const _odStr=String(i.onsiteDate).slice(5);
        if(dueDate){
          const _vd=Math.round((dueDate-_od)/86400000); // + = lebih cepat dari due
          const _c=_vd>0?'var(--gn)':(_vd===0?'var(--mt)':'var(--rd)');
          const _lbl=_vd>0?`${_vd}h lebih cepat`:(_vd===0?'tepat waktu':`${Math.abs(_vd)}h terlambat`);
          onsiteLine=`<div style="font-size:8.5px;color:${_c};margin-top:1px;font-weight:600">\u2713 on-site ${_odStr} \u00b7 ${_lbl}</div>`;
        } else {
          onsiteLine=`<div style="font-size:8.5px;color:var(--gn);margin-top:1px;font-weight:600">\u2713 on-site ${_odStr}</div>`;
        }
      }
      return`<tr style="background:${rowBg}">
      <td style="font-family:var(--fm);font-size:10px;color:var(--mt)">${pr?.kode||'\u2014'}</td>
      <td style="font-weight:500">${item}</td>
      <td style="color:var(--mt)">${kat}</td>
      <td style="font-family:var(--fm)">${qty} ${sat}</td>
      <td style="color:var(--mt)">${sup}</td>
      <td style="font-family:var(--fm);font-size:10px;color:${dueColor};white-space:nowrap">${due}${dueLabel}${onsiteLine}</td>
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
      <td style="text-align:center">${(()=>{const lk=i.link;if(!lk)return '<span style="color:var(--bd)">\u2014</span>';const e=String(lk).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');if(!/^https?:\/\//i.test(lk))return '<span title="'+e+'" style="color:var(--mt);font-size:10px">link</span>';return '<a href="'+e+'" target="_blank" rel="noopener noreferrer" title="Buka dokumen di cloud" onclick="event.stopPropagation()" style="color:var(--bl);cursor:pointer"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;display:inline-block;pointer-events:none"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg></a>';})()}</td>
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
    sv('fLat',p?.lat??'');sv('fLon',p?.lon??'');
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
    sv('mpMhAct','');sv('mpTL','0');sv('mpTLReason','');sv('mpNotes','');sv('mpWorkHours','8');
    // Jika edit (id diberikan), load existing data
    if(id){
      const ex=MPLOGS.find(m=>m.id===id);
      if(ex){
        sv('mpProj',String(ex.projId));sv('mpDate',ex.date||'');
        sv('mpSpv',ex.spv||0);sv('mpMandor',ex.mandor||0);sv('mpInstaller',ex.installer||0);
        sv('mpTukang',ex.tukang||0);sv('mpHelper',ex.helper||0);sv('mpSafety',ex.safety||0);
        calcMpTot();sv('mpMhAct',ex.mhActual||0);sv('mpTL',ex.timeLost||0);
        sv('mpWorkHours',ex.workHours!=null?ex.workHours:8);
        sv('mpTLReason',ex.timeLostReason||'');sv('mpNotes',ex.notes||'');
        $('mpProj').dataset.editId=id;
      }
    } else {
      delete $('mpProj').dataset.editId;
    }
    sv('mpNM','0');sv('mpMin','0');sv('mpMed','0');sv('mpLti','0');sv('mpFat','0');
    // Muat HSE/insiden tersimpan utk project+tanggal ini (jika ada)
    (function(){var _pj=gv('mpProj'),_dt=gv('mpDate');var _a=(typeof ACCLOGS!=='undefined'?ACCLOGS:[]).find(function(x){return String(x.projId)===String(_pj)&&x.date===_dt;});if(_a){sv('mpNM',_a.nearMiss||0);sv('mpMin',_a.minorInjury||0);sv('mpMed',_a.medTreatment||0);sv('mpLti',_a.lti||0);sv('mpFat',_a.fatality||0);}})();
    fillMpPlan();
    renderMpActivityRows();
    recalcMpManhours();
    show('ov-inputMp');
  }
  if(type==='addAccident'){
    $('accProj').innerHTML=P.map(p=>`<option value="${p.id}">${p.kode} \u2014 ${p.nama}</option>`).join('');
    sv('accDate',new Date().toISOString().slice(0,10));
    ['accFat','accLti','accMin','accMed','accProp','accFire','accTraf','accEnv','accNM','accTL'].forEach(k=>sv(k,'0'));
    sv('accNotes','');
    show('ov-addAccident');
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
    sv('pDue',pr?.due||'');sv('pOnsite',pr?.onsiteDate||'');sv('pSup',pr?.supplier||'');sv('pStat',pr?.status||'Waiting Approval');sv('pNotes',pr?.notes||'');
    if($('pHarga'))$('pHarga').value=pr?.harga||'';
    toggleProcCost(pr?.status||'Waiting Approval');
    // Reset kategori visibility dulu
    _hideProcKat(false);
    // Populate RAB dropdowns — akan hide kategori jika ada link RAB
    const pProjId=pr?.projId||(selId||'');
    _populateProcRab(pProjId, pr?.rabKatId||'', pr?.rabItemId||'');
    if(typeof _populateProcKat==='function') _populateProcKat(pProjId, pr?.kategori||'');
    _procLogs = Array.isArray(pr?.logs) ? pr.logs.slice() : [];
    if(typeof _renderProcLogs==='function') _renderProcLogs();
    sv('pLogEvent','PR Submit'); sv('pLogDate', new Date().toISOString().slice(0,10)); sv('pLogNote','');
    sv('pLogBy', (window._meName||'') || (function(){try{return localStorage.getItem('atw_proc_by')||'';}catch(e){return '';}})());
    sv('pLink', pr?.link||'');
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
    notes:gv('fNotes').trim(),
    lat:parseFloat(gv('fLat'))||null,lon:parseFloat(gv('fLon'))||null,
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
    weather:'',notes:'',logo:'',lat:null,lon:null,
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
