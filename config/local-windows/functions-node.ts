import { createServer } from "node:http";
import { Readable } from "node:stream";
import { handleRequest as analyze } from "../../supabase/functions/analyze-pokemon-card/index.ts";
import { handleRequest as generate } from "../../supabase/functions/generate-set-cards/index.ts";
import { handleRequest as translate } from "../../supabase/functions/translate/index.ts";
import { handleRequest as catalogue } from "../../supabase/functions/pokemon-proxy/index.ts";

const handlers = new Map([
  ["analyze-pokemon-card", analyze],
  ["generate-set-cards", generate],
  ["translate", translate],
  ["pokemon-proxy", catalogue],
]);
const server = createServer(async (incoming, outgoing) => {
  try {
    const url = new URL(incoming.url ?? "/", "http://functions:9000");
    const name = url.pathname.slice(1);
    outgoing.setHeader("Cache-Control", "no-store");
    if (name === "_health") {
      outgoing.setHeader("Content-Type", "application/json");
      outgoing.end('{"status":"ok"}');
      return;
    }
    const handler = handlers.get(name);
    if (!handler) {
      outgoing.writeHead(404);
      outgoing.end();
      return;
    }
    let size = 0;
    const chunks: Buffer[] = [];
    for await (const chunk of incoming) {
      size += chunk.length;
      if (size > 3000000) {
        outgoing.writeHead(413, {
          "Content-Type": "application/json",
          Connection: "close",
        });
        outgoing.end('{"error":"Anropet är för stort."}');
        return;
      }
      chunks.push(chunk);
    }
    const headers = new Headers();
    for (const [key, value] of Object.entries(incoming.headers)) {
      if (typeof value === "string") headers.set(key, value);
      else if (Array.isArray(value)) headers.set(key, value.join(", "));
    }
    const method = incoming.method ?? "GET";
    const request = new Request(url, {
      method,
      headers,
      ...(method !== "GET" && method !== "HEAD"
        ? { body: Buffer.concat(chunks) }
        : {}),
    });
    const response = await handler(request);
    outgoing.statusCode = response.status;
    response.headers.forEach((value, key) => outgoing.setHeader(key, value));
    if (response.body) {
      const stream = Readable.fromWeb(
        response.body as Parameters<typeof Readable.fromWeb>[0],
      );
      stream.on("error", () => outgoing.destroy());
      outgoing.on("close", () => stream.destroy());
      stream.pipe(outgoing);
    } else outgoing.end();
  } catch {
    if (!outgoing.headersSent)
      outgoing.writeHead(503, { "Content-Type": "application/json" });
    outgoing.end('{"error":"Tjänsten kunde inte slutföra anropet."}');
  }
});
server.headersTimeout = 10000;
server.requestTimeout = 60000;
server.keepAliveTimeout = 5000;
server.maxHeadersCount = 100;
server.listen(9000, "0.0.0.0");
