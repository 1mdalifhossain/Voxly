import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    // Split heavy/rarely-changing vendor code into its own cacheable chunks
    // instead of one large bundle. Agora and Supabase are the biggest
    // dependencies and are also the least likely to change between deploys,
    // so isolating them lets browsers cache them across app updates.
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-supabase": ["@supabase/supabase-js"],
          "vendor-agora": ["agora-rtc-sdk-ng"],
        },
      },
    },
  },
});
