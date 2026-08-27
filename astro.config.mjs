// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  site: 'https://csvcleaner.app',
  // Keep generated pages readable when inspecting production output.
  compressHTML: false,

  vite: {
    plugins: [tailwindcss()]
  },

  integrations: [react()]
});
