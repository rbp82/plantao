import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

/* Publicado no GitHub Pages em https://rbp82.github.io/plantao/ — por isso base '/plantao/'.
   Rotas são por hash (#/id), então não há reescrita de URL no servidor. */
export default defineConfig({
  base: '/plantao/',
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: { port: 5173, strictPort: true },
  /* pré-otimiza tudo de uma vez: evita reotimização no meio da sessão (que duplica o React) */
  optimizeDeps: { include: ['react', 'react-dom', 'react-dom/client', '@heroui/react', 'lucide-react', 'react-markdown', 'remark-gfm'] },
  build: {
    target: 'es2022',
    sourcemap: false,
    /* nomes com hash dentro de assets/ — o service worker lê o manifest gerado */
    manifest: true,
  },
  test: {
    environment: 'jsdom',
    globals: false,
    setupFiles: ['./src/test-setup.ts'],
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
});
