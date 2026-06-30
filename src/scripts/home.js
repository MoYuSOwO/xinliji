const state = {
  articles: [],
  current: "",
  query: "",
  volumeId: "",
};

const els = {
  data: document.querySelector("#articleData"),
  cards: Array.from(document.querySelectorAll("[data-article-card]")),
  search: document.querySelector("#searchInput"),
  volumeFilter: document.querySelector("#volumeFilter"),
  resultCount: document.querySelector("#resultCount"),
  reader: document.querySelector("#readerPanel"),
  readerCount: document.querySelector("#readerCount"),
  volume: document.querySelector("#articleVolume"),
  title: document.querySelector("#articleTitle"),
  meta: document.querySelector("#articleMeta"),
  body: document.querySelector("#articleBody"),
  prev: document.querySelector("#prevArticle"),
  random: document.querySelector("#randomArticle"),
  next: document.querySelector("#nextArticle"),
};

init();

function init() {
  if (!els.data) return;
  state.articles = JSON.parse(els.data.textContent || "[]");
  state.current = state.articles[0]?.slug || "";
  bindEvents();
  selectArticle(preferredSlug(), { updateUrl: false });
}

function bindEvents() {
  els.search.addEventListener("input", (event) => {
    state.query = event.target.value.trim().toLowerCase();
    renderList();
    updateArticleControls();
  });

  els.volumeFilter.addEventListener("change", (event) => {
    state.volumeId = event.target.value;
    const articles = filteredArticles();
    if (articles.length && !articles.some((article) => article.slug === state.current)) {
      selectArticle(articles[0].slug);
      return;
    }
    renderList();
    updateArticleControls();
  });

  for (const card of els.cards) {
    card.addEventListener("click", (event) => {
      event.preventDefault();
      selectArticle(card.dataset.slug, { focusReader: true });
    });
  }

  els.prev.addEventListener("click", () => selectNeighbor(-1, { focusReader: true }));
  els.next.addEventListener("click", () => selectNeighbor(1, { focusReader: true }));
  els.random.addEventListener("click", () => selectRandom({ focusReader: true }));

  window.addEventListener("popstate", () => selectArticle(preferredSlug(), { updateUrl: false }));
}

function filteredArticles() {
  return state.articles.filter((article) => {
    if (state.volumeId && String(article.volumeId) !== state.volumeId) return false;
    const haystack = [
      article.title,
      article.volumeId,
      article.volumeName,
      article.author,
      article.date,
    ]
      .filter((value) => value != null && value !== "")
      .join(" ")
      .toLowerCase();
    return !state.query || haystack.includes(state.query);
  });
}

function renderList() {
  const articles = filteredArticles();
  const visibleSlugs = new Set(articles.map((article) => article.slug));
  els.resultCount.textContent = `${articles.length} / ${state.articles.length} 篇`;

  for (const card of els.cards) {
    const selected = card.dataset.slug === state.current;
    card.hidden = !visibleSlugs.has(card.dataset.slug);
    card.classList.toggle("is-selected", selected);
    card.setAttribute("aria-current", selected ? "true" : "false");
  }
}

function selectArticle(slug, options = {}) {
  const { updateUrl = true, focusReader = false } = options;
  const article = state.articles.find((item) => item.slug === slug);
  const template = document.querySelector(`#article-template-${CSS.escape(slug)}`);
  if (!article || !template) return;

  state.current = slug;
  els.volume.textContent = article.volumeName;
  els.readerCount.textContent = `${article.position} · ${article.charCount}字`;
  els.title.textContent = article.title;
  els.meta.textContent = [article.date, article.author ? `作者：${article.author}` : ""].filter(Boolean).join(" · ");
  els.body.replaceChildren(template.content.cloneNode(true));
  document.title = `${article.title} · 新礼记`;

  renderList();
  updateArticleControls();
  updateUrlState(article, updateUrl);
  if (focusReader) focusReaderPanel();
}

function preferredSlug() {
  const slug = decodeURIComponent(window.location.hash.replace(/^#/, ""));
  if (state.articles.some((article) => article.slug === slug)) return slug;
  return state.articles[0]?.slug;
}

function updateUrlState(article, updateUrl) {
  if (!updateUrl) return;
  const nextHash = `#${encodeURIComponent(article.slug)}`;
  if (window.location.hash !== nextHash) {
    window.history.pushState({ slug: article.slug }, "", nextHash);
  }
}

function updateArticleControls() {
  const articles = filteredArticles();
  const index = articles.findIndex((article) => article.slug === state.current);
  els.prev.disabled = index <= 0;
  els.next.disabled = index === -1 || index >= articles.length - 1;
  els.random.disabled = articles.length < 2;
}

function selectNeighbor(step, options = {}) {
  const articles = filteredArticles();
  const nextIndex = articles.findIndex((article) => article.slug === state.current) + step;
  const article = articles[nextIndex];
  if (article) selectArticle(article.slug, options);
}

function selectRandom(options = {}) {
  const candidates = filteredArticles().filter((article) => article.slug !== state.current);
  const article = candidates[Math.floor(Math.random() * candidates.length)];
  if (article) selectArticle(article.slug, options);
}

function focusReaderPanel() {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (window.matchMedia("(max-width: 920px)").matches) {
    els.reader.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  }
  els.reader.focus({ preventScroll: true });
}
