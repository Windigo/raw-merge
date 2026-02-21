import { defineConfig } from "electron-vite";
import { resolve } from "node:path";

export default defineConfig({
  main: {
    build: {
      outDir: "out/main",
    },
  },
  preload: {
    build: {
      outDir: "out/preload",
    },
  },
  renderer: {
    resolve: {
      alias: {
        "@renderer": resolve("src/renderer/src"),
      },
    },
    build: {
      outDir: "out/renderer",
    },
  },
});
