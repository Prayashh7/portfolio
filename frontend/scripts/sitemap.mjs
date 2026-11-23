/*
  Rewrites public/sitemap.xml from whatever the API currently publishes, so the
  project URLs stay in step with the database.

    node scripts/sitemap.mjs [apiBase] [siteUrl]

  Both arguments are optional and default to the local API and the live site.
*/

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, "..", "public", "sitemap.xml");

const apiBase = (process.argv[2] || "http://localhost:4000/api").replace(/\/+$/, "");
const siteUrl = (process.argv[3] || "https://prayashbartaula.com.np").replace(/\/+$/, "");

const response = await fetch(`${apiBase}/projects`);
if (!response.ok) {
  console.error(`Could not read ${apiBase}/projects (${response.status}). Is the API running?`);
  process.exit(1);
}

const projects = await response.json();
const today = new Date().toISOString().slice(0, 10);

const entry = (loc, priority, changefreq) =>
  `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${today}</lastmod>\n` +
  `    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;

const urls = [
  entry(`${siteUrl}/`, "1.0", "monthly"),
  ...projects.map((project) => entry(`${siteUrl}/work/${project.slug}`, "0.7", "yearly")),
];

await fs.writeFile(
  OUT,
  `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`
);

console.log(`sitemap.xml written — ${urls.length} URLs`);
