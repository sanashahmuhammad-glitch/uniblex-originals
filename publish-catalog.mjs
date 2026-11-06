import { catalog } from "./catalog.mjs";

const apply = process.argv.includes("--apply");
const base = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = apply ? process.env.SUPABASE_SERVICE_ROLE_KEY : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!base?.startsWith("https://") || !key) throw new Error(`Missing Supabase ${apply ? "production service credentials" : "read-only catalog credentials"}`);
const api = `${base.replace(/\/$/, "")}/rest/v1`;
const headers = { apikey: key, Authorization: `Bearer ${key}` };

async function read(path) {
  const response = await fetch(`${api}/${path}`, { headers, cache: "no-store" });
  if (!response.ok) throw new Error(`Catalog read failed: ${response.status}`);
  return response.json();
}

const [categories, existing] = await Promise.all([
  read("categories?select=id,name"),
  read(`games?select=slug,title,status,iframe_url&slug=in.(${catalog.map((game) => game.slug).join(",")})`)
]);
const ids = new Map(categories.map((category) => [category.name.replace(/\s+Games$/i, ""), category.id]));
const existingBySlug = new Map(existing.map((game) => [game.slug, game]));
for (const game of catalog) {
  if (!ids.get(game.category_name)) throw new Error(`Missing category: ${game.category_name}`);
  const row = existingBySlug.get(game.slug);
  if (row && (row.title !== game.title || row.iframe_url !== game.iframe_url)) throw new Error(`Slug conflict: ${game.slug}`);
  if (row && row.status !== "published") throw new Error(`Existing unpublished slug: ${game.slug}`);
}
const missing = catalog.filter((game) => !existingBySlug.has(game.slug));
console.log(`Catalog ready: ${catalog.length} original games, ${missing.length} new, ${existing.length} existing`);
if (apply) {
// A public catalog entry must never point at an unpublished or broken static asset.
for (const game of catalog) for (const [url, type] of [[game.iframe_url, "text/html"], [game.cover_url, "image/jpeg"], [game.preview_video_url, "video/webm"]]) {
  const response = await fetch(url, { method: "HEAD", redirect: "follow" });
  if (!response.ok || !response.headers.get("content-type")?.includes(type)) throw new Error(`Asset check failed for ${game.slug}: ${response.status} ${type}`);
}
if (missing.length) {
  const publishedAt = new Date().toISOString();
  const rows = missing.map(({ category_name, ...game }) => ({
    ...game,
    category_id: ids.get(category_name),
    status: "published",
    published_at: publishedAt
  }));
  const response = await fetch(`${api}/games`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify(rows)
  });
  if (!response.ok) throw new Error(`Catalog publish failed: HTTP ${response.status} ${String(await response.text()).slice(0, 300)}`);
  const inserted = await response.json();
  if (inserted.length !== missing.length) throw new Error(`Catalog publish returned ${inserted.length}/${missing.length} records`);
}
const published = await read(`games?select=slug,status,iframe_url&slug=in.(${catalog.map((game) => game.slug).join(",")})`);
if (published.length !== catalog.length || published.some((game) => game.status !== "published")) throw new Error("Catalog verification failed");
console.log(`Published and verified ${published.length} original games`);
}
