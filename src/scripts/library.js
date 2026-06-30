const cards = Array.from(document.querySelectorAll("[data-article-card]"));
const search = document.querySelector("#searchInput");
const volumeFilter = document.querySelector("#volumeFilter");
const resultCount = document.querySelector("#resultCount");
const volumeShortcuts = Array.from(document.querySelectorAll("[data-volume-shortcut]"));
let emptyResult = null;

if (cards.length && search && volumeFilter && resultCount) {
  search.addEventListener("input", updateList);
  volumeFilter.addEventListener("change", updateList);

  for (const shortcut of volumeShortcuts) {
    shortcut.addEventListener("click", () => {
      volumeFilter.value = shortcut.dataset.volumeShortcut || "";
      updateList();
    });
  }
}

function updateList() {
  const query = search.value.trim().toLowerCase();
  const volumeId = volumeFilter.value;
  let visibleCount = 0;

  for (const card of cards) {
    const matchesVolume = !volumeId || card.dataset.volumeId === volumeId;
    const matchesQuery = !query || (card.dataset.searchText || "").toLowerCase().includes(query);
    const visible = matchesVolume && matchesQuery;

    card.hidden = !visible;
    if (visible) visibleCount += 1;
  }

  resultCount.textContent = `${visibleCount} / ${cards.length} 篇`;
  if (visibleCount === 0) ensureEmptyResult();
  if (emptyResult) emptyResult.hidden = visibleCount !== 0;
}

function ensureEmptyResult() {
  if (emptyResult) return;

  const articleList = document.querySelector("#articleList");
  if (!articleList) return;

  emptyResult = document.createElement("p");
  emptyResult.id = "emptyResult";
  emptyResult.className = "empty-result";
  emptyResult.role = "status";
  emptyResult.hidden = true;
  emptyResult.textContent = "未检得相合篇目";
  articleList.prepend(emptyResult);
}
