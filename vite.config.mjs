import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/astryx-sheet/',
  build: {
    // The Astryx design system drives dark mode with light-dark() and @scope.
    // Older cssTargets make Lightning CSS down-compile light-dark() into its
    // prefers-color-scheme polyfill, which breaks the [data-theme] toggle in
    // production builds — target browsers that support both natively.
    cssTarget: ['chrome128', 'safari18', 'firefox128'],
  },
});
