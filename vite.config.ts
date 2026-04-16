import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    // `build` coincide com o publish directory por defeito no Render (Static Site).
    outDir: "build",
  },
  server: {
    host: true,
    port: 5173,
  },
});
