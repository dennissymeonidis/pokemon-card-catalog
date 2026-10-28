
// ===== Local runtime: folder + Excel storage, Tesseract OCR, TCGdex lookups =====
var PKL=(function(){
const API="https://api.tcgdex.net/v2/en";
const TESS_URL="https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js";
const P={dir:null,urls:new Map(),pending:new Set(),sets:window.PK_SETS,setCache:new Map(),cardCache:new Map(),
  dirty:false,saving:false,saveT:null,lastMod:0,lastErr:"",ready:null,readyRes:null,conflict:false};
P.ready=new Promise(r=>P.readyRes=r);
const $q=s=>document.querySelector(s);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const safe=s=>String(s||"").replace(/[\\/:*?"<>|]+/g,"-").replace(/\s+/g," ").trim().slice(0,80)||"x";
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,8);

// ---------- IndexedDB: remember the folder ----------
function idb(){return new Promise((res,rej)=>{const r=indexedDB.open("pk-local",1);r.onupgradeneeded=()=>r.result.createObjectStore("kv");r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
async function kvGet(k){try{const d=await idb();return await new Promise(res=>{const q=d.transaction("kv").objectStore("kv").get(k);q.onsuccess=()=>res(q.result);q.onerror=()=>res(null)})}catch{return null}}
async function kvSet(k,v){try{const d=await idb();await new Promise(res=>{const t=d.transaction("kv","readwrite");t.objectStore("kv").put(v,k);t.oncomplete=res;t.onerror=res})}catch{}}

// ---------- files ----------
async function dirAt(parts,create){let d=P.dir;for(const p of parts)d=await d.getDirectoryHandle(p,{create});return d}
async function fh(path,create){const parts=path.split("/");const name=parts.pop();return (await dirAt(parts,create)).getFileHandle(name,{create})}
async function writeFile(path,data){const h=await fh(path,true);const w=await h.createWritable();await w.write(data);await w.close()}
async function readFile(path){try{return await (await fh(path,false)).getFile()}catch{return null}}

// ---------- assets (pictures live in the folder) ----------
function blob(id){
  if(!id)return "";const u=P.urls.get(id);if(u)return u;
  if(P.dir&&!P.pending.has(id)){P.pending.add(id);readFile(id).then(f=>{if(f){P.urls.set(id,URL.createObjectURL(f));clearTimeout(P.rt);P.rt=setTimeout(()=>{try{render()}catch{}},120)}})}
  return "";
}
async function preload(){
  const ids=new Set();
  for(const c of S.cards){if(c.official)ids.add(c.official);if(c.img)ids.add(c.img)}
  for(const b of Object.values(S.binders||{}))if(b&&b.cover)ids.add(b.cover);
  await Promise.all([...ids].filter(id=>!P.urls.has(id)).map(async id=>{P.pending.add(id);const f=await readFile(id);if(f)P.urls.set(id,URL.createObjectURL(f))}));
}
const assets={
  async upload(b){const t=b.type||"";const ext=t.includes("png")?"png":t.includes("webp")?"webp":"jpg";const id=`photos/${uid()}.${ext}`;await writeFile(id,b);const url=URL.createObjectURL(b);P.urls.set(id,url);return {id,url,sizeBytes:b.size,contentType:t}},
  async uploadAt(t,b){const ty=b.type||"";const ext=ty.includes("png")?"png":ty.includes("webp")?"webp":"jpg";const base=t.base||`artwork/${safe(t.setId+" - "+t.setName)}/${safe(t.localId+" - "+t.name)}`;const id=`${base}.${ext}`;await writeFile(id,b);const url=URL.createObjectURL(b);P.urls.set(id,url);return {id,url,sizeBytes:b.size,contentType:ty}},
  async delete(){/* pictures are kept on disk so Undo can always bring a card back */},
  async list(){return {assets:[],usage:{}}}
};
const downloads={async save({filename,data}){await writeFile("exports/"+safe(filename),data);setBar(`Saved exports/${filename}`)}};
const sample={limits:async()=>({images:true}),json:async()=>{throw {code:"local"}}};
window.claude={use:async n=>({assets,downloads,sample})[n]||null};

// ---------- Excel ----------
const COLS=["id","name","set","series","set_code","number","reg_mark","rarity","variant","qty","condition","location","binder","page","slot","deck","notes","pokedex","hp","types","weakness","weakness_amount","resistance","resistance_amount","cardmarket_trend_eur","cardmarket_low_eur","price_updated","details_updated","tcgdex_id","picture","added","details_json","extra_json"];
const MAP={id:"id",name:"name",set:"set",series:"series",set_code:"setCode",number:"number",reg_mark:"regMark",rarity:"rarity",variant:"variant",qty:"qty",condition:"condition",location:"locType",binder:"binder",page:"page",slot:"slot",deck:"deck",notes:"notes",pokedex:"dex",tcgdex_id:"tcgdexId",details_updated:"detailsAt",picture:"official",added:"added"};
const MAPPED=new Set([...Object.values(MAP),"details"]);
const WID={id:12,name:24,set:22,series:16,set_code:8,number:9,reg_mark:6,rarity:16,variant:14,qty:5,condition:10,location:8,binder:7,page:6,slot:5,deck:16,notes:24,pokedex:8,hp:5,types:12,weakness:12,weakness_amount:9,resistance:12,resistance_amount:9,cardmarket_trend_eur:12,cardmarket_low_eur:12,price_updated:12,details_updated:20,tcgdex_id:14,picture:40,added:20,details_json:30,extra_json:30};
function trendOf(c){const p=c.price;if(!p)return "";const h=/reverse/i.test(c.variant||"")&&p.trendHolo>0;return h?p.trendHolo:(p.trend??"")}
function toRow(c){
  const r={};for(const[col,k] of Object.entries(MAP))r[col]=c[k]??"";
  const extra={};for(const[k,v] of Object.entries(c))if(!MAPPED.has(k))extra[k]=v;
  const d=c.details||{};
  r.hp=d.hp||"";r.types=(d.types||[]).join("/");{const W=(d.weaknesses||[]).filter(x=>x&&x.type),R=(d.resistances||[]).filter(x=>x&&x.type);r.weakness=W.map(x=>x.type).join("/");r.weakness_amount=W.map(x=>x.value||"").join("/");r.resistance=R.map(x=>x.type).join("/");r.resistance_amount=R.map(x=>x.value||"").join("/")}r.details_updated=c.detailsAt||d.filled||"";
  r.cardmarket_trend_eur=trendOf(c);r.cardmarket_low_eur=c.price&&c.price.low!=null?c.price.low:"";r.price_updated=c.price&&c.price.updated?String(c.price.updated):"";
  r.details_json=c.details?JSON.stringify(c.details):"";r.extra_json=Object.keys(extra).length?JSON.stringify(extra):"";
  return r;
}
const NUMK=new Set(["qty","binder","page","slot","dex"]);
function fromRow(r){
  let c={};try{if(r.extra_json)c=JSON.parse(r.extra_json)}catch{}
  for(const[col,k] of Object.entries(MAP)){if(!(col in r))continue;let v=r[col];if(v===""||v==null){v=NUMK.has(k)||k==="official"?null:"";}else if(NUMK.has(k)){v=+v;if(!Number.isFinite(v))v=null}else v=String(v);c[k]=v}
  if(!c.qty)c.qty=1;if(!c.variant)c.variant="Normal";if(c.locType!=="deck"&&c.locType!=="showcase")c.locType="binder";
  try{c.details=r.details_json?JSON.parse(r.details_json):(c.details||null)}catch{c.details=null}
  if(!c.id)c.id=newId();
  return c;
}
function workbook(){
  const wb=XLSX.utils.book_new();
  const ws=XLSX.utils.json_to_sheet(S.cards.map(toRow),{header:COLS});ws["!cols"]=COLS.map(k=>({wch:WID[k]||12}));
  if(ws["!ref"])ws["!autofilter"]={ref:ws["!ref"]};
  XLSX.utils.book_append_sheet(wb,ws,"Cards");
  const bs=XLSX.utils.json_to_sheet(Object.entries(S.binders||{}).map(([n,b])=>({binder:n,name:b&&b.name||"",json:JSON.stringify(b)})),{header:["binder","name","json"]});
  XLSX.utils.book_append_sheet(wb,bs,"Binders");
  const as=XLSX.utils.json_to_sheet((S.activity||[]).map(a=>({time:new Date(a.t).toISOString(),label:a.label})),{header:["time","label"]});
  XLSX.utils.book_append_sheet(wb,as,"Activity");
  const ms=XLSX.utils.json_to_sheet([{key:"decks",json:JSON.stringify(S.decksMeta||{})},{key:"formats",json:JSON.stringify(S.formats||{})},{key:"lists",json:JSON.stringify(S.lists||{})},{key:"showcases",json:JSON.stringify(S.scMeta||{})},{key:"wishlist",json:JSON.stringify(S.wish||[])}],{header:["key","json"]});
  XLSX.utils.book_append_sheet(wb,ms,"Meta");
  wb.Workbook={Sheets:[{Hidden:0},{Hidden:0},{Hidden:0},{Hidden:1}]};
  return XLSX.write(wb,{bookType:"xlsx",type:"array"});
}
async function load(){
  const f=await readFile("collection.xlsx");
  S.cards=[];S.binders={};S.activity=[];S.decksMeta={};S.scMeta={};S.wish=[];
  if(!f){P.lastMod=0;return false}
  P.lastMod=f.lastModified;
  const wb=XLSX.read(await f.arrayBuffer());
  const rows=s=>wb.Sheets[s]?XLSX.utils.sheet_to_json(wb.Sheets[s],{defval:""}):[];
  S.cards=rows("Cards").filter(r=>String(r.name||"").trim()).map(fromRow);
  for(const r of rows("Binders")){try{S.binders[String(r.binder)]=JSON.parse(r.json)}catch{}}
  S.activity=rows("Activity").map(r=>({t:Date.parse(r.time)||Date.now(),label:String(r.label||"")}));
  for(const r of rows("Meta")){try{const v=JSON.parse(r.json);if(r.key==="decks")S.decksMeta=v||{};if(r.key==="showcases")S.scMeta=v||{};if(r.key==="wishlist"&&Array.isArray(v))S.wish=v;if(r.key==="formats"&&v&&v.std)setFormats(v,true);if(r.key==="lists"&&v)applyLists(v)}catch{}}
  return true;
}
function schedule(){P.dirty=true;setBar();clearTimeout(P.saveT);P.saveT=setTimeout(save,700)}
async function save(){
  if(!P.dir||P.conflict)return;
  if(P.saving){schedule();return}
  P.saving=true;setBar();
  try{
    const cur=await readFile("collection.xlsx");
    if(cur&&P.lastMod&&cur.lastModified>P.lastMod+1500){P.conflict=true;showConflict();return}
    const day=new Date().toISOString().slice(0,10);
    if(cur&&!(await readFile(`backups/collection-${day}.xlsx`)))await writeFile(`backups/collection-${day}.xlsx`,cur);
    await writeFile("collection.xlsx",workbook());
    const nf=await readFile("collection.xlsx");P.lastMod=nf?nf.lastModified:Date.now();
    P.dirty=false;P.lastErr="";
  }catch(e){P.lastErr="Couldn’t save collection.xlsx. If it’s open in Excel, close it; saving retries on its own.";clearTimeout(P.saveT);P.saveT=setTimeout(save,5000)}
  finally{P.saving=false;setBar()}
}
async function reload(){
  P.conflict=false;hideConflict();
  try{await load();await preload();setBar("Loaded from collection.xlsx");render();try{renderActivity();renderDecks()}catch{}}
  catch(e){setBar("Couldn’t read collection.xlsx: "+(e&&e.message||e),true)}
}
async function checkExternal(){
  if(!P.dir||P.saving||P.conflict)return;
  const f=await readFile("collection.xlsx");if(!f||!P.lastMod||f.lastModified<=P.lastMod+1500)return;
  if(P.dirty){P.conflict=true;showConflict()}else reload();
}
window.addEventListener("focus",()=>{checkExternal()});

// ---------- storage adapter used by the app ----------
async function folderRaw(){
  await P.ready;
  try{await load()}catch(e){setBar("Couldn’t read collection.xlsx: "+(e&&e.message||e),true)}
  try{const sf=await readFile("sets.json");if(sf){const a=JSON.parse(await sf.text());if(Array.isArray(a)&&a.length>50)P.sets=a}}catch{}
  await preload();render();try{renderActivity();renderDecks()}catch{}
  setBar();
  return {
    put:async(id,c)=>{const i=S.cards.findIndex(x=>x.id===id);if(i>-1)S.cards[i]={...c,id};else S.cards.push({...c,id});schedule();render()},
    del:async id=>{S.cards=S.cards.filter(x=>x.id!==id);schedule();render()},
    bput:async(n,b)=>{S.binders[n]=b;schedule();render()},
    bdel:async n=>{delete S.binders[n];schedule();render()},
    act:async list=>{S.activity=list;schedule()},
    dmeta:async map=>{S.decksMeta=map;schedule()},
    smeta:async m=>{S.scMeta=m;schedule()},
    wish:async w=>{S.wish=w;schedule()},
    fmt:async()=>{schedule()},
    lists:async()=>{schedule()}
  };
}

// ---------- folder gate ----------
async function useDir(h){
  P.dir=h;await kvSet("dir",h);
  $q("#pkGate").classList.add("hidden");$q("#pkName").textContent=h.name;
  P.readyRes();setBar();
}
async function pick(){
  try{const h=await window.showDirectoryPicker({id:"pokemon-collection",mode:"readwrite"});
    if(P.dir&&P.dir!==h){P.dir=h;await kvSet("dir",h);await reload();$q("#pkName").textContent=h.name;return}
    await useDir(h)}catch(e){if(e&&e.name!=="AbortError")gateMsg("Couldn’t open that folder: "+e.message)}
}
function gateMsg(t){const m=$q("#pkGateMsg");if(m)m.textContent=t}
async function initGate(){
  if(!window.showDirectoryPicker){gateMsg("This page needs Chrome or Edge on a computer, because it saves into a folder on your disk.");$q("#pkPick").disabled=true;return}
  const h=await kvGet("dir");
  if(h){
    const st=await h.queryPermission({mode:"readwrite"}).catch(()=>"prompt");
    if(st==="granted"){await useDir(h);return}
    const b=$q("#pkReopen");b.classList.remove("hidden");b.textContent=`Reopen “${h.name}”`;
    b.onclick=async()=>{const r=await h.requestPermission({mode:"readwrite"}).catch(()=>"denied");if(r==="granted")await useDir(h);else gateMsg("Permission wasn’t given. Choose the folder again.")};
  }
}

// ---------- status bar ----------
function setBar(msg,err){
  const dot=$q("#pkDot"),st=$q("#pkStat");if(!dot)return;
  const s=P.lastErr?"err":P.saving?"busy":P.dirty?"busy":"ok";
  dot.dataset.s=err?"err":s;
  st.textContent=msg||P.lastErr||(P.saving||P.dirty?"Saving…":`Saved to collection.xlsx · ${S.cards.length} entries`);
  st.classList.toggle("err",!!(err||P.lastErr));
  {const sub=$q("#pkSub");if(sub)sub.textContent=(err||P.lastErr)?"Needs attention":(P.saving||P.dirty)?"Saving…":"Saved";if(window.ttPill)window.ttPill()}
}
function showConflict(){$q("#pkConflict").classList.remove("hidden");setBar("collection.xlsx was changed outside the app.",true)}
function hideConflict(){$q("#pkConflict").classList.add("hidden")}

// ---------- TCGdex ----------
async function tget(path){let r;try{r=await fetch(API+path)}catch{throw {code:"net"}}if(r.status===404)throw {code:"not_found"};if(!r.ok)throw {code:"net"};return r.json()}
function setCards(id){if(!P.setCache.has(id))P.setCache.set(id,tget("/sets/"+encodeURIComponent(id)).catch(e=>{P.setCache.delete(id);throw e}));return P.setCache.get(id)}
function cardBy(setId,localId){const k=setId+"/"+localId;if(!P.cardCache.has(k))P.cardCache.set(k,tget(`/sets/${encodeURIComponent(setId)}/${encodeURIComponent(localId)}`).catch(e=>{P.cardCache.delete(k);throw e}));return P.cardCache.get(k)}
function cardById(id){if(!P.cardCache.has(id))P.cardCache.set(id,tget("/cards/"+encodeURIComponent(id)).catch(e=>{P.cardCache.delete(id);throw e}));return P.cardCache.get(id)}
const row=id=>P.sets.find(s=>s[0]===id)||null;
const nn=x=>{const s=String(x||"").toUpperCase().replace(/\s/g,"");const m=s.match(/^([A-Z]*)0*(\d+)([A-Z]*)$/);return m?m[1]+m[2]+m[3]:s};
const dig=x=>String(x||"").replace(/\D/g,"").replace(/^0+/,"");
const eqNum=(a,b)=>{if(!a||!b)return false;if(nn(a)===nn(b))return true;const pa=/^[0-9]+$/.test(String(a).trim()),pb=/^[0-9]+$/.test(String(b).trim());return (pa||pb)&&dig(a)!==""&&dig(a)===dig(b)};
function sim(a,b){
  a=String(a||"").toLowerCase().replace(/[^a-z0-9]/g,"");b=String(b||"").toLowerCase().replace(/[^a-z0-9]/g,"");
  if(!a||!b)return 0;if(a===b)return 1;if(a.length<2||b.length<2)return 0;
  const g=s=>{const m=new Map();for(let i=0;i<s.length-1;i++){const k=s.slice(i,i+2);m.set(k,(m.get(k)||0)+1)}return m};
  const A=g(a),B=g(b);let n=0;for(const[k,v] of A)n+=Math.min(v,B.get(k)||0);return 2*n/(a.length+b.length-2);
}
const PROMO={SWSH:"swshp",SVP:"svp",SMP:"smp",XYP:"xyp",BWP:"bwp"};
async function match(p){
  const num=p.num;let sets=[];
  if(p.setId){const r=row(p.setId);if(r)sets=[r]}
  if(!sets.length&&p.code){if(PROMO[p.code])sets=[row(PROMO[p.code])].filter(Boolean);else sets=P.sets.filter(s=>String(s[2]).split(":")[0]===p.code)}
  if(!sets.length&&p.setName){sets=P.sets.filter(s=>s[1].toLowerCase()===String(p.setName).toLowerCase())}
  if(!sets.length&&p.total){const t=+dig(p.total);if(t)sets=P.sets.filter(s=>s[3]===t||s[4]===t)}
  let c=[];
  if(num&&sets.length){
    const res=await Promise.all(sets.slice(0,14).map(s=>setCards(s[0]).catch(()=>null)));
    for(const d of res){if(!d)continue;for(const x of d.cards||[])if(eqNum(x.localId,num))c.push({setId:d.id,setName:d.name,localId:x.localId,name:x.name,image:x.image||""})}
  }
  const qs=p.words&&p.words.length?p.words.slice(0,3):(p.name&&p.name.replace(/[^a-z]/gi,"").length>=3?[p.name.split(/\s+/).sort((a,b)=>b.length-a.length)[0]]:[]);
  const seen=new Set();
  for(const q of c.length?[]:qs){
    const list=await tget("/cards?name="+encodeURIComponent(q)).catch(()=>[]);
    for(const x of list||[]){
      if(seen.has(x.id))continue;seen.add(x.id);
      const sid=x.id.slice(0,x.id.length-String(x.localId).length-1);const r=row(sid);if(!r)continue;
      if(num&&!eqNum(x.localId,num))continue;
      if(p.total&&r[3]!==+dig(p.total)&&r[4]!==+dig(p.total)&&num)continue;
      if(!num&&p.code&&String(r[2]).split(":")[0]!==p.code)continue;
      c.push({setId:sid,setName:r[1],localId:x.localId,name:x.name,image:x.image||""});
    }
  }
  if(!num&&qs.length)c=c.filter(x=>(p.top?topSim(x.name,p.top):sim(x.name,p.name))>.78);
  for(const x of c){const r=row(x.setId);x.score=(p.top?topSim(x.name,p.top):p.name?sim(x.name,p.name):.4)+(p.code&&r&&String(r[2]).split(":")[0]===p.code?1:0)+(p.total&&r&&(r[3]===+dig(p.total))?.3:0)}
  c.sort((a,b)=>b.score-a.score||String(row(b.setId)&&row(b.setId)[6]).localeCompare(String(row(a.setId)&&row(a.setId)[6])));
  return c.slice(0,10);
}
function priceOf(f){const m=f&&f.pricing&&f.pricing.cardmarket;if(!m)return null;return {trend:m.trend??null,low:m.low??null,avg30:m.avg30??null,trendHolo:m["trend-holo"]??null,avg7:m.avg7??null,updated:m.updated||new Date().toISOString(),unit:m.unit||"EUR"}}
const STAGE={Stage1:"Stage 1",Stage2:"Stage 2"};
function details(f){
  const r=row(f.set&&f.set.id);const cat=f.category==="Pokemon"?"Pokémon":(f.category||"");
  return normDetails({supertype:cat,subtypes:[STAGE[f.stage]||f.stage,f.suffix,f.trainerType,f.energyType].filter(Boolean),hp:f.hp||null,types:f.types||[],evolvesFrom:f.evolveFrom||null,
    abilities:(f.abilities||[]).map(a=>({name:a.name,text:a.effect})),
    attacks:(f.attacks||[]).map(a=>({name:a.name,cost:a.cost||[],damage:a.damage!=null?String(a.damage):null,text:a.effect||null})),
    weaknesses:(f.weaknesses||[]).map(w=>({type:w.type,value:w.value})),resistances:(f.resistances||[]).map(w=>({type:w.type,value:w.value})),
    retreat:f.retreat??null,rules:cat!=="Pokémon"&&f.effect?[f.effect]:[],flavor:f.description||null,illustrator:f.illustrator||null,
    nationalDex:(f.dexId||[])[0]||null,regulationMark:f.regulationMark||null,setCode:r?String(r[2]).split(":")[0]:null,apiSetId:null,series:r?r[5]:null,confidence:"high",unsure:[]});
}
const rarity=x=>x&&x!=="None"?x:"";
function variantOf(f){const v=f.variants||{};if(!v.normal&&v.holo)return "Holo";return "Normal"}
function printedNumber(f,p){const r=row(f.set.id);if(p&&p.num&&p.total)return `${p.num}/${p.total}`;return r&&r[3]?`${f.localId}/${String(r[3]).padStart(String(f.localId).length,"0")}`:String(f.localId)}
async function artwork(f){
  if(!f.image)return null;
  const path=`artwork/${safe(f.set.id+" - "+f.set.name)}/${safe(f.localId+" - "+f.name)}.webp`;
  if(P.urls.has(path))return path;
  const ex=await readFile(path);if(ex){P.urls.set(path,URL.createObjectURL(ex));return path}
  const res=await fetch(f.image+"/high.webp");if(!res.ok)return null;
  const b=await res.blob();await writeFile(path,b);P.urls.set(path,URL.createObjectURL(b));return path;
}
async function enrich(card,o){
  o=o||{};let f=o.tcg||null;
  if(!f&&!o.noMatch){try{f=await findFor(card)}catch{}}
  if(f){
    const r=row(f.set.id);
    card.details=details(f);card.detailsAt=new Date().toISOString();card.tcgdexId=f.id;card.tcgImage=f.image||"";card.price=priceOf(f);
    if(!card.setCode&&r&&r[2])card.setCode=String(r[2]).split(":")[0];
    if(!card.set)card.set=f.set.name;if(!card.series&&r)card.series=r[5];
    if(!card.regMark&&f.regulationMark)card.regMark=f.regulationMark;
    if(!card.dex&&(f.dexId||[])[0])card.dex=f.dexId[0];
    if(!card.rarity&&rarity(f.rarity))card.rarity=rarity(f.rarity);
    if(o.art!==false&&(o.forceArt||!card.official||!P.urls.has(card.official))){try{const a=await artwork(f);if(a)card.official=a}catch{}}
  }
  if(!card.official&&o.crop&&o.crop.blob){try{card.official=(await assets.upload(o.crop.blob)).id}catch{}}
  return card;
}
async function findFor(c){
  if(c.tcgdexId)return await cardById(c.tcgdexId);
  const [n,t]=String(c.number||"").split("/").map(x=>(x||"").trim());
  const p={code:String(c.setCode||"").toUpperCase(),num:n,total:t,name:c.name,setName:c.set};
  if(!n)throw {code:"not_found"};
  const cands=await match(p);if(!cands.length)throw {code:"not_found"};
  return await cardBy(cands[0].setId,cands[0].localId);
}
async function rowEnrich(card,r){
  const ok=r&&r.tcg&&eqNum(r.tcg.localId,String(card.number||"").split("/")[0])&&sim(r.tcg.name,card.name)>.6;
  return enrich(card,{tcg:ok?r.tcg:null,crop:r&&r.crop,forceArt:true});
}

// ---------- OCR ----------
let worker=null;
function loadScript(u){return new Promise((res,rej)=>{const s=document.createElement("script");s.src=u;s.onload=res;s.onerror=()=>rej(new Error("Couldn’t load "+u));document.head.appendChild(s)})}
function ocr(){if(!worker)worker=(async()=>{if(!window.Tesseract)await loadScript(TESS_URL);return await Tesseract.createWorker("eng")})().catch(e=>{worker=null;throw e});return worker}
function region(bmp,rx,ry,rw,rh,tw,inv,rot){
  const W=bmp.width,H=bmp.height;
  const cv0=document.createElement("canvas");
  let src=bmp;
  if(rot){cv0.width=W;cv0.height=H;const g0=cv0.getContext("2d");g0.translate(W,H);g0.rotate(Math.PI);g0.drawImage(bmp,0,0);src=cv0}
  const sx=rx*W,sy=ry*H,sw=rw*W,sh=rh*H,k=Math.max(1,Math.min(4,tw/sw));
  const cv=document.createElement("canvas");cv.width=Math.round(sw*k);cv.height=Math.round(sh*k);
  const g=cv.getContext("2d",{willReadFrequently:true});g.imageSmoothingQuality="high";g.drawImage(src,sx,sy,sw,sh,0,0,cv.width,cv.height);
  const im=g.getImageData(0,0,cv.width,cv.height),d=im.data,n=d.length/4,h=new Uint32Array(256);
  for(let i=0;i<d.length;i+=4){const v=(d[i]*.299+d[i+1]*.587+d[i+2]*.114)|0;d[i]=v;h[v]++}
  let lo=0,hi=255,med=128,a=0;
  for(let v=0;v<256;v++){a+=h[v];if(a>n*.02){lo=v;break}}a=0;
  for(let v=255;v>=0;v--){a+=h[v];if(a>n*.02){hi=v;break}}a=0;
  for(let v=0;v<256;v++){a+=h[v];if(a>=n/2){med=v;break}}
  const flip=inv==null?med<115:inv,sc=255/Math.max(1,hi-lo);
  for(let i=0;i<d.length;i+=4){let v=(d[i]-lo)*sc;v=v<0?0:v>255?255:v;if(flip)v=255-v;d[i]=d[i+1]=d[i+2]=v}
  g.putImageData(im,0,0);return cv;
}
async function text(cv,psm,wl){const w=await ocr();await w.setParameters({tessedit_pageseg_mode:String(psm),tessedit_char_whitelist:wl||""});return ((await w.recognize(cv)).data.text)||""}
const ABBR=()=>new Set(P.sets.map(s=>String(s[2]).split(":")[0]).filter(Boolean).concat(Object.keys(PROMO)));
function parseBottom(t){
  const U=String(t).toUpperCase().replace(/[|\\]/g,"/").replace(/[ \t]+/g," ");
  const fx=s=>s.replace(/[OQD]/g,"0").replace(/[IL]/g,"1");
  const r={code:"",num:"",total:""};
  const m=U.match(/\b([A-Z]{0,2}?)([0-9OQIL]{1,3})\s?\/\s?([A-Z]{0,2}?)([0-9OQIL]{2,3})\b/);
  if(m){r.num=m[1]+fx(m[2]);r.total=m[3]+fx(m[4]);if(!/\d/.test(m[2])||!/\d/.test(m[4])){r.num="";r.total=""}}
  const ab=ABBR();const idx=m?m.index:U.length;
  const toks=[...U.slice(0,idx+1).matchAll(/\b([A-Z]{2,4}\d?)(?:EN|EW|FN|EM)?\b/g)].map(x=>x[1]).filter(x=>ab.has(x)&&x!=="EN");
  if(toks.length)r.code=toks[toks.length-1];
  if(!r.num){const pm=U.match(/\b(SVP|SWSH|SMP|XYP|BWP)\s?(?:EN\s?)?([0-9OQIL]{1,3})\b/);if(pm){r.code=pm[1];r.num=(pm[1]==="SWSH"?"SWSH":"")+fx(pm[2])}}
  return r;
}
const STOP=new Set(["BASIC","STAGE","STAGE1","STAGE2","HP","EVOLVES","FROM","TRAINER","SUPPORTER","ITEM","STADIUM","TOOL","POKEMON","POKÉMON","ENERGY","PUT","ON","THE","OF","VSTAR","VMAX","RULE","TERA"]);
function nameWords(t){
  const seen=new Set();return String(t).replace(/[^A-Za-zÀ-ÿ'\- \n]/g," ").split(/\s+/).filter(x=>x.length>=4&&!STOP.has(x.toUpperCase().replace(/[^A-ZÉ]/g,""))).filter(x=>{const k=x.toLowerCase();if(seen.has(k))return false;seen.add(k);return true}).sort((a,b)=>b.length-a.length).slice(0,4);
}
function topSim(name,top){
  const ws=String(top||"").replace(/[^A-Za-zÀ-ÿ'\- \n]/g," ").split(/\s+/).filter(Boolean);const n=String(name).split(/\s+/).length;let best=0;
  for(let i=0;i<ws.length;i++)for(let k=1;k<=Math.min(3,n+1);k++)best=Math.max(best,sim(name,ws.slice(i,i+k).join(" ")));return best;
}
function cleanName(t){
  const w=String(t).replace(/[^A-Za-zÀ-ÿ'.\- \n]/g," ").split(/\s+/).filter(x=>x.length>=2&&!STOP.has(x.toUpperCase().replace(/[^A-ZÉ0-9]/g,"")));
  const s=w.join(" ").replace(/\s+/g," ").trim();return s.slice(0,40);
}
const WL="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789/ ";
async function readCard(bmp){
  for(const rot of [false,true]){
    let p={code:"",num:"",total:""},raw="";
    for(const[ry,rh,inv] of [[.86,.14,null],[.82,.18,true],[.82,.18,false]]){
      raw=await text(region(bmp,0,ry,1,rh,1800,inv,rot),6,WL);p=parseBottom(raw);if(p.num)break;
    }
    const top=await text(region(bmp,.03,.015,.72,.1,1400,null,rot),6,"");
    const words=nameWords(top);
    if(p.num||!rot&&words.length){p.top=top;p.words=words;p.name=words[0]||"";p.rot=rot;return p}
  }
  return {code:"",num:"",total:"",name:"",top:"",words:[]};
}
function apply(r,f,p,cands){
  const rr=row(f.set.id);
  Object.assign(r,{name:f.name,set:f.set.name,setCode:rr&&rr[2]?String(rr[2]).split(":")[0]:"",regMark:f.regulationMark||"",number:printedNumber(f,p&&eqNum(p.num,f.localId)?p:null),rarity:rarity(f.rarity),variant:variantOf(f),tcg:f});
  if(cands)r.cands=cands;
}
async function recognize(bmp,slot){
  const r={slot,name:"",set:"",setCode:"",regMark:"",number:"",rarity:"",variant:"Normal",qty:1,confidence:"low",note:"",box:null};
  const p=await readCard(bmp);
  if(!p.num&&!(p.words||[]).length){r.note="Nothing readable. Empty pocket? Remove it, or type the card in.";return r}
  const c=await match(p).catch(()=>[]);
  if(!c.length){Object.assign(r,{name:p.name,setCode:p.code,number:p.num?`${p.num}${p.total?"/"+p.total:""}`:"",note:`No TCGdex match${p.num?` for ${p.code?p.code+" ":""}${p.num}${p.total?"/"+p.total:""}`:""}. Check the name and number.`});return r}
  try{apply(r,await cardBy(c[0].setId,c[0].localId),p,c)}catch{Object.assign(r,{name:c[0].name,set:c[0].setName,note:"Couldn’t load the card details."});r.cands=c;return r}
  const codeOk=p.code&&String((row(c[0].setId)||[])[2]).split(":")[0]===p.code;
  const sure=!!p.num&&(codeOk||c.length===1||c[0].score-c[1].score>.25)&&(codeOk||topSim(c[0].name,p.top)>.5);
  r.confidence=sure?"high":"low";
  if(!sure)r.note=!p.num?"Matched by name only. Pick the right printing below.":c.length>1?"Several possible matches. Pick the right one below.":"Best guess. Check it against the card.";
  return r;
}
function reviewExtra(r){
  const f=r.tcg;let h="";
  if(f&&f.image)h+=`<div class="wide pkm"><img src="${esc(f.image)}/low.webp" alt="" loading="lazy"><span>Matched: <b>${esc(f.name)}</b><br>${esc(f.set.name)} · ${esc(f.localId)}${(()=>{const t=trendOf({price:priceOf(f),variant:r.variant});return t!==""&&t!=null?` · Cardmarket ≈ €${(+t).toFixed(2)}`:""})()}</span></div>`;
  if(r.cands&&r.cands.length>1)h+=`<select class="wide" data-cand aria-label="Other matches">${r.cands.map((c,j)=>`<option value="${j}"${f&&c.setId===f.set.id&&c.localId===f.localId?" selected":""}>${esc(c.name)} · ${esc(c.setName)} · ${esc(c.localId)}</option>`).join("")}</select>`;
  return h;
}
document.addEventListener("change",async e=>{
  const s=e.target.closest&&e.target.closest("[data-cand]");if(!s)return;
  const i=+s.closest(".review-item").dataset.i;const r=S.review[i];if(!r||!r.cands)return;
  const c=r.cands[+s.value];syncReviewInputs();s.disabled=true;
  try{apply(r,await cardBy(c.setId,c.localId),null);r.confidence="high";r.note=""}catch{r.note="Couldn’t load that card."}
  renderReview();
});

// identify a whole photo (binder page = 3x3 pockets, deck = one card)
async function identifyAll(){
  if(!S.photo)return;
  const btn=$("#identify");btn.disabled=true;
  try{
    setStatus("Loading the text reader (the first time takes a little longer)…");await ocr();
    const bmp=await createImageBitmap(S.photo.blob);S.review=[];
    if(S.mode==="binder"){
      clearCrops();const W=bmp.width,H=bmp.height,cw=W/3,ch=H/3,ins=.015;
      for(let i=0;i<9;i++){
        setStatus(`Reading pocket ${i+1} of 9…`);
        const cell=await createImageBitmap(bmp,(i%3)*cw+cw*ins,((i/3)|0)*ch+ch*ins,cw*(1-2*ins),ch*(1-2*ins));
        S.review.push(await recognize(cell,i+1));
      }
    }else{setStatus("Reading the card…");S.review.push(await recognize(bmp,null))}
    setStatus("Cutting out each card’s picture…");await cropReview();
    const ok=S.review.filter(r=>r.name).length;
    setStatus(ok?`Read ${ok} of ${S.review.length}. Check them below; tap × on empty pockets.`:"Nothing could be read. Try a sharper, straight-on photo without glare, or use Rotate photo.",!ok);
    renderReview();$("#review").scrollIntoView({behavior:"smooth",block:"start"});
  }catch(e){setStatus("The scan didn’t finish: "+(e&&e.message||"the text reader couldn’t load")+". Check your internet connection and try again.",true)}
  finally{btn.disabled=!S.photo}
}
async function identifyOne(b){
  await ocr();const r=await recognize(await createImageBitmap(b),null);
  P.pending1={url:S.pendingPic&&S.pendingPic.url,tcg:r.tcg||null};
  if(!r.name)throw {code:"invalid_json"};
  return r;
}

// ---------- bulk tools ----------
function pkProgress(label,n,total,msg){
  let el=document.getElementById("pkProg");
  if(!el){document.head.insertAdjacentHTML("beforeend",`<style id="pkProgCss">#pkProg{position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:200;min-width:min(420px,calc(100vw - 32px));background:var(--sheet,#fff);color:var(--ink,#111);border:1px solid var(--line,#ccc);border-radius:14px;box-shadow:0 12px 36px rgba(0,0,0,.35);padding:12px 16px;display:none;font-size:.9rem}#pkProg.on{display:block}#pkProg .pgh{display:flex;justify-content:space-between;gap:12px;font-weight:700;margin-bottom:8px}#pkProg .pgh small{color:var(--muted,#777);font-weight:700}#pkProg .pgt{display:block;height:8px;border-radius:99px;background:var(--pocket,#e5e7ef);overflow:hidden}#pkProg .pgt i{display:block;height:100%;width:0;background:var(--accent,#f5b800);border-radius:99px;transition:width .2s}#pkProg .pgm{margin-top:6px;color:var(--muted,#777);font-size:.8rem}</style>`);
    document.body.insertAdjacentHTML("beforeend",`<div id="pkProg" role="status" aria-live="polite"><div class="pgh"><span></span><small></small></div><span class="pgt"><i></i></span><div class="pgm"></div></div>`);el=document.getElementById("pkProg")}
  clearTimeout(el._t);
  if(label===null){el.classList.remove("on");return}
  el.classList.add("on");const pct=total?Math.min(100,Math.round(n/total*100)):0;
  el.querySelector(".pgh span").textContent=label;el.querySelector(".pgh small").textContent=total?`${n} of ${total} · ${pct}%`:"";
  el.querySelector(".pgt i").style.width=pct+"%";el.querySelector(".pgm").textContent=msg||"";
  if(total&&n>=total)el._t=setTimeout(()=>el.classList.remove("on"),2200);
}
window.pkProgress=pkProgress;
async function bulk(label,list,fn){
  let done=0,bad=0;pkProgress(label,0,list.length);
  for(const c of list){setBar(`${label}: ${done+bad+1} of ${list.length}…`);try{await fn(c);done++}catch{bad++}pkProgress(label,done+bad,list.length,bad?`${bad} not found`:"")}
  schedule();render();setBar(`${label}: ${done} done${bad?`, ${bad} not found`:""}.`,!!bad);pkProgress(label,list.length,list.length,bad?`${done} done, ${bad} not found`:"Done");
}
async function refreshPrices(){
  const list=S.cards.filter(c=>c.tcgdexId);if(!list.length){setBar("No cards are linked to TCGdex yet. Use Fill in details first.",true);return}
  P.cardCache.clear();
  await bulk("Refreshing prices",list,async c=>{const f=await cardById(c.tcgdexId);const old={...c};c.price=priceOf(f);if(typeof phistOf==="function")phistOf(c,old)});
}
async function updateDetails(only){
  const list=(Array.isArray(only)?only:S.cards).filter(c=>c.tcgdexId||(c.setCode&&c.number)||c.name);if(!list.length){setBar("There are no cards to update yet.",true);return}
  P.cardCache.clear();
  await bulk("Updating card details",list,async c=>{const old={...c};const f=await findFor(c);await enrich(c,{tcg:f,art:false});if(typeof phistOf==="function")phistOf(c,old)});
}
async function fetchArt(all){
  const list=S.cards.filter(c=>all||!c.official||!P.urls.has(c.official));
  await bulk(all?"Using official artwork":"Fetching artwork",list,async c=>{const f=await findFor(c);const a=await artwork(f);if(!a)throw 0;c.official=a;if(!c.tcgdexId)c.tcgdexId=f.id;if(!c.tcgImage)c.tcgImage=f.image||""});
}
async function updateSets(){
  try{
    setBar("Updating the set list from TCGdex…");
    const list=await tget("/sets");const out=[];
    for(let i=0;i<list.length;i+=8){
      const part=await Promise.all(list.slice(i,i+8).map(s=>tget("/sets/"+encodeURIComponent(s.id)).catch(()=>null)));
      for(const d of part)if(d&&!(d.serie&&/pocket/i.test(d.serie.name)))out.push([d.id,d.name,(d.abbreviation||{}).official||"",d.cardCount.official||0,d.cardCount.total||0,(d.serie||{}).name||"",d.releaseDate||""]);
      setBar(`Updating the set list: ${Math.min(i+8,list.length)} of ${list.length}…`);
    }
    if(out.length>50){P.sets=out;await writeFile("sets.json",JSON.stringify(out));setBar(`Set list updated: ${out.length} sets.`)}
  }catch{setBar("Couldn’t update the set list. Check your connection.",true)}
}
function priceHtml(c){const t=trendOf(c);if(t===""||t==null)return "";return `<div class="zloc"><b>Cardmarket trend ≈ €${(+t).toFixed(2)}</b>${c.price&&c.price.low!=null?`Lowest listing €${(+c.price.low).toFixed(2)} · `:""}updated ${esc(String(c.price.updated||"").slice(0,10))}</div>`}

// ---------- wire the folder bar ----------
document.addEventListener("DOMContentLoaded",()=>{
  $q("#pkPick").onclick=pick;
  document.addEventListener("click",e=>{
    const b=e.target.closest("[data-pk]");if(!b)return;
    ({reload,prices:refreshPrices,details:updateDetails,art:()=>fetchArt(false),artall:()=>fetchArt(true),sets:updateSets,folder:pick,save:()=>{P.conflict=false;hideConflict();save()}})[b.dataset.pk]();
  });
  $q("#pkLoadX").onclick=reload;
  $q("#pkKeep").onclick=()=>{P.conflict=false;P.lastMod=Date.now()+1e7;hideConflict();save().then(()=>{})};
  initGate();
});
return {blob,folderRaw,updateDetails,enrich,rowEnrich,identifyAll,identifyOne,reviewExtra,priceHtml,findFor,details,priceOf,artwork,P,setCards,setRow:row,tget,cardById,
  realImg:c=>c.tcgImage?c.tcgImage+"/high.webp":""};
})();
async function identify(){return PKL.identifyAll()}
async function fillDetails(c,signal){
  if(signal&&signal.aborted)throw {code:"cancelled"};
  const fresh=S.cards.find(x=>x.id===c.id)||c;const{id,...rest}=fresh;
  const f=await PKL.findFor(rest);
  const card=await PKL.enrich({...rest},{tcg:f});
  await S.store.set(id,card);return card.details;
}
async function translateDetails(){throw {code:"local_tr"}}

