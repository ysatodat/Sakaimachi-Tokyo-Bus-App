export const prerender = true;

const site = import.meta.env.PUBLIC_SITE_URL ?? "https://sakaimachi-bus.amida-des.com";
const base = import.meta.env.PUBLIC_BASE_PATH ?? "/";
const siteUrl = new URL(base, site).toString();
const sitemapUrl = new URL("sitemap.xml", siteUrl).toString();

const robots = `User-agent: *
Allow: /
Sitemap: ${sitemapUrl}
`;

export function GET(){
  return new Response(robots, {
    headers: {
      "Content-Type": "text/plain"
    }
  });
}
