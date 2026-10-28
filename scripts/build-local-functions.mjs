import { build } from "esbuild";
import { createRequire } from "node:module";
import { resolve } from "node:path";
const require = createRequire(import.meta.url);
await build({
  entryPoints: ["config/local-windows/functions-node.ts"],
  outfile: ".local-build/functions/server.mjs",
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node22",
  banner: {
    js: "globalThis.Deno = { env: { get: (name) => process.env[name] } };",
  },
  plugins: [
    {
      name: "edge-module-compatibility",
      setup(builder) {
        builder.onResolve(
          { filter: /^https:\/\/deno\.land\/std@0\.168\.0\/http\/server\.ts$/ },
          () => ({ path: resolve("config/local-windows/serve-stub.ts") }),
        );
        builder.onResolve({ filter: /^npm:zod@3\.25\.76$/ }, () => ({
          path: require.resolve("zod"),
        }));
      },
    },
  ],
});
