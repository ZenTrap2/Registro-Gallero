import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { serveAppAsset } = require("../desktop/assets.cjs");
const { installMediaHandlers } = require("../desktop/media.cjs");

it("sirve el arranque y módulos de Windows desde el paquete con tipos explícitos", async () => {
  const root = await mkdtemp(join(tmpdir(), "rg-desktop-test-"));
  try {
    await mkdir(join(root, "assets"));
    await writeFile(join(root, "index.html"), "<main>Registro Gallero</main>");
    await writeFile(join(root, "assets", "index.js"), "export {};");
    const index = await serveAppAsset("registro://app/", root);
    expect(index.headers.get("content-type")).toMatch(/^text\/html/);
    expect(index.headers.get("content-security-policy")).toContain(
      "img-src 'self' data: blob:",
    );
    expect(await index.text()).toContain("Registro Gallero");
    const module = await serveAppAsset("registro://app/assets/index.js", root);
    expect(module.headers.get("content-type")).toMatch(/^text\/javascript/);
    expect(await module.text()).toBe("export {};");
    expect(
      (await serveAppAsset("registro://app/no-existe.js", root)).status,
    ).toBe(404);
    expect(
      (await serveAppAsset("registro://app/%2e%2e%2fsecret", root)).status,
    ).toBe(403);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

it("conserva el original en la carpeta privada y restringe los nombres a hashes", async () => {
  const root = await mkdtemp(join(tmpdir(), "rg-media-test-"));
  try {
    const handlers = new Map<string, (...args: any[]) => Promise<unknown>>();
    installMediaHandlers(
      {
        handle: (name: string, fn: (...args: any[]) => Promise<unknown>) =>
          handlers.set(name, fn),
      },
      root,
    );
    const event = { senderFrame: { url: "registro://app/index.html" } };
    const original = new TextEncoder().encode("Comprobante de prueba");
    const id = createHash("sha256").update(original).digest("hex");
    await handlers.get("media:write")!(event, id, original);
    expect(new Uint8Array(await readFile(join(root, id)))).toEqual(original);
    expect(await handlers.get("media:read")!(event, id)).toEqual(original);
    await expect(
      handlers.get("media:read")!(event, "../data"),
    ).rejects.toThrow();
    await expect(
      handlers.get("media:write")!(event, "0".repeat(64), original),
    ).rejects.toThrow();
    await handlers.get("media:remove")!(event, id);
    await expect(readFile(join(root, id))).rejects.toMatchObject({
      code: "ENOENT",
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
