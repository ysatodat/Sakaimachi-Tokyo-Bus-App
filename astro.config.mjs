import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

// デプロイ先に応じて base/site を環境変数で切替可能に
// 既定: カスタムドメイン（独自サーバー）
const base = process.env.PUBLIC_BASE_PATH ?? '/';
const site = process.env.PUBLIC_SITE_URL ?? 'https://sakaimachi-bus.amida-des.com';

export default defineConfig({
  site,
  base,
  integrations: [react(), sitemap()],
  build: { format: 'directory' }
});
