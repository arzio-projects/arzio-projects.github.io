/* ============ page frame ============ */
function hdr(title,sub=''){const p=P(),cx=C();
  return `<div class="top"><div><button class="menu-btn" id="mb">Menu</button><h1>${esc(title)}</h1><div class="meta">${DB.org?.name?esc(DB.org.name)+' · ':''}${esc(p.name)} · data date ${fD(p.dataDate)}${sub?' · '+sub:''}</div></div>
  <div class="prof">${orgLogoHTML(DB.org,44)}<div><b>${esc(DB.org?.name||'')}</b><div class="meta">${esc(ME.name)} · ${esc(ME.role)} · <a href="#" id="lo" style="color:inherit">Sign out</a></div></div></div></div>`}
const V={};
function kpi(v,l,cls=''){return `<div class="kpi ${cls}"><b>${v}</b><span>${esc(l)}</span></div>`}
function fcFinishKPI(cx){const g=Math.round((cx.pEF-cx.target)/DAY);return kpi(fT(cx.pEF),`Forecast finish (${g>0?g+' days late':'on time'} vs ${fT(cx.target)})`,g>0?'bad':'good')}

/* ---------- overview ---------- */
V.overview=()=>{const p=P(),cx=C(),o=cx.ov,e=evm(p,cx,'O');
  const crit=p.acts.filter(a=>cx.S[a.id].st!=='done'&&cx.S[a.id].TF<0).sort((a,b)=>cx.S[a.id].TF-cx.S[b.id].TF);
  const rows='EPC'.split('').map(d=>{const x=cx.disc[d];return `<tr><td><b style="color:${DC[d]}">■</b> ${DN[d]}</td><td class="n">${pc(wNorm(p,d),0)}</td><td class="n">${pc(x.plan)}</td><td class="n">${pc(x.act)}</td><td class="n">${sg((x.act-x.plan)*100,1,'%')}</td><td style="width:28%">${pbar(x.act,x.plan)}</td><td class="n">${nf(evm(p,cx,d).SPI)}</td><td class="n">${nf(evm(p,cx,d).CPI)}</td><td class="d">${fT(x.fin)}</td></tr>`}).join('');
  return hdr('Overall project status')+`
  <div class="kpis">${kpi(pc(o.plan),'Planned progress','')}${kpi(pc(o.act),'Actual progress','good')}${kpi(((o.act-o.plan)*100).toFixed(1)+'%','Variance',o.act<o.plan?'bad':'good')}
  ${kpi(nf(e.SPI),'SPI (cost-weighted)',e.SPI<1?'bad':'good')}${kpi(nf(e.CPI),'CPI',e.CPI<1?'bad':'good')}${fcFinishKPI(cx)}</div>
  <div class="fig" id="ovS"></div>${legend([['var(--plan)','Planned',1],['var(--act)','Actual'],['var(--fc)','Forecast',1]])}
  <h2>E, P, C summary (weighted as in the overall S-curve report)</h2>
  <div class="scroll"><table><thead><tr><th>Description</th><th class="n">Weightage</th><th class="n">Planned %</th><th class="n">Actual %</th><th class="n">Variance</th><th>Progress (line = plan)</th><th class="n">SPI</th><th class="n">CPI</th><th>Forecast finish</th></tr></thead>
  <tbody>${rows}<tr class="l0"><td>Total</td><td class="n">100%</td><td class="n">${pc(o.plan)}</td><td class="n">${pc(o.act)}</td><td class="n">${sg((o.act-o.plan)*100,1,'%')}</td><td>${pbar(o.act,o.plan)}</td><td class="n">${nf(e.SPI)}</td><td class="n">${nf(e.CPI)}</td><td class="d">${fT(cx.pEF)}</td></tr></tbody></table></div>
  <div class="grid2"><div><h2>Project details</h2><table><tbody>
   ${[['Project code',p.code],['Client',p.client],['Consultant',p.consultant],['Location',p.location],['Start',fD(p.start)],['Contractual completion (CDD)',fD(p.cdd)],['Planned / revised completion',fD(p.finish)],['Budget at completion',nf(e.BAC)+' '+p.currency],['Activities',p.acts.length]].map(([k,v])=>`<tr><td>${esc(k)}</td><td><b>${esc(v)}</b></td></tr>`).join('')}</tbody></table></div>
  <div><h2>Most delayed open activities (negative float)</h2>${crit.length?`<table><thead><tr><th>ID</th><th>Activity</th><th class="n">Float (d)</th></tr></thead><tbody>${crit.slice(0,9).map(a=>`<tr><td>${a.id}</td><td>${esc(a.name.slice(0,70))}</td><td class="n neg">${cx.S[a.id].TF}</td></tr>`).join('')}</tbody></table><p class="note">${crit.length} open activities finish after the planned completion date. See Crashing &amp; fast-tracking.</p>`:'<div class="callout ok">No open activity has negative float.</div>'}</div></div>`};
V.overview.after=()=>{const p=P(),cx=C(),c=curves(p,'O',cx);
  lineChart('ovS',{x0:c.M[0]-30*DAY,x1:c.M[c.M.length-1],series:[{pts:c.plan,color:'var(--plan)',dash:'6 4',end:'Plan '+pc(cx.ov.plan,0)},{pts:c.fc,color:'var(--fc)',dash:'3 4'},{pts:c.act,color:'var(--act)',w:3.5,end:'Actual '+pc(cx.ov.act,0)}],
    marks:[{t:cx.d0,label:'Data date',c:'var(--ink)'},{t:td(p.cdd),label:'CDD',dy:14},{t:td(p.finish),label:'Planned finish',dy:28}]})};

/* ---------- registration ---------- */
V.register=()=>{const p=P(),ed=can('admin');
  const cards=DB.projects.map(x=>`<div class="pcard ${x.id===p.id?'on':''}" data-pid="${esc(x.id)}" tabindex="0"><b>${esc(x.name)}</b><div class="note">${esc(x.code||'')} · ${esc(x.client||'')} · ${x.acts.length} activities<br>${fD(x.start)} → ${fD(x.finish)}</div></div>`).join('');
  const l2s=d=>[...new Set(p.acts.filter(a=>a.d===d).map(a=>a.l2))];
  const f=(k,l,t='text',v=p[k])=>`<label class="f">${l}<input name="${k}" type="${t}" value="${esc(v??'')}" ${ed?'':'disabled'} ${t==='number'?'step="any"':''}></label>`;
  return hdr('Projects & registration')+`
  <div class="tools">${ed?'<button class="pri" id="newP">Register new project</button><button id="addSample">Add a copy of the starter project</button>':''}${ME.role==='admin'?'<a class="btn" href="#users">Manage users</a>':''}</div>
  <div class="cards">${cards}</div>
  <h2>Project registration: ${esc(p.name)}</h2>${ed?'':'<p class="note">Only an administrator can change project details.</p>'}
  <form id="pf"><div class="form">${f('name','Project name')}${f('code','Project / SO code')}${f('client','Client')}${f('consultant','Consultant / PMC')}${f('location','Location')}${f('currency','Currency unit')}
  ${f('start','Start date','date')}${f('cdd','Contractual completion (CDD)','date')}${f('finish','Planned / revised completion','date')}${f('dataDate','Data date (status date)','date')}
  ${f('wE','Engineering weightage %','number',r2(p.weights.E*100))}${f('wP','Procurement weightage %','number',r2(p.weights.P*100))}${f('wC','Construction weightage %','number',r2(p.weights.C*100))}${f('acFactor','Default AC / EV factor (for seeding)','number',p.acFactor??1)}</div>
  ${'EPC'.split('').map(d=>l2s(d).length?`<h3>${DN[d]} L2 category weightages and chainage zones</h3><div class="scroll"><table><thead><tr><th>L2 category</th><th class="n">Weightage % (blank = by cost)</th>${d==='C'?'<th class="n">Chainage from (m)</th><th class="n">Chainage to (m)</th>':''}</tr></thead><tbody>${l2s(d).map(c=>{const z=(p.zones||{})[c]||(p.acts.find(a=>a.l2===c&&a.ch)||{}).ch||['',''];return `<tr><td>${esc(c)}</td><td class="n"><input class="q" data-cw="${d}" data-l2="${esc(c)}" type="number" step="any" value="${p.catW?.[d]?.[c]!=null?r2(p.catW[d][c]*100):''}" ${ed?'':'disabled'}></td>${d==='C'?`<td class="n"><input class="q" data-z0="${esc(c)}" type="number" value="${esc(z[0])}" ${ed?'':'disabled'}></td><td class="n"><input class="q" data-z1="${esc(c)}" type="number" value="${esc(z[1])}" ${ed?'':'disabled'}></td>`:''}</tr>`}).join('')}</tbody></table></div>`:'').join('')}
  ${ed?'<div class="tools" style="margin-top:12px"><button class="go" type="submit">Save project</button><button type="button" id="delP">Delete project</button></div>':''}</form>
  <p class="note">${esc(p.notes||'')}</p>`};
V.register.after=()=>{
  $$('[data-pid]').forEach(el=>el.onclick=el.onkeydown=e=>{if(e.type==='keydown'&&e.key!=='Enter')return;DB.active=el.dataset.pid;save();route()});
  const pf=$('#pf');if(!pf)return;
  pf.onsubmit=e=>{e.preventDefault();const p=P(),fd=new FormData(pf);
    for(const k of ['name','code','client','consultant','location','currency','start','cdd','finish','dataDate'])p[k]=fd.get(k)||p[k];
    const w={E:+fd.get('wE')||0,P:+fd.get('wP')||0,C:+fd.get('wC')||0},t=w.E+w.P+w.C||1;p.weights={E:w.E/t,P:w.P/t,C:w.C/t};p.acFactor=+fd.get('acFactor')||1;
    p.catW={};$$('[data-cw]').forEach(i=>{if(i.value!==''){(p.catW[i.dataset.cw]=p.catW[i.dataset.cw]||{})[i.dataset.l2]=+i.value/100}});
    for(const d in p.catW){const s=sum(Object.values(p.catW[d]));if(s)for(const k in p.catW[d])p.catW[d][k]/=s}
    p.zones=p.zones||{};$$('[data-z0]').forEach(i=>{const c=i.dataset.z0,z1=$$('[data-z1]').find(x=>x.dataset.z1===c);if(i.value!==''&&z1.value!=='')p.zones[c]=[+i.value,+z1.value]});
    save();toast('Project saved');route()};
  $('#newP')&&($('#newP').onclick=()=>{const id='p'+Date.now().toString(36),t=ds(Date.now());
    DB.projects.push({id,name:'New project',code:'',client:'',consultant:'',location:'',currency:'INR lakh',contractValue:0,start:t,finish:addD(t,365),cdd:addD(t,365),dataDate:t,weights:{E:.2,P:.5,C:.3},catW:{},zones:{},resCap:{},acFactor:1,acts:[],snaps:[],notes:''});
    DB.active=id;save();route();toast('New project registered: fill in its details, then add activities in Schedule or import a CSV in Export')});
  $('#addSample')&&($('#addSample').onclick=()=>{const s=seed();s.id='p'+Date.now().toString(36);s.name+=' (copy)';DB.projects.push(s);DB.active=s.id;save();route()});
  $('#delP')&&($('#delP').onclick=()=>dialog('Delete project',`<p>Delete <b>${esc(P().name)}</b> and all its activities from this browser? This cannot be undone unless you exported a backup.</p>`,[['Delete',()=>{DB.projects=DB.projects.filter(x=>x!==P());if(!DB.projects.length)DB.projects.push(seed());DB.active=DB.projects[0].id;save();$('#dlg').close();route()},'pri']]))};

/* ---------- users ---------- */
V.users=()=>{if(ME.role!=='admin')return hdr('Users')+'<p>Only administrators can manage users.</p><div class="card"><h3>Change my password</h3><div class="form"><label class="f">New password<input id="np1" type="password"></label></div><button class="go" id="cpw">Change password</button></div>';
  return hdr('Organization & users')+`<div class="card"><h2 style="margin-top:0">Organization details</h2>${DB.org?'':'<div class="callout">Add your organization name. Its logo is found online.</div>'}${orgForm(DB.org||{},'uo')}<button class="go" id="orgS">Save organization</button></div>
  <h2>Users</h2><p class="note">Admin: everything, including projects and users. Planner: progress updates and schedule edits. Viewer: read-only reports. Accounts live in this browser.</p>
  <table><thead><tr><th>User name</th><th>Name</th><th>Designation</th><th>Role</th><th></th></tr></thead><tbody>${DB.users.map((u,i)=>`<tr><td>${esc(u.u)}</td><td>${esc(u.name)}</td><td>${esc(u.desig||'')}</td><td>${esc(u.role)}</td><td><button data-rp="${i}">Reset password</button> ${u.u!==ME.u?`<button data-du="${i}">Remove</button>`:''}</td></tr>`).join('')}</tbody></table>
  <div class="card" style="margin-top:16px"><h3>Add user</h3><div class="form"><label class="f">User name<input id="nu"></label><label class="f">Full name<input id="nn"></label><label class="f">Designation<input id="nd"></label><label class="f">Role<select id="nr"><option value="viewer">Viewer</option><option value="planner">Planner</option><option value="admin">Admin</option></select></label><label class="f">Password<input id="np" type="password"></label></div><button class="go" id="au">Add user</button></div>
  <div class="card"><h3>Change my password</h3><div class="form"><label class="f">New password<input id="np1" type="password"></label></div><button class="go" id="cpw">Change password</button></div>`};
V.users.after=()=>{
  const setPw=async(u,pw)=>{u.salt=Math.random().toString(36).slice(2);u.h=await hash(u.salt+pw);u.must=false;save()};
  $('#cpw').onclick=async()=>{const pw=$('#np1').value;if(pw.length<6)return toast('Use at least 6 characters');await setPw(DB.users.find(u=>u.u===ME.u),pw);toast('Password changed');$('#np1').value=''};
  if(ME.role!=='admin')return;
  delete LOGO.uo;bindLogo('uo',DB.org);{const k=logoPicker('uo',()=>$('#uo_name')?.value||'');const n=$('#uo_name');if(n&&k)n.oninput=k;}
  $('#orgS').onclick=()=>{const o=readOrg('uo');if(!o.name)return toast('Organization name is required');DB.org={...(DB.org||{}),...o};save();toast('Organization saved');route()};
  $('#au').onclick=async()=>{const u=$('#nu').value.trim().toLowerCase(),pw=$('#np').value;if(!u||pw.length<6)return toast('Enter a user name and a password of 6+ characters');
    if(DB.users.some(x=>x.u===u))return toast('That user name exists');const x={u,name:$('#nn').value||u,desig:$('#nd').value,role:$('#nr').value};DB.users.push(x);await setPw(x,pw);route();toast('User added')};
  $$('[data-du]').forEach(b=>b.onclick=()=>{DB.users.splice(+b.dataset.du,1);save();route()});
  $$('[data-rp]').forEach(b=>b.onclick=()=>dialog('Reset password',`<label class="f">New password for ${esc(DB.users[+b.dataset.rp].u)}<input id="rpw" type="password"></label>`,[['Save',async()=>{const pw=$('#rpw').value;if(pw.length<6)return toast('Use at least 6 characters');await setPw(DB.users[+b.dataset.rp],pw);$('#dlg').close();toast('Password reset')},'go']]))};

/* ---------- progress update ---------- */
let UPD={d:'C',q:'',l2:'',open:true};
V.update=()=>{const p=P(),cx=C(),ed=can('edit'),d=UPD.d;
  let A=p.acts.filter(a=>a.d===d&&(!UPD.l2||a.l2===UPD.l2)&&(!UPD.q||(a.id+' '+a.name+' '+a.l3).toLowerCase().includes(UPD.q.toLowerCase()))&&(!UPD.open||(a.pct||0)<1));
  const l2s=[...new Set(p.acts.filter(a=>a.d===d).map(a=>a.l2))];
  const dis=ed?'':'disabled';const inp=(a,f,t='date',cls='')=>`<input type="${t}" class="${cls}" data-a="${a.id}" data-f="${f}" value="${esc(a[f]??'')}" ${dis} ${t==='number'?'step="any"':''}>`;
  const rsel=a=>`<select data-a="${a.id}" data-f="reason" ${dis}>${REASONS.map(r=>`<option ${a.reason===r?'selected':''}>${esc(r)}</option>`).join('')}</select>`;
  let head,body;
  if(d==='E'){head='<th>ID</th><th>Drawing / document</th><th>Doc no.</th><th>Status</th><th>Actual 1st submission</th><th>Actual approval</th><th>Forecast approval</th><th class="n">%</th><th>Actual cost</th><th>Delay reason</th>';
    body=A.map(a=>`<tr><td>${a.id}</td><td>${esc(a.name)}</td><td>${esc(a.docNo||'')}</td><td><select data-a="${a.id}" data-f="status" ${dis}>${ENG_ST.map(s=>`<option ${a.status===s?'selected':''}>${s}</option>`).join('')}</select></td>
    <td><input type="date" data-a="${a.id}" data-f="sub" value="${esc(a.steps?.[0]?.[2]||'')}" ${dis}></td><td><input type="date" data-a="${a.id}" data-f="app" value="${esc(a.steps?.[1]?.[2]||'')}" ${dis}></td><td>${inp(a,'ff')}</td><td class="n" data-pc="${a.id}">${pc(a.pct,0)}</td><td>${inp(a,'ac','number','q')}</td><td>${rsel(a)}</td></tr>`).join('')}
  else if(d==='P'){head='<th>ID</th><th>Item</th><th>Vendor</th><th>Last milestone achieved</th><th>Date achieved</th><th>Forecast finish</th><th class="n">%</th><th>Actual cost</th><th>Delay reason</th>';
    body=A.map(a=>{const k=(a.steps||[]).filter(s=>s[2]).length;return `<tr><td>${a.id}</td><td>${esc(a.name)}</td><td>${esc(a.l3)}</td><td><select data-a="${a.id}" data-f="ms" ${dis}><option value="0">None</option>${MS.map((m,i)=>`<option value="${i+1}" ${k===i+1?'selected':''}>${i+1}. ${m}</option>`).join('')}</select></td>
    <td><input type="date" data-a="${a.id}" data-f="msd" value="${esc(k?a.steps[k-1][2]:'')}" ${dis}></td><td>${inp(a,'ff')}</td><td class="n" data-pc="${a.id}">${pc(a.pct,0)}</td><td>${inp(a,'ac','number','q')}</td><td>${rsel(a)}</td></tr>`}).join('')}
  else{head='<th>ID</th><th>L2</th><th>Activity</th><th class="n">Scope</th><th>Actual qty to date</th><th class="n">%</th><th>Actual start</th><th>Actual finish</th><th>Forecast finish</th><th>Actual cost</th><th>Delay reason</th>';
    body=A.map(a=>`<tr><td>${a.id}</td><td>${esc(a.l2)}</td><td title="${esc(a.name)}">${esc(a.l3)}: ${esc(a.name.slice(0,60))}</td><td class="n">${nf(a.qty,0)} ${esc(a.uom)}</td><td><input type="number" step="any" class="q" data-a="${a.id}" data-f="aq" value="${r2((a.pct||0)*a.qty)}" ${dis}></td><td class="n" data-pc="${a.id}">${pc(a.pct,0)}</td><td>${inp(a,'as')}</td><td>${inp(a,'af')}</td><td>${inp(a,'ff')}</td><td>${inp(a,'ac','number','q')}</td><td>${rsel(a)}</td></tr>`).join('')}
  return hdr('Progress update',DN[d])+`
  ${ed?'':'<div class="callout">Your role is viewer: progress fields are read-only.</div>'}
  <div class="tools">${'EPC'.split('').map(x=>`<button class="${x===d?'pri':''}" data-ud="${x}">${DN[x]}</button>`).join('')}
   <select id="ul2"><option value="">All L2 categories</option>${l2s.map(c=>`<option ${UPD.l2===c?'selected':''}>${esc(c)}</option>`).join('')}</select>
   <input id="uq" placeholder="Search activity" value="${esc(UPD.q)}"><label><input type="checkbox" id="uo" ${UPD.open?'checked':''}> Open items only</label></div>
  <div class="card"><div class="tools" style="margin:0"><label class="f">Data date<input type="date" id="udd" value="${esc(p.dataDate)}" ${dis}></label>
   <div style="flex:1;min-width:200px"><b>${DN[d]}: ${pc(cx.disc[d].act)}</b> actual vs ${pc(cx.disc[d].plan)} planned · Overall ${pc(cx.ov.act)}</div>
   ${ed?'<button class="go" id="snap">Record period snapshot</button>':''}</div>
   <p class="note" style="margin-bottom:0">Edits save as you type. "Record period snapshot" stores E, P, C and overall progress at the data date, which builds the actual S-curve and the SPI/CPI trend.</p></div>
  <p class="note">${A.length} activities shown.</p>
  <div class="scroll" style="max-height:70vh"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`};
V.update.after=()=>{
  $$('[data-ud]').forEach(b=>b.onclick=()=>{UPD.d=b.dataset.ud;UPD.l2='';route()});
  $('#ul2').onchange=e=>{UPD.l2=e.target.value;route()};$('#uq').onchange=e=>{UPD.q=e.target.value;route()};$('#uo').onchange=e=>{UPD.open=e.target.checked;route()};
  const p=P();
  $('#udd').onchange=e=>{if(e.target.value){p.dataDate=e.target.value;save();route()}};
  $('#snap')&&($('#snap').onclick=()=>{const cx=C();p.snaps=(p.snaps||[]).filter(s=>s.date!==p.dataDate);
    p.snaps.push({date:p.dataDate,E:r4(cx.disc.E.act),P:r4(cx.disc.P.act),C:r4(cx.disc.C.act),ac:{E:cx.disc.E.AC,P:cx.disc.P.AC,C:cx.disc.C.AC}});p.snaps.sort((a,b)=>td(a.date)-td(b.date));save();toast('Snapshot recorded for '+fD(p.dataDate))});
  $$('main [data-a]').forEach(el=>el.onchange=()=>{const a=p.acts.find(x=>x.id===el.dataset.a),f=el.dataset.f,v=el.value;
    if(f==='status'){a.status=v;a.pct=ENG_PCT[v]??a.pct;if(a.pct>=1&&!a.steps[1][2])a.steps[1][2]=p.dataDate;if(a.pct>0&&!a.steps[0][2])a.steps[0][2]=p.dataDate}
    else if(f==='sub'){a.steps[0][2]=v||null;if(v&&a.pct<.5){a.pct=.5;a.status='First Submission'}}
    else if(f==='app'){a.steps[1][2]=v||null;if(v){a.pct=1;a.status='Approved';a.af=v}}
    else if(f==='ms'||f==='msd'){const row=el.closest('tr'),k=+row.querySelector('[data-f=ms]').value,dt=row.querySelector('[data-f=msd]').value||p.dataDate;
      a.steps.forEach((s,i)=>{if(i<k){if(!s[2]||i===k-1)s[2]=i===k-1?dt:(s[2]||dt)}else s[2]=null});a.pct=r4(sum(MSW.slice(0,k)));a.status=k?MS[k-1]:'Enquiry not floated';a.af=k===10?dt:null;a.as=a.steps[0][2]||null}
    else if(f==='aq'){a.pct=a.qty?clamp((+v||0)/a.qty):0;if(a.pct>=1&&!a.af)a.af=p.dataDate;if(a.pct<1)a.af=null}
    else if(f==='ac')a.ac=+v||0;
    else a[f]=v||null;
    if(a.d==='E'){a.as=a.steps[0][2]?addD(a.steps[0][2],-15):a.as;a.af=a.pct>=1?(a.steps[1][2]||a.af||p.dataDate):null}
    if(f==='af'&&v){a.pct=1}
    if(a.pct>0&&!a.as)a.as=p.dataDate;
    save();const c=$(`[data-pc="${a.id}"]`);if(c)c.textContent=pc(a.pct,0);
    if(['aq','status','ms','msd','af','app','sub'].includes(f)){const row=el.closest('tr');const q=row.querySelector('[data-f=aq]');if(q&&f!=='aq')q.value=r2(a.pct*a.qty);const af=row.querySelector('[data-f=af]');if(af)af.value=a.af||''}
    toast('Saved '+a.id)})};
const r4=v=>Math.round(v*1e4)/1e4;
