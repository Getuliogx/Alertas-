const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const TMDB_STORE = "tmdb_api_key_v3"; // mantém compatibilidade com a versão anterior
const DTTD_STORE = "dttd_api_key_v3";
const TAXONOMY_STORE = "dttd_taxonomy_v1";
const IMG = "https://image.tmdb.org/t/p/";

const CATEGORIES = [
  {id:"violence", label:"violência", message:"violência", re:/\b(violence|violent|murder|murdered|kill|killed|killing|assault|fight|fighting|weapon|gun|shoot|shot|stab|stabbing|torture|execution|war|battle|beating|strangl|hanging|decapitat)/i},
  {id:"gore", label:"sangue / gore", message:"sangue, ferimentos ou gore", re:/\b(blood|bloody|gore|gory|graphic violence|injur|wound|mutilat|dismember|decapitat|body horror|corpse|dead body|open wound|amputation)/i},
  {id:"suicide", label:"suicídio / automutilação", message:"suicídio ou automutilação", re:/\b(suicide|suicidal|self harm|self-harm|selfharm|cuts? themself|cutting|attempted suicide)/i},
  {id:"death", label:"morte / luto", message:"morte e luto", re:/\b(death|dies|die\b|dying|dead|funeral|grief|bereave|corpse)/i},
  {id:"sexual_violence", label:"violência sexual", message:"violência ou abuso sexual", re:/\b(rape|raped|sexual assault|sexual abuse|molest|non[- ]?consensual|sexual violence)/i},
  {id:"sex", label:"conteúdo sexual", message:"conteúdo sexual", re:/\b(sex\b|sexual content|sexual activity|intercourse|masturbat|orgasm|erotic|porn|prostitut|sex scene)/i},
  {id:"nudity", label:"nudez", message:"nudez", re:/\b(nudity|nude\b|naked|genital|breast|topless)/i},
  {id:"profanity", label:"linguagem forte", message:"linguagem forte", re:/\b(profanity|swearing|strong language|slur|cuss|cursing|f[- ]?word)/i},
  {id:"drugs", label:"drogas", message:"uso ou referência a drogas", re:/\b(drug|cocaine|heroin|meth|marijuana|weed|cannabis|psychedelic|hallucin|mushroom|narcotic|overdose|substance abuse|opioid)/i},
  {id:"alcohol", label:"álcool", message:"consumo de álcool", re:/\b(alcohol|drinking|drunk|alcoholism|beer|wine|liquor)/i},
  {id:"smoking", label:"tabagismo", message:"tabagismo", re:/\b(smoking|cigarette|cigar|tobacco|vaping|vape)/i},
  {id:"fear", label:"sustos / cenas intensas", message:"sustos, tensão ou cenas intensas", re:/\b(jump scare|jumpscare|scary|frightening|intense scene|horror|terror|panic|disturbing|nightmare|fear|screaming|loud noise|loud sound)/i},
  {id:"flashing", label:"luzes piscantes", message:"luzes piscantes", re:/\b(flashing light|strobe|photosens|flicker)/i},
  {id:"abuse", label:"abuso / violência doméstica", message:"abuso ou violência doméstica", re:/\b(domestic abuse|domestic violence|physical abuse|emotional abuse|abusive parent|abuse\b|abused\b)/i},
  {id:"child", label:"crianças em perigo", message:"crianças em perigo ou sofrimento", re:/\b(child abuse|child death|child dies|kid dies|kidnapp.*child|child in danger|child endanger|baby dies|infant death)/i},
  {id:"animal", label:"animais feridos / mortos", message:"ferimentos ou morte de animais", re:/\b(dog dies|cat dies|horse dies|animal dies|animal death|animal abuse|animal harm|dead animal|pet dies|animal is killed|animal cruelty)/i},
  {id:"vomit", label:"vômito", message:"vômito", re:/\b(vomit|vomiting|throws? up|puk)/i},
  {id:"medical", label:"agulhas / procedimentos médicos", message:"agulhas ou procedimentos médicos", re:/\b(needle|injection|syringe|medical procedure|surgery|hospital scene|blood draw)/i},
  {id:"drowning", label:"afogamento / sufocamento", message:"afogamento ou sufocamento", re:/\b(drown|drowning|suffocat|chok|asphyx|buried alive)/i},
  {id:"pregnancy", label:"gravidez / parto", message:"gravidez, parto ou perda gestacional", re:/\b(pregnan|childbirth|birth scene|miscarriage|stillbirth|abortion)/i},
  {id:"discrimination", label:"preconceito / discriminação", message:"preconceito ou discriminação", re:/\b(racis|racial slur|homophobia|homophobic|transphobia|transphobic|antisemit|sexism|discrimination|hate speech)/i},
  {id:"eating", label:"transtornos alimentares", message:"transtornos alimentares", re:/\b(eating disorder|anorexia|bulimia|binge eating|purging)/i},
  {id:"mental", label:"saúde mental / crise", message:"crises de saúde mental", re:/\b(mental illness|mental health|psychosis|psychotic|panic attack|dissociation|institutionalized|psychiatric)/i},
  {id:"disturbing", label:"temas perturbadores", message:"temas ou imagens perturbadoras", re:/\b(disturbing|trauma|traumatic|cult|ritual|human sacrifice|cannibal|body horror|incest|kidnapping|hostage)/i}
];

const state = {
  movie:null, cert:"", sourceMode:"tmdb", dttdItem:null, dttdUsed:false,
  entries:new Map(), evidence:[], taxonomy:null
};

function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));}
function status(node,text,kind=""){node.textContent=text;node.className=`status ${kind}`.trim();}
function getTmdb(){return localStorage.getItem(TMDB_STORE)||"";}
function getDttd(){return localStorage.getItem(DTTD_STORE)||"";}
function joinPt(a){if(!a.length)return"";if(a.length===1)return a[0];return `${a.slice(0,-1).join(", ")} e ${a.at(-1)}`;}
function yearOf(m){return m?.release_date ? m.release_date.slice(0,4):"";}

function updateSourceStates(){
  $("#tmdbState").textContent=getTmdb()?"configurada":"não configurada";
  $("#tmdbState").classList.toggle("on",!!getTmdb());
  $("#dttdState").textContent=getDttd()?"configurada":"não configurada";
  $("#dttdState").classList.toggle("on",!!getDttd());
  $("#tmdbKey").value=getTmdb();
  $("#dttdKey").value=getDttd();
}
updateSourceStates();

$("#openSettings").onclick=()=>{$("#settings").classList.remove("hidden");updateSourceStates();};
$("#closeSettings").onclick=()=>$("#settings").classList.add("hidden");

async function tmdb(path, params={}){
  const key=getTmdb();
  if(!key) throw new Error("Salve sua chave da TMDB em Fontes.");
  const q=new URLSearchParams({api_key:key,...params});
  const r=await fetch(`https://api.themoviedb.org/3${path}?${q}`);
  if(!r.ok){
    if(r.status===401) throw new Error("A chave da TMDB foi recusada.");
    throw new Error(`Erro TMDB (${r.status}).`);
  }
  return r.json();
}

async function dttd(path){
  const key=getDttd();
  if(!key) throw new Error("DoesTheDogDie não configurado.");
  const r=await fetch(`https://www.doesthedogdie.com/api/v3${path}`,{
    headers:{"X-API-KEY":key}
  });
  if(!r.ok){
    let msg=`Erro DoesTheDogDie (${r.status}).`;
    try{const e=await r.json(); if(e.message) msg=e.message;}catch{}
    throw new Error(msg);
  }
  return r.json();
}

$("#saveTmdb").onclick=async()=>{
  const k=$("#tmdbKey").value.trim();
  if(!k){status($("#settingsStatus"),"Digite a chave da TMDB.","error");return;}
  localStorage.setItem(TMDB_STORE,k);
  try{
    await tmdb("/configuration");
    status($("#settingsStatus"),"TMDB validada e salva neste navegador.","ok");
  }catch(e){
    localStorage.removeItem(TMDB_STORE);
    status($("#settingsStatus"),e.message,"error");
  }
  updateSourceStates();
};

$("#saveDttd").onclick=async()=>{
  const k=$("#dttdKey").value.trim();
  if(!k){status($("#settingsStatus"),"Digite a chave do DoesTheDogDie.","error");return;}
  localStorage.setItem(DTTD_STORE,k);
  try{
    await dttd("/itemtypes");
    status($("#settingsStatus"),"DoesTheDogDie validado. A análise especializada está ativa.","ok");
  }catch(e){
    localStorage.removeItem(DTTD_STORE);
    status($("#settingsStatus"),`Não foi possível validar: ${e.message}`,"error");
  }
  updateSourceStates();
};
$("#removeDttd").onclick=()=>{
  localStorage.removeItem(DTTD_STORE);
  localStorage.removeItem(TAXONOMY_STORE);
  status($("#settingsStatus"),"Chave do DoesTheDogDie removida deste navegador.","ok");
  updateSourceStates();
};

async function search(){
  const q=$("#query").value.trim();
  if(!q)return;
  $("#results").innerHTML="";
  status($("#searchStatus"),"Pesquisando…");
  try{
    const data=await tmdb("/search/movie",{query:q,language:"pt-BR",region:"BR",include_adult:"false",page:"1"});
    renderResults((data.results||[]).slice(0,14));
  }catch(e){
    status($("#searchStatus"),e.message,"error");
    if(!getTmdb()) $("#settings").classList.remove("hidden");
  }
}
$("#search").onclick=search;
$("#query").addEventListener("keydown",e=>{if(e.key==="Enter")search();});

function renderResults(movies){
  $("#results").innerHTML="";
  if(!movies.length){status($("#searchStatus"),"Nenhum filme encontrado.","error");return;}
  status($("#searchStatus"),`${movies.length} resultado(s).`,"ok");
  for(const m of movies){
    const b=document.createElement("button");
    b.className="result";b.type="button";
    const visual=m.poster_path?`<img src="${IMG}w342${m.poster_path}" alt="" loading="lazy">`:`<div class="noPoster">Sem pôster</div>`;
    b.innerHTML=`${visual}<div class="resultInfo"><strong>${esc(m.title||m.original_title)}</strong><small>${esc(yearOf(m)||"Ano não informado")}</small></div>`;
    b.onclick=()=>loadMovie(m.id);
    $("#results").appendChild(b);
  }
}

async function loadMovie(id){
  status($("#searchStatus"),"Analisando filme…");
  $("#workspace").classList.add("hidden");
  resetAnalysis();
  try{
    const m=await tmdb(`/movie/${id}`,{
      language:"pt-BR",
      append_to_response:"keywords,release_dates,external_ids,reviews"
    });
    state.movie=m;
    state.cert=findBrazilCert(m.release_dates);
    renderMovie();
    analyzeTmdb(m);

    if(getDttd()){
      try{
        await analyzeDttd(m);
      }catch(e){
        state.evidence.push({title:"Fonte especializada indisponível",text:e.message});
      }
    }

    finalizeAnalysis();
    $("#workspace").classList.remove("hidden");
    status($("#searchStatus"),"Análise concluída.","ok");
    $("#workspace").scrollIntoView({behavior:"smooth",block:"start"});
  }catch(e){
    status($("#searchStatus"),e.message,"error");
  }
}

function resetAnalysis(){
  state.entries=new Map();state.evidence=[];state.dttdUsed=false;state.dttdItem=null;state.sourceMode="tmdb";
}

function findBrazilCert(rd){
  const br=(rd?.results||[]).find(x=>x.iso_3166_1==="BR");
  const c=(br?.release_dates||[]).map(x=>(x.certification||"").trim()).filter(Boolean);
  return c[0]||"";
}

function renderMovie(){
  const m=state.movie;
  $("#title").textContent=m.title||m.original_title||"";
  $("#meta").textContent=[yearOf(m),m.runtime?`${m.runtime} min`:"",state.cert?`Classificação BR: ${state.cert}`:"Classificação BR não disponível"].filter(Boolean).join(" • ");
  $("#overview").textContent=m.overview||"Sinopse em português não disponível.";
  const p=$("#poster");
  if(m.poster_path){p.src=`${IMG}w500${m.poster_path}`;p.alt=`Pôster de ${m.title}`;}else{p.removeAttribute("src");p.alt="";}
  $("#genres").innerHTML=(m.genres||[]).map(g=>`<span class="chip">${esc(g.name)}</span>`).join("");
}

function addEntry(catId, source, confidence, detail="", score=0){
  const cat=CATEGORIES.find(c=>c.id===catId); if(!cat)return;
  const existing=state.entries.get(catId);
  const rank={confirmed:3,probable:2,hint:1,manual:0};
  const item={
    id:catId,label:cat.label,message:cat.message,source,confidence,detail,score,
    checked: confidence==="confirmed" || confidence==="probable"
  };
  if(!existing || rank[confidence]>rank[existing.confidence] || score>existing.score){
    if(existing?.checked && confidence==="hint") item.checked=true;
    state.entries.set(catId,item);
  }
}

function classifyText(text){
  const found=[];
  for(const c of CATEGORIES) if(c.re.test(text)) found.push(c.id);
  return [...new Set(found)];
}

function analyzeTmdb(m){
  const keywords=(m.keywords?.keywords||[]).map(k=>k.name||"");
  const reviews=(m.reviews?.results||[]).slice(0,8).map(r=>r.content||"");
  const genres=(m.genres||[]).map(g=>g.name||"");
  const base=[m.overview||"",m.tagline||"",...keywords].join(" | ");
  const reviewText=reviews.join(" | ");

  for(const id of classifyText(base)){
    addEntry(id,"TMDB","hint","Indício em gênero, sinopse ou palavras-chave.",1);
  }

  // Reviews servem só como indício — nunca como confirmação.
  for(const id of classifyText(reviewText)){
    addEntry(id,"TMDB/reviews","hint","Termos relacionados aparecem em resenhas disponíveis pela TMDB.",1);
  }

  const g=genres.join(" ").toLowerCase();
  if(/terror/.test(g)) addEntry("fear","TMDB","hint","Gênero Terror.",1);
  if(/ação|guerra|crime/.test(g)) addEntry("violence","TMDB","hint","Gênero associado a violência.",1);
  if(/terror|thriller/.test(g)) addEntry("disturbing","TMDB","hint","Gênero associado a conteúdo intenso.",1);

  state.evidence.push({
    title:"TMDB",
    text:`Usou título, classificação, gêneros, sinopse, palavras-chave e resenhas disponíveis. Esses dados ajudam, mas não são um guia parental completo.`
  });
}

async function taxonomy(){
  const now=Date.now();
  try{
    const cached=JSON.parse(localStorage.getItem(TAXONOMY_STORE)||"null");
    if(cached && cached.savedAt && now-cached.savedAt<7*24*60*60*1000) return cached.data;
  }catch{}
  const [topics,cats,supers]=await Promise.all([dttd("/topics"),dttd("/topiccategories"),dttd("/topicsupercategories")]);
  const data={topics,cats,supers};
  try{localStorage.setItem(TAXONOMY_STORE,JSON.stringify({savedAt:now,data}));}catch{}
  return data;
}

async function analyzeDttd(m){
  const matches=await dttd(`/items?tmdb=${encodeURIComponent(m.id)}`);
  const movie=(matches||[]).find(x=>String(x.tmdbId)===String(m.id) && /movie/i.test(x.itemTypeName||"")) || (matches||[])[0];
  if(!movie){
    state.evidence.push({title:"DoesTheDogDie",text:"O filme não foi encontrado nessa base especializada."});
    return;
  }
  const [detail,tax]=await Promise.all([dttd(`/items/${movie.id}`),taxonomy()]);
  state.dttdItem=detail;state.dttdUsed=true;state.sourceMode="dttd";
  state.taxonomy=tax;

  const topicMap=new Map((tax.topics||[]).map(t=>[Number(t.id),t]));
  const catMap=new Map((tax.cats||[]).map(c=>[Number(c.id),c]));
  const superMap=new Map((tax.supers||[]).map(s=>[Number(s.id),s]));

  let accepted=0, possible=0;
  for(const s of (detail.topicItemStats||[])){
    const yes=Number(s.yesSum||0), no=Number(s.noSum||0), total=yes+no;
    if(total<=0 || yes<=0) continue;
    const ratio=yes/total;
    if(ratio<0.52 || yes<=no) continue;

    const t=topicMap.get(Number(s.topicId));
    const c=t?catMap.get(Number(t.topicCategoryId)):null;
    const alt=t?catMap.get(Number(t.altTopicCategoryId)):null;
    const sup=c?superMap.get(Number(c.topicSuperCategoryId)):null;
    const blob=[
      s.topicName||"", t?.name||"", t?.keywords||"", t?.description||"",
      c?.name||"", alt?.name||"", sup?.name||""
    ].join(" | ");

    const ids=classifyText(blob);
    if(!ids.length) continue;

    let confidence="hint";
    if(yes>=5 && ratio>=0.68) confidence="confirmed";
    else if(yes>=2 && ratio>=0.60) confidence="probable";

    if(confidence==="hint") possible++; else accepted++;
    const pct=Math.round(ratio*100);
    const detailText=`${s.topicName||"Gatilho"} — ${yes} sim / ${no} não (${pct}% sim).`;
    for(const id of ids) addEntry(id,"DoesTheDogDie",confidence,detailText,yes*ratio);
  }

  state.evidence.push({
    title:"DoesTheDogDie",
    text:`Filme correspondente encontrado pela ID da TMDB. Foram considerados os votos comunitários dos gatilhos. ${accepted} grupo(s) com evidência suficiente para seleção automática${possible?` e ${possible} indício(s) mais fraco(s) mantidos para revisão`:""}.`
  });
}

function finalizeAnalysis(){
  renderWarnings();
  renderManual();
  renderEvidence();
  updateQuality();
  generateMessage();
}

function sortedEntries(){
  const order=CATEGORIES.map(c=>c.id);
  return [...state.entries.values()].sort((a,b)=>{
    const r={confirmed:3,probable:2,hint:1,manual:0};
    return r[b.confidence]-r[a.confidence] || order.indexOf(a.id)-order.indexOf(b.id);
  });
}

function renderWarnings(){
  const box=$("#warnings");
  const entries=sortedEntries();
  if(!entries.length){
    box.innerHTML=`<div class="notice">Nenhum aviso específico foi encontrado automaticamente. Isso não significa que o filme não tenha conteúdo sensível.</div>`;
    return;
  }
  box.innerHTML="";
  for(const e of entries){
    const div=document.createElement("label");
    div.className=`warning ${e.checked?"active":""}`;
    const confLabel=e.confidence==="confirmed"?"confirmado":e.confidence==="probable"?"provável":"indício";
    div.innerHTML=`
      <input type="checkbox" data-id="${e.id}" ${e.checked?"checked":""}>
      <span class="warningBody">
        <span class="warningTitle"><strong>${esc(e.label)}</strong><span class="conf ${e.confidence}">${confLabel}</span></span>
        <small>${esc(e.source)}${e.detail?` • ${esc(e.detail)}`:""}</small>
      </span>`;
    const cb=div.querySelector("input");
    cb.onchange=()=>{
      const item=state.entries.get(e.id); if(item)item.checked=cb.checked;
      div.classList.toggle("active",cb.checked);
      syncManual();
      generateMessage();
    };
    box.appendChild(div);
  }
}

function renderManual(){
  const used=new Set(state.entries.keys());
  $("#manualWarnings").innerHTML=CATEGORIES.map(c=>`
    <label class="manualItem">
      <input type="checkbox" data-manual="${c.id}" ${state.entries.get(c.id)?.checked?"checked":""}>
      <span>${esc(c.label)}</span>
    </label>`).join("");
  $$("[data-manual]").forEach(cb=>{
    cb.onchange=()=>{
      const id=cb.dataset.manual;
      let e=state.entries.get(id);
      if(!e){
        const c=CATEGORIES.find(x=>x.id===id);
        e={id,label:c.label,message:c.message,source:"Manual",confidence:"manual",detail:"Adicionado manualmente.",score:0,checked:cb.checked};
        state.entries.set(id,e);
        renderWarnings();
      }else e.checked=cb.checked;
      syncMain(id,cb.checked);
      generateMessage();
    };
  });
}

function syncMain(id,value){
  const cb=$(`[data-id="${id}"]`);
  if(cb){cb.checked=value;cb.closest(".warning").classList.toggle("active",value);}
}
function syncManual(){
  $$("[data-manual]").forEach(cb=>{
    cb.checked=!!state.entries.get(cb.dataset.manual)?.checked;
  });
}

function renderEvidence(){
  $("#evidence").innerHTML=state.evidence.map(e=>`
    <div class="evidenceRow"><strong>${esc(e.title)}</strong><p>${esc(e.text)}</p></div>`).join("");
  $("#dttdAttribution").classList.toggle("hidden",!state.dttdUsed);
}

function updateQuality(){
  const badge=$("#qualityBadge"), notice=$("#sourceNotice");
  if(state.dttdUsed){
    const confirmed=[...state.entries.values()].filter(e=>e.confidence==="confirmed").length;
    badge.textContent=confirmed?"Fonte especializada ativa":"Fonte especializada ativa";
    badge.className=`quality ${confirmed?"exact":"good"}`;
    notice.innerHTML=`Os itens <b>confirmados</b> ou <b>prováveis</b> vêm de votos de uma base especializada. Indícios fracos ficam visíveis, mas não entram na mensagem automaticamente.`;
  }else if(getDttd()){
    badge.textContent="Especializada sem resultado";
    badge.className="quality good";
    notice.innerHTML=`A fonte especializada estava configurada, mas não forneceu dados utilizáveis para este título. O site não inventa os avisos: os itens abaixo são apenas indícios da TMDB e ficam desmarcados.`;
  }else{
    badge.textContent="Análise parcial";
    badge.className="quality partial";
    notice.innerHTML=`Só a TMDB está ativa. Como a TMDB não é um guia parental detalhado, os avisos encontrados por ela são tratados como <b>indícios</b> e ficam desmarcados. Para a análise mais completa, configure o DoesTheDogDie em <b>Fontes</b>.`;
  }
}

function selected(){
  return CATEGORIES
    .map(c=>state.entries.get(c.id))
    .filter(e=>e?.checked);
}

function generateMessage(){
  if(!state.movie)return;
  const title=state.movie.title||state.movie.original_title||"Este filme";
  const items=selected().map(e=>e.message);
  const style=$("#messageStyle").value;
  const prefix=$("#prefix").value;
  const extra=$("#extra").value.trim();
  const head=prefix==="alerta"?"⚠️ Aviso de conteúdo — ":prefix==="atencao"?"⚠️ Atenção — ":"";
  let text;

  if(!items.length){
    text=`${head}${title}: não há avisos específicos selecionados.`;
  }else if(style==="curto"){
    text=`${head}${title}: pode conter ${joinPt(items)}.`;
  }else if(style==="formal"){
    text=`${head}${title}: a obra pode apresentar ${joinPt(items)}. Recomenda-se cautela a espectadores sensíveis a esses conteúdos.`;
  }else if(style==="natural"){
    text=`${head}${title}: este filme pode conter cenas ou temas envolvendo ${joinPt(items)}. Alguns desses conteúdos podem ser desconfortáveis para espectadores sensíveis.`;
  }else{
    text=`${head}${title} pode conter ${joinPt(items)}.`;
  }

  if(state.cert) text+=` Classificação indicativa no Brasil: ${state.cert}.`;
  if(extra) text+=` ${extra}`;
  $("#output").value=text;
}
$("#messageStyle").onchange=generateMessage;
$("#prefix").onchange=generateMessage;
$("#extra").oninput=generateMessage;

$("#copy").onclick=async()=>{
  const t=$("#output").value.trim(); if(!t)return;
  try{await navigator.clipboard.writeText(t);}
  catch{$("#output").select();document.execCommand("copy");}
  status($("#copyStatus"),"Mensagem copiada.","ok");
};

$("#fullscreen").onclick=()=>{
  if(!state.movie)return;
  $("#screenTitle").textContent=state.movie.title||state.movie.original_title;
  $("#screenText").textContent=$("#output").value;
  $("#screenRating").textContent=state.cert?`Classificação indicativa: ${state.cert}`:"";
  const bg=state.movie.backdrop_path||state.movie.poster_path;
  $("#screenBg").style.backgroundImage=bg?`url("${IMG}original${bg}")`:"none";
  $("#screenDttd").classList.toggle("hidden",!state.dttdUsed);
  $("#screen").classList.remove("hidden");
  document.body.style.overflow="hidden";
};
function closeScreen(){
  $("#screen").classList.add("hidden");document.body.style.overflow="";
}
$("#closeScreen").onclick=closeScreen;
document.addEventListener("keydown",e=>{if(e.key==="Escape")closeScreen();});

if(!getTmdb()) $("#settings").classList.remove("hidden");
