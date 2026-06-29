const state = {
  articles: [],
  volumes: [],
  volumeById: new Map(),
  current: null,
  query: "",
  isReady: false,
};

const els = {
  search: document.querySelector("#searchInput"),
  list: document.querySelector("#articleList"),
  totalCount: document.querySelector("#totalCount"),
  volumeCount: document.querySelector("#volumeCount"),
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

async function init() {
  try {
    const [articleRes, volumeRes] = await Promise.all([
      fetch("./generated/articles.json"),
      fetch("./data/volumes.json"),
    ]);
    if (!articleRes.ok) throw new Error(`index ${articleRes.status}`);
    if (!volumeRes.ok) throw new Error(`volumes ${volumeRes.status}`);
    state.articles = await articleRes.json();
    state.volumes = await volumeRes.json();
    state.volumeById = new Map(state.volumes.map((volume) => [String(volume.id), volume]));
    bindEvents();
    renderStats();
    renderList();
    state.isReady = true;
    await selectArticle(preferredSlug(), { updateUrl: false });
  } catch (error) {
    els.list.innerHTML = `<div class="empty-state">篇目未能载入：${escapeHtml(error.message)}</div>`;
  }
}

function bindEvents() {
  els.search.addEventListener("input", (event) => {
    state.query = event.target.value.trim().toLowerCase();
    renderList();
  });

  els.prev.addEventListener("click", () => selectNeighbor(-1, { focusReader: true }));
  els.next.addEventListener("click", () => selectNeighbor(1, { focusReader: true }));
  els.random.addEventListener("click", () => selectRandom({ focusReader: true }));

  window.addEventListener("popstate", () => {
    if (!state.isReady) return;
    selectArticle(preferredSlug(), { updateUrl: false });
  });
}

function renderStats() {
  const volumes = new Set(state.articles.map((article) => article.volumeId).filter(Boolean));

  els.totalCount.textContent = String(state.articles.length);
  els.volumeCount.textContent = String(volumes.size);
}

function filteredArticles() {
  return state.articles.filter((article) => {
    const haystack = [
      article.title,
      article.volumeId,
      volumeName(article),
      article.source,
      article.date,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return !state.query || haystack.includes(state.query);
  });
}

function renderList() {
  const articles = filteredArticles();
  els.resultCount.textContent = `${articles.length} / ${state.articles.length} 篇`;

  if (!articles.length) {
    els.list.innerHTML = `<div class="empty-state">暂无合检之篇。换个词试试。</div>`;
    return;
  }

  els.list.replaceChildren(
    ...articles.map((article) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `article-card${article.slug === state.current ? " is-selected" : ""}`;
      button.setAttribute("aria-current", article.slug === state.current ? "true" : "false");
      button.innerHTML = `
        <span class="card-title">${escapeHtml(article.title)}</span>
        <span class="card-foot">${escapeHtml(cardFoot(article))}</span>
      `;
      button.addEventListener("click", () => selectArticle(article.slug, { focusReader: true }));
      return button;
    }),
  );
}

async function selectArticle(slug, options = {}) {
  const { updateUrl = true, focusReader = false } = options;
  const article = state.articles.find((item) => item.slug === slug);
  if (!article) return;
  state.current = slug;
  renderList();
  updateUrlState(article, updateUrl);

  els.volume.textContent = volumeName(article);
  els.readerCount.textContent = readerPositionText(article);
  els.title.textContent = article.title;
  els.meta.innerHTML = metaHtml(article);
  els.body.innerHTML = loadingSkeleton();
  updateArticleControls();

  try {
    const res = await fetch(`./articles/${article.file}`);
    if (!res.ok) throw new Error(`${article.file} ${res.status}`);
    const raw = await res.text();
    const parsed = parseDocument(raw);
    els.body.innerHTML = renderMarkdown(parsed.body);
    els.readerCount.textContent = `${readerPositionText(article)} · ${countCjkLikeChars(parsed.body)}字`;
    document.title = `${article.title} · 新周礼记`;
    if (focusReader) focusReaderPanel();
  } catch (error) {
    els.body.innerHTML = `<div class="empty-state">正文未能载入：${escapeHtml(error.message)}</div>`;
  }
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
  const index = currentIndex();
  els.prev.disabled = index <= 0;
  els.next.disabled = index === -1 || index >= state.articles.length - 1;
  els.random.disabled = state.articles.length < 2;
}

function currentIndex() {
  return state.articles.findIndex((article) => article.slug === state.current);
}

function selectNeighbor(step, options = {}) {
  const nextIndex = currentIndex() + step;
  const article = state.articles[nextIndex];
  if (article) selectArticle(article.slug, options);
}

function selectRandom(options = {}) {
  const candidates = state.articles.filter((article) => article.slug !== state.current);
  const article = candidates[Math.floor(Math.random() * candidates.length)];
  if (article) selectArticle(article.slug, options);
}

function readerPositionText(article) {
  const index = state.articles.findIndex((item) => item.slug === article.slug);
  return index >= 0 ? `第 ${index + 1} / ${state.articles.length} 篇` : "";
}

function focusReaderPanel() {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (window.matchMedia("(max-width: 920px)").matches) {
    els.reader.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  }
  els.reader.focus({ preventScroll: true });
}

function cardFoot(article) {
  return [volumeName(article) || "未分卷", sourceText(article)].filter(Boolean).join(" · ");
}

function volumeName(article) {
  if (article.volumeId == null) return "";
  return state.volumeById.get(String(article.volumeId))?.name || "";
}

function sourceText(article) {
  return article.source ? `出处：${article.source}` : "";
}

function metaHtml(article) {
  const parts = [];
  if (article.date) parts.push(escapeHtml(article.date));
  if (article.source) {
    const source = escapeHtml(article.source);
    if (isSafeSourceUrl(article.sourceUrl)) {
      parts.push(`出处：<a href="${escapeHtml(article.sourceUrl)}" target="_blank" rel="noreferrer">${source}</a>`);
    } else {
      parts.push(`出处：${source}`);
    }
  }
  return parts.join(" · ");
}

function isSafeSourceUrl(url) {
  return typeof url === "string" && /^https?:\/\//.test(url);
}

function parseDocument(raw) {
  if (!raw.startsWith("---")) return { body: raw };
  const end = raw.indexOf("\n---", 3);
  if (end === -1) return { body: raw };

  const body = raw.slice(end + 4).trim();
  return { body };
}

function renderMarkdown(markdown) {
  const blocks = [];
  let paragraph = [];
  let quote = [];
  let list = [];

  const flushParagraph = () => {
    if (!paragraph.length) return;
    blocks.push(`<p>${inline(paragraph.join(""))}</p>`);
    paragraph = [];
  };

  const flushQuote = () => {
    if (!quote.length) return;
    blocks.push(`<blockquote><p>${inline(quote.join("<br>"))}</p></blockquote>`);
    quote = [];
  };

  const flushList = () => {
    if (!list.length) return;
    blocks.push(`<ul>${list.map((item) => `<li>${inline(item)}</li>`).join("")}</ul>`);
    list = [];
  };

  for (const rawLine of markdown.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) {
      flushParagraph();
      flushQuote();
      flushList();
      continue;
    }

    if (line.startsWith("### ")) {
      flushParagraph();
      flushQuote();
      flushList();
      blocks.push(`<h3>${inline(line.slice(4))}</h3>`);
      continue;
    }

    if (line.startsWith("> ")) {
      flushParagraph();
      flushList();
      quote.push(line.slice(2));
      continue;
    }

    if (line.startsWith("- ")) {
      flushParagraph();
      flushQuote();
      list.push(line.slice(2));
      continue;
    }

    flushQuote();
    flushList();
    paragraph.push(line);
  }

  flushParagraph();
  flushQuote();
  flushList();
  return blocks.join("");
}

function inline(text) {
  return escapeHtml(text).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

function loadingSkeleton() {
  return `
    <div class="skeleton" aria-label="正文载入中">
      <span></span>
      <span></span>
      <span></span>
    </div>
  `;
}

function countCjkLikeChars(text) {
  return text.replace(/---[\s\S]*?---/, "").replace(/\s|[#>*`\-[\]()"':：，。、“”；；！？,.!?]/g, "").length;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
