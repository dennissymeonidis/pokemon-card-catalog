// ---------- undo, backup, import ----------
$("#undoBtn").onclick=undoLast;$("#undoTop").onclick=undoLast;
$("#undoX").onclick=()=>$("#undoBar").classList.remove("show");
document.addEventListener("keydown",e=>{if((e.ctrlKey||e.metaKey)&&!e.shiftKey&&e.key.toLowerCase()==="z"&&!(e.target.closest&&e.target.closest("input,textarea,select"))&&UNDO.length&&!document.querySelector("dialog[open]")){e.preventDefault();undoLast()}});
function toolMsg(t,err){const s=$("#toolStatus");s.textContent=t;s.classList.toggle("err",!!err)}
$("#backupBtn").onclick=async()=>{
  const data=JSON.stringify({app:"pokemon-catalog",version:1,exported:new Date().toISOString(),cards:S.cards,binders:S.binders},null,1);
  const fn=`pokemon-catalog-backup-${new Date().toISOString().slice(0,10)}.json`;
  if(S.downloads){try{await S.downloads.save({filename:fn,data});toolMsg(`Backup saved: ${plural(S.cards.length,"card")} and ${plural(Object.keys(S.binders).length,"binder")}.`);logAct("Downloaded a backup");try{localStorage.setItem("pk-lastbackup",new Date().toISOString())}catch{}toolsRefresh()}catch(e){toolMsg("The backup didn’t download. Try again.",true)}}
  else toolMsg("Downloading isn’t available in this view.",true);
};
$("#restoreFile").onchange=async e=>{
  const f=e.target.files[0];e.target.value="";if(!f)return;
  let d;try{d=JSON.parse(await f.text())}catch{toolMsg("That file isn’t a catalog backup.",true);return}
  if(!d||!Array.isArray(d.cards)){toolMsg("That file isn’t a catalog backup.",true);return}
  const ids=new Set(d.cards.map(c=>c&&c.id).filter(Boolean));const gone=S.cards.filter(c=>!ids.has(c.id));
  if(!(await askConfirm("Restore this backup?",`It holds ${plural(d.cards.length,"card")} and ${plural(Object.keys(d.binders||{}).length,"binder")}${d.exported?`, saved ${new Date(d.exported).toLocaleString()}`:""}. Your catalog will be replaced with it${gone.length?`, removing ${plural(gone.length,"card")} that aren’t in the backup`:""}. You can undo this afterwards.`,"Restore backup",false)))return;
  toolMsg("Restoring…");txBegin(`Restored a backup (${plural(d.cards.length,"card")})`);
  try{
    for(const c of gone)await S.store.del(c.id);
    let i=0;for(const c of d.cards){if(!c||!c.name)continue;const id=c.id||newId();await S.store.set(id,c);if(++i%20===0)toolMsg(`Restoring ${i} of ${d.cards.length}…`)}
    for(const [n,b] of Object.entries(d.binders||{}))if(b&&typeof b==="object")await S.store.bset(n,b);
    toolMsg("Backup restored.");
  }catch(err){toolMsg("The restore didn’t finish. Use Undo, then try again.",true)}
  finally{txEnd()}
};
function parseCSV(t){
  t=t.replace(/^\ufeff/,"");const first=t.split(/\r?\n/)[0]||"";const dl=(first.split(";").length>first.split(",").length)?";":(first.split("\t").length>first.split(",").length?"\t":",");
  const rows=[];let row=[],f="",q=false;
  for(let i=0;i<t.length;i++){const ch=t[i];
    if(q){if(ch==='"'){if(t[i+1]==='"'){f+='"';i++}else q=false}else f+=ch}
    else if(ch==='"')q=true;
    else if(ch===dl){row.push(f);f=""}
    else if(ch==="\n"||ch==="\r"){if(ch==="\r"&&t[i+1]==="\n")i++;row.push(f);rows.push(row);row=[];f=""}
    else f+=ch}
  if(f!==""||row.length){row.push(f);rows.push(row)}
  return rows.filter(r=>r.some(x=>String(x).trim()!==""));
}
$("#csvFile").onchange=async e=>{
  const f=e.target.files[0];e.target.value="";if(!f)return;
  const rows=parseCSV(await f.text());if(rows.length<2){toolMsg("That file has no card rows.",true);return}
  const H=rows[0].map(h=>String(h).trim().toLowerCase().replace(/[^a-z0-9]/g,""));
  const col=(...names)=>{for(const n of names){const i=H.indexOf(n);if(i>-1)return i}return -1};
  const ix={name:col("name","card","cardname","pokemon"),set:col("set","setname","expansion"),series:col("series"),setCode:col("setcode","code"),number:col("number","cardnumber","no","collectornumber"),regMark:col("regmark","mark","regulationmark"),rarity:col("rarity"),variant:col("variant","printing","finish"),qty:col("qty","quantity","count","copies"),condition:col("condition"),binder:col("binder"),page:col("page"),slot:col("slot","pocket","position"),deck:col("deck"),notes:col("notes","note"),dex:col("dex","pokedex","dexno","nationaldex")};
  if(ix.name<0){toolMsg("No “name” column found. The first row must hold column names, such as name, set, number.",true);return}
  const g=(r,k)=>ix[k]>-1?String(r[ix[k]]??"").trim():"";
  const cards=rows.slice(1).map(r=>{const name=g(r,"name");if(!name)return null;const b=+g(r,"binder"),dk=g(r,"deck");const v=g(r,"variant");
    return {name,set:g(r,"set"),series:g(r,"series"),setCode:g(r,"setCode").toUpperCase(),number:g(r,"number"),regMark:g(r,"regMark").toUpperCase(),rarity:g(r,"rarity"),variant:VARIANTS.find(x=>x.toLowerCase()===v.toLowerCase())||(v?"Other":"Normal"),qty:Math.max(1,Math.round(+g(r,"qty")||1)),condition:g(r,"condition"),notes:g(r,"notes"),dex:+g(r,"dex")>0?Math.round(+g(r,"dex")):null,
      locType:b>0?"binder":"deck",binder:b>0?b:null,page:b>0?(+g(r,"page")||null):null,slot:b>0?(+g(r,"slot")||null):null,deck:b>0?null:(dk||"Imported"),added:new Date().toISOString()}}).filter(Boolean);
  if(!cards.length){toolMsg("No rows with a card name were found.",true);return}
  const found=Object.keys(ix).filter(k=>ix[k]>-1).join(", ");
  if(!(await askConfirm(`Import ${plural(cards.length,"card")}?`,`Columns found: ${found}. First cards: ${cards.slice(0,3).map(c=>c.name).join(", ")}${cards.length>3?"…":""}. Cards without a binder go into a deck called “Imported”. You can undo this afterwards.`,"Import",false)))return;
  toolMsg("Importing…");txBegin(`Imported ${plural(cards.length,"card")} from ${f.name}`);
  try{let i=0;for(const c of cards){await S.store.add(c);if(++i%20===0)toolMsg(`Importing ${i} of ${cards.length}…`)}toolMsg(`Imported ${plural(cards.length,"card")}. Use Fill in details to complete them.`)}
  catch(err){toolMsg("The import didn’t finish. Use Undo, then try again.",true)}
  finally{txEnd()}
};
$("#dexList").addEventListener("toggle",e=>{const d=e.target.closest(".dxrow");if(!d)return;const n=+d.dataset.dex;if(d.open)dexOpen.add(n);else dexOpen.delete(n)},true);
$("#galleryGrid").addEventListener("click",async e=>{
  if(gSuppress){gSuppress=false;e.preventDefault();return}
  const ed=e.target.closest("[data-bedit]");if(ed){openBinderDlg(+ed.dataset.bedit,false);return}
  if(e.target.closest("[data-bnew]")){const nums=binderNums();openBinderDlg((nums.length?Math.max(...nums):0)+1,true);return}
  const op=e.target.closest("[data-open]");if(!op)return;
  const bn=+op.dataset.open;
  if(S.review.length&&!(await askConfirm("Discard these cards?","The cards waiting for review haven’t been added yet.","Discard")))return;
  openBinder(bn);
});

// ---------- import a whole binder from an Excel/CSV file ----------
function bdStyle(v){const t=String(v||"").trim().toLowerCase().replace(/[\s_-]+/g,"");if(!t||t==="nonholo"||t==="normal"||t==="nonholofoil"||t==="regular")return "Normal";if(t==="holo"||t==="holofoil")return "Holo";if(t==="reverseholo"||t==="reverse")return "Reverse Holo";const m=VARIANTS.find(x=>x.toLowerCase().replace(/[\s_-]+/g,"")===t);return m||"Other"}

// ---------- import one binder page from pasted text ----------
function btParse(text){
  const rows=[],bad=[];let last=0,pg=0;
  for(const raw of String(text||"").split(/\r?\n/)){
    const l=raw.replace(/^\s*\|/,"").replace(/\|\s*$/,"").trim();
    if(!l||/^[-|:\s=]+$/.test(l)||/^slot\b/i.test(l))continue;
    const cols=l.split(/\t+|\s*\|\s*|\s{2,}/).map(x=>x.trim()).filter(Boolean);
    let slot=0,name="",sn="",style="";
    if(cols.length>=3&&/^\d{1,2}$/.test(cols[0])){slot=+cols[0];name=cols[1];sn=cols[2];style=cols.slice(3).join(" ")}
    else{const m=l.match(/^(\d{1,2})[\s.)-]+(.+?)\s+([A-Za-z][A-Za-z0-9]{1,5})\s+([A-Za-z]{0,3}\d+[A-Za-z]?(?:\s*\/\s*\d+)?)\s*(.*)$/);if(m){slot=+m[1];name=m[2];sn=m[3]+" "+m[4];style=m[5]}}
    const m2=String(sn).replace(/\s+/g," ").trim().match(/^([A-Za-z][A-Za-z0-9]{1,5})[\s-]+([A-Za-z]{0,3}\d+[A-Za-z]?(?:\s?\/\s?\d+)?)$/);
    if(!(slot>=1&&slot<=9)||!name||!m2){bad.push(l);continue}
    if(slot<=last)pg++;last=slot;
    rows.push({slot,pg,name:name.trim(),setCode:m2[1].toUpperCase(),number:m2[2].replace(/\s/g,""),variant:bdStyle(style)})
  }
  return {rows,bad};
}
async function bkTextImport(p){
  const I=bkInfo(),n=I.n;
  const v=await askBulk(`Import page ${p} from text`,`<label>Paste the page as text<textarea name="txt" rows="12" spellcheck="false" placeholder="Slot	Card	Set and number	Style&#10;1	Hop’s Bag	JTG 147	Reverse&#10;2	Hop’s Bag	JTG 147	Non-holo&#10;3	Super Potion	JTG 158	Non-holo" style="width:100%;box-sizing:border-box;font-family:ui-monospace,Consolas,monospace;font-size:.85rem"></textarea></label><p class="hint" style="margin:8px 0 0">One card per line: slot (1–9), card name, set code and number, then style (Non-holo, Reverse or Holo). Tabs, spaces or a pasted table all work, and a header row is ignored. Details, artwork and prices come from TCGdex. If the text runs past slot 9, the next rows go on the following pages. Pockets that already hold a card are skipped.</p>`,"Import");
  if(!v||!String(v.txt||"").trim())return;
  const {rows,bad}=btParse(v.txt);
  if(!rows.length){if(typeof cpToast==="function")cpToast("No cards found. Each line needs a slot, name, set code and number.");return}
  const used=new Set(S.cards.filter(c=>c.locType==="binder"&&+c.binder===+n&&+c.page&&+c.slot).map(c=>c.page+":"+c.slot));
  const list=[];let busy=0;const seen=new Set();
  for(const r of rows){const page=p+r.pg,k=page+":"+r.slot;if(used.has(k)||seen.has(k)){busy++;continue}seen.add(k);list.push({...r,page})}
  if(!list.length){if(typeof cpToast==="function")cpToast(`All ${plural(busy,"pocket")} in the text are already taken.`);return}
  const last=Math.max(...list.map(x=>x.page));
  if(!(await askConfirm(`Import ${plural(list.length,"card")} into ${binderName(n)}?`,`Page ${p}${last>p?` to ${last}`:""}. Details, artwork and prices come from TCGdex, which takes a moment.${busy?` ${plural(busy,"pocket")} already filled will be skipped.`:""}${bad.length?` ${plural(bad.length,"line")} couldn’t be read and will be ignored.`:""} You can undo this afterwards.`,"Import",false)))return;
  const miss=[];let done=0,idx=0,chain=Promise.resolve(),added=0;const title=`Importing into ${binderName(n)}`;pkProgress(title,0,list.length);
  txBegin(`Imported ${plural(list.length,"card")} into ${binderName(n)}, page ${p}, from text`);
  try{
    const work=async()=>{while(idx<list.length){const it=list[idx++];
      const card={name:it.name,set:"",series:"",setCode:it.setCode,number:it.number,regMark:"",rarity:"",variant:it.variant,qty:1,condition:"",notes:"",dex:null,locType:"binder",binder:n,page:it.page,slot:it.slot,deck:null,added:new Date().toISOString()};
      try{await PKL.enrich(card,{})}catch{}
      if(!card.tcgdexId)miss.push(`page ${it.page}, pocket ${it.slot}: ${it.name} ${it.setCode} ${it.number}`);
      chain=chain.then(()=>S.store.add(card)).then(()=>{added++}).catch(()=>{});
      done++;pkProgress(title,done,list.length,miss.length?`${miss.length} not found on TCGdex`:"")}};
    await Promise.all([work(),work(),work(),work()]);await chain;
    const b=S.binders[n]||{};const need=last+(last%2);
    if(!b.pages||b.pages<need)await S.store.bset(n,{...b,number:n,pages:need});
    if(typeof cpToast==="function")cpToast(`Imported ${plural(added,"card")}${miss.length?`; ${plural(miss.length,"card")} not found on TCGdex: ${miss.slice(0,3).join("; ")}`:" with details, artwork and prices"}`);
    render();if(typeof bkRefresh==="function")bkRefresh();
  }catch(err){if(typeof cpToast==="function")cpToast("The import didn’t finish. Use Undo, then try again.")}
  finally{txEnd()}
}
async function bdRunImport(f,n,st,btn){
  st.classList.remove("err");
  let rows;
  try{
    const wb=XLSX.read(await f.arrayBuffer());const nm=wb.SheetNames.find(x=>/^cards$/i.test(x))||wb.SheetNames[0];
    rows=XLSX.utils.sheet_to_json(wb.Sheets[nm],{defval:"",raw:false}).map(r=>{const o={};for(const[k,v] of Object.entries(r))o[String(k).trim().toLowerCase().replace(/[^a-z0-9]/g,"")]=typeof v==="string"?v.trim():v;return o});
  }catch{st.textContent="That file couldn’t be read. Use an .xlsx or .csv file.";st.classList.add("err");return}
  if(!rows.length||!("name" in rows[0])||!("page" in rows[0])||!("slot" in rows[0])){st.textContent="The first sheet needs the columns page, slot, name, set_code, number and Style.";st.classList.add("err");return}
  const used=new Set(S.cards.filter(c=>c.locType==="binder"&&+c.binder===n&&+c.page&&+c.slot).map(c=>c.page+":"+c.slot));
  const list=[];let busy=0,bad=0;const seen=new Set();
  for(const r of rows){
    const name=String(r.name||"").trim();if(!name)continue;
    const page=Math.round(+r.page),slot=Math.round(+r.slot);
    if(!(page>=1)||!(slot>=1&&slot<=9)){bad++;continue}
    const k=page+":"+slot;if(used.has(k)||seen.has(k)){busy++;continue}seen.add(k);
    list.push({name,setCode:String(r.setcode||r.code||"").trim().toUpperCase(),number:String(r.number||"").trim(),variant:bdStyle(r.style||r.variant||r.finish),page,slot})
  }
  if(!list.length){st.textContent=busy?`Nothing to import: all ${plural(busy,"pocket")} in the file are already taken in this binder.`:"No cards with a page, slot and name were found.";st.classList.add("err");return}
  const maxPage=Math.max(...list.map(x=>x.page));
  if(!(await askConfirm(`Import ${plural(list.length,"card")} into ${binderName(n)}?`,`Each card goes into the page and pocket given in the file (the binder number in the file is ignored). Details, photos and prices come from TCGdex, which takes a few minutes. Keep this window open.${busy?` ${plural(busy,"pocket")} that are already filled will be skipped.`:""}${bad?` ${plural(bad,"row")} without a valid page or slot will be skipped.`:""} You can undo this afterwards.`,"Import",false)))return;
  btn.style.pointerEvents="none";btn.style.opacity=".55";const miss=[];pkProgress(`Importing into ${binderName(n)}`,0,list.length);let done=0,idx=0,chain=Promise.resolve(),added=0;
  txBegin(`Imported ${plural(list.length,"card")} into ${binderName(n)} from ${f.name}`);
  try{
    const work=async()=>{
      while(idx<list.length){
        const it=list[idx++];
        const card={name:it.name,set:"",series:"",setCode:it.setCode,number:it.number,regMark:"",rarity:"",variant:it.variant,qty:1,condition:"",notes:"",dex:null,locType:"binder",binder:n,page:it.page,slot:it.slot,deck:null,added:new Date().toISOString()};
        try{await PKL.enrich(card,{})}catch{}
        if(!card.tcgdexId)miss.push(`page ${it.page}, pocket ${it.slot}: ${it.name} ${it.setCode} ${it.number}`.trim());
        chain=chain.then(()=>S.store.add(card)).then(()=>{added++}).catch(()=>{});
        done++;st.textContent=`Importing ${done} of ${list.length}…`;pkProgress(`Importing into ${binderName(n)}`,done,list.length,miss.length?`${miss.length} not found on TCGdex`:"");
      }
    };
    await Promise.all([work(),work(),work(),work()]);await chain;
    const b=S.binders[n]||{};const need=maxPage+(maxPage%2);
    if(!b.pages||b.pages<need){await S.store.bset(n,{...b,number:n,pages:need});$("#bdPages").value=need}
    st.textContent=`Imported ${plural(added,"card")}${miss.length?`; ${plural(miss.length,"card")} weren’t found on TCGdex and keep only the name, set code and number: ${miss.slice(0,6).join("; ")}${miss.length>6?"…":""}`:". All matched on TCGdex."}`;
    if(miss.length)st.classList.add("err");
    render();if(typeof bkRefresh==="function")bkRefresh();return need;
  }catch(err){st.textContent="The import didn’t finish. Use Undo, then try again.";st.classList.add("err")}
  finally{txEnd();btn.style.pointerEvents="";btn.style.opacity=""}
}
$("#bdImport").onchange=async e=>{
  const f=e.target.files[0];e.target.value="";if(!f||!S.bEdit)return;
  const st=$("#bdStatus"),E=S.bEdit;
  if(E.isNew){st.classList.remove("err");st.textContent="Save the new binder first, then edit it and import the file.";st.classList.add("err");return}
  await bdRunImport(f,E.n,st,$("#bdImpLbl"));
};
$("#bdFile").onchange=async e=>{
  const f=e.target.files[0];if(!f||!S.bEdit)return;const st=$("#bdStatus");st.classList.remove("err");st.textContent="Loading the photo…";
  try{
    const blob=await shrink(f);if(S.bEdit.url)URL.revokeObjectURL(S.bEdit.url);
    S.bEdit.blob=blob;S.bEdit.url=URL.createObjectURL(blob);S.bEdit.remove=false;bdPreview();
    st.textContent="Photo chosen. Tap Save binder to keep it.";
  }catch(err){st.textContent="That photo couldn’t be read. Try a JPEG or PNG.";st.classList.add("err")}
};
// ---------- reorder binders ----------
let gDrag=null,gSuppress=false;
const gg=$("#galleryGrid");
gg.addEventListener("dragstart",e=>e.preventDefault());
gg.addEventListener("contextmenu",e=>{if(e.target.closest(".tile[data-n]"))e.preventDefault()});
gg.addEventListener("pointerdown",e=>{
  const t=e.target.closest(".tile[data-n]");if(!t||e.button>0||e.target.closest(".bt-edit"))return;
  const touch=e.pointerType!=="mouse";
  gDrag={n:+t.dataset.n,el:t,sx:e.clientX,sy:e.clientY,touch,armed:!touch,ghost:null,over:null,after:false,pid:e.pointerId};
  if(touch)gDrag.timer=setTimeout(()=>{if(gDrag&&gDrag.el===t){gDrag.armed=true;t.classList.add("armed");if(navigator.vibrate)navigator.vibrate(15)}},380);
});
gg.addEventListener("pointermove",e=>{
  const d=gDrag;if(!d)return;
  const dist=Math.hypot(e.clientX-d.sx,e.clientY-d.sy);
  if(!d.armed){if(dist>10){clearTimeout(d.timer);gDrag=null}return}
  if(!d.ghost){
    if(dist<6)return;
    try{d.el.setPointerCapture(d.pid)}catch{}
    const r=d.el.getBoundingClientRect();const g=d.el.cloneNode(true);g.classList.remove("armed","sel");g.classList.add("gghost");g.style.width=r.width+"px";
    document.body.appendChild(g);d.ghost=g;d.dx=e.clientX-r.left;d.dy=e.clientY-r.top;d.el.classList.add("lifted");gg.classList.add("dragging");
  }
  d.ghost.style.transform=`translate(${e.clientX-d.dx}px,${e.clientY-d.dy}px) rotate(-2deg) scale(1.05)`;
  const hit=document.elementFromPoint(e.clientX,e.clientY);const t=hit&&hit.closest("#galleryGrid .tile[data-n]");
  gg.querySelectorAll(".ins-l,.ins-r").forEach(x=>x.classList.remove("ins-l","ins-r"));
  if(t&&t!==d.el){const r=t.getBoundingClientRect();d.after=e.clientX>r.left+r.width/2;d.over=t;t.classList.add(d.after?"ins-r":"ins-l")}else d.over=null;
});
gg.addEventListener("touchmove",e=>{if(gDrag&&gDrag.armed)e.preventDefault()},{passive:false});
async function endGal(cancel){
  const d=gDrag;gDrag=null;if(!d)return;clearTimeout(d.timer);
  d.el.classList.remove("armed","lifted");gg.classList.remove("dragging");
  gg.querySelectorAll(".ins-l,.ins-r").forEach(x=>x.classList.remove("ins-l","ins-r"));
  if(d.ghost){d.ghost.remove();gSuppress=true;setTimeout(()=>{gSuppress=false},450)}
  if(cancel||!d.ghost||!d.over)return;
  const to=+d.over.dataset.n;const before=binderNums();const nums=before.filter(x=>x!==d.n);
  nums.splice(nums.indexOf(to)+(d.after?1:0),0,d.n);
  if(nums.join()===before.join())return;
  if(!(await askConfirm(`Move ${binderName(d.n)}?`,`It moves ${d.after?"after":"before"} ${binderName(to)} in your binders. The cards inside stay exactly where they are.`,"Move binder",false)))return;
  txBegin(`Moved ${binderName(d.n)} ${d.after?"after":"before"} ${binderName(to)}`);
  try{for(let k=0;k<nums.length;k++){const n=nums[k];const b=S.binders[n]||{};if(+b.pos!==k||b.pos==null)await S.store.bset(n,{...b,number:n,pos:k})}}
  catch(err){setStatus("The new binder order didn’t save. Try again.",true)}
  finally{txEnd()}
}
gg.addEventListener("pointerup",()=>endGal(false));
gg.addEventListener("pointercancel",()=>endGal(true));
$("#bdColor").addEventListener("input",e=>{if(!S.bEdit)return;S.bEdit.color=e.target.value;bdPreview()});
$("#bdColorReset").onclick=()=>{if(!S.bEdit)return;S.bEdit.color="";$("#bdColor").value=COVERS[(S.bEdit.n-1)%COVERS.length];bdPreview()};
$("#bdRemove").onclick=()=>{const e=S.bEdit;if(!e)return;if(e.url)URL.revokeObjectURL(e.url);e.url=null;e.blob=null;e.remove=true;$("#bdFile").value="";bdPreview()};
$("#binderDlg").addEventListener("close",async()=>{
  const e=S.bEdit;S.bEdit=null;if(!e)return;
  if($("#binderDlg").returnValue!=="save"){if(e.url)URL.revokeObjectURL(e.url);return}
  const old=S.binders[e.n]||{};let cover=old.cover||null;
  try{
    if(e.blob&&S.assets){const a=await S.assets.upload(e.blob);if(cover)S.assets.delete(cover).catch(()=>{});cover=a.id}
    else if(e.remove&&cover){S.assets&&S.assets.delete(cover).catch(()=>{});cover=null}
    const pgIn=Math.max(0,Math.round(+$("#bdPages").value||0));
    txBegin(e.isNew?`Created ${$("#bdName").value.trim()||"Binder "+e.n}`:`Edited ${binderName(e.n)}`);
    try{await S.store.bset(e.n,{...old,number:e.n,name:$("#bdName").value.trim(),cover,color:e.color===null?(old.color||null):(e.color||null),pages:pgIn?pgIn+(pgIn%2):null})}finally{txEnd()}
    if(e.isNew){$("#binderNo").value=e.n;$("#pageNo").value=1;renderBinder()}
  }catch(err){setStatus("The binder didn’t save. Try again.",true)}
  if(e.url)URL.revokeObjectURL(e.url);
});
function askConfirm(title,text,yes,danger=true){
  return new Promise(res=>{
    const d=$("#confirmDlg");$("#cfTitle").textContent=title;$("#cfText").textContent=text;$("#cfYes").textContent=yes;$("#cfYes").className="btn"+(danger?" danger":"");
    d.returnValue="";d.addEventListener("close",()=>res(d.returnValue==="yes"),{once:true});d.showModal();
  });
}
async function removeCards(list,onStep){
  let n=0;
  for(const c of list){
    try{await S.store.del(c.id);n++}catch{}
    if(onStep)onStep(n,list.length);
  }
  return n;
}
const plural=(n,w)=>`${n} ${w}${n===1?"":"s"}`;
$("#clearPage").onclick=async()=>{
  const {b,cur}=spreadInfo();
  const list=S.cards.filter(c=>c.locType==="binder"&&String(c.binder)===b&&+c.page===cur);
  if(!list.length){setStatus(`Page ${cur} is already empty.`);return}
  if(!(await askConfirm(`Clear page ${cur}?`,`This deletes the ${plural(list.length,"card")} on binder ${b}, page ${cur}. You can undo this afterwards.`,`Delete ${plural(list.length,"card")}`)))return;
  txBegin(`Cleared ${binderName(b)}, page ${cur} (${plural(list.length,"card")})`);
  let n=0;try{n=await removeCards(list)}finally{txEnd()}
  setStatus(n===list.length?`Cleared page ${cur}.`:`Cleared ${n} of ${list.length} cards. Try again for the rest.`,n!==list.length);
};
$("#clearAll").onclick=async()=>{
  const list=S.cards.slice();if(!list.length)return;
  if(!(await askConfirm("Clear your whole catalog?",`This deletes all ${plural(list.length,"entry").replace("entrys","entries")} in every binder and deck. You can undo this afterwards, but download a backup first to be safe.`,"Delete everything")))return;
  const st=$("#listStatus");st.classList.remove("err");
  txBegin(`Cleared the whole catalog (${plural(list.length,"card")})`);
  let n=0;try{n=await removeCards(list,(i,t)=>{st.textContent=`Deleting ${i} of ${t}…`})}finally{txEnd()}
  st.textContent=n===list.length?"Your catalog is empty.":`Deleted ${n} of ${list.length}. Try again for the rest.`;st.classList.toggle("err",n!==list.length);
};
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&S.full&&!$("#editor").open&&!$("#confirmDlg").open){S.full=false;renderBinder()}});
$("#edTop").addEventListener("change",e=>{
  if(e.target.id!=="replImg"||!S.editing||!S.assets)return;
  const f=e.target.files[0];if(f)edReplace(f);
});
{const ed=$("#editor");
 ed.addEventListener("dragover",e=>{if(!hasFiles(e)||!S.assets||!(S.editing||S.pendingPic))return;e.preventDefault();e.stopPropagation();e.dataTransfer.dropEffect="copy";ed.classList.add("edrop")});
 ed.addEventListener("dragleave",e=>{if(!ed.contains(e.relatedTarget))ed.classList.remove("edrop")});
 ed.addEventListener("drop",e=>{if(!hasFiles(e))return;e.preventDefault();e.stopPropagation();ed.classList.remove("edrop");const f=imgFile(e);if(!f)return;
   if(S.editing)edReplace(f);else if(S.pendingPic&&S.pocketTarget){ed.close("cancel");setTimeout(()=>addFromPhotoFile(f,S.pocketTarget),0)}});}
async function edReplace(f){
  if(!S.editing||!S.assets)return;const st=$("#fillStatus");if(!st)return;st.classList.remove("err");st.textContent="Saving the picture…";
  try{
    const nc=await replacePicture(S.editing,f);
    S.editing={...S.editing,img:null,official:nc.official};renderEdTop(S.editing);$("#fillStatus").textContent="Picture replaced.";
  }catch(err){st.textContent="The picture didn’t save. Try a JPEG or PNG.";st.classList.add("err")}
}
$("#edTop").addEventListener("click",async e=>{
  const art=e.target.closest(".art");if(art&&art.querySelector("img")){art.classList.toggle("full");return}
  if(!e.target.closest("#fillBtn")||!S.editing)return;
  const btn=$("#fillBtn"),st=$("#fillStatus");btn.disabled=true;st.classList.remove("err");st.textContent="Reading the card. This can take up to a minute.";
  try{const details=await fillDetails(S.editing);S.editing={...S.editing,details};renderEdTop(S.editing);fillDetailFields(details);S.edSnap=edSnap()}
  catch(err){st.textContent=fillErr(err);st.classList.add("err");btn.disabled=false}
});

// ---------- drag to move ----------
const bv=$("#binderView");let drag=null;
const inReview=()=>S.review.length&&S.mode==="binder";
let flashT=null;
function flash(keys){S.flash=new Set(keys);clearTimeout(flashT);flashT=setTimeout(()=>{S.flash=null},900)}
const binderSeq=()=>{const b=$("#binderNo").value;return S.cards.filter(x=>x.locType==="binder"&&String(x.binder)===b).sort((a,z)=>(+a.page||0)-(+z.page||0)||(+a.slot||0)-(+z.slot||0)).map(x=>x.id)};
const cardAt=(n,pg)=>{const b=$("#binderNo").value,p=String(pg||$("#pageNo").value);return S.cards.find(c=>c.locType==="binder"&&String(c.binder)===b&&String(c.page)===p&&+c.slot===n)};
async function moveSlot(a,b,pa,pb){
  if(inReview()){if(a===b)return;syncReviewInputs();S.review.forEach(r=>{if(r.slot===a)r.slot=b;else if(r.slot===b)r.slot=a});flash([`0-${b}`,`0-${a}`]);renderReview();return}
  pa=pa||+$("#pageNo").value;pb=pb||pa;
  if(a===b&&pa===pb)return;
  const A=cardAt(a,pa),B=cardAt(b,pb);if(!A)return;
  const at=(p,s)=>pa===pb?`pocket ${s}`:`page ${p}, pocket ${s}`;
  const ok=B?await askConfirm(`Swap ${A.name} and ${B.name}?`,`${A.name} moves to ${at(pb,b)}, and ${B.name} moves to ${at(pa,a)}.`,"Swap cards",false)
    :await askConfirm(`Move ${A.name}?`,`It moves from ${at(pa,a)} to ${at(pb,b)}.`,"Move card",false);
  if(!ok)return;
  const strip=({id,...rest})=>rest;
  try{
    txBegin(B?`Swapped ${A.name} and ${B.name}`:`Moved ${A.name} to page ${pb}, pocket ${b}`);
    try{
    await S.store.set(A.id,{...strip(A),page:pb,slot:b});
    if(B)await S.store.set(B.id,{...strip(B),page:pa,slot:a});
    }finally{txEnd()}
    const where=pa===pb?`pocket ${b}`:`page ${pb}, pocket ${b}`;
    flash(B?[`${pb}-${b}`,`${pa}-${a}`]:[`${pb}-${b}`]);renderBinder();
    setStatus(B?`Swapped ${A.name} and ${B.name}.`:`Moved ${A.name} to ${where}.`);
  }catch(e){setStatus("That move didn’t save. Try again.",true)}
}
bv.addEventListener("click",e=>{
  if(e.target.closest("[data-full]")){S.full=!S.full;renderBinder();const f=bv.querySelector("[data-full]");if(f)f.focus();return}
  const sc=e.target.closest("[data-scanpage]");
  if(sc){if(S.review.length)return;$("#pageNo").value=sc.dataset.scanpage;if(S.mode!=="binder"){S.mode="binder";document.querySelectorAll(".seg [data-mode]").forEach(x=>x.setAttribute("aria-pressed",x.dataset.mode==="binder"));$("#binderFields").classList.remove("hidden");$("#deckFields").classList.add("hidden")}$("#photo").click();show("scan");setStatus(`Choose a photo of ${binderName($("#binderNo").value)}, page ${sc.dataset.scanpage}.`);return}
  const ad=e.target.closest(".pocket.padd");
  if(ad&&!inReview()){pickForPocket(+ad.dataset.page,+ad.dataset.slot);return}
  const g=e.target.closest("[data-goto]");if(!g||g.disabled)return;
  if(g.dataset.turn&&g.closest(".spreadnav,.edge"))S.turn=g.dataset.turn;
  $("#pageNo").value=g.dataset.goto;renderBinder();
});
let wheelAcc=0,wheelLock=0;
bv.addEventListener("wheel",e=>{
  if(!bv.classList.contains("spread-on")||(drag&&inReview())||e.ctrlKey)return;
  const delta=Math.abs(e.deltaX)>Math.abs(e.deltaY)?e.deltaX:e.deltaY;
  const dir=delta>0?1:-1;const btn=bv.querySelector(`.spreadnav [data-step="${dir>0?"next":"prev"}"]`);if(!btn)return;
  if(btn.disabled||(dir>0&&+btn.dataset.goto>spreadInfo().total)){wheelAcc=0;return}
  e.preventDefault();
  const now=Date.now();if(now<wheelLock)return;
  wheelAcc+=e.deltaMode===1?delta*16:delta;
  if(Math.abs(wheelAcc)<60)return;
  wheelAcc=0;wheelLock=now+380;
  if(drag){turnDuring(btn.dataset.goto,dir>0?"next":"prev");return}
  S.turn=dir>0?"next":"prev";$("#pageNo").value=btn.dataset.goto;renderBinder();
},{passive:false});
bv.addEventListener("pointerdown",e=>{
  const p=e.target.closest(".pocket.drag");if(!p||e.button>0)return;
  drag={from:+p.dataset.slot,fromPage:+p.dataset.page||0,el:p,sx:e.clientX,sy:e.clientY,mx:e.clientX,my:e.clientY,t0:Date.now(),touch:e.pointerType!=="mouse",ghost:null,over:null};
  if(S.bselMode&&!inReview()){const c=cardAt(drag.from,drag.fromPage);if(c&&S.bsel.has(c.id)&&S.bsel.size>1)drag.group=[...S.bsel]}
  try{p.setPointerCapture(e.pointerId)}catch{}
});
// While dragging, holding the card over a page-turn arrow (or the binder's outer edge) turns the page, so cards can move between any pages.
function flipTarget(x,y,hit){
  if(inReview()||!bv.classList.contains("spread-on"))return null;
  let b=hit&&hit.closest("#binderView [data-step],#binderView .edge");
  if(!b){const sp=bv.querySelector(".spread");if(!sp)return null;const r=sp.getBoundingClientRect();if(y<r.top-30||y>r.bottom+30)return null;if(x<r.left+12)b=sp.querySelector(".edge.l");else if(x>r.right-12)b=sp.querySelector(".edge.r")}
  return b&&!b.disabled?b:null;
}
function armFlip(b){
  const key=b?b.dataset.goto+"|"+b.dataset.turn:null;
  if(drag.flipKey===key)return;
  clearTimeout(drag.flipT);bv.querySelectorAll(".arm").forEach(x=>x.classList.remove("arm"));drag.flipKey=key;
  if(!b)return;
  const goto=b.dataset.goto,turn=b.dataset.turn;
  [b,bv.querySelector(`.edge.${turn==="next"?"r":"l"}`),bv.querySelector(`.spreadnav [data-step="${turn}"]`)].forEach(x=>x&&x.classList.add("arm"));
  drag.flipT=setTimeout(()=>turnDuring(goto,turn),650);
}
function turnDuring(goto,turn){
  if(!drag)return;
  clearTimeout(drag.flipT);if(drag.over)drag.over.classList.remove("over");drag.over=null;drag.flipKey=null;
  S.turn=turn;$("#pageNo").value=goto;renderBinder();
  const src=bv.querySelector(`.pocket[data-page="${drag.fromPage}"][data-slot="${drag.from}"]`);if(src){drag.el=src;src.classList.add("lifted")}
  if(drag.group)bv.querySelectorAll(".pocket.picked").forEach(x=>x.classList.add("lifted"));
  if(drag.touch&&navigator.vibrate)navigator.vibrate(10);
  dragHover(drag.mx,drag.my);
}
function dragHover(x,y){
  if(!drag||!drag.ghost)return;
  const hit=document.elementFromPoint(x,y);
  const t=hit&&hit.closest("#binderView .pocket[data-slot]");const ok=t&&t!==drag.el?t:null;
  if(drag.over&&drag.over!==ok)drag.over.classList.remove("over");
  if(ok)ok.classList.add("over");drag.over=ok;
  armFlip(ok?null:flipTarget(x,y,hit));
}
document.addEventListener("pointermove",e=>{
  if(!drag)return;
  drag.mx=e.clientX;drag.my=e.clientY;
  if(!drag.ghost){
    if(Math.hypot(e.clientX-drag.sx,e.clientY-drag.sy)<(drag.touch?14:6))return;
    const r=drag.el.getBoundingClientRect();const g=drag.el.cloneNode(true);
    g.classList.add("ghost");g.style.width=r.width+"px";g.style.height=r.height+"px";
    if(drag.group){g.classList.add("gstack");g.insertAdjacentHTML("beforeend",`<b class="gcount">${drag.group.length}</b>`);bv.querySelectorAll(".pocket.picked").forEach(x=>x.classList.add("lifted"))}
    document.body.appendChild(g);drag.ghost=g;drag.dx=e.clientX-r.left;drag.dy=e.clientY-r.top;drag.el.classList.add("lifted");bv.classList.add("dragging");drag.lx=e.clientX;drag.tilt=0;
  }
  const vx=e.clientX-drag.lx;drag.lx=e.clientX;drag.tilt=Math.max(-12,Math.min(12,drag.tilt*.7+vx*.5));
  drag.ghost.style.transform=`translate(${e.clientX-drag.dx}px,${e.clientY-drag.dy}px) rotate(${drag.tilt.toFixed(1)}deg) scale(1.1)`;
  dragHover(e.clientX,e.clientY);
});
function openFromPocket(d){
  if(inReview())return;const c=cardAt(d.from,d.fromPage);if(!c)return;
  const swallow=ev=>{ev.stopPropagation();ev.preventDefault()};
  document.addEventListener("click",swallow,{capture:true,once:true});
  setTimeout(()=>document.removeEventListener("click",swallow,true),450);
  if(S.bselMode){toggleBSel(c.id);return}
  zoomCard(c,d.el,binderSeq());
}
// ---------- drop a picture file from the computer ----------
const hasFiles=e=>!!(e.dataTransfer&&[...(e.dataTransfer.types||[])].includes("Files"));
const imgFile=e=>{const fs=[...((e.dataTransfer&&e.dataTransfer.files)||[])];return fs.find(f=>/^image\//.test(f.type)||/\.(jpe?g|png|webp|heic|heif|gif)$/i.test(f.name))||null};
document.addEventListener("dragover",e=>{if(hasFiles(e)&&!e.defaultPrevented){e.preventDefault();e.dataTransfer.dropEffect="none"}});
document.addEventListener("drop",e=>{if(hasFiles(e))e.preventDefault()});
let fdropEl=null;const fdropClear=()=>{if(fdropEl)fdropEl.classList.remove("fdrop");fdropEl=null};
bv.addEventListener("dragover",e=>{
  if(!hasFiles(e)||inReview()||!S.assets)return;
  const p=e.target.closest(".pocket[data-page][data-slot]");if(!p){fdropClear();return}
  e.preventDefault();e.dataTransfer.dropEffect="copy";
  if(fdropEl!==p){fdropClear();fdropEl=p;p.classList.add("fdrop");p.dataset.fdtip=p.classList.contains("filled")?"Drop to replace the photo":"Drop to add a card from this photo"}
});
bv.addEventListener("dragleave",e=>{if(fdropEl&&!fdropEl.contains(e.relatedTarget))fdropClear()});
bv.addEventListener("drop",async e=>{
  if(!hasFiles(e))return;const p=e.target.closest(".pocket[data-page][data-slot]");fdropClear();if(!p||inReview()||!S.assets)return;
  e.preventDefault();const f=imgFile(e);if(!f){setStatus("That isn’t a picture. Drop a JPEG or PNG.",true);return}
  const pg=+p.dataset.page,sl=+p.dataset.slot;
  if(!p.classList.contains("filled")){addFromPhotoFile(f,{b:$("#binderNo").value,pg,slot:sl});return}
  const c=cardAt(sl,pg);if(!c)return;
  setStatus(`Saving the new photo of ${c.name}…`);
  try{await replacePicture(c,f);flash([`${pg}-${sl}`]);renderBinder();setStatus(`Replaced the photo of ${c.name}.`)}
  catch(err){setStatus("The photo didn’t save. Try a JPEG or PNG.",true)}
});
// ---------- multi-select, group move, page shifting ----------
S.bsel=new Set();S.bselMode=false;
function toggleBSel(id){if(S.bsel.has(id))S.bsel.delete(id);else S.bsel.add(id);renderBinder()}
function setBSelMode(on){S.bselMode=on;if(!on)S.bsel.clear();renderBinder()}
const LIN=(p,s)=>(p-1)*9+(s-1),POS=i=>[Math.floor(i/9)+1,i%9+1];
async function moveGroup(ids,tp,ts){
  if(!tp||!ts)return;
  const b=$("#binderNo").value;
  const inB=S.cards.filter(c=>c.locType==="binder"&&String(c.binder)===b);
  const sel=inB.filter(c=>ids.includes(c.id)&&+c.page&&+c.slot).sort((x,y)=>LIN(+x.page,+x.slot)-LIN(+y.page,+y.slot));
  if(!sel.length)return;
  const start=LIN(tp,ts);const dest=sel.map((_,i)=>start+i);
  const src=sel.map(c=>LIN(+c.page,+c.slot));
  if(dest.every((x,i)=>x===src[i]))return;
  const destSet=new Set(dest),selIds=new Set(sel.map(c=>c.id));
  const freed=[...new Set(src)].filter(x=>!destSet.has(x)).sort((a,z)=>a-z);
  const occ=[...new Set(dest)].map(x=>({x,cs:inB.filter(c=>!selIds.has(c.id)&&+c.page&&+c.slot&&LIN(+c.page,+c.slot)===x)})).filter(o=>o.cs.length);
  const moves=sel.map((c,i)=>({c,to:POS(dest[i])}));
  occ.forEach((o,i)=>o.cs.forEach(c=>moves.push({c,to:POS(freed[i])})));
  const [lp,ls]=POS(dest[dest.length-1]);
  const displaced=occ.reduce((a,o)=>a+o.cs.length,0);
  if(!(await askConfirm(`Move ${plural(sel.length,"card")}?`,`They go in order into page ${tp}, pocket ${ts}${sel.length>1?` through page ${lp}, pocket ${ls}`:""}.${displaced?` ${plural(displaced,"card")} already there ${displaced===1?"moves":"move"} into the pockets they leave.`:""} You can undo this afterwards.`,"Move cards",false)))return;
  const strip=({id,...r})=>r;
  txBegin(`Moved ${plural(sel.length,"card")} to page ${tp}, pocket ${ts}`);
  try{for(const m of moves)await S.store.set(m.c.id,{...strip(m.c),page:m.to[0],slot:m.to[1]})}
  catch(e){setStatus("The move didn’t fully save. Use Undo, then try again.",true)}
  finally{txEnd()}
  await growPages(b);
  flash(moves.map(m=>`${m.to[0]}-${m.to[1]}`));renderBinder();
  setStatus(`Moved ${plural(sel.length,"card")}${displaced?` and swapped ${plural(displaced,"card")} into their places`:""}.`);
}
async function growPages(b){
  const bd=S.binders[b];const set=bd&&+bd.pages;if(!set)return;
  const max=Math.max(0,...S.cards.filter(c=>c.locType==="binder"&&String(c.binder)===String(b)).map(c=>+c.page||0));
  if(max>set){const np=max+(max%2);await S.store.bset(b,{...bd,number:+b,pages:np})}
}
async function shiftPages(dir){
  const {b,cur}=spreadInfo();
  const cs=S.cards.filter(c=>c.locType==="binder"&&String(c.binder)===b&&+c.page>=cur);if(!cs.length)return;
  const last=Math.max(...cs.map(c=>+c.page));
  if(dir<0&&(cur<2||S.cards.some(c=>c.locType==="binder"&&String(c.binder)===b&&+c.page===cur-1))){setStatus(`Page ${cur-1} must be empty to move the pages back.`,true);return}
  const t=dir>0?`Insert an empty page at ${cur}?`:`Move pages ${cur} to ${last} back one page?`;
  const body=dir>0?`Pages ${cur} to ${last} (${plural(cs.length,"card")}) each move one page forward, so page ${cur} becomes page ${cur+1}, and page ${cur} is left empty. You can undo this afterwards.`:`Pages ${cur} to ${last} (${plural(cs.length,"card")}) each move one page back, so page ${cur} becomes page ${cur-1}. You can undo this afterwards.`;
  if(!(await askConfirm(t,body,dir>0?"Insert page":"Move pages back",false)))return;
  const strip=({id,...r})=>r;
  txBegin(dir>0?`Inserted an empty page at ${cur} in ${binderName(b)}`:`Moved pages ${cur}–${last} of ${binderName(b)} back one`);
  try{for(const c of cs)await S.store.set(c.id,{...strip(c),page:+c.page+dir})}
  catch(e){setStatus("The pages didn’t fully move. Use Undo, then try again.",true)}
  finally{txEnd()}
  await growPages(b);
  if(dir<0){S.turn="prev";$("#pageNo").value=cur-1}
  renderBinder();setStatus(dir>0?`Page ${cur} is now empty; the pages after it moved forward one.`:`Pages ${cur}–${last} moved back to ${cur-1}–${last-1}.`);
}
$("#pgFwd").onclick=()=>shiftPages(1);
$("#pgBack").onclick=()=>shiftPages(-1);
$("#bSelBtn").onclick=()=>setBSelMode(!S.bselMode);
$("#bselDone").onclick=()=>setBSelMode(false);
$("#bselClear").onclick=()=>{S.bsel.clear();renderBinder()};
$("#bselPage").onclick=()=>{const {b,cur}=spreadInfo();S.cards.filter(c=>c.locType==="binder"&&String(c.binder)===b&&+c.page===cur).forEach(c=>S.bsel.add(c.id));renderBinder()};
$("#bselMove").onclick=async()=>{
  const ids=[...S.bsel];if(!ids.length)return;const {b,cur}=spreadInfo();
  const v=await askBulk(`Move ${plural(ids.length,"card")}`,`<label>To page<input name="p" type="number" min="1" value="${cur}" inputmode="numeric"></label><label style="margin-top:10px">Starting at pocket<input name="s" type="number" min="1" max="9" value="1" inputmode="numeric"></label><p class="sub2" style="margin-top:8px">The selected cards go in order from that pocket on. Any cards already in those pockets swap into the places they leave.</p>`,"Next");
  if(!v)return;const p=Math.max(1,Math.round(+v.p||1)),s=Math.min(9,Math.max(1,Math.round(+v.s||1)));
  await moveGroup(ids,p,s);$("#pageNo").value=p;renderBinder();
};
function endDrag(cancel){
  if(!drag)return;const d=drag;drag=null;bv.classList.remove("dragging");
  clearTimeout(d.flipT);bv.querySelectorAll(".arm").forEach(x=>x.classList.remove("arm"));
  if(d.over)d.over.classList.remove("over");
  if(!d.ghost){if(!cancel)openFromPocket(d);return}
  const g=d.ghost;
  if(!cancel&&!d.over&&d.touch&&Math.hypot(d.mx-d.sx,d.my-d.sy)<28&&Date.now()-d.t0<450){g.remove();d.el.classList.remove("lifted");openFromPocket(d);return}
  const reduce=matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fly=(el,done)=>{
    if(reduce||!el.isConnected){done();return}
    const r=el.getBoundingClientRect();
    g.style.transition="transform .2s cubic-bezier(.2,.8,.2,1)";
    g.style.transform=`translate(${r.left}px,${r.top}px) rotate(0deg) scale(1)`;
    setTimeout(done,200);
  };
  if(cancel||!d.over){fly(d.el,()=>{g.remove();bv.querySelectorAll(".lifted").forEach(x=>x.classList.remove("lifted"))});return}
  const to=d.over;
  fly(to,()=>{g.remove();bv.querySelectorAll(".lifted").forEach(x=>x.classList.remove("lifted"));if(d.group)moveGroup(d.group,+to.dataset.page||0,+to.dataset.slot);else moveSlot(d.from,+to.dataset.slot,d.fromPage,+to.dataset.page||0)});
}
document.addEventListener("pointerup",()=>endDrag(false));
bv.addEventListener("contextmenu",e=>{if(e.target.closest(".pocket.drag"))e.preventDefault()});
document.addEventListener("pointercancel",()=>endDrag(true));
bv.addEventListener("keydown",e=>{
  const ad=e.target.closest(".pocket.padd");if(ad&&(e.key==="Enter"||e.key===" ")&&!inReview()){e.preventDefault();pickForPocket(+ad.dataset.page,+ad.dataset.slot);return}
  const p=e.target.closest(".pocket.drag");if(!p)return;
  const n=+p.dataset.slot,pg=+p.dataset.page||0;
  if((e.key==="Enter"||(e.key===" "&&S.bselMode))&&!inReview()){e.preventDefault();const c=cardAt(n,pg);if(!c)return;if(S.bselMode){toggleBSel(c.id);setTimeout(()=>{const q=bv.querySelector(`[data-page="${pg}"][data-slot="${n}"]`);if(q)q.focus()},0)}else zoomCard(c,p,binderSeq());return}
  const d={ArrowLeft:-1,ArrowRight:1,ArrowUp:-3,ArrowDown:3}[e.key];if(!d)return;
  const to=n+d;if(to<1||to>9||(d===1&&n%3===0)||(d===-1&&n%3===1))return;
  e.preventDefault();moveSlot(n,to,pg,pg).then(()=>setTimeout(()=>{const q=bv.querySelector(pg?`[data-page="${pg}"][data-slot="${to}"]`:`[data-slot="${to}"]`);if(q)q.focus()},150));
});

buildShell();
render();
initStore();
$("#homeGrid").addEventListener("click",e=>{
  const o=e.target.closest("[data-hopen]");if(o){openBinder(+o.dataset.hopen);return}
  if(e.target.closest("[data-hfill]")){show("collection");if(!bulkCtl)bulkFill()}
});

// ---------- showcase (ultra rares in transparent cases) ----------
const SC_HOLDER=window.PK_HOLDER;
const scStatOpen=new Set();
let scSort="manual";try{scSort=localStorage.getItem("pk-scsort")||"manual"}catch{}
const scNum=c=>parseInt(String(c.number||"").split("/")[0],10)||1e9;
const SC_SORTS={
  name:(a,b)=>String(a.name).localeCompare(b.name),
  "val-desc":(a,b)=>(unitVal(b)??-1)-(unitVal(a)??-1),
  "val-asc":(a,b)=>(unitVal(a)??1e9)-(unitVal(b)??1e9),
  "rar-desc":(a,b)=>rarRank(b.rarity)-rarRank(a.rarity),
  "rar-asc":(a,b)=>rarRank(a.rarity)-rarRank(b.rarity),
  set:(a,b)=>String(a.set||a.setCode||"~").localeCompare(String(b.set||b.setCode||"~"))||scNum(a)-scNum(b),
  dex:(a,b)=>(dexOf(a)||1e9)-(dexOf(b)||1e9),
  "new":(a,b)=>String(b.added||"").localeCompare(String(a.added||"")),
  old:(a,b)=>String(a.added||"").localeCompare(String(b.added||""))
};
function scSorted(k){const l=scCards(k),f=SC_SORTS[scSort];return f?l.sort((a,b)=>f(a,b)||String(a.name).localeCompare(b.name)):l}
function scMetaCases(){return S.scMeta&&Array.isArray(S.scMeta.cases)?S.scMeta.cases:[]}
function scCaseNames(){
  const seen=new Set(),out=[];
  for(const n of scMetaCases())if(!seen.has(n)){seen.add(n);out.push(n)}
  const extra=[...new Set(S.cards.filter(c=>c.locType==="showcase").map(c=>c.deck||"Showcase"))].filter(n=>!seen.has(n)).sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));
  return out.concat(extra);
}
function scCards(name){return S.cards.filter(c=>c.locType==="showcase"&&(c.deck||"Showcase")===name).sort((a,b)=>((a.slot==null?1e9:+a.slot)-(b.slot==null?1e9:+b.slot))||String(a.name).localeCompare(b.name))}
async function scSaveMeta(cases){S.scMeta={...(S.scMeta||{}),cases};try{if(S.raw&&S.raw.smeta)await S.raw.smeta(S.scMeta)}catch{}renderShowcase()}
const nbars=rows=>{const max=Math.max(1,...rows.map(r=>r.v));return `<div class="vbars">${rows.map(r=>`<div class="vbar"><span>${r.l}</span><span class="btr"><i style="width:${Math.max(3,r.v/max*100)}%"></i></span><b>${r.v}</b></div>`).join("")}</div>`};
function scStats(list){
  const q=c=>+c.qty||1;let n=0,val=0,top=null;const ty={},rar={},vr={},st={};
  for(const c of list){
    const k=q(c);n+=k;const u=unitVal(c);if(u!=null){val+=u*k;if(!top||u>top.u)top={c,u}}
    const d=c.details;const sup=String(d&&d.supertype||"").toLowerCase();
    const t=!d?"No details":sup.startsWith("trainer")?"Trainer":sup.startsWith("energy")?"Energy":((d.types||[])[0]||"Colorless");ty[t]=(ty[t]||0)+k;
    const r=c.rarity||"Not set";rar[r]=(rar[r]||0)+k;
    const v=c.variant||"Normal";vr[v]=(vr[v]||0)+k;
    const s2=c.set||c.setCode||"Unknown";st[s2]=(st[s2]||0)+k;
  }
  if(!list.length)return `<p class="sub2">No cards in this showcase yet.</p>`;
  const tyOrder=[...ETYPES,"Trainer","Energy","No details"];
  const tyRows=tyOrder.filter(t=>ty[t]).map(t=>({l:(ETYPES.includes(t)?en(t)+" ":"")+esc(t),v:ty[t]}));
  const rarRows=Object.keys(rar).sort((a,b)=>rarRank(b)-rarRank(a)||a.localeCompare(b)).map(r=>({l:r==="Not set"?"Not set":rarHtml(r),v:rar[r]}));
  const vrRows=Object.entries(vr).sort((a,b)=>b[1]-a[1]).map(([k,v])=>({l:esc(k),v}));
  const stRows=Object.entries(st).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([k,v])=>({l:esc(k),v}));
  return `<div class="bstats four"><div><b>${n}</b><small>cards in total</small></div><div><b>${list.length}</b><small>different cards</small></div><div><b>${eur(val)}</b><small>estimated value</small></div><div><b>${n?eur(val/n):"—"}</b><small>average per card</small></div></div>
  ${top?`<p class="vnote">Most valuable: ${esc(top.c.name)}, ${eur(top.u)}</p>`:""}
  <div class="scbk"><div><h4>By type</h4>${nbars(tyRows)}</div><div><h4>By rarity</h4>${nbars(rarRows)}</div><div><h4>By variant</h4>${nbars(vrRows)}</div><div><h4>By set</h4>${nbars(stRows)}</div></div>`;
}
function scTile(c){
  const src=imgSrc(c),u=unitVal(c),q=+c.qty||1;
  return `<div role="button" tabindex="0" class="sctile" draggable="true" data-scid="${esc(c.id)}"><span class="scase"><span class="scwin">${src?`<img alt="" draggable="false" loading="lazy" src="${esc(src)}">`:""}</span><img class="scholder" alt="" draggable="false" src="${SC_HOLDER}"></span><span class="scprice${u==null?" none":""}">${u==null?"No price":eur(u)+(q>1?` × ${q} = ${eur(u*q)}`:"")}</span><b>${esc(c.name)}</b><small>${esc([c.set||c.setCode,c.number].filter(Boolean).join(" · "))}</small><small>${esc([c.rarity,c.variant&&c.variant!=="Normal"?c.variant:"",q>1?"×"+q:""].filter(Boolean).join(" · "))}</small></div>`;
}
var scReady=false;
function renderShowcase(){if(!scReady)return;renderShowcase0();if(typeof scpRefresh==="function")scpRefresh()}
function renderShowcase0(){
  const box=$("#scList");if(!box)return;
  const names=scCaseNames();
  const newCase=`<div class="scgrid scnewrow"><button type="button" class="v2new" data-scnewcase><span class="frame" aria-hidden="true">+</span><b>New showcase</b></button></div>`;
  if(!names.length){box.innerHTML=`<p class="sub2">No showcases yet.</p>`+newCase;return}
  const all=S.cards.filter(c=>c.locType==="showcase");
  const tot=all.reduce((a,c)=>a+(+c.qty||1),0);const val=all.reduce((a,c)=>{const u=unitVal(c);return a+(u==null?0:u*(+c.qty||1))},0);
  const seq=[];
  const sum=`<div class="bstats four"><div><b>${names.length}</b><small>showcases</small></div><div><b>${tot}</b><small>cards in showcases</small></div><div><b>${eur(val)}</b><small>estimated value</small></div><div><b>${tot?eur(val/tot):"—"}</b><small>average per card</small></div></div>`;
  box.innerHTML=sum+names.map(k=>{
    const list=scSorted(k);list.forEach(c=>seq.push(c.id));
    const n=list.reduce((a,c)=>a+(+c.qty||1),0);const v=list.reduce((a,c)=>{const u=unitVal(c);return a+(u==null?0:u*(+c.qty||1))},0);
    return `<section class="sccase" data-case="${esc(k)}"><div class="schd"><h3>${esc(k)}</h3><span>${plural(n,"card")}${v?` · ${eur(v)}`:""}</span><span class="scacts"><button type="button" class="scmv" data-scup="${esc(k)}" aria-label="Move showcase up" title="Move showcase up"${names.indexOf(k)===0?" disabled":""}>▲</button><button type="button" class="scmv" data-scdown="${esc(k)}" aria-label="Move showcase down" title="Move showcase down"${names.indexOf(k)===names.length-1?" disabled":""}>▼</button><button type="button" class="linkbtn" data-scren="${esc(k)}">Rename</button><button type="button" class="linkbtn" data-scstat="${esc(k)}" aria-expanded="${scStatOpen.has(k)}">Statistics</button>${list.length?"":`<button type="button" class="linkbtn" data-scdel="${esc(k)}">Delete</button>`}</span></div>${scStatOpen.has(k)?`<div class="scstats">${scStats(list)}</div>`:""}<div class="scgrid" data-case="${esc(k)}">${list.map(scTile).join("")}<div class="sctile scblank"><button type="button" class="v2new" data-scaddto="${esc(k)}"><span class="frame" aria-hidden="true">+</span><b>Add new card</b></button></div></div></section>`;
  }).join("")+newCase;
  box.dataset.seq=JSON.stringify(seq);
  const ap=$("#scApply");if(ap)ap.classList.toggle("hidden",scSort==="manual");
}
const SC={sel:null,list:[],shown:60,built:false};
function scBuild(){
  if(SC.built)return;SC.built=true;
  const d=document.createElement("dialog");d.id="scDlg";d.className="scdlg";
  d.innerHTML=`<h3>Add card to showcase</h3>
  <div class="scfields"><label class="wide">Showcase name<input id="scCase" list="scCaseList" placeholder="e.g. Showcase 1"><datalist id="scCaseList"></datalist></label></div>
  <div class="seg" role="group" aria-label="How to add"><button type="button" data-scm="search" aria-pressed="true">Search TCGdex</button><button type="button" data-scm="manual" aria-pressed="false">Enter manually</button></div>
  <div id="scSearch">
    <div class="scsr"><label>Card name<input id="scQ" placeholder="e.g. Charizard ex"></label><label>Set code or number (optional)<input id="scQ2" placeholder="e.g. OBF or 125"></label><button type="button" class="btn" id="scGo">Search</button></div>
    <p class="status" id="scSt"></p><div class="scres" id="scRes"></div>
    <div id="scPick" hidden></div>
  </div>
  <div id="scManual" hidden>
    <div class="scfields">
      <label>Name<input id="mName"></label><label>Set<input id="mSet" placeholder="e.g. Obsidian Flames"></label><label>Set code<input id="mCode" placeholder="e.g. OBF" autocapitalize="characters"></label>
      <label>Number<input id="mNum" placeholder="e.g. 125/197"></label><label>Rarity<input id="mRar" list="scRarList" placeholder="e.g. Ultra Rare"><datalist id="scRarList"></datalist></label>
      <label>Variant<select id="mVar">${varOpts()}</select></label>
      <label>Copies<input id="mQty" type="number" min="1" value="1"></label>
      <label>Condition<select id="mCond">${condOpts()}</select></label>
      <label class="wide">Notes<textarea id="mNotes" rows="2"></textarea></label>
    </div>
    <p class="sub2">If the set code and number match a card on TCGdex, its details, artwork and price are filled in automatically.</p>
    <div class="foot"><button type="button" class="btn" id="mAdd">Add to showcase</button></div>
  </div>
  <div class="foot"><button type="button" class="btn ghost" id="scClose">Close</button></div>
  <p class="status" id="scMsg" role="status"></p>`;
  document.body.appendChild(d);
  d.addEventListener("click",e=>{if(e.target===d)d.close()});
  $("#scClose").onclick=()=>d.close();
  d.querySelectorAll("[data-scm]").forEach(b=>b.onclick=()=>{d.querySelectorAll("[data-scm]").forEach(x=>x.setAttribute("aria-pressed",x===b));$("#scSearch").hidden=b.dataset.scm!=="search";$("#scManual").hidden=b.dataset.scm!=="manual"});
  $("#scGo").onclick=scSearch;
  for(const id of ["#scQ","#scQ2"])$(id).addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();scSearch()}});
  $("#scRes").addEventListener("click",e=>{const b=e.target.closest("[data-scix]");if(b)scPick(SC.list[+b.dataset.scix]);const m=e.target.closest("[data-scmore]");if(m){SC.shown+=60;scShow()}});
  $("#scPick").addEventListener("click",async e=>{
    if(e.target.closest("[data-scback]")){$("#scPick").hidden=true;$("#scRes").hidden=false;return}
    if(e.target.closest("[data-scadd]"))await scAddPicked(e.target.closest("[data-scadd]"));
  });
  $("#mAdd").onclick=scAddManual;
}
function scCaseName(){return ($("#scCase").value||"").trim()||"Showcase"}
function scMsg(t,bad){const m=$("#scMsg");m.textContent=t;m.style.color=bad?"var(--danger,#b3261e)":""}
function scOpen(k){
  const cases=scCaseNames();const name=(typeof k==="string"&&k)?k:(cases[cases.length-1]||"Showcase 1");
  openAdd({locType:"showcase",deck:name,title:`Add card to ${name}`});
}
async function scSearch(){
  const q=$("#scQ").value.trim(),q2=$("#scQ2").value.trim(),st=$("#scSt");
  $("#scPick").hidden=true;$("#scRes").hidden=false;
  if(q.replace(/[^a-z]/gi,"").length<2){st.textContent="Type at least two letters of the card name.";return}
  st.textContent="Searching TCGdex…";$("#scRes").innerHTML="";
  let list;try{list=await PKL.tget("/cards?name="+encodeURIComponent(q))}catch{st.textContent="Couldn’t reach TCGdex. Check your internet connection.";return}
  const out=[];
  for(const x of list||[]){
    const sid=x.id.slice(0,x.id.length-String(x.localId).length-1);const r=PKL.setRow(sid);if(!r)continue;
    if(q2){const u=q2.toUpperCase();const numq=/^\d+$/.test(q2);
      if(numq){if(parseInt(x.localId,10)!==parseInt(q2,10))continue}
      else if(!(String(r[2]).split(":")[0]===u||sid.toUpperCase()===u||String(r[1]).toUpperCase().includes(u)))continue}
    out.push({...x,sid,row:r});
  }
  out.sort((a,b)=>String(b.row[6]||"").localeCompare(String(a.row[6]||""))||String(a.localId).localeCompare(String(b.localId),undefined,{numeric:true}));
  SC.list=out;SC.shown=60;
  st.textContent=out.length?`${plural(out.length,"result")}. Pick the card you own.`:"No matching cards found. Check the spelling or use Enter manually.";
  scShow();
}
function scShow(){
  $("#scRes").innerHTML=SC.list.slice(0,SC.shown).map((x,i)=>`<button type="button" class="sctile" data-scix="${i}"><span class="scimg">${x.image?`<img alt="" loading="lazy" src="${esc(x.image)}/low.webp">`:""}</span><b>${esc(x.name)}</b><small>${esc(x.row[1])} · ${esc(x.localId)}/${esc(x.row[3])}</small></button>`).join("")+(SC.list.length>SC.shown?`<button type="button" class="btn ghost" data-scmore>Show more</button>`:"");
}
const SC_PLAIN=/^(common|uncommon|rare)$/i;
async function scPick(x){
  const pk=$("#scPick");pk.hidden=false;$("#scRes").hidden=true;pk.innerHTML=`<p class="sub2">Loading card…</p>`;
  let f;try{f=await PKL.cardById(x.id)}catch{pk.innerHTML=`<p class="sub2">Couldn’t load that card. <button type="button" class="linkbtn" data-scback>Back to results</button></p>`;return}
  SC.sel=f;const r=x.row;const rar=f.rarity&&f.rarity!=="None"?f.rarity:"";const pr=PKL.priceOf(f);
  const defVar=SC_PLAIN.test(rar)||!rar?"Normal":"Holo";
  pk.innerHTML=`<div class="scpick"><div>${f.image?`<img alt="" src="${esc(f.image)}/high.webp">`:""}</div><div>
    <h3 style="margin:0">${esc(f.name)}</h3><p class="sub2" style="margin:2px 0 10px">${esc(r[1])} · ${esc(f.localId)}/${esc(r[3])}${rar?` · ${esc(rar)}`:""}${pr&&pr.trend!=null?` · Cardmarket ≈ €${(+pr.trend).toFixed(2)}`:""}</p>
    <div class="scfields"><label>Variant<select id="pVar">${varOpts(defVar)}</select></label>
    <label>Copies<input id="pQty" type="number" min="1" value="1"></label>
    <label>Condition<select id="pCond">${condOpts()}</select></label></div>
    <div class="foot"><button type="button" class="btn" data-scadd>Add to showcase</button><button type="button" class="btn ghost" data-scback>Back to results</button></div></div></div>`;
}
async function scStore(card,label){
  card.locType="showcase";card.deck=scCaseName();card.binder=null;card.page=null;card.slot=Math.max(0,...scCards(card.deck).map(c=>+c.slot||0))+1;
  card.added=new Date().toISOString();card.img=card.img||null;card.pic=card.pic||null;card.official=card.official||null;
  txBegin(label);try{await S.store.add(card)}finally{txEnd()}
}
async function scAddPicked(btn){
  const f=SC.sel;if(!f)return;btn.disabled=true;scMsg("Adding…");
  try{
    const sid=f.set.id,r=PKL.setRow(sid);const rar=f.rarity&&f.rarity!=="None"?f.rarity:"";
    const card={name:f.name,set:f.set.name,setCode:r?String(r[2]).split(":")[0]:"",series:r?r[5]:"",number:`${f.localId}/${String(r?r[3]:f.set.cardCount.official).padStart(String(f.localId).length,"0")}`,rarity:rar,variant:$("#pVar").value,qty:+$("#pQty").value||1,condition:$("#pCond").value,notes:""};
    await PKL.enrich(card,{tcg:f,forceArt:true});
    await scStore(card,`Added ${card.name} to showcase ${scCaseName()}`);
    scMsg(`Added ${card.name} to ${scCaseName()}.`);$("#scPick").hidden=true;$("#scRes").hidden=false;
  }catch(e){scMsg("Couldn’t add that card. Try again.",true)}
  btn.disabled=false;
}
async function scAddManual(){
  const name=$("#mName").value.trim();if(!name){scMsg("Enter the card name.",true);return}
  const b=$("#mAdd");b.disabled=true;scMsg("Adding…");
  try{
    const card={name,set:$("#mSet").value.trim(),setCode:$("#mCode").value.trim().toUpperCase(),number:$("#mNum").value.trim(),rarity:$("#mRar").value.trim(),variant:$("#mVar").value,qty:+$("#mQty").value||1,condition:$("#mCond").value,notes:$("#mNotes").value.trim()};
    try{await PKL.enrich(card,{forceArt:true})}catch{}
    await scStore(card,`Added ${card.name} to showcase ${scCaseName()} by hand`);
    scMsg(`Added ${card.name} to ${scCaseName()}${card.tcgdexId?" (matched on TCGdex)":""}.`);
    for(const id of ["#mName","#mSet","#mCode","#mNum","#mRar","#mNotes"])$(id).value="";$("#mQty").value=1;
  }catch(e){scMsg("Couldn’t add that card. Try again.",true)}
  b.disabled=false;
}
$("#scList").addEventListener("click",e=>{const b=e.target.closest("[data-scid]");if(!b)return;const c=S.cards.find(x=>x.id===b.dataset.scid);if(!c)return;let seq=[];try{seq=JSON.parse($("#scList").dataset.seq||"[]")}catch{}zoomCard(c,b,seq)});

// showcase: rename, new, statistics, drag and drop
async function scRename(old){
  const v=await askBulk("Edit showcase",`<label>Name<input name="n" value="${esc(old)}" maxlength="60"></label>`,"Save");
  const nn=v&&String(v.n||"").trim();if(!nn||nn===old)return;
  const names=scCaseNames();const merge=names.includes(nn);
  if(merge&&!(await askConfirm(`“${nn}” already exists`,"The cards from both showcases will be combined.","Combine",false)))return;
  const strip=({id,...r})=>r;const cs=scCards(old);
  txBegin(`Renamed showcase ${old} to ${nn}`);
  try{let slot=merge?Math.max(0,...scCards(nn).map(c=>+c.slot||0)):0;for(const c of cs)await S.store.set(c.id,{...strip(c),deck:nn,slot:merge?++slot:c.slot})}finally{txEnd()}
  await scSaveMeta(names.map(n=>n===old?nn:n).filter((n,i,a)=>a.indexOf(n)===i));
}
async function scNew(){
  const names=scCaseNames();let i=names.length+1;while(names.includes("Showcase "+i))i++;
  const v=await askBulk("New showcase",`<label>Name<input name="n" value="Showcase ${i}" maxlength="60"></label>`,"Create");
  const nn=v&&String(v.n||"").trim();if(!nn||names.includes(nn))return;
  await scSaveMeta([...names,nn]);logAct(`Created showcase ${nn}`);
}
async function scDrop(id,caseName,beforeId,after){
  const c=S.cards.find(x=>x.id===id);if(!c)return;
  const from=c.deck||"Showcase";const list=scCards(caseName).filter(x=>x.id!==id);
  let idx=list.length;if(beforeId){const i=list.findIndex(x=>x.id===beforeId);if(i>=0)idx=after?i+1:i}
  const prev=scCards(caseName).map(x=>x.id).join();list.splice(idx,0,c);
  if(from===caseName&&list.map(x=>x.id).join()===prev)return;
  const strip=({id,...r})=>r;
  txBegin(from===caseName?`Reordered ${c.name} in ${caseName}`:`Moved ${c.name} from ${from} to ${caseName}`);
  try{for(let i=0;i<list.length;i++){const x=list[i];if(x.id===id||(+x.slot||0)!==i+1)await S.store.set(x.id,{...strip(x),deck:caseName,slot:i+1,locType:"showcase"})}}finally{txEnd()}
  if(!scMetaCases().includes(caseName)&&scMetaCases().length)await scSaveMeta(scCaseNames());
}
let scDrag=null;
const scClear=()=>document.querySelectorAll("#scList .ins-b,#scList .ins-a,#scList .dropover").forEach(e=>e.classList.remove("ins-b","ins-a","dropover"));
$("#scNew").addEventListener("click",scNew);
$("#scSort").value=SC_SORTS[scSort]?scSort:"manual";if(!SC_SORTS[scSort])scSort="manual";
$("#scSort").addEventListener("change",e=>{scSort=e.target.value;try{localStorage.setItem("pk-scsort",scSort)}catch{}renderShowcase()});
$("#scApply").addEventListener("click",async()=>{
  const strip=({id,...r})=>r;txBegin("Saved the showcase card order");
  try{for(const k of scCaseNames()){const l=scSorted(k);for(let i=0;i<l.length;i++)if((+l[i].slot||0)!==i+1)await S.store.set(l[i].id,{...strip(l[i]),slot:i+1})}}finally{txEnd()}
  scSort="manual";$("#scSort").value="manual";try{localStorage.setItem("pk-scsort","manual")}catch{}renderShowcase();
});
$("#scList").addEventListener("click",async e=>{
  if(e.target.closest("[data-scnewcase]")){$("#scNew").click();return}
  const ad=e.target.closest("[data-scaddto]");if(ad){scOpen(ad.dataset.scaddto);return}
  const rn=e.target.closest("[data-scren]");if(rn){await scRename(rn.dataset.scren);return}
  const st=e.target.closest("[data-scstat]");if(st){const k=st.dataset.scstat;if(scStatOpen.has(k))scStatOpen.delete(k);else scStatOpen.add(k);renderShowcase();return}
  const mv=e.target.closest("[data-scup],[data-scdown]");if(mv&&!mv.disabled){const k=mv.dataset.scup||mv.dataset.scdown,d=mv.dataset.scup?-1:1,n=scCaseNames(),i=n.indexOf(k),j=i+d;if(i>-1&&j>=0&&j<n.length){[n[i],n[j]]=[n[j],n[i]];await scSaveMeta(n);logAct(`Moved showcase ${k} ${d<0?"up":"down"}`)}return}
  const dl=e.target.closest("[data-scdel]");if(dl){const k=dl.dataset.scdel;if(await askConfirm(`Delete ${k}?`,"This empty showcase is removed.","Delete")){await scSaveMeta(scCaseNames().filter(n=>n!==k));logAct(`Deleted showcase ${k}`)}}
});
$("#scList").addEventListener("keydown",e=>{if(e.key==="Enter"&&e.target.matches&&e.target.matches(".sctile[data-scid],.scblank"))e.target.click()});
$("#scList").addEventListener("dragstart",e=>{const t=e.target.closest&&e.target.closest(".sctile[data-scid]");if(!t)return;scDrag=t.dataset.scid;e.dataTransfer.effectAllowed="move";try{e.dataTransfer.setData("text/plain",scDrag)}catch{}requestAnimationFrame(()=>t.classList.add("dragging"))});
$("#scList").addEventListener("dragend",()=>{scDrag=null;scClear();document.querySelectorAll("#scList .dragging").forEach(e=>e.classList.remove("dragging"))});
$("#scList").addEventListener("dragover",e=>{if(!scDrag)return;const grid=e.target.closest(".scgrid");if(!grid)return;const sc=S.cards.find(x=>x.id===scDrag);const sameCase=sc&&(sc.deck||"Showcase")===grid.dataset.case;if(scSort!=="manual"&&sameCase)return;e.preventDefault();e.dataTransfer.dropEffect="move";scClear();const t=scSort==="manual"?e.target.closest(".sctile[data-scid]"):null;if(t&&t.dataset.scid!==scDrag){const r=t.getBoundingClientRect();t.classList.add(e.clientX<r.left+r.width/2?"ins-b":"ins-a")}else if(!t)grid.classList.add("dropover")});
$("#scList").addEventListener("drop",async e=>{if(!scDrag)return;const grid=e.target.closest(".scgrid");if(!grid)return;e.preventDefault();const t=scSort==="manual"?e.target.closest(".sctile[data-scid]"):null;let before=null,after=false;if(t&&t.dataset.scid!==scDrag){const r=t.getBoundingClientRect();before=t.dataset.scid;after=e.clientX>=r.left+r.width/2}const id=scDrag;scDrag=null;scClear();await scDrop(id,grid.dataset.case,before,after)});
const SCPCSS=`
:host{display:block;color:var(--ink);font:inherit;line-height:1.45}
*,*::before,*::after{box-sizing:border-box}
button,input,select,textarea{font:inherit;color:inherit}
[hidden]{display:none!important}
.vh{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
.page{max-width:none;margin:0}
h1{margin:0 0 2px;font-size:1.7rem;letter-spacing:-.02em}
.grow{flex:1;min-width:0}.sub{color:var(--muted);margin:0}
.cardimg{width:100%;height:100%;display:block;border-radius:3.5% / 2.6%;object-fit:cover;box-shadow:0 1px 3px rgba(0,0,0,.4);background:#222}
.ph{width:100%;height:100%;border-radius:3.5% / 2.6%;display:grid;place-content:center;gap:4px;text-align:center;padding:8%;background:linear-gradient(160deg,#59607f,#2b3050);color:#fff;font-size:.8rem}
.ph b{font-size:.95rem}.ph small{opacity:.75}
.artw{width:100%;height:100%;position:relative}
.hl{position:absolute;inset:6.5%;border-radius:3.5% / 2.6%;pointer-events:none;background:conic-gradient(from calc(var(--gx,30%) * 3) at 50% 50%,#ff6ec7,#ffd36e,#6effb0,#6ec9ff,#c36eff,#ff6ec7);mix-blend-mode:color-dodge;opacity:.2}
.grow{flex:1;min-width:0}
.btn{font-weight:650;border:0;border-radius:10px;padding:9px 14px;cursor:pointer;background:var(--accent);color:var(--accent-ink);display:inline-flex;gap:6px;align-items:center;white-space:nowrap}
.btn.ghost{background:var(--sheet);color:var(--ink);border:1px solid var(--line)}
.btn.ghost:hover{background:var(--pocket)}
.btn.danger{background:var(--sheet);color:var(--danger);border:1px solid color-mix(in srgb,var(--danger) 45%,var(--line))}
.btn.sm{padding:5px 10px;font-size:.85rem;border-radius:8px}
.ib{width:36px;height:36px;border-radius:10px;border:1px solid var(--line);background:var(--sheet);cursor:pointer;display:grid;place-items:center;flex:none}
.ib:hover{background:var(--pocket)}
.ib svg{width:18px;height:18px}
:is(.btn,.ib,.chip,.tile,.seg button):focus-visible{outline:2px solid var(--brand);outline-offset:2px}
.sub{color:var(--muted);margin:0}
.head{display:flex;gap:12px;align-items:flex-end;flex-wrap:wrap;margin-bottom:14px}
.card{background:var(--sheet);border:1px solid var(--line);border-radius:var(--radius);box-shadow:var(--shadow)}
.seg{display:flex;background:var(--pocket);border-radius:11px;padding:3px;gap:2px}
.seg button{border:0;background:none;padding:6px 12px;border-radius:8px;font-weight:700;color:var(--muted);cursor:pointer;font-size:.85rem}
.seg button[aria-pressed="true"]{background:var(--sheet);color:var(--ink);box-shadow:0 1px 3px rgba(0,0,0,.12)}
input[type=search]{border:1px solid var(--line);border-radius:10px;padding:8px 11px;background:var(--sheet);min-width:150px;max-width:230px;width:100%}
select{border:1px solid var(--line);border-radius:10px;padding:8px 10px;background:var(--sheet)}
input:focus,select:focus{outline:2px solid color-mix(in srgb,var(--brand) 45%,transparent);border-color:var(--brand)}
/* KPI strip */
.kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:12px}
@media(max-width:700px){.kpis{grid-template-columns:repeat(2,minmax(0,1fr))}}
.kpi{padding:10px 14px;min-width:0}
.kpi b{display:block;font-size:1.35rem;letter-spacing:-.01em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.kpi small{color:var(--muted);display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
/* shelf of cases */
.shelfbar{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:8px}
.shelf{display:flex;gap:10px;overflow:auto;padding:2px 2px 8px;margin-bottom:12px}
.chip{flex:none;display:flex;gap:10px;align-items:center;padding:8px 14px 8px 8px;background:var(--sheet);border:1px solid var(--line);border-radius:12px;cursor:pointer;text-align:left;box-sizing:border-box;height:70px;width:250px}
.chip[aria-pressed="true"]{border-color:var(--accent);box-shadow:0 0 0 2px color-mix(in srgb,var(--accent) 45%,transparent)}
.chip.dropover{border-color:var(--brand);box-shadow:0 0 0 2px color-mix(in srgb,var(--brand) 45%,transparent)}
.chip b{display:block;line-height:1.2}.chip>span:last-child{min-width:0;flex:1}.chip b{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.chip small{color:var(--muted);font-size:.78rem}
.chip.new{border-style:dashed;color:var(--muted);align-items:center;justify-content:center;width:160px;height:70px;box-sizing:border-box;font-weight:700;white-space:nowrap}
.stack{width:38px;height:52px;position:relative;flex:none}
.stack i{position:absolute;inset:0;border-radius:4px;border:1px solid rgba(255,255,255,.55);box-shadow:0 2px 4px rgba(0,0,0,.25)}
.stack i:nth-child(1){transform:translate(-4px,2px) rotate(-6deg)}
.stack i:nth-child(3){transform:translate(4px,0) rotate(6deg)}
/* layout */
.layout{display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:16px;align-items:start}
@media(max-width:1100px){.layout{grid-template-columns:minmax(0,1fr)}.side{position:static!important}}
.side{position:sticky;top:12px;display:grid;gap:12px}
.main{padding:14px;min-width:0}
.tb{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:12px}
.size{display:inline-flex;gap:8px;align-items:center;color:var(--muted);font-size:.85rem}
.size input{width:130px;accent-color:var(--brand)}
/* stage */
.stage{border-radius:12px;padding:6px 14px 14px;--bd:radial-gradient(120% 90% at 50% 0,#2a3263 0,#141936 70%);--ledge:rgba(255,255,255,.14);--tx:#fff;--tm:#aab2d8;background:var(--bd)}
.stage[data-bd="light"]{--bd:linear-gradient(#eef0f6,#e2e5ef);--ledge:rgba(0,0,0,.12);--tx:#12172b;--tm:#5d6585}
.stage[data-bd="wood"]{--bd:repeating-linear-gradient(90deg,#5a3d28 0 90px,#52361f 90px 92px,#5e4129 92px 190px);--ledge:rgba(0,0,0,.35);--tx:#fff;--tm:#e3cfb9}
.sec{margin-top:10px}
.sh{display:flex;gap:10px;align-items:center;flex-wrap:wrap;padding:8px 0;color:var(--tx)}
.sh h3{margin:0;font-size:1.1rem}
.sh .m{color:var(--tm);font-size:.88rem}
.sh .acts{margin-left:auto;display:flex;gap:6px}
.sh .lk{background:rgba(255,255,255,.12);border:0;color:var(--tx);border-radius:8px;padding:4px 10px;cursor:pointer;font-size:.82rem;font-weight:650}
.stage[data-bd="light"] .sh .lk{background:rgba(0,0,0,.07)}
.sh .lk:hover{background:rgba(255,255,255,.22)}.sh .acts .lk,.sh .acts .lk{height:34px;padding:0 12px;font-size:.9rem}
.row{display:grid;grid-template-columns:repeat(auto-fill,minmax(var(--w),1fr));gap:26px 18px;padding:6px 4px 0}
/* tile + transparent case */
.tile{position:relative;display:flex;flex-direction:column;align-items:center;gap:6px;cursor:pointer;color:var(--tx);text-align:center;padding-bottom:12px;background:none;border:0;min-width:0}
.tile::after{content:"";position:absolute;left:-8px;right:-8px;bottom:0;height:6px;border-radius:3px;background:var(--ledge);box-shadow:0 8px 14px rgba(0,0,0,.25)}
.tile.dragging{opacity:.35}
.tile.ins-b{box-shadow:-10px 0 0 -6px var(--accent)}
.tile.ins-a{box-shadow:10px 0 0 -6px var(--accent)}
.cwrap{width:100%;container-type:inline-size;perspective:900px}
.case{position:relative;width:100%;aspect-ratio:70/98;border-radius:5% / 3.6%;padding:6.5%;
  background:linear-gradient(135deg,rgba(255,255,255,.34),rgba(255,255,255,.08) 40%,rgba(255,255,255,.2));
  border:1px solid rgba(255,255,255,.55);box-shadow:0 12px 24px rgba(0,0,0,.35),inset 0 0 0 3px rgba(255,255,255,.12),inset 0 0 14px rgba(255,255,255,.25);
  transform:rotateX(var(--rx,0deg)) rotateY(var(--ry,0deg));transition:transform .18s ease-out,box-shadow .2s}
.tile:hover .case{box-shadow:0 18px 34px rgba(0,0,0,.45),inset 0 0 0 3px rgba(255,255,255,.18),inset 0 0 14px rgba(255,255,255,.3)}
.case::before{content:"";position:absolute;left:12%;right:12%;top:1.6%;height:1.6%;border-radius:99px;background:rgba(255,255,255,.55)}
.case::after{content:"";position:absolute;inset:0;border-radius:inherit;pointer-events:none;background:linear-gradient(115deg,transparent calc(var(--gx,30%) - 22%),rgba(255,255,255,.4) var(--gx,30%),transparent calc(var(--gx,30%) + 14%));opacity:.7;mix-blend-mode:screen}
.art{width:100%;height:100%;border-radius:3.5% / 2.6%;position:relative;overflow:hidden;background:var(--g);color:#fff;container-type:inline-size;box-shadow:0 1px 3px rgba(0,0,0,.4)}
.art .nm{position:absolute;left:7%;top:5%;right:27%;font-weight:800;font-size:6.4cqw;line-height:1.1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-shadow:0 1px 2px rgba(0,0,0,.5)}
.art .hp{position:absolute;right:6%;top:5%;font-weight:800;font-size:6.5cqw}
.art .win{position:absolute;left:7%;right:7%;top:17%;height:44%;border-radius:4%;background:radial-gradient(circle at 50% 40%,rgba(255,255,255,.75),rgba(255,255,255,.1) 55%),var(--g2);border:2px solid rgba(255,255,255,.55)}
.art .win::after{content:"";position:absolute;left:50%;top:50%;width:46%;aspect-ratio:1;transform:translate(-50%,-50%) rotate(45deg);background:var(--g);opacity:.85;border-radius:18%}
.art .txt{position:absolute;left:7%;right:7%;top:65%;display:grid;gap:3%}
.art .txt i{display:block;height:2.4cqw;border-radius:2px;background:rgba(255,255,255,.4)}
.art .ft{position:absolute;left:7%;right:7%;bottom:3.5%;display:flex;justify-content:space-between;font-size:5cqw;opacity:.9}
.art.holo::after{content:"";position:absolute;inset:0;background:conic-gradient(from calc(var(--gx,30%) * 3) at 50% 50%,#ff6ec7,#ffd36e,#6effb0,#6ec9ff,#c36eff,#ff6ec7);mix-blend-mode:color-dodge;opacity:.38}
.art.full{background:var(--g2)}
.pr{font-weight:800;font-size:.92rem;background:rgba(255,255,255,.14);border-radius:99px;padding:1px 10px}
.stage[data-bd="light"] .pr{background:rgba(0,0,0,.07)}
.pr.none{opacity:.6;font-weight:600}
.tnm{display:flex;gap:6px;align-items:baseline;justify-content:center;max-width:100%}
.tnm b{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:.95rem}
.q{flex:none;font-size:.75rem;font-weight:800;color:var(--accent-ink);background:var(--accent);border-radius:99px;padding:0 6px}
.tile small{color:var(--tm);font-size:.78rem;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.tile[aria-selected="true"] .case{outline:3px solid var(--accent);outline-offset:3px}
.blank{border:2px dashed rgba(255,255,255,.35);border-radius:10px;aspect-ratio:70/98;width:100%;display:grid;place-items:center;color:var(--tm);font-weight:700;cursor:pointer;background:none;font-size:.9rem}
.stage[data-bd="light"] .blank{border-color:rgba(0,0,0,.25)}
.blank:hover{border-color:var(--accent);color:var(--tx)}
.empty{color:var(--tm);padding:30px 10px;text-align:center}
/* side */
.side .card{padding:14px}
.side h4{margin:0 0 8px;font-size:.78rem;text-transform:uppercase;letter-spacing:.06em;color:var(--muted)}
.dcase{width:62%;margin:0 auto 10px;--w:1}
.dcase .cwrap{perspective:700px}
.dcase .case{background:linear-gradient(135deg,rgba(120,130,170,.35),rgba(120,130,170,.1) 40%,rgba(120,130,170,.25));border-color:rgba(120,130,170,.6)}
.dl{display:grid;grid-template-columns:auto 1fr;gap:4px 12px;font-size:.9rem;margin:8px 0}
.dl dt{color:var(--muted)}
.dl dd{margin:0;text-align:right;font-weight:650}
.acts2{display:flex;gap:6px;flex-wrap:wrap}
.acts2 select{flex:1;min-width:0}
.pill{display:inline-flex;gap:5px;align-items:center;padding:2px 9px;border-radius:99px;font-weight:750;font-size:.8rem;background:var(--pocket)}
.pill.ok{background:color-mix(in srgb,var(--ok) 16%,var(--sheet));color:var(--ok)}
.bar{display:grid;grid-template-columns:150px 1fr auto;gap:8px;align-items:center;font-size:.85rem;margin:4px 0}
.bar span.t{height:7px;border-radius:4px;background:var(--pocket);overflow:hidden}
.bar span.t i{display:block;height:100%;background:var(--brand)}
.top{display:flex;gap:10px;align-items:center;padding:5px 0;cursor:pointer;border-radius:8px}
.top:hover{background:var(--pocket)}
.top .mini{width:34px;flex:none}
.top b{display:block;line-height:1.2;font-size:.9rem}
.top small{color:var(--muted)}
.top .v{margin-left:auto;font-weight:800}
.note{font-size:.82rem;color:var(--muted);display:flex;gap:8px;align-items:flex-start}
/* lightbox */
.lb{position:fixed;inset:0;z-index:50;background:rgba(6,9,22,.93);display:grid;place-items:center;padding:20px}
.lb .big{width:min(78vw,calc((100dvh - 150px)*.714));perspective:1100px}
.lb .cap{position:absolute;left:0;right:0;bottom:18px;text-align:center;color:#fff}
.lb .cap b{font-size:1.15rem}
.lb .cap div{color:#b9c0e6;font-size:.9rem}
.lb button{position:absolute;border:0;background:rgba(255,255,255,.14);color:#fff;border-radius:99px;width:44px;height:44px;font-size:1.3rem;cursor:pointer}
.lb button:hover{background:rgba(255,255,255,.26)}
.lb .x{top:16px;right:16px}
.lb .pv{left:16px;top:50%}
.lb .nx{right:16px;top:50%}
.lb .pl{top:16px;left:16px;width:auto;padding:0 16px;font-size:.9rem;font-weight:700}
.lb.show .cap,.lb.show .pl{opacity:.0;transition:opacity .4s}
.lb.show:hover .cap,.lb.show:hover .pl{opacity:1}
@media (prefers-reduced-motion:reduce){.case{transition:none}}
.head>.grow{min-width:min(100%,260px)}

`;
/* ===== Showcase page (matches the approved prototype). Runs in a shadow root so its styles never clash with the rest of the app. ===== */
const scp={sel:"all",card:null,q:"",bd:"velvet",size:180,lb:false,list:[],i:0,timer:null};
let scpR=null;
try{const z=+localStorage.getItem("pk-sc-size");if(z>=120&&z<=300)scp.size=z;else if(innerWidth<700)scp.size=150;const b=localStorage.getItem("pk-sc-bd");if(b==="velvet"||b==="light"||b==="wood")scp.bd=b}catch{}
const scpq=s=>scpR.querySelector(s),scpqa=s=>[...scpR.querySelectorAll(s)];
const scpPrice=c=>{const u=unitVal(c);return u==null?null:u};
const scpMoney=n=>"€"+(+n||0).toLocaleString("en-GB",{minimumFractionDigits:(+n||0)%1?2:0,maximumFractionDigits:2});
function scpFace(c,big){
  const s=big?cpPic(c):cpThumb(c);
  return s?`<img class="cardimg" alt="" draggable="false" loading="lazy" src="${esc(s)}">`:`<span class="ph"><b>${esc(c.name)}</b><small>${esc([c.setCode||c.set,c.number].filter(Boolean).join(" · "))}</small></span>`;
}
function scpCase(c,big){
  const holo=/holo|reverse|full|secret|rainbow/i.test((c.variant||"")+" "+(c.rarity||""));
  return `<div class="cwrap"><div class="case" data-tilt><div class="artw">${scpFace(c,big)}${holo?`<i class="hl"></i>`:""}</div></div></div>`;
}
const scpTot=l=>l.reduce((a,c)=>{const u=scpPrice(c);return a+(u==null?0:u*(+c.qty||1))},0);
const scpCnt=l=>l.reduce((a,c)=>a+(+c.qty||1),0);
function scpView(k){const q=scp.q;let l=scSorted(k);if(q)l=l.filter(c=>[c.name,c.set,c.setCode,c.rarity,c.number,c.variant].join(" ").toLowerCase().includes(q));return l}
function scpShown(){const n=scCaseNames();return scp.sel==="all"||!n.includes(scp.sel)?n:[scp.sel]}
/* ---------- skeleton ---------- */
if(!window.__scfsEsc){window.__scfsEsc=1;document.addEventListener("keydown",e=>{if(e.key!=="Escape")return;try{const m=document.getElementById("scHost").shadowRoot.getElementById("scMain");if(m&&m.classList.contains("scfs")&&!document.querySelector(".cp-lb")){m.classList.remove("scfs");document.body.style.overflow=""}}catch(_){}})}
function scpInit(){
  const h=document.getElementById("scHost");if(!h||scpR)return;
  scpR=h.attachShadow({mode:"open"});
  scpR.innerHTML=`<style>${SCPCSS}</style><div class="page">
  <div class="head"><div class="grow"><h1>Showcase</h1><p class="sub">Rare cards on display in transparent cases. They never count towards a deck or binder.</p></div>
    <button class="btn ghost" type="button" id="dispBtn">▶ Display mode</button>
    <button class="btn ghost" type="button" id="newCase">+ New showcase</button></div>
  <div class="kpis" id="kpis"></div>
  <div class="shelfbar"><div class="seg" role="group" aria-label="Show"><button type="button" data-show="all" aria-pressed="true">All showcases</button></div><span class="grow"></span>
    <label><span class="vh">Search</span><input id="q" type="search" placeholder="Search showcase cards"></label></div>
  <div class="shelf" id="shelf"></div>
  <div class="layout">
    <section class="card main" id="scMain">
      <div class="tb sctb">
        <label><span class="vh">Sort</span><select id="sort"><option value="manual">Sort: my order</option><option value="name">Sort: name (A–Z)</option><option value="val-desc">Sort: value, highest first</option><option value="val-asc">Sort: value, lowest first</option><option value="rar-desc">Sort: rarest first</option><option value="rar-asc">Sort: commonest first</option><option value="set">Sort: set</option><option value="dex">Sort: Pokédex number</option><option value="new">Sort: recently added</option><option value="old">Sort: oldest added</option></select></label>
        <button class="btn ghost sm" type="button" id="apply" hidden title="Make this order your own manual order">Save this order</button>
        <label><span class="vh">Backdrop</span><select id="bd"><option value="velvet">Backdrop: Night</option><option value="light">Backdrop: Light</option><option value="wood">Backdrop: Wood</option></select></label>
        <label class="size">Size <input type="range" id="size" min="120" max="300" step="5" aria-label="Case size"></label>
        <span class="grow"></span><button class="ib" type="button" id="fsBtn" title="Full screen" aria-label="Full screen">${dpIcon("fs")}</button>
        <div class="menu"><button class="ib" type="button" id="menuBtn" aria-haspopup="true" aria-label="More">⋮</button><div class="pop" id="pop"><button type="button" data-m="disp">Display mode</button><button type="button" data-m="new">New showcase</button><button type="button" data-m="reset">Reset case size</button></div></div>
        <span class="size" id="dragHint" style="flex-basis:100%">Drag a case to reorder, or onto another showcase above.</span>
      </div>
      <div class="stage" id="stage"></div>
    </section>
    <aside class="side" id="side"></aside>
  </div></div>
  <div class="lb" id="lb" hidden role="dialog" aria-label="Card"><button class="pl" id="lbPlay" type="button">▶ Slideshow</button><button class="x" data-lb="x" aria-label="Close">✕</button><button class="pv" data-lb="p" aria-label="Previous">‹</button><div class="big" id="lbBig"></div><div class="cap" id="lbCap"></div><button class="nx" data-lb="n" aria-label="Next">›</button></div>`;
  scpq("#size").value=scp.size;scpq("#bd").value=scp.bd;
  scpq("#size").oninput=e=>{scp.size=+e.target.value;scpq("#stage").style.setProperty("--w",scp.size+"px");try{localStorage.setItem("pk-sc-size",scp.size)}catch{}};
  scpq("#bd").onchange=e=>{scp.bd=e.target.value;scpq("#stage").dataset.bd=scp.bd;try{localStorage.setItem("pk-sc-bd",scp.bd)}catch{}};
  scpq("#sort").onchange=e=>{scSort=e.target.value;try{localStorage.setItem("pk-scsort",scSort)}catch{}renderShowcase()};
  scpq("#q").oninput=e=>{scp.q=e.target.value.trim().toLowerCase();scpStage();scpSide()};
  scpR.addEventListener("click",scpClick);
  scpR.addEventListener("keydown",e=>{if((e.key==="Enter"||e.key===" ")&&e.target.matches&&e.target.matches(".tile[data-id]")){e.preventDefault();e.target.click()}});
  scpR.addEventListener("change",async e=>{if(e.target.id==="mv"){const c=S.cards.find(x=>x.id===scp.card),to=e.target.value;if(c&&to&&(c.deck||"Showcase")!==to){await scDrop(c.id,to);scpRefresh()}}});
  scpR.addEventListener("pointermove",scpTilt);
  scpDnd();
}
/* ---------- render ---------- */
function scpRefresh(){
  if(!scpR){scpInit();if(!scpR)return}
  if(S.screen!=="showcase")return;
  const names=scCaseNames();if(scp.sel!=="all"&&!names.includes(scp.sel))scp.sel="all";
  const all=S.cards.filter(c=>c.locType==="showcase");
  if(scp.card&&!all.some(c=>c.id===scp.card))scp.card=null;
  const un=all.filter(c=>scpPrice(c)==null).length,best=[...all].filter(c=>scpPrice(c)!=null).sort((a,b)=>scpPrice(b)-scpPrice(a))[0];
  scpq("#kpis").innerHTML=[["Cards on display",scpCnt(all),new Set(all.map(cardKey)).size+" unique"],["Showcases",names.length,""],["Estimated value",eur(scpTot(all)),un?un+" unpriced":""],["Most valuable",best?eur(scpPrice(best)):"—",best?best.name:""]].map(([l,v,s])=>`<div class="card kpi"><b>${v}</b><small>${l}${s?" · "+esc(s):""}</small></div>`).join("");
  scpq("#shelf").innerHTML=names.map(k=>{const l=scCards(k),col=x=>x?`<i style="background-image:url('${esc(cpThumb(x)).replace(/'/g,"%27")}');background-size:cover;background-color:#59607f"></i>`:`<i style="background:var(--pocket)"></i>`;
    return `<button type="button" class="chip" data-case="${esc(k)}" aria-pressed="${scp.sel===k}"><span class="stack">${col(l[2])}${col(l[1])}${col(l[0])}</span><span><b>${esc(k)}</b><small>${plural(scpCnt(l),"card")} · ${eur(scpTot(l))}</small><div class="mbar"><i style="width:${scpTot(all)>0?Math.min(100,scpTot(l)/scpTot(all)*100).toFixed(1):0}%"></i></div></span>${l.some(x=>scpPrice(x)==null)?`<span class="st warn" title="Some cards in this showcase have no price">!</span>`:""}</button>`}).join("")+`<button type="button" class="chip new" id="chipNew">+ New showcase</button>`;
  scpq("[data-show=all]").setAttribute("aria-pressed",String(scp.sel==="all"));
  scpq("#sort").value=SC_SORTS[scSort]?scSort:"manual";
  scpq("#apply").hidden=scSort==="manual";scpq("#dragHint").hidden=scSort!=="manual";
  scpq("#bd").value=scp.bd;scpq("#size").value=scp.size;
  const st=scpq("#stage");st.dataset.bd=scp.bd;st.style.setProperty("--w",scp.size+"px");
  scpStage();scpSide();
}
function scpHf(c){const f=scp.hl?dpHlFn(scp.hl):null;return !f||f(c)}
function scpStage(){
  const names=scCaseNames(),shown=scpShown(),st=scpq("#stage");
  if(!names.length){st.innerHTML=`<p class="empty">No showcases yet.<br><br><button class="btn" type="button" id="chipNew2">+ New showcase</button></p>`;return}
  st.innerHTML=shown.map(k=>{const full=scCards(k),l=scpView(k),i=names.indexOf(k);
    return `<section class="sec" data-case="${esc(k)}"><div class="sh"><h3>${esc(k)}</h3><span class="m">${plural(scpCnt(full),"card")} · ${eur(scpTot(full))}</span><span class="acts">${names.length>1?`<button class="lk" data-up="${esc(k)}" title="Move showcase up"${i===0?" disabled":""}>↑</button><button class="lk" data-down="${esc(k)}" title="Move showcase down"${i===names.length-1?" disabled":""}>↓</button>`:""}<button class="lk" data-ren="${esc(k)}">✎ Edit showcase</button>${full.length?"":`<button class="lk" data-del="${esc(k)}">Delete</button>`}</span></div>
    <div class="row" data-case="${esc(k)}">${l.map(c=>{const u=scpPrice(c),q=+c.qty||1;
      return `<div role="button" tabindex="0" class="tile${scp.hl&&!scpHf(c)?" dim":""}" draggable="${scSort==="manual"}" data-id="${esc(c.id)}" aria-selected="${scp.card===c.id}">${scpCase(c)}<span class="pr${u==null?" none":""}">${u==null?"No price":eur(u)+(q>1?` × ${q}`:"")}</span><span class="tnm"><b>${esc(c.name)}</b>${q>1?`<span class="q">×${q}</span>`:""}</span><small>${esc([c.set||c.setCode,c.number].filter(Boolean).join(" · "))}</small><small>${esc([c.rarity,c.variant&&c.variant!=="Normal"?c.variant:""].filter(Boolean).join(" · "))}</small></div>`}).join("")}
    <div class="tile" style="padding-bottom:12px"><button type="button" class="blank" data-addto="${esc(k)}">+ Add card</button></div></div>${!l.length&&full.length?`<p class="empty">No cards match the search.</p>`:""}</section>`}).join("");
}
function scpAgg(cs){
  const by={rar:{},ty:{},set:{}};
  for(const c of cs){const q=+c.qty||1;const r=c.rarity||"Not set";by.rar[r]=(by.rar[r]||0)+q;
    const d=c.details,sup=String(d&&d.supertype||"").toLowerCase();const t=!d?"No details":sup.startsWith("trainer")?"Trainer":sup.startsWith("energy")?"Energy":((d.types||[])[0]||"Colorless");by.ty[t]=(by.ty[t]||0)+q;
    const s=c.set||c.setCode||"Unknown";by.set[s]=(by.set[s]||0)+q}
  return by;
}
function scpBars(rows){const mx=Math.max(1,...rows.map(r=>r.v));return rows.map(r=>`<div class="bar"><span>${r.l}</span><span class="t"><i style="width:${r.v/mx*100}%"></i></span><b>${r.v}</b></div>`).join("")||"<p class='sub'>Nothing yet.</p>"}
function scpBrk(pool){
  if(!pool.length)return "";const hk=(scp.sel||"all")+"|"+(scp.card||"");if(scp.hlN!==scp.sel){scp.hl=null;scp.hlN=scp.sel}scp.btab=scp.btab||"type";
  const ents=dkAgg(pool),BA=dkAnalyse(ents,"standard");
  return `<div class="card sec"><h3>Breakdown <span class="hint">click a bar to highlight</span></h3>${scp.hl?`<span class="pkhl">Highlighting: ${esc(dpHlLabel(scp.hl))} <button type="button" data-clearhl aria-label="Clear highlight">✕</button></span>`:""}<div class="tabs" role="tablist">${PK_BTABS.map(([k,t])=>`<button class="tab" role="tab" data-btab="${k}" aria-selected="${scp.btab===k}">${t}</button>`).join("")}</div>${pkBars(BA,ents,scp.btab,scp.hl)}</div>`}
function scpSide(){
  const c=scp.card&&S.cards.find(x=>x.id===scp.card),el=scpq("#side");let pre="";
  const pc=c||S.cards.find(x=>x.id===scpSeq()[0])||null;scp.pcard=pc?pc.id:null;
  if(pc){const u=scpPrice(pc),q=+pc.qty||1;
    pre=pkPanel(pc,{zoom:'data-a="zoom"',facts:[["Price",u==null?"—":eur(u)+(q>1?" × "+q:"")],["Rarity",pkRar(pc.rarity)],["Energy type",pkEn(pc)],["Copies","×"+q]],acts:`<button class="btn sm" data-a="page">Open card page</button>`,extra:pkWhere(pc,"Showcase: "+(pc.deck||"Showcase"),q)})}
  if(!pc)pre=pkEmpty("No cards on display yet");
  const names=c?[c.deck||"Showcase"]:scpShown(),pool=names.flatMap(k=>scCards(k)),tc=scpCnt(pool),tv=scpTot(pool),A=scpAgg(pool);
  const top=[...pool].filter(x=>scpPrice(x)!=null).sort((a,b)=>scpPrice(b)-scpPrice(a)).slice(0,4);
  const rr=Object.entries(A.rar).sort((a,b)=>rarRank(b[0])-rarRank(a[0])||a[0].localeCompare(b[0])).map(([r,v])=>({l:r==="Not set"?"Not set":esc(r),v}));
  const tr=[...ETYPES,"Trainer","Energy","No details"].filter(t=>A.ty[t]).map(t=>({l:(ETYPES.includes(t)?en(t)+" ":"")+esc(t),v:A.ty[t]}));
  const sr=Object.entries(A.set).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([k,v])=>({l:esc(k),v}));
  el.innerHTML=`<div class="card"><h4>${c?esc(c.deck||"Showcase"):scp.sel==="all"?"All showcases":esc(scp.sel)}</h4>${(()=>{const cv=S.cards.reduce((a,x)=>a+(unitVal(x)||0)*(+x.qty||1),0),p=cv>0?tv/cv*100:0,pt=p>0&&p<1?"<1%":Math.round(p)+"%";return `<div class="scring"><div class="scringc" style="--p:${Math.min(100,p).toFixed(1)}"><span>${pt}</span></div><div><b>${eur(tv)} of ${eur(cv)}</b><div class="hint" style="color:var(--muted);font-size:.85rem">${c?"of your collection value is in this showcase":scp.sel==="all"?"of your collection value is on display":"of your collection value is in this showcase"}</div></div></div>`})()}${(()=>{const ks=new Set(pool.map(cardKey)),el=[...ks].filter(k=>S.cards.some(x=>x.locType!=="showcase"&&cardKey(x)===k)).length;return `<div class="sckv"><div><b>${tc?eur(tv/tc):"—"}</b><small>average per card</small></div><div><b>${tv>0?Math.round(Math.max(0,...pool.map(x=>scpPrice(x)||0))/tv*100)+"%":"—"}</b><small>of value in the top card</small></div><div><b>${pool.filter(x=>/holo|reverse|full|secret|rainbow/i.test((x.variant||"")+" "+(x.rarity||""))).reduce((q,x)=>q+(+x.qty||1),0)}</b><small>holo and special cards</small></div><div><b>${el}</b><small>also owned elsewhere</small></div></div>`})()}</div>
    ${scpBrk(pool)}${pre}<div class="card"><h4>Most valuable</h4>${top.map(x=>`<div class="top" data-pick="${esc(x.id)}"><div class="mini">${scpCase(x)}</div><span><b>${esc(x.name)}</b><small>${esc(x.set||x.setCode||"")}</small></span><span class="v">${eur(scpPrice(x))}</span></div>`).join("")||"<p class='sub'>No prices yet.</p>"}</div>
    ${c?"":`<div class="card note"><span>ℹ️</span><span>Showcase cards are never offered when building decks or filling binders, and they are left out of deck and binder statistics. Select a case to see its details here.</span></div>`}`;try{pkColInit()}catch(e){}
}
/* ---------- interaction ---------- */
function scpTilt(e){
  const t=e.target.closest&&e.target.closest("[data-tilt]");
  scpqa("[data-tilt].on").forEach(x=>{if(x!==t){x.classList.remove("on");x.style.removeProperty("--rx");x.style.removeProperty("--ry");x.style.removeProperty("--gx")}});
  if(!t)return;t.classList.add("on");const r=t.getBoundingClientRect(),x=(e.clientX-r.left)/r.width,y=(e.clientY-r.top)/r.height;
  t.style.setProperty("--ry",((x-.5)*16)+"deg");t.style.setProperty("--rx",((.5-y)*12)+"deg");t.style.setProperty("--gx",(x*100)+"%");
}
function scpSeq(){return scpShown().flatMap(k=>scpView(k)).map(c=>c.id)}
async function scpClick(e){
  const g=s=>e.target.closest(s);let x;
  if(x=g("[data-btab]")){scp.btab=x.dataset.btab;scpSide();return}
  if(x=g("[data-hl]")){const k=x.dataset.hl;scp.hl=scp.hl===k?null:k;scpSide();scpStage();return}
  if(g("[data-clearhl]")){scp.hl=null;scpSide();scpStage();return}
  if(!g(".menu")){const p=scpq("#pop");if(p)p.classList.remove("open")}
  if(g("#fsBtn")){const m=scpq("#scMain");m.classList.toggle("scfs");document.body.style.overflow=m.classList.contains("scfs")?"hidden":"";return}
  if(g("#menuBtn")){scpq("#pop").classList.toggle("open");return}
  if(x=g("[data-m]")){scpq("#pop").classList.remove("open");const a=x.dataset.m;if(a==="disp"){const b=scpq("#dispBtn");if(b)b.click()}else if(a==="new"){await scNew()}else if(a==="reset"){scp.size=180;scpq("#size").value=180;scpq("#stage").style.setProperty("--w","180px");try{localStorage.setItem("pk-sc-size",180)}catch{}}return}
  if(g("[data-lb]")||e.target.id==="lb"){const b=g("[data-lb]");if(!b||b.dataset.lb==="x")scpLbClose();else scpStep(b.dataset.lb==="n"?1:-1);return}
  if(g("#lbPlay")){scpPlay(!scp.timer);return}
  if(g("[data-show]")){scp.sel="all";scpRefresh();return}
  if(x=g(".chip[data-case]")){scp.sel=scp.sel===x.dataset.case?"all":x.dataset.case;scp.card=null;scpRefresh();return}
  if(g("#chipNew,#chipNew2,#newCase")){await scNew();return}
  if(g("#addCard")){scOpen(scp.sel==="all"?undefined:scp.sel);return}
  if(x=g("[data-addto]")){scOpen(x.dataset.addto);return}
  if(x=g("[data-ren]")){await scRename(x.dataset.ren);return}
  if(x=g("[data-up],[data-down]")){if(x.disabled)return;const k=x.dataset.up||x.dataset.down,d=x.dataset.up?-1:1,n=scCaseNames(),i=n.indexOf(k),j=i+d;if(i>-1&&j>=0&&j<n.length){[n[i],n[j]]=[n[j],n[i]];await scSaveMeta(n);logAct(`Moved showcase ${k} ${d<0?"up":"down"}`)}return}
  if(x=g("[data-del]")){const k=x.dataset.del;if(await askConfirm(`Delete ${k}?`,"This empty showcase is removed.","Delete")){await scSaveMeta(scCaseNames().filter(n=>n!==k));logAct(`Deleted showcase ${k}`)}return}
  if(g("#apply")){const b=document.getElementById("scApply");if(b)b.click();return}
  if(x=g(".pkel")){pkGoto(x.dataset);return}
  if(x=g("[data-pick]")){scp.card=x.dataset.pick;scpSide();scpMark();return}
  if(g("#dispBtn")){const ids=scpSeq();if(ids.length){scpLbOpen(ids[0],true);if(document.documentElement.requestFullscreen)document.documentElement.requestFullscreen().catch(()=>{})}return}
  if(x=g(".tile[data-id]")){scp.card=x.dataset.id;scpMark();scpSide();if(e.detail>1)scpLbOpen(x.dataset.id);return}
  if(x=g("[data-a]")){const c=S.cards.find(y=>y.id===(scp.card||scp.pcard));if(!c)return;const a=x.dataset.a;
    if(a==="zoom")scpLbOpen(c.id);
    else if(a==="page")openCardPage(c,scpSeq());
    else if(a==="rm"){const strip=({id,...r})=>r,nm=c.name,from=c.deck||"Showcase";txBegin(`Took ${nm} out of showcase ${from}`);try{await S.store.set(c.id,{...strip(c),locType:"binder",deck:null,binder:null,page:null,slot:null})}finally{txEnd()}scp.card=null;scpRefresh()}
    return}
}
function scpMark(){scpqa(".tile[data-id]").forEach(t=>t.setAttribute("aria-selected",String(t.dataset.id===scp.card)))}
/* drag and drop: reorder inside a showcase, or drop on another showcase / chip */
let scpDrag=null;
function scpClr(){scpqa(".ins-a,.ins-b,.dropover").forEach(e=>e.classList.remove("ins-a","ins-b","dropover"))}
function scpDnd(){
  scpR.addEventListener("dragstart",e=>{const t=e.target.closest&&e.target.closest(".tile[data-id]");if(!t)return;scpDrag=t.dataset.id;e.dataTransfer.effectAllowed="move";try{e.dataTransfer.setData("text/plain",scpDrag)}catch{}requestAnimationFrame(()=>t.classList.add("dragging"))});
  scpR.addEventListener("dragend",()=>{scpDrag=null;scpClr();scpqa(".dragging").forEach(e=>e.classList.remove("dragging"))});
  scpR.addEventListener("dragover",e=>{if(!scpDrag)return;const ch=e.target.closest(".chip[data-case]"),row=e.target.closest(".row");if(!ch&&!row)return;
    const c=S.cards.find(x=>x.id===scpDrag),tgt=ch?ch.dataset.case:row.dataset.case;if(scSort!=="manual"&&c&&(c.deck||"Showcase")===tgt)return;
    e.preventDefault();e.dataTransfer.dropEffect="move";scpClr();
    if(ch)ch.classList.add("dropover");else if(scSort==="manual"){const t=e.target.closest(".tile[data-id]");if(t&&t.dataset.id!==scpDrag){const r=t.getBoundingClientRect();t.classList.add(e.clientX>=r.left+r.width/2?"ins-a":"ins-b")}}});
  scpR.addEventListener("drop",async e=>{if(!scpDrag)return;const ch=e.target.closest(".chip[data-case]"),row=e.target.closest(".row");if(!ch&&!row)return;e.preventDefault();
    const id=scpDrag,tgt=ch?ch.dataset.case:row.dataset.case;let before=null,after=false;
    if(!ch&&scSort==="manual"){const t=e.target.closest(".tile[data-id]");if(t&&t.dataset.id!==id){const r=t.getBoundingClientRect();before=t.dataset.id;after=e.clientX>=r.left+r.width/2}}
    scpDrag=null;scpClr();await scDrop(id,tgt,before,after);scpRefresh()});
}
/* ---------- large view + display mode ---------- */
function scpLbDraw(){const c=S.cards.find(x=>x.id===scp.list[scp.i]);if(!c)return;const u=scpPrice(c);
  scpq("#lbBig").innerHTML=scpCase(c,true);
  scpq("#lbCap").innerHTML=`<b>${esc(c.name)}</b><div>${esc([c.set||c.setCode,c.number,c.rarity].filter(Boolean).join(" · "))}${u!=null?" · "+eur(u):""}</div>`;scp.card=c.id}
function scpLbOpen(id,play){scp.list=scpSeq();scp.i=Math.max(0,scp.list.indexOf(id));scp.lb=true;scpq("#lb").hidden=false;document.body.style.overflow="hidden";scpLbDraw();scpPlay(!!play)}
function scpLbClose(){scp.lb=false;scpq("#lb").hidden=true;scpPlay(false);document.body.style.overflow="";if(document.fullscreenElement)document.exitFullscreen().catch(()=>{});scpMark();scpSide()}
function scpPlay(on){clearInterval(scp.timer);scp.timer=on?setInterval(()=>scpStep(1),4500):null;scpq("#lbPlay").textContent=on?"⏸ Pause":"▶ Slideshow";scpq("#lb").classList.toggle("show",on)}
function scpStep(d){if(!scp.list.length)return;scp.i=(scp.i+d+scp.list.length)%scp.list.length;scpLbDraw()}
document.addEventListener("keydown",e=>{if(!scp.lb||S.screen!=="showcase")return;
  if(e.key==="Escape"){e.preventDefault();scpLbClose()}else if(e.key==="ArrowRight"){scpStep(1);e.preventDefault()}else if(e.key==="ArrowLeft"){scpStep(-1);e.preventDefault()}else if(e.key===" "&&!(e.composedPath()[0]||{}).matches?.("button")){e.preventDefault();scpPlay(!scp.timer)}});

scReady=true;
const HMCSS=`
:host{display:block;color:var(--ink);font:inherit;line-height:1.45}
*,*::before,*::after{box-sizing:border-box}
button,input{font:inherit;color:inherit}
[hidden]{display:none!important}
.page{padding:0}
.art img{width:100%;height:100%;object-fit:cover;display:block}
.art .ph{position:absolute;inset:0;display:grid;place-content:center;text-align:center;padding:8%;background:linear-gradient(160deg,#59607f,#2b3050);font-weight:800;font-size:8cqw;gap:4px}
.art .ph small{font-weight:500;color:#fff;opacity:.75;font-size:6cqw}
.tile .art{background:var(--pocket)}
.kpi small.of{display:inline;color:var(--muted);font-weight:600;font-size:.95rem}
.grow{flex:1;min-width:0}
.btn{font-weight:650;border:0;border-radius:10px;padding:9px 14px;cursor:pointer;background:var(--accent);color:var(--accent-ink);display:inline-flex;gap:6px;align-items:center;white-space:nowrap}
.btn.ghost{background:var(--sheet);color:var(--ink);border:1px solid var(--line)}
.btn.ghost:hover{background:var(--pocket)}
.btn.sm{padding:5px 10px;font-size:.85rem;border-radius:8px}
:is(button,[tabindex]):focus-visible{outline:2px solid var(--brand);outline-offset:2px}
@media(max-width:700px){.page{padding:12px 16px 40px}}
h1{margin:0 0 2px;font-size:1.7rem;letter-spacing:-.02em}
.sub{color:var(--muted);margin:0}
.head{display:flex;gap:12px;align-items:flex-end;flex-wrap:wrap;margin-bottom:16px}
.head .grow{min-width:min(100%,260px)}
.card{background:var(--sheet);border:1px solid var(--line);border-radius:var(--radius);box-shadow:var(--shadow);padding:16px 18px;min-width:0}
.ch{display:flex;gap:10px;align-items:center;margin:0 0 10px;flex-wrap:wrap}
.ch h3{margin:0;font-size:1.02rem}
.ch small{color:var(--muted)}
.lk{border:0;background:none;color:var(--brand);font-weight:700;cursor:pointer;padding:2px 4px;border-radius:6px;font-size:.88rem}
.lk:hover{text-decoration:underline}
.seg{display:flex;background:var(--pocket);border-radius:11px;padding:3px;gap:2px}
.seg button{border:0;background:none;padding:5px 11px;border-radius:8px;font-weight:700;color:var(--muted);cursor:pointer;font-size:.82rem}
.seg button[aria-pressed="true"]{background:var(--sheet);color:var(--ink);box-shadow:0 1px 3px rgba(0,0,0,.12)}
.go{cursor:pointer}
.go:hover{border-color:color-mix(in srgb,var(--brand) 45%,var(--line))}
/* kpis */
.kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:12px}
@media(max-width:1000px){.kpis{grid-template-columns:repeat(2,minmax(0,1fr))}}
.kpi{padding:14px 16px;text-align:left;font:inherit;color:inherit}
.kpi small{color:var(--muted);display:block}
.kpi b{display:block;font-size:1.6rem;letter-spacing:-.02em;line-height:1.2}
.kpi .d{display:inline-block;margin-top:2px;font-size:.78rem;font-weight:750;color:var(--ok);background:color-mix(in srgb,var(--ok) 14%,var(--sheet));border-radius:99px;padding:0 8px}
.kpi .d.n{color:var(--muted);background:var(--pocket)}
.bar{height:6px;border-radius:3px;background:var(--pocket);margin-top:8px;overflow:hidden}
.bar i{display:block;height:100%;background:var(--accent);border-radius:3px}
/* grid */
.row{display:grid;gap:12px;margin-bottom:12px}
.r1{grid-template-columns:minmax(0,1fr) clamp(320px,26vw,420px)}
.r3{grid-template-columns:repeat(3,minmax(0,1fr))}
.r2{grid-template-columns:minmax(0,1.6fr) minmax(0,1fr)}
@media(max-width:1100px){.r1,.r3,.r2{grid-template-columns:minmax(0,1fr)}}
/* hero */
.big{display:flex;gap:12px;align-items:baseline;flex-wrap:wrap}
.big b{font-size:2.1rem;letter-spacing:-.03em;line-height:1.1}
.pill{display:inline-flex;gap:4px;align-items:center;padding:2px 9px;border-radius:99px;font-weight:750;font-size:.82rem;background:var(--pocket)}
.pill.ok{background:color-mix(in srgb,var(--ok) 14%,var(--sheet));color:var(--ok)}
.pill.bad{background:color-mix(in srgb,var(--danger) 14%,var(--sheet));color:var(--danger)}
.chart{position:relative;margin-top:8px}
.chart svg{width:100%;height:230px;display:block;overflow:visible}
.tipv{position:absolute;top:0;transform:translate(-50%,-4px);background:var(--ink);color:var(--bg);border-radius:8px;padding:3px 9px;font-size:.8rem;font-weight:700;pointer-events:none;white-space:nowrap}
.months{display:flex;justify-content:space-between;color:var(--muted);font-size:.78rem;margin-top:4px}
.chips{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;padding-top:12px;border-top:1px solid var(--line)}
.chip{border:1px solid var(--line);background:var(--sheet);border-radius:99px;padding:4px 12px;font-size:.85rem;cursor:pointer}
.chip b{margin-left:4px}
.chip:hover{background:var(--pocket)}
/* attention */
.todo{display:grid;gap:2px}
.ti{display:flex;gap:10px;align-items:center;padding:8px 6px;border-radius:10px;cursor:pointer;border:0;background:none;text-align:left;width:100%}
.ti:hover{background:var(--pocket)}
.tic{width:28px;height:28px;border-radius:8px;display:grid;place-items:center;font-weight:900;flex:none;background:var(--pocket);color:var(--muted)}
.ti.warn .tic{background:color-mix(in srgb,var(--warn) 18%,var(--sheet));color:var(--warn)}
.ti.info .tic{background:color-mix(in srgb,var(--brand) 14%,var(--sheet));color:var(--brand)}
.ti.ok .tic{background:color-mix(in srgb,var(--ok) 16%,var(--sheet));color:var(--ok)}
.ti span.m{flex:1;min-width:0;line-height:1.25}
.ti span.m small{display:block;color:var(--muted)}
.ti .act{font-size:.82rem;font-weight:700;color:var(--brand);white-space:nowrap}
.health{margin-top:10px;padding-top:10px;border-top:1px solid var(--line);display:grid;gap:8px}
.health div.h{display:grid;grid-template-columns:130px 1fr auto;gap:10px;align-items:center;font-size:.85rem}
.health .t{height:6px;border-radius:3px;background:var(--pocket);overflow:hidden}
.health .t i{display:block;height:100%;border-radius:3px}
/* card strips */
.strip{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:16px 16px}
@media(max-width:1100px){.strip{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media(max-width:600px){.strip{grid-template-columns:repeat(2,minmax(0,1fr))}}
.tile{display:flex;flex-direction:column;gap:5px;cursor:pointer;border:0;background:none;text-align:center;align-items:center;min-width:0;padding:0}
.cw{width:100%;container-type:inline-size}
.art{width:100%;aspect-ratio:63/88;border-radius:4.5% / 3.3%;position:relative;overflow:hidden;background:var(--g);color:#fff;box-shadow:0 6px 16px rgba(0,0,0,.22);transition:transform .15s}
.art{--rx:0deg;--ry:0deg;--sx:50%;--sy:30%;transition:transform .14s ease,box-shadow .14s ease}
.tile:hover .art{transform:perspective(700px) rotateY(var(--ry)) rotateX(var(--rx)) translateY(-3px) scale(1.04);box-shadow:0 14px 28px rgba(0,0,0,.36);z-index:4}
.art::after{content:"";position:absolute;inset:0;border-radius:inherit;pointer-events:none;opacity:0;transition:opacity .2s;background:radial-gradient(circle at var(--sx) var(--sy),rgba(255,255,255,.55),rgba(255,255,255,.12) 38%,transparent 62%);mix-blend-mode:overlay}
.tile:hover .art::after{opacity:1}
@media(prefers-reduced-motion:reduce){.tile:hover .art{transform:none}}
.art .nm{position:absolute;left:7%;top:5%;right:22%;font-weight:800;font-size:7cqw;line-height:1.1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-shadow:0 1px 2px rgba(0,0,0,.5)}
.art .win{position:absolute;left:7%;right:7%;top:17%;height:44%;border-radius:4%;background:radial-gradient(circle at 50% 40%,rgba(255,255,255,.75),rgba(255,255,255,.1) 55%),var(--g2);border:2px solid rgba(255,255,255,.55)}
.art .txt{position:absolute;left:7%;right:7%;top:65%;display:grid;gap:3%}
.art .txt i{display:block;height:2.4cqw;border-radius:2px;background:rgba(255,255,255,.4)}
.art .ft{position:absolute;left:7%;right:7%;bottom:3.5%;display:flex;justify-content:space-between;font-size:5cqw;opacity:.9}
.tile b.n{font-size:.92rem;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.tile small{color:var(--muted);font-size:.78rem;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.tile .pr{font-weight:800;background:var(--pocket);border-radius:99px;padding:0 10px;font-size:.88rem}
.rank{position:absolute;left:-6px;top:-8px;background:var(--accent);color:var(--accent-ink);font-weight:850;font-size:.78rem;border-radius:99px;padding:0 7px;z-index:2}
/* lists */
.leg{display:grid;grid-template-columns:14px 1fr auto auto auto;gap:8px;align-items:center;padding:6px 4px;border-radius:8px;cursor:pointer;font-size:.9rem}
.leg:hover{background:var(--pocket)}
.leg i{width:12px;height:12px;border-radius:4px}
.leg small{color:var(--muted)}
.leg .v{color:var(--muted);min-width:70px;text-align:right}
.stack{display:flex;height:14px;border-radius:7px;overflow:hidden;margin-bottom:10px;gap:2px}
.stack i{display:block;cursor:pointer}
.sb{display:grid;grid-template-columns:1fr 70px 40px;gap:8px;align-items:center;font-size:.9rem;padding:5px 4px;border-radius:8px;cursor:pointer}
.sb:hover{background:var(--pocket)}
.sb .t{height:7px;border-radius:4px;background:var(--pocket);overflow:hidden}
.sb .t i{display:block;height:100%;background:var(--brand)}
.sb span:last-child{text-align:right;color:var(--muted)}
.ring{display:flex;gap:16px;align-items:center}
.donut{width:104px;height:104px;border-radius:50%;background:conic-gradient(var(--accent) var(--p),var(--pocket) 0);display:grid;place-items:center;flex:none}
.donut span{width:78px;height:78px;border-radius:50%;background:var(--sheet);display:grid;place-items:center;text-align:center;line-height:1.1}
.donut b{font-size:1.2rem}
.donut small{color:var(--muted);font-size:.7rem}
.gens{display:grid;gap:3px;flex:1;min-width:0}
.gens div{white-space:nowrap;display:grid;grid-template-columns:48px 1fr 56px;gap:6px;align-items:center;font-size:.78rem;color:var(--muted)}
.gens .t{height:5px;border-radius:3px;background:var(--pocket);overflow:hidden}
.gens .t i{display:block;height:100%;background:var(--accent)}
.act{display:grid;gap:2px}
.ai{display:grid;grid-template-columns:62px 1fr;gap:10px;padding:7px 4px;border-bottom:1px solid var(--line);font-size:.9rem}
.ai:last-child{border:0}
.ai time{color:var(--muted)}
.empty{color:var(--muted)}
.grow{flex:1;min-width:0}

`;
/* ===== Home page (matches the approved prototype). Runs in a shadow root so its styles never clash with the rest of the app. ===== */
const hm={range:6,strip:"top"};
let hmR=null;
try{const r=+localStorage.getItem("pk-hm-range");if(r===6||r===12)hm.range=r;const s=localStorage.getItem("pk-hm-strip");if(s==="top"||s==="rec")hm.strip=s}catch{}
const hmq=s=>hmR.querySelector(s);
const hmMN=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const hmPct=(a,b)=>b?Math.round(a/b*100):0;
function valueDelta(){
  const cut=new Date(Date.now()-28*864e5).toISOString().slice(0,10);let dl=0,n=0;
  for(const c of S.cards){const u=unitVal(c);if(u==null||!c.phist)continue;let base=null;for(const p of c.phist){if(p&&p.v>0&&String(p.d)<=cut)base=p}if(base){dl+=(u-base.v)*(+c.qty||1);n++}}
  return {dl,n};
}
function hmArt(c,rank){
  const s=cpThumb(c);
  return `<div style="position:relative;width:100%">${rank?`<span class="rank">${rank}</span>`:""}<div class="cw"><div class="art">${s?`<img alt="" loading="lazy" src="${esc(s)}">`:`<span class="ph"><b>${esc(c.name)}</b><small>${esc([c.setCode||c.set,c.number].filter(Boolean).join(" · "))}</small></span>`}</div></div></div>`;
}
function hmInit(){
  const h=document.getElementById("hmHost");if(!h||hmR)return;
  hmR=h.attachShadow({mode:"open"});
  hmR.innerHTML=`<style>${HMCSS}</style><div class="page">
   <div class="head"><div class="grow"><h1 id="greet"></h1><p class="sub" id="sub"></p></div>
    <button class="btn ghost" type="button" data-act="prices">↻ Refresh prices</button><button class="btn" type="button" data-act="add">+ Add cards</button></div>
   <div class="kpis" id="kpis"></div>
   <div class="row r1"><section class="card" id="hero"></section><section class="card" id="attn"></section></div>
   <section class="card row" style="display:block" id="strips"></section>
   <div class="row r3" id="r3"></div><div class="row r2" id="r2"></div></div>`;
  hmR.addEventListener("click",hmClick);
  /* hover tilt + shine that follows the cursor (same as the deck cards) */
  hmR.addEventListener("mousemove",e=>{
    if(matchMedia("(prefers-reduced-motion:reduce)").matches)return;
    const t=e.target.closest&&e.target.closest(".tile");if(!t)return;const a=t.querySelector(".art");if(!a)return;
    const r=a.getBoundingClientRect(),x=Math.min(1,Math.max(0,(e.clientX-r.left)/r.width)),y=Math.min(1,Math.max(0,(e.clientY-r.top)/r.height));
    a.style.setProperty("--ry",((x-.5)*12).toFixed(1)+"deg");a.style.setProperty("--rx",((.5-y)*12).toFixed(1)+"deg");a.style.setProperty("--sx",(x*100).toFixed(0)+"%");a.style.setProperty("--sy",(y*100).toFixed(0)+"%");
  });
  hmR.addEventListener("keydown",e=>{if((e.key==="Enter"||e.key===" ")&&e.target.matches&&e.target.matches("[data-hg][role=button]")){e.preventDefault();e.target.click()}});
}
function hmClick(e){
  const g=s=>e.target.closest(s);let x;
  if(x=g("[data-r]")){hm.range=+x.dataset.r;try{localStorage.setItem("pk-hm-range",hm.range)}catch{}hmRefresh();return}
  if(x=g("[data-s]")){hm.strip=x.dataset.s;try{localStorage.setItem("pk-hm-strip",hm.strip)}catch{}hmRefresh();return}
  if(x=g("[data-card]")){const c=S.cards.find(y=>y.id===x.dataset.card);if(c){let seq=[];try{seq=JSON.parse(x.closest("[data-seq]").dataset.seq)}catch{}openCardPage(c,seq.length?seq:[c.id])}return}
  if(x=g("[data-act]")){const a=x.dataset.act;
    if(a==="prices"){const b=document.querySelector('[data-pk="prices"]');if(b)b.click();show("tools");showTT("data")}
    else if(a==="add"){const b=innerWidth>860?document.getElementById("sbAdd"):document.querySelector("#sbBnav .fab");if(b)setTimeout(()=>b.click(),0)}
    else if(a==="alerts"){const hits=S.cards.filter(alertHit);if(hits[0])openCardPage(hits[0],hits.map(c=>c.id))}
    else if(a==="backup"){show("tools");showTT("data")}
    else if(a==="health"){show("tools");showTT("health")}
    return}
  if(x=g("[data-hg]")){hgGo(x.dataset.hg,x.dataset.hv||"");return}
}
function hmRefresh(){
  if(!hmR){hmInit();if(!hmR)return}
  if(S.screen!=="home")return;
  const cards=S.cards,q=c=>+c.qty||1,v=valueStats();
  const copies=cards.reduce((a,c)=>a+q(c),0),diff=new Set(cards.map(cardKey)).size;
  const now=new Date(),hr=now.getHours();
  hmq("#greet").textContent=(hr<12?"Good morning":hr<18?"Good afternoon":"Good evening")+", Dennis";
  const nSets=new Set(cards.map(c=>c.set||c.setCode).filter(Boolean)).size;
  hmq("#sub").textContent=cards.length?`${now.toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long"})} · ${copies.toLocaleString("en-GB")} cards across ${nSets} set${nSets===1?"":"s"}, saved to your collection folder`:"No cards yet. Scan a binder page or add one by hand to get started.";
  const hg=(k,val)=>` data-hg="${k}" data-hv="${esc(String(val))}" role="button" tabindex="0"`;
  const mon=now.toISOString().slice(0,7);
  const addedM=cards.filter(c=>String(c.added||"").slice(0,7)===mon).reduce((a,c)=>a+q(c),0);
  const spc=new Set(cards.map(dexOf).filter(Boolean)).size,vd=valueDelta();
  /* sets: completion */
  const setsSum={};for(const c of cards){const k=c.set||c.setCode;if(!k)continue;const pp=numParts(c.number);if(!pp||pp.pre)continue;const x=(setsSum[k]=setsSum[k]||{tot:{},own:new Set()});x.tot[pp.tot]=(x.tot[pp.tot]||0)+1;x.own.add(pp.n)}
  const srows=Object.entries(setsSum).map(([k,x])=>{const t=+Object.keys(x.tot).sort((a,z)=>x.tot[z]-x.tot[a])[0];const o=[...x.own].filter(n=>n<=t).length;return {k,t,o,p:Math.round(o/t*100)}}).sort((a,z)=>z.p-a.p);
  const complete=srows.filter(r=>r.o>=r.t).length;
  hmq("#kpis").innerHTML=[
   ["Cards owned",copies.toLocaleString("en-GB"),`<span class="d n">${diff.toLocaleString("en-GB")} unique</span> `+(addedM?`<span class="d">+${addedM} this month</span>`:""),hg("all","")],
   ["Estimated value",eur(v.total),(vd.n&&Math.abs(vd.dl)>=.01?`<span class="d${vd.dl<0?" n":""}">${vd.dl>0?"▲":"▼"} ${eur(Math.abs(vd.dl))} vs last month</span> `:"")+(v.unpriced?`<span class="d n">${v.unpriced} unpriced</span>`:""),hg("scr","stats|valuePanel")],
   ["Sets collected",nSets,complete?`<span class="d n">${complete} complete</span>`:"",hg("scr","stats|setPanel")],
   ["Pokédex",`${spc}<small class="of"> / ${DEX_TOTAL}</small>`,`<span class="d n">${Math.round(spc/DEX_TOTAL*1000)/10}%</span><div class="bar"><i style="width:${spc/DEX_TOTAL*100}%"></i></div>`,hg("scr","stats|dexPanel")]
  ].map(([l,b,e,a])=>`<div class="card kpi go"${a}><small>${l}</small><b>${b}</b>${e}</div>`).join("");
  /* hero: value by date added, at today's prices */
  const n=hm.range,ms=[];{const d=new Date();d.setDate(1);for(let i=n-1;i>=0;i--){const x=new Date(d.getFullYear(),d.getMonth()-i,1);ms.push(x.getFullYear()+"-"+String(x.getMonth()+1).padStart(2,"0"))}}
  const vals=ms.map(m=>v.list.reduce((a,r)=>{const am=String(r.c.added||"").slice(0,7);return a+((!am||am<=m)?r.t:0)},0));
  const mn=Math.min(...vals),mx=Math.max(...vals,.01),sp=Math.max(mx-mn,mx*.04,.01);
  const W=600,H=170,pts=vals.map((val,i)=>[i*(W/(n-1)),H-14-((val-mn)/sp)*(H-34)]);
  const line=pts.map((p,i)=>(i?"L":"M")+p[0].toFixed(1)+" "+p[1].toFixed(1)).join(" ");
  const dpct=vd.n&&v.total-vd.dl>0?Math.abs(vd.dl)/(v.total-vd.dl)*100:0;
  const dim=hmMN;
  hmq("#hero").innerHTML=`<div class="ch"><h3>Collection value</h3><small>by date added, at today’s prices</small><span class="grow"></span><div class="seg" role="group" aria-label="Range"><button type="button" data-r="6" aria-pressed="${n===6}">6 months</button><button type="button" data-r="12" aria-pressed="${n===12}">12 months</button></div><button class="lk" type="button" data-hg="scr" data-hv="stats|valuePanel">Details</button></div>
   <div class="big"><b>${eur(v.total)}</b>${vd.n&&Math.abs(vd.dl)>=.01?`<span class="pill ${vd.dl<0?"bad":"ok"}">${vd.dl>0?"▲":"▼"} ${eur(Math.abs(vd.dl))} · ${dpct.toFixed(1)}%</span>`:""}</div>
   <div class="chart" id="chart"><svg viewBox="0 0 ${W} ${H+8}" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="hmg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="var(--brand)" stop-opacity=".32"/><stop offset="1" stop-color="var(--brand)" stop-opacity="0"/></linearGradient></defs><path d="${line} L${W} ${H+8} L0 ${H+8}Z" fill="url(#hmg)"/><path d="${line}" fill="none" stroke="var(--brand)" stroke-width="2.5" vector-effect="non-scaling-stroke"/><line id="cl" y1="0" y2="${H+8}" stroke="var(--muted)" stroke-dasharray="3 3" vector-effect="non-scaling-stroke" opacity="0"/></svg><div class="tipv" id="tip" hidden></div></div>
   <div class="months">${ms.map(m=>`<span>${dim[+m.slice(5)-1]}</span>`).join("")}</div>
   <div class="chips"><button class="chip" type="button"${hg("sort","price").replace(' role="button" tabindex="0"',"")}>Average per card<b>${v.pcopies?eur(v.total/v.pcopies):"—"}</b></button><button class="chip" type="button" data-hg="loc" data-hv="showcase">Showcase<b>${eur(cards.filter(c=>c.locType==="showcase").reduce((a,c)=>{const u=unitVal(c);return a+(u==null?0:u*q(c))},0))}</b></button><button class="chip" type="button" data-hg="dup" data-hv="">Duplicate copies<b>${copies-diff}</b></button><button class="chip" type="button" data-hg="all" data-hv="">Different cards<b>${diff}</b></button></div>`;
  const ch=hmq("#chart");ch.onmousemove=e=>{const r=ch.getBoundingClientRect(),x=Math.min(Math.max((e.clientX-r.left)/r.width,0),1),i=Math.round(x*(n-1));const cl=hmq("#cl");cl.setAttribute("x1",i*(W/(n-1)));cl.setAttribute("x2",i*(W/(n-1)));cl.setAttribute("opacity",1);const t=hmq("#tip");t.hidden=false;t.textContent=dim[+ms[i].slice(5)-1]+" · "+eur(vals[i]);t.style.left=(i/(n-1)*100)+"%"};ch.onmouseleave=()=>{hmq("#tip").hidden=true;hmq("#cl").setAttribute("opacity",0)};
  /* needs attention */
  let H2=[];try{H2=healthChecks()}catch{}const hc=id=>H2.find(i=>i.id===id);
  const items=[],plural2=(k,w)=>`${k} ${w}${k===1?"":"s"}`;
  const hits=cards.filter(alertHit);
  if(hits.length)items.push(["warn","!",`${plural2(hits.length,"price alert")} reached`,hits.slice(0,2).map(c=>c.name).join(", ")+(hits.length>2?` and ${hits.length-2} more`:""),"Review",` data-act="alerts"`]);
  const det=hc("det");if(det)items.push(["warn","!",`${plural2(det.items.length,"card")} ${det.items.length===1?"has":"have"} no details`,"Decks and filters can’t use them","Fill in",` data-hg="health" data-hv="det"`]);
  const pic=hc("pic");if(pic)items.push(["warn","!",`${plural2(pic.items.length,"card")} ${pic.items.length===1?"has":"have"} no picture`,"They show a letter instead of artwork","Show",` data-hg="health" data-hv="nopic"`]);
  const dk=hc("decks");if(dk)items.push(["info","i",`${plural2(dk.items.length,"deck")} ${dk.items.length===1?"isn’t":"aren’t"} valid`,String(dk.items[0].t||"").slice(0,70),"Open",` data-hg="scr" data-hv="decks"`]);
  const rest=H2.filter(i=>i.sev==="warn"&&!["det","pic","decks"].includes(i.id));
  if(rest.length)items.push(["warn","!",`${plural2(rest.length,"more thing")} to check`,rest.slice(0,2).map(i=>i.label).join(" · "),"Review",` data-act="health"`]);
  let lb=null;try{lb=localStorage.getItem("pk-lastbackup")}catch{}const bd=lb?daysAgo(lb):null;
  if(cards.length&&(bd==null||bd>14))items.push(["info","i",bd==null?"No backup yet":`Last backup was ${bd} days ago`,"","Back up",` data-act="backup"`]);
  const pc=(c,t)=>hmPct(c,Math.max(cards.length,1));
  const hl=[["Details filled in",cards.filter(c=>c.details).length],["Have a picture",cards.filter(c=>imgSrc(c)).length],["Have a price",cards.filter(c=>unitVal(c)!=null).length]];
  hmq("#attn").innerHTML=`<div class="ch"><h3>Needs attention</h3>${items.length?`<span class="pill bad">${items.length}</span>`:`<span class="pill ok">All clear</span>`}<span class="grow"></span><button class="lk" type="button" data-act="health">Health check</button></div>
   <div class="todo">${items.length?items.map(([s,i,t,sub,a,at])=>`<button class="ti ${s}" type="button"${at}><span class="tic">${i}</span><span class="m">${esc(t)}${sub?`<small>${esc(sub)}</small>`:""}</span><span class="act">${a} ›</span></button>`).join(""):`<div class="ti ok"><span class="tic">✓</span><span class="m">Nothing needs your attention<small>${[bd!=null?`Backed up ${bd===0?"today":bd+" day"+(bd===1?"":"s")+" ago"}`:"",v.latest?`prices of ${v.latest}`:""].filter(Boolean).join(" · ")}</small></span></div>`}</div>
   <div class="health">${hl.map(([l,c],k)=>{const p=pc(c);return `<div class="h" title="${c} of ${cards.length}"><span>${l}</span><span class="t"><i style="width:${p}%;background:${p>=90?"var(--ok)":p>=60?"var(--accent)":"var(--danger)"}"></i></span><b>${p}%</b></div>`}).join("")}</div>`;
  /* strips */
  const top=hm.strip==="top";
  const tl=top?v.list.slice().sort((a,b)=>b.u-a.u).slice(0,6).map(r=>({c:r.c,u:r.u,q:r.q})):cards.filter(c=>c.added).slice().sort((a,b)=>String(b.added).localeCompare(String(a.added))).slice(0,6).map(c=>({c}));
  hmq("#strips").innerHTML=`<div class="ch"><h3>${top?"Most valuable":"Recently added"}</h3><div class="seg" role="group" aria-label="Show"><button type="button" data-s="top" aria-pressed="${top}">Most valuable</button><button type="button" data-s="rec" aria-pressed="${!top}">Recently added</button></div><span class="grow"></span><button class="lk" type="button" ${top?'data-hg="sort" data-hv="price"':'data-hg="all" data-hv=""'}>All cards</button></div>
   ${tl.length?`<div class="strip" data-seq='${esc(JSON.stringify(tl.map(x=>x.c.id)))}'>${tl.map((x,i)=>`<button class="tile" type="button" data-card="${esc(x.c.id)}">${hmArt(x.c,top?i+1:0)}<b class="n">${esc(x.c.name)}</b>${top?`<span class="pr">${eur(x.u)}${x.q>1?` × ${x.q}`:""}</span><small>${esc(x.c.set||x.c.setCode||"")}</small>`:`<small>${esc(x.c.set||x.c.setCode||"")}</small><small>${esc(String(x.c.added).slice(0,10))} · ${esc(locLabel(x.c))}</small>`}</button>`).join("")}</div>`:`<p class="empty">${top?"No prices yet. Use Refresh prices.":"Nothing yet."}</p>`}`;
  /* row 3 */
  const L=[["Binders","binder","var(--brand)"],["Decks","deck","var(--accent)"],["Showcase","showcase","#14b8a6"]].map(([nm,t,col])=>{const cs=cards.filter(c=>c.locType===t);return {nm,t,col,cnt:cs.reduce((a,c)=>a+q(c),0),val:cs.reduce((a,c)=>{const u=unitVal(c);return a+(u==null?0:u*q(c))},0)}});
  const lt=Math.max(L.reduce((a,x)=>a+x.cnt,0),1);
  const owned=new Set(cards.map(dexOf).filter(Boolean));
  const gens=GENS.map(([g,nm,a,b])=>{let o=0;for(const d of owned)if(d>=a&&d<=b)o++;return [g,b-a+1,o]});
  hmq("#r3").innerHTML=`<section class="card"><div class="ch"><h3>Where your cards are</h3></div><div class="stack">${L.map(x=>x.cnt?`<i style="flex:${x.cnt};background:${x.col}" title="${x.nm}: ${x.cnt}"${hg("loc",x.t)}></i>`:"").join("")}</div>${L.map(x=>`<div class="leg go"${hg("loc",x.t)}><i style="background:${x.col}"></i><span>${x.nm}</span><b>${x.cnt}</b><small>${Math.round(x.cnt/lt*100)}%</small><span class="v">${eur(x.val)}</span></div>`).join("")}</section>
   <section class="card"><div class="ch"><h3>Set completion</h3><span class="grow"></span><button class="lk" type="button" data-hg="scr" data-hv="stats|setPanel">All sets</button></div>${srows.slice(0,5).map(r=>`<div class="sb"${hg("exp",r.k)}><span>${esc(r.k)}</span><span class="t"><i style="width:${r.p}%"></i></span><span>${r.p}%</span></div>`).join("")||`<p class="empty">Add cards with set numbers to see progress.</p>`}</section>
   <section class="card"><div class="ch"><h3>Pokédex</h3><span class="grow"></span><button class="lk" type="button" data-hg="scr" data-hv="stats|dexPanel">Open</button></div><div class="ring"><div class="donut" style="--p:${spc/DEX_TOTAL*100}%"><span><b>${spc}</b><small>of ${DEX_TOTAL}</small></span></div><div class="gens">${gens.map(([g,t,o])=>`<div><span>Gen ${g}</span><span class="t"><i style="width:${o/t*100}%"></i></span><span>${o}/${t}</span></div>`).join("")}</div></div></section>`;
  /* row 2 */
  const acts=(S.activity||[]).slice(0,5);
  const rm={};cards.forEach(c=>{const k=c.rarity||"Not set";rm[k]=(rm[k]||0)+q(c)});
  const rr=Object.entries(rm).sort((a,b)=>b[1]-a[1]).slice(0,5),rmx=Math.max(...rr.map(x=>x[1]),1),PAL=["#3b4cca","#f2b705","#14b8a6","#e5484d","#a855f7"];
  hmq("#r2").innerHTML=`<section class="card"><div class="ch"><h3>Recent activity</h3><span class="grow"></span><button class="lk" type="button" data-act="backup">Full history</button></div><div class="act">${acts.length?acts.map(a=>`<div class="ai"><time>${new Date(a.t).toLocaleDateString("en-GB",{day:"numeric",month:"short"})}</time><span>${esc(a.label)}</span></div>`).join(""):`<p class="empty">Nothing yet. Changes you make will be listed here.</p>`}</div></section>
   <section class="card"><div class="ch"><h3>Rarity</h3><span class="grow"></span><button class="lk" type="button" data-hg="scr" data-hv="stats|chartPanel">Analytics</button></div>${rr.map(([nm,c],i)=>`<div class="sb" style="grid-template-columns:1fr 70px 40px"${hg("rar",nm)}><span>${esc(nm)}</span><span class="t"><i style="width:${c/rmx*100}%;background:${PAL[i]}"></i></span><span>${c}</span></div>`).join("")||`<p class="empty">Nothing yet.</p>`}</section>`;
}

hmReady=true;

/* ---- shared score cards (Binders, Decks) ---- */
function ptKpis(list,l1,l2,n2,s2){
  let copies=0,tot=0,un=0,best=null,bv=-1;
  for(const c of list){const q=+c.qty||1;copies+=q;const u=unitVal(c);if(u==null){un++;continue}tot+=u*q;if(u>bv){bv=u;best=c}}
  return [[l1,copies.toLocaleString("en-GB"),new Set(list.map(cardKey)).size.toLocaleString("en-GB")+" unique"],[n2===1?l2.replace(/s$/,""):l2,n2,s2],["Estimated value",eur(tot),un?un+" unpriced":""],["Most valuable",best?eur(bv):"—",best?best.name:""]]
   .map(([l,v,s])=>`<div class="card kpi"><b>${v}</b><small>${l}${s?" · "+esc(s):""}</small></div>`).join("");
}
(async()=>{
  const s=await use("sample");
  const lim=s?await s.limits().catch(()=>null):null;
  if(s&&lim&&lim.images){S.sample=s}else{$("#noScan").classList.remove("hidden");$("#scanRow").classList.add("hidden")}
  S.downloads=await use("downloads");if(!S.downloads)S.downloads={fb:true,save:async({filename,data})=>saveBlob(filename,data,/\.html$/.test(filename)?"text/html":/\.csv$/.test(filename)?"text/csv":"application/json")};S.assets=await use("assets");render();
})();
