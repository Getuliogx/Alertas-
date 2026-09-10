
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

const state = {
  movie: null,
  certification: "",
  suggestedWarnings: []
};

const STORE_KEY = "tmdb_api_key_v3";
const IMG = "https://image.tmdb.org/t/p/";

const el = {
  settingsBtn: $("#settingsBtn"),
  settingsPanel: $("#settingsPanel"),
  closeSettingsBtn: $("#closeSettingsBtn"),
  apiKeyInput: $("#apiKeyInput"),
  saveKeyBtn: $("#saveKeyBtn"),
  keyStatus: $("#keyStatus"),
  movieSearch: $("#movieSearch"),
  searchBtn: $("#searchBtn"),
  searchStatus: $("#searchStatus"),
  results: $("#results"),
  editor: $("#editor"),
  poster: $("#poster"),
  movieTitle: $("#movieTitle"),
  movieMeta: $("#movieMeta"),
  overview: $("#overview"),
  genres: $("#genres"),
  warningGrid: $("#warningGrid"),
  intensity: $("#intensity"),
  messageStyle: $("#messageStyle"),
  extraNote: $("#extraNote"),
  generateBtn: $("#generateBtn"),
  clearWarningsBtn: $("#clearWarningsBtn"),
  output: $("#output"),
  copyBtn: $("#copyBtn"),
  screenBtn: $("#screenBtn"),
  copyStatus: $("#copyStatus"),
  alertScreen: $("#alertScreen"),
  screenBackdrop: $("#screenBackdrop"),
  screenTitle: $("#screenTitle"),
  screenMessage: $("#screenMessage"),
  screenRating: $("#screenRating"),
  closeScreenBtn: $("#closeScreenBtn")
};

function getKey() {
  return localStorage.getItem(STORE_KEY) || "";
}

function setStatus(target, text, kind = "") {
  target.textContent = text;
  target.className = `status ${kind}`.trim();
}

function apiUrl(path, params = {}) {
  const key = getKey();
  const qs = new URLSearchParams({ api_key: key, ...params });
  return `https://api.themoviedb.org/3${path}?${qs.toString()}`;
}

async function tmdb(path, params = {}) {
  if (!getKey()) throw new Error("Adicione sua chave da TMDB primeiro.");
  const res = await fetch(apiUrl(path, params));
  if (!res.ok) {
    if (res.status === 401) throw new Error("A chave da TMDB foi recusada. Confira a API Key v3.");
    throw new Error(`Erro da TMDB (${res.status}).`);
  }
  return res.json();
}

function openSettings() {
  el.settingsPanel.classList.remove("hidden");
  el.apiKeyInput.value = getKey();
  setTimeout(() => el.apiKeyInput.focus(), 50);
}
function closeSettings() {
  el.settingsPanel.classList.add("hidden");
}

el.settingsBtn.addEventListener("click", openSettings);
el.closeSettingsBtn.addEventListener("click", closeSettings);
el.saveKeyBtn.addEventListener("click", async () => {
  const value = el.apiKeyInput.value.trim();
  if (!value) {
    setStatus(el.keyStatus, "Cole uma API Key antes de salvar.", "error");
    return;
  }
  localStorage.setItem(STORE_KEY, value);
  setStatus(el.keyStatus, "Chave salva somente neste navegador.", "ok");
  try {
    await tmdb("/configuration");
    setStatus(el.keyStatus, "Chave validada e salva neste navegador.", "ok");
    setTimeout(closeSettings, 650);
  } catch (err) {
    localStorage.removeItem(STORE_KEY);
    setStatus(el.keyStatus, err.message, "error");
  }
});

async function searchMovies() {
  const q = el.movieSearch.value.trim();
  if (!q) return;
  if (!getKey()) {
    openSettings();
    setStatus(el.searchStatus, "Primeiro salve sua chave da TMDB.", "error");
    return;
  }
  el.results.innerHTML = "";
  setStatus(el.searchStatus, "Pesquisando...");
  try {
    const data = await tmdb("/search/movie", {
      query: q,
      language: "pt-BR",
      region: "BR",
      include_adult: "false",
      page: "1"
    });
    renderResults((data.results || []).slice(0, 12));
  } catch (err) {
    setStatus(el.searchStatus, err.message, "error");
  }
}

function renderResults(movies) {
  el.results.innerHTML = "";
  if (!movies.length) {
    setStatus(el.searchStatus, "Nenhum filme encontrado.", "error");
    return;
  }
  setStatus(el.searchStatus, `${movies.length} resultado(s) exibido(s).`, "ok");
  for (const movie of movies) {
    const year = movie.release_date ? movie.release_date.slice(0, 4) : "Ano não informado";
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "result";
    const visual = movie.poster_path
      ? `<img src="${IMG}w342${movie.poster_path}" alt="" loading="lazy">`
      : `<div class="no-poster">Sem pôster</div>`;
    btn.innerHTML = `${visual}<div class="result-info"><strong>${escapeHtml(movie.title || movie.original_title || "Sem título")}</strong><small>${year}</small></div>`;
    btn.addEventListener("click", () => selectMovie(movie.id));
    el.results.appendChild(btn);
  }
}

async function selectMovie(id) {
  setStatus(el.searchStatus, "Carregando dados do filme...");
  try {
    const movie = await tmdb(`/movie/${id}`, {
      language: "pt-BR",
      append_to_response: "keywords,release_dates"
    });
    state.movie = movie;
    state.certification = findBrazilCertification(movie.release_dates);
    state.suggestedWarnings = inferWarnings(movie);
    renderSelectedMovie();
    applySuggestedWarnings();
    generateMessage();
    el.editor.classList.remove("hidden");
    setStatus(el.searchStatus, "Filme carregado.", "ok");
    el.editor.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (err) {
    setStatus(el.searchStatus, err.message, "error");
  }
}

function findBrazilCertification(releaseDates) {
  const br = (releaseDates?.results || []).find(r => r.iso_3166_1 === "BR");
  if (!br) return "";
  const certs = (br.release_dates || [])
    .map(r => (r.certification || "").trim())
    .filter(Boolean);
  return certs[0] || "";
}

function renderSelectedMovie() {
  const m = state.movie;
  const year = m.release_date ? m.release_date.slice(0, 4) : "Ano não informado";
  const runtime = m.runtime ? `${m.runtime} min` : "";
  const rating = state.certification ? `Classificação BR: ${state.certification}` : "Classificação BR não disponível";
  el.poster.src = m.poster_path ? `${IMG}w500${m.poster_path}` : "";
  el.poster.alt = m.poster_path ? `Pôster de ${m.title}` : "";
  if (!m.poster_path) el.poster.removeAttribute("src");
  el.movieTitle.textContent = m.title || m.original_title;
  el.movieMeta.textContent = [year, runtime, rating].filter(Boolean).join(" • ");
  el.overview.textContent = m.overview || "Sinopse em português não disponível.";
  el.genres.innerHTML = "";
  for (const g of (m.genres || [])) {
    const span = document.createElement("span");
    span.className = "chip";
    span.textContent = g.name;
    el.genres.appendChild(span);
  }
}

const keywordRules = [
  { test: /(violence|violent|fight|fighting|assault|murder|killer|serial killer|crime|war|battle|gun|weapon|shooting|stabbing|knife|torture)/i, warning: "violência" },
  { test: /(blood|bloody|injury|wound|bleeding|mutilation)/i, warning: "sangue e ferimentos" },
  { test: /(gore|gory|graphic violence|dismemberment|decapitation|mutilation|body horror)/i, warning: "gore ou imagens gráficas" },
  { test: /(horror|slasher|haunted|ghost|supernatural|monster|demon|possession|suspense|thriller|fear|scare|jump scare)/i, warning: "sustos e cenas de tensão" },
  { test: /(profanity|swearing|strong language)/i, warning: "linguagem forte" },
  { test: /(sex|sexual|erotic|seduction|sexuality|prostitution)/i, warning: "conteúdo sexual" },
  { test: /(nudity|nude|naked)/i, warning: "nudez" },
  { test: /(alcohol|drinking|drunk|alcoholism)/i, warning: "uso de álcool" },
  { test: /(drug|cocaine|heroin|marijuana|narcotic|substance abuse|overdose)/i, warning: "uso de drogas" },
  { test: /(smoking|cigarette|tobacco)/i, warning: "tabagismo" },
  { test: /(suicide|self-harm|abuse|grief|trauma|death|kidnapping|hostage|rape|racism|bullying|mental illness)/i, warning: "temas sensíveis ou perturbadores" }
];

function inferWarnings(movie) {
  const found = new Set();
  const keywords = (movie.keywords?.keywords || []).map(k => k.name || "");
  const genreNames = (movie.genres || []).map(g => g.name || "");
  const text = [...keywords, ...genreNames].join(" | ");

  for (const rule of keywordRules) {
    if (rule.test.test(text)) found.add(rule.warning);
  }

  // Inferências genéricas por gênero, usadas apenas como sugestão.
  const genres = genreNames.join(" ").toLowerCase();
  if (/terror/.test(genres)) {
    found.add("sustos e cenas de tensão");
    found.add("temas sensíveis ou perturbadores");
  }
  if (/ação|crime|guerra/.test(genres)) found.add("violência");
  if (/thriller|mistério/.test(genres)) found.add("sustos e cenas de tensão");

  return [...found];
}

function applySuggestedWarnings() {
  const suggested = new Set(state.suggestedWarnings);
  $$("#warningGrid input[type=checkbox]").forEach(cb => {
    cb.checked = suggested.has(cb.value);
  });
}

function selectedWarnings() {
  return $$("#warningGrid input[type=checkbox]:checked").map(cb => cb.value);
}

function joinPt(items) {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(", ")} e ${items.at(-1)}`;
}

function generateMessage() {
  if (!state.movie) return;
  const title = state.movie.title || state.movie.original_title || "Este filme";
  const warnings = selectedWarnings();
  const intensity = el.intensity.value;
  const style = el.messageStyle.value;
  const extra = el.extraNote.value.trim();
  const cert = state.certification ? ` Classificação indicativa no Brasil: ${state.certification}.` : "";

  let text = "";
  if (style === "curta") {
    text = warnings.length
      ? `${title}: este filme pode conter ${joinPt(warnings)}.`
      : `${title}: este filme pode conter cenas ou temas que podem incomodar alguns espectadores.`;
  } else if (style === "formal") {
    text = warnings.length
      ? `Aviso de conteúdo — ${title}: a obra pode apresentar ${joinPt(warnings)}, com intensidade geral ${intensity}. Recomenda-se cautela a espectadores sensíveis.`
      : `Aviso de conteúdo — ${title}: a obra pode apresentar cenas ou temas potencialmente sensíveis. Recomenda-se cautela a espectadores sensíveis.`;
  } else {
    text = warnings.length
      ? `${title}: este filme pode conter cenas ou temas envolvendo ${joinPt(warnings)}. O conteúdo pode ter intensidade ${intensity}; recomendamos atenção caso você seja sensível a algum desses temas.`
      : `${title}: este filme pode conter cenas ou temas que podem ser desconfortáveis para alguns espectadores. Recomendamos atenção caso você seja sensível a determinados conteúdos.`;
  }

  if (cert) text += cert;
  if (extra) text += ` ${extra}`;
  el.output.value = text;
}

el.searchBtn.addEventListener("click", searchMovies);
el.movieSearch.addEventListener("keydown", (e) => {
  if (e.key === "Enter") searchMovies();
});

el.warningGrid.addEventListener("change", generateMessage);
el.intensity.addEventListener("change", generateMessage);
el.messageStyle.addEventListener("change", generateMessage);
el.extraNote.addEventListener("input", generateMessage);
el.generateBtn.addEventListener("click", generateMessage);

el.clearWarningsBtn.addEventListener("click", () => {
  $$("#warningGrid input[type=checkbox]").forEach(cb => cb.checked = false);
  generateMessage();
});

el.copyBtn.addEventListener("click", async () => {
  const text = el.output.value.trim();
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    setStatus(el.copyStatus, "Mensagem copiada.", "ok");
  } catch {
    el.output.select();
    document.execCommand("copy");
    setStatus(el.copyStatus, "Mensagem copiada.", "ok");
  }
});

el.screenBtn.addEventListener("click", () => {
  if (!state.movie) return;
  const msg = el.output.value.trim();
  el.screenTitle.textContent = state.movie.title || state.movie.original_title;
  el.screenMessage.textContent = msg;
  el.screenRating.textContent = state.certification ? `Classificação BR: ${state.certification}` : "";
  el.screenRating.classList.toggle("hidden", !state.certification);
  const backdrop = state.movie.backdrop_path || state.movie.poster_path;
  el.screenBackdrop.style.backgroundImage = backdrop ? `url("${IMG}original${backdrop}")` : "none";
  el.alertScreen.classList.remove("hidden");
  document.body.style.overflow = "hidden";
});

function closeScreen() {
  el.alertScreen.classList.add("hidden");
  document.body.style.overflow = "";
}
el.closeScreenBtn.addEventListener("click", closeScreen);
el.alertScreen.addEventListener("click", (e) => {
  if (e.target === el.alertScreen) closeScreen();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeScreen();
});

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, ch => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[ch]));
}

if (!getKey()) openSettings();
