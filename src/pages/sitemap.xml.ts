import { PAGES, buildUrl } from '../lib/site';

export const prerender = true;

const entries: { slug: string; priority: string; changefreq: string }[] = [
  { slug: PAGES.home, priority: '1.0', changefreq: 'daily' },
  { slug: PAGES.sakaiToTokyo, priority: '0.9', changefreq: 'daily' },
  { slug: PAGES.tokyoToSakai, priority: '0.9', changefreq: 'daily' },
  { slug: PAGES.timetable, priority: '0.8', changefreq: 'weekly' },
  { slug: PAGES.guide, priority: '0.6', changefreq: 'monthly' },
  { slug: PAGES.faq, priority: '0.6', changefreq: 'monthly' }
];

const today = new Date().toISOString().split('T')[0];

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries
  .map(
    (entry) =>
      `  <url><loc>${buildUrl(entry.slug)}</loc><lastmod>${today}</lastmod><changefreq>${entry.changefreq}</changefreq><priority>${entry.priority}</priority></url>`
  )
  .join('\n')}
</urlset>
`;

export function GET() {
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
}
