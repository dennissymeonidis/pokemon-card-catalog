/* ===== Decks page (matches the approved prototype). Runs in a shadow root so its styles never clash with the rest of the app. ===== */
const dp={where:null,view:"cards",group:"kind",sort:"auto",size:210,qs:"",hl:null,card:null,fs:false,btab:"type",col:new Set(),lb:false,sel:null,map:new Map()};
let dpR=null;
try{const z=+localStorage.getItem("pk-dp-size");if(z>=110&&z<=360)dp.size=z;else if(innerWidth<700)dp.size=150}catch{}
const dpq=s=>dpR.querySelector(s),dpqa=s=>[...dpR.querySelectorAll(s)];
const dpType=c=>{const k=kindOf(c);return k==="pokemon"?((c.details.types||[])[0]||"Colorless"):k==="trainer"?"Trainer":k==="energy"?"Energy":"Other"};
const dpStage=c=>{const k=kindOf(c);if(k!=="pokemon")return k==="trainer"?"Trainer":k==="energy"?"Energy":"Other";const s=dkSub(c);return s.includes("basic")?"Basic":s.includes("stage 1")?"Stage 1":s.includes("stage 2")?"Stage 2":"Other"};
const dpTr=c=>{const s=dkSub(c);return s.includes("supporter")?"Supporter":s.includes("item")?"Item":s.includes("stadium")?"Stadium":s.some(x=>x.includes("tool"))?"Tool":"Other"};
const dpHpBin=c=>{const h=parseInt((c.details||{}).hp,10);return !h?"":h<=60?"≤60":h<=100?"70–100":h<=150?"110–150":h<=220?"160–220":"230+"};
const dpTrOrd=c=>{const s=dkSub(c);return s.includes("supporter")?0:s.includes("item")?1:s.some(x=>x.includes("tool"))?2:s.includes("stadium")?3:4};
function dpHlFn(key){
  if(!key)return null;const i=key.indexOf(":"),k=key.slice(0,i),v=key.slice(i+1);
  if(k==="type")return c=>kindOf(c)==="pokemon"&&dpType(c)===v;
  if(k==="stage")return c=>kindOf(c)==="pokemon"&&dpStage(c)===v;
  if(k==="tr")return c=>kindOf(c)==="trainer"&&dpTr(c)===v;
  if(k==="rar")return c=>(c.rarity||"Not set")===v;
  if(k==="hp")return c=>kindOf(c)==="pokemon"&&dpHpBin(c)===v;
  if(k==="names"){const set=new Set(v.split("\n"));return c=>set.has(String(c.name).trim())}
  if(k==="tag")return v==="ace"?isAceSpec:isRadiant;
  return()=>true;
}
const dpHlLabel=k=>{if(!k)return"";const i=k.indexOf(":"),a=k.slice(0,i),v=k.slice(i+1);return a==="names"?(v.split("\n").length===1?v:"Flagged cards"):a==="tag"?(v==="ace"?"ACE SPEC":"Radiant"):a==="hp"?v+" HP":v};
function dpCheckHl(A,msg){
  if(/^More than 4/.test(msg))return "names:"+A.over.join("\n");
  if(/Basic Pokémon to start/.test(msg))return "stage:Basic";
  if(/ACE SPEC/.test(msg)&&/^\d/.test(msg))return "tag:ace";
  if(/Radiant/.test(msg)&&/^\d/.test(msg))return "tag:radiant";
  if(/^Not .* legal/.test(msg)&&A.bad.length)return "names:"+[...new Set(A.bad)].map(x=>String(x).trim()).join("\n");
  if(/^No evolution line/.test(msg)&&A.missing.length)return "names:"+A.missing.map(m=>String(m[0]).trim()).join("\n");
  return null;
}
const dpIcon=(k)=>({fs:'<svg viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></g></svg>'})[k];
const dpImg=(c,low)=>imgSrc(c)||(c.tcgImage?c.tcgImage+(low?"/low.webp":"/high.webp"):"")||realImg(c)||"";
function dpFace(c,low){
  const s=dpImg(c,low);
  return s?`<span class="cf"><img alt="" draggable="false" loading="lazy" src="${esc(s)}"></span>`:`<span class="cf"><span class="cph"><b>${esc(c.name)}</b><small>${esc([c.setCode,c.number].filter(Boolean).join(" "))}</small></span></span>`;
}
function dpDbx(n,cs){
  const c=dkCover(n,cs);
  return `<span class="dbx" style="--c:${deckColor(n)}">${c?`<span class="gc">${dpFace(c,true)}</span>`:`<span class="mono">${esc(n.slice(0,2).toUpperCase())}</span>`}</span>`;
}
function dpHome(e){
  const labs=[...new Set(e.es.map(i=>i.c).map(x=>{const h=dkHome(x);return h.k==="none"?"Decklist import":h.k==="deck"?h.label:h.label.split(" (")[0]}))];
  return labs.length>2?`${labs[0]} +${labs.length-1}`:labs.join(" · ");
}
/* ---------- skeleton ---------- */
function dpInit(){
  const h=document.getElementById("dkHost");if(!h||dpR)return;
  dpR=h.attachShadow({mode:"open"});
  dpR.innerHTML=`<style>${DPCSS}</style><div class="page">
  <div class="head"><div class="grow"><h1>Decks</h1><p class="sub" id="sub"></p></div><button class="btn ghost" type="button" data-act="import">Import decklist</button></div>
  <div class="kpis" id="kpis"></div>
  <div class="shelfbar">
    <div class="seg" id="tabs" role="group" aria-label="Show decks"><button type="button" data-tab="recents" aria-pressed="true">Recents</button><button type="button" data-tab="fav" aria-pressed="false">Favourites</button><button type="button" data-tab="all" aria-pressed="false">All</button></div>
    <label class="chk"><input type="checkbox" id="validOnly"> Valid only</label>
    <span class="grow"></span>
    <label><span class="vh">Search decks</span><input id="dsearch" type="search" placeholder="Search decks"></label>
  </div>
  <div class="shw" id="shw"><button type="button" class="sa l" data-shf="-1" aria-label="Show earlier decks" title="Earlier decks" hidden>‹</button><div class="shelf" id="shelf"></div><button type="button" class="sa r" data-shf="1" aria-label="Show more decks" title="More decks" hidden>›</button></div>
  <div class="layout">
    <section class="card main" id="main">
      <div class="dh" id="dh"></div>
      <div class="tb" id="tb">
        <div class="seg" id="views" role="group" aria-label="View"><button type="button" data-view="cards" aria-pressed="true">Cards</button><button type="button" data-view="copies" aria-pressed="false" title="Every one of the 60 cards, like the physical deck">Every copy</button><button type="button" data-view="list" aria-pressed="false">List</button></div>
        <label><span class="vh">Group by</span><select id="group" title="Group by"><option value="kind">Group: Kind</option><option value="type">Group: Type</option><option value="stage">Group: Stage</option><option value="none">No groups</option></select></label>
        <label><span class="vh">Sort</span><select id="sort" title="Sort"><option value="auto">Sort: standard</option><option value="n">Sort: most copies</option><option value="name">Sort: name</option><option value="price">Sort: price</option><option value="hp">Sort: HP</option></select></label>
        <span class="sep"></span>
        <label class="size" id="sizeWrap">Size <input type="range" id="size" min="110" max="360" step="5" value="210" aria-label="Card size"></label>
        <span class="grow"></span>
        <span id="hlchip"></span>
        <label><span class="vh">Find in deck</span><input id="qsearch" type="search" placeholder="Find in deck"></label>
        <span class="dact" id="dact"></span><button class="ib" type="button" id="fsBtn" title="Table view (full screen)" aria-label="Table view">${dpIcon("fs")}</button>
      </div>
      <div id="body"></div>
    </section>
    <aside class="side" id="side"></aside>
  </div></div>
  <div class="lb" id="lb" role="dialog" aria-label="Card"><button class="x" data-lb="x" aria-label="Close">✕</button><button class="pv" data-lb="p" aria-label="Previous">‹</button><div class="big" id="lbBig"></div><div class="cap" id="lbCap"></div><button class="nx" data-lb="n" aria-label="Next">›</button></div>`;
  dpq("#size").value=dp.size;
  dpBind();
}
/* ---------- data ---------- */
function dpEntries(n){
  let L=dkAgg(dkEntries(n));
  const q=dp.qs.trim().toLowerCase();
  if(q)L=L.filter(e=>[e.c.name,e.c.set,e.c.setCode,e.c.number,dpType(e.c),dpStage(e.c)].join(" ").toLowerCase().includes(q));
  return L;
}
const DP_KR={pokemon:0,trainer:1,energy:2,unknown:3};
const DP_SORT={
  auto:(a,b)=>{const ka=kindOf(a.c),kb=kindOf(b.c);if(ka!==kb)return DP_KR[ka]-DP_KR[kb];
    if(ka==="pokemon")return b.n-a.n||(dexOf(a.c)||1e6)-(dexOf(b.c)||1e6);
    if(ka==="trainer")return dpTrOrd(a.c)-dpTrOrd(b.c)||b.n-a.n||String(a.c.name).localeCompare(b.c.name);
    if(ka==="energy")return (dkSub(a.c).includes("basic")?0:1)-(dkSub(b.c).includes("basic")?0:1)||b.n-a.n;return b.n-a.n},
  n:(a,b)=>b.n-a.n||String(a.c.name).localeCompare(b.c.name),
  name:(a,b)=>String(a.c.name).localeCompare(b.c.name),
  price:(a,b)=>(unitVal(b.c)||0)-(unitVal(a.c)||0),
  hp:(a,b)=>(parseInt((b.c.details||{}).hp,10)||0)-(parseInt((a.c.details||{}).hp,10)||0)||String(a.c.name).localeCompare(b.c.name)
};
function dpGroups(L){
  const sorter=(a,b)=>(dp.sort==="auto"?0:DP_KR[kindOf(a.c)]-DP_KR[kindOf(b.c)])||DP_SORT[dp.sort](a,b);
  const T={pokemon:"Pokémon",trainer:"Trainers",energy:"Energy",unknown:"Without details"};
  if(dp.group==="none")return[{key:"all",title:"All cards",list:L.slice().sort(DP_SORT.auto===DP_SORT[dp.sort]?DP_SORT.auto:sorter)}];
  const key=dp.group==="kind"?e=>kindOf(e.c):dp.group==="type"?e=>dpType(e.c):e=>dpStage(e.c);
  const map=new Map();for(const e of L){const k=key(e);if(!map.has(k))map.set(k,[]);map.get(k).push(e)}
  let ks=[...map.keys()];
  const ord=dp.group==="kind"?["pokemon","trainer","energy","unknown"]:dp.group==="stage"?["Basic","Stage 1","Stage 2","Other","Trainer","Energy"]:null;
  if(ord)ks.sort((a,b)=>ord.indexOf(a)-ord.indexOf(b));else ks.sort((a,b)=>map.get(b).reduce((s,e)=>s+e.n,0)-map.get(a).reduce((s,e)=>s+e.n,0));
  return ks.map(k=>({key:k,title:T[k]||k,list:map.get(k).sort(sorter)}));
}
const dpSeq=()=>dpGroups(dpEntries(DK.sel)).flatMap(g=>g.list.map(e=>cardKey(e.c)));
/* ---------- render ---------- */
function dpRefresh(){
  if(!dpR){dpInit();if(!dpR)return}
  if(S.screen!=="decks")return;
  if(dp.sel!==DK.sel){dp.sel=DK.sel;dp.card=null;dp.hl=null;dp.qs="";dpq("#qsearch").value="";dp.col.clear()}
  dpq("#tabs").querySelectorAll("[data-tab]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.tab===DK.tab)));
  dpq("#validOnly").checked=!!DK.valid;
  dpShelf();dpHead();dpBody();dpSide();dpChip();
  {const names=deckNames(),vn=names.filter(n=>dkInfo(n).A.valid).length;
   dpq("#kpis").innerHTML=ptKpis(S.cards.filter(c=>c.locType==="deck"),"Cards in decks","Decks",names.length,names.length?vn+" valid":"");}
  dpqa("#views button").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.view===dp.view)));
  dpq("#group").value=dp.group;dpq("#sort").value=dp.sort;
  dpq("#sizeWrap").style.display=dp.view==="list"?"none":"";
  dpq("#main").classList.toggle("fs",dp.fs);document.body.style.overflow=dp.fs||dp.lb?"hidden":"";
}
function dpShelf(){
  const names=deckNames(),all=names.map(dkInfo),arr=dkVisible();
  dpq("#sub").textContent=`${plural(names.length,"deck")} · ${all.filter(x=>x.A.valid).length} valid · ${plural(all.reduce((s,x)=>s+x.A.total,0),"card")} in decks`;
  dpq("#shelf").innerHTML=arr.map(({n,cs,A})=>{const m=dkMeta(n);
    return `<button type="button" class="dchip" data-deck="${esc(n)}" aria-pressed="${n===DK.sel}">${dpDbx(n,cs)}<span><b>${esc(n)}</b><small>${A.total}/60 · ${DK_FMT[dkFmtOf(n)]}</small><div class="mbar${A.total===60?" ok":""}"><i style="width:${Math.min(100,A.total/60*100)}%"></i></div></span><span class="st ${A.valid?"ok":"warn"}" title="${A.valid?"Valid deck":"Has problems"}">${A.valid?"✓":"!"}</span><span class="fv${m.fav?" on":""}" role="button" tabindex="0" data-fvd="${esc(n)}" aria-pressed="${!!m.fav}" aria-label="Favourite" title="Favourite">${m.fav?"★":"☆"}</span></button>`}).join("")+`<button type="button" class="dchip new" data-act="newdeck">+ New deck</button>`;
  if(!arr.length&&names.length)dpq("#shelf").insertAdjacentHTML("afterbegin",`<p class="sub" style="align-self:center;padding:0 12px">No deck matches these filters.</p>`);
  const sh=dpq("#shelf");if(!sh.dataset.nv){sh.dataset.nv="1";sh.addEventListener("scroll",dpShelfNav,{passive:true});try{new ResizeObserver(dpShelfNav).observe(sh)}catch(e){}}
  const cur=sh.querySelector('.dchip[aria-pressed="true"]');if(cur&&dp.shsel!==DK.sel){dp.shsel=DK.sel;try{const r=sh.getBoundingClientRect(),c=cur.getBoundingClientRect();if(c.left<r.left||c.right>r.right)sh.scrollLeft+=c.left-r.left-(r.width-c.width)/2}catch(e){}}
  dpShelfNav();
}
function dpShelfNav(){const sh=dpq("#shelf"),w=dpq("#shw");if(!sh||!w)return;const mx=sh.scrollWidth-sh.clientWidth;const l=w.querySelector(".sa.l"),r=w.querySelector(".sa.r");if(l)l.hidden=sh.scrollLeft<=2;if(r)r.hidden=mx<=2||sh.scrollLeft>=mx-2}
function dpHead(){
  const n=DK.sel,el=dpq("#dact");if(!n){el.innerHTML="";return}
  const {cs,A}=DKC.get(n)||dkInfo(n),m=dkMeta(n);
  el.innerHTML=`<button class="btn ghost" type="button" data-act="edit">✎ Edit deck</button>
   <div class="menu"><button class="ib" type="button" data-act="menu" aria-haspopup="true" aria-label="More">⋮</button><div class="pop" id="pop">
     <button type="button" data-act="copy">Copy decklist</button><button type="button" data-act="rename">Rename…</button><button type="button" data-act="custom">Customise colour, cover and format…</button><button type="button" data-act="dl">Download decklist (.txt)</button><button type="button" data-act="import2">Import cards into this deck…</button><button type="button" data-act="sendback" ${A.total?"":"disabled"}>Send all cards back to binders<small>Keeps the deck, empties the box</small></button><hr><button type="button" class="dn" data-act="del">Delete this deck…</button></div></div>`;
}
function dpBody(){
  const n=DK.sel,body=dpq("#body");dpq("#main").style.setProperty("--cw",dp.size+"px");dp.map=new Map();
  if(!n){body.innerHTML=`<div class="empty"><b>No deck selected</b>Create a deck from your collection, or import a decklist for a deck you already own.<div class="acts"><button class="btn" data-act="newdeck">Create a deck</button><button class="btn ghost" data-act="import">Import a decklist</button></div></div>`;return}
  const {A}=DKC.get(n)||dkInfo(n);
  if(!A.total){body.innerHTML=`<div class="empty"><b>This deck is empty</b>Pick cards from your binders, or paste a decklist you already have.<div class="acts"><button class="btn" data-act="edit">Edit deck</button><button class="btn ghost" data-act="import2">Import a decklist</button></div></div>`;return}
  const L=dpEntries(n);for(const e of dkAgg(dkEntries(n)))dp.map.set(cardKey(e.c),e);
  if(dp.card&&!dp.map.has(dp.card))dp.card=null;
  if(!L.length){body.innerHTML=`<div class="empty"><b>No card matches “${esc(dp.qs)}”</b>Try a name, set, type or number.</div>`;return}
  const fn=dpHlFn(dp.hl),over=new Set(A.over);
  const stack=k=>k>=4?" st4":k===3?" st3":k===2?" st2":"";
  const btn=(e,copy,j)=>{const c=copy&&j!=null?(e.es.flatMap(it=>Array(it.n).fill(it.c))[j]||e.c):e.c,key=cardKey(c),dim=fn&&!fn(c),cxs=dp.cxk===key?dp.cx:0;
    return `<button type="button" class="gc hv${copy?"":stack(e.n)}${dp.card===key&&(!copy||j===cxs)?" sel":""}${dim?" dim":""}" data-card="${esc(key)}"${copy?` data-cx="${j}"`:""} aria-label="${esc(c.name)}${copy?"":`, ${e.n} ${e.n===1?"copy":"copies"}`}">${dpFace(c)}${!copy&&e.n>1?`<span class="q">×${e.n}</span>`:""}${over.has(String(c.name).trim())&&!isBasicEnergy(c)?`<span class="flag" title="More than 4 copies">!</span>`:""}</button>`};
  const sec=(g,inner)=>{const k=g.list.reduce((a,e)=>a+e.n,0),col=dp.col.has(g.key);return `<div class="sec-h${col?" col":""}" data-col="${esc(g.key)}" role="button" tabindex="0" aria-expanded="${!col}"><span class="cv">▾</span><h3>${esc(g.title)}</h3><span class="n">${k}</span><span class="ln"></span></div>${col?"":inner}`};
  body.innerHTML=dpGroups(L).map(g=>dp.view==="list"
    ?sec(g,`<div class="rows">${g.list.map(e=>{const c=e.c,dim=fn&&!fn(c),u=unitVal(c),t=dpType(c);return `<div class="row${dp.card===cardKey(c)?" sel":""}${dim?" dim":""}" role="button" tabindex="0" data-card="${esc(cardKey(c))}"><span class="gc">${dpFace(c,true)}</span><span><b>${esc(c.name)}</b><small>${esc(kindOf(c)==="pokemon"?t+" · "+dpStage(c):t)}</small></span><span class="num">${esc([c.setCode,c.number].filter(Boolean).join(" "))}</span><span class="h">${(c.details||{}).hp?esc(c.details.hp)+" HP":""}</span><span class="p">${u!=null?eur(u*e.n):"—"}</span><span class="qq">×${e.n}</span></div>`}).join("")}</div>`)
    :sec(g,`<div class="grid">${g.list.map(e=>dp.view==="copies"?Array.from({length:e.n},(_,j)=>btn(e,true,j)).join(""):btn(e,false)).join("")}</div>`)).join("");
}
function dpBars(obj,order,key,hl){hl=hl===undefined?dp.hl:hl;
  const ents=order?order.filter(k=>obj[k]).map(k=>[k,obj[k]]):Object.entries(obj).filter(([,v])=>v).sort((a,b)=>b[1]-a[1]);
  if(!ents.length)return `<p class="hint">Nothing to show yet.</p>`;const mx=Math.max(...ents.map(x=>x[1]));
  return ents.map(([k,v])=>`<button type="button" class="bar${hl===key+":"+k?" on":""}" data-hl="${key}:${esc(k)}" title="${esc(k)}"><span class="bl">${key==="type"&&ETYPES.includes(k)?en(k)+esc(k):key==="rar"?pkRar(k==="Not set"?"":k)==="—"?esc(k):pkRar(k):esc(k)}</span><i><s style="width:${v/mx*100}%;${key==="type"&&V2TC[k]?`background:${V2TC[k]}`:""}"></s></i><span>${v}</span></button>`).join("");
}
function dpSide(){
  const n=DK.sel,el=dpq("#side");if(!n){el.innerHTML="";return}
  const {A}=DKC.get(n)||dkInfo(n);if(!(dp.card&&dp.map.get(dp.card))){const f=dpSeq()[0];dp.card=f&&dp.map.get(f)?f:null;if(dp.card)dpSelMark()}
  const e=dp.card&&dp.map.get(dp.card);const cm=dp.view==="copies",flat=e?e.es.flatMap((it,i)=>Array(it.n).fill(i)):[];if(dp.cik!==dp.card){dp.cik=dp.card;dp.ci=0}let cx=dp.cxk===dp.card?dp.cx:0;if(cx>=flat.length||cx<0)cx=0;if(e)dp.ci=flat[cx]||0;const nes=e?flat.length:0,pos=cx;const er=e&&e.es[dp.ci],c=er&&er.c;
  const seg=(k,col)=>A.k[k]?`<i style="flex:${A.k[k]};background:${col}"></i>`:"";
  let h=`<div class="card sec"><h3>Deck check <span class="pill ${A.valid?"ok":"bad"}">${A.valid?"Valid":A.total?"Needs work":"Empty"}</span></h3>
   <div class="ring"><div class="ringc${A.total===60&&A.valid?" ok":""}" style="--p:${Math.min(100,A.total/60*100)}"><span><div>${A.total}<small>of 60</small></div></span></div>
   <div><b>${esc(n)}</b><div class="hint">${DK_FMT[dkFmtOf(n)]} format</div></div></div>
   <div class="comp">${seg("pokemon","#3A8FD9")}${seg("trainer","#9B5FC0")}${seg("energy","#E0A82E")}${seg("unknown","var(--pocket-edge)")}${A.total<60?`<i style="flex:${60-A.total}"></i>`:""}</div>
   <div class="legend"><span><i style="background:#3A8FD9"></i>Pokémon ${A.k.pokemon}</span><span><i style="background:#9B5FC0"></i>Trainer ${A.k.trainer}</span><span><i style="background:#E0A82E"></i>Energy ${A.k.energy}</span>${A.k.unknown?`<span><i style="background:var(--pocket-edge)"></i>No details ${A.k.unknown}</span>`:""}</div>
   <ul class="checks">${A.ck.map(([ok,m])=>{const hl=dpCheckHl(A,m);return `<li class="${ok===1?"ok":ok===2?"info":"bad"}${hl?" go":""}"${hl?` data-hl="${esc(hl)}" title="Show these cards"`:""}><b>${ok===1?"✓":ok===2?"i":"!"}</b><span>${esc(m)}</span></li>`}).join("")}</ul>
   <div class="kv"><div><b>${A.priced?eur(A.val):"—"}</b><small>Value${A.priced&&A.priced<A.total?" (partial)":""}</small></div><div><b>${A.hpAvg||"—"}</b><small>Avg Pokémon HP</small></div><div><b>${A.total>=7&&A.basics?Math.round(A.odds*100)+"%":"—"}</b><small>Basic in first 7</small></div><div><b>${A.total?(A.energyN*7/A.total).toFixed(1):"0"}</b><small>Energy in first 7</small></div></div></div>`;
  if(c){const u=unitVal(c);
    h+=pkPanel(c,{zoom:'data-zoom="1"',facts:[["Price",u!=null?eur(u):"—"],["Rarity",pkRar(c.rarity)],["Energy type",pkEn(c)],["Copies","×"+er.n+(e.es.length>1?` (${e.n} in deck)`:"")]].concat(nes>1?[["Condition",esc(c.condition||"—")],["Variant",esc(c.variant||"Normal")]]:[]),nav:nes>1&&!cm?`<span class="pknav"><button type="button" data-dpci="-1" aria-label="Previous copy" title="Previous copy">‹</button><span>Copy ${pos+1} of ${nes}</span><button type="button" data-dpci="1" aria-label="Next copy" title="Next copy">›</button></span>`:"",acts:`<button class="btn sm" data-act="cardpage">Open card page</button>`,extra:pkWhere(c,"Deck: "+n,er.n)});
  }else h+=pkEmpty("No cards in this deck yet");
  h+=`<div class="card sec"><h3>Breakdown <span class="hint">click a bar to highlight</span></h3><div class="tabs" role="tablist">${PK_BTABS.map(([k,t])=>`<button class="tab" role="tab" data-btab="${k}" aria-selected="${dp.btab===k}">${t}</button>`).join("")}</div>
   ${pkBars(A,dkAgg(dkEntries(n)),dp.btab,dp.hl)}</div>`;
  el.innerHTML=h;try{pkColInit()}catch(e){}
}
function dpChip(){const k=dp.hl;dpq("#hlchip").innerHTML=k?`<span class="hlchip">Highlighting: ${esc(dpHlLabel(k))} <button type="button" data-act="clearhl" aria-label="Clear highlight">✕</button></span>`:""}
/* ---------- selection and lightbox ---------- */
function dpSelMark(){const cx=dp.cxk===dp.card?dp.cx:0;dpqa("#body [data-card]").forEach(b=>b.classList.toggle("sel",b.dataset.card===dp.card&&(b.dataset.cx==null||+b.dataset.cx===cx)))}
function dpPick(key){dp.card=key;dpSelMark();dpSide()}
function dpLb(key){
  const e=dp.map.get(key);if(!e)return;dp.card=key;dp.lb=true;const c=e.c,u=unitVal(c);
  dpq("#lbBig").innerHTML=`<div class="gc" data-lbtilt>${dpFace(c)}</div>`;
  dpq("#lbCap").innerHTML=`${esc(c.name)} <small>${esc([c.set||c.setCode,c.number].filter(Boolean).join(" "))} · ×${e.n} in ${esc(DK.sel)}${u!=null?" · "+eur(u):""}</small>`;
  dpq("#lb").classList.add("on");document.body.style.overflow="hidden";dpSelMark();dpSide();
}
function dpLbClose(){dp.lb=false;dpq("#lb").classList.remove("on");document.body.style.overflow=dp.fs?"hidden":""}
function dpStep(d){const s=dpSeq();if(!s.length)return;let i=s.indexOf(dp.card);i=i<0?0:(i+d+s.length)%s.length;if(dp.lb)dpLb(s[i]);else{dpPick(s[i]);const b=dpq(`#body [data-card="${CSS.escape(s[i])}"]`);if(b)b.scrollIntoView({block:"nearest"})}}
/* ---------- actions ---------- */
async function dpKeepMeta(n){if(!(S.decksMeta||{})[n])await saveDecksMeta({...(S.decksMeta||{}),[n]:{...dkMeta(n)}})}
async function dpBack1(e){
  const cs=e.es.map(i=>i.c),x=cs.find(y=>y.origin)||cs[0],n=DK.sel,h=dkHome(x);
  if(h.k==="none"&&!(await askConfirm(`Remove ${x.name}?`,"This card came from a decklist import and has no binder to go back to. Sending it back removes it from your collection.","Remove")))return;
  await dpKeepMeta(n);const plan=dkPlan(n,new Map([[x.id,(+x.qty||1)-1]]));
  txBegin(`Sent ${x.name} back from ${n}`);try{await dkApply(n,n,plan)}finally{txEnd()}render();
}
async function dpSendAll(n){
  const cs=dkEntries(n);if(!cs.length)return;await dpKeepMeta(n);
  const plan=dkPlan(n,new Map(cs.map(c=>[c.id,0])));
  const v=await askBulk(`Send all cards back from ${n}?`,dkSummaryHtml(dkSummary(plan),n,""),"Send back");if(!v)return;
  txBegin(`Emptied deck ${n}`);try{await dkApply(n,n,plan)}finally{txEnd()}render();
}
async function dpCopy(n){
  const txt=dkText(n);
  try{await navigator.clipboard.writeText(txt);dkToast("Decklist copied. It’s in the format Pokémon TCG Live can import.")}
  catch{await askBulk(`Decklist for ${n}`,`<textarea readonly rows="12" style="width:100%" id="dpTxt">${esc(txt)}</textarea>`,"Done")}
}
function dpDownload(n){const b=new Blob([dkText(n)],{type:"text/plain"});const a=document.createElement("a");a.href=URL.createObjectURL(b);a.download=n.replace(/[^\w .-]+/g,"_")+".txt";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),2000)}
/* ---------- events ---------- */
function dpBind(){
  const R=dpR;
  R.addEventListener("click",async e=>{
    const t=e.target;let x;
    if(!t.closest(".menu")){const p=dpq("#pop");if(p)p.classList.remove("open")}
    if(x=t.closest("[data-lb]")){const a=x.dataset.lb;if(a==="x")dpLbClose();else dpStep(a==="p"?-1:1);return}
    if(t.id==="lb"){dpLbClose();return}
    if(x=t.closest("[data-dpci]")){const e0=dp.map.get(dp.card);if(e0){const d=+x.dataset.dpci;const L=e0.n,cur=dp.cxk===dp.card?dp.cx:0;dp.cxk=dp.card;dp.cx=((cur+d)%L+L)%L;dpSelMark();dpSide()}return}
    if(x=t.closest("[data-shf]")){const sh=dpq("#shelf");sh.scrollBy({left:(+x.dataset.shf)*Math.max(200,sh.clientWidth*.8),behavior:"smooth"});return}
    if(x=t.closest("[data-fvd]")){await dkToggleFav(x.dataset.fvd);renderDecks();return}
    if(x=t.closest("[data-deck]")){DK.sel=x.dataset.deck;dkTouch(DK.sel);renderDecks();return}
    if(x=t.closest("[data-hl]")){const k=x.dataset.hl;dp.hl=dp.hl===k?null:k;dpBody();dpSide();dpChip();return}
    if(x=t.closest("[data-col]")){const k=x.dataset.col;dp.col.has(k)?dp.col.delete(k):dp.col.add(k);dpBody();return}
    if(x=t.closest("[data-btab]")){dp.btab=x.dataset.btab;dpSide();return}
    if(x=t.closest("[data-step]")){dpStep(+x.dataset.step);return}
    if(x=t.closest(".pkel")){dp.where=null;pkGoto(x.dataset);return}
    if(x=t.closest("[data-card]")){const k=x.dataset.card;dp.cxk=k;dp.cx=x.dataset.cx!=null?+x.dataset.cx:0;if(dp.fs||e.detail>=2)dpLb(k);else dpPick(k);return}
    if(t.closest("[data-zoom]")){if(dp.card)dpLb(dp.card);return}
    if(x=t.closest("[data-tab]")){DK.tab=x.dataset.tab;renderDecks();return}
    if(x=t.closest("[data-view]")){dp.view=x.dataset.view;dp.ci=0;dp.cxk=null;dpRefresh();return}
    if(!(x=t.closest("[data-act]")))return;
    const act=x.dataset.act,n=DK.sel;
    if(act==="menu"){dpq("#pop").classList.toggle("open");return}
    const pop=dpq("#pop");if(pop)pop.classList.remove("open");
    if(act==="newdeck"){openBuilder("",{isNew:true});return}
    if(act==="import"){openDeckImport("");return}
    if(act==="clearhl"){dp.hl=null;dpBody();dpSide();dpChip();return}
    if(act==="where"){dp.where=dp.where===dp.card?null:dp.card;dpSide();return}
    if(act==="zoom"){if(dp.card)dpLb(dp.card);return}
    if(!n)return;
    if(act==="fav")await dkToggleFav(n);
    else if(act==="edit")openBuilder(n);
    else if(act==="copy")dpCopy(n);
    else if(act==="dl")dpDownload(n);
    else if(act==="rename")editDeck(n,false);
    else if(act==="custom")dkCustomise(n);
    else if(act==="import2")openDeckImport(n);
    else if(act==="sendback")dpSendAll(n);
    else if(act==="del")dkDeleteDeck(n);
    else if(act==="cardpage"){const en=dp.map.get(dp.card);if(en)zoomCard((en.es[dp.ci]||en.es[0]).c,null,dpSeq().map(k=>(dp.map.get(k)||{es:[{c:{}}]}).es[0].c.id))}
    else if(act==="back1"){const en=dp.map.get(dp.card);if(en)dpBack1(en)}
  });
  R.addEventListener("change",async e=>{if(e.target.matches("[data-fmt]")){const n=DK.sel;await saveDecksMeta({...(S.decksMeta||{}),[n]:{...dkMeta(n),format:e.target.value}})}});
  dpq("#validOnly").onchange=e=>{DK.valid=e.target.checked;renderDecks()};
  dpq("#dsearch").oninput=e=>{DK.q=e.target.value;renderDecks()};
  dpq("#qsearch").oninput=e=>{dp.qs=e.target.value;dpBody()};
  dpq("#group").onchange=e=>{dp.group=e.target.value;dpBody()};
  dpq("#sort").onchange=e=>{dp.sort=e.target.value;dpBody()};
  dpq("#size").oninput=e=>{dp.size=+e.target.value;dpq("#main").style.setProperty("--cw",dp.size+"px");try{localStorage.setItem("pk-dp-size",dp.size)}catch{}};
  dpq("#fsBtn").onclick=()=>{dp.fs=!dp.fs;if(dp.fs&&dp.size<250){dp.size=280;dpq("#size").value=280}dpRefresh()};
  R.addEventListener("keydown",e=>{if((e.key==="Enter"||e.key===" ")&&e.target.matches&&e.target.matches(".row[data-card],.sec-h")){e.preventDefault();e.target.click()}});
  /* hover tilt + shine that follows the cursor */
  R.addEventListener("mousemove",e=>{
    if(matchMedia("(prefers-reduced-motion:reduce)").matches)return;
    const g=e.target.closest&&e.target.closest(".gc.hv,[data-lbtilt]");if(!g)return;
    const r=g.getBoundingClientRect(),x=(e.clientX-r.left)/r.width,y=(e.clientY-r.top)/r.height;
    g.style.setProperty("--ry",((x-.5)*12).toFixed(1)+"deg");g.style.setProperty("--rx",((.5-y)*12).toFixed(1)+"deg");g.style.setProperty("--sx",(x*100).toFixed(0)+"%");g.style.setProperty("--sy",(y*100).toFixed(0)+"%");
    if(g.hasAttribute("data-lbtilt"))g.style.transform=`perspective(900px) rotateY(${(x-.5)*10}deg) rotateX(${(.5-y)*10}deg)`;
  });
  dpq("#lb").addEventListener("mouseleave",()=>{const g=dpq("[data-lbtilt]");if(g)g.style.transform=""});
}
document.addEventListener("keydown",e=>{
  if(!dpR||S.screen!=="decks")return;
  if(e.key==="Escape"&&dp.lb&&!document.querySelector("dialog[open],.dkb,.dk,.cp-lb")){e.stopPropagation();dpLbClose();return}
  if(document.querySelector("dialog[open],.dkb,.dk,.cp-lb,.zoom"))return;
  const tg=e.target;if(tg&&tg.matches&&tg.matches("input,select,textarea"))return;
  if(e.key==="Escape"&&dp.fs){dp.fs=false;dpRefresh();return}
  if(e.key==="ArrowRight"){dpStep(1);e.preventDefault()}else if(e.key==="ArrowLeft"){dpStep(-1);e.preventDefault()}
  else if(e.key===" "&&dp.card&&!(tg&&tg.closest&&tg.closest("#dkHost"))){dpLb(dp.card);e.preventDefault()}
  else if(e.key===" "&&dp.card&&!dp.lb){dpLb(dp.card);e.preventDefault()}
},true);

const DEX_TOTAL=1025;
function hgGo(k,v){
  if(k==="scr"){const [sc,sub]=v.split("|");show(sc);if(sub)showSub(sub);return}
  if(k==="card"){const c=S.cards.find(x=>x.id===v);if(c)openCardPage(c,[c.id]);return}
  resetFilters();
  const adv=(f,val)=>{S.adv[f]=val;const el=$(ADVF[f]);if(el)el.value=val};
  const flt=f=>{S.filter=f;document.querySelectorAll(".chip[data-f]").forEach(b=>b.setAttribute("aria-pressed",b.dataset.f===f))};
  if(k==="q"){S.q=v;$("#q").value=v}
  else if(k==="month")S.month=v;
  else if(k==="exp")S.exp=v;
  else if(k==="loc")flt(v);
  else if(k==="dup")adv("dup","yes");
  else if(k==="sort"){S.sort=v;S.sortDir="desc";const so=$("#sort");if(so)so.value=v}
  else if(k==="price"){const r=[null,[0,0.99],[1,4.99],[5,19.99],[20,49.99],[50,""]][+v];if(!r)adv("priced","no");else{adv("pmin",String(r[0]));adv("pmax",String(r[1]))}}
  else if(k==="rar")v.split("\u0001").forEach(n=>V2F.rar.add(n==="Not set"?"__none__":n));
  else if(k==="kind"){if(v==="No details"){S.stage="Unknown";$("#stageF").value="Unknown"}else S.kind=v==="Pokémon"?"pokemon":v.toLowerCase()}
  else if(k==="type"){S.types.add(v);const i=document.querySelector(`#etGrid input[value="${v}"]`);if(i)i.checked=true}
  else if(k==="health"){adv(v==="det"?"det":v==="nopic"?"pic":"priced","no")}
  else if(k==="series")S.ser=v;
  else if(k==="stage"){S.stage=v;const sf=$("#stageF");if(sf)sf.value=v}
  else if(k==="mark")adv("mark",v);
  else if(k==="illus")adv("illus",v);
  else if(k==="hp"){const [lo,hi]=v.split("|");adv("hpMin",lo);adv("hpMax",hi)}
  else if(k==="fmt")V2F.fmt.add(v);
  show("collection");render();
  setTimeout(()=>{const l=$("#list");if(l){l.setAttribute("tabindex","-1");l.focus({preventScroll:true})}},350);
}
document.addEventListener("click",e=>{
  const t=e.target.closest&&e.target.closest("[data-hg]");if(!t||e.target.closest("[data-v2go],[data-scr]"))return;
  hgGo(t.dataset.hg,t.dataset.hv||"");
});
document.addEventListener("keydown",e=>{
  if(e.key!=="Enter"&&e.key!==" ")return;const t=e.target.closest&&e.target.closest("[data-hg]");if(!t||e.target!==t)return;
  e.preventDefault();hgGo(t.dataset.hg,t.dataset.hv||"");
});
function v2Home(){
  const hr=new Date().getHours();const gr=$("#v2greet");if(gr)gr.textContent=(hr<12?"Good morning":hr<18?"Good afternoon":"Good evening")+", Dennis";
  const cards=S.cards,q=c=>+c.qty||1;
  const copies=cards.reduce((a,c)=>a+q(c),0),diff=new Set(cards.map(cardKey)).size;
  const v=valueStats();const mon=new Date().toISOString().slice(0,7);
  const addedM=cards.filter(c=>String(c.added||"").slice(0,7)===mon).reduce((a,c)=>a+q(c),0);
  const scv=cards.filter(c=>c.locType==="showcase").reduce((a,c)=>{const u=unitVal(c);return a+(u==null?0:u*q(c))},0);
  const go=(k,v)=>` data-hg="${k}" data-hv="${esc(String(v))}" role="button" tabindex="0"`;
  const kp=(l,b,e,k,v)=>`<div class="v2kpi${k?" hgo":""}"${k?go(k,v):""}><small>${l}</small><b>${b}</b>${e?`<em>${e}</em>`:""}</div>`;
  const dupCopies=copies-diff,nSets=new Set(cards.map(c=>c.set||c.setCode).filter(Boolean)).size;
  const spc=new Set(cards.map(dexOf).filter(Boolean)).size;
  $("#v2kpis").innerHTML=kp("Cards owned",copies,addedM?`+${addedM} this month`:"","all","")+kp("Different cards",diff,"","all","")+kp("Estimated value",eur(v.total),v.unpriced?`${v.unpriced} unpriced`:"","sort","price")+kp("Average per card",v.pcopies?eur(v.total/v.pcopies):"—","","sort","price")+kp("Showcase value",eur(scv),"","loc","showcase")+kp("Duplicate copies",dupCopies,"","dup","")+kp("Sets collected",nSets,"","scr","stats|setPanel")+kp("Pokédex",`${spc}<small class="v2of"> / ${DEX_TOTAL}</small>`,Math.round(spc/DEX_TOTAL*1000)/10+"%","scr","stats|dexPanel");
  // value by date added (at today's prices), last 6 months
  const ms=[];{const d=new Date();d.setDate(1);for(let i=5;i>=0;i--){const x=new Date(d.getFullYear(),d.getMonth()-i,1);ms.push(x.getFullYear()+"-"+String(x.getMonth()+1).padStart(2,"0"))}}
  const cum=ms.map(m=>v.list.reduce((a,r)=>{const am=String(r.c.added||"").slice(0,7);return a+((!am||am<=m)?r.t:0)},0));
  const mx=Math.max(...cum,0.01),mn=Math.min(...cum);const span=Math.max(mx-mn,mx*0.05,0.01);
  const pts=cum.map((val,i)=>[i*(400/5),110-((val-mn)/span)*90]);
  const line=pts.map((p,i)=>(i?"L":"M")+p[0].toFixed(1)+" "+p[1].toFixed(1)).join(" ");
  const MN=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const chart=`<div class="hgo"${go("scr","stats|valuePanel")}><svg class="v2spark" viewBox="0 0 400 120" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="v2g" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="var(--brand)" stop-opacity=".35"/><stop offset="1" stop-color="var(--brand)" stop-opacity="0"/></linearGradient></defs><path d="${line} L400 120 L0 120Z" fill="url(#v2g)"/><path d="${line}" fill="none" stroke="var(--brand)" stroke-width="2.5" vector-effect="non-scaling-stroke"/></svg></div><div class="v2months">${ms.map((m,i)=>`<span class="hgo"${go("month",m)}>${MN[+m.slice(5)-1]}<b>${eur(cum[i])}</b></span>`).join("")}</div>`;
  const th=c=>{const src=imgSrc(c);return `<span class="v2th">${src?`<img alt="" loading="lazy" src="${esc(src)}">`:esc(String(c.name||"?")[0])}</span>`};
  const top=v.list.slice().sort((a,b)=>b.u-a.u).slice(0,5);
  const hc=(t,body,link)=>`<section class="hc"><div class="hch"><h3>${t}</h3>${link||""}</div>${body}</section>`;
  const more=(scr,t,sub)=>`<button type="button" class="linkbtn" data-scr="${scr}"${sub?` data-sub="${sub}"`:""}>${t}</button>`;
  $("#v2hero").innerHTML=hc("Collection value <small class=\"v2sm\">· by date added, at today’s prices</small>",chart,more("stats","Details","valuePanel"))+hc("Most valuable",top.length?top.map(r=>`<div class="v2li hgo"${go("q",r.c.name)}>${th(r.c)}<span><b>${esc(r.c.name)}</b><small>${esc([r.c.set||r.c.setCode,r.c.rarity].filter(Boolean).join(" · "))}</small></span><b class="v2pr">${eur(r.u)}${r.q>1?`<small>×${r.q}</small>`:""}</b></div>`).join(""):`<p class="sub2">No prices yet. Use Refresh Cardmarket prices in the folder menu.</p>`,more("collection","All cards"));
  /* ---- extra dashboard widgets ---- */
  const hc2=(t,body,link)=>`<section class="hc"><div class="hch"><h3>${t}</h3>${link||""}</div>${body}</section>`;
  const lk=(go,t)=>`<button type="button" class="linkbtn" data-v2go="${go}">${t}</button>`;
  // cards added per month
  const perM=ms.map(m=>cards.filter(c=>String(c.added||"").slice(0,7)===m).reduce((a,c)=>a+q(c),0));
  const pmx=Math.max(...perM,1);
  const addedHtml=perM.some(x=>x)?`<div class="v2cols">${perM.map((n,i)=>`<div class="v2col${n?" hgo":""}"${n?go("month",ms[i]):""}><b>${n||""}</b><i style="height:${Math.max(n/pmx*100,n?4:1)}%"></i><span>${MN[+ms[i].slice(5)-1]}</span></div>`).join("")}</div>`:`<p class="sub2">No dates on your cards yet. New cards you add are dated automatically.</p>`;
  // where
  const locs=[["Binders","binder","var(--brand)"],["Decks","deck","var(--accent)"],["Showcase","showcase","#14b8a6"]].map(([n,t,col])=>{const cs=cards.filter(c=>c.locType===t);return {n,col,t,cnt:cs.reduce((a,c)=>a+q(c),0),val:cs.reduce((a,c)=>{const u=unitVal(c);return a+(u==null?0:u*q(c))},0)}});
  const lt=Math.max(locs.reduce((a,x)=>a+x.cnt,0),1);
  const whereHtml=`<div class="v2stack" role="img" aria-label="Cards by location">${locs.map(x=>x.cnt?`<i class="hgo"${go("loc",x.t)} style="flex:${x.cnt};background:${x.col}" title="${x.n}: ${x.cnt}"></i>`:"").join("")}</div>`+locs.map(x=>`<div class="v2leg hgo"${go("loc",x.t)}><span class="v2sw2" style="background:${x.col}"></span><span>${x.n}</span><b>${x.cnt}</b><small>${Math.round(x.cnt/lt*100)}%</small><span class="v2legv">${eur(x.val)}</span></div>`).join("");
  // price distribution
  const bks=[["No price",x=>x==null],["< €1",x=>x!=null&&x<1],["€1–5",x=>x>=1&&x<5],["€5–20",x=>x>=5&&x<20],["€20–50",x=>x>=20&&x<50],["€50+",x=>x>=50]];
  const bc=bks.map(([n,f])=>[n,cards.filter(c=>f(unitVal(c))).reduce((a,c)=>a+q(c),0)]);const bmx=Math.max(...bc.map(x=>x[1]),1);
  const priceHtml=`<div class="v2cols">${bc.map(([n,c],bi)=>`<div class="v2col${c?" hgo":""}"${c?go("price",bi):""}><b>${c||""}</b><i style="height:${Math.max(c/bmx*100,c?4:1)}%"></i><span>${n}</span></div>`).join("")}</div>`;
  // rarity donut
  const rm={};cards.forEach(c=>{const k=c.rarity||"Not set";rm[k]=(rm[k]||0)+q(c)});
  let rr=Object.entries(rm).sort((a,b)=>b[1]-a[1]);let restNames=null;if(rr.length>6){restNames=rr.slice(5).map(x=>x[0]);const rest=rr.slice(5).reduce((a,x)=>a+x[1],0);rr=[...rr.slice(0,5),["Other",rest]]}
  const PAL=["#3b4cca","#f2b705","#14b8a6","#e5484d","#a855f7","#8c93a8"];const rt=Math.max(rr.reduce((a,x)=>a+x[1],0),1);
  let acc=0;const stops=rr.map(([,n],i)=>{const a0=acc/rt*100;acc+=n;return `${PAL[i]} ${a0}% ${acc/rt*100}%`}).join(",");
  const rarHtml2=`<div class="v2donutw"><div class="v2donut" style="background:conic-gradient(${stops||"var(--pocket) 0 100%"})" aria-hidden="true"><span><b>${rt}</b><small>cards</small></span></div><div class="v2legs">${rr.map(([n,c],i)=>`<div class="v2leg hgo"${go("rar",(n==="Other"&&restNames)?restNames.join("\u0001"):n)}><span class="v2sw2" style="background:${PAL[i]}"></span><span>${esc(n)}</span><b>${c}</b><small>${Math.round(c/rt*100)}%</small></div>`).join("")}</div></div>`;
  // types + kinds
  const tm={},km={Pokémon:0,Trainer:0,Energy:0,"No details":0};
  cards.forEach(c=>{const d=c.details;if(!d){km["No details"]+=q(c);return}const sup=String(d.supertype||"").toLowerCase();const k=sup.startsWith("trainer")?"Trainer":sup.startsWith("energy")?"Energy":"Pokémon";km[k]+=q(c);if(k==="Pokémon"){const t=(d.types||[])[0]||"Colorless";tm[t]=(tm[t]||0)+q(c)}});
  const tr=Object.entries(tm).sort((a,b)=>b[1]-a[1]).slice(0,6);const tmx=Math.max(...tr.map(x=>x[1]),1);
  const typeHtml=`<div class="v2kinds">${Object.entries(km).filter(([,n])=>n).map(([k,n])=>`<span class="hgo"${go("kind",k)}><b>${n}</b> ${k}</span>`).join("")}</div>`+(tr.length?tr.map(([t,n])=>`<div class="v2bar hgo"${go("type",t)}><span>${t}</span><span class="t"><i style="width:${n/tmx*100}%;background:${V2TC[t]||"var(--brand)"}"></i></span><span>${n}</span></div>`).join(""):`<p class="sub2">Fill in card details to see types.</p>`);
  // health
  const nCards=Math.max(cards.length,1);
  const hl=[["Details filled in",cards.filter(c=>c.details).length,"det","Fill in"],["Have a picture",cards.filter(c=>imgSrc(c)).length,"nopic","Show cards without"],["Have a price",cards.filter(c=>unitVal(c)!=null).length,"price","Show cards without"]];
  const healthHtml=hl.map(([n,c,go2,lab])=>{const pc=Math.round(c/nCards*100);return `<div class="v2health hgo"${go("health",go2)}><div><span>${n}</span><b>${pc}%</b></div><span class="t"><i style="width:${pc}%;background:${pc>=90?"var(--ok)":pc>=60?"var(--accent)":"var(--danger)"}"></i></span><small>${c} of ${cards.length}${go2&&c<cards.length?` · ${lab}`:""}</small></div>`}).join("");
  $("#v2row3").innerHTML=hc2("Where your cards are",whereHtml)+hc2("Collection health",healthHtml);
  const setsSum={};for(const c of cards){const k=c.set||c.setCode;if(!k)continue;const pp=numParts(c.number);if(!pp||pp.pre)continue;const x=(setsSum[k]=setsSum[k]||{tot:{},own:new Set()});x.tot[pp.tot]=(x.tot[pp.tot]||0)+1;x.own.add(pp.n)}
  const rows=Object.entries(setsSum).map(([k,x])=>{const t=+Object.keys(x.tot).sort((a,z)=>x.tot[z]-x.tot[a])[0];const o=[...x.own].filter(n=>n<=t).length;return {k,t,o,p:Math.round(o/t*100)}}).sort((a,z)=>z.p-a.p).slice(0,5);
  const rec=cards.filter(c=>c.added).slice().sort((a,b)=>String(b.added).localeCompare(String(a.added))).slice(0,5);
  $("#v2row2").innerHTML=hc("Set completion",rows.length?rows.map(r=>`<div class="v2bar hgo"${go("exp",r.k)}><span>${esc(r.k)}</span><span class="t"><i style="width:${r.p}%"></i></span><span>${r.p}%</span></div>`).join(""):`<p class="sub2">Add cards with set numbers to see progress.</p>`,more("stats","All sets","setPanel"))+hc("Recently added",rec.length?rec.map(c=>`<div class="v2li hgo"${go("card",c.id)}>${th(c)}<span><b>${esc(c.name)}</b><small>${esc(String(c.added).slice(0,10))}</small></span><span class="v2loc">${esc(locLabel(c))}</span></div>`).join(""):`<p class="sub2">Nothing yet.</p>`,more("collection","All cards"));
}
/* sidebar: add menu, groups and counts, undo, value, theme, collapse, phone bar (matches the approved prototype) */
var sbT=null;
function sbSchedule(){clearTimeout(sbT);sbT=setTimeout(()=>{if(window.sbRefresh)window.sbRefresh()},250)}
(function(){
  const host=document.querySelector(".appbar");if(!host)return;
  const root=document.documentElement,body=document.body;
  const IC={plus:'<path d="M12 5v14M5 12h14"/>',more:'<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
    scan:'<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',hand:'<path d="M4 20h4L19 9l-4-4L4 16z"/>',imp:'<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
    csv:'<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 13h6M9 17h6"/>',undo:'<path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>',
    search:'<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4 4"/>',sun:'<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6L7 7M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4"/>',
    auto:'<rect x="3" y="5" width="18" height="12" rx="2"/><path d="M8 21h8"/>',moon:'<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',chev:'<path d="M15 6l-6 6 6 6"/>'};
  const ic=(k,sw)=>`<svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="${sw||2}" stroke-linecap="round" stroke-linejoin="round">${IC[k]}</g></svg>`;
  /* ----- theme ----- */
  const themeGet=()=>{try{const t=localStorage.getItem("pk-theme");return t==="light"||t==="dark"?t:"auto"}catch{return"auto"}};
  const themeUi=()=>document.querySelectorAll("[data-th]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.th===themeGet())));
  const themeSet=t=>{if(t==="auto")delete root.dataset.theme;else root.dataset.theme=t;try{localStorage.setItem("pk-theme",t)}catch{}themeUi()};
  {const t=themeGet();if(t!=="auto")root.dataset.theme=t}
  const themeHtml=()=>`<div class="sbtheme" role="group" aria-label="Theme"><button type="button" data-th="light" aria-label="Light" title="Light">${ic("sun")}</button><button type="button" data-th="auto" aria-label="Match system" title="Match system">${ic("auto")}</button><button type="button" data-th="dark" aria-label="Dark" title="Dark">${ic("moon")}</button></div>`;
  /* ----- brand + collapse ----- */
  const brand=host.querySelector(".brand"),logo=brand.querySelector("svg").outerHTML;
  brand.innerHTML=`<span class="sblogo">${logo}</span><span class="sbbn"><b>Card catalog</b><small id="sbSub"></small></span><button type="button" class="sbcol" id="sbCol" aria-label="Collapse sidebar" data-tip="Expand sidebar">${ic("chev",2.4)}</button>`;
  const colUi=()=>{const c=body.classList.contains("sbc");const b=document.getElementById("sbCol");b.setAttribute("aria-label",c?"Expand sidebar":"Collapse sidebar");b.setAttribute("aria-expanded",String(!c))};
  const toggle=()=>{body.classList.toggle("sbc");try{localStorage.setItem("pk-sb",body.classList.contains("sbc")?"1":"0")}catch{}colUi()};
  try{if(localStorage.getItem("pk-sb")==="1")body.classList.add("sbc")}catch{}colUi();
  /* ----- add menu ----- */
  const add=document.createElement("div");add.className="sbadd";
  add.innerHTML=`<button type="button" class="sbaddb" id="sbAdd" aria-haspopup="true" aria-expanded="false" data-tip="Add cards">${ic("plus",2.6)}<span>Add cards</span></button>
   <div class="sbpop" id="sbPop" hidden>
    <button type="button" data-sbadd="scan">${ic("scan")}<span>Scan a page<small>Photograph a binder page or deck</small></span></button>
    <button type="button" data-sbadd="hand">${ic("hand")}<span>Add by hand<small>Search TCGdex or type it in</small></span></button>
    <button type="button" data-sbadd="deck">${ic("imp")}<span>Import decklist<small>For a deck you already own</small></span></button>
    <button type="button" data-sbadd="csv">${ic("csv")}<span>Import CSV<small>Cards from a spreadsheet export</small></span></button></div>`;
  brand.after(add);
  /* ----- nav: groups, counts, tooltips ----- */
  const nav=document.getElementById("tabs");
  const GRP={binders:"Organise",collection:"Browse",tools:"Manage"};
  nav.querySelectorAll("[data-scr]").forEach(b=>{
    const k=b.dataset.scr,sp=b.querySelector("span");if(sp)sp.classList.add("sbt");
    b.dataset.tip=sp?sp.textContent:k;
    const c=document.createElement("span");c.className="sbcnt";c.dataset.cnt=k;b.appendChild(c);
    if(GRP[k]){const g=document.createElement("div");g.className="sbgrp";g.textContent=GRP[k];b.before(g)}
  });
  /* ----- bottom block ----- */
  host.querySelectorAll(".v2foot").forEach(e=>e.remove());
  const bot=document.createElement("div");bot.className="sbbot";
  bot.innerHTML=`<button type="button" class="sbundo" id="sbUndo" hidden title="Undo the last change">${ic("undo")}<span id="sbUndoL"></span><kbd>Ctrl Z</kbd></button>
   <button type="button" class="sbsum" id="sbSum" data-tip="Collection value" title="Open the value breakdown"><small>Collection value</small><b id="sbVal">—</b><span class="d" id="sbDelta"></span></button>
   <div class="sbfoot"><button type="button" class="btn ghost" id="sbQ" data-tip="Quick search"><span class="l">${ic("search")}<span>Quick search</span></span><kbd>Ctrl K</kbd></button>
    <div class="sbrow t2" id="sbRowA">${themeHtml()}</div><div class="sbrow" id="sbRowB"></div></div>`;
  host.appendChild(bot);
  const rowA=document.getElementById("sbRowA"),rowB=document.getElementById("sbRowB");
  const place=()=>{const l=document.getElementById("pkLang"),m=document.getElementById("pkMenu");if(l&&l.parentElement!==rowA)rowA.appendChild(l);if(m&&m.parentElement!==rowB)rowB.appendChild(m)};
  place();window.addEventListener("load",()=>{place();setTimeout(place,300)});
  themeUi();
  /* ----- phone: bottom bar + sheet ----- */
  const svgOf=k=>{const b=nav.querySelector(`[data-scr="${k}"] svg`);return b?b.outerHTML:""};
  const nameOf=k=>{const b=nav.querySelector(`[data-scr="${k}"]`);return b?b.dataset.tip:k};
  const bnav=document.createElement("nav");bnav.className="bnav";bnav.id="sbBnav";bnav.setAttribute("aria-label","Sections");
  bnav.innerHTML=["home","binders","ADD","collection","more"].map(k=>k==="ADD"?`<button type="button" class="fab" data-sbadd="menu" aria-label="Add cards">${ic("plus",2.6)}</button>`:k==="more"?`<button type="button" data-sbmore aria-label="More">${ic("more")}<span>More</span><i class="bd" hidden></i></button>`:`<button type="button" data-scr="${k}">${svgOf(k)}<span class="sbtn">${esc(nameOf(k))}</span></button>`).join("");
  const scrim=document.createElement("div");scrim.className="sbscrim";scrim.id="sbScrim";
  const sheet=document.createElement("div");sheet.className="sbsheet";sheet.id="sbSheet";sheet.setAttribute("role","dialog");sheet.setAttribute("aria-label","More");
  body.append(bnav,scrim,sheet);
  const MORE=["decks","showcase","wishlist","stats","tools"];
  const closeSheet=()=>{sheet.classList.remove("on");scrim.classList.remove("on")};
  const openSheet=(add)=>{
    const cnt=k=>{const c=nav.querySelector(`[data-cnt="${k}"]`);return c&&c.textContent?`<span class="sbcnt${c.classList.contains("warn")?" warn":""}">${esc(c.textContent)}</span>`:""};
    const lang=document.getElementById("pkLang"),dot=document.getElementById("pkDot"),sub=document.getElementById("pkSub");
    sheet.innerHTML=`<div class="grab"></div>${add?`<button type="button" class="sbitem" data-sbadd="scan">${ic("scan")}<span class="sbt">Scan a page</span></button><button type="button" class="sbitem" data-sbadd="hand">${ic("hand")}<span class="sbt">Add by hand</span></button><button type="button" class="sbitem" data-sbadd="deck">${ic("imp")}<span class="sbt">Import decklist</span></button><button type="button" class="sbitem" data-sbadd="csv">${ic("csv")}<span class="sbt">Import CSV</span></button>`:
     MORE.map(k=>`<button type="button" class="sbitem${S.screen===k?" on":""}" data-scr="${k}">${svgOf(k)}<span class="sbt">${esc(nameOf(k))}</span>${cnt(k)}</button>`).join("")+`<div class="sbfoot">
      <div class="sbrow">${themeHtml()}<button type="button" class="btn ghost sblang" data-sblang>${lang?esc(lang.textContent):"ΕΛ"}</button><button type="button" class="sbfold" data-scr="tools" data-tt="data"><i class="sbdot" data-s="${dot?dot.dataset.s:"ok"}"></i><span><b>${esc((document.getElementById("pkName")||{}).textContent||"Folder")}</b><small>${esc(sub?sub.textContent:"")}</small></span></button></div></div>`}`;
    sheet.classList.add("on");scrim.classList.add("on");themeUi();
  };
  /* ----- counts, value, undo ----- */
  const setCnt=(k,v,warn)=>{document.querySelectorAll(`[data-cnt="${k}"]`).forEach(c=>{c.textContent=v?String(v):"";c.classList.toggle("warn",!!warn);c.title=warn?`${v} thing${v===1?"":"s"} to check`:""})};
  window.sbRefresh=function(){
    try{
      const cs=S.cards,q=c=>+c.qty||1;const copies=cs.reduce((a,c)=>a+q(c),0);
      const sets=new Set(cs.map(c=>c.set||c.setCode).filter(Boolean)).size;
      const sub=document.getElementById("sbSub");if(sub)sub.textContent=cs.length?`${copies.toLocaleString("en-GB")} cards · ${sets} set${sets===1?"":"s"}`:"No cards yet";
      setCnt("binders",binderNums().length);setCnt("decks",deckNames().length);setCnt("wishlist",(S.wish||[]).length);
      setCnt("showcase",cs.filter(c=>c.locType==="showcase").reduce((a,c)=>a+q(c),0));setCnt("collection",copies.toLocaleString("en-GB"));
      let w=0;try{w=healthChecks().filter(i=>i.sev==="warn").length}catch{}setCnt("tools",w,true);
      const bd=document.querySelector("#sbBnav .bd");if(bd)bd.hidden=!w;
      const v=valueStats();document.getElementById("sbVal").textContent=v.priced?eur(v.total):"—";
      /* change over about a month, from the price history cards already keep */
      const cut=new Date(Date.now()-28*864e5).toISOString().slice(0,10);let dl=0,n=0;
      for(const c of cs){const u=unitVal(c);if(u==null||!c.phist)continue;let base=null;for(const p of c.phist){if(p&&p.v>0&&String(p.d)<=cut)base=p}if(base){dl+=(u-base.v)*q(c);n++}}
      const d=document.getElementById("sbDelta");if(d){if(n&&Math.abs(dl)>=.01){d.textContent=`${dl>0?"▲":"▼"} ${eur(Math.abs(dl))} vs a month ago`;d.classList.toggle("neg",dl<0)}else d.textContent=""}
    }catch(e){}
    window.sbUndo();
  };
  window.sbUndo=function(){const b=document.getElementById("sbUndo");if(!b)return;const t=UNDO[UNDO.length-1];b.hidden=!t;if(t)document.getElementById("sbUndoL").textContent="Undo: "+t.label};
  window.sbActive=function(k){
    document.querySelectorAll("#sbBnav [data-scr]").forEach(b=>{if(b.dataset.scr===k)b.setAttribute("aria-current","page");else b.removeAttribute("aria-current")});
    const m=document.querySelector("#sbBnav [data-sbmore]");if(m){if(MORE.includes(k))m.setAttribute("aria-current","page");else m.removeAttribute("aria-current")}
    closeSheet();
  };
  /* ----- actions ----- */
  const doAdd=a=>{
    document.getElementById("sbPop").hidden=true;closeSheet();
    if(a==="scan")show("scan");
    else if(a==="hand")openEditor(null);
    else if(a==="deck"){show("decks");openDeckImport("")}
    else if(a==="csv"){const f=document.getElementById("csvFile");if(f)f.click()}
  };
  document.addEventListener("click",e=>{
    const t=e.target;if(!t.closest)return;
    const a=t.closest("[data-sbadd]");if(a){if(a.dataset.sbadd==="menu")openSheet(true);else doAdd(a.dataset.sbadd);return}
    if(t.closest("#sbAdd")){const p=document.getElementById("sbPop"),o=!p.hidden;p.hidden=o;document.getElementById("sbAdd").setAttribute("aria-expanded",String(!o));return}
    if(!t.closest(".sbadd"))document.getElementById("sbPop").hidden=true;
    if(t.closest("[data-sbmore]")){openSheet(false);return}
    if(t.closest("#sbScrim")){closeSheet();return}
    if(t.closest("#sbCol")){toggle();return}
    if(t.closest("#sbUndo")){undoLast();return}
    if(t.closest("#sbSum")){show("stats");if(typeof showSub==="function")showSub("valuePanel");return}
    if(t.closest("#sbQ")){if(window.v2Cmd)window.v2Cmd();return}
    const th=t.closest("[data-th]");if(th){themeSet(th.dataset.th);return}
    if(t.closest("[data-sblang]")){const l=document.getElementById("pkLang");if(l){l.click();const b=t.closest("[data-sblang]");setTimeout(()=>{b.textContent=l.textContent},50)}return}
  });
  /* tooltips on the icon rail */
  const tip=document.createElement("div");tip.className="sbtip";tip.hidden=true;body.appendChild(tip);
  document.addEventListener("mouseover",e=>{const t=e.target.closest&&e.target.closest(".appbar [data-tip]");if(!t||!body.classList.contains("sbc")){tip.hidden=true;return}const r=t.getBoundingClientRect();tip.textContent=t.id==="sbCol"?"Expand sidebar":t.dataset.tip;tip.style.left=(r.right+10)+"px";tip.style.top=(r.top+r.height/2)+"px";tip.hidden=false});
  document.addEventListener("mouseout",e=>{if(e.target.closest&&e.target.closest(".appbar [data-tip]"))tip.hidden=true});
  /* keys: [ collapses, 1 to 7 switch page, Ctrl Z undoes */
  const ORDER=["home","binders","decks","showcase","collection","stats","tools"];
  document.addEventListener("keydown",e=>{
    if(e.key==="Escape"){document.getElementById("sbPop").hidden=true;closeSheet();return}
    const tg=(e.composedPath&&e.composedPath()[0])||e.target;
    if(tg&&(/^(INPUT|SELECT|TEXTAREA)$/.test(tg.tagName)||tg.isContentEditable))return;
    if(document.querySelector("dialog[open],.zoom,.dk,.dkb,.ldx,.cp-lb,#v2cmd.on"))return;
    if((e.ctrlKey||e.metaKey)&&!e.shiftKey&&!e.altKey&&e.key.toLowerCase()==="z"){if(UNDO.length){e.preventDefault();undoLast()}return}
    if(e.ctrlKey||e.metaKey||e.altKey)return;
    if(e.key==="["){toggle();e.preventDefault()}
    else if(/^[1-7]$/.test(e.key)){show(ORDER[+e.key-1]);e.preventDefault()}
  });
})();

const GENS=[["I","Kanto",1,151],["II","Johto",152,251],["III","Hoenn",252,386],["IV","Sinnoh",387,493],["V","Unova",494,649],["VI","Kalos",650,721],["VII","Alola",722,809],["VIII","Galar",810,905],["IX","Paldea",906,1025]];
const titleCase=s=>String(s).replace(/(^|[\s-])([a-z])/g,(m,a,b)=>a+b.toUpperCase());
let dexOpen=new Set();
function renderDex(){
  const box=$("#dexSum");if(!box)return;
  const sp=new Map();
  for(const c of S.cards){const n=dexOf(c);if(!n)continue;if(!sp.has(n))sp.set(n,{n,cards:[]});sp.get(n).cards.push(c)}
  const list=[...sp.values()].sort((a,b)=>a.n-b.n);
  for(const s of list){
    const vars=new Map();for(const c of s.cards){const k=cardKey(c);if(!vars.has(k))vars.set(k,{c,q:0});vars.get(k).q+=+c.qty||1}
    s.vars=[...vars.values()];s.copies=s.cards.reduce((a,c)=>a+(+c.qty||1),0);
    const base=dexBase(s.cards[0].name);s.name=titleCase(base);
  }
  const owned=list.length,pct=Math.round(owned/DEX_TOTAL*1000)/10;
  const totVars=list.reduce((a,s)=>a+s.vars.length,0),totCopies=list.reduce((a,s)=>a+s.copies,0);
  const top=list.slice().sort((a,b)=>b.vars.length-a.vars.length||a.n-b.n)[0];
  const multi=list.filter(s=>s.vars.length>1).length;
  box.innerHTML=owned?`<div class="dexbig"><b>${owned}</b> <span>of ${DEX_TOTAL} Pokémon</span><small>${pct}% of the National Pokédex</small></div>
    <div class="fill big" role="img" aria-label="${pct}% complete"><i style="width:${Math.max(pct,owned?1:0)}%"></i></div>
    <div class="bstats four">
      <div><b>${totVars}</b><small>different cards (variants)</small></div>
      <div><b>${(totVars/owned).toFixed(1)}</b><small>variants per Pokémon on average</small></div>
      <div><b>${multi}</b><small>Pokémon with 2 or more variants</small></div>
      <div><b>${top?esc(top.name):"—"}</b><small>${top?`most variants (${top.vars.length})`:"most variants"}</small></div>
    </div>
    <div class="gens">${GENS.map(([r,reg,a,z])=>{const t=z-a+1;const h=list.filter(s=>s.n>=a&&s.n<=z).length;const p=Math.round(h/t*100);return `<div class="gen"><span class="gl">Gen ${r} <small>${reg}</small></span><div class="fill"><i style="width:${p}%"></i></div><span class="gn">${h} / ${t}</span></div>`}).join("")}</div>`
    :`<p class="sub2">No Pokémon catalogued yet.</p>`;
  $("#dexDetails").classList.toggle("hidden",!owned);
  $("#dexList").innerHTML=owned?`<div class="dxhead"><span>No.</span><span>Pokémon</span><span>Variants</span><span>Copies</span></div>`+list.map(s=>`<details class="dxrow" data-dex="${s.n}"${dexOpen.has(s.n)?" open":""}><summary><span class="dxn">${String(s.n).padStart(4,"0")}</span><span class="dxname">${esc(s.name)}</span><span class="dxv">${s.vars.length}</span><span class="dxq">×${s.copies}</span></summary><div class="dxvars">${s.vars.map(v=>{const c=v.c;return `<div><span>${esc(c.name)}</span><span>${esc([c.setCode||c.set,c.number].filter(Boolean).join(" "))}${c.variant&&c.variant!=="Normal"?`, ${esc(c.variant)}`:""}${c.rarity?` ${rarHtml(c.rarity)}`:""}</span><b>×${v.q}</b></div>`}).join("")}</div></details>`).join(""):"";
}
const RAR=["common","uncommon","rare","rare holo","double rare","ultra rare","illustration rare","special illustration rare","hyper rare","secret rare"];
function rarRank(r){
  r=String(r||"").toLowerCase().trim();if(!r)return -1;
  const j=RARITIES.findIndex(x=>x.toLowerCase()===r);if(j>-1)return j;
  const i=RAR.indexOf(r);if(i>-1)return i;
  if(r.includes("secret"))return 9;if(r.includes("hyper"))return 8;if(r.includes("special"))return 7;if(r.includes("illustration"))return 6;
  if(r.includes("ultra"))return 5;if(r.includes("double"))return 4;if(r.includes("holo"))return 3;if(r.includes("promo"))return 2.5;
  if(r.includes("uncommon"))return 1;if(r.includes("common"))return 0;if(r.includes("rare"))return 2;return -0.5;
}
function renderBinderInfo(){
  const box=$("#binderInfo");if(!box)return;const n=+$("#binderNo").value||0;
  if(!n||!binderNums().includes(n)){box.innerHTML="";return}
  const st=binderStats(n);const pct=st.cap?Math.min(100,Math.round(st.filled/st.cap*100)):0;
  const ts=SPRITE.filter(t=>st.types[t]);const pokemon=ts.reduce((a,t)=>a+st.types[t],0);
  const stageOrder=["Basic","Stage 1","Stage 2",...EVO.filter(x=>x!=="Stage 1"&&x!=="Stage 2"),"Restored"];const stg=stageOrder.filter(s=>st.stages[s]);
  const sets=Object.keys(st.sets).sort((a,z)=>st.sets[z]-st.sets[a]||a.localeCompare(z));
  const extra=[st.kinds.trainer&&`Trainers: ${st.kinds.trainer}`,st.kinds.energy&&`Energy cards: ${st.kinds.energy}`,st.kinds.unknown&&`Without details: ${st.kinds.unknown}`].filter(Boolean).join(", ");
  box.innerHTML=`<div class="bstats bi4">
      <div><b>${st.filled} of ${st.cap||0}</b><small>pockets filled${st.cap?` (${pct}%)`:""}</small><div class="fill"><i style="width:${pct}%"></i></div></div>
      <div><b>${st.pages||0}</b><small>${st.setP?"pages":"pages so far"}${st.pages?` (${st.pages/2} sheets)`:""}</small></div>
      <div><b>${st.copies}</b><small>cards in total</small></div>
      <div><b>${st.unique}</b><small>different cards</small></div>
    </div>
    <div class="bigrid">
      <div class="bsec"><h4>Pokémon by type${pokemon?` (${pokemon})`:""}</h4>${ts.length?`<div class="tgrid">${ts.map(t=>`<div class="tchip">${en(t)}<span>${t}</span><b>${st.types[t]}</b></div>`).join("")}</div>`:`<p class="sub2">No Pokémon with details yet.</p>`}${extra?`<p class="sub2" style="margin-top:8px">${extra}</p>`:""}</div>
      ${stg.length?`<div class="bsec"><h4>By stage</h4><div class="tgrid">${stg.map(s=>`<div class="tchip"><span>${esc(s)}</span><b>${st.stages[s]}</b></div>`).join("")}</div></div>`:""}
    </div>
    ${sets.length?`<div class="bsec bsets"><h4>By set (${sets.length})</h4><div class="setlist">${sets.map(s=>`<div><span>${esc(s)}</span><b>${st.sets[s]}</b></div>`).join("")}</div></div>`:""}`;
}
function renderBinder(){renderBinder0();if(typeof bkRefresh==="function")bkRefresh()}
function renderBinder0(){
  if($("#binderTitle"))$("#binderTitle").textContent=binderName($("#binderNo").value||1);
  renderBinderInfo();
  renderGallery();
  const v=$("#binderView");$("#dragHint").classList.add("hidden");$("#pageTools").classList.add("hidden");$("#bselBar").classList.add("hidden");v.classList.remove("spread-on","full");v.style.removeProperty("--cover");document.body.style.overflow="";
  if(S.mode==="deck"&&!S.review.length&&!S.photo){v.innerHTML=`<div class="pocket drop" style="min-height:90px;justify-content:center;align-items:center">Lay the deck out in rows and take one photo</div>`;return}
  if(S.review.length&&S.mode==="binder"){
    const bySlot={};S.review.forEach(r=>{if(r.slot)bySlot[r.slot]=r});
    v.innerHTML=Array.from({length:9},(_,i)=>{const r=bySlot[i+1];return pocketHtml(i+1,r,r&&r.crop&&r.crop.url)}).join("");
    $("#dragHint").classList.toggle("hidden",!v.querySelector(".drag"));
    return;
  }
  if(S.photo){v.innerHTML=`<div class="pocket photo drop" style="aspect-ratio:4/3"><img alt="Selected photo" src="${S.photo.url}"></div>`;return}
  // no photo: show the binder as an open two-page spread
  const {b,cur,total,set,L,R,inB}=spreadInfo();
  const leaf=(n,side)=>{
    if(n==null){const cv=side==="left"&&S.binders[b]&&S.binders[b].cover;return cv?`<div class="leaf cover photo"><img alt="Cover photo of ${esc(binderName(b))}" src="${PKL.blob(cv)}"></div>`:`<div class="leaf cover">${side==="left"?"Inside front cover":"Inside back cover"}</div>`}
    const here={};inB.filter(c=>+c.page===n&&c.slot).forEach(c=>here[c.slot]=c);
    return `<div class="leaf${n===cur?" sel":""}"><div class="pgrow"><button type="button" class="pg" data-goto="${n}" aria-pressed="${n===cur}">Page ${n}</button><button type="button" class="pscan" data-scanpage="${n}" title="Scan a photo of the whole page ${n}" aria-label="Scan a photo of page ${n}"><svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></g></svg>Scan page</button></div><div class="grid9">${Array.from({length:9},(_,i)=>{const c=here[i+1];return pocketHtml(i+1,c,c&&imgSrc(c),n)}).join("")}</div></div>`;
  };
  const prev=(L||1)-1,next=(R||L)+1;
  const turn=S.turn;S.turn=null;
  v.classList.add("spread-on");v.style.setProperty("--cover",binderColor(b));v.classList.toggle("full",!!S.full);document.body.style.overflow=S.full?"hidden":"";
  const NI={first:'<path d="M17 6l-6 6 6 6M7 6v12"/>',prev:'<path d="M15 6l-6 6 6 6"/>',next:'<path d="M9 6l6 6-6 6"/>',last:'<path d="M7 6l6 6-6 6M17 6v12"/>',full:'<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',exit:'<path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/>'};
  const ico=k=>`<svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">${NI[k]}</g></svg>`;
  const atStart=prev<1,atEnd=set&&next>total,onLast=(R||L)>=total;
  const nav=`<div class="spreadnav"><div class="nb"><button type="button" class="ib" data-goto="1" data-turn="prev" ${L==null?"disabled":""} aria-label="First page" title="First page">${ico("first")}</button><button type="button" class="ib" data-goto="${prev}" data-turn="prev" data-step="prev" ${atStart?"disabled":""} aria-label="Previous pages" title="Previous pages">${ico("prev")}</button></div><span class="lbl"><b>${esc(binderName(b))}</b><small>${L&&R?`Pages ${L} and ${R}`:`Page ${L||R}`} of ${total}</small></span><div class="nb"><button type="button" class="ib" data-goto="${next}" data-turn="next" data-step="next" ${atEnd?"disabled":""} aria-label="Next pages" title="Next pages">${ico("next")}</button><button type="button" class="ib" data-goto="${total}" data-turn="next" ${onLast?"disabled":""} aria-label="Last page" title="Last page">${ico("last")}</button><button type="button" class="ib" data-full aria-label="${S.full?"Close full screen":"Full screen"}" title="${S.full?"Close full screen":"Full screen"}">${ico(S.full?"exit":"full")}</button></div></div>`;
  const edges=`<button type="button" class="edge l" data-goto="${prev}" data-turn="prev" ${atStart?"disabled":""} aria-label="Previous pages" tabindex="-1">${ico("prev")}</button><button type="button" class="edge r" data-goto="${next}" data-turn="next" ${atEnd?"disabled":""} aria-label="Next pages" tabindex="-1">${ico("next")}</button>`;
  v.innerHTML=`${nav}<div class="spread${turn?" in-"+turn:""}">${leaf(L,"left")}${leaf(R,"right")}${edges}</div>`;
  $("#dragHint").classList.remove("hidden");
  const onPage=inB.filter(c=>+c.page===cur).length;
  $("#pageTools").classList.toggle("hidden",!inB.length);$("#clearPage").classList.toggle("hidden",!onPage);$("#clearPage").textContent=`Clear page ${cur}`;
  {const later=inB.some(c=>+c.page>=cur);const prevEmpty=cur>1&&!inB.some(c=>+c.page===cur-1);
   $("#pgFwd").classList.toggle("hidden",!later);$("#pgFwd").textContent=`Insert empty page at ${cur}`;$("#pgFwd").title=`Page ${cur} and every page after it move one page forward, leaving page ${cur} empty`;
   $("#pgBack").classList.toggle("hidden",!(later&&prevEmpty));$("#pgBack").textContent=`Move pages ${cur}+ back one`;$("#pgBack").title=`Page ${cur} and every page after it move one page back, filling empty page ${cur-1}`;
   if(S.bsel){const ids=new Set(inB.map(c=>c.id));for(const id of [...S.bsel])if(!ids.has(id))S.bsel.delete(id)}
   $("#bSelBtn").setAttribute("aria-pressed",!!S.bselMode);$("#bSelBtn").textContent=S.bselMode?"Selecting…":"Select cards";
   $("#bselBar").classList.toggle("hidden",!S.bselMode);const n=S.bsel?S.bsel.size:0;$("#bselCount").textContent=n?`${plural(n,"card")} selected. Drag one to move them all.`:"Tap cards to select them.";
   $("#bselMove").disabled=!n;$("#bselClear").disabled=!n;$("#bselPage").textContent=`Select page ${cur}`;}
}
function renderReview(){
  const box=$("#review");
  box.classList.toggle("hidden",!S.review.length);
  $("#reviewTitle").textContent=`Check these ${S.review.length} ${S.review.length===1?"card":"cards"}`;
  $("#commit").textContent=`Add ${S.review.length} to catalog`;
  const opts=v=>VARIANTS.map(x=>`<option${x===v?" selected":""}>${x}</option>`).join("");
  $("#reviewList").innerHTML=S.review.map((r,i)=>`
    <div class="review-item" data-i="${i}">
      ${S.mode==="binder"?`<select class="slot" data-k="slot" aria-label="Pocket"><option value="">?</option>${[1,2,3,4,5,6,7,8,9].map(n=>`<option${n===r.slot?" selected":""}>${n}</option>`).join("")}</select>`:`<div class="slot">×</div>`}
      <div class="fields">
        <input class="wide" data-k="name" value="${esc(r.name)}" aria-label="Name">
        <input data-k="set" value="${esc(r.set)}" placeholder="Set" aria-label="Set">
        <input data-k="setCode" value="${esc(r.setCode)}" placeholder="Set code" aria-label="Set code">
        <input data-k="regMark" value="${esc(r.regMark)}" placeholder="Mark" aria-label="Regulation mark" maxlength="2">
        <input data-k="number" value="${esc(r.number)}" placeholder="Number" aria-label="Number">
        <select data-k="variant" aria-label="Variant">${opts(r.variant||"Normal")}</select>
        <input data-k="qty" type="number" min="1" value="${+r.qty||1}" aria-label="Copies" inputmode="numeric">
        ${r.note||r.confidence==="low"?`<div class="flag">Check this one${r.note?": "+esc(r.note):""}</div>`:""}${dupHtml(r)}${PKL.reviewExtra(r)}
      </div>
      <button class="x" data-rm="${i}" aria-label="Remove ${esc(r.name)}">×</button>
    </div>`).join("");
  renderBinder();
}

// ---------- scanning ----------
async function shrink(file,max0){
  const img=await createImageBitmap(file,{imageOrientation:"from-image"}).catch(()=>createImageBitmap(file)).catch(()=>null);
  if(!img)return file;
  const max=max0||2000,k=Math.min(1,max/Math.max(img.width,img.height));
  const cv=document.createElement("canvas");cv.width=Math.round(img.width*k);cv.height=Math.round(img.height*k);
  cv.getContext("2d").drawImage(img,0,0,cv.width,cv.height);
  return await new Promise(r=>cv.toBlob(b=>r(b||file),"image/jpeg",0.88));
}
async function makeCrops(){
  clearCrops();
  const img=await createImageBitmap(S.photo.blob).catch(()=>null);if(!img)return;
  const cw=img.width/3,ch=img.height/3,ins=0.03;
  for(let i=0;i<9;i++){
    const x=(i%3)*cw+cw*ins,y=Math.floor(i/3)*ch+ch*ins,w=cw*(1-2*ins),h=ch*(1-2*ins);
    const k=Math.min(1,900/w);const cv=document.createElement("canvas");cv.width=Math.round(w*k);cv.height=Math.round(h*k);
    cv.getContext("2d").drawImage(img,x,y,w,h,0,0,cv.width,cv.height);
    const blob=await new Promise(r=>cv.toBlob(r,"image/jpeg",0.85));
    if(blob)S.crops[i+1]={blob,url:URL.createObjectURL(blob)};
  }
}
function okBox(b){if(!Array.isArray(b)||b.length!==4)return null;const v=b.map(Number);if(v.some(x=>!Number.isFinite(x)))return null;const n=v.map(x=>x>1.5?x/1000:x);let [l,t,r,bm]=n;if(r<l)[l,r]=[r,l];if(bm<t)[t,bm]=[bm,t];l=Math.max(0,l);t=Math.max(0,t);r=Math.min(1,r);bm=Math.min(1,bm);return (r-l>0.03&&bm-t>0.03)?[l,t,r,bm]:null}
async function cropReview(){
  if(!S.photo)return;const img=await createImageBitmap(S.photo.blob).catch(()=>null);if(!img)return;
  const W=img.width,H=img.height;
  for(const r of S.review){
    if(r.crop){URL.revokeObjectURL(r.crop.url);r.crop=null}
    let x,y,w,h;
    if(r.box){const[l,t,rt,b]=r.box;const px=(rt-l)*0.03,py=(b-t)*0.03;x=(l-px)*W;y=(t-py)*H;w=(rt-l+2*px)*W;h=(b-t+2*py)*H}
    else if(S.mode==="binder"&&r.slot>=1&&r.slot<=9){const cw=W/3,ch=H/3,ins=0.03;x=((r.slot-1)%3)*cw+cw*ins;y=Math.floor((r.slot-1)/3)*ch+ch*ins;w=cw*(1-2*ins);h=ch*(1-2*ins)}
    else continue;
    x=Math.max(0,x);y=Math.max(0,y);w=Math.min(W-x,w);h=Math.min(H-y,h);if(w<20||h<20)continue;
    const k=Math.min(1,700/w);const cv=document.createElement("canvas");cv.width=Math.round(w*k);cv.height=Math.round(h*k);
    cv.getContext("2d").drawImage(img,x,y,w,h,0,0,cv.width,cv.height);
    const blob=await new Promise(res=>cv.toBlob(res,"image/jpeg",0.86));
    if(blob)r.crop={blob,url:URL.createObjectURL(blob)};
  }
}
function clearCrops(){Object.values(S.crops).forEach(c=>URL.revokeObjectURL(c.url));S.crops={}}
async function rotateBlob(blob,deg){
  if(!deg)return blob;
  const img=await createImageBitmap(blob);const swap=deg%180!==0;
  const cv=document.createElement("canvas");cv.width=swap?img.height:img.width;cv.height=swap?img.width:img.height;
  const g=cv.getContext("2d");g.translate(cv.width/2,cv.height/2);g.rotate(deg*Math.PI/180);g.drawImage(img,-img.width/2,-img.height/2);
  return await new Promise(r=>cv.toBlob(b=>r(b||blob),"image/jpeg",0.9));
}
function setPhoto(blob){if(S.photo)URL.revokeObjectURL(S.photo.url);S.photo={blob,url:URL.createObjectURL(blob)}}
function setStatus(t,err){const s=$("#scanStatus");s.textContent=t;s.classList.toggle("err",!!err)}
async function identify_claude(){
  if(!S.sample||!S.photo)return;
  const btn=$("#identify");btn.disabled=true;setStatus("Reading the cards. This can take up to a minute.");
  const where=S.mode==="binder"?"one 3x3 binder page (9 pockets)":"cards from a deck laid out on a surface";
  const prompt=`This photo shows Pokémon Trading Card Game cards: ${where}.
Identify every card you can see. Read the card name, the set/expansion (use the set symbol and any printed set code), the collector number printed at the bottom (e.g. "025/165" or "SV049"), the rarity, and the variant.
The photo may be taken sideways or upside down. First work out how the page is turned, using the direction the card text reads.
Reply with only a JSON object: {"rotation": degrees to rotate the photo CLOCKWISE so the card text reads upright (0, 90, 180 or 270), "cards": [...]}.
Number pockets as they would be on the UPRIGHT page, not as they appear in the photo. Each entry in "cards":
{"slot": ${S.mode==="binder"?"pocket position 1-9 in reading order (left to right, top to bottom)":"null"}, "name": string, "set": string or null, "setCode": official expansion abbreviation such as "PAL", "SVI", "OBF" or "BRS" (printed next to the number on newer cards; otherwise from the set symbol), or null, "regMark": the single regulation mark letter printed at the bottom left (such as "G" or "H"), or null if the card has none, "number": string or null, "rarity": string or null, "variant": one of ${JSON.stringify(VARIANTS)}, "qty": ${S.mode==="binder"?"1":"number of identical copies visible"}, "confidence": "high" or "low", "note": short string saying what was unclear, or null, "box": [left, top, right, bottom] the outer edges of this card (not the sleeve or pocket) as fractions from 0 to 1 of the UPRIGHT photo's width and height, or null}
Use null instead of guessing a set or number you cannot read, and mark those "low". Skip empty pockets and card backs. Energy cards and trainers count as cards.`;
  try{
    const res=await S.sample.json(prompt,{images:[S.photo.blob],cache:false});
    const arr=Array.isArray(res)?res:(res&&Array.isArray(res.cards)?res.cards:[]);
    S.review=arr.filter(r=>r&&r.name).map(r=>({slot:r.slot?+r.slot:null,name:String(r.name),set:r.set||"",setCode:String(r.setCode||"").toUpperCase().slice(0,8),regMark:String(r.regMark||"").toUpperCase().slice(0,2),number:r.number||"",rarity:r.rarity||"",variant:VARIANTS.includes(r.variant)?r.variant:"Normal",qty:+r.qty||1,confidence:r.confidence,note:r.note||"",box:okBox(r.box)}));
    const rot=[90,180,270].includes(+(res&&res.rotation))?+res.rotation:0;
    if(rot)setPhoto(await rotateBlob(S.photo.blob,rot));
    if(S.mode==="binder"&&S.review.length)clearCrops();
    if(S.review.length){setStatus("Cutting out each card’s picture…");await cropReview()}
    setStatus(S.review.length?`Found ${S.review.length} ${S.review.length===1?"card":"cards"}. Check them below.`:"No cards found in that photo. Try a sharper photo with less glare.",!S.review.length);
    renderReview();
    if(S.review.length)$("#review").scrollIntoView({behavior:"smooth",block:"start"});
  }catch(e){
    const m={not_granted:"Scanning needs your permission to use Claude. Reload the page to be asked again.",rate_limited:"Too many scans at once. Wait a moment, then try again.",invalid_json:"The reply couldn’t be read. Try the scan again.",image_rejected:"That image type isn’t supported. Try a JPEG or PNG.",cancelled:"Scan stopped."};
    setStatus(m[e&&e.code]||"The scan didn’t finish. Try again with a clearer photo.",true);
  }finally{btn.disabled=!S.photo}
}
async function commit(){
  syncReviewInputs();
  const base=S.mode==="binder"?{locType:"binder",binder:+$("#binderNo").value||1,page:+$("#pageNo").value||1}:{locType:"deck",deck:$("#deckName").value.trim()||"Unnamed deck"};
  const btn=$("#commit");btn.disabled=true;
  const where=base.locType==="binder"?`${binderName(base.binder)}, page ${base.page}`:base.deck;
  txBegin(`Added ${plural(S.review.length,"card")} to ${where}`);
  try{
    for(const r of S.review){
      if(!r.name.trim())continue;
      const card={...base,name:r.name.trim(),set:r.set,setCode:String(r.setCode||"").trim().toUpperCase(),regMark:String(r.regMark||"").trim().toUpperCase(),number:r.number,rarity:r.rarity,variant:r.variant,qty:+r.qty||1,condition:"",notes:"",slot:base.locType==="binder"?(r.slot||null):null,added:new Date().toISOString()};
      const crop=r.crop;
      setStatus(`Saving ${card.name}…`);try{await PKL.rowEnrich(card,r)}catch{}
      const twin=S.cards.find(c=>locKey(c)===locKey(card)&&((card.locType==="binder"&&card.slot)||cardKey(c)===cardKey(card)));
      const same=twin&&cardKey(twin)===cardKey(card);
      if(twin&&card.locType==="deck"){const{id,...rest}=twin;await S.store.set(id,{...rest,qty:(+twin.qty||1)+card.qty})}
      else if(twin){const{id}=twin;if(!card.img&&twin.img&&same)card.img=twin.img;else if(twin.img&&S.assets)S.assets.delete(twin.img).catch(()=>{});await S.store.set(id,{...card,condition:same?twin.condition||"":"",notes:same?twin.notes||"":"",details:same?twin.details||null:null,official:card.official||(same?twin.official||null:null)})}
      else await S.store.add(card);
    }
    const n=S.review.length;txEnd();
    S.review=[];clearPhoto();renderReview();
    if(S.mode==="binder"){$("#pageNo").value=(+$("#pageNo").value||1)+1;setStatus(`Added ${n}. Ready for page ${$("#pageNo").value}.`)}
    else setStatus(`Added ${n} to ${base.deck}.`);
    render();nextInQueue();
  }catch(e){txEnd();setStatus(e&&e.code==="quota_exceeded"?"Your catalog is full. Delete some entries to add more.":"Some cards didn’t save. Check the list and try again.",true)}
  finally{btn.disabled=false}
}
function syncReviewInputs(){
  document.querySelectorAll("#reviewList [data-k]").forEach(el=>{const i=+el.closest(".review-item").dataset.i;const k=el.dataset.k;S.review[i][k]=k==="qty"?(+el.value||1):k==="slot"?(+el.value||null):el.value});
}
function clearPhoto(){clearCrops();if(S.photo)URL.revokeObjectURL(S.photo.url);S.photo=null;$("#photo").value="";$("#fileLabel").textContent=S.queue&&S.queue.length?`Next: photo ${S.qIdx+1} of ${S.qTotal}`:"Choose photo";$("#identify").disabled=true;$("#rotate").classList.add("hidden")}

// ---------- editor ----------
const F=$("#editForm");
F.variant.innerHTML=VARIANTS.map(v=>`<option>${v}</option>`).join("");
F.regMark.innerHTML=`<option value="">No mark</option>`+"DEFGHIJKL".split("").map(l=>`<option>${l}</option>`).join("");
const RARITIES=["Common","Uncommon","Rare","Rare Holo","Double Rare","Ultra Rare","Illustration Rare","Special Illustration Rare","Hyper Rare","ACE SPEC Rare","Shiny Rare","Shiny Ultra Rare","Secret Rare","Promo"];
function setRarity(v){
  v=String(v??"").trim();
  const known=RARITIES.find(r=>r.toLowerCase()===v.toLowerCase());
  const extra=v&&!known?v:"";
  F.rarity.innerHTML=`<option value="">Not set</option>`+RARITIES.map(r=>`<option>${r}</option>`).join("")+(extra?`<option>${esc(extra)}</option>`:"");
  F.rarity.value=known||extra;if(F.rarity._rsync)F.rarity._rsync();
}
setRarity("");
// ---------- dropdown that shows the rarity symbols ----------
const rarLabel=o=>{const v=o.value,t=o.textContent;if(!v||v==="__none__")return `<span class="rsx">${esc(t)}</span>`;const i=rarIdx(t);return `<span class="rw">${i>-1?`<i class="rs" style="background-position:${(i/11*100).toFixed(3)}% 0" aria-hidden="true"></i>`:`<i class="rs rs0" aria-hidden="true"></i>`}<span>${esc(t)}</span></span>`};
function richSelect(sel,labelFn,watch){
  const w=document.createElement("div");w.className="rsel";sel.after(w);sel.classList.add("vh");sel.tabIndex=-1;sel.setAttribute("aria-hidden","true");
  const lbl=sel.closest("label");const name=(lbl&&lbl.firstChild&&lbl.firstChild.textContent||"").trim();
  w.innerHTML=`<button type="button" class="rsbtn" aria-haspopup="listbox" aria-expanded="false"></button><div class="rslist" role="listbox" hidden${name?` aria-label="${esc(name)}"`:""}></div>`;
  const btn=w.firstElementChild,list=w.lastElementChild;
  const sync=()=>{const o=sel.options[sel.selectedIndex]||sel.options[0];btn.innerHTML=(o?labelFn(o):"")+'<i class="rscar" aria-hidden="true"></i>';btn.setAttribute("aria-label",`${name}: ${o?o.textContent:""}`)};
  sel._rsync=sync;
  let act=-1;
  const mark=()=>list.querySelectorAll("[data-i]").forEach(x=>{const on=+x.dataset.i===act;x.classList.toggle("act",on);if(on)x.scrollIntoView({block:"nearest"})});
  const open=()=>{list.innerHTML=[...sel.options].map((o,i)=>`<div role="option" class="rsopt${i===sel.selectedIndex?" on":""}" data-i="${i}" aria-selected="${i===sel.selectedIndex}">${labelFn(o)}</div>`).join("");list.hidden=false;btn.setAttribute("aria-expanded","true");act=sel.selectedIndex;mark();setTimeout(()=>document.addEventListener("pointerdown",outside,true),0)};
  const close=()=>{list.hidden=true;btn.setAttribute("aria-expanded","false");document.removeEventListener("pointerdown",outside,true)};
  const outside=e=>{if(!w.contains(e.target))close()};
  const pick=i=>{if(i<0||i>=sel.options.length)return;sel.selectedIndex=i;sync();sel.dispatchEvent(new Event("change",{bubbles:true}));sel.dispatchEvent(new Event("input",{bubbles:true}))};
  btn.addEventListener("click",()=>{if(list.hidden)open();else close()});
  list.addEventListener("click",e=>{const o=e.target.closest("[data-i]");if(!o)return;pick(+o.dataset.i);close();btn.focus()});
  btn.addEventListener("keydown",e=>{
    const n=sel.options.length;
    if(list.hidden){if(e.key==="ArrowDown"||e.key==="ArrowUp"){e.preventDefault();pick(Math.max(0,Math.min(n-1,sel.selectedIndex+(e.key==="ArrowDown"?1:-1))))}else if(e.key==="Enter"||e.key===" "||(e.altKey&&e.key==="ArrowDown")){e.preventDefault();open()}return}
    if(e.key==="Escape"){e.preventDefault();e.stopPropagation();close()}
    else if(e.key==="ArrowDown"){e.preventDefault();act=Math.min(n-1,act+1);mark()}
    else if(e.key==="ArrowUp"){e.preventDefault();act=Math.max(0,act-1);mark()}
    else if(e.key==="Enter"||e.key===" "){e.preventDefault();pick(act);close()}
    else if(e.key==="Tab")close();
  });
  if(watch){const dsc=Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,"value");Object.defineProperty(sel,"value",{get(){return dsc.get.call(this)},set(v){if(watch==="add"&&v&&![...this.options].some(o=>o.value===v)){const op=new Option(v,v);this.add(op)}dsc.set.call(this,v);sync()},configurable:true})}
  new MutationObserver(sync).observe(sel,{childList:true,subtree:true});
  sel.addEventListener("change",sync);
  sync();
}
richSelect($("#rarF"),rarLabel);
richSelect(F.rarity,rarLabel);
richSelect(F.variant,o=>`<span class="rw"><span class="badge${o.value&&o.value!=="Normal"&&isHolo(o.value)?" holo":""}">${esc(o.textContent||o.value)}</span></span>`,true);
richSelect(F.regMark,o=>o.value?`<span class="rw"><span class="rmk">${esc(o.value)}</span><span>Mark ${esc(o.value)}</span></span>`:`<span class="rsx">No mark</span>`,"add");
const SET_NAMES={MEG:"Mega Evolution",PFL:"Phantasmal Flames",ASC:"Ascended Heroes",POR:"Perfect Order",CRI:"Chaos Rising",PBL:"Pitch Black",MEP:"Mega Evolution Promos",
 SVI:"Scarlet & Violet",PAL:"Paldea Evolved",OBF:"Obsidian Flames",MEW:"151",PAR:"Paradox Rift",PAF:"Paldean Fates",TEF:"Temporal Forces",TWM:"Twilight Masquerade",SFA:"Shrouded Fable",SCR:"Stellar Crown",SSP:"Surging Sparks",PRE:"Prismatic Evolutions",JTG:"Journey Together",DRI:"Destined Rivals",BLK:"Black Bolt",WHT:"White Flare",SVP:"Scarlet & Violet Promos",
 SSH:"Sword & Shield",RCL:"Rebel Clash",DAA:"Darkness Ablaze",CPA:"Champion's Path",VIV:"Vivid Voltage",SHF:"Shining Fates",BST:"Battle Styles",CRE:"Chilling Reign",EVS:"Evolving Skies",CEL:"Celebrations",FST:"Fusion Strike",BRS:"Brilliant Stars",ASR:"Astral Radiance",PGO:"Pokémon GO",LOR:"Lost Origin",SIT:"Silver Tempest",CRZ:"Crown Zenith",SWSHP:"Sword & Shield Promos",
 SUM:"Sun & Moon",GRI:"Guardians Rising",BUS:"Burning Shadows",SLG:"Shining Legends",CIN:"Crimson Invasion",UPR:"Ultra Prism",FLI:"Forbidden Light",CES:"Celestial Storm",DRM:"Dragon Majesty",LOT:"Lost Thunder",TEU:"Team Up",DET:"Detective Pikachu",UNB:"Unbroken Bonds",UNM:"Unified Minds",HIF:"Hidden Fates",CEC:"Cosmic Eclipse",SMP:"Sun & Moon Promos",
 KSS:"Kalos Starter Set",XY:"XY",FLF:"Flashfire",FFI:"Furious Fists",PHF:"Phantom Forces",PRC:"Primal Clash",DCR:"Double Crisis",ROS:"Roaring Skies",AOR:"Ancient Origins",BKT:"BREAKthrough",BKP:"BREAKpoint",GEN:"Generations",FCO:"Fates Collide",STS:"Steam Siege",EVO:"Evolutions",XYP:"XY Promos",
 BLW:"Black & White",EPO:"Emerging Powers",NVI:"Noble Victories",NXD:"Next Destinies",DEX:"Dark Explorers",DRX:"Dragons Exalted",DRV:"Dragon Vault",BCR:"Boundaries Crossed",PLS:"Plasma Storm",PLF:"Plasma Freeze",PLB:"Plasma Blast",LTR:"Legendary Treasures",BWP:"Black & White Promos",
 HS:"HeartGold & SoulSilver",UL:"Unleashed",UD:"Undaunted",TM:"Triumphant",CL:"Call of Legends",HSP:"HeartGold & SoulSilver Promos",
 PL:"Platinum",RR:"Rising Rivals",SV:"Supreme Victors",AR:"Arceus",
 DP:"Diamond & Pearl",MT:"Mysterious Treasures",SW:"Secret Wonders",GE:"Great Encounters",MD:"Majestic Dawn",LA:"Legends Awakened",SF:"Stormfront",DPP:"Diamond & Pearl Promos",
 RS:"Ruby & Sapphire",SS:"Sandstorm",DR:"Dragon",MA:"Team Magma vs Team Aqua",HL:"Hidden Legends",RG:"FireRed & LeafGreen",TRR:"Team Rocket Returns",DX:"Deoxys",EM:"Emerald",UF:"Unseen Forces",DS:"Delta Species",LM:"Legend Maker",HP:"Holon Phantoms",CG:"Crystal Guardians",DF:"Dragon Frontiers",PK:"Power Keepers",NP:"Nintendo Promos",
 EX:"Expedition Base Set",AQ:"Aquapolis",SK:"Skyridge",
 N1:"Neo Genesis",N2:"Neo Discovery",N3:"Neo Revelation",N4:"Neo Destiny",
 G1:"Gym Heroes",G2:"Gym Challenge",
 BS:"Base Set",JU:"Jungle",FO:"Fossil",B2:"Base Set 2",TR:"Team Rocket",LC:"Legendary Collection",WP:"Wizards Black Star Promos"};
const KNOWN_NAMES=new Set(Object.values(SET_NAMES));
const codeForName=n=>{n=String(n||"").trim().toLowerCase();return n?Object.keys(SET_NAMES).find(k=>SET_NAMES[k].toLowerCase()===n)||"":""};
function setSeriesCode(series,code,name){
  code=String(code||"").trim().toUpperCase();series=String(series||"").trim();name=String(name||"").trim();
  if(!code&&name)code=codeForName(name);
  if(code&&SERIES_BY_CODE[code])series=SERIES_BY_CODE[code];
  if(code&&SET_NAMES[code])name=SET_NAMES[code];
  const sers=[...SERIES_ORDER];if(series&&SERIES_ALL.includes(series)&&!sers.includes(series))sers.push(series);if(series&&!sers.includes(series)&&series!=="Other")sers.push(series);
  F.series.innerHTML=`<option value="">Not set</option>`+sers.map(x=>`<option value="${esc(x)}">${esc(x)}${seriesYears(x)?` (${seriesYears(x)})`:""}</option>`).join("")+`<option value="Other">Other</option>`;
  F.series.value=series;
  const groups=(series&&SERIES_SETS[series]?[series]:SERIES_ORDER);
  const extra=code&&!SERIES_BY_CODE[code]?code:"";
  F.setCode.innerHTML=`<option value="">Not set</option>`+(extra?`<option value="${esc(extra)}">${esc(extra)}</option>`:"")+groups.map(g=>`<optgroup label="${esc(g)}">${visSets(g,code).map(c=>`<option value="${c}">${c}${SET_NAMES[c]?" – "+esc(SET_NAMES[c]):""}${SET_YEARS[c]?` (${SET_YEARS[c]})`:""}</option>`).join("")}</optgroup>`).join("");
  F.setCode.value=code&&(!series||!SERIES_SETS[series]||SERIES_SETS[series].includes(code)||extra)?code:"";
  const extraName=name&&!KNOWN_NAMES.has(name)?name:"";
  F.set.innerHTML=`<option value="">Not set</option>`+(extraName?`<option value="${esc(extraName)}">${esc(extraName)}</option>`:"")+groups.map(g=>`<optgroup label="${esc(g)}">${visSets(g,code).filter(c=>SET_NAMES[c]).map(c=>`<option value="${esc(SET_NAMES[c])}">${esc(SET_NAMES[c])} (${c}${SET_YEARS[c]?", "+SET_YEARS[c]:""})</option>`).join("")}</optgroup>`).join("");
  F.set.value=(F.setCode.value&&SET_NAMES[F.setCode.value])||extraName||"";
}
const customName=()=>KNOWN_NAMES.has(F.set.value)?"":F.set.value;
F.setCode.addEventListener("change",()=>setSeriesCode(F.series.value,F.setCode.value,customName()));
F.series.addEventListener("change",()=>setSeriesCode(F.series.value,SERIES_SETS[F.series.value]&&SERIES_SETS[F.series.value].includes(F.setCode.value)?F.setCode.value:"",customName()));
F.set.addEventListener("change",()=>{const v=F.set.value;if(KNOWN_NAMES.has(v))setSeriesCode(F.series.value,"",v);else if(!v)setSeriesCode(F.series.value,SET_NAMES[F.setCode.value]?"":F.setCode.value,"");});
setSeriesCode("","","");
function toggleLoc(){const t=F.locType.value,d=t==="deck"||t==="showcase";const ll=document.getElementById("ldLab");if(ll)ll.textContent=t==="showcase"?"Showcase name":"Deck name";document.querySelectorAll(".lb").forEach(e=>e.classList.toggle("hidden",d));document.querySelectorAll(".ld").forEach(e=>e.classList.toggle("hidden",!d))}
F.locType.onchange=toggleLoc;
const L10N={
  en:{ability:"Ability",evolves:"Evolves from",weak:"Weakness",res:"Resistance",ret:"Retreat",none:"none",illus:"Illus.",have:"In your collection",page:"page",pocket:"pocket",deck:"Deck",cond:"Condition",notes:"Notes",series:"series",unsure:"Some details may be wrong",check:"check"},
  el:{ability:"Ικανότητα",evolves:"Εξελίσσεται από",weak:"Αδυναμία",res:"Αντίσταση",ret:"Υποχώρηση",none:"καμία",illus:"Εικονογράφηση:",have:"Στη συλλογή σου",page:"σελίδα",pocket:"θήκη",deck:"Τράπουλα",cond:"Κατάσταση",notes:"Σημειώσεις",series:"Σειρά",unsure:"Ορισμένα στοιχεία ίσως είναι λάθος",check:"έλεγξε"}
};
const STAGE_EL={"Basic":"Βασικό","Stage 1":"Στάδιο 1","Stage 2":"Στάδιο 2","Trainer":"Εκπαιδευτής","Energy":"Ενέργεια","Item":"Αντικείμενο","Supporter":"Υποστηρικτής","Stadium":"Γήπεδο","Pokémon Tool":"Εργαλείο Pokémon","Special":"Ειδική","Restored":"Αποκατεστημένο"};
async function translateDetails_claude(card){
  const d=card.details;const L=a=>Array.isArray(a)?a:[];
  const src={abilities:L(d.abilities).map(a=>({name:a.name,text:a.text})),attacks:L(d.attacks).map(a=>({name:a.name,text:a.text})),rules:L(d.rules),flavor:d.flavor||null};
  const prompt=`Translate the text of this Pokémon Trading Card Game card from English into natural, clear Greek.
Keep Pokémon names, card names and the word "Pokémon" exactly as they are. Keep every number and damage amount unchanged.
Use these game terms consistently: Energy = Ενέργεια, damage = ζημιά, Active Pokémon = Ενεργό Pokémon, Bench = Πάγκος, Benched Pokémon = Pokémon στον Πάγκο, coin = κέρμα, heads = κορώνα, tails = γράμματα, Special Condition = Ειδική Κατάσταση, Asleep = Κοιμισμένο, Burned = Καμένο, Confused = Μπερδεμένο, Paralyzed = Παραλυμένο, Poisoned = Δηλητηριασμένο, Prize card = κάρτα Έπαθλου, deck = τράπουλα, hand = χέρι, discard pile = στοίβα απόρριψης, turn = γύρος, evolve = εξελίσσω.
Reply with only JSON in exactly the same shape and order, every string translated, null left as null:
${JSON.stringify(src)}`;
  const out=await S.sample.json(prompt,{cache:true});
  if(!out||typeof out!=="object")throw {code:"invalid_json"};
  const s=(x,n=700)=>x==null||x===""?null:String(x).slice(0,n);
  const el={abilities:L(out.abilities).slice(0,8).map(a=>({name:s(a&&a.name,100),text:s(a&&a.text)})),attacks:L(out.attacks).slice(0,8).map(a=>({name:s(a&&a.name,100),text:s(a&&a.text)})),rules:L(out.rules).slice(0,8).map(x=>s(x)).filter(Boolean),flavor:s(out.flavor,500)};
  const fresh=S.cards.find(x=>x.id===card.id)||card;const{id,...rest}=fresh;
  const details={...(fresh.details||d),el};
  await S.store.set(id,{...rest,details});
  return {...card,details};
}
function cardView(c,lang){
  const el=lang==="el";const T=el?L10N.el:L10N.en;
  const d=c.details||null;const L=a=>Array.isArray(a)?a:[];
  const tr=el&&d&&d.el||null;const tA=(arr,i,k,f)=>{const x=tr&&L(tr[arr])[i];return x&&x[k]?x[k]:f};
  const sw=w=>el&&STAGE_EL[w]?STAGE_EL[w]:w;
  const sup=d&&d.supertype||"";
  const main=d&&L(d.types)[0]||(sup==="Trainer"?"Trainer":sup==="Energy"?"Energy":"Colorless");
  const col=(TYPE[main]||TYPE.Colorless)[0];
  const stage=d?[sup&&sup!=="Pokémon"?sw(sup):"",...L(d.subtypes).map(sw)].filter(Boolean).join(" "):"";
  const isMon=d&&(sup==="Pokémon"||d.hp);
  const wr=a=>L(a).length?L(a).map(w=>en(w.type)+" "+esc(w.value||"")).join(" "):T.none;
  let body="";
  L(d&&d.abilities).forEach((a,i)=>{const t=tA("abilities",i,"text",a.text);body+=`<div class="blk"><div class="atk-h"><span class="abl">${T.ability}</span><b>${esc(tA("abilities",i,"name",a.name))}</b></div>${t?`<p>${esc(t)}</p>`:""}</div>`});
  L(d&&d.attacks).forEach((a,i)=>{const t=tA("attacks",i,"text",a.text);body+=`<div class="blk"><div class="atk-h"><span>${L(a.cost).map(en).join("")}</span><b>${esc(tA("attacks",i,"name",a.name))}</b><span class="dmg">${esc(a.damage||"")}</span></div>${t?`<p>${esc(t)}</p>`:""}</div>`});
  for(const r of (tr&&L(tr.rules).length?L(tr.rules):L(d&&d.rules)))body+=`<div class="blk"><p>${esc(r)}</p></div>`;
  if(!d)body=`<p class="nodata">No card details yet.${S.sample?" Tap Fill in card details below.":""}</p>`;
  const retreat=d&&d.retreat?Array.from({length:Math.min(+d.retreat,5)},()=>en("Colorless")).join(""):(d&&d.retreat===0?T.none:"?");
  const flavor=tr&&tr.flavor||d&&d.flavor;
  return `<article class="tcg" style="--t:${col}"${el?' lang="el"':""}><div class="face">
    <header>${stage?`<span class="stage">${esc(stage)}</span>`:""}<h3>${esc(c.name)}</h3>${d&&d.hp?`<span class="hp"><small>HP</small>${esc(d.hp)}</span>`:""}${d?L(d.types).map(en).join(""):""}</header>
    ${dexOf(c)?`<p class="dexno">${el?"Αριθμός Pokédex":"National Pokédex"} <b>No. ${String(dexOf(c)).padStart(4,"0")}</b></p>`:""}
    ${d&&d.evolvesFrom?`<p class="evo">${T.evolves} ${esc(d.evolvesFrom)}</p>`:""}
    <div>${body}</div>
    ${isMon?`<div class="wrr"><div>${T.weak}<span>${wr(d.weaknesses)}</span></div><div>${T.res}<span>${wr(d.resistances)}</span></div><div>${T.ret}<span>${retreat}</span></div></div>`:""}
    ${flavor?`<p class="flavor">${esc(flavor)}</p>`:""}
    <div class="meta"><span>${d&&d.illustrator?T.illus+" "+`<button type="button" class="illus" data-illus="${esc(d.illustrator)}" title="Show all your cards by ${esc(d.illustrator)}">${esc(d.illustrator)}</button>`:""}</span><span>${(()=>{const m=c.regMark||d&&d.regulationMark;return (m?`<span class="rm">${esc(m)}</span>`:"")+(c.setCode?`<span class="code">${esc(c.setCode)}</span>`:"")+pkSym(c)+esc(c.number||"")+(c.rarity?" "+rarHtml(c.rarity):"")})()}</span></div>
    ${c.set||seriesOf(c)!=="Other"?`<div class="meta" style="margin-top:2px"><span>${esc([c.set,(()=>{const sr=seriesOf(c);return sr==="Other"?"":el?`${T.series} ${sr}`:`${sr} ${T.series}`})()].filter(Boolean).join(", "))}</span></div>`:""}
    ${d&&d.confidence==="low"?`<p class="unsure">${T.unsure}${L(d.unsure).length?": "+T.check+" "+esc(L(d.unsure).join(", ")):""}.</p>`:""}
  </div></article>`;
}
const realImg=c=>{if(c.tcgImage)return c.tcgImage+"/high.webp";const id=String(c.apiSetId||c.details&&c.details.apiSetId||"").trim();const n=String(c.number||"").split("/")[0].trim();if(!id||!n)return "";const num=/^\d+$/.test(n)?String(+n):n;return `https://images.pokemontcg.io/${encodeURIComponent(id)}/${encodeURIComponent(num)}_hires.png`};
function renderEdTop(c){
  if(!c){$("#edTop").innerHTML="";return}
  const src=imgSrc(c);
  const same=S.cards.filter(x=>cardKey(x)===cardKey(c));const total=same.reduce((a,x)=>a+(+x.qty||1),0);
  const locs=same.map(x=>x.locType==="showcase"?`Showcase: ${esc(x.deck||"Showcase")}${(+x.qty||1)>1?` (×${+x.qty})`:""}`:x.locType==="deck"?`Deck: ${esc(x.deck||"—")}${(+x.qty||1)>1?` (×${+x.qty})`:""}`:`${esc(binderName(x.binder||"?"))}, page ${x.page||"?"}, pocket ${x.slot||"?"}`).join("<br>");
  const hasDet=!!(c.details);
  $("#edTop").innerHTML=`<div class="edpicw">${src?`<img class="edpic" alt="Photo of ${esc(c.name)}" src="${src}">`:`<div class="edpic nopic">No picture yet${S.assets?"<small>Use Replace picture, or drop a photo here</small>":""}</div>`}</div>
    <div class="ed-actions">${S.assets?`<label class="btn ghost" for="replImg" style="cursor:pointer">Replace picture</label><input type="file" accept="image/*" id="replImg" class="vh">`:""}${S.sample?`<button type="button" class="btn" id="fillBtn">${hasDet?"Refresh card details":"Fill in card details"}</button>`:""}</div>
    <p class="status" id="fillStatus"></p>
    <div class="edprevh"><b>Preview</b>${false&&hasDet?`<button type="button" class="linkbtn" id="edLang">${S.lang==="el"?"Show in English":"Ελληνικά (Greek)"}</button>`:""}</div>
    <div id="edPreview"></div>
    <div class="zloc"><b>In your collection: ×${total}</b>${locs}</div>
    ${PKL.priceHtml(c)}<div class="edlinks"><a href="${lookupUrl(c)}" target="_blank" rel="noopener">Look up on TCGplayer</a>${bulbaUrl(c)?`<a href="${bulbaUrl(c)}" target="_blank" rel="noopener">Card page on Bulbapedia</a>`:""}${realImg(c)?`<a href="${realImg(c)}" target="_blank" rel="noopener">Open the real card image</a>`:""}</div>`;
  edPreview();
}
function edPreview(){
  const box=$("#edPreview");if(!box||!S.editing)return;const c=S.editing;
  const v=k=>F[k]?F[k].value.trim():"";
  const cur={...c,name:v("name")||c.name,set:v("set"),setCode:v("setCode"),number:v("number"),rarity:v("rarity"),regMark:v("regMark"),series:v("series"),dex:+v("dex")>0?+v("dex"):c.dex};
  const old=c.details||null;const d=readDetailFields(old);cur.details=d?{...d,el:old&&old.el}:null;
  const el=S.lang==="el"&&cur.details&&cur.details.el;
  box.innerHTML=cardView(cur,el?"el":"en").replace(" Tap Fill in card details below."," Fill in the details below, or tap Fill in card details.");
}
const fillErr=e=>({not_granted:"Filling in details needs your permission to use Claude. Reload the page to be asked again.",rate_limited:"Too many requests at once. Wait a moment, then try again.",invalid_json:"The reply couldn’t be read. Try again.",cancelled:"Stopped.",not_found:"Couldn’t find this card on TCGdex. Check the set code and number (e.g. MEW and 151/165).",net:"Couldn’t reach TCGdex. Check your internet connection."})[e&&e.code]||"Couldn’t fill in the details. Try again.";
function normDetails(d){
  if(!d||typeof d!=="object"||Array.isArray(d))throw {code:"invalid_json"};
  const s=(x,n=600)=>x==null||x===""?null:String(x).slice(0,n);
  const arr=x=>Array.isArray(x)?x.slice(0,8):[];
  const ty=x=>ETYPES.find(t=>t.toLowerCase()===String(x||"").toLowerCase())||"Colorless";
  return {supertype:s(d.supertype,20)||"",subtypes:arr(d.subtypes).map(x=>s(x,30)).filter(Boolean),hp:d.hp?s(d.hp,6):null,types:arr(d.types).map(ty),evolvesFrom:s(d.evolvesFrom,60),
    abilities:arr(d.abilities).map(a=>({name:s(a&&a.name,80)||"",text:s(a&&a.text)})),
    attacks:arr(d.attacks).map(a=>({name:s(a&&a.name,80)||"",cost:arr(a&&a.cost).map(ty),damage:s(a&&a.damage,10),text:s(a&&a.text)})),
    weaknesses:arr(d.weaknesses).map(w=>({type:ty(w&&w.type),value:s(w&&w.value,8)})),resistances:arr(d.resistances).map(w=>({type:ty(w&&w.type),value:s(w&&w.value,8)})),
    retreat:d.retreat!=null&&Number.isFinite(+d.retreat)?+d.retreat:null,rules:arr(d.rules).map(x=>s(x)).filter(Boolean),flavor:s(d.flavor,400),illustrator:s(d.illustrator,80),nationalDex:Number.isFinite(+d.nationalDex)&&+d.nationalDex>0&&+d.nationalDex<5000?Math.round(+d.nationalDex):null,regulationMark:s(d.regulationMark,4),setCode:s(d.setCode,8),apiSetId:s(d.apiSetId,20),series:s(d.series,40),
    confidence:d.confidence==="low"?"low":"high",unsure:arr(d.unsure).map(x=>s(x,30)).filter(Boolean),filled:new Date().toISOString()};
}
async function fillDetails_claude(c,signal){
  let blob=null;
  if(imgSrc(c)){try{const r=await fetch(imgSrc(c));if(r.ok)blob=await r.blob()}catch{}}
  const who=[`Name: ${c.name}`,c.set&&`Set: ${c.set}`,c.number&&`Collector number: ${c.number}`,c.rarity&&`Rarity: ${c.rarity}`,c.variant&&`Variant: ${c.variant}`].filter(Boolean).join("\n");
  const prompt=`You are cataloguing one Pokémon Trading Card Game card.\n${who}\n${blob?"A photo of the card is attached. It may be small, angled or behind a plastic sleeve. Read what you can from it, and use your knowledge of this exact printing for the rest.":"There is no photo. Use your knowledge of this exact printing."}
Reply with only a JSON object in this shape:
{"supertype":"Pokémon" or "Trainer" or "Energy","subtypes":[such as "Basic","Stage 1","Stage 2","ex","V","VMAX","Item","Supporter","Stadium","Pokémon Tool"],"hp":number or null,"types":[energy types],"evolvesFrom":string or null,"abilities":[{"name":string,"text":string}],"attacks":[{"name":string,"cost":[energy types, one entry per energy symbol],"damage":string or null such as "30+","text":string or null}],"weaknesses":[{"type":energy type,"value":string such as "×2"}],"resistances":[{"type":energy type,"value":string such as "-30"}],"retreat":number or null,"rules":[rule box text, or the text of a Trainer or Energy card],"flavor":string or null,"illustrator":string or null,"nationalDex":the National Pokédex number of this Pokémon species (Pokémon cards only, e.g. 25 for Pikachu), or null,"regulationMark":string or null,"series":the series this expansion belongs to, such as "Scarlet & Violet", "Sword & Shield" or "Mega Evolution", or null,"setCode":official expansion abbreviation such as "PAL" or "SVI", or null,"apiSetId":the set id the pokemontcg.io API uses for this expansion, such as "sv1" (Scarlet & Violet), "sv2" (Paldea Evolved), "swsh9" (Brilliant Stars), "sm1" (Sun & Moon) or "base1" (Base Set), or null if unsure,"confidence":"high" or "low","unsure":[names of fields you are not sure about]}
Energy types are exactly: ${ETYPES.join(", ")}. Older "Pokémon Power" and "Poké-Body" entries go in abilities. Never invent attacks or text: if you cannot read or recall something, leave it null or empty, set confidence to "low" and list it in "unsure".`;
  const opts={cache:false};if(signal)opts.signal=signal;if(blob)opts.images=[blob];
  const details=normDetails(await S.sample.json(prompt,opts));
  const fresh=S.cards.find(x=>x.id===c.id)||c;const{id:cid,...rest}=fresh;
  await S.store.set(cid,{...rest,details,setCode:rest.setCode||(details.setCode||"").toUpperCase(),regMark:rest.regMark||(details.regulationMark||"").toUpperCase(),apiSetId:rest.apiSetId||details.apiSetId||""});
  return details;
}
async function bulkFill(){
  if(bulkCtl){bulkCtl.abort();return}
  const todo=S.cards.filter(c=>!c.details);if(!todo.length)return;
  bulkCtl=new AbortController();const btn=$("#bulk"),st=$("#listStatus");st.classList.remove("err");let done=0,failed=0,stopMsg="";
  for(const c of todo){
    if(bulkCtl.signal.aborted)break;
    btn.textContent=`Stop (${done+failed} of ${todo.length})`;st.textContent=`Filling in ${c.name}…`;
    try{await fillDetails(c,bulkCtl.signal);done++}
    catch(e){const code=e&&e.code;if(code==="cancelled")break;if(code==="not_granted"||code==="rate_limited"){stopMsg=fillErr(e);break}failed++}
  }
  bulkCtl=null;render();
  st.textContent=stopMsg||`Filled in ${done} ${done===1?"card":"cards"}${failed?`. ${failed} couldn’t be filled in, try those one at a time`:""}.`;
  st.classList.toggle("err",!!stopMsg);
}
function edSnap(){return [...F.querySelectorAll("[name]")].map(i=>i.name+"="+i.value).join("\u0001")}
let PKSER=(()=>{try{return JSON.parse(localStorage.getItem("pk-series")||"null")}catch(e){return null}})(),PKSERQ=false;
function pkSerLogo(name){
  if(!name)return "";
  if(!PKSER&&!PKSERQ){PKSERQ=true;fetch("https://api.tcgdex.net/v2/en/series").then(r=>r.json()).then(a=>{const m={};for(const x of a)if(x&&x.name&&x.logo)m[x.name.toLowerCase()]=x.logo+".webp";PKSER=m;try{localStorage.setItem("pk-series",JSON.stringify(m))}catch(e){}pkSerFill()}).catch(()=>{PKSERQ=false})}
  return PKSER&&PKSER[String(name).toLowerCase()]||"";
}
function pkSerFill(){document.querySelectorAll("img.serimg[data-ser]").forEach(i=>{const u=pkSerLogo(i.dataset.ser);if(u){i.src=u;i.hidden=false}})}
function pkSerImg(name){if(!name||name==="—")return "";const u=pkSerLogo(name);return `<img class="serimg" data-ser="${esc(name)}" alt="" ${u?`src="${esc(u)}"`:"hidden"} onerror="this.hidden=true">`}
function openEditor(c,seq,noShow){
  S.editing=c||null;
  if(c){const base=seq&&seq.length&&seq.includes(c.id)?seq:(S.listOrder&&S.listOrder.includes(c.id)&&S.screen==="collection"?S.listOrder:(c.locType==="binder"?binderSeqFor(c):[c.id]));S.edSeq=base}else S.edSeq=null;
  $("#editTitle").textContent=c?"Edit card":"Add card";
  S.pendingTcg=null;$("#edFind").classList.toggle("hidden",!!c);$("#edQ").value="";$("#edQ2").value="";$("#edRes").innerHTML="";$("#edFSt").textContent="";
  $("#delBtn").classList.toggle("hidden",!c);
  const d=c||{locType:S.mode,binder:$("#binderNo").value,page:$("#pageNo").value,deck:$("#deckName").value,qty:1,variant:"Normal"};
  for(const k of["name","dex","set","series","setCode","regMark","apiSetId","number","rarity","variant","qty","condition","locType","binder","page","slot","deck","notes"]){if(k==="rarity")setRarity(d[k]);else if(k==="series"||k==="setCode"||k==="set")continue;else F[k].value=d[k]??""}
  setSeriesCode(d.series||"",d.setCode||"",d.set||"");
  if(!VARIANTS.includes(F.variant.value))F.variant.value="Normal";
  fillDetailFields(c?(c.details||(S.cards.find(x=>x.details&&cardKey(x)===cardKey(c))||{}).details||null):null);
F.dex.value=c&&+c.dex>0?c.dex:"";F.dex.placeholder=c&&dexOf({...c,dex:null})?String(dexOf({...c,dex:null})):"";
  renderEdTop(c);$("#edFields").open=!c||!!imgSrc(c);$("#editTitle").classList.toggle("hidden",!!c);
  toggleLoc();$("#editor").returnValue="";
  {const sq=S.edSeq||[],i=c?sq.indexOf(c.id):-1;$("#edNav").classList.toggle("hidden",!c||sq.length<2);$("#edPrev").disabled=i<=0;$("#edNext").disabled=i<0||i>=sq.length-1;$("#edPos").textContent=i>-1?`${i+1} of ${sq.length}`:""}
  if(!noShow&&!$("#editor").open)$("#editor").showModal();
  S.edSnap=edSnap();
}
function binderSeqFor(c){return S.cards.filter(x=>x.locType==="binder"&&String(x.binder)===String(c.binder)).sort((a,z)=>(+a.page||0)-(+z.page||0)||(+a.slot||0)-(+z.slot||0)).map(x=>x.id)}
function edGo(dir){
  const sq=S.edSeq||[];const c=S.editing;if(!c)return;const nid=sq[sq.indexOf(c.id)+dir];if(!nid)return;
  S.edNav=nid;$("#editor").close(edSnap()!==S.edSnap?"save":"cancel");
}
$("#edPrev").onclick=()=>edGo(-1);$("#edNext").onclick=()=>edGo(1);
$("#editor").addEventListener("keydown",e=>{const typing=e.target.closest&&e.target.closest("input,textarea,select,.rsel");if(!(e.altKey||e.ctrlKey||e.metaKey)&&typing)return;if(!(e.altKey||e.ctrlKey||e.metaKey)&&!["ArrowLeft","ArrowRight"].includes(e.key))return;if(e.key==="ArrowLeft"||e.key==="PageUp"){e.preventDefault();edGo(-1)}else if(e.key==="ArrowRight"||e.key==="PageDown"){e.preventDefault();edGo(1)}});
$("#editor").addEventListener("close",async()=>{
  const nav=S.edNav;S.edNav=null;const seq=S.edSeq;
  try{await edClose()}finally{if(nav){const n=S.cards.find(x=>x.id===nav);if(n){if(n.locType==="binder"&&String(n.binder)===$("#binderNo").value&&+n.page&&+$("#pageNo").value!==+n.page&&!inReview()){$("#pageNo").value=n.page;renderBinder()}openEditor(n,seq)}}}
});
async function edClose(){
  const act=$("#editor").returnValue;const c=S.editing;
  const ptcg=S.pendingTcg;S.pendingTcg=null;
  const pend=S.pendingPic;S.pendingPic=null;if(pend&&pend.url)setTimeout(()=>URL.revokeObjectURL(pend.url),2000);
  if(act==="delete"&&c){if(await askConfirm(`Delete ${c.name}?`,"This removes the card from your catalog. You can undo this afterwards.","Delete card")){txBegin(`Deleted ${c.name}`);try{await S.store.del(c.id)}finally{txEnd()}}return}
  if(act!=="save")return;
  const v=k=>F[k].value.trim();
  const card={name:v("name"),dex:+v("dex")>0?Math.round(+v("dex")):null,set:v("set"),series:v("series"),setCode:v("setCode").toUpperCase(),regMark:v("regMark").toUpperCase(),apiSetId:v("apiSetId").toLowerCase(),number:v("number"),rarity:v("rarity"),variant:v("variant")||"Normal",qty:+v("qty")||1,condition:v("condition"),locType:v("locType"),notes:v("notes"),
    binder:v("locType")==="binder"?(+v("binder")||1):null,page:v("locType")==="binder"?(+v("page")||null):null,slot:v("locType")==="binder"?(+v("slot")||null):(v("locType")==="showcase"&&c&&c.locType==="showcase"&&(c.deck||"Showcase")===(v("deck")||"Showcase")?c.slot:null),deck:v("locType")==="deck"?(v("deck")||"Unnamed deck"):v("locType")==="showcase"?(v("deck")||"Showcase"):null,
    ...(c&&String(c.number||"")===v("number")&&String(c.setCode||"").toUpperCase()===v("setCode").toUpperCase()&&c.name===v("name")?{tcgdexId:c.tcgdexId,tcgImage:c.tcgImage,price:c.price}:{}),added:c?.added||new Date().toISOString(),img:c?.img||null,official:c?.official||null,pic:c?.pic||null,details:readDetailFields(c?.details||(c?(S.cards.find(x=>x.details&&cardKey(x)===cardKey(c))||{}).details:null)||null)};
  if(!card.name)return;
  if(!c){const pm=PKL.P.pending1;try{await PKL.rowEnrich(card,{tcg:ptcg||(pend&&pm&&pm.url===pend.url?pm.tcg:null),crop:pend?{blob:pend.blob}:null})}catch{}if(card.locType==="showcase"&&!card.slot)card.slot=Math.max(0,...scCards(card.deck).map(x=>+x.slot||0))+1}
  const occ=!c&&card.locType==="binder"&&card.slot?S.cards.find(x=>x.locType==="binder"&&+x.binder===+card.binder&&+x.page===+card.page&&+x.slot===+card.slot):null;
  if(occ&&!(await askConfirm(`Pocket ${card.slot} is taken`,`${occ.name} is already in ${binderName(card.binder)}, page ${card.page}, pocket ${card.slot}. Add ${card.name} there as well?`,"Add anyway",false)))return;
  txBegin(c?`Edited ${card.name}`:pend?`Added ${card.name} to ${binderName(card.binder)}, page ${card.page}, pocket ${card.slot} from a photo`:card.locType==="showcase"?`Added ${card.name} to showcase ${card.deck}`:`Added ${card.name} by hand`);
  try{if(c)await S.store.set(c.id,{...card,setCode:card.setCode,dex:card.dex,series:card.series});else await S.store.add(card)}finally{txEnd()}
  if(pend&&card.locType==="binder"){flash([`${card.page}-${card.slot}`]);renderBinder()}
}

// ---------- editable card details ----------
const STAGES={"Pokémon":["Basic","Stage 1","Stage 2","Mega","VMAX","VSTAR","V-UNION","BREAK","Level-Up","Restored"],"Trainer":["Item","Supporter","Stadium","Pokémon Tool"],"Energy":["Basic","Special"]};
const typeOpts=(none)=>`<option value="">${none}</option>`+ETYPES.map(t=>`<option>${t}</option>`).join("");
F.dType1.innerHTML=typeOpts("Not set");F.dType2.innerHTML=typeOpts("None");F.dWeakT.innerHTML=typeOpts("None");F.dResT.innerHTML=typeOpts("None");
function stageOpts(sup,cur){
  const groups=sup&&STAGES[sup]?{[sup]:STAGES[sup]}:STAGES;
  const all=Object.values(STAGES).flat();
  F.dStage.innerHTML=`<option value="">Not set</option>`+(cur&&!all.includes(cur)?`<option>${esc(cur)}</option>`:"")+Object.entries(groups).map(([g,a])=>`<optgroup label="${esc(g)}">${a.map(x=>`<option>${esc(x)}</option>`).join("")}</optgroup>`).join("");
  F.dStage.value=cur||"";
}
F.dSuper.addEventListener("change",()=>stageOpts(F.dSuper.value,(STAGES[F.dSuper.value]||[]).includes(F.dStage.value)?F.dStage.value:""));
