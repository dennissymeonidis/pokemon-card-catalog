/* ===== editable dropdown lists (Tools) ===== */
let LEXT={};let APPX={types:[],series:[],sets:[]};
const CONDITIONS=["Mint","Near mint","Lightly played","Moderately played","Heavily played","Damaged"];
const LCI=(c,k)=>String(c[k]||"").toLowerCase().trim();
const LISTREG={
  condition:{title:"Condition",arr:CONDITIONS,lock:[],note:"Offered when you add or edit a card, in the Showcase add dialogs and in “Set condition” for selected cards.",
    use:(c,v)=>LCI(c,"condition")===v.toLowerCase(),ren:(c,o,n)=>({...c,condition:n})},
  variant:{title:"Variant",arr:VARIANTS,lock:["Normal","Holo","Reverse Holo"],note:"Offered in the card editor, in the Showcase add dialogs and used when importing a CSV. Normal, Holo and Reverse Holo are built in: prices and statistics depend on them, so they can be moved but not renamed or removed.",
    use:(c,v)=>LCI(c,"variant")===v.toLowerCase(),ren:(c,o,n)=>({...c,variant:n})},
  rarity:{title:"Rarity",arr:RARITIES,lock:[],note:"Offered in the card editor and used by the Rarity filters and chart. Keep it ordered from most common to rarest.",
    use:(c,v)=>LCI(c,"rarity")===v.toLowerCase(),ren:(c,o,n)=>({...c,rarity:n})},
  stagePokemon:{title:"Stage: Pokémon",arr:STAGES["Pokémon"],lock:["Basic","Stage 1","Stage 2"],note:"The “Stage or kind” dropdown for Pokémon cards. Basic, Stage 1 and Stage 2 are used by deck checks and filters, so they are locked.",
    use:(c,v)=>((c.details&&c.details.subtypes)||[]).includes(v)&&String(c.details.supertype||"").startsWith("Pok"),ren:(c,o,n)=>({...c,details:{...c.details,subtypes:c.details.subtypes.map(x=>x===o?n:x)}})},
  stageTrainer:{title:"Stage: Trainer",arr:STAGES["Trainer"],lock:["Item","Supporter","Stadium","Pokémon Tool"],note:"The “Stage or kind” dropdown for Trainer cards. The four standard kinds are used by deck checks and filters, so they are locked.",
    use:(c,v)=>((c.details&&c.details.subtypes)||[]).includes(v)&&String(c.details.supertype||"")==="Trainer",ren:(c,o,n)=>({...c,details:{...c.details,subtypes:c.details.subtypes.map(x=>x===o?n:x)}})},
  stageEnergy:{title:"Stage: Energy",arr:STAGES["Energy"],lock:["Basic","Special"],note:"The “Stage or kind” dropdown for Energy cards.",
    use:(c,v)=>((c.details&&c.details.subtypes)||[]).includes(v)&&String(c.details.supertype||"")==="Energy",ren:(c,o,n)=>({...c,details:{...c.details,subtypes:c.details.subtypes.map(x=>x===o?n:x)}})}
};
const LIST_DEF=Object.fromEntries(Object.entries(LISTREG).map(([k,d])=>[k,[...d.arr]]));
const lstSnap=()=>({...Object.fromEntries(Object.entries(LISTREG).map(([k,d])=>[k,[...d.arr]])),ext:LEXT});
function condOpts(cur){return `<option value="">Not set</option>`+CONDITIONS.map(x=>`<option${x===cur?" selected":""}>${esc(x)}</option>`).join("")}
function varOpts(cur){return VARIANTS.map(x=>`<option${x===cur?" selected":""}>${esc(x)}</option>`).join("")}
function applyLists(v,noRefresh){
  if(!v||typeof v!=="object")return;
  for(const [k,d] of Object.entries(LISTREG)){
    const a=v[k];if(!Array.isArray(a))continue;
    const clean=[...new Set(a.filter(x=>typeof x==="string").map(x=>x.trim()).filter(Boolean))];
    for(const l of d.lock)if(!clean.some(x=>x.toLowerCase()===l.toLowerCase()))clean.push(l);
    if(!clean.length)continue;d.arr.length=0;d.arr.push(...clean);
  }
  if(v.ext&&typeof v.ext==="object")applyExt(v.ext);
  S.lists=lstSnap();if(!noRefresh)refreshLists();
}
function refreshLists(){
  try{
    const fix=(el,html)=>{if(!el)return;const v=el.value;el.innerHTML=html;if(v&&![...el.options].some(o=>o.value===v))el.insertAdjacentHTML("beforeend",`<option>${esc(v)}</option>`);el.value=v};
    fix(F.condition,condOpts());fix(F.variant,varOpts());
    fix($("#mVar"),varOpts());fix($("#mCond"),condOpts());
    refreshExt(true);setRarity(F.rarity.value);stageOpts(F.dSuper.value,F.dStage.value);
    if(typeof LE!=="undefined"&&LE.built)lstDraw();
  }catch(e){}
}
/* ---------- the editor panel ---------- */
const LE={key:"condition",draft:[],dirty:false,built:false,msg:""};
function lstUse(key,v){const d=LISTREG[key];let n=0;for(const c of S.cards)if(d.use(c,v))n+=1;return n}
function lstLoad(key){if(XT.includes(key))return xLoad(key);LE.key=key;LE.draft=LISTREG[key].arr.map(v=>({v,o:v}));LE.dirty=false;LE.msg="";lstDraw()}
function lstDraw(){
  const el=$("#lstEdit");if(!el)return;LE.built=true;
  const xc={energy:ETYPES.length,series:SERIES_ALL.length,sets:Object.keys(SET_NAMES).length-HIDDEN_SETS.size};
  $("#lstTabs").innerHTML=(()=>{const LG={condition:"Fields",stagePokemon:"Deck stages",energy:"Reference"};const one=(k,t,c)=>(LG[k]?`<div class="lg">${LG[k]}</div>`:"")+`<button type="button" role="tab" data-lst="${k}" aria-selected="${k===LE.key}">${t} <b>${c}</b></button>`;return Object.entries(LISTREG).map(([k,x])=>one(k,esc(x.title),x.arr.length)).join("")+XT.map(k=>one(k,XTITLE[k],xc[k])).join("")})();
  if(xIs()){xDraw(el);return}
  const d=LISTREG[LE.key];
  const act=document.activeElement;const keep=act&&act.matches&&act.matches("[data-lstadd]")?act.value:"";
  el.innerHTML=`<p class="sub2 lst-note">${esc(d.note)}</p>
    <div class="lst-rows" id="lstRows">${LE.draft.map((r,i)=>{const lock=r.o&&d.lock.some(x=>x.toLowerCase()===r.o.toLowerCase());const n=r.o?lstUse(LE.key,r.o):0;
      return `<div class="lrow${lock?" locked":""}" draggable="true" data-li="${i}"><span class="lgrip" aria-hidden="true" title="Drag to reorder">⋮⋮</span><input data-lstv="${i}" value="${esc(r.v)}" ${lock?"readonly":""} aria-label="Item ${i+1}" maxlength="60">
        <small class="lcnt">${lock?`<span class="lockb" title="${r.o?(n?plural(n,"card"):"unused"):""}">Built in</span>`:r.o?(n?plural(n,"card"):"unused"):"new"}</small>
        <button type="button" data-lup="${i}" aria-label="Move up" ${i?"":"disabled"}>↑</button><button type="button" data-ldn="${i}" aria-label="Move down" ${i<LE.draft.length-1?"":"disabled"}>↓</button>
        <button type="button" class="lrm" data-lrm="${i}" aria-label="Remove ${esc(r.v)}" ${lock?"disabled title=\"Built in\"":""}>✕</button></div>`}).join("")}</div>
    <div class="lst-add"><input data-lstadd placeholder="Add an item and press Enter" maxlength="60" value="${esc(keep)}"><button type="button" class="btn ghost" data-ladd>Add</button></div>
    <div class="foot lst-foot"><button type="button" class="btn" data-lsave ${LE.dirty?"":"disabled"}>Save list</button><button type="button" class="btn ghost" data-lrevert ${LE.dirty?"":"disabled"}>Revert</button><button type="button" class="btn ghost" data-lsort>Sort A–Z</button><button type="button" class="btn ghost" data-lreset>Reset to defaults</button></div>
    <p class="status" id="lstMsg" role="status">${esc(LE.msg)}</p>`;
  if(keep){const i=el.querySelector("[data-lstadd]");i.focus();i.setSelectionRange(keep.length,keep.length)}
}
async function lstSave(){
  const d=LISTREG[LE.key];const rows=LE.draft.map(r=>({...r,v:r.v.trim()}));
  if(rows.some(r=>!r.v)){LE.msg="An item is empty. Fill it in or remove it.";lstDraw();return}
  const seen=new Set();for(const r of rows){const k=r.v.toLowerCase();if(seen.has(k)){LE.msg=`“${r.v}” appears twice.`;lstDraw();return}seen.add(k)}
  for(const l of d.lock)if(!rows.some(r=>r.v.toLowerCase()===l.toLowerCase())){LE.msg=`“${l}” is built in and must stay in the list.`;lstDraw();return}
  const ren=rows.filter(r=>r.o&&r.o!==r.v&&lstUse(LE.key,r.o)>0);
  const gone=d.arr.filter(o=>!rows.some(r=>r.o===o)&&lstUse(LE.key,o)>0);
  let update=false;
  if(ren.length||gone.length){
    const v=await askBulk(`Save the ${d.title.toLowerCase()} list?`,`${ren.length?`<p>${ren.map(r=>`<b>${esc(r.o)}</b> → <b>${esc(r.v)}</b> (${plural(lstUse(LE.key,r.o),"card")})`).join("<br>")}</p><label>Cards that already use the old names<select name="mode"><option value="update">Rename them too</option><option value="keep">Leave them unchanged</option></select></label>`:""}${gone.length?`<p class="sub2">${gone.map(o=>`${esc(o)} (${plural(lstUse(LE.key,o),"card")})`).join(", ")} removed from the list. Cards that use ${gone.length===1?"it":"them"} keep the value; it just won’t be offered for new cards.</p>`:""}`,"Save list");
    if(!v)return;update=ren.length&&v.mode==="update";
  }
  if(update){
    txBegin(`Renamed ${d.title.toLowerCase()} values`);
    try{for(const r of ren){for(const c of S.cards.filter(x=>d.use(x,r.o)))await S.store.set(c.id,dkStrip(d.ren(c,r.o,r.v)))}}finally{txEnd()}
  }
  d.arr.length=0;d.arr.push(...rows.map(r=>r.v));S.lists=lstSnap();
  try{await S.raw.lists(S.lists)}catch{}
  logAct(`Edited the ${d.title.toLowerCase()} list`);
  LE.draft=d.arr.map(v=>({v,o:v}));LE.dirty=false;LE.msg=`Saved. ${plural(d.arr.length,"item")} now appear in every ${d.title.toLowerCase()} dropdown.`;
  refreshLists();render();
}
document.addEventListener("click",async e=>{
  const root=e.target.closest("#listPanel");if(!root)return;const t=e.target;
  const tab=t.closest("[data-lst]");
  if(tab){if(LE.dirty&&!(await askConfirm("Discard your unsaved changes?","This list has changes that aren’t saved.","Discard")))return;lstLoad(tab.dataset.lst);return}
  const num=a=>+t.closest(`[data-${a}]`).dataset[a];
  if(t.closest("[data-lup]")){const i=num("lup");const A=LA();[A[i-1],A[i]]=[A[i],A[i-1]];LE.dirty=true;lstDraw();return}
  if(t.closest("[data-ldn]")){const i=num("ldn");const A=LA();[A[i+1],A[i]]=[A[i],A[i+1]];LE.dirty=true;lstDraw();return}
  if(t.closest("[data-lrm]")){const i=num("lrm");const A=LA();if(A.length<2){LE.msg="A list needs at least one item.";lstDraw();return}A.splice(i,1);LE.dirty=true;lstDraw();return}
  if(t.closest("[data-ladd]")){const inp=$("#lstEdit [data-lstadd]");const v=inp.value.trim();if(!v)return;
    if(LE.draft.some(r=>r.v.trim().toLowerCase()===v.toLowerCase())){LE.msg=`“${v}” is already in the list.`;inp.value="";lstDraw();return}
    LE.draft.push({v,o:""});LE.dirty=true;LE.msg="";inp.value="";lstDraw();$("#lstEdit [data-lstadd]").focus();return}
  if(t.closest("[data-xsave]")){xSave();return}
  if(t.closest("[data-xadd]")){xAdd($("#lstEdit"));return}
  if(t.closest("[data-xreset]")){await xReset();return}
  if(t.closest("[data-xrm]")){XE.sets.custom.splice(+t.closest("[data-xrm]").dataset.xrm,1);LE.dirty=true;lstDraw();return}
  if(t.closest("[data-xshow]")){XE.sets.hidden.clear();LE.dirty=true;lstDraw();return}
  if(t.closest("[data-xhideall]")){document.querySelectorAll("#lstEdit [data-xhid]").forEach(i=>XE.sets.hidden.add(i.dataset.xhid));LE.dirty=true;lstDraw();return}
  if(t.closest("[data-lsave]")){lstSave();return}
  if(t.closest("[data-lrevert]")){lstLoad(LE.key);return}
  if(t.closest("[data-lsort]")){const lock=LISTREG[LE.key].lock;LE.draft.sort((a,b)=>a.v.localeCompare(b.v));LE.dirty=true;LE.msg=lock.length?"Sorted. Check the order of the built-in items.":"";lstDraw();return}
  if(t.closest("[data-lreset]")){
    if(!(await askConfirm("Reset this list?","The default items come back. Items you added are removed from the list (cards keep their values).","Reset")))return;
    const def=LIST_DEF[LE.key];LE.draft=def.map(v=>({v,o:LISTREG[LE.key].arr.includes(v)?v:""}));LE.dirty=true;LE.msg="Defaults restored. Press Save list to keep them.";lstDraw()}
});
document.addEventListener("input",e=>{
  const i=e.target.closest&&e.target.closest("[data-lstv]");if(!i)return;LE.draft[+i.dataset.lstv].v=i.value;
  if(!LE.dirty){LE.dirty=true;const b=$("#lstEdit [data-lsave]"),r=$("#lstEdit [data-lrevert]");if(b)b.disabled=false;if(r)r.disabled=false}
});
const xDirty=()=>{if(!LE.dirty){LE.dirty=true;const b=$("#lstEdit [data-xsave]"),r=$("#lstEdit [data-lrevert]");if(b)b.disabled=false;if(r)r.disabled=false}};
document.addEventListener("input",e=>{
  const t=e.target;if(!t.closest||!t.closest("#lstEdit")||!xIs())return;const g=a=>t.hasAttribute("data-"+a);
  if(g("xc")){XE.energy[+t.dataset.xc].bg=t.value;xDirty()}
  else if(g("xn")){XE.energy[+t.dataset.xn].n=t.value;xDirty()}
  else if(g("xl")){XE.energy[+t.dataset.xl].l=t.value.toUpperCase();xDirty()}
  else if(g("xs")&&t.tagName==="INPUT"){XE.sets.custom[+t.dataset.xs][t.dataset.f]=t.value;xDirty()}
  else if(g("xsq")){XE.sq=t.value;const p=t.selectionStart;lstDraw();const i=$("#lstEdit [data-xsq]");if(i){i.focus();i.setSelectionRange(p,p)}}
});
document.addEventListener("change",e=>{
  const t=e.target;if(!t.closest||!t.closest("#lstEdit")||!xIs())return;const g=a=>t.hasAttribute("data-"+a);
  if(g("xv")){XE.series[+t.dataset.xv].v=t.checked?1:0;xDirty()}
  else if(g("xhid")){if(t.checked)XE.sets.hidden.delete(t.dataset.xhid);else XE.sets.hidden.add(t.dataset.xhid);xDirty();const n=XE.sets.hidden.size,sm=$("#lstEdit .xsfilter small");if(sm)sm.textContent=n?n+" hidden":"None hidden"}
  else if(g("xs")&&t.tagName==="SELECT"){XE.sets.custom[+t.dataset.xs][t.dataset.f]=t.value;xDirty()}
  else if(g("xsr")){XE.ssr=t.value;lstDraw()}
});
document.addEventListener("keydown",e=>{
  if(e.key==="Enter"&&xIs()&&e.target.matches&&e.target.matches("#lstEdit .lst-add input")){e.preventDefault();xAdd($("#lstEdit"));return}
  if(e.key==="Enter"&&e.target.matches&&e.target.matches("#lstEdit [data-lstadd]")){e.preventDefault();$("#lstEdit [data-ladd]").click()}
});
/* drag to reorder */
let lstDrag=-1;
document.addEventListener("dragstart",e=>{const r=e.target.closest&&e.target.closest("#lstRows .lrow[draggable]");if(!r)return;lstDrag=+r.dataset.li;e.dataTransfer.effectAllowed="move";try{e.dataTransfer.setData("text/plain",String(lstDrag))}catch{}r.classList.add("drag")});
document.addEventListener("dragover",e=>{const r=e.target.closest&&e.target.closest("#lstRows .lrow");if(!r||lstDrag<0)return;e.preventDefault();document.querySelectorAll("#lstRows .over").forEach(x=>x.classList.remove("over"));r.classList.add("over")});
document.addEventListener("drop",e=>{const r=e.target.closest&&e.target.closest("#lstRows .lrow");if(!r||lstDrag<0)return;e.preventDefault();const to=+r.dataset.li;if(to!==lstDrag){const A=LA();const [m]=A.splice(lstDrag,1);A.splice(to,0,m);LE.dirty=true}lstDrag=-1;lstDraw()});
document.addEventListener("dragend",()=>{lstDrag=-1;document.querySelectorAll("#lstRows .drag,#lstRows .over").forEach(x=>x.classList.remove("drag","over"))});
/* ===== editable energy types, expansions and sets ===== */
const XT=["energy","series","sets"];
const XTITLE={energy:"Energy types",series:"Expansions",sets:"Sets"};
const xIs=()=>XT.includes(LE.key);
const LA=()=>xIs()?XE[LE.key]:LE.draft;
const XE={energy:[],series:[],sets:{custom:[],hidden:new Set()},sq:"",ssr:""};
const xlum=h=>{const n=parseInt(h.slice(1),16);return (0.299*(n>>16)+0.587*((n>>8)&255)+0.114*(n&255))/255};
function applyExt(x){
  x=x&&typeof x==="object"?x:{};
  for(const t of APPX.types){delete TYPE[t];delete V2TC[t]}
  for(const s of APPX.series)delete SERIES_SETS[s];
  for(const c of APPX.sets){const a=SERIES_SETS[c.series];if(a){const i=a.indexOf(c.code);if(i>-1)a.splice(i,1)}delete SET_NAMES[c.code];delete SET_YEARS[c.code];delete SERIES_BY_CODE[c.code];KNOWN_NAMES.delete(c.name)}
  for(const [k,v] of Object.entries(LBASE.type))TYPE[k]=[...v];Object.assign(V2TC,LBASE.v2tc);
  APPX={types:[],series:[],sets:[]};HIDDEN_SETS.clear();
  /* energy types */
  const names=[];const eg=Array.isArray(x.energy)?x.energy:[];
  for(const e of eg){
    if(!e||typeof e.n!=="string")continue;const n=e.n.trim();if(!n||names.includes(n))continue;
    const bg=/^#[0-9a-f]{6}$/i.test(e.bg||"")?e.bg:"";
    if(LBASE.etypes.includes(n)){if(bg){TYPE[n]=[bg,TYPE[n][1],TYPE[n][2]];V2TC[n]=bg}}
    else{const c=bg||"#8888aa";TYPE[n]=[c,xlum(c)>.6?"#16181d":"#fff",String(e.l||n[0]).trim().slice(0,2).toUpperCase()||n[0].toUpperCase()];V2TC[n]=c;APPX.types.push(n)}
    names.push(n);
  }
  for(const n of LBASE.etypes)if(!names.includes(n))names.push(n);
  ETYPES.length=0;SPRITE.length=0;
  if(eg.length){ETYPES.push(...names);SPRITE.push(...names)}else{ETYPES.push(...LBASE.etypes);SPRITE.push(...LBASE.sprite)}
  /* expansions */
  const order=[],vis=new Set();
  for(const s of Array.isArray(x.series)?x.series:[]){
    if(!s||typeof s.n!=="string")continue;const n=s.n.trim();if(!n||order.includes(n))continue;
    if(!SERIES_SETS[n]){SERIES_SETS[n]=[];APPX.series.push(n)}
    order.push(n);if(s.v!==0)vis.add(n);
  }
  for(const n of LBASE.series)if(!order.includes(n)){order.push(n);vis.add(n)}
  SERIES_ALL.length=0;SERIES_ALL.push(...order);SERIES_ORDER.length=0;SERIES_ORDER.push(...order.filter(n=>vis.has(n)));
  /* sets */
  const sx=x.sets&&typeof x.sets==="object"?x.sets:{};
  for(const c of Array.isArray(sx.custom)?sx.custom:[]){
    const code=String(c&&c.code||"").trim().toUpperCase(),name=String(c&&c.name||"").trim(),ser=String(c&&c.series||"").trim();
    if(!code||!name||!SERIES_SETS[ser]||SET_NAMES[code]||SERIES_BY_CODE[code])continue;
    SERIES_SETS[ser].push(code);SET_NAMES[code]=name;SERIES_BY_CODE[code]=ser;if(+c.year)SET_YEARS[code]=+c.year;KNOWN_NAMES.add(name);APPX.sets.push({code,name,series:ser});
  }
  for(const h of Array.isArray(sx.hidden)?sx.hidden:[])HIDDEN_SETS.add(String(h));
  LEXT=x;
}
function refreshExt(noRender){
  try{
    const grid=$("#etGrid");
    if(grid){const on=new Set(S.types||[]);grid.innerHTML=SPRITE.map(t=>`<label class="etp"><input type="checkbox" value="${esc(t)}"${on.has(t)?" checked":""}>${en(t)}<span class="nm">${esc(t)}</span><small data-tc="${esc(t)}"></small><i class="tick" aria-hidden="true"></i></label>`).join("")}
    const tops=(el,none)=>{if(!el)return;const v=el.value;el.innerHTML=typeOpts(none);if(v&&!ETYPES.includes(v))el.insertAdjacentHTML("beforeend",`<option>${esc(v)}</option>`);el.value=v};
    tops(F.dType1,"Not set");tops(F.dType2,"None");tops(F.dWeakT,"None");tops(F.dResT,"None");
    setSeriesCode(F.series.value,F.setCode.value,customName());
  }catch(e){}
  if(!noRender){try{render()}catch(e){}}
}
function xLoad(key){
  LE.key=key;LE.dirty=false;LE.msg="";
  if(key==="energy")XE.energy=ETYPES.map(n=>({n,bg:TYPE[n][0],l:TYPE[n][2],c:!LBASE.etypes.includes(n),fresh:false}));
  if(key==="series")XE.series=SERIES_ALL.map(n=>({n,v:SERIES_ORDER.includes(n)?1:0,c:!LBASE.series.includes(n)}));
  if(key==="sets"){const sx=LEXT.sets||{};XE.sets={custom:(sx.custom||[]).map(c=>({code:String(c.code||""),name:String(c.name||""),series:String(c.series||""),year:c.year||""})),hidden:new Set(sx.hidden||[])};if(!XE.ssr||!SERIES_ALL.includes(XE.ssr))XE.ssr=SERIES_ALL[0];XE.sq=""}
  lstDraw();
}
const xTypeUse=n=>S.cards.filter(c=>c.details&&(c.details.types||[]).includes(n)).length;
function xDraw(el){
  const k=LE.key,msg=`<p class="status" id="lstMsg" role="status">${esc(LE.msg)}</p>`;
  const foot=`<div class="foot lst-foot"><button type="button" class="btn" data-xsave ${LE.dirty?"":"disabled"}>Save list</button><button type="button" class="btn ghost" data-lrevert ${LE.dirty?"":"disabled"}>Revert</button><button type="button" class="btn ghost" data-xreset>Reset to defaults</button></div>`;
  const arrows=(i,n,rm,why)=>`<button type="button" data-lup="${i}" aria-label="Move up" ${i?"":"disabled"}>↑</button><button type="button" data-ldn="${i}" aria-label="Move down" ${i<n-1?"":"disabled"}>↓</button><button type="button" class="lrm" data-lrm="${i}" aria-label="Remove" ${rm?"":`disabled title="${why||"Built in"}"`}>✕</button>`;
  if(k==="energy"){
    el.innerHTML=`<p class="sub2 lst-note">Order, colour and extra types. The 11 official types keep their names and icons; you can reorder them and change the colour used in charts and badges. Custom types get a letter badge. The order applies to the filter, the card editor, deck statistics and charts.</p>
    <div class="lst-rows" id="lstRows">${XE.energy.map((r,i)=>{const n=xTypeUse(r.n);
      return `<div class="lrow xe" draggable="true" data-li="${i}"><span class="lgrip" aria-hidden="true">⋮⋮</span><input type="color" data-xc="${i}" value="${esc(r.bg)}" aria-label="Colour for ${esc(r.n)}"><span class="xn">${r.c?"":`<span class="xic">${en(r.n)}</span>`}${r.fresh?`<input data-xn="${i}" value="${esc(r.n)}" maxlength="24" aria-label="Name">`:`<b>${esc(r.n)}</b>`}</span>
        ${r.c?`<input class="xl" data-xl="${i}" value="${esc(r.l)}" maxlength="2" aria-label="Letter">`:`<span></span>`}<small class="lcnt">${n?plural(n,"card"):"unused"}</small>${arrows(i,XE.energy.length,r.c&&!n,r.c&&n?"Cards use this type":"")}</div>`}).join("")}</div>
    <div class="lst-add xadd"><input data-xaddn placeholder="New type name" maxlength="24"><input type="color" data-xaddc value="#7a8cff" aria-label="Colour"><input data-xaddl placeholder="Letter" maxlength="2" style="max-width:70px"><button type="button" class="btn ghost" data-xadd>Add type</button></div>${foot}${msg}`;
  }else if(k==="series"){
    el.innerHTML=`<p class="sub2 lst-note">Order and visibility of expansions (series) in dropdowns and sort order. Hidden expansions are still understood: cards that use them keep working, and the Format rules still list them. Official names are locked because the Expanded rules match on them; you can add your own.</p>
    <div class="lst-rows" id="lstRows">${XE.series.map((r,i)=>{const n=S.cards.filter(c=>seriesOf(c)===r.n).length;const used=XE.sets.custom.some(s=>s.series===r.n)||(LEXT.sets&&(LEXT.sets.custom||[]).some(s=>s.series===r.n));
      return `<div class="lrow xs" draggable="true" data-li="${i}"><span class="lgrip" aria-hidden="true">⋮⋮</span><label class="xv" title="Show in dropdowns"><input type="checkbox" data-xv="${i}" ${r.v?"checked":""} aria-label="Show ${esc(r.n)}"></label><span class="xn"><b>${esc(r.n)}</b>${seriesYears(r.n)?` <small>${esc(seriesYears(r.n))}</small>`:""}</span><small class="lcnt">${n?plural(n,"card"):"unused"}</small>${arrows(i,XE.series.length,r.c&&!used&&!n,used?"Custom sets use this expansion":n?"Cards use this expansion":"")}</div>`}).join("")}</div>
    <div class="lst-add"><input data-xaddn placeholder="New expansion name (e.g. Japanese exclusives)" maxlength="48"><button type="button" class="btn ghost" data-xadd>Add expansion</button></div>${foot}${msg}`;
  }else{
    const ser=XE.ssr,q=XE.sq.trim().toLowerCase(),all=ser==="*";
    const applied=new Set(APPX.sets.map(x=>x.code));
    const rows=[];
    for(const s of SERIES_ALL){if(!all&&s!==ser)continue;for(const c of SERIES_SETS[s]||[]){if(applied.has(c))continue;rows.push({code:c,name:SET_NAMES[c]||"",year:SET_YEARS[c]||"",series:s})}}
    const shown=rows.filter(r=>!q||r.code.toLowerCase().includes(q)||r.name.toLowerCase().includes(q));
    const cus=XE.sets.custom.map((c,i)=>({c,i})).filter(({c})=>(all||c.series===ser)&&(!q||c.code.toLowerCase().includes(q)||c.name.toLowerCase().includes(q)));
    const serOpts=sel=>SERIES_ALL.map(s=>`<option${s===sel?" selected":""}>${esc(s)}</option>`).join("");
    const nh=XE.sets.hidden.size;
    el.innerHTML=`<p class="sub2 lst-note">Tick a set to show it in the Set and Set code dropdowns; untick to hide the ones you don’t collect. Cards that already use a hidden set keep it. Add your own sets (promos, Japanese or custom prints) at the bottom; they appear in every dropdown next to the official ones.</p>
    <div class="xsfilter"><select data-xsr aria-label="Expansion"><option value="*"${all?" selected":""}>All expansions</option>${serOpts(ser)}</select><input type="search" data-xsq placeholder="Search sets" value="${esc(XE.sq)}"><small>${nh?`${nh} hidden`:"None hidden"}</small><button type="button" class="btn ghost" data-xshow>Show all</button><button type="button" class="btn ghost" data-xhideall>Hide these</button></div>
    <div class="lst-rows xsets" id="lstRows">${cus.map(({c,i})=>`<div class="lrow xcs"><span class="xtag" title="Your own set">Custom</span><input data-xs="${i}" data-f="code" value="${esc(c.code)}" maxlength="10" placeholder="Code" style="text-transform:uppercase"><input data-xs="${i}" data-f="name" value="${esc(c.name)}" placeholder="Set name" maxlength="60"><input data-xs="${i}" data-f="year" value="${esc(c.year)}" placeholder="Year" maxlength="4" inputmode="numeric"><select data-xs="${i}" data-f="series" aria-label="Expansion">${serOpts(c.series)}</select><button type="button" class="lrm" data-xrm="${i}" aria-label="Remove ${esc(c.name||c.code)}">✕</button></div>`).join("")}
      ${shown.slice(0,400).map(r=>{const n=S.cards.filter(c=>String(c.setCode||"").toUpperCase()===r.code).length;return `<div class="lrow xos"><label class="xv"><input type="checkbox" data-xhid="${esc(r.code)}" ${XE.sets.hidden.has(r.code)?"":"checked"} aria-label="Show ${esc(r.name||r.code)}"></label><b class="xcode">${esc(r.code)}</b><span class="xn">${esc(r.name)}</span><small class="lcnt">${r.year||""}</small><small class="lcnt">${n?plural(n,"card"):""}</small></div>`}).join("")}${shown.length>400?`<p class="sub2">Showing the first 400. Narrow it with the search.</p>`:""}${!shown.length&&!cus.length?`<p class="sub2">No sets match.</p>`:""}</div>
    <div class="lst-add xadds"><input data-xac placeholder="Code (e.g. XYZ)" maxlength="10" style="max-width:110px;text-transform:uppercase"><input data-xan placeholder="Set name"><input data-xay placeholder="Year" maxlength="4" inputmode="numeric" style="max-width:80px"><select data-xas aria-label="Expansion">${serOpts(all?SERIES_ALL[0]:ser)}</select><button type="button" class="btn ghost" data-xadd>Add set</button></div>${foot}${msg}`;
  }
}
function xAdd(root){
  const k=LE.key,q=s=>root.querySelector(s);
  if(k==="energy"){
    const n=q("[data-xaddn]").value.trim();if(!n)return;
    if(XE.energy.some(r=>r.n.toLowerCase()===n.toLowerCase())){LE.msg=`“${n}” already exists.`;lstDraw();return}
    XE.energy.push({n,bg:q("[data-xaddc]").value,l:(q("[data-xaddl]").value.trim()||n[0]).toUpperCase().slice(0,2),c:true,fresh:true});
  }else if(k==="series"){
    const n=q("[data-xaddn]").value.trim();if(!n)return;
    if(XE.series.some(r=>r.n.toLowerCase()===n.toLowerCase())||n.toLowerCase()==="other"){LE.msg=`“${n}” already exists.`;lstDraw();return}
    XE.series.push({n,v:1,c:true});
  }else{
    const code=q("[data-xac]").value.trim().toUpperCase(),name=q("[data-xan]").value.trim(),year=q("[data-xay]").value.trim(),series=q("[data-xas]").value;
    if(!code||!name){LE.msg="A set needs a code and a name.";lstDraw();return}
    const off=Object.keys(SET_NAMES).some(c=>c===code&&!APPX.sets.some(x=>x.code===code));
    if(off||XE.sets.custom.some(c=>c.code.toUpperCase()===code)){LE.msg=`The code ${code} is already used.`;lstDraw();return}
    XE.sets.custom.push({code,name,series,year});
  }
  LE.dirty=true;LE.msg="";lstDraw();
}
async function xSave(){
  const k=LE.key;const ext={...LEXT};
  if(k==="energy"){
    const seen=new Set();for(const r of XE.energy){const n=r.n.trim();if(!n){LE.msg="A type has no name.";lstDraw();return}if(seen.has(n.toLowerCase())){LE.msg=`“${n}” appears twice.`;lstDraw();return}seen.add(n.toLowerCase());r.n=n}
    const lost=ETYPES.filter(n=>!LBASE.etypes.includes(n)&&!XE.energy.some(r=>r.n===n)&&xTypeUse(n)>0);
    if(lost.length){LE.msg=`Cards still use ${lost.join(", ")}. Remove it from those cards first.`;lstDraw();return}
    ext.energy=XE.energy.map(r=>({n:r.n,bg:r.bg,l:r.l}));
  }else if(k==="series"){const lost=SERIES_ALL.filter(n=>!LBASE.series.includes(n)&&!XE.series.some(r=>r.n===n)&&S.cards.some(c=>seriesOf(c)===n));if(lost.length){LE.msg=`Cards still use ${lost.join(", ")}.`;lstDraw();return}ext.series=XE.series.map(r=>({n:r.n,v:r.v?1:0}))}
  else{
    const seen=new Set();for(const c of XE.sets.custom){
      c.code=c.code.trim().toUpperCase();c.name=c.name.trim();
      if(!c.code||!c.name){LE.msg="Every custom set needs a code and a name.";lstDraw();return}
      if(seen.has(c.code)||(Object.keys(SET_NAMES).includes(c.code)&&!APPX.sets.some(x=>x.code===c.code))){LE.msg=`The code ${c.code} is already used.`;lstDraw();return}
      if(c.year&&!/^\d{4}$/.test(String(c.year).trim())){LE.msg=`“${c.year}” isn’t a year.`;lstDraw();return}
      seen.add(c.code);
    }
    ext.sets={custom:XE.sets.custom.map(c=>({code:c.code,name:c.name,series:c.series,year:+c.year||""})),hidden:[...XE.sets.hidden]};
  }
  applyExt(ext);S.lists=lstSnap();
  try{await S.raw.lists(S.lists)}catch{}
  logAct(`Edited the ${XTITLE[k].toLowerCase()} list`);
  LE.msg="Saved. Every matching dropdown on the site now uses it.";refreshExt(false);xLoad(k);LE.msg="Saved. Every matching dropdown on the site now uses it.";lstDraw();
}

async function xReset(){
  if(!(await askConfirm("Reset this list?","The defaults come back. Nothing is saved until you press Save list.","Reset")))return;
  const k=LE.key;
  if(k==="energy")XE.energy=LBASE.etypes.map(n=>({n,bg:LBASE.type[n][0],l:LBASE.type[n][2],c:false,fresh:false}));
  if(k==="series")XE.series=LBASE.series.map(n=>({n,v:1,c:false}));
  if(k==="sets")XE.sets={custom:[],hidden:new Set()};
  LE.dirty=true;LE.msg="Defaults restored. Press Save list to keep them.";lstDraw();
}

try{const l=JSON.parse(localStorage.getItem("pokemon-catalog-lists-v1")||"null");if(l)applyLists(l,true)}catch{}
try{const l=JSON.parse(localStorage.getItem("pokemon-catalog-wish-v1")||"null");if(Array.isArray(l)&&l.length&&!(S.wish&&S.wish.length))S.wish=l}catch{}
lstLoad("condition");refreshLists();

const costHtml=cost=>`<span class="dcost">${cost.map((t,i)=>`<button type="button" class="dcx" data-ci="${i}" title="Remove ${esc(t)}">${en(t)}</button>`).join("")||`<small class="dnone">Free</small>`}<select class="dcadd" aria-label="Add an energy to the cost"><option value="">+ Energy</option>${ETYPES.map(t=>`<option>${t}</option>`).join("")}</select></span>`;
function ablRow(a){return `<div class="drow abl"><input name="ablName" placeholder="Ability name" value="${esc(a.name||"")}"><textarea name="ablText" rows="2" placeholder="What it does">${esc(a.text||"")}</textarea><button type="button" class="x" data-drm aria-label="Remove this ability">×</button></div>`}
function atkRow(a){const cost=Array.isArray(a.cost)?a.cost:[];return `<div class="drow atk"><input type="hidden" name="atkCost" value="${esc(JSON.stringify(cost))}"><div class="dcostw">${costHtml(cost)}</div><input name="atkName" placeholder="Attack name" value="${esc(a.name||"")}"><input name="atkDmg" class="ddmg" placeholder="Damage" value="${esc(a.damage||"")}"><textarea name="atkText" rows="2" placeholder="Attack text (optional)">${esc(a.text||"")}</textarea><button type="button" class="x" data-drm aria-label="Remove this attack">×</button></div>`}
function fillDetailFields(d){
  d=d||{};const L=x=>Array.isArray(x)?x:[];
  const sup=String(d.supertype||"");const supN=sup.toLowerCase().startsWith("pok")?"Pokémon":sup.toLowerCase().startsWith("trainer")?"Trainer":sup.toLowerCase().startsWith("energy")?"Energy":"";
  F.dSuper.value=supN;
  const subs=L(d.subtypes).map(String);const known=Object.values(STAGES).flat();
  const stage=subs.find(x=>(STAGES[supN]||known).includes(x))||"";
  stageOpts(supN,stage);
  F.dTags.value=subs.filter(x=>x!==stage).join(", ");
  F.dHp.value=d.hp||"";F.dType1.value=L(d.types)[0]||"";F.dType2.value=L(d.types)[1]||"";
  F.dEvo.value=d.evolvesFrom||"";F.dRetreat.value=d.retreat!=null?d.retreat:"";F.dIllus.value=d.illustrator||"";
  const w=L(d.weaknesses)[0]||{},r=L(d.resistances)[0]||{};
  F.dWeakT.value=w.type||"";F.dWeakV.value=w.value||"";F.dResT.value=r.type||"";F.dResV.value=r.value||"";
  $("#dAbl").innerHTML=L(d.abilities).map(ablRow).join("");
  $("#dAtk").innerHTML=L(d.attacks).map(atkRow).join("");
  F.dRules.value=L(d.rules).join("\n");F.dFlavor.value=d.flavor||"";
}
function readDetailFields(old){
  const v=k=>F[k].value.trim();
  const rows=sel=>[...$(sel).querySelectorAll(".drow")];
  const abilities=rows("#dAbl").map(r=>({name:r.querySelector("[name=ablName]").value.trim(),text:r.querySelector("[name=ablText]").value.trim()||null})).filter(a=>a.name||a.text);
  const attacks=rows("#dAtk").map(r=>{let cost=[];try{cost=JSON.parse(r.querySelector("[name=atkCost]").value)}catch{}return {name:r.querySelector("[name=atkName]").value.trim(),cost,damage:r.querySelector("[name=atkDmg]").value.trim()||null,text:r.querySelector("[name=atkText]").value.trim()||null}}).filter(a=>a.name||a.text||a.damage);
  const subtypes=[v("dStage"),...v("dTags").split(",").map(x=>x.trim())].filter(Boolean);
  const types=[v("dType1"),v("dType2")].filter(Boolean);
  const d={supertype:v("dSuper"),subtypes,hp:v("dHp")||null,types,evolvesFrom:v("dEvo")||null,retreat:v("dRetreat")!==""?Math.max(0,Math.min(5,Math.round(+v("dRetreat")))):null,illustrator:v("dIllus")||null,
    weaknesses:v("dWeakT")?[{type:v("dWeakT"),value:v("dWeakV")||"×2"}]:[],resistances:v("dResT")?[{type:v("dResT"),value:v("dResV")||"-30"}]:[],
    abilities,attacks,rules:F.dRules.value.split("\n").map(x=>x.trim()).filter(Boolean),flavor:v("dFlavor")||null};
  const empty=!d.supertype&&!subtypes.length&&!d.hp&&!types.length&&!d.evolvesFrom&&d.retreat==null&&!d.illustrator&&!d.weaknesses.length&&!d.resistances.length&&!abilities.length&&!attacks.length&&!d.rules.length&&!d.flavor;
  if(empty&&!old)return null;
  return {...(old||{}),...d,edited:new Date().toISOString()};
}
$("#editForm").addEventListener("click",e=>{
  const add=e.target.closest("[data-dadd]");if(add){const box=add.dataset.dadd==="abl"?$("#dAbl"):$("#dAtk");box.insertAdjacentHTML("beforeend",add.dataset.dadd==="abl"?ablRow({}):atkRow({}));const i=box.lastElementChild.querySelector("input:not([type=hidden])");if(i)i.focus();return}
  const rm=e.target.closest("[data-drm]");if(rm){rm.closest(".drow").remove();return}
  const cx=e.target.closest(".dcx");if(cx){const row=cx.closest(".drow");const h=row.querySelector("[name=atkCost]");let c=[];try{c=JSON.parse(h.value)}catch{}c.splice(+cx.dataset.ci,1);h.value=JSON.stringify(c);row.querySelector(".dcostw").innerHTML=costHtml(c)}
});
$("#editForm").addEventListener("change",e=>{
  const ad=e.target.closest(".dcadd");if(!ad||!ad.value)return;const row=ad.closest(".drow");const h=row.querySelector("[name=atkCost]");let c=[];try{c=JSON.parse(h.value)}catch{}c.push(ad.value);h.value=JSON.stringify(c);row.querySelector(".dcostw").innerHTML=costHtml(c);
});

// ---------- one card sheet: view and edit together ----------
const edDirty=()=>!!S.editing&&edSnap()!==S.edSnap;
async function edTryClose(){document.querySelectorAll(".picview").forEach(o=>o.remove());if(edDirty()&&!(await askConfirm("Discard your changes?","You changed this card but didn’t save it.","Discard changes")))return;$("#editor").close("cancel")}
$("#edCancel").onclick=edTryClose;
$("#editor").addEventListener("cancel",e=>{if(edDirty()){e.preventDefault();edTryClose()}});
$("#edFields").addEventListener("input",()=>edPreview());
$("#edFields").addEventListener("change",()=>edPreview());
$("#edFields").addEventListener("click",e=>{if(e.target.closest("[data-dadd],[data-drm],.dcx"))setTimeout(edPreview,0)});
$("#edTop").addEventListener("click",async e=>{
  const lb=e.target.closest("#edLang");if(lb){
    if(S.lang==="el"){S.lang="en";try{localStorage.setItem("pk-lang","en")}catch{}renderEdTop(S.editing);return}
    S.lang="el";try{localStorage.setItem("pk-lang","el")}catch{}
    if(S.editing.details&&S.editing.details.el){renderEdTop(S.editing);return}
    const st=$("#fillStatus");st.textContent="Μετάφραση στα ελληνικά…";lb.disabled=true;
    try{const t=await translateDetails(S.editing);S.editing={...S.editing,details:t.details};st.textContent=""}catch(err){S.lang="en";st.textContent=fillErr(err).replace("Filling in details","Translating")}
    renderEdTop(S.editing);return;
  }
});
{let sx=null,sy=0;const ed=$("#editor");
 ed.addEventListener("touchstart",e=>{if(e.touches.length===1&&!e.target.closest("input,textarea,select,.drow")){sx=e.touches[0].clientX;sy=e.touches[0].clientY}else sx=null},{passive:true});
 ed.addEventListener("touchend",e=>{if(sx==null)return;const t=e.changedTouches[0];const dx=t.clientX-sx,dy=t.clientY-sy;sx=null;if(Math.abs(dx)>70&&Math.abs(dx)>Math.abs(dy)*1.6)edGo(dx<0?1:-1)});}
// ---------- add a card to one pocket from a photo ----------
const pocketFile=document.createElement("input");pocketFile.type="file";pocketFile.accept="image/*";pocketFile.className="vh";pocketFile.setAttribute("aria-label","Choose a photo of one card");document.body.appendChild(pocketFile);
function pickForPocket(pg,slot){S.pocketTarget={b:$("#binderNo").value,pg,slot};pocketFile.value="";pocketFile.click()}
pocketFile.onchange=()=>{const f=pocketFile.files[0];const t=S.pocketTarget;if(f&&t)addFromPhotoFile(f,t)};
async function addFromPhotoFile(f,t){
  if(!f||!t)return;S.pocketTarget=t;
  const blob=await shrink(f,3000);const url=URL.createObjectURL(blob);
  const draft={locType:"binder",binder:t.b,page:t.pg,slot:t.slot,qty:1,variant:"Normal",name:""};
  S.pendingPic={blob,url};
  openEditor(null);for(const k of["binder","page","slot"])F[k].value=draft[k];F.locType.value="binder";toggleLoc();
  $("#editTitle").textContent=`Add a card to page ${t.pg}, pocket ${t.slot}`;$("#editTitle").classList.remove("hidden");
  $("#edTop").innerHTML=`<img class="fullcard" style="max-width:220px" alt="Your photo" src="${url}"><p class="status" id="pkStatus" style="text-align:center"></p>`;
  $("#edFields").open=true;
  await edIdentify(blob,url);
};

async function edIdentify(blob,url){
  const st=$("#pkStatus");
  if(!S.sample){st.textContent="Card reading isn’t available here. Type the card’s name, then save.";F.name.focus();return}
  st.textContent="Reading the card. This can take up to a minute.";
  const prompt=`This photo shows ONE Pokémon Trading Card Game card, possibly in a plastic sleeve, angled or sideways. Identify it.
Reply with only a JSON object: {"name": string, "set": expansion name or null, "setCode": official expansion abbreviation such as "PAL", "SVI" or "MEG" (printed next to the number on newer cards), or null, "regMark": the regulation mark letter printed at the bottom left, or null, "number": collector number exactly as printed such as "025/165", or null, "rarity": string or null, "variant": one of ${JSON.stringify(VARIANTS)}, "confidence": "high" or "low", "note": short string saying what was unclear, or null}
Use null instead of guessing anything you cannot read.`;
  try{
    const r=await PKL.identifyOne(blob);
    if(!$("#editor").open||S.pendingPic?.url!==url)return;
    if(!r||!r.name)throw {code:"invalid_json"};
    const put=(k,v)=>{if(v!=null&&v!==""&&!F[k].value)F[k].value=v};
    put("name",String(r.name));if(!F.setCode.value&&!F.set.value&&(r.setCode||r.set))setSeriesCode("",String(r.setCode||"").toUpperCase(),String(r.set||""));put("regMark",String(r.regMark||"").toUpperCase());put("number",r.number);if(r.rarity&&!F.rarity.value)setRarity(String(r.rarity));
    if(VARIANTS.includes(r.variant))F.variant.value=r.variant;
    st.textContent=r.confidence==="low"?`Check this one${r.note?": "+r.note:""}. Fix anything that looks off, then save.`:"Found it. Check the details, then save.";
  }catch(e){if($("#editor").open)st.textContent=(fillErr(e).replace("fill in the details","read the card").replace("Filling in details","Reading cards"))+" You can type the details yourself."}
}
async function edReadPhoto(f){
  const blob=await shrink(f,3000);const url=URL.createObjectURL(blob);
  if(S.pendingPic&&S.pendingPic.url)URL.revokeObjectURL(S.pendingPic.url);
  S.pendingPic={blob,url};S.pendingTcg=null;
  $("#edTop").innerHTML=`<img class="fullcard" style="max-width:220px" alt="Your photo" src="${url}"><p class="status" id="pkStatus" style="text-align:center"></p>`;
  $("#edFields").open=true;
  await edIdentify(blob,url);
}
const edFile=document.createElement("input");edFile.type="file";edFile.accept="image/*";edFile.className="vh";edFile.setAttribute("aria-label","Choose a photo of one card");document.body.appendChild(edFile);
$("#edPhotoBtn").onclick=()=>{edFile.value="";edFile.click()};
edFile.onchange=()=>{const f=edFile.files[0];if(f)edReadPhoto(f)};
/* ---- shared TCGdex search inside the editor ---- */
let EDF={list:[],shown:60};
async function edSearch(){
  const q=$("#edQ").value.trim(),q2=$("#edQ2").value.trim(),st=$("#edFSt");
  if(q.replace(/[^a-z]/gi,"").length<2){st.textContent="Type at least two letters of the card name.";return}
  st.textContent="Searching TCGdex…";$("#edRes").innerHTML="";
  let list;try{list=await PKL.tget("/cards?name="+encodeURIComponent(q))}catch{st.textContent="Couldn’t reach TCGdex. Check your internet connection, or type the details below.";return}
  const out=[];
  for(const x of list||[]){
    const sid=x.id.slice(0,x.id.length-String(x.localId).length-1);const r=PKL.setRow(sid);if(!r)continue;
    if(q2){const u=q2.toUpperCase();const numq=/^\d+$/.test(q2);
      if(numq){if(parseInt(x.localId,10)!==parseInt(q2,10))continue}
      else if(!(String(r[2]).split(":")[0]===u||sid.toUpperCase()===u||String(r[1]).toUpperCase().includes(u)))continue}
    out.push({...x,sid,row:r});
  }
  out.sort((a,b)=>String(b.row[6]||"").localeCompare(String(a.row[6]||""))||String(a.localId).localeCompare(String(b.localId),undefined,{numeric:true}));
  EDF.list=out;EDF.shown=60;
  st.textContent=out.length?`${plural(out.length,"result")}. Pick the card you own.`:"No matching cards found. Check the spelling, or type the details below.";
  edShow();
}
function edShow(){
  $("#edRes").innerHTML=EDF.list.slice(0,EDF.shown).map((x,i)=>`<button type="button" class="sctile" data-edix="${i}"><span class="scimg">${x.image?`<img alt="" loading="lazy" src="${esc(x.image)}/low.webp">`:""}</span><b>${esc(x.name)}</b><small>${esc(x.row[1])} · ${esc(x.localId)}/${esc(x.row[3])}</small></button>`).join("")+(EDF.list.length>EDF.shown?`<button type="button" class="btn ghost" data-edmore>Show more</button>`:"");
}
async function edPick(x){
  const st=$("#edFSt");st.textContent="Loading card…";
  let f;try{f=await PKL.cardById(x.id)}catch{st.textContent="Couldn’t load that card. Try another, or type the details below.";return}
  const r=x.row,rar=f.rarity&&f.rarity!=="None"?f.rarity:"";
  F.name.value=f.name;setSeriesCode(r[5]||"",String(r[2]).split(":")[0],r[1]);
  F.number.value=`${f.localId}/${String(r[3]).padStart(String(f.localId).length,"0")}`;
  if(rar)setRarity(rar);
  if(!VARIANTS.includes(F.variant.value)||F.variant.value==="Normal"||F.variant.value==="Holo")F.variant.value=SC_PLAIN.test(rar)||!rar?"Normal":"Holo";
  if(f.set&&f.set.id)F.apiSetId.value=f.set.id;
  if(f.regulationMark)F.regMark.value=String(f.regulationMark).toUpperCase();
  S.pendingTcg=f;
  const pr=PKL.priceOf(f);
  if(!S.pendingPic)$("#edTop").innerHTML=`<img class="fullcard" style="max-width:220px" alt="${esc(f.name)}" src="${f.image?esc(f.image)+"/high.webp":""}">${pr&&pr.trend!=null?`<p class="status" style="text-align:center">Cardmarket ≈ €${(+pr.trend).toFixed(2)}</p>`:""}`;
  $("#edRes").innerHTML="";EDF.list=[];
  st.textContent=`${f.name} · ${r[1]} ${f.localId}/${r[3]}. Check the details, then save.`;
  $("#edFields").open=true;
}
$("#edGo").onclick=edSearch;
for(const id of["#edQ","#edQ2"])$(id).addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();e.stopPropagation();edSearch()}});
$("#edRes").addEventListener("click",e=>{const b=e.target.closest("[data-edix]");if(b)edPick(EDF.list[+b.dataset.edix]);if(e.target.closest("[data-edmore]")){EDF.shown+=60;edShow()}});
/* open the editor to add a card, with a destination already chosen */
function openAdd(p){
  p=p||{};openEditor(null);
  if(p.locType)F.locType.value=p.locType;
  if(p.deck!=null)F.deck.value=p.deck;
  for(const k of["binder","page","slot"])if(p[k]!=null)F[k].value=p[k];
  toggleLoc();
  if(p.title){$("#editTitle").textContent=p.title;$("#editTitle").classList.remove("hidden")}
  S.edSnap=edSnap();setTimeout(()=>{const q=$("#edQ");if(q)q.focus()},60);
}

// ---------- export ----------
const csvVal=(c,k)=>{const d=c.details||{};if(k==="series")return seriesOf(c);if(k==="regMark")return c.regMark||d.regulationMark||"";if(k==="location")return locLabel(c);if(k==="dex")return dexOf(c)||"";if(k==="hp")return d.hp||"";if(k==="types")return (d.types||[]).join("/");const wr=(a,p)=>(a||[]).filter(x=>x&&x.type).map(x=>p?x.type:(x.value||"")).join("/");if(k==="weakness")return wr(d.weaknesses,1);if(k==="weaknessAmount")return wr(d.weaknesses,0);if(k==="resistance")return wr(d.resistances,1);if(k==="resistanceAmount")return wr(d.resistances,0);if(k==="stage")return (d.subtypes||[]).join(" ");if(k==="attacks")return (d.attacks||[]).map(a=>a.name+(a.damage?" "+a.damage:"")).join("; ");if(k==="tcgdexId")return c.tcgdexId||"";if(k==="price"){const u=unitVal(c);return u==null?"":u}if(k==="priceUpdated")return c.price&&c.price.updated?String(c.price.updated):"";if(k==="detailsUpdated")return c.detailsAt||d.filled||"";return c[k]};
async function exportCsv(){
  if(!S.downloads)return;
  const cols=["name","set","series","setCode","number","regMark","rarity","variant","qty","condition","location","binder","page","slot","deck","hp","types","weakness","weaknessAmount","resistance","resistanceAmount","stage","attacks","dex","notes","tcgdexId","price","priceUpdated","detailsUpdated"];
  const q=x=>{x=String(x??"");return /[",\n]/.test(x)?'"'+x.replace(/"/g,'""')+'"':x};
  const lines=[cols.join(",")].concat(S.cards.map(c=>cols.map(k=>q(csvVal(c,k))).join(",")));
  try{await S.downloads.save({filename:"pokemon-cards.csv",data:lines.join("\n")})}catch(e){}
}

// ---------- wiring ----------
document.querySelectorAll(".seg [data-mode]").forEach(b=>b.onclick=async()=>{
  if(S.review.length&&!(await askConfirm("Discard these cards?","The cards waiting for review haven’t been added yet.","Discard")))return;
  S.mode=b.dataset.mode;S.review=[];renderReview();
  document.querySelectorAll(".seg [data-mode]").forEach(x=>x.setAttribute("aria-pressed",x===b));
  $("#binderFields").classList.toggle("hidden",S.mode!=="binder");$("#deckFields").classList.toggle("hidden",S.mode!=="deck");
  renderBinder();
});
["#binderNo","#pageNo"].forEach(s=>$(s).addEventListener("input",renderBinder));
$("#photo").onchange=async e=>{
  const files=[...e.target.files];if(!files.length)return;
  S.queue=files.slice(1);S.qTotal=files.length;S.qIdx=1;
  await loadPhoto(files[0]);
  if(files.length>1){setStatus(`Batch of ${files.length} photos. Each one is read in turn; review and add it, and the next one loads.`);if(S.sample)identify()}
};
async function loadPhoto(f){
  if(S.photo)URL.revokeObjectURL(S.photo.url);
  setPhoto(await shrink(f,4200));S.review=[];clearCrops();renderReview();$("#rotate").classList.remove("hidden");
  $("#fileLabel").textContent=S.qTotal>1?`Photo ${S.qIdx} of ${S.qTotal}`:"Change photo";$("#identify").disabled=!S.sample;renderBinder();
}
async function nextInQueue(){
  if(!S.queue||!S.queue.length){if(S.qTotal>1){setStatus(`Batch finished: all ${S.qTotal} photos done.`);S.qTotal=0;$("#fileLabel").textContent="Choose photo"}return}
  const f=S.queue.shift();S.qIdx++;await loadPhoto(f);
  if(S.sample)identify();
}
function locNamed(c){return c.locType==="showcase"?`Showcase: ${c.deck||"Showcase"}`:c.locType==="deck"?`Deck: ${c.deck||"unnamed"}`:`${binderName(c.binder||"?")}, page ${c.page||"?"}, pocket ${c.slot||"?"}`}
function dupHtml(r){
  const k=cardKey(r);const nm=String(r.name||"").trim().toLowerCase(),no=String(r.number||"").trim();
  const m=S.cards.filter(c=>cardKey(c)===k||(no&&String(c.name||"").trim().toLowerCase()===nm&&String(c.number||"").trim()===no));
  if(!m.length)return "";
  const here=S.mode==="binder"?m.filter(c=>c.locType==="binder"&&String(c.binder)===String($("#binderNo").value)&&String(c.page)===String($("#pageNo").value)&&+c.slot===+r.slot):[];
  const others=m.filter(c=>!here.includes(c));const q=others.reduce((a,c)=>a+(+c.qty||1),0);
  let t=here.length?"Already catalogued in this pocket; adding replaces it. ":"";
  if(others.length)t+=`You already have ${q} ${q===1?"copy":"copies"}: ${others.slice(0,3).map(locNamed).join("; ")}${others.length>3?"…":""}`;
  return `<div class="dup">${esc(t.trim())}</div>`;
}
$("#identify").onclick=identify;
$("#rotate").onclick=async()=>{if(!S.photo)return;setPhoto(await rotateBlob(S.photo.blob,90));S.review=[];clearCrops();renderReview();setStatus("")};
$("#reviewList").addEventListener("change",e=>{if(e.target.dataset.k==="slot"){syncReviewInputs();renderBinder()}});
$("#commit").onclick=commit;
$("#discard").onclick=()=>{S.review=[];clearCrops();renderReview();setStatus("");if(S.queue&&S.queue.length){clearPhoto();nextInQueue()}};
$("#reviewList").addEventListener("click",e=>{const b=e.target.closest("[data-rm]");if(!b)return;syncReviewInputs();S.review.splice(+b.dataset.rm,1);renderReview()});
$("#q").addEventListener("input",e=>{S.q=e.target.value;render()});
$("#etGrid").innerHTML=SPRITE.map(t=>`<label class="etp"><input type="checkbox" value="${t}">${en(t)}<span class="nm">${t}</span><small data-tc="${t}"></small><i class="tick" aria-hidden="true"></i></label>`).join("");
$("#etGrid").addEventListener("change",e=>{const i=e.target;if(i.type!=="checkbox")return;if(i.checked)S.types.add(i.value);else S.types.delete(i.value);render()});
$("#etfClear").onclick=()=>{S.types.clear();document.querySelectorAll("#etGrid input").forEach(i=>i.checked=false);render()};
$("#sort").onchange=e=>{S.sort=e.target.value;S.sortDir=SORT_DESC_FIRST.includes(S.sort)?"desc":"asc";saveSort();render()};
$("#sortDir").onclick=()=>{S.sortDir=S.sortDir==="desc"?"asc":"desc";saveSort();render()};
const COLSORT={card:"name",dex:"dex",ex:"set",sr:"series",mk:"mark",fm:"format",ra:"rarity",st:"stage",ty:"type",qty:"count",pr:"price",loc:"loc"};
const SORT_DESC_FIRST=["rarity","count","price"];
function saveSort(){try{localStorage.setItem("pk-sort",JSON.stringify({k:S.sort,d:S.sortDir}))}catch{}}
function sortBy(id){const k=COLSORT[id];if(!k)return;if(S.sort===k)S.sortDir=S.sortDir==="desc"?"asc":"desc";else{S.sort=k;S.sortDir=SORT_DESC_FIRST.includes(k)?"desc":"asc"}saveSort();render()}
try{const o=JSON.parse(localStorage.getItem("pk-sort")||"null");if(o&&o.k){S.sort=o.k;S.sortDir=o.d==="desc"?"desc":"asc"}}catch{}
// ---------- column move and resize ----------
let colDrag=null;
const lst=$("#list");
lst.addEventListener("pointerdown",e=>{
  const h=e.target.closest(".lh[tabindex]");if(!h||isNarrow()||e.button>0)return;
  const rz=e.target.closest("[data-rz]");e.preventDefault();
  if(rz){colDrag={mode:"rz",id:h.dataset.col,sx:e.clientX,w:h.getBoundingClientRect().width,rz};rz.classList.add("on");document.body.classList.add("col-resizing")}
  else colDrag={mode:"mv",id:h.dataset.col,sx:e.clientX,el:h,moved:false,target:null,after:false};
  try{h.setPointerCapture(e.pointerId)}catch{}
});
lst.addEventListener("pointermove",e=>{
  const d=colDrag;if(!d)return;
  if(d.mode==="rz"){S.cols.w[d.id]=Math.max(36,Math.round(d.w+e.clientX-d.sx));setColsTpl();return}
  if(!d.moved&&Math.abs(e.clientX-d.sx)<6)return;
  d.moved=true;d.el.classList.add("moving");
  const y=d.el.getBoundingClientRect().top+4;const hit=document.elementFromPoint(e.clientX,y);
  const t=hit&&hit.closest(".lh[tabindex]");
  lst.querySelectorAll(".ins-before,.ins-after").forEach(x=>x.classList.remove("ins-before","ins-after"));
  if(t&&t!==d.el){const r=t.getBoundingClientRect();d.after=e.clientX>r.left+r.width/2;d.target=t.dataset.col;t.classList.add(d.after?"ins-after":"ins-before")}else d.target=null;
});
function endCol(cancel){
  const d=colDrag;colDrag=null;if(!d)return;
  document.body.classList.remove("col-resizing");
  if(d.mode==="rz"){d.rz.classList.remove("on");if(cancel)return;saveCols();render();return}
  d.el.classList.remove("moving");lst.querySelectorAll(".ins-before,.ins-after").forEach(x=>x.classList.remove("ins-before","ins-after"));
  if(!cancel&&!d.moved){sortBy(d.id);return}
  if(cancel||!d.moved||!d.target)return;
  moveCol(d.id,d.target,d.after);
}
function moveCol(id,target,after){
  const o=S.cols.order.filter(x=>x!==id);let i=o.indexOf(target)+(after?1:0);if(i<1)i=1;
  o.splice(i,0,id);S.cols.order=o;saveCols();render();
}
lst.addEventListener("pointerup",()=>endCol(false));
lst.addEventListener("pointercancel",()=>endCol(true));
lst.addEventListener("keydown",e=>{
  const h=e.target.closest(".lh[tabindex]");if(h&&(e.key==="Enter"||e.key===" ")){e.preventDefault();const id=h.dataset.col;sortBy(id);const f=lst.querySelector(`.lh[data-col="${id}"]`);if(f)f.focus();return}
  if(!h||(e.key!=="ArrowLeft"&&e.key!=="ArrowRight"))return;
  const id=h.dataset.col,dir=e.key==="ArrowRight"?1:-1;
  if(e.shiftKey){e.preventDefault();S.cols.w[id]=Math.max(36,Math.round(h.getBoundingClientRect().width+dir*16));saveCols();render()}
  else if(e.altKey){e.preventDefault();const vis=S.cols.order.filter(x=>!S.cols.hidden.includes(x));const j=vis.indexOf(id)+dir;if(j<1||j>=vis.length)return;moveCol(id,vis[j],dir>0)}
  else return;
  const f=lst.querySelector(`.lh[data-col="${id}"]`);if(f)f.focus();
});
$("#resetCols").onclick=()=>{S.cols={order:COLS.map(c=>c.id),w:{},hidden:[]};saveCols();render()};
$("#colList").addEventListener("change",e=>{
  const i=e.target.closest("[data-colt]");if(!i)return;const id=i.dataset.colt;
  S.cols.hidden=S.cols.hidden.filter(x=>x!==id);if(!i.checked)S.cols.hidden.push(id);
  saveCols();render();
});
$("#colList").addEventListener("click",e=>{if(e.target.closest("[data-colreset]")){S.cols.hidden=[];saveCols();render()}});
document.addEventListener("click",e=>{const m=$("#colMenu");if(m.open&&!m.contains(e.target))m.open=false});
matchMedia("(max-width:600px)").addEventListener("change",()=>render());
$("#expF").onchange=e=>{S.exp=e.target.value;render()};
$("#serF").onchange=e=>{S.ser=e.target.value;render()};
$("#kindChips").addEventListener("click",e=>{const b=e.target.closest("[data-k]");if(!b)return;S.kind=b.dataset.k;S.tk="";render()});
$("#tkChips").addEventListener("click",e=>{const b=e.target.closest("[data-tk]");if(!b)return;S.tk=b.dataset.tk;render()});
$("#stageF").onchange=e=>{S.stage=e.target.value;render()};
$("#fmtF").onchange=e=>{S.fmt=e.target.value;render()};
// ---------- format rules (Standard / Expanded) ----------
const MARKS="ABCDEFGHIJKLMN".split("");
const FMT_DEFAULT={season:"2026–27 Standard (from 10 April 2026)",std:["H","I","J"],exp:["Mega Evolution","Scarlet & Violet","Sword & Shield","Sun & Moon","XY","Black & White"]};
function setFormats(o,fromDb){
  const std=Array.isArray(o&&o.std)?o.std.map(x=>String(x).toUpperCase()).filter(x=>MARKS.includes(x)):FMT_DEFAULT.std;
  const exp=Array.isArray(o&&o.exp)?o.exp.filter(x=>typeof x==="string"):FMT_DEFAULT.exp;
  S.formats={season:String(o&&o.season||""),std,exp};
  if(fromDb)S.formatsFromDb=true;
  drawFormats();if(S.cards)render();
}
function markOfG(g){return (g.es.map(x=>x.regMark||x.details&&x.details.regulationMark).find(Boolean)||"").toUpperCase().trim()}
function fmtOf(g){
  const F2=S.formats||FMT_DEFAULT;const c=g.f;const d=g.es.map(x=>x.details).find(Boolean);
  const basicEnergy=d&&String(d.supertype||"").toLowerCase().startsWith("energy")&&(d.subtypes||[]).some(x=>String(x).toLowerCase()==="basic");
  if(basicEnergy)return {std:true,exp:true,unk:false};
  const m=markOfG(g);const ser=seriesOf(c);
  const std=!!m&&F2.std.includes(m);
  const exp=std||F2.exp.includes(ser)||(!!m&&m>="D");
  return {std,exp,unk:!m&&ser==="Other"};
}
function drawFormats(){
  const f=S.formats||FMT_DEFAULT;const a=$("#fmtStd"),b=$("#fmtExp");if(!a||!b)return;
  if(document.activeElement&&document.activeElement.closest&&document.activeElement.closest("#fmtPanel"))return;
  $("#fmtSeason").value=f.season||"";
  a.innerHTML=MARKS.slice(3).map(m=>`<label class="fmtc"><input type="checkbox" value="${m}"${f.std.includes(m)?" checked":""}><span class="rmk">${m}</span></label>`).join("");
  b.innerHTML=[...SERIES_ALL].map(x=>`<label class="fmtc"><input type="checkbox" value="${esc(x)}"${f.exp.includes(x)?" checked":""}><span>${esc(x)}</span></label>`).join("");
}
$("#fmtSave").onclick=async()=>{
  const o={season:$("#fmtSeason").value.trim(),std:[...document.querySelectorAll("#fmtStd input:checked")].map(i=>i.value),exp:[...document.querySelectorAll("#fmtExp input:checked")].map(i=>i.value)};
  const st=$("#fmtStatus");st.classList.remove("err");
  try{await S.raw.fmt(o);S.formats=o;render();st.textContent=`Saved. Standard: ${o.std.join(", ")||"none"}.`;logAct(`Updated format rules${o.season?` (${o.season})`:""}`)}
  catch(e){st.textContent="The rules didn’t save. Try again.";st.classList.add("err")}
};
$("#fmtReset").onclick=()=>{S.formats={...FMT_DEFAULT};const ae=document.activeElement;if(ae)ae.blur();drawFormats();$("#fmtStatus").textContent="Reset. Tap Save format rules to keep this."};
try{const lf=JSON.parse(localStorage.getItem("pokemon-catalog-formats-v1")||"null");S.formats=lf?{season:lf.season||"",std:lf.std||FMT_DEFAULT.std,exp:lf.exp||FMT_DEFAULT.exp}:{...FMT_DEFAULT}}catch{S.formats={...FMT_DEFAULT}}
drawFormats();
$("#locF").onchange=e=>{S.loc=e.target.value;if(S.loc&&S.filter==="all"){}render()};
document.querySelectorAll(".chip").forEach(b=>b.onclick=()=>{S.filter=b.dataset.f;if(S.loc&&S.filter!=="all"&&!S.loc.startsWith(S.filter==="binder"?"b:":"d:"))S.loc="";document.querySelectorAll(".chip").forEach(x=>x.setAttribute("aria-pressed",x===b));render()});
$("#list").addEventListener("keydown",e=>{const z=e.target.closest&&e.target.closest(".gzoom");if(z&&(e.key==="Enter"||e.key===" ")){e.preventDefault();e.stopPropagation();const c=S.cards.find(x=>x.id===z.dataset.zoom);if(c)cpLightbox(c)}},true);
$("#list").addEventListener("click",e=>{
  const z=e.target.closest(".gzoom");if(z){e.preventDefault();e.stopPropagation();const c=S.cards.find(x=>x.id===z.dataset.zoom);if(c)cpLightbox(c);return}
  const b=e.target.closest(".card,.gcard");if(!b||!b.dataset.id)return;
  if(S.selMode){const k=b.dataset.key;if(S.sel.has(k))S.sel.delete(k);else S.sel.add(k);b.classList.toggle("picked",S.sel.has(k));b.setAttribute("aria-pressed",S.sel.has(k));updBulk();return}
  const c=S.cards.find(x=>x.id===b.dataset.id);if(c)zoomCard(c,b.querySelector(".thumb,img")||b,S.listOrder);
});
// ---------- views, selection, advanced search ----------
function advActive(){const A=S.adv;return ["hpMin","hpMax","text","illus","mark","qty","pic","real","det","pmin","pmax","dup","priced","added"].filter(k=>String(A[k]||"").trim()!=="").length}
const ADVF={hpMin:"#advHpMin",hpMax:"#advHpMax",text:"#advText",illus:"#advIllus",mark:"#advMark",qty:"#advQty",pic:"#advPic",real:"#advReal",det:"#advDet",pmin:"#advPMin",pmax:"#advPMax",dup:"#advDup",priced:"#advPriced",added:"#advAdded"};
function hasReal(c){return !!realImg(c)}
for(const [k,sel] of Object.entries(ADVF))$(sel).addEventListener("input",e=>{S.adv[k]=e.target.value.trim();render()});

/* v2: dropdown pills with checkbox menus (like the prototype) */
const V2P=[["exp","#expF","Set",true],["rar","#rarF","Rarity",true],["fmt","#fmtF","Format",true],["loc","#locF","Location",false]];
let v2open="";
function v2PillInit(){
  const box=$("#v2pills");if(!box||box.dataset.ready)return;box.dataset.ready="1";
  const mk=(k,lab,wide)=>box.insertAdjacentHTML("beforeend",`<div class="v2pop" data-k="${k}"><button type="button" class="v2pill" data-v2t="${k}"><span>${lab}</span><i class="v2n"></i> ▾</button><div class="v2menu${wide?" wide":""}"><div class="v2mtop"></div><div class="v2mbody"></div></div></div>`);
  mk("exp","Set");mk("rar","Rarity",true);mk("types","Energy type",true);mk("loc","Location");mk("fmt","Format");
  const et=document.querySelector("fieldset.etf");if(et)box.querySelector('[data-k="types"] .v2mbody').appendChild(et);
  const am=$("#advMark");const ag=document.querySelector("#advBox .advgrid");
  {const l=$("#serF")&&$("#serF").closest("label"),sl=$("#v2dExp");if(l&&sl)sl.appendChild(l)}
  const wh=document.querySelector('.chips[aria-label="Where the cards are"]');
  if(wh){const fr=wh.closest(".frow");box.querySelector('[data-k="loc"] .v2mtop').appendChild(wh);if(fr)fr.style.display="none"}
  const kr=$("#kindChips").closest(".frow");const r1=document.createElement("div");r1.className="v2r1";kr.parentNode.insertBefore(r1,kr);r1.appendChild(kr);r1.appendChild(box);r1.appendChild($("#advBox"));
  const vv=document.querySelector(".v2views");const fc=$("#fClearAll");if(vv&&fc)vv.appendChild(fc);
  const fh=document.querySelector(".fbox .fhead");if(fh)fh.style.display="none";
  const pp=$("#v2per");if(pp){pp.value=String(v2per);pp.onchange=()=>{v2per=+pp.value;try{localStorage.setItem("pk-per",String(v2per))}catch{}v2page=1;render()}}
  document.querySelectorAll(".v2pager").forEach(pgr=>pgr.addEventListener("click",e=>{const b=e.target.closest("[data-v2pg]");if(!b||b.disabled)return;v2page=+b.dataset.v2pg;v2nav=true;render();const t=$(".v2resbar");if(t)t.scrollIntoView({block:"start",behavior:"smooth"})}));
  const adv=$("#advBox");
  adv.addEventListener("click",e=>{
    const ch=e.target.closest("[data-v2st]");if(ch){const v=ch.dataset.v2st;V2F.stage.has(v)?V2F.stage.delete(v):V2F.stage.add(v);render();return}
    if(e.target.closest("#v2advReset")){for(const [k,sel] of Object.entries(ADVF)){S.adv[k]="";$(sel).value=""}V2F.stage.clear();render();return}
    if(e.target.closest("#v2show")){adv.open=false;return}
    if(e.target.closest("#v2saveView")){v2SaveView();return}
  });
  adv.addEventListener("change",e=>{const t=e.target.closest("[data-v2tog]");if(!t)return;const el=$("#"+t.dataset.v2tog);el.value=t.checked?t.dataset.on:"";el.dispatchEvent(new Event("input"))});
  const ql=$("#v2addcard");if(ql)ql.onclick=()=>{const b=$("#addManual");if(b)b.click()};
  box.addEventListener("click",e=>{
    const t=e.target.closest("[data-v2t]");
    if(t){const k=t.dataset.v2t;v2open=v2open===k?"":k;v2Pills();return}
    const cb=e.target.closest("input[data-v2c]");
    if(cb){const [k,sel]=V2P.find(x=>x[0]===cb.dataset.v2c).slice(0,2);const el=$(sel),v=cb.value,multi=V2P.find(x=>x[0]===k)[3];
      if(!multi){el.value=cb.checked?v:"";el.dispatchEvent(new Event("change"));return}
      const set=V2F[k];if(el.value){set.add(el.value);el.value="";el.dispatchEvent(new Event("change"))}
      cb.checked?set.add(v):set.delete(v);
      if(set.size===1){const only=[...set][0];set.clear();el.value=only;el.dispatchEvent(new Event("change"))}
      else if(set.size===0){el.value="";el.dispatchEvent(new Event("change"))}
      else render();
    }
    const cl=e.target.closest("[data-v2clear]");
    if(cl){const k=cl.dataset.v2clear;if(k==="types"){$("#etfClear").click();return}const el=$(V2P.find(x=>x[0]===k)[1]);V2F[k]&&V2F[k].clear();el.value="";el.dispatchEvent(new Event("change"))}
  });
  window.addEventListener("resize",()=>v2Fit());
  document.addEventListener("click",e=>{if(v2open&&!e.composedPath().some(n=>n.classList&&n.classList.contains("v2pop"))){v2open="";v2Pills()}});
}
function v2Fit(){document.querySelectorAll(".v2pop .v2menu").forEach(m=>{m.style.left="";if(!m.closest(".v2pop.open"))return;const sc=m.closest(".screen")||document.body,sr=sc.getBoundingClientRect(),lim=Math.min(sr.right,document.documentElement.clientWidth)-16,lo=Math.max(sr.left,0)+8,r=m.getBoundingClientRect(),over=r.right-lim;if(over>0)m.style.left=-Math.min(over,Math.max(0,r.left-lo))+"px"})}
function v2Pills(){
  v2PillInit();const box=$("#v2pills");if(!box)return;
  document.querySelectorAll("[data-v2tog]").forEach(t=>{t.checked=$("#"+t.dataset.v2tog).value===t.dataset.on});
  document.querySelectorAll("[data-v2st]").forEach(b=>b.setAttribute("aria-pressed",V2F.stage.has(b.dataset.v2st)||S.stage===b.dataset.v2st));
  v2Views();
  for(const [k,sel,lab,multi] of V2P){
    const el=$(sel),pop=box.querySelector(`[data-k="${k}"]`);if(!el||!pop)continue;
    const opts=[...el.options].filter(o=>o.value!=="");
    const chosen=new Set(multi?V2F[k]:[]);if(el.value)chosen.add(el.value);
    const cn=chosen.size+(k==="loc"&&S.filter!=="all"?1:0);
    pop.querySelector(".v2n").textContent=cn?cn:"";
    pop.querySelector(".v2pill").classList.toggle("on",cn>0);
    pop.classList.toggle("open",v2open===k);
    pop.querySelector(".v2mbody").innerHTML=`<div class="v2mh"><span>${esc(lab)}</span><button type="button" class="linkbtn" data-v2clear="${k}">Clear</button></div>`+(k==="rar"&&opts.length?`<div class="etgrid">${(()=>{const rc={};S.cards.forEach(c=>{const r=c.rarity||"__none__";rc[r]=(rc[r]||0)+(+c.qty||1)});return opts.map(o=>{const m=o.value==="__none__"?"":String(pkRar(o.value)).match(/^<span[^>]*>[\s\S]*?<\/span>/);return `<label class="etp rrp"><input type="checkbox" data-v2c="rar" value="${esc(o.value)}"${chosen.has(o.value)?" checked":""}><span class="rsy" aria-hidden="true">${m?m[0]:""}</span><span class="nm">${esc(o.textContent)}</span><small>${rc[o.value]||""}</small><i class="tick" aria-hidden="true"></i></label>`}).join("")})()}</div>`:opts.length?opts.map(o=>`<label><input type="${multi?"checkbox":"radio"}" name="v2r-${k}" data-v2c="${k}" value="${esc(o.value)}"${chosen.has(o.value)?" checked":""}>${esc(o.textContent)}</label>`).join(""):`<p class="sub2" style="padding:6px 10px">Nothing to choose yet.</p>`);
  }
  {const vc=$("#v2count");if(vc){const tot=new Set(S.cards.map(cardKey)).size;const val=(S.shown||[]).reduce((a,g)=>{const u=gUnit(g);return a+(u==null?0:u*g.count)},0);{const n=(S.shown||[]).length;const a=(v2page-1)*v2per+1,b=Math.min(v2page*v2per,n);vc.innerHTML=(n>v2per?`Showing <b>${a}–${b}</b> of ${n}${n<tot?" matching":""} cards`:`<b>${n}</b> of ${tot} cards`)+` · ${eur(val)} total`}}}
  const tp=box.querySelector('[data-k="types"]');if(tp){const n=S.types.size;tp.querySelector(".v2n").textContent=n||"";tp.querySelector(".v2pill").classList.toggle("on",n>0);tp.classList.toggle("open",v2open==="types")}
  v2Fit();
}

/* v2: user-saved views */
function v2LoadViews(){try{return JSON.parse(localStorage.getItem("pk-views")||"[]")}catch{return[]}}
function v2StoreViews(a){try{localStorage.setItem("pk-views",JSON.stringify(a))}catch{}}
function v2Views(){
  const host=document.querySelector(".v2views");if(!host)return;
  host.querySelectorAll("[data-v2sv]").forEach(x=>x.remove());
  const fc=$("#fClearAll");
  v2LoadViews().forEach((v,i)=>{const b=document.createElement("span");b.className="chip v2sv";b.dataset.v2sv=i;b.innerHTML=`<span data-v2sva="${i}" role="button" tabindex="0">${esc(v.n)}</span><button type="button" data-v2svx="${i}" aria-label="Delete view ${esc(v.n)}">×</button>`;host.insertBefore(b,fc||null)});
}
async function v2SaveView(){
  const v=await askBulk("Save this view",`<label>Name<input name="n" placeholder="e.g. Expensive Fire cards" maxlength="40"></label>`,"Save");
  const n=v&&String(v.n||"").trim();if(!n)return;
  const st={filter:S.filter,kind:S.kind||"",tk:S.tk||"",ser:S.ser,exp:S.exp,rar:S.rar,stage:S.stage,fmt:S.fmt,loc:S.loc,month:S.month,adv:{...S.adv},types:[...S.types],v2:Object.fromEntries(Object.entries(V2F).map(([k,x])=>[k,[...x]]))};
  const a=v2LoadViews().filter(x=>x.n!==n);a.push({n,st});v2StoreViews(a);v2Views();
}
function v2ApplyView(i){
  const v=v2LoadViews()[i];if(!v)return;const st=v.st;resetFilters();
  S.filter=st.filter||"all";document.querySelectorAll(".chip[data-f]").forEach(x=>x.setAttribute("aria-pressed",x.dataset.f===S.filter));
  S.kind=st.kind;S.tk=st.tk;S.ser=st.ser;S.exp=st.exp;S.rar=st.rar;S.stage=st.stage;S.fmt=st.fmt;S.loc=st.loc;S.month=st.month;
  $("#stageF").value=S.stage;$("#fmtF").value=S.fmt;
  for(const [k,sel] of Object.entries(ADVF)){S.adv[k]=(st.adv&&st.adv[k])||"";$(sel).value=S.adv[k]}
  S.types=new Set(st.types||[]);document.querySelectorAll("#etGrid input").forEach(x=>x.checked=S.types.has(x.value));
  for(const k of Object.keys(V2F))V2F[k]=V2F[k];(st.v2?Object.entries(st.v2):[]).forEach(([k,a])=>a.forEach(x=>V2F[k].add(x)));
  render();
}
/* v2: advanced drawer close, quick views, quick search */
document.addEventListener("click",e=>{const a=$("#advBox");if(a&&a.open&&e.target===a)a.open=false;const go=e.target.closest&&e.target.closest("[data-v2go]");if(go){const k=go.dataset.v2go;if(k==="collection"){show("collection");return}resetFilters();const set=(f,val)=>{S.adv[f]=val;$(ADVF[f]).value=val};if(k==="det")set("det","no");if(k==="nopic")set("pic","no");show("collection");render();return}const sa=e.target.closest&&e.target.closest("[data-v2sva]");if(sa){v2ApplyView(+sa.dataset.v2sva);return}const sx=e.target.closest&&e.target.closest("[data-v2svx]");if(sx){const a=v2LoadViews();a.splice(+sx.dataset.v2svx,1);v2StoreViews(a);v2Views();return}const v=e.target.closest&&e.target.closest("[data-v2view]");if(v){const k=v.dataset.v2view;resetFilters();const set=(f,val)=>{S.adv[f]=val;$(ADVF[f]).value=val};if(k==="val")set("pmin","10");if(k==="dup")set("dup","yes");if(k==="det")set("det","no");if(k==="nopic")set("pic","no");const a2=$("#advBox");if(a2)a2.open=false;render()}});
(function(){
  const box=document.createElement("div");box.id="v2cmd";box.setAttribute("role","dialog");box.setAttribute("aria-label","Quick search");box.innerHTML='<input id="v2in" placeholder="Jump to a screen or find a card…" autocomplete="off"><ul id="v2list"></ul>';document.body.appendChild(box);
  const sc=document.createElement("div");sc.id="v2scrim";document.body.appendChild(sc);
  const SCR=[["Home","home"],["Binders","binders"],["Decks","decks"],["Showcase","showcase"],["Cards","collection"],["Stats","stats"],["Tools","tools"]];
  const list=q=>{q=q.trim().toLowerCase();const a=SCR.filter(x=>x[0].toLowerCase().includes(q)).map(x=>[`Go to ${x[0]}`,"Screen","s:"+x[1]]);const b=q.length>1?[...new Map(S.cards.filter(c=>String(c.name).toLowerCase().includes(q)).map(c=>[c.name,c])).values()].slice(0,8).map(c=>[c.name,[c.set||c.setCode,c.number].filter(Boolean).join(" · "),"c:"+c.name]):[];
    $("#v2list").innerHTML=[...a,...b].map(([t,sub,k],i)=>`<li data-k="${esc(k)}" class="${i?"":"sel"}"><span>${esc(t)}</span><small>${esc(sub)}</small></li>`).join("")};
  window.v2Cmd=()=>open();
  const open=()=>{box.classList.add("on");sc.classList.add("on");$("#v2in").value="";list("");$("#v2in").focus()};
  const close=()=>{box.classList.remove("on");sc.classList.remove("on")};
  const run=k=>{close();if(k.startsWith("s:"))show(k.slice(2));else{const n=k.slice(2);resetFilters();S.q=n;$("#q").value=n;show("collection");render()}};
  $("#v2in").oninput=e=>list(e.target.value);
  $("#v2in").onkeydown=e=>{if(e.key==="Enter"){const li=$("#v2list li");if(li)run(li.dataset.k)}};
  $("#v2list").onclick=e=>{const li=e.target.closest("li");if(li)run(li.dataset.k)};
  sc.onclick=close;
  document.addEventListener("keydown",e=>{
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="k"){e.preventDefault();open();return}
    if(e.key==="Escape"){close();const a=$("#advBox");if(a&&a.open)a.open=false;return}
    if(e.key==="/"&&!/INPUT|SELECT|TEXTAREA/.test((document.activeElement||{}).tagName||"")){const q=$("#q");if(q){e.preventDefault();show("collection");q.focus()}}
  });
})();
$("#advClear").onclick=()=>{for(const [k,sel] of Object.entries(ADVF)){if(k==="mark")continue;S.adv[k]="";$(sel).value=""}render()};
$("#rarF").onchange=e=>{S.rar=e.target.value;render()};
$("#fClearAll").onclick=()=>{const q=S.q;resetFilters();S.q=q;$("#q").value=q;render()};
{const gr=$("#gsize");if(gr)gr.oninput=()=>{S.gw=+gr.value;$("#list").style.setProperty("--gw",S.gw+"px");try{localStorage.setItem("pk-gw",S.gw)}catch{}const big=S.gw>260;if(big!==!!S.gwBig){S.gwBig=big;render()}}}
document.querySelectorAll(".vseg button").forEach(b=>b.onclick=()=>{S.view=b.dataset.view;document.querySelectorAll(".vseg button").forEach(x=>x.setAttribute("aria-pressed",x===b));try{localStorage.setItem("pk-view",S.view)}catch{}render()});
try{{const sv=localStorage.getItem("pk-view");if(sv==="grid"||sv==="compact"){S.view=sv;document.querySelectorAll(".vseg button").forEach(x=>x.setAttribute("aria-pressed",x.dataset.view===sv))}}}catch{}
$("#selMode").onclick=()=>{S.selMode=!S.selMode;if(!S.selMode)S.sel.clear();$("#selMode").setAttribute("aria-pressed",S.selMode);$("#selMode").textContent=S.selMode?"Done selecting":"Select cards";render()};
function selEntries(){const out=[];for(const c of S.cards)if(S.sel.has(cardKey(c)))out.push(c);return out}
function updBulk(){
  const bar=$("#bulkBar");if(!bar)return;bar.classList.toggle("hidden",!S.selMode);
  const es=selEntries();const q=es.reduce((a,c)=>a+(+c.qty||1),0);
  $("#bulkCount").textContent=`${S.sel.size} selected${S.sel.size?` (${plural(q,"card")})`:""}`;
  bar.querySelectorAll("[data-bulk]").forEach(x=>{if(!["all","none"].includes(x.dataset.bulk))x.disabled=!S.sel.size});
}
function askBulk(title,body,ok){
  return new Promise(res=>{const d=$("#bulkDlg");$("#bkTitle").textContent=title;$("#bkBody").innerHTML=body;$("#bkOk").textContent=ok;d.returnValue="";
    d.addEventListener("close",()=>{if(d.returnValue!=="ok")return res(null);const v={};$("#bkBody").querySelectorAll("[name]").forEach(i=>v[i.name]=i.value);res(v)},{once:true});d.showModal()});
}
function freeSlots(b,startPage,count){
  const used=new Set(S.cards.filter(c=>c.locType==="binder"&&+c.binder===+b&&+c.slot).map(c=>c.page+"-"+c.slot));
  const out=[];for(let p=Math.max(1,startPage);out.length<count&&p<2000;p++)for(let s=1;s<=9&&out.length<count;s++)if(!used.has(p+"-"+s))out.push([p,s]);
  return out;
}
$("#bulkBar").addEventListener("click",async e=>{
  const a=e.target.closest("[data-bulk]");if(!a)return;const act=a.dataset.bulk;
  if(act==="all"){(S.pageList||S.shown||[]).forEach(g=>S.sel.add(cardKey(g.f)));render();return}
  if(act==="none"){S.sel.clear();render();return}
  const es=selEntries();if(!es.length)return;const strip=({id,...r})=>r;
  if(act==="del"){
    if(!(await askConfirm(`Delete ${plural(es.length,"entry").replace("entrys","entries")}?`,`This removes every copy of the ${plural(S.sel.size,"selected card")} from your catalog. You can undo this afterwards.`,"Delete")))return;
    txBegin(`Deleted ${plural(es.length,"card")} (bulk)`);try{for(const c of es)await S.store.del(c.id)}finally{txEnd()}
    S.sel.clear();render();return;
  }
  if(act==="cond"){
    const v=await askBulk("Set condition",`<label>Condition for ${plural(es.length,"entry").replace("entrys","entries")}<select name="cond">${condOpts()}</select></label>`,"Set condition");if(!v)return;
    txBegin(`Set condition to ${v.cond||"not set"} on ${plural(es.length,"card")}`);try{for(const c of es)await S.store.set(c.id,{...strip(c),condition:v.cond})}finally{txEnd()}
    render();return;
  }
  if(act==="deck"){
    const decks=[...new Set(S.cards.filter(c=>c.locType==="deck"&&c.deck).map(c=>c.deck))];
    const v=await askBulk("Move to a deck",`<label>Deck name<input name="deck" list="deckList" required value="${esc(decks[0]||"")}" placeholder="e.g. Fire deck"></label><p class="sub2">${plural(es.length,"entry").replace("entrys","entries")} will leave their binder pockets.</p>`,"Move");if(!v||!v.deck.trim())return;
    txBegin(`Moved ${plural(es.length,"card")} to deck ${v.deck.trim()}`);try{for(const c of es)await S.store.set(c.id,{...strip(c),locType:"deck",deck:v.deck.trim(),binder:null,page:null,slot:null})}finally{txEnd()}
    render();return;
  }
  if(act==="binder"){
    const nums=binderNums();const cur=+$("#binderNo").value||nums[0]||1;
    const v=await askBulk("Move to a binder",`<div class="grid" style="display:grid;grid-template-columns:1fr 1fr;gap:10px"><label>Binder<select name="b">${(nums.length?nums:[1]).map(n=>`<option value="${n}"${n===cur?" selected":""}>${esc(binderName(n))}</option>`).join("")}</select></label><label>Start at page<input name="p" type="number" min="1" value="1" inputmode="numeric"></label></div><p class="sub2">The ${plural(es.length,"entry").replace("entrys","entries")} go into the first empty pockets from that page on, in their current order.</p>`,"Move");if(!v)return;
    const b=+v.b||1,todo=es.filter(c=>!(c.locType==="binder"&&+c.binder===b));const slots=freeSlots(b,+v.p||1,todo.length);
    txBegin(`Moved ${plural(todo.length,"card")} into ${binderName(b)}`);
    try{for(let i=0;i<todo.length;i++){const c=todo[i];await S.store.set(c.id,{...strip(c),locType:"binder",binder:b,page:slots[i][0],slot:slots[i][1],deck:null})}}finally{txEnd()}
    render();return;
  }
});
document.addEventListener("click",e=>{
  const il=e.target.closest("[data-illus]");if(!il)return;e.preventDefault();
  const name=il.dataset.illus;const z=document.querySelector(".zoom [data-zclose]");if(z)z.click();
  if($("#editor").open)$("#editor").close("cancel");
  S.adv.illus=name;$("#advIllus").value=name;$("#advBox").open=true;render();
  show("collection");$("#advBox").scrollIntoView({behavior:"smooth",block:"start"});
});
/* a picture shown from the web is saved into the artwork folder, so the catalogue reads it from disk from then on */
const cpArtTried=new Set();
async function cpCacheArt(){
  const c=S.cp&&S.screen==="card"?cpEnt():null;if(!c||!S.assets||!S.assets.uploadAt||c.pic||c.official||c.img||cpArtTried.has(c.id))return;
  const url=c.tcgImage?c.tcgImage+"/high.webp":realImg(c);if(!url)return;
  cpArtTried.add(c.id);
  try{
    const t=pictureTarget(c);if(!t)return;
    const r=await fetch(url);if(!r.ok)return;let blob=await r.blob();
    if(!/^image\//.test(blob.type))blob=blob.slice(0,blob.size,/\.webp$/.test(url)?"image/webp":"image/png");
    const a=await S.assets.uploadAt(t,blob);
    const fresh=S.cards.find(x=>x.id===c.id);if(!fresh||fresh.pic||fresh.official||fresh.img)return;
    const {id,...rest}=fresh;await S.store.set(id,{...rest,official:a.id});
    if(S.screen==="card"&&S.cp&&S.cp.id===id){cpRender();cpToast("Artwork saved to your folder")}
  }catch{}
}
async function toWebp(b){try{const bm=await createImageBitmap(b);const cv=document.createElement("canvas");cv.width=bm.width;cv.height=bm.height;cv.getContext("2d").drawImage(bm,0,0);const w=await new Promise(r=>cv.toBlob(r,"image/webp",.9));return w&&w.type==="image/webp"?w:b}catch{return b}}
/* where a card's picture lives on disk: artwork/<set id - set name>/<number - name>, the same place the fetched artwork goes */
function pictureTarget(c){
  if(typeof c.official==="string"&&/^artwork\/.+\.\w+$/.test(c.official))return {base:c.official.replace(/\.\w+$/,"")};
  let sid="",lid="";
  if(c.tcgdexId){const m=String(c.tcgdexId),i=m.lastIndexOf("-");if(i>0){sid=m.slice(0,i);lid=m.slice(i+1)}}
  let r=sid?PKL.setRow(sid):null;
  if(!r){const code=String(c.setCode||"").toUpperCase();if(code){const rs=PKL.P.sets.filter(x=>String(x[2]).split(":")[0]===code);if(rs.length===1){r=rs[0];sid=r[0]}}}
  if(!r)return null;
  if(!lid){const pp=String(c.number||"").split("/");lid=pp[0].trim();const tl=(pp[1]||"").trim().length;if(/^\d+$/.test(lid)&&tl>lid.length)lid=lid.padStart(tl,"0")}
  if(!lid||!c.name)return null;
  return {setId:sid,setName:r[1],localId:lid,name:c.name};
}
async function pictureAsset(c,file){
  const blob=await shrink(file);
  if(!S.assets.uploadAt)return S.assets.upload(blob);
  const t=pictureTarget(c);if(!t)return S.assets.upload(blob);
  return S.assets.uploadAt(t,await toWebp(blob));
}
async function replacePicture(c,f){
  const fresh=S.cards.find(x=>x.id===c.id)||c;const a=await pictureAsset(fresh,f);const{id,...rest}=fresh;
  await S.store.set(id,{...rest,img:null,official:a.id,pic:null});
  if(fresh.img)S.assets.delete(fresh.img).catch(()=>{});if(fresh.official)S.assets.delete(fresh.official).catch(()=>{});
  return {...fresh,img:null,official:a.id};
}
function zoomCard(c,fromEl,seq){openCardPage(c,seq)}
function zoomCardOld(c,fromEl,seq,ret,instant){
  seq=seq&&seq.length?seq:[c.id];ret=ret||fromEl;const idx=seq.indexOf(c.id);
  const src=imgSrc(c);
  const ov=document.createElement("div");ov.className="zoom"+(instant?" on":"");ov.setAttribute("role","dialog");ov.setAttribute("aria-label",c.name);
  const same=S.cards.filter(x=>cardKey(x)===cardKey(c)).sort((a,b)=>(a.locType||"").localeCompare(b.locType||"")||(+a.binder||0)-(+b.binder||0)||(+a.page||0)-(+b.page||0)||(+a.slot||0)-(+b.slot||0));
  const total=same.reduce((a,x)=>a+(+x.qty||1),0);
  let det=c.details?c:(same.find(x=>x.details)?{...c,details:same.find(x=>x.details).details}:c);
  const infoHtml=()=>{
    const el=S.lang==="el"&&det.details&&det.details.el;const T=el?L10N.el:L10N.en;
    const locs=same.map(x=>x.locType==="showcase"?`Showcase: ${esc(x.deck||"Showcase")}${(+x.qty||1)>1?` (×${+x.qty})`:""}`:x.locType==="deck"?`${T.deck}: ${esc(x.deck||"—")}${(+x.qty||1)>1?` (×${+x.qty})`:""}`:`${esc(binderName(x.binder||"?"))}, ${T.page} ${x.page||"?"}, ${T.pocket} ${x.slot||"?"}`).join("<br>");
    const btn=false?`<div class="zbar"><button type="button" class="btn ghost" data-ztr>${S.lang==="el"?"Show in English":"Ελληνικά (Greek)"}</button></div>`:"";
    return `${btn}<div class="zinfo">${cardView(det,el?"el":"en").replace(" Tap Fill in card details below."," Tap Edit, then Fill in card details.")}<div class="zloc"${el?' lang="el"':""}><b>${T.have}: ×${total}</b>${locs}${c.condition?`<br>${T.cond}: ${esc(c.condition)}`:""}${c.notes?`<br>${T.notes}: ${esc(c.notes)}`:""}</div></div>`;
  };
  ov.innerHTML=`${seq.length>1?`<div class="znav"><button type="button" class="btn ghost" data-znav="-1" ${idx<=0?"disabled":""}>Previous</button><span aria-label="Card ${idx+1} of ${seq.length}">${idx+1} / ${seq.length}</span><button type="button" class="btn ghost" data-znav="1" ${idx>=seq.length-1?"disabled":""}>Next</button></div>`:""}${src?`<img alt="${esc(c.name)}" src="${src}">`:""}<div class="zbar"><button type="button" class="btn ghost" data-zedit>Edit</button>${S.assets?`<div class="file btn ghost">Replace photo<input type="file" accept="image/*" data-zrepl aria-label="Replace photo"></div>`:""}<button type="button" class="btn" data-zclose>Close</button></div><p class="zst" aria-live="polite"></p><div class="zw">${infoHtml()}</div>`;
  document.body.appendChild(ov);const img=ov.querySelector("img");
  const r=fromEl&&fromEl.getBoundingClientRect();const reduce=matchMedia("(prefers-reduced-motion: reduce)").matches;
  const go=()=>{
    const t=img.getBoundingClientRect();
    if(r&&r.width&&t.width&&!reduce){const s=Math.min(r.width/t.width,r.height/t.height);img.animate([{transform:`translate(${r.left+r.width/2-(t.left+t.width/2)}px,${r.top+r.height/2-(t.top+t.height/2)}px) scale(${s})`},{transform:"none"}],{duration:220,easing:"cubic-bezier(.2,.8,.2,1)"})}
    ov.classList.add("on");
  };
  if(!img||instant)ov.classList.add("on");else if(img.complete&&img.naturalWidth)requestAnimationFrame(go);else{img.onload=go;img.onerror=go}
  const teardown=()=>{document.removeEventListener("keydown",onKey,true);ov.remove()};
  const close=()=>{teardown();if(ret&&ret.isConnected&&ret.focus)ret.focus({preventScroll:true})};
  const nav=dl=>{
    const nid=seq[idx+dl];const nc=nid&&S.cards.find(x=>x.id===nid);if(!nc)return;
    teardown();
    if(nc.locType==="binder"&&String(nc.binder)===$("#binderNo").value&&+nc.page&&+$("#pageNo").value!==+nc.page&&!inReview()){$("#pageNo").value=nc.page;renderBinder()}
    zoomCard(nc,null,seq,ret,true);
    const nb=document.querySelector(`.zoom [data-znav="${dl}"]`);if(nb&&!nb.disabled)nb.focus({preventScroll:true});
  };
  const typing=e=>e.target&&e.target.closest&&e.target.closest("input,select,textarea");
  const onKey=e=>{
    if($("#editor").open||$("#confirmDlg").open)return;
    if(e.key==="Escape"){e.stopPropagation();e.preventDefault();close()}
    else if(e.key==="ArrowRight"&&!typing(e)){e.preventDefault();e.stopPropagation();nav(1)}
    else if(e.key==="ArrowLeft"&&!typing(e)){e.preventDefault();e.stopPropagation();nav(-1)}
  };
  document.addEventListener("keydown",onKey,true);
  const zw=()=>ov.querySelector(".zw");
  const saveLang=()=>{try{localStorage.setItem("pk-lang",S.lang)}catch{}};
  const translate=async()=>{
    const st=ov.querySelector(".zst");st.textContent="Μετάφραση στα ελληνικά…";
    const b=ov.querySelector("[data-ztr]");if(b)b.disabled=true;
    try{det=await translateDetails(det);st.textContent=""}
    catch(err){S.lang="en";saveLang();st.textContent=fillErr(err).replace("Filling in details","Translating")}
    if(ov.isConnected)zw().innerHTML=infoHtml();
  };
  ov.addEventListener("click",e=>{
    const zn=e.target.closest("[data-znav]");if(zn){nav(+zn.dataset.znav);return}
    if(e.target.closest("[data-ztr]")){
      if(S.lang==="el"){S.lang="en";saveLang();zw().innerHTML=infoHtml()}
      else{S.lang="el";saveLang();if(det.details&&det.details.el)zw().innerHTML=infoHtml();else translate()}
      return;
    }
    if(e.target.closest("[data-zedit]")){close();openEditor(c,seq);return}
    if(e.target===ov||e.target===img||e.target.closest("[data-zclose]"))close();
  });
  if(S.lang==="el"&&det.details&&!det.details.el&&false)translate();
  const doRepl=async f=>{
    const st=ov.querySelector(".zst");st.textContent="Saving the photo…";
    try{c=await replacePicture(c,f);if(!img){teardown();zoomCard(c,null,seq,ret,true);return}img.src=imgSrc(c);st.textContent="Photo replaced."}
    catch(err){st.textContent="The photo didn’t save. Try a JPEG or PNG."}
  };
  ov.addEventListener("change",async e=>{
    if(!e.target.matches("[data-zrepl]"))return;const f=e.target.files[0];if(!f)return;
    await doRepl(f);e.target.value="";
  });
  if(S.assets){
    ov.addEventListener("dragover",e=>{if(!hasFiles(e))return;e.preventDefault();e.stopPropagation();e.dataTransfer.dropEffect="copy";ov.classList.add("zdrop")});
    ov.addEventListener("dragleave",e=>{if(e.target===ov||!ov.contains(e.relatedTarget))ov.classList.remove("zdrop")});
    ov.addEventListener("drop",e=>{if(!hasFiles(e))return;e.preventDefault();e.stopPropagation();ov.classList.remove("zdrop");const f=imgFile(e);if(f)doRepl(f);else{const st=ov.querySelector(".zst");st.textContent="That isn’t a picture. Drop a JPEG or PNG."}});
  }
  let sx=null,sy=0;
  ov.addEventListener("touchstart",e=>{if(e.touches.length===1){sx=e.touches[0].clientX;sy=e.touches[0].clientY}else sx=null},{passive:true});
  ov.addEventListener("touchend",e=>{if(sx==null)return;const t=e.changedTouches[0];const dx=t.clientX-sx,dy=t.clientY-sy;sx=null;if(Math.abs(dx)>60&&Math.abs(dx)>Math.abs(dy)*1.5)nav(dx<0?1:-1)});
  ov.querySelector("[data-zclose]").focus({preventScroll:true});
}
$("#addManual").onclick=()=>openEditor(null);
$("#export").onclick=exportCsv;
$("#bulk").onclick=bulkFill;
function resetFilters(){
  S.q="";$("#q").value="";S.filter="all";document.querySelectorAll(".chip").forEach(x=>x.setAttribute("aria-pressed",x.dataset.f==="all"));
  Object.values(V2F).forEach(x=>x.clear());S.kind="";S.tk="";S.ser="";S.exp="";S.stage="";$("#stageF").value="";S.fmt="";$("#fmtF").value="";S.types.clear();document.querySelectorAll("#etGrid input").forEach(i=>i.checked=false);
  S.rar="";S.month="";S.loc="";for(const [k,sel] of Object.entries(ADVF)){S.adv[k]="";$(sel).value=""}
}
$("#charts").addEventListener("click",e=>{
  const b=e.target.closest("[data-cfk]");if(!b)return;const k=b.dataset.cfk,v=b.dataset.cfv;
  resetFilters();
  if(k==="rar")S.rar=v;
  else if(k==="set")S.exp=v;
  else if(k==="month")S.month=v;
  else if(k==="type"){if(ETYPES.includes(v)){S.types.add(v);const i=document.querySelector(`#etGrid input[value="${v}"]`);if(i)i.checked=true}else{S.stage=v==="No details"?"Unknown":v;$("#stageF").value=S.stage}}
  render();
  show("collection");
  setTimeout(()=>{const l=$("#list");l.setAttribute("tabindex","-1");l.focus({preventScroll:true})},350);
});
$("#chipLine").addEventListener("click",e=>{const b=e.target.closest("[data-clrf]");if(!b)return;S[b.dataset.clrf]="";render()});
$("#ldxBtn").onclick=()=>openLivingDex(1);
$("#masterChk").checked=(()=>{try{return localStorage.getItem("pk-master")==="1"}catch{return false}})();S.master=$("#masterChk").checked;
$("#masterChk").onchange=e=>{S.master=e.target.checked;try{localStorage.setItem("pk-master",S.master?"1":"0")}catch{}renderSets()};
$("#setList").addEventListener("toggle",e=>{const d=e.target.closest(".setrow");if(!d)return;if(d.open){setOpen.add(d.dataset.set);fillMissNames(d)}else setOpen.delete(d.dataset.set)},true);
$("#setList").addEventListener("click",async e=>{
  const b=e.target.closest("[data-copymiss]");if(!b)return;const t=b.dataset.copymiss;
  try{await navigator.clipboard.writeText(t);b.textContent="Copied"}catch{const p=b.previousElementSibling;const r=document.createRange();r.selectNodeContents(p);const s=getSelection();s.removeAllRanges();s.addRange(r);b.textContent="Selected: copy it now"}
  setTimeout(()=>{b.textContent="Copy missing list"},2000);
});
$("#autoArr").onclick=async()=>{
  const b=+$("#binderNo").value||1;const cs=S.cards.filter(c=>c.locType==="binder"&&+c.binder===b);if(!cs.length)return;
  const v=await askBulk(`Auto-arrange ${binderName(b)}`,`<label>Order the cards by<select name="by"><option value="dex">Pokédex number</option><option value="set">Set, then card number</option><option value="type">Energy type, then Pokédex number</option><option value="rarity">Rarity, rarest first</option><option value="name">Name</option></select></label><label style="margin-top:10px">Start at page<input name="p" type="number" min="1" value="1" inputmode="numeric"></label><p class="sub2" style="margin-top:8px">All ${plural(cs.length,"card")} in this binder are placed in order, pocket by pocket, with no gaps. You can undo this afterwards.</p>`,"Arrange");
  if(!v)return;
  const ser=c=>{const i=SERIES_ALL.indexOf(seriesOf(c));return i<0?99:i};const num=c=>{const p=numParts(c.number);return p?(p.pre?5000:0)+p.n:9999};
  const tyi=c=>{const d=c.details;if(!d)return 30;const s=String(d.supertype||"").toLowerCase();if(s.startsWith("trainer"))return 20;if(s.startsWith("energy"))return 21;const t=(d.types||[])[0];return t?ETYPES.indexOf(t):19};
  const byName=(x,y)=>String(x.name).localeCompare(y.name);const dx=c=>dexOf(c)||1e6;
  const cmp={dex:(x,y)=>dx(x)-dx(y)||byName(x,y)||num(x)-num(y),set:(x,y)=>ser(x)-ser(y)||String(x.set||x.setCode||"~").localeCompare(y.set||y.setCode||"~")||num(x)-num(y),type:(x,y)=>tyi(x)-tyi(y)||dx(x)-dx(y)||byName(x,y),rarity:(x,y)=>rarRank(y.rarity)-rarRank(x.rarity)||dx(x)-dx(y)||byName(x,y),name:(x,y)=>byName(x,y)||num(x)-num(y)}[v.by]||((x,y)=>0);
  const order=cs.slice().sort(cmp);const start=Math.max(1,+v.p||1);const labels={dex:"Pokédex number",set:"set and number",type:"energy type",rarity:"rarity",name:"name"};
  const strip=({id,...r})=>r;let moved=0;
  txBegin(`Auto-arranged ${binderName(b)} by ${labels[v.by]}`);
  try{for(let i=0;i<order.length;i++){const c=order[i];const pg=start+Math.floor(i/9),sl=i%9+1;if(+c.page!==pg||+c.slot!==sl){await S.store.set(c.id,{...strip(c),page:pg,slot:sl});moved++}}}
  finally{txEnd()}
  $("#pageNo").value=start;renderBinder();setStatus(moved?`Arranged ${binderName(b)} by ${labels[v.by]}: ${plural(moved,"card")} moved.`:"Already in that order; nothing moved.");
};
