/* ===== v2 decks: showcase screen, analysis, move engine ===== */
const dkExp=c=>c.set||c.setCode||"Unknown";
const DK={sel:"",tab:"recents",q:"",valid:false};
const DK_FMT={standard:"Standard",expanded:"Expanded",casual:"Casual"};
const dkMeta=n=>(S.decksMeta||{})[n]||{};
const dkFmtOf=n=>dkMeta(n).format||"standard";
const dkSub=c=>((c.details&&c.details.subtypes)||[]).map(x=>String(x).toLowerCase());
const dkRecent=()=>{try{return JSON.parse(localStorage.getItem("pk-deck-recent")||"{}")}catch{return {}}};
const dkTouch=n=>{try{const r=dkRecent();r[n]=Date.now();localStorage.setItem("pk-deck-recent",JSON.stringify(r))}catch{}};
const dkToast=m=>showUndo(null,m);
const dkEntries=n=>S.cards.filter(c=>c.locType==="deck"&&deckOf(c)===n);
const dkStrip=({id,...r})=>r;
const dkNoOrigin=o=>{const {origin,...r}=o;return r};
function dkAggN(items){const m=new Map();for(const it of items){if(!it.n)continue;const k=cardKey(it.c);let e=m.get(k);if(!e){e={c:it.c,n:0,es:[]};m.set(k,e)}e.n+=it.n;e.es.push(it);if(!imgSrc(e.c)&&imgSrc(it.c))e.c=it.c}return [...m.values()]}
const dkAgg=cs=>dkAggN(cs.map(c=>({c,n:+c.qty||1})));
function dkKindOrder(list){
  const g={pokemon:[],trainer:[],energy:[],unknown:[]};for(const e of list)g[kindOf(e.c)].push(e);
  const trOrd=c=>{const s=dkSub(c);return s.includes("supporter")?0:s.includes("item")?1:s.some(x=>x.includes("tool"))?2:s.includes("stadium")?3:4};
  g.pokemon.sort((a,b)=>b.n-a.n||(dexOf(a.c)||1e6)-(dexOf(b.c)||1e6));
  g.trainer.sort((a,b)=>trOrd(a.c)-trOrd(b.c)||b.n-a.n||String(a.c.name).localeCompare(b.c.name));
  g.energy.sort((a,b)=>(dkSub(a.c).includes("basic")?0:1)-(dkSub(b.c).includes("basic")?0:1)||b.n-a.n);
  g.unknown.sort((a,b)=>b.n-a.n);return g;
}
/* probability of at least one Basic Pokémon in the opening 7 */
function dkOdds(N,b,h=7){if(N<h||!b)return 0;if(N-b<h)return 1;let p=1;for(let i=0;i<h;i++)p*=(N-b-i)/(N-i);return 1-p}
function dkAnalyse(list,fmt){
  const k={pokemon:0,trainer:0,energy:0,unknown:0};let total=0,basics=0,aces=0,rad=0,val=0,priced=0,hpS=0,hpN=0,energyN=0;
  const byName={},types={},stages={"Basic":0,"Stage 1":0,"Stage 2":0,"Other":0},tr={Supporter:0,Item:0,Stadium:0,Tool:0,Other:0};
  const hp={"≤60":0,"70–100":0,"110–150":0,"160–220":0,"230+":0},ret={},cost={},weak={},missing=[],bad=[];
  const names=new Set(list.map(e=>String(e.c.name).trim().toLowerCase()));
  const F=fmt==="casual"?null:(fmt||"standard");
  for(const {c,n} of list){
    total+=n;const kd=kindOf(c);k[kd]+=n;const s=dkSub(c),d=c.details||{};
    const bEn=isBasicEnergy(c);if(kd==="energy")energyN+=n;
    if(!bEn)byName[String(c.name).trim()]=(byName[String(c.name).trim()]||0)+n;
    if(isAceSpec(c))aces+=n;
    if(isRadiant(c))rad+=n;
    const u=unitVal(c);if(u!=null){val+=u*n;priced+=n}
    if(kd==="pokemon"){
      const t=(d.types||[])[0]||"Colorless";types[t]=(types[t]||0)+n;
      const st=s.includes("basic")?"Basic":s.includes("stage 1")?"Stage 1":s.includes("stage 2")?"Stage 2":"Other";stages[st]+=n;if(st==="Basic")basics+=n;
      const h=parseInt(d.hp,10);if(h){hpS+=h*n;hpN+=n;hp[h<=60?"≤60":h<=100?"70–100":h<=150?"110–150":h<=220?"160–220":"230+"]+=n}
      if(d.retreat!=null){const r=Math.min(+d.retreat||0,4);ret[r]=(ret[r]||0)+n}
      for(const w of d.weaknesses||[])weak[w.type]=(weak[w.type]||0)+n;
      for(const a of d.attacks||[]){const cc=Math.min((a.cost||[]).length,4);cost[cc]=(cost[cc]||0)+n}
      if((st==="Stage 1"||st==="Stage 2")&&d.evolvesFrom&&!names.has(String(d.evolvesFrom).trim().toLowerCase()))missing.push([c.name,d.evolvesFrom]);
    }else if(kd==="trainer"){tr[s.includes("supporter")?"Supporter":s.includes("item")?"Item":s.includes("stadium")?"Stadium":s.some(x=>x.includes("tool"))?"Tool":"Other"]+=n}
    if(F){const f=fmtOf({es:[c],f:c});if(!f.unk&&!f[F==="standard"?"std":"exp"])bad.push(c.name)}
  }
  const over=Object.keys(byName).filter(n=>byName[n]>4);
  const ck=[
    total===60?[1,"Exactly 60 cards"]:[0,total<60?`${total} of 60 cards: add ${60-total}`:`${total} cards: remove ${total-60}`],
    over.length?[0,`More than 4 copies: ${over.map(n=>`${n} (${byName[n]})`).join(", ")}`]:[1,"No card over 4 copies (Basic Energy excepted)"],
    basics?[1,`${basics} Basic Pokémon to start with`]:[k.unknown?2:0,"No Basic Pokémon found"],
    aces>1?[0,`${aces} ACE SPEC cards: only 1 is allowed`]:[1,aces?"1 ACE SPEC card (the limit)":"No ACE SPEC card (1 allowed)"],
    rad>1?[0,`${rad} Radiant Pokémon: only 1 is allowed`]:[1,rad?"1 Radiant Pokémon (the limit)":"No Radiant Pokémon (1 allowed)"],
    F?(bad.length?[0,`Not ${DK_FMT[F]} legal: ${[...new Set(bad)].slice(0,6).join(", ")}${new Set(bad).size>6?"…":""}`]:[1,`Every card is ${DK_FMT[F]} legal`]):null,
    missing.length?[2,`No evolution line for ${missing.slice(0,4).map(([a,b])=>`${a} (needs ${b})`).join(", ")}`]:null,
    k.unknown?[2,`${plural(k.unknown,"card")} without details can’t be checked`]:null
  ].filter(Boolean);
  return {total,k,basics,ck,valid:total>0&&ck.every(x=>x[0]!==0),types,stages,tr,hp,hpAvg:hpN?Math.round(hpS/hpN):0,ret,cost,weak,val,priced,missing,energyN,
    odds:dkOdds(total,basics),over,bad};
}
function dkCover(name,cs){
  const key=dkMeta(name).cover;if(key){const m=cs.find(c=>cardKey(c)===key&&imgSrc(c));if(m)return m}
  return deckStats(name).star||null;
}
function dkBoxHtml(name,cs,A,cls){
  const star=dkCover(name,cs);
  return `<span class="dbox ${cls||""}" style="--c:${deckColor(name)}"><span class="lid"></span><span class="side"></span><span class="face"><span class="dwin">${star?`<img alt="" draggable="false" src="${imgSrc(star)}">`:`<span class="dmono">${esc(name.slice(0,2).toUpperCase())}</span>`}</span><span class="dlabel">${esc(name)}</span><span class="dcnt${A.total===60?" ok":""}">${A.total}/60</span></span></span>`;
}
/* ---------- the Decks screen ---------- */
const DKC=new Map();
function dkInfo(n){const cs=dkEntries(n);const A=dkAnalyse(dkAgg(cs),dkFmtOf(n));const o={n,cs,A};DKC.set(n,o);return o}
function dkVisible(){
  const rec=dkRecent(),q=DK.q.trim().toLowerCase();
  let arr=deckNames().map(dkInfo);
  if(q)arr=arr.filter(x=>x.n.toLowerCase().includes(q));
  if(DK.valid)arr=arr.filter(x=>x.A.valid);
  if(DK.tab==="fav")arr=arr.filter(x=>dkMeta(x.n).fav);
  if(DK.tab==="recents")arr.sort((a,b)=>(rec[b.n]||0)-(rec[a.n]||0)||a.n.localeCompare(b.n));
  else arr.sort((a,b)=>a.n.localeCompare(b.n,undefined,{numeric:true}));
  return arr;
}
function renderDecks(){renderDecks0();if(typeof dpRefresh==="function")dpRefresh()}
function renderDecks0(){
  const g=$("#deckGrid");if(!g)return;
  const names=deckNames();$("#deckList").innerHTML=names.map(d=>`<option value="${esc(d)}">`).join("");
  const arr=dkVisible();
  if(!arr.some(x=>x.n===DK.sel))DK.sel=(arr[0]||{}).n||"";
  $("#dkTabs").querySelectorAll("[data-dktab]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.dktab===DK.tab)));
  const cnt=$("#dkCount");if(cnt)cnt.textContent=`${plural(names.length,"deck")}${arr.length!==names.length?`, ${arr.length} shown`:""}`;
  g.innerHTML=`<button type="button" class="dkt-new" data-dknew><span class="frame" aria-hidden="true"><svg viewBox="0 0 48 48"><g fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M10 14h22v26H10z"/><path d="M15 10h22v26"/><path d="M36 30v12M30 36h12"/></g></svg></span><b>Create a deck</b></button>`+
  arr.map(({n,cs,A})=>{
    const m=dkMeta(n);const sel=n===DK.sel;
    return `<div class="dkt${sel?" sel":""}${A.valid?"":" inv"}" data-dkpick="${esc(n)}" tabindex="0" role="button" aria-pressed="${sel}" aria-label="${esc(n)}, ${A.total} of 60 cards, ${A.valid?"valid":"has problems"}">
      <button type="button" class="dkt-star${m.fav?" on":""}" data-dkfav="${esc(n)}" aria-pressed="${!!m.fav}" aria-label="Favourite ${esc(n)}" title="Favourite">${m.fav?"★":"☆"}</button>
      <span class="dkt-st ${A.valid?"ok":"warn"}" title="${A.valid?"Valid deck":"Has problems"}">${A.valid?"✓":"!"}</span>
      ${dkBoxHtml(n,cs,A)}
      <b class="dkt-n">${esc(n)}</b><small>${A.total}/60 · ${DK_FMT[dkFmtOf(n)]}</small></div>`;
  }).join("");
  if(!arr.length&&names.length)g.insertAdjacentHTML("beforeend",`<p class="sub2 dkt-none">No deck matches these filters.</p>`);
  dkSide();
}
function dkThumbs(list,seq){
  const G=dkKindOrder(list);
  const th=e=>{const c=e.c,src=imgSrc(c);return `<button type="button" class="dkth" data-did="${esc(c.id)}" title="${e.n} × ${esc(c.name)}"><span class="cimg">${src?`<img alt="" loading="lazy" src="${src}">`:`<span class="cph"><b>${esc(c.name)}</b></span>`}</span><span class="dkq">${e.n}</span></button>`};
  const sec=(k,t)=>G[k].length?`<h4>${t} <span>${G[k].reduce((a,e)=>a+e.n,0)}</span></h4><div class="dkth-grid">${G[k].map(th).join("")}</div>`:"";
  return sec("pokemon","Pokémon")+sec("trainer","Trainers")+sec("energy","Energy")+sec("unknown","Without details");
}
function dkIssues(A){return `<ul class="dk-checks">${A.ck.map(([ok,t])=>`<li class="${ok===1?"ok":ok===2?"info":"bad"}">${ok===1?"✓":ok===2?"i":"!"}<span>${esc(t)}</span></li>`).join("")}</ul>`}
function dkSide(){
  const el=$("#dkSide");if(!el)return;const n=DK.sel;
  if(!n){el.innerHTML=`<div class="dks-empty"><b>No deck selected</b><p class="sub2">Create a deck from your collection, or import a decklist for a deck you already own.</p><div class="foot"><button type="button" class="btn" data-dknew>Create a deck</button><button type="button" class="btn ghost" data-dkimport>Import a decklist</button></div></div>`;return}
  const {cs,A}=DKC.get(n)||dkInfo(n);const m=dkMeta(n);const list=dkAgg(cs);
  const seg=(k,col)=>A.k[k]?`<i style="flex:${A.k[k]};background:${col}" title="${A.k[k]}"></i>`:"";
  const homeless=cs.filter(c=>!c.origin).reduce((a,c)=>a+(+c.qty||1),0);
  el.innerHTML=`<div class="dks-head" style="--c:${deckColor(n)}"><button type="button" class="dkt-star lg${m.fav?" on":""}" data-dkfav="${esc(n)}" aria-pressed="${!!m.fav}" aria-label="Favourite">${m.fav?"★":"☆"}</button><b>${esc(n)}</b>
      <button type="button" class="ib" data-dkren title="Rename" aria-label="Rename"><svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9l-4-4L4 16z"/></g></svg></button>
      <details class="dks-menu"><summary class="ib" aria-label="More">⋮</summary><div class="dks-pop">
        <button type="button" data-dkfull>Open full view</button><button type="button" data-dkcopy>Copy decklist</button><button type="button" data-dkdl>Download decklist (.txt)</button><button type="button" data-dkimp>Import cards into this deck</button><button type="button" class="danger" data-dkdel>Delete this deck…</button></div></details></div>
    <div class="dks-top">${dkBoxHtml(n,cs,A,"sm")}<div class="dks-facts">
      <div class="dks-cnt${A.total===60?" ok":" bad"}"><b>${A.total}</b>/60</div>
      <label class="dks-fmt">Format<select data-dkfmt aria-label="Format">${Object.entries(DK_FMT).map(([k,v])=>`<option value="${k}"${dkFmtOf(n)===k?" selected":""}>${v}</option>`).join("")}</select></label>
      <div class="dks-valid ${A.valid?"ok":"bad"}">${A.valid?"✓ Valid":"! "+A.ck.filter(x=>x[0]===0).length+" to fix"}</div></div></div>
    <div class="dks-act"><button type="button" data-dkcust><svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/></g></svg>Customise</button>
      <button type="button" data-dkedit class="pri"><svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9l-4-4L4 16z"/></g></svg>Edit deck</button>
      <button type="button" data-dkdel class="del"><svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6"/></g></svg>Delete</button>
      </div>
    ${A.valid?"":dkIssues(A)}
    <div class="dk-comp" role="img" aria-label="${A.k.pokemon} Pokémon, ${A.k.trainer} Trainer, ${A.k.energy} Energy">${seg("pokemon","#3A8FD9")}${seg("trainer","#9B5FC0")}${seg("energy","#E0A82E")}${seg("unknown","var(--pocket-edge)")}${A.total<60?`<i style="flex:${60-A.total};background:transparent"></i>`:""}</div>
    <div class="dk-legend"><span><i style="background:#3A8FD9"></i>Pokémon ${A.k.pokemon}</span><span><i style="background:#9B5FC0"></i>Trainer ${A.k.trainer}</span><span><i style="background:#E0A82E"></i>Energy ${A.k.energy}</span>${A.k.unknown?`<span><i style="background:var(--pocket-edge)"></i>No details ${A.k.unknown}</span>`:""}</div>
    <div class="dks-mini"><span><b>${A.priced?eur(A.val):"—"}</b>Value</span><span><b>${A.hpAvg||"—"}</b>Avg HP</span><span><b>${A.total>=7&&A.basics?Math.round(A.odds*100)+"%":"—"}</b>Basic in 7</span></div>
    ${homeless?`<p class="dks-note">${plural(homeless,"card")} came from a decklist import and have no binder to go back to.</p>`:""}
    ${A.total?dkThumbs(list):`<p class="sub2">This deck is empty. Use <b>Edit deck</b> to pick cards from your binders, or import a decklist.</p><div class="foot"><button type="button" class="btn ghost" data-dkimp>Import a decklist</button></div>`}
    <p class="status" id="dkStatus"></p>`;
  el._seq=list.map(e=>e.c.id);
}
function dkText(n){
  const G=dkKindOrder(dkAgg(dkEntries(n)));
  const line=e=>{const c=e.c,p=numParts(c.number);return `${e.n} ${c.name}${c.setCode?" "+c.setCode:""}${p?" "+p.n:(c.number?" "+c.number:"")}`};
  const part=(k,t)=>G[k].length?`${t}: ${G[k].reduce((a,x)=>a+x.n,0)}\n${G[k].map(line).join("\n")}\n\n`:"";
  return part("pokemon","Pokémon")+part("trainer","Trainer")+part("energy","Energy")+part("unknown","Other")+`Total Cards: ${dkEntries(n).reduce((a,c)=>a+(+c.qty||1),0)}`;
}
/* ---------- move engine: cards physically move, origin is remembered ---------- */
const dkOriginOf=c=>c.locType==="binder"?{t:"binder",binder:c.binder,page:c.page,slot:c.slot}:{t:"deck",deck:deckOf(c),prev:c.origin||null};
function dkHome(c){
  const o=c.origin;if(!o)return {k:"none",label:"no home: removed from the collection"};
  if(o.t==="deck")return {k:"deck",label:`Deck ${o.deck}`};
  const b=+o.binder,p=+o.page,s=+o.slot;const lab=`${binderName(b)}, page ${p}, slot ${s}`;
  const at=S.cards.find(x=>x.locType==="binder"&&+x.binder===b&&+x.page===p&&+x.slot===s);
  if(!at)return {k:"slot",label:lab};
  if(cardKey(at)===cardKey(c))return {k:"merge",label:lab};
  return {k:"free",label:`${binderName(b)} (slot ${p}-${s} is taken: next free slot)`};
}
function dkPlan(name,want){
  const takes=[],rets=[];
  for(const c of S.cards){
    if(c.locType==="showcase")continue;
    const inD=c.locType==="deck"&&deckOf(c)===name;const cur=inD?(+c.qty||1):0;const tgt=want.has(c.id)?want.get(c.id):cur;
    if(tgt>cur)takes.push({c,n:tgt-cur});else if(tgt<cur)rets.push({c,n:cur-tgt});
  }
  return {takes,rets};
}
function dkSummary(plan){
  const add=(m,k,n)=>m.set(k,(m.get(k)||0)+n);
  const fromB=new Map(),fromD=new Map(),toB=new Map(),toD=new Map();let gone=0,nT=0,nR=0;const goneNames=[];
  for(const {c,n} of plan.takes){nT+=n;if(c.locType==="binder")add(fromB,binderName(c.binder),n);else add(fromD,"Deck "+deckOf(c),n)}
  for(const {c,n} of plan.rets){nR+=n;const h=dkHome(c);if(h.k==="none"){gone+=n;goneNames.push(`${n} × ${c.name}`)}else if(h.k==="deck")add(toD,h.label,n);else add(toB,h.label.split(",")[0].split(" (")[0],n)}
  const fmt=m=>[...m].map(([k,v])=>`${esc(k)} (${v})`).join(", ");
  return {nT,nR,gone,goneNames,fromB,fromD,toB,toD,fmt};
}
function dkSummaryHtml(S2,deckName,extra){
  const rows=[];
  if(S2.fromB.size)rows.push(`<li><b>${[...S2.fromB.values()].reduce((a,b)=>a+b,0)} from your binders</b> leave their slots: ${S2.fmt(S2.fromB)}. Their slots stay empty until you remove them from this deck.</li>`);
  if(S2.fromD.size)rows.push(`<li class="warn"><b>${[...S2.fromD.values()].reduce((a,b)=>a+b,0)} from other decks</b> are taken out of those decks: ${S2.fmt(S2.fromD)}.</li>`);
  if(S2.toB.size)rows.push(`<li><b>${[...S2.toB.values()].reduce((a,b)=>a+b,0)} go back to binders</b>: ${S2.fmt(S2.toB)}.</li>`);
  if(S2.toD.size)rows.push(`<li><b>${[...S2.toD.values()].reduce((a,b)=>a+b,0)} go back to other decks</b>: ${S2.fmt(S2.toD)}.</li>`);
  if(S2.gone)rows.push(`<li class="bad"><b>${S2.gone} will be deleted from your collection</b> because they came from a decklist import and have no binder: ${esc(S2.goneNames.slice(0,6).join(", "))}${S2.goneNames.length>6?"…":""}.</li>`);
  return `<p class="dks-sumh">${extra||""}<b>${esc(deckName)}</b>: ${S2.nT+S2.nR} card${S2.nT+S2.nR===1?"":"s"} will physically move. You can undo this straight afterwards.</p><ul class="dks-sum">${rows.join("")}</ul>`;
}
async function dkApply(name,newName,plan){
  const find=id=>S.cards.find(x=>x.id===id);
  for(const {c,n} of plan.takes){
    const cur=find(c.id);if(!cur)continue;const o=dkOriginOf(cur);const base=dkStrip(cur);
    const moved={...base,locType:"deck",deck:newName,binder:null,page:null,slot:null,origin:o};
    const twin=S.cards.find(x=>x.id!==cur.id&&x.locType==="deck"&&deckOf(x)===newName&&cardKey(x)===cardKey(cur)&&JSON.stringify(x.origin||null)===JSON.stringify(o));
    const q=+cur.qty||1;
    if(n>=q){if(twin){await S.store.set(twin.id,{...dkStrip(twin),qty:(+twin.qty||1)+q});await S.store.del(cur.id)}else await S.store.set(cur.id,moved)}
    else{await S.store.set(cur.id,{...base,qty:q-n});if(twin)await S.store.set(twin.id,{...dkStrip(twin),qty:(+twin.qty||1)+n});else await S.store.add({...moved,qty:n})}
  }
  for(const {c,n} of plan.rets){
    const cur=find(c.id);if(!cur)continue;const h=dkHome(cur);const o=cur.origin;const base=dkNoOrigin(dkStrip(cur));const q=+cur.qty||1;
    const drop=async()=>{if(n>=q)await S.store.del(cur.id);else await S.store.set(cur.id,{...dkStrip(cur),qty:q-n})};
    if(h.k==="none"){await drop();continue}
    if(h.k==="deck"){
      const twin=S.cards.find(x=>x.locType==="deck"&&deckOf(x)===o.deck&&cardKey(x)===cardKey(cur));
      if(twin)await S.store.set(twin.id,{...dkStrip(twin),qty:(+twin.qty||1)+n});
      else await S.store.add({...base,qty:n,locType:"deck",deck:o.deck,binder:null,page:null,slot:null,...(o.prev?{origin:o.prev}:{})});
      await drop();continue;
    }
    const b=+o.binder;let page=+o.page,slot=+o.slot;
    if(h.k==="free"){const f=freeSlots(b,1,1)[0];if(f){page=f[0];slot=f[1]}}
    const twin=S.cards.find(x=>x.locType==="binder"&&+x.binder===b&&+x.page===page&&+x.slot===slot&&cardKey(x)===cardKey(cur));
    if(twin)await S.store.set(twin.id,{...dkStrip(twin),qty:(+twin.qty||1)+n});
    else await S.store.add({...base,qty:n,locType:"binder",binder:b,page,slot,deck:null});
    await drop();
  }
  if(newName!==name){for(const c of dkEntries(name))await S.store.set(c.id,{...dkStrip(c),deck:newName})}
}
async function dkDeleteDeck(n){
  const cs=dkEntries(n);const want=new Map(cs.map(c=>[c.id,0]));const plan=dkPlan(n,want);
  const drop=async()=>{const map={...(S.decksMeta||{})};delete map[n];await saveDecksMeta(map);logAct(`Deleted deck ${n}`)};
  if(!cs.length){if(await askConfirm(`Delete ${n}?`,"This empty deck is removed.","Delete"))await drop();return}
  const cnt=cs.reduce((a,c)=>a+(+c.qty||1),0),fromB=cs.filter(c=>c.origin).reduce((a,c)=>a+(+c.qty||1),0);
  const v=await askBulk(`Delete deck ${n}?`,`<label>What happens to the ${cnt} cards in it?<select name="mode"><option value="back">Keep them: send each back to where it came from</option><option value="all">Delete the deck and all its cards from my catalogue</option></select></label><p class="sub2" style="margin:8px 0 10px">${fromB?`${fromB} of these came out of your binders, so deleting them removes those cards from your collection. `:""}You can undo either choice straight afterwards.</p>`+dkSummaryHtml(dkSummary(plan),n,"If you keep the cards: "),"Delete deck");
  if(!v)return;
  if(v.mode==="all"){txBegin(`Deleted deck ${n} and its ${cnt} cards`);try{for(const c of cs)await S.store.del(c.id)}finally{txEnd()}await drop();render();return}
  txBegin(`Deleted deck ${n} and returned its cards`);try{await dkApply(n,n,plan)}finally{txEnd()}
  await drop();render();
}
async function dkCustomise(n){
  const m=dkMeta(n);const cs=dkEntries(n).filter(c=>kindOf(c)==="pokemon");const seen=new Set();
  const opts=cs.filter(c=>{const k=cardKey(c);if(seen.has(k))return false;seen.add(k);return true});
  const v=await askBulk(`Customise ${n}`,`<label>Box colour<input type="color" name="color" value="${deckColor(n)}" style="height:44px;padding:4px;cursor:pointer"></label>
    <label style="margin-top:10px">Format<select name="format">${Object.entries(DK_FMT).map(([k,t])=>`<option value="${k}"${dkFmtOf(n)===k?" selected":""}>${t}</option>`).join("")}</select></label>
    <label style="margin-top:10px">Cover card<select name="cover"><option value="">Automatic</option>${opts.map(c=>`<option value="${esc(cardKey(c))}"${m.cover===cardKey(c)?" selected":""}>${esc(c.name)} (${esc([c.setCode,c.number].filter(Boolean).join(" "))})</option>`).join("")}</select></label>
    <label style="margin-top:10px">Notes<input name="notes" maxlength="200" value="${esc(m.notes||"")}" placeholder="Archetype, plan, who plays it"></label>`,"Save");
  if(!v)return;const map={...(S.decksMeta||{})};map[n]={...m,color:v.color,format:v.format,cover:v.cover||"",notes:v.notes||""};await saveDecksMeta(map);
}
async function dkToggleFav(n){const map={...(S.decksMeta||{})};map[n]={...dkMeta(n),fav:!dkMeta(n).fav};await saveDecksMeta(map)}

/* ===== v2 decks: builder, test deck, decklist import, wiring ===== */
const DK_ICO={back:'<svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></g></svg>'};
function dkBars(obj,col,order){
  const ents=order?order.filter(k=>obj[k]).map(k=>[k,obj[k]]):Object.entries(obj).filter(([,v])=>v).sort((a,b)=>b[1]-a[1]);
  if(!ents.length)return `<p class="sub2">Nothing to show yet.</p>`;const mx=Math.max(...ents.map(x=>x[1]));
  return ents.map(([k,v])=>`<div class="v2bar"><span>${esc(String(k))}</span><span class="t"><i style="width:${v/mx*100}%;background:${(typeof col==="function"?col(k):col)||"var(--brand)"}"></i></span><span>${v}</span></div>`).join("");
}
function dkStatsHtml(A,src){
  const odd=A.total>=7?Math.round(A.odds*100):null;
  const energyPer=A.total?(A.energyN*7/A.total).toFixed(1):"0";
  return `<div class="dkb-stats">
    <div class="dks-mini"><span><b>${A.priced?eur(A.val):"—"}</b>Value${A.priced<A.total?" (partial)":""}</span><span><b>${A.hpAvg||"—"}</b>Avg HP</span><span><b>${odd==null||!A.basics?"—":odd+"%"}</b>Basic in first 7</span><span><b>${energyPer}</b>Energy in first 7</span></div>
    <h4>Pokémon by type</h4>${dkBars(A.types,t=>V2TC[t])}
    <h4>Evolution stages</h4>${dkBars(A.stages,"#3A8FD9",["Basic","Stage 1","Stage 2","Other"])}
    <h4>Trainer cards</h4>${dkBars(A.tr,"#9B5FC0",["Supporter","Item","Tool","Stadium","Other"])}
    <h4>Pokémon HP</h4>${dkBars(A.hp,"#3D9A6B",["≤60","70–100","110–150","160–220","230+"])}
    <h4>Attack energy cost</h4>${dkBars(Object.fromEntries(Object.entries(A.cost).map(([k,v])=>[k==="4"?"4+":k,v])),"#E0A82E",["0","1","2","3","4+"])}
    <h4>Retreat cost</h4>${dkBars(Object.fromEntries(Object.entries(A.ret).map(([k,v])=>[k==="4"?"4+":k,v])),"#8A94A6",["0","1","2","3","4+"])}
    <h4>Weak to</h4>${dkBars(A.weak,t=>V2TC[t])}
    ${src?`<h4>Where the cards come from</h4>${src}`:""}</div>`;
}
/* ---------- deck builder ---------- */
function openBuilder(orig,opt){
  opt=opt||{};const isNew=!!opt.isNew;if(document.querySelector(".dkb"))return;
  const ov=document.createElement("div");ov.className="dkb";ov.setAttribute("role","dialog");ov.setAttribute("aria-label","Deck builder");
  const B={orig,isNew,want:new Map(),dirty:false,tab:"pokemon",shown:96,view:[],rl:[],meta:{...dkMeta(orig)},
    f:{q:"",kind:"",tk:"",et:"",stage:"",set:"",rar:"",legal:false,avail:"all",sort:"name"}};
  if(!isNew)for(const c of dkEntries(orig))B.want.set(c.id,+c.qty||1);
  if(isNew){B.meta.format=B.meta.format||"standard";B.meta.color=DCOLS[deckNames().length%DCOLS.length]}
  B.meta.format=B.meta.format||"standard";
  const inThis=c=>!isNew&&c.locType==="deck"&&deckOf(c)===orig;
  const pool=()=>{
    const m=new Map();
    for(const c of S.cards){if(c.locType==="showcase")continue;const k=cardKey(c);let g=m.get(k);if(!g){g={k,c,es:[]};m.set(k,g)}g.es.push(c);if(!imgSrc(g.c)&&imgSrc(c))g.c=c}
    for(const g of m.values()){
      let inD=0,bA=0,oA=0;const bl=new Set(),ol=new Map();
      for(const e of g.es){const w=B.want.get(e.id)||0,q=+e.qty||1;inD+=w;
        if(inThis(e))continue;
        if(e.locType==="binder"){if(q-w>0){bA+=q-w;bl.add(binderName(e.binder))}}
        else if(q-w>0){oA+=q-w;ol.set(deckOf(e),(ol.get(deckOf(e))||0)+q-w)}}
      g.inD=inD;g.bA=bA;g.oA=oA;g.bl=[...bl];g.ol=[...ol];
    }
    return m;
  };
  const free=e=>(+e.qty||1)-(B.want.get(e.id)||0);
  const add=g=>{
    const e=g.es.find(x=>inThis(x)&&free(x)>0)||g.es.find(x=>x.locType==="binder"&&free(x)>0)||g.es.find(x=>x.locType==="deck"&&!inThis(x)&&free(x)>0);
    if(!e){dkToast("You have no more copies of that card to add.");return}
    B.want.set(e.id,(B.want.get(e.id)||0)+1);B.dirty=true;
    if(isAceSpec(e)){let n=0;for(const x of S.cards){const w=B.want.get(x.id)||0;if(w&&isAceSpec(x))n+=w}if(n>1)dkToast("A deck can only have 1 ACE SPEC card.")}
    if(isRadiant(e)){let n=0;for(const x of S.cards){const w=B.want.get(x.id)||0;if(w&&isRadiant(x))n+=w}if(n>1)dkToast("A deck can only have 1 Radiant Pokémon.")}
    if(e.locType==="deck"&&!inThis(e))dkToast(`That copy is in the deck “${deckOf(e)}”. It will be taken from there when you save.`);
  };
  const sub=g=>{
    const e=g.es.find(x=>!inThis(x)&&(B.want.get(x.id)||0)>0)||g.es.find(x=>inThis(x)&&(B.want.get(x.id)||0)>0);if(!e)return;
    B.want.set(e.id,B.want.get(e.id)-1);B.dirty=true;
  };
  const view=()=>{
    const f=B.f,q=f.q.trim().toLowerCase();let arr=[...pool().values()];
    arr=arr.filter(g=>{const c=g.c,d=c.details||{},s=dkSub(c),kd=kindOf(c);
      if(q&&!(String(c.name).toLowerCase().includes(q)||String(c.set||"").toLowerCase().includes(q)||String(d.illustrator||"").toLowerCase().includes(q)))return false;
      if(f.kind&&kd!==f.kind)return false;
      if(f.tk&&!(kd==="trainer"&&(f.tk==="tool"?s.some(x=>x.includes("tool")):s.includes(f.tk))))return false;
      if(f.et&&!(d.types||[]).includes(f.et))return false;
      if(f.stage&&!s.includes(f.stage))return false;
      if(f.set&&dkExp(c)!==f.set)return false;
      if(f.rar&&c.rarity!==f.rar)return false;
      if(f.legal&&B.meta.format!=="casual"){const ff=fmtOf({es:g.es,f:c});if(!ff[B.meta.format==="expanded"?"exp":"std"])return false}
      if(f.avail==="binder"&&g.bA<=0)return false;
      if(f.avail==="deck"&&!g.inD)return false;
      return true});
    const stOrd=c=>{const s=dkSub(c);return s.includes("basic")?0:s.includes("stage 1")?1:s.includes("stage 2")?2:3};
    const nm=(a,b)=>String(a.c.name).localeCompare(b.c.name);
    const so={name:nm,dex:(a,b)=>(dexOf(a.c)||1e6)-(dexOf(b.c)||1e6)||stOrd(a.c)-stOrd(b.c)||nm(a,b),hp:(a,b)=>(parseInt(b.c.details&&b.c.details.hp)||0)-(parseInt(a.c.details&&a.c.details.hp)||0)||nm(a,b),
      price:(a,b)=>(unitVal(b.c)||0)-(unitVal(a.c)||0)||nm(a,b),set:(a,b)=>String(a.c.setCode||"").localeCompare(String(b.c.setCode||""))||(parseInt(a.c.number)||0)-(parseInt(b.c.number)||0)};
    arr.sort(so[f.sort]||nm);return arr;
  };
  const items=()=>{const out=[];for(const g of pool().values())if(g.inD>0)out.push({c:g.c,n:g.inD,g});return out};
  const srcOf=g=>{const s=new Set();for(const e of g.es){if(!(B.want.get(e.id)||0))continue;s.add(inThis(e)?(e.origin?(e.origin.t==="binder"?binderName(e.origin.binder):"Deck "+e.origin.deck):"imported"):(e.locType==="binder"?binderName(e.binder):"Deck "+deckOf(e)))}return [...s].join(", ")};
  ov.innerHTML=`<div class="dkb-main">
    <header class="dkb-top"><button type="button" class="dkb-back" data-bclose aria-label="Close the builder">${DK_ICO.back}</button><h2>${isNew?"New deck":"Edit deck"} <small id="bCount"></small></h2>
      <p class="dkb-hint">Click a card to add it. Cards stay where they are until you save.</p></header>
    <div class="dkb-filters" id="bFilters"></div>
    <div class="dkb-grid" id="bGrid" aria-live="polite"></div></div>
  <aside class="dkb-side"><div class="dkb-sh"><label class="vh" for="bName">Deck name</label><input id="bName" maxlength="60" placeholder="Name this deck" value="${esc(isNew?"":orig)}">
    <div class="dkb-sh2"><select id="bFmt" aria-label="Format">${Object.entries(DK_FMT).map(([k,v])=>`<option value="${k}"${B.meta.format===k?" selected":""}>${v}</option>`).join("")}</select><button type="button" data-bcust>Customise</button></div></div>
    <div class="dkb-body" id="bBody"></div><div class="dkb-foot" id="bFoot"></div></aside>`;
  document.body.appendChild(ov);
  const $o=s=>ov.querySelector(s);
  /* filter row (built once; set and rarity options come from the pool) */
  const P0=[...pool().values()];
  const sets=[...new Set(P0.map(g=>dkExp(g.c)).filter(Boolean))].sort((a,b)=>a.localeCompare(b)),rars=[...new Set(P0.map(g=>g.c.rarity).filter(Boolean))].sort();
  const opt2=(arr,all)=>`<option value="">${all}</option>`+arr.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join("");
  $o("#bFilters").innerHTML=`<label class="bf s"><span class="vh">Search</span><input id="fq" type="search" placeholder="Search cards, sets, illustrators"></label>
    <select id="fkind" aria-label="Card kind"><option value="">All cards</option><option value="pokemon">Pokémon</option><option value="trainer">Trainer</option><option value="energy">Energy</option><option value="unknown">No details</option></select>
    <select id="ftk" aria-label="Trainer type" hidden><option value="">All trainer types</option><option value="item">Item</option><option value="supporter">Supporter</option><option value="stadium">Stadium</option><option value="tool">Pokémon Tool</option></select>
    <select id="fet" aria-label="Energy type">${opt2(SPRITE,"Any type")}</select>
    <select id="fstage" aria-label="Stage"><option value="">Any stage</option><option value="basic">Basic</option><option value="stage 1">Stage 1</option><option value="stage 2">Stage 2</option><option value="ex">ex</option><option value="v">V</option></select>
    <select id="fset" aria-label="Set">${opt2(sets,"Any set")}</select>
    <select id="frar" aria-label="Rarity">${opt2(rars,"Any rarity")}</select>
    <select id="favail" aria-label="Availability"><option value="all">All my cards</option><option value="binder">In binders only</option><option value="deck">Already in this deck</option></select>
    <label class="bf chk"><input type="checkbox" id="flegal"> Legal only</label>
    <select id="fsort" aria-label="Sort"><option value="name">Sort: name</option><option value="dex">Sort: evolution chain</option><option value="hp">Sort: HP</option><option value="price">Sort: price</option><option value="set">Sort: set and number</option></select>`;
  const loc=g=>{
    const p=[];if(g.bA>0)p.push(`<span>${esc(g.bl.join(", "))} ×${g.bA}</span>`);
    if(g.oA>0)p.push(`<span class="od">In ${esc(g.ol.map(([d,n])=>`${d} ×${n}`).join(", "))}</span>`);
    if(!p.length)p.push(`<span>${g.inD?"All copies in this deck":"None available"}</span>`);return p.join("");
  };
  const drawLib=()=>{
    B.view=view();const arr=B.view;$o("#bCount").textContent=`${arr.length} card${arr.length===1?"":"s"}`;
    const std=B.meta.format!=="casual";
    $o("#bGrid").innerHTML=arr.slice(0,B.shown).map((g,i)=>{const c=g.c,src=imgSrc(c);const only=g.bA<=0&&g.oA>0&&!g.inD;
      const lg=std?fmtOf({es:g.es,f:c}):null;const illegal=lg&&!lg.unk&&!lg[B.meta.format==="expanded"?"exp":"std"];
      return `<div class="lib${g.inD?" in":""}${only?" other":""}${illegal?" ill":""}"><div class="libw">
        <button type="button" class="libi" data-badd="${i}" aria-label="Add ${esc(c.name)}"><span class="cimg">${src?`<img alt="" loading="lazy" src="${src}">`:`<span class="cph"><b>${esc(c.name)}</b><small>${esc([c.setCode,c.number].filter(Boolean).join(" "))}</small></span>`}</span></button>
        ${g.inD?`<span class="lib-q">${g.inD}</span><button type="button" class="lib-m" data-bsub="${i}" aria-label="Remove one ${esc(c.name)}">−</button>`:""}
        <button type="button" class="lib-i" data-binfo="${i}" aria-label="Details for ${esc(c.name)}">i</button>${illegal?`<span class="lib-x" title="Not ${DK_FMT[B.meta.format]} legal">✗</span>`:""}</div>
        <span class="lib-n">${esc(c.name)}</span><span class="lib-l">${loc(g)}</span></div>`}).join("")+(arr.length>B.shown?`<button type="button" class="btn ghost lib-more" data-bmore>Show more (${arr.length-B.shown})</button>`:"")+(arr.length?"":`<p class="sub2">No cards match. Showcase cards are never offered here.</p>`);
    $o("#ftk").hidden=B.f.kind!=="trainer";
  };
  const drawRight=()=>{
    const its=items();B.rl=its;const A=dkAnalyse(its.map(({c,n})=>({c,n})),B.meta.format);const plan=dkPlan(orig,B.want);const sm=dkSummary(plan);
    const G=dkKindOrder(its.map(x=>x));const tabs=[["pokemon","Pokémon",A.k.pokemon],["trainer","Trainers",A.k.trainer],["energy","Energy",A.k.energy]];if(A.k.unknown)tabs.push(["unknown","Other",A.k.unknown]);tabs.push(["stats","Stats",null]);
    const thumb=e=>{const c=e.c,src=imgSrc(c),ri=B.rl.indexOf(e);return `<div class="bth"><button type="button" class="dkth" data-brinfo="${ri}" title="${esc(c.name)}"><span class="cimg">${src?`<img alt="" loading="lazy" src="${src}">`:`<span class="cph"><b>${esc(c.name)}</b></span>`}</span><span class="dkq">${e.n}</span></button>
      <div class="bth-c"><button type="button" data-brsub="${ri}" aria-label="Remove one ${esc(c.name)}">−</button><button type="button" data-bradd="${ri}" aria-label="Add one ${esc(c.name)}">+</button></div><small>${esc(srcOf(e.g))}</small></div>`};
    let body;
    if(B.tab==="stats"){
      const fromB=sm.nT?`<p class="sub2">${sm.fromB.size?`From binders: ${esc(sm.fmt(sm.fromB))}. `:""}${sm.fromD.size?`From other decks: ${esc(sm.fmt(sm.fromD))}.`:""}</p>`:"";
      body=dkStatsHtml(A,fromB)+dkIssues(A);
    }else{
      const list=G[B.tab]||[];
      body=`<div class="dkth-grid bgrid">${list.length?list.map(thumb).join(""):`<p class="sub2">No ${B.tab==="pokemon"?"Pokémon":B.tab==="trainer"?"Trainer cards":B.tab==="energy"?"Energy":"cards"} yet. Pick some from the library.</p>`}</div>`;
    }
    $o("#bBody").innerHTML=`<div class="dkb-stat"><div class="dks-cnt${A.total===60?" ok":" bad"}"><b>${A.total}</b>/60</div><div class="dks-valid ${A.valid?"ok":"bad"}">${A.valid?"✓ Valid":A.total?"! "+A.ck.filter(x=>x[0]===0).length+" to fix":"Empty"}</div>
      <div class="dk-comp"><i style="flex:${A.k.pokemon||0};background:#3A8FD9"></i><i style="flex:${A.k.trainer||0};background:#9B5FC0"></i><i style="flex:${A.k.energy||0};background:#E0A82E"></i><i style="flex:${A.k.unknown||0};background:var(--pocket-edge)"></i>${A.total<60?`<i style="flex:${60-A.total};background:transparent"></i>`:""}</div></div>
      ${A.valid||B.tab==="stats"?"":dkIssues(A)}
      <div class="dkb-tabs" role="tablist">${tabs.map(([k,t,n])=>`<button type="button" role="tab" data-btab="${k}" aria-selected="${B.tab===k}">${t}${n==null?"":`<b>${n}</b>`}</button>`).join("")}</div>${body}`;
    const mv=sm.nT+sm.nR;
    $o("#bFoot").innerHTML=mv?`<div class="dkb-mv"><b>Saving moves ${mv} card${mv===1?"":"s"}</b><ul>${sm.nT?`<li>${sm.nT} taken from ${[sm.fromB.size?"binders":"",sm.fromD.size?"other decks":""].filter(Boolean).join(" and ")}</li>`:""}${sm.nR?`<li>${sm.nR} sent back${sm.toB.size?" to binders":""}${sm.toD.size?" / other decks":""}</li>`:""}${sm.gone?`<li class="bad">${sm.gone} will be deleted (imported, no binder)</li>`:""}</ul></div>`:`<p class="dkb-mv none">${B.dirty||isNew?"No cards will move yet.":"Nothing moves until you press Save."}</p>`;
    $o("#bFoot").insertAdjacentHTML("beforeend",`<div class="foot"><button type="button" class="btn" data-bsave>${isNew?"Create deck":"Save deck"}</button><button type="button" class="btn ghost" data-bclose>Close</button></div>`);
    ov._A=A;ov._plan=plan;
  };
  const redraw=()=>{$o(".dkb-sh").style.setProperty("--c",/^#[0-9a-f]{6}$/i.test(B.meta.color||"")?B.meta.color:deckColor(orig||"New deck"));drawLib();drawRight()};
  const close=async force=>{
    if(!force&&B.dirty&&!(await askConfirm("Discard your changes?","This deck hasn’t been saved. No cards have moved yet.","Discard")))return;
    document.removeEventListener("keydown",onKey,true);ov.remove();document.body.style.overflow="";
  };
  const onKey=e=>{if(document.querySelector(".zoom")||document.querySelector("dialog[open]")||document.querySelector(".dk"))return;if(e.key==="Escape"){e.stopPropagation();e.preventDefault();close()}};
  document.addEventListener("keydown",onKey,true);ov._close=close;
  const save=async()=>{
    const nm=$o("#bName").value.trim();
    if(!nm){dkToast("Give the deck a name first.");$o("#bName").focus();return}
    if((isNew||nm!==orig)&&deckNames().some(x=>x.toLowerCase()===nm.toLowerCase()&&x!==orig)){dkToast("A deck with that name already exists.");$o("#bName").focus();return}
    const plan=dkPlan(orig,B.want),sm=dkSummary(plan);const A=ov._A;
    if(plan.takes.length||plan.rets.length){
      const warn=A.valid?"":`<p class="dks-warnbar">This deck isn’t valid yet (${A.ck.filter(x=>x[0]===0).length} to fix). You can still save it as a work in progress.</p>`;
      const v=await askBulk(`Save ${nm}?`,dkSummaryHtml(sm,nm)+warn,`Move ${sm.nT+sm.nR} card${sm.nT+sm.nR===1?"":"s"} and save`);if(!v)return;
    }
    const btn=$o("[data-bsave]");if(btn)btn.disabled=true;
    try{
      txBegin(`${isNew?"Built":"Updated"} deck ${nm}`);try{await dkApply(orig,nm,plan)}finally{txEnd()}
      const map={...(S.decksMeta||{})};if(!isNew&&nm!==orig)delete map[orig];map[nm]={...B.meta};
      await saveDecksMeta(map);DK.sel=nm;DK.tab=DK.tab==="fav"&&!B.meta.fav?"recents":DK.tab;dkTouch(nm);
      await close(true);render();dkToast(`Saved ${nm}.`);
    }catch(e){dkToast("Couldn’t save the deck. Nothing was lost, try again.");if(btn)btn.disabled=false}
  };
  ov.addEventListener("click",async e=>{
    const t=e.target;
    if(t.closest("[data-bclose]")){close();return}
    if(t.closest("[data-bsave]")){save();return}
    const a=t.closest("[data-badd]");if(a){add(B.view[+a.dataset.badd]);redraw();return}
    const m=t.closest("[data-bsub]");if(m){sub(B.view[+m.dataset.bsub]);redraw();return}
    const ra=t.closest("[data-bradd]");if(ra){add(B.rl[+ra.dataset.bradd].g);redraw();return}
    const rs=t.closest("[data-brsub]");if(rs){sub(B.rl[+rs.dataset.brsub].g);redraw();return}
    const inf=t.closest("[data-binfo]");if(inf){const g=B.view[+inf.dataset.binfo];zoomCard(g.c,inf,B.view.map(x=>x.c.id));return}
    const ri=t.closest("[data-brinfo]");if(ri){const g=B.rl[+ri.dataset.brinfo].g;zoomCard(g.c,ri,B.rl.map(x=>x.c.id));return}
    if(t.closest("[data-bmore]")){B.shown+=96;drawLib();return}
    const tb=t.closest("[data-btab]");if(tb){B.tab=tb.dataset.btab;drawRight();return}
    if(t.closest("[data-bcust]")){
      const v=await askBulk("Customise this deck",`<label>Box colour<input type="color" name="color" value="${B.meta.color&&/^#[0-9a-f]{6}$/i.test(B.meta.color)?B.meta.color:deckColor($o("#bName").value||orig||"x")}" style="height:44px;padding:4px;cursor:pointer"></label>
        <label style="margin-top:10px">Format<select name="format">${Object.entries(DK_FMT).map(([k,tt])=>`<option value="${k}"${B.meta.format===k?" selected":""}>${tt}</option>`).join("")}</select></label>
        <label style="margin-top:10px">Notes<input name="notes" maxlength="200" value="${esc(B.meta.notes||"")}" placeholder="Archetype, plan, who plays it"></label>`,"Apply");
      if(v){B.meta={...B.meta,color:v.color,format:v.format,notes:v.notes};$o("#bFmt").value=v.format;B.dirty=true;redraw()}
    }
  });
  ov.addEventListener("input",e=>{
    const id=e.target.id;
    if(id==="fq"){B.f.q=e.target.value;B.shown=96;drawLib()}
    else if(id==="bName"){B.dirty=true}
  });
  ov.addEventListener("change",e=>{
    const id=e.target.id,m={fkind:"kind",ftk:"tk",fet:"et",fstage:"stage",fset:"set",frar:"rar",favail:"avail",fsort:"sort"};
    if(m[id]){B.f[m[id]]=e.target.value;if(id==="fkind"&&e.target.value!=="trainer")B.f.tk="";B.shown=96;drawLib();return}
    if(id==="flegal"){B.f.legal=e.target.checked;B.shown=96;drawLib();return}
    if(id==="bFmt"){B.meta.format=e.target.value;B.dirty=true;redraw()}
  });
  redraw();const nm=$o("#bName");if(isNew)nm.focus({preventScroll:true});
}
/* ---------- decklist import (for decks you already own) ---------- */
function dkParse(text){
  const items=new Map(),skipped=[];
  for(const raw of String(text).split(/\r?\n/)){
    const line=raw.trim();if(!line)continue;
    if(!/^\d/.test(line)){if(!/^(pok[eé]mon|trainers?|energy|total cards|deck)\b/i.test(line)&&!/^[#/]/.test(line))skipped.push(line);continue}
    let m=line.match(/^(\d+)\s*x?\s+(.+?)\s+([A-Z][A-Z0-9-]{1,7})\s+([A-Za-z]{0,3}\d{1,3}[a-z]?)$/);let it;
    if(m)it={n:+m[1],name:m[2].trim(),code:m[3],num:m[4]};
    else{m=line.match(/^(\d+)\s*x?\s+(.+)$/);if(!m){skipped.push(line);continue}it={n:+m[1],name:m[2].trim(),code:"",num:""}}
    if(!it.n)continue;const k=`${it.code}|${it.num}|${it.name.toLowerCase()}`;const ex=items.get(k);if(ex)ex.n+=it.n;else items.set(k,it);
  }
  return {items:[...items.values()],skipped};
}
function openDeckImport(target){
  if(document.querySelector(".dki"))return;
  const ov=document.createElement("div");ov.className="dk dki";ov.setAttribute("role","dialog");ov.setAttribute("aria-label","Import a decklist");
  const exists=!!target;
  ov.innerHTML=`<div class="dk-head" style="--c:#2F5D8C"><div class="dk-t"><b>Import a decklist</b><small>For decks you already own whose cards aren’t in your binders</small></div><button type="button" class="ib" data-iclose aria-label="Close">✕</button></div>
  <div class="dk-body dki-body">
    <div class="dki-row"><label>Deck name<input id="iName" maxlength="60" value="${esc(target||"")}" placeholder="e.g. Tinkaton ex Battle Deck"${exists?" readonly":""}></label>
      <label>Format<select id="iFmt">${Object.entries(DK_FMT).map(([k,v])=>`<option value="${k}"${(exists?dkFmtOf(target):"standard")===k?" selected":""}>${v}</option>`).join("")}</select></label></div>
    <label>Decklist<textarea id="iText" rows="14" spellcheck="false" placeholder="Pokémon: 22&#10;4 Drifloon SVI 89&#10;3 Drifblim SVI 90&#10;&#10;Trainer: 20&#10;4 Ultra Ball SVI 196&#10;&#10;Energy: 18&#10;12 Psychic Energy SVE 5"></textarea></label>
    <p class="sub2">Paste the list exactly as Pokémon TCG Live exports it (quantity, name, set code, number). Each card is matched on TCGdex so it gets its picture, details and price. These cards are added to your collection inside this deck and have no binder to go back to. Importing twice adds the cards twice.</p>
    <div class="foot"><button type="button" class="btn" id="iGo">Import cards</button><button type="button" class="btn ghost" data-iclose>Close</button></div>
    <div id="iLog" class="dki-log" aria-live="polite"></div></div>`;
  document.body.appendChild(ov);document.body.style.overflow="hidden";
  const $o=s=>ov.querySelector(s);
  const close=()=>{document.removeEventListener("keydown",onKey,true);ov.remove();if(!document.querySelector(".dkb"))document.body.style.overflow=""};
  const onKey=e=>{if(e.key==="Escape"&&!document.querySelector("dialog[open]")){e.stopPropagation();e.preventDefault();close()}};
  document.addEventListener("keydown",onKey,true);
  ov.addEventListener("click",async e=>{
    if(e.target.closest("[data-iclose]")){close();return}
    if(!e.target.closest("#iGo"))return;
    const name=$o("#iName").value.trim(),log=$o("#iLog"),btn=$o("#iGo");
    if(!name){log.innerHTML=`<p class="bad">Give the deck a name first.</p>`;return}
    if(!exists&&deckNames().some(x=>x.toLowerCase()===name.toLowerCase())){log.innerHTML=`<p class="bad">A deck called “${esc(name)}” already exists. Open it and use “Import cards into this deck”.</p>`;return}
    const {items,skipped}=dkParse($o("#iText").value);
    if(!items.length){log.innerHTML=`<p class="bad">No card lines found. Each line should look like “4 Drifloon SVI 89”.</p>`;return}
    btn.disabled=true;const out=[];let done=0,matched=0;const unmatched=[];
    const one=async it=>{
      const card={name:it.name,set:"",series:"",setCode:it.code,number:it.num,rarity:"",variant:"Normal",qty:it.n,condition:"",notes:"",locType:"deck",deck:name,binder:null,page:null,slot:null,added:new Date().toISOString(),img:null,pic:null,official:null};
      let ok=false;
      if(it.code&&it.num){try{await PKL.enrich(card,{forceArt:true});ok=!!card.tcgdexId}catch{}}
      if(ok){try{const f=await PKL.cardById(card.tcgdexId);card.name=f.name;const r=PKL.setRow(f.set.id);card.number=`${f.localId}/${String(r?r[3]:(f.set.cardCount&&f.set.cardCount.official)||"").padStart(String(f.localId).length,"0")}`}catch{}matched++}
      else unmatched.push(`${it.n} ${it.name}${it.code?" "+it.code+" "+it.num:""}`);
      out.push(card);done++;log.innerHTML=`<p>Matching cards… ${done} of ${items.length}</p>`;
    };
    let i=0;const worker=async()=>{while(i<items.length){const it=items[i++];await one(it)}};
    await Promise.all([worker(),worker(),worker()]);
    log.innerHTML=`<p>Saving…</p>`;
    try{
      txBegin(`Imported deck ${name}`);
      try{for(const card of out){
        const twin=S.cards.find(x=>x.locType==="deck"&&deckOf(x)===name&&!x.origin&&cardKey(x)===cardKey(card));
        if(twin)await S.store.set(twin.id,{...dkStrip(twin),qty:(+twin.qty||1)+card.qty});else await S.store.add(card)}}finally{txEnd()}
      const map={...(S.decksMeta||{})};map[name]={...(map[name]||{}),color:(map[name]&&map[name].color)||DCOLS[deckNames().length%DCOLS.length],format:$o("#iFmt").value};
      await saveDecksMeta(map);DK.sel=name;DK.tab="all";dkTouch(name);render();
      const tot=out.reduce((a,c)=>a+c.qty,0);
      log.innerHTML=`<p class="ok">Imported ${plural(tot,"card")} (${plural(out.length,"different card")}) into “${esc(name)}”. ${matched} matched on TCGdex.</p>${unmatched.length?`<p class="bad">${unmatched.length} couldn’t be matched and were added without details. Use Fill in details in the Tools tab later:</p><ul class="dki-un">${unmatched.map(u=>`<li>${esc(u)}</li>`).join("")}</ul>`:""}${skipped.length?`<p class="sub2">Skipped ${skipped.length} line${skipped.length===1?"":"s"} that weren’t cards.</p>`:""}`;
      $o("#iText").value="";
    }catch(err){log.innerHTML=`<p class="bad">Couldn’t save the import. Try again.</p>`}
    btn.disabled=false;
  });
  $o(exists?"#iText":"#iName").focus({preventScroll:true});
}
/* ---------- wiring for the Decks screen ---------- */
$("#deckPanel").addEventListener("click",async e=>{
  const t=e.target;
  const fav=t.closest("[data-dkfav]");if(fav){e.stopPropagation();await dkToggleFav(fav.dataset.dkfav);return}
  if(t.closest("[data-dknew]")){openBuilder("",{isNew:true});return}
  if(t.closest("[data-dkimport]")){openDeckImport("");return}
  const tab=t.closest("[data-dktab]");if(tab){DK.tab=tab.dataset.dktab;renderDecks();return}
  const pick=t.closest("[data-dkpick]");if(pick){DK.sel=pick.dataset.dkpick;dkTouch(DK.sel);renderDecks();return}
  const n=DK.sel;if(!n)return;
  const det=t.closest("details.dks-menu");
  const close=()=>{if(det)det.removeAttribute("open")};
  if(t.closest("[data-dkedit]")){openBuilder(n);return}
  if(t.closest("[data-dkcust]")){dkCustomise(n);return}
  if(t.closest("[data-dkren]")){editDeck(n,false);return}
  if(t.closest("[data-dkfull]")){close();openDeck(n);return}
  if(t.closest("[data-dkimp]")){close();openDeckImport(n);return}
  if(t.closest("[data-dkdel]")){close();dkDeleteDeck(n);return}
  if(t.closest("[data-dkcopy]")){close();const s=$("#dkStatus");const txt=dkText(n);try{await navigator.clipboard.writeText(txt);s.textContent="Decklist copied. It’s in the format Pokémon TCG Live can import."}catch{s.innerHTML=`<textarea readonly rows="8" style="width:100%">${esc(txt)}</textarea>`;s.querySelector("textarea").select()}return}
  if(t.closest("[data-dkdl]")){close();const b=new Blob([dkText(n)],{type:"text/plain"});const a=document.createElement("a");a.href=URL.createObjectURL(b);a.download=n.replace(/[^\w .-]+/g,"_")+".txt";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),2000);return}
  const th=t.closest("[data-did]");if(th){const c=S.cards.find(x=>x.id===th.dataset.did);if(c)zoomCard(c,th.querySelector("img")||th,$("#dkSide")._seq)}
});
$("#deckPanel").addEventListener("dblclick",e=>{const p=e.target.closest("[data-dkpick]");if(p&&!e.target.closest("[data-dkfav]"))openBuilder(p.dataset.dkpick)});
$("#deckPanel").addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){const p=e.target.closest("[data-dkpick]");if(p&&e.target===p){e.preventDefault();DK.sel=p.dataset.dkpick;dkTouch(DK.sel);renderDecks();const q=$(`[data-dkpick="${CSS.escape(DK.sel)}"]`);if(q)q.focus()}}});
$("#deckPanel").addEventListener("change",async e=>{
  if(e.target.matches("[data-dkfmt]")){const map={...(S.decksMeta||{})};map[DK.sel]={...dkMeta(DK.sel),format:e.target.value};await saveDecksMeta(map)}
  else if(e.target.id==="dkValid"){DK.valid=e.target.checked;renderDecks()}
});
$("#deckPanel").addEventListener("input",e=>{if(e.target.id==="dkSearch"){DK.q=e.target.value;renderDecks()}});

// ---------- app shell: screens and navigation ----------
const SCREENS=["home","scan","binders","decks","showcase","collection","wishlist","stats","tools","card","pokedex"];
const ICO={text:'<path d="M5 6h14M5 10h14M5 14h9M5 18h6"/>',scan:'<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',binders:'<path d="M5 4h13a1 1 0 0 1 1 1v15H6a2 2 0 0 1-2-2V5a1 1 0 0 1 1-1z"/><path d="M8 8h8M8 12h8M8 16h5"/>',decks:'<path d="M5 7h11v13H5z"/><path d="M5 7l3-3h11v13l-3 3"/><path d="M16 7l3-3"/>',collection:'<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>'};
const icoSvg=k=>`<svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICO[k]}</g></svg>`;
function buildShell(){
  const main=$("main");
  const mk=id=>{let d=$("#scr-"+id);if(!d){d=document.createElement("div");d.className="screen";d.id="scr-"+id;main.appendChild(d)}return d};
  const map={scan:["scan","review"],binders:["gallery"],decks:["deckPanel"],showcase:["showcasePanel"],collection:["collPanel"],card:["cardPage"],stats:["ovPanel","dexPanel","setPanel","valuePanel","chartPanel"],tools:["healthPanel","utilPanel","dataWrap","listsWrap"],pokedex:[],wishlist:[]};
  for(const [k,ids] of Object.entries(map)){const s=mk(k);ids.forEach(i=>{const el=$("#"+i);if(el)s.appendChild(el)})}
  const bv=$("#binderView");const ph=document.createElement("div");ph.id="bwScan";bv.before(ph);
  const wrap=document.createElement("div");wrap.id="binderWrap";wrap.append(bv,$("#dragHint"),$("#pageTools"),$("#bselBar"));ph.append(wrap);
  const bp=document.createElement("section");bp.className="panel";bp.id="binderPanel";
  bp.innerHTML=`<div class="bphead"><h2 id="binderTitle">Binder</h2><div class="bpbtns"><button type="button" class="btn ghost" id="editHere">Edit binder</button><button type="button" class="btn" id="scanHere">${icoSvg("scan")}Scan pages into this binder</button></div></div><div id="binderInfo"></div><div id="bwBinders"></div>`;
  $("#scr-binders").appendChild(bp);
  {const bh=document.createElement("div");bh.id="bkHost";$("#scr-binders").prepend(bh)}
  {const dh=document.createElement("div");dh.id="dkHost";$("#scr-decks").prepend(dh)}
  {const sh=document.createElement("div");sh.id="scHost";$("#scr-showcase").prepend(sh)}
  {const wh=document.createElement("div");wh.id="wlHost";$("#scr-wishlist").prepend(wh)}
  {const hh=document.createElement("div");hh.id="hmHost";$("#scr-home").prepend(hh)}
  const sn=document.createElement("div");sn.className="subtabs";sn.setAttribute("role","tablist");sn.setAttribute("aria-label","Statistics");
  sn.innerHTML=[["ovPanel","Overview"],["dexPanel","Pokédex"],["setPanel","Sets"],["valuePanel","Value"],["chartPanel","Analytics"]].map(([id,l])=>`<button type="button" role="tab" data-sub="${id}">${l}</button>`).join("");
  $("#scr-stats").prepend(sn);{const sh=document.createElement("div");sh.className="v2phead";sh.innerHTML='<div><h1>Stats</h1><p class="sub">Your collection in numbers: value, progress, rarity and where it is heading.</p></div>';$("#scr-stats").prepend(sh)}toolsTabs();
  let sub="ovPanel";try{sub=localStorage.getItem("pk-sub2")||sub}catch{}showSub(sub);
  sn.addEventListener("click",e=>{const b=e.target.closest("[data-sub]");if(b)showSub(b.dataset.sub)});
  document.addEventListener("click",e=>{const b=e.target.closest("[data-scr]");if(b){e.preventDefault();show(b.dataset.scr);if(b.dataset.sub)showSub(b.dataset.sub)}});
  $("#editHere").onclick=()=>{const n=+$("#binderNo").value||1;openBinderDlg(n,!S.binders[n]&&!binderNums().includes(n))};
  $("#scanHere").onclick=()=>{if(S.mode!=="binder"&&!S.review.length){S.mode="binder";document.querySelectorAll(".seg [data-mode]").forEach(x=>x.setAttribute("aria-pressed",x.dataset.mode==="binder"));$("#binderFields").classList.remove("hidden");$("#deckFields").classList.add("hidden")}show("scan")};
  window.addEventListener("popstate",()=>cpRoute((location.hash||"").slice(1)||"home"));
  let first=(location.hash||"").slice(1);if(/^card\//.test(first)){S.pendingCard=decodeURIComponent(first.slice(5));first="collection"}if(!SCREENS.includes(first)||first==="card"){try{first=localStorage.getItem("pk-screen")||"home"}catch{first="home"}}
  show(first,{pop:true});
}
function showSub(id){
  if(!["ovPanel","dexPanel","setPanel","valuePanel","chartPanel"].includes(id))id="ovPanel";
  ["ovPanel","dexPanel","setPanel","valuePanel","chartPanel"].forEach(x=>{const el=$("#"+x);if(el)el.hidden=x!==id});
  document.querySelectorAll(".subtabs [data-sub]").forEach(b=>b.setAttribute("aria-selected",b.dataset.sub===id));
  try{localStorage.setItem("pk-sub2",id)}catch{}
}

/* ---------- collapsible right-hand panels (Binders, Decks, Showcase) ---------- */
const PKCOL_CSS=`.szl,.size{display:inline-flex;align-items:center;gap:8px;font-size:.85rem;font-weight:700}.szl input,.size input{width:80px!important}#side.side{max-height:none!important;overflow:visible!important;padding:0!important;gap:12px!important}#side>.card{margin:0!important}#side>.card:not([style*=padding]){padding:14px 16px}h3.pkh:has(.hint){display:block!important}h3.pkh .hint{display:inline!important;text-transform:none;letter-spacing:0;font-weight:500;margin:0 0 0 6px!important}#side .card.sec .tabs{margin:0 0 12px!important}#side .tabs .tab{font-size:13.6px!important;white-space:nowrap;padding:6px 8px!important}.card.pkcc{position:relative}.pkh{padding-right:38px}.pkcol{position:absolute;top:9px;right:9px;width:28px;height:28px;border:0;border-radius:8px;background:var(--accent);color:var(--accent-ink);display:grid;place-items:center;cursor:pointer;padding:0;z-index:2}.pkcol:hover{filter:brightness(.95)}.pkcol:focus-visible{outline:2px solid var(--brand,var(--accent));outline-offset:2px}.pkcol svg{width:16px;height:16px;transition:transform .15s}.card.pkc .pkcol svg{transform:rotate(180deg)}.card.pkc>:not(.pkh):not(.pkcol){display:none!important}.card.pkc>.pkh{margin-bottom:0!important}.card.pkc{padding-bottom:12px!important}`;
function pkColEnhance(side,page){
  const label=h=>{const n=[...h.childNodes].find(x=>x.nodeType===3&&x.textContent.trim());return (n?n.textContent:h.textContent).trim()};
  [...side.children].forEach(card=>{
    if(!card.classList.contains("card")||card.classList.contains("note")||card.querySelector(":scope>.pkcol"))return;
    let h=card.firstElementChild;
    if(!h||!/^(H3|H4)$/.test(h.tagName)&&!h.classList.contains("sech")){const t=document.createElement("h3");t.textContent="Details";t.style.cssText="margin:0 0 6px;padding:0 16px;line-height:20px;font-size:.78rem;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)";card.insertBefore(t,card.firstChild);h=t}
    h.classList.add("pkh");card.classList.add("pkcc");
    const key="pk-col:"+page+":"+label(h);
    const b=document.createElement("button");b.type="button";b.className="pkcol";
    b.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 15l6-6 6 6"/></svg>';
    const set=c=>{card.classList.toggle("pkc",c);b.setAttribute("aria-expanded",String(!c));b.title=c?"Expand":"Collapse";b.setAttribute("aria-label",b.title)};
    let c=false;try{c=localStorage.getItem(key)==="1"}catch(e){}
    set(c);
    b.addEventListener("click",e=>{e.stopPropagation();const n=!card.classList.contains("pkc");set(n);try{localStorage.setItem(key,n?"1":"0")}catch(x){}});
    card.appendChild(b);
  });
}
function pkColInit(){
  [["bkHost","binders"],["dkHost","decks"],["scHost","showcase"]].forEach(([id,page])=>{
    const root=document.getElementById(id)&&document.getElementById(id).shadowRoot;if(!root)return;
    const side=root.querySelector("#side");if(!side)return;
    if(!root._pkt){root._pkt=1;const clr=t=>{t.classList.remove("on");["--rx","--ry","--gx"].forEach(v=>t.style.removeProperty(v))};
      root.addEventListener("pointermove",e=>{if(e.pointerType==="touch")return;const t=e.target.closest&&e.target.closest(".pkp-img");if(!t)return;t.classList.add("on");const r=t.getBoundingClientRect(),x=(e.clientX-r.left)/r.width,y=(e.clientY-r.top)/r.height;t.style.setProperty("--ry",((x-.5)*16)+"deg");t.style.setProperty("--rx",((.5-y)*12)+"deg");t.style.setProperty("--gx",(x*100)+"%")});
      root.addEventListener("pointerout",e=>{const t=e.target.closest&&e.target.closest(".pkp-img");if(t&&!t.contains(e.relatedTarget))clr(t)})}
    if(!root.getElementById("pkcolcss")){const st=document.createElement("style");st.id="pkcolcss";st.textContent=PKP_CSS+PKCOL_CSS;root.appendChild(st);root.appendChild(pkEnCss())}
    if(!side._pkw){side._pkw=true;new MutationObserver(()=>pkColEnhance(side,page)).observe(side,{childList:true})}
    pkColEnhance(side,page);
  });
}

const PKP_CSS=`.pkid{font-family:ui-monospace,Consolas,monospace;font-size:.85em;padding:1px 6px;border-radius:5px;background:rgba(128,128,128,.16);cursor:pointer;white-space:nowrap}.pkid:hover{background:rgba(128,128,128,.3)}.pknav{display:flex;align-items:center;justify-content:center;gap:14px;margin:10px 0 2px;font-size:.88rem;font-weight:700;color:var(--muted)}.pknav button{width:36px;height:36px;border-radius:50%;border:1px solid var(--line,rgba(128,128,128,.4));background:transparent;color:inherit;font:inherit;font-size:1rem;line-height:1;cursor:pointer;padding:0}.pknav button:hover{background:rgba(128,128,128,.22)}.setsym{height:1.3em;width:auto;max-width:2.6em;object-fit:contain;vertical-align:-.22em;margin:0 5px 0 0;border-radius:3px}#side>.sec{margin-top:0}#side .bar .bl{display:flex;align-items:center;white-space:nowrap;min-width:0;text-align:left;font-weight:inherit}#side .bar .bl span{text-align:left;font-weight:inherit}#side .bar .bl>span[aria-hidden=true]:last-child{text-align:left;display:inline-block;min-width:3.1em;flex:none}#side .bar{display:grid;grid-template-columns:142px 1fr 28px;gap:8px;align-items:center;font-size:.85rem;margin:3px 0;padding:3px 6px;border-radius:8px;cursor:pointer;border:0;background:none;width:100%;text-align:left;color:inherit;font-family:inherit}#side .bar:hover{background:var(--pocket)}#side .bar.on{background:color-mix(in srgb,var(--brand) 14%,var(--sheet))}#side .bar>i{display:block;height:8px;border-radius:4px;background:var(--pocket);overflow:hidden}#side .bar>i s{display:block;height:100%;background:var(--brand);border-radius:4px}#side .bar span:last-child{text-align:right;font-weight:700}#side .sec h3{margin:0 0 10px;font-size:.78rem;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);display:flex;justify-content:space-between;align-items:center}#side .tabs{display:flex;background:var(--pocket);border-radius:11px;padding:3px;gap:2px;margin-bottom:12px}#side .tab{flex:1;border:0;background:none;padding:6px 8px;border-radius:8px;font-weight:700;color:var(--muted);cursor:pointer;font-size:.82rem}#side .tab[aria-selected="true"]{background:var(--sheet);color:var(--ink);box-shadow:0 1px 3px rgba(0,0,0,.12)}#side .hint{color:var(--muted);font-size:.82rem}.tile.dim .case,.tile.dim .pr{opacity:.22;filter:grayscale(.7)}.sckv{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}.sckv div{background:var(--pocket);border-radius:10px;padding:8px 10px}.sckv b{display:block;font-size:1.15rem}.sckv small{color:var(--muted)}.mbar{height:5px;border-radius:3px;background:var(--pocket);margin-top:5px;overflow:hidden}.mbar i{display:block;height:100%;background:var(--accent)}.chip[data-case]{position:relative}.chip .st{position:absolute;bottom:8px;right:7px;width:22px;text-align:center;font-size:.8rem;font-weight:900}.chip .st.warn{color:var(--warn,#d9822b)}.scring{display:flex;gap:14px;align-items:center;margin:2px 0 10px}.scringc{--p:0;width:78px;height:78px;border-radius:50%;background:conic-gradient(var(--accent) calc(var(--p)*1%),var(--pocket) 0);display:grid;place-items:center;flex:none}.scringc span{width:58px;height:58px;border-radius:50%;background:var(--sheet);display:grid;place-items:center;font-weight:800}.sctb .size input{accent-color:var(--accent)}.sctb .ib{width:36px;height:36px;border-radius:10px;border:1px solid var(--line);background:var(--sheet);cursor:pointer;display:grid;place-items:center;font-weight:800;flex:none}.sctb .ib:hover{background:var(--pocket)}.sctb .ib svg{width:18px;height:18px}.sctb .menu{position:relative}.sctb .pop{position:absolute;z-index:30;top:calc(100% + 6px);right:0;min-width:200px;background:var(--sheet);border:1px solid var(--line);border-radius:12px;box-shadow:0 12px 32px rgba(0,0,0,.2);padding:6px;display:none}.sctb .pop.open{display:block}.sctb .pop button{display:block;width:100%;text-align:left;border:0;background:none;padding:8px 10px;border-radius:8px;cursor:pointer}.sctb .pop button:hover{background:var(--pocket)}.card.main.scfs{position:fixed;inset:0;z-index:50;border-radius:0;overflow:auto;padding:18px 24px;border:0;background:var(--sheet)}.card.main.scfs .tb{position:sticky;top:-18px;background:var(--sheet);z-index:6;padding-top:12px}button.bar{display:grid!important;grid-template-columns:148px 1fr 28px!important}button.bar>span:first-child{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.bl{display:inline-flex;align-items:center;gap:6px}.bl .en{flex:none;width:1.35em;height:1.35em}.pkp-sub{margin:10px 0 2px;font-size:.72rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}button.bar{border:0;background:none;width:100%;text-align:left;cursor:pointer;padding:3px 6px;border-radius:8px;font:inherit;color:inherit;margin:3px 0}button.bar:hover{background:var(--pocket)}button.bar.on{background:color-mix(in srgb,var(--accent) 22%,var(--sheet))}.pkhl{display:inline-flex;gap:6px;align-items:center;padding:4px 6px 4px 10px;border-radius:99px;background:color-mix(in srgb,var(--accent) 18%,var(--sheet));border:1px solid var(--accent);font-weight:700;font-size:.82rem;margin:8px 0 2px}.pkhl button{border:0;background:none;cursor:pointer;font-weight:900;color:inherit}.pkp-wl{margin-top:14px;font-size:.78rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}.pkelc{display:flex;flex-direction:column;border-top:1px solid var(--line,rgba(128,128,128,.25));padding:6px 0}.pkelc span{color:var(--muted);font-size:.85rem}.pkp-img{perspective:900px}.pkp-card{display:block;position:relative;width:100%;height:100%;border-radius:12px;transform:rotateX(var(--rx,0deg)) rotateY(var(--ry,0deg));transition:transform .12s ease-out,box-shadow .2s;box-shadow:0 8px 24px rgba(0,0,0,.4)}.pkp-img.on .pkp-card{box-shadow:0 16px 36px rgba(0,0,0,.55)}.pkp-card img,.pkp-card .pkp-ph{box-shadow:none!important;transform:none!important}.pkp-gl{position:absolute;inset:0;border-radius:12px;pointer-events:none;opacity:0;transition:opacity .2s;background:linear-gradient(115deg,transparent calc(var(--gx,30%) - 22%),rgba(255,255,255,.4) var(--gx,30%),transparent calc(var(--gx,30%) + 14%))}.pkp-img.on .pkp-gl{opacity:1}.pkp-hl{position:absolute;inset:0;border-radius:12px;pointer-events:none;background:conic-gradient(from calc(var(--gx,30%) * 3) at 50% 50%,#ff6ec7,#ffd36e,#6effb0,#6ec9ff,#c36eff,#ff6ec7);mix-blend-mode:color-dodge;opacity:0;transition:opacity .2s}.pkp-img.on .pkp-hl{opacity:.28}.pkel-l{margin-top:8px;max-height:220px;overflow:auto}.pkel{display:flex;flex-direction:column;align-items:flex-start;width:100%;text-align:left;background:none;border:0;border-top:1px solid var(--line,rgba(128,128,128,.25));padding:6px 0;color:inherit;font:inherit;cursor:pointer}.pkel:hover span{text-decoration:underline}.pkel span{color:var(--muted);font-size:.85rem}.card.pkp>h3{margin:0 0 12px;padding-top:0;font-size:.78rem;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);font-weight:800;line-height:28px;text-align:left}.card.pkp{padding-top:14px}.pkp-img{display:block;width:100%;max-width:320px;margin:2px auto 12px;padding:0;border:0;background:none;cursor:zoom-in;border-radius:12px;aspect-ratio:63/88;position:relative}.pkp-img img{width:100%;height:100%;object-fit:cover;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,.4);display:block;transition:transform .15s}.pkp-img:hover img{transform:scale(1.015)}.pkp-img:focus-visible{outline:2px solid var(--accent);outline-offset:3px}.pkp-ph{width:100%;height:100%;border-radius:12px;display:grid;place-items:center;text-align:center;padding:12px;font-weight:800;font-size:1.3rem;color:#fff;box-shadow:0 8px 24px rgba(0,0,0,.4)}.pkp-n{margin:0;font-size:1.25rem;line-height:1.25;font-weight:800}.pkp-s{color:var(--muted);font-size:.88rem;margin:2px 0 12px}.pkp-f{display:grid;grid-template-columns:1fr 1fr;gap:6px}.pkp-f>div{background:var(--pocket);border-radius:9px;padding:6px 9px;font-size:.85rem;min-width:0}.pkp-f small{display:block;color:var(--muted)}.pkp-f b{display:block;overflow-wrap:anywhere}.pkp-a{display:flex;gap:6px;flex-wrap:wrap;margin-top:12px;justify-content:flex-end}.pkp-a select{flex:1;min-width:0}.pkp-nav{display:flex;gap:6px;align-items:center;justify-content:space-between;margin-top:10px}`;
function pkImg(c,attr){const s=(typeof dpImg==="function"?dpImg(c):"")||cpPic(c)||cpThumb(c);const col=(typeof bkCol==="function"?bkCol(c):"#556");const holo=/holo|reverse|full|secret|rainbow/i.test((c.variant||"")+" "+(c.rarity||""));return `<button type="button" class="pkp-img" ${attr} aria-label="Zoom ${esc(c.name)}"><span class="pkp-card">${s?`<img alt="" draggable="false" src="${esc(s)}">`:`<span class="pkp-ph" style="background:linear-gradient(160deg,${col},color-mix(in srgb,${col} 22%,#000))">${esc(c.name)}</span>`}${holo?`<i class="pkp-hl"></i>`:""}<i class="pkp-gl"></i></span></button>`}
function pkRar(r){if(!r)return "—";const l=String(r).toLowerCase();let sy="",gold=false;
  if(/hyper|secret/.test(l)){sy="★★★";gold=true}else if(/special illustration/.test(l)){sy="★★";gold=true}else if(/illustration/.test(l)){sy="★";gold=true}else if(/ultra|double/.test(l)){sy="★★";gold=true}else if(/holo|rare/.test(l)){sy="★"}else if(/uncommon/.test(l)){sy="◆"}else if(/common/.test(l)){sy="●"}
  return (sy?`<span style="color:${gold?"#F2C230":"var(--muted)"};letter-spacing:1px;margin-right:5px" aria-hidden="true">${sy}</span>`:"")+esc(r)}
function pkEn(c){if(kindOf(c)!=="pokemon")return esc(kindOf(c)==="trainer"?"Trainer":kindOf(c)==="energy"?"Energy":"—");const t=dpType(c);return `<span style="display:inline-flex;align-items:center;gap:6px">${en(t)}${esc(t)}</span>`}
// energy icon rules for shadow pages: linked, because cssRules of a file:// stylesheet cannot be read
function pkEnCss(){const l=document.createElement("link");l.rel="stylesheet";l.href="src/energy.css";return l}
function pkWhere(c,curTxt,qty){const all=S.cards.filter(x=>cardKey(x)===cardKey(c)&&x.id!==c.id);
  const row=x=>`<button type="button" class="pkel" data-gi="${esc(x.id)}" data-gt="${x.locType==="binder"||!x.locType?"binder":x.locType}" data-gb="${x.binder||""}" data-gp="${x.page||1}" data-gd="${esc(x.deck||"")}"><span style="color:inherit;font-size:.9rem;font-weight:600">${(+x.qty||1)>1?"×"+(+x.qty)+" · ":""}${esc(locLabel(x))} →</span></button>`;
  return `<div class="pkp-wl">Where</div><div class="pkel-l" style="margin-top:0"><div class="pkelc"><span style="color:inherit;font-size:.9rem;font-weight:600">${qty>1?"×"+qty+" · ":""}${esc(curTxt)} · this card</span></div>${all.map(row).join("")}${all.length?"":`<div class="hint">This is the only copy in your catalogue.</div>`}</div>`}
function pkGoto(d){if(d.gt==="binder"&&+d.gb){show("binders");openBinder(+d.gb);const p=+d.gp||1;if(p>1)bkGoSpread(Math.floor(p/2));bk.sel=new Set([d.gi]);bkFlash([d.gi],2600);bkRefresh();setTimeout(()=>{try{const el=bkq('.pocket[data-id="'+d.gi+'"]');el&&el.scrollIntoView({block:"center",behavior:"smooth"})}catch(_){}},80)}else if(d.gt==="deck"&&d.gd){show("decks");DK.sel=d.gd;dkTouch(d.gd);renderDecks()}else if(d.gt==="showcase"){show("showcase");scp.card=d.gi;scpRefresh()}}
function pkEmpty(msg){return `<div class="card sec pkp"><h3>Card</h3><div class="pkp-img" style="cursor:default"><span class="pkp-card" style="box-shadow:none"><span class="pkp-ph" style="background:none;border:2px dashed var(--line,rgba(128,128,128,.4));color:var(--muted);font-size:.95rem;font-weight:600;box-shadow:none">${msg}</span></span></div></div>`}
const PK_BTABS=[["type","Type"],["sk","Stage / Kind"],["rar","Rarity"],["hp","HP"]];
function pkBars(A,ents,tab,hl){
  if(tab==="type")return dpBars(A.types,null,"type",hl);
  if(tab==="sk")return `<div class="pkp-sub">Pokémon stage</div>`+dpBars(A.stages,["Basic","Stage 1","Stage 2","Other"],"stage",hl)+`<div class="pkp-sub">Trainer kind</div>`+dpBars(A.tr,["Supporter","Item","Tool","Stadium","Other"],"tr",hl);
  if(tab==="rar"){const m={};for(const e of ents){const r=e.c.rarity||"Not set";m[r]=(m[r]||0)+e.n}const ks=Object.keys(m).sort((a,b)=>rarRank(b)-rarRank(a)||a.localeCompare(b));return dpBars(m,ks,"rar",hl)}
  return dpBars(A.hp,["≤60","70–100","110–150","160–220","230+"],"hp",hl)}
function pkTS(c){const k=kindOf(c);return k==="pokemon"?dpType(c)+" · "+dpStage(c):k==="trainer"?dpTr(c):k==="energy"?"Energy":"No details"}
// ---------- set symbols (TCGdex set.symbol), cached per set ----------
const PKSYM=(()=>{try{return JSON.parse(localStorage.getItem("pk-setsym2")||"{}")}catch(e){return {}}})(),PKSYMQ=new Set();
function pkSetId(c){const a=String((c&&(c.apiSetId||c.details&&c.details.apiSetId))||"").trim();if(a)return a.toLowerCase();const t=String((c&&c.tcgdexId)||"");const i=t.lastIndexOf("-");return i>0?t.slice(0,i).toLowerCase():""}
function pkSymFill(id){const u=PKSYM[id];if(!u)return;const roots=[document];for(const h of ["bkHost","dkHost","scHost"]){const e=document.getElementById(h);if(e&&e.shadowRoot)roots.push(e.shadowRoot)}
  for(const r of roots)r.querySelectorAll('img.setsym[data-ssid="'+id+'"]').forEach(i=>{if(i.getAttribute("src")!==u)i.src=u;i.hidden=false})}
function pkStamp(v){if(!v)return "—";const d=new Date(v);if(isNaN(d))return "—";return d.toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"})+", "+d.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"})}
function pkSym(c){const id=pkSetId(c);if(!id)return "";const u=PKSYM[id];
  if(u===undefined&&!PKSYMQ.has(id)){PKSYMQ.add(id);fetch("https://api.tcgdex.net/v2/en/sets/"+encodeURIComponent(id)).then(r=>{if(r.status===404)return {};if(!r.ok)throw 0;return r.json()}).then(s=>{PKSYM[id]=s&&s.symbol?s.symbol.replace("/univ/","/en/")+".png":"";try{localStorage.setItem("pk-setsym2",JSON.stringify(PKSYM))}catch(e){}pkSymFill(id)}).catch(()=>{PKSYMQ.delete(id)})}
  if(u==="")return "";return `<img class="setsym" data-ssid="${esc(id)}" alt="" title="${esc(c.set||id)}" ${u?`src="${esc(u)}"`:"hidden"} onerror="this.hidden=true">`}
function pkId(c){const id=String(c&&c.id||"");return id.length>8?id.slice(0,8):id}
function pkIdChip(c){const id=String(c&&c.id||"");if(!id)return "—";return `<span class="pkid" title="Card ID ${esc(id)} — click to copy" onclick="pkCopyId(this,'${esc(id)}')">${esc(pkId(c))}</span>`}
function pkCopyId(el,id){const done=()=>{const o=el.textContent;el.textContent="Copied";setTimeout(()=>{el.textContent=o},900)};try{navigator.clipboard.writeText(id).then(done,done)}catch(e){done()}}
function pkPanel(c,o){const u=unitVal(c);let dx="";try{dx=dexOf(c)||""}catch(e){}const sub=[c.set||c.setCode,c.number].filter(Boolean).join(" ")+(dx?" · Pokédex No. "+dx:"");
  return `<div class="card sec pkp"><h3>Card</h3>${pkImg(c,o.zoom)}${o.nav||""}<div class="pkp-n">${esc(c.name)}</div><div class="pkp-s">${pkSym(c)}${esc(sub||"—")}</div><div class="pkp-f">${o.facts.concat([["ID",pkIdChip(c)]]).map(([l,v])=>`<div><small>${esc(l)}</small><b>${v}</b></div>`).join("")}</div>${o.extra||""}<div class="pkp-a">${o.acts}</div></div>`}
function show(name,opts={}){
  {const kb=document.querySelector(".dkb");if(kb&&kb._close){kb._close().then(()=>{if(!document.querySelector(".dkb"))show(name,opts)});return}}
  if(!SCREENS.includes(name))name="home";
  if(name==="card"&&!S.cp)name="collection";
  const leavingCard=S.screen==="card"&&name!=="card"&&S.cp;const cpScroll=leavingCard?S.cp.scroll:null;
  const changed=S.screen!==name;S.screen=name;const navName=name==="card"?((S.cp&&S.cp.from)||"collection"):name==="pokedex"?"stats":name;
  document.querySelectorAll(".screen").forEach(s=>{s.hidden=s.id!=="scr-"+name});
  document.querySelectorAll("#tabs [data-scr]").forEach(b=>{const on=b.dataset.scr===navName;b.classList.toggle("on",on);if(on)b.setAttribute("aria-current","page");else b.removeAttribute("aria-current")});
  const wrap=$("#binderWrap"),tgt=name==="binders"?$("#bwBinders"):$("#bwScan");if(wrap&&tgt&&wrap.parentNode!==tgt)tgt.appendChild(wrap);
  if(name==="binders"&&S.mode!=="binder"&&!S.review.length&&!S.photo){S.mode="binder";document.querySelectorAll(".seg [data-mode]").forEach(x=>x.setAttribute("aria-pressed",x.dataset.mode==="binder"));$("#binderFields").classList.remove("hidden");$("#deckFields").classList.add("hidden")}
  if(!opts.pop&&changed){try{history.pushState(null,"","#"+(opts.hash||name))}catch{try{location.hash=opts.hash||name}catch{}}}
  if(window.sbActive)window.sbActive(navName);
  try{localStorage.setItem("pk-screen",navName)}catch{}
  if(leavingCard){S.cp=null}
  if(changed&&!opts.keepScroll){if(cpScroll!=null&&opts.pop)requestAnimationFrame(()=>window.scrollTo(0,cpScroll));else window.scrollTo(0,0)}
  if(typeof renderBinder==="function")renderBinder();
  if(name==="decks"&&typeof renderDecks==="function")renderDecks();
  if(name==="showcase"&&typeof renderShowcase==="function")renderShowcase();
  if(name==="wishlist"&&typeof wlOnShow==="function")wlOnShow();
  if(name==="home"&&typeof renderHome==="function")renderHome();
  if(name==="tools")toolsRefresh();
  if(name==="pokedex")ldxMount();else ldxLeave();
  try{pkColInit()}catch(e){}
}
var hmReady=false;
function renderHome(){
  v2Home();if(hmReady)hmRefresh();
  const g=$("#homeGrid");if(!g)return;
  const acts=(S.activity||[]).slice(0,5);
  g.innerHTML=`<section class="hc"><div class="hch"><h3>Recent activity</h3><button type="button" class="linkbtn" data-scr="tools" data-tt="data">Full history</button></div>${acts.length?acts.map(a=>`<div class="hact"><time>${new Date(a.t).toLocaleDateString(undefined,{day:"numeric",month:"short"})}</time><span>${esc(a.label)}</span></div>`).join(""):`<p class="sub2">Nothing yet.</p>`}</section>`;
}
/* ===== Tools: tabs, health check, utilities ===== */
const TT={health:["healthPanel"],util:["utilPanel"],data:["dataWrap"],lists:["listsWrap"]};
let ttHF="all";
const TT_LABEL={health:"Health check",util:"Utilities",data:"Data & backup",lists:"Lists & rules"};
let ttCur="health";
function toolsTabs(){
  const scr=$("#scr-tools");if(!scr||scr.querySelector(".ttabs"))return;
  const h=document.createElement("div");h.className="v2phead";h.innerHTML='<div><h1>Tools</h1><p class="sub">Check your collection, change it in bulk, and look after your data.</p></div><span class="tpill" id="ttPill"><i></i><span>Folder saved</span></span>';
  const t=document.createElement("div");t.className="subtabs ttabs";t.setAttribute("role","tablist");t.setAttribute("aria-label","Tools");
  t.innerHTML=Object.entries(TT_LABEL).map(([k,l])=>`<button type="button" role="tab" data-tt="${k}">${l}<span class="ttn" hidden></span></button>`).join("");
  scr.prepend(t);scr.prepend(h);
  try{ttCur=localStorage.getItem("pk-tt")||ttCur}catch{}
  showTT(ttCur);
}
function showTT(k){
  if(!TT[k])k="health";ttCur=k;
  for(const [key,ids] of Object.entries(TT))ids.forEach(id=>{const el=$("#"+id);if(el)el.hidden=key!==k});
  document.querySelectorAll(".ttabs [data-tt]").forEach(b=>b.setAttribute("aria-selected",b.dataset.tt===k));
  try{localStorage.setItem("pk-tt",k)}catch{}
  toolsRefresh();
}
function ttLastBackup(){let lb=null;try{lb=localStorage.getItem("pk-lastbackup")}catch{}return lb?daysAgo(lb):null}
function ttExtras(){
  try{
    const w=healthChecks().filter(g=>g.sev==="warn").length,d=ttLastBackup();
    const set=(k,t,warn)=>{const b=document.querySelector(`.ttabs [data-tt="${k}"] .ttn`);if(!b)return;b.hidden=!t;b.textContent=t||"";b.classList.toggle("w",!!warn)};
    set("health",w?String(w):"",true);set("data",(d==null||d>14)?"!":"",true);
    const bad=d==null||d>14,bn=$("#bkBanner"),bt=$("#bkTxt");
    if(bn&&bt){bn.classList.toggle("bad",bad);bt.innerHTML=`<b>${d==null?"No backup yet":d===0?"Backed up today":d===1?"Last backup was yesterday":d+" days since your last backup"}</b><small>${bad?"A backup protects you from a bad import or an accidental change.":"You’re covered."}</small>`}
    const dot=$("#pkDot"),sub=$("#pkSub"),p=$("#ttPill");
    if(p){p.dataset.s=dot?dot.dataset.s:"ok";const t=sub?sub.textContent:"Saved";p.lastElementChild.textContent=t==="Saved"?"Folder saved":t}
  }catch(e){}
}
window.ttPill=ttExtras;
function toolsRefresh(){
  if(S.screen!=="tools")return;ttExtras();
  if(ttCur==="health")renderHealth();else if(ttCur==="util")renderUtil();
}
document.addEventListener("click",e=>{const b=e.target.closest&&e.target.closest("[data-tt]");if(!b)return;if(S.screen!=="tools")show("tools");showTT(b.dataset.tt)});
/* ---- download + clipboard helpers ---- */
function saveBlob(name,data,type){const b=new Blob([data],{type:type||"application/octet-stream"});const a=document.createElement("a");a.href=URL.createObjectURL(b);a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),3000)}
async function saveFile(name,data,type){
  if(S.downloads&&S.downloads.save){await S.downloads.save({filename:name,data});return}
  saveBlob(name,data,type);
}
async function copyText(t){
  try{await navigator.clipboard.writeText(t);return true}catch{
    const ta=document.createElement("textarea");ta.value=t;ta.style.cssText="position:fixed;opacity:0";document.body.appendChild(ta);ta.select();let ok=false;try{ok=document.execCommand("copy")}catch{}ta.remove();return ok}
}
/* ---- health check ---- */
const daysAgo=iso=>{const d=Date.parse(iso);return Number.isFinite(d)?Math.floor((Date.now()-d)/864e5):null};
function healthChecks(){
  const cs=S.cards,out=[];
  const add=(id,label,help,sev,items,go)=>{if(items.length)out.push({id,label,help,sev,items,go})};
  const cItem=c=>({t:`${c.name||"Unnamed"}${c.number?" "+c.number:""} · ${locLabel(c)}`,id:c.id});
  add("alert","Price alerts reached","The trend has reached the price you set on the card page.","info",cs.filter(alertHit).map(cItem),null);
  add("det","No card details","Type, HP, attacks and regulation mark are missing. Decks and filters can’t use these cards.","warn",cs.filter(c=>!c.details).map(cItem),["health","det"]);
  add("pic","No picture","These cards show a letter instead of artwork.","warn",cs.filter(c=>!imgSrc(c)).map(cItem),["health","nopic"]);
  add("price","No price","They are left out of every value figure.","info",cs.filter(c=>unitVal(c)==null).map(cItem),["health","price"]);
  add("rar","No rarity","Rarity filters and the rarity chart skip them.","warn",cs.filter(c=>!c.rarity).map(cItem),["rar","Not set"]);
  add("set","No set","Set completion can’t count them.","warn",cs.filter(c=>!(c.set||c.setCode)).map(cItem),null);
  add("num","No card number","Set completion and Bulbapedia links need it.","info",cs.filter(c=>!String(c.number||"").trim()).map(cItem),null);
  add("cond","No condition","Not needed, but useful if you ever sell or insure them.","info",cs.filter(c=>!c.condition).map(cItem),null);
  add("qty","Odd quantity","The quantity is zero, negative or not a number.","warn",cs.filter(c=>!(+c.qty>=1)).map(cItem),null);
  const bc=cs.filter(c=>c.locType==="binder");
  add("slot","Binder card without a page or pocket","It sits in a binder but has no place on a page.","warn",bc.filter(c=>!(+c.page>=1)||!(+c.slot>=1)||+c.slot>9).map(cItem),null);
  const pk={};bc.filter(c=>+c.page>=1&&+c.slot>=1).forEach(c=>{const k=`${c.binder}|${c.page}|${c.slot}`;(pk[k]=pk[k]||[]).push(c)});
  add("clash","Two cards in one pocket","Only one of them can be shown on the page.","warn",Object.values(pk).filter(a=>a.length>1).flat().map(cItem),null);
  const place={};cs.forEach(c=>{if(c.locType==="showcase")return;const k=cardKey(c)+"@"+c.locType+"|"+(c.locType==="binder"?c.binder:c.deck);(place[k]=place[k]||[]).push(c)});
  add("twice","Same card entered twice in one place","Merge them into one entry with a higher quantity.","info",Object.values(place).filter(a=>a.length>1).flat().map(cItem),null);
  const dk=[];try{for(const n of deckNames()){const A=dkInfo(n).A;if(!A.valid&&A.total)dk.push({t:`${n}: ${A.ck.filter(x=>x[0]===0).map(x=>x[1]).slice(0,2).join("; ")||"needs attention"}`,deck:n})}}catch{}
  add("decks","Decks that aren’t valid","Open the deck to see what’s wrong.","info",dk,null);
  return out;
}
function renderHealth(){
  const el=$("#healthBody");if(!el)return;
  const iss=healthChecks();const bad=new Set();iss.forEach(i=>{if(i.sev==="warn")i.items.forEach(x=>{if(x.id)bad.add(x.id)})});
  const n=S.cards.length,ok=n-bad.size,pct=n?Math.round(ok/n*100):100;
  const copies=S.cards.reduce((a,c)=>a+(+c.qty||1),0);const v=valueStats();
  let lb=null;try{lb=localStorage.getItem("pk-lastbackup")}catch{}const d=lb?daysAgo(lb):null;
  const lbTxt=d==null?"Never":d===0?"Today":d===1?"Yesterday":`${d} days ago`;const lbBad=d==null||d>30;
  const tile=(l,b,e,cls)=>`<div class="tstat${cls?" "+cls:""}"><small>${l}</small><b>${b}</b>${e?`<em>${e}</em>`:""}</div>`;
  const warn=iss.filter(i=>i.sev==="warn").length;
  const bkEm=lbBad?`<button type="button" class="linkbtn" data-tt-backup>Back up now ›</button>`:`Up to date · <button type="button" class="linkbtn" data-tt-backup>Back up now ›</button>`;
  const shown=iss.filter(i=>ttHF==="all"||i.sev===ttHF);
  el.innerHTML=`<div class="tstats">${tile("Entries",n,`${copies} ${copies===1?"copy":"copies"}`)}${tile("Estimated value",eur(v.total),v.unpriced?`${v.unpriced} unpriced`:"")}${tile("Tidy entries",pct+"%",`${ok} of ${n} have no issues`,pct>=90?"ok":pct>=60?"":"bad")}${tile("Last backup",lbTxt,bkEm,lbBad?"bad":"ok")}</div>
  <section class="hc"><div class="hch"><h3>Issues</h3><small>${warn?`${plural(warn,"thing")} worth fixing`:"Nothing urgent"}</small><span class="grow"></span><div class="tseg">${[["all","All"],["warn","Worth fixing"],["info","For info"]].map(([k,l])=>`<button type="button" data-hf="${k}" aria-pressed="${ttHF===k}">${l}</button>`).join("")}</div></div>
  ${shown.length?`<div class="hlist">${shown.map(i=>`<details class="hrow ${i.sev}"><summary><span class="hic" aria-hidden="true">${i.sev==="warn"?"!":"i"}</span><span class="hmain"><b>${esc(i.label)}</b><small>${esc(i.help)}</small></span><span class="hcount">${i.items.length}</span>${i.go?`<button type="button" class="linkbtn" data-hg="${i.go[0]}" data-hv="${esc(i.go[1])}">Show in Cards</button>`:""}<span class="hchev" aria-hidden="true">›</span></summary>
    <ul class="hitems">${i.items.slice(0,15).map(x=>`<li>${x.id?`<button type="button" class="linkbtn" data-hcard="${esc(x.id)}">${esc(x.t)}</button>`:`<button type="button" class="linkbtn" data-hdeck="${esc(x.deck)}">${esc(x.t)}</button>`}</li>`).join("")}${i.items.length>15?`<li class="sub2">and ${i.items.length-15} more</li>`:""}</ul></details>`).join("")}</div>`:iss.length?`<p class="sub2 hok"><b>All clear</b>Nothing in this category.</p>`:`<p class="sub2 hok"><b>All clear</b>Everything looks tidy. Nothing to fix.</p>`}</section>`;
}
document.addEventListener("click",e=>{const b=e.target.closest&&e.target.closest("#healthBody [data-hf]");if(b){ttHF=b.dataset.hf;renderHealth()}});
document.addEventListener("click",e=>{
  const t=e.target;if(!t.closest)return;
  if(t.closest("[data-tt-backup]")){const b=$("#backupBtn");if(b)b.click();return}
  const c=t.closest("[data-hcard]");if(c){const card=S.cards.find(x=>x.id===c.dataset.hcard);if(card)openCardPage(card,[card.id]);return}
  const dk=t.closest("[data-hdeck]");if(dk){show("decks");DK.sel=dk.dataset.hdeck;renderDecks();return}
});
/* ---- utilities ---- */
const UF={field:"rarity",find:"",repl:""};
const UFIELDS={rarity:"Rarity",condition:"Condition",variant:"Variant",set:"Set name",series:"Series"};
const ufVal=(c,f)=>String(f==="series"?(c.series||""):(c[f]||"")).trim();
function ufOptions(f){return f==="rarity"?RARITIES:f==="condition"?CONDITIONS:f==="variant"?VARIANTS:f==="series"?SERIES_ALL:[...new Set(Object.values(SET_NAMES))].sort()}
function renderUtil(){
  const el=$("#utilBody");if(!el)return;
  const f=UF.field;const counts={};S.cards.forEach(c=>{const v=ufVal(c,f);counts[v]=(counts[v]||0)+1});
  const vals=Object.keys(counts).sort((a,b)=>a.localeCompare(b));
  if(!(UF.find in counts))UF.find=vals[0]??"";
  const hit=S.cards.filter(c=>ufVal(c,f)===UF.find);const copies=hit.reduce((a,c)=>a+(+c.qty||1),0);
  const canApply=hit.length&&UF.repl.trim()!==UF.find&&(UF.repl.trim()!==""||f!=="set");
  /* duplicates */
  const g={};S.cards.forEach(c=>{const k=cardKey(c);const x=g[k]=g[k]||{c,n:0,v:unitVal(c)};x.n+=+c.qty||1});
  const dups=Object.values(g).filter(x=>x.n>1).sort((a,b)=>(b.n-1)*(b.v||0)-(a.n-1)*(a.v||0)||b.n-a.n);
  const extras=dups.reduce((a,x)=>a+x.n-1,0),exVal=dups.reduce((a,x)=>a+(x.n-1)*(x.v||0),0);
  /* binder space */
  const bs=binderNums().map(n=>{const s=binderStats(n);return {n,cap:s.cap,filled:s.filled,free:Math.max(0,s.cap-s.filled)}});
  const freeAll=bs.reduce((a,b)=>a+b.free,0);
  el.innerHTML=`<div class="tstack"><section class="hc ucard"><div class="hch"><h3>Find and replace</h3><small>You can undo it afterwards</small></div>
    <p class="sub2">Change a value on many cards at once, for example rename a set or fix a spelling. You can undo it afterwards.</p>
    <div class="ufr"><label>Field<select data-uf="field">${Object.entries(UFIELDS).map(([k,l])=>`<option value="${k}"${k===f?" selected":""}>${l}</option>`).join("")}</select></label>
    <label>Find<select data-uf="find">${vals.map(v=>`<option value="${esc(v)}"${v===UF.find?" selected":""}>${v?esc(v):"(not set)"} · ${counts[v]}</option>`).join("")}</select></label>
    <label>Replace with<input data-uf="repl" list="ufList" value="${esc(UF.repl)}" placeholder="${f==="set"?"New set name":"New value"}" maxlength="60"><datalist id="ufList">${ufOptions(f).map(o=>`<option value="${esc(o)}">`).join("")}</datalist></label>
    </div><div class="uprev"><span id="ufNote">${ufNoteHtml()}</span><button type="button" class="btn" data-ufgo ${canApply?"":"disabled"}>Replace</button></div></section>
  <section class="hc ucard"><div class="hch"><h3>Reports and lists</h3></div>
    <p class="sub2">Take your collection out of the app.</p>
    <div class="utiles"><button type="button" class="utile" data-urep><span class="uti"><svg viewBox="0 0 24 24"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/></svg></span><b>Collection report</b><small>Printable HTML with values and sets</small></button><button type="button" class="utile" data-ucsv><span class="uti"><svg viewBox="0 0 24 24"><path d="M4 4h16v16H4zM4 10h16M10 4v16"/></svg></span><b>Export CSV</b><small>Every card, for Excel or sharing</small></button><button type="button" class="utile" data-udup ${extras?"":"disabled"}><span class="uti"><svg viewBox="0 0 24 24"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/></svg></span><b>Copy extras list</b><small>${extras?extras+" spare "+(extras===1?"copy":"copies")+", ready for trading":"No extra copies"}</small></button></div>
    <p class="status" id="uMsg" role="status"></p></section></div>
  <div class="tstack"><section class="hc ucard"><div class="hch"><h3>Extra copies</h3>${extras?`<button type="button" class="linkbtn" data-hg="dup" data-hv="">Show in Cards</button>`:""}</div>
    ${extras?`<p class="sub2">${extras} extra ${extras===1?"copy":"copies"} across ${plural(dups.length,"card")}${exVal?`, worth about ${eur(exVal)}`:""}. Handy for trading.</p><div class="udup">${dups.slice(0,8).map(x=>`<div><span><b>${esc(x.c.name)}</b><small>${esc([x.c.set||x.c.setCode,x.c.number].filter(Boolean).join(" · "))}</small></span><span class="un">×${x.n}</span><span class="uv">${x.v!=null?eur(x.v):"—"}</span></div>`).join("")}</div>`:`<p class="sub2">No card appears more than once.</p>`}</section>
  <section class="hc ucard"><div class="hch"><h3>Binder space</h3></div>
    ${bs.length?`<p class="sub2">${plural(freeAll,"free pocket")} across ${plural(bs.length,"binder")}.</p><div class="ubs">${bs.slice().sort((a,b)=>b.free-a.free).map(b=>{const p=b.cap?Math.round(b.filled/b.cap*100):0;return `<button type="button" class="ubrow" data-hopen="${b.n}"><span class="ubn">${esc(binderName(b.n))}</span><span class="fill"><i style="width:${p}%"></i></span><small>${b.cap?`${b.free} free of ${b.cap}`:"No pages set"}</small></button>`}).join("")}</div>`:`<p class="sub2">No binders yet.</p>`}</section></div>`;
}
function ufNoteHtml(){
  const f=UF.field,hit=S.cards.filter(c=>ufVal(c,f)===UF.find),copies=hit.reduce((a,c)=>a+(+c.qty||1),0),to=UF.repl.trim();
  if(!hit.length)return `<span class="mut">Nothing to change.</span>`;
  if(to===UF.find||(!to&&f==="set"))return `<span class="mut">Type a new value to see what will change.</span>`;
  return `<span class="ua">${esc(UF.find||"(not set)")}</span> → <b>${esc(to||"(not set)")}</b> <span class="mut">· ${hit.length===1?"1 entry":hit.length+" entries"} (${copies} ${copies===1?"copy":"copies"}) will change.${f==="set"?" The set code stays as it is.":""}</span>`;
}
document.addEventListener("change",e=>{
  const t=e.target;if(!t.dataset||!t.closest||!t.closest("#utilBody")||t.dataset.uf==null)return;
  if(t.dataset.uf==="field"){UF.field=t.value;UF.find="";UF.repl="";renderUtil()}
  else if(t.dataset.uf==="find"){UF.find=t.value;renderUtil()}
});
document.addEventListener("input",e=>{
  const t=e.target;if(!t.dataset||t.dataset.uf!=="repl")return;UF.repl=t.value;
  const b=$("#utilBody [data-ufgo]");if(b)b.disabled=!(S.cards.some(c=>ufVal(c,UF.field)===UF.find)&&UF.repl.trim()!==UF.find&&(UF.repl.trim()!==""||UF.field!=="set"));
  const nt=$("#ufNote");if(nt)nt.innerHTML=ufNoteHtml();
});
const uMsg=(t,err)=>{const s=$("#uMsg");if(s){s.textContent=t;s.classList.toggle("err",!!err)}};
document.addEventListener("click",async e=>{
  const t=e.target;if(!t.closest||!t.closest("#utilBody"))return;
  if(t.closest("[data-ufgo]")){
    const f=UF.field,from=UF.find,to=UF.repl.trim();const hit=S.cards.filter(c=>ufVal(c,f)===from);if(!hit.length)return;
    if(!(await askConfirm(`Change ${hit.length===1?"1 entry":hit.length+" entries"}?`,`${UFIELDS[f]}: “${from||"(not set)"}” becomes “${to||"(not set)"}”. You can undo it right after.`,"Replace",false)))return;
    txBegin(`Replaced ${UFIELDS[f].toLowerCase()} “${from||"not set"}” with “${to||"not set"}”`);
    try{for(const c of hit){await S.store.set(c.id,dkStrip({...c,[f]:to}))}}finally{txEnd()}
    UF.find=to;UF.repl="";render();renderUtil();uMsg("");return}
  if(t.closest("[data-ucsv]")){try{await exportCsv();uMsg(S.downloads&&S.downloads.fb?"CSV downloaded.":"CSV saved in the exports folder inside your collection folder.")}catch{uMsg("The export didn’t finish.",true)}return}
  if(t.closest("[data-urep]")){try{await saveFile(`pokemon-collection-report-${new Date().toISOString().slice(0,10)}.html`,collectionReport(),"text/html");logAct("Exported a collection report");uMsg(S.downloads&&S.downloads.fb?"Report downloaded. Open it in a browser to read or print it.":"Report saved in the exports folder inside your collection folder. Open it in a browser to read or print it.")}catch{uMsg("The report didn’t save.",true)}return}
  if(t.closest("[data-udup]")){
    const g={};S.cards.forEach(c=>{const k=cardKey(c);const x=g[k]=g[k]||{c,n:0};x.n+=+c.qty||1});
    const txt=Object.values(g).filter(x=>x.n>1).sort((a,b)=>a.c.name.localeCompare(b.c.name)).map(x=>`${x.n-1}x ${x.c.name}${x.c.set||x.c.setCode?" – "+(x.c.set||x.c.setCode):""}${x.c.number?" "+x.c.number:""}${x.c.variant&&x.c.variant!=="Normal"?" ("+x.c.variant+")":""}`).join("\n");
    uMsg(await copyText(txt)?"Extras list copied to the clipboard.":"Couldn’t copy. Select the text manually.",false);return}
});
function collectionReport(){
  const cs=S.cards,v=valueStats(),copies=cs.reduce((a,c)=>a+(+c.qty||1),0);
  const row=(a)=>`<tr>${a.map((x,i)=>`<td${i>=a.length-2?' class="r"':""}>${esc(x)}</td>`).join("")}</tr>`;
  const grp=(fn)=>{const m={};cs.forEach(c=>{const k=fn(c)||"Not set";const u=unitVal(c);const x=m[k]=m[k]||{n:0,v:0};x.n+=+c.qty||1;x.v+=(u||0)*(+c.qty||1)});return Object.entries(m).sort((a,b)=>b[1].v-a[1].v||b[1].n-a[1].n)};
  const tbl=(h,rows)=>`<table><thead><tr>${h.map((x,i)=>`<th${i>=h.length-2?' class="r"':""}>${x}</th>`).join("")}</tr></thead><tbody>${rows.map(row).join("")}</tbody></table>`;
  const top=v.list.slice().sort((a,b)=>b.t-a.t).slice(0,25);
  const all=cs.slice().sort((a,b)=>String(a.name).localeCompare(b.name));
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Pokémon collection report</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>
body{font:15px/1.5 system-ui,Segoe UI,Arial,sans-serif;color:#1c1f2a;max-width:960px;margin:32px auto;padding:0 20px}h1{margin:0 0 4px}h2{margin:32px 0 8px;font-size:1.15rem;border-bottom:2px solid #e3e6ee;padding-bottom:4px}
.k{display:flex;gap:12px;flex-wrap:wrap;margin:16px 0}.k div{flex:1 1 150px;border:1px solid #e3e6ee;border-radius:10px;padding:10px 14px}.k small{display:block;color:#667}.k b{font-size:1.4rem}
table{border-collapse:collapse;width:100%;font-size:.88rem}th,td{text-align:left;padding:5px 8px;border-bottom:1px solid #eceef4}th{background:#f4f5f9}td.r,th.r{text-align:right;white-space:nowrap}p.n{color:#667;font-size:.85rem}
@media print{body{margin:0}h2{break-after:avoid}tr{break-inside:avoid}}</style></head><body>
<h1>Pokémon collection report</h1><p class="n">Created ${new Date().toLocaleString()}. Prices are Cardmarket trend values${v.latest?`, last updated ${esc(v.latest)}`:""}.</p>
<div class="k"><div><small>Entries</small><b>${cs.length}</b></div><div><small>Cards (copies)</small><b>${copies}</b></div><div><small>Estimated value</small><b>${eur(v.total)}</b></div><div><small>Unpriced entries</small><b>${cs.length-v.priced}</b></div></div>
<h2>By location</h2>${tbl(["Location","Cards","Value"],grp(c=>c.locType==="showcase"?"Showcase: "+(c.deck||"Showcase"):c.locType==="deck"?"Deck: "+deckOf(c):binderName(c.binder)).map(([k,x])=>[k,String(x.n),eur(x.v)]))}
<h2>By rarity</h2>${tbl(["Rarity","Cards","Value"],grp(c=>c.rarity).map(([k,x])=>[k,String(x.n),eur(x.v)]))}
<h2>By set</h2>${tbl(["Set","Cards","Value"],grp(c=>c.set||c.setCode).map(([k,x])=>[k,String(x.n),eur(x.v)]))}
<h2>Most valuable</h2>${tbl(["Card","Set","Rarity","Qty","Value"],top.map(r=>[r.c.name,[r.c.set||r.c.setCode,r.c.number].filter(Boolean).join(" "),r.c.rarity||"",String(r.q),eur(r.t)]))}
<h2>Every card</h2>${tbl(["Card","Set","Number","Rarity","Variant","Condition","Location","Qty","Price"],all.map(c=>{const u=unitVal(c);return [c.name,c.set||c.setCode||"",c.number||"",c.rarity||"",c.variant||"",c.condition||"",locLabel(c),String(+c.qty||1),u==null?"":eur(u)]}))}
</body></html>`;
}

