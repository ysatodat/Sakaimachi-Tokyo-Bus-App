import { PAGES, SITE, withBase } from '../lib/site';

export const prerender = true;

/** ベースパス（GitHub Pages など）を反映させるため動的に生成する */
const manifest = {
  name: SITE.name,
  short_name: SITE.shortName,
  description: '境町と東京（王子駅・東京駅）を結ぶ高速バスの次発と時刻表をすぐに確認できます。',
  lang: 'ja',
  dir: 'ltr',
  start_url: withBase(PAGES.home),
  scope: withBase(''),
  id: withBase(''),
  display: 'standalone',
  orientation: 'portrait-primary',
  background_color: '#ffffff',
  theme_color: '#1a4fe0',
  categories: ['travel', 'navigation', 'utilities'],
  icons: [
    { src: withBase('favicon.svg'), sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
    { src: withBase('icon-192.png'), sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: withBase('icon-512.png'), sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: withBase('icon-maskable-512.png'), sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    { src: withBase('apple-touch-icon.png'), sizes: '180x180', type: 'image/png', purpose: 'any' }
  ],
  shortcuts: [
    {
      name: '境町 → 東京 の次発',
      short_name: '境町発',
      url: withBase(PAGES.sakaiToTokyo)
    },
    {
      name: '東京 → 境町 の次発',
      short_name: '東京発',
      url: withBase(PAGES.tokyoToSakai)
    },
    {
      name: '全便時刻表',
      short_name: '時刻表',
      url: withBase(PAGES.timetable)
    }
  ]
};

export function GET() {
  return new Response(JSON.stringify(manifest, null, 2), {
    headers: { 'Content-Type': 'application/manifest+json; charset=utf-8' }
  });
}
