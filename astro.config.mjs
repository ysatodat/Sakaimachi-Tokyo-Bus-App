import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

// デプロイ先に応じて base/site を環境変数で切替可能に
// 既定: GitHub Pages の Project Pages
const base = process.env.PUBLIC_BASE_PATH ?? '/Sakaimachi-Tokyo-Bus-App/';
const site = process.env.PUBLIC_SITE_URL ?? 'https://ysatodat.github.io';

export default defineConfig({
  site,
  base,
  integrations: [react(), sitemap()],
  build: { format: 'directory' }
});
