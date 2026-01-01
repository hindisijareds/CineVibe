// Uses createCard() + showDetails() from app.js

let page = 1;
let isLoading = false;

function qs(key, fallback=null){
  const u = new URL(window.location.href);
  return u.searchParams.get(key) ?? fallback;
}

function setActive(btns, activeBtn){
  btns.forEach(b => b.classList.remove("is-active"));
  activeBtn.classList.add("is-active");
}

async function fetchEndpoint(endpoint, pageNum){
  const res = await fetch(`${BASE_URL}${endpoint}${endpoint.includes("?") ? "&" : "?"}api_key=${API_KEY}&page=${pageNum}`);
  return res.json();
}

function guessPageType(){
  const path = (location.pathname.split("/").pop() || "").toLowerCase();
  if (path.includes("movies")) return "movies";
  if (path.includes("series")) return "series";
  if (path.includes("anime")) return "anime";
  return "trending";
}

function getTrendingEndpoint(){
  const time = qs("time","day");
  const media = qs("media","all");
  return `/trending/${media}/${time}`;
}

function getMoviesEndpoint(mode){
  const map = {
    now_playing: "/movie/now_playing",
    popular: "/movie/popular",
    top_rated: "/movie/top_rated",
    upcoming: "/movie/upcoming"
  };
  return map[mode] || map.popular;
}

function getSeriesEndpoint(mode){
  const map = {
    airing_today: "/tv/airing_today",
    on_the_air: "/tv/on_the_air",
    popular: "/tv/popular",
    top_rated: "/tv/top_rated"
  };
  return map[mode] || map.popular;
}

function getAnimeEndpoint(){
  // Anime discovery: Japanese + Animation
  return `/discover/tv?with_genres=16&with_original_language=ja&sort_by=popularity.desc`;
}

async function loadGrid(reset=false){
  if (isLoading) return;
  isLoading = true;

  const grid = document.getElementById("grid");
  if (!grid) return;

  if (reset){
    page = 1;
    grid.innerHTML = "";
  }

  const type = guessPageType();

  let endpoint = "";
  if (type === "trending") endpoint = getTrendingEndpoint();
  if (type === "movies") endpoint = getMoviesEndpoint(qs("mode","popular"));
  if (type === "series") endpoint = getSeriesEndpoint(qs("mode","popular"));
  if (type === "anime") endpoint = getAnimeEndpoint();

  const data = await fetchEndpoint(endpoint, page);
  (data.results || []).forEach(item => {
    if (!item.poster_path) return;
    grid.appendChild(createCard(item));
  });

  page += 1;
  isLoading = false;
}

function initTrendingFilters(){
  const timeBtns = Array.from(document.querySelectorAll("[data-time]"));
  const mediaBtns = Array.from(document.querySelectorAll("[data-media]"));

  timeBtns.forEach(btn => btn.onclick = () => {
    const u = new URL(location.href);
    u.searchParams.set("time", btn.dataset.time);
    history.replaceState({}, "", u.toString());
    setActive(timeBtns, btn);
    loadGrid(true);
  });

  mediaBtns.forEach(btn => btn.onclick = () => {
    const u = new URL(location.href);
    u.searchParams.set("media", btn.dataset.media);
    history.replaceState({}, "", u.toString());
    setActive(mediaBtns, btn);
    loadGrid(true);
  });

  // initial state from URL
  const t = qs("time","day");
  const m = qs("media","all");
  timeBtns.find(b => b.dataset.time === t)?.classList.add("is-active");
  mediaBtns.find(b => b.dataset.media === m)?.classList.add("is-active");
}

function initBrowse(){
  document.getElementById("load-more")?.addEventListener("click", () => loadGrid(false));

  if (guessPageType() === "trending") initTrendingFilters();

  loadGrid(true);
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

initBrowse();
// At the end of init(), after displayList calls:
document.getElementById("preloader")?.classList.add("is-hidden");
setTimeout(() => document.getElementById("preloader")?.remove(), 450);
