
/* ===== Wish list ===== */
const WLCSS=`
:host{display:block;color:var(--ink);font:inherit;line-height:1.45}
*,*::before,*::after{box-sizing:border-box}
button,input,select,textarea{font:inherit;color:inherit}
[hidden]{display:none!important}
.vh{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
.grow{flex:1;min-width:0}
.btn{font-weight:650;border:0;border-radius:10px;padding:9px 14px;cursor:pointer;background:var(--accent);color:var(--accent-ink);display:inline-flex;gap:6px;align-items:center;white-space:nowrap}
.btn:disabled{opacity:.45;cursor:not-allowed}
.btn.ghost{background:var(--sheet);color:var(--ink);border:1px solid var(--line)}.btn.ghost:hover:not(:disabled){background:var(--pocket)}
.btn.ghost[aria-pressed="true"]{background:color-mix(in srgb,var(--accent) 22%,var(--sheet));border-color:var(--accent)}
.btn.danger{background:var(--sheet);color:var(--danger);border:1px solid color-mix(in srgb,var(--danger) 45%,var(--line))}
.btn.sm{padding:5px 10px;font-size:.85rem;border-radius:8px}
.ib{width:34px;height:34px;border-radius:10px;border:1px solid var(--line);background:var(--sheet);cursor:pointer;display:grid;place-items:center;font-weight:800;padding:0}
.ib:hover{background:var(--pocket)}
:is(.btn,.ib,.chip,.row,.gcard,.vtab,.pill,.bar):focus-visible{outline:2px solid var(--brand);outline-offset:2px}
.card{background:var(--sheet);border:1px solid var(--line);border-radius:var(--radius,14px);box-shadow:var(--shadow)}
.sec{padding:14px}
h1{margin:0 0 2px;font-size:1.7rem;letter-spacing:-.02em}
h3{margin:0 0 10px;font-size:.78rem;letter-spacing:.07em;text-transform:uppercase;color:var(--muted)}
.sub{color:var(--muted);margin:0}
.hint{color:var(--muted);font-size:.85rem}
.head{display:flex;gap:12px;align-items:flex-end;flex-wrap:wrap;margin-bottom:14px}
.stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:14px}
.stat{padding:12px 14px}.stat b{display:block;font-size:1.5rem;letter-spacing:-.01em}.stat small{color:var(--muted)}
.stat b.ok{color:var(--ok)}
.fbar{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:8px}
.chip{border:1px solid var(--line);background:var(--sheet);border-radius:999px;padding:7px 14px;cursor:pointer;font-weight:600;white-space:nowrap}
.chip:hover{background:var(--pocket)}
.chip[aria-pressed="true"]{background:var(--ink);color:var(--bg);border-color:var(--ink)}
.clab{font-size:.7rem;letter-spacing:.09em;text-transform:uppercase;color:var(--muted);font-weight:700;margin-right:2px}
input[type=search],input[type=text],input[type=number],select,textarea{border:1px solid var(--line);border-radius:10px;padding:8px 11px;background:var(--sheet)}
input:focus,select:focus,textarea:focus{outline:2px solid color-mix(in srgb,var(--brand) 45%,transparent);border-color:var(--brand)}
.fbar input[type=search]{min-width:200px}
.seg{display:inline-flex;background:var(--pocket);padding:3px;border-radius:10px;gap:2px}
.seg button{border:0;background:none;border-radius:8px;padding:5px 12px;cursor:pointer;font-weight:600;color:var(--muted)}
.seg button[aria-pressed="true"]{background:var(--sheet);color:var(--ink);box-shadow:var(--shadow)}
.layout{display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:16px;align-items:start}
.side{position:sticky;top:12px;display:grid;gap:12px}
@media(max-width:1180px){.layout{grid-template-columns:1fr}.side{position:static}.stats{grid-template-columns:repeat(2,1fr)}}
.list{padding:6px 12px 12px;overflow:hidden}
.lhead,.row{display:grid;grid-template-columns:22px 48px minmax(0,1.6fr) minmax(0,1fr) 78px 70px 96px 84px 30px;gap:8px;align-items:center}
.lhead{padding:10px 8px;font-size:.72rem;letter-spacing:.07em;text-transform:uppercase;color:var(--muted);font-weight:700;border-bottom:1px solid var(--line)}
.lhead .r,.row .r{text-align:right}
.row{padding:9px 8px;border-bottom:1px solid var(--line);cursor:pointer;border-radius:10px;border-bottom-left-radius:0}
.row:hover{background:var(--pocket)}
.row .rar{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}.row .rar i{margin-right:4px}
.row[aria-selected="true"]{background:color-mix(in srgb,var(--accent) 16%,var(--sheet));box-shadow:inset 3px 0 0 var(--accent)}
.row .ck{width:18px;height:18px;accent-color:var(--accent);cursor:pointer}
.thumb{width:48px;aspect-ratio:63/88;border-radius:5px;background:var(--tc,#59607f);display:grid;place-items:center;color:#fff;font-weight:800;overflow:hidden;border:2px solid #e6c34a;position:relative}
.thumb img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.nm{font-weight:700;display:flex;gap:6px;align-items:center;flex-wrap:wrap}
.nm small,.sm2{color:var(--muted);font-weight:500;font-size:.8rem;display:block}
.badge{font-size:.7rem;font-weight:800;padding:2px 8px;border-radius:999px;background:var(--pocket);color:var(--muted)}
.badge.holo{background:linear-gradient(90deg,#9ad1ff,#d6a8ff,#ffc2a8);color:#241a00}
.badge.own{background:color-mix(in srgb,var(--ok) 20%,var(--sheet));color:var(--ok)}
.pill{display:inline-flex;align-items:center;gap:5px;font-size:.78rem;font-weight:700;padding:3px 10px;border-radius:999px;border:1px solid var(--line);background:var(--sheet);cursor:pointer}
.pill i{width:8px;height:8px;border-radius:50%;background:currentColor;display:block}
.pill.high{color:var(--danger)}.pill.med{color:var(--warn)}.pill.low{color:var(--muted)}
.pill:hover{background:var(--pocket)}
.st{font-size:.78rem;font-weight:700;padding:3px 10px;border-radius:8px;background:var(--pocket);justify-self:start}
.st.deal{background:color-mix(in srgb,var(--ok) 20%,var(--sheet));color:var(--ok)}
.st.ord{background:color-mix(in srgb,var(--brand) 20%,var(--sheet));color:var(--brand)}
.pr{font-weight:700;text-align:right}.pr small{display:block;font-weight:600;font-size:.75rem}
.up{color:var(--danger)}.dn{color:var(--ok)}
.tgt{text-align:right;color:var(--muted);font-weight:600}
.rar{display:flex;gap:6px;align-items:center;font-size:.88rem}
.rar i{min-width:20px;height:20px;padding:0 3px;border-radius:5px;background:var(--pocket-edge);display:grid;place-items:center;font-style:normal;font-size:.7rem;color:var(--ink);flex:none;white-space:nowrap}
.empty{padding:40px 10px;text-align:center;color:var(--muted)}
.empty b{display:block;color:var(--ink);font-size:1.1rem;margin-bottom:4px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:14px;padding:12px 8px}
.gcard{background:none;border:0;padding:0;text-align:left;cursor:pointer;display:block;border-radius:10px}
.gcard .thumb{width:100%;border-radius:8px;font-size:2rem}
.gcard[aria-selected="true"] .thumb{outline:3px solid var(--accent);outline-offset:2px}
.gcard b{display:block;margin-top:6px;line-height:1.2}.gcard small{color:var(--muted)}
.gcard .tags{display:flex;gap:6px;align-items:center;margin-top:4px;flex-wrap:wrap}
.gcard .ck{position:absolute;top:6px;left:6px;width:18px;height:18px;z-index:2;accent-color:var(--accent)}
.ring{display:flex;gap:14px;align-items:center}
.ringc{width:72px;height:72px;border-radius:50%;background:conic-gradient(var(--accent) calc(var(--p)*1%),var(--pocket) 0);display:grid;place-items:center;flex:none}
.ringc span{width:54px;height:54px;border-radius:50%;background:var(--sheet);display:grid;place-items:center;font-weight:800}
.kv{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}
.kv div{background:var(--pocket);border-radius:10px;padding:8px 10px}.kv b{display:block;font-size:1.1rem}.kv small{color:var(--muted)}
.pimg{position:relative;border-radius:10px;overflow:hidden;aspect-ratio:63/88;background:var(--tc,#59607f);display:grid;place-items:center;color:#fff;font-size:3.2rem;font-weight:800;margin-bottom:10px;border:3px solid #e6c34a}
.pimg img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.pn{font-weight:800;font-size:1.1rem}
.pf{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:10px 0}
.pf div{background:var(--pocket);border-radius:10px;padding:7px 10px}.pf small{display:block;color:var(--muted);font-size:.75rem}.pf b{font-size:.92rem}
.pa{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
.spark{width:100%;height:60px;display:block;margin-top:6px}
.fld{display:grid;gap:4px;font-weight:650;font-size:.85rem;color:var(--muted);margin-top:10px}
.fld input,.fld select,.fld textarea{width:100%;color:var(--ink);font-weight:500}
.tabs{display:flex;gap:2px;background:var(--pocket);padding:3px;border-radius:10px;margin-bottom:10px}
.tabs button{flex:1;border:0;background:none;border-radius:8px;padding:6px 4px;cursor:pointer;font-weight:600;color:var(--muted)}
.tabs button[aria-selected="true"]{background:var(--sheet);color:var(--ink);box-shadow:var(--shadow)}
.bar{display:grid;grid-template-columns:minmax(0,9rem) 1fr 2.4rem;gap:8px;align-items:center;padding:3px 0;font-size:.88rem;background:none;border:0;width:100%;text-align:left;cursor:pointer;border-radius:6px}
.bar:hover{background:var(--pocket)}.bar[aria-pressed="true"]{background:color-mix(in srgb,var(--accent) 22%,var(--sheet))}
.bar span:first-child{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.btr{height:8px;border-radius:4px;background:var(--pocket);overflow:hidden}.btr i{display:block;height:100%;background:var(--brand)}
.bar b{text-align:right}
.setrow{padding:8px 0;border-top:1px solid var(--line)}.setrow:first-of-type{border-top:0}
.setrow .top{display:flex;gap:8px;align-items:center}.setrow .top b{flex:1}
.mbar{height:6px;border-radius:3px;background:var(--pocket);margin:6px 0;overflow:hidden}.mbar i{display:block;height:100%;background:var(--accent)}
.sbar{display:none;align-items:center;gap:8px;flex-wrap:wrap;padding:10px 12px;margin-top:10px;border-radius:12px;background:var(--sheet);color:var(--ink);border:1px solid var(--line);border-left:4px solid var(--accent);box-shadow:0 6px 18px rgba(0,0,0,.18)}
.sbar.on{display:flex}.sbar>b{margin-right:4px}
.sbar .btn.ghost{background:var(--pocket)}
.pop{position:fixed;z-index:40;min-width:180px;background:var(--sheet);border:1px solid var(--line);border-radius:12px;box-shadow:0 12px 32px rgba(0,0,0,.25);padding:6px}
.pop button{display:block;width:100%;text-align:left;border:0;background:none;padding:8px 10px;border-radius:8px;cursor:pointer}
.pop button:hover{background:var(--pocket)}.pop .d{color:var(--danger)}
dialog{border:1px solid var(--line);border-radius:16px;background:var(--sheet);color:var(--ink);padding:0;width:min(560px,94vw);box-shadow:0 24px 70px rgba(0,0,0,.45)}
dialog::backdrop{background:rgba(6,9,20,.6)}
.dh{padding:16px 18px 0}.dh h2{margin:0 0 2px;font-size:1.2rem}
.db{padding:6px 18px 14px}
.df{display:flex;gap:8px;justify-content:flex-end;padding:12px 18px;border-top:1px solid var(--line)}
.two{display:grid;grid-template-columns:1fr 1fr;gap:10px}.three{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.res{border:1px solid var(--line);border-radius:12px;max-height:240px;overflow:auto;margin-top:8px}
.res button{display:flex;gap:10px;align-items:center;width:100%;text-align:left;border:0;background:none;padding:7px 10px;cursor:pointer;border-bottom:1px solid var(--line)}
.res button:last-child{border-bottom:0}.res button:hover,.res button[aria-pressed="true"]{background:color-mix(in srgb,var(--accent) 18%,var(--sheet))}
.res .thumb{width:30px;border-width:1px;font-size:.8rem}
.res b{display:block;line-height:1.2}.res small{color:var(--muted)}
.toast{position:fixed;left:50%;bottom:22px;transform:translate(-50%,160%);z-index:150;display:flex;gap:12px;align-items:center;background:var(--ink);color:var(--bg);padding:10px 12px 10px 16px;border-radius:12px;box-shadow:0 12px 36px rgba(0,0,0,.4);transition:transform .25s;max-width:min(560px,92vw)}
.toast.show{transform:translate(-50%,0)}.toast span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}
.toast button{border:0;border-radius:8px;padding:6px 12px;font-weight:800;cursor:pointer;background:var(--accent);color:var(--accent-ink)}
@media(max-width:1000px){.lhead{display:none}.row{grid-template-columns:30px 54px minmax(0,1fr) 34px}.row>:nth-child(n+4):not(:last-child){display:none}}
`;
const WLP={high:["High",0],med:["Medium",1],low:["Low",2]};
let WLR=null,WLTAB="prio",WLPICK=null,WLRES=[],WLOWN=[],WLBUSY=false;
const WL={k:"",v:"",set:"",rar:"",sort:"prio",mode:"list",q:"",sel:null,multi:new Set(),selMode:false};
const WLU=[];
const wq=s=>WLR&&WLR.querySelector(s),wqa=s=>WLR?[...WLR.querySelectorAll(s)]:[];
function wlList(){if(!Array.isArray(S.wish))S.wish=[];return S.wish}
function wlKind(c){const s=String((c.details&&c.details.supertype)||c.kind||"").toLowerCase();return /energy/.test(s)?"energy":/trainer/.test(s)?"trainer":"pokemon"}
function wlHue(s){let h=0;for(const ch of String(s))h=(h*31+ch.charCodeAt(0))%360;return `hsl(${h} 35% 42%)`}
function wlPrice(w){const u=unitVal(w);return u==null?null:u}
function wlD7(w){
  const ph=Array.isArray(w.phist)?w.phist:[];
  if(ph.length>=2){const cur=ph[ph.length-1].v,cut=new Date(Date.now()-7*864e5).toISOString().slice(0,10);let base=null;for(const p of ph)if(String(p.d)<=cut)base=p;if(!base)base=ph[0];if(base&&base.v>0&&base!==ph[ph.length-1])return (cur-base.v)/base.v}
  const p=w.price;if(p&&p.avg7>0&&p.trend>0)return (p.trend-p.avg7)/p.avg7;
  return 0}
const wlDeal=w=>{const p=wlPrice(w);return !!w.target&&p!=null&&p<=w.target};
const wlEur=n=>n==null?"—":eur(n);
function wlThumb(w){const u=w.tcgImage?w.tcgImage+"/low.webp":"";return `<span class="thumb" style="--tc:${wlHue(w.name)}">${esc((w.name||"?")[0])}${u?`<img alt="" loading="lazy" src="${esc(u)}" onerror="this.remove()">`:""}</span>`}
function wlRarSym(r){const l=String(r||"").toLowerCase();return /hyper|secret/.test(l)?"★★★":/special illustration/.test(l)?"★★":/illustration|ultra|double/.test(l)?"★":/uncommon/.test(l)?"◆":/common/.test(l)?"●":/holo|rare/.test(l)?"★":"·"}
function wlOwnN(w){let n=0;for(const c of S.cards){if(w.tcgdexId?c.tcgdexId===w.tcgdexId:(c.name===w.name&&c.setCode===w.setCode&&String(c.number)===String(w.number)))n+=(+c.qty||1)}return n}
function wlSave(){try{if(S.raw&&S.raw.wish)S.raw.wish(S.wish)}catch{}try{localStorage.setItem("pokemon-catalog-wish-v1",JSON.stringify(S.wish))}catch{}if(window.sbRefresh)try{sbRefresh()}catch{}}
function wlSnap(){WLU.push(JSON.stringify(wlList()));if(WLU.length>30)WLU.shift()}
function wlToast(msg,undo,fn){if(!WLR)return;wlToast.u=fn||null;wq("#tmsg").textContent=msg;wq("#tundo").hidden=!undo;wq("#toast").classList.add("show");clearTimeout(wlToast.t);wlToast.t=setTimeout(()=>wq("#toast").classList.remove("show"),5200)}
function wlFiltered(){
  const q=WL.q.trim().toLowerCase();
  let l=wlList().filter(w=>{
    if(WL.k&&wlKind(w)!==WL.k)return false;
    if(WL.set&&w.set!==WL.set)return false;
    if(WL.rar&&w.rarity!==WL.rar)return false;
    if(WL.v==="high"&&w.prio!=="high")return false;
    if(WL.v==="deal"&&!wlDeal(w))return false;
    if(WL.v==="drop"&&!(wlD7(w)<-0.01))return false;
    if(WL.v==="ord"&&w.status!=="ord")return false;
    if(q&&![w.name,w.set,w.setCode,w.number,w.rarity,w.note].join(" ").toLowerCase().includes(q))return false;
    return true});
  const s=WL.sort,P=w=>wlPrice(w)??1e9,gap=w=>w.target?(P(w)-w.target)/w.target:1e9;
  l.sort((a,b)=>s==="prio"?WLP[a.prio][1]-WLP[b.prio][1]||a.name.localeCompare(b.name):s==="drop"?wlD7(a)-wlD7(b):s==="gap"?gap(a)-gap(b):s==="price"?P(a)-P(b):s==="new"?String(b.added).localeCompare(String(a.added)):a.name.localeCompare(b.name));
  return l}
const wlStatus=w=>wlDeal(w)||w.status==="deal"?`<span class="st deal">At target</span>`:w.status==="ord"?`<span class="st ord">Ordered</span>`:`<span class="st">Watching</span>`;
const wlPrio=w=>`<button class="pill ${w.prio}" data-prio="${w.id}" title="Click to change priority"><i></i>${WLP[w.prio][0]}</button>`;
function wlPriceCell(w){const d=wlD7(w),p=wlPrice(w);return `<div class="pr">${wlEur(p)}<small class="${d>0.005?"up":d<-0.005?"dn":""}">${d>0.005?"▲":d<-0.005?"▼":"–"} ${(Math.abs(d)*100).toFixed(1)}% · 7d</small></div>`}
function wlRender(){
  if(!WLR){wlInit();if(!WLR)return}
  if(S.screen!=="wishlist")return;
  const W=wlList(),L=wlFiltered();
  const cost=W.reduce((a,w)=>a+(wlPrice(w)||0),0),deals=W.filter(wlDeal),goal=W.reduce((a,w)=>a+(w.target||wlPrice(w)||0),0);
  wq("#sub").textContent=`${plural(W.length,"card")} you're hunting · ${deals.length} at or under your target`;
  wq("#stats").innerHTML=[[W.length,"Cards wanted"],[eur(cost),"Cost at today’s prices"],[deals.length,"At or under target",deals.length?"ok":""],[eur(Math.max(0,cost-goal)),"Over your targets in total"]].map(([b,s,c])=>`<div class="card stat"><b class="${c||""}">${b}</b><small>${s}</small></div>`).join("");
  const sets=[...new Set(W.map(w=>w.set).filter(Boolean))].sort(),rars=[...new Set(W.map(w=>w.rarity).filter(Boolean))].sort();
  wq("#fset").innerHTML=`<option value="">All sets</option>`+sets.map(s=>`<option${s===WL.set?" selected":""}>${esc(s)}</option>`).join("");
  wq("#frar").innerHTML=`<option value="">All rarities</option>`+rars.map(s=>`<option${s===WL.rar?" selected":""}>${esc(s)}</option>`).join("");
  wq("#fsort").value=WL.sort;
  wqa("#kinds [data-k]").forEach(b=>b.setAttribute("aria-pressed",b.dataset.k===WL.k));
  wqa("#views [data-v]").forEach(b=>b.setAttribute("aria-pressed",b.dataset.v===WL.v));
  wqa("#vmode [data-m]").forEach(b=>b.setAttribute("aria-pressed",b.dataset.m===WL.mode));
  wq("#selm").setAttribute("aria-pressed",WL.selMode);
  wq("#clr").hidden=!(WL.k||WL.v||WL.set||WL.rar||WL.q);
  if(WL.sel&&!W.some(w=>w.id===WL.sel))WL.sel=null;
  if(!WL.sel&&L.length)WL.sel=L[0].id;
  const box=wq("#list");
  if(!W.length)box.innerHTML=`<div class="empty"><b>Your wish list is empty</b>Add the cards you’re hunting for, with a target price and a priority.<div style="margin-top:12px"><button class="btn" data-add>＋ Add to wish list</button></div></div>`;
  else if(!L.length)box.innerHTML=`<div class="empty"><b>Nothing matches these filters</b>Try clearing a filter.</div>`;
  else if(WL.mode==="list")box.innerHTML=`<div class="lhead"><span></span><span></span><span>Card</span><span>Rarity</span><span>Priority</span><span class="r">Target</span><span class="r">Price</span><span>Status</span><span></span></div>`+L.map(w=>{const o=wlOwnN(w);return `<div class="row" role="button" tabindex="0" data-id="${w.id}" aria-selected="${w.id===WL.sel}"><input class="ck" type="checkbox" aria-label="Select ${esc(w.name)}" ${WL.multi.has(w.id)?"checked":""} ${WL.selMode?"":'style="visibility:hidden"'}>${wlThumb(w)}<div><div class="nm">${esc(w.name)}${w.variant&&w.variant!=="Normal"?`<span class="badge ${/holo/i.test(w.variant)?"holo":""}">${esc(w.variant)}</span>`:""}${o?`<span class="badge own" title="You already own this card">Own ${o}</span>`:""}</div><span class="sm2">${esc(w.set||"")} · ${esc(w.setCode||"")} ${esc(w.number||"")}</span></div><div class="rar" title="${esc(w.rarity||"")}"><i>${wlRarSym(w.rarity)}</i>${esc(String(w.rarity||"—").replace(/special illustration rare/i,"Illus. rare"))}</div><div>${wlPrio(w)}</div><div class="tgt">${w.target?eur(w.target):"—"}</div>${wlPriceCell(w)}<div>${wlStatus(w)}</div><button class="ib" data-menu="${w.id}" aria-label="More">⋮</button></div>`}).join("");
  else box.innerHTML=`<div class="grid">${L.map(w=>`<div class="gcard" role="button" tabindex="0" data-id="${w.id}" aria-selected="${w.id===WL.sel}"><span style="position:relative;display:block">${WL.selMode?`<input class="ck" type="checkbox" ${WL.multi.has(w.id)?"checked":""} aria-label="Select ${esc(w.name)}">`:""}${wlThumb(w)}</span><b>${esc(w.name)}</b><small>${esc(w.setCode||"")} ${esc(w.number||"")}</small><span class="tags">${wlPrio(w)}<span class="sm2" style="display:inline">${wlEur(wlPrice(w))}</span></span></div>`).join("")}</div>`;
  const n=WL.multi.size,sb=wq("#sbar");sb.classList.toggle("on",n>0);
  sb.innerHTML=n?`<b>${n} selected</b><button class="btn ghost sm" data-b="own">Mark as owned</button><button class="btn ghost sm" data-b="prio">Set priority ▾</button><button class="btn danger sm" data-b="del">Remove</button><span class="grow"></span><button class="btn ghost sm" data-b="clear">Clear</button>`:"";
  wlSide();
  if(window.sbRefresh)try{sbRefresh()}catch{}
}
function wlSpark(w){
  let h=(Array.isArray(w.phist)?w.phist:[]).slice(-14).map(p=>p.v);
  if(h.length<2&&w.price){const p=w.price;h=[p.avg30,p.avg7,p.trend].filter(x=>x>0)}
  if(h.length<2)return `<p class="hint">No price history yet. It builds up each time prices are refreshed.</p>`;
  const mn=Math.min(...h),mx=Math.max(...h),r=mx-mn||1;const pts=h.map((v,i)=>`${(i/(h.length-1)*100).toFixed(1)},${(52-((v-mn)/r)*44).toFixed(1)}`).join(" ");
  return `<svg class="spark" viewBox="0 0 100 60" preserveAspectRatio="none" aria-label="Price history"><polyline fill="none" stroke="var(--brand)" stroke-width="2" vector-effect="non-scaling-stroke" points="${pts}"/><circle cx="100" cy="${pts.split(" ").pop().split(",")[1]}" r="2.6" fill="var(--accent)"/></svg>`}
function wlBars(rows,key){const mx=Math.max(1,...rows.map(r=>r[1]));return rows.map(([l,n])=>`<button class="bar" data-bar="${key}|${esc(l)}" aria-pressed="${(key==="set"&&WL.set===l)||(key==="rar"&&WL.rar===l)||(key==="prio"&&WL.v==="high"&&l==="High")}"><span>${esc(l)}</span><span class="btr"><i style="width:${n/mx*100}%"></i></span><b>${n}</b></button>`).join("")}
function wlNear(){
  const owned={};
  for(const c of S.cards){const id=(typeof pkSetId==="function"?pkSetId(c):"")||"";if(!id)continue;(owned[id]=owned[id]||new Set()).add(String(parseInt(String(c.number).split("/")[0],10)||c.number))}
  const out=[];
  for(const [id,s] of Object.entries(owned)){const r=PKL.setRow(id);if(!r||!r[3])continue;const tot=+r[3],have=Math.min(s.size,tot),miss=tot-have;if(miss>0&&have>=Math.min(5,tot/4))out.push({id,name:r[1],tot,have,miss})}
  return out.sort((a,b)=>a.miss/a.tot-b.miss/b.tot).slice(0,3)}
function wlSide(){
  const W=wlList(),w=W.find(x=>x.id===WL.sel),cost=W.reduce((a,x)=>a+(wlPrice(x)||0),0),deals=W.filter(wlDeal).length;
  const pct=W.length?Math.round(deals/W.length*100):0;
  let h=`<div class="card sec"><h3>Wish list</h3><div class="ring"><div class="ringc" style="--p:${pct}"><span>${pct}%</span></div><div><b>${deals} of ${W.length} at your target price</b><div class="hint">${eur(cost)} to buy everything today</div></div></div><div class="kv"><div><b>${W.filter(x=>x.prio==="high").length}</b><small>high priority</small></div><div><b>${W.filter(x=>wlD7(x)<-0.01).length}</b><small>price dropped (7 days)</small></div></div></div>`;
  if(w){const d=wlD7(w),p=wlPrice(w),o=wlOwnN(w),u=w.tcgImage?w.tcgImage+"/high.webp":"";
    h+=`<div class="card sec"><h3>Card</h3><span class="pimg" style="--tc:${wlHue(w.name)}">${esc((w.name||"?")[0])}${u?`<img alt="" src="${esc(u)}" onerror="this.remove()">`:""}</span><div class="pn">${esc(w.name)}</div><div class="sm2" style="font-weight:500">${esc(w.set||"")} · ${esc(w.setCode||"")} ${esc(w.number||"")}</div>
  <div class="pf"><div><small>Price today</small><b>${wlEur(p)}</b></div><div><small>Your target</small><b>${w.target?eur(w.target):"—"}</b></div><div><small>Rarity</small><b>${esc(w.rarity||"—")}</b></div><div><small>7-day change</small><b class="${d>0.005?"up":d<-0.005?"dn":""}">${d>0?"+":""}${(d*100).toFixed(1)}%</b></div></div>
  ${o?`<p class="hint" style="margin:0 0 6px">You already own ${plural(o,"copy").replace("copys","copies")} of this card.</p>`:""}
  ${wlSpark(w)}
  <label class="fld">Priority<select data-f="prio"><option value="high"${w.prio==="high"?" selected":""}>High</option><option value="med"${w.prio==="med"?" selected":""}>Medium</option><option value="low"${w.prio==="low"?" selected":""}>Low</option></select></label>
  <div class="two"><label class="fld">Target price (€)<input type="number" step="0.01" min="0" data-f="target" value="${w.target??""}"></label><label class="fld">Status<select data-f="status"><option value="watching"${w.status!=="ord"?" selected":""}>Watching</option><option value="ord"${w.status==="ord"?" selected":""}>Ordered</option></select></label></div>
  <label class="fld">Note<textarea rows="2" data-f="note">${esc(w.note||"")}</textarea></label>
  <div class="pa"><button class="btn sm" data-a="own" data-id="${w.id}">I got it · mark as owned</button><button class="btn ghost sm" data-a="cm" data-id="${w.id}">Cardmarket ↗</button><button class="btn danger sm" data-a="del" data-id="${w.id}">Remove</button></div></div>`}
  else h+=`<div class="card sec"><h3>Card</h3><p class="hint">Select a card in the list to see its price, target and notes.</p></div>`;
  const cnt=k=>Object.entries(W.reduce((a,x)=>{const y=k==="prio"?WLP[x.prio][0]:k==="set"?x.set:x.rarity;if(y)a[y]=(a[y]||0)+1;return a},{})).sort((a,b)=>b[1]-a[1]);
  h+=`<div class="card sec"><h3>Breakdown <span class="hint" style="text-transform:none;letter-spacing:0">click a bar to filter</span></h3><div class="tabs" role="tablist">${[["prio","Priority"],["set","Set"],["rar","Rarity"]].map(([k,t])=>`<button role="tab" data-bt="${k}" aria-selected="${WLTAB===k}">${t}</button>`).join("")}</div>${W.length?wlBars(cnt(WLTAB),WLTAB):`<p class="hint">Nothing to show yet.</p>`}</div>`;
  let near=[];try{near=wlNear()}catch{}
  h+=`<div class="card sec"><h3>Closest sets to complete</h3>${near.length?near.map(s=>`<div class="setrow"><div class="top"><b>${esc(s.name)}</b><span class="hint">${s.miss} missing</span></div><div class="mbar"><i style="width:${(s.have/s.tot*100).toFixed(0)}%"></i></div><button class="btn ghost sm" data-a="allmiss" data-set="${esc(s.id)}">＋ Add the ${s.miss} missing</button></div>`).join(""):`<p class="hint">Once you own a few cards from a set, the sets you are closest to finishing appear here.</p>`}</div>`;
  wq("#side").innerHTML=h}
/* ---- build the page ---- */
function wlInit(){
  const h=document.getElementById("wlHost");if(!h||WLR)return;
  WLR=h.attachShadow({mode:"open"});
  WLR.innerHTML=`<style>${WLCSS}</style><div class="page">
    <div class="head"><div class="grow"><h1>Wish list</h1><p class="sub" id="sub"></p></div>
      <button class="btn ghost" type="button" data-imp>Import from text…</button>
      <button class="btn ghost" type="button" id="exp">Export CSV</button>
      <button class="btn" type="button" data-add>＋ Add to wish list</button></div>
    <div class="stats" id="stats"></div>
    <div class="fbar" id="kinds"><span class="clab">Kind</span>
      <button class="chip" data-k="" aria-pressed="true">All</button><button class="chip" data-k="pokemon" aria-pressed="false">Pokémon</button><button class="chip" data-k="trainer" aria-pressed="false">Trainer</button><button class="chip" data-k="energy" aria-pressed="false">Energy</button>
      <span class="grow"></span><input type="search" id="q" placeholder="Search name, set, number…" aria-label="Search the wish list"></div>
    <div class="fbar" id="views"><span class="clab">Saved views</span>
      <button class="chip" data-v="high" aria-pressed="false">High priority</button><button class="chip" data-v="deal" aria-pressed="false">At or under target</button><button class="chip" data-v="drop" aria-pressed="false">Price dropped</button><button class="chip" data-v="ord" aria-pressed="false">Ordered</button>
      <span class="grow"></span>
      <label class="vh" for="fset">Set</label><select id="fset"></select><label class="vh" for="frar">Rarity</label><select id="frar"></select><label class="vh" for="fsort">Sort</label>
      <select id="fsort"><option value="prio">Sort: Priority</option><option value="drop">Sort: Biggest drop</option><option value="gap">Sort: Closest to target</option><option value="price">Sort: Price (low first)</option><option value="name">Sort: Name (A–Z)</option><option value="new">Sort: Recently added</option></select>
      <div class="seg" id="vmode" role="group" aria-label="View"><button type="button" data-m="list" aria-pressed="true">Table</button><button type="button" data-m="grid" aria-pressed="false">Pictures</button></div>
      <button class="btn ghost sm" type="button" id="selm" aria-pressed="false">☑ Select</button><button class="btn ghost sm" type="button" id="clr" hidden>Clear all filters</button></div>
    <div class="layout"><div><div class="card list" id="list" aria-live="polite"></div><div class="sbar" id="sbar" role="status"></div></div><aside class="side" id="side"></aside></div>
  </div>
  <dialog id="dAdd"><form method="dialog" id="fAdd"><div class="dh"><h2>Add to wish list</h2><p class="sub">Search TCGdex by name. Add a set code or number in the second box to narrow it down, such as <b>SSP</b> or <b>238</b>.</p></div>
    <div class="db"><div class="two" style="grid-template-columns:2fr 1fr"><input type="search" id="aq" placeholder="Pikachu ex, Umbreon VMAX…" autocomplete="off"><input type="search" id="aq2" placeholder="Set code or number" autocomplete="off"></div>
      <p class="hint" id="ast" style="margin:6px 0 0">Type at least two letters, then press Enter.</p><div class="res" id="ares" hidden></div>
      <div class="three"><label class="fld">Variant<select id="avar">${(typeof VARIANTS!=="undefined"?VARIANTS:["Normal","Holo","Reverse Holo"]).map(v=>`<option>${esc(v)}</option>`).join("")}</select></label>
      <label class="fld">Priority<select id="apri"><option value="high">High</option><option value="med" selected>Medium</option><option value="low">Low</option></select></label>
      <label class="fld">Target price (€)<input type="number" id="atg" min="0" step="0.01" placeholder="e.g. 12.00"></label></div>
      <label class="fld">Note<textarea id="anote" rows="2" placeholder="Where to look, condition wanted, who to ask…"></textarea></label></div>
    <div class="df"><button class="btn ghost" value="cancel" formnovalidate>Cancel</button><button class="btn" id="aok" value="ok" disabled>Add to wish list</button></div></form></dialog>
  <dialog id="dOwn"><form method="dialog"><div class="dh"><h2 id="oT">Mark as owned</h2><p class="sub" id="oS">Choose where the card goes. Its details, artwork and price are kept.</p></div>
    <div class="db"><div class="two"><label class="fld">Place in<select id="otype"><option value="binder">A binder</option><option value="deck">A deck</option><option value="showcase">A showcase</option><option value="none">Unplaced (just owned)</option></select></label><label class="fld">Condition<select id="ocond"><option value="">Not set</option>${(typeof CONDITIONS!=="undefined"?CONDITIONS:["Near mint","Lightly played","Played"]).map(c=>`<option>${esc(c)}</option>`).join("")}</select></label></div>
      <div class="three" id="oloc"><label class="fld">Binder<select id="obn"></select></label><label class="fld">Page<input type="number" id="opg" min="1" value="1"></label><label class="fld">Pocket<input type="number" id="osl" min="1" max="9" value="1"></label></div>
      <label class="fld" id="onamew" hidden><span id="onamel">Name</span><input type="text" id="oname" list="oneames" autocomplete="off"><datalist id="oneames"></datalist></label>
      <p class="hint" id="ohint" style="margin:8px 0 0"></p></div>
    <div class="df"><button class="btn ghost" value="cancel" formnovalidate>Cancel</button><button class="btn" value="ok">Move to collection</button></div></form></dialog>
  <dialog id="dImp"><form method="dialog"><div class="dh"><h2>Import wish list from text</h2><p class="sub">One card per line: name, set code and number, then style and an optional target price.</p></div>
    <div class="db"><label class="fld">Paste text<textarea id="itx" rows="9" spellcheck="false" style="font-family:ui-monospace,Consolas,monospace;font-size:.85rem" placeholder="Pikachu ex	SSP 238	Holo	40&#10;Umbreon VMAX	EVS 215	Holo	"></textarea></label><p class="hint">Details, artwork and prices come from TCGdex, as in the binder text import. Cards you already own are flagged before adding.</p></div>
    <div class="df"><button class="btn ghost" value="cancel" formnovalidate>Cancel</button><button class="btn" value="ok">Import</button></div></form></dialog>
  <div class="toast" id="toast" role="status"><span id="tmsg"></span><button type="button" id="tundo">Undo</button></div>`;
  const R=WLR;
  R.addEventListener("click",wlClick);
  R.addEventListener("keydown",e=>{const r=e.target.closest&&e.target.closest(".row,.gcard");if(r&&(e.key==="Enter"||e.key===" ")&&!e.target.matches("button,input")){e.preventDefault();WL.sel=r.dataset.id;wlRender()}});
  wq("#q").oninput=e=>{WL.q=e.target.value;wlRender();const i=wq("#q");i.focus();i.setSelectionRange(i.value.length,i.value.length)};
  wq("#fset").onchange=e=>{WL.set=e.target.value;wlRender()};wq("#frar").onchange=e=>{WL.rar=e.target.value;wlRender()};wq("#fsort").onchange=e=>{WL.sort=e.target.value;wlRender()};
  wq("#side").addEventListener("change",e=>{const f=e.target.dataset.f;if(!f)return;const w=wlList().find(z=>z.id===WL.sel);if(!w)return;wlSnap();w[f]=f==="target"?(e.target.value===""?null:+e.target.value):e.target.value;wlSave();wlRender()});
  wq("#tundo").onclick=()=>{const fn=wlToast.u;wlToast.u=null;if(fn){fn();return}if(WLU.length){S.wish=JSON.parse(WLU.pop());WL.multi.clear();wlSave();wlRender();wq("#toast").classList.remove("show")}};
  wq("#exp").onclick=wlExport;
  wq("#aq").addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();wlSearch()}});wq("#aq2").addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();wlSearch()}});
  wq("#ares").onclick=e=>{const b=e.target.closest("[data-p]");if(!b)return;WLPICK=+b.dataset.p;const c=WLRES[WLPICK];wq("#aok").disabled=false;wlResShow();const cm=c.price;if(!wq("#atg").value&&cm){}};
  wq("#dAdd").addEventListener("close",()=>{if(wq("#dAdd").returnValue==="ok")wlAddPicked()});
  wq("#otype").onchange=wlOwnUi;
  wq("#dOwn").addEventListener("close",()=>{if(wq("#dOwn").returnValue==="ok")wlOwnGo()});
  wq("#dImp").addEventListener("close",()=>{if(wq("#dImp").returnValue==="ok")wlImport(wq("#itx").value)});
}
function wlClick(e){
  const t=e.target;let x;
  if(!t.closest(".pop"))wqa(".pop").forEach(p=>p.remove());
  if(t.closest("[data-add]")){wlOpenAdd();return}
  if(t.closest("[data-imp]")){wq("#dImp").showModal();return}
  if(x=t.closest("#kinds [data-k]")){WL.k=x.dataset.k;wlRender();return}
  if(x=t.closest("#views [data-v]")){WL.v=WL.v===x.dataset.v?"":x.dataset.v;wlRender();return}
  if(x=t.closest("#vmode [data-m]")){WL.mode=x.dataset.m;wlRender();return}
  if(t.closest("#selm")){WL.selMode=!WL.selMode;if(!WL.selMode)WL.multi.clear();wlRender();return}
  if(t.closest("#clr")){WL.k=WL.v=WL.set=WL.rar=WL.q="";wq("#q").value="";wlRender();return}
  if(x=t.closest("[data-prio]")){e.stopPropagation();const w=wlList().find(z=>z.id===x.dataset.prio);if(!w)return;wlSnap();w.prio=w.prio==="high"?"med":w.prio==="med"?"low":"high";WL.sel=w.id;wlSave();wlRender();return}
  if(x=t.closest("[data-menu]")){e.stopPropagation();wqa(".pop").forEach(p=>p.remove());const r=x.getBoundingClientRect(),id=x.dataset.menu;const p=document.createElement("div");p.className="pop";p.style.cssText=`top:${Math.min(r.bottom+4,innerHeight-190)}px;left:${Math.max(8,r.right-190)}px`;p.innerHTML=`<button data-a="own" data-id="${id}">Mark as owned</button><button data-a="cm" data-id="${id}">Open on Cardmarket</button><button data-a="dup" data-id="${id}">Duplicate (another variant)</button><button class="d" data-a="del" data-id="${id}">Remove</button>`;wq(".page").appendChild(p);return}
  if(x=t.closest("[data-a]")){wlAct(x.dataset.a,x.dataset.id,x);return}
  if(x=t.closest("[data-b]")){wlBulk(x.dataset.b);return}
  if(x=t.closest("[data-bt]")){WLTAB=x.dataset.bt;wlRender();return}
  if(x=t.closest("[data-bar]")){const [k,l]=x.dataset.bar.split("|");if(k==="set")WL.set=WL.set===l?"":l;if(k==="rar")WL.rar=WL.rar===l?"":l;if(k==="prio")WL.v=WL.v==="high"&&l==="High"?"":(l==="High"?"high":WL.v);wlRender();return}
  if(x=t.closest(".ck")){const id=x.closest("[data-id]").dataset.id;x.checked?WL.multi.add(id):WL.multi.delete(id);e.stopPropagation();wlRender();return}
  if(x=t.closest("[data-id]")){const id=x.dataset.id;if(WL.selMode||e.ctrlKey||e.metaKey){WL.multi.has(id)?WL.multi.delete(id):WL.multi.add(id)}WL.sel=id;wlRender()}
}
function wlAct(a,id,el){
  const W=wlList(),w=W.find(z=>z.id===id);
  if(a==="cm"&&w){window.open(`https://www.cardmarket.com/en/Pokemon/Products/Singles?searchString=${encodeURIComponent(w.name+(w.number?" "+String(w.number).split("/")[0]:""))}`,"_blank","noopener");return}
  if(a==="del"&&w){wlSnap();S.wish=W.filter(z=>z.id!==id);WL.multi.delete(id);wlSave();wlRender();wlToast(`Removed ${w.name} from the wish list`,true);return}
  if(a==="dup"&&w){wlSnap();const v=w.variant==="Normal"?"Reverse Holo":"Normal";S.wish.push({...w,id:wlNewId(),variant:v,added:new Date().toISOString()});wlSave();wlRender();wlToast(`Added another ${w.name} as ${v}`,true);return}
  if(a==="own"&&w){wlOpenOwn([w]);return}
  if(a==="allmiss"){wlAddMissing(el.dataset.set);return}
}
function wlBulk(b){
  const W=wlList(),ids=[...WL.multi],ws=W.filter(w=>ids.includes(w.id));
  if(b==="clear"){WL.multi.clear();wlRender();return}
  if(b==="del"){wlSnap();S.wish=W.filter(w=>!ids.includes(w.id));WL.multi.clear();wlSave();wlRender();wlToast(`Removed ${plural(ws.length,"card")} from the wish list`,true);return}
  if(b==="own"){wlOpenOwn(ws);return}
  if(b==="prio"){wlSnap();ws.forEach(w=>w.prio=w.prio==="high"?"med":w.prio==="med"?"low":"high");wlSave();wlRender();wlToast(`Priority changed on ${plural(ws.length,"card")}`,true)}
}
const wlNewId=()=>"w"+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
/* ---- add ---- */
function wlOpenAdd(){WLPICK=null;WLRES=[];wq("#aq").value="";wq("#aq2").value="";wq("#atg").value="";wq("#anote").value="";wq("#avar").value="Normal";wq("#apri").value="med";wq("#aok").disabled=true;wq("#ares").hidden=true;wq("#ast").textContent="Type at least two letters, then press Enter.";wq("#dAdd").showModal();setTimeout(()=>wq("#aq").focus(),30)}
async function wlSearch(){
  const q=wq("#aq").value.trim(),q2=wq("#aq2").value.trim(),st=wq("#ast");
  if(q.replace(/[^a-z]/gi,"").length<2){st.textContent="Type at least two letters of the card name.";return}
  st.textContent="Searching TCGdex…";wq("#ares").hidden=true;WLPICK=null;wq("#aok").disabled=true;
  let list;try{list=await PKL.tget("/cards?name="+encodeURIComponent(q))}catch{st.textContent="Couldn’t reach TCGdex. Check your internet connection.";return}
  const out=[];
  for(const x of list||[]){
    const sid=x.id.slice(0,x.id.length-String(x.localId).length-1);const r=PKL.setRow(sid);if(!r)continue;
    if(q2){const u=q2.toUpperCase();if(/^\d+$/.test(q2)){if(parseInt(x.localId,10)!==parseInt(q2,10))continue}else if(!(String(r[2]).split(":")[0]===u||sid.toUpperCase()===u||String(r[1]).toUpperCase().includes(u)))continue}
    out.push({...x,sid,row:r});
  }
  out.sort((a,b)=>String(b.row[6]||"").localeCompare(String(a.row[6]||""))||String(a.localId).localeCompare(String(b.localId),undefined,{numeric:true}));
  WLRES=out.slice(0,80);
  st.textContent=out.length?`${plural(out.length,"result")}${out.length>80?" (showing 80)":""}. Pick the card you want.`:"No matching cards found. Check the spelling.";
  wlResShow()}
function wlResShow(){
  const box=wq("#ares");box.hidden=!WLRES.length;
  box.innerHTML=WLRES.map((x,i)=>{const on=wlList().some(w=>w.tcgdexId===x.id),own=S.cards.some(c=>c.tcgdexId===x.id);return `<button type="button" data-p="${i}" aria-pressed="${WLPICK===i}"><span class="thumb" style="--tc:${wlHue(x.name)}">${esc(x.name[0])}${x.image?`<img alt="" loading="lazy" src="${esc(x.image)}/low.webp" onerror="this.remove()">`:""}</span><span style="flex:1"><b>${esc(x.name)}</b><small>${esc(x.row[1])} · ${esc(x.localId)}/${esc(x.row[3])}</small></span><span class="sm2" style="text-align:right">${on?"On your list":own?"You own it":""}</span></button>`}).join("")}
async function wlBuild(card,f){
  const o={tcg:f,art:false};await PKL.enrich(card,f?o:{art:false});
  const w={id:wlNewId(),name:card.name,set:card.set||"",series:card.series||"",setCode:card.setCode||"",number:card.number||"",regMark:card.regMark||"",rarity:card.rarity||"",variant:card.variant||"Normal",tcgdexId:card.tcgdexId||"",tcgImage:card.tcgImage||"",price:card.price||null,dex:card.dex||null,kind:wlKind(card),prio:card.prio||"med",target:card.target??null,status:"watching",note:card.note||"",added:new Date().toISOString()};
  phistOf(w,null);return w}
async function wlAddPicked(){
  const x=WLRES[WLPICK];if(!x)return;const st=wq("#ast");
  let f;try{f=await PKL.cardById(x.id)}catch{st.textContent="Couldn’t load that card. Try another.";wq("#dAdd").showModal();return}
  const r=x.row;
  const card={name:f.name,set:r[1],series:r[5]||"",setCode:String(r[2]).split(":")[0],number:`${f.localId}/${String(r[3]).padStart(String(f.localId).length,"0")}`,regMark:"",rarity:"",variant:wq("#avar").value,qty:1,prio:wq("#apri").value,target:+wq("#atg").value||null,note:wq("#anote").value};
  const w=await wlBuild(card,f);
  wlSnap();S.wish.push(w);WL.sel=w.id;wlSave();wlRender();wlToast(`${w.name} added to your wish list`,true)}
/* ---- mark as owned ---- */
function wlOpenOwn(ws){
  WLOWN=ws;wq("#oT").textContent=ws.length===1?`Mark ${ws[0].name} as owned`:`Mark ${plural(ws.length,"card")} as owned`;
  const nums=binderNums();wq("#obn").innerHTML=nums.map(n=>`<option value="${n}">${esc(binderName(n))}</option>`).join("")||`<option value="1">Binder 1</option>`;
  wq("#otype").value=nums.length?"binder":"none";wq("#ocond").value="";wq("#opg").value=1;wq("#osl").value=1;
  wlOwnUi();wq("#dOwn").showModal()}
function wlOwnUi(){
  const t=wq("#otype").value;wq("#oloc").hidden=t!=="binder";wq("#onamew").hidden=!(t==="deck"||t==="showcase");
  if(t==="deck"){wq("#onamel").textContent="Deck (pick one or type a new name)";wq("#oneames").innerHTML=deckNames().map(n=>`<option value="${esc(n)}">`).join("")}
  if(t==="showcase"){wq("#onamel").textContent="Showcase (pick one or type a new name)";wq("#oneames").innerHTML=scCaseNames().map(n=>`<option value="${esc(n)}">`).join("")}
  wq("#ohint").textContent=t==="binder"&&WLOWN.length>1?"The cards are placed one after another from the page and pocket you choose, skipping pockets that are taken.":t==="binder"?"If the pocket is taken, the next free pocket is used.":""}
async function wlOwnGo(){
  const ws=WLOWN.slice();if(!ws.length)return;const t=wq("#otype").value,cond=wq("#ocond").value;
  let slots=[];
  if(t==="binder"){const n=+wq("#obn").value||1,sp=Math.max(1,+wq("#opg").value||1),ss=Math.min(9,Math.max(1,+wq("#osl").value||1));
    const used=new Set(S.cards.filter(c=>c.locType==="binder"&&+c.binder===n&&+c.slot).map(c=>c.page+"-"+c.slot));
    for(let p=sp;slots.length<ws.length&&p<2000;p++)for(let s=(p===sp?ss:1);s<=9&&slots.length<ws.length;s++)if(!used.has(p+"-"+s))slots.push([n,p,s])}
  const nm=wq("#oname").value.trim()||(t==="deck"?"Unnamed deck":"Showcase");
  const created=[],before=JSON.stringify(wlList());
  try{
    for(let i=0;i<ws.length;i++){const w=ws[i];
      const loc=t==="binder"?{locType:"binder",binder:slots[i][0],page:slots[i][1],slot:slots[i][2],deck:null}:t==="deck"?{locType:"deck",deck:nm,binder:null,page:null,slot:null}:t==="showcase"?{locType:"showcase",deck:nm,binder:null,page:null,slot:null}:{locType:"binder",binder:null,page:null,slot:null,deck:null};
      const card={name:w.name,set:w.set,series:w.series,setCode:w.setCode,number:w.number,regMark:w.regMark,rarity:w.rarity,variant:w.variant,qty:1,condition:cond,notes:w.note||"",dex:w.dex,tcgdexId:w.tcgdexId,tcgImage:w.tcgImage,price:w.price,phist:w.phist,...loc,added:new Date().toISOString()};
      try{await PKL.enrich(card,{tcg:null,art:true})}catch{}
      const id=await S.store.add(card);created.push(id)}
  }catch(err){wlToast("Couldn’t move every card to your collection. Check it and try again.");return}
  const ids=ws.map(w=>w.id);WLU.push(before);S.wish=wlList().filter(w=>!ids.includes(w.id));WL.multi.clear();wlSave();
  try{logAct(`Wish list: ${ws.length===1?ws[0].name:plural(ws.length,"card")} marked as owned`)}catch{}
  wlRender();
  const where=t==="binder"&&slots.length?`${binderName(slots[0][0])}, page ${slots[0][1]}, pocket ${slots[0][2]}`:t==="deck"?`deck ${nm}`:t==="showcase"?`showcase ${nm}`:"your collection (unplaced)";
  wlToast(`${ws.length===1?ws[0].name:plural(ws.length,"card")} moved to ${where}`,true,async()=>{for(const id of created){try{await S.store.del(id)}catch{}}if(WLU.length){S.wish=JSON.parse(WLU.pop());wlSave();wlRender()}wq("#toast").classList.remove("show")})}
/* ---- text import ---- */
function wlParse(text){
  const rows=[],bad=[];
  for(const raw of String(text||"").split(/\r?\n/)){
    const l=raw.replace(/^\s*\|/,"").replace(/\|\s*$/,"").trim();
    if(!l||/^[-|:\s=]+$/.test(l)||/^(card|name)\b.*\b(set|number)/i.test(l))continue;
    const cols=l.split(/\t+|\s*\|\s*|\s{2,}/).map(x=>x.trim()).filter(Boolean);
    let name="",sn="",rest=[];
    if(cols.length>=2){name=cols[0];sn=cols[1];rest=cols.slice(2)}
    else{const m=l.match(/^(.+?)\s+([A-Za-z][A-Za-z0-9]{1,5})\s+([A-Za-z]{0,3}\d+[A-Za-z]?(?:\s*\/\s*\d+)?)\s*(.*)$/);if(m){name=m[1];sn=m[2]+" "+m[3];rest=m[4]?[m[4]]:[]}}
    const m2=String(sn).replace(/\s+/g," ").trim().match(/^([A-Za-z][A-Za-z0-9]{1,5})[\s-]+([A-Za-z]{0,3}\d+[A-Za-z]?(?:\s?\/\s?\d+)?)$/);
    if(!name||!m2){bad.push(l);continue}
    let target=null,style="";
    for(const r of rest){const n=r.replace(/[€\s]/g,"").replace(",",".");if(/^\d+(\.\d+)?$/.test(n))target=+n;else style=style?style+" "+r:r}
    rows.push({name:name.trim(),setCode:m2[1].toUpperCase(),number:m2[2].replace(/\s/g,""),variant:bdStyle(style),target})
  }
  return {rows,bad}}
async function wlImport(text){
  const {rows,bad}=wlParse(text);
  if(!rows.length){wlToast("No cards found. Each line needs a name, set code and number.");return}
  if(!(await askConfirm(`Add ${plural(rows.length,"card")} to the wish list?`,`Details, artwork and prices come from TCGdex, which takes a moment.${bad.length?` ${plural(bad.length,"line")} couldn’t be read and will be ignored.`:""} You can undo this afterwards.`,"Add",false)))return;
  const out=[],miss=[],title="Importing wish list";let idx=0,done=0;pkProgress(title,0,rows.length);
  const work=async()=>{while(idx<rows.length){const it=rows[idx++];
    const card={name:it.name,set:"",series:"",setCode:it.setCode,number:it.number,regMark:"",rarity:"",variant:it.variant,qty:1,prio:"med",target:it.target,note:""};
    try{const w=await wlBuild(card,null);out.push(w);if(!w.tcgdexId)miss.push(`${it.name} ${it.setCode} ${it.number}`)}catch{miss.push(`${it.name} ${it.setCode} ${it.number}`)}
    done++;pkProgress(title,done,rows.length,miss.length?`${miss.length} not found on TCGdex`:"")}};
  await Promise.all([work(),work(),work(),work()]);
  const have=wlList().map(w=>w.tcgdexId).filter(Boolean),fresh=out.filter(w=>!w.tcgdexId||!have.includes(w.tcgdexId)),own=fresh.filter(w=>wlOwnN(w)).length;
  wlSnap();S.wish.push(...fresh);wlSave();wlRender();
  wlToast(`${plural(fresh.length,"card")} added${own?`, ${own} already in your collection`:""}${miss.length?`; ${miss.length} not found on TCGdex`:""}${out.length-fresh.length?`; ${out.length-fresh.length} already on the list`:""}`,true)}
/* ---- add every missing card of a set ---- */
async function wlAddMissing(setId){
  const r=PKL.setRow(setId);if(!r)return;let d;
  try{d=await PKL.setCards(setId)}catch{wlToast("Couldn’t load that set from TCGdex.");return}
  const ownIds=new Set(S.cards.map(c=>c.tcgdexId).filter(Boolean)),ownNum=new Set(S.cards.filter(c=>typeof pkSetId==="function"&&pkSetId(c)===setId).map(c=>String(parseInt(String(c.number).split("/")[0],10))));
  const wishIds=new Set(wlList().map(w=>w.tcgdexId));
  const miss=(d.cards||[]).filter(x=>!ownIds.has(x.id)&&!ownNum.has(String(parseInt(x.localId,10)))&&!wishIds.has(x.id));
  if(!miss.length){wlToast("Nothing missing, or everything is already on your wish list.");return}
  if(!(await askConfirm(`Add ${plural(miss.length,"missing card")} of ${r[1]}?`,"They are added with Low priority and no target price. Prices come from TCGdex, which takes a moment. You can undo this afterwards.","Add",false)))return;
  const out=[],title=`Adding missing cards of ${r[1]}`;let idx=0,done=0;pkProgress(title,0,miss.length);
  const work=async()=>{while(idx<miss.length){const x=miss[idx++];
    try{const f=await PKL.cardById(x.id);const card={name:f.name,set:r[1],series:r[5]||"",setCode:String(r[2]).split(":")[0],number:`${f.localId}/${String(r[3]).padStart(String(f.localId).length,"0")}`,regMark:"",rarity:"",variant:"Normal",qty:1,prio:"low",target:null,note:""};out.push(await wlBuild(card,f))}catch{}
    done++;pkProgress(title,done,miss.length)}};
  await Promise.all([work(),work(),work(),work()]);
  wlSnap();S.wish.push(...out);wlSave();wlRender();wlToast(`${plural(out.length,"card")} added to your wish list`,true)}
/* ---- export ---- */
function wlExport(){
  const cols=["name","set","set_code","number","variant","rarity","priority","target_eur","price_eur","status","note","tcgdex_id","added"];
  const q=v=>{v=v==null?"":String(v);return /[",\n;]/.test(v)?`"${v.replace(/"/g,'""')}"`:v};
  const lines=[cols.join(",")].concat(wlList().map(w=>[w.name,w.set,w.setCode,w.number,w.variant,w.rarity,WLP[w.prio][0],w.target??"",wlPrice(w)??"",w.status==="ord"?"Ordered":"Watching",w.note,w.tcgdexId,String(w.added||"").slice(0,10)].map(q).join(",")));
  const b=new Blob(["﻿"+lines.join("\r\n")],{type:"text/csv;charset=utf-8"}),a=document.createElement("a");a.href=URL.createObjectURL(b);a.download="wish-list.csv";document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500);
  wlToast("wish-list.csv saved to your downloads.")}
/* ---- keep prices fresh (once a day, when the page is opened) ---- */
async function wlRefreshPrices(force){
  if(WLBUSY)return;const W=wlList().filter(w=>w.tcgdexId);if(!W.length)return;
  const today=new Date().toISOString().slice(0,10);
  const stale=force?W:W.filter(w=>!w.price||String(w.price.updated||"").slice(0,10)<today);if(!stale.length)return;
  WLBUSY=true;let ch=0,idx=0;
  const work=async()=>{while(idx<stale.length){const w=stale[idx++];try{const f=await PKL.cardById(w.tcgdexId);const p=PKL.priceOf(f);if(p){const old={...w};w.price=p;phistOf(w,old);ch++}}catch{}}};
  try{await Promise.all([work(),work(),work(),work()])}finally{WLBUSY=false}
  if(ch){wlSave();if(S.screen==="wishlist")wlRender()}}
function wlOnShow(){wlRender();setTimeout(()=>wlRefreshPrices(false),400)}

