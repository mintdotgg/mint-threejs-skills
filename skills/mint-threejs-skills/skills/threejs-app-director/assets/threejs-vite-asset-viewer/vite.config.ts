import { defineConfig } from "vite";

export default defineConfig({
  server: {
    host: "127.0.0.1",
    port: 5190,
    strictPort: true,
  },
  preview: {
    host: "127.0.0.1",
    port: 4190,
    strictPort: true,
  },
  build: {
    sourcemap: true,
    chunkSizeWarningLimit: 1500,
  },
});
