import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base "./" so assets resolve inside the Android WebView.
export default defineConfig({
  plugins: [react()],
  base: "./",
  build: { outDir: "dist", target: "es2020" },
});
