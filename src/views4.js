/* ---------- line diagram ---------- */
let LIN={by:'l3',wp:''};
const PAL=['#00a86b','#3b7ddd','#e8a200','#ff5c8a','#7b5cd6','#1aa6b7','#c2410c','#5b6661','#0f766e','#b45309','#be185d','#4d7c0f'];
function zoneOf(p,a){return (p.zones||{})[a.l2]||a.ch}
function linGroups(p,cx){const A=p.acts.filter(a=>a.d==='C'&&zoneOf(p,a));const g={};
  A.forEach(a=>{const k=a.l2+'|'+(LIN.by==='l3'?a.l3:'');(g[k]=g[k]||{l2:a.l2,l3:LIN.by==='l3'?a.l3:'All work',A:[]}).A.push(a)});
  return Object.values(g).filter(x=>!LIN.wp||x.l3===LIN.wp).map(x=>{const z=zoneOf(p,x.A[0]),cs=sum(x.A,a=>a.cost)||1;
    return {...x,z,ps:Math.min(...x.A.map(a=>td(a.ps))),pf:Math.max(...x.A.map(a=>td(a.pf))),ES:Math.min(...x.A.map(a=>cx.S[a.id].ES)),EF:Math.max(...x.A.map(a=>cx.S[a.id].EF)),pct:sum(x.A,a=>a.cost*a.pct)/cs}})}
V.linear=()=>{const p=P(),cx=C();const wps=[...new Set(p.acts.filter(a=>a.d==='C').map(a=>a.l3))];
  const G=linGroups(p,cx);const has=G.length>0;
  return hdr('Line diagram: time vs chainage')+`
  <div class="tools"><label>Lines per <select id="lb"><option value="l3" ${LIN.by==='l3'?'selected':''}>Work package in each zone</option><option value="l2" ${LIN.by==='l2'?'selected':''}>Zone (L2) only</option></select></label>
  <select id="lw"><option value="">All work packages</option>${wps.map(w=>`<option ${LIN.wp===w?'selected':''}>${esc(w)}</option>`).join('')}</select></div>
  ${has?`<div class="fig tall" id="lnF" style="min-height:560px"></div>
  ${legend([['var(--plan)','Planned (baseline)',1],['var(--act)','Achieved'],['var(--fc)','Forecast remaining',1]])}
  <div class="legend">${[...new Set(G.map(g=>g.l3))].map((w,i)=>`<span><i style="background:${PAL[i%PAL.length]};height:8px"></i>${esc(w)}</span>`).join('')}</div>
  <p class="note">Chainage runs left to right, time runs down. Each line runs from the start of its zone at the start date to the end of its zone at the finish date; a flatter line means faster progress along the alignment. Zone chainages are set in Projects &amp; registration (the IRCON sample uses assumed chainages per area: pit line, platforms/subway, station building, sub-station).</p>`:
  '<div class="callout">No construction activity has a chainage yet. Set zone chainages under Projects &amp; registration or per activity in Schedule.</div>'}`};
V.linear.after=()=>{$('#lb').onchange=e=>{LIN.by=e.target.value;route()};$('#lw').onchange=e=>{LIN.wp=e.target.value;route()};
  const p=P(),cx=C(),G=linGroups(p,cx);if(!G.length)return;const wl=[...new Set(G.map(g=>g.l3))];
  const c0=Math.min(...G.map(g=>g.z[0])),c1=Math.max(...G.map(g=>g.z[1])),t0=Math.min(...G.map(g=>Math.min(g.ps,g.ES)))-30*DAY,t1=Math.max(...G.map(g=>Math.max(g.pf,g.EF)))+30*DAY;
  const zones={};G.forEach(g=>zones[g.l2]=g.z);
  chart('lnF',(W,H)=>{const pad={l:56,r:16,t:40,b:12};const X=c=>pad.l+(c-c0)/(c1-c0||1)*(W-pad.l-pad.r),Y=t=>pad.t+(t-t0)/(t1-t0)*(H-pad.t-pad.b);let o='<g style="color:var(--ink)">';
    let d=new Date(t0),t=Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),1);const step=(t1-t0)/DAY>900?6:3;
    while(t<=t1){const m=new Date(t);if(m.getUTCMonth()%step===0&&t>=t0)o+=`<line x1="${pad.l}" x2="${W-pad.r}" y1="${Y(t)}" y2="${Y(t)}" stroke="currentColor" opacity=".08"/><text x="${pad.l-6}" y="${Y(t)+4}" font-size="11" text-anchor="end" fill="currentColor" opacity=".6">${fM(t)}</text>`;t=Date.UTC(m.getUTCFullYear(),m.getUTCMonth()+1,1)}
    Object.entries(zones).forEach(([n,z],i)=>{o+=`<rect x="${X(z[0])}" y="${pad.t}" width="${X(z[1])-X(z[0])}" height="${H-pad.t-pad.b}" fill="currentColor" opacity="${i%2?.03:.0}"/><line x1="${X(z[0])}" x2="${X(z[0])}" y1="${pad.t-30}" y2="${H-pad.b}" stroke="currentColor" opacity=".25"/>
      <text x="${(X(z[0])+X(z[1]))/2}" y="${pad.t-20}" font-size="${W<600?10:12}" font-weight="700" text-anchor="middle" fill="currentColor">${esc(n.length*7.5>X(z[1])-X(z[0])?n.slice(0,Math.max(3,Math.floor((X(z[1])-X(z[0]))/7.5)-1))+'…':n)}</text><text x="${X(z[0])+3}" y="${pad.t-6}" font-size="10" fill="currentColor" opacity=".6">${z[0]} m</text>`});
    o+=`<line x1="${pad.l}" x2="${W-pad.r}" y1="${Y(cx.d0)}" y2="${Y(cx.d0)}" stroke="var(--ink)" stroke-width="1.5"/><text x="${W-pad.r-4}" y="${Y(cx.d0)-5}" font-size="11" text-anchor="end" fill="var(--ink)">Data date ${fT(cx.d0)}</text>`;
    G.forEach(g=>{const i=wl.indexOf(g.l3),col=PAL[i%PAL.length],n=wl.length,off=(n>1?(i/(n-1)-.5):0)*Math.min(14,(X(g.z[1])-X(g.z[0]))*.15);const a=X(g.z[0])+off,b=X(g.z[1])+off;
      o+=`<line x1="${a}" y1="${Y(g.ps)}" x2="${b}" y2="${Y(g.pf)}" stroke="${col}" stroke-dasharray="5 4" stroke-width="1.5" opacity=".7"/>`;
      const pm=a+(b-a)*g.pct,pt=g.ES+(Math.min(cx.d0,g.EF)-g.ES)*1;const yp=g.pct>=1?Y(g.EF):Y(Math.max(g.ES,Math.min(cx.d0,g.EF)));
      if(g.pct>0)o+=`<line x1="${a}" y1="${Y(g.ES)}" x2="${pm}" y2="${yp}" stroke="${col}" stroke-width="4" stroke-linecap="round"><title>${esc(g.l2+' · '+g.l3+': '+pc(g.pct,0))}</title></line>`;
      if(g.pct<1)o+=`<line x1="${g.pct>0?pm:a}" y1="${g.pct>0?yp:Y(g.ES)}" x2="${b}" y2="${Y(g.EF)}" stroke="var(--fc)" stroke-width="2" stroke-dasharray="2 3"><title>${esc(g.l2+' · '+g.l3+' forecast to '+fT(g.EF))}</title></line>`});
    return o+'</g>'})};

/* ---------- look-ahead ---------- */
function lookahead(days,cols,title){const p=P(),cx=C();const w0=cx.d0,w1=w0+days*DAY;let D=LA.d;
  const A=p.acts.filter(a=>(!D||a.d===D)&&cx.S[a.id].st!=='done').filter(a=>{const x=cx.S[a.id];return x.ES<w1&&x.EF>w0}).sort((a,b)=>cx.S[a.id].ES-cx.S[b.id].ES);
  const back=A.filter(a=>td(a.pf)<w0);
  const per=[];const step=days/cols;for(let i=0;i<cols;i++)per.push([w0+i*step*DAY,w0+(i+1)*step*DAY]);
  const rq=a=>{const x=cx.S[a.id],s=Math.max(x.ES,w0),rem=(1-(a.pct||0))*a.qty;const span=x.EF-Math.max(x.ES,cx.d0)||DAY;return [rem,rem*clamp((Math.min(x.EF,w1)-s)/span)]};
  const lab=([s])=>days<=14?new Date(s).toLocaleDateString('en-GB',{weekday:'narrow',day:'numeric',timeZone:'UTC'}):'Wk '+fT(s).slice(0,6);
  LA.last={title,A,per,rq};
  return hdr(title,`${fT(w0)} to ${fT(w1-DAY)}`)+`
  <div class="tools"><select id="laD"><option value="">All disciplines</option>${'EPC'.split('').map(d=>`<option value="${d}" ${D===d?'selected':''}>${DN[d]}</option>`).join('')}</select><button id="laX">Download CSV</button><button id="laP">Print</button></div>
  <div class="kpis">${kpi(A.length,'Activities in window')}${kpi(A.filter(a=>cx.S[a.id].ES>=w0&&cx.S[a.id].st==='ns').length,'Starting in window')}${kpi(A.filter(a=>cx.S[a.id].EF<=w1).length,'Finishing in window','good')}${kpi(back.length,'Backlog (baseline finish passed)',back.length?'bad':'good')}${kpi(A.filter(a=>cx.S[a.id].TF<0).length,'Negative float','bad')}</div>
  <div class="scroll" style="max-height:72vh"><table><thead><tr><th>ID</th><th>WBS</th><th>Activity</th><th>Start</th><th>Finish</th><th class="n">TF</th><th class="n">Remaining qty</th><th class="n">Target in window</th><th>Resource</th>${per.map(x=>`<th style="font-size:11px;text-align:center;padding:4px 2px">${lab(x)}</th>`).join('')}</tr></thead><tbody>
  ${A.map(a=>{const x=cx.S[a.id],[rem,inw]=rq(a);return `<tr><td>${a.id}${td(a.pf)<w0?' <span class="tag crit">backlog</span>':''}</td><td>${esc(a.l2)} · ${esc(a.l3)}</td><td>${esc(a.name.slice(0,70))}</td><td class="d">${fT(Math.max(x.ES,x.st==='wip'?x.ES:w0))}</td><td class="d">${fT(x.EF)}</td><td class="n ${x.TF<0?'neg':''}">${x.TF}</td><td class="n">${nf(rem,1)} ${esc(a.uom||'')}</td><td class="n"><b>${nf(inw,1)}</b></td><td>${esc(a.res||'')} ×${a.crew||1}</td>
   ${per.map(([s,e])=>{const on=x.ES<e&&x.EF>s;return `<td style="padding:4px 1px"><div style="height:14px;border-radius:2px;background:${on?(x.TF<0?'var(--fc)':DCH[a.d]):'transparent'}"></div></td>`}).join('')}</tr>`}).join('')}</tbody></table></div>
  <p class="note">Window starts at the data date and uses the forecast (early) dates from the schedule. "Target in window" is the remaining quantity pro-rated over the activity's remaining duration.</p>`}
let LA={d:''};
function laAfter(){$('#laD').onchange=e=>{LA.d=e.target.value;route()};$('#laP').onclick=()=>{try{window.print()}catch(e){toast('Printing is not available here')}};
  $('#laX').onclick=()=>{const {A,per,rq,title}=LA.last,cx=C();download(title.replace(/\W+/g,'_')+'.csv',csv([['ID','Discipline','L2','L3','Activity','Start','Finish','Total float','Remaining qty','UoM','Target in window','Resource','Crews',...per.map(([s])=>fT(s))],
    ...A.map(a=>{const x=cx.S[a.id],[r,i]=rq(a);return [a.id,DN[a.d],a.l2,a.l3,a.name,ds(x.ES),ds(x.EF),x.TF,r2(r),a.uom,r2(i),a.res,a.crew,...per.map(([s,e])=>x.ES<e&&x.EF>s?'X':'')]})]),'text/csv')}}
V.la2w=()=>lookahead(14,14,'2-week look-ahead');V.la2w.after=laAfter;
V.la1m=()=>lookahead(28,4,'1-month look-ahead');V.la1m.after=laAfter;
V.la7w=()=>lookahead(49,7,'7-week look-ahead');V.la7w.after=laAfter;

/* ---------- export ---------- */
let EXL=4;
const xe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
function mspdi(p,cx,lvl,D){
  const rows=tree(p,cx,lvl,a=>!D||a.d===D);const t8=t=>ds(t)+'T08:00:00',t17=t=>ds(t)+'T17:00:00';
  const uid={};rows.forEach((r,i)=>{r.uid=i+1;if(r.L===4)uid[r.a.id]=r.uid});
  const R=resList(p),ruid={};R.forEach((r,i)=>ruid[r]=i+1);
  let tasks='',asg='',an=0;
  rows.forEach((r,i)=>{const summ=i+1<rows.length&&rows[i+1].L>r.L;let s=r.ES,f=r.EF;if(r.L===5){s=td(r.ps);f=td(r.pf)}
    const days=Math.max(0,Math.round((f-s)/DAY)),fin=days?s+(days-1)*DAY:s,durH=days*8;const ms=days===0;
    let x=`<Task><UID>${r.uid}</UID><ID>${r.uid}</ID><Name>${xe((r.L===4?r.a.id+' ':'')+r.name)}</Name><Type>${summ?1:0}</Type><IsNull>0</IsNull><WBS>${xe(r.wbs)}</WBS><OutlineNumber>${xe(r.wbs.split('.').slice(1).join('.')||'0')}</OutlineNumber><OutlineLevel>${r.L+1}</OutlineLevel>
<Start>${t8(s)}</Start><Finish>${ms?t8(s):t17(fin)}</Finish><Duration>PT${durH}H0M0S</Duration><DurationFormat>7</DurationFormat><Milestone>${ms?1:0}</Milestone><Summary>${summ?1:0}</Summary><PercentComplete>${Math.round((r.pct||0)*100)}</PercentComplete>`;
    if(r.L===4){const a=r.a;if(a.as)x+=`<ActualStart>${t8(td(a.as))}</ActualStart>`;if(a.af&&a.pct>=1)x+=`<ActualFinish>${t17(td(a.af))}</ActualFinish>`;x+=`<Cost>${Math.round(a.cost*1e5)}</Cost>`;}
    if(!summ){x+=`<ConstraintType>4</ConstraintType><ConstraintDate>${t8(s)}</ConstraintDate>`}
    x+=`<Baseline><Number>0</Number><Start>${t8(td(r.ps))}</Start><Finish>${t17(td(r.pf))}</Finish><Duration>PT${Math.max(0,dd(r.pf,r.ps))*8}H0M0S</Duration></Baseline>`;
    if(r.L===4)for(const [pid,ty,lag] of r.a.preds||[]){if(!uid[pid])continue;x+=`<PredecessorLink><PredecessorUID>${uid[pid]}</PredecessorUID><Type>${{FF:0,FS:1,SF:2,SS:3}[ty]??1}</Type><CrossProject>0</CrossProject><LinkLag>${Math.round(lag*480*10)}</LinkLag><LagFormat>7</LagFormat></PredecessorLink>`}
    if(r.L===4&&r.a.notes)x+=`<Notes>${xe(r.a.notes)}</Notes>`;
    tasks+=x+'</Task>\n';
    if(r.L===4&&!summ&&r.a.res&&ruid[r.a.res])asg+=`<Assignment><UID>${++an}</UID><TaskUID>${r.uid}</TaskUID><ResourceUID>${ruid[r.a.res]}</ResourceUID><Units>${r.a.crew||1}</Units><Work>PT${durH*(r.a.crew||1)}H0M0S</Work></Assignment>\n`});
  const wd=[1,2,3,4,5,6,7].map(d=>`<WeekDay><DayType>${d}</DayType><DayWorking>1</DayWorking><WorkingTimes><WorkingTime><FromTime>08:00:00</FromTime><ToTime>12:00:00</ToTime></WorkingTime><WorkingTime><FromTime>13:00:00</FromTime><ToTime>17:00:00</ToTime></WorkingTime></WorkingTimes></WeekDay>`).join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Project xmlns="http://schemas.microsoft.com/project">
<SaveVersion>14</SaveVersion><Name>${xe(p.name)} L${lvl}</Name><Title>${xe(p.name)} – L${lvl} schedule</Title><Company>${xe(p.client)}</Company>
<ScheduleFromStart>1</ScheduleFromStart><StartDate>${t8(td(p.start))}</StartDate><FinishDate>${t17(Math.max(cx.pEF,td(p.finish)))}</FinishDate><StatusDate>${t17(cx.d0)}</StatusDate><CurrentDate>${t8(cx.d0)}</CurrentDate>
<CalendarUID>1</CalendarUID><DefaultStartTime>08:00:00</DefaultStartTime><DefaultFinishTime>17:00:00</DefaultFinishTime><MinutesPerDay>480</MinutesPerDay><MinutesPerWeek>3360</MinutesPerWeek><DaysPerMonth>30</DaysPerMonth><DurationFormat>7</DurationFormat><WorkFormat>2</WorkFormat><NewTasksEffortDriven>0</NewTasksEffortDriven><CurrencySymbol>₹</CurrencySymbol>
<Calendars><Calendar><UID>1</UID><Name>Site 7-day</Name><IsBaseCalendar>1</IsBaseCalendar><WeekDays>${wd}</WeekDays></Calendar></Calendars>
<Tasks>
<Task><UID>0</UID><ID>0</ID><Name>${xe(p.name)}</Name><Type>1</Type><OutlineNumber>0</OutlineNumber><OutlineLevel>0</OutlineLevel><Summary>1</Summary></Task>
${tasks}</Tasks>
<Resources><Resource><UID>0</UID><ID>0</ID><Type>1</Type><IsNull>0</IsNull></Resource>${lvl>=4?R.map(r=>`<Resource><UID>${ruid[r]}</UID><ID>${ruid[r]}</ID><Name>${xe(r)}</Name><Type>1</Type><MaxUnits>${p.resCap?.[r]??10}</MaxUnits></Resource>`).join(''):''}</Resources>
<Assignments>${lvl===4?asg:''}</Assignments>
</Project>`}
V.export=()=>{const p=P();return hdr('Export, import & backup')+`
  <div class="card"><h2 style="margin-top:0">Google Drive storage</h2>
  <p class="note">When connected, every change is saved to <b>${DFILE}</b> in your Google Drive (projects, progress, users), and loads from there on any computer. The app can only see files it created.</p>
  <p><b id="drvState"></b></p>
  ${ME.role==='admin'?`<div class="form"><label class="f">Google OAuth client ID<input id="gcid" value="${esc(CID())}" placeholder="xxxx.apps.googleusercontent.com"></label></div>`:''}
  <div class="tools">${ME.role==='admin'?'<button id="gcidS">Save client ID</button>':''}<button class="go" id="dCon">${DRV.fileId?'Reload from Drive':'Connect Google Drive'}</button>${DRV.fileId?'<button id="dSave">Save to Drive now</button><button id="dOff">Disconnect</button>':''}</div></div>
  <div class="card"><h2 style="margin-top:0">Schedule to Microsoft Project</h2>
  <p class="note">Creates a Microsoft Project XML file (MSPDI). In MS Project: File → Open → choose "XML Format (*.xml)". It carries the WBS outline, baseline, forecast and actual dates, % complete, links with lags (L4), resources and assignments (L4), on a 7-day site calendar. In this hosted viewer the file may arrive zipped; unzip it before opening.</p>
  <div class="tools"><label>Level <select id="xL">${[0,1,2,3,4,5].map(l=>`<option value="${l}" ${EXL===l?'selected':''}>L${l}: ${['Project summary','Phases E/P/C','Systems / categories','Work packages','Activities with logic & resources','Activities + steps / milestones'][l]}</option>`).join('')}</select></label>
  <select id="xD"><option value="">E + P + C</option>${'EPC'.split('').map(d=>`<option value="${d}">${DN[d]}</option>`).join('')}</select>
  <button class="go" id="xMS">Download MS Project XML</button><button id="xMSc">Show XML to copy</button></div></div>
  <div class="card"><h2 style="margin-top:0">Activities CSV (Excel)</h2><p class="note">Export all activities, or import from Excel saved as CSV using the template columns. Predecessors use "ID TYPE LAG; …", e.g. "P012 FS -30".</p>
  <div class="tools"><button id="xCSV">Download activities CSV</button><button id="xTpl">Download import template</button>${can('edit')?`<label class="btn">Import CSV <input type="file" id="xImp" accept=".csv,text/csv" hidden></label><label><input type="checkbox" id="xRep"> Replace existing activities</label>`:''}</div></div>
  <div class="card"><h2 style="margin-top:0">Backup</h2><p class="note">Data is saved in this browser. Download a backup to keep it safe or move it to another computer.</p>
  <div class="tools"><button id="xBk">Download project backup (JSON)</button>${can('edit')?'<label class="btn">Restore backup <input type="file" id="xRs" accept=".json,application/json" hidden></label>':''}${ME.role==='admin'?'<button id="xReset">Reset all data to sample</button>':''}</div></div>`};
const CSVH=['ID','Discipline','L2','L3','Activity','Qty','UoM','Cost','BaselineStart','BaselineFinish','ForecastStart','ForecastFinish','ActualStart','ActualFinish','PctComplete','ActualCost','Resource','Crews','Predecessors','ChainageFrom','ChainageTo','Profile','DelayReason'];
V.export.after=()=>{const p=P();driveBadge();
  $('#gcidS')&&($('#gcidS').onclick=()=>{const v=$('#gcid').value.trim();if(v&&!/\.apps\.googleusercontent\.com$/.test(v))return toast('That does not look like a Google OAuth client ID');ls('epcpm.gcid',v||null);toast('Client ID saved');route()});
  $('#dCon').onclick=()=>DRV.fileId?driveLoad(DRV.fileId).catch(driveErr):driveConnect(true);
  $('#dSave')&&($('#dSave').onclick=()=>driveWrite().catch(driveErr));$('#dOff')&&($('#dOff').onclick=()=>{driveOff();route()});$('#xL').onchange=e=>EXL=+e.target.value;
  const mk=()=>mspdi(p,C(),EXL,$('#xD').value);const fn=()=>`${(p.code||p.name).replace(/\W+/g,'_')}_L${EXL}${$('#xD').value?'_'+$('#xD').value:''}.xml`;
  $('#xMS').onclick=()=>download(fn(),mk(),'application/xml');$('#xMSc').onclick=()=>showText(fn(),mk());
  $('#xCSV').onclick=()=>download('activities.csv',csv([CSVH,...p.acts.map(a=>[a.id,a.d,a.l2,a.l3,a.name,a.qty,a.uom,a.cost,a.ps,a.pf,a.fs,a.ff,a.as,a.af,r2((a.pct||0)*100),a.ac,a.res,a.crew,(a.preds||[]).map(x=>x.join(' ')).join('; '),a.ch?.[0],a.ch?.[1],a.prof,a.reason])]),'text/csv');
  $('#xTpl').onclick=()=>download('activity_import_template.csv',csv([CSVH,['C900','C','PIT LINE','LT & control cabling','Lay 3.5C x 300 sqmm cable','1200','Rm','12.5','2026-01-05','2026-02-15','','','','','0','0','Cable laying gang','2','P012 FS -30','0','800','Linear','']]),'text/csv');
  $('#xBk').onclick=()=>download(`${(p.code||'project').replace(/\W+/g,'_')}_backup.json`,JSON.stringify(p),'application/json');
  const rd=(inp,fnc)=>inp&&(inp.onchange=()=>{const f=inp.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{fnc(String(r.result))}catch(e){toast('Could not read file: '+e.message)}};r.readAsText(f)});
  rd($('#xImp'),t=>{const R=parseCSV(t),h=R.shift().map(x=>x.trim());const g=(r,k)=>(r[h.indexOf(k)]??'').trim();const out=[];
    for(const r of R){const id=g(r,'ID');if(!id)continue;const a={id,d:(g(r,'Discipline')[0]||'C').toUpperCase(),l2:g(r,'L2')||'General',l3:g(r,'L3')||'General',name:g(r,'Activity')||id,qty:+g(r,'Qty')||1,uom:g(r,'UoM'),cost:+g(r,'Cost')||0,
      ps:g(r,'BaselineStart'),pf:g(r,'BaselineFinish'),fs:g(r,'ForecastStart')||null,ff:g(r,'ForecastFinish')||null,as:g(r,'ActualStart')||null,af:g(r,'ActualFinish')||null,pct:clamp((+g(r,'PctComplete')||0)/100),ac:+g(r,'ActualCost')||0,
      res:g(r,'Resource'),crew:+g(r,'Crews')||1,preds:g(r,'Predecessors').split(';').map(s=>s.trim().split(/\s+/)).filter(x=>x[0]).map(([i,t,l])=>[i,(t||'FS').toUpperCase(),+l||0]),prof:g(r,'Profile')||'Linear',reason:g(r,'DelayReason')};
      if(g(r,'ChainageFrom')!==''&&g(r,'ChainageTo')!=='')a.ch=[+g(r,'ChainageFrom'),+g(r,'ChainageTo')];
      if(!isFinite(td(a.ps))||!isFinite(td(a.pf)))throw new Error(`row ${id}: baseline dates must be YYYY-MM-DD`);if(!'EPC'.includes(a.d))a.d='C';out.push(a)}
    if($('#xRep').checked)p.acts=out;else{const ids=new Set(out.map(a=>a.id));p.acts=p.acts.filter(a=>!ids.has(a.id)).concat(out)}save();toast(`Imported ${out.length} activities`);route()});
  rd($('#xRs'),t=>{const o=JSON.parse(t);if(!o.acts||!o.id)throw new Error('not a project backup');const i=DB.projects.findIndex(x=>x.id===o.id);if(i>=0)DB.projects[i]=o;else DB.projects.push(o);DB.active=o.id;save();toast('Backup restored');route()});
  $('#xReset')&&($('#xReset').onclick=()=>dialog('Reset all data',"<p>Replace every project with the starter project? Users are kept. If Google Drive is connected, the Drive file is overwritten too.</p>",[['Reset',()=>{DB.projects=[seed()];DB.active=DB.projects[0].id;save();$('#dlg').close();route()},'pri']]))};

/* ============ router ============ */
function route(){if(!ME)return loginView();cleanStray();charts.splice(0).forEach(r=>r.disconnect());
  let v=(location.hash||'#overview').slice(1);if(!V[v])v='overview';
  $$('.rail a').forEach(a=>a.classList.toggle('on',a.getAttribute('href')==='#'+v));$('#railProj').textContent=P().name;
  const m=$('#main');try{m.innerHTML=V[v]();V[v].after&&V[v].after();m.querySelectorAll('table').forEach(t=>{if(!t.closest('.scroll')){const w=document.createElement('div');w.className='scroll';t.before(w);w.appendChild(t)}})}catch(e){console.error(e);m.innerHTML=`<div class="callout">This view hit an error: ${esc(e.message)}</div>`}
  $('#lo')&&($('#lo').onclick=e=>{e.preventDefault();logout()});$('#pSel')&&($('#pSel').onchange=e=>{DB.active=e.target.value;save();route()});$('#mb')&&($('#mb').onclick=()=>$('#rail').classList.toggle('open'));$('#rail').classList.remove('open');window.scrollTo(0,0)}
window.addEventListener('hashchange',route);
$('#drv').onclick=()=>{if(DRV.status==='error'&&DRV.fileId&&DRV.tok)return driveWrite().catch(driveErr);driveConnect(true)};
(async()=>{load();await ensureAdmin();driveBadge();if(ls('epcpm.drive')==='1'&&CID())driveConnect(false);try{ME=JSON.parse(sessionStorage.getItem('epcpm.me'))}catch(e){ME=null}
  if(ME&&!DB.users.some(u=>u.u===ME.u))ME=null;if(!ME)loginView();else route()})();
}
</script>
</body>
</html>
