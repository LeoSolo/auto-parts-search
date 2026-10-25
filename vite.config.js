import { defineConfig, loadEnv } from "vite";
import { createPartsHandler, TEST_KEY } from './server/favorit.js';

export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), ''), ...process.env };
  const key = env.FAVORIT_API_KEY?.trim() || TEST_KEY;
  const mountApi = (server) => {
    server.middlewares.use('/api/parts', createPartsHandler({ key }));
  };
  return {
  plugins: [{ name: 'favorit-api', configureServer: mountApi, configurePreviewServer: mountApi }],
  define: { 'import.meta.env.VITE_TEST_API': JSON.stringify(key === TEST_KEY ? 'true' : 'false') },
  cacheDir: "E:/Temp/auto-parts-search/vite-cache",
  esbuild: { jsx: "automatic" },
  build: { outDir: process.env.BUILD_OUT_DIR || "dist" },
  server: { port: 5173, strictPort: true },
  };
});
