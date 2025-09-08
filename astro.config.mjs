import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

// GitHub Pagesのproject pages用ベースパス
const base = '/Sakaimachi-Tokyo-Bus-App/';

export default defineConfig({
  site: 'https://ysatodat.github.io',
  base,
  integrations: [react()],
  build: { format: 'directory' }
});