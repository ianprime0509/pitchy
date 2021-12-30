import path from "path";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    lib: {
      entry: path.resolve(__dirname, "src/index.ts"),
      name: "Pitchy",
      fileName: (format) =>
        `pitchy.${format}.${format === "es" ? "mjs" : "cjs"}`,
    },
    sourcemap: true,
    rollupOptions: {
      external: ["fft.js"],
      output: {
        globals: {
          "fft.js": "fft",
        },
      },
    },
  },
});
