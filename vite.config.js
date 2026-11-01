import { defineConfig } from 'vite';
import { resume } from './src/data/resume.js';
import { renderPage } from './src/render.js';

// GitHub Pages serves the site from /<repo>/, so the workflow sets BASE_PATH. Locally it is /.
export default defineConfig({
  base: process.env.BASE_PATH || '/',
  build: { target: 'es2022' },
  plugins: [
    {
      // Fills index.html's <!-- render:name --> slots from the résumé data, in dev and in the build.
      name: 'render-resume',
      transformIndexHtml: { order: 'pre', handler: (html) => renderPage(html, resume) },
    },
  ],
});
