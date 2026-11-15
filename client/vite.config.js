import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

/**
 * 纯前端版本：无后端、无代理，可直接部署到任意静态托管（GitHub Pages / Vercel / 本地文件服务器）。
 *
 * base: './'
 *   使用相对路径引用资源，仓库部署在 https://<user>.github.io/<repo>/ 这类子路径下也能正常加载，
 *   不需要在代码里写死仓库名；配合 Hash 路由，刷新页面不会 404。
 */
export default defineConfig({
  base: './',
  plugins: [vue()],
  server: {
    port: 5173,
    strictPort: true,
    host: '127.0.0.1',
  },
  preview: {
    port: 4173,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
    // ExcelJS 体积较大且仅在导入/导出时按需加载，这里放宽单个 chunk 的告警阈值
    chunkSizeWarningLimit: 1200,
  },
});
