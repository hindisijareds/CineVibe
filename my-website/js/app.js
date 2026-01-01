const API_KEY = 'f83519e527323b49c08b0c3a6fc35ec4';
const BASE_URL = 'https://api.themoviedb.org/3';

// Keep your original IMG_URL for banner/backdrops
const IMG_URL = 'https://image.tmdb.org/t/p/original';

// Add optimized poster size for performance
const IMG_POSTER = 'https://image.tmdb.org/t/p/w500';

let currentItem;
let currentTV = { season: 1, episode: 1 };

// ---------- TMDB fetch helpers ----------
async function fetchTrending(type) {
  const res = await fetch(`${BASE_URL}/trending/${type}/week?api_key=${API_KEY}`);
  const data = await res.json();
  return data.results;
}

async function fetchTrendingTodayAll() {
  const res = await fetch(`${BASE_URL}/trending/all/day?api_key=${API_KEY}`);
  const data = await res.json();
  return data.results;
}

async function fetchTrendingAnime() {
  let allResults = [];
  for (let page = 1; page <= 3; page++) {
    const res = await fetch(`${BASE_URL}/trending/tv/week?api_key=${API_KEY}&page=${page}`);
    const data = await res.json();
    const filtered = data.results.filter(item =>
      item.original_language === 'and' && item.genre_ids.includes(16)
    );
    allResults = allResults.concat(filtered);
  }
  return allResults;
}

async function fetchTVDetails(tvID) {
  const res = await fetch(`${BASE_URL}/tv/${tvID}?api_key=${API_KEY}`);
  return res.json();
}

async function fetchSeasonDetails(tvID, seasonNumber) {
  const res = await fetch(`${BASE_URL}/tv/${tvID}/season/${seasonNumber}?api_key=${API_KEY}`);
  return res.json();
}

// ---------- UI rendering ----------
function displayBanner(item) {
  const banner = document.getElementById('banner');
  const title = document.getElementById('banner-title');
  if (!banner || !title) return;

  banner.style.backgroundImage = `url(${IMG_URL}${item.backdrop_path})`;
  title.textContent = item.title || item.name;
}

function createCard(item) {
  const card = document.createElement('div');
  card.className = 'card';
  card.onclick = () => showDetails(item);

  const img = document.createElement('img');
  img.loading = 'lazy';
  img.src = `${IMG_POSTER}${item.poster_path}`;
  img.alt = item.title || item.name;

  const overlay = document.createElement('div');
  overlay.className = 'card-overlay';

  const meta = document.createElement('div');
  meta.className = 'card-meta';

  const t = document.createElement('div');
  t.className = 'card-title';
  t.textContent = item.title || item.name || 'Untitled';

  const sub = document.createElement('div');
  sub.className = 'card-sub';
  const left = document.createElement('span');
  left.textContent = item.media_type === 'tv' ? 'Series' : (item.media_type === 'movie' ? 'Movie' : '');
  const right = document.createElement('span');
  right.textContent = item.vote_average ? `★ ${item.vote_average.toFixed(1)}` : '';
  sub.append(left, right);

  const play = document.createElement('button');
  play.className = 'play';
  play.type = 'button';
  play.innerHTML = `<i class="fa-solid fa-play"></i> Play`;
  play.onclick = (e) => { e.stopPropagation(); showDetails(item); };

  meta.append(t, sub, play);
  card.append(img, overlay, meta);

  return card;
}

function displayList(items, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = '';
  items.forEach(item => {
    if (!item.poster_path) return;
    container.appendChild(createCard(item));
  });
}

// ---------- TV Season/Episode selector ----------
async function setupEpisodeSelectorIfTV(item) {
  const selectorWrap = document.getElementById('episode-selector');
  const seasonSelect = document.getElementById('season-select');
  const episodeSelect = document.getElementById('episode-select');

  if (!selectorWrap || !seasonSelect || !episodeSelect) return;

  const isTV = (item.media_type === 'tv') || (!item.title && item.name);
  if (!isTV) {
    selectorWrap.style.display = 'none';
    return;
  }

  selectorWrap.style.display = 'block';

  const details = await fetchTVDetails(item.id);
  const seasons = (details.seasons || []).filter(s => s.season_number > 0);

  seasonSelect.innerHTML = seasons.map(s =>
    `<option value="${s.season_number}">Season ${s.season_number}</option>`
  ).join('');

  // Default S1E1
  currentTV.season = seasons[0]?.season_number || 1;
  currentTV.episode = 1;

  async function loadEpisodes(seasonNumber) {
    const seasonData = await fetchSeasonDetails(item.id, seasonNumber);
    const episodes = seasonData.episodes || [];
    episodeSelect.innerHTML = episodes.map(e =>
      `<option value="${e.episode_number}">Ep ${e.episode_number} • ${e.name || 'Episode'}</option>`
    ).join('');
    currentTV.episode = episodes[0]?.episode_number || 1;
    changeServer();
  }

  seasonSelect.onchange = async () => {
    currentTV.season = Number(seasonSelect.value);
    await loadEpisodes(currentTV.season);
  };

  episodeSelect.onchange = () => {
    currentTV.episode = Number(episodeSelect.value);
    changeServer();
  };

  await loadEpisodes(currentTV.season);
}

// Prev/Next buttons
function prevEpisode() {
  const ep = document.getElementById('episode-select');
  if (!ep) return;
  const idx = ep.selectedIndex;
  if (idx > 0) {
    ep.selectedIndex = idx - 1;
    currentTV.episode = Number(ep.value);
    changeServer();
  }
}
function nextEpisode() {
  const ep = document.getElementById('episode-select');
  if (!ep) return;
  const idx = ep.selectedIndex;
  if (idx < ep.options.length - 1) {
    ep.selectedIndex = idx + 1;
    currentTV.episode = Number(ep.value);
    changeServer();
  }
}

// ---------- Modal ----------
async function showDetails(item) {
  currentItem = item;

  document.getElementById('modal-title').textContent = item.title || item.name;
  document.getElementById('modal-description').textContent = item.overview || '';
  document.getElementById('modal-image').src = `${IMG_POSTER}${item.poster_path}`;
  document.getElementById('modal-rating').innerHTML = '★'.repeat(Math.round((item.vote_average || 0) / 2));

  await setupEpisodeSelectorIfTV(item);

  changeServer();
  document.getElementById('modal').style.display = 'flex';

  // Save to Continue Watching (basic)
  saveContinueWatching(item);
}

function changeServer() {
  if (!currentItem) return;

  const serverEl = document.getElementById('server');
  const server = serverEl ? serverEl.value : "vidsrc.cc";

  const isTV = (currentItem.media_type === "tv") || (!currentItem.title && currentItem.name);
  const type = isTV ? "tv" : "movie";

  let embedURL = "";

  if (server === "vidsrc.cc") {
    // Official episode URLs: /tv/{id}/{season}/{episode} :contentReference[oaicite:3]{index=3}
    if (type === "tv") {
      embedURL = `https://vidsrc.cc/v2/embed/tv/${currentItem.id}/${currentTV.season}/${currentTV.episode}`;
    } else {
      embedURL = `https://vidsrc.cc/v2/embed/movie/${currentItem.id}`;
    }
  } else if (server === "vidsrc.me") {
    // Best-effort: some embeds support s/e parameters (if not, player may still offer selection)
    if (type === "tv") {
      embedURL = `https://vidsrc.net/embed/tv/?tmdb=${currentItem.id}&s=${currentTV.season}&e=${currentTV.episode}`;
    } else {
      embedURL = `https://vidsrc.net/embed/movie/?tmdb=${currentItem.id}`;
    }
  } else if (server === "player.videasy.net") {
    // Videasy TV format includes /tv/{id}/{season}/{episode} :contentReference[oaicite:4]{index=4}
    if (type === "tv") {
      embedURL = `https://player.videasy.net/tv/${currentItem.id}/${currentTV.season}/${currentTV.episode}`;
    } else {
      embedURL = `https://player.videasy.net/movie/${currentItem.id}`;
    }
  }

  const iframe = document.getElementById('modal-video');
  if (iframe) iframe.src = embedURL;
}

function closeModal() {
  document.getElementById('modal').style.display = 'none';
  const iframe = document.getElementById('modal-video');
  if (iframe) iframe.src = '';
}

// ---------- Search ----------
function openSearchModal() {
  document.getElementById('search-modal').style.display = 'flex';
  document.getElementById('search-input').focus();
}
function closeSearchModal() {
  document.getElementById('search-modal').style.display = 'none';
  document.getElementById('search-results').innerHTML = '';
}
async function searchTMDB() {
  const query = document.getElementById('search-input').value;
  if (!query.trim()) {
    document.getElementById('search-results').innerHTML = '';
    return;
  }

  const res = await fetch(`${BASE_URL}/search/multi?api_key=${API_KEY}&query=${encodeURIComponent(query)}`);
  const data = await res.json();

  const container = document.getElementById('search-results');
  container.innerHTML = '';
  data.results.forEach(item => {
    if (!item.poster_path) return;
    const img = document.createElement('img');
    img.loading = 'lazy';
    img.src = `${IMG_POSTER}${item.poster_path}`;
    img.alt = item.title || item.name;
    img.onclick = () => {
      closeSearchModal();
      showDetails(item);
    };
    container.appendChild(img);
  });
}

// ---------- Continue Watching (basic localStorage) ----------
function getCW() {
  try { return JSON.parse(localStorage.getItem("cw_v1") || "[]"); }
  catch { return []; }
}
function setCW(list) {
  localStorage.setItem("cw_v1", JSON.stringify(list.slice(0, 20)));
}
function saveContinueWatching(item) {
  const isTV = (item.media_type === "tv") || (!item.title && item.name);
  const entry = {
    id: item.id,
    media_type: isTV ? "tv" : "movie",
    title: item.title || item.name,
    poster_path: item.poster_path,
    vote_average: item.vote_average || 0,
    season: isTV ? currentTV.season : null,
    episode: isTV ? currentTV.episode : null,
    t: Date.now()
  };
  const list = getCW().filter(x => !(x.id === entry.id && x.media_type === entry.media_type));
  list.unshift(entry);
  setCW(list);
}
function renderContinueWatching() {
  const wrap = document.getElementById("continue");
  const listEl = document.getElementById("continue-list");
  if (!wrap || !listEl) return;

  const list = getCW();
  if (!list.length) {
    wrap.style.display = "none";
    return;
  }
  wrap.style.display = "";
  listEl.innerHTML = "";
  list.forEach(x => {
    const item = {
      id: x.id,
      media_type: x.media_type,
      title: x.title,
      name: x.title,
      poster_path: x.poster_path,
      vote_average: x.vote_average
    };
    const card = createCard(item);
    card.onclick = () => {
      currentTV.season = x.season || 1;
      currentTV.episode = x.episode || 1;
      showDetails(item);
    };
    listEl.appendChild(card);
  });
}

// ---------- Home init ----------
async function init() {
  // Only run on pages that have home containers
  const hasHome = document.getElementById('movies-list') || document.getElementById('tvshows-list');
  if (!hasHome) return;

  renderContinueWatching();

  const today = await fetchTrendingTodayAll();
  const movies = await fetchTrending('movie');
  const tvShows = await fetchTrending('tv');
  const anime = await fetchTrendingAnime();

  displayBanner(movies[Math.floor(Math.random() * movies.length)]);
  displayList(today, 'today-list');
  displayList(movies, 'movies-list');
  displayList(tvShows, 'tvshows-list');
  displayList(anime, 'anime-list');
}
(function preloadInit(){
  const preloader = document.getElementById("preloader");
  if (!preloader) return;

  const hide = () => {
    preloader.classList.add("is-hidden");
    // remove from DOM after fade to avoid blocking clicks
    setTimeout(() => preloader.remove(), 450);
  };

  // Hide after full load (images/css/js done)
  window.addEventListener("load", hide);

  // Safety fallback: if something hangs, still hide
  setTimeout(hide, 4500);
})();

init();// At the end of init(), after displayList calls:
document.getElementById("preloader")?.classList.add("is-hidden");
setTimeout(() => document.getElementById("preloader")?.remove(), 450);

