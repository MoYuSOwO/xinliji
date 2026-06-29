const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const articlesDir = path.join(rootDir, "articles");
const dataDir = path.join(rootDir, "data");
const generatedDir = path.join(rootDir, "generated");
const volumesPath = path.join(dataDir, "volumes.json");
const indexPath = path.join(generatedDir, "articles.json");
const checkOnly = process.argv.includes("--check");

main();

function main() {
  const volumes = readJson(volumesPath);
  validateVolumes(volumes);

  const articles = fs
    .readdirSync(articlesDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => articleFromFile(entry.name, volumes))
    .sort(compareArticles)
    .map(({ order, ...article }) => article);

  const output = `${JSON.stringify(articles, null, 2)}\n`;

  if (checkOnly) {
    const current = fs.existsSync(indexPath) ? fs.readFileSync(indexPath, "utf8") : "";
    if (current !== output) {
      console.error("generated/articles.json is out of date. Run: npm run build");
      process.exit(1);
    }
    console.log(`OK ${articles.length} articles indexed`);
    return;
  }

  fs.mkdirSync(generatedDir, { recursive: true });
  fs.writeFileSync(indexPath, output);
  console.log(`Wrote generated/articles.json (${articles.length} articles)`);
}

function articleFromFile(file, volumes) {
  const filePath = path.join(articlesDir, file);
  const raw = fs.readFileSync(filePath, "utf8");
  const { frontMatter } = parseDocument(raw);
  const slug = file.replace(/\.md$/, "");

  if (!frontMatter.title) {
    throw new Error(`${file}: missing required front matter field "title"`);
  }

  const volumeId = normalizeVolumeId(frontMatter.volumeId, file, volumes);

  return omitEmpty({
    order: frontMatter.order ?? Number.MAX_SAFE_INTEGER,
    slug,
    file,
    title: frontMatter.title,
    volumeId,
    date: frontMatter.date,
    source: frontMatter.source,
    sourceUrl: frontMatter.sourceUrl,
  });
}

function parseDocument(raw) {
  if (!raw.startsWith("---")) return { frontMatter: {}, body: raw };
  const end = raw.indexOf("\n---", 3);
  if (end === -1) return { frontMatter: {}, body: raw };

  const yaml = raw.slice(3, end).trim();
  const body = raw.slice(end + 4).trim();
  return { frontMatter: parseFrontMatter(yaml), body };
}

function parseFrontMatter(yaml) {
  const data = {};
  for (const line of yaml.split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    data[key] = parseValue(rawValue);
  }
  return data;
}

function parseValue(value) {
  const trimmed = value.trim();
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    return trimmed
      .slice(1, -1)
      .split(",")
      .map((item) => stripQuotes(item.trim()))
      .filter(Boolean);
  }
  if (/^\d+$/.test(trimmed)) return Number(trimmed);
  return stripQuotes(trimmed);
}

function stripQuotes(value) {
  return value.replace(/^["']|["']$/g, "");
}

function normalizeVolumeId(volumeId, file, volumes) {
  if (volumeId == null) return undefined;
  const normalized = String(volumeId);
  if (!volumes.some((item) => item.id === normalized)) {
    throw new Error(`${file}: unknown volume id: ${volumeId}`);
  }
  return normalized;
}

function validateVolumes(volumes) {
  if (!Array.isArray(volumes)) throw new Error("data/volumes.json must be an array");

  const seen = new Set();
  for (const volume of volumes) {
    if (!volume.id || !volume.name) throw new Error("Each volume must include id and name");
    if (seen.has(volume.id)) throw new Error(`Duplicate volume id: ${volume.id}`);
    seen.add(volume.id);
  }
}

function compareArticles(a, b) {
  if (a.order !== b.order) return a.order - b.order;
  return String(b.date || "").localeCompare(String(a.date || "")) || a.title.localeCompare(b.title);
}

function omitEmpty(source) {
  return Object.fromEntries(
    Object.entries(source).filter(([, value]) => {
      if (Array.isArray(value)) return value.length > 0;
      return value !== undefined && value !== "";
    }),
  );
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}
