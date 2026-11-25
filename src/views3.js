/* ---------- resources ---------- */
let RS='';
function weeks(x0,x1){const o=[];for(let t=x0;t<x1;t+=7*DAY)o.push(t);return o}
function demand(p,cx,res,W,mode,shift={}){// crews per week
  return W.map(w=>sum(p.acts.filter(a=>a.res===res),a=>{let s,e;
    if(mode==='base'){s=td(a.ps);e=td(a.pf)}else{const x=cx.S[a.id];if(x.st==='done')return 0;s=Math.max(x.ES,cx.d0)+(shift[a.id]||0)*DAY;e=x.EF+(shift[a.id]||0)*DAY}
    const ov=Math.min(e,w+7*DAY)-Math.max(s,w);return ov>0?(a.crew||1)*ov/(7*DAY):0}))}
function histo(id,W,bars,line,cap,{alt}={}){chart(id,(Wd,H)=>{const pad={l:40,r:12,t:14,b:26};const mx=Math.max(cap*1.2,...bars,...(line||[]),...(alt||[]),1);
  const bw=(Wd-pad.l-pad.r)/W.length,Y=v=>H-pad.b-v/mx*(H-pad.t-pad.b);let o='<g style="color:var(--ink)">';
  for(let i=0;i<=4;i++){const v=mx*i/4;o+=`<line x1="${pad.l}" x2="${Wd-pad.r}" y1="${Y(v)}" y2="${Y(v)}" stroke="currentColor" opacity=".1"/><text x="${pad.l-5}" y="${Y(v)+4}" font-size="11" text-anchor="end" fill="currentColor" opacity=".6">${v.toFixed(v<10?1:0)}</text>`}
  o+=axisTime(W[0],W[W.length-1]+7*DAY,Wd,H,pad);
  bars.forEach((v,i)=>{if(v>0)o+=`<rect x="${pad.l+i*bw+.5}" y="${Y(v)}" width="${Math.max(1,bw-1)}" height="${H-pad.b-Y(v)}" fill="${v>cap?'var(--fc)':'var(--act)'}" opacity=".85"/>`});
  if(alt)o+=`<polyline fill="none" stroke="var(--e)" stroke-width="2" points="${alt.map((v,i)=>`${pad.l+(i+.5)*bw},${Y(v)}`).join(' ')}"/>`;
  if(line)o+=`<polyline fill="none" stroke="var(--plan)" stroke-width="1.5" stroke-dasharray="5 4" points="${line.map((v,i)=>`${pad.l+(i+.5)*bw},${Y(v)}`).join(' ')}"/>`;
  o+=`<line x1="${pad.l}" x2="${Wd-pad.r}" y1="${Y(cap)}" y2="${Y(cap)}" stroke="var(--ink)" stroke-width="2"/><text x="${Wd-pad.r-4}" y="${Y(cap)-5}" font-size="11" text-anchor="end" fill="var(--ink)">Capacity ${cap}</text>`;
  return o+'</g>'})}
function resList(p){return [...new Set(p.acts.map(a=>a.res).filter(Boolean))]}
V.resources=()=>{const p=P(),cx=C(),R=resList(p);if(!RS||!R.includes(RS))RS=R[0]||'';p.resCap=p.resCap||{};
  const W=weeks(cx.d0-7*DAY*0,Math.max(cx.pEF,cx.d0+8*7*DAY)+7*DAY);
  const rows=R.map(r=>{const d=demand(p,cx,r,W,'fc'),cap=p.resCap[r]??10,pk=Math.max(0,...d),i=d.indexOf(pk);return {r,cap,pk,wk:W[i],ov:d.filter(v=>v>cap).length,n:p.acts.filter(a=>a.res===r).length}});
  return hdr('Resource planning')+`
  <div class="tools"><label>Resource <select id="rsS">${R.map(r=>`<option ${r===RS?'selected':''}>${esc(r)}</option>`).join('')}</select></label></div>
  <h2>${esc(RS)}: weekly demand from the data date (crews)</h2><div class="fig" id="rH"></div>
  ${legend([['var(--act)','Forecast demand within capacity'],['var(--fc)','Over capacity'],['var(--plan)','Baseline demand',1]])}
  <h2>Resource summary</h2><div class="scroll"><table><thead><tr><th>Resource</th><th class="n">Activities</th><th class="n">Capacity (crews/day)</th><th class="n">Peak forecast demand</th><th>Peak week</th><th class="n">Weeks over capacity</th></tr></thead><tbody>
  ${rows.map(x=>`<tr><td>${esc(x.r)}</td><td class="n">${x.n}</td><td class="n"><input class="q" type="number" min="0" step="any" data-cap="${esc(x.r)}" value="${x.cap}" ${can('edit')?'':'disabled'}></td><td class="n ${x.pk>x.cap?'neg':''}">${nf(x.pk,1)}</td><td class="d">${fT(x.wk)}</td><td class="n ${x.ov?'neg':''}">${x.ov}</td></tr>`).join('')}</tbody></table></div>
  <p class="note">Demand = crews assigned to each activity spread over its forecast dates (remaining work only). Set each activity's resource and crews in Schedule. For levelling proposals, see Crashing, fast-tracking &amp; smoothing.</p>`};
V.resources.after=()=>{$('#rsS')&&($('#rsS').onchange=e=>{RS=e.target.value;route()});
  $$('[data-cap]').forEach(i=>i.onchange=()=>{P().resCap[i.dataset.cap]=+i.value||0;save();route()});
  const p=P(),cx=C();if(!RS)return;const W=weeks(cx.d0,Math.max(cx.pEF,cx.d0+8*7*DAY)+7*DAY);histo('rH',W,demand(p,cx,RS,W,'fc'),demand(p,cx,RS,W,'base'),p.resCap[RS]??10)};

/* ---------- optimise ---------- */
let OPT={crash:30,prem:25};
function contrib(a,cx,W,sh){const x=cx.S[a.id];const s=Math.max(x.ES,cx.d0)+sh*DAY,e=x.EF+sh*DAY,out=[];for(let i=Math.max(0,Math.floor((s-W[0])/(7*DAY)));i<W.length&&W[i]<e;i++){const ov=Math.min(e,W[i]+7*DAY)-Math.max(s,W[i]);if(ov>0)out.push([i,(a.crew||1)*ov/(7*DAY)])}return out}
function level(p,cx,res){cx.lv=cx.lv||{};if(cx.lv[res])return cx.lv[res];
  const W=weeks(cx.d0,Math.max(cx.pEF,cx.d0+8*7*DAY)+7*DAY),cap=p.resCap[res]??10,shift={};
  const score=d=>sum(d,v=>v>cap?(v-cap)**2:0);const base=demand(p,cx,res,W,'fc'),d=base.slice();
  const cand=p.acts.filter(a=>a.res===res&&cx.S[a.id].st==='ns'&&cx.S[a.id].TF>=7).sort((a,b)=>cx.S[b.id].TF-cx.S[a.id].TF);
  let cur=score(d);
  if(cur>0)for(const a of cand){const c0=contrib(a,cx,W,0);c0.forEach(([i,v])=>d[i]-=v);let best=0,bs=Infinity;
    for(let s=0;s<=cx.S[a.id].TF;s+=7){const c=contrib(a,cx,W,s);c.forEach(([i,v])=>d[i]+=v);const sc=score(d);c.forEach(([i,v])=>d[i]-=v);if(sc<bs-1e-9){bs=sc;best=s}}
    contrib(a,cx,W,best).forEach(([i,v])=>d[i]+=v);if(best)shift[a.id]=best;cur=bs}
  return cx.lv[res]={W,cap,base,after:d,shift,before:score(base),afterS:cur}}
V.optimise=()=>{const p=P(),cx=C();const gap=Math.round((cx.pEF-cx.target)/DAY);
  const open=p.acts.filter(a=>cx.S[a.id].st!=='done');const neg=open.filter(a=>cx.S[a.id].TF<0);
  const crash=neg.map(a=>{const x=cx.S[a.id],rem=Math.max(1,Math.round((x.EF-Math.max(x.ES,cx.d0))/DAY)),mx=Math.floor(rem*OPT.crash/100),need=-x.TF,cd=Math.min(mx,need);
    const slope=mx?(a.cost*(1-(a.pct||0))*OPT.prem/100)/mx:Infinity;return {a,x,rem,cd,need,res:need-cd,slope,extra:cd*slope,crew:(a.crew||1)*(rem/(rem-cd||1))-(a.crew||1)}}).filter(c=>c.cd>0).sort((u,v)=>u.x.TF-v.x.TF||u.slope-v.slope);
  const ft=[];for(const a of open){const x=cx.S[a.id];if(x.st!=='ns'||x.TF>=0)continue;
    for(const [pid,ty,lag] of a.preds||[]){const pr=cx.by[pid],y=cx.S[pid];if(!pr||!y||y.st==='done'||ty!=='FS')continue;if(Math.abs(x.ES-(y.EF+lag*DAY))>DAY)continue;
      const prem=Math.round((y.EF-Math.max(y.ES,cx.d0))/DAY),ov=Math.min(-x.TF,Math.round(prem*.3));if(ov<=0)continue;
      ft.push({a,pr,ov,risk:pr.d==='E'&&a.d==='P'?'Medium: order/manufacture on "approved with comments" drawings':pr.d==='P'&&a.d==='C'?'High: start installation with part deliveries':'Medium: overlap sequential work'})}}
  for(const a of neg.filter(a=>a.d==='C')){const x=cx.S[a.id],rem=Math.round((x.EF-Math.max(x.ES,cx.d0))/DAY);if(rem>=30&&a.qty>1)ft.push({a,pr:null,ov:Math.min(-x.TF,Math.round(rem*.4)),risk:'Low–medium: open a second work front (needs a second crew and front availability)'})}
  ft.sort((u,v)=>v.ov-u.ov);
  const drv=[];{let a=open.slice().sort((u,v)=>cx.S[v.id].EF-cx.S[u.id].EF)[0];const seen=new Set();
    while(a&&!seen.has(a.id)){seen.add(a.id);drv.unshift(a);const x=cx.S[a.id];if(x.st!=='ns')break;let nx=null;
      for(const [pid,ty,lag] of a.preds||[]){const y=cx.S[pid];if(!y)continue;const req=ty==='SS'?y.ES+lag*DAY:ty==='FF'?y.EF+lag*DAY-(x.EF-x.ES):y.EF+lag*DAY;if(Math.abs(req-x.ES)<=DAY)nx=cx.by[pid]}a=nx}}
  const R=resList(p),L=R.map(r=>({r,...level(p,cx,r)})).filter(l=>l.before>0);
  return hdr('Crashing, fast-tracking & resource smoothing')+`
  <div class="kpis">${kpi(fT(cx.target),'Target (planned completion)')}${fcFinishKPI(cx)}${kpi(neg.length,'Open activities with negative float',neg.length?'bad':'good')}${kpi(L.length,'Resources over capacity',L.length?'bad':'good')}</div>
  ${gap>0?`<div class="callout">The forecast finishes <b>${gap} days</b> after the target. The driving path below sets the forecast finish: act on it first. Crashing adds resources to shorten activities; fast-tracking overlaps activities that were planned in sequence (adds risk, little cost); smoothing moves activities within their float to flatten resource peaks without delaying the finish.</div>`:`<div class="callout ok">The forecast meets the target. Use smoothing below to flatten resource peaks.</div>`}
  <h2>Driving path to the forecast finish</h2><div class="scroll"><table><thead><tr><th>ID</th><th>Discipline</th><th>Activity</th><th>Status</th><th>Start</th><th>Finish</th><th class="n">Float (d)</th><th>Suggested action</th></tr></thead><tbody>
  ${drv.map(a=>{const x=cx.S[a.id];const act=a.d==='P'?(a.pct<.2?'Finalise vendor and release PO now; consider a repeat order on an existing vendor':'Expedite: weekly vendor follow-up, split delivery, air/road express for site-critical lots'):a.d==='E'?'Fast-track approval: joint review meeting with consultant, approve with comments':'Add crews / second work front; plan material in advance';
   return `<tr><td>${a.id}</td><td>${DN[a.d]}</td><td>${esc(a.name.slice(0,70))}</td><td>${statusOf(a,cx)} ${pc(a.pct,0)}</td><td class="d">${fT(x.ES)}</td><td class="d">${fT(x.EF)}</td><td class="n ${x.TF<0?'neg':''}">${x.TF??''}</td><td>${esc(act)}</td></tr>`}).join('')}</tbody></table></div>
  <h2>1. Crashing (add crews / overtime)</h2>
  <div class="tools"><label>Max. crash % of remaining duration <input class="q" type="number" id="oc" value="${OPT.crash}"></label><label>Cost premium % for the max. crash <input class="q" type="number" id="op" value="${OPT.prem}"></label></div>
  ${crash.length?`<div class="scroll" style="max-height:55vh"><table><thead><tr><th>ID</th><th>Activity</th><th class="n">Remaining (d)</th><th class="n">Float (d)</th><th class="n">Crash (d)</th><th class="n">Float after</th><th class="n">Extra crews</th><th class="n">Cost / day</th><th class="n">Extra cost</th></tr></thead><tbody>
  ${crash.slice(0,60).map(c=>`<tr><td>${c.a.id}</td><td>${esc(c.a.name.slice(0,70))}</td><td class="n">${c.rem}</td><td class="n neg">${c.x.TF}</td><td class="n">${c.cd}</td><td class="n ${c.res>0?'neg':'pos'}">${-c.res}</td><td class="n">+${nf(c.crew,1)} ${esc(c.a.res||'')}</td><td class="n">${nf(c.slope,3)}</td><td class="n">${nf(c.extra,2)}</td></tr>`).join('')}
  <tr class="l0"><td colspan="8">Total extra cost (${p.currency}), ${crash.length} activities</td><td class="n">${nf(sum(crash,c=>c.extra))}</td></tr></tbody></table></div>`:'<p class="note">No activity needs crashing.</p>'}
  <h2>2. Fast-tracking (overlap / parallel work fronts)</h2>
  ${ft.length?`<div class="scroll" style="max-height:55vh"><table><thead><tr><th>Activity</th><th>Overlap with</th><th class="n">Days saved</th><th>Change</th><th>Risk</th></tr></thead><tbody>
  ${ft.slice(0,60).map(f=>`<tr><td>${f.a.id} ${esc(f.a.name.slice(0,55))}</td><td>${f.pr?f.pr.id+' '+esc(f.pr.name.slice(0,40)):'—'}</td><td class="n">${f.ov}</td><td>${f.pr?`FS lag → ${-f.ov} d`:'Split into 2 fronts'}</td><td>${esc(f.risk)}</td></tr>`).join('')}</tbody></table></div>`:'<p class="note">No fast-tracking opportunity on the negative-float path.</p>'}
  <h2>3. Resource smoothing (within float)</h2>
  ${L.length?L.map((l,i)=>`<div class="card"><h3>${esc(l.r)}: capacity ${l.cap}, peak ${nf(Math.max(...l.base),1)} → ${nf(Math.max(...l.after),1)} crews</h3><div class="fig short" id="lv${i}"></div>${legend([['var(--act)','After smoothing'],['var(--e)','Before']])}
   ${Object.keys(l.shift).length?`<table><thead><tr><th>Activity</th><th class="n">Float (d)</th><th class="n">Delay start by (d)</th><th>New start</th></tr></thead><tbody>${Object.entries(l.shift).map(([id,s])=>`<tr><td>${id} ${esc(cx.by[id].name.slice(0,60))}</td><td class="n">${cx.S[id].TF}</td><td class="n">${s}</td><td class="d">${fT(Math.max(cx.S[id].ES,cx.d0)+s*DAY)}</td></tr>`).join('')}</tbody></table>
   ${Math.max(...l.after)>l.cap?`<p class="note">Still above capacity after using all float: add ${nf(Math.max(...l.after)-l.cap,1)} crews at the peak, or accept a later finish (resource levelling).</p>`:''}`:`<p class="note">No float available to shift: add ${nf(Math.max(...l.base)-l.cap,1)} crews at the peak or re-sequence.</p>`}</div>`).join(''):'<div class="callout ok">All resources are within capacity.</div>'}`};
V.optimise.after=()=>{$('#oc').onchange=e=>{OPT.crash=clamp(+e.target.value||0,0,90);route()};$('#op').onchange=e=>{OPT.prem=Math.max(0,+e.target.value||0);route()};
  const p=P(),cx=C();resList(p).map(r=>({r,...level(p,cx,r)})).filter(l=>l.before>0).forEach((l,i)=>histo('lv'+i,l.W,l.after,null,l.cap,{alt:l.base}))};

/* ---------- delay analysis ---------- */
let DLY={d:'',min:1};
V.delay=()=>{const p=P(),cx=C();
  const rows=p.acts.filter(a=>!DLY.d||a.d===DLY.d).map(a=>{const x=cx.S[a.id];const sA=a.as?td(a.as):x.ES,fA=a.af?td(a.af):x.EF;const sv=Math.round((sA-td(a.ps))/DAY),fv=Math.round((fA-td(a.pf))/DAY);
    const cov=fv>0?Math.min(fv,Math.max(0,Math.round((Math.min(COVID[1],fA)-Math.max(COVID[0],td(a.ps)))/DAY))):0;return {a,x,sA,fA,sv,fv,cov}});
  const del=rows.filter(r=>r.fv>=DLY.min).sort((u,v)=>v.fv-u.fv);
  const byC={};del.forEach(r=>{const k=DN[r.a.d]+' · '+r.a.l2;const o=byC[k]=byC[k]||{n:0,s:0,m:0,cov:0};o.n++;o.s+=r.fv;o.m=Math.max(o.m,r.fv);o.cov+=r.cov});
  const byR={};del.forEach(r=>{const k=r.a.reason||'Not assigned';byR[k]=(byR[k]||0)+1});const rmax=Math.max(1,...Object.values(byR));
  const slip=(p.snaps||[]).map(s=>{const t=td(s.date),v=snapVal(p,s,'O');return [t,Math.max(0,(t-earnedSchedule(p,'O',cx,v,t))/DAY)]});slip.push([cx.d0,Math.max(0,(cx.d0-earnedSchedule(p,'O',cx,cx.ov.act,cx.d0))/DAY)]);
  const ed=can('edit');
  return hdr('Delay analysis')+`
  <div class="kpis">${fcFinishKPI(cx)}${kpi(Math.round((cx.pEF-td(p.cdd))/DAY)+' d','Forecast delay vs contractual completion',cx.pEF>td(p.cdd)?'bad':'good')}
  ${kpi(Math.round(slip[slip.length-1][1])+' d','Schedule slip (earned schedule)','bad')}${kpi(del.length,'Activities finishing late','bad')}${kpi(sum(del,r=>r.cov)+' d','Activity-days of delay inside the COVID-19 lockdown')}</div>
  <h2>Schedule slip over time (days behind plan, overall)</h2><div class="fig short" id="dS"></div>${legend([['var(--fc)','Slip: data date minus the plan date at which actual progress was due'],['#ff5c8a22','COVID-19 lockdown, 25 Mar–31 May 2020']])}
  <div class="grid2"><div><h2>Delay by discipline and L2</h2><table><thead><tr><th>WBS</th><th class="n">Late</th><th class="n">Avg. delay (d)</th><th class="n">Max (d)</th><th class="n">COVID overlap (d)</th></tr></thead><tbody>
   ${Object.entries(byC).sort((a,b)=>b[1].s-a[1].s).map(([k,o])=>`<tr><td>${esc(k)}</td><td class="n">${o.n}</td><td class="n">${Math.round(o.s/o.n)}</td><td class="n">${o.m}</td><td class="n">${o.cov}</td></tr>`).join('')}</tbody></table></div>
  <div><h2>Delay by reason / responsibility</h2>${Object.entries(byR).sort((a,b)=>b[1]-a[1]).map(([k,n])=>`<div style="display:grid;grid-template-columns:minmax(0,1fr) 46px;gap:8px;margin:6px 0"><div><div style="font-size:13px">${esc(k)}</div><div class="bar"><i style="width:${n/rmax*100}%;background:${k==='Not assigned'?'var(--mute)':'var(--fc)'}"></i></div></div><b class="n" style="text-align:right">${n}</b></div>`).join('')}
   <p class="note">Assign reasons in the table below or in Progress update. Reasons decide excusable vs non-excusable delay for extension-of-time claims.</p></div></div>
  <h2>Activity delay register</h2><div class="tools"><select id="dD"><option value="">All disciplines</option>${'EPC'.split('').map(d=>`<option value="${d}" ${DLY.d===d?'selected':''}>${DN[d]}</option>`).join('')}</select><label>Min. finish delay (d) <input class="q" type="number" id="dM" value="${DLY.min}"></label></div>
  <div class="scroll" style="max-height:65vh"><table><thead><tr><th>ID</th><th>Activity</th><th>BL start</th><th>Act/Fc start</th><th class="n">Start var</th><th>BL finish</th><th>Act/Fc finish</th><th class="n">Finish var</th><th class="n">Float</th><th class="n">COVID (d)</th><th>Reason</th></tr></thead><tbody>
  ${del.slice(0,400).map(r=>`<tr><td>${r.a.id}</td><td>${esc(r.a.name.slice(0,60))}</td><td class="d">${fD(r.a.ps)}</td><td class="d">${fT(r.sA)}${r.a.as?'':' *'}</td><td class="n">${sg(-r.sv,0)}</td><td class="d">${fD(r.a.pf)}</td><td class="d">${fT(r.fA)}${r.a.af?'':' *'}</td><td class="n neg">${r.fv}</td><td class="n">${r.x.TF??''}</td><td class="n">${r.cov||''}</td>
   <td><select data-rs="${r.a.id}" ${ed?'':'disabled'}>${REASONS.map(z=>`<option ${r.a.reason===z?'selected':''}>${esc(z)}</option>`).join('')}</select></td></tr>`).join('')}</tbody></table></div><p class="note">* forecast date. Variances in calendar days; negative start variance = started late.</p>`};
V.delay.after=()=>{$('#dD').onchange=e=>{DLY.d=e.target.value;route()};$('#dM').onchange=e=>{DLY.min=+e.target.value||0;route()};
  $$('[data-rs]').forEach(s=>s.onchange=()=>{P().acts.find(a=>a.id===s.dataset.rs).reason=s.value;save();toast('Reason saved')});
  const p=P(),cx=C();const slip=(p.snaps||[]).map(s=>{const t=td(s.date),v=snapVal(p,s,'O');return [t,Math.max(0,(t-earnedSchedule(p,'O',cx,v,t))/DAY)]});slip.push([cx.d0,Math.max(0,(cx.d0-earnedSchedule(p,'O',cx,cx.ov.act,cx.d0))/DAY)]);
  lineChart('dS',{x0:td(p.start),x1:cx.d0+30*DAY,ymax:Math.max(30,...slip.map(x=>x[1]))*1.1,yfmt:v=>Math.round(v)+' d',series:[{pts:slip,color:'var(--fc)',w:3,dots:1,end:Math.round(slip[slip.length-1][1])+' d'}],band:COVID})};
