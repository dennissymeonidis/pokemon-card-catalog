/* ===== Card page (a normal screen with its own address: #card/<id>) ===== */
const CPTABS=[["overview","Overview"],["copies","Your copies"],["details","Card data"],["price","Price"],["notes","Notes & history"]];
const CP_COL={Fire:"#e5484d",Water:"#3b82f6",Grass:"#3fa34d",Lightning:"#f2b705",Psychic:"#a855f7",Fighting:"#b45309",Darkness:"#334155",Metal:"#8c93a8",Dragon:"#b8860b",Fairy:"#ec6fb0",Colorless:"#9aa3b5",Trainer:"#0f766e",Energy:"#6b7390"};
const cpEnt=()=>S.cp&&S.cards.find(x=>x.id===S.cp.id);
const cpGroup=c=>S.cards.filter(x=>cardKey(x)===cardKey(c)).sort((a,b)=>(a.locType||"").localeCompare(b.locType||"")||(+a.binder||0)-(+b.binder||0)||(+a.page||0)-(+b.page||0)||(+a.slot||0)-(+b.slot||0));
const cpDet=(c,g)=>c.details||((g||cpGroup(c)).find(x=>x.details)||{}).details||null;
const cpQ=c=>+c.qty||1;
function cpSwap(nid){const cp=S.cp;if(!cp||cp.id===nid)return;const k=cp.seq.indexOf(cp.id);if(k>-1)cp.seq[k]=nid;else if(!cp.seq.includes(nid))cp.seq.push(nid);cp.id=nid}
function cpColor(c,d){const sup=String((d&&d.supertype)||"").toLowerCase();return sup.startsWith("trainer")?CP_COL.Trainer:sup.startsWith("energy")?CP_COL.Energy:CP_COL[(d&&d.types&&d.types[0])||"Colorless"]||CP_COL.Colorless}
function cpSeqFor(c,seq){return seq&&seq.length&&seq.includes(c.id)?seq:(S.listOrder&&S.listOrder.includes(c.id)&&S.screen==="collection"?S.listOrder:(c.locType==="binder"?binderSeqFor(c):[c.id]))}
function openCardPage(c,seq,opts){
  opts=opts||{};if(!c)return;for(let i=0;i<4&&document.querySelector(".ldx,.dk,.dkb");i++)document.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",bubbles:true,cancelable:true}));
  const was=S.screen==="card"&&S.cp;
  S.cp=was?S.cp:{from:S.screen&&S.screen!=="card"?S.screen:"collection",scroll:window.scrollY,tab:"overview",pushed:!opts.pop||!!opts.inApp};
  const cp=S.cp;cp.id=c.id;cp.seq=cpSeqFor(c,seq||(was?cp.seq:null));cp.edit=false;cp.move=null;cp.conf=null;cp.menu=false;
  if(was&&!opts.pop){try{history.replaceState(null,"","#card/"+encodeURIComponent(c.id))}catch{}}
  S.screen==="card"?null:show("card",{hash:"card/"+encodeURIComponent(c.id),pop:opts.pop});
  cpRender();if(!opts.keep)window.scrollTo(0,0);
}
async function cpLeave(){
  if(S.cp&&S.cp.edit&&!(await cpDiscardOk()))return;
  if(S.cp&&S.cp.edit)cpEndEdit(true);
  const from=(S.cp&&S.cp.from)||"collection";
  if(S.cp.pushed&&/^#card\//.test(location.hash)){history.back();setTimeout(()=>{if(S.screen==="card")show(from,{pop:true})},250)}else{try{history.replaceState(null,"","#"+from)}catch{}show(from,{pop:true})}
}
async function cpDiscardOk(){return !edDirty()||await askConfirm("Discard your changes?","You changed this card but didn’t save it.","Discard changes")}
function cpGo(dir){
  const cp=S.cp;if(!cp)return;const i=cp.seq.indexOf(cp.id),n=S.cards.find(x=>x.id===cp.seq[i+dir]);if(!n)return;
  (async()=>{if(cp.edit&&!(await cpDiscardOk()))return;if(cp.edit)cpEndEdit(true);const t=cp.tab;openCardPage(n,cp.seq,{keep:true});cp.tab=t==="details"?"details":t;cpRender()})();
}
/* ---- editing: the existing editor form is moved into the page ---- */
function cpStartEdit(){
  const c=cpEnt();if(!c)return;const cp=S.cp;
  openEditor(c,[c.id],true);cp.edit=true;cp.tab="details";cpRender();
}
function cpMount(){
  const h=$("#cpEditHost"),f=$("#editForm");if(!(h&&f))return;if(f.parentNode!==h)h.appendChild(f);
  const g=f.querySelector(".edmain>.grid");if(!g||g.dataset.acc)return;
  S.cpGrid=[...g.children];
  const T={"Card":"Identity","Card details":"Card data","Your copy":"Your copy"};
  const groups=[];let cur=null;const mk=(t,open)=>{const o={t,open,nodes:[]};groups.push(o);return o};
  let atk=null;
  for(const n of S.cpGrid){
    if(n.classList.contains("fsec")){cur=mk(T[n.textContent.trim()]||n.textContent.trim(),true);if(cur.t==="Card data"){atk=mk("Attacks, abilities and text",false)}continue}
    if(!cur)cur=mk("Details",true);
    const isText=n.classList.contains("dlist")||(n.matches&&n.matches("label")&&n.querySelector('[name="dRules"],[name="dFlavor"]'));
    if(isText&&atk&&cur.t==="Card data")atk.nodes.push(n);else if(n.classList.contains("dspacer"))continue;else cur.nodes.push(n);
  }
  // keep "Your copy" after the attacks group
  const order=[];for(const o of groups){order.push(o)}
  g.replaceChildren(...order.filter(o=>o.nodes.length).map(o=>{const d=document.createElement("details");d.className="cp-acc";d.open=o.open;const sm=document.createElement("summary");sm.textContent=o.t;const w=document.createElement("div");w.className="cp-in";if(o.t.startsWith("Attacks"))w.style.gridTemplateColumns="1fr";w.append(...o.nodes);d.append(sm,w);return d}));
  g.dataset.acc="1";g.classList.add("cp-accgrid");
}
function cpUnmount(){
  const f=$("#editForm"),e=$("#editor");
  const g=f&&f.querySelector(".edmain>.grid");if(g&&g.dataset.acc&&S.cpGrid){g.replaceChildren(...S.cpGrid);delete g.dataset.acc;g.classList.remove("cp-accgrid")}
  if(f&&e&&f.parentNode!==e)e.appendChild(f);
}
function cpEndEdit(silent){cpUnmount();S.editing=null;if(S.cp)S.cp.edit=false;if(!silent)cpRender()}
async function cpSave(){
  if(!F.name.value.trim()){cpToast("The card needs a name.");return}
  $("#editor").returnValue="save";const id=S.cp.id;
  try{await edClose()}catch(e){cpToast("The card didn’t save. Try again.");return}
  cpEndEdit(true);S.cp.id=S.cards.find(x=>x.id===id)?id:S.cp.id;cpRender();cpToast("Saved");
}
function cpToast(t){const e=$("#cpToast");if(!e)return;e.textContent=t;e.classList.add("on");clearTimeout(cpToast.t);cpToast.t=setTimeout(()=>e.classList.remove("on"),2400)}
/* ---- rendering ---- */
const cpPic=c=>imgSrc(c)||realImg(c)||"";
const cpThumb=c=>imgSrc(c)||(c.tcgImage?c.tcgImage+"/low.webp":"")||realImg(c)||"";
const cpPct=n=>(n>=0?"+":"")+n.toFixed(1)+"%";
const cpDay=t=>{const d=Date.parse(t);return Number.isFinite(d)?d:null};
function cpDelta(c){
  const p=c.price||{},u=unitVal(c),h=(c.phist||[]).filter(x=>x&&x.v>0);
  const at=days=>{const lim=Date.now()-days*864e5;let b=null;for(const x of h){const t=cpDay(x.d);if(t!=null&&t<=lim)b=x}return b};
  const pct=(a,b)=>a>0&&b!=null?(b/a-1)*100:null;
  let d7=null,d30=null,s7="",s30="";
  const h7=at(7),h30=at(30);
  if(u!=null&&h7){d7=pct(h7.v,u);s7="this week"}else if(u!=null&&+p.avg7>0){d7=pct(+p.avg7,u);s7="vs 7-day average"}
  if(u!=null&&h30){d30=pct(h30.v,u);s30="30 days"}else if(u!=null&&+p.avg30>0){d30=pct(+p.avg30,u);s30="vs 30-day average"}
  return {d7,d30,s7,s30};
}
function cpRefresh(){
  if(S.screen==="card"&&S.cp&&!S.cp.edit)cpRender();
  if(S.pendingCard&&S.cards.length){const c=S.cards.find(x=>x.id===S.pendingCard);S.pendingCard=null;if(c)openCardPage(c,null,{pop:true})}
  cpAlerts();
}
const alertHit=c=>+c.alertAbove>0&&unitVal(c)!=null&&unitVal(c)>=+c.alertAbove;
function cpAlerts(){
  const el=$("#cpAlerts");if(!el)return;const hits=S.cards.filter(alertHit);
  el.innerHTML=hits.length?`<div class="cp-alertbar"><b>Price alert${hits.length>1?"s":""}</b><span>${hits.slice(0,4).map(c=>`<button type="button" class="linkbtn" data-hcard="${esc(c.id)}">${esc(c.name)} is at ${eur(unitVal(c))}</button>`).join(" · ")}${hits.length>4?` · +${hits.length-4} more`:""}</span></div>`:"";
}
function cpMini(o){
  const inner=o.img?`<img alt="" loading="lazy" src="${esc(o.img)}">`:esc(o.miss?"?":String(o.name||"?")[0]);
  const body=`<span class="cp-mc" style="${o.miss?"":`background:${o.color||"var(--pocket)"}`}${o.cur?";outline:3px solid var(--accent);outline-offset:2px":""}">${inner}</span><b>${esc(o.name)}</b><small>${esc(o.sub||"")}</small>${(o.extra||[]).map(t=>`<small class="cp-evl">${esc(t)}</small>`).join("")}`;
  const cls=`cp-mini${o.miss?" miss":""}${o.cur?" cur":""}`;
  return o.go?`<button type="button" class="${cls}" data-cpgo="${esc(o.go)}">${body}</button>`:`<div class="${cls}">${body}</div>`;
}
function cpRender(){cpRender0();cpCacheArt()}
function cpRender0(){
  const host=$("#cd");if(!host||!S.cp)return;
  let c=cpEnt();
  if(!c&&S.cp.key){const alt=S.cards.find(x=>cardKey(x)===S.cp.key);if(alt){cpSwap(alt.id);c=alt}}
  if(c)S.cp.key=cardKey(c);
  if(!c){cpUnmount();const from=S.cp.from||"collection";S.cp=null;show(from);return}
  cpUnmount();
  const cp=S.cp,g=cpGroup(c),d=cpDet(c,g),n=g.reduce((a,x)=>a+cpQ(x),0);
  const u=unitVal(c),p=c.price||{},val=g.reduce((a,x)=>{const v=unitVal(x);return a+(v==null?0:v*cpQ(x))},0);
  const np=numParts(c.number),tot=np?np.tot:null;
  const f=(()=>{try{return fmtOf({es:g,f:c})}catch{return {unk:true}}})();
  const legal=f.std?["Standard legal","ok"]:f.exp?["Expanded only","warn"]:f.unk?["Format unknown",""]:["Not tournament legal","warn"];
  const dl=cpDelta(c);const sy=cpSync(c,d);
  const src=cpPic(c),mark=c.regMark||(d&&d.regulationMark)||"",dex=dexOf(c);
  const col=cpColor(c,d),i=cp.seq.indexOf(c.id);
  const sub=(d&&d.subtypes)||[];const tagList=sub.filter(x=>!Object.values(STAGES).flat().includes(x));
  const trade=g.some(x=>x.trade);
  const hdelta=dl.d7!=null?{v:dl.d7,s:dl.s7}:dl.d30!=null?{v:dl.d30,s:dl.s30}:null;
  const art=src?`<button type="button" class="cp-card3d cp-img" data-cp="zoom" aria-label="Show ${esc(c.name)} full size"><img alt="${esc(c.name)}" src="${esc(src)}"></button>`
   :`<div class="cp-card3d cp-ph" id="cpC3d" role="img" aria-label="${esc(c.name)} card placeholder" style="background:linear-gradient(160deg,${col},${col}cc 55%,#1b2233)"><div class="cp-art"><div class="cp-an"><span>${esc(c.name)}</span><span>${d&&d.hp?`HP ${esc(d.hp)}`:""}</span></div><div class="cp-ap">${esc(String(c.name||"?")[0])}</div><div class="cp-af">${esc([c.setCode,c.number].filter(Boolean).join(" "))}${c.rarity?" · "+esc(c.rarity):""}</div></div></div>`;
  host.innerHTML=`
  <div class="cp-top"><div class="cp-crumb"><button type="button" class="linkbtn" data-cp="back">Cards</button><span>›</span><b>${esc(c.name)}</b></div><span class="cp-grow"></span>
    ${cp.seq.length>1?`<button type="button" class="cp-ib" data-cp="prev" ${i<=0?"disabled":""} aria-label="Previous card">‹</button><span class="cp-pos">${i+1} of ${cp.seq.length}</span><button type="button" class="cp-ib" data-cp="next" ${i>=cp.seq.length-1?"disabled":""} aria-label="Next card">›</button>`:""}
    <button type="button" class="cp-ib" data-cp="back" aria-label="Close">✕</button></div>
  <div class="cp-body">
    <aside class="cp-left">
      <div class="cp-cardwrap">${art}</div>
      ${src?"":`<p class="cp-noimg">No picture yet. Use Replace picture, or fill in the card details to fetch the artwork.</p>`}
      <div class="cp-lacts">
        <div class="cp-row2">${S.assets?`<label class="btn ghost cp-lbl" title="Or drop a picture onto the card">Replace picture<input type="file" accept="image/*" id="cpRepl" class="vh"></label>`:`<button type="button" class="btn ghost" disabled title="Needs a connected folder">Replace picture</button>`}<button type="button" class="btn ghost" data-cp="zoom" ${src?"":"disabled"}>Zoom</button></div>
        <div class="cp-row2"><button type="button" class="btn ghost" style="grid-column:1/-1" data-cp="getart" ${S.assets?"":`disabled title="Needs a connected folder"`}>Fetch missing artwork</button></div>
        ${c.pic||c.img||c.official||c.tcgImage?`<div class="cp-row2"><button type="button" class="btn ghost" style="grid-column:1/-1;color:var(--danger)" data-cp="rmart">Remove artwork</button></div>`:""}
        <div class="cp-row2"><a class="btn ghost" target="_blank" rel="noopener" href="https://www.cardmarket.com/en/Pokemon/Products/Singles?searchString=${encodeURIComponent(c.name+(c.number?" "+String(c.number).split("/")[0]:""))}">Cardmarket ↗</a><a class="btn ghost" target="_blank" rel="noopener" href="https://www.tcgplayer.com/search/pokemon/product?q=${encodeURIComponent(c.name+" "+(c.set||""))}">TCGplayer ↗</a></div>
        ${!d&&S.sample?`<button type="button" class="btn" data-cp="fill">Fill in card details</button><p class="cp-hint" id="cpFillSt" style="margin:0"></p>`:""}
      </div>
      <div class="cp-facts">
        <div><span>Set</span><b class="cpsy">${pkSym(c)}${esc(c.set||c.setCode||"—")}</b></div>
        <div><span>Series</span><b class="cpsy">${pkSerImg(seriesOf(c))}${esc(seriesOf(c))}</b></div>
        <div><span>Number</span><b>${esc(c.number||"—")}</b></div>
        <div title="${esc(sy.tip)}"><span>API data</span><b style="color:var(--${sy.st==="ok"?"ok":"warn"})">${esc(sy.row)}</b></div>
        <div><span>Price updated</span><b>${esc(pkStamp(c.price&&c.price.updated))}</b></div>
        <div><span>Details updated</span><b>${esc(pkStamp(c.detailsAt||(c.details&&c.details.filled)))}</b></div>
        <div><span>Card ID</span><b>${pkIdChip(c)}</b></div>
        <div><span>Regulation</span><b>${mark?`<span class="rmk" title="Regulation mark ${esc(mark)}">${esc(mark)}</span>`:"—"}</b></div>
        <div><span>Illustrator</span><b>${esc((d&&d.illustrator)||"—")}</b></div>
        ${dex?`<div><span>Pokédex</span><b>No. ${String(dex).padStart(4,"0")}</b></div>`:""}
      </div>
    </aside>
    <section class="cp-right">
      <div class="cp-head"><div style="min-width:0"><h1>${esc(c.name)}${tagList.map(t=>`<span class="cp-tag">${esc(t)}</span>`).join("")}</h1>
        <p class="cp-meta"><span class="cpm">${pkSym(c)}${esc(c.set||c.setCode||"Unknown set")}${c.number?" · "+esc(c.number):""}</span>${pkSerImg(seriesOf(c))}${mark?`<span class="rmk" title="Regulation mark ${esc(mark)}">${esc(mark)}</span>`:""}${c.rarity?`<span class="cp-pill">${pkRar(c.rarity)}</span>`:""}<span class="cp-pill${isHolo(c.variant)?" holo":""}">${esc(c.variant||"Normal")}</span><span class="cp-pill ${legal[1]}">${legal[0]}</span><span class="cp-pill cp-own">×${n} owned</span><span class="cp-pill ${sy.st==="ok"?"ok":"warn"}" title="${esc(sy.tip)}">${sy.st==="ok"?"✓":sy.st==="part"?"◐":"○"} ${sy.label}</span>${trade?`<span class="cp-pill warn">For trade</span>`:""}</p></div>
        <div class="cp-price"><small>Cardmarket trend</small><b>${u!=null?eur(u):"—"}</b>${hdelta?`<div class="cp-delta ${hdelta.v>=0?"up":"down"}">${hdelta.v>=0?"▲":"▼"} ${Math.abs(hdelta.v).toFixed(1)}% ${hdelta.s}</div>`:""}</div></div>
      ${alertHit(c)?`<div class="cp-alertbar"><b>Price alert</b><span>The trend is at or above your ${eur(+c.alertAbove)} alert.</span></div>`:""}
      <div class="cp-actions">
        <button type="button" class="btn" data-cp="edit" ${cp.edit?"disabled":""}>Edit details</button>
        <button type="button" class="btn ghost" data-cp="addcopy">Add a copy</button>
        <button type="button" class="btn ghost" data-cp="movecopy">Move a copy</button>
        <div class="cp-menu${cp.menu?" open":""}"><button type="button" class="btn ghost" data-cp="menu" aria-haspopup="true" aria-expanded="${!!cp.menu}">More ▾</button>
          <div class="cp-pop"><button type="button" data-cp="dupe">Duplicate card entry</button><button type="button" data-cp="trade">${c.trade?"Remove the for-trade mark":"Mark this entry for trade"}</button><button type="button" data-cp="share">Copy as text</button>${S.sample&&d?`<button type="button" data-cp="fill">Refresh card details</button>`:""}<button type="button" class="dg" data-cp="delete">Delete card…</button></div></div>
        <span class="cp-hint">${cp.edit?"Editing: change the details below, then save.":"Keys: E edit, ← → switch card"}</span>
      </div>
      <div class="cp-tabs" role="tablist">${CPTABS.map(([k,l])=>`<button type="button" class="cp-tab" role="tab" data-cptab="${k}" aria-selected="${cp.tab===k}">${l}${k==="copies"?`<small>${n}</small>`:""}</button>`).join("")}</div>
      <div class="cp-pane">${cpPane(c,g,d,{n,val,u,dl,tot,legal})}</div>
      ${cp.edit?`<div class="cp-editbar"><span class="cp-grow">Unsaved changes</span><button type="button" class="btn ghost" data-cp="cancel">Cancel</button><button type="button" class="btn" data-cp="save">Save changes</button></div>`:""}
    </section></div>
  <div class="cp-keys"><span><kbd>←</kbd> <kbd>→</kbd> previous or next card</span><span><kbd>E</kbd> edit</span><span><kbd>Esc</kbd> ${cp.edit?"cancel editing":"back to Cards"}</span></div>`;
  if(cp.edit&&cp.tab==="details")cpMount();
  cpTilt();
  if(cp.tab==="overview"){cpSetLoad(c);cpEvoLoad(c,d)}
  if(cp.tab==="price")cpChart(c);
}
function cpPane(c,g,d,x){
  const t=S.cp.tab;
  if(t==="overview")return cpOverview(c,g,d,x);
  if(t==="copies")return cpCopies(c,g);
  if(t==="details")return cpDetails(c,g,d);
  if(t==="price")return cpPrice(c,g,x);
  return cpNotes(c,g);
}
const cpCost=a=>(a||[]).map(t=>en(t)).join(" ");
const cpStat=(l,b,e)=>`<div class="cp-stat"><small>${l}</small><b>${b}</b>${e?`<em>${e}</em>`:""}</div>`;
function cpOverview(c,g,d,x){
  const best=g.map(e=>e.condition).filter(Boolean).sort((a,b)=>CONDITIONS.indexOf(a)-CONDITIONS.indexOf(b))[0]||"Not set";
  const abl=((d&&d.abilities)||[]).map(a=>`<div class="cp-abl"><b>Ability · ${esc(a.name)}</b>${a.text?`<p>${esc(a.text)}</p>`:""}</div>`).join("");
  const atk=((d&&d.attacks)||[]).map(a=>`<div class="cp-atk"><div class="cp-ah"><span>${cpCost(a.cost)}</span><b>${esc(a.name)}</b><span class="cp-dm">${esc(a.damage||"")}</span></div>${a.text?`<p>${esc(a.text)}</p>`:""}</div>`).join("");
  const rules=((d&&d.rules)||[]).map(r=>`<p class="cp-hint">${esc(r)}</p>`).join("");
  const isPk=d&&String(d.supertype||"").startsWith("Pok");
  const left=!d?`<p class="cp-hint">No card details yet. ${S.sample?"Press <b>Fill in card details</b>, or ":"Press "}<button type="button" class="linkbtn" data-cp="edit">Edit details</button> to type them in.</p>`
   :isPk?`<h3>Attacks and abilities</h3>${abl}${atk||(abl?"":`<p class="cp-hint">No attacks.</p>`)}${rules}${d.flavor?`<p class="cp-hint" style="font-style:italic">${esc(d.flavor)}</p>`:""}`
   :`<h3>Card text</h3>${rules||`<p class="cp-hint">Nothing listed.</p>`}${d.flavor?`<p class="cp-hint" style="font-style:italic">${esc(d.flavor)}</p>`:""}`;
  const w=d&&d.weaknesses&&d.weaknesses[0],r=d&&d.resistances&&d.resistances[0];
  const stage=d?(sub=>sub.find(s=>Object.values(STAGES).flat().includes(s))||"")(d.subtypes||[]):"";
  const right=d?(isPk?`<h3>Battle stats</h3><dl class="cp-kv"><dt>Type</dt><dd>${(d.types||[]).map(t=>en(t)).join(" ")} ${esc((d.types||[]).join(" / ")||"—")}</dd><dt>Stage</dt><dd>${esc(stage||"—")}${d.evolvesFrom?` · evolves from ${esc(d.evolvesFrom)}`:""}</dd><dt>HP</dt><dd>${esc(d.hp||"—")}</dd><dt>Weakness</dt><dd>${w?en(w.type)+" "+esc(w.value||""):"none"}</dd><dt>Resistance</dt><dd>${r?en(r.type)+" "+esc(r.value||""):"none"}</dd><dt>Retreat</dt><dd>${d.retreat?Array(d.retreat).fill(en("Colorless")).join(" "):d.retreat===0?"free":"—"}</dd></dl>`:`<h3>Kind</h3><dl class="cp-kv"><dt>Type</dt><dd>${esc(d.supertype||"—")}${(d.subtypes||[]).length?" · "+esc(d.subtypes.join(", ")):""}</dd></dl>`):"";
  const setKey=c.set||c.setCode;
  const same=S.cards.filter(e=>(e.set||e.setCode)===setKey&&setKey);
  const own=new Set(same.map(e=>numParts(e.number)).filter(p=>p&&!p.pre&&(!x.tot||p.n<=x.tot)).map(p=>p.n)).size;
  const prog=x.tot?`<h3>Set progress</h3><p style="margin:0 0 6px"><b>${own}</b> of ${x.tot} in ${esc(setKey)}</p><div class="cp-bar"><i style="width:${Math.min(100,own/x.tot*100)}%"></i></div><p class="cp-hint" style="margin:6px 0 0" id="cpMiss"></p>`:"";
  const dx=dexOf(c);const sib=dx?S.cards.filter(e=>dexOf(e)===dx&&cardKey(e)!==cardKey(c)):[];const seen2=new Set(),sibU=sib.filter(e=>{const k=cardKey(e);if(seen2.has(k))return false;seen2.add(k);return true}).slice(0,14);
  const nb=cpNeighbours(c,null);
  const ch=x.dl;
  const head=`<div class="cp-grid4">${cpStat("Your value",x.val?eur(x.val):"—",x.u!=null?`${x.n} × ${eur(x.u)}`:"no price yet")}${cpStat("Copies owned",x.n,`${g.length} ${g.length===1?"place":"places"}`)}${cpStat("30-day change",ch.d30!=null?`<span class="cp-delta ${ch.d30>=0?"up":"down"}" style="font-size:1.4rem">${cpPct(ch.d30)}</span>`:"—",ch.d30==null?"no price history yet":ch.d7!=null?`${ch.s7==="this week"?"7 days":ch.s7}: ${cpPct(ch.d7)}`:ch.s30)}${cpStat("Best condition",`<span style="font-size:1.1rem">${esc(best)}</span>`,g.length>1?"across all copies":"your copy")}</div>
  <div class="cp-two"><div>${left}</div><div>${right}${prog}</div></div>`;
  const nbB=`${setKey?`<h3>Neighbours in ${esc(setKey)}</h3><div class="cp-strip cp-nb5" id="cpNb">${nb}</div>`:""}`,othB=`${sibU.length?`<h3>Other ${esc(titleCase(dexBase(c.name)))} cards you own</h3><div class="cp-strip">${sibU.map(e=>cpMini({img:cpThumb(e),color:cpColor(e,cpDet(e)),name:e.name,sub:[e.setCode,e.number].filter(Boolean).join(" "),go:e.id})).join("")}</div>`:dx?`<h3>Other ${esc(titleCase(dexBase(c.name)))} cards you own</h3><p class="cp-hint">This is the only one you own.</p>`:""}`;
  const evB=isPk?`<h3>Evolution line</h3><p class="cp-hint" id="cpEvoSum" style="margin:0 0 4px">${esc(cpEvoSummary(c,d,(S.cp&&S.cp.chain)||null))}</p><div class="cp-evbody" id="cpEvoPop">${cpEvoHtml(c,d,(S.cp&&S.cp.chain)||null)}</div><p class="cp-hint" style="margin:6px 0 0">Click a card you own to open its page. Dashed cards are not in your catalogue yet.</p>`:"";
  return head+(isPk?`<div class="cp-two cp-evsec"><div>${evB}</div><div>${nbB}${othB}</div></div>`:nbB+othB);
}
/* neighbours in the set: owned ones straight away, the missing ones once the set list has loaded */
function cpNeighbours(c,list){
  const np=numParts(c.number);if(!np)return `<p class="cp-hint">This card has no set number, so neighbours can’t be worked out.</p>`;
  const setKey=c.set||c.setCode;const mine=S.cards.filter(e=>(e.set||e.setCode)===setKey);
  const byNo=new Map();mine.forEach(e=>{const p=numParts(e.number);if(p&&!p.pre&&!byNo.has(p.n))byNo.set(p.n,e)});
  const nos=[];{let a=np.n-2,b=np.n+2;if(np.tot&&b>np.tot){a-=b-np.tot;b=np.tot}if(a<1){b+=1-a;a=1;if(np.tot&&b>np.tot)b=np.tot}for(let k=a;k<=b;k++)nos.push(k)}
  const meta=new Map((list||[]).map(x=>[parseInt(x.localId,10),x]));
  const tiles=nos.map(k=>{
    const e=byNo.get(k),m=meta.get(k);
    if(k===np.n)return cpMini({img:cpThumb(c),color:cpColor(c,cpDet(c)),name:c.name,sub:String(k).padStart(3,"0")+" · this card",cur:true});
    if(e)return cpMini({img:cpThumb(e),color:cpColor(e,cpDet(e)),name:e.name,sub:`${String(k).padStart(3,"0")}`,go:e.id});
    if(!list)return "";
    return cpMini({miss:true,img:m&&m.image?m.image+"/low.webp":"",name:m?m.name:"Unknown",sub:`${String(k).padStart(3,"0")} · missing`});
  }).filter(Boolean);
  return tiles.length?tiles.join(""):`<p class="cp-hint">No neighbours owned yet.</p>`;
}
async function cpSetLoad(c){
  const key=c.id;
  try{
    const setKey=c.set||c.setCode,np=numParts(c.number);if(!np)return;
    const mine=S.cards.filter(e=>(e.set||e.setCode)===setKey);
    const sid=setIdOf({name:setKey,cards:mine});if(!sid)return;
    const dd=await PKL.setCards(sid);if(!S.cp||S.cp.id!==key)return;
    const cardsL=dd.cards||[];
    const nb=$("#cpNb");if(nb)nb.innerHTML=cpNeighbours(c,cardsL);
    const el=$("#cpMiss");if(el){
      const own=new Set(mine.map(e=>numParts(e.number)).filter(p=>p&&!p.pre).map(p=>p.n));
      const miss=cardsL.filter(x=>{const n=parseInt(x.localId,10);return n>=1&&n<=np.tot&&!own.has(n)});
      const nx=miss.find(x=>parseInt(x.localId,10)>np.n)||miss[0];
      el.innerHTML=nx?`Next card you’re missing: <button type="button" class="linkbtn" data-cp="sets">${esc(nx.localId)} ${esc(nx.name)}</button> (${miss.length} missing in all)`:"You have every card in this set.";
    }
  }catch{}
}
function cpLocTitle(x){return x.locType==="showcase"?`🖼 ${esc(x.deck||"Showcase")}`:x.locType==="deck"?`🎴 ${esc(x.deck||"Deck")}`:`📘 ${esc(binderName(x.binder||"?"))}`}
function cpLocSub(x){return x.locType==="showcase"?"Showcase":x.locType==="deck"?"Deck box":(x.page?`Page ${x.page}`:"No page")+(x.slot?`, pocket ${x.slot}`:"")}
function cpMoveForm(x,ix){
  const m=S.cp.move;const ty=m.type||x.locType;
  return `<div class="cp-moverow" data-mvrow="${ix}"><select id="cpMvT" aria-label="Destination type"><option value="binder"${ty==="binder"?" selected":""}>Binder</option><option value="deck"${ty==="deck"?" selected":""}>Deck</option><option value="showcase"${ty==="showcase"?" selected":""}>Showcase</option></select>
    ${ty==="binder"?`<input id="cpMvB" type="number" min="1" placeholder="Binder no." value="${esc(x.binder||1)}"><input id="cpMvP" type="number" min="1" placeholder="Page" value="${esc(x.page||"")}"><input id="cpMvS" type="number" min="1" max="9" placeholder="Pocket" value="${esc(x.slot||"")}">`
    :`<input id="cpMvN" list="${ty==="deck"?"deckList":"scCaseList"}" placeholder="${ty==="deck"?"Deck name":"Showcase name"}" value="${esc(x.locType===ty?(x.deck||""):"")}" style="grid-column:span 3">`}
    <button type="button" class="btn sm" data-cp="mvok">Move here</button><button type="button" class="btn ghost sm" data-cp="mvno">Cancel</button></div>`;
}
function cpCopies(c,g){
  const cp=S.cp;
  const rows=g.map((x,ix)=>`<div class="cp-crow${x.id===c.id?" cur":""}"><div class="cp-loc"><b>${cpLocTitle(x)}</b><small>${pkIdChip(x)} · ${esc(cpLocSub(x))}${x.id===c.id?" · shown on this page":""}${x.trade?" · for trade":""}${(x.trail||[]).filter(e=>e.k==="moved").length?` · moved ${(x.trail||[]).filter(e=>e.k==="moved").length}×`:""}</small></div>
    <div class="cp-step"><button type="button" data-cpqty="${esc(x.id)}|-1" aria-label="One fewer">−</button><span>${cpQ(x)}</span><button type="button" data-cpqty="${esc(x.id)}|1" aria-label="One more">+</button></div>
    <select data-cpcond="${esc(x.id)}" aria-label="Condition"><option value="">Condition not set</option>${CONDITIONS.map(o=>`<option${o===x.condition?" selected":""}>${esc(o)}</option>`).join("")}</select>
    <select data-cpvar="${esc(x.id)}" aria-label="Variant">${VARIANTS.map(o=>`<option${o===(x.variant||"Normal")?" selected":""}>${esc(o)}</option>`).join("")}</select>
    <span class="cp-racts">${cp.conf===x.id?`<button type="button" class="btn danger sm" data-cpdel="${esc(x.id)}">Confirm remove</button><button type="button" class="btn ghost sm" data-cp="delno">Keep</button>`:`<button type="button" class="btn ghost sm" data-cpedit="${esc(x.id)}">Edit</button><button type="button" class="btn ghost sm" data-cpmv="${esc(x.id)}">Move</button><button type="button" class="btn ghost sm" data-cpdelask="${esc(x.id)}">Remove</button>`}</span></div>
    ${cp.move&&cp.move.id===x.id?cpMoveForm(x,ix):""}`).join("");
  const a=cp.add||{type:c.locType==="deck"?"deck":c.locType==="showcase"?"showcase":"binder"};
  return `<h3>Where your copies are</h3>${rows}
  <div class="cp-addrow" id="cpAdd"><b>Add another copy to</b><select id="cpAddT"><option value="binder"${a.type==="binder"?" selected":""}>a binder</option><option value="deck"${a.type==="deck"?" selected":""}>a deck</option><option value="showcase"${a.type==="showcase"?" selected":""}>a showcase</option></select>
   ${a.type==="binder"?`<input id="cpAddB" type="number" min="1" placeholder="Binder no." value="${esc(c.binder||1)}" style="width:110px"><input id="cpAddP" type="number" min="1" placeholder="Page" style="width:90px"><input id="cpAddS" type="number" min="1" max="9" placeholder="Pocket" style="width:90px">`:`<input id="cpAddN" list="${a.type==="deck"?"deckList":"scCaseList"}" placeholder="${a.type==="deck"?"Deck name":"Showcase name"} (optional)" style="width:220px">`}
   <button type="button" class="btn" data-cp="addok">Add copy</button></div>
  <p class="cp-hint">Quantity, condition and variant change instantly, and every change can be undone from the bar at the bottom.</p>`;
}
function cpDetails(c,g,d){
  if(S.cp.edit)return `<div id="cpEditHost"></div>`;
  const kv=(l,v)=>`<label>${l}<b>${v==null||v===""?"—":esc(v)}</b></label>`;
  const sub=(d&&d.subtypes)||[];const stage=sub.find(s=>Object.values(STAGES).flat().includes(s))||"";const tags=sub.filter(s=>s!==stage).join(", ");
  const w=d&&d.weaknesses&&d.weaknesses[0],r=d&&d.resistances&&d.resistances[0];
  const abl=((d&&d.abilities)||[]).map(a=>`<div class="cp-abl"><b>${esc(a.name)}</b>${a.text?`<p>${esc(a.text)}</p>`:""}</div>`).join("");
  const atk=((d&&d.attacks)||[]).map(a=>`<div class="cp-atk"><div class="cp-ah"><span>${cpCost(a.cost)}</span><b>${esc(a.name)}</b><span class="cp-dm">${esc(a.damage||"")}</span></div>${a.text?`<p>${esc(a.text)}</p>`:""}</div>`).join("");
  const rules=d&&((d.rules||[]).join(" ")||"");
  return `<p class="cp-hint" style="margin-top:0">This is the data the app uses for filters, decks and statistics. Press <b>Edit details</b> to change it.</p>
  <details class="cp-acc" open><summary>Identity</summary><div class="cp-in">${kv("Name",c.name)}${kv("Set",c.set)}${kv("Set code",c.setCode)}${kv("Number",c.number)}${kv("Series",seriesOf(c))}${kv("Rarity",c.rarity)}${kv("Variant",c.variant)}${kv("Regulation mark",c.regMark||(d&&d.regulationMark))}${kv("Pokédex No.",dexOf(c))}${kv("Card image set ID",c.apiSetId)}</div></details>
  <details class="cp-acc" open><summary>Card data</summary><div class="cp-in">${d?`${kv("Card type",d.supertype)}${kv("Stage or kind",stage)}${kv("Extra tags",tags)}${kv("HP",d.hp)}${kv("Types",(d.types||[]).join(" / "))}${kv("Evolves from",d.evolvesFrom)}${kv("Retreat cost",d.retreat)}${kv("Illustrator",d.illustrator)}${kv("Weakness",w?`${w.type} ${w.value||""}`:"")}${kv("Resistance",r?`${r.type} ${r.value||""}`:"")}`:`<p class="cp-hint">No details yet.</p>`}</div></details>
  <details class="cp-acc"><summary>Attacks, abilities and text</summary><div class="cp-in" style="grid-template-columns:1fr">${abl}${atk}${rules?`<p class="cp-hint">${esc(rules)}</p>`:""}${!abl&&!atk&&!rules?`<p class="cp-hint">Nothing listed.</p>`:""}</div></details>
  <details class="cp-acc"><summary>Your copy shown here</summary><div class="cp-in">${kv("Copies",cpQ(c))}${kv("Condition",c.condition)}${kv("Location",locLabel(c))}${kv("Added",c.added?String(c.added).slice(0,10):"")}</div></details>
  ${S.sample?`<p class="cp-hint">Details missing or wrong? <button type="button" class="linkbtn" data-cp="fill">Refresh from TCGdex</button></p><p class="cp-hint" id="cpFillSt"></p>`:""}`;
}
/* ---- price: stats, history chart, holding, alert ---- */
function cpPrRow(c){const p=c.price;return `<div class="cp-prrow"><span class="cp-hint" style="margin:0">${p&&p.updated?`Prices updated ${esc(String(p.updated).slice(0,10))}`:"No price saved yet"}</span><span class="cp-grow"></span><span class="cp-hint" id="cpPrSt" style="margin:0"></span><button type="button" class="btn ghost sm" data-cp="prrefresh">Refresh price</button></div>`}
async function cpRefreshPrice(c){
  const g=cpGroup(c),st=$("#cpPrSt"),btn=document.querySelector('[data-cp=prrefresh]'),before=unitVal(c);
  if(btn)btn.disabled=true;if(st)st.textContent="Fetching the latest Cardmarket price…";
  try{
    const id=c.tcgdexId||(await PKL.findFor(c)).id;
    PKL.P.cardCache.delete(id);const f=await PKL.cardById(id);const pr=PKL.priceOf(f);
    if(!pr||pr.trend==null)throw new Error("noprice");
    txBegin(`Refreshed the price of ${c.name}`);
    try{for(const x of g)await S.store.set(x.id,{...dkStrip(x),tcgdexId:id,price:pr})}finally{txEnd()}
    if(!S.cp)return;cpRender();
    const now=unitVal(S.cards.find(x=>x.id===S.cp.id)||c);
    cpToast(now==null?"Price refreshed":before!=null&&Math.abs(now-before)>=.005?`Price updated: ${eur(now)} (was ${eur(before)})`:`Price is unchanged at ${eur(now)}`);
  }catch(e){
    if(btn)btn.disabled=false;
    const msg=e&&e.message==="noprice"?"Cardmarket has no price for this card.":"Couldn’t reach the card database. Check your connection, or use Fill in card details first.";
    if(st)st.textContent=msg;cpToast(msg);
  }
}
function cpPrice(c,g,x){
  const p=c.price;if(!p||x.u==null)return cpPrRow(c)+`<p class="cp-hint">No price for this card yet. Press <b>Refresh price</b> to fetch it from Cardmarket.</p>`+cpAlertBox(c);
  const low=p.low!=null&&p.low!==""?+p.low:null,a30=p.avg30!=null&&p.avg30!==""?+p.avg30:null,a7=p.avg7!=null&&p.avg7!==""?+p.avg7:null;
  return cpPrRow(c)+`<div class="cp-grid4">${cpStat("Trend",eur(x.u),/reverse/i.test(c.variant||"")&&p.trendHolo>0?"reverse holo price":"Cardmarket, per copy")}${cpStat("Lowest listing",low!=null?eur(low):"—","cheapest to buy now")}${cpStat("7-day average",a7!=null?eur(a7):"—",a7==null?"saved at the next refresh":"")}${cpStat("30-day average",a30!=null?eur(a30):"—")}</div>
  <div class="cp-chart"><div class="cp-ctop"><b>Price history</b><div class="cp-seg" role="group" aria-label="Range">${[[30,"30 days"],[90,"90 days"],[365,"1 year"]].map(([v,l])=>`<button type="button" data-cprng="${v}" aria-pressed="${(S.cp.range||90)===v}">${l}</button>`).join("")}</div></div>
   <div id="cpChartBox" style="position:relative"><svg id="cpPchart" viewBox="0 0 600 210" preserveAspectRatio="none" aria-label="Price over time"></svg><div class="cp-tip" id="cpTip"></div></div>
   <div class="cp-lh" id="cpLH"></div></div>
  <p class="cp-hint" id="cpHistNote"></p>
  <h3>Your holding</h3><dl class="cp-kv"><dt>Copies</dt><dd>${x.n}</dd><dt>Value now</dt><dd>${eur(x.val)}</dd><dt>Change over the range</dt><dd id="cpRngChg">—</dd></dl>
  ${cpAlertBox(c)}
`;
}
function cpAlertBox(c){
  return `<h3>Price alert</h3><div class="cp-alertrow"><span>Tell me on the Home page when the trend goes above</span><input type="number" id="cpAlertV" min="0" step="0.01" style="width:110px" placeholder="€ 20.00" value="${+c.alertAbove>0?esc(c.alertAbove):""}"><button type="button" class="btn ghost sm" data-cp="alertset">Set alert</button>${+c.alertAbove>0?`<button type="button" class="btn ghost sm" data-cp="alertclear">Clear</button>`:""}</div>`;
}
function cpChart(c){
  const svg=$("#cpPchart");if(!svg)return;
  const rng=S.cp.range||90,now=Date.now(),lim=now-rng*864e5;
  const all=(c.phist||[]).filter(x=>x&&x.v>0&&cpDay(x.d)!=null).map(x=>({t:cpDay(x.d),v:+x.v}));
  const inR=all.filter(x=>x.t>=lim);
  const before=all.filter(x=>x.t<lim).slice(-1);
  const pts=[...before,...inR];
  const note=$("#cpHistNote");
  if(pts.length<2){
    svg.innerHTML="";$("#cpLH").innerHTML="";
    $("#cpChartBox").insertAdjacentHTML("afterbegin",`<p class="cp-hint cp-empty">${pts.length?"Only one price is saved so far.":"No price saved yet."} The chart fills in each time you refresh Cardmarket prices (Tools, Data &amp; backup).</p>`);
    if(note)note.textContent=`${all.length} price point${all.length===1?"":"s"} saved for this card.`;return}
  const t0=Math.max(lim,pts[0].t),t1=Math.max(now,pts[pts.length-1].t),vs=pts.map(p=>p.v);
  const mn=Math.min(...vs),mx=Math.max(...vs),sp=Math.max(mx-mn,mx*.04),W=600,H=210;
  const X=t=>t1===t0?W:Math.max(0,(t-t0)/(t1-t0))*W,Y=v=>H-12-((v-mn)/sp)*(H-34);
  const xy=pts.map(p=>[X(p.t),Y(p.v),p]);
  if(xy[xy.length-1][0]<W)xy.push([W,xy[xy.length-1][1],xy[xy.length-1][2]]);
  const line=xy.map((q,i)=>(i?"L":"M")+q[0].toFixed(1)+" "+q[1].toFixed(1)).join(" ");
  svg.innerHTML=`<defs><linearGradient id="cpPg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="var(--brand)" stop-opacity=".35"/><stop offset="1" stop-color="var(--brand)" stop-opacity="0"/></linearGradient></defs><path d="${line} L${W} ${H} L0 ${H}Z" fill="url(#cpPg)"/><path d="${line}" fill="none" stroke="var(--brand)" stroke-width="2.4" vector-effect="non-scaling-stroke"/><line id="cpCur" x1="0" x2="0" y1="0" y2="${H}" stroke="var(--muted)" stroke-dasharray="3 3" style="display:none" vector-effect="non-scaling-stroke"/>`;
  $("#cpLH").innerHTML=`<span>Low ${eur(mn)}</span><span>High ${eur(mx)}</span>`;
  const first=pts[0].v,last=pts[pts.length-1].v,chg=$("#cpRngChg");
  if(chg){chg.className="cp-delta "+(last>=first?"up":"down");chg.textContent=`${cpPct((last/first-1)*100)} (${last>=first?"+":"−"}${eur(Math.abs(last-first)*(S.cp?cpGroup(c).reduce((a,x)=>a+cpQ(x),0):1))} on your copies)`}
  if(note)note.textContent=`${all.length} price point${all.length===1?"":"s"} saved. A new one is added each time prices are refreshed.`;
  const box=$("#cpChartBox"),tip=$("#cpTip");
  box.onpointermove=e=>{const r=box.getBoundingClientRect();const fx=Math.min(Math.max((e.clientX-r.left)/r.width,0),1)*W;let b=xy[0];for(const q of xy)if(Math.abs(q[0]-fx)<Math.abs(b[0]-fx))b=q;
    const days=Math.round((now-b[2].t)/864e5);tip.style.display="block";tip.style.left=(b[0]/W*100)+"%";tip.style.top=(b[1]/H*100)+"%";tip.textContent=`${eur(b[2].v)} · ${days<=0?"today":days+" days ago"}`;const l=$("#cpCur");l.style.display="block";l.setAttribute("x1",b[0]);l.setAttribute("x2",b[0])};
  box.onpointerleave=()=>{tip.style.display="none";const l=$("#cpCur");if(l)l.style.display="none"};
}
function cpNotes(c,g){
  const nm=String(c.name||"").toLowerCase();
  const acts=(S.activity||[]).filter(a=>nm&&String(a.label).toLowerCase().includes(nm)).slice(0,15);
  const fmt=t=>new Date(t).toLocaleDateString(undefined,{day:"numeric",month:"short",year:"numeric"});
  const rows=[...acts.map(a=>[fmt(a.t),a.label])];
  if(c.added)rows.push([fmt(c.added),"Added to the catalogue"]);
  return `<h3>Notes</h3><textarea id="cpNote" placeholder="Where you got it, trade ideas, grading plans…">${esc(c.notes||"")}</textarea><div style="margin-top:8px"><button type="button" class="btn sm" data-cp="savenote">Save note</button></div>
  <h3>Where ${g.length>1?"each copy":"this copy"} has been</h3>${cpTrailHtml(g,c)}<p class="cp-hint">Every move between binders, pages, pockets, decks and showcases is recorded from now on. Older cards start from the date they were added.</p>
  <h3>History of this card</h3>${rows.length?`<ul class="cp-tl2">${rows.map(([t,e])=>`<li><time>${esc(t)}</time><span>${esc(e)}</span></li>`).join("")}</ul>`:`<p class="cp-hint">Nothing recorded yet.</p>`}`;
}
function cpTilt(){
  const el=document.querySelector(".cp-card3d");if(!el)return;
  el.onpointermove=e=>{const r=el.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;el.style.transform=`rotateY(${x*16}deg) rotateX(${-y*16}deg)`;el.style.setProperty("--sh",1)};
  el.onpointerleave=()=>{el.style.transform="";el.style.setProperty("--sh",0)};
}
function cpSync(c,d){
  const matched=!!c.tcgdexId,det=!!(d||c.details),pr=c.price&&c.price.trend!=null&&c.price.trend!=="",art=!!c.official;
  const upd=c.price&&c.price.updated?new Date(c.price.updated):null;const when=upd&&!isNaN(upd)?upd.toLocaleDateString(undefined,{day:"numeric",month:"short",year:"numeric"}):"";
  const st=!matched?"none":(det&&pr)?"ok":"part";
  const label=st==="ok"?"Synced with TCGdex":st==="part"?"Partly synced":"Not matched";
  const miss=[det?"":"card details",pr?"":"prices"].filter(Boolean);
  const tip=matched?`Matched to TCGdex card ${c.tcgdexId}. Details: ${det?"filled in":"missing"}. Prices: ${pr?"Cardmarket trend"+(when?", updated "+when:""):"missing"}. Artwork: ${art?"official":"none yet"}.`:"This card isn’t linked to a TCGdex entry yet. Use Fill in card details to match it.";
  const row=st==="ok"?`Matched${when?" · prices "+when:""}`:st==="part"?`Matched · missing ${miss.join(" and ")}`:"Not matched yet";
  return {st,label,tip,row};
}
function cpLightbox(c){
  const s=cpPic(c);if(!s)return;const ov=document.createElement("div");ov.className="cp-lb";ov.setAttribute("role","dialog");ov.setAttribute("aria-label",c.name);
  ov.innerHTML=`<img alt="${esc(c.name)}" src="${esc(s)}"><button type="button" class="btn" aria-label="Close">Close</button>`;
  const close=()=>{document.removeEventListener("keydown",k,true);ov.remove()};const k=e=>{if(e.key==="Escape"){e.stopPropagation();close()}};
  ov.addEventListener("click",close);document.addEventListener("keydown",k,true);document.body.appendChild(ov);ov.querySelector("button").focus();
}
/* ---- actions ---- */
async function cpSetEntry(x,patch,label){
  txBegin(label);try{await S.store.set(x.id,{...dkStrip(x),...patch})}finally{txEnd()}
}
document.addEventListener("click",async e=>{
  const t=e.target;if(!t.closest||!t.closest("#cardPage"))return;
  const cp=S.cp;if(!cp)return;const c=cpEnt();
  let b;
  if(!t.closest(".cp-menu")&&cp.menu){cp.menu=false;document.querySelector(".cp-menu")?.classList.remove("open")}
  if(b=t.closest("[data-cprng]")){cp.range=+b.dataset.cprng;cpRender();return}
  if(b=t.closest("[data-cptab]")){cp.tab=b.dataset.cptab;cp.move=null;cp.conf=null;cpRender();return}
  if(b=t.closest("[data-cpgo]")){const n=S.cards.find(x=>x.id===b.dataset.cpgo);if(n){if(cp.edit&&!(await cpDiscardOk()))return;if(cp.edit)cpEndEdit(true);cp.tab="overview";openCardPage(n,cp.seq)}return}
  if(b=t.closest("[data-cpqty]")){const [id,dl]=b.dataset.cpqty.split("|");const x=S.cards.find(y=>y.id===id);if(!x)return;const q=cpQ(x)+ +dl;if(q<1){cpToast("Use Remove to take the last copy out.");return}await cpSetEntry(x,{qty:q},`Changed ${x.name} to ×${q} in ${locLabel(x)}`);cpRender();return}
  if(b=t.closest("[data-cpedit]")){const x=S.cards.find(y=>y.id===b.dataset.cpedit);if(x){cp.id=x.id;cpStartEdit()}return}
  if(b=t.closest("[data-cpmv]")){cp.move={id:b.dataset.cpmv};cp.conf=null;cpRender();return}
  if(b=t.closest("[data-cpdelask]")){cp.conf=b.dataset.cpdelask;cp.move=null;cpRender();return}
  if(b=t.closest("[data-cpdel]")){
    const x=S.cards.find(y=>y.id===b.dataset.cpdel);cp.conf=null;if(!x)return;
    txBegin(`Removed ${x.name} (${cpQ(x)}) from ${locLabel(x)}`);try{await S.store.del(x.id)}finally{txEnd()}
    if(S.screen!=="card"||!S.cp)return;
    if(x.id===cp.id){const g2=cpGroup(c);if(g2.length)cpSwap(g2[0].id)}cpRender();return}
  if(b=t.closest("[data-cp]")){
    const a=b.dataset.cp;
    if(a==="back"){cpLeave();return}
    if(a==="prev"){cpGo(-1);return}if(a==="next"){cpGo(1);return}
    if(a==="menu"){cp.menu=!cp.menu;b.closest(".cp-menu").classList.toggle("open",cp.menu);b.setAttribute("aria-expanded",cp.menu);return}
    if(a==="zoom"){cpLightbox(c);return}
    if(a==="rmart"){
      if(!(await askConfirm("Remove the artwork?",`This clears the picture of ${c.name}. The card itself, its details and prices stay. You can undo it straight afterwards, or fetch the artwork again later.`,"Remove artwork")))return;
      const fresh=S.cards.find(x=>x.id===c.id)||c;const {id,...rest}=fresh;
      txBegin(`Removed the artwork of ${c.name}`);try{await S.store.set(id,{...rest,img:null,pic:null,official:null,tcgImage:""})}finally{txEnd()}
      cpRender();cpToast("Artwork removed");return}
    if(a==="getart"){
      if(!S.assets||b.disabled)return;
      if(c.official&&PKL.P.urls.has(c.official)){cpToast("This card already has its official artwork.");return}
      b.disabled=true;cpToast("Fetching the artwork…");
      try{const f=await PKL.findFor(c);const art=await PKL.artwork(f);if(!art)throw {code:"no_art"};
        const fresh=S.cards.find(x=>x.id===c.id)||c;const {id,...rest}=fresh;
        txBegin(`Fetched the artwork for ${c.name}`);try{await S.store.set(id,{...rest,official:art,tcgdexId:rest.tcgdexId||f.id,tcgImage:rest.tcgImage||f.image||""})}finally{txEnd()}
        cpRender();cpToast("Artwork added")}
      catch(err){b.disabled=false;cpToast(err&&err.code==="no_art"?"That card has no artwork online.":err&&err.code==="not_found"?"No matching card found online. Check the set code and number.":"Couldn’t fetch the artwork. Check your connection and try again.")}
      return}
    if(a==="edit"){cpStartEdit();return}
    if(a==="cancel"){if(!(await cpDiscardOk()))return;cpEndEdit();return}
    if(a==="save"){await cpSave();return}
    if(a==="addcopy"){cp.tab="copies";cpRender();setTimeout(()=>{const i=document.querySelector("#cpAdd input");if(i)i.focus()},50);return}
    if(a==="movecopy"){cp.tab="copies";cp.move={id:cp.id};cpRender();return}
    if(a==="mvno"){cp.move=null;cpRender();return}
    if(a==="delno"){cp.conf=null;cpRender();return}
    if(a==="mvok"){
      const x=S.cards.find(y=>y.id===cp.move.id);if(!x)return;const ty=$("#cpMvT").value;let patch;
      if(ty==="binder"){const bn=+$("#cpMvB").value||1,pg=+$("#cpMvP").value||null,sl=+$("#cpMvS").value||null;
        const occ=pg&&sl?S.cards.find(y=>y.id!==x.id&&y.locType==="binder"&&+y.binder===bn&&+y.page===pg&&+y.slot===sl):null;
        if(occ&&!(await askConfirm(`Pocket ${sl} is taken`,`${occ.name} is already in ${binderName(bn)}, page ${pg}, pocket ${sl}. Move ${x.name} there as well?`,"Move anyway",false)))return;
        patch={locType:"binder",binder:bn,page:pg,slot:sl,deck:null}}
      else{const nm=($("#cpMvN").value||"").trim()||(ty==="deck"?"Unnamed deck":"Showcase 1");
        patch={locType:ty,deck:nm,binder:null,page:null,slot:ty==="showcase"?Math.max(0,...scCards(nm).map(y=>+y.slot||0))+1:null}}
      cp.move=null;await cpSetEntry(x,patch,`Moved ${x.name} to ${locLabel({...x,...patch})}`);cpRender();return}
    if(a==="addok"){
      const ty=$("#cpAddT").value;let loc;
      if(ty==="binder"){loc={locType:"binder",binder:+$("#cpAddB").value||1,page:+$("#cpAddP").value||null,slot:+$("#cpAddS").value||null,deck:null}}
      else{const nm=($("#cpAddN").value||"").trim()||(ty==="deck"?"Unnamed deck":"Showcase 1");loc={locType:ty,deck:nm,binder:null,page:null,slot:ty==="showcase"?Math.max(0,...scCards(nm).map(y=>+y.slot||0))+1:null}}
      const src=cpEnt();txBegin(`Added a copy of ${src.name} to ${locLabel({...src,...loc})}`);
      try{await S.store.add({...dkStrip(src),...loc,qty:1,trail:null,phist:null,trade:null,added:new Date().toISOString()})}finally{txEnd()}
      cp.add=null;cpRender();return}
    if(a==="savenote"){const v=($("#cpNote").value||"").trim();await cpSetEntry(c,{notes:v},`Edited the note on ${c.name}`);cpToast("Note saved");return}
    if(a==="prrefresh"){await cpRefreshPrice(c);return}
    if(a==="sets"){show("stats");showSub("setPanel");return}
    if(a==="dupe"){cp.menu=false;txBegin(`Duplicated ${c.name}`);let nid;try{nid=await S.store.add({...dkStrip(c),trail:null,phist:null,added:new Date().toISOString()})}finally{txEnd()}cp.tab="copies";cpRender();cpToast("Entry duplicated");return}
    if(a==="trade"){cp.menu=false;await cpSetEntry(c,{trade:!c.trade},c.trade?`Removed the for-trade mark from ${c.name}`:`Marked ${c.name} for trade`);cpRender();cpToast(c.trade?"Marked for trade":"Trade mark removed");return}
    if(a==="alertset"){const v=+($("#cpAlertV").value||0);if(!(v>0)){cpToast("Enter a price above zero.");return}await cpSetEntry(c,{alertAbove:v},`Set a price alert on ${c.name} at ${eur(v)}`);cpRender();cpToast(`Alert set at ${eur(v)}`);return}
    if(a==="alertclear"){await cpSetEntry(c,{alertAbove:null},`Cleared the price alert on ${c.name}`);cpRender();cpToast("Alert cleared");return}
    if(a==="share"){cp.menu=false;const txt=`${c.name}${c.set?", "+c.set:""}${c.number?" "+c.number:""}${c.rarity?" ("+c.rarity+")":""}${c.variant&&c.variant!=="Normal"?" – "+c.variant:""}`;cpToast(await copyText(txt)?"Copied to the clipboard":"Couldn’t copy");cpRender();return}
    if(a==="delete"){cp.menu=false;
      if(!(await askConfirm(`Delete ${c.name}?`,`This removes this entry (${locLabel(c)}) from your catalogue. You can undo this afterwards.`,"Delete card")))return;
      txBegin(`Deleted ${c.name}`);try{await S.store.del(c.id)}finally{txEnd()}
      if(S.screen!=="card"||!S.cp)return;const left=cpGroup(c).filter(x=>x.id!==c.id);if(left.length){cpSwap(left[0].id)}cpRender();return}
    if(a==="fill"){
      cp.menu=false;const st=$("#cpFillSt");if(st)st.textContent="Reading the card. This can take up to a minute.";cpToast("Reading the card…");b.disabled=true;
      try{
        const fresh=S.cards.find(x=>x.id===c.id)||c,oldKey=cardKey(fresh),oldName=fresh.name;
        const twins=S.cards.filter(x=>x.id!==fresh.id&&cardKey(x)===oldKey).map(x=>x.id);
        const {id,...rest}=fresh;if(rest.tcgdexId)PKL.P.cardCache.delete(rest.tcgdexId);
        const f=await PKL.findFor(rest);const card=await PKL.enrich({...rest},{tcg:f});
        const nn=f&&f.name?String(f.name).trim():"";const renamed=!!nn&&nn!==oldName;
        txBegin(renamed?`Refreshed ${oldName} from TCGdex and renamed it ${nn}`:`Refreshed ${oldName} from TCGdex`);
        try{await S.store.set(id,{...card,name:nn||card.name});
          if(renamed)for(const tid of twins){const x=S.cards.find(y=>y.id===tid);if(x)await S.store.set(tid,{...dkStrip(x),name:nn})}
        }finally{txEnd()}
        cpRender();cpToast(renamed?`Refreshed from TCGdex. Renamed “${oldName}” to “${nn}”.`:"Refreshed from TCGdex")}
      catch(err){b.disabled=false;cpToast(fillErr(err))}return}
  }
});
(()=>{
  let z=null;const clear=()=>{if(z){z.classList.remove("cp-fdrop");z=null}};
  const zone=e=>e.target&&e.target.closest&&e.target.closest("#cardPage .cp-left");
  document.addEventListener("dragover",e=>{if(!hasFiles(e))return;const l=zone(e);if(!l){clear();return}e.preventDefault();e.dataTransfer.dropEffect="copy";const w=l.querySelector(".cp-cardwrap");if(w!==z){clear();z=w;if(w)w.classList.add("cp-fdrop")}});
  document.addEventListener("dragleave",e=>{if(z&&!(e.relatedTarget&&e.relatedTarget.closest&&e.relatedTarget.closest("#cardPage .cp-left")))clear()});
  document.addEventListener("drop",async e=>{
    if(!hasFiles(e))return;const l=zone(e);clear();if(!l)return;e.preventDefault();
    if(!S.assets){cpToast("Replacing a picture needs a connected folder.");return}
    const f=imgFile(e);if(!f){cpToast("That isn’t a picture. Drop a JPEG or PNG.");return}
    const c=cpEnt();if(!c)return;cpToast("Saving the new picture…");
    try{await replacePicture(c,f);cpRender();cpToast("Picture replaced")}catch{cpToast("The picture didn’t save. Try a JPEG or PNG.")}
  });
})();
document.addEventListener("change",async e=>{
  const t=e.target;if(!t.closest||!t.closest("#cardPage"))return;
  if(t.id==="cpRepl"){const f=t.files[0];if(!f||!S.assets)return;const c=cpEnt();
    try{await replacePicture(c,f);
      cpRender();cpToast("Picture replaced")}catch{cpToast("The picture didn’t save. Try a JPEG or PNG.")}return}
  if(t.dataset.cpcond!=null){const x=S.cards.find(y=>y.id===t.dataset.cpcond);if(x){await cpSetEntry(x,{condition:t.value},`Set ${x.name} to ${t.value||"no condition"} in ${locLabel(x)}`);cpRender()}return}
  if(t.dataset.cpvar!=null){const x=S.cards.find(y=>y.id===t.dataset.cpvar);if(x){await cpSetEntry(x,{variant:t.value},`Set ${x.name} variant to ${t.value} in ${locLabel(x)}`);cpRender()}return}
  if(t.id==="cpMvT"){S.cp.move.type=t.value;cpRender();return}
  if(t.id==="cpAddT"){S.cp.add={type:t.value};cpRender();return}
});
document.addEventListener("keydown",e=>{
  if(S.screen!=="card"||!S.cp)return;
  if($("#editor").open||$("#confirmDlg").open||document.querySelector(".cp-lb,.cp-evpop"))return;
  const typing=e.target.closest&&e.target.closest("input,textarea,select");
  if(e.key==="Escape"){e.preventDefault();if(S.cp.edit){cpDiscardOk().then(ok=>{if(ok)cpEndEdit()})}else cpLeave();return}
  if(typing||e.ctrlKey||e.metaKey||e.altKey)return;
  if(e.key==="ArrowRight"){e.preventDefault();cpGo(1)}else if(e.key==="ArrowLeft"){e.preventDefault();cpGo(-1)}
  else if((e.key==="e"||e.key==="E")&&!S.cp.edit){e.preventDefault();cpStartEdit()}
});

/* ---- evolution line (with photos) ---- */
const EVO_API="https://api.tcgdex.net/v2/en";
const CPEVO={next:{},prev:{},img:{}};
const evoOwned=name=>{const k=dexBase(name);return k?S.cards.filter(x=>dexBase(x.name)===k):[]};
async function evoJson(u){const r=await fetch(u);if(!r.ok)throw 0;return r.json()}
const evoNote=(list)=>{for(const x of list||[]){const b=dexBase(x.name);if(b&&x.image&&!CPEVO.img[b])CPEVO.img[b]=x.image+"/low.webp"}};
async function evoNext(name){
  const k=dexBase(name);if(CPEVO.next[k])return CPEVO.next[k];
  const own=new Set();S.cards.forEach(x=>{const e=x.details&&x.details.evolvesFrom;if(e&&dexBase(e)===k)own.add(dexBase(x.name))});
  let names=[...own];
  try{const j=await evoJson(`${EVO_API}/cards?evolveFrom=eq:${encodeURIComponent(titleCase(k))}&pagination:page=1&pagination:itemsPerPage=100`);
    evoNote(j);for(const x of j){const b=dexBase(x.name);if(b&&b!==k&&!names.includes(b))names.push(b)}}catch{}
  return CPEVO.next[k]=names.slice(0,8);
}
async function evoImg(name){
  const k=dexBase(name);if(CPEVO.img[k]!=null)return CPEVO.img[k];
  try{const j=await evoJson(`${EVO_API}/cards?name=eq:${encodeURIComponent(titleCase(k))}&pagination:page=1&pagination:itemsPerPage=30`);evoNote(j)}catch{}
  return CPEVO.img[k]||(CPEVO.img[k]="");
}
async function evoPrev(name){
  const k=dexBase(name);if(k in CPEVO.prev)return CPEVO.prev[k];
  const o=evoOwned(name).find(x=>x.details&&x.details.evolvesFrom);if(o)return CPEVO.prev[k]=o.details.evolvesFrom;
  try{const j=await evoJson(`${EVO_API}/cards?name=eq:${encodeURIComponent(titleCase(k))}&pagination:page=1&pagination:itemsPerPage=20`);evoNote(j);
    for(const x of j.slice(0,6)){try{const d=await evoJson(`${EVO_API}/cards/${encodeURIComponent(x.id)}`);if(d.category==="Pokemon"){return CPEVO.prev[k]=d.evolveFrom||""}}catch{}}}catch{}
  return "";
}
function cpEvoTile(name,cur){
  if(cur)return `<div class="cp-evt">${cpMini({img:cpThumb(cur),color:cpColor(cur,cpDet(cur)),name:cur.name,sub:"This card",cur:true})}</div>`;
  const own=evoOwned(name);const k=dexBase(name);
  if(!own.length)return `<div class="cp-evt none">${cpMini({miss:true,img:CPEVO.img[k]||"",name:titleCase(k),sub:"Not in your catalogue"})}</div>`;
  const pick=own.find(x=>cpThumb(x))||own[0];const locs=[...new Set(own.map(x=>locLabel(x)))];
  const nown=own.reduce((a,x)=>a+cpQ(x),0);
  return `<div class="cp-evt own">${cpMini({img:cpThumb(pick),color:cpColor(pick,cpDet(pick)),name:pick.name,sub:`${nown} owned${own.length>1?` in ${own.length} entries`:""}`,go:pick.id,extra:[...locs.slice(0,3),...(locs.length>3?[`+${locs.length-3} more`]:[])]})}</div>`;
}
function cpEvoHtml(c,d,chain){
  const base=dexBase(c.name);
  const prev=chain?chain.prev:(d&&d.evolvesFrom?[d.evolvesFrom]:[]);
  const next=chain?chain.next:[];
  const col=arr=>`<div class="cp-evcol">${arr.map(x=>cpEvoTile(x)).join("")}</div>`;
  const parts=[];
  if(chain&&chain.prev2&&chain.prev2.length)parts.push(col(chain.prev2));
  if(prev.length)parts.push(col(prev));
  parts.push(`<div class="cp-evcol">${cpEvoTile(base,c)}</div>`);
  if(next.length)parts.push(col(next));
  if(chain&&chain.next2&&chain.next2.length)parts.push(col(chain.next2));
  const lone=parts.length===1;
  const msg=chain?(lone?`<p class="cp-hint">No evolutions found for this Pokémon.</p>`:""):`<p class="cp-hint" id="cpEvoSt">Looking up the rest of the line…</p>`;
  return `<div class="cp-evrow">${parts.join('<span class="cp-evar" aria-hidden="true">→</span>')}</div>${msg}`;
}
async function cpEvoLoad(c,d){
  if(!d||!String(d.supertype||"").startsWith("Pok"))return;
  const id=c.id,base=dexBase(c.name);
  try{
    const prev1=d.evolvesFrom?[d.evolvesFrom]:[];
    let prev2=[];
    if(prev1.length){const p=await evoPrev(prev1[0]);if(p&&dexBase(p)!==base&&dexBase(p)!==dexBase(prev1[0]))prev2=[p]}
    const next=await evoNext(base);
    let next2=[];
    if(next.length&&next.length<=3){const all=await Promise.all(next.map(n=>evoNext(n)));next2=[...new Set(all.flat())].filter(x=>x!==base&&!next.includes(x)).slice(0,6)}
    const names=[...prev2,...prev1,...next,...next2];
    await Promise.all(names.filter(n=>!evoOwned(n).length).map(n=>evoImg(n)));
    if(!S.cp||S.cp.id!==id)return;
    S.cp.chain={prev:prev1,prev2,next,next2};
    const sm=$("#cpEvoSum");if(sm)sm.textContent=cpEvoSummary(c,d,S.cp.chain);
    const pb=$("#cpEvoPop");if(pb)pb.innerHTML=cpEvoHtml(c,d,S.cp.chain);
  }catch{if(S.cp&&S.cp.id===id){S.cp.chain={prev:d.evolvesFrom?[d.evolvesFrom]:[],prev2:[],next:[],next2:[],offline:true};const sm=$("#cpEvoSum");if(sm)sm.textContent=cpEvoSummary(c,d,S.cp.chain)+" (offline: only what your catalogue knows)";const pb=$("#cpEvoPop");if(pb)pb.innerHTML=cpEvoHtml(c,d,S.cp.chain)}}
}
/* ---- where this card has been ---- */
function cpTrailHtml(g,c){
  const fmt=t=>{const dt=new Date(t);return isNaN(dt)?"":dt.toLocaleDateString(undefined,{day:"numeric",month:"short",year:"numeric"})};
  return g.map(x=>{
    const tr=trailOf(x).slice().reverse();const mv=tr.filter(e=>e.k==="moved").length;
    return `<div class="cp-jr${x.id===c.id?" cur":""}"><div class="cp-jh"><b>${esc(locLabel(x))}</b><small>${cpQ(x)>1?`×${cpQ(x)} · `:""}${x.id===c.id?"shown on this page · ":""}${mv} move${mv===1?"":"s"}</small></div>
    ${tr.length?`<ul class="cp-tl2">${tr.map(e=>`<li><time>${esc(fmt(e.t))}</time><span>${e.k==="moved"?`Moved from <b>${esc(e.from||"?")}</b> to <b>${esc(e.to||"?")}</b>`:`Added to <b>${esc(e.to||"?")}</b>`}</span></li>`).join("")}</ul>`:`<p class="cp-hint">No movements recorded yet.</p>`}</div>`}).join("");
}


function cpEvoSummary(c,d,chain){
  if(!chain)return "Looking up the line…";
  const names=[...(chain.prev2||[]),...(chain.prev||[]),dexBase(c.name),...(chain.next||[]),...(chain.next2||[])];
  if(names.length===1)return "No evolutions found for this Pokémon.";
  const own=names.filter((n,i)=>dexBase(n)===dexBase(c.name)||evoOwned(n).length).length;
  const lab=n=>titleCase(dexBase(n)===dexBase(c.name)?c.name:dexBase(n));
  return `${names.slice(0,5).map(lab).join(" → ")}${names.length>5?" …":""} · you own ${own} of ${names.length}`;
}
function cpEvoPopup(){
  const c=cpEnt();if(!c||document.querySelector(".cp-evpop"))return;const d=cpDet(c);
  const ov=document.createElement("div");ov.className="cp-evpop";ov.setAttribute("role","dialog");ov.setAttribute("aria-modal","true");ov.setAttribute("aria-label","Evolution map");
  ov.innerHTML=`<div class="cp-evbox"><div class="cp-evh"><b>Evolution map · ${esc(titleCase(dexBase(c.name)))}</b><button type="button" class="btn ghost sm" data-evclose>Close</button></div><div class="cp-evbody" id="cpEvoPop">${cpEvoHtml(c,d,(S.cp&&S.cp.chain)||null)}</div><p class="cp-hint" style="margin:10px 0 0">Click a card you own to open its page. Dashed cards are not in your catalogue yet.</p></div>`;
  const close=()=>{document.removeEventListener("keydown",k,true);ov.remove()};
  const k=e=>{if(e.key==="Escape"){e.stopPropagation();e.preventDefault();close()}};
  ov.addEventListener("click",e=>{
    if(e.target===ov||e.target.closest("[data-evclose]")){close();return}
    const g=e.target.closest("[data-cpgo]");if(g){const n=S.cards.find(x=>x.id===g.dataset.cpgo);close();if(n&&S.cp){S.cp.tab="overview";openCardPage(n,S.cp.seq)}}
  });
  document.addEventListener("keydown",k,true);document.body.appendChild(ov);ov.querySelector("[data-evclose]").focus();
}
document.addEventListener("click",e=>{const b=e.target.closest&&e.target.closest("#cardPage [data-cp=evomap]");if(b){e.stopPropagation();cpEvoPopup()}},true);
/* hover lift, tilt and shine on every card picture in the app (same feel as the binder pockets) */
(function(){
  const SEL=".pocket.filled,.thumb:not(.ph),.sctile .scimg,.v2th,.cp-mc,.dstack .cimg,.dkth .cimg,.dbox,.gcard .gimg,.cp-lb img,#editor img.fullcard";
  let cur=null,sh=null;
  const shine=()=>{if(!sh){sh=document.createElement("div");sh.id="tiltShine";document.body.appendChild(sh)}return sh};
  const reset=el=>{if(sh)sh.style.opacity=0;if(!el)return;el.style.transform="";el.style.setProperty("--sh",0);el.classList.remove("tilt-on")};
  const still=()=>{try{return matchMedia("(prefers-reduced-motion:reduce)").matches}catch{return false}};
  document.addEventListener("pointermove",e=>{
    if(e.pointerType!=="mouse"||e.buttons||still()){if(cur){reset(cur);cur=null}return}
    const el=e.target.closest&&e.target.closest(SEL);
    if(el!==cur){reset(cur);cur=el}
    if(!el)return;
    const r=el.getBoundingClientRect();if(!r.width||!r.height)return;
    const x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5,k=r.width<90?9:15;
    el.classList.add("tilt-on");el.style.transform=`perspective(700px) rotateY(${(x*k).toFixed(1)}deg) rotateX(${(-y*k).toFixed(1)}deg) translateY(-3px) scale(1.04)`;
    el.style.setProperty("--sh",1);el.style.setProperty("--sx",((x+.5)*100).toFixed(0)+"%");
    if(el.tagName==="IMG"){const s=shine(),rr=el.getBoundingClientRect();Object.assign(s.style,{left:rr.left+"px",top:rr.top+"px",width:rr.width+"px",height:rr.height+"px",borderRadius:getComputedStyle(el).borderRadius,opacity:1});s.style.setProperty("--sx",((x+.5)*100).toFixed(0)+"%")}
  },{passive:true});
  document.addEventListener("pointerdown",()=>{if(cur){reset(cur);cur=null}},true);
  document.documentElement.addEventListener("mouseleave",()=>{reset(cur);cur=null});
})();
document.addEventListener("submit",e=>{if(S.cp&&S.cp.edit&&e.target&&e.target.id==="editForm"&&e.target.closest("#cpEditHost")){e.preventDefault();cpSave()}},true);
const cpRoute=h=>{if(/^card\//.test(h)){const id=decodeURIComponent(h.slice(5));const c=S.cards.find(x=>x.id===id);if(c){if(S.cp&&S.cp.edit){cpEndEdit(true)}openCardPage(c,null,{pop:true,keep:true,inApp:true});return}h=(S.cp&&S.cp.from)||"collection"}if(S.cp&&S.cp.edit)cpEndEdit(true);show(h,{pop:true})};
const BKCSS=`.ovg+.ovg{margin-top:10px}.sech{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px}.sech h3{margin:0;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.sech .btn{height:34px;padding:0 12px;font-size:.9rem;font-weight:650;flex:none}.cover:not(.fs){max-width:var(--bkw,620px);margin-left:auto;margin-right:auto}.ftr{display:flex;align-items:center;gap:12px;margin:6px 2px 0;flex-wrap:wrap}.ftr .hint{flex:1;min-width:200px}.szl{display:flex;align-items:center;gap:8px;color:var(--muted);font-size:.85rem;font-weight:650}.szl input{width:80px;accent-color:var(--accent)}#tb2{display:none}#tb1 input[type=search]{width:105px;min-width:0;max-width:105px}#tb1{gap:6px}#tb1 .navl{min-width:84px}#m-pgs{left:auto;right:0}#tb1 #arrSel{width:112px;padding-left:8px;padding-right:4px}#tb1 #jump{width:104px;padding-left:8px;padding-right:4px}#tb1 input[type=search]{flex:none}.szl input{width:64px!important}.elgo{width:100%;background:none;border:0;border-top:1px solid var(--line,rgba(128,128,128,.25));text-align:left;font:inherit;color:inherit;cursor:pointer;border-radius:6px}.elgo:hover{background:var(--pocket)}.elgo span{color:var(--brand)}.kvb{background:var(--pocket);border:0;border-radius:10px;padding:8px 10px;text-align:left;font:inherit;color:inherit;cursor:pointer}.kvb:hover:not(:disabled){outline:2px solid var(--brand)}.kvb:disabled{cursor:default;opacity:.7}.kvb b{display:block;font-size:1.15rem}.kvb small{color:var(--muted)}.ellist{margin-top:8px;max-height:220px;overflow:auto}.elr{display:flex;flex-direction:column;padding:6px 0;border-top:1px solid var(--line,rgba(128,128,128,.25))}.elr span{color:var(--muted);font-size:.85rem}.ovmore{border:0;background:none;color:var(--brand);font-weight:700;font-size:.85rem;cursor:pointer;padding:4px 0}.ovmore:hover{text-decoration:underline}
.side>*{min-width:0}.side .tabs{flex-wrap:wrap;overflow:visible}.side .tab{flex:1 1 auto;white-space:nowrap}
.shelfbar{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:8px}
.shelfbar input[type=search]{border:1px solid var(--line);border-radius:10px;padding:8px 11px;background:var(--sheet);min-width:150px;max-width:230px;width:100%}
.seg{display:flex;background:var(--pocket);border-radius:11px;padding:3px;gap:2px}
.seg button{border:0;background:none;padding:6px 12px;border-radius:8px;font-weight:700;color:var(--muted);cursor:pointer;font-size:.85rem}
.seg button[aria-pressed="true"]{background:var(--sheet);color:var(--ink);box-shadow:0 1px 3px rgba(0,0,0,.12)}
.chk{display:inline-flex;gap:6px;align-items:center;color:var(--muted);font-size:.85rem;cursor:pointer}
.kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:12px}
@media(max-width:700px){.kpis{grid-template-columns:repeat(2,minmax(0,1fr))}}
.kpi{padding:10px 14px;min-width:0}
.kpi b{display:block;font-size:1.35rem;letter-spacing:-.01em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.kpi small{color:var(--muted);display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
*,*::before,*::after{box-sizing:border-box}
button,input,select{font:inherit;color:inherit}
.vh{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
.grow{flex:1;min-width:0}
.btn{font-weight:650;border:0;border-radius:10px;padding:9px 14px;cursor:pointer;background:var(--accent);color:var(--accent-ink);display:inline-flex;gap:6px;align-items:center;white-space:nowrap}
.btn:disabled{opacity:.45;cursor:not-allowed}
.btn.ghost{background:var(--sheet);color:var(--ink);border:1px solid var(--line)}.btn.ghost:hover:not(:disabled){background:var(--pocket)}
.btn.ghost[aria-pressed="true"]{background:color-mix(in srgb,var(--accent) 22%,var(--sheet));border-color:var(--accent)}
.btn.danger{background:var(--sheet);color:var(--danger);border:1px solid color-mix(in srgb,var(--danger) 45%,var(--line))}
.btn.sm{padding:5px 10px;font-size:.85rem;border-radius:8px}
.ib{width:36px;height:36px;border-radius:10px;border:1px solid var(--line);background:var(--sheet);cursor:pointer;display:grid;place-items:center;font-weight:800}
.ib:disabled{opacity:.35;cursor:not-allowed}.ib:hover:not(:disabled){background:var(--pocket)}
:is(.btn,.ib,.chip,.pocket,.thumb,.bchip,.tab,.sw):focus-visible{outline:2px solid var(--brand);outline-offset:2px}
.page{margin:0 0 40px}
.crumb{color:var(--muted);display:flex;gap:8px;align-items:center;margin-bottom:6px}.crumb b{color:var(--ink)}
h1{margin:0 0 2px;font-size:1.7rem;letter-spacing:-.02em}
.sub{color:var(--muted);margin:0}
.head{display:flex;gap:12px;align-items:flex-end;flex-wrap:wrap;margin-bottom:14px}
.card{background:var(--sheet);border:1px solid var(--line);border-radius:var(--radius);box-shadow:var(--shadow)}
/* shelf */
.shelf{display:flex;gap:10px;overflow:auto;padding:2px 2px 8px;margin-bottom:12px}
.bchip{flex:none;display:flex;gap:10px;align-items:center;padding:8px 14px 8px 8px;background:var(--sheet);border:1px solid var(--line);border-radius:12px;cursor:pointer;text-align:left;box-sizing:border-box;height:70px;width:250px}
.bchip[aria-pressed="true"]{border-color:var(--accent);box-shadow:0 0 0 2px color-mix(in srgb,var(--accent) 45%,transparent)}
.bcov{width:34px;height:46px;border-radius:4px 7px 7px 4px;background:var(--c);display:grid;place-items:center;color:#fff;font-weight:800;box-shadow:inset 5px 0 0 rgba(0,0,0,.25);flex:none}
.bchip b{display:block;line-height:1.2}.bchip>.grow,.dchip>span:last-child{min-width:0;flex:1}.bchip b,.dchip b{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.bchip small{color:var(--muted);font-size:.78rem}
.mbar{height:5px;border-radius:3px;background:var(--pocket);margin-top:5px;overflow:hidden}.mbar i{display:block;height:100%;background:var(--accent)}
.bchip.new{border-style:dashed;color:var(--muted);align-items:center;justify-content:center;width:160px;height:70px;box-sizing:border-box;font-weight:700;white-space:nowrap}
/* layout */
.layout{display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:16px;align-items:start}
@media(max-width:1060px){.layout{grid-template-columns:minmax(0,1fr)}.side{position:static!important}}
.side{position:sticky;top:12px;display:grid;gap:12px}
.view{padding:12px}
.tb{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:10px}
.tb .sep{width:1px;height:24px;background:var(--line);margin:0 2px}
.tb input[type=search]{border:1px solid var(--line);border-radius:10px;padding:8px 11px;background:var(--sheet);min-width:150px;max-width:230px;width:100%}
.tb input:focus,select:focus{outline:2px solid color-mix(in srgb,var(--brand) 45%,transparent);border-color:var(--brand)}
select{border:1px solid var(--line);border-radius:10px;padding:8px 10px;background:var(--sheet)}
.navl{font-weight:700;min-width:130px;text-align:center}.navl small{display:block;color:var(--muted);font-weight:500;font-size:.78rem}
.menu{position:relative}
.pop{position:absolute;z-index:30;top:calc(100% + 6px);left:0;min-width:230px;background:var(--sheet);border:1px solid var(--line);border-radius:12px;box-shadow:0 12px 32px rgba(0,0,0,.2);padding:6px;display:none}
.pop.open{display:block}
.pop button{display:block;width:100%;text-align:left;border:0;background:none;padding:8px 10px;border-radius:8px;cursor:pointer}
.pop button:hover:not(:disabled){background:var(--pocket)}.pop button small{display:block;color:var(--muted)}
.pop button:disabled{opacity:.4;cursor:not-allowed}
.pop hr{border:0;border-top:1px solid var(--line);margin:4px 0}
/* binder spread */
.cover{background:var(--cv);border-radius:10px 18px 18px 10px;padding:10px 10px 10px 22px;box-shadow:0 4px 0 rgba(0,0,0,.18),inset 12px 0 0 rgba(0,0,0,.2);position:relative}
.spread{display:grid;grid-template-columns:1fr 1fr;gap:3px;background:var(--pocket-edge);padding:3px;border-radius:6px}
@media(max-width:760px){.spread{grid-template-columns:1fr}.cover{padding-left:16px}}
.pg{background:var(--pocket);padding:8px;border-radius:4px;min-width:0}
.pgh{display:flex;align-items:center;gap:8px;font-size:.82rem;color:var(--muted);margin:0 2px 6px;font-weight:700}
.pgh b{color:var(--ink)}.pgh .grow{height:4px;background:var(--pocket-edge);border-radius:3px;overflow:hidden;flex:1}.pgh .grow i{display:block;height:100%;background:var(--accent)}
.grid9{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}
.pocket{position:relative;aspect-ratio:63/88;border-radius:6px;border:1px dashed var(--pocket-edge);background:color-mix(in srgb,var(--sheet) 55%,transparent);cursor:pointer;padding:0;display:grid;place-items:center;overflow:visible;transition:transform .12s,box-shadow .12s}
.pocket.empty{color:var(--muted)}.pocket.empty .n{position:absolute;left:5px;bottom:3px;font-size:.7rem}.pocket.empty .pl{font-size:1.5rem;opacity:.5}
.pocket.empty:hover{border-color:var(--accent);background:color-mix(in srgb,var(--accent) 10%,transparent)}.pocket.empty:hover .pl{opacity:1;color:var(--accent)}
.pocket.filled{border:0;box-shadow:0 2px 6px rgba(0,0,0,.25)}
.pocket.filled:hover{transform:translateY(-3px) scale(1.04);box-shadow:0 10px 22px rgba(0,0,0,.3);z-index:3}
.pocket .img{position:absolute;inset:0;border-radius:6px;overflow:hidden;background:linear-gradient(160deg,hsl(var(--h) 75% 55%),hsl(var(--h) 45% 18%))}
.pocket .img::before{content:attr(data-ch);position:absolute;inset:0;display:grid;place-items:center;color:#fff;font-weight:800;font-size:2rem;text-shadow:0 2px 6px rgba(0,0,0,.4)}
.pocket .img::after{content:"";position:absolute;inset:0;background:linear-gradient(115deg,transparent 30%,rgba(255,255,255,.35) 48%,transparent 66%);opacity:0;transition:opacity .2s;mix-blend-mode:overlay}
.pocket.filled:hover .img::after{opacity:1}
.pocket.sel{outline:3px solid var(--accent);outline-offset:2px}
.pocket.dim{opacity:.22;filter:grayscale(.7)}
.pocket.hit{outline:3px solid var(--brand);outline-offset:2px}
.pocket.over{outline:3px dashed var(--accent);outline-offset:2px;background:color-mix(in srgb,var(--accent) 18%,transparent)}
.pocket .nm{position:absolute;left:0;right:0;bottom:0;padding:3px 4px;font-size:.68rem;font-weight:700;color:#fff;background:linear-gradient(transparent,rgba(5,8,18,.85));border-radius:0 0 6px 6px;opacity:0;transition:opacity .15s;text-align:left;line-height:1.2}
.pocket.filled:hover .nm,.pocket.sel .nm{opacity:1}
.pocket .tag{position:absolute;top:4px;right:4px;font-size:.68rem;font-weight:800;padding:1px 6px;border-radius:99px;background:rgba(10,14,28,.78);color:#fff;z-index:2}
.pocket .q{position:absolute;top:4px;left:4px;font-size:.68rem;font-weight:800;padding:1px 6px;border-radius:99px;background:var(--accent);color:var(--accent-ink);z-index:2}
.pocket .dupdot{position:absolute;bottom:4px;right:4px;width:12px;height:12px;border-radius:50%;background:var(--brand);border:2px solid #fff;z-index:2}
.pocket .ck{position:absolute;top:4px;left:4px;width:20px;height:20px;border-radius:50%;background:var(--sheet);border:2px solid var(--pocket-edge);z-index:3;display:grid;place-items:center;font-size:.75rem;font-weight:900;color:var(--accent-ink)}
.pocket.sel .ck{background:var(--accent);border-color:var(--accent)}
.edgebtn{position:absolute;top:50%;transform:translateY(-50%);width:30px;height:60px;border:0;border-radius:8px;background:rgba(0,0,0,.35);color:#fff;font-size:1.3rem;cursor:pointer;z-index:5;opacity:0;transition:opacity .15s}
.cover:hover .edgebtn,.edgebtn.drag,.edgebtn:focus-visible{opacity:.9}.edgebtn:disabled{display:none}
.edgebtn.l{left:-2px}.edgebtn.r{right:-2px}
.cover.fs{position:fixed;inset:0;z-index:50;border-radius:0;overflow:auto;display:flex;align-items:center;justify-content:center;padding:20px}
.cover.fs .spread{width:min(100%,calc((100dvh - 60px) * 1.38))}
.fsx{position:absolute;top:10px;right:14px;z-index:6;display:none}.cover.fs .fsx{display:block}
/* strip */
.strip{display:flex;gap:8px;overflow:auto;padding:12px 2px 4px}
.thumb{flex:none;border:2px solid transparent;border-radius:8px;background:var(--pocket);padding:4px;cursor:pointer;text-align:center;font-size:.72rem;color:var(--muted);font-weight:700}
.thumb.dim{opacity:.28;filter:grayscale(.85)}.thumb.dim.cur{opacity:.55}.thumb.cur{border-color:var(--accent);background:color-mix(in srgb,var(--accent) 12%,var(--pocket))}
.thumb.over{border-color:var(--brand);background:color-mix(in srgb,var(--brand) 14%,var(--pocket))}
.mini{display:grid;grid-template-columns:repeat(3,7px);gap:2px;margin-bottom:3px}.mini i{width:7px;height:10px;border-radius:1px;background:var(--pocket-edge)}.mini i.f{background:var(--accent)}
.sbar{display:none;align-items:center;gap:8px;flex-wrap:wrap;padding:10px 12px;margin-top:10px;border-radius:12px;background:var(--sheet);color:var(--ink);border:1px solid var(--line);border-left:4px solid var(--accent);box-shadow:0 6px 18px rgba(0,0,0,.18)}
.sbar.on{display:flex}.sbar>b{font-weight:800;margin-right:4px}.sbar .btn.ghost{background:var(--pocket);color:var(--ink);border:1px solid var(--line)}.sbar .btn.ghost:hover{border-color:var(--accent);color:var(--accent)}.sbar .btn.danger{background:transparent;color:var(--danger);border:1px solid color-mix(in srgb,var(--danger) 55%,var(--line))}.sbar .btn.danger:hover{background:color-mix(in srgb,var(--danger) 14%,transparent)}.sbar .pop{background:var(--sheet);border:1px solid var(--line);color:var(--ink)}
/* side */
.sec{padding:14px 16px}.sec h3{margin:0 0 10px;font-size:.78rem;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}
.ring{display:flex;gap:14px;align-items:center}
.ringc{--p:0;width:78px;height:78px;border-radius:50%;background:conic-gradient(var(--accent) calc(var(--p)*1%),var(--pocket) 0);display:grid;place-items:center;flex:none}
.ringc span{width:58px;height:58px;border-radius:50%;background:var(--sheet);display:grid;place-items:center;font-weight:800}
.kv{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}
.kv div{background:var(--pocket);border-radius:10px;padding:8px 10px}.kv b{display:block;font-size:1.15rem}.kv small{color:var(--muted)}
.tabs{display:flex;background:var(--pocket);border-radius:11px;padding:3px;gap:2px;margin:0 16px 12px}
.tab{flex:1;border:0;background:none;padding:6px 8px;border-radius:8px;font-weight:700;color:var(--muted);cursor:pointer;font-size:.85rem}
.tab[aria-selected="true"]{background:var(--sheet);color:var(--ink);box-shadow:0 1px 3px rgba(0,0,0,.12)}
.bar{display:grid;grid-template-columns:90px 1fr 30px;gap:8px;align-items:center;font-size:.85rem;margin:5px 0}
.bar i{display:block;height:8px;border-radius:4px;background:var(--pocket);overflow:hidden}.bar i s{display:block;height:100%;background:var(--brand);border-radius:4px}.bar span:last-child{text-align:right;font-weight:700}
.chips{display:flex;flex-wrap:wrap;gap:6px}.chip{border:1px solid var(--line);background:var(--sheet);border-radius:99px;padding:4px 10px;font-size:.82rem;font-weight:650;cursor:pointer}.chip:hover{background:var(--pocket)}
.insp{display:flex;gap:12px}.insp .im{width:84px;aspect-ratio:63/88;border-radius:7px;flex:none;background:linear-gradient(160deg,hsl(var(--h) 75% 55%),hsl(var(--h) 45% 18%));display:grid;place-items:center;color:#fff;font-size:2rem;font-weight:800;box-shadow:0 4px 12px rgba(0,0,0,.3)}
.insp b{font-size:1.05rem}.insp small{color:var(--muted);display:block}
.acts{display:flex;gap:6px;flex-wrap:wrap;margin-top:12px}
.tray{display:grid;gap:6px;max-height:300px;overflow:auto}
.tr{display:flex;gap:10px;align-items:center;padding:6px;border-radius:10px;border:1px solid var(--line);cursor:grab;background:var(--sheet)}
.tr .im{width:30px;aspect-ratio:63/88;border-radius:4px;background:linear-gradient(160deg,hsl(var(--h) 75% 55%),hsl(var(--h) 45% 18%));color:#fff;display:grid;place-items:center;font-weight:800;font-size:.85rem;flex:none}
.tr small{color:var(--muted);display:block}
.log{display:grid;gap:6px;font-size:.85rem;max-height:200px;overflow:auto}.log div{color:var(--muted)}.log b{color:var(--ink)}
.toastx{position:fixed;left:50%;bottom:20px;transform:translateX(-50%);background:var(--ink);color:var(--bg);padding:10px 14px;border-radius:12px;display:none;gap:14px;align-items:center;z-index:80;box-shadow:0 10px 30px rgba(0,0,0,.35);max-width:92vw}
.toastx.on{display:flex}.toastx button{background:none;border:0;color:var(--accent);font-weight:800;cursor:pointer}
dialog{border:1px solid var(--line);border-radius:16px;background:var(--sheet);color:var(--ink);padding:0;width:min(480px,94vw);box-shadow:0 20px 60px rgba(0,0,0,.4)}
dialog::backdrop{background:rgba(8,10,20,.5)}
.dlg{padding:18px}.dlg h2{margin:0 0 12px;font-size:1.2rem}
.dlg label{display:grid;gap:4px;font-weight:650;font-size:.85rem;color:var(--muted);margin-bottom:12px}
.dlg input[type=text],.dlg input[type=search]{border:1px solid var(--line);border-radius:10px;padding:9px 11px;background:var(--sheet);width:100%}
.sws{display:flex;gap:8px;flex-wrap:wrap}.sw{width:32px;height:32px;border-radius:50%;border:3px solid transparent;background:var(--c);cursor:pointer}.sw[aria-pressed="true"]{border-color:var(--ink)}
.stp{display:inline-flex;align-items:center;border:1px solid var(--line);border-radius:10px}.stp button{border:0;background:none;width:34px;height:36px;cursor:pointer;font-weight:800}.stp span{min-width:40px;text-align:center;font-weight:700}
.frow{display:flex;gap:8px;justify-content:flex-end;margin-top:14px}
.hint{color:var(--muted);font-size:.82rem}
@media(prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}}

:host{display:block;color:var(--ink);font:inherit}
h1{margin:0 0 2px;font-size:1.7rem;letter-spacing:-.02em;font-family:inherit}
.btn,.ib,.chip,.tab,.bchip,.thumb,.pocket,.sw{font-family:inherit}
.btn svg{width:18px;height:18px;flex:none}
.pocket{user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;touch-action:pan-y}
.pocket.filled.tilt{transition:box-shadow .12s}
.pocket .img img{width:100%;height:100%;object-fit:cover;display:block;-webkit-user-drag:none}
.pocket .img.has::before{display:none}
.pocket .img{background:linear-gradient(160deg,var(--col,#8a94a8),color-mix(in srgb,var(--col,#8a94a8) 22%,#000))}
.pocket .img.has{background:#000}
.pocket.landed{animation:land .9s ease-out 3}
@keyframes land{0%{box-shadow:0 0 0 0 color-mix(in srgb,var(--accent) 90%,transparent)}100%{box-shadow:0 0 0 14px transparent}}
.pocket.fdrop{outline:3px dashed var(--brand);outline-offset:2px}
.bghost{position:fixed;left:0;top:0;z-index:200;pointer-events:none;width:92px;aspect-ratio:63/88;border-radius:7px;overflow:hidden;box-shadow:0 14px 30px rgba(0,0,0,.4);transform-origin:0 0}
.bghost .img{position:absolute;inset:0;display:grid;place-items:center;color:#fff;font-weight:800;font-size:2rem}
.bghost img{width:100%;height:100%;object-fit:cover}
.bghost b{position:absolute;right:4px;top:4px;background:var(--accent);color:var(--accent-ink);border-radius:99px;font-size:.72rem;padding:1px 7px}
.dragging .pocket.empty{border-color:color-mix(in srgb,var(--accent) 70%,var(--pocket-edge))}
.lifted{opacity:.35}
.bcov img{width:100%;height:100%;object-fit:cover;border-radius:4px 7px 7px 4px}
.cvimg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.pg.cvr{display:grid;place-items:center;min-height:240px;color:var(--muted);background:repeating-linear-gradient(45deg,var(--pocket),var(--pocket) 10px,var(--pocket-edge) 10px,var(--pocket-edge) 11px);position:relative;overflow:hidden}
@media(prefers-reduced-motion:no-preference){.spread.in-next{animation:bTN .24s ease-out}.spread.in-prev{animation:bTP .24s ease-out}}
@keyframes bTN{from{opacity:.4;transform:translateX(26px)}to{opacity:1;transform:none}}
@keyframes bTP{from{opacity:.4;transform:translateX(-26px)}to{opacity:1;transform:none}}
.empty-state{padding:36px 20px;text-align:center;color:var(--muted)}
.empty-state b{display:block;color:var(--ink);font-size:1.1rem;margin-bottom:6px}
.stat{font-size:.82rem;color:var(--muted);margin:4px 0 0}
.dlg .status{font-size:.85rem;color:var(--muted);min-height:1.2em}
.dlg .status.err{color:var(--danger)}
.dlg input[type=color]{width:44px;height:32px;padding:2px;border:1px solid var(--line);border-radius:8px;background:var(--sheet)}
.cvprev{display:flex;gap:12px;align-items:center;margin-bottom:12px}
.cvprev .bcov{width:52px;height:70px;font-size:1.2rem;position:relative;overflow:hidden}

input:focus,select:focus,.dlg input:focus{outline:2px solid color-mix(in srgb,var(--brand) 45%,transparent);outline-offset:0;border-color:var(--brand)}

.layout>*,.page{min-width:0}
[hidden]{display:none!important}
`;
/* ===== Binders page (matches the approved prototype). Runs in a shadow root so its styles never clash with the rest of the app. ===== */
const bk={ft:"all",has:false,bq:"",sel:new Set(),selMode:false,vals:false,dups:false,q:"",tab:"over",fs:false,drag:null,turn:null,suppress:0,landed:null,edit:null};
let bkR=null;
const bkq=s=>bkR.querySelector(s),bkqa=s=>[...bkR.querySelectorAll(s)];
const bkEur=n=>"€"+(+n||0).toFixed(2);
const bkIsPlaced=c=>c.locType==="binder"&&+c.binder>0&&+c.page>0&&+c.slot>0;
const bkNoId=({id,...r})=>r;
const bkN=()=>{const nums=binderNums();let n=+$("#binderNo").value;if(!nums.includes(n))n=nums.includes(1)?1:(nums[0]||1);return n};
const bkCol=c=>cpColor(c,c.details);
const bkType=c=>{const d=c.details;if(!d)return"Unknown";const sup=String(d.supertype||"").toLowerCase();if(sup.startsWith("trainer"))return"Trainer";if(sup.startsWith("energy"))return"Energy";return(d.types||[])[0]||"Colorless"};
function bkInfo(){const I=spreadInfo();const n=+I.b;const spreads=I.total/2+1;const v=I.cur===1?0:Math.floor(I.L/2);return{...I,n,spreads,v}}
function bkAt(I,p,s){return I.inB.find(c=>+c.page===p&&+c.slot===s)}
function bkUnplaced(){return S.cards.filter(c=>c.locType!=="deck"&&c.locType!=="showcase"&&!bkIsPlaced(c)&&!S.review.some(r=>r.id===c.id))}
function bkDupOf(c){const k=cardKey(c);return S.cards.some(x=>x.id!==c.id&&cardKey(x)===k)}
function bkGoSpread(v){const I=bkInfo();v=Math.max(0,Math.min(I.spreads-1,v));if(v!==I.v)bk.turn=v>I.v?"next":"prev";$("#pageNo").value=v===0?1:v*2;renderBinder()}
function bkHit(c){const q=bk.q.trim().toLowerCase();return q&&[c.name,c.set,c.setCode,c.number,bkType(c)].join(" ").toLowerCase().includes(q)}

/* ---------- skeleton ---------- */
function bkInit(){
  const h=document.getElementById("bkHost");if(!h||bkR)return;
  bkR=h.attachShadow({mode:"open"});
  bkR.innerHTML=`<style>${BKCSS}</style><div class="page">
  <div class="head"><div class="grow"><h1>Binders</h1><p class="sub" id="sub"></p></div></div>
  <div class="kpis" id="kpis"></div>
  <div class="shelfbar" id="shelfbar">
    <div class="seg" id="bfilt" role="group" aria-label="Show binders"><button type="button" data-bf="all" aria-pressed="true">All</button><button type="button" data-bf="space" aria-pressed="false">Has space</button><button type="button" data-bf="full" aria-pressed="false">Full</button></div>
    <label class="chk"><input type="checkbox" id="bHas"> With cards only</label>
    <span class="grow"></span>
    <label><span class="vh">Search binders</span><input id="bsearch" type="search" placeholder="Search binders"></label>
  </div>
  <div class="shelf" id="shelf"></div>
  <div id="none" class="card empty-state" hidden><b>No binders yet</b>Create your first binder, then scan a page into it or add cards by hand.</div>
  <div class="layout" id="lay">
    <section class="card view" aria-label="Binder pages">
      <div class="tb" id="tb1"></div><div class="tb" id="tb2"></div>
      <div class="cover" id="cover"><button class="btn ghost sm fsx" id="fsx" type="button">Close full screen</button><button class="edgebtn l" id="eL" type="button" aria-label="Previous pages">‹</button><div class="spread" id="spread"></div><button class="edgebtn r" id="eR" type="button" aria-label="Next pages">›</button></div>
      <div class="sbar" id="sbar" role="status"></div>
      <div class="strip" id="strip" aria-label="All pages"></div>
      <div class="ftr"><p class="hint" style="margin:0">Drag cards between pockets or onto a page thumbnail. Everything can be undone.</p></div>
    </section>
    <aside class="side" id="side"></aside>
  </div></div>
  <dialog id="editDlg"><div class="dlg" id="editBody"></div></dialog><dialog id="addDlg"><div class="dlg" id="addBody"></div></dialog>`;
  bkBind();
  bkR.addEventListener("change",async e=>{if(e.target.id==="arrSel"&&e.target.value){const v=e.target.value;e.target.value="";await bkArrange(v)}});
  bkR.addEventListener("input",e=>{if(e.target.id==="bkSize"){BKS.f=e.target.value/100;try{localStorage.setItem("pk-bk-size",String(BKS.f))}catch(x){}bkq("#cover").style.setProperty("--bkw",Math.round(BKS.min+BKS.f*(BKS.max-BKS.min))+"px")}});
  {let t;addEventListener("resize",()=>{clearTimeout(t);t=setTimeout(()=>{if(S.screen==="binders")bkFit()},120)})}
  bkR.addEventListener("click",e=>{{const g=e.target.closest&&e.target.closest(".elgo");if(g){const t=g.dataset.gt;if(t==="binder"&&+g.dataset.gb){openBinder(+g.dataset.gb);const p=+g.dataset.gp||1;if(p>1){bkGoSpread(Math.floor(p/2))}bk.sel=new Set([g.dataset.gi]);bk.where=null;bkFlash([g.dataset.gi],2600);bkRefresh();setTimeout(()=>{const el=bkq('.pocket[data-id="'+g.dataset.gi+'"]');el&&el.scrollIntoView({block:"center",behavior:"smooth"})},60)}else if(t==="deck"&&g.dataset.gd){show("decks");openDeck(g.dataset.gd)}else if(t==="showcase"){show("showcase")}return}}if(e.target.closest&&e.target.closest("[data-elsewhere]")){bk.else=!bk.else;bkSide();return}const b=e.target.closest&&e.target.closest("[data-ovmore]");if(b){bk.ov=bk.ov||{};bk.ov[b.dataset.ovmore]=!bk.ov[b.dataset.ovmore];bkSide()}});
  bkR.getElementById("bfilt").addEventListener("click",e=>{const b=e.target.closest("[data-bf]");if(!b)return;bk.ft=b.dataset.bf;bkRefresh()});
  bkR.getElementById("bHas").addEventListener("change",e=>{bk.has=e.target.checked;bkRefresh()});
  bkR.getElementById("bsearch").addEventListener("input",e=>{bk.bq=e.target.value;bkShelf(binderNums())});
}
/* ---------- render ---------- */
/* binder size: slider between a minimum and the largest size that still fits the window without a page scrollbar */
const BKS={min:440,max:620,f:(()=>{try{const v=parseFloat(localStorage.getItem("pk-bk-size"));return isNaN(v)?null:Math.max(0,Math.min(1,v))}catch(e){return null}})()};
function bkFit(){
  const c=bkq("#cover"),v=bkq(".view");if(!c||!v||bk.fs||!bkR.host.offsetParent)return;
  if(innerWidth<=760){c.style.removeProperty("--bkw");return}
  const bottom=()=>v.getBoundingClientRect().bottom+scrollY,set=w=>{c.style.setProperty("--bkw",w+"px");return bottom()};
  const avail=Math.floor(v.clientWidth-32);
  set(900);const dh=document.documentElement.scrollHeight,pad=Math.max(0,dh-bottom())||100;
  const w1=300,w2=500,b1=set(w1),b2=set(w2),m=(b2-b1)/(w2-w1);
  let fit=m>0?Math.floor(w1+(innerHeight-pad-2-b1)/m):avail;
  if(fit<BKS.min)fit=Math.min(620,avail);
  else{fit=Math.min(fit,avail);set(fit);const over=document.documentElement.scrollHeight-innerHeight;if(over>0&&m>0)fit=Math.max(BKS.min,fit-Math.ceil(over/m)-1)}
  const full=Math.max(avail,fit,BKS.min+1);BKS.max=full;BKS.fit=fit;
  const w=BKS.f==null?fit:Math.round(BKS.min+BKS.f*(full-BKS.min));
  const sl=bkq("#bkSize");if(sl)sl.value=Math.round((w-BKS.min)/(full-BKS.min)*100);
  c.style.setProperty("--bkw",w+"px");
}
function bkRefresh(){
  if(!bkR){bkInit();if(!bkR)return}
  if(S.screen!=="binders")return;
  const nums=binderNums();const n=bkN();if(nums.length&&String($("#binderNo").value)!==String(n)){$("#binderNo").value=n}
  const act=bkR.activeElement,keep=act&&act.id==="q"?[act.selectionStart,act.selectionEnd]:null;
  bkq("#lay").hidden=!nums.length;bkq("#shelfbar").hidden=!nums.length;bkq("#none").hidden=!!nums.length;
  const entries=S.cards.filter(c=>c.locType==="binder"&&+c.binder>0).reduce((a,c)=>a+(+c.qty||1),0);
  bkq("#sub").textContent=nums.length?`${entries} cards across ${nums.length} ${nums.length===1?"binder":"binders"}`:"Organise your cards into binders.";
  bkShelf(nums);
  {const bc=S.cards.filter(c=>c.locType==="binder"&&+c.binder>0),free=nums.reduce((a,n)=>{const st=binderStats(n);return a+Math.max(0,(st.cap||0)-st.filled)},0);
   bkq("#kpis").innerHTML=ptKpis(bc,"Cards in binders","Binders",nums.length,nums.length&&free?plural(free,"free pocket"):"");}
  if(nums.length){bkTb();bkSpread();bkStrip();bkSbar();bkSide()}
  bkq("#cover").classList.toggle("fs",bk.fs);bkFit();document.body.style.overflow=bk.fs?"hidden":"";
  if(keep){const q=bkq("#q");if(q){q.focus();q.setSelectionRange(keep[0],keep[1])}}
}
function bkShelf(nums){
  const cur=bkN();
  bkq("#bfilt").querySelectorAll("[data-bf]").forEach(x=>x.setAttribute("aria-pressed",String(x.dataset.bf===bk.ft)));
  bkq("#bHas").checked=bk.has;
  const bq=bk.bq.trim().toLowerCase(),all=nums.length;
  nums=nums.filter(n=>{const st=binderStats(n);
    if(bk.ft==="space"&&!(st.cap&&st.filled<st.cap))return false;
    if(bk.ft==="full"&&!(st.cap&&st.filled>=st.cap))return false;
    if(bk.has&&!st.filled)return false;
    if(bq&&!(binderName(n).toLowerCase().includes(bq)||String(n)===bq))return false;
    return true});
  bkq("#shelf").innerHTML=nums.map(n=>{const st=binderStats(n),b=S.binders[n]||{};const pct=st.cap?Math.min(100,Math.round(st.filled/st.cap*100)):0;
    return `<button type="button" class="bchip" data-bn="${n}" aria-pressed="${n===cur}"><span class="bcov" style="--c:${binderColor(n)}">${b.cover?`<img alt="" draggable="false" src="${PKL.blob(b.cover)}">`:n}</span><span class="grow"><b>${esc(binderName(n))}</b><small>${st.filled} of ${st.cap||0} pockets · ${st.pages||0} pages</small><div class="mbar"><i style="width:${pct}%"></i></div></span></button>`}).join("")+`<button type="button" class="bchip new" id="newB">+ New binder</button>`;
  if(!nums.length&&all)bkq("#shelf").insertAdjacentHTML("afterbegin",`<p class="sub" style="align-self:center;padding:0 12px">No binder matches these filters.</p>`);
}
function bkTb(){
  const I=bkInfo(),sp=I.spreads,v=I.v,pages=I.total;
  const lbl=v===0?"Page 1":v===sp-1?`Page ${pages}`:`Pages ${v*2}–${v*2+1}`;
  bkq("#tb1").innerHTML=`<button class="ib" id="n0" ${v===0?"disabled":""} aria-label="First">⏮</button><button class="ib" id="n1" ${v===0?"disabled":""} aria-label="Previous">‹</button><div class="navl">${lbl}<small>of ${pages} pages</small></div><button class="ib" id="n2" ${v===sp-1?"disabled":""} aria-label="Next">›</button><button class="ib" id="n3" ${v===sp-1?"disabled":""} aria-label="Last">⏭</button><select id="jump" aria-label="Jump to page">${Array.from({length:sp},(_,i)=>`<option value="${i}" ${i===v?"selected":""}>${i===0?"Page 1":i===sp-1?"Page "+pages:`Pages ${i*2}–${i*2+1}`}</option>`).join("")}</select><label><span class="vh">Arrange</span><select id="arrSel" aria-label="Arrange"><option value="">Arrange…</option><option value="dex">By Pokédex number</option><option value="set">By set, then number</option><option value="type">By type</option><option value="rar">By rarity, rarest first</option><option value="val">By value, highest first</option><option value="name">By name</option><option value="gaps">Close gaps only</option></select></label><label class="szl">Size<input type="range" id="bkSize" min="0" max="100" step="1" aria-label="Binder size"></label><span class="grow"></span><button class="btn ghost sm" id="nextFree" type="button">Go to next free pocket</button><button class="btn ghost sm" type="button" id="editB">✎ Edit binder</button><button class="ib" id="fsb" aria-label="Full screen" title="Full screen (F)">⛶</button><span class="menu"><button class="ib" data-m="pgs" aria-label="Pages" title="Pages">⋮</button><div class="pop" id="m-pgs"><button data-pg="ins">Insert empty page here<small>Shifts later pages on by one</small></button><button data-pg="rm">Remove an empty page<small>Closes the gap after it</small></button><button data-pg="add">Add a sheet (2 pages)</button><hr><button data-pg="clear" style="color:var(--danger)">Take all cards off this spread<small>They go to Unplaced, not deleted</small></button><hr><button data-bdet="1">Update card details from TCGdex<small>Only the cards in this binder</small></button></div></span>`;
  bkq("#tb2").innerHTML=`<input type="search" id="q" placeholder="Find card" aria-label="Find a card in this binder" value="${esc(bk.q)}"><button class="btn ghost sm" id="tSel" aria-pressed="${bk.selMode}">☑ Select</button><button class="btn ghost sm" id="tDup" aria-pressed="${bk.dups}">⧉ Duplicates</button>`;
  {const t2=bkq("#tb2"),nf=bkq("#nextFree"),fr=document.createDocumentFragment();while(t2.firstChild)fr.appendChild(t2.firstChild);nf.replaceWith(fr)}
  {const sl=bkq("#bkSize"),c=bkq("#cover"),w=c&&parseFloat(c.style.getPropertyValue("--bkw"));if(sl&&w&&BKS.max>BKS.min)sl.value=Math.round((w-BKS.min)/(BKS.max-BKS.min)*100)}
}
function bkPocket(I,p,s,hasQ){
  const c=bkAt(I,p,s);
  if(!c)return `<button class="pocket empty" data-p="${p}" data-s="${s}" aria-label="Empty pocket ${s}, page ${p}. Add a card"><span class="pl">+</span><span class="n">${s}</span></button>`;
  const cls=["pocket","filled"];if(bk.sel.has(c.id))cls.push("sel");{const hf=bk.hl?dpHlFn(bk.hl):null;const bad=(hasQ&&!bkHit(c))||(hf&&!hf(c));if(hasQ&&!bad)cls.push("hit");if(bad)cls.push("dim")}if(bk.landed&&bk.landed.has(c.id))cls.push("landed");
  const src=cpThumb(c);const q=+c.qty||1,u=unitVal(c);
  return `<button class="${cls.join(" ")}" data-id="${esc(c.id)}" data-p="${p}" data-s="${s}" style="--col:${bkCol(c)}" aria-label="${esc(c.name)}, ${esc(c.set||c.setCode||"")}, page ${p} pocket ${s}${bk.sel.has(c.id)?", selected":""}"><span class="img${src?" has":""}" data-ch="${esc(String(c.name||"?")[0])}">${src?`<img alt="" draggable="false" loading="lazy" src="${esc(src)}">`:""}</span>${bk.selMode?`<span class="ck">${bk.sel.has(c.id)?"✓":""}</span>`:q>1?`<span class="q">×${q}</span>`:""}${bk.vals&&u!=null?`<span class="tag">${bkEur(u*q)}</span>`:""}${bk.dups&&bkDupOf(c)?`<span class="dupdot" title="You own this card elsewhere too"></span>`:""}<span class="nm">${esc(c.name)}</span></button>`;
}
function bkPage(I,p){
  const camera=`<button class="btn ghost sm" data-scanp="${p}" type="button" title="Scan a photo of the whole page ${p}" aria-label="Scan a photo of page ${p}">${icoSvg("scan")}</button><button class="btn ghost sm" data-textp="${p}" type="button" title="Import page ${p} from text" aria-label="Import page ${p} from text">${icoSvg("text")}</button>`;
  if(p<1||p>I.total){const cv=p<1&&S.binders[I.n]&&S.binders[I.n].cover;return `<div class="pg cvr">${cv?`<img class="cvimg" alt="" src="${PKL.blob(cv)}">`:p<1?"Inside front cover":"Inside back cover"}</div>`}
  const hasQ=!!bk.q.trim();const n=new Set(I.inB.filter(c=>+c.page===p&&+c.slot).map(c=>+c.slot)).size;
  return `<div class="pg" data-page="${p}"><div class="pgh"><b>Page ${p}</b><span>${n} of 9</span><span class="grow"><i style="width:${n/9*100}%"></i></span>${camera}</div><div class="grid9">${Array.from({length:9},(_,i)=>bkPocket(I,p,i+1,hasQ)).join("")}</div></div>`;
}
function bkSpread(){
  const I=bkInfo();const L=I.v*2,R=I.v*2+1;const turn=bk.turn;bk.turn=null;
  const sp=bkq("#spread");sp.className="spread"+(turn?" in-"+turn:"");
  const cv=bkq("#cover");cv.style.setProperty("--cv",binderColor(I.n));
  sp.innerHTML=bkPage(I,L)+bkPage(I,R);bkq("#eL").disabled=I.v===0;bkq("#eR").disabled=I.v===I.spreads-1;
}
function bkStrip(){
  const I=bkInfo();const L=I.v*2,R=I.v*2+1;const hf=bk.hl?dpHlFn(bk.hl):null;
  bkq("#strip").innerHTML=Array.from({length:I.total},(_,i)=>{const p=i+1,cur=p===L||p===R;const dim=hf&&!Array.from({length:9},(_,s)=>bkAt(I,p,s+1)).some(c=>c&&hf(c));return `<button type="button" class="thumb${cur?" cur":""}${dim?" dim":""}" data-thumb="${p}" aria-label="Page ${p}"><div class="mini">${Array.from({length:9},(_,s)=>`<i class="${bkAt(I,p,s+1)?"f":""}"></i>`).join("")}</div>${p}</button>`}).join("");
}
function bkSbar(){
  const I=bkInfo();const ids=new Set(S.cards.map(c=>c.id));for(const id of [...bk.sel])if(!ids.has(id))bk.sel.delete(id);
  const n=bk.sel.size;const el=bkq("#sbar");el.classList.toggle("on",n>0);if(!n){el.innerHTML="";return}
  el.innerHTML=`<b>${n} selected</b><span class="menu"><button class="btn ghost sm" data-m="mv">Move to page ▾</button><div class="pop" id="m-mv" style="bottom:calc(100% + 6px);top:auto;max-height:260px;overflow:auto">${Array.from({length:I.total},(_,i)=>`<button data-mvp="${i+1}">Page ${i+1}<small>${9-new Set(I.inB.filter(c=>+c.page===i+1&&+c.slot).map(c=>+c.slot)).size} free</small></button>`).join("")}</div></span><button class="btn ghost sm" data-sb="page">Select whole spread</button><button class="btn ghost sm" data-sb="take">Take out of binder</button><button class="btn danger sm" data-sb="del">Delete</button><span class="grow"></span><button class="btn ghost sm" data-sb="clear">Clear</button>`;
}
function bkSide(){
  const I=bkInfo(),st=binderStats(I.n),all=I.inB;
  const val=all.reduce((a,c)=>a+(unitVal(c)||0)*(+c.qty||1),0),pc=st.cap?Math.round(st.filled/st.cap*100):0;
  const free=(()=>{for(let p=1;p<=I.total;p++)for(let s=1;s<=9;s++)if(!bkAt(I,p,s))return[p,s];return null})();
  let one=bk.sel.size===1?S.cards.find(c=>c.id===[...bk.sel][0]):null;if(!one){const sp=I.inB.filter(c=>+c.slot&&(+c.page===I.v*2||+c.page===I.v*2+1)).sort((a,b)=>(+a.page)-(+b.page)||(+a.slot)-(+b.slot));one=sp[0]||I.inB.filter(c=>+c.slot).sort((a,b)=>(+a.page)-(+b.page)||(+a.slot)-(+b.slot))[0]||null}bk.pcard=one?one.id:null;let h="";
  h+=`<div class="card sec"><div class="sech"><h3>${esc(binderName(I.n))}</h3></div><div class="ring"><div class="ringc" style="--p:${pc}"><span>${pc}%</span></div><div><b>${st.filled} of ${st.cap||0} pockets filled</b><div class="hint">${Math.max(0,(st.cap||0)-st.filled)} free · next free: ${free?`page ${free[0]}, pocket ${free[1]}`:"none"}</div></div></div><div class="kv"><div><b>${st.copies}</b><small>copies</small></div><div><b>${st.unique}</b><small>different cards</small></div><div><b>${bkEur(val)}</b><small>estimated value</small></div><button type="button" class="kvb" data-elsewhere="1" aria-expanded="${!!bk.else}" ${all.some(bkDupOf)?"":"disabled"}><b>${all.filter(bkDupOf).length}</b><small>also owned elsewhere</small></button></div>${bk.else?(()=>{const here=bk.cur,loc=x=>x.locType==="binder"&&x.binder?binderName(x.binder)+(x.page?" · page "+x.page:""):(x.locType==="showcase"?"Showcase":"Deck")+(x.deck?" · "+x.deck:""),rows=all.filter(bkDupOf).map(c=>{const o=S.cards.filter(x=>x.id!==c.id&&cardKey(x)===cardKey(c)).map(loc);return `<div class="elr"><b>${esc(c.name)}</b><span>${esc([...new Set(o)].join(", ")||"Unplaced")}</span></div>`}).join("");return `<div class="ellist">${rows}</div>`})():""}</div>`;
  {if(bk.hlN!==I.n){bk.hl=null;bk.hlN=I.n}bk.btab=bk.btab||"type";const BA=dkAnalyse(dkAgg(I.inB.filter(c=>+c.slot)),"standard");
   h+=`<div class="card sec"><h3>Breakdown <span class="hint">click a bar to highlight</span></h3>${bk.hl?`<span class="pkhl">Highlighting: ${esc(dpHlLabel(bk.hl))} <button type="button" data-clearhl aria-label="Clear highlight">✕</button></span>`:""}<div class="tabs" role="tablist">${PK_BTABS.map(([k,t])=>`<button class="tab" role="tab" data-btab="${k}" aria-selected="${bk.btab===k}">${t}</button>`).join("")}</div>
   ${pkBars(BA,dkAgg(I.inB.filter(c=>+c.slot)),bk.btab,bk.hl)}</div>`}
  if(one){const _u=unitVal(one),_q=+one.qty||1;h+=pkPanel(one,{zoom:'data-i="zoom"',facts:[['Price',_u!=null?bkEur(_u)+(_q>1?` × ${_q}`:''):'No price yet'],['Rarity',pkRar(one.rarity)],['Energy type',pkEn(one)],['Copies','×'+_q]],acts:`<button class="btn sm" data-i="open">Open card page</button><button class="btn danger sm" data-i="del">Delete card</button>`,extra:`${(()=>{const o=S.cards.filter(c=>cardKey(c)===cardKey(one)).sort((a,b)=>(b.id===one.id)-(a.id===one.id));return `<div class="pkp-wl">Where</div><div class="ellist" style="margin-top:0">${o.map(c=>c.id===one.id?`<div class="pkelc"><span style="color:inherit;font-size:.9rem;font-weight:600">${(+c.qty||1)>1?"×"+(+c.qty)+" · ":""}${esc(locLabel(c))} · this card</span></div>`:`<button type="button" class="elr elgo" data-gi="${esc(c.id)}" data-gt="${c.locType==="binder"||!c.locType?"binder":c.locType}" data-gb="${c.binder||""}" data-gp="${c.page||1}" data-gd="${esc(c.deck||"")}"><span style="color:inherit;font-size:.9rem;font-weight:600">${(+c.qty||1)>1?"×"+(+c.qty)+" · ":""}${esc(locLabel(c))} →</span></button>`).join("")}${o.length<2?`<div class="hint">This is the only copy in your catalogue.</div>`:""}</div>`})()}`})}
  else h+=pkEmpty("No cards in this binder yet");
  bkq("#side").innerHTML=h;try{pkColInit()}catch(e){}
}
/* ---------- data operations (all undoable through the app's undo bar) ---------- */
async function bkSet(c,patch){await S.store.set(c.id,{...bkNoId(c),...patch})}
function bkFlash(ids,ms){bk.landed=new Set(ids);setTimeout(()=>{bk.landed=null;bkqa(".pocket.landed").forEach(x=>x.classList.remove("landed"))},ms||1000)}
async function bkMoveTo(id,p,s){
  const A=S.cards.find(c=>c.id===id);if(!A)return;const I=bkInfo(),B=bkAt(I,p,s);if(B&&B.id===A.id)return;
  const fromHere=A.locType==="binder"&&+A.binder===I.n&&+A.page&&+A.slot;
  txBegin(B?`Swapped ${A.name} and ${B.name}`:`Moved ${A.name} to page ${p}, pocket ${s}`);
  try{
    const oldP=A.page,oldS=A.slot;
    await bkSet(A,{locType:"binder",binder:I.n,page:p,slot:s,deck:A.locType==="deck"?"":A.deck});
    if(B)await bkSet(B,fromHere?{page:oldP,slot:oldS}:{binder:"",page:"",slot:""});
  }catch(e){cpToast("That move didn’t save. Use Undo, then try again.")}finally{txEnd()}
  await growPages(I.n);bkFlash(B?[A.id,B.id]:[A.id]);bk.sel.clear();renderBinder();
}
async function bkPlaceMany(ids,n,fromPage,label){
  const I=(+n===bkInfo().n)?bkInfo():null;const inB=S.cards.filter(c=>c.locType==="binder"&&+c.binder===+n);
  const total=Math.max(2,(S.binders[n]&&+S.binders[n].pages)||0,...inB.map(c=>+c.page||0))+0;let tp=total+(total%2);
  const ex=new Set(ids);const used=new Set(inB.filter(c=>!ex.has(c.id)&&+c.page&&+c.slot).map(c=>c.page*10+ +c.slot));
  const list=ids.map(id=>S.cards.find(c=>c.id===id)).filter(Boolean).sort((a,b)=>(+a.page||999)*10+(+a.slot||0)-((+b.page||999)*10+(+b.slot||0)));
  const plan=[];let p=Math.max(1,fromPage||1),s=1;
  for(const c of list){let found=false;while(p<=tp){if(!used.has(p*10+s)){used.add(p*10+s);plan.push([c,p,s]);found=true;break}s++;if(s>9){s=1;p++}}if(!found)break}
  if(!plan.length){cpToast("There is no room in that binder.");return 0}
  txBegin(label||`Moved ${plan.length} card${plan.length>1?"s":""} to ${binderName(n)}, page ${plan[0][1]}`);
  try{for(const [c,pg,sl] of plan)await bkSet(c,{locType:"binder",binder:+n,page:pg,slot:sl,deck:c.locType==="deck"?"":c.deck})}catch(e){cpToast("The move didn’t fully save. Use Undo, then try again.")}finally{txEnd()}
  await growPages(+n);bkFlash(plan.map(x=>x[0].id));
  if(plan.length<list.length)cpToast(`Only ${plan.length} of ${list.length} fitted. The binder is full.`);
  return plan.length;
}
async function bkMoveGroup(ids,tp,ts){
  const I=bkInfo();const LIN=(p,s)=>(p-1)*9+(s-1),POSF=i=>[Math.floor(i/9)+1,i%9+1];
  const sel=I.inB.filter(c=>ids.includes(c.id)&&+c.page&&+c.slot).sort((x,y)=>LIN(+x.page,+x.slot)-LIN(+y.page,+y.slot));if(!sel.length)return;
  const start=LIN(tp,ts),dest=sel.map((_,i)=>start+i),src=sel.map(c=>LIN(+c.page,+c.slot));
  if(dest[dest.length-1]>=I.total*9){cpToast("That group doesn’t fit from there.");return}
  if(dest.every((x,i)=>x===src[i]))return;
  const destSet=new Set(dest),selIds=new Set(sel.map(c=>c.id));
  const freed=[...new Set(src)].filter(x=>!destSet.has(x)).sort((a,z)=>a-z);
  const occ=dest.map(x=>({x,cs:I.inB.filter(c=>!selIds.has(c.id)&&+c.page&&+c.slot&&LIN(+c.page,+c.slot)===x)})).filter(o=>o.cs.length);
  const moves=sel.map((c,i)=>({c,to:POSF(dest[i])}));occ.forEach((o,i)=>o.cs.forEach(c=>moves.push({c,to:POSF(freed[i])})));
  txBegin(`Moved ${sel.length} cards to page ${tp}, pocket ${ts}`);
  try{for(const m of moves)if(m.to&&m.to[0])await bkSet(m.c,{page:m.to[0],slot:m.to[1]})}catch(e){cpToast("The move didn’t fully save. Use Undo, then try again.")}finally{txEnd()}
  await growPages(I.n);bkFlash(sel.map(c=>c.id));renderBinder();
}
async function bkDelete(ids){
  const list=ids.map(id=>S.cards.find(c=>c.id===id)).filter(Boolean);if(!list.length)return;
  const nm=list.length===1?list[0].name:plural(list.length,"card");
  const where=list.length===1?` (${locLabel(list[0])})`:"";
  if(!(await askConfirm(`Delete ${nm}?`,`${list.length===1?"This card is":"These cards are"} removed from your catalogue completely${where}. Use “Take out of binder” instead to keep ${list.length===1?"it":"them"} unplaced. You can undo this afterwards.`,"Delete",true)))return;
  txBegin(`Deleted ${nm}`);
  try{for(const c of list)await S.store.del(c.id)}catch(e){cpToast("That didn’t save. Use Undo, then try again.")}finally{txEnd()}
  bk.sel.clear();renderBinder();
}
async function bkTakeOut(ids){
  const list=ids.map(id=>S.cards.find(c=>c.id===id)).filter(Boolean);if(!list.length)return;
  txBegin(`Took ${list.length===1?list[0].name:list.length+" cards"} out of ${binderName(bkInfo().n)}`);
  try{for(const c of list)await bkSet(c,{binder:"",page:"",slot:""})}catch(e){cpToast("That didn’t save. Use Undo, then try again.")}finally{txEnd()}
  bk.sel.clear();renderBinder();
}
async function bkArrange(k){
  const I=bkInfo(),cs=I.inB;if(!cs.length)return;
  const ser=c=>{const i=SERIES_ALL.indexOf(seriesOf(c));return i<0?99:i};const num=c=>{const p=numParts(c.number);return p?(p.pre?5000:0)+p.n:9999};
  const tyi=c=>{const d=c.details;if(!d)return 30;const s=String(d.supertype||"").toLowerCase();if(s.startsWith("trainer"))return 20;if(s.startsWith("energy"))return 21;const t=(d.types||[])[0];return t?ETYPES.indexOf(t):19};
  const byName=(x,y)=>String(x.name).localeCompare(y.name);const dx=c=>dexOf(c)||1e6;const val=c=>(unitVal(c)||0)*(+c.qty||1);
  const cmp={dex:(x,y)=>dx(x)-dx(y)||byName(x,y)||num(x)-num(y),set:(x,y)=>ser(x)-ser(y)||String(x.set||x.setCode||"~").localeCompare(y.set||y.setCode||"~")||num(x)-num(y),type:(x,y)=>tyi(x)-tyi(y)||dx(x)-dx(y)||byName(x,y),rar:(x,y)=>rarRank(y.rarity)-rarRank(x.rarity)||dx(x)-dx(y)||byName(x,y),val:(x,y)=>val(y)-val(x)||byName(x,y),name:(x,y)=>byName(x,y)||num(x)-num(y),gaps:(x,y)=>((+x.page||999)-(+y.page||999))||((+x.slot||0)-(+y.slot||0))}[k];
  const labels={dex:"Pokédex number",set:"set and number",type:"type",rar:"rarity",val:"value",name:"name",gaps:"closing gaps"};
  const order=cs.slice().sort(cmp);let moved=0;
  txBegin(k==="gaps"?`Closed the gaps in ${binderName(I.n)}`:`Arranged ${binderName(I.n)} by ${labels[k]}`);
  try{for(let i=0;i<order.length;i++){const c=order[i],pg=Math.floor(i/9)+1,sl=i%9+1;if(+c.page!==pg||+c.slot!==sl){await bkSet(c,{page:pg,slot:sl});moved++}}}catch(e){cpToast("The arrangement didn’t fully save. Use Undo.")}finally{txEnd()}
  await growPages(I.n);$("#pageNo").value=1;renderBinder();cpToast(moved?`${moved} card${moved>1?"s":""} moved.`:"Already in that order.");
}
async function bkPages(k){
  const I=bkInfo(),cur=Math.max(1,I.v*2||1);
  if(k==="add"){const bd=S.binders[I.n]||{};txBegin(`Added a sheet to ${binderName(I.n)}`);try{await S.store.bset(I.n,{...bd,number:I.n,pages:I.total+2})}finally{txEnd()}renderBinder();return}
  if(k==="clear"){const ids=I.inB.filter(c=>+c.page===I.v*2||+c.page===I.v*2+1).map(c=>c.id);if(!ids.length){cpToast("Nothing on this spread.");return}await bkTakeOut(ids);return}
  if(k==="ins"){const cs=I.inB.filter(c=>+c.page>=cur);if(!cs.length){cpToast("Nothing to shift. Later pages are already empty.");return}
    txBegin(`Inserted an empty page at ${cur} in ${binderName(I.n)}`);try{for(const c of cs)await bkSet(c,{page:+c.page+1})}catch(e){cpToast("The pages didn’t fully move. Use Undo.")}finally{txEnd()}await growPages(I.n);renderBinder();return}
  if(k==="rm"){const empties=[];for(let p=1;p<=I.total;p++)if(!I.inB.some(c=>+c.page===p))empties.push(p);const t=empties.find(p=>p>=cur)||empties[0];if(!t){cpToast("There are no empty pages to remove.");return}
    const cs=I.inB.filter(c=>+c.page>t);if(!cs.length){cpToast(`Page ${t} is empty and nothing follows it.`);return}
    txBegin(`Removed empty page ${t} from ${binderName(I.n)}`);try{for(const c of cs)await bkSet(c,{page:+c.page-1})}catch(e){cpToast("The pages didn’t fully move. Use Undo.")}finally{txEnd()}renderBinder()}
}
/* ---------- dialogs ---------- */
function bkAddDlg(p,s){
  const d=bkq("#addDlg");
  bkq("#addBody").innerHTML=`<h2>Add to page ${p}, pocket ${s}</h2><label>Find a card<input type="search" id="aq" placeholder="Search cards not in a binder"></label><div class="tray" id="alist"></div><div class="frow" style="justify-content:flex-start;flex-wrap:wrap"><button class="btn ghost sm" id="aphoto" type="button">${icoSvg("scan")}From a photo</button><button class="btn ghost sm" id="anew" type="button">Add a new card here</button><span class="grow"></span><button class="btn ghost" id="aclose" type="button">Close</button></div>`;
  const draw=()=>{const q=bkq("#aq").value.toLowerCase();bkq("#alist").innerHTML=bkUnplaced().filter(c=>String(c.name).toLowerCase().includes(q)).slice(0,30).map(c=>{const src=cpThumb(c);return `<div class="tr" style="cursor:default"><div class="im" style="background:linear-gradient(160deg,${bkCol(c)},color-mix(in srgb,${bkCol(c)} 22%,#000))">${src?`<img alt="" src="${esc(src)}" style="width:100%;height:100%;object-fit:cover;border-radius:4px">`:esc(String(c.name||"?")[0])}</div><div class="grow"><b>${esc(c.name)}</b><small>${esc(c.set||c.setCode||"")}${unitVal(c)!=null?" · "+bkEur(unitVal(c)):""}</small></div><button class="btn sm" data-aplace="${esc(c.id)}">Place here</button></div>`}).join("")||`<p class="hint">No unplaced card matches.</p>`};
  d.showModal();draw();bkq("#aq").oninput=draw;bkq("#aclose").onclick=()=>d.close();
  bkq("#aphoto").onclick=()=>{d.close();pickForPocket(p,s)};
  bkq("#anew").onclick=()=>{d.close();$("#pageNo").value=p;openEditor(null);F.page.value=p;F.slot.value=s;F.binder.value=bkInfo().n;F.locType.value="binder";toggleLoc();$("#editTitle").textContent=`Add a card to page ${p}, pocket ${s}`;$("#editTitle").classList.remove("hidden")};
  bkq("#alist").onclick=async e=>{const b=e.target.closest("[data-aplace]");if(b){d.close();await bkMoveTo(b.dataset.aplace,p,s)}};
}
function bkEditDlg(isNew){
  const nums=binderNums();const n=isNew?(nums.length?Math.max(...nums):0)+1:bkInfo().n;const old=S.binders[n]||{};
  const I=isNew?{inB:[]}:bkInfo();const minPages=Math.max(2,...I.inB.map(c=>+c.page||0));const minEven=minPages+(minPages%2);
  const e=bk.edit={n,isNew,name:old.name||"",color:binderColor(n),pages:isNew?20:Math.max(+old.pages||0,minEven,2),blob:null,url:null,remove:false,minEven};
  const d=bkq("#editDlg");const draw=()=>{
    const cov=e.url||(!e.remove&&old.cover?PKL.blob(old.cover):"");
    bkq("#editBody").innerHTML=`<h2>${isNew?"New binder":"Edit binder"}</h2><div class="cvprev"><span class="bcov" style="--c:${e.color}">${cov?`<img alt="Cover photo" src="${cov}">`:n}</span><span class="hint">Binder ${n}</span></div><label>Name<input type="text" id="en" value="${esc(e.name)}" placeholder="Binder ${n}"></label><label>Total pages<div><span class="stp"><button type="button" data-st="-2" aria-label="Fewer pages" ${e.pages<=e.minEven?"disabled":""}>−</button><span>${e.pages}</span><button type="button" data-st="2" aria-label="More pages">+</button></span> <span class="hint">${e.pages/2} sheets · holds ${e.pages*9} cards</span></div>${e.pages<=e.minEven&&e.minEven>2?`<span class="hint">Cards sit up to page ${minPages}, so it can’t have fewer than ${e.minEven} pages.</span>`:""}</label><label>Cover colour<div class="sws">${COVERS.map(c=>`<button type="button" class="sw" style="--c:${c}" data-sw="${c}" aria-pressed="${c.toLowerCase()===String(e.color).toLowerCase()}" aria-label="Colour ${c}"></button>`).join("")}<input type="color" id="ecol" value="${/^#[0-9a-f]{6}$/i.test(e.color)?e.color:"#2f5d8c"}" aria-label="Custom colour"></div></label>${S.assets?`<div style="display:flex;gap:8px;margin-bottom:6px;flex-wrap:wrap"><label class="btn ghost sm" style="cursor:pointer">Choose cover photo<input type="file" id="efile" accept="image/*" class="vh"></label>${cov?`<button type="button" class="btn ghost sm" id="erm">Remove cover</button>`:""}</div>`:""}${isNew?"":`<div style="display:flex;gap:8px;margin-bottom:6px;flex-wrap:wrap"><label class="btn ghost sm" id="eimpl" style="cursor:pointer">Import binder from file…<input type="file" id="eimp" accept=".xlsx,.xls,.csv" class="vh"></label></div><span class="hint">Excel file with page, slot, name, set_code, number and Style. Details, photos and prices come from TCGdex and every card goes into its page and pocket in this binder.</span>`}<p class="status" id="est"></p><div class="frow">${isNew?"":`<button class="btn danger" type="button" id="edel" style="margin-right:auto">Delete binder</button>`}${!isNew&&nums.length>1?`<button class="btn ghost sm" type="button" data-mv="-1" aria-label="Move this binder earlier">←</button><button class="btn ghost sm" type="button" data-mv="1" aria-label="Move this binder later">→</button>`:""}<button class="btn ghost" id="ecan" type="button">Cancel</button><button class="btn" id="esave" type="button">${isNew?"Create binder":"Save"}</button></div>`;};
  draw();d.showModal();
  const keepName=()=>{const i=bkq("#en");if(i)e.name=i.value};
  d.onclick=async ev=>{const t=ev.target;let x;
    if(x=t.closest("[data-st]")){keepName();e.pages=Math.max(e.minEven,e.pages+ +x.dataset.st);draw();bkq("#en").focus();return}
    if(x=t.closest("[data-sw]")){keepName();e.color=x.dataset.sw;draw();return}
    if(t.closest("#erm")){keepName();if(e.url)URL.revokeObjectURL(e.url);e.url=null;e.blob=null;e.remove=true;draw();return}
    if(x=t.closest("[data-mv]")){const dir=+x.dataset.mv;const list=binderNums();const i=list.indexOf(n),j=i+dir;if(j<0||j>=list.length)return;list.splice(j,0,list.splice(i,1)[0]);txBegin(`Moved ${binderName(n)} ${dir<0?"earlier":"later"}`);try{for(let k=0;k<list.length;k++){const m=list[k],b=S.binders[m]||{};if(+b.pos!==k||b.pos==null)await S.store.bset(m,{...b,number:m,pos:k})}}finally{txEnd()}d.close();renderBinder();return}
    if(t.closest("#ecan")){if(e.url)URL.revokeObjectURL(e.url);bk.edit=null;d.close();return}
    if(t.closest("#edel")){keepName();d.close();const cs=S.cards.filter(c=>c.locType==="binder"&&+c.binder===n);
      if(!(await askConfirm(`Delete ${binderName(n)}?`,`The binder is removed. Its ${plural(cs.length,"card")} stay in your catalogue and move to Unplaced. You can undo this afterwards.`,"Delete binder")))return;
      txBegin(`Deleted ${binderName(n)}`);try{for(const c of cs)await bkSet(c,{binder:"",page:"",slot:""});await S.store.bdel(n)}catch(err){cpToast("The binder didn’t delete fully. Use Undo.")}finally{txEnd()}
      const rest=binderNums().filter(m=>m!==n);$("#binderNo").value=rest[0]||1;$("#pageNo").value=1;bk.sel.clear();renderBinder();return}
    if(t.closest("#esave")){keepName();const name=e.name.trim();let cover=old.cover||null;
      try{if(e.blob&&S.assets){const a=await S.assets.upload(e.blob);if(cover)S.assets.delete(cover).catch(()=>{});cover=a.id}else if(e.remove&&cover){S.assets&&S.assets.delete(cover).catch(()=>{});cover=null}
        txBegin(isNew?`Created ${name||"Binder "+n}`:`Edited ${binderName(n)}`);try{await S.store.bset(n,{...old,number:n,name,cover,color:e.color,pages:e.pages})}finally{txEnd()}
        if(isNew){$("#binderNo").value=n;$("#pageNo").value=1}bk.edit=null;d.close();renderBinder()}catch(err){const st=bkq("#est");if(st){st.textContent="The binder didn’t save. Try again.";st.classList.add("err")}}}
  };
  d.onchange=async ev=>{const t=ev.target;
    if(t.id==="ecol"){keepName();e.color=t.value;draw();return}
    if(t.id==="eimp"){const f=t.files[0];t.value="";if(!f)return;keepName();const st=bkq("#est");const need=await bdRunImport(f,n,st,bkq("#eimpl"));
      if(need){const msg=st.textContent,er=st.classList.contains("err");e.pages=Math.max(e.pages,need);e.minEven=Math.max(e.minEven,need);draw();const s2=bkq("#est");if(s2){s2.textContent=msg;s2.classList.toggle("err",er)}}return}
    if(t.id==="efile"){const f=t.files[0];if(!f)return;keepName();const st=bkq("#est");st.textContent="Loading the photo…";try{const blob=await shrink(f);if(e.url)URL.revokeObjectURL(e.url);e.blob=blob;e.url=URL.createObjectURL(blob);e.remove=false;draw();bkq("#est").textContent="Photo chosen. Press Save to keep it."}catch(err){st.textContent="That photo couldn’t be read. Try a JPEG or PNG.";st.classList.add("err")}}};
}
/* ---------- events ---------- */
function bkCloseMenus(){bkqa(".pop.open").forEach(p=>p.classList.remove("open"))}
function bkScan(p){if(S.review.length)return;if(p)$("#pageNo").value=p;if(S.mode!=="binder"){S.mode="binder";document.querySelectorAll(".seg [data-mode]").forEach(x=>x.setAttribute("aria-pressed",x.dataset.mode==="binder"));$("#binderFields").classList.remove("hidden");$("#deckFields").classList.add("hidden")}
  if(p){$("#photo").click();show("scan");setStatus(`Choose a photo of ${binderName($("#binderNo").value)}, page ${p}.`)}else show("scan")}
function bkBind(){
  const R=bkR;
  R.addEventListener("click",async e=>{
    if(bk.suppress>Date.now())return;const t=e.target;let x;
    if(!t.closest(".menu"))bkCloseMenus();
    if(x=t.closest("[data-m]")){const p=bkq("#m-"+x.dataset.m),o=p.classList.contains("open");bkCloseMenus();if(!o)p.classList.add("open");return}
    if(x=t.closest("[data-bn]")){const n=+x.dataset.bn;if(n===bkInfo().n)return;if(S.review.length&&!(await askConfirm("Discard these cards?","The cards waiting for review haven’t been added yet.","Discard")))return;bk.sel.clear();openBinder(n);return}
    if(t.closest("#newB")){bkEditDlg(true);return}if(t.closest("#editB")){bkEditDlg(false);return}
    if(t.closest("#scanB")){bkScan(0);return}
    if(x=t.closest("[data-textp]")){bkTextImport(+x.dataset.textp);return}
    if(x=t.closest("[data-scanp]")){bkScan(+x.dataset.scanp);return}
    if(t.closest("#n0")){bkGoSpread(0);return}if(t.closest("#n1")||t.closest("#eL")){bkGoSpread(bkInfo().v-1);return}if(t.closest("#n2")||t.closest("#eR")){bkGoSpread(bkInfo().v+1);return}if(t.closest("#n3")){bkGoSpread(1e6);return}
    if(t.closest("#fsb")||t.closest("#fsx")){bk.fs=!bk.fs;bkRefresh();return}
    if(t.closest("#nextFree")){const I=bkInfo();let f=null;outer:for(let p=1;p<=I.total;p++)for(let s=1;s<=9;s++)if(!bkAt(I,p,s)){f=[p,s];break outer}if(!f){cpToast("This binder is full.");return}bkGo(f[0],f[1]);return}
    if(x=t.closest("[data-gop]")){bkGo(+x.dataset.gop,+x.dataset.gos);return}
    if(t.closest("#tSel")){bk.selMode=!bk.selMode;if(!bk.selMode)bk.sel.clear();bkRefresh();return}
    if(t.closest("#tVal")){bk.vals=!bk.vals;bkRefresh();return}if(t.closest("#tDup")){bk.dups=!bk.dups;bkRefresh();return}
    if(x=t.closest("[data-thumb]")){bkGoSpread(Math.floor(+x.dataset.thumb/2));return}
    if(x=t.closest("[data-tab]")){bk.tab=x.dataset.tab;bkSide();return}
    if(x=t.closest("[data-arr]")){bkCloseMenus();await bkArrange(x.dataset.arr);return}
    if(x=t.closest("[data-pg]")){bkCloseMenus();await bkPages(x.dataset.pg);return}
    if(t.closest("[data-bdet]")){bkCloseMenus();const n=bkInfo().n,cs=S.cards.filter(c=>c.locType==="binder"&&+c.binder===n);if(!cs.length){cpToast("This binder has no cards to update.");return}
      cpToast(`Updating ${plural(cs.length,"card")} in ${binderName(n)} from TCGdex…`);await PKL.updateDetails(cs);cpToast(`Updated the details of ${plural(cs.length,"card")} in ${binderName(n)}.`);bkRefresh();return}
    if(x=t.closest("[data-mvp]")){bkCloseMenus();const ids=[...bk.sel];await bkPlaceMany(ids,bkInfo().n,+x.dataset.mvp,`Moved ${plural(ids.length,"card")} to page ${x.dataset.mvp}`);bk.sel.clear();renderBinder();return}
    if(x=t.closest("[data-sb]")){const a=x.dataset.sb;if(a==="clear")bk.sel.clear();if(a==="page"){const I=bkInfo();I.inB.filter(c=>+c.page===I.v*2||+c.page===I.v*2+1).forEach(c=>bk.sel.add(c.id))}if(a==="take"){await bkTakeOut([...bk.sel]);return}if(a==="del"){await bkDelete([...bk.sel]);return}bkRefresh();return}
    if(x=t.closest("[data-btab]")){bk.btab=x.dataset.btab;bkSide();return}
    if(x=t.closest("[data-hl]")){const k=x.dataset.hl;bk.hl=bk.hl===k?null:k;bkRefresh();return}
    if(t.closest("[data-clearhl]")){bk.hl=null;bkRefresh();return}
    if(x=t.closest("[data-i]")){const a=x.dataset.i;const one=S.cards.find(c=>c.id===([...bk.sel][0]||bk.pcard));
      if(a==="open"&&one)openCardPage(one,bkInfo().inB.slice().sort((p,q)=>(+p.page||0)-(+q.page||0)||(+p.slot||0)-(+q.slot||0)).map(c=>c.id));
      if(a==="zoom"&&one)cpLightbox(one);
      if(a==="del"&&one){await bkDelete([one.id]);return}
      if(a==="find"&&one){bk.where=bk.where===one.id?null:one.id;bkSide();return}if(0){const o=[];cpToast(o.length?"Also in: "+o.slice(0,3).map(locLabel).join("; ")+(o.length>3?` and ${o.length-3} more`:""):"This is the only copy in your catalogue.")}
      if(a==="undo")await undoLast();return}
    if(x=t.closest("[data-fplace]")){const n=bkInfo().n;const c=S.cards.find(c=>c.id===x.dataset.fplace);if(c){const k=await bkPlaceMany([c.id],n,1,`Placed ${c.name} in ${binderName(n)}`);if(k)renderBinder()}return}
    if(x=t.closest(".pocket")){const id=x.dataset.id;if(id&&e.detail>=2){const c=S.cards.find(c=>c.id===id);if(c)openCardPage(c,bkInfo().inB.slice().sort((p,q)=>(+p.page||0)-(+q.page||0)||(+p.slot||0)-(+q.slot||0)).map(c=>c.id));return}if(id){if(bk.selMode||e.ctrlKey||e.metaKey||e.shiftKey){bk.sel.has(id)?bk.sel.delete(id):bk.sel.add(id)}else bk.sel=bk.sel.size===1&&bk.sel.has(id)?new Set():new Set([id]);bkRefresh()}else bkAddDlg(+x.dataset.p,+x.dataset.s);return}
  });
  R.addEventListener("change",e=>{if(e.target.id==="jump")bkGoSpread(+e.target.value)});
  R.addEventListener("input",e=>{if(e.target.id!=="q")return;bk.q=e.target.value;const pos=e.target.selectionStart;const I=bkInfo();
    const hits=I.inB.filter(bkHit);if(bk.q.trim()&&hits.length&&!hits.some(c=>+c.page===I.v*2||+c.page===I.v*2+1)){const f=hits.sort((a,b)=>a.page-b.page||a.slot-b.slot)[0];bkGoSpread(Math.floor(f.page/2));const q=bkq("#q");q.focus();q.setSelectionRange(pos,pos)}else{bkSpread();bkStrip()}
    e.target.title=bk.q.trim()?`${hits.length} match${hits.length===1?"":"es"}`:""});
  /* hover tilt */
  R.addEventListener("pointermove",e=>{if(e.pointerType!=="mouse"||bk.drag)return;const el=e.target.closest&&e.target.closest(".pocket.filled");if(!el)return;const r=el.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;el.style.transform=`perspective(500px) rotateY(${x*14}deg) rotateX(${-y*14}deg) translateY(-3px) scale(1.04)`});
  R.addEventListener("pointerout",e=>{const el=e.target.closest&&e.target.closest(".pocket.filled");if(el&&!el.contains(e.relatedTarget))el.style.transform=""});
  /* pointer drag (mouse and touch) */
  R.addEventListener("pointerdown",e=>{
    if(e.button>0)return;const t=e.target;if(t.closest("button:not(.pocket)")||t.closest("input,select"))return;
    const pk=t.closest(".pocket.filled"),tr=t.closest(".tr[data-fid]");if(!pk&&!tr)return;
    let ids;if(pk){const id=pk.dataset.id;ids=bk.sel.has(id)&&bk.sel.size>1?[...bk.sel]:[id]}else ids=[tr.dataset.fid];
    const touch=e.pointerType!=="mouse";
    bk.drag={ids,el:pk||tr,sx:e.clientX,sy:e.clientY,touch,armed:!touch,ghost:null,over:null,flip:null,t0:Date.now()};
    if(touch)bk.drag.timer=setTimeout(()=>{if(bk.drag){bk.drag.armed=true;if(navigator.vibrate)navigator.vibrate(15)}},380);
  });
  R.addEventListener("dragstart",e=>{if(e.target.closest&&e.target.closest(".pocket,.tr"))e.preventDefault()});
  /* picture files dropped on a pocket */
  let fEl=null;const fClear=()=>{if(fEl)fEl.classList.remove("fdrop");fEl=null};
  R.addEventListener("dragover",e=>{if(!hasFiles(e)||!S.assets)return;const p=e.target.closest&&e.target.closest(".pocket[data-p]");if(!p){fClear();return}e.preventDefault();e.dataTransfer.dropEffect="copy";if(fEl!==p){fClear();fEl=p;p.classList.add("fdrop")}});
  R.addEventListener("dragleave",e=>{if(fEl&&!fEl.contains(e.relatedTarget))fClear()});
  R.addEventListener("drop",async e=>{if(!hasFiles(e))return;const p=e.target.closest&&e.target.closest(".pocket[data-p]");fClear();if(!p||!S.assets)return;e.preventDefault();const f=imgFile(e);if(!f){cpToast("That isn’t a picture. Drop a JPEG or PNG.");return}
    const pg=+p.dataset.p,sl=+p.dataset.s,I=bkInfo();if(!p.classList.contains("filled")){addFromPhotoFile(f,{b:String(I.n),pg,slot:sl});return}
    const c=bkAt(I,pg,sl);if(!c)return;cpToast(`Saving the new photo of ${c.name}…`);try{await replacePicture(c,f);bkFlash([c.id]);renderBinder();cpToast(`Replaced the photo of ${c.name}.`)}catch(err){cpToast("The photo didn’t save. Try a JPEG or PNG.")}});
}
function bkGo(p,s){bkGoSpread(Math.floor(p/2));setTimeout(()=>{const el=bkq(`.pocket[data-p="${p}"][data-s="${s}"]`);if(el){el.classList.add("over");el.scrollIntoView({block:"nearest"});setTimeout(()=>el.classList.remove("over"),1400)}},60)}
/* drag engine: document level so the pointer can leave the page */
document.addEventListener("pointermove",e=>{
  const d=bk.drag;if(!d||!bkR)return;const dist=Math.hypot(e.clientX-d.sx,e.clientY-d.sy);
  if(!d.armed){if(dist>10){clearTimeout(d.timer);bk.drag=null}return}
  if(!d.ghost){if(dist<6)return;
    const c=S.cards.find(c=>c.id===d.ids[0]);const src=c?cpThumb(c):"";const g=document.createElement("div");g.className="bghost";g.style.setProperty("--col",c?bkCol(c):"#888");
    g.innerHTML=`<div class="img" style="background:linear-gradient(160deg,${c?bkCol(c):"#888"},#000)">${src?`<img alt="" src="${esc(src)}">`:esc(String(c&&c.name||"?")[0])}</div>${d.ids.length>1?`<b>${d.ids.length}</b>`:""}`;
    bkR.appendChild(g);d.ghost=g;d.dx=46;d.dy=60;d.el.classList.add("lifted");bkq(".page").classList.add("dragging");bkq("#cover").classList.add("dragging");bkqa(".edgebtn").forEach(b=>b.classList.add("drag"));
  }
  d.ghost.style.transform=`translate(${e.clientX-d.dx}px,${e.clientY-d.dy}px) rotate(-3deg)`;
  const hit=bkR.elementFromPoint(e.clientX,e.clientY);const t=hit&&hit.closest(".pocket,.thumb,.edgebtn,.bchip[data-bn]");
  if(d.over&&d.over!==t){d.over.classList.remove("over");if(d.over.classList.contains("edgebtn")){clearTimeout(d.flip);d.flip=null}}
  if(t&&t!==d.over){t.classList.add("over");if(t.classList.contains("edgebtn")&&!t.disabled){d.flip=setTimeout(()=>{if(bk.drag&&bk.drag.over===t){t.click();d.over=null;t.classList.remove("over")}},650)}}
  d.over=t||null;
});
document.addEventListener("touchmove",e=>{if(bk.drag&&bk.drag.armed)e.preventDefault()},{passive:false});
async function bkEndDrag(cancel){
  const d=bk.drag;bk.drag=null;if(!d)return;clearTimeout(d.timer);clearTimeout(d.flip);
  if(!d.ghost)return;
  d.ghost.remove();d.el.classList.remove("lifted");bkq(".page").classList.remove("dragging");bkq("#cover").classList.remove("dragging");bkqa(".edgebtn").forEach(b=>b.classList.remove("drag"));bkqa(".over").forEach(x=>x.classList.remove("over"));
  bk.suppress=Date.now()+350;const t=d.over;if(cancel||!t)return;
  const I=bkInfo();
  if(t.classList.contains("pocket")){const p=+t.dataset.p,s=+t.dataset.s;
    if(d.ids.length===1)await bkMoveTo(d.ids[0],p,s);
    else if(!t.dataset.id&&d.ids.every(id=>{const c=S.cards.find(c=>c.id===id);return c&&bkIsPlaced(c)&&+c.binder===I.n}))await bkMoveGroup(d.ids,p,s);
    else if(!t.dataset.id){await bkPlaceMany(d.ids,I.n,p);bk.sel.clear();renderBinder()}
    else cpToast("Drop a group on an empty pocket.")}
  else if(t.classList.contains("thumb")){await bkPlaceMany(d.ids,I.n,+t.dataset.thumb,`Moved ${plural(d.ids.length,"card")} to page ${t.dataset.thumb}`);bk.sel.clear();renderBinder()}
  else if(t.classList.contains("bchip")){const n=+t.dataset.bn;if(n!==I.n){await bkPlaceMany(d.ids,n,1,`Moved ${plural(d.ids.length,"card")} to ${binderName(n)}`);bk.sel.clear();renderBinder()}}
}
document.addEventListener("pointerup",()=>bkEndDrag(false));
document.addEventListener("pointercancel",()=>bkEndDrag(true));
document.addEventListener("keydown",e=>{
  if(S.screen!=="binders"||!bkR||document.querySelector("dialog[open]")||bkR.querySelector("dialog[open]"))return;
  const tg=(e.composedPath&&e.composedPath()[0])||e.target;if(tg&&/^(INPUT|SELECT|TEXTAREA)$/.test(tg.tagName))return;
  if(e.ctrlKey||e.metaKey||e.altKey)return;
  const I=bkInfo();
  if(e.key==="ArrowRight"&&I.v<I.spreads-1){bkGoSpread(I.v+1)}
  else if(e.key==="ArrowLeft"&&I.v>0){bkGoSpread(I.v-1)}
  else if(e.key==="Escape"){if(bk.fs){bk.fs=false;bkRefresh()}else if(bk.sel.size){bk.sel.clear();bkRefresh()}else if(bk.drag){bkEndDrag(true)}}
  else if(e.key==="f"||e.key==="F"){bk.fs=!bk.fs;bkRefresh()}
  else if((e.key==="Delete"||e.key==="Backspace")&&bk.sel.size){e.preventDefault();bkTakeOut([...bk.sel])}
});

const DPCSS=`
.kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:12px}
@media(max-width:700px){.kpis{grid-template-columns:repeat(2,minmax(0,1fr))}}
.kpi{padding:10px 14px;min-width:0}
.kpi b{display:block;font-size:1.35rem;letter-spacing:-.01em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.kpi small{color:var(--muted);display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
*,*::before,*::after{box-sizing:border-box}
button,input,select,textarea{font:inherit;color:inherit}
[hidden]{display:none!important}
.vh{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
.btn{font-weight:650;border:0;border-radius:10px;padding:9px 14px;cursor:pointer;background:var(--accent);color:var(--accent-ink);display:inline-flex;gap:6px;align-items:center;white-space:nowrap}
.btn:disabled{opacity:.45;cursor:not-allowed}
.btn.ghost{background:var(--sheet);color:var(--ink);border:1px solid var(--line)}.btn.ghost:hover:not(:disabled){background:var(--pocket)}
.btn.ghost[aria-pressed="true"]{background:color-mix(in srgb,var(--accent) 22%,var(--sheet));border-color:var(--accent)}
.btn.danger{background:var(--sheet);color:var(--danger);border:1px solid color-mix(in srgb,var(--danger) 45%,var(--line))}
.btn.sm{padding:5px 10px;font-size:.85rem;border-radius:8px}
.ib{width:36px;height:36px;border-radius:10px;border:1px solid var(--line);background:var(--sheet);cursor:pointer;display:grid;place-items:center;font-weight:800;flex:none}
.ib:disabled{opacity:.35;cursor:not-allowed}.ib:hover:not(:disabled){background:var(--pocket)}
.ib svg{width:18px;height:18px}
:is(.btn,.ib,.chip,.gc,.dchip,.tab,.sw,.row,.sec-h):focus-visible{outline:2px solid var(--brand);outline-offset:2px}
.page{max-width:none;margin:0;padding:0}
h1{margin:0 0 2px;font-size:1.7rem;letter-spacing:-.02em}
.sub{color:var(--muted);margin:0}
.head{display:flex;gap:12px;align-items:flex-end;flex-wrap:wrap;margin-bottom:14px}
.card{background:var(--sheet);border:1px solid var(--line);border-radius:var(--radius);box-shadow:var(--shadow)}
/* shelf */
.shelfbar{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:8px}
.seg{display:flex;background:var(--pocket);border-radius:11px;padding:3px;gap:2px}
.seg button{border:0;background:none;padding:6px 12px;border-radius:8px;font-weight:700;color:var(--muted);cursor:pointer;font-size:.85rem}
.seg button[aria-pressed="true"]{background:var(--sheet);color:var(--ink);box-shadow:0 1px 3px rgba(0,0,0,.12)}
.shelfbar input[type=search],.tb input[type=search]{border:1px solid var(--line);border-radius:10px;padding:8px 11px;background:var(--sheet);min-width:150px;max-width:230px;width:100%}
input:focus,select:focus,textarea:focus{outline:2px solid color-mix(in srgb,var(--brand) 45%,transparent);border-color:var(--brand)}
select,textarea{border:1px solid var(--line);border-radius:10px;padding:8px 10px;background:var(--sheet)}
.chk{display:inline-flex;gap:6px;align-items:center;color:var(--muted);font-size:.85rem;cursor:pointer}
.shelf{display:flex;gap:10px;overflow:auto;padding:2px 2px 8px;margin-bottom:12px}.shw{position:relative;margin-bottom:12px}.shw .shelf{margin-bottom:0;overflow-x:auto;overflow-y:hidden;scrollbar-width:none}.shw .shelf::-webkit-scrollbar{display:none}.sa{position:absolute;top:calc(50% - 4px);transform:translateY(-50%);z-index:3;width:36px;height:36px;border-radius:50%;display:grid;place-items:center;padding:0;font:inherit;font-size:1.3rem;line-height:1;color:var(--ink);background:var(--sheet);border:1px solid var(--line);box-shadow:0 4px 14px rgba(0,0,0,.28);cursor:pointer}.sa:hover{border-color:var(--accent);color:var(--accent)}.sa.l{left:-8px}.sa.r{right:-8px}.sa[hidden]{display:none}
.dchip{flex:none;display:flex;gap:10px;align-items:center;padding:8px 14px 8px 8px;background:var(--sheet);border:1px solid var(--line);border-radius:12px;cursor:pointer;text-align:left;box-sizing:border-box;height:70px;width:250px;position:relative}
.dchip[aria-pressed="true"]{border-color:var(--accent);box-shadow:0 0 0 2px color-mix(in srgb,var(--accent) 45%,transparent)}
.dbx{width:40px;height:54px;border-radius:5px;background:var(--c);flex:none;position:relative;box-shadow:inset 0 5px 0 rgba(0,0,0,.22),0 2px 4px rgba(0,0,0,.2);overflow:hidden;display:grid;place-items:center}
.dbx .gc{position:absolute;left:5px;right:5px;top:11px;bottom:5px;width:auto;aspect-ratio:auto;border-radius:2px;pointer-events:none}
.dbx .mono{color:#fff;font-weight:800}
.dchip b{display:block;line-height:1.2;padding-right:20px}.dchip small{color:var(--muted);font-size:.78rem}
.mbar{height:5px;border-radius:3px;background:var(--pocket);margin-top:5px;overflow:hidden}.mbar i{display:block;height:100%;background:var(--accent)}.mbar.ok i{background:var(--ok)}
.dchip .st{position:absolute;bottom:8px;right:7px;width:22px;text-align:center;font-size:.8rem;font-weight:900}.st.ok{color:var(--ok)}.st.warn{color:var(--warn)}
.dchip .fv{position:absolute;top:5px;right:7px;color:var(--muted);font-size:1.05rem;line-height:1;width:22px;height:22px;display:grid;place-items:center;border-radius:6px;cursor:pointer}.dchip .fv:hover{background:var(--pocket);color:var(--accent)}.dchip .fv.on{color:var(--accent)}.dchip .mbar{margin-right:22px}
.dchip.new{border-style:dashed;color:var(--muted);align-items:center;justify-content:center;width:160px;height:70px;box-sizing:border-box;font-weight:700;white-space:nowrap}
/* layout */
.layout{display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:16px;align-items:start}
@media(max-width:1100px){.layout{grid-template-columns:minmax(0,1fr)}.side{position:static!important;max-height:none!important}}
.side{position:sticky;top:12px;display:grid;gap:12px;max-height:calc(100dvh - 24px);overflow:auto;padding:2px;scrollbar-width:thin}
.main{padding:14px;min-width:0}
.dh{display:none}.dact{display:inline-flex;gap:8px;align-items:center}.dact>.btn{height:34px;padding:0 12px;font-size:.9rem;font-weight:650}.dh>.btn{height:34px;padding:0 12px;font-size:.9rem;font-weight:650}
.dh .dbx{width:52px;height:70px}.dh>.grow{min-width:min(100%,220px)}@media(max-width:700px){.dh .dbx{display:none}.main{padding:10px}}
.dh h2{margin:0;font-size:1.35rem;letter-spacing:-.01em;display:flex;gap:8px;align-items:center}
.dh .meta{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:4px;color:var(--muted);font-size:.88rem}
.pill{display:inline-flex;gap:5px;align-items:center;padding:2px 9px;border-radius:99px;font-weight:750;font-size:.8rem;background:var(--pocket)}
.pill.ok{background:color-mix(in srgb,var(--ok) 16%,var(--sheet));color:var(--ok)}.pill.bad{background:color-mix(in srgb,var(--danger) 14%,var(--sheet));color:var(--danger)}
.star{border:0;background:none;font-size:1.25rem;cursor:pointer;color:var(--muted);padding:0 2px}.star.on{color:var(--accent)}
.menu{position:relative}
.pop{position:absolute;z-index:30;top:calc(100% + 6px);right:0;min-width:240px;background:var(--sheet);border:1px solid var(--line);border-radius:12px;box-shadow:0 12px 32px rgba(0,0,0,.2);padding:6px;display:none}
.pop.open{display:block}
.pop button{display:block;width:100%;text-align:left;border:0;background:none;padding:8px 10px;border-radius:8px;cursor:pointer}
.pop button:hover:not(:disabled){background:var(--pocket)}.pop button small{display:block;color:var(--muted)}
.pop button.dn{color:var(--danger)}.pop hr{border:0;border-top:1px solid var(--line);margin:4px 0}
.tb{display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding:0 0 6px;margin-bottom:8px}
.tb .sep{width:1px;height:24px;background:var(--line);margin:0 2px}
.size{display:flex;gap:8px;align-items:center;color:var(--muted);font-size:.82rem;font-weight:700}
.size input{width:70px;accent-color:var(--accent)}#tb #qsearch{width:140px;min-width:0;max-width:140px}#tb .sep{display:none}
.hlchip{display:inline-flex;gap:6px;align-items:center;padding:4px 6px 4px 10px;border-radius:99px;background:color-mix(in srgb,var(--brand) 14%,var(--sheet));border:1px solid var(--brand);font-weight:700;font-size:.82rem}
.hlchip button{border:0;background:none;cursor:pointer;font-weight:900;color:var(--brand)}
/* sections + grid */
.sec-h{display:flex;gap:10px;align-items:center;margin:18px 0 10px;cursor:pointer;user-select:none;border-radius:8px}
.sec-h:first-child{margin-top:4px}
.sec-h h3{margin:0;font-size:.82rem;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}
.sec-h .n{font-weight:800;background:var(--pocket);border-radius:99px;padding:0 9px;font-size:.8rem}
.sec-h .ln{flex:1;height:1px;background:var(--line)}
.sec-h .cv{color:var(--muted);transition:transform .15s}.sec-h.col .cv{transform:rotate(-90deg)}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(var(--cw),1fr));gap:calc(var(--cw)*.09) calc(var(--cw)*.07);padding:4px 8px 12px 4px}
/* card faces */
.gc{container-type:inline-size;position:relative;display:block;width:100%;aspect-ratio:63/88;border:0;padding:0;background:none;cursor:pointer;border-radius:5%/3.6%;transition:transform .14s ease,box-shadow .14s ease,opacity .15s;text-align:left;box-shadow:0 2px 6px rgba(0,0,0,.28);--rx:0deg;--ry:0deg;--sx:50%;--sy:30%;transform-style:preserve-3d}
.gc.st2{box-shadow:5px 5px 0 -1px var(--sheet),5px 5px 0 0 var(--pocket-edge),0 2px 6px rgba(0,0,0,.28)}
.gc.st3{box-shadow:5px 5px 0 -1px var(--sheet),5px 5px 0 0 var(--pocket-edge),10px 10px 0 -1px var(--sheet),10px 10px 0 0 var(--pocket-edge),0 2px 6px rgba(0,0,0,.28)}
.gc.st4{box-shadow:5px 5px 0 -1px var(--sheet),5px 5px 0 0 var(--pocket-edge),10px 10px 0 -1px var(--sheet),10px 10px 0 0 var(--pocket-edge),15px 15px 0 -1px var(--sheet),15px 15px 0 0 var(--pocket-edge),0 2px 6px rgba(0,0,0,.28)}
.gc.hv:hover{transform:perspective(700px) rotateY(var(--ry)) rotateX(var(--rx)) translateY(-3px) scale(1.04);z-index:4;box-shadow:0 14px 28px rgba(0,0,0,.36)}
.gc::after{content:"";position:absolute;inset:0;border-radius:inherit;pointer-events:none;opacity:0;transition:opacity .2s;background:radial-gradient(circle at var(--sx) var(--sy),rgba(255,255,255,.55),rgba(255,255,255,.12) 38%,transparent 62%);mix-blend-mode:overlay}
.gc.hv:hover::after{opacity:1}
.gc.sel{outline:3px solid var(--accent);outline-offset:3px}
.gc.dim{opacity:.2;filter:grayscale(.8)}
.gc .q{position:absolute;right:-7px;top:-9px;min-width:30px;text-align:center;font-weight:850;font-size:.9rem;padding:2px 8px;border-radius:99px;background:var(--accent);color:var(--accent-ink);z-index:3;box-shadow:0 2px 6px rgba(0,0,0,.35);border:2px solid var(--sheet)}
.gc .flag{position:absolute;left:-5px;top:-5px;width:24px;height:24px;border-radius:50%;background:var(--danger);color:#fff;font-weight:900;display:grid;place-items:center;z-index:3;border:2px solid var(--sheet);font-size:.82rem}
.gc .own{position:absolute;left:6px;top:6px;z-index:3;font-size:.68rem;font-weight:800;padding:1px 7px;border-radius:99px;background:rgba(10,14,28,.78);color:#fff;opacity:0;transition:opacity .15s}
.gc:hover .own{opacity:1}
/* list view */
.rows{display:grid;gap:6px}
.row{display:grid;grid-template-columns:44px minmax(0,1fr) 90px 80px 70px 56px;gap:12px;align-items:center;padding:6px 10px 6px 8px;border:1px solid var(--line);border-radius:10px;background:var(--sheet);cursor:pointer;text-align:left;width:100%}
.row:hover{background:var(--pocket)}.row.sel{border-color:var(--accent);box-shadow:0 0 0 2px color-mix(in srgb,var(--accent) 40%,transparent)}.row.dim{opacity:.25}
.row .gc{width:44px;cursor:inherit;box-shadow:0 1px 3px rgba(0,0,0,.3)}
.row b{display:block;line-height:1.2}.row small{color:var(--muted)}
.row .qq{font-weight:850;text-align:right}.row .num{color:var(--muted);font-size:.85rem}
@media(max-width:700px){.row{grid-template-columns:44px minmax(0,1fr) 50px}.row .h,.row .p,.row .num{display:none}}
/* side */
.sec{padding:14px 16px}.sec h3{margin:0 0 10px;font-size:.78rem;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);display:flex;justify-content:space-between;align-items:center}
.ring{display:flex;gap:14px;align-items:center}
.ringc{--p:0;width:78px;height:78px;border-radius:50%;background:conic-gradient(var(--accent) calc(var(--p)*1%),var(--pocket) 0);display:grid;place-items:center;flex:none}
.ringc.ok{background:conic-gradient(var(--ok) 100%,var(--pocket) 0)}
.ringc span{width:58px;height:58px;border-radius:50%;background:var(--sheet);display:grid;place-items:center;font-weight:800;text-align:center;line-height:1.05}
.ringc small{display:block;font-size:.65rem;color:var(--muted);font-weight:600}
.kv{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}
.kv div{background:var(--pocket);border-radius:10px;padding:8px 10px}.kv b{display:block;font-size:1.1rem}.kv small{color:var(--muted)}
.comp{display:flex;height:10px;border-radius:5px;overflow:hidden;background:var(--pocket);margin-top:12px}.comp i{display:block;height:100%}
.legend{display:flex;gap:12px;flex-wrap:wrap;font-size:.8rem;color:var(--muted);margin-top:6px}.legend i{display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:5px}
.checks{list-style:none;margin:12px 0 0;padding:0;display:grid;gap:4px}
.checks li{display:flex;gap:8px;align-items:flex-start;font-size:.88rem;padding:5px 8px;border-radius:8px}
.checks li.go{cursor:pointer}.checks li.go:hover{background:var(--pocket)}
.checks li>b{width:18px;height:18px;border-radius:50%;display:grid;place-items:center;font-size:.72rem;flex:none;margin-top:1px;color:#fff}
.checks .ok>b{background:var(--ok)}.checks .bad>b{background:var(--danger)}.checks .info>b{background:var(--muted)}
.insp{display:grid;gap:12px}
.insp .big{width:100%;max-width:300px;margin:4px auto 6px}
.insp .big .gc{cursor:zoom-in}
.insp h4{margin:0;font-size:1.1rem;line-height:1.25}
.insp .sm{color:var(--muted);font-size:.85rem}
.facts{display:grid;grid-template-columns:1fr 1fr;gap:6px}.facts div{background:var(--pocket);border-radius:9px;padding:6px 9px;font-size:.85rem}.facts b{display:block}.facts small{color:var(--muted)}
.acts{display:flex;gap:6px;flex-wrap:wrap}
.nav{display:flex;gap:6px;align-items:center;justify-content:space-between}
.tabs{display:flex;background:var(--pocket);border-radius:11px;padding:3px;gap:2px;margin-bottom:12px}
.tab{flex:1;border:0;background:none;padding:6px 8px;border-radius:8px;font-weight:700;color:var(--muted);cursor:pointer;font-size:.82rem}
.tab[aria-selected="true"]{background:var(--sheet);color:var(--ink);box-shadow:0 1px 3px rgba(0,0,0,.12)}
.bar{display:grid;grid-template-columns:86px 1fr 28px;gap:8px;align-items:center;font-size:.85rem;margin:3px 0;padding:3px 6px;border-radius:8px;cursor:pointer;border:0;background:none;width:100%;text-align:left}
.bar:hover{background:var(--pocket)}.bar.on{background:color-mix(in srgb,var(--brand) 14%,var(--sheet))}
.bar i{display:block;height:8px;border-radius:4px;background:var(--pocket);overflow:hidden}.bar i s{display:block;height:100%;background:var(--brand);border-radius:4px}.bar span:last-child{text-align:right;font-weight:700}
.empty{padding:40px 16px;text-align:center;color:var(--muted)}.empty b{display:block;color:var(--ink);font-size:1.1rem;margin-bottom:4px}
.empty .acts{justify-content:center;margin-top:14px}
/* fullscreen table */
.main.fs{position:fixed;inset:0;z-index:50;border-radius:0;overflow:auto;padding:18px 24px;border:0}
.main.fs .tb{position:sticky;top:-18px;background:var(--sheet);z-index:6;padding-top:12px}
/* lightbox */
.lb{position:fixed;inset:0;z-index:90;background:rgba(6,8,18,.86);display:none;align-items:center;justify-content:center;flex-direction:column;gap:12px;padding:20px}
.lb.on{display:flex}
.lb .big{height:min(80dvh,calc((100vw - 140px)*88/63));aspect-ratio:63/88;max-width:calc(100vw - 140px)}
.lb .big .gc{cursor:default}
.lb .cap{color:#fff;text-align:center;font-weight:700}.lb .cap small{display:block;color:#aab1d4;font-weight:500}
.lb .x,.lb .pv,.lb .nx{position:absolute;border:0;background:rgba(255,255,255,.14);color:#fff;border-radius:12px;cursor:pointer;font-size:1.4rem;width:48px;height:60px}
.lb .x{top:14px;right:14px;height:44px;width:44px}.lb .pv{left:14px;top:50%}.lb .nx{right:14px;top:50%}
.lb .x:hover,.lb .pv:hover,.lb .nx:hover{background:rgba(255,255,255,.28)}
/* dialogs, toast */
.toast{position:fixed;left:50%;bottom:20px;transform:translateX(-50%);background:var(--ink);color:var(--bg);padding:10px 14px;border-radius:12px;display:none;gap:14px;align-items:center;z-index:120;box-shadow:0 10px 30px rgba(0,0,0,.35);max-width:92vw}
.toast.on{display:flex}.toast button{background:none;border:0;color:var(--accent);font-weight:800;cursor:pointer}
dialog{border:1px solid var(--line);border-radius:16px;background:var(--sheet);color:var(--ink);padding:0;width:min(500px,94vw);box-shadow:0 20px 60px rgba(0,0,0,.4)}
dialog::backdrop{background:rgba(8,10,20,.5)}
.dlg{padding:18px}.dlg h2{margin:0 0 12px;font-size:1.2rem}
.dlg label{display:grid;gap:4px;font-weight:650;font-size:.85rem;color:var(--muted);margin-bottom:12px}
.dlg input[type=text],.dlg textarea{border:1px solid var(--line);border-radius:10px;padding:9px 11px;background:var(--sheet);width:100%}
.dlg textarea{min-height:170px;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:.85rem}
.sws{display:flex;gap:8px;flex-wrap:wrap}.sw{width:32px;height:32px;border-radius:50%;border:3px solid transparent;background:var(--c);cursor:pointer}.sw[aria-pressed="true"]{border-color:var(--ink)}
.covs{display:flex;gap:8px;overflow:auto;padding:4px 2px 8px}.covs .gc{width:70px;flex:none}.covs .gc.sel{outline-offset:2px}
.frow{display:flex;gap:8px;justify-content:flex-end;margin-top:14px}
.hint{color:var(--muted);font-size:.82rem}
@media(prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}.gc.hv:hover{transform:none}}

:host{display:block;color:var(--ink);font:inherit}
.cf{position:absolute;inset:0;border-radius:inherit;overflow:hidden;background:var(--pocket);display:block}
.cf img{width:100%;height:100%;object-fit:cover;display:block}
.cph{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2cqw;text-align:center;padding:6cqw;background:linear-gradient(160deg,var(--pocket),var(--pocket-edge));color:var(--ink)}
.cph b{font-size:9cqw;line-height:1.15}.cph small{font-size:6cqw;color:var(--muted)}
.dbx .gc .cph b{font-size:11cqw}
.gc.hv:hover,.gc.hv:focus-visible{z-index:4}
.lb .big .gc{box-shadow:0 20px 60px rgba(0,0,0,.6)}
.main.fs{background:var(--sheet)}
.grow{flex:1;min-width:0}
`;
