import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "xlsx-js-style": "xlsx-js-style/dist/xlsx.min.js",
    },
  },
  optimizeDeps: {
    include: ["xlsx-js-style"],
  },
});