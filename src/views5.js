/* ---------- auto-scheduling: PO date -> delivery date ---------- */
const TPL={
 'Electrical / power distribution EPC':[
  ['HT switchgear','Sub-station',90,20,12],['Distribution transformers','Sub-station',120,15,15],['LT panels & distribution boards','Station building',75,30,12],
  ['UPS, battery & DC system','Station building',60,10,6],['HT & LT power cables','Site-wide',45,60,18],['Lighting fixtures & poles','Platforms & yard',45,45,14],
  ['Earthing & lightning protection','Site-wide',30,30,5],['Cable trays, raceways & conduits','Site-wide',30,40,8],['Fire alarm & safety equipment','Station building',45,20,10]],
 'Mechanical / process plant EPC':[
  ['Pumps & drives','Process area',120,20,15],['Tanks & vessels','Process area',150,30,18],['Piping & valves','Process area',60,90,20],['Structural steel','Pipe rack',45,60,12],
  ['Instrumentation & control','Control room',90,40,15],['Electrical package','MCC room',90,40,12],['Insulation & painting','Process area',30,45,8]],
 'Blank: add your own packages':[['Package 1','Site',60,30,100]]};
let AS=null;
function asDefaults(){const p=P();return {target:p.acts.length?'new':'cur',name:'',code:'',po:p.dataDate||ds(Date.now()),del:addD(p.dataDate||ds(Date.now()),365),value:1000,
  split:{E:5,P:65,C:30},tpl:Object.keys(TPL)[0],pk:TPL[Object.keys(TPL)[0]].map(r=>r.slice()),fit:true,minPct:50,overlap:false,
  d:{kick:7,basic:30,spec:20,enq:30,dwg:15,appr:21,transit:15,mob:15,test:15,comm:15,hand:7}}}
function asBuild(o){// returns {acts, info}
  const A=[],id=(d,n)=>`${d}${String(n).padStart(3,'0')}`;let nE=0,nP=0,nC=0;const D=o.d,V=+o.value||0,pkSum=sum(o.pk,r=>+r[4]||0)||1;
  const add=(d,l2,l3,name,dur,preds=[],x={})=>{const a={id:id(d,d==='E'?++nE:d==='P'?++nP:++nC),d,l2,l3,name,ps:o.po,pf:addD(o.po,dur),fs:null,ff:null,as:null,af:null,pct:0,cost:0,ac:0,qty:1,uom:'Lot',prof:'Linear',res:'',crew:1,preds,reason:'',...x};A.push(a);return a};
  const M=(d,name,preds)=>add(d,'Milestones','Key milestones',name,0,preds,{ms:true,uom:'Milestone'});
  const m0=M('E','PO / LOA received',[]);
  const kick=add('E','General engineering','Project set-up','Kick-off meeting & site survey',D.kick,[[m0.id,'FS',0]],{res:'Design engineer',crew:1});
  const basic=add('E','General engineering','Basic engineering','Basic engineering: SLD, layouts, design basis',D.basic,[[kick.id,'FS',0]],{res:'Design engineer',crew:2});
  const mob=add('C','Site establishment','Mobilisation','Mobilisation & site establishment',D.mob,[[m0.id,'FS',D.kick]],{res:'Civil / erection crew',crew:1});
  const Eend=[],Pend=[],Cend=[];
  o.pk.forEach(r=>{const [nm,area,lead,inst,val]=r;const w=(+val||0)/pkSum;
    const spec=add('E','Package engineering',nm,`Datasheet & technical specification: ${nm}`,D.spec,[[basic.id,o.overlap?'SS':'FS',o.overlap?Math.round(D.basic/2):0]],{res:'Design engineer',crew:.5});
    const pDur=D.enq+D.dwg+D.appr+(+lead)+D.transit;
    const pr=add('P','Equipment & materials',nm,`Supply: ${nm} (enquiry → material at site)`,pDur,[[spec.id,'FS',0]],{res:'Buyer / expediter',crew:.1,uom:'Lot'});
    const appr=add('E','Package engineering',nm,`Vendor drawing review & approval: ${nm}`,D.appr,[[pr.id,'SS',D.enq+D.dwg]],{res:'Design engineer',crew:.5});
    const ins=add('C',area||'Site',nm,`Installation: ${nm}`,+inst,[[pr.id,'FS',0],[mob.id,'FS',0]],{res:/cable|tray|earth|piping|steel/i.test(nm)?'Cable laying gang':'Electrician gang',crew:2});
    const tst=add('C',area||'Site',nm,`Testing & pre-commissioning: ${nm}`,Math.max(3,Math.round(+inst/4)),[[ins.id,'FS',0]],{res:'Testing team',crew:1});
    spec.cost=V*o.split.E/100*w*.4;appr.cost=V*o.split.E/100*w*.4;pr.cost=V*o.split.P/100*w;ins.cost=V*o.split.C/100*w*.85;tst.cost=V*o.split.C/100*w*.15;
    pr._off=[0,7,14,D.enq,D.enq+D.dwg,D.enq+D.dwg+D.appr,D.enq+D.dwg+D.appr+(+lead),pDur,pDur+12,pDur+30];
    Eend.push(appr,spec);Pend.push(pr);Cend.push(tst)});
  basic.cost=V*o.split.E/100*.15;kick.cost=V*o.split.E/100*.05;mob.cost=V*o.split.C/100*.02;
  const mEng=M('E','Engineering complete',Eend.map(a=>[a.id,'FS',0]));
  const mMat=M('P','All material at site',Pend.map(a=>[a.id,'FS',0]));
  const mMech=M('C','Mechanical completion',Cend.map(a=>[a.id,'FS',0]));
  const comm=add('C','Commissioning','Integrated testing','Integrated testing & commissioning',D.comm,[[mMech.id,'FS',0]],{res:'Testing team',crew:2,cost:V*o.split.C/100*.02});
  const hand=add('C','Commissioning','Handover','Handover, as-built drawings & documentation',D.hand,[[comm.id,'FS',0]],{res:'Design engineer',crew:1,cost:V*o.split.C/100*.01});
  M('C','Project completion / delivery',[[hand.id,'FS',0]]);
  return A}
function asSchedule(o,acts){// CPM from PO date; compress to fit delivery
  const tmp={...P(),start:o.po,finish:o.del,cdd:o.del,dataDate:o.po,acts,catW:{},snaps:[]};
  const base=acts.map(a=>dd(a.pf,a.ps));let f=1,cx=compute(tmp),it=0;const need=Math.round((cx.pEF-td(o.po))/DAY),avail=dd(o.del,o.po);
  if(o.fit&&need>avail){let lo=o.minPct/100,hi=1;for(it=0;it<18;it++){const m=(lo+hi)/2;acts.forEach((a,i)=>{if(!a.ms){a.pf=addD(a.ps,Math.max(1,Math.round(base[i]*m)))}});
      cx=compute(tmp);if(cx.pEF<=td(o.del))lo=m;else hi=m}
    f=lo;acts.forEach((a,i)=>{if(!a.ms)a.pf=addD(a.ps,Math.max(1,Math.round(base[i]*f)))});cx=compute(tmp)}
  acts.forEach(a=>{const x=cx.S[a.id];a.ps=ds(x.ES);a.pf=ds(x.EF);if(a._off){a.steps=MS.map((n,i)=>[n,ds(Math.min(x.EF,x.ES+Math.round(a._off[i]*f)*DAY)),null,null]);delete a._off}});
  return {need,avail,f,fin:cx.pEF,fits:cx.pEF<=td(o.del)}}
V.autoschedule=()=>{if(!AS)AS=asDefaults();const o=AS,ed=can('edit');
  const n=(k,l,v,sub)=>`<label class="f">${l}<input type="number" step="any" data-as="${sub?sub+'.':''}${k}" value="${esc(v)}"></label>`;
  return hdr('Auto-schedule: PO date to delivery')+`
  <p class="note">Builds a complete EPC schedule from the PO / LOA date: engineering, procurement and construction for each package, linked with logic, with key milestones. With "fit to delivery date" on, durations are compressed (down to the minimum you allow) so completion falls on or before the delivery date. The result opens in Schedule and exports to Microsoft Project.</p>
  ${ed?'':'<div class="callout">Viewers cannot generate schedules.</div>'}
  <div class="card"><h2 style="margin-top:0">1. Project and dates</h2><div class="form">
   <label class="f">Create in<select data-as="target"><option value="new" ${o.target==='new'?'selected':''}>A new project</option><option value="cur" ${o.target==='cur'?'selected':''}>Current project (replaces its activities): ${esc(P().name)}</option></select></label>
   <label class="f">Project name<input data-as="name" value="${esc(o.name)}"></label><label class="f">Project / PO number<input data-as="code" value="${esc(o.code)}"></label>
   <label class="f">PO / LOA date (schedule start)<input type="date" data-as="po" value="${esc(o.po)}"></label><label class="f">Delivery / completion date<input type="date" data-as="del" value="${esc(o.del)}"></label>
   ${n('value','Contract value ('+esc(P().currency||'INR lakh')+')',o.value)}${n('E','Engineering % of value',o.split.E,'split')}${n('P','Procurement % of value',o.split.P,'split')}${n('C','Construction % of value',o.split.C,'split')}</div>
   <div class="tools"><label><input type="checkbox" data-as="fit" ${o.fit?'checked':''}> Fit completion within the delivery date</label>${n('minPct','Minimum duration when compressing (%)',o.minPct)}
   <label><input type="checkbox" data-as="overlap" ${o.overlap?'checked':''}> Fast-track: start package specifications halfway through basic engineering</label></div></div>
  <div class="card"><h2 style="margin-top:0">2. EPC breakdown: packages</h2>
   <div class="tools"><label>Template <select id="asT">${Object.keys(TPL).map(k=>`<option ${o.tpl===k?'selected':''}>${esc(k)}</option>`).join('')}</select></label><button id="asAdd">Add package</button></div>
   <table><thead><tr><th>Package (L3)</th><th>Site area (construction L2)</th><th class="n">Manufacturing lead time (d)</th><th class="n">Installation (d)</th><th class="n">Share of value (%)</th><th></th></tr></thead><tbody>
   ${o.pk.map((r,i)=>`<tr><td><input data-pk="${i}.0" value="${esc(r[0])}"></td><td><input data-pk="${i}.1" value="${esc(r[1])}"></td><td><input class="q" type="number" data-pk="${i}.2" value="${r[2]}"></td><td><input class="q" type="number" data-pk="${i}.3" value="${r[3]}"></td><td><input class="q" type="number" data-pk="${i}.4" value="${r[4]}"></td><td><button data-pkdel="${i}" aria-label="Remove package">Remove</button></td></tr>`).join('')}</tbody></table></div>
  <div class="card"><h2 style="margin-top:0">3. Standard durations (days)</h2><div class="form">
   ${[['kick','Kick-off & site survey'],['basic','Basic engineering'],['spec','Datasheet / specification per package'],['enq','Enquiry → PO release'],['dwg','PO → vendor drawing submission'],['appr','Drawing review & approval'],['transit','Dispatch & transit'],['mob','Site mobilisation'],['comm','Integrated testing & commissioning'],['hand','Handover & documentation']].map(([k,l])=>n(k,l,o.d[k],'d')).join('')}</div></div>
  ${ed?'<div class="tools"><button class="go" id="asGo">Generate schedule</button></div>':''}<div id="asOut"></div>`};
V.autoschedule.after=()=>{const o=AS;
  $$('[data-as]').forEach(el=>el.onchange=()=>{const k=el.dataset.as,v=el.type==='checkbox'?el.checked:el.type==='number'?+el.value:el.value;if(k.includes('.')){const [a,b]=k.split('.');o[a][b]=v}else o[k]=v});
  $$('[data-pk]').forEach(el=>el.onchange=()=>{const [i,j]=el.dataset.pk.split('.').map(Number);o.pk[i][j]=j>=2?+el.value:el.value});
  $$('[data-pkdel]').forEach(b=>b.onclick=()=>{o.pk.splice(+b.dataset.pkdel,1);route()});
  $('#asAdd').onclick=()=>{o.pk.push(['New package','Site',60,30,10]);route()};
  $('#asT').onchange=e=>{o.tpl=e.target.value;o.pk=TPL[o.tpl].map(r=>r.slice());route()};
  $('#asGo')&&($('#asGo').onclick=()=>{
    if(!o.po||!o.del||td(o.del)<=td(o.po))return toast('Delivery date must be after the PO date');if(!o.pk.length)return toast('Add at least one package');if(o.target==='new'&&!String(o.name||'').trim())return toast('Enter the project name');
    const acts=asBuild(o),r=asSchedule(o,acts);let p;
    if(o.target==='cur'){p=P();p.acts=acts;p.snaps=[];Object.assign(p,{start:o.po,finish:o.del,cdd:o.del,dataDate:o.po,poDate:o.po})}
    else{p={id:'p'+Date.now().toString(36),name:o.name||'New EPC project',code:o.code||'',client:'',consultant:'',location:'',currency:P().currency||'INR lakh',contractValue:+o.value||0,
      start:o.po,poDate:o.po,finish:o.del,cdd:o.del,dataDate:o.po,weights:{E:.2,P:.5,C:.3},catW:{},zones:{},resCap:{'Design engineer':4,'Buyer / expediter':2,'Electrician gang':8,'Cable laying gang':4,'Civil / erection crew':3,'Testing team':2},acFactor:1,acts,snaps:[],notes:'Generated by auto-schedule from the PO date.'};DB.projects.push(p)}
    p.contractValue=+o.value||p.contractValue;DB.active=p.id;save();const cx=C();
    $('#asOut').innerHTML=`<div class="callout ${r.fits?'ok':''}"><b>${acts.length} activities and ${acts.filter(a=>a.ms).length} milestones created.</b> The uncompressed logic needs ${r.need} days; ${r.avail} days are available from PO to delivery.
     ${r.f<1?` Durations were compressed to ${Math.round(r.f*100)}% to fit.`:''} Forecast completion <b>${fT(r.fin)}</b> ${r.fits?'is within':'is <b>after</b>'} the delivery date ${fD(o.del)}.${r.fits?'':' Lower the minimum duration, enable fast-tracking, shorten lead times, or agree a later delivery date.'}</div>
     <div class="tools"><a class="btn" href="#schedule">Open in Schedule</a><button class="go" id="asX5">Download MS Project XML (L5, with milestones)</button><button id="asX4">Download L4 (activities, logic, resources)</button></div>
     ${gantt(tree(p,cx,3),td(o.po)-10*DAY,Math.max(td(o.del),cx.pEF)+20*DAY,cx)}`;
    const dl=l=>download(`${(p.code||p.name).replace(/\W+/g,'_')}_L${l}.xml`,mspdi(p,C(),l,''),'application/xml');$('#asX5').onclick=()=>dl(5);$('#asX4').onclick=()=>dl(4);
    $('#railProj').textContent=p.name;toast('Schedule generated')})};
