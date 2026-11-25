<script>
{
/* ============ utilities ============ */
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const DAY=864e5;
const td=s=>s?Date.parse(String(s).slice(0,10)+'T00:00:00Z'):NaN;
const ds=t=>isFinite(t)?new Date(t).toISOString().slice(0,10):'';
const addD=(s,n)=>ds(td(s)+n*DAY);
const dd=(a,b)=>Math.round((td(a)-td(b))/DAY);
const fD=s=>s&&isFinite(td(s))?new Date(td(s)).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'2-digit',timeZone:'UTC'}):'—';
const fT=t=>isFinite(t)?fD(ds(t)):'—';
const fM=t=>new Date(t).toLocaleDateString('en-GB',{month:'short',year:'2-digit',timeZone:'UTC'});
const pc=(v,d=1)=>isFinite(v)?(v*100).toFixed(d)+'%':'—';
const nf=(v,d=2)=>isFinite(v)?Number(v).toLocaleString('en-IN',{minimumFractionDigits:d,maximumFractionDigits:d}):'—';
const r2=v=>Math.round(v*100)/100;
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const sum=(a,f=x=>x)=>a.reduce((s,x)=>s+(+f(x)||0),0);
const sg=(v,d=1,suf='')=>`<span class="${v<0?'neg':v>0?'pos':''}">${v>0?'+':''}${nf(v,d)}${suf}</span>`;
const DN={E:'Engineering',P:'Procurement',C:'Construction'};
const DC={E:'var(--e)',P:'var(--p)',C:'var(--c)'};
const DCH={E:'#3b7ddd',P:'#e8a200',C:'#00a86b'};
const ENG_ST=['Not Started','First Submission','Received Comments','Resubmitted to Consultant','Approved with Comment','Approved'];
const ENG_PCT={'Not Started':0,'First Submission':.5,'Received Comments':.5,'Resubmitted to Consultant':.5,'Approved with Comment':1,'Approved':1};
const MS=['Enquiry floated','Offers received','Technical evaluation','PO released','Drawings submitted','Manufacturing clearance','Invoice raised','Material received at site','GRN raised','Payment received'];
const MSW=[.05,.05,.1,.1,.1,.25,.15,.1,.05,.05];
const REASONS=['','Client / consultant approval','Design change / scope change','Vendor / supply delay','Contractor resource shortfall','Site hindrance / front not available','Payment / commercial','Force majeure (COVID-19)','Weather','Statutory / permits','Other'];
const COVID=[td('2020-03-25'),td('2020-05-31')];
let toastT;function toast(m){const t=$('#toast');t.textContent=m;t.classList.add('on');clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove('on'),2600)}

/* ============ storage ============ */
const KEY='epcpm.v1';
let DB=null, CACHE=null, ME=null;
const seed=()=>JSON.parse(document.getElementById('seed').textContent);
function load(){
  try{DB=JSON.parse(localStorage.getItem(KEY))}catch(e){DB=null}
  if(!DB||!Array.isArray(DB.projects)) {const s=seed();DB={projects:[s],active:s.id,users:[]}};
  if(!DB.users) DB.users=[];
}
function localSave(){try{localStorage.setItem(KEY,JSON.stringify(DB))}catch(e){if(!DRV.fileId)toast('Browser storage unavailable: connect Google Drive or use Export → Backup')}}
function save(){CACHE=null;localSave();if(DRV.fileId){clearTimeout(DRV.timer);DRV.status='pending';driveBadge();DRV.timer=setTimeout(()=>driveWrite().catch(driveErr),1500)}}

/* ============ Google Drive storage ============ */
const DRV={tok:null,exp:0,fileId:null,mod:null,status:'off',timer:null,at:0,err:''};
const DFILE='EPC_Project_Controls_data.json',DAPI='https://www.googleapis.com';
const ls=(k,v)=>{try{if(v===undefined)return localStorage.getItem(k);if(v===null)localStorage.removeItem(k);else localStorage.setItem(k,v)}catch(e){return null}};
const CID=()=>(ls('epcpm.gcid')||window.EPC_CONFIG?.googleClientId||'').replace('/*GCID*/','').trim();
function gisLoad(){return new Promise((res,rej)=>{if(window.google?.accounts?.oauth2)return res();const s=document.createElement('script');s.src='https://accounts.google.com/gsi/client';s.onload=()=>res();s.onerror=()=>rej(new Error('Could not load Google sign-in (blocked or offline)'));document.head.appendChild(s)})}
async function gToken(interactive){if(DRV.tok&&Date.now()<DRV.exp-60000)return DRV.tok;await gisLoad();
  return new Promise((res,rej)=>{const c=google.accounts.oauth2.initTokenClient({client_id:CID(),scope:'https://www.googleapis.com/auth/drive.file',
    callback:r=>{if(r.error)return rej(new Error('Google: '+r.error));DRV.tok=r.access_token;DRV.exp=Date.now()+(+r.expires_in||3600)*1000;res(DRV.tok)},
    error_callback:e=>rej(new Error(e?.type==='popup_closed'?'Google sign-in window was closed':'Google sign-in failed: '+(e?.type||'unknown')))});
    c.requestAccessToken({prompt:interactive?'':'none'})})}
async function gfetch(url,opt={},interactive=false){const t=await gToken(interactive);const r=await fetch(url,{...opt,headers:{...(opt.headers||{}),Authorization:'Bearer '+t}});
  if(r.status===401){DRV.tok=null;throw new Error('Google sign-in expired: click the Drive button to reconnect')}
  if(!r.ok)throw new Error('Drive error '+r.status+': '+(await r.text()).slice(0,160));return r}
async function driveFind(i){const q=encodeURIComponent(`name='${DFILE}' and trashed=false`);const j=await (await gfetch(`${DAPI}/drive/v3/files?q=${q}&orderBy=modifiedTime desc&fields=files(id,modifiedTime)`,{},i)).json();return j.files?.[0]||null}
async function driveMeta(){return (await gfetch(`${DAPI}/drive/v3/files/${DRV.fileId}?fields=id,modifiedTime,trashed`)).json()}
async function driveRead(id){return (await gfetch(`${DAPI}/drive/v3/files/${id}?alt=media`)).json()}
async function driveWrite(force){const body=JSON.stringify({...DB,savedAt:new Date().toISOString(),savedBy:ME?.u||''});DRV.status='saving';driveBadge();let r;
  if(DRV.fileId){if(!force){const m=await driveMeta();if(m.trashed){DRV.fileId=null;return driveWrite()}if(DRV.mod&&m.modifiedTime!==DRV.mod)return driveConflict()}
    r=await gfetch(`${DAPI}/upload/drive/v3/files/${DRV.fileId}?uploadType=media&fields=id,modifiedTime`,{method:'PATCH',headers:{'Content-Type':'application/json'},body})}
  else{const b='epc'+Date.now();const mp=`--${b}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify({name:DFILE,mimeType:'application/json',description:'Data file of the EPC Project Controls app'})}\r\n--${b}\r\nContent-Type: application/json\r\n\r\n${body}\r\n--${b}--`;
    r=await gfetch(`${DAPI}/upload/drive/v3/files?uploadType=multipart&fields=id,modifiedTime`,{method:'POST',headers:{'Content-Type':'multipart/related; boundary='+b},body:mp})}
  const j=await r.json();DRV.fileId=j.id;DRV.mod=j.modifiedTime;DRV.status='saved';DRV.at=Date.now();driveBadge()}
function driveErr(e){DRV.status='error';DRV.err=e.message;driveBadge();toast(e.message)}
function driveConflict(){DRV.status='error';DRV.err='Changed on another computer';driveBadge();
  dialog('Drive file changed elsewhere','<p>The data file in Google Drive was saved from another computer or browser after you loaded it. Choose which version to keep.</p>',
   [['Load the Drive version (discard my recent edits)',async()=>{$('#dlg').close();await driveLoad(DRV.fileId).catch(driveErr)}],['Keep mine (overwrite Drive)',()=>{$('#dlg').close();driveWrite(true).catch(driveErr)},'pri']])}
function applyRemote(d){if(!d||!Array.isArray(d.projects)||!d.projects.length)throw new Error('The Drive file is not an EPC Project Controls data file');
  const users=d.users?.length?d.users:DB.users;DB={projects:d.projects,active:d.projects.some(p=>p.id===DB.active)?DB.active:d.active,users,org:d.org||DB.org};
  for(const u of users)if(!DB.users.includes(u))DB.users.push(u);if(ME&&!DB.users.some(u=>u.u===ME.u)){const mine=JSON.parse(localStorage.getItem(KEY)||'{}').users?.find(u=>u.u===ME.u);if(mine)DB.users.push(mine)}
  CACHE=null;localSave()}
async function driveLoad(id){const m=await (await gfetch(`${DAPI}/drive/v3/files/${id}?fields=id,modifiedTime`)).json();applyRemote(await driveRead(id));DRV.fileId=id;DRV.mod=m.modifiedTime;DRV.status='saved';DRV.at=Date.now();driveBadge();if(ME)route();toast('Loaded data from Google Drive')}
async function driveConnect(interactive=true){if(!CID()){location.hash='#export';return toast('Enter the Google OAuth client ID first (Export → Google Drive)')}
  DRV.status='connecting';driveBadge();
  try{const f=await driveFind(interactive);if(f)await driveLoad(f.id);else await driveWrite();ls('epcpm.drive','1');if(!f)toast('Created '+DFILE+' in your Google Drive')}
  catch(e){if(!interactive){DRV.status='off';DRV.err='';driveBadge();return}driveErr(e)}}
function driveOff(){DRV.fileId=null;DRV.mod=null;DRV.status='off';ls('epcpm.drive',null);try{if(DRV.tok)google.accounts.oauth2.revoke(DRV.tok)}catch(e){}DRV.tok=null;driveBadge();toast('Disconnected from Google Drive. Data stays in this browser.')}
function driveBadge(){const b=$('#drv');if(!b)return;const s=DRV.status;b.className='drv '+(s==='saved'?'ok':s==='error'?'err':'');
  b.textContent=s==='saved'?'Google Drive: saved '+new Date(DRV.at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}):s==='saving'?'Google Drive: saving…':s==='pending'?'Google Drive: unsaved changes':s==='connecting'?'Google Drive: connecting…':s==='error'?'Google Drive: '+(DRV.err||'error')+' (click to retry)':'Google Drive: not connected (click to connect)';
  const x=$('#drvState');if(x)x.textContent=b.textContent}
window.addEventListener('beforeunload',e=>{if(DRV.status==='pending'||DRV.status==='saving'){e.preventDefault();e.returnValue=''}});
const P=()=>DB.projects.find(p=>p.id===DB.active)||DB.projects[0];
const can=r=>ME&&(ME.role==='admin'||(r==='edit'&&ME.role==='planner'));

/* ============ auth ============ */
async function hash(s){
  try{const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')}
  catch(e){let h=5381;for(const c of s)h=((h<<5)+h+c.charCodeAt(0))|0;return 'x'+(h>>>0).toString(16)}
}
async function ensureAdmin(){}
const ORGF=[['name','Organization name',1]];
const LOGO={};
function orgLogoHTML(o,size=44){return o?.logo?`<img src="${esc(o.logo)}" alt="" style="width:${size}px;height:${size}px;object-fit:contain;border-radius:8px;background:#fff;padding:3px;flex:none">`:`<span aria-hidden="true" style="width:${size}px;height:${size}px;border-radius:8px;background:var(--act);color:#04140d;display:inline-grid;place-items:center;font-weight:800;font-size:${Math.round(size*.4)}px;flex:none">${esc((o?.name||'EPC').split(/\s+/).map(w=>w[0]).join('').slice(0,2).toUpperCase())}</span>`}
function logoInput(o,pre){return `<div class="f" style="display:flex;gap:14px;align-items:center;grid-column:1/-1;flex-wrap:wrap"><span id="${pre}_lp">${orgLogoHTML(o,64)}</span><div id="${pre}_lg" style="flex:1 1 100%;order:9"></div><label class="f" style="flex:1">Organization logo (PNG, JPG or SVG, up to 2 MB)<input type="file" id="${pre}_logo" accept="image/png,image/jpeg,image/svg+xml,image/webp"></label>${o?.logo?`<button type="button" id="${pre}_lx">Remove logo</button>`:''}</div>`}
function bindLogo(pre,o){const i=$('#'+pre+'_logo');if(!i)return;
  i.onchange=()=>{const f=i.files[0];if(!f)return;if(!/^image\//.test(f.type))return toast('Choose an image file');if(f.size>2e6)return toast('Logo must be under 2 MB');
    const r=new FileReader();r.onload=()=>{const img=new Image();img.onload=()=>{const m=256,s=Math.min(1,m/Math.max(img.width||m,img.height||m)),cv=document.createElement('canvas');cv.width=Math.round((img.width||m)*s);cv.height=Math.round((img.height||m)*s);
      cv.getContext('2d').drawImage(img,0,0,cv.width,cv.height);LOGO[pre]=cv.toDataURL('image/png');$('#'+pre+'_lp').innerHTML=orgLogoHTML({logo:LOGO[pre]},64)};img.onerror=()=>toast('Could not read that image');img.src=r.result};r.readAsDataURL(f)};
  const x=$('#'+pre+'_lx');if(x)x.onclick=()=>{LOGO[pre]='';$('#'+pre+'_lp').innerHTML=orgLogoHTML({name:o?.name},64);x.remove()}}
function orgForm(o={},pre='of'){return `<div class="form">${logoInput(o,pre)}${ORGF.map(([k,l,req,opts])=>opts?`<label class="f">${l}<select id="${pre}_${k}">${opts.map(x=>`<option ${o[k]===x?'selected':''}>${x}</option>`).join('')}</select></label>`:`<label class="f">${l}${req?' *':''}<input id="${pre}_${k}" value="${esc(o[k]||(k==='country'?'India':''))}" ${req?'required':''} ${k==='code'?'autocapitalize="characters" maxlength="16"':''} ${k==='email'?'type="email"':''}></label>`).join('')}</div>`}
function readOrg(pre='of'){const o={};if(pre in LOGO)o.logo=LOGO[pre];ORGF.forEach(([k])=>o[k]=($('#'+pre+'_'+k)?.value||'').trim());return o}
const LEFT=()=>`<div style="background:var(--rail);color:#e8eeeb;padding:clamp(28px,6vw,72px);display:flex;flex-direction:column;justify-content:center">
   ${DB.org?.logo?`<img src="${esc(DB.org.logo)}" alt="" style="width:96px;height:96px;object-fit:contain;background:#fff;border-radius:14px;padding:8px;margin-bottom:18px">`:''}<div style="font-weight:800;font-size:clamp(32px,5vw,50px);line-height:1.05">${DB.org?.name?esc(DB.org.name):'EPC Project<br>Controls'}</div>
   <p style="color:#9aa8a2;max-width:34ch;font-size:17px">${DB.org?.name?'EPC Project Controls · ':''}Engineering, procurement and construction progress, S-curves, EVM, look-aheads and L0–L5 schedules in one place.</p>
   <svg viewBox="0 0 320 150" style="max-width:420px;margin-top:20px" aria-hidden="true"><path d="M10 140 C90 138 120 120 160 70 S240 12 310 10" fill="none" stroke="#cfd8d4" stroke-width="3" stroke-dasharray="7 6"/><path d="M10 140 C90 139 130 128 170 95 S205 70 215 66" fill="none" stroke="#00a86b" stroke-width="5" stroke-linecap="round"/><circle cx="215" cy="66" r="7" fill="#ff5c8a"/></svg></div>`;
function shell(){document.querySelector('.app').style.display='none';let w=$('#login');if(!w){w=document.createElement('div');w.id='login';document.body.prepend(w)}return w}
function enter(x){ME={u:x.u,name:x.name,role:x.role};try{sessionStorage.setItem('epcpm.me',JSON.stringify(ME))}catch(e){}
  $('#login')?.remove();document.querySelector('.app').style.display='';route()}
/* online logo lookup: Wikidata (logo image, official website) -> Wikimedia Commons / site icon */
const WD='https://www.wikidata.org/w/api.php?origin=*&format=json&';
async function findLogos(name){const s=await (await fetch(WD+'action=wbsearchentities&language=en&limit=6&search='+encodeURIComponent(name))).json();
  const hits=(s.search||[]).slice(0,6);if(!hits.length)return [];
  const e=(await (await fetch(WD+'action=wbgetentities&props=claims&ids='+hits.map(h=>h.id).join('|'))).json()).entities||{};const out=[];
  for(const h of hits){const cl=e[h.id]?.claims||{};const logo=cl.P154?.[0]?.mainsnak?.datavalue?.value,site=cl.P856?.[0]?.mainsnak?.datavalue?.value;
    let host='';try{host=site?new URL(site).hostname:''}catch(x){}
    const url=logo?'https://commons.wikimedia.org/wiki/Special:FilePath/'+encodeURIComponent(String(logo).replace(/ /g,'_'))+'?width=256':host?'https://www.google.com/s2/favicons?sz=128&domain='+encodeURIComponent(host):'';
    if(url)out.push({url,label:h.label||name,desc:h.description||host||''})}
  return out.slice(0,4)}
function toDataURL(url){return new Promise(res=>{const img=new Image();img.crossOrigin='anonymous';img.onload=()=>{try{const m=256,s=Math.min(1,m/Math.max(img.naturalWidth||m,img.naturalHeight||m)),cv=document.createElement('canvas');
  cv.width=Math.max(1,Math.round((img.naturalWidth||m)*s));cv.height=Math.max(1,Math.round((img.naturalHeight||m)*s));cv.getContext('2d').drawImage(img,0,0,cv.width,cv.height);res(cv.toDataURL('image/png'))}catch(e){res(url)}};img.onerror=()=>res(url);img.src=url})}
function logoPicker(pre,getName){const box=$('#'+pre+'_lg');if(!box)return null;let tm,last='';
  const show=(list,msg)=>{box.innerHTML=`<div class="note" style="margin:0 0 6px">${esc(msg)}</div><div style="display:flex;flex-wrap:wrap;gap:8px">${list.map((x,i)=>`<button type="button" data-lg="${i}" title="${esc(x.desc)}" style="display:flex;gap:8px;align-items:center;max-width:250px;text-align:left;min-height:56px;${x.data&&LOGO[pre]===x.data?'border-color:var(--act);box-shadow:inset 0 0 0 2px var(--act)':''}"><img src="${esc(x.url)}" alt="" style="width:40px;height:40px;object-fit:contain;background:#fff;border-radius:6px"><span style="font-size:13px;line-height:1.25"><b>${esc(x.label)}</b><br><span style="color:var(--mute)">${esc(x.desc.slice(0,48))}</span></span></button>`).join('')}
    <button type="button" data-lg="none" style="min-height:56px">Use initials</button><label class="btn" style="min-height:56px;display:inline-flex;align-items:center">Upload my own<input type="file" id="${pre}_logo" accept="image/png,image/jpeg,image/svg+xml,image/webp" hidden></label></div>`;
    $$('#'+pre+'_lg [data-lg]').forEach(b=>b.onclick=async()=>{const k=b.dataset.lg;if(k==='none'){LOGO[pre]='';$('#'+pre+'_lp').innerHTML=orgLogoHTML({name:getName()},64);return}
      const x=list[+k];x.data=x.data||await toDataURL(x.url);LOGO[pre]=x.data;$('#'+pre+'_lp').innerHTML=orgLogoHTML({logo:x.data},64);show(list,msg)});
    bindLogo(pre,{})};
  const run=async()=>{if(!box.isConnected)return;const n=(getName()||'').trim();if(n.length<3||n===last)return;last=n;box.innerHTML='<div class="note">Searching online for the logo of “'+esc(n)+'”…</div>';
    try{const L=await findLogos(n);if(!box.isConnected||(getName()||'').trim()!==n)return;if(L.length){L[0].data=await toDataURL(L[0].url);LOGO[pre]=L[0].data;$('#'+pre+'_lp').innerHTML=orgLogoHTML({logo:L[0].data},64)}
      show(L,L.length?'Logos found online. The first is selected: pick another if it is not yours.':'No logo found online. Initials will be used; you can upload one.')}
    catch(e){show([],'Online logo search is unavailable right now. Initials will be used; you can upload one.')}};
  return ()=>{clearTimeout(tm);tm=setTimeout(run,700)}}
function setupView(err=''){const w=shell();
  w.innerHTML=`<div style="min-height:100vh;display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,380px),1fr))">${LEFT()}
  <form id="sf" style="padding:clamp(24px,5vw,64px);display:flex;flex-direction:column;justify-content:center;gap:14px;max-width:560px">
   <h1 style="font-size:30px;margin:0">Register your organization</h1>
   ${err?`<div class="callout">${esc(err)}</div>`:''}
   <label class="f">Organization name<input id="of_name" required autocomplete="organization" placeholder="e.g. IRCON International"></label>
   <div style="display:flex;gap:14px;align-items:flex-start"><span id="of_lp">${orgLogoHTML({},64)}</span><div id="of_lg" style="flex:1"><div class="note" style="margin:0">The logo is found online from the organization name.</div></div></div>
   <div class="form" style="margin:0"><label class="f">Your user name<input id="sa_u" required autocomplete="username"></label><label class="f">Password (6+ characters)<input id="sa_p" type="password" required autocomplete="new-password"></label></div>
   <button class="go" type="submit">Create and sign in</button>
   ${CID()?'<p class="note">Already registered on another computer? <button type="button" id="sDrv">Load from Google Drive</button></p>':''}
  </form></div>`;
  delete LOGO.of;const kick=logoPicker('of',()=>$('#of_name')?.value||'');$('#of_name').oninput=kick;
  $('#sDrv')&&($('#sDrv').onclick=async()=>{await driveConnect(true);if(DB.users.length&&DB.org)loginView('Organization loaded from Google Drive. Sign in to continue.')});
  $('#sf').onsubmit=async e=>{e.preventDefault();const name=$('#of_name').value.trim(),u=$('#sa_u').value.trim().toLowerCase(),pw=$('#sa_p').value;
    if(!name)return toast('Enter the organization name');if(!u)return toast('Enter a user name');if(pw.length<6)return toast('Use a password of at least 6 characters');
    const salt=Math.random().toString(36).slice(2);const x={u,name:u,role:'admin',salt,h:await hash(salt+pw)};
    const code=name.toUpperCase().replace(/[^A-Z0-9 ]/g,'').split(/\s+/).filter(Boolean).map(w=>w[0]).join('').slice(0,8)||'ORG';
    DB.org={name,code,logo:LOGO.of||'',created:ds(Date.now())};DB.users=[x];save();enter(x);toast('Organization registered')}}
function loginView(err=''){if(!DB.users.length||(!DB.org&&!DB.users.some(u=>!u.must)))return setupView(err);const w=shell();
  w.innerHTML=`<div style="min-height:100vh;display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,380px),1fr))">${LEFT()}
  <form id="lf" style="padding:clamp(28px,6vw,72px);display:flex;flex-direction:column;justify-content:center;gap:14px;max-width:480px">
   <h1 style="font-size:30px;margin:0">Sign in</h1>
   ${err?`<div class="callout">${esc(err)}</div>`:''}
   <label class="f">User name<input id="lu" autocomplete="username" required></label>
   <label class="f">Password<input id="lp" type="password" autocomplete="current-password" required></label>
   <button class="go" type="submit">Sign in</button>
   <p class="note">Ask your administrator for an account. ${CID()?'<button type="button" id="lDrv">Reload from Google Drive</button>':''}</p>
  </form></div>`;
  $('#lDrv')&&($('#lDrv').onclick=async()=>{await driveConnect(true);loginView()});
  $('#lf').onsubmit=async e=>{e.preventDefault();const u=$('#lu').value.trim().toLowerCase(),pw=$('#lp').value;
    const x=DB.users.find(z=>z.u===u);if(!x||x.h!==await hash(x.salt+pw))return loginView('User name or password is wrong.');
    enter(x);if(!DB.org&&x.role==='admin'){location.hash='#users';toast('Please add your organization name')}}
}
function logout(){ME=null;try{sessionStorage.removeItem('epcpm.me')}catch(e){}loginView()}

/* ============ calculations ============ */
const PROF={Linear:x=>x,'Front-loaded':x=>1-(1-x)**2,'Back-loaded':x=>x*x,'S-curve':x=>3*x*x-2*x*x*x};
function planPct(a,t){const s=td(a.ps),f=td(a.pf);if(t<=s)return 0;if(t>=f)return 1;return (PROF[a.prof]||PROF.Linear)((t-s)/(f-s))}
function compute(p){
  const acts=p.acts, by={}; acts.forEach(a=>by[a.id]=a);
  const d0=td(p.dataDate), target=td(p.finish);
  // weights within discipline
  const W={};
  for(const d of 'EPC'){
    const A=acts.filter(a=>a.d===d), tot=sum(A,a=>a.cost), cw=p.catW?.[d];
    if(cw&&Object.keys(cw).length){
      const cats=[...new Set(A.map(a=>a.l2))], cwt=sum(cats,c=>cw[c]||0)||1, cc={};
      A.forEach(a=>cc[a.l2]=(cc[a.l2]||0)+(+a.cost||0));
      A.forEach(a=>W[a.id]=((cw[a.l2]||0)/cwt)*(cc[a.l2]?(+a.cost||0)/cc[a.l2]:0));
    } else A.forEach(a=>W[a.id]=tot?(+a.cost||0)/tot:1/A.length);
  }
  // CPM
  const succ={};acts.forEach(a=>(a.preds||[]).forEach(([id,ty,lag])=>{if(by[id])(succ[id]=succ[id]||[]).push([a.id,ty||'FS',+lag||0])}));
  const indeg={};acts.forEach(a=>indeg[a.id]=(a.preds||[]).filter(x=>by[x[0]]).length);
  const q=acts.filter(a=>!indeg[a.id]).map(a=>a.id), order=[];
  while(q.length){const id=q.shift();order.push(id);(succ[id]||[]).forEach(([s])=>{if(--indeg[s]===0)q.push(s)})}
  const cyc=acts.length-order.length; if(cyc) acts.forEach(a=>{if(!order.includes(a.id))order.push(a.id)});
  const S={};
  for(const id of order){const a=by[id];const dur=a.ms?0:Math.max(1,dd(a.pf,a.ps));let ES,EF,st;
    if(a.pct>=1){ES=td(a.as||a.ps);EF=td(a.af||a.pf);st='done'}
    else if(a.pct>0||a.as){ES=td(a.as||a.ps);const rem=Math.max(1,Math.ceil(dur*(1-(a.pct||0))));EF=a.ff&&td(a.ff)>d0?td(a.ff):d0+rem*DAY;st='wip'}
    else{const fdur=a.fs&&a.ff&&dd(a.ff,a.fs)>0?dd(a.ff,a.fs):dur;let s=Math.max(d0,td(a.fs||a.ps));
      for(const [pid,ty,lag] of (a.preds||[])){const x=S[pid];if(!x)continue;
        if(ty==='SS')s=Math.max(s,x.ES+lag*DAY);else if(ty==='FF')s=Math.max(s,x.EF+lag*DAY-fdur*DAY);else s=Math.max(s,x.EF+lag*DAY)}
      ES=s;EF=s+fdur*DAY;st='ns'}
    if(EF<ES)EF=ES;
    S[id]={ES,EF,st,dur,W:W[id]||0}}
  const pEF=acts.length?Math.max(...acts.map(a=>S[a.id].EF)):target;
  for(let i=order.length-1;i>=0;i--){const id=order[i],x=S[id];if(x.st==='done'){x.TF=null;continue}
    let LF=target;const span=x.EF-Math.max(x.ES,d0);
    for(const [sid,ty,lag] of (succ[id]||[])){const y=S[sid];if(y.st!=='ns')continue;
      if(ty==='SS')LF=Math.min(LF,y.LS-lag*DAY+span);else if(ty==='FF')LF=Math.min(LF,y.LF-lag*DAY);else LF=Math.min(LF,y.LS-lag*DAY)}
    x.LF=LF;x.LS=LF-span;x.TF=Math.round((LF-x.EF)/DAY)}
  // aggregates
  const disc={};
  for(const d of 'EPC'){const A=acts.filter(a=>a.d===d);
    disc[d]={n:A.length,plan:sum(A,a=>W[a.id]*planPct(a,d0)),act:sum(A,a=>W[a.id]*(a.pct||0)),
      BAC:sum(A,a=>a.cost),PV:sum(A,a=>a.cost*planPct(a,d0)),EV:sum(A,a=>a.cost*(a.pct||0)),AC:sum(A,a=>a.ac),
      fin:A.length?Math.max(...A.map(a=>S[a.id].EF)):NaN}}
  const wt=p.weights, wsum=(wt.E+wt.P+wt.C)||1;
  const ov={plan:('EPC'.split('').reduce((s,d)=>s+wt[d]*disc[d].plan,0))/wsum,act:('EPC'.split('').reduce((s,d)=>s+wt[d]*disc[d].act,0))/wsum};
  return {by,S,W,disc,ov,pEF,d0,target,cyc,order,succ};
}
const C=()=>CACHE||(CACHE=compute(P()));
function months(p,extra){const s=td(p.start),e=Math.max(td(p.finish),extra||0);const out=[];let d=new Date(s);d=Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),1);
  while(true){const t=new Date(d);const me=Date.UTC(t.getUTCFullYear(),t.getUTCMonth()+1,0);out.push(me);if(me>=e)break;d=Date.UTC(t.getUTCFullYear(),t.getUTCMonth()+1,1)}return out}
function discPlanAt(p,d,t,cx){return sum(p.acts.filter(a=>d==='O'||a.d===d),a=>(d==='O'?wNorm(p,a.d)*cx.W[a.id]:cx.W[a.id])*planPct(a,t))}
function wNorm(p,d){const w=p.weights;return w[d]/((w.E+w.P+w.C)||1)}
function fcAt(p,a,t,cx){const x=cx.S[a.id];if(x.st==='done')return 1;const s=Math.max(x.ES,cx.d0);if(t<=s)return a.pct||0;if(t>=x.EF)return 1;return (a.pct||0)+(1-(a.pct||0))*(t-s)/(x.EF-s)}
function discFcAt(p,d,t,cx){return sum(p.acts.filter(a=>d==='O'||a.d===d),a=>(d==='O'?wNorm(p,a.d)*cx.W[a.id]:cx.W[a.id])*fcAt(p,a,t,cx))}
function snapVal(p,s,d){return d==='O'?'EPC'.split('').reduce((v,k)=>v+wNorm(p,k)*(s[k]||0),0):(s[d]||0)}
function actualSeries(p,d,cx){const pts=(p.snaps||[]).filter(s=>td(s.date)<=cx.d0).map(s=>[td(s.date),snapVal(p,s,d)]);
  const cur=d==='O'?cx.ov.act:cx.disc[d].act;pts.push([cx.d0,cur]);pts.sort((a,b)=>a[0]-b[0]);return pts}
function curves(p,d,cx){const M=months(p,cx.pEF);const plan=M.map(t=>[t,discPlanAt(p,d,t,cx)]);
  const act=actualSeries(p,d,cx);const fc=[[cx.d0,d==='O'?cx.ov.act:cx.disc[d].act],...M.filter(t=>t>cx.d0).map(t=>[t,discFcAt(p,d,t,cx)])];
  return {M,plan,act,fc}}
function earnedSchedule(p,d,cx,ev,at){// time at which planned curve reached ev
  const s=td(p.start),e=Math.max(td(p.finish),at);let prev=[s,0];
  for(let t=s;t<=e;t+=7*DAY){const v=discPlanAt(p,d,t,cx);if(v>=ev){const [t0,v0]=prev;return v===v0?t:t0+(t-t0)*(ev-v0)/(v-v0)}prev=[t,v]}return e}
function evm(p,cx,d){const x=d==='O'?{BAC:sum('EPC'.split(''),k=>cx.disc[k].BAC),PV:sum('EPC'.split(''),k=>cx.disc[k].PV),EV:sum('EPC'.split(''),k=>cx.disc[k].EV),AC:sum('EPC'.split(''),k=>cx.disc[k].AC)}:cx.disc[d];
  const SPI=x.PV?x.EV/x.PV:NaN,CPI=x.AC?x.EV/x.AC:NaN,EAC=CPI?x.BAC/CPI:NaN;
  return {...x,SV:x.EV-x.PV,CV:x.EV-x.AC,SPI,CPI,EAC,ETC:EAC-x.AC,VAC:x.BAC-EAC,TCPI:(x.BAC-x.EV)/((x.BAC-x.AC)||1)}}
function statusOf(a,cx){const x=cx.S[a.id];if(x.st==='done')return 'Completed';if(x.st==='wip')return 'In progress';return 'Not started'}
function stepsOf(a){if(a.ms||(a.d==='E'&&!a.steps))return [];
  if(a.d==='P'&&a.steps)return a.steps.map((s,i)=>({name:s[0],ps:i?a.steps[i-1][1]||a.ps:a.ps,pf:s[1]||a.pf,act:s[2],w:MSW[i]}));
  if(a.d==='E'&&a.steps)return [{name:'Preparation & first submission',ps:a.ps,pf:a.steps[0][1]||addD(a.ps,15),act:a.steps[0][2],w:.5},{name:'Review & approval',ps:a.steps[0][1]||a.ps,pf:a.pf,act:a.steps[1][2],w:.5}];
  const n=Math.max(1,dd(a.pf,a.ps));const b1=addD(a.ps,Math.round(n*.1)),b2=addD(a.ps,Math.round(n*.9));
  return [{name:'Material & front readiness',ps:a.ps,pf:b1,w:.1},{name:'Installation',ps:b1,pf:b2,w:.8},{name:'Testing & handover',ps:b2,pf:a.pf,w:.1}];
}
/* WBS tree L0-L5 */
function tree(p,cx,maxL=5,filt=()=>true){
  const root={L:0,name:p.name,code:p.code||'P',kids:[],acts:[]};const m={};
  for(const a of p.acts){if(!filt(a))continue;
    const k1=a.d,k2=k1+'|'+a.l2,k3=k2+'|'+a.l3;
    if(!m[k1]){m[k1]={L:1,name:DN[a.d],kids:[],acts:[]};root.kids.push(m[k1])}
    if(!m[k2]){m[k2]={L:2,name:a.l2,kids:[],acts:[]};m[k1].kids.push(m[k2])}
    if(!m[k3]){m[k3]={L:3,name:a.l3,kids:[],acts:[]};m[k2].kids.push(m[k3])}
    const n4={L:4,name:a.name,a,kids:[],acts:[a]};m[k3].kids.push(n4);
    [root,m[k1],m[k2],m[k3]].forEach(n=>n.acts.push(a));
    if(maxL>=5)n4.kids=stepsOf(a).map(s=>({L:5,name:s.name,step:s,a,kids:[],acts:[]}));
  }
  root.kids.sort((x,y)=>'EPC'.indexOf(x.name[0])-'EPC'.indexOf(y.name[0]));
  const rows=[];let n=0;
  (function walk(nd,wbs){nd.wbs=wbs;
    if(nd.L===5){const s=nd.step;nd.ps=s.ps;nd.pf=s.pf;nd.ES=td(s.ps);nd.EF=td(s.pf);nd.pct=s.act?1:0;nd.as=s.act;}
    else if(nd.L===4){const a=nd.a,x=cx.S[a.id];Object.assign(nd,{ps:a.ps,pf:a.pf,ES:x.ES,EF:x.EF,pct:a.pct||0,TF:x.TF,cost:a.cost,as:a.as,af:a.af})}
    else{const A=nd.acts,cs=sum(A,a=>a.cost)||1;Object.assign(nd,{ps:ds(Math.min(...A.map(a=>td(a.ps)))),pf:ds(Math.max(...A.map(a=>td(a.pf)))),
      ES:Math.min(...A.map(a=>cx.S[a.id].ES)),EF:Math.max(...A.map(a=>cx.S[a.id].EF)),pct:sum(A,a=>a.cost*(a.pct||0))/cs,cost:sum(A,a=>a.cost),
      TF:Math.min(...A.map(a=>cx.S[a.id].TF??1e9))});if(nd.TF===1e9)nd.TF=null}
    nd.id=++n;if(nd.L<=maxL)rows.push(nd);
    nd.kids.forEach((k,i)=>walk(k,wbs+'.'+(i+1)));
  })(root,p.code||'P');
  return rows;
}

/* ============ SVG charts ============ */
const charts=[];
function chart(id,draw){const el=document.getElementById(id);if(!el)return;const s=document.createElementNS('http://www.w3.org/2000/svg','svg');el.appendChild(s);
  const go=()=>{const W=el.clientWidth,H=el.clientHeight;if(W<10)return;s.setAttribute('viewBox',`0 0 ${W} ${H}`);s.innerHTML=draw(W,H)};
  const ro=new ResizeObserver(go);ro.observe(el);charts.push(ro);go()}
function axisTime(x0,x1,W,H,pad,top){const span=x1-x0;let out='';const yrs=span/DAY/365;const step=yrs>3?6:yrs>1.2?3:1;
  const d=new Date(x0);let t=Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),1);
  for(let k=0;t<=x1;k++){const dt=new Date(t);if(dt.getUTCMonth()%step===0&&t>=x0){const x=pad.l+(t-x0)/span*(W-pad.l-pad.r);
    out+=`<line x1="${x}" x2="${x}" y1="${pad.t}" y2="${H-pad.b}" stroke="currentColor" opacity=".08"/>`;
    if(W>520||dt.getUTCMonth()%(step*2)===0)out+=`<text x="${x}" y="${top?pad.t-6:H-pad.b+16}" font-size="11" text-anchor="middle" fill="currentColor" opacity=".6">${fM(t)}</text>`}
    t=Date.UTC(dt.getUTCFullYear(),dt.getUTCMonth()+1,1)}return out}
function lineChart(id,{series,x0,x1,ymax=1,yfmt=v=>Math.round(v*100)+'%',marks=[],band}){
  chart(id,(W,H)=>{const pad={l:W<520?36:48,r:16,t:16,b:26};const X=t=>pad.l+(t-x0)/(x1-x0)*(W-pad.l-pad.r),Y=v=>H-pad.b-(v/ymax)*(H-pad.t-pad.b);
    let o=`<g style="color:var(--ink)">`;
    for(let i=0;i<=4;i++){const v=ymax*i/4;o+=`<line x1="${pad.l}" x2="${W-pad.r}" y1="${Y(v)}" y2="${Y(v)}" stroke="currentColor" opacity=".1"/><text x="${pad.l-6}" y="${Y(v)+4}" font-size="11" text-anchor="end" fill="currentColor" opacity=".6">${yfmt(v)}</text>`}
    o+=axisTime(x0,x1,W,H,pad);
    if(band)o+=`<rect x="${X(band[0])}" y="${pad.t}" width="${Math.max(1,X(band[1])-X(band[0]))}" height="${H-pad.t-pad.b}" fill="var(--fc)" opacity=".08"/>`;
    for(const m of marks){const x=X(m.t);if(x<pad.l||x>W-pad.r)continue;o+=`<line x1="${x}" x2="${x}" y1="${pad.t}" y2="${H-pad.b}" stroke="${m.c||'var(--fc)'}" stroke-dasharray="4 3"/><text x="${x+4}" y="${pad.t+12+(m.dy||0)}" font-size="11" fill="${m.c||'var(--fc)'}">${esc(m.label)}</text>`}
    for(const s of series){if(!s.pts.length)continue;o+=`<polyline fill="none" stroke="${s.color}" stroke-width="${s.w||2.5}" ${s.dash?`stroke-dasharray="${s.dash}"`:''} stroke-linejoin="round" points="${s.pts.map(([t,v])=>X(t).toFixed(1)+','+Y(v).toFixed(1)).join(' ')}"/>`;
      if(s.dots)o+=s.pts.map(([t,v])=>`<circle cx="${X(t)}" cy="${Y(v)}" r="2.5" fill="${s.color}"/>`).join('');
      const [lt,lv]=s.pts[s.pts.length-1];if(s.end)o+=`<circle cx="${X(lt)}" cy="${Y(lv)}" r="5" fill="${s.color}"/><text x="${Math.min(X(lt)+8,W-60)}" y="${Y(lv)-8}" font-size="12" font-weight="700" fill="${s.color}">${esc(s.end)}</text>`}
    return o+'</g>'})}
function legend(items){return `<div class="legend">${items.map(([c,t,dash])=>`<span><i style="background:${dash?`repeating-linear-gradient(90deg,${c} 0 5px,transparent 5px 9px)`:c}"></i>${esc(t)}</span>`).join('')}</div>`}
function pbar(act,plan){return `<div class="bar" title="Actual ${pc(act)} / planned ${pc(plan)}"><i style="width:${clamp(act)*100}%"></i>${plan!=null?`<u style="left:${clamp(plan)*100}%"></u>`:''}</div>`}

/* ============ download / zip ============ */
let DLNS=null;try{window.claude?.use?.('downloads').then(n=>DLNS=n).catch(()=>{})}catch(e){}
const crcT=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c}return t})();
function zip(files){const enc=new TextEncoder();const parts=[],cd=[];let off=0;
  for(const f of files){const name=enc.encode(f.name),data=enc.encode(f.data);let c=0xFFFFFFFF;for(const b of data)c=crcT[(c^b)&255]^(c>>>8);c=(c^0xFFFFFFFF)>>>0;
    const h=new DataView(new ArrayBuffer(30));h.setUint32(0,0x04034b50,true);h.setUint16(4,20,true);h.setUint32(14,c,true);h.setUint32(18,data.length,true);h.setUint32(22,data.length,true);h.setUint16(26,name.length,true);
    parts.push(h.buffer,name,data);
    const e=new DataView(new ArrayBuffer(46));e.setUint32(0,0x02014b50,true);e.setUint16(4,20,true);e.setUint16(6,20,true);e.setUint32(16,c,true);e.setUint32(20,data.length,true);e.setUint32(24,data.length,true);e.setUint16(28,name.length,true);e.setUint32(42,off,true);
    cd.push(e.buffer,name);off+=30+name.length+data.length}
  const cdl=sum(cd,b=>b.byteLength);const end=new DataView(new ArrayBuffer(22));end.setUint32(0,0x06054b50,true);end.setUint16(8,files.length,true);end.setUint16(10,files.length,true);end.setUint32(12,cdl,true);end.setUint32(16,off,true);
  return new Blob([...parts,...cd,end.buffer],{type:'application/zip'})}
async function download(name,data,mime='text/plain'){
  const blob=data instanceof Blob?data:new Blob([data],{type:mime});
  if(DLNS){try{await DLNS.save({filename:name,data:blob});toast('Saved '+name);return}catch(e){
      if(e?.code==='rejected_extension'&&/\.xml$/.test(name)){return download(name.replace(/\.xml$/,'.zip'),zip([{name,data:await blob.text()}]))}
      if(e?.code==='declined')return toast('Download cancelled');}}
  try{const u=URL.createObjectURL(blob);const a=document.createElement('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),4000);toast('Downloading '+name)}
  catch(e){if(typeof data==='string')showText(name,data)}}
function showText(title,text){dialog(title,`<p class="note">Copy this text and save it as <b>${esc(title)}</b>.</p><textarea class="code" id="cpt" readonly>${esc(text)}</textarea>`,
  [['Copy',async()=>{try{await navigator.clipboard.writeText(text);toast('Copied')}catch(e){$('#cpt').select();toast('Press Ctrl+C to copy')}}]])}
function csv(rows){return rows.map(r=>r.map(v=>{v=v==null?'':String(v);return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v}).join(',')).join('\n')}
function parseCSV(t){const out=[];let row=[],v='',q=false;for(let i=0;i<t.length;i++){const c=t[i];
  if(q){if(c==='"'){if(t[i+1]==='"'){v+='"';i++}else q=false}else v+=c}
  else if(c==='"')q=true;else if(c===','){row.push(v);v=''}else if(c==='\n'||c==='\r'){if(c==='\r'&&t[i+1]==='\n')i++;row.push(v);out.push(row);row=[];v=''}else v+=c}
  if(v||row.length){row.push(v);out.push(row)}return out.filter(r=>r.some(x=>x.trim()))}

/* ============ dialog ============ */
function dialog(title,body,btns=[]){const d=$('#dlg');$('#dlgT').textContent=title;$('#dlgB').innerHTML=body;
  $('#dlgF').innerHTML='';btns.forEach(([t,f,cls])=>{const b=document.createElement('button');b.textContent=t;if(cls)b.className=cls;b.onclick=f;$('#dlgF').appendChild(b)});
  if(!d.open)d.showModal()}
$('#dlgX').onclick=()=>$('#dlg').close();
