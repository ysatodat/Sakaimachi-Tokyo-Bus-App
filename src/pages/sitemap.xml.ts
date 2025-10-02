export const prerender = true;

const site = import.meta.env.PUBLIC_SITE_URL ?? "https://sakaimachi-bus.amida-des.com";
const base = import.meta.env.PUBLIC_BASE_PATH ?? "/";
const siteUrl = new URL(base, site).toString();
const urls = [
  siteUrl,
  new URL("sakai-to-tokyo/", siteUrl).toString(),
  new URL("tokyo-to-sakai/", siteUrl).toString(),
  new URL("faq/", siteUrl).toString(),
  new URL("guide/", siteUrl).toString()
];

const today = new Date().toISOString().split("T")[0];

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="https://www.sitemaps.org/schemas/sitemap/0.9">
  ${urls
    .map((loc) => `<url><loc>${loc}</loc><lastmod>${today}</lastmod><changefreq>daily</changefreq><priority>0.8</priority></url>`) 
    .join("\n  ")}
</urlset>`;

export function GET(){
  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml"
    }
  });
}
