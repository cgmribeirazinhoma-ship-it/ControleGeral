import { defineConfig } from 'vite';

export default defineConfig({
  // Build otimizado para produção
  build: {
    outDir: 'dist',
    // Minifica e elimina código morto
    minify: 'terser',
    terserOptions: {
      compress: { drop_console: false }, // manter console.info para debug
    },
    rollupOptions: {
      output: {
        // Todos os assets com hash de versão (cache busting automático)
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames:  'assets/[name].[hash].js',
        assetFileNames:  'assets/[name].[hash].[ext]',
      },
    },
  },
  // Servidor de desenvolvimento local
  server: {
    port: 3000,
    open: true,
    // Proxy para Supabase em dev (evita CORS em desenvolvimento)
    proxy: {},
  },
});
