import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';

export default defineConfig({
  site: 'https://amartyagaur.com',
  integrations: [mdx(), sitemap()],
  build: { inlineStylesheets: 'auto' }
});
