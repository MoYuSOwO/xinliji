import { getCollection } from "astro:content";
import volumes from "../../data/volumes.json";

const volumeById = new Map(volumes.map((volume) => [volume.id, volume]));

export function getVolumes() {
  return volumes;
}

export function volumeName(article) {
  return volumeById.get(article.data.volumeId)?.name || "";
}

export function articleUrl(article) {
  return `/articles/${encodeURIComponent(article.id)}/`;
}

export async function getSortedArticles() {
  const articles = await getCollection("articles");
  for (const article of articles) {
    if (!volumeById.has(article.data.volumeId)) {
      throw new Error(`${article.id}: unknown volume id ${article.data.volumeId}`);
    }
  }
  return articles.sort(compareArticles);
}

export function compareArticles(a, b) {
  const volumeCompare = volumeSortValue(a) - volumeSortValue(b);
  if (volumeCompare) return volumeCompare;

  const dateCompare = String(b.data.date || "").localeCompare(String(a.data.date || ""));
  if (dateCompare) return dateCompare;

  return a.data.title.localeCompare(b.data.title, "zh-Hans") || a.id.localeCompare(b.id, "zh-Hans");
}

export function readerPositionText(index, total) {
  return `第 ${index + 1} / ${total} 篇`;
}

export function countCjkLikeChars(text) {
  return text.replace(/\s|[#>*`\-[\]()"':：，。、“”；；！？,.!?]/g, "").length;
}

function volumeSortValue(article) {
  return article.data.volumeId == null ? Number.MAX_SAFE_INTEGER : article.data.volumeId;
}
