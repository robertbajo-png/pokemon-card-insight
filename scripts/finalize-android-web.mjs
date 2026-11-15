import { readFile, readdir, rename, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "dist-android");
await rename(
  path.join(output, "android.html"),
  path.join(output, "index.html"),
);
const html = await readFile(path.join(output, "index.html"), "utf8");
if (
  !html.includes("connect-src &#39;none&#39;") &&
  !html.includes("connect-src 'none'")
) {
  throw new Error(
    "Android preview must block outbound service requests with CSP.",
  );
}

const forbidden = [
  /lovable(?:project)?\.com/i,
  /supabase\.(?:co|com)/i,
  /(?:OPENAI|AI)_API_KEY/,
  /sk-(?:proj|svcacct)-[A-Za-z0-9_-]{12,}/,
  /registerSW|serviceWorker\.register|workbox-/,
  /127\.0\.0\.1:5220/,
];
let checked = 0;
async function inspect(directory) {
  for (const name of await readdir(directory)) {
    const entry = path.join(directory, name);
    if ((await stat(entry)).isDirectory()) await inspect(entry);
    else if (/\.(?:html|js|json)$/.test(name)) {
      const content = await readFile(entry, "utf8");
      if (forbidden.some((pattern) => pattern.test(content))) {
        throw new Error(
          `Forbidden web service or credential marker in ${path.relative(output, entry)}`,
        );
      }
      checked++;
    }
  }
}
await inspect(output);
console.log(
  `Android packaged web verified: index.html and ${checked} text assets; no web backend or PWA registration.`,
);
