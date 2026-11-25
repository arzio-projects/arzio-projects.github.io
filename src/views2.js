/* ---------- schedule / gantt ---------- */
let SCH={L:3,d:'',q:'',crit:false};
function gantt(rows,x0,x1,cx,{click=false}={}){
  const X=t=>clamp((t-x0)/(x1-x0))*100;let ticks='';const d=new Date(x0);let t=Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),1);const yrs=(x1-x0)/DAY/365,step=yrs>2.5?6:yrs>1?3:1;
  while(t<=x1){const m=new Date(t);if(m.getUTCMonth()%step===0&&t>=x0)ticks+=`<div class="tick" style="left:${X(t)}%">${fM(t)}</div>`;t=Date.UTC(m.getUTCFullYear(),m.getUTCMonth()+1,1)}
  const L=rows.map(r=>{const tf=r.TF;return `<div class="gr gl ${click&&r.L===4?'click':''}" ${r.L===4&&r.a?`data-edit="${esc(r.a.id)}"`:''} style="padding-left:${6+r.L*14}px;font-weight:${r.L<3?700:r.L===3?600:400}" title="${esc(r.name)}">
    <span style="flex:1;overflow:hidden;text-overflow:ellipsis"><span style="color:var(--mute);font-size:11px">L${r.L} ${esc(r.L===4&&r.a?r.a.id:(r.wbs.split('.').slice(1).join('.')||'0'))}</span> ${esc(r.name)}</span>
    <span style="width:46px;text-align:right;font-variant-numeric:tabular-nums">${pc(r.pct,0)}</span><span style="width:40px;text-align:right" class="${tf<0?'neg':''}">${tf==null?'':tf}</span></div>`});
  const R=rows.map(r=>{const crit=r.TF!=null&&r.TF<=0&&r.pct<1;const tip=`${r.name}\nBaseline ${fD(r.ps)} → ${fD(r.pf)}\nForecast/actual ${fT(r.ES)} → ${fT(r.EF)}\n${pc(r.pct)} complete${r.TF!=null?'\nTotal float '+r.TF+' d':''}`;
    return r.a?.ms&&r.L===4?`<div class="gc" title="${esc(tip)}"><div style="position:absolute;top:7px;left:calc(${X(r.ES)}% - 7px);width:13px;height:13px;transform:rotate(45deg);background:${r.pct>=1?'var(--act)':'var(--ink)'}"></div></div>`:`<div class="gc" title="${esc(tip)}"><div class="gb" style="left:${X(td(r.ps))}%;width:${Math.max(.2,X(td(r.pf))-X(td(r.ps)))}%"></div><div class="gf ${crit?'cr':''}" style="left:${X(r.ES)}%;width:${Math.max(.25,X(r.EF)-X(r.ES))}%;${r.L<4?'background:var(--plan)':''}"><i style="width:${clamp(r.pct)*100}%"></i></div></div>`});
  let o='';for(let i=0;i<rows.length;i++)o+=L[i]+R[i];
  return `<div class="gantt"><div class="gt"><div class="gh gl"><span style="flex:1">WBS / activity</span><span style="width:46px;text-align:right">%</span><span style="width:40px;text-align:right">TF</span></div><div class="gh" style="position:sticky">${ticks}<div class="gm" style="left:${X(cx.d0)}%"></div></div>${o}</div></div>`}
V.schedule=()=>{const p=P(),cx=C();
  const filt=a=>(!SCH.d||a.d===SCH.d)&&(!SCH.q||(a.id+' '+a.name+' '+a.l2+' '+a.l3).toLowerCase().includes(SCH.q.toLowerCase()))&&(!SCH.crit||(cx.S[a.id].TF!=null&&cx.S[a.id].TF<=0));
  let rows=p.acts.length?tree(p,cx,SCH.L,filt):[];const cap=2500,more=rows.length>cap;rows=rows.slice(0,cap);
  const x0=td(p.start)-15*DAY,x1=Math.max(td(p.finish),cx.pEF)+30*DAY;
  return hdr('Schedule: WBS levels L0 to L5')+`
  <div class="tools"><label>Show to level <select id="sL">${[0,1,2,3,4,5].map(l=>`<option value="${l}" ${SCH.L===l?'selected':''}>L${l} ${['Project','Phase (E/P/C)','System / category','Work package','Activity','Step / milestone'][l]}</option>`).join('')}</select></label>
   <select id="sD"><option value="">E + P + C</option>${'EPC'.split('').map(d=>`<option value="${d}" ${SCH.d===d?'selected':''}>${DN[d]}</option>`).join('')}</select>
   <input id="sQ" placeholder="Search" value="${esc(SCH.q)}"><label><input type="checkbox" id="sC" ${SCH.crit?'checked':''}> Critical / negative float only</label>
   ${can('edit')?'<button class="go" id="sAdd">Add activity</button>':''}<a class="btn" href="#export">Export to MS Project</a></div>
  ${cx.cyc?`<div class="callout">${cx.cyc} activities are in a logic loop; their links were ignored.</div>`:''}
  ${legend([['var(--plan)','Baseline (thin)'],['var(--e)','Forecast / actual'],['var(--fc)','Critical (float ≤ 0)'],['var(--act)','Progress']])}
  ${rows.length?gantt(rows,x0,x1,cx,{click:can('edit')}):'<div class="callout ok">No activities yet. Add one, or import a CSV under Export.</div>'}
  ${more?`<p class="note">Showing the first ${cap} rows: filter to see more.</p>`:''}
  <p class="note">L0 project · L1 phase (E, P, C) · L2 system/category · L3 work package · L4 activity · L5 steps (procurement milestones, drawing submission/approval, construction readiness/installation/testing). Scheduling uses calendar days, finish-to-start / start-to-start / finish-to-finish links with lags, and the data date. Float is measured against the planned completion date. ${can('edit')?'Click an L4 activity to edit it.':''}</p>`};
V.schedule.after=()=>{$('#sL').onchange=e=>{SCH.L=+e.target.value;route()};$('#sD').onchange=e=>{SCH.d=e.target.value;route()};$('#sQ').onchange=e=>{SCH.q=e.target.value;route()};$('#sC').onchange=e=>{SCH.crit=e.target.checked;route()};
  $('#sAdd')&&($('#sAdd').onclick=()=>editAct(null));if(can('edit'))$$('[data-edit]').forEach(el=>el.onclick=()=>editAct(el.dataset.edit))};
function editAct(id){const p=P();const a=id?p.acts.find(x=>x.id===id):{id:'',d:SCH.d||'C',l2:'',l3:'',name:'',ps:p.dataDate,pf:addD(p.dataDate,30),pct:0,cost:0,qty:1,uom:'Nos',ac:0,prof:'Linear',res:'Electrician gang',crew:1,preds:[]};
  const f=(k,l,t='text',v=a[k])=>`<label class="f">${l}<input id="ea_${k}" type="${t}" value="${esc(v??'')}" ${t==='number'?'step="any"':''}></label>`;
  dialog(id?'Edit activity '+id:'Add activity',`<div class="form">
   ${f('id','Activity ID')}<label class="f">Discipline<select id="ea_d">${'EPC'.split('').map(d=>`<option value="${d}" ${a.d===d?'selected':''}>${DN[d]}</option>`).join('')}</select></label>
   ${f('l2','L2 system / category')}${f('l3','L3 work package')}</div><div class="form">${f('name','Activity name (L4)')}</div><div class="form">
   ${f('ps','Baseline start','date')}${f('pf','Baseline finish','date')}${f('fs','Forecast start','date')}${f('ff','Forecast finish','date')}${f('as','Actual start','date')}${f('af','Actual finish','date')}
   ${f('pct','% complete (0–100)','number',r2((a.pct||0)*100))}${f('qty','Scope quantity','number')}${f('uom','Unit')}${f('cost','Budget cost ('+p.currency+')','number')}${f('ac','Actual cost to date','number')}
   <label class="f">Progress profile<select id="ea_prof">${Object.keys(PROF).map(k=>`<option ${a.prof===k?'selected':''}>${k}</option>`).join('')}</select></label>
   ${f('res','Resource')}${f('crew','Crews / units per day','number')}${f('ch0','Chainage from (m)','number',a.ch?.[0])}${f('ch1','Chainage to (m)','number',a.ch?.[1])}</div>
   <label class="f">Predecessors (e.g. P012 FS 0; E004 SS 10)<input id="ea_preds" value="${esc((a.preds||[]).map(x=>x.join(' ')).join('; '))}"></label>`,
   [...(id?[['Delete',()=>{p.acts=p.acts.filter(x=>x!==a);p.acts.forEach(x=>x.preds=(x.preds||[]).filter(q=>q[0]!==id));save();$('#dlg').close();route()}]]:[]),
    ['Save',()=>{const g=k=>$('#ea_'+k).value;const nid=g('id').trim()||(g('d')+String(p.acts.length+1).padStart(3,'0'));
      if(nid!==id&&p.acts.some(x=>x.id===nid))return toast('That ID is already used');
      if(!g('ps')||!g('pf')||td(g('pf'))<td(g('ps')))return toast('Baseline finish must be on or after start');
      const o=id?a:{};Object.assign(o,{id:nid,d:g('d'),l2:g('l2')||'General',l3:g('l3')||'General',name:g('name')||nid,ps:g('ps'),pf:g('pf'),fs:g('fs')||null,ff:g('ff')||null,as:g('as')||null,af:g('af')||null,
        pct:clamp((+g('pct')||0)/100),qty:+g('qty')||1,uom:g('uom'),cost:+g('cost')||0,ac:+g('ac')||0,prof:g('prof'),res:g('res'),crew:+g('crew')||1,
        ch:g('ch0')!==''&&g('ch1')!==''?[+g('ch0'),+g('ch1')]:o.ch,preds:g('preds').split(/[;\n]/).map(s=>s.trim().split(/\s+/)).filter(x=>x[0]).map(([i,t,l])=>[i,(t||'FS').toUpperCase(),+l||0])});
      if(o.pct>=1&&!o.af)o.af=p.dataDate;if(o.pct>0&&!o.as)o.as=p.dataDate;
      if(id&&nid!==id)p.acts.forEach(x=>(x.preds||[]).forEach(q=>{if(q[0]===id)q[0]=nid}));
      if(!id)p.acts.push(o);save();$('#dlg').close();route();toast('Activity saved')},'go']])}

/* ---------- engineering ---------- */
V.engineering=()=>{const p=P(),cx=C(),A=p.acts.filter(a=>a.d==='E'),x=cx.disc.E;
  const cats=[...new Set(A.map(a=>a.l3))];const st=a=>a.status||(a.pct>=1?'Approved':a.pct>0?'First Submission':'Not Started');const ESTS=[...new Set([...ENG_ST.filter(s=>A.some(a=>st(a)===s)),...A.map(st)])];
  const over=A.filter(a=>a.pct<1&&td(a.pf)<cx.d0).map(a=>({a,dl:dd(p.dataDate,a.pf)})).sort((u,v)=>v.dl-u.dl);
  const subDue=A.filter(a=>a.steps&&a.steps[0][1]&&td(a.steps[0][1])<=cx.d0).length,subDone=A.filter(a=>a.steps&&a.steps[0][2]).length;
  return hdr('Engineering status')+`
  <div class="kpis">${kpi(A.length,'Drawings / documents')}${kpi(A.filter(a=>a.pct>=1).length,'Approved','good')}${kpi(A.filter(a=>a.pct>0&&a.pct<1).length,'Under review')}${kpi(A.filter(a=>!a.pct).length,'Not started')}
  ${kpi(pc(x.plan)+' / '+pc(x.act),'Planned / actual progress',x.act<x.plan?'bad':'good')}${kpi(over.length,'Approvals overdue',over.length?'bad':'good')}</div>
  <div class="grid2"><div><h2>Status of engineering by document category</h2><div class="scroll"><table><thead><tr><th>Category</th>${ESTS.map(s=>`<th class="n">${s}</th>`).join('')}<th class="n">Total</th></tr></thead><tbody>
   ${cats.map(c=>{const B=A.filter(a=>a.l3===c);return `<tr><td>${esc(c)}</td>${ESTS.map(s=>`<td class="n">${B.filter(a=>st(a)===s).length||''}</td>`).join('')}<td class="n"><b>${B.length}</b></td></tr>`}).join('')}
   <tr class="l0"><td>Total</td>${ESTS.map(s=>`<td class="n">${A.filter(a=>st(a)===s).length}</td>`).join('')}<td class="n">${A.length}</td></tr></tbody></table></div>
   <h3>Performance indices</h3><table><tbody>
   <tr><td>First submissions due by data date / made</td><td class="n">${subDue} / ${subDone}</td></tr>
   <tr><td>Approval ratio (approved ÷ submitted)</td><td class="n">${pc(A.filter(a=>a.pct>=1).length/(subDone||1),0)}</td></tr>
   <tr><td>First-pass yield (approved at revision ≤ 1)</td><td class="n">${pc(A.filter(a=>a.pct>=1&&(a.rev??0)<=1).length/(A.filter(a=>a.pct>=1).length||1),0)}</td></tr>
   <tr><td>Average revisions per approved drawing</td><td class="n">${nf(sum(A.filter(a=>a.pct>=1),a=>a.rev||0)/(A.filter(a=>a.pct>=1).length||1),1)}</td></tr></tbody></table></div>
  <div><h2>Engineering S-curve</h2><div class="fig" id="eS"></div>${legend([['var(--plan)','Planned',1],['var(--act)','Actual'],['var(--fc)','Forecast',1]])}</div></div>
  <h2>Overdue drawings (planned approval before the data date)</h2>${over.length?`<div class="scroll"><table><thead><tr><th>ID</th><th>Drawing</th><th>Doc no.</th><th>Status</th><th>Planned 1st sub.</th><th>Actual 1st sub.</th><th>Planned approval</th><th>Forecast</th><th class="n">Days late</th><th>Reason</th></tr></thead><tbody>
  ${over.map(({a,dl})=>`<tr><td>${a.id}</td><td>${esc(a.name)}</td><td>${esc(a.docNo||'')}</td><td><span class="tag">${esc(st(a))}</span></td><td class="d">${fD(a.steps?.[0]?.[1])}</td><td class="d">${fD(a.steps?.[0]?.[2])}</td><td class="d">${fD(a.pf)}</td><td class="d">${fT(cx.S[a.id].EF)}</td><td class="n neg">${dl}</td><td>${esc(a.reason||'')}</td></tr>`).join('')}</tbody></table></div>`:'<div class="callout ok">No overdue drawings.</div>'}`};
V.engineering.after=()=>discCurve('eS','E');
function discCurve(id,d){const p=P(),cx=C(),c=curves(p,d,cx);lineChart(id,{x0:c.M[0]-30*DAY,x1:c.M[c.M.length-1],series:[{pts:c.plan,color:'var(--plan)',dash:'6 4'},{pts:c.fc,color:'var(--fc)',dash:'3 4'},{pts:c.act,color:'var(--act)',w:3.5,end:pc(d==='O'?cx.ov.act:cx.disc[d].act,0)}],marks:[{t:cx.d0,label:'Data date',c:'var(--ink)'}]})}

/* ---------- procurement ---------- */
V.procurement=()=>{const p=P(),cx=C(),A=p.acts.filter(a=>a.d==='P'),x=cx.disc.P;
  const k=a=>(a.steps||[]).filter(s=>s[2]).length;
  const fun=MS.map((m,i)=>({m,plan:A.filter(a=>a.steps?.[i]?.[1]&&td(a.steps[i][1])<=cx.d0).length,act:A.filter(a=>a.steps?.[i]?.[2]).length}));
  const vend={};A.forEach(a=>{const v=vend[a.l3]=vend[a.l3]||{n:0,cost:0,ev:0};v.n++;v.cost+=a.cost;v.ev+=a.cost*a.pct});
  const back=A.filter(a=>a.pct<1).map(a=>{const i=k(a);const nx=a.steps?.[i];return {a,i,nx,dl:nx&&nx[1]?dd(p.dataDate,nx[1]):0}}).filter(b=>b.dl>0).sort((u,v)=>v.dl-u.dl);
  const po=sum(A.filter(a=>a.steps?.[3]?.[2]),a=>a.cost);
  return hdr('Procurement status')+`
  <div class="kpis">${kpi(A.length,'Items / packages')}${kpi(nf(x.BAC,0),'Value ('+p.currency+')')}${kpi(nf(po,0),'PO released value','good')}${kpi(A.filter(a=>a.steps?.[7]?.[2]).length,'Items received at site')}
  ${kpi(pc(x.plan)+' / '+pc(x.act),'Planned / actual progress',x.act<x.plan?'bad':'good')}${kpi(back.length,'Items in backlog',back.length?'bad':'good')}</div>
  <div class="grid2"><div><h2>Milestone status: planned by data date vs achieved</h2><table><thead><tr><th>Milestone (weight)</th><th class="n">Planned</th><th class="n">Achieved</th><th class="n">Gap</th><th style="width:30%"></th></tr></thead><tbody>
   ${fun.map((f,i)=>`<tr><td>${f.m} (${MSW[i]*100}%)</td><td class="n">${f.plan}</td><td class="n">${f.act}</td><td class="n">${sg(f.act-f.plan,0)}</td><td>${pbar(f.act/(A.length||1),f.plan/(A.length||1))}</td></tr>`).join('')}</tbody></table>
   <h3>Items by current stage</h3><table><tbody>${['Enquiry not floated',...MS].map((m,i)=>{const n=A.filter(a=>k(a)===i).length;return n?`<tr><td>${m}</td><td class="n">${n}</td></tr>`:''}).join('')}</tbody></table></div>
  <div><h2>Procurement S-curve</h2><div class="fig" id="pS"></div>${legend([['var(--plan)','Planned',1],['var(--act)','Actual'],['var(--fc)','Forecast',1]])}
   <h3>By vendor</h3><div class="scroll"><table><thead><tr><th>Vendor</th><th class="n">Items</th><th class="n">Value</th><th class="n">Progress</th></tr></thead><tbody>${Object.entries(vend).sort((a,b)=>b[1].cost-a[1].cost).map(([v,o])=>`<tr><td>${esc(v)}</td><td class="n">${o.n}</td><td class="n">${nf(o.cost)}</td><td class="n">${pc(o.ev/(o.cost||1),0)}</td></tr>`).join('')}</tbody></table></div></div></div>
  <h2>Backlog: next milestone overdue</h2>${back.length?`<div class="scroll"><table><thead><tr><th>ID</th><th>Item</th><th>Vendor</th><th>Last achieved</th><th>Next milestone</th><th>Planned</th><th class="n">Delay (d)</th><th>Forecast finish</th><th class="n">Value</th></tr></thead><tbody>
  ${back.map(b=>`<tr><td>${b.a.id}</td><td>${esc(b.a.name)}</td><td>${esc(b.a.l3)}</td><td>${b.i?MS[b.i-1]:'—'}</td><td>${esc(b.nx?.[0]||'')}</td><td class="d">${fD(b.nx?.[1])}</td><td class="n neg">${b.dl}</td><td class="d">${fT(cx.S[b.a.id].EF)}</td><td class="n">${nf(b.a.cost)}</td></tr>`).join('')}</tbody></table></div>`:'<div class="callout ok">No procurement backlog.</div>'}`};
V.procurement.after=()=>discCurve('pS','P');

/* ---------- construction ---------- */
V.construction=()=>{const p=P(),cx=C(),A=p.acts.filter(a=>a.d==='C'),x=cx.disc.C;
  const cats=[...new Set(A.map(a=>a.l2))],cw=d=>sum(A.filter(a=>a.l2===d),a=>cx.W[a.id]);
  const catRow=c=>{const B=A.filter(a=>a.l2===c),w=cw(c)||1,pl=sum(B,a=>cx.W[a.id]*planPct(a,cx.d0))/w,ac=sum(B,a=>cx.W[a.id]*a.pct)/w;return {c,w:cw(c),pl,ac,B}};
  const R=cats.map(catRow);
  const back=A.filter(a=>a.pct<1&&td(a.pf)<cx.d0).map(a=>({a,dl:dd(p.dataDate,a.pf)})).sort((u,v)=>v.dl-u.dl);
  return hdr('Construction status')+`
  <div class="kpis">${kpi(A.length,'Activities')}${kpi(A.filter(a=>a.pct>=1).length,'Completed','good')}${kpi(A.filter(a=>a.pct>0&&a.pct<1).length,'In progress')}${kpi(A.filter(a=>!a.pct).length,'Not started')}
  ${kpi(pc(x.plan)+' / '+pc(x.act),'Planned / actual progress',x.act<x.plan?'bad':'good')}${kpi(back.length,'Activities in backlog',back.length?'bad':'good')}</div>
  <div class="grid2"><div><h2>Status of construction by L2 category</h2><table><thead><tr><th>L2 category</th><th class="n">Weight</th><th class="n">Planned</th><th class="n">Actual</th><th class="n">Variance</th><th style="width:26%"></th></tr></thead><tbody>
  ${R.map(r=>`<tr><td>${esc(r.c)}</td><td class="n">${pc(r.w,0)}</td><td class="n">${pc(r.pl)}</td><td class="n">${pc(r.ac)}</td><td class="n">${sg((r.ac-r.pl)*100,1,'%')}</td><td>${pbar(r.ac,r.pl)}</td></tr>`).join('')}
  <tr class="l0"><td>Overall</td><td class="n">100%</td><td class="n">${pc(x.plan)}</td><td class="n">${pc(x.act)}</td><td class="n">${sg((x.act-x.plan)*100,1,'%')}</td><td>${pbar(x.act,x.plan)}</td></tr></tbody></table></div>
  <div><h2>Construction S-curve</h2><div class="fig" id="cS"></div>${legend([['var(--plan)','Planned',1],['var(--act)','Actual'],['var(--fc)','Forecast',1]])}</div></div>
  <h2>Work packages (L3) by category</h2><div class="scroll"><table><thead><tr><th>Category</th><th>Work package</th><th class="n">Activities</th><th class="n">Budget</th><th class="n">Planned</th><th class="n">Actual</th><th style="width:20%"></th><th>Forecast finish</th></tr></thead><tbody>
  ${R.map(r=>[...new Set(r.B.map(a=>a.l3))].map(w=>{const B=r.B.filter(a=>a.l3===w),cs=sum(B,a=>a.cost)||1,pl=sum(B,a=>a.cost*planPct(a,cx.d0))/cs,ac=sum(B,a=>a.cost*a.pct)/cs;
   return `<tr><td>${esc(r.c)}</td><td>${esc(w)}</td><td class="n">${B.length}</td><td class="n">${nf(cs)}</td><td class="n">${pc(pl,0)}</td><td class="n">${pc(ac,0)}</td><td>${pbar(ac,pl)}</td><td class="d">${fT(Math.max(...B.map(a=>cx.S[a.id].EF)))}</td></tr>`}).join('')).join('')}</tbody></table></div>
  <h2>Backlog: planned finish passed, not complete (${back.length})</h2>${back.length?`<div class="scroll" style="max-height:60vh"><table><thead><tr><th>ID</th><th>Category</th><th>Activity</th><th class="n">Scope</th><th class="n">Done</th><th>Planned finish</th><th class="n">Delay (d)</th><th>Forecast finish</th><th>Reason</th></tr></thead><tbody>
  ${back.map(({a,dl})=>`<tr><td>${a.id}</td><td>${esc(a.l2)}</td><td>${esc(a.name.slice(0,80))}</td><td class="n">${nf(a.qty,0)} ${esc(a.uom)}</td><td class="n">${pc(a.pct,0)}</td><td class="d">${fD(a.pf)}</td><td class="n neg">${dl}</td><td class="d">${fT(cx.S[a.id].EF)}</td><td>${esc(a.reason||'')}</td></tr>`).join('')}</tbody></table></div>`:'<div class="callout ok">No construction backlog.</div>'}`};
V.construction.after=()=>discCurve('cS','C');

/* ---------- S-curve ---------- */
let SC='O';
V.scurve=()=>{const p=P(),cx=C(),c=curves(p,SC,cx);const am=new Map(c.act.map(([t,v])=>[ds(t).slice(0,7),v]));let pv=0,pa=null;
  return hdr('S-curve report: planned vs actual')+`
  <div class="tools">${[['O','Overall'],...'EPC'.split('').map(d=>[d,DN[d]])].map(([k,l])=>`<button class="${k===SC?'pri':''}" data-sc="${k}">${l}</button>`).join('')}</div>
  <div class="kpis">${kpi(pc(SC==='O'?cx.ov.plan:cx.disc[SC].plan),'Planned at data date')}${kpi(pc(SC==='O'?cx.ov.act:cx.disc[SC].act),'Actual at data date','good')}
  ${kpi(fT(earnedSchedule(p,SC,cx,SC==='O'?cx.ov.act:cx.disc[SC].act,cx.d0)),'Plan date matching actual progress')}${kpi(Math.round((cx.d0-earnedSchedule(p,SC,cx,SC==='O'?cx.ov.act:cx.disc[SC].act,cx.d0))/DAY)+' d','Schedule slippage (earned schedule)','bad')}</div>
  <div class="fig tall" id="sS"></div>${legend([['var(--plan)','Planned (from baseline dates)',1],['var(--act)','Actual (period snapshots)'],['var(--fc)','Forecast (from schedule)',1]])}
  <h2>Monthly table</h2><div class="scroll" style="max-height:60vh"><table><thead><tr><th>Month</th><th class="n">Plan cum.</th><th class="n">Plan in month</th><th class="n">Actual cum.</th><th class="n">Actual in month</th><th class="n">Forecast cum.</th><th class="n">Variance</th></tr></thead><tbody>
  ${c.plan.map(([t,v],i)=>{const k=ds(t).slice(0,7),a=am.get(k),f=c.fc.find(x=>ds(x[0]).slice(0,7)===k&&x[0]>cx.d0);const r=`<tr><td>${fM(t)}</td><td class="n">${pc(v)}</td><td class="n">${pc(v-pv)}</td><td class="n">${a!=null?pc(a):''}</td><td class="n">${a!=null&&pa!=null?pc(a-pa):''}</td><td class="n">${f?pc(f[1]):''}</td><td class="n">${a!=null?sg((a-v)*100,1,'%'):''}</td></tr>`;pv=v;if(a!=null)pa=a;return r}).join('')}</tbody></table></div>`};
V.scurve.after=()=>{$$('[data-sc]').forEach(b=>b.onclick=()=>{SC=b.dataset.sc;route()});const p=P(),cx=C(),c=curves(p,SC,cx);
  lineChart('sS',{x0:c.M[0]-30*DAY,x1:c.M[c.M.length-1],series:[{pts:c.plan,color:'var(--plan)',dash:'6 4',dots:1},{pts:c.fc,color:'var(--fc)',dash:'3 4'},{pts:c.act,color:'var(--act)',w:3.5,dots:1,end:'Actual '+pc(c.act[c.act.length-1][1],0)}],marks:[{t:cx.d0,label:'Data date',c:'var(--ink)'},{t:td(p.cdd),label:'CDD',dy:14}],band:COVID})};

/* ---------- EVM ---------- */
V.evm=()=>{const p=P(),cx=C();const o=evm(p,cx,'O');
  const esT=earnedSchedule(p,'O',cx,cx.ov.act,cx.d0),AT=(cx.d0-td(p.start))/DAY,ES=(esT-td(p.start))/DAY,SPIt=ES/AT,PD=(td(p.finish)-td(p.start))/DAY,IEAC=td(p.start)+PD/SPIt*DAY;
  const row=(l,e,cls='')=>`<tr class="${cls}"><td>${esc(l)}</td>${['BAC','PV','EV','AC','SV','CV'].map(k=>`<td class="n">${k==='SV'||k==='CV'?sg(e[k],2):nf(e[k])}</td>`).join('')}<td class="n ${e.SPI<1?'neg':'pos'}">${nf(e.SPI)}</td><td class="n ${e.CPI<1?'neg':'pos'}">${nf(e.CPI)}</td>${['EAC','ETC','VAC'].map(k=>`<td class="n">${nf(e[k])}</td>`).join('')}<td class="n">${nf(e.TCPI)}</td></tr>`;
  const l2rows=d=>[...new Set(p.acts.filter(a=>a.d===d).map(a=>a.l2))].map(c=>{const A=p.acts.filter(a=>a.d===d&&a.l2===c);const x={BAC:sum(A,a=>a.cost),PV:sum(A,a=>a.cost*planPct(a,cx.d0)),EV:sum(A,a=>a.cost*a.pct),AC:sum(A,a=>a.ac)};
    const SPI=x.EV/x.PV,CPI=x.EV/x.AC,EAC=x.BAC/CPI;return row('   '+c,{...x,SV:x.EV-x.PV,CV:x.EV-x.AC,SPI,CPI,EAC,ETC:EAC-x.AC,VAC:x.BAC-EAC,TCPI:(x.BAC-x.EV)/(x.BAC-x.AC)})}).join('');
  return hdr('Earned value: SPI & CPI','values in '+p.currency)+`
  <div class="kpis">${kpi(nf(o.SPI),'SPI = EV ÷ PV',o.SPI<1?'bad':'good')}${kpi(nf(o.CPI),'CPI = EV ÷ AC',o.CPI<1?'bad':'good')}${kpi(nf(SPIt),'SPI(t), earned schedule',SPIt<1?'bad':'good')}
  ${kpi(nf(o.EAC,0),'EAC = BAC ÷ CPI',o.EAC>o.BAC?'bad':'good')}${kpi(nf(o.VAC,0),'VAC',o.VAC<0?'bad':'good')}${kpi(fT(IEAC),'Completion forecast from SPI(t)')}</div>
  <div class="grid2"><div><h2>PV, EV and AC over time</h2><div class="fig" id="evC"></div>${legend([['var(--plan)','PV (planned value)',1],['var(--act)','EV (earned value)'],['var(--fc)','AC (actual cost)']])}</div>
  <div><h2>SPI and CPI trend</h2><div class="fig" id="evI"></div>${legend([['var(--e)','SPI'],['var(--p)','CPI'],['var(--mute)','1.0 target',1]])}</div></div>
  <h2>EVM table by discipline and L2</h2><div class="scroll"><table><thead><tr><th>WBS</th><th class="n">BAC</th><th class="n">PV</th><th class="n">EV</th><th class="n">AC</th><th class="n">SV</th><th class="n">CV</th><th class="n">SPI</th><th class="n">CPI</th><th class="n">EAC</th><th class="n">ETC</th><th class="n">VAC</th><th class="n">TCPI</th></tr></thead><tbody>
  ${'EPC'.split('').map(d=>row(DN[d],evm(p,cx,d),'l1')+l2rows(d)).join('')}${row('Project total',o,'l0')}</tbody></table></div>
  <p class="note">PV uses each activity's baseline dates and progress profile; EV = budget × % complete; AC is the actual cost entered in Progress update. In the IRCON sample, budgets come from the trackers (procurement item value, construction quantity × rate, engineering 2,883 budgeted man-hours × ₹1,500/h). The trackers had no actual-cost data, so the sample AC is an assumed ${nf(p.acFactor??1,2)} × EV: replace it with real costs. SPI here is cost-weighted, so it can differ from the weightage-based progress on the overview.</p>`};
function evHist(p,cx){const B={E:cx.disc.E.BAC,P:cx.disc.P.BAC,C:cx.disc.C.BAC},BAC=B.E+B.P+B.C;
  const pts=(p.snaps||[]).filter(s=>td(s.date)<cx.d0).map(s=>{const t=td(s.date);const EV=sum('EPC'.split(''),d=>(s[d]||0)*B[d]);const AC=s.ac?sum(Object.values(s.ac)):EV*(p.acFactor??1);
    const PV=sum(p.acts,a=>a.cost*planPct(a,t));return {t,EV,AC,PV}});
  const o=evm(p,cx,'O');pts.push({t:cx.d0,EV:o.EV,AC:o.AC,PV:o.PV});return {pts,BAC}}
V.evm.after=()=>{const p=P(),cx=C(),{pts,BAC}=evHist(p,cx);const M=months(p,cx.pEF);
  const pv=M.map(t=>[t,sum(p.acts,a=>a.cost*planPct(a,t))]);
  lineChart('evC',{x0:M[0]-30*DAY,x1:M[M.length-1],ymax:Math.max(BAC*1.1,1),yfmt:v=>nf(v,0),series:[{pts:pv,color:'var(--plan)',dash:'6 4'},{pts:pts.map(x=>[x.t,x.AC]),color:'var(--fc)'},{pts:pts.map(x=>[x.t,x.EV]),color:'var(--act)',w:3.5}],marks:[{t:cx.d0,label:'Data date',c:'var(--ink)'}]});
  const ip=pts.filter(x=>x.PV>BAC*.02&&x.AC>0);const mx=Math.max(1.6,...ip.map(x=>Math.max(x.EV/x.PV,x.EV/x.AC)).filter(isFinite));const ix0=ip[0]?.t||M[0],ix1=Math.max(cx.d0+30*DAY,ix0+60*DAY);
  lineChart('evI',{x0:ix0,x1:ix1,ymax:Math.min(3,mx),yfmt:v=>v.toFixed(1),series:[{pts:[[ix0,1],[ix1,1]],color:'var(--mute)',dash:'2 4',w:1.5},{pts:ip.map(x=>[x.t,Math.min(3,x.EV/x.PV)]),color:'var(--e)',dots:1},{pts:ip.map(x=>[x.t,Math.min(3,x.EV/x.AC)]),color:'var(--p)',dots:1}]})};
