import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  outDir: "dist",
  // Dual package with "type": "module": ESM as .js/.d.ts, CJS as .cjs/.d.cts
  fixedExtension: false,
  platform: "neutral",
  // Published artifact stays ES2022. Node 22.18+ is a *dev* requirement
  // (native TS stripping for tsdown.config.ts), not a consumer engines pin.
  target: "es2022",
});
