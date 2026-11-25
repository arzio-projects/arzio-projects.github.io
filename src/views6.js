
/* ============ Excel (.xlsx / .xlsm) reader: zip + sheet XML, no library ============ */
async function xlsxOpen(buf){const u8=new Uint8Array(buf),dv=new DataView(buf);let e=u8.length-22;
  while(e>=0&&dv.getUint32(e,true)!==0x06054b50)e--;if(e<0)throw new Error('This is not an Excel .xlsx / .xlsm file (save it as .xlsx or .xlsm and try again)');
  const n=dv.getUint16(e+10,true);let o=dv.getUint32(e+16,true);const F={},td8=new TextDecoder();
  for(let i=0;i<n;i++){const m=dv.getUint16(o+10,true),cs=dv.getUint32(o+20,true),fl=dv.getUint16(o+28,true),xl=dv.getUint16(o+30,true),cl=dv.getUint16(o+32,true),lo=dv.getUint32(o+42,true);
    F[td8.decode(u8.subarray(o+46,o+46+fl))]={m,cs,lo};o+=46+fl+xl+cl}
  const get=async name=>{const f=F[name.replace(/^\//,'')];if(!f)return null;const lo=f.lo,fl=dv.getUint16(lo+26,true),xl=dv.getUint16(lo+28,true),d=u8.subarray(lo+30+fl+xl,lo+30+fl+xl+f.cs);
    if(f.m===0)return td8.decode(d);if(typeof DecompressionStream==='undefined')throw new Error('This browser cannot read Excel files. Use a current Chrome, Edge, Firefox or Safari.');
    return await new Response(new Blob([d]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).text()};
  const X=s=>new DOMParser().parseFromString(s,'application/xml');
  const wb=X(await get('xl/workbook.xml')),rels=X(await get('xl/_rels/workbook.xml.rels')||'<r/>'),R={};
  [...rels.getElementsByTagName('Relationship')].forEach(r=>R[r.getAttribute('Id')]=r.getAttribute('Target'));
  const sheets=[...wb.getElementsByTagName('sheet')].map(s=>{let t=R[s.getAttribute('r:id')]||'';t=t.startsWith('/')?t.slice(1):'xl/'+t.replace(/^\.\//,'');return {name:s.getAttribute('name'),path:t}});
  const ssx=await get('xl/sharedStrings.xml'),SS=ssx?[...X(ssx).getElementsByTagName('si')].map(si=>[...si.getElementsByTagName('t')].filter(t=>t.parentNode.nodeName!=='rPh').map(t=>t.textContent).join('')):[];
  const rows=async(sh,maxCol=80)=>{const doc=X(await get(sh.path)||'<x/>'),out=[];
    for(const r of doc.getElementsByTagName('row')){const ri=+r.getAttribute('r')-1,row=[];
      for(const c of r.getElementsByTagName('c')){const ref=c.getAttribute('r')||'',L=ref.replace(/\d+/g,'');let j=0;for(const ch of L)j=j*26+ch.charCodeAt(0)-64;j--;if(j<0||j>=maxCol)continue;
        const t=c.getAttribute('t'),v=c.getElementsByTagName('v')[0]?.textContent;let val=null;
        if(t==='s')val=SS[+v]??null;else if(t==='inlineStr')val=[...c.getElementsByTagName('t')].map(x=>x.textContent).join('');else if(t==='str'||t==='e')val=t==='e'?null:v;else if(t==='b')val=v==='1';else if(v!=null&&v!=='')val=+v;
        if(val!=null&&val!=='')row[j]=val}
      out[ri]=row}
    return out};
  return {sheets,SS,rows,raw:get}}
const xT=v=>typeof v==='string'?v.replace(/\s+/g,' ').trim():v==null?'':String(v);
const xD=v=>typeof v==='number'&&v>=32874&&v<80000?ds(Date.UTC(1899,11,30)+Math.round(v)*DAY):typeof v==='string'&&/^\d{4}-\d\d-\d\d/.test(v)?v.slice(0,10):null;
const xCol=(h,re,from=0)=>{for(let j=from;j<(h||[]).length;j++)if(re.test(xT(h[j])))return j;return -1};
function xHdr(rows,re,max=40){for(let i=0;i<Math.min(rows.length,max);i++){const r=rows[i]||[];for(let j=0;j<r.length;j++)if(typeof r[j]==='string'&&re.test(xT(r[j])))return [i,j]}return null}
const MON={jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11};
function xFileDate(rows){const h=xHdr(rows,/^(status |data |report )?date$/i,15);if(h){const v=xD((rows[h[0]]||[])[h[1]+1]);if(v)return v}
  for(let i=0;i<Math.min(rows.length,30);i++)for(const v of rows[i]||[]){const m=typeof v==='string'&&v.match(/as (of|on)\s*:?\s*(\d{1,2})[-\s./]([a-z]{3})[a-z]*[-\s./](\d{2,4})/i);
    if(m&&MON[m[3].toLowerCase()]!=null){const y=+m[4]<100?2000+ +m[4]:+m[4];return ds(Date.UTC(y,MON[m[3].toLowerCase()],+m[2]))}}return null}
/* sheets whose header row holds a keyword: cheap check on shared-string index before full parsing */
async function xFindSheets(x,re){const idx=x.SS.map((s,i)=>re.test(xT(s))?i:-1).filter(i=>i>=0),out=[];if(!idx.length)return out;
  for(const sh of x.sheets){const raw=await x.raw(sh.path);if(!raw)continue;if(idx.some(i=>raw.includes('t="s"><v>'+i+'</v>')))out.push(sh)}return out}
async function xCodeTable(x,re){const M={};for(const s of await xFindSheets(x,re)){const rows=await x.rows(s),H=xHdr(rows,re,60);if(!H)continue;
  for(let i=H[0]+1;i<rows.length;i++){const k=xT((rows[i]||[])[H[1]]),v=xT((rows[i]||[])[H[1]+1]);if(!k)break;if(v)M[k]=v}}return M}

/* ---------- DCI: Document Control Index (L&T style with revision blocks, or simple register) ---------- */
const DCI_H=/^(drawing|document) (description|title)$/i;
async function parseDCI(x){const out={items:[],sheets:[],date:null},sh=await xFindSheets(x,DCI_H),DISC=await xCodeTable(x,/^discipline code$/i);let rv=null;
  for(const s of await xFindSheets(x,/review period/i)){const rows=await x.rows(s),H=xHdr(rows,/review period/i,60);if(H&&typeof rows[H[0]][H[1]+1]==='number')rv=rows[H[0]][H[1]+1]}
  out.review=rv||14;
  for(const s of sh){const rows=await x.rows(s),H=xHdr(rows,DCI_H);if(!H)continue;const [hi,cD]=H,h=rows[hi],g=rows[hi-1]||[],g2=rows[hi-2]||[];
    out.date=out.date||xFileDate(rows);
    const c={sl:xCol(h,/^s\.? ?l\.?|^sr\.?|^s\.? ?no/i),st:xCol(h,/^status$/i),doc:xCol(h,/doc(ument)?\.? ?(number|no)/i),rev:xCol(h,/revision|submission rev/i),pur:xCol(h,/^purpose/i),cat:xCol(h,/^category$/i),sys:xCol(h,/^system/i),
      disc:xCol(h,/^disc/i),type:xCol(h,/^(doc(ument)? )?type$/i),eq:xCol(h,/^equipment|^tag/i),ps:xCol(h,/planned submission/i),sd:xCol(h,/^(actual )?submission date|^submitted on/i),rd:xCol(h,/response date|^approved on|approval date/i),due:xCol(h,/review due|forecast approval/i),rem:xCol(h,/^remarks/i)};
    if(c.cat<0)c.cat=xCol(h,/drawing category/i);
    const simple=c.ps>=0&&xCol(g,/first submission/i)<0&&xCol(g2,/first submission/i)<0;
    let sub=xCol(g,/first submission/i);if(sub<0)sub=xCol(g2,/first submission/i);if(sub<0&&!simple)sub=xCol(h,/^plan/i,cD);
    let app=xCol(g,/^approved$|^approval$|^final approval/i);if(app<0)app=xCol(g2,/^approved$|^approval$/i);
    if(app<0&&!simple){for(let j=h.length-1;j>cD;j--)if(/^plan/i.test(xT(h[j]))){app=j;break}}
    const tri=(r,j)=>j<0?[null,null,null]:[xD(r[j]),xD(r[j+1]),xD(r[j+2])],V=(r,j)=>j>=0?r[j]:null;let n=0;
    for(let i=hi+1;i<rows.length;i++){const r=rows[i];if(!r)continue;const desc=xT(r[cD]);if(!desc||desc.length<3)continue;
      const doc=c.doc>=0?xT(r[c.doc]):'';if(!(typeof r[c.sl]==='number'||doc))continue;const status=c.st>=0?xT(r[c.st]):'',disc=xT(V(r,c.disc));
      const it={sheet:s.name,desc,status,docNo:doc,rev:typeof V(r,c.rev)==='number'?r[c.rev]:null,purpose:xT(V(r,c.pur)),cat:xT(V(r,c.cat))||DISC[disc]||disc,sys:xT(V(r,c.sys))||xT(V(r,c.eq)),disc,remark:xT(V(r,c.rem))};
      if(simple){const ps=xD(V(r,c.ps)),sd=xD(V(r,c.sd)),rd=xD(V(r,c.rd)),ok=/^approved|information/i.test(status);
        it.sub=[ps,null,sd];it.app=[ps?addD(ps,out.review):null,xD(V(r,c.due)),ok?(rd||sd):null]}
      else{it.sub=tri(r,sub);it.app=tri(r,app)}
      if(!it.sub[0]&&!it.app[0]&&!it.sub[2]&&!it.app[2]&&!it.status)continue;out.items.push(it);n++}
    if(n)out.sheets.push([s.name,n])}
  return out}
/* ---------- MCI: Material Control Index / Procurement MIS (10-milestone L&T style, or simple delivery register) ---------- */
const MCI_H=/^(item|material|equipment) description$/i;
async function parseMCI(x){const out={items:[],sheets:[],date:null,ms:null},sh=await xFindSheets(x,MCI_H);
  for(const s of sh){const rows=await x.rows(s),H=xHdr(rows,MCI_H,60);if(!H)continue;const [hi,cD]=H,h=rows[hi],g=rows[hi-1]||[],w=rows[hi+1]||[];
    out.date=out.date||xFileDate(rows);
    const c={st:xCol(h,/^status$/i),type:xCol(h,/item type/i),sys:xCol(h,/^system/i),sub:xCol(h,/^sub-? ?system/i),buyer:xCol(h,/^buyer/i),vend:xCol(h,/^vendor$|^vendor name|^supplier|^make/i),cost:xCol(h,/cost|value|amount/i),qty:xCol(h,/^quantity|^qty/i),uom:xCol(h,/^uom|^unit/i),po:xCol(h,/po number|po no/i),
      batch:xCol(h,/batch|lot|package/i),pod:xCol(h,/po date/i),req:xCol(h,/required|need date|ros date/i),exp:xCol(h,/expected|forecast delivery|eta/i),rec:xCol(h,/actual receipt|received on|receipt date|delivered on/i),rq:xCol(h,/received qty/i),rem:xCol(h,/^remarks/i)};
    const ms=[];for(let j=cD+1;j<h.length;j++)if(/^plan/i.test(xT(h[j]))&&xT(g[j]))ms.push({name:xT(g[j]),j,w:typeof w[j]==='number'?w[j]:null});
    const simple=!ms.length&&c.req>=0;if(!ms.length&&!simple)continue;out.ms=out.ms||ms;let n=0;
    const k=c.cost<0?1:(()=>{const lakh=/lac|lakh/i.test(xT(h[c.cost])),crore=/crore|cr\b/i.test(xT(h[c.cost])),vals=rows.slice(hi+1).map(r=>r&&r[c.cost]).filter(x=>typeof x==='number'&&x>0).sort((p,q)=>p-q),med=vals[vals.length>>1]||0;return lakh?1:crore?100:med>5000?1e-5:1})();
    for(let i=hi+1;i<rows.length;i++){const r=rows[i];if(!r)continue;const desc=xT(r[cD]);if(!desc||desc.length<3||/deleted/i.test(desc))continue;
      const cost=c.cost>=0&&typeof r[c.cost]==='number'?r[c.cost]:null;if(!simple&&!cost)continue;const g_=k=>c[k]>=0?xT(r[c[k]]):'',dt=k=>c[k]>=0?xD(r[c[k]]):null;
      const it={sheet:s.name,desc,status:g_('st'),type:g_('type'),sys:g_('sys'),subsys:g_('sub'),buyer:g_('buyer'),vendor:g_('vend'),cost:cost==null?null:Math.round(cost*k*1e4)/1e4,qty:typeof r[c.qty]==='number'?r[c.qty]:null,uom:g_('uom'),po:g_('po'),batch:g_('batch'),remark:g_('rem')};
      if(simple){if(!dt('req')&&!dt('pod')&&!it.status)continue;it.simple={pod:dt('pod'),req:dt('req'),exp:dt('exp'),rec:dt('rec'),rq:typeof r[c.rq]==='number'?r[c.rq]:null}}
      else it.ms=ms.map(m=>[xD(r[m.j]),xD(r[m.j+1]),xD(r[m.j+2])]);
      out.items.push(it);n++}
    if(n)out.sheets.push([s.name,n])}
  return out}

/* ---------- convert to activities ---------- */
const titleC=s=>s.toLowerCase().replace(/\b\w/g,m=>m.toUpperCase());
function nextId(p,pre,used){let k=1;const has=new Set([...p.acts.map(a=>a.id),...used]);while(has.has(pre+String(k).padStart(3,'0')))k++;const id=pre+String(k).padStart(3,'0');used.add(id);return id}
function dciActs(p,res){const old=p.acts.filter(a=>a.d==='E'),used=new Set(),N=res.items.length||1;
  const per=old.length&&sum(old,a=>a.cost||0)>0?sum(old,a=>a.cost||0)/old.length:(p.contractValue>0?p.contractValue*(p.weights?.E||.2)/N:1);let skip=0,guess=0;
  /* documents without a planned submission date: spread over the engineering window (handover / testing documents near the end) */
  const s0=td(p.start)>td(res.date||p.dataDate)?p.start:(res.date||p.dataDate),span=Math.max(45,dd(p.finish,s0)),late=e=>/handover|testing|commission|as-?built|manual|\b(ho|tc)\b/i.test(e.cat+' '+e.disc+' '+e.desc);
  const und=res.items.filter(e=>!e.sub[0]&&!e.app[0]),uE=und.filter(e=>!late(e)),uL=und.filter(late);
  uE.forEach((e,i)=>{e.sub[0]=addD(s0,7+Math.round(i/Math.max(1,uE.length)*span*.3));e.app[0]=addD(e.sub[0],res.review||14);e.guess=1});
  uL.forEach((e,i)=>{e.sub[0]=addD(s0,Math.round(span*.7+i/Math.max(1,uL.length)*span*.22));e.app[0]=addD(e.sub[0],res.review||14);e.guess=1});guess=und.length;
  const acts=res.items.map(e=>{const appr=/^approved|information/i.test(e.status)||!!e.app[2];const pct=appr?1:(e.sub[2]||(e.status&&!/not (started|submitted)/i.test(e.status))?.5:0);
    let pf=e.app[0]||(e.sub[0]&&addD(e.sub[0],30));let ps=(e.sub[0]||(pf&&addD(pf,-30)));if(!pf||!ps){skip++;return null}ps=addD(ps,-15);if(td(pf)<=td(ps))pf=addD(ps,30);
    const m=old.find(a=>(e.docNo&&a.docNo===e.docNo)||a.name===e.desc);
    const a={id:m?.id||nextId(p,'E',used),d:'E',l2:e.sys||(/drawing|document|dci/i.test(e.sheet)?'Engineering documents':titleC(e.sheet)+' drawings'),l3:e.cat||'General',name:e.desc,ps,pf,fs:null,
      ff:pct<1&&e.app[1]?e.app[1]:null,as:e.sub[2]?addD(e.sub[2],-15):(pct>0?ps:null),af:pct>=1?(e.app[2]||e.sub[2]||pf):null,pct,cost:Math.round(per*1000)/1000,qty:1,uom:'Doc',
      res:m?.res||'Design engineer',crew:m?.crew??.25,prof:'Linear',docNo:e.docNo,rev:e.rev,purpose:e.purpose,status:e.status||(pct>=1?'Approved':pct>0?'First Submission':'Not Started'),
      steps:[['First submission',e.sub[0],e.sub[2]],['Approval',e.app[0],e.app[2]]],preds:m?.preds||[],reason:e.remark||m?.reason||'',src:'DCI',planGuess:e.guess?1:undefined};
    if(a.as&&a.af&&td(a.af)<td(a.as))a.af=addD(a.as,15);if(a.ff&&td(a.ff)<td(a.ps))a.ff=null;return a}).filter(Boolean);
  return {acts,skip,guess}}
/* simple delivery register: plan the 10 procurement milestones back from the required-at-works date */
const MS_BACK=[-150,-135,-120,-110,-95,-80,-10,0,3,30];
function mciActs(p,res){const old=p.acts.filter(a=>a.d==='P'),used=new Set();let skip=0,guess=0;const nc=res.items.filter(i=>i.cost==null).length;
  const per=nc?(p.contractValue>0?p.contractValue*(p.weights?.P||.5)/res.items.length:1):0;
  const acts=res.items.map(it=>{let m10,pct,free=false;
    if(it.simple){const S=it.simple,R=S.req||(S.pod&&addD(S.pod,120));if(!R){skip++;return null}free=/free issue|client supply|owner supply/i.test(it.vendor+' '+it.status);
      const rec=S.rec||(/^received|delivered|grn/i.test(it.status)?(S.exp||R):null),po=S.pod||(rec&&!free?addD(rec,-90):null);
      m10=MS_BACK.map((o,i)=>{const pl=free&&i<7?null:addD(R,o);let ac=null;if(i<=3&&po)ac=po;if(i>=4&&i<=7&&rec)ac=i===7?rec:(i===6?addD(rec,-2):po&&td(po)>td(addD(rec,-30))?po:addD(rec,-30));if(i===8&&rec&&/grn|received|closed/i.test(it.status))ac=rec;
        const fc=i===7&&!rec?S.exp:null;return [pl,fc,ac]});
      pct=free?(rec?1:0):Math.min(1,sum(MSW.map((w,i)=>m10[i][2]?w:0)));guess++}
    else{m10=MS.map((_,i)=>it.ms[i]||[null,null,null]);pct=Math.min(1,sum(MSW.map((w,i)=>m10[i][2]?w:0)))}
    const plans=m10.map(m=>m[0]).filter(Boolean).sort(),acts_=m10.map(m=>m[2]).filter(Boolean).sort();if(!plans.length){skip++;return null}
    const l2=it.sys||(it.batch?(/^\d+$/.test(it.batch)?'Batch '+it.batch:it.batch==='All'?'Common items':it.batch):it.sheet),name=it.desc+(it.batch&&/^\d+$/.test(it.batch)&&!/batch/i.test(it.desc)?' (batch '+it.batch+')':''),
      m=old.find(a=>a.name===name&&a.l2===l2)||old.find(a=>a.name===name);
    const a={id:m?.id||nextId(p,'P',used),d:'P',l2,l3:it.vendor&&!/to be ordered/i.test(it.vendor)?it.vendor:'Vendor not finalised',name,ps:plans[0],pf:plans[plans.length-1],fs:null,
      ff:pct<1?(m10[9][1]||(it.simple&&it.simple.exp&&!it.simple.rec?addD(it.simple.exp,33):null)):null,as:acts_[0]||null,af:pct>=.999?acts_[acts_.length-1]:null,pct:Math.round(pct*1e4)/1e4,cost:it.cost??(m?.cost||Math.round(per*1000)/1000),qty:it.qty||1,uom:it.uom||'Lot',
      res:m?.res||'Buyer / expediter',crew:m?.crew??.1,prof:'Linear',status:it.status||(MS[acts_.length-1]||'Enquiry not floated'),itype:it.type,buyer:it.buyer,po:it.po,subsys:it.subsys,batch:it.batch,freeIssue:free||undefined,
      steps:m10.map((x,i)=>[MS[i],x[0],x[2],x[1]]),preds:m?.preds||[],reason:it.remark||m?.reason||'',src:'MCI',planGuess:it.simple?1:undefined};
    if(a.ff&&td(a.ff)<td(a.ps))a.ff=null;if(a.pf===a.ps)a.pf=addD(a.ps,1);return a}).filter(Boolean);
  return {acts,skip,guess,noCost:nc}}
function applyImport(d,acts,o){const p=P(),had=p.acts.length;
  if(o.mode==='replace')p.acts=p.acts.filter(a=>a.d!==d);else{const ids=new Set(acts.map(a=>a.id));p.acts=p.acts.filter(a=>!ids.has(a.id))}
  p.acts=p.acts.concat(acts);const ids=new Set(p.acts.map(a=>a.id));p.acts.forEach(a=>a.preds=(a.preds||[]).filter(q=>ids.has(q[0])));
  const ps=acts.map(a=>a.ps).sort()[0],pf=acts.map(a=>a.pf).sort().pop();if(ps&&td(ps)<td(p.start))p.start=ps;
  autoLink(p);const mx=p.acts.map(a=>a.pf).sort().pop();if(mx&&(!had||p.acts.every(a=>a.src))&&td(mx)>td(p.finish)){p.finish=mx;if(!had)p.cdd=mx}if(o.date)p.dataDate=o.date;
  (p.imports=p.imports||[]).push({d,file:o.file,at:new Date().toISOString(),n:acts.length,by:ME?.u||''});save()}

/* ---------- import card on Engineering / Procurement ---------- */
const IMP={E:{t:'Import DCI (Document Control Index)',k:'drawings / documents',parse:parseDCI,conv:dciActs,hint:'Excel .xlsx or .xlsm in the DCI format: every sheet with a “Drawing Description” header is read (status, doc number, revision, first submission and approval plan / forecast / actual dates, category, system).'},
  P:{t:'Import MCI (Material Control Index) / Procurement MIS',k:'items',parse:parseMCI,conv:mciActs,hint:'Excel .xlsx or .xlsm in the MCI format: every sheet with an “Item Description” header is read (status, vendor, buyer, cost, quantity and the 10 milestones from enquiry to payment with plan / forecast / actual dates).'}};
function impCard(d){const I=IMP[d],last=(P().imports||[]).filter(x=>x.d===d).pop();
  return `<div class="card" style="margin-bottom:14px"><div style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between"><div><b>${I.t}</b><div class="note" style="margin:2px 0 0">${last?`Last import: ${esc(last.file||'')}, ${last.n} ${I.k}, ${fD(last.at.slice(0,10))}`:esc(I.hint)}</div></div>
   <label class="btn pri">Choose Excel file<input type="file" id="imp${d}" accept=".xlsx,.xlsm,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel.sheet.macroEnabled.12" hidden></label></div><div id="imp${d}o"></div></div>`}
function impBind(d){const inp=$('#imp'+d),out=$('#imp'+d+'o');if(!inp)return;const I=IMP[d];
  inp.onchange=async()=>{const f=inp.files[0];if(!f)return;out.innerHTML=`<div class="note">Reading ${esc(f.name)}…</div>`;
    try{const res=await I.parse(await xlsxOpen(await f.arrayBuffer()));const {acts,skip,guess,noCost}=I.conv(P(),res);
      if(!acts.length){out.innerHTML=`<div class="callout">No ${I.k} were found in ${esc(f.name)}. ${esc(I.hint)}</div>`;return}
      const st={};acts.forEach(a=>st[a.status]=(st[a.status]||0)+1);const ex=P().acts.filter(a=>a.d===d).length;
      out.innerHTML=`<div class="callout ok" style="margin-top:10px"><b>${acts.length} ${I.k} found</b> in ${esc(f.name)} (${res.sheets.map(([s,n])=>esc(s)+': '+n).join(', ')})${skip?`; ${skip} rows without any plan date were left out`:''}.
        ${res.date?` File status date ${fD(res.date)}.`:''}</div>
       ${guess?`<div class="callout" style="margin-top:8px">${d==='E'?`${guess} documents have no planned submission date in the file, so the app planned them: ${res.review||14}-day review, design documents early in the project, testing and handover documents near the end. Fill in the planned dates in the DCI and import again to replace them.`:`The file gives a required-at-works date per item, so the 10 procurement milestones (enquiry to payment) were planned back from it. Free-issue items count only on receipt.`}</div>`:''}
       ${noCost?`<div class="callout" style="margin-top:8px">The file has no item values, so each item gets an equal share of the procurement weight. Enter item values in Schedule to weight them by cost.</div>`:''}
       <div class="grid2"><div><h3>Status</h3><table><tbody>${Object.entries(st).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`<tr><td>${esc(k)}</td><td class="n">${v}</td></tr>`).join('')}</tbody></table>
        <p class="note">Progress after import: ${pc(sum(acts,a=>a.cost*a.pct)/(sum(acts,a=>a.cost)||1))} (weighted by ${d==='E'?'drawing':'item value'}).</p></div>
       <div><h3>Import options</h3><label class="f">This project has ${ex} ${d==='E'?'engineering':'procurement'} activities<select id="imp${d}m"><option value="replace">Replace them with the file</option><option value="merge">Update matching ones, add new, keep the rest</option></select></label>
        ${res.date?`<label style="display:flex;gap:8px;align-items:center;margin:8px 0"><input type="checkbox" id="imp${d}dd" ${td(res.date)!==td(P().dataDate)?'checked':''}> Set the data date to the file's status date (${fD(res.date)})</label>`:''}
        <div class="tools"><button class="go" id="imp${d}go">Import into ${esc(P().name)}</button><button id="imp${d}x">Cancel</button></div></div></div>
       <h3>First rows</h3><div class="scroll"><table><thead><tr><th>ID</th><th>${d==='E'?'Drawing':'Item'}</th><th>${d==='E'?'Doc no.':'Vendor'}</th><th>Status</th><th>Planned start</th><th>Planned finish</th><th class="n">Progress</th></tr></thead><tbody>
        ${acts.slice(0,8).map(a=>`<tr><td>${a.id}</td><td>${esc(a.name.slice(0,70))}</td><td>${esc(d==='E'?a.docNo||'':a.l3)}</td><td>${esc(a.status)}</td><td class="d">${fD(a.ps)}</td><td class="d">${fD(a.pf)}</td><td class="n">${pc(a.pct,0)}</td></tr>`).join('')}</tbody></table></div>`;
      $('#imp'+d+'x').onclick=()=>{out.innerHTML='';inp.value=''};
      $('#imp'+d+'go').onclick=()=>{const o={mode:$('#imp'+d+'m').value,date:$('#imp'+d+'dd')?.checked?res.date:null,file:f.name};applyImport(d,acts,o);
        toast(`${acts.length} ${I.k} imported from ${f.name}; ${P().autoLinks||0} schedule links to ${d==='E'?'procurement':'engineering and construction'} made`);route()}}
    catch(e){console.error(e);out.innerHTML=`<div class="callout">Could not read ${esc(f.name)}: ${esc(e.message)}</div>`}}}
for(const [v,d] of [['engineering','E'],['procurement','P']]){const f=V[v],g=f.after;
  V[v]=()=>{const h=f();if(!can('edit'))return h;const i=h.indexOf('<div class="kpis">');return i<0?h+impCard(d):h.slice(0,i)+impCard(d)+h.slice(i)};V[v].after=()=>{g&&g();impBind(d)}}

/* ---------- project selector in every page header ---------- */
function projSel(){return DB.projects.length?`<label style="display:inline-flex;gap:6px;align-items:center;font-weight:600">Project <select id="pSel" style="max-width:340px">${DB.projects.map(x=>`<option value="${esc(x.id)}" ${x.id===P().id?'selected':''}>${esc(x.name)}</option>`).join('')}</select></label>`:''}
{const h0=hdr;hdr=function(title,sub=''){const s=h0(title,sub),sel=projSel();if(!sel)return s;const k=s.indexOf('<div class="meta">');return k<0?s:s.slice(0,k)+`<div style="margin:6px 0">${sel}</div>`+s.slice(k)}}

/* ---------- registration: ask for a name before creating; remove stray unused projects once ---------- */
{const g=V.register.after;V.register.after=()=>{g&&g();const b=$('#newP');if(!b)return;
  b.onclick=()=>{dialog('Register new project',`<div class="form" style="margin:0"><label class="f">Project name<input id="npN" required></label><label class="f">Project / SO code<input id="npC"></label><label class="f">Client<input id="npCl"></label><label class="f">Start date<input id="npS" type="date" value="${ds(Date.now())}"></label><label class="f">Planned completion<input id="npF" type="date" value="${addD(ds(Date.now()),365)}"></label></div>`,
    [['Create project',()=>{const name=$('#npN').value.trim();if(!name)return toast('Enter the project name');const t=$('#npS').value||ds(Date.now()),fi=$('#npF').value||addD(t,365);if(td(fi)<=td(t))return toast('Completion must be after the start date');
      const id='p'+Date.now().toString(36);DB.projects.push({id,name,code:$('#npC').value.trim(),client:$('#npCl').value.trim(),consultant:'',location:'',currency:'INR lakh',contractValue:0,start:t,finish:fi,cdd:fi,dataDate:ds(Date.now()),weights:{E:.2,P:.5,C:.3},catW:{},zones:{},resCap:{},acFactor:1,acts:[],snaps:[],notes:''});
      DB.projects=DB.projects.filter(x=>x.id===id||!(x.name==='My EPC project'&&!x.acts.length&&!x.client));DB.active=id;save();$('#dlg').close();route();toast('Project created: import the DCI under Engineering and the MCI under Procurement, or add activities in Schedule')},'pri']]);setTimeout(()=>$('#npN')?.focus(),50)}}}
function cleanStray(){if(DB.cleaned1||!DB.projects)return;const bad=x=>(x.name==='New project'&&!x.acts.length)||(x.name==='New EPC project'&&/^Generated by auto-schedule/.test(x.notes||''))||(x.name==='My EPC project'&&!x.acts.length&&!x.client);
  const keep=DB.projects.filter(x=>!bad(x));DB.cleaned1=1;if(keep.length&&keep.length<DB.projects.length){const n=DB.projects.length-keep.length;DB.projects=keep;if(!keep.some(x=>x.id===DB.active))DB.active=keep[0].id;save();setTimeout(()=>toast(`Removed ${n} unused sample project${n>1?'s':''}`),300)}else if(ME)save()}

/* ---------- link DCI drawings -> MCI items -> construction by equipment keywords ---------- */
const LKW={ht:/6\.6 ?kv|11 ?kv|33 ?kv|ht switch|ht panel|hv panel|\bht\b|relay|vcb/,tr:/transformer/,lt:/lt switch|lt panel|mltp|pcc|mcc|415 ?v|pillar|dcdb|\bdb\b|distribution board|switch ?board/,ups:/\bups\b|battery|inverter|charger/,
 bus:/bus ?duct/,cab:/cable(?! tray)/,lgt:/lighting|luminair|fixture|\blight/,pole:/\bpole|high ?mast/,earth:/earth|lightning/,fan:/\bfan/,tray:/tray|raceway/,jb:/junction|\bjb\b|socket/,pipe:/pipe/,
 skid:/skid/,chil:/chiller/,pump:/pump/,dg:/\bdg\b|diesel|genset|generator/,fire:/fire|sprinkler|hydrant|detection/,hvac:/hvac|ahu|ducting|crac|pahu/,net:/network|ethernet|switch(?!board| ?gear)|router|fibre|fiber|modem|scada|plc|bms/,valve:/valve/,tank:/tank/,instr:/instrument|transmitter|gauge|sensor|meter/}
function lkeys(a){const t=(a.name+' '+(a.l3||'')+' '+(a.subsys||'')).toLowerCase();return new Set(Object.keys(LKW).filter(k=>LKW[k].test(t)))}
function autoLink(p){const A=p.acts;A.forEach(a=>a.preds=(a.preds||[]).filter(q=>q[3]!=='auto'));const K={};A.forEach(a=>K[a.id]=lkeys(a));
  const hit=(x,y)=>{for(const k of K[x.id])if(K[y.id].has(k))return true;return false};
  const E=A.filter(a=>a.d==='E'&&!a.ms&&!/test|commission|handover|manual|as-?built|certificate|o ?& ?m|close-?out|report|register|minutes|plan$|schedule/i.test(a.name)),P=A.filter(a=>a.d==='P'&&!a.ms),Cn=A.filter(a=>a.d==='C'&&!a.ms);let n=0;
  for(const q of P){const has=new Set(q.preds.map(x=>x[0]));const m=E.filter(e=>!has.has(e.id)&&hit(e,q)).sort((x,y)=>td(x.pf)-td(y.pf)).slice(-2);
    const mc=q.steps?.[5]?.[1],lag=mc?-dd(q.pf,mc):0;m.forEach(e=>{q.preds.push([e.id,'FS',lag,'auto']);n++})}
  for(const c of Cn){const has=new Set(c.preds.map(x=>x[0]));const m=P.filter(q=>!has.has(q.id)&&hit(q,c));if(!m.length)continue;const q=m.sort((x,y)=>td(x.pf)-td(y.pf)).pop(),mr=q.steps?.[7]?.[1];
    c.preds.push([q.id,'FS',mr?-dd(q.pf,mr):0,'auto']);n++}
  p.autoLinks=n;return n}
