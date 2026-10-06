const app=document.querySelector("#app"),sheet=document.querySelector("#sheet");let view="today";
const SUPABASE_URL="https://cytpwgcwviasbezkfqmx.supabase.co";
const SUPABASE_KEY="sb_publishable_yABGA2cQpE1c3kmCjq_7RQ_djbttJFk";
const db=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true}});
let session=null,entries=[],areas=[],themes=[],people=[];
const nav=[...document.querySelectorAll("nav button")];
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fmt=d=>new Intl.DateTimeFormat("pt-PT",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"}).format(new Date(d));
const titleOf=s=>s.length>42?s.slice(0,42)+"…":s;
function rowToEntry(r){const q=r.type==="question";return{id:r.id,type:r.type,icon:q?"❓":"📝",title:titleOf(r.text||""),meta:(r.area?.name?r.area.name+" · ":"")+fmt(r.created_at)+(q?" · "+(r.question_status==="answered"?"Respondida":"Pendente"):""),text:r.text||"",area:r.area?.name||"",theme:r.theme?.name||"",person:r.person?.name||"",favorite:!!r.favorite,status:r.question_status,answer:r.answer||"",answeredBy:r.answer_person?.name||"",answeredAt:r.answered_at||null,created_at:r.created_at,updated_at:r.updated_at}}
async function loadTaxonomy(){
  if(!session)return;
  const [a,t,p]=await Promise.all([
    db.from("areas").select("id,name").eq("active",true).order("name"),
    db.from("themes").select("id,name,area_id").eq("active",true).order("name"),
    db.from("people").select("id,name").eq("active",true).order("name")
  ]);
  if(a.error)throw a.error;if(t.error)throw t.error;if(p.error)throw p.error;
  areas=a.data||[];themes=t.data||[];people=p.data||[];
}
async function loadEntries(){if(!session)return;const{data,error}=await db.from("entries").select("*,area:areas(name),theme:themes(name),person:people!entries_person_id_fkey(name),answer_person:people!entries_answered_by_id_fkey(name)").is("deleted_at",null).order("created_at",{ascending:false});if(error){console.error(error);return}entries=(data||[]).map(rowToEntry)}
function loginScreen(msg=""){document.querySelector("header").style.display="none";document.querySelector("nav").style.display="none";app.innerHTML='<div style="padding-top:18vh"><h1>🐾 Caderno Veterinário</h1><div class="muted">Entra no teu caderno pessoal.</div><div class="card"><div class="field"><label>Email</label><input id="loginEmail" type="email" autocomplete="email"></div><div class="field"><label>Palavra-passe</label><input id="loginPassword" type="password" autocomplete="current-password"></div><button class="btn" id="loginBtn">Entrar</button><div id="loginMsg" class="muted small center-note">'+esc(msg)+'</div></div></div>';document.querySelector("#loginBtn").onclick=login}
async function login(){const b=document.querySelector("#loginBtn"),m=document.querySelector("#loginMsg");b.disabled=true;m.textContent="A entrar…";const{data,error}=await db.auth.signInWithPassword({email:document.querySelector("#loginEmail").value.trim(),password:document.querySelector("#loginPassword").value});if(error){m.textContent="Não foi possível entrar. Confirma o email e a palavra-passe.";b.disabled=false;return}session=data.session;document.querySelector("header").style.display="";document.querySelector("nav").style.display="";await loadEntries();render()}
const recent=()=>entries.length?entries.slice(0,5).map(e=>'<button class="recent-item recent-button" data-entry="'+e.id+'"><div class="item-icon">'+e.icon+'</div><div class="item-main"><div class="item-title">'+esc(e.title)+'</div><div class="item-meta">'+esc(e.meta)+'</div></div><div class="chev">›</div></button>').join(""):'<div class="muted small" style="padding:12px 0">Ainda não tens registos. Cria o primeiro em + Novo.</div>';
function bindEntries(){document.querySelectorAll("[data-entry]").forEach(b=>b.onclick=()=>openEntry(b.dataset.entry))}
function renderNotebookList(favoritesOnly){
  document.querySelector("#showAll")?.classList.toggle("active",!favoritesOnly);document.querySelector("#showFavs")?.classList.toggle("active",favoritesOnly);
  const box=document.querySelector("#notebookEntries");if(!box)return;
  const list=favoritesOnly?entries.filter(e=>e.favorite):entries.slice(0,5);
  box.innerHTML=list.length?list.map(e=>'<button class="recent-item recent-button" data-entry="'+e.id+'"><div class="item-icon">'+e.icon+'</div><div class="item-main"><div class="item-title">'+esc(e.title)+(e.favorite?' ⭐':'')+'</div><div class="item-meta">'+esc(e.meta)+'</div></div><div class="chev">›</div></button>').join(""):'<div class="muted small" style="padding:12px 0">'+(favoritesOnly?'Ainda não tens favoritos.':'Ainda não tens registos.')+'</div>';
  bindEntries()
}

function render(){nav.forEach(b=>b.classList.toggle("active",b.dataset.view===view));const notes=entries.filter(e=>e.type==="note").length,qs=entries.filter(e=>e.type==="question").length,pending=entries.filter(e=>e.type==="question"&&e.status!=="answered").length;
if(view==="today")app.innerHTML='<h1>Olá, Rute</h1><div class="muted">'+new Intl.DateTimeFormat("pt-PT",{weekday:"long",day:"numeric",month:"long"}).format(new Date())+'</div><div class="card primary-card"><button class="new-btn" id="newEntry">＋ Novo<small>Nota ou dúvida</small></button></div><div class="eyebrow">Hoje</div><div class="card"><div class="summary"><span class="pill">📝 '+notes+' notas</span><span class="pill">❓ '+qs+' dúvidas</span></div></div><div class="eyebrow">Continuar</div><div class="card"><div class="continue-item">❓ <div class="item-main item-title">'+pending+' dúvidas pendentes</div><div class="chev">›</div></div></div><div class="eyebrow">Recentes</div><div class="card">'+recent()+'</div>';
else if(view==="notebook"){app.innerHTML='<h1>Caderno</h1><div class="muted">O teu diário de aprendizagem</div><div class="summary notebook-tabs"><button class="notebook-tab active" id="showAll">Todos</button><button class="notebook-tab" id="showFavs">⭐ Favoritos</button></div><div class="card" id="notebookEntries">'+recent()+'</div>';document.querySelector("#showAll").onclick=()=>renderNotebookList(false);document.querySelector("#showFavs").onclick=()=>renderNotebookList(true)}
else if(view==="learn")app.innerHTML='<h1>Aprender</h1><div class="muted">Procedimentos e evolução</div><div class="card placeholder">📚<h2>O teu manual pessoal</h2><div class="muted">Os procedimentos entram na próxima etapa.</div></div>';
else app.innerHTML='<h1>Procurar</h1><div class="muted">Pesquisa global no teu caderno</div><div class="card"><input class="searchbox" id="searchInput" placeholder="Pesquisar notas e dúvidas…"><div id="searchResults"></div></div>';
const n=document.querySelector("#newEntry");if(n)n.onclick=openType;bindEntries();const si=document.querySelector("#searchInput");if(si)si.oninput=()=>{const q=si.value.trim().toLowerCase(),box=document.querySelector("#searchResults");if(!q){box.innerHTML="";return}const found=entries.filter(e=>(e.title+" "+e.meta+" "+e.text).toLowerCase().includes(q));box.innerHTML=found.length?found.map(e=>'<button class="recent-item recent-button" data-entry="'+e.id+'"><div class="item-icon">'+e.icon+'</div><div class="item-main"><div class="item-title">'+esc(e.title)+'</div><div class="item-meta">'+esc(e.meta)+'</div></div><div class="chev">›</div></button>').join(""):'<div class="muted small search-empty">Sem resultados.</div>';bindEntries()}}
nav.forEach(b=>b.onclick=()=>{view=b.dataset.view;render()});function close(){sheet.classList.add("hidden");sheet.innerHTML=""}
function openType(){sheet.classList.remove("hidden");sheet.innerHTML='<div class="sheet-panel"><div class="sheet-handle"></div><div class="row"><div class="sheet-title">Novo registo</div><button class="close" id="x">×</button></div><div class="type-grid"><button class="type-btn" data-t="Nota"><b>📝</b>Nota</button><button class="type-btn" data-t="Dúvida"><b>❓</b>Dúvida</button></div></div>';document.querySelector("#x").onclick=close;document.querySelectorAll(".type-btn").forEach(b=>b.onclick=()=>editor(b.dataset.t))}
async function editor(t){
  const label=t==="Dúvida"?"Qual é a tua dúvida?":"O que aprendeste?";
  try{await loadTaxonomy()}catch(e){console.error(e)}
  const areaOpts=areas.map(a=>'<option value="'+a.id+'">'+esc(a.name)+'</option>').join("");
  const peopleOpts=people.map(p=>'<option value="'+p.id+'">'+esc(p.name)+'</option>').join("");
  sheet.innerHTML='<div class="sheet-panel"><div class="sheet-handle"></div><div class="row"><div class="sheet-title">Nova '+t.toLowerCase()+'</div><button class="close" id="x">×</button></div><div class="field"><label>'+label+'</label><textarea id="txt" placeholder="Escreve aqui…" autofocus></textarea></div><details class="details"><summary>Adicionar detalhes</summary><div class="field"><label>Área</label><select id="area"><option value="">Sem área</option>'+areaOpts+'<option value="__new">＋ Nova área…</option></select></div><div id="newAreaBox"></div><div class="field"><label>Tema</label><select id="theme" disabled><option value="">Sem tema</option></select></div><div id="newThemeBox"></div><div class="field"><label>Pessoa</label><select id="person"><option value="">Sem pessoa</option>'+peopleOpts+'<option value="__new">＋ Nova pessoa…</option></select></div><div id="newPersonBox"></div></details><button class="btn" id="save">Guardar</button><div id="saveMsg" class="muted small center-note">Data e hora são registadas automaticamente.</div></div>';
  document.querySelector("#x").onclick=close;
  const area=document.querySelector("#area"),theme=document.querySelector("#theme");
  function fillThemes(){const aid=area.value;theme.innerHTML='<option value="">Sem tema</option>'+themes.filter(x=>x.area_id===aid).map(x=>'<option value="'+x.id+'">'+esc(x.name)+'</option>').join("")+(aid&&aid!=="__new"?'<option value="__new">＋ Novo tema…</option>':"");theme.disabled=!aid||aid==="__new";document.querySelector("#newThemeBox").innerHTML=""}
  area.onchange=()=>{
    document.querySelector("#newAreaBox").innerHTML=area.value==="__new"?'<div class="field"><label>Nome da nova área</label><input id="newAreaName" placeholder="Ex.: Internamento"></div>':"";
    if(area.value==="__new"){
      theme.disabled=false;theme.removeAttribute("disabled");theme.innerHTML='<option value="">Sem tema</option><option value="__new">＋ Novo tema…</option>';
      document.querySelector("#newThemeBox").innerHTML="";
      document.querySelector("#newAreaName")?.focus();
    }else fillThemes()
  };
  theme.onchange=()=>{document.querySelector("#newThemeBox").innerHTML=theme.value==="__new"?'<div class="field"><label>Nome do novo tema</label><input id="newThemeName" placeholder="Ex.: Fluidoterapia"></div>':"";if(theme.value==="__new"){const focusTheme=()=>document.querySelector("#newThemeName")?.focus();focusTheme();setTimeout(focusTheme,80)}};
  const person=document.querySelector("#person");person.onchange=()=>{document.querySelector("#newPersonBox").innerHTML=person.value==="__new"?'<div class="field"><label>Nome da nova pessoa</label><input id="newPersonName" placeholder="Ex.: Sandra"></div>':"";if(person.value==="__new"){const focusPerson=()=>document.querySelector("#newPersonName")?.focus();focusPerson();setTimeout(focusPerson,80)}};setTimeout(()=>document.querySelector("#txt")?.focus(),50);document.querySelector("#save").onclick=()=>saveEntry(t)
}
async function saveEntry(t){
  const txt=document.querySelector("#txt"),b=document.querySelector("#save"),m=document.querySelector("#saveMsg"),v=txt.value.trim();if(!v)return;
  m.textContent="A guardar…";b.disabled=true;
  try{
    let areaId=document.querySelector("#area")?.value||null,themeId=document.querySelector("#theme")?.value||null,personId=document.querySelector("#person")?.value||null;
    if(areaId==="__new"){
      const name=document.querySelector("#newAreaName")?.value.trim();if(!name)throw new Error("Escreve o nome da nova área.");
      const wantsNewTheme=themeId==="__new";
      const r=await db.from("areas").insert({user_id:session.user.id,name}).select("id").single();if(r.error)throw r.error;areaId=r.data.id;
      if(!wantsNewTheme)themeId=null;
    }
    if(themeId==="__new"){
      const name=document.querySelector("#newThemeName")?.value.trim();if(!name)throw new Error("Escreve o nome do novo tema.");
      const r=await db.from("themes").insert({user_id:session.user.id,area_id:areaId,name}).select("id").single();if(r.error)throw r.error;themeId=r.data.id;
    }
    if(personId==="__new"){const name=document.querySelector("#newPersonName")?.value.trim();if(!name)throw new Error("Escreve o nome da nova pessoa.");const r=await db.from("people").insert({user_id:session.user.id,name}).select("id").single();if(r.error)throw r.error;personId=r.data.id;}
    const payload={user_id:session.user.id,type:t==="Dúvida"?"question":"note",text:v,area_id:areaId||null,theme_id:themeId||null,person_id:personId||null};
    if(t==="Dúvida")payload.question_status="pending";
    const{data,error}=await db.from("entries").insert(payload).select("id").single();if(error)throw error;
    const confirm=await db.from("entries").select("id").eq("id",data.id).single();if(confirm.error)throw confirm.error;
    await loadEntries();m.textContent="Guardado e confirmado.";setTimeout(()=>{close();view="notebook";render()},350)
  }catch(error){console.error(error);m.textContent="Erro: "+(error.message||"não foi possível guardar")+(error.code?" ["+error.code+"]":"");b.disabled=false}
}
function openEntry(id){const e=entries.find(x=>String(x.id)===String(id));if(!e)return;sheet.classList.remove("hidden");const q=e.type==="question";sheet.innerHTML='<div class="sheet-panel"><div class="sheet-handle"></div><div class="row"><div><div class="entry-kind">'+(q?"Dúvida":"Nota")+'</div><div class="sheet-title entry-title">'+esc(e.title)+'</div></div><button class="close" id="x">×</button></div><div class="card entry-card"><div class="entry-text">'+esc(e.text)+'</div>'+(e.area||e.theme||e.person?'<div class="entry-meta"><div class="summary">'+(e.area?'<span class="pill">Área · '+esc(e.area)+'</span>':'')+(e.theme?'<span class="pill">Tema · '+esc(e.theme)+'</span>':'')+(e.person?'<span class="pill">Pessoa · '+esc(e.person)+'</span>':'')+'</div></div>':'')+'<div class="item-meta entry-meta">'+esc(e.meta)+'</div></div>'+(q&&e.status==="answered"&&e.answer?'<div class="card entry-card"><div class="entry-kind">Resposta</div><div class="entry-text">'+esc(e.answer)+'</div><div class="item-meta entry-meta">'+(e.answeredBy?'Respondida por '+esc(e.answeredBy)+(e.answeredAt?' · '+fmt(e.answeredAt):''):(e.answeredAt?'Respondida em '+fmt(e.answeredAt):''))+'</div></div>':'')+(q&&e.status!=="answered"?'<button class="btn" id="answerEntry">Responder</button>':'')+'<button class="btn secondary" id="favoriteEntry">'+(e.favorite?'★ Favorito':'☆ Adicionar aos favoritos')+'</button><button class="btn secondary" id="editEntry">Editar</button><div id="favoriteMsg" class="muted small center-note"></div></div>';document.querySelector("#x").onclick=close;document.querySelector("#editEntry").onclick=()=>editEntry(e);document.querySelector("#favoriteEntry").onclick=()=>toggleFavorite(e);if(q&&e.status!=="answered")document.querySelector("#answerEntry").onclick=()=>answerEntry(e)}

async function toggleFavorite(e){
  const btn=document.querySelector("#favoriteEntry"),msg=document.querySelector("#favoriteMsg");
  if(btn)btn.disabled=true;
  if(msg)msg.textContent="A guardar…";
  const next=!e.favorite;
  const {data,error}=await db.from("entries").update({favorite:next}).eq("id",e.id).select("favorite").single();
  if(error){if(msg)msg.textContent="Erro: "+error.message;if(btn)btn.disabled=false;return}
  e.favorite=!!data.favorite;
  if(msg)msg.textContent=e.favorite?"Guardado como favorito.":"Removido dos favoritos.";
  if(btn){btn.disabled=false;btn.textContent=e.favorite?"★ Favorito":"☆ Adicionar aos favoritos"}
}

async function answerEntry(e){
  try{await loadTaxonomy()}catch(err){console.error(err)}
  const peopleOpts=people.map(p=>'<option value="'+p.id+'">'+esc(p.name)+'</option>').join("");
  sheet.innerHTML='<div class="sheet-panel"><div class="sheet-handle"></div><div class="row"><div class="sheet-title">Responder à dúvida</div><button class="close" id="x">×</button></div><div class="card entry-card"><div class="entry-text">'+esc(e.text)+'</div></div><div class="field"><label>Resposta</label><textarea id="answerTxt" placeholder="Escreve aqui a resposta…"></textarea></div><div class="field"><label>Quem respondeu?</label><select id="answerPerson"><option value="">Não indicar</option>'+peopleOpts+'<option value="__new">＋ Nova pessoa…</option></select></div><div id="answerNewPersonBox"></div><button class="btn" id="saveAnswer">Guardar resposta</button><div id="answerMsg" class="muted small center-note"></div></div>';
  document.querySelector("#x").onclick=()=>openEntry(e.id);
  const pe=document.querySelector("#answerPerson");
  pe.onchange=()=>{document.querySelector("#answerNewPersonBox").innerHTML=pe.value==="__new"?'<div class="field"><label>Nome da nova pessoa</label><input id="answerNewPersonName" placeholder="Ex.: Sandra"></div>':"";if(pe.value==="__new"){const f=()=>document.querySelector("#answerNewPersonName")?.focus();f();setTimeout(f,80)}};
  setTimeout(()=>document.querySelector("#answerTxt")?.focus(),50);
  document.querySelector("#saveAnswer").onclick=async()=>{
    const btn=document.querySelector("#saveAnswer"),m=document.querySelector("#answerMsg"),answer=document.querySelector("#answerTxt").value.trim();if(!answer)return;
    m.textContent="A guardar…";btn.disabled=true;
    try{
      let person=pe.value||null;
      if(person==="__new"){const name=document.querySelector("#answerNewPersonName")?.value.trim();if(!name)throw new Error("Escreve o nome de quem respondeu.");const r=await db.from("people").insert({user_id:session.user.id,name}).select("id").single();if(r.error)throw r.error;person=r.data.id}
      const payload={answer,answered_by_id:person,answered_at:new Date().toISOString(),question_status:"answered"};
      const{error}=await db.from("entries").update(payload).eq("id",e.id);if(error)throw error;
      await loadEntries();openEntry(e.id)
    }catch(err){m.textContent="Erro: "+(err.message||"não foi possível guardar");btn.disabled=false}
  }
}

async function editEntry(e){
  try{await loadTaxonomy()}catch(err){console.error(err)}
  const areaId=areas.find(a=>a.name===e.area)?.id||"",themeId=themes.find(t=>t.name===e.theme)?.id||"",personId=people.find(p=>p.name===e.person)?.id||"";
  const areaOpts=areas.map(x=>'<option value="'+x.id+'" '+(x.id===areaId?"selected":"")+'>'+esc(x.name)+'</option>').join("");
  const personOpts=people.map(x=>'<option value="'+x.id+'" '+(x.id===personId?"selected":"")+'>'+esc(x.name)+'</option>').join("");
  sheet.innerHTML='<div class="sheet-panel"><div class="sheet-handle"></div><div class="row"><div class="sheet-title">Editar '+(e.type==="question"?"dúvida":"nota")+'</div><button class="close" id="x">×</button></div><div class="field"><label>Texto</label><textarea id="editTxt">'+esc(e.text)+'</textarea></div><div class="field"><label>Área</label><select id="editArea"><option value="">Sem área</option>'+areaOpts+'<option value="__new">＋ Nova área…</option></select></div><div id="editNewAreaBox"></div><div class="field"><label>Tema</label><select id="editTheme"></select></div><div id="editNewThemeBox"></div><div class="field"><label>Pessoa</label><select id="editPerson"><option value="">Sem pessoa</option>'+personOpts+'<option value="__new">＋ Nova pessoa…</option></select></div><div id="editNewPersonBox"></div><button class="btn" id="saveEdit">Guardar alterações</button><div id="editMsg" class="muted small center-note"></div></div>';
  document.querySelector("#x").onclick=()=>openEntry(e.id);
  const ar=document.querySelector("#editArea"),th=document.querySelector("#editTheme"),pe=document.querySelector("#editPerson");
  function fillTheme(selected=themeId){const opts=themes.filter(x=>x.area_id===ar.value);th.innerHTML='<option value="">Sem tema</option>'+opts.map(x=>'<option value="'+x.id+'" '+(x.id===selected?"selected":"")+'>'+esc(x.name)+'</option>').join("")+(ar.value?'<option value="__new">＋ Novo tema…</option>':"");th.disabled=!ar.value}
  fillTheme();
  ar.onchange=()=>{document.querySelector("#editNewAreaBox").innerHTML=ar.value==="__new"?'<div class="field"><label>Nome da nova área</label><input id="editNewAreaName" placeholder="Ex.: Consultas"></div>':"";document.querySelector("#editNewThemeBox").innerHTML="";if(ar.value==="__new"){th.disabled=false;th.innerHTML='<option value="">Sem tema</option><option value="__new">＋ Novo tema…</option>';document.querySelector("#editNewAreaName")?.focus()}else fillTheme("")};
  th.onchange=()=>{document.querySelector("#editNewThemeBox").innerHTML=th.value==="__new"?'<div class="field"><label>Nome do novo tema</label><input id="editNewThemeName" placeholder="Ex.: Fluidoterapia"></div>':"";if(th.value==="__new"){const f=()=>document.querySelector("#editNewThemeName")?.focus();f();setTimeout(f,80)}};
  pe.onchange=()=>{document.querySelector("#editNewPersonBox").innerHTML=pe.value==="__new"?'<div class="field"><label>Nome da nova pessoa</label><input id="editNewPersonName" placeholder="Ex.: Sandra"></div>':"";if(pe.value==="__new"){const f=()=>document.querySelector("#editNewPersonName")?.focus();f();setTimeout(f,80)}};
  document.querySelector("#saveEdit").onclick=async()=>{
    const btn=document.querySelector("#saveEdit"),m=document.querySelector("#editMsg"),text=document.querySelector("#editTxt").value.trim();if(!text)return;m.textContent="A guardar…";btn.disabled=true;
    try{
      let area=ar.value||null,theme=th.value||null,person=pe.value||null;
      if(area==="__new"){const name=document.querySelector("#editNewAreaName")?.value.trim();if(!name)throw new Error("Escreve o nome da nova área.");const wants=theme==="__new";const r=await db.from("areas").insert({user_id:session.user.id,name}).select("id").single();if(r.error)throw r.error;area=r.data.id;if(!wants)theme=null}
      if(theme==="__new"){const name=document.querySelector("#editNewThemeName")?.value.trim();if(!name)throw new Error("Escreve o nome do novo tema.");const r=await db.from("themes").insert({user_id:session.user.id,area_id:area,name}).select("id").single();if(r.error)throw r.error;theme=r.data.id}
      if(person==="__new"){const name=document.querySelector("#editNewPersonName")?.value.trim();if(!name)throw new Error("Escreve o nome da nova pessoa.");const r=await db.from("people").insert({user_id:session.user.id,name}).select("id").single();if(r.error)throw r.error;person=r.data.id}
      const{error}=await db.from("entries").update({text,area_id:area,theme_id:theme,person_id:person}).eq("id",e.id);if(error)throw error;
      await loadEntries();openEntry(e.id)
    }catch(err){m.textContent="Erro: "+(err.message||"não foi possível guardar");btn.disabled=false}
  }
}
sheet.onclick=e=>{if(e.target===sheet)close()};document.querySelector("#menuBtn").onclick=()=>{sheet.classList.remove("hidden");sheet.innerHTML='<div class="sheet-panel"><div class="sheet-handle"></div><div class="row"><div class="sheet-title">Caderno Veterinário</div><button class="close" id="x">×</button></div><div class="card"><button class="btn secondary" id="logout">Terminar sessão</button></div><div class="muted small">V1 · dados reais no Supabase</div></div>';document.querySelector("#x").onclick=close;document.querySelector("#logout").onclick=async()=>{await db.auth.signOut();session=null;close();loginScreen()}};
(async()=>{const{data}=await db.auth.getSession();session=data.session;if(!session){loginScreen();return}document.querySelector("header").style.display="";document.querySelector("nav").style.display="";await loadEntries();render()})();