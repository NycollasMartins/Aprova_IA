// Servidor de produção em Node para o build SSR do TanStack Start.
//
// O build (NITRO_PRESET=node-server) gera um handler Web `fetch` em
// dist/server/server.js e os estáticos do cliente em dist/client/. Este arquivo:
//   1. serve os estáticos de dist/client (assets com cache longo);
//   2. encaminha o resto para o handler SSR (Request/Response Web → Node).
// Usa apenas APIs nativas do Node (sem dependências), então o runtime do
// container só precisa de `dist/` e deste arquivo.
//
// Porta/host: PORT (default 3000) e HOST (default 0.0.0.0).

import { createServer } from "node:http";
import { Readable } from "node:stream";
import { readFile, stat } from "node:fs/promises";
import { join, extname, normalize } from "node:path";
import { fileURLToPath } from "node:url";

import handler from "./dist/server/server.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const CLIENT_DIR = join(__dirname, "dist", "client");
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || "0.0.0.0";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".map": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".webmanifest": "application/manifest+json",
};

// Tenta servir um arquivo estático de dist/client. Retorna true se serviu.
async function serveStatic(req, res, pathname) {
  if (pathname === "/") return false; // "/" é renderizado pelo SSR
  // Bloqueia path traversal: o caminho normalizado precisa ficar dentro de CLIENT_DIR.
  const filePath = normalize(join(CLIENT_DIR, decodeURIComponent(pathname)));
  if (filePath !== CLIENT_DIR && !filePath.startsWith(CLIENT_DIR + "/")) return false;
  let info;
  try {
    info = await stat(filePath);
  } catch {
    return false;
  }
  if (!info.isFile()) return false;

  const ext = extname(filePath).toLowerCase();
  const immutable = pathname.startsWith("/assets/");
  res.writeHead(200, {
    "content-type": MIME[ext] || "application/octet-stream",
    "content-length": info.size,
    "cache-control": immutable
      ? "public, max-age=31536000, immutable"
      : "public, max-age=3600",
  });
  if (req.method === "HEAD") {
    res.end();
    return true;
  }
  res.end(await readFile(filePath));
  return true;
}

// Converte a requisição do Node para um Request Web padrão.
function toWebRequest(req) {
  const proto = req.headers["x-forwarded-proto"] || "http";
  const host = req.headers.host || `localhost:${PORT}`;
  const url = `${proto}://${host}${req.url}`;
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) continue;
    headers.set(key, Array.isArray(value) ? value.join(", ") : value);
  }
  const hasBody = req.method !== "GET" && req.method !== "HEAD";
  return new Request(url, {
    method: req.method,
    headers,
    body: hasBody ? Readable.toWeb(req) : undefined,
    duplex: hasBody ? "half" : undefined,
  });
}

// Escreve um Response Web na resposta do Node (suporta streaming e set-cookie).
async function writeWebResponse(res, response) {
  const headers = {};
  response.headers.forEach((value, key) => {
    if (key.toLowerCase() !== "set-cookie") headers[key] = value;
  });
  res.writeHead(response.status, headers);
  // set-cookie precisa ser enviado separadamente para não colapsar múltiplos cookies
  const setCookie = response.headers.getSetCookie?.();
  if (setCookie && setCookie.length) res.setHeader("set-cookie", setCookie);

  if (!response.body) {
    res.end();
    return;
  }
  Readable.fromWeb(response.body).pipe(res);
}

const ctx = { waitUntil() {}, passThroughOnException() {} };

const server = createServer(async (req, res) => {
  try {
    const pathname = new URL(req.url, `http://${req.headers.host || "localhost"}`).pathname;
    if (await serveStatic(req, res, pathname)) return;

    const response = await handler.fetch(toWebRequest(req), process.env, ctx);
    await writeWebResponse(res, response);
  } catch (err) {
    console.error("[server] erro ao processar requisição:", err);
    if (!res.headersSent) res.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
    res.end("Internal Server Error");
  }
});

server.listen(PORT, HOST, () => {
  console.log(`AprovaIA rodando em http://${HOST}:${PORT}`);
});
