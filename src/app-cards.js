
const VARIANTS=["Normal","Holo","Reverse Holo","Energy Symbol Pattern","Quick Ball Pattern","Poké Ball Pattern","Master Ball Pattern","Full Art","Alt Art","Secret Rare","Promo","Other"];
const $=s=>document.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const use=n=>(window.claude&&window.claude.use)?window.claude.use(n):Promise.resolve(null);
const S={cards:[],mode:"binder",filter:"all",q:"",sort:"name",exp:"",ser:"",rar:"",month:"",view:"table",selMode:false,sel:new Set(),adv:{hpMin:"",hpMax:"",text:"",illus:"",mark:"",qty:"",pic:"",real:"",det:"",pmin:"",pmax:"",dup:"",priced:"",added:""},stage:"",types:new Set(),lang:(()=>{try{return localStorage.getItem("pk-lang")==="el"?"el":"en"}catch{return "en"}})(),review:[],photo:null,store:null,sample:null,downloads:null,editing:null,assets:null,crops:{},binders:{},bEdit:null};
let bulkCtl=null;S.lang="en";

// ---------- storage ----------
const LS="pokemon-catalog-v1",LSB="pokemon-catalog-binders-v1",LSA="pokemon-catalog-activity-v1";
const newId=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,10);
function localRaw(){
  try{S.cards=JSON.parse(localStorage.getItem(LS)||"[]")}catch{S.cards=[]}
  try{S.binders=JSON.parse(localStorage.getItem(LSB)||"{}")}catch{S.binders={}}
  try{S.activity=JSON.parse(localStorage.getItem(LSA)||"[]")}catch{S.activity=[]}
  try{S.decksMeta=JSON.parse(localStorage.getItem("pokemon-catalog-decks-v1")||"{}")}catch{S.decksMeta={}}
  const save=()=>{try{localStorage.setItem(LS,JSON.stringify(S.cards))}catch{}};
  const saveB=()=>{try{localStorage.setItem(LSB,JSON.stringify(S.binders))}catch{}};
  render();
  return{
    put:async(id,c)=>{const i=S.cards.findIndex(x=>x.id===id);if(i>-1)S.cards[i]={...c,id};else S.cards.push({...c,id});save();render()},
    del:async id=>{S.cards=S.cards.filter(x=>x.id!==id);save();render()},
    bput:async(n,b)=>{S.binders[n]=b;saveB();render()},
    bdel:async n=>{delete S.binders[n];saveB();render()},
    act:async list=>{try{localStorage.setItem(LSA,JSON.stringify(list))}catch{}},
    dmeta:async map=>{try{localStorage.setItem("pokemon-catalog-decks-v1",JSON.stringify(map))}catch{}},
    fmt:async o=>{try{localStorage.setItem("pokemon-catalog-formats-v1",JSON.stringify(o))}catch{}},
    wish:async w=>{S.wish=w;try{localStorage.setItem("pokemon-catalog-wish-v1",JSON.stringify(w))}catch{}},
    lists:async o=>{try{localStorage.setItem("pokemon-catalog-lists-v1",JSON.stringify(o))}catch{}}
  };
}
let TX=null;const UNDO=[];
function phistOf(v,old){const pt=c=>{const p=c&&c.price;const u=p?unitVal(c):null;return u==null?null:{d:String(p.updated||new Date().toISOString()).slice(0,10),v:u}};let ph=((v.phist&&v.phist.length?v.phist:(old&&old.phist))||[]).slice();if(!ph.length&&old){const o=pt(old);if(o)ph.push(o)}const n=pt(v);if(n){const last=ph[ph.length-1];if(!last||last.d!==n.d)ph.push(n);else if(last.v!==n.v)ph[ph.length-1]=n}if(ph.length)v.phist=ph.slice(-180)}
const trailKey=c=>[c.locType,c.binder,c.page,c.slot,c.deck].map(x=>x==null?"":x).join("|");
function trailOf(x){return x.trail&&x.trail.length?x.trail.slice():(x.added?[{t:x.added,to:locLabel(x),k:"added"}]:[])}
function makeStore(raw){
  const snap=x=>x?JSON.parse(JSON.stringify(x)):null;
  const find=id=>{const c=S.cards.find(x=>x.id===id);if(!c)return null;const{id:_i,...r}=c;return snap(r)};
  const clean=c=>{const{id:_i,...r}=c;return r};
  const rec=(kind,key,before,after)=>{if(TX)TX.ops.push({kind,key,before,after:snap(after)})};
  return {
    add:async c=>{const id=newId();const v=clean(c);if(!(v.trail&&v.trail.length))v.trail=[{t:new Date().toISOString(),to:locLabel(v),k:"added"}];phistOf(v,null);rec("card",id,null,v);await raw.put(id,v);return id},
    set:async(id,c)=>{const v=clean(c);const old=find(id);
      if(old){if(trailKey(old)!==trailKey(v)){const tr=trailOf(old);tr.push({t:new Date().toISOString(),from:locLabel(old),to:locLabel(v),k:"moved"});v.trail=tr.slice(-60)}else if(old.trail&&old.trail.length)v.trail=old.trail}
      phistOf(v,old);rec("card",id,old,v);await raw.put(id,v)},
    del:async id=>{rec("card",id,find(id),null);await raw.del(id)},
    bset:async(n,b)=>{rec("binder",String(n),snap(S.binders[n]||null),b);await raw.bput(String(n),b)},
    bdel:async n=>{rec("binder",String(n),snap(S.binders[n]||null),null);await raw.bdel(String(n))}
  };
}
function txBegin(label){TX={label,ops:[],t:Date.now()}}
function txEnd(label){
  const t=TX;TX=null;if(!t||!t.ops.length)return;
  if(label)t.label=label;UNDO.push(t);if(UNDO.length>30)UNDO.shift();
  logAct(t.label);showUndo(t.label);
}
async function undoLast(){
  const t=UNDO.pop();if(!t)return;
  const st=$("#undoLbl");if(st)st.textContent="Undoing…";
  try{
    for(const o of t.ops.slice().reverse()){
      if(o.kind==="card"){if(o.before)await S.raw.put(o.key,o.before);else await S.raw.del(o.key)}
      else{if(o.before)await S.raw.bput(o.key,o.before);else await S.raw.bdel(o.key)}
    }
    logAct("Undid: "+t.label);flash([]);render();
    showUndo(UNDO.length?UNDO[UNDO.length-1].label:null,`Undid: ${t.label}`);
  }catch(e){UNDO.push(t);showUndo(t.label,"Undo didn’t finish. Try again.")}
}
function logAct(label){
  const list=[{t:Date.now(),label:String(label).slice(0,200)},...(S.activity||[])].slice(0,200);
  S.activity=list;if(S.raw)S.raw.act(list).catch(()=>{});renderActivity();
}
let undoT=null;
function showUndo(label,msg){
  const bar=$("#undoBar");if(!bar)return;
  $("#undoLbl").textContent=msg||(label?label:"");
  $("#undoBtn").classList.toggle("hidden",!label);
  $("#undoBtn").title=label?`Undo: ${label}`:"";
  bar.classList.toggle("hidden",!label&&!msg);bar.classList.add("show");
  clearTimeout(undoT);undoT=setTimeout(()=>{bar.classList.remove("show")},9000);
  $("#undoTop").classList.toggle("hidden",!UNDO.length);
  if(UNDO.length)$("#undoTop").textContent=`Undo: ${UNDO[UNDO.length-1].label}`;
  if(window.sbUndo)window.sbUndo();
}
function renderActivity(){
  const box=$("#actList");if(!box)return;
  const list=S.activity||[];
  box.innerHTML=list.length?list.slice(0,100).map(a=>{const d=new Date(a.t);return `<div class="act"><time datetime="${d.toISOString()}">${d.toLocaleDateString(undefined,{day:"numeric",month:"short"})} ${d.toLocaleTimeString(undefined,{hour:"2-digit",minute:"2-digit"})}</time><span>${esc(a.label)}</span></div>`}).join(""):`<p class="sub2">Nothing yet. Changes you make will be listed here.</p>`;
}
async function initStore(){
  const [db,user]=await Promise.all([use("db"),use("user")]);
  const uid=user?await user.id().catch(()=>null):null;
  if(db&&uid){
    const base=db.doc("data/users/"+uid+"/catalog");
    const col=base.collection("cards");
    col.onSnapshot(s=>{S.cards=s.docs.map(d=>({...d.data(),id:d.id}));render()},
      e=>{$("#stats").textContent="Couldn’t load your collection. Reload the page to try again."});
    const bcol=base.collection("binders");
    bcol.onSnapshot(s=>{const m={};s.docs.forEach(d=>m[d.id]=d.data());S.binders=m;render()},()=>{});
    const mcol=base.collection("meta");
    mcol.onSnapshot(s=>{const a=s.docs.find(d=>d.id==="activity");S.activity=a&&Array.isArray(a.data().list)?a.data().list:[];const dm=s.docs.find(d=>d.id==="decks");S.decksMeta=dm&&dm.data().map&&typeof dm.data().map==="object"?dm.data().map:{};const fm=s.docs.find(d=>d.id==="formats");if(fm&&fm.data())setFormats(fm.data(),true);const ls=s.docs.find(d=>d.id==="lists");if(ls&&ls.data())applyLists(ls.data());renderActivity();renderDecks()},()=>{});
    S.raw={put:(id,c)=>col.doc(id).set(c),del:id=>col.doc(id).delete(),bput:(n,b)=>bcol.doc(String(n)).set(b),bdel:n=>bcol.doc(String(n)).delete(),act:list=>mcol.doc("activity").set({list}),dmeta:map=>mcol.doc("decks").set({map}),fmt:o=>mcol.doc("formats").set(o),lists:o=>mcol.doc("lists").set(o)};
  }else S.raw=await PKL.folderRaw();
  S.store=makeStore(S.raw);
}

// ---------- helpers ----------
const locKey=c=>c.locType==="showcase"?"showcase|"+(c.deck||""):c.locType==="deck"?"deck|"+(c.deck||""):"binder|"+(c.binder||"")+"|"+(c.page||"")+"|"+(c.slot||"");
const cardKey=c=>[c.name,c.set,c.number,c.variant].map(x=>String(x||"").trim().toLowerCase()).join("|");
function locLabel(c){
  if(c.locType==="showcase")return "Showcase: "+(c.deck||"Showcase");
  if(c.locType==="deck")return (c.deck?"Deck: "+c.deck:"Deck")+(c.origin&&c.origin.t==="binder"?` (from ${binderName(c.origin.binder)}, p${c.origin.page} s${c.origin.slot})`:"");
  if(!c.binder&&!c.page)return "Not in a binder";
  let s="Binder "+(c.binder||"?");
  if(c.page)s+=", page "+c.page;
  if(c.slot)s+=", slot "+c.slot;
  return s;
}
function groupLabel(c){return c.locType==="showcase"?"Showcase: "+(c.deck||"Showcase"):c.locType==="deck"?(c.deck?"Deck: "+c.deck:"Deck"):"Binder "+(c.binder||"?")+(c.page?", page "+c.page:"")}
const isHolo=v=>v&&v!=="Normal";
const TYPE={Grass:["#5DAE4A","#fff","G"],Fire:["#E4572E","#fff","R"],Water:["#3A8FD9","#fff","W"],Lightning:["#F2C230","#1b1a10","L"],Psychic:["#9B5FC0","#fff","P"],Fighting:["#B5663A","#fff","F"],Darkness:["#3C3F4A","#fff","D"],Metal:["#8E99A6","#16181d","M"],Dragon:["#B59A3A","#fff","N"],Fairy:["#E58BB7","#16181d","Y"],Colorless:["#E8E6DF","#16181d","C"],Trainer:["#A9B4C2","#16181d","T"],Energy:["#C9C3B0","#16181d","E"]};
const ETYPES=["Grass","Fire","Water","Lightning","Psychic","Fighting","Darkness","Metal","Dragon","Fairy","Colorless"];
const S2='fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"',F2='fill="currentColor"';
const ICON={
  Grass:`<g ${S2}><path d="M12 20.5v-8"/><path d="M12 12.5c0-4.2 3-6.5 7.5-6.5 0 4.2-3 6.5-7.5 6.5z"/><path d="M12 15c0-3.3-2.6-5.3-6.5-5.3 0 3.3 2.6 5.3 6.5 5.3z"/></g>`,
  Fire:`<path ${F2} d="M12 21.5c-3.7 0-6.3-2.5-6.3-5.9 0-3.4 2.7-5.2 3.7-8.9 1.7 1.3 2.4 3 2.3 4.6 1.3-.7 2-2.1 2-3.6 2.5 2 4.6 4.5 4.6 7.9 0 3.4-2.6 5.9-6.3 5.9z"/>`,
  Water:`<g ${S2}><path d="M3.5 9.5c2.8-2 5.7 2 8.5 0s5.7 2 8.5 0"/><path d="M3.5 15c2.8-2 5.7 2 8.5 0s5.7 2 8.5 0"/></g>`,
  Lightning:`<path ${F2} d="M13.6 2.5 5.8 13.3h5.3l-1.2 8.2 8.3-11.1h-5.4z"/>`,
  Psychic:`<path ${S2} d="M12.6 11.6a1.4 1.4 0 1 1-1.3-1.9 3 3 0 0 1 3.4 3.3 4.4 4.4 0 0 1-5 4 6 6 0 0 1-4.9-6.3A7.4 7.4 0 0 1 12.5 4"/>`,
  Fighting:`<path ${F2} d="M12 2.5l2.1 5.3 5.4-2.2-2.2 5.4 5.2 2-5.2 2.1 2.2 5.4-5.4-2.2L12 23.5l-2.1-5.2-5.4 2.2 2.2-5.4-5.2-2.1 5.2-2-2.2-5.4 5.4 2.2z" transform="scale(.92) translate(1 0)"/>`,
  Darkness:`<path ${F2} d="M15.2 3.8a8.6 8.6 0 1 0 5.4 13.9A7.4 7.4 0 0 1 15.2 3.8z"/>`,
  Metal:`<g ${S2}><path d="M12 3.2l7.6 4.4v8.8L12 20.8l-7.6-4.4V7.6z"/><circle cx="12" cy="12" r="3"/></g>`,
  Dragon:`<g ${S2}><path d="M7.5 3.5c1.2 6 .3 11.5-2.3 17"/><path d="M12.5 3.5c1.2 6 .3 11.5-2.3 17"/><path d="M17.5 3.5c1.2 6 .3 11.5-2.3 17"/></g>`,
  Fairy:`<g ${F2}><path d="M11 4c.8 4.6 2.7 6.5 7.2 7.3-4.5.8-6.4 2.7-7.2 7.3-.8-4.6-2.7-6.5-7.2-7.3C8.3 10.5 10.2 8.6 11 4z"/><path d="M18.5 15c.3 1.7 1 2.4 2.7 2.7-1.7.3-2.4 1-2.7 2.7-.3-1.7-1-2.4-2.7-2.7 1.7-.3 2.4-1 2.7-2.7z"/></g>`,
  Colorless:`<circle ${S2} cx="12" cy="12" r="5.2"/>`
};
const SPRITE_FIXED=["Grass","Fire","Water","Lightning","Psychic","Fighting","Darkness","Metal","Colorless","Fairy","Dragon"];
const SPRITE=["Grass","Fire","Water","Lightning","Psychic","Fighting","Darkness","Metal","Colorless","Fairy","Dragon"];
const en=t=>{const k=TYPE[t]?t:"Colorless";const si=SPRITE_FIXED.indexOf(k);if(si>-1)return `<i class="en sp" style="background-position:${(si/(SPRITE_FIXED.length-1)*100).toFixed(3)}% 0" title="${esc(k)}" role="img" aria-label="${esc(k)}"></i>`;const v=TYPE[k];const ic=ICON[k];return `<i class="en" style="--e:${v[0]};--ef:${v[1]}" title="${esc(k)}" role="img" aria-label="${esc(k)}">${ic?`<svg viewBox="0 0 24 24" aria-hidden="true">${ic}</svg>`:v[2]}</i>`};
const imgSrc=c=>(typeof c.pic==="string"&&c.pic.startsWith("data:image/"))?c.pic:c.official?PKL.blob(c.official):"";
const lookupUrl=c=>{const p=String(c.number||"").split("/")[0].trim();const pat=/pattern/i.test(c.variant||"")?String(c.variant).replace(/\s*pattern/i,""):"";return "https://www.tcgplayer.com/search/pokemon/product?q="+encodeURIComponent([c.name,pat,p].filter(Boolean).join(" "))};
const bulbaUrl=c=>{const p=numParts(c.number);if(!c.set||!p||p.pre)return "";return "https://bulbapedia.bulbagarden.net/wiki/"+encodeURIComponent(`${c.name} (${c.set} ${p.n})`.replace(/ /g,"_"))};

// ---------- render ----------
function render(){
  const total=S.cards.reduce((a,c)=>a+(+c.qty||1),0);
  $("#stats").textContent=S.cards.length?`${S.cards.length} ${S.cards.length===1?"entry":"entries"}, ${total} ${total===1?"card":"cards"} in total`:"No cards yet. Scan a binder page or add one by hand.";
  const decks=[...new Set(S.cards.filter(c=>c.locType==="deck"&&c.deck).map(c=>c.deck))];
  $("#deckList").innerHTML=decks.map(d=>`<option value="${esc(d)}">`).join("");
  renderBinder();
  const expOf=c=>c.set||c.setCode||"Unknown";
  const setInfo={};S.cards.forEach(c=>{const k=expOf(c);(setInfo[k]=setInfo[k]||{n:0,s:seriesOf(c)}).n+=(+c.qty||1)});
  const serTot={};Object.values(setInfo).forEach(x=>{serTot[x.s]=(serTot[x.s]||0)+x.n});
  const serList=Object.keys(serTot).sort((a,b)=>{const ia=SERIES_ALL.indexOf(a),ib=SERIES_ALL.indexOf(b);return (ia<0?99:ia)-(ib<0?99:ib)||a.localeCompare(b)});
  if(S.ser&&!serTot[S.ser])S.ser="";
  const opt=(v,l,cur)=>`<option value="${esc(v)}"${v===cur?" selected":""}>${esc(l)}</option>`;
  $("#serF").innerHTML=opt("","All expansions",S.ser)+serList.map(s=>opt(s,`${s}${seriesYears(s)?` (${seriesYears(s)})`:""} – ${plural(serTot[s],"card")}`,S.ser)).join("");
  const setNames=Object.keys(setInfo).filter(k=>!S.ser||setInfo[k].s===S.ser).sort((a,b)=>a==="Unknown"?1:b==="Unknown"?-1:a.localeCompare(b));
  if(S.exp&&!setNames.includes(S.exp))S.exp="";
  {const codeOf=k=>Object.keys(SET_NAMES).find(c=>SET_NAMES[c]===k)||(SERIES_BY_CODE[String(k).toUpperCase()]?String(k).toUpperCase():"");
   const pos=k=>{const c=codeOf(k);const sr=setInfo[k].s;const arr=SERIES_SETS[sr]||[];const i=arr.indexOf(c);return i<0?999:i};
   const lab=k=>{const c=codeOf(k);const y=c&&SET_YEARS[c];const nm=k===c&&SET_NAMES[c]?SET_NAMES[c]:k;return `${nm}${c||y?` (${[c,y].filter(Boolean).join(", ")})`:""} – ${plural(setInfo[k].n,"card")}`};
   const groups=[...new Set(setNames.map(k=>setInfo[k].s))].sort((x,y)=>{const ix=SERIES_ALL.indexOf(x),iy=SERIES_ALL.indexOf(y);return (ix<0?99:ix)-(iy<0?99:iy)||x.localeCompare(y)});
   $("#expF").innerHTML=opt("",S.ser?`All ${S.ser} sets`:"All sets",S.exp)+groups.map(g=>{const ks=setNames.filter(k=>setInfo[k].s===g).sort((x,y)=>(x==="Unknown")-(y==="Unknown")||pos(x)-pos(y)||x.localeCompare(y));return `<optgroup label="${esc(g==="Other"?"Other / unknown":g)}${seriesYears(g)?` (${seriesYears(g)})`:""}">${ks.map(k=>opt(k,lab(k),S.exp)).join("")}</optgroup>`}).join("");}
  const q=S.q.trim().toLowerCase();
  const locOk=c=>!S.loc||(S.loc.startsWith("b:")?c.locType==="binder"&&String(c.binder)===S.loc.slice(2):c.locType==="deck"&&deckOf(c)===S.loc.slice(2));
  {const bs=binderNums(),ds=deckNames();if(S.loc&&!(S.loc.startsWith("b:")?bs.map(String).includes(S.loc.slice(2)):ds.includes(S.loc.slice(2))))S.loc="";
   const bo=bs.map(n=>`<option value="b:${n}">${esc(binderName(n))}</option>`).join(""),dO=ds.map(d=>`<option value="d:${esc(d)}">${esc(d)}</option>`).join("");
   $("#locF").innerHTML=S.filter==="showcase"?`<option value="">All showcases</option>`:S.filter==="binder"?`<option value="">All binders</option>${bo}`:S.filter==="deck"?`<option value="">All decks</option>${dO}`:`<option value="">All binders and decks</option>${bo?`<optgroup label="Binders">${bo}</optgroup>`:""}${dO?`<optgroup label="Decks">${dO}</optgroup>`:""}`;
   $("#locF").value=S.loc||"";}
  const rows=S.cards.filter(c=>(S.filter==="all"||c.locType===S.filter)&&locOk(c)&&(!S.ser||seriesOf(c)===S.ser)&&(!S.exp||expOf(c)===S.exp)&&(!S.rar||(S.rar==="__none__"?!c.rarity:(c.rarity||"")===S.rar))&&(!S.month||String(c.added||"").slice(0,7)===S.month)&&(!q||[c.name,c.set,c.setCode,c.number,c.rarity,c.deck].some(x=>String(x||"").toLowerCase().includes(q))));
  const locCmp=(a,b)=>(a.locType||"").localeCompare(b.locType||"")||(+a.binder||0)-(+b.binder||0)||String(a.deck||"").localeCompare(b.deck||"")||(+a.page||0)-(+b.page||0)||(+a.slot||0)-(+b.slot||0);
  const groups=new Map();
  for(const c of rows){const k=cardKey(c);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(c)}
  const list=[...groups.values()].map(es=>{es.sort(locCmp);const f=es.find(x=>imgSrc(x))||es.find(x=>x.details)||es[0];return {es,f,first:es[0],count:es.reduce((a,c)=>a+(+c.qty||1),0)}});
  const nm=(a,b)=>String(a.f.name).localeCompare(b.f.name)||String(a.f.number||"").localeCompare(b.f.number||"",undefined,{numeric:true});
  const typeRank=g=>{const d=g.es.map(x=>x.details).find(Boolean);const t=d&&d.types&&d.types[0];if(t)return ETYPES.indexOf(t);const s=d&&d.supertype;return s==="Trainer"?20:s==="Energy"?21:30};
  const by={
    name:nm,
    type:(a,b)=>typeRank(a)-typeRank(b)||nm(a,b),
    rarity:(a,b)=>rarRank(a.f.rarity)-rarRank(b.f.rarity)||nm(a,b),
    count:(a,b)=>a.count-b.count||nm(a,b),
    price:(a,b)=>(gUnit(a)??-1)-(gUnit(b)??-1)||nm(a,b),
    series:(a,b)=>{const ia=SERIES_ALL.indexOf(seriesOf(a.f)),ib=SERIES_ALL.indexOf(seriesOf(b.f));return (ia<0?99:ia)-(ib<0?99:ib)||nm(a,b)},
    mark:(a,b)=>(markOfG(a)||"~").localeCompare(markOfG(b)||"~")||nm(a,b),
    format:(a,b)=>{const r=g=>{const f=fmtOf(g);return f.std?0:f.exp?1:f.unk?3:2};return r(a)-r(b)||nm(a,b)},
    stage:(a,b)=>{const o=["Basic","Stage 1","Stage 2","VMAX","VSTAR","BREAK","Level-Up","Mega","Restored","Trainer","Energy","Unknown"];const r=g=>{const i=o.indexOf(stageOf(g));return i<0?50:i};return r(a)-r(b)||nm(a,b)},
    dex:(a,b)=>(dexOf(a.f)||1e6)-(dexOf(b.f)||1e6)||nm(a,b),
    loc:(a,b)=>locCmp(a.first,b.first)||nm(a,b),
    set:(a,b)=>String(a.f.set||"~").localeCompare(b.f.set||"~")||String(a.f.number||"").localeCompare(b.f.number||"",undefined,{numeric:true})
  };
  if(S.stage){const keep=list.filter(g=>stageMatch(stageOf(g),S.stage));list.length=0;list.push(...keep)}
  if(S.kind){const keep=list.filter(g=>{const d=g.es.map(x=>x.details).find(Boolean);if(!d)return false;const sup=String(d.supertype||"").toLowerCase();const kd=sup.startsWith("trainer")?"trainer":sup.startsWith("energy")?"energy":"pokemon";if(kd!==S.kind)return false;if(kd==="trainer"&&S.tk){const ss=(d.subtypes||[]).map(x=>String(x).toLowerCase());const tl=ss.some(x=>x.includes("tool"));return S.tk==="tool"?tl:S.tk==="item"?(ss.includes("item")&&!tl):ss.includes(S.tk)}return true});list.length=0;list.push(...keep)}
  if(v2n()){const keep=list.filter(g=>{
    if(V2F.ser.size&&!V2F.ser.has(seriesOf(g.f)))return false;
    if(V2F.exp.size&&!g.es.some(c=>V2F.exp.has(expOf(c))))return false;
    if(V2F.rar.size&&!g.es.some(c=>V2F.rar.has(c.rarity||"__none__")))return false;
    if(V2F.stage.size){const st=stageOf(g);if(![...V2F.stage].some(v=>stageMatch(st,v)))return false}
    if(V2F.fmt.size){const f=fmtOf(g);const ok=v=>v==="std"?f.std:v==="exp"?f.exp:v==="notstd"?!f.std&&!f.unk:v==="notexp"?!f.exp&&!f.unk:f.unk;if(![...V2F.fmt].some(ok))return false}
    return true});list.length=0;list.push(...keep)}
  {const kc=$("#kindChips");if(kc){kc.querySelectorAll("[data-k]").forEach(b=>b.setAttribute("aria-pressed",b.dataset.k===(S.kind||"")));const tc=$("#tkChips");tc.classList.toggle("hidden",S.kind!=="trainer");tc.querySelectorAll("[data-tk]").forEach(b=>b.setAttribute("aria-pressed",b.dataset.tk===(S.tk||"")))}}
  if(S.fmt){const keep=list.filter(g=>{const f=fmtOf(g);return S.fmt==="std"?f.std:S.fmt==="exp"?f.exp:S.fmt==="notstd"?!f.std&&!f.unk:S.fmt==="notexp"?!f.exp&&!f.unk:f.unk});list.length=0;list.push(...keep)}
  if(S.types.size){const keep=list.filter(g=>{const d=g.es.map(x=>x.details).find(Boolean);return d&&(d.types||[]).some(t=>S.types.has(t))});list.length=0;list.push(...keep)}
  const tc={};S.cards.forEach(c=>{const t=c.details&&c.details.types&&c.details.types[0];if(t)tc[t]=(tc[t]||0)+(+c.qty||1)});
  document.querySelectorAll("#etGrid [data-tc]").forEach(x=>{x.textContent=tc[x.dataset.tc]||""});
  $("#etfClear").classList.toggle("hidden",!S.types.size);
  {const A=S.adv;const on=advActive();
   if(on){const txt=A.text.toLowerCase(),il=A.illus.toLowerCase(),mk=A.mark.toUpperCase();
    const keep=list.filter(g=>{const d=g.es.map(x=>x.details).find(Boolean);const hp=d&&+d.hp||0;
      if(A.hpMin!==""&&!(hp>=+A.hpMin))return false;if(A.hpMax!==""&&!(hp&&hp<=+A.hpMax))return false;
      if(txt){const blob=d?[...(d.abilities||[]),...(d.attacks||[])].map(a=>(a.name||"")+" "+(a.text||"")).concat(d.rules||[]).join(" ").toLowerCase():"";if(!blob.includes(txt))return false}
      if(il&&!String(d&&d.illustrator||"").toLowerCase().includes(il))return false;
      if(mk&&(g.es.map(x=>x.regMark||x.details&&x.details.regulationMark).find(Boolean)||"").toUpperCase()!==mk)return false;
      if(A.qty!==""&&g.count<+A.qty)return false;
      if(A.pic==="yes"&&!g.es.some(x=>imgSrc(x)))return false;if(A.pic==="no"&&g.es.some(x=>imgSrc(x)))return false;
      if(A.real==="yes"&&!g.es.some(hasReal))return false;if(A.real==="no"&&g.es.some(hasReal))return false;
      if(A.det==="yes"&&!d)return false;if(A.det==="no"&&d)return false;
      {const gu=gUnit(g);if(A.pmin!==""&&!(gu!=null&&gu>=+A.pmin))return false;if(A.pmax!==""&&!(gu!=null&&gu<=+A.pmax))return false}
      if(A.dup==="yes"&&g.count<2)return false;
      if(A.priced==="yes"&&gUnit(g)==null)return false;
      if(A.priced==="no"&&gUnit(g)!=null)return false;
      if(A.added!==""&&!g.es.some(x=>String(x.added||"").slice(0,10)>=A.added))return false;
      return true});
    list.length=0;list.push(...keep)}
   {const more=["hpMin","hpMax","text","illus","qty","pic","real","det","pmin","pmax","dup","priced","added"].filter(k=>String(A[k]||"").trim()!=="").length+V2F.stage.size;$("#advCount").textContent=more?`(${more} on)`:"";
    const tot=(S.filter!=="all")+!!S.loc+!!S.ser+!!S.exp+!!S.rar+!!S.stage+!!S.kind+!!S.tk+v2n()+!!S.fmt+!!S.month+S.types.size+on;$("#fCount").textContent=tot?`${tot} on`:"";$("#fClearAll").classList.toggle("hidden",!tot);
    const rs=new Set(RARITIES);S.cards.forEach(c=>{if(c.rarity)rs.add(c.rarity)});const ro=[...rs].sort((x,y)=>rarRank(x)-rarRank(y));
    $("#rarF").innerHTML=`<option value="">All rarities</option>`+ro.map(r=>`<option value="${esc(r)}">${esc(r)}</option>`).join("")+`<option value="__none__">Not set</option>`;$("#rarF").value=S.rar||"";if($("#rarF")._rsync)$("#rarF")._rsync();}
   const ills={};S.cards.forEach(c=>{const i=c.details&&c.details.illustrator;if(i)ills[i]=(ills[i]||0)+(+c.qty||1)});
   $("#illusList").innerHTML=Object.keys(ills).sort().map(i=>`<option value="${esc(i)}">${esc(i)} (${ills[i]})</option>`).join("");}
  $("#sort").value=S.sort;$("#sortDir").textContent=S.sortDir==="desc"?"▼":"▲";$("#sortDir").title=S.sortDir==="desc"?"Descending: tap to reverse":"Ascending: tap to reverse";
  {const cmp=by[S.sort]||nm;const dsc=S.sortDir==="desc";list.sort((a,b)=>dsc?cmp(b,a):cmp(a,b))}
  S.listOrder=list.map(g=>g.f.id);
  {const L=$("#list");L.classList.toggle("compactlist",S.view==="compact");if(S.gw==null){let z=195;try{z=+localStorage.getItem("pk-gw")||195}catch{}S.gw=Math.max(120,Math.min(420,z));const r=$("#gsize");if(r)r.value=S.gw}L.style.setProperty("--gw",S.gw+"px");const w=$("#gsizeWrap");if(w)w.style.display=S.view==="grid"?"flex":"none"}
  if(!list.length){$("#list").innerHTML=`<p class="empty">${S.cards.length?"No cards match.":"Your catalog is empty."}</p>`}
  else{
    if(!S.cols)S.cols=loadCols();
    const mobile=isNarrow();const HID=S.view==="compact"?[...S.cols.hidden,"pic"]:S.cols.hidden;const order=(mobile?COLS.map(x=>x.id):S.cols.order).filter(id=>!HID.includes(id));
    setColsTpl();
    let html=`<div class="lhead">${order.map(id=>{const k=COLMAP[id];const lab=id==="card"?`Card (${list.length} different)`:k.lab;const live=!mobile&&id!=="pic";const sk=COLSORT[id];const on=sk&&S.sort===sk;return `<span class="lh ${k.hc}${sk?" sortable":""}${on?" sorted":""}" data-col="${id}"${sk?` aria-sort="${on?(S.sortDir==="desc"?"descending":"ascending"):"none"}"`:""}${live?` tabindex="0" title="${sk?"Click to sort; click again to reverse. ":""}Drag to move this column. Drag its right edge to resize. Keyboard: Enter sorts, Alt+arrows move, Shift+arrows resize."`:""}${k.center?' style="justify-content:center"':""}><b>${esc(lab)}</b>${on?`<i class="sarr" aria-hidden="true">${S.sortDir==="desc"?"▼":"▲"}</i>`:""}${live?'<i class="rz" data-rz aria-hidden="true"></i>':""}</span>`}).join("")}</div>`;
    for(const g of v2slice(list)){
      const c=g.f;const d=g.es.map(x=>x.details).find(Boolean);
      const exName=c.set||c.setCode||"Unknown";const exSub=[c.set&&c.setCode,c.number].filter(Boolean).join(" ");
      const mark=(g.es.map(x=>x.regMark||x.details&&x.details.regulationMark).find(Boolean)||"").toUpperCase();
      const locs=g.es.map(x=>x.locType==="showcase"?`Showcase: ${x.deck||"Showcase"}${(+x.qty||1)>1?` (×${+x.qty})`:""}`:x.locType==="deck"?`Deck: ${x.deck||"unnamed"}${(+x.qty||1)>1?` (×${+x.qty})`:""}`:`${binderName(x.binder||"?")}, page ${x.page||"?"}, pocket ${x.slot||"?"}`);
      const cell={
        pic:`<span class="tw">${cpThumb(c)?`<img class="thumb" alt="" loading="lazy" src="${cpThumb(c)}">`:`<span class="thumb ph" style="--tc:${V2TC[d&&d.types&&d.types[0]]||(String((d&&d.supertype)||"").toLowerCase().startsWith("trainer")?"#5b6a8c":"#8c93a8")}">${esc(String(c.name||"?")[0])}</span>`}</span>`,
        card:`<span class="main"><span class="nm">${esc(c.name)}</span>${c.variant&&c.variant!=="Normal"?`<span class="badge ${isHolo(c.variant)?"holo":""}">${esc(c.variant)}</span>`:""}${(()=>{if(!d)return"";const sup=String(d.supertype||"").toLowerCase();const k=sup.startsWith("trainer")?"Trainer":sup.startsWith("energy")?"Energy":"Pokémon";let sb="";if(k==="Pokémon"){const st=stageOf(g);sb=st==="Unknown"?"":st}else sb=(d.subtypes||[]).find(x=>/item|supporter|stadium|tool|basic|special/i.test(x))||"";return `<small class="ksub">${esc(k+(sb?" · "+sb:""))}</small>`})()}</span>`,
        dex:`<span class="dx">${dexOf(c)?`<span title="National Pokédex number">${dexOf(c)}</span>`:"—"}</span>`,
        ex:`<span class="ex">${esc(exName)}${exSub||mark?`<small>${esc(exSub)}<span class="mk-m">${mark?(exSub?", ":"")+"Mark "+esc(mark):""}</span></small>`:""}</span>`,
        sr:`<span class="sr">${(()=>{const x=seriesOf(c);return x==="Other"?"—":esc(x)})()}</span>`,
        fm:`<span class="fm">${(()=>{const f=fmtOf(g);return f.unk?"<span class=\"fmb unk\" title=\"No regulation mark or set, so the format can’t be worked out\">?</span>":(f.std?"<span class=\"fmb std\">Standard</span>":"")+(f.exp?"<span class=\"fmb exp\">Expanded</span>":"")||"<span class=\"fmb no\">Unlimited only</span>"})()}</span>`,
        mk:`<span class="mk">${mark?`<span class="rmk" title="Regulation mark ${esc(mark)}">${esc(mark)}</span>`:"—"}</span>`,
        ra:`<span class="ra">${c.rarity?rarHtml(c.rarity):"—"}</span>`,
        st:`<span class="st">${(()=>{const s=stageOf(g);return s==="Unknown"?"—":esc(s)})()}</span>`,
        ty:`<span class="ty">${d&&d.types&&d.types[0]?en(d.types[0]):""}</span>`,
        qty:`<span class="qty">×${g.count}</span>`,
        pr:`<span class="pr">${(()=>{const u=gUnit(g);return u==null?"—":eur(u)+(g.count>1?`<small>×${g.count} = ${eur(u*g.count)}</small>`:"")})()}</span>`,
        cid:`<span class="cid">${g.es.map(x=>`<span>${pkIdChip(x)}</span>`).join("")}</span>`,
        loc:`<span class="loc">${locs.map(l=>`<span title="${esc(l)}">${esc(l)}</span>`).join("")}</span>`
      };
      html+=`<button class="card" data-id="${esc(c.id)}">${order.map(id=>cell[id]).join("")}</button>`;
    }
    $("#list").innerHTML=html;
  }
  S.shown=list;
  if(S.view==="grid"&&list.length)$("#list").innerHTML=`<div class="cgrid">${v2slice(list).map(g=>{const c=g.f;const src=(+S.gw||195)>260?(imgSrc(c)||(c.tcgImage?c.tcgImage+"/high.webp":"")||realImg(c)||""):cpThumb(c);return `<button class="gcard" data-id="${esc(c.id)}"><span class="gimg">${src?`<img alt="" loading="lazy" src="${src}">`:`<span class="gph"><b>${esc(c.name)}</b><small>${esc([c.setCode,c.number].filter(Boolean).join(" "))}</small></span>`}${(src||cpPic(c))?`<span class="gzoom" role="button" tabindex="0" data-zoom="${esc(c.id)}" aria-label="Larger preview of ${esc(c.name)}" title="Larger preview"><svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L21 21"/></g></svg></span>`:""}</span><span class="gcap"><span class="gtop"><b>${esc(c.name)}</b>${g.count>1?`<span class="gq">×${g.count}</span>`:""}</span><small>${esc([c.setCode||c.set,c.number].filter(Boolean).join(" "))}</small></span></button>`}).join("")}</div>`;
  {const km={};list.forEach(g=>{km[g.f.id]=cardKey(g.f)});
   $("#list").classList.toggle("selmode",!!S.selMode);
   $("#list").querySelectorAll("[data-id]").forEach(el=>{const k=km[el.dataset.id];if(k==null)return;el.dataset.key=k;el.classList.toggle("picked",S.sel.has(k));if(S.selMode)el.setAttribute("aria-pressed",S.sel.has(k));else el.removeAttribute("aria-pressed")});
   updBulk();}
  $("#export").classList.toggle("hidden",!S.downloads||!S.cards.length);
  $("#clearAll").classList.toggle("hidden",!S.cards.length);
  $("#resetCols").classList.toggle("hidden",!colsCustom());
  {const chips=[];if(S.month)chips.push(["month",`Added in ${new Date(S.month+"-01T12:00:00").toLocaleDateString(undefined,{month:"long",year:"numeric"})}`]);
   $("#chipLine").innerHTML=chips.map(([k,l])=>`<span class="fchip">${esc(l)}<button type="button" data-clrf="${k}" aria-label="Remove filter: ${esc(l)}">×</button></span>`).join("");$("#chipLine").classList.toggle("hidden",!chips.length);}
  renderDex();renderSets();renderValue();renderShowcase();renderCharts();renderOverview();renderDecks();renderHome();v2Pills();toolsRefresh();cpRefresh();sbSchedule();
  if(!S.cols)S.cols=loadCols();
  if(!$("#colList").childElementCount)$("#colList").innerHTML=COLS.map(c=>`<label><input type="checkbox" data-colt="${c.id}"${c.id==="card"?" disabled":""}>${esc(c.id==="pic"?"Picture":c.lab)}</label>`).join("")+`<button type="button" class="linkbtn" data-colreset>Show all columns</button>`;
  document.querySelectorAll("#colList [data-colt]").forEach(i=>{i.checked=!S.cols.hidden.includes(i.dataset.colt)});
  const miss=S.cards.filter(c=>!c.details).length;
  $("#bulk").classList.toggle("hidden",!S.sample||(!miss&&!bulkCtl));
  if(!bulkCtl)$("#bulk").textContent=`Fill in details (${miss})`;
}
function pocketHtml(n,c,src,pg){
  const dp=pg?` data-page="${pg}"`:"";
  if(!c)return pg?`<div class="pocket padd" data-slot="${n}"${dp} tabindex="0" role="button" aria-label="Add a card to page ${pg}, pocket ${n} from a photo" title="Add a card from a photo"><span class="pn">${n}</span><span class="pplus" aria-hidden="true">+</span></div>`:`<div class="pocket" data-slot="${n}"${dp}>${n}</div>`;
  const pk=!!(pg&&S.bselMode&&c.id&&S.bsel&&S.bsel.has(c.id));
  const low=(c.confidence==="low"?" low":"")+(S.flash&&S.flash.has(`${pg||0}-${n}`)?" landed":"")+(pg&&S.bselMode?" selable":"")+(pk?" picked":"");const lab=`aria-label="${esc(c.name)}, ${pg?"page "+pg+", ":""}pocket ${n}${pk?", selected":""}"${pg&&S.bselMode?` aria-pressed="${pk}"`:""}`;
  if(src)return `<div class="pocket filled crop drag${low}" data-slot="${n}"${dp} tabindex="0" ${lab}><img alt="" src="${src}" draggable="false"></div>`;
  const code=[c.setCode,c.number].filter(Boolean).join(" ");const hp=c.details&&c.details.hp?"HP "+c.details.hp:"";
  return `<div class="pocket filled drag ${isHolo(c.variant)?"holo":""}${low}" data-slot="${n}"${dp} tabindex="0" ${lab}><span class="pi"><b>${esc(c.name)}</b>${code?`<small>${esc(code)}</small>`:""}${hp||(c.variant&&c.variant!=="Normal")?`<small>${esc([hp,c.variant!=="Normal"?c.variant:""].filter(Boolean).join(", "))}</small>`:""}</span></div>`;
}
function spreadInfo(){
  const b=$("#binderNo").value,cur=Math.max(1,+$("#pageNo").value||1);
  const inB=S.cards.filter(c=>c.locType==="binder"&&String(c.binder)===b);
  const set=(S.binders[b]&&+S.binders[b].pages)||0;
  let total=Math.max(2,set,cur,...inB.map(c=>+c.page||0));if(total%2)total++;
  let L,R;if(cur===1){L=null;R=1}else{L=cur%2===0?cur:cur-1;R=L+1>total?null:L+1}
  return {b,cur,total,set,L,R,inB};
}
const binderName=n=>(S.binders[n]&&S.binders[n].name)||`Binder ${n}`;
const COVERS=["#2F5D8C","#8C3B3B","#3D7A4E","#6B4B8C","#8C6A2F","#2F7A7A","#4A4F5C"];
const binderColor=n=>{const c=S.binders[n]&&S.binders[n].color;return /^#[0-9a-f]{6}$/i.test(c||"")?c:COVERS[(Math.max(1,+n||1)-1)%COVERS.length]};
function binderNums(){
  const s=new Set(Object.keys(S.binders).map(Number));
  S.cards.forEach(c=>{if(c.locType==="binder"&&+c.binder)s.add(+c.binder)});
  return [...s].filter(n=>n>0).sort((a,b)=>binderPos(a)-binderPos(b)||a-b);
}
function binderPos(n){const b=S.binders[n];return b&&b.pos!=null&&Number.isFinite(+b.pos)?+b.pos:1000+n}
function renderGallery(){
  const g=$("#galleryGrid");if(!g)return;
  const nums=binderNums();
  g.innerHTML=nums.map(n=>{
    const b=S.binders[n]||{};const cs=S.cards.filter(c=>c.locType==="binder"&&+c.binder===n);
    const cards=cs.reduce((a,c)=>a+(+c.qty||1),0);
    const setP=+b.pages||0;let pages=Math.max(setP,...cs.map(c=>+c.page||0),0);if(pages%2)pages++;
    const cap=pages*9;const filled=new Set(cs.filter(c=>+c.slot&&+c.page>=1&&+c.page<=pages).map(c=>c.page+"-"+c.slot)).size;
    const pct=cap?Math.min(100,Math.round(filled/cap*100)):0;
    const info=cap?`<small>${filled} of ${cap} pockets filled</small><div class="fill" role="img" aria-label="${pct}% full"><i style="width:${pct}%"></i></div><small>${plural(pages,"page")}${setP?"":" so far"}, ${plural(cards,"card")}</small>`:`<small>No pages set yet</small>`;
    const isSel=String(n)===String($("#binderNo").value)&&S.mode==="binder";
    return `<div class="tile${isSel?" sel":""}" data-n="${n}"><button type="button" class="bt" data-open="${n}" aria-label="Open ${esc(binderName(n))}"${isSel?' aria-current="true"':""}><div class="cov" style="--c:${binderColor(n)}">${b.cover?`<img alt="" draggable="false" src="${PKL.blob(b.cover)}">`:n}</div><div class="bt-t"><b>${esc(binderName(n))}</b>${info}${typeRowHtml(n)}</div></button><button type="button" class="bt-edit" data-bedit="${n}">Edit</button></div>`;
  }).join("")+`<div class="tile new"><button type="button" class="v2new" data-bnew><span class="frame" aria-hidden="true">+</span><b>New binder</b></button></div>`;
}
function binderStats(n){
  const cs=S.cards.filter(c=>c.locType==="binder"&&+c.binder===n);
  const setP=(S.binders[n]&&+S.binders[n].pages)||0;let pages=Math.max(setP,...cs.map(c=>+c.page||0),0);if(pages%2)pages++;
  const cap=pages*9;const filled=new Set(cs.filter(c=>+c.slot&&+c.page>=1&&+c.page<=pages).map(c=>c.page+"-"+c.slot)).size;
  const copies=cs.reduce((a,c)=>a+(+c.qty||1),0);const unique=new Set(cs.map(cardKey)).size;
  const types={},kinds={trainer:0,energy:0,unknown:0},sets={},stages={};
  for(const c of cs){
    const q=+c.qty||1;const d=c.details;const sup=String(d&&d.supertype||"").toLowerCase();
    if(!d)kinds.unknown+=q;else if(sup.startsWith("trainer"))kinds.trainer+=q;else if(sup.startsWith("energy"))kinds.energy+=q;
    else{const t=(d.types||[])[0]||"Colorless";types[t]=(types[t]||0)+q}
    const s=c.set||c.setCode||"Unknown";sets[s]=(sets[s]||0)+q;
    const sg=stageOf({es:[c]});if(sg!=="Unknown"&&sg!=="Trainer"&&sg!=="Energy")stages[sg]=(stages[sg]||0)+q;
  }
  return {cs,pages,setP,cap,filled,copies,unique,types,kinds,sets,stages};
}
function typeRowHtml(n){
  const st=binderStats(n);const ts=SPRITE.filter(t=>st.types[t]);
  return ts.length?`<div class="tcounts" aria-label="Pokémon by type">${ts.map(t=>`<span title="${t}: ${st.types[t]}">${en(t)}${st.types[t]}</span>`).join("")}</div>`:"";
}
let gTap=null;
function binderInfo(n,fromEl){
  const st=binderStats(n);const b=S.binders[n]||{};const name=binderName(n);
  const pct=st.cap?Math.min(100,Math.round(st.filled/st.cap*100)):0;
  const ts=SPRITE.filter(t=>st.types[t]);
  const pokemon=ts.reduce((a,t)=>a+st.types[t],0);
  const stageOrder=["Basic","Stage 1","Stage 2",...EVO.filter(x=>x!=="Stage 1"&&x!=="Stage 2"),"Restored"];
  const stg=stageOrder.filter(s=>st.stages[s]);
  const sets=Object.keys(st.sets).sort((a,z)=>st.sets[z]-st.sets[a]||a.localeCompare(z));
  const ov=document.createElement("div");ov.className="zoom on";ov.setAttribute("role","dialog");ov.setAttribute("aria-label",name);
  ov.innerHTML=`<div class="bpop-cov"><div class="cov${b.cover?" has-img":""}" style="--c:${binderColor(n)}">${b.cover?`<img alt="" src="${PKL.blob(b.cover)}">`:n}</div></div>
  <div class="zbar"><button type="button" class="btn" data-bopen>Open binder</button><button type="button" class="btn ghost" data-bedit2>Edit</button><button type="button" class="btn ghost" data-bclose>Close</button></div>
  <div class="bpop">
    <h3>${esc(name)}</h3><p class="sub2">Binder ${n}${b.name?"":""}</p>
    <div class="bstats">
      <div><b>${st.filled} of ${st.cap||0}</b><small>pockets filled${st.cap?` (${pct}%)`:""}</small><div class="fill"><i style="width:${pct}%"></i></div></div>
      <div><b>${st.pages||0}</b><small>${st.setP?"pages":"pages so far"}${st.pages?` (${st.pages/2} sheets)`:""}</small></div>
      <div><b>${st.copies}</b><small>cards in total</small></div>
      <div><b>${st.unique}</b><small>different cards</small></div>
    </div>
    <div class="bsec"><h4>Pokémon by type${pokemon?` (${pokemon})`:""}</h4>${ts.length?`<div class="tgrid">${ts.map(t=>`<div class="tchip">${en(t)}<span>${t}</span><b>${st.types[t]}</b></div>`).join("")}</div>`:`<p class="sub2">No Pokémon with details yet.</p>`}
      ${st.kinds.trainer||st.kinds.energy||st.kinds.unknown?`<p class="sub2" style="margin-top:8px">${[st.kinds.trainer&&`Trainers: ${st.kinds.trainer}`,st.kinds.energy&&`Energy cards: ${st.kinds.energy}`,st.kinds.unknown&&`Without details: ${st.kinds.unknown}`].filter(Boolean).join(", ")}</p>`:""}</div>
    ${stg.length?`<div class="bsec"><h4>By stage</h4><div class="tgrid">${stg.map(s=>`<div class="tchip"><span>${esc(s)}</span><b>${st.stages[s]}</b></div>`).join("")}</div></div>`:""}
    ${sets.length?`<div class="bsec"><h4>By set</h4><div class="setlist">${sets.map(s=>`<div><span>${esc(s)}</span><b>${st.sets[s]}</b></div>`).join("")}</div></div>`:""}
  </div>`;
  document.body.appendChild(ov);
  const close=()=>{document.removeEventListener("keydown",onKey,true);ov.remove();if(fromEl&&fromEl.isConnected)fromEl.focus({preventScroll:true})};
  const onKey=e=>{if($("#binderDlg").open||$("#confirmDlg").open)return;if(e.key==="Escape"){e.stopPropagation();e.preventDefault();close()}};
  document.addEventListener("keydown",onKey,true);
  ov.addEventListener("click",async e=>{
    if(e.target.closest("[data-bopen]")){close();if(S.review.length&&!(await askConfirm("Discard these cards?","The cards waiting for review haven’t been added yet.","Discard")))return;openBinder(n);return}
    if(e.target.closest("[data-bedit2]")){close();openBinderDlg(n,false);return}
    if(e.target===ov||e.target.closest("[data-bclose]"))close();
  });
  ov.querySelector("[data-bopen]").focus({preventScroll:true});
}
function openBinderDlg(n,isNew){
  const b=S.binders[n]||{};S.bEdit={n,isNew,blob:null,url:null,remove:false};
  $("#bdTitle").textContent=isNew?"New binder":binderName(n);
  $("#bdName").value=b.name||"";$("#bdColor").value=binderColor(n);S.bEdit.color=null;$("#bdPages").value=b.pages||"";$("#bdName").placeholder=`Binder ${n}`;$("#bdStatus").textContent="";$("#bdFile").value="";
  $("#bdCoverTools").classList.toggle("hidden",!S.assets);
  bdPreview();$("#binderDlg").returnValue="";$("#binderDlg").showModal();
}
function bdPreview(){
  const e=S.bEdit,b=S.binders[e.n]||{};
  const src=e.url||(!e.remove&&b.cover?PKL.blob(b.cover):"");
  const col=e.color||(e.color===""?COVERS[(e.n-1)%COVERS.length]:binderColor(e.n));
  $("#bdCov").innerHTML=`<div class="cov" style="--c:${col}">${src?`<img alt="Cover photo" src="${src}">`:e.n}</div>`;
  $("#bdRemove").classList.toggle("hidden",!src);
}
function openBinder(n){
  if(S.review.length){S.review=[];clearCrops();renderReview()}
  if(S.photo)clearPhoto();
  S.mode="binder";document.querySelectorAll(".seg [data-mode]").forEach(x=>x.setAttribute("aria-pressed",x.dataset.mode==="binder"));
  $("#binderFields").classList.remove("hidden");$("#deckFields").classList.add("hidden");
  if(S.bsel)S.bsel.clear();$("#binderNo").value=n;$("#pageNo").value=1;S.full=false;renderBinder();
  const f=$("#binderView [data-goto]");show("binders");const bp=$("#binderPanel");if(bp)bp.scrollIntoView({behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth",block:"start"});if(f)f.focus({preventScroll:true});
}
const EVO=["Stage 1","Stage 2","VMAX","VSTAR","BREAK","Level-Up","Mega"];
let v2per=100,v2page=1,v2sig="",v2nav=false;
try{const x=+localStorage.getItem("pk-per");if(x>=25&&x<=500&&x%25===0)v2per=x}catch{}
function v2slice(list){
  const sig=list.length+"|"+(list[0]?list[0].f.id:"")+"|"+(list.length?list[list.length-1].f.id:"")+"|"+S.sort+S.sortDir+"|"+v2per;
  if(sig!==v2sig&&!v2nav)v2page=1;v2sig=sig;v2nav=false;
  const pages=Math.max(1,Math.ceil(list.length/v2per));if(v2page>pages)v2page=pages;if(v2page<1)v2page=1;
  const a=(v2page-1)*v2per;S.pageList=list.slice(a,a+v2per);
  for(const pg of document.querySelectorAll(".v2pager")){pg.classList.toggle("hidden",pages<=1);pg.innerHTML=pages<=1?"":`<button type="button" class="btn ghost" data-v2pg="1"${v2page===1?" disabled":""} aria-label="First page">«</button><button type="button" class="btn ghost" data-v2pg="${v2page-1}"${v2page===1?" disabled":""} aria-label="Previous page">‹ Prev</button><span class="v2pgi">Page <b>${v2page}</b> of ${pages}</span><button type="button" class="btn ghost" data-v2pg="${v2page+1}"${v2page===pages?" disabled":""} aria-label="Next page">Next ›</button><button type="button" class="btn ghost" data-v2pg="${pages}"${v2page===pages?" disabled":""} aria-label="Last page">»</button>`}
  return S.pageList;
}
const V2TC={Fire:"#f5733b",Water:"#3b8fe8",Grass:"#4cb85a",Lightning:"#f2c200",Psychic:"#b05bd6",Fighting:"#c0663a",Darkness:"#4a4560",Metal:"#8a98a8",Fairy:"#ef7fb4",Dragon:"#c9973a",Colorless:"#b9bcc6"};
const V2F={ser:new Set(),exp:new Set(),rar:new Set(),stage:new Set(),fmt:new Set()};
const v2n=()=>Object.values(V2F).reduce((a,x)=>a+x.size,0);
function stageOf(g){
  const d=g.es.map(x=>x.details).find(Boolean);if(!d)return "Unknown";
  const sup=String(d.supertype||"").toLowerCase();
  if(sup.startsWith("trainer"))return "Trainer";if(sup.startsWith("energy"))return "Energy";
  const subs=(d.subtypes||[]).map(x=>String(x).toLowerCase());const has=t=>subs.some(x=>x===t||x.includes(t));
  if(has("stage 2"))return "Stage 2";if(has("stage 1"))return "Stage 1";
  if(has("vmax"))return "VMAX";if(has("vstar"))return "VSTAR";if(has("break"))return "BREAK";
  if(has("level-up")||has("lv.x"))return "Level-Up";if(has("mega"))return "Mega";if(has("restored"))return "Restored";
  if(has("basic"))return "Basic";
  return "Unknown";
}
function stageMatch(s,f){if(f==="basic")return s==="Basic";if(f==="evo")return EVO.includes(s);return s===f}
function rarIdx(r){
  r=String(r||"").toLowerCase();if(!r)return -1;
  if(r.includes("promo"))return 11;
  if(r.includes("shiny")&&(r.includes("ultra")||r.includes("super")))return 10;
  if(r.includes("shiny"))return 9;
  if(r.includes("special illustration")||r.includes("special art"))return 7;
  if(r.includes("illustration")||r==="art rare")return 5;
  if(r.includes("hyper"))return 8;
  if(r.includes("ace"))return 4;
  if(r.includes("double"))return 3;
  if(r.includes("ultra"))return 6;
  if(r.includes("uncommon"))return 1;
  if(r.includes("common"))return 0;
  if(r.includes("secret"))return -1;
  if(r.includes("rare"))return 2;
  return -1;
}
function rarHtml(r){const i=rarIdx(r);return `<span class="rw">${i>-1?`<i class="rs" style="background-position:${(i/11*100).toFixed(3)}% 0" aria-hidden="true"></i>`:""}(${esc(r)})</span>`}
const SERIES_SETS={
  "Mega Evolution":["MEG","PFL","ASC","POR","CRI","PBL","MEP"],
  "Scarlet & Violet":["SVI","PAL","OBF","MEW","PAR","PAF","TEF","TWM","SFA","SCR","SSP","PRE","JTG","DRI","BLK","WHT","SVP"],
  "Sword & Shield":["SSH","RCL","DAA","CPA","VIV","SHF","BST","CRE","EVS","CEL","FST","BRS","ASR","PGO","LOR","SIT","CRZ","SWSHP"],
  "Sun & Moon":["SUM","GRI","BUS","SLG","CIN","UPR","FLI","CES","DRM","LOT","TEU","DET","UNB","UNM","HIF","CEC","SMP"],
  "XY":["KSS","XY","FLF","FFI","PHF","PRC","DCR","ROS","AOR","BKT","BKP","GEN","FCO","STS","EVO","XYP"],
  "Black & White":["BLW","EPO","NVI","NXD","DEX","DRX","DRV","BCR","PLS","PLF","PLB","LTR","BWP"],
  "HeartGold & SoulSilver":["HS","UL","UD","TM","CL","HSP"],
  "Platinum":["PL","RR","SV","AR"],
  "Diamond & Pearl":["DP","MT","SW","GE","MD","LA","SF","DPP"],
  "EX":["RS","SS","DR","MA","HL","RG","TRR","DX","EM","UF","DS","LM","HP","CG","DF","PK","NP"],
  "e-Card":["EX","AQ","SK"],
  "Neo":["N1","N2","N3","N4"],
  "Gym":["G1","G2"],
  "Base":["BS","JU","FO","B2","TR","LC","WP"]
};
const SERIES_ORDER=Object.keys(SERIES_SETS);
const SET_YEARS={MEG:2025,PFL:2025,ASC:2026,POR:2026,CRI:2026,PBL:2026,MEP:2025,
 SVI:2023,PAL:2023,OBF:2023,MEW:2023,PAR:2023,PAF:2024,TEF:2024,TWM:2024,SFA:2024,SCR:2024,SSP:2024,PRE:2025,JTG:2025,DRI:2025,BLK:2025,WHT:2025,SVP:2023,
 SSH:2020,RCL:2020,DAA:2020,CPA:2020,VIV:2020,SHF:2021,BST:2021,CRE:2021,EVS:2021,CEL:2021,FST:2021,BRS:2022,ASR:2022,PGO:2022,LOR:2022,SIT:2022,CRZ:2023,SWSHP:2019,
 SUM:2017,GRI:2017,BUS:2017,SLG:2017,CIN:2017,UPR:2018,FLI:2018,CES:2018,DRM:2018,LOT:2018,TEU:2019,DET:2019,UNB:2019,UNM:2019,HIF:2019,CEC:2019,SMP:2017,
 KSS:2013,XY:2014,FLF:2014,FFI:2014,PHF:2014,PRC:2015,DCR:2015,ROS:2015,AOR:2015,BKT:2015,BKP:2016,GEN:2016,FCO:2016,STS:2016,EVO:2016,XYP:2013,
 BLW:2011,EPO:2011,NVI:2011,NXD:2012,DEX:2012,DRX:2012,DRV:2012,BCR:2012,PLS:2013,PLF:2013,PLB:2013,LTR:2013,BWP:2011,
 HS:2010,UL:2010,UD:2010,TM:2010,CL:2011,HSP:2010,PL:2009,RR:2009,SV:2009,AR:2009,
 DP:2007,MT:2007,SW:2007,GE:2008,MD:2008,LA:2008,SF:2008,DPP:2007,
 RS:2003,SS:2003,DR:2003,MA:2004,HL:2004,RG:2004,TRR:2004,DX:2005,EM:2005,UF:2005,DS:2005,LM:2006,HP:2006,CG:2006,DF:2006,PK:2007,NP:2003,
 EX:2002,AQ:2003,SK:2003,N1:2000,N2:2001,N3:2001,N4:2002,G1:2000,G2:2000,BS:1999,JU:1999,FO:1999,B2:2000,TR:2000,LC:2002,WP:1999};
const PROMO_CODES=["MEP","SVP","SWSHP","SMP","XYP","BWP","HSP","DPP","NP","WP"];
const seriesYears=n=>{const ys=(SERIES_SETS[n]||[]).filter(c=>!PROMO_CODES.includes(c)).map(c=>SET_YEARS[c]).filter(Boolean);if(!ys.length)return "";const a=Math.min(...ys),b=Math.max(...ys);return a===b?String(a):`${a}–${b}`};
const setYearByName=n=>{const k=Object.keys(SET_NAMES).find(c=>SET_NAMES[c]===n)||String(n||"").toUpperCase();return SET_YEARS[k]||""};

const SERIES_BY_CODE={};for(const [s,a] of Object.entries(SERIES_SETS))a.forEach(x=>{SERIES_BY_CODE[x]=s});
const SERIES_ALL=[...SERIES_ORDER];const HIDDEN_SETS=new Set();const visSets=(g,keep)=>(SERIES_SETS[g]||[]).filter(c=>!HIDDEN_SETS.has(c)||c===keep);
const LBASE={etypes:[...ETYPES],sprite:[...SPRITE],type:JSON.parse(JSON.stringify(TYPE)),v2tc:{...V2TC},series:[...SERIES_ORDER]};
const seriesOf=c=>(c.series&&String(c.series).trim())||SERIES_BY_CODE[String(c.setCode||"").trim().toUpperCase()]||(c.details&&c.details.series)||"Other";
const COLS=[
  {id:"pic",lab:"",def:"54px",hc:""},
  {id:"card",lab:"Card",def:"minmax(0,1.3fr)",hc:""},
  {id:"dex",lab:"Dex No.",def:"3.6rem",hc:"lh-dx",center:true},
  {id:"ex",lab:"Set",def:"minmax(0,1fr)",hc:"lh-ex"},
  {id:"sr",lab:"Expansion",def:"minmax(0,.8fr)",hc:"lh-sr"},
  {id:"mk",lab:"Mark",def:"2.6rem",hc:"lh-mk",center:true},
  {id:"fm",lab:"Format",def:"minmax(0,.7fr)",hc:"lh-fm"},
  {id:"ra",lab:"Rarity",def:"minmax(0,.8fr)",hc:"lh-ra"},
  {id:"st",lab:"Stage",def:"minmax(0,.7fr)",hc:"lh-st"},
  {id:"ty",lab:"Type",def:"2.4rem",hc:""},
  {id:"qty",lab:"Count",def:"2.8rem",hc:""},
  {id:"pr",lab:"Price",def:"minmax(70px,.6fr)",hc:"lh-pr"},
  {id:"loc",lab:"Binder, page, pocket",def:"minmax(130px,1.2fr)",hc:"lh-loc"},
  {id:"cid",lab:"Card ID",def:"6.4rem",hc:"lh-cid"}
];
const COLMAP=Object.fromEntries(COLS.map(c=>[c.id,c]));
const isNarrow=()=>matchMedia("(max-width:600px)").matches;
function loadCols(){
  let o=null;try{o=JSON.parse(localStorage.getItem("pk-cols")||"null")}catch{}
  const ids=COLS.map(c=>c.id);const order=o&&Array.isArray(o.order)?o.order.filter((x,i,a)=>ids.includes(x)&&a.indexOf(x)===i):[];
  ids.forEach((x,i)=>{if(!order.includes(x)){const j=order.indexOf(ids[i-1]);order.splice(j>-1?j+1:order.length,0,x)}});
  const w={};if(o&&o.w&&typeof o.w==="object")for(const k of ids)if(+o.w[k]>=30)w[k]=Math.round(+o.w[k]);
  const hidden=o&&Array.isArray(o.hidden)?o.hidden.filter((x,i,a)=>ids.includes(x)&&x!=="card"&&a.indexOf(x)===i):[];
  return {order,w,hidden};
}
function saveCols(){try{localStorage.setItem("pk-cols",JSON.stringify(S.cols))}catch{}}
function colsCustom(){return S.cols&&(Object.keys(S.cols.w).length||S.cols.hidden.length||S.cols.order.join()!==COLS.map(c=>c.id).join())}
function setColsTpl(){
  if(!S.cols)S.cols=loadCols();
  const l=$("#list");const H=S.view==="compact"?[...S.cols.hidden,"pic"]:S.cols.hidden;
  if(isNarrow()){l.style.removeProperty("--cols");l.style.setProperty("--cols-m",[H.includes("pic")?null:"40px","minmax(0,1fr)",H.includes("ty")?null:"2rem",H.includes("qty")?null:"2.4rem"].filter(Boolean).join(" "));l.style.setProperty("--span",H.includes("pic")?"1":"2");return}
  l.style.setProperty("--cols",S.cols.order.filter(id=>!H.includes(id)).map(id=>S.cols.w[id]?S.cols.w[id]+"px":COLMAP[id].def).join(" "));
}
const DEX={abra:63,kadabra:64,alakazam:65,clefairy:35,vulpix:37,ninetales:38,marowak:105,tauros:128,moltres:146,cyndaquil:155,togepi:175,natu:177,xatu:178,azumarill:184,misdreavus:200,granbull:210,slugma:218,skarmory:227,smoochum:238,magby:240,"ho-oh":250,combusken:256,ralts:280,kirlia:281,shedinja:292,mawile:303,numel:322,camerupt:323,torkoal:324,spoink:325,grumpig:326,castform:351,shuppet:353,banette:354,beldum:374,metang:375,metagross:376,latios:381,deoxys:386,drifloon:425,drifblim:426,bronzor:436,togekiss:468,uxie:480,mesprit:481,cresselia:488,tepig:498,emboar:500,pansear:513,simisear:514,excadrill:530,darumaka:554,darmanitan:555,sigilyph:561,yamask:562,cofagrigus:563,gothorita:575,escavalier:589,ferroseed:597,ferrothorn:598,klink:599,klang:600,klinklang:601,stunfisk:618,pawniard:624,bisharp:625,heatmor:631,larvesta:636,volcarona:637,reshiram:643,meloetta:648,braixen:654,fletchinder:662,talonflame:663,florges:671,espurr:677,meowstic:678,honedge:679,doublade:680,aegislash:681,slurpuff:685,binacle:688,dedenne:702,klefki:707,phantump:708,trevenant:709,pumpkaboo:710,xerneas:716,torracat:726,cutiefly:742,salandit:757,comfey:764,sandygast:769,palossand:770,togedemaru:777,mimikyu:778,dhelmise:781,marshadow:802,scorbunny:813,cinderace:815,corviknight:823,sizzlipede:850,centiskorch:851,sinistea:854,polteageist:855,impidimp:859,grimmsnarl:861,milcery:868,alcremie:869,indeedee:876,cufant:878,copperajah:879,duraludon:884,zacian:888,skeledirge:911,fidough:926,dachsbun:927,charcadet:935,armarouge:936,flittle:955,espathra:956,tinkatink:957,tinkatuff:958,orthworm:968,greavard:971,kingambit:983,"scream tail":985,"flutter mane":987,"iron moth":994,gimmighoul:999,gholdengo:1000,"chi-yu":1004};
function dexBase(n){
  let s=String(n||"").trim();
  s=s.replace(/^.*?['’]s\s+/,"");
  s=s.replace(/^(Mega|Alolan|Galarian|Hisuian|Paldean|Radiant|Shining|Dark|Light|Dynamax|Gigantamax)\s+/i,"");
  s=s.replace(/\s+(ex|EX|GX|V|VMAX|VSTAR|V-UNION|BREAK|LV\.X|Prime|LEGEND|[XY])$/,"");
  s=s.replace(/\s+\S+\s+Form$/i,"").replace(/\s+(Forme?)$/i,"");
  return s.toLowerCase();
}
function dexOf(c){
  if(!c)return null;
  if(+c.dex>0)return +c.dex;
  const d=c.details;if(d&&+d.nationalDex>0)return +d.nationalDex;
  if(d&&d.supertype&&!String(d.supertype).startsWith("Pok"))return null;
  return DEX[dexBase(c.name)]||null;
}
const pad4=n=>String(n).padStart(4,"0");
function numParts(num){const m=String(num||"").match(/^\s*([A-Za-z]*)\s*(\d+)\s*\/\s*([A-Za-z]*)\s*(\d+)/);return m?{pre:m[1],n:+m[2],tot:+m[4]}:null}
function ranges(arr){const out=[];let s=null,p=null;for(const n of arr){if(s===null){s=p=n}else if(n===p+1)p=n;else{out.push(s===p?""+s:`${s}–${p}`);s=p=n}}if(s!==null)out.push(s===p?""+s:`${s}–${p}`);return out.join(", ")}

function setIdOf(r){
  for(const c of r.cards){if(c.tcgdexId){const m=String(c.tcgdexId).match(/^(.*)-[^-]+$/);if(m)return m[1]}}
  const row=PKL.P.sets.find(x=>String(x[1]).toLowerCase()===String(r.name).toLowerCase());return row?row[0]:"";
}
async function fillMissNames(det){
  const el=det.querySelector(".missnames");if(!el||el.dataset.done==="1"||!el.dataset.sid)return;
  el.dataset.done="1";el.innerHTML=`<p class="sub2">Loading card names…</p>`;
  try{
    const d=await PKL.setCards(el.dataset.sid);const total=+el.dataset.total;
    const have=a=>new Set(String(a).split(",").filter(Boolean).map(Number));
    const owned=have(el.dataset.owned),reg=have(el.dataset.reg),rev=have(el.dataset.rev);
    const cards=(d.cards||[]).filter(x=>{const n=parseInt(x.localId,10);return n>=1&&n<=total});
    const master=!!S.master;
    const mk=(arr,tag)=>arr.length?`<h5>${tag} (${arr.length})</h5><div class="mlist">${arr.map(x=>`<span><b>${esc(x.localId)}</b>${esc(x.name)}</span>`).join("")}</div>`:"";
    let html,txt;
    if(master){
      const mr=cards.filter(x=>!reg.has(parseInt(x.localId,10))),mv=cards.filter(x=>!rev.has(parseInt(x.localId,10)));
      html=mk(mr,"Missing regular")+mk(mv,"Missing reverse holo");
      txt=`${det.dataset.set} – missing regular (${mr.length}): `+mr.map(x=>`${x.localId} ${x.name}`).join(", ")+`\nMissing reverse holo (${mv.length}): `+mv.map(x=>`${x.localId} ${x.name}`).join(", ");
    }else{
      const m=cards.filter(x=>!owned.has(parseInt(x.localId,10)));
      html=m.length?mk(m,"Missing cards"):`<p class="sub2">Nothing missing from the main set.</p>`;
      txt=`${det.dataset.set} – missing (${m.length}): `+m.map(x=>`${x.localId} ${x.name}`).join(", ");
    }
    el.innerHTML=html;
    const b=det.querySelector("[data-copymiss]");if(b)b.dataset.copymiss=txt;
  }catch(e){el.dataset.done="";el.innerHTML=`<p class="sub2">Couldn’t load card names (offline?). Close and reopen this set to retry.</p>`}
}
let setOpen=new Set();
function renderSets(){
  const box=$("#setList");if(!box)return;
  const sets={};
  for(const c of S.cards){const k=c.set||c.setCode;if(!k)continue;const s=(sets[k]=sets[k]||{name:k,code:"",cards:[],tots:{}});s.cards.push(c);if(c.setCode&&!s.code)s.code=c.setCode;const p=numParts(c.number);if(p&&!p.pre)s.tots[p.tot]=(s.tots[p.tot]||0)+1}
  const master=!!S.master;const rows=[];const noTot=[];
  for(const s of Object.values(sets)){
    const tk=Object.keys(s.tots).sort((a,b)=>s.tots[b]-s.tots[a])[0];if(!tk){noTot.push(s.name);continue}
    const total=+tk;const owned=new Set(),reg=new Set(),rev=new Set(),sec=new Set();
    for(const c of s.cards){const p=numParts(c.number);if(!p||p.pre)continue;if(p.n>=1&&p.n<=total){owned.add(p.n);if(c.variant==="Reverse Holo")rev.add(p.n);else reg.add(p.n)}else if(p.n>total)sec.add(p.n)}
    const have=master?reg.size+rev.size:owned.size,need=master?total*2:total;
    rows.push({...s,total,owned,reg,rev,sec,have,need,pct:Math.round(have/need*1000)/10,ser:seriesOf(s.cards[0])});
  }
  rows.sort((a,b)=>{const ia=SERIES_ALL.indexOf(a.ser),ib=SERIES_ALL.indexOf(b.ser);return (ia<0?99:ia)-(ib<0?99:ib)||b.pct-a.pct||a.name.localeCompare(b.name)});
  const ss=$("#setSum");
  if(!rows.length){if(ss)ss.innerHTML="";box.innerHTML=`<p class="sub2">Card numbers like 025/191 are needed to work out set progress.</p>`;return}
  if(ss){const done=rows.filter(r=>r.have>=r.need).length,toGo=rows.reduce((a,r)=>a+Math.max(0,r.need-r.have),0),avg=rows.reduce((a,r)=>a+Math.min(100,r.pct),0)/rows.length;
    ss.innerHTML=skpi("Sets tracked",rows.length)+skpi("Completed",done,done?"":"none yet")+skpi("Cards still needed",toGo)+skpi("Average completion",pc1(avg));}
  box.innerHTML=rows.map(r=>{
    const nums=Array.from({length:r.total},(_,i)=>i+1);
    const miss=master?null:nums.filter(n=>!r.owned.has(n));
    const missReg=nums.filter(n=>!r.reg.has(n)),missRev=nums.filter(n=>!r.rev.has(n));
    const missTxt=master?`Missing regular (${missReg.length}): ${ranges(missReg)||"none"}\nMissing reverse holo (${missRev.length}): ${ranges(missRev)||"none"}`:`Missing (${miss.length}): ${ranges(miss)||"none"}`;
    return `<details class="setrow" data-set="${esc(r.name)}"${setOpen.has(r.name)?" open":""}><summary><span class="sn"><b>${esc(r.name)}</b><small>${esc([r.code,r.ser!=="Other"?r.ser:""].filter(Boolean).join(", "))}</small></span><span class="fill"><i style="width:${Math.min(100,r.pct)}%"></i></span><span class="sc">${r.have} / ${r.need}</span><span class="sp">${r.pct}%${r.sec.size?`<small>+${r.sec.size} secret</small>`:""}</span></summary>
      <div class="setbody"><div class="numgrid${master?" master":""}">${nums.map(n=>{const o=r.owned.has(n);return `<span class="num${o?" own":""}${master&&r.reg.has(n)?" rg":""}${master&&r.rev.has(n)?" rv":""}" title="No. ${n}${o?": owned":": missing"}${master?`${r.reg.has(n)?", regular":""}${r.rev.has(n)?", reverse holo":""}`:""}">${n}</span>`}).join("")}${[...r.sec].sort((a,b)=>a-b).map(n=>`<span class="num own sec" title="Secret rare No. ${n}">${n}</span>`).join("")}</div>
      <p class="misstxt">${esc(missTxt).replace(/\n/g,"<br>")}</p>
      <div class="missnames" data-sid="${esc(setIdOf(r))}" data-total="${r.total}" data-owned="${[...r.owned].join(",")}" data-reg="${[...r.reg].join(",")}" data-rev="${[...r.rev].join(",")}"></div>
      <button type="button" class="linkbtn" data-copymiss="${esc(missTxt)}">Copy missing list</button>${master?`<p class="sub2" style="margin-top:6px">Not every card is printed as a reverse holo (most ex and special rares aren’t), so 100% may not be reachable.</p>`:""}</div></details>`;
  }).join("")+(noTot.length?`<p class="sub2" style="margin-top:10px">Not shown, because no set total is known from the card numbers: ${esc(noTot.join(", "))}.</p>`:"");
  box.querySelectorAll(".setrow[open]").forEach(fillMissNames);
}
function bars(rows){const max=Math.max(1,...rows.map(r=>r.v));return `<div class="bars">${rows.map(r=>`<button type="button" class="bar" data-cfk="${r.k}" data-cfv="${esc(r.f)}" title="Show these ${r.v} cards in the collection"><span class="bl">${r.l}</span><span class="btr"><i style="width:${Math.max(2,r.v/max*100)}%"></i></span><b>${r.v}</b></button>`).join("")}</div>`}
function bars_unused(rows){const max=Math.max(1,...rows.map(r=>r.v));return `<div class="bars">${rows.map(r=>`<div class="bar"><span class="bl">${r.l}</span><span class="btr"><i style="width:${Math.max(2,r.v/max*100)}%"></i></span><b>${r.v}</b></div>`).join("")}</div>`}

// ---------- collection value ----------
const gUnit=g=>{const l=g.es.map(unitVal).filter(v=>v!=null);return l.length?Math.max(...l):null};
const unitVal=c=>{const p=c.price;if(!p)return null;const h=/reverse/i.test(c.variant||"")&&p.trendHolo>0;const v=h?p.trendHolo:p.trend;return v==null||v===""?null:+v};
const eur=n=>"€"+(+n||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});
function valueStats(){
  let total=0,priced=0,copies=0,pcopies=0,latest="";const bySet={},byLoc={},list=[];
  for(const c of S.cards){
    const q=+c.qty||1;copies+=q;const u=unitVal(c);if(u==null)continue;
    priced+=1;pcopies+=q;total+=u*q;
    const k=c.set||c.setCode||"Unknown";bySet[k]=(bySet[k]||0)+u*q;
    const l=c.locType==="showcase"?"Showcase: "+(c.deck||"Showcase"):c.locType==="deck"?"Deck: "+deckOf(c):binderName(c.binder);byLoc[l]=(byLoc[l]||0)+u*q;
    const up=c.price&&c.price.updated?String(c.price.updated).slice(0,10):"";if(up>latest)latest=up;
    list.push({c,u,q,t:u*q});
  }
  return {total,priced,copies,pcopies,latest,bySet,byLoc,list,unpriced:S.cards.length-priced};
}
function vbars(obj,limit){
  const rows=Object.entries(obj).sort((a,b)=>b[1]-a[1]).slice(0,limit||12);const max=Math.max(0.01,...rows.map(r=>r[1]));
  return `<div class="vbars">${rows.map(([k,v])=>`<div class="vbar"><span>${esc(k)}</span><span class="btr"><i style="width:${Math.max(2,v/max*100)}%"></i></span><b>${eur(v)}</b></div>`).join("")}</div>`;
}
// ===== Stats: overview, value, analytics =====
const SPAL=["#3b4cca","#f2b705","#14b8a6","#e5484d","#a855f7","#8c93a8"];
const sgo=(k,v)=>` data-hg="${k}" data-hv="${esc(String(v))}" role="button" tabindex="0"`;
const pc1=n=>(Math.round(n*10)/10)+"%";
const mlab=m=>new Date(m+"-01T12:00:00").toLocaleDateString(undefined,{month:"short",year:"numeric"});
const HPB=[["≤60",0,60],["70–100",70,100],["110–150",110,150],["160–220",160,220],["230+",230,""]];
const MECH=["ex","GX","V","VMAX","VSTAR","V-UNION","Radiant","Tera","Mega","BREAK","Prism Star","Ancient","Future"];
function statSets(cards){
  const sets={};
  for(const c of cards){const k=c.set||c.setCode;if(!k)continue;const p=numParts(c.number);if(!p||p.pre)continue;const x=(sets[k]=sets[k]||{tot:{},own:new Set()});x.tot[p.tot]=(x.tot[p.tot]||0)+1;x.own.add(p.n)}
  return Object.entries(sets).map(([k,x])=>{const t=+Object.keys(x.tot).sort((a,z)=>x.tot[z]-x.tot[a])[0];const o=[...x.own].filter(n=>n>=1&&n<=t).length;return {k,t,o,miss:Math.max(0,t-o),p:t?Math.round(o/t*1000)/10:0}}).filter(r=>r.t>0);
}
function statData(){
  const cards=S.cards,q=c=>+c.qty||1;const v=valueStats();
  const D={cards,v,copies:0,diff:new Set(cards.map(cardKey)).size};
  const m=()=>({});
  const rar=m(),varM=m(),cond=m(),ser=m(),art=m(),mark=m(),ty=m(),mon=m(),spc=m(),mech=m(),tr=m(),setC=m();
  const stage={Basic:0,"Stage 1":0,"Stage 2":0,Other:0},hp={},kind={Pokémon:0,Trainer:0,Energy:0,"No details":0},fm={Standard:0,"Expanded only":0,"Not legal":0,Unknown:0},loc={binder:0,deck:0,showcase:0},cpc={1:0,2:0,3:0,"4+":0};
  HPB.forEach(b=>hp[b[0]]=0);
  const inc=(o,k,n)=>{o[k]=(o[k]||0)+n};
  for(const c of cards){
    const n=q(c);D.copies+=n;
    inc(rar,c.rarity||"Not set",n);inc(varM,c.variant||"Normal",n);inc(cond,c.condition||"Not set",n);inc(ser,seriesOf(c),n);inc(setC,c.set||c.setCode||"Unknown",n);
    if(loc[c.locType]!=null)loc[c.locType]+=n;
    cpc[n>=4?"4+":n]+=1;
    const am=String(c.added||"").slice(0,7);if(/^\d{4}-\d{2}$/.test(am))inc(mon,am,n);
    const d=c.details;const g={es:[c],f:c};
    const mk=(c.regMark||d&&d.regulationMark||"").toUpperCase().trim();if(mk)inc(mark,mk,n);
    try{const f=fmtOf(g);inc(fm,f.std?"Standard":f.exp?"Expanded only":f.unk?"Unknown":"Not legal",n)}catch{}
    if(!d){kind["No details"]+=n;continue}
    const sup=String(d.supertype||"").toLowerCase();const sub=(d.subtypes||[]).map(x=>String(x).toLowerCase());
    if(d.illustrator)inc(art,String(d.illustrator).trim(),n);
    for(const x of MECH)if(sub.includes(x.toLowerCase()))inc(mech,x,n);
    if(sup.startsWith("trainer")){kind.Trainer+=n;inc(tr,sub.includes("supporter")?"Supporter":sub.includes("item")?"Item":sub.includes("stadium")?"Stadium":sub.some(x=>x.includes("tool"))?"Tool":"Other",n)}
    else if(sup.startsWith("energy")){kind.Energy+=n}
    else{
      kind.Pokémon+=n;inc(ty,(d.types||[])[0]||"Colorless",n);
      stage[sub.includes("basic")?"Basic":sub.includes("stage 1")?"Stage 1":sub.includes("stage 2")?"Stage 2":"Other"]+=n;
      const h=parseInt(d.hp,10);if(h){const b=HPB.find(b=>h>=b[1]&&(b[2]===""||h<=b[2]))||HPB[HPB.length-1];hp[b[0]]+=n}
      const dx=dexOf(c);if(dx)inc(spc,titleCase(dexBase(c.name)),n);
    }
  }
  Object.assign(D,{rar,varM,cond,ser,art,mark,ty,mon,spc,mech,tr,setC,stage,hp,kind,fm,loc,cpc});
  D.sets=statSets(cards);
  D.sorted=v.list.slice().sort((a,b)=>b.t-a.t);
  const us=v.list.map(r=>r.u).sort((a,b)=>a-b);D.median=us.length?(us.length%2?us[(us.length-1)/2]:(us[us.length/2-1]+us[us.length/2])/2):0;
  D.extra=D.copies-D.diff;
  const gk={};for(const c of cards){const k=cardKey(c);const x=gk[k]=gk[k]||{n:0,u:unitVal(c)};x.n+=q(c)}
  D.extraVal=Object.values(gk).reduce((a,x)=>a+(x.n>1&&x.u?(x.n-1)*x.u:0),0);
  D.species=Object.keys(spc).length;
  return D;
}
const topN=(o,n)=>Object.entries(o).filter(([,x])=>x>0).sort((a,b)=>b[1]-a[1]||String(a[0]).localeCompare(b[0])).slice(0,n);
/* generic row builders: rows = {l (html label), v (number), t (text, optional), hg:[k,v] optional} */
function sbars(rows,opt){
  opt=opt||{};const max=Math.max(0.0001,...rows.map(r=>r.v));const col=opt.col;
  if(!rows.length)return `<p class="sub2">Nothing to show yet.</p>`;
  return `<div class="bars">${rows.map(r=>{const body=`<span class="bl">${r.l}</span><span class="btr"><i style="width:${Math.max(2,r.v/max*100)}%${r.c||col?`;background:${r.c||col}`:""}"></i></span><b>${r.t!=null?r.t:r.v}</b>`;
    return r.hg?`<button type="button" class="bar${opt.w?" w":""}"${sgo(r.hg[0],r.hg[1])} title="Show these cards in the collection">${body}</button>`:`<div class="bar st${opt.w?" w":""}">${body}</div>`}).join("")}</div>`;
}
function donut(rows,centre,label){
  let r=rows.filter(x=>x[1]>0);let rest=null;
  if(r.length>6){rest=r.slice(5).map(x=>x[0]);const s=r.slice(5).reduce((a,x)=>a+x[1],0);r=[...r.slice(0,5),["Other",s]]}
  const tot=Math.max(r.reduce((a,x)=>a+x[1],0),1);let acc=0;
  const stops=r.map(([,n],i)=>{const a0=acc/tot*100;acc+=n;return `${SPAL[i]} ${a0}% ${acc/tot*100}%`}).join(",");
  return {rest,html:`<div class="v2donutw"><div class="v2donut" style="background:conic-gradient(${stops||"var(--pocket) 0 100%"})" aria-hidden="true"><span><b>${centre}</b><small>${label}</small></span></div><div class="v2legs">${r.map(([n,c],i)=>`<div class="v2leg hgo" data-i="${i}"><span class="v2sw2" style="background:${SPAL[i]}"></span><span>${esc(n)}</span><b>${c}</b><small>${Math.round(c/tot*100)}%</small></div>`).join("")}</div></div>`,rows:r};
}
function lineSvg(vals,gid){
  const n=vals.length,mx=Math.max(...vals,1);
  const pts=vals.map((x,i)=>[n>1?i*(400/(n-1)):200,110-(x/mx)*90]);
  const line=pts.map((p,i)=>(i?"L":"M")+p[0].toFixed(1)+" "+p[1].toFixed(1)).join(" ");
  return `<svg class="sline" viewBox="0 0 400 120" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="${gid}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="var(--brand)" stop-opacity=".35"/><stop offset="1" stop-color="var(--brand)" stop-opacity="0"/></linearGradient></defs><path d="${line} L400 120 L0 120Z" fill="url(#${gid})"/><path d="${line}" fill="none" stroke="var(--brand)" stroke-width="2.5" vector-effect="non-scaling-stroke"/></svg>`;
}
const scard=(t,body,link)=>`<section class="hc"><div class="hch"><h3>${t}</h3>${link||""}</div>${body}</section>`;
const skpi=(l,b,e,hg)=>`<div class="v2kpi${hg?" hgo":""}"${hg?sgo(hg[0],hg[1]):""}><small>${l}</small><b>${b}</b>${e?`<em>${e}</em>`:""}</div>`;
const sempty=t=>`<p class="sub2">${t}</p>`;
function growth(D){
  const ms=Object.keys(D.mon).sort();if(ms.length<1)return null;
  const all=[];{let [y,mo]=ms[0].split("-").map(Number);const end=new Date();const ey=end.getFullYear(),em=end.getMonth()+1;while(y<ey||(y===ey&&mo<=em)){all.push(y+"-"+String(mo).padStart(2,"0"));mo++;if(mo>12){mo=1;y++}}}
  const win=all.slice(-18);const before=D.copies-Object.values(D.mon).reduce((a,x)=>a+x,0);
  const pre=all.slice(0,all.length-win.length).reduce((a,m)=>a+(D.mon[m]||0),0);
  let run=before+pre;const cum=win.map(m=>{run+=D.mon[m]||0;return run});
  return {win,cum,per:win.map(m=>D.mon[m]||0)};
}
function insights(D){
  const out=[],v=D.v;const add=(t,hg)=>out.push({t,hg});
  if(v.priced>=3&&v.total>0){const n=Math.min(10,D.sorted.length);const s=D.sorted.slice(0,n).reduce((a,r)=>a+r.t,0);add(`Your <b>${n===1?"top card":"top "+n+" cards"}</b> make up <b>${pc1(s/v.total*100)}</b> of the collection’s value.`,["sort","price"])}
  {const vr={};v.list.forEach(r=>{const k=r.c.rarity||"Not set";vr[k]=(vr[k]||0)+r.t});const e=Object.entries(vr).sort((a,b)=>b[1]-a[1])[0];
   if(e&&v.total>0&&D.rar[e[0]]!=null&&e[0]!=="Not set"){const cs=D.rar[e[0]]/D.copies*100,vs=e[1]/v.total*100;if(vs>cs+5)add(`<b>${esc(e[0])}</b> cards are ${pc1(cs)} of your cards but <b>${pc1(vs)}</b> of the value.`,["rar",e[0]])}}
  {const c=D.sets.filter(r=>r.miss>0&&r.p>=50).sort((a,b)=>a.miss-b.miss||b.p-a.p)[0];if(c)add(`You are <b>${c.miss} ${c.miss===1?"card":"cards"}</b> away from completing <b>${esc(c.k)}</b>.`,["exp",c.k])}
  {const e=topN(D.spc,1)[0];if(e)add(`<b>${esc(e[0])}</b> is your most collected Pokémon, with <b>${e[1]}</b> copies.`,["q",e[0]])}
  {const e=topN(D.mon,1)[0];if(e&&Object.keys(D.mon).length>1)add(`Your busiest month was <b>${mlab(e[0])}</b>, with <b>${e[1]}</b> cards added.`,["month",e[0]])}
  if(D.extra>0)add(`<b>${D.extra}</b> extra ${D.extra===1?"copy":"copies"}${D.extraVal?`, worth about <b>${eur(D.extraVal)}</b>,`:""} could be traded.`,["dup",""]);
  {const e=topN(D.art,1)[0];if(e&&e[1]>1)add(`<b>${esc(e[0])}</b> illustrated <b>${e[1]}</b> of your cards.`,["illus",e[0]])}
  {const known=D.fm.Standard+D.fm["Expanded only"]+D.fm["Not legal"];if(known)add(`<b>${pc1(D.fm.Standard/known*100)}</b> of your cards are Standard-legal.`,["fmt","std"])}
  {const e=topN(D.ty,1)[0],tot=Object.values(D.ty).reduce((a,x)=>a+x,0);if(e&&tot>=5)add(`Your Pokémon lean <b>${esc(e[0])}</b>: ${pc1(e[1]/tot*100)} of them.`,["type",e[0]])}
  if(v.unpriced)add(`<b>${v.unpriced}</b> ${v.unpriced===1?"entry has":"entries have"} no price, so the value is understated.`,["health","price"]);
  return out;
}
function renderOverview(){
  const el=$("#ovBody");if(!el)return;
  if(!S.cards.length){el.innerHTML=sempty("Add cards to see your statistics.");return}
  const D=statData(),v=D.v;
  const tn=Math.min(10,D.sorted.length),t10=D.sorted.slice(0,tn).reduce((a,r)=>a+r.t,0);
  const stdN=D.fm.Standard+D.fm["Expanded only"]+D.fm["Not legal"];
  const avgSet=D.sets.length?D.sets.reduce((a,r)=>a+Math.min(100,r.p),0)/D.sets.length:null;
  const kpis=skpi("Median card",v.priced?eur(D.median):"—","",["sort","price"])+skpi(tn===1?"Top card share":`Top ${tn} share`,v.total?pc1(t10/v.total*100):"—","of total value",["sort","price"])+skpi("Priced entries",pc1(v.priced/S.cards.length*100),v.unpriced?`${v.unpriced} missing`:"",["health","price"])
   +skpi("Average set progress",avgSet==null?"—":pc1(avgSet),"",["scr","stats|setPanel"])+skpi("Standard-legal",stdN?pc1(D.fm.Standard/stdN*100):"—","",["fmt","std"])+skpi("Species owned",D.species,"",["scr","stats|dexPanel"])+skpi("Copies per card",(D.copies/Math.max(1,D.diff)).toFixed(2),"on average",["dup",""])+skpi("Artists",Object.keys(D.art).length,"",null);
  const G=growth(D);
  const growHtml=G&&G.win.length>1?`<div class="sstat"><div><b>${D.copies}</b><small>cards now</small></div><div><b>+${G.per[G.per.length-1]}</b><small>this month</small></div><div><b>${Math.round(G.per.reduce((a,x)=>a+x,0)/G.win.length*10)/10}</b><small>average per month</small></div></div>${lineSvg(G.cum,"sg1")}<div class="sgx"><span>${mlab(G.win[0])}</span><span>${mlab(G.win[G.win.length-1])}</span></div>`:sempty("Cards you add from now on are dated automatically, and the growth chart will appear here.");
  const ins=insights(D);
  const insHtml=ins.length?`<div class="sins">${ins.map(i=>`<div class="sin hgo"${sgo(i.hg[0],i.hg[1])}><i aria-hidden="true">›</i><span>${i.t}</span></div>`).join("")}</div>`:sempty("Insights appear as your collection grows.");
  const dr=donut(Object.entries(D.rar).sort((a,b)=>b[1]-a[1]),D.copies,"cards");
  const rarHtml=dr.html.replace(/data-i="(\d+)"/g,(m,i)=>{const n=dr.rows[+i][0];return sgo("rar",(n==="Other"&&dr.rest)?dr.rest.join("\u0001"):n)});
  const kinds=`<div class="v2kinds">${Object.entries(D.kind).filter(([,n])=>n).map(([k,n])=>`<span class="hgo"${sgo("kind",k)}><b>${n}</b> ${k}</span>`).join("")}</div>`;
  const tys=topN(D.ty,6);const tmx=Math.max(...tys.map(x=>x[1]),1);
  const typeHtml=kinds+(tys.length?tys.map(([t,n])=>`<div class="v2bar hgo"${sgo("type",t)}><span>${t}</span><span class="t"><i style="width:${n/tmx*100}%;background:${V2TC[t]||"var(--brand)"}"></i></span><span>${n}</span></div>`).join(""):sempty("Fill in card details to see types."));
  const LC=[["Binders","binder","var(--brand)"],["Decks","deck","var(--accent)"],["Showcase","showcase","#14b8a6"]];const lt=Math.max(D.loc.binder+D.loc.deck+D.loc.showcase,1);
  const lval=t=>S.cards.filter(c=>c.locType===t).reduce((a,c)=>{const u=unitVal(c);return a+(u==null?0:u*(+c.qty||1))},0);
  const whereHtml=`<div class="v2stack" role="img" aria-label="Cards by location">${LC.map(([n,t,col])=>D.loc[t]?`<i class="hgo"${sgo("loc",t)} style="flex:${D.loc[t]};background:${col}" title="${n}: ${D.loc[t]}"></i>`:"").join("")}</div>`+LC.map(([n,t,col])=>`<div class="v2leg hgo"${sgo("loc",t)}><span class="v2sw2" style="background:${col}"></span><span>${n}</span><b>${D.loc[t]}</b><small>${Math.round(D.loc[t]/lt*100)}%</small><span class="v2legv">${eur(lval(t))}</span></div>`).join("");
  const near=D.sets.filter(r=>r.miss>0).sort((a,b)=>a.miss-b.miss||b.p-a.p).slice(0,5);
  const nearHtml=near.length?near.map(r=>`<div class="v2bar w hgo"${sgo("exp",r.k)}><span>${esc(r.k)}</span><span class="t"><i style="width:${r.p}%"></i></span><span>${r.miss} to go</span></div>`).join(""):sempty(D.sets.length?"Every tracked set is complete.":"Add cards with set numbers to see progress.");
  const spc=topN(D.spc,5);
  const spcHtml=sbars(spc.map(([n,c])=>({l:esc(n),v:c,hg:["q",n]})));
  const art=topN(D.art,5);
  const artHtml=art.length?sbars(art.map(([n,c])=>({l:esc(n),v:c,hg:["illus",n]}))):sempty("Artists appear once card details are filled in.");
  const fmRows=[["Standard","var(--ok)","std"],["Expanded only","var(--accent)",null],["Not legal","var(--danger)","notexp"],["Unknown","#8c93a8","unk"]].filter(x=>D.fm[x[0]]);const ft=Math.max(fmRows.reduce((a,x)=>a+D.fm[x[0]],0),1);
  const fmHtml=fmRows.length?`<div class="v2stack" role="img" aria-label="Format legality">${fmRows.map(([n,col,k])=>`<i${k?` class="hgo"${sgo("fmt",k)}`:""} style="flex:${D.fm[n]};background:${col}" title="${n}: ${D.fm[n]}"></i>`).join("")}</div>`+fmRows.map(([n,col,k])=>`<div class="v2leg${k?" hgo":""}"${k?sgo("fmt",k):""}><span class="v2sw2" style="background:${col}"></span><span>${n}</span><b>${D.fm[n]}</b><small>${Math.round(D.fm[n]/ft*100)}%</small><span class="v2legv"></span></div>`).join(""):sempty("Fill in card details to see format legality.");
  const varHtml=sbars(topN(D.varM,6).map(([n,c])=>({l:esc(n),v:c})));
  const cdN=Object.entries(D.cond).filter(([k])=>k!=="Not set");
  const condHtml=cdN.length?sbars(CONDITIONS.filter(k=>D.cond[k]).map(k=>({l:esc(k),v:D.cond[k]})).concat(D.cond["Not set"]?[{l:"Not set",v:D.cond["Not set"]}]:[])):sempty("No conditions recorded. Add them in the card editor if you ever sell or insure cards.");
  el.innerHTML=`<div class="v2kpis">${kpis}</div>
  <div class="v2row">${scard("Collection growth <small class=\"v2sm\">· cards over time</small>",growHtml)+scard("Insights",insHtml)}</div>
  <div class="v2row c3">${scard("Rarity mix",rarHtml,`<button type="button" class="linkbtn" data-scr="stats" data-sub="chartPanel">Analytics</button>`)+scard("Types &amp; kinds",typeHtml)+scard("Cards per series",sbars(SERIES_ALL.concat(["Other"]).filter((x,i,a)=>a.indexOf(x)===i&&D.ser[x]).map(x=>({l:esc(x),v:D.ser[x],hg:["series",x]}))))}</div>
  <div class="v2row c3">${scard("Closest to completion",nearHtml,`<button type="button" class="linkbtn" data-scr="stats" data-sub="setPanel">All sets</button>`)+scard("Most collected Pokémon",spcHtml,`<button type="button" class="linkbtn" data-scr="stats" data-sub="dexPanel">Pokédex</button>`)+scard("Top artists",artHtml)}</div>
  <div class="v2row c3">${scard("Format legality",fmHtml)+scard("Variants",varHtml)+scard("Condition",condHtml)}</div>`;
}
/* ---- value tab ---- */
function vbarsL(obj,limit,key){
  const rows=Object.entries(obj).sort((a,b)=>b[1]-a[1]).slice(0,limit||10);
  return rows.length?sbars(rows.map(([k,x])=>({l:esc(k),v:x,t:eur(x),hg:key?[key,k==="Not set"?"Not set":k]:null})),{w:true}):sempty("Nothing to show yet.");
}
function renderValue(){
  const box=$("#valueBox");if(!box)return;
  if(!S.cards.length){box.innerHTML=sempty("Values appear once you have cards.");return}
  const v=valueStats();
  if(!v.priced){box.innerHTML=sempty("No prices yet. Open Tools, Data &amp; backup, and choose “Refresh Cardmarket prices”.");return}
  const D=statData();const srt=D.sorted;
  const tn=Math.min(10,srt.length),t10=srt.slice(0,tn).reduce((a,r)=>a+r.t,0);
  const th=c=>{const src=imgSrc(c);return `<span class="v2th">${src?`<img alt="" loading="lazy" src="${esc(src)}">`:esc(String(c.name||"?")[0])}</span>`};
  const topL=srt.slice(0,10).map(r=>`<div class="v2li hgo"${sgo("card",r.c.id)}>${th(r.c)}<span><b>${esc(r.c.name)}</b><small>${esc([r.c.set||r.c.setCode,r.c.number].filter(Boolean).join(" · "))}${r.q>1?` · ${r.q} copies at ${eur(r.u)}`:""}</small></span><b class="v2pr">${eur(r.t)}</b></div>`).join("");
  const conc=[1,5,10,25,50].filter(n=>n<=srt.length||n===1).map(n=>{const s=srt.slice(0,n).reduce((a,r)=>a+r.t,0);return {l:n===1?"Top card":`Top ${n} cards`,v:s/v.total*100,t:pc1(s/v.total*100)}});
  let half=0,acc=0;for(const r of srt){acc+=r.t;half++;if(acc>=v.total/2)break}
  const vr={};v.list.forEach(r=>{const k=r.c.rarity||"Not set";vr[k]=(vr[k]||0)+r.t});
  const bks=[["< €1",x=>x<1],["€1–5",x=>x>=1&&x<5],["€5–20",x=>x>=5&&x<20],["€20–50",x=>x>=20&&x<50],["€50+",x=>x>=50]];
  const bi=[1,2,3,4,5];const bandRows=bks.map(([n,f],i)=>{const rs=v.list.filter(r=>f(r.u));return {n,cnt:rs.reduce((a,r)=>a+r.q,0),val:rs.reduce((a,r)=>a+r.t,0),i:bi[i]}});
  const bmx=Math.max(...bandRows.map(b=>b.cnt),1);
  const bandHtml=`<div class="v2cols">${bandRows.map(b=>`<div class="v2col${b.cnt?" hgo":""}"${b.cnt?sgo("price",b.i):""}><b>${b.cnt||""}</b><i style="height:${Math.max(b.cnt/bmx*100,b.cnt?4:1)}%"></i><span>${b.n}</span></div>`).join("")}</div><p class="sfoot">${bandRows.map(b=>`${b.n}: ${eur(b.val)}`).join(" · ")}</p>`;
  const perV={};v.list.forEach(r=>{const k=r.c.variant||"Normal";perV[k]=(perV[k]||0)+r.t});
  box.innerHTML=`<div class="v2kpis">${skpi("Estimated value",eur(v.total),v.latest?`prices of ${esc(v.latest)}`:"")}${skpi("Average per card",eur(v.total/Math.max(1,v.pcopies)))}${skpi("Median card",eur(D.median))}${skpi(tn===1?"Top card share":`Top ${tn} share`,pc1(t10/v.total*100),`${half} ${half===1?"card makes":"cards make"} half the value`)}</div>
  <div class="v2row">${scard("Most valuable cards",topL,`<button type="button" class="linkbtn"${sgo("sort","price")}>All by price</button>`)+scard("Value concentration",sbars(conc.map(c=>({l:c.l,v:c.v,t:c.t})),{w:true})+`<p class="sfoot">How much of the total value sits in your best cards. A high share means the collection depends on a few cards.</p>`)}</div>
  <div class="v2row eq">${scard("Value by rarity",vbarsL(vr,10,"rar"))+scard("Value by set"+(Object.keys(v.bySet).length>10?" <small class=\"v2sm\">· top 10</small>":""),vbarsL(v.bySet,10,"exp"))}</div>
  <div class="v2row eq">${scard("Value by binder and deck",vbarsL(v.byLoc,10))+scard("Price bands <small class=\"v2sm\">· cards per band</small>",bandHtml)}</div>
  <div class="v2row eq">${scard("Value by variant",vbarsL(perV,8))+scard("Unpriced",`<div class="sstat"><div><b>${v.unpriced}</b><small>entries without a price</small></div><div><b>${pc1(v.priced/S.cards.length*100)}</b><small>priced</small></div></div><button type="button" class="btn ghost"${sgo("health","price")}>Show unpriced cards</button><p class="sfoot">Reverse holo copies use the reverse holo trend price when Cardmarket has one. Prices are indicative, not a valuation.</p>`)}</div>`;
}
/* ---- analytics tab ---- */
function renderCharts(){
  const box=$("#charts");if(!box)return;
  if(!S.cards.length){box.innerHTML=sempty("Charts appear once you have cards.");return}
  const D=statData();
  const rarRows=Object.keys(D.rar).sort((a,b)=>rarRank(b)-rarRank(a)||a.localeCompare(b)).map(r=>({l:r==="Not set"?"Not set":rarHtml(r),v:D.rar[r],hg:["rar",r]}));
  const setRows=topN(D.setC,12).map(([s,n])=>({l:esc(s),v:n,hg:["exp",s]}));
  const serRows=SERIES_ALL.concat(["Other"]).filter((x,i,a)=>a.indexOf(x)===i&&D.ser[x]).map(s=>({l:esc(s),v:D.ser[s],hg:["series",s]}));
  const tyOrder=[...ETYPES];const tyRows=tyOrder.filter(t=>D.ty[t]).map(t=>({l:`${en(t)} ${t}`,v:D.ty[t],hg:["type",t]}));
  const kindRows=Object.entries(D.kind).filter(([,n])=>n).map(([k,n])=>({l:k,v:n,hg:["kind",k]}));
  const stRows=[["Basic","basic"],["Stage 1","Stage 1"],["Stage 2","Stage 2"],["Other",null]].filter(([k])=>D.stage[k]).map(([k,f])=>({l:k,v:D.stage[k],hg:f?["stage",f]:null}));
  const trRows=topN(D.tr,6).map(([k,n])=>({l:k,v:n}));
  const hpRows=HPB.filter(b=>D.hp[b[0]]).map(b=>({l:b[0],v:D.hp[b[0]],hg:["hp",b[1]+"|"+b[2]]}));
  const mechRows=MECH.filter(k=>D.mech[k]).map(k=>({l:k,v:D.mech[k]}));
  const markRows=Object.keys(D.mark).sort().map(k=>({l:`<span class="rmk">${esc(k)}</span>`,v:D.mark[k],hg:["mark",k]}));
  const fmRows=[["Standard","std"],["Expanded only",null],["Not legal","notexp"],["Unknown","unk"]].filter(([k])=>D.fm[k]).map(([k,f])=>({l:k,v:D.fm[k],hg:f?["fmt",f]:null}));
  const varRows=topN(D.varM,8).map(([k,n])=>({l:esc(k),v:n}));
  const cdRows=CONDITIONS.filter(k=>D.cond[k]).map(k=>({l:esc(k),v:D.cond[k]})).concat(D.cond["Not set"]?[{l:"Not set",v:D.cond["Not set"]}]:[]);
  const artRows=topN(D.art,10).map(([k,n])=>({l:esc(k),v:n,hg:["illus",k]}));
  const spcRows=topN(D.spc,10).map(([k,n])=>({l:esc(k),v:n,hg:["q",k]}));
  const cpRows=[["1 copy",1],["2 copies",2],["3 copies",3],["4 or more","4+"]].filter(([,k])=>D.cpc[k]).map(([l,k])=>({l,v:D.cpc[k],hg:k===1?null:["dup",""]}));
  const ms=Object.keys(D.mon).sort().slice(-12);const monRows=ms.map(m=>({l:mlab(m),v:D.mon[m],hg:["month",m]}));
  const c=(t,rows,note)=>scard(t,rows.length?sbars(rows):sempty(note||"Fill in card details to see this."));
  box.innerHTML=c("Rarity spread",rarRows)+c("Cards per set"+(Object.keys(D.setC).length>12?" <small class=\"v2sm\">· top 12</small>":""),setRows)+c("Cards per series",serRows)+c("Type balance",tyRows)+c("Card kinds",kindRows)+c("Pokémon stages",stRows)+c("Trainer cards",trRows)+c("HP spread",hpRows)+c("Card mechanics",mechRows,"No ex, V or similar cards found.")+c("Regulation marks",markRows)+c("Format legality",fmRows)+c("Variants",varRows)+c("Condition",cdRows,"No conditions recorded.")+c("Top artists",artRows)+c("Most collected Pokémon",spcRows)+c("Copies per card",cpRows)+c("Cards added per month",monRows,"No dates recorded.");
}
let LDXSTART=1,LDXKEY=null;
function openLivingDex(start){LDXSTART=Math.max(1,start||1);if(S.screen==="pokedex")ldxMount();else show("pokedex")}
function ldxLeave(){if(LDXKEY){document.removeEventListener("keydown",LDXKEY,true);LDXKEY=null}const o=document.getElementById("scr-pokedex");if(o&&o.classList.contains("ldx")){o.className="screen";o.innerHTML=""}}
// placeholder cards for Pokémon not owned yet: one TCGdex card per species, cached
const LDXPH=(()=>{try{return JSON.parse(localStorage.getItem("pk-dexph")||"{}")}catch(e){return {}}})(),LDXQ=new Set();let LDXRUN=0;
function ldxPhFill(n){const o=LDXPH[n];if(!o)return;const el=document.getElementById("scr-pokedex");if(!el)return;el.querySelectorAll('.ldx-miss[data-ph="'+n+'"]').forEach(p=>{const im=p.querySelector("img"),nm=p.querySelector(".pnm");if(o.i&&im){im.src=o.i+"/low.webp";im.hidden=false}if(nm&&o.n)nm.textContent=o.n;if(o.n)p.title="No. "+n+", "+o.n+": not in your collection yet"})}
async function ldxPhLoad(n){if(LDXPH[n]){ldxPhFill(n);return}if(LDXQ.has(n))return;LDXQ.add(n);
  while(LDXRUN>=4)await new Promise(r=>setTimeout(r,120));LDXRUN++;
  try{const r=await fetch("https://api.tcgdex.net/v2/en/cards?dexId=eq:"+n+"&pagination:page=1&pagination:itemsPerPage=40");if(!r.ok)throw 0;const a=await r.json();const withImg=(Array.isArray(a)?a:[]).filter(x=>x&&x.image&&x.name);
    const cnt={};for(const x of (Array.isArray(a)?a:[]))if(x&&x.name)cnt[x.name]=(cnt[x.name]||0)+1;const nm=Object.keys(cnt).sort((p,q)=>cnt[q]-cnt[p]||p.length-q.length)[0]||"";
    const pick=withImg.filter(x=>x.name===nm).pop()||withImg.pop();LDXPH[n]={n:nm,i:pick?pick.image:"",d:pick?pick.id:"",ds:withImg.filter(x=>x.name===nm).map(x=>x.id).slice(-14)};try{localStorage.setItem("pk-dexph",JSON.stringify(LDXPH))}catch(e){}ldxPhFill(n)}
  catch(e){LDXQ.delete(n)}finally{LDXRUN--}}
const ldxWished=n=>(S.wish||[]).some(w=>+w.dex===n&&w.fromDex);
function ldxWishSync(){const el=document.getElementById("scr-pokedex");if(!el)return;el.querySelectorAll("[data-lw]").forEach(b=>{const on=ldxWished(+b.dataset.lw);b.setAttribute("aria-pressed",on);b.title=on?"On your wish list. Click to remove":"Add to wish list"})}
async function ldxWishAdd(n){
  let o=LDXPH[n];
  if(!o||!o.d||!o.ds){delete LDXPH[n];LDXQ.delete(n);await ldxPhLoad(n);o=LDXPH[n]}
  if(!o||!o.d)return null;
  let f=null,r=null;
  for(const id of (o.ds||[]).slice().reverse()){const sid=id.slice(0,id.lastIndexOf("-")),rr=PKL.setRow(sid);if(rr&&+rr[3]>=20&&!/p$/.test(sid)&&!/^(mcd|tk|det)/.test(sid)){f=await PKL.cardById(id);r=rr;break}}
  if(!f){f=await PKL.cardById(o.d);r=PKL.setRow(f.set&&f.set.id)}
  if(!r)return null;
  const card={name:f.name,set:r[1],series:r[5]||"",setCode:String(r[2]).split(":")[0],number:`${f.localId}/${String(r[3]).padStart(String(f.localId).length,"0")}`,regMark:"",rarity:"",variant:"Normal",qty:1,dex:n,prio:"med",target:null,note:`Pokédex No. ${n}`};
  const w=await wlBuild(card,f);w.fromDex=true;w.dex=n;return w}
async function ldxWish(n,btn){
  const L=wlList(),ex=L.find(w=>+w.dex===n&&w.fromDex);
  if(ex){wlSnap();S.wish=L.filter(w=>w!==ex);wlSave();ldxWishSync();cpToast(`Removed ${ex.name} from the wish list`);return}
  if(btn)btn.disabled=true;
  try{const w=await ldxWishAdd(n);if(!w){cpToast("No card found for that Pokémon on TCGdex.");return}wlSnap();S.wish.push(w);wlSave();ldxWishSync();cpToast(`${w.name} added to the wish list`)}
  catch(e){cpToast("Couldn’t reach TCGdex. Try again.")}
  finally{if(btn)btn.disabled=false}}
async function ldxWishAll(first){
  const own=new Set(S.cards.map(c=>dexOf(c)).filter(Boolean)),list=[];
  for(let n=first;n<first+18&&n<=DEX_TOTAL;n++)if(!own.has(n)&&!ldxWished(n))list.push(n);
  if(!list.length){cpToast("Nothing to add: every Pokémon here is owned or already on the wish list.");return}
  const out=[];let idx=0;const title="Adding to the wish list";pkProgress(title,0,list.length);
  const work=async()=>{while(idx<list.length){const n=list[idx++];try{const w=await ldxWishAdd(n);if(w)out.push(w)}catch{}pkProgress(title,out.length,list.length)}};
  await Promise.all([work(),work(),work()]);
  if(out.length){wlSnap();S.wish.push(...out);wlSave()}
  ldxWishSync();cpToast(`${plural(out.length,"Pokémon")} added to the wish list${out.length<list.length?`, ${list.length-out.length} not found on TCGdex`:""}`)}
function ldxMount(){
  ldxLeave();
  const ov=document.getElementById("scr-pokedex");if(!ov)return;
  const best={};for(const c of S.cards){const n=dexOf(c);if(!n)continue;const cur=best[n];if(!cur||(!imgSrc(cur)&&imgSrc(c)))best[n]=c}
  const ownedNos=Object.keys(best).map(Number).sort((a,b)=>a-b);const seq=ownedNos.map(n=>best[n].id);
  let first=Math.max(1,LDXSTART||1);first-=((first-1)%18);
  ov.className="screen ldx page";ov.setAttribute("aria-label","Living Pokédex binder");
  const NI={prev:'<path d="M15 6l-6 6 6 6"/>',next:'<path d="M9 6l6 6-6 6"/>'};
  const ico=k=>`<svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round">${NI[k]}</g></svg>`;
  const leaf=a=>{
    if(a>DEX_TOTAL)return `<div class="leaf cover">End of the Pokédex</div>`;
    return `<div class="leaf"><div class="pg" style="text-decoration:none;cursor:default">Nos. ${pad4(a)}–${pad4(Math.min(a+8,DEX_TOTAL))}</div><div class="grid9">${Array.from({length:9},(_,i)=>{const n=a+i;if(n>DEX_TOTAL)return `<div class="pocket ldx-x"></div>`;const c=best[n];if(!c){const o=LDXPH[n]||{};return `<div class="pocket ldx-miss crop" data-ph="${n}" title="No. ${n}${o.n?", "+esc(o.n):""}: not in your collection yet"><img alt="" ${o.i?`src="${esc(o.i)}/low.webp"`:"hidden"} onerror="this.hidden=true"><span class="pn">${pad4(n)}</span><span class="pnm">${esc(o.n||"")}</span><button type="button" class="ldx-w" data-lw="${n}" aria-pressed="${ldxWished(n)}" title="${ldxWished(n)?"On your wish list. Click to remove":"Add to wish list"}" aria-label="Add No. ${n} to the wish list">♥</button></div>`}const src=imgSrc(c);const lab=`aria-label="${esc(titleCase(dexBase(c.name)))}, No. ${n}"`;return src?`<div class="pocket filled crop ldx-own" data-ldx="${n}" tabindex="0" ${lab}><img alt="" src="${src}"></div>`:`<div class="pocket filled ldx-own" data-ldx="${n}" tabindex="0" ${lab}><span class="pi"><b>${esc(titleCase(dexBase(c.name)))}</b><small>No. ${n}</small></span></div>`}).join("")}</div></div>`;
  };
  const draw=dir=>{
    const gen=GENS.find(g=>first>=g[2]&&first<=g[3]);const inSpread=ownedNos.filter(n=>n>=first&&n<first+18).length;
    ov.innerHTML=`<div class="ldx-bar"><button type="button" class="ldx-back" data-lclose aria-label="Back to Stats">${ico("prev")}<span>Stats</span></button><button type="button" class="ib" data-l="-18" ${first<=1?"disabled":""} aria-label="Previous pages">${ico("prev")}</button><div class="ldx-t"><b>Living Pokédex</b><small>Nos. ${pad4(first)}–${pad4(Math.min(first+17,DEX_TOTAL))}: ${inSpread} of ${Math.min(18,DEX_TOTAL-first+1)} here, ${ownedNos.length} of ${DEX_TOTAL} overall</small></div><select class="ldx-gen" aria-label="Jump to generation">${GENS.map(g=>`<option value="${g[2]}"${gen===g?" selected":""}>Gen ${g[0]}, ${g[1]}</option>`).join("")}</select><button type="button" class="btn ghost sm" data-lwall title="Add every greyed-out Pokémon on these two pages to the wish list">♥ Wish all missing</button><button type="button" class="ib" data-l="18" ${first+18>DEX_TOTAL?"disabled":""} aria-label="Next pages">${ico("next")}</button></div><div class="spread${dir?" in-"+dir:""}">${leaf(first)}${leaf(first+9)}</div>`;
    for(let n=first;n<first+18&&n<=DEX_TOTAL;n++)if(!best[n])ldxPhLoad(n);
  };
  const go=d=>{const nf=first+d;if(nf<1||nf>DEX_TOTAL)return;first=nf;draw(d>0?"next":"prev")};
  const close=()=>{show("stats");const b=document.querySelector('[data-sub="dexPanel"]');if(b)b.click()};
  const onKey=e=>{if(S.screen!=="pokedex"){ldxLeave();return}if(document.querySelector(".zoom")||document.querySelector("dialog[open]"))return;if(e.key==="Escape"){e.stopPropagation();e.preventDefault();close()}else if(e.key==="ArrowRight"&&!e.target.closest("select,input,textarea")){e.preventDefault();go(18)}else if(e.key==="ArrowLeft"&&!e.target.closest("select,input,textarea")){e.preventDefault();go(-18)}};
  LDXKEY=onKey;document.addEventListener("keydown",onKey,true);
  ov.onclick=e=>{
    if(e.target.closest("[data-lclose]")){close();return}
    const lw=e.target.closest("[data-lw]");if(lw){ldxWish(+lw.dataset.lw,lw);return}
    if(e.target.closest("[data-lwall]")){ldxWishAll(first);return}
    const l=e.target.closest("[data-l]");if(l&&!l.disabled){go(+l.dataset.l);return}
    const p=e.target.closest("[data-ldx]");if(p){const c=best[+p.dataset.ldx];if(c)zoomCard(c,p,seq)}
  };
  ov.onkeydown=e=>{const p=e.target.closest("[data-ldx]");if(p&&e.key==="Enter"){const c=best[+p.dataset.ldx];if(c)zoomCard(c,p,seq)}};
  ov.onchange=e=>{if(e.target.matches(".ldx-gen")){const v=+e.target.value;const nf=v-((v-1)%18);const d=nf>first?"next":"prev";first=nf;draw(d)}};
  let sx=null,sy=0;
  ov.ontouchstart=e=>{if(e.touches.length===1){sx=e.touches[0].clientX;sy=e.touches[0].clientY}else sx=null};
  ov.ontouchend=e=>{if(sx==null||document.querySelector(".zoom"))return;const t=e.changedTouches[0];const dx=t.clientX-sx,dy=t.clientY-sy;sx=null;if(Math.abs(dx)>60&&Math.abs(dx)>Math.abs(dy)*1.5)go(dx<0?18:-18)};
  draw();
}
const DCOLS=["#8C3B3B","#2F5D8C","#3D7A4E","#6B4B8C","#8C6A2F","#2F7A7A","#4A4F5C","#A0457A"];
const deckOf=c=>c.deck||"Unnamed deck";
function deckColor(name){const m=S.decksMeta&&S.decksMeta[name];if(m&&/^#[0-9a-f]{6}$/i.test(m.color||""))return m.color;let h=0;for(const ch of String(name))h=(h*31+ch.charCodeAt(0))>>>0;return DCOLS[h%DCOLS.length]}
function deckNames(){const s=new Set(Object.keys(S.decksMeta||{}));S.cards.forEach(c=>{if(c.locType==="deck")s.add(deckOf(c))});return [...s].sort((a,b)=>a.localeCompare(b))}
const isBasicEnergy=c=>{const d=c.details;if(d&&String(d.supertype||"").toLowerCase().startsWith("energy"))return (d.subtypes||[]).some(x=>String(x).toLowerCase()==="basic")||!(d.subtypes||[]).some(x=>String(x).toLowerCase()==="special");return /^(basic )?(grass|fire|water|lightning|psychic|fighting|darkness|metal|fairy|dragon)? ?energy$/i.test(String(c.name||"").trim())};
const isRadiant=c=>/radiant/i.test(c.rarity||"")||((c.details&&c.details.subtypes)||[]).some(x=>String(x).toLowerCase().includes("radiant"));
const isAceSpec=c=>/ace spec/i.test(c.rarity||"")||((c.details&&c.details.subtypes)||[]).some(x=>String(x).toLowerCase().includes("ace spec"));
function kindOf(c){const d=c.details;if(!d)return "unknown";const s=String(d.supertype||"").toLowerCase();if(s.startsWith("trainer"))return "trainer";if(s.startsWith("energy"))return "energy";return "pokemon"}
function deckStats(name){
  const cs=S.cards.filter(c=>c.locType==="deck"&&deckOf(c)===name);const q=c=>+c.qty||1;
  const k={pokemon:0,trainer:0,energy:0,unknown:0},types={};let total=0;
  for(const c of cs){total+=q(c);k[kindOf(c)]+=q(c);if(kindOf(c)==="pokemon"){const t=(c.details.types||[])[0]||"Colorless";types[t]=(types[t]||0)+q(c)}}
  const withPic=cs.filter(c=>imgSrc(c)&&kindOf(c)==="pokemon");
  const isStar=c=>{const s=(c.details&&c.details.subtypes||[]).map(x=>String(x).toLowerCase());return s.some(x=>["ex","v","vmax","vstar","gx"].includes(x))||/\b(ex|V|VMAX|VSTAR|GX)$/.test(c.name)};
  const star=withPic.filter(isStar).sort((a,b)=>q(b)-q(a))[0]||withPic.sort((a,b)=>q(b)-q(a))[0]||cs.find(c=>imgSrc(c));
  return {cs,total,k,types,star};
}
async function saveDecksMeta(map){S.decksMeta=map;try{await S.raw.dmeta(map)}catch{}renderDecks()}
async function editDeck(name,isNew){
  const m=(S.decksMeta||{})[name]||{};
  const v=await askBulk(isNew?"New deck box":`Edit ${name}`,`<label>Deck name<input name="name" required maxlength="60" value="${esc(isNew?"":name)}" placeholder="e.g. Charizard ex deck"></label><label style="margin-top:10px">Box colour<input type="color" name="color" value="${isNew?DCOLS[deckNames().length%DCOLS.length]:deckColor(name)}" style="height:44px;padding:4px;cursor:pointer"></label>`,isNew?"Create deck box":"Save");
  if(!v)return;const nn=v.name.trim();if(!nn)return;
  const map={...(S.decksMeta||{})};if(!isNew)delete map[name];map[nn]={...m,color:v.color};
  if(!isNew&&nn!==name){const cs=S.cards.filter(c=>c.locType==="deck"&&deckOf(c)===name);const strip=({id,...r})=>r;txBegin(`Renamed deck ${name} to ${nn}`);try{for(const c of cs)await S.store.set(c.id,{...strip(c),deck:nn})}finally{txEnd()}}
  else logAct(isNew?`Created deck box ${nn}`:`Edited deck box ${nn}`);
  await saveDecksMeta(map);
}
function openDeck(name){
  const ov=document.createElement("div");ov.className="dk";ov.setAttribute("role","dialog");ov.setAttribute("aria-label",`Deck ${name}`);
  document.body.appendChild(ov);document.body.style.overflow="hidden";
  const q=c=>+c.qty||1;
  const draw=()=>{
    const st=deckStats(name);const groups={pokemon:new Map(),trainer:new Map(),energy:new Map(),unknown:new Map()};
    for(const c of st.cs){const k=cardKey(c);const m=groups[kindOf(c)];if(!m.has(k))m.set(k,{c,n:0});const e=m.get(k);e.n+=q(c);if(!imgSrc(e.c)&&imgSrc(c))e.c=c}
    const sub=c=>(c.details&&c.details.subtypes||[]).map(x=>String(x).toLowerCase());
    const trOrd=c=>{const s=sub(c);return s.includes("supporter")?0:s.includes("item")?1:s.some(x=>x.includes("tool"))?2:s.includes("stadium")?3:4};
    const sorters={pokemon:(a,b)=>b.n-a.n||(dexOf(a.c)||1e6)-(dexOf(b.c)||1e6),trainer:(a,b)=>trOrd(a.c)-trOrd(b.c)||b.n-a.n||String(a.c.name).localeCompare(b.c.name),energy:(a,b)=>(sub(a.c).includes("basic")?0:1)-(sub(b.c).includes("basic")?0:1)||b.n-a.n,unknown:(a,b)=>b.n-a.n};
    const lists={};for(const k of Object.keys(groups))lists[k]=[...groups[k].values()].sort(sorters[k]);
    const seq=[...lists.pokemon,...lists.trainer,...lists.energy,...lists.unknown].map(e=>e.c.id);
    const byName={};for(const c of st.cs){if(isBasicEnergy(c))continue;const nmk=String(c.name).trim();byName[nmk]=(byName[nmk]||0)+q(c)}
    const over=Object.keys(byName).filter(n=>byName[n]>4);
    const basics=st.cs.filter(c=>kindOf(c)==="pokemon"&&sub(c).includes("basic")).reduce((a,c)=>a+q(c),0);
    const aces=st.cs.filter(isAceSpec).reduce((a,c)=>a+q(c),0);
    const rads=st.cs.filter(isRadiant).reduce((a,c)=>a+q(c),0);
    const checks=[
      st.total===60?[1,"Exactly 60 cards"]:[0,st.total<60?`${st.total} of 60 cards: add ${60-st.total}`:`${st.total} cards: remove ${st.total-60}`],
      over.length?[0,`More than 4 copies: ${over.map(n=>`${n} (${byName[n]})`).join(", ")}`]:[1,"No card over 4 copies (Basic Energy excepted)"],
      basics?[1,`${plural(basics,"Basic Pokémon").replace("Pokémons","Pokémon")} to start with`]:[st.k.unknown?2:0,"No Basic Pokémon found"],
      aces>1?[0,`${aces} ACE SPEC cards: only 1 is allowed`]:[1,aces?"1 ACE SPEC card (the limit)":"No ACE SPEC card (1 allowed)"],
      rads>1?[0,`${rads} Radiant Pokémon: only 1 is allowed`]:[1,rads?"1 Radiant Pokémon (the limit)":"No Radiant Pokémon (1 allowed)"],
      st.k.unknown?[2,`${plural(st.k.unknown,"card")} without details can’t be checked`]:null
    ].filter(Boolean);
    const stackHtml=e=>{const c=e.c,src=imgSrc(c),n=e.n,layers=Math.min(n,4)-1;const sh=Array.from({length:layers},(_,i)=>`${(i+1)*5}px ${(i+1)*5}px 0 -1px var(--sheet),${(i+1)*5}px ${(i+1)*5}px 0 0 var(--pocket-edge)`).join(",");
      return `<button type="button" class="dstack" data-did="${esc(c.id)}" aria-label="${n} × ${esc(c.name)}"><span class="cimg"${sh?` style="box-shadow:${sh}"`:""}>${src?`<img alt="" loading="lazy" src="${src}">`:`<span class="cph"><b>${esc(c.name)}</b><small>${esc([c.setCode,c.number].filter(Boolean).join(" "))}</small></span>`}</span><span class="dcount">×${n}</span><span class="dname">${esc(c.name)}</span><small>${esc([c.setCode,c.number].filter(Boolean).join(" "))}</small></button>`};
    const sec=(k,title)=>lists[k].length?`<section class="dk-sec"><h3>${title} <span>${lists[k].reduce((a,e)=>a+e.n,0)}</span></h3><div class="dk-grid">${lists[k].map(stackHtml).join("")}</div></section>`:"";
    const seg=(k,col)=>st.k[k]?`<i style="flex:${st.k[k]};background:${col}" title="${st.k[k]}"></i>`:"";
    ov.innerHTML=`<div class="dk-head" style="--c:${deckColor(name)}"><div class="dk-t"><b>${esc(name)}</b><small>${st.total} of 60 cards</small></div><button type="button" class="ib" data-dkdelall title="Delete this deck" aria-label="Delete this deck" style="color:var(--danger)"><svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></g></svg></button><button type="button" class="ib" data-dkcopy title="Copy decklist" aria-label="Copy decklist"><svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/></g></svg></button><button type="button" class="ib" data-dkedit title="Edit deck box" aria-label="Edit deck box"><svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9l-4-4L4 16z"/></g></svg></button><button type="button" class="ib" data-dkclose aria-label="Close"><svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></g></svg></button></div>
      <div class="dk-body">
        <div class="dk-comp" role="img" aria-label="${st.k.pokemon} Pokémon, ${st.k.trainer} Trainer, ${st.k.energy} Energy${st.k.unknown?`, ${st.k.unknown} without details`:""}">${seg("pokemon","#3A8FD9")}${seg("trainer","#9B5FC0")}${seg("energy","#E0A82E")}${seg("unknown","var(--pocket-edge)")}${st.total<60?`<i style="flex:${60-st.total};background:transparent"></i>`:""}</div>
        <div class="dk-legend"><span><i style="background:#3A8FD9"></i>Pokémon ${st.k.pokemon}</span><span><i style="background:#9B5FC0"></i>Trainer ${st.k.trainer}</span><span><i style="background:#E0A82E"></i>Energy ${st.k.energy}</span>${st.k.unknown?`<span><i style="background:var(--pocket-edge)"></i>No details ${st.k.unknown}</span>`:""}</div>
        <ul class="dk-checks">${checks.map(([ok,t])=>`<li class="${ok===1?"ok":ok===2?"info":"bad"}">${ok===1?"✓":ok===2?"i":"!"}<span>${esc(t)}</span></li>`).join("")}</ul>
        ${st.total?sec("pokemon","Pokémon")+sec("trainer","Trainer")+sec("energy","Energy")+sec("unknown","Without details"):`<p class="sub2">This deck box is empty. Scan a deck with the deck name “${esc(name)}”, or select cards in the collection and choose Move to deck.</p><div class="foot"><button type="button" class="btn" data-dkscan>Scan cards into this deck</button><button type="button" class="btn danger" data-dkdel>Delete this empty deck box</button></div>`}
        <p class="status" id="dkStatus"></p>
      </div>`;
    ov._seq=seq;ov._lists=lists;
  };
  draw();ov._draw=draw;
  const close=()=>{document.removeEventListener("keydown",onKey,true);ov.remove();document.body.style.overflow="";S.deckView=null};
  const onKey=e=>{if(document.querySelector(".zoom")||document.querySelector("dialog[open]"))return;if(e.key==="Escape"){e.stopPropagation();e.preventDefault();close()}};
  document.addEventListener("keydown",onKey,true);S.deckView={name,ov,close};
  ov.addEventListener("click",async e=>{
    if(e.target.closest("[data-dkclose]")){close();return}
    if(e.target.closest("[data-dkedit]")){close();editDeck(name,false);return}
    if(e.target.closest("[data-dkscan]")){close();if(S.review.length)return;S.mode="deck";document.querySelectorAll(".seg [data-mode]").forEach(x=>x.setAttribute("aria-pressed",x.dataset.mode==="deck"));$("#binderFields").classList.add("hidden");$("#deckFields").classList.remove("hidden");$("#deckName").value=name;renderBinder();show("scan");return}
    if(e.target.closest("[data-dkdelall]")){close();dkDeleteDeck(name);return}
    if(e.target.closest("[data-dkdel]")){if(await askConfirm(`Delete ${name}?`,"This empty deck box is removed.","Delete")){const map={...S.decksMeta};delete map[name];await saveDecksMeta(map);logAct(`Deleted deck box ${name}`);close()}return}
    if(e.target.closest("[data-dkcopy]")){
      const L=ov._lists;const line=e2=>{const c=e2.c;const p=numParts(c.number);return `${e2.n} ${c.name}${c.setCode?" "+c.setCode:""}${p?" "+p.n:(c.number?" "+c.number:"")}`};
      const part=(k,t)=>L[k].length?`${t}: ${L[k].reduce((a,x)=>a+x.n,0)}\n${L[k].map(line).join("\n")}\n\n`:"";
      const txt=part("pokemon","Pokémon")+part("trainer","Trainer")+part("energy","Energy")+part("unknown","Other")+`Total Cards: ${deckStats(name).total}`;
      const s=ov.querySelector("#dkStatus");try{await navigator.clipboard.writeText(txt);s.textContent="Decklist copied. It’s in the format Pokémon TCG Live can import."}catch{s.innerHTML=`<textarea readonly rows="8" style="width:100%">${esc(txt)}</textarea>`;s.querySelector("textarea").select()}
      return;
    }
    const sk=e.target.closest("[data-did]");if(sk){const c=S.cards.find(x=>x.id===sk.dataset.did);if(c)zoomCard(c,sk.querySelector("img")||sk,ov._seq)}
  });
  const f=ov.querySelector("[data-dkclose]");if(f)f.focus({preventScroll:true});
}
