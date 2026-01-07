import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: [
        "icons/icon-192.png",
        "icons/icon-512.png",
        "icons/apple-touch-icon.png"
      ],
      manifest: {
        name: "Granada Guide",
        short_name: "Granada",
        description: "Private couple guide for places and memories",
        theme_color: "#f5efe6",
        background_color: "#f5efe6",
        display: "standalone",
        start_url: "/app/map",
        icons: [
          {
            src: "icons/icon-192.png",
            sizes: "192x192",
            type: "image/png"
          },
          {
            src: "icons/icon-512.png",
            sizes: "512x512",
            type: "image/png"
          },
          {
            src: "icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable"
          }
        ]
      }
    })
  ],
  server: {
    proxy: {
      "/api": "http://localhost:8080",
      "/uploads": "http://localhost:8080"
    }
  }
});
