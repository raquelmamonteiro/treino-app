import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

export default defineConfig({
  plugins: [react()],
  build: {
    // Render “Publish directory” por defeito costuma ser `build`; alinhar aqui
    outDir: "build",
  },
  server: {
    host: true,
    port: 5173,
  },
});
