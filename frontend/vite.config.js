import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // The API and its media live on the backend in development. Proxying them
    // keeps the browser on one origin, so cookies behave exactly as they will
    // in production and CORS never enters the picture locally.
    proxy: {
      "/api": { target: "http://localhost:4000", changeOrigin: true },
      "/media": { target: "http://localhost:4000", changeOrigin: true },
    },
  },
  build: {
    target: "es2020",
    sourcemap: false,
    rollupOptions: {
      output: {
        // Three.js is by far the largest dependency and only the hero needs it.
        // Splitting it out means the rest of the page is interactive first.
        manualChunks: {
          three: ["three", "@react-three/fiber"],
          gsap: ["gsap"],
        },
      },
    },
  },
});
