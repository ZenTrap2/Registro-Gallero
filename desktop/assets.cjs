const { readFile } = require("node:fs/promises");
const { extname } = require("node:path");
const { resolveAppPath } = require("./paths.cjs");

const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};
const csp = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "connect-src 'self' data: blob:",
  "font-src 'self' data:",
  "worker-src 'self' blob:",
].join("; ");

async function serveAppAsset(url, root) {
  let file;
  try {
    file = resolveAppPath(url, root);
  } catch {
    return new Response("Dirección no permitida", { status: 403 });
  }
  try {
    const content = await readFile(file);
    return new Response(new Uint8Array(content), {
      headers: {
        "Content-Type": types[extname(file)] || "application/octet-stream",
        "Content-Security-Policy": csp,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (error.code === "ENOENT" || error.code === "EISDIR") {
      return new Response("Recurso no encontrado", { status: 404 });
    }
    console.error("Error al leer un recurso de Registro Gallero:", error);
    return new Response("No se pudo leer el recurso", { status: 500 });
  }
}

module.exports = { serveAppAsset };
