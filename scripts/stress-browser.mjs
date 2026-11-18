import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { jsPDF } from "jspdf";
import assert from "node:assert/strict";
import desktopAssets from "../desktop/assets.cjs";
const root = fileURLToPath(new URL("../", import.meta.url)),
  out = path.resolve(
    process.env.STRESS_OUTPUT_DIR || path.join(root, ".stress-output"),
  );
fs.mkdirSync(out, { recursive: true });
await build({
  stdin: {
    contents: `export * from './src/storage';export * from './src/transfer';export * from './src/data';export * from './src/ancestry';export * from './tests/fixtures/stress-data';`,
    resolveDir: root,
    loader: "ts",
  },
  bundle: true,
  format: "esm",
  outfile: path.join(out, "harness.js"),
});
(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      acceptDownloads: true,
      locale: "es-VE",
    });
    let page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const mime = {
      ".js": "text/javascript",
      ".html": "text/html",
      ".css": "text/css",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".json": "application/json",
      ".ttf": "font/ttf",
    };
    await context.route("**/*", async (route) => {
      const url = new URL(route.request().url());
      if (url.origin !== "https://registro-gallero.test") {
        await route.abort();
        return;
      }
      if (
        !url.pathname.startsWith("/__stress/") &&
        process.env.STRESS_DESKTOP_HEADERS
      ) {
        const response = await desktopAssets.serveAppAsset(
          "registro://app" + url.pathname,
          path.join(root, "dist"),
        );
        await route.fulfill({
          status: response.status,
          headers: Object.fromEntries(response.headers),
          body: Buffer.from(await response.arrayBuffer()),
        });
        return;
      }
      let file =
        url.pathname === "/__stress/harness.js"
          ? path.join(out, "harness.js")
          : path.join(
              root,
              "dist",
              url.pathname === "/" ? "index.html" : url.pathname.slice(1),
            );
      try {
        await route.fulfill({
          status: 200,
          contentType: mime[path.extname(file)] || "application/octet-stream",
          body: fs.readFileSync(file),
        });
      } catch {
        await route.fulfill({ status: 404, body: "Not found" });
      }
    });
    await page.goto("https://registro-gallero.test");
    await page
      .getByRole("button", { name: "Registrar gallo", exact: true })
      .waitFor();
    await page.waitForFunction(() => Array.from(document.querySelectorAll("button")).some(button => button.textContent.trim() === "Registrar gallo" && !button.disabled));
    const photos = await page.evaluate(() =>
      Array.from({ length: 2400 }, (_, i) => {
        const canvas = document.createElement("canvas");
        canvas.width = i < 16 ? 1600 : 640;
        canvas.height = i < 16 ? 1200 : 480;
        const c = canvas.getContext("2d");
        c.fillStyle = `hsl(${i * 11},32%,55%)`;
        c.fillRect(0, 0, canvas.width, canvas.height);
        if (i < 16) {
          const pixels = c.createImageData(canvas.width, canvas.height);
          let random = i + 1;
          for (let offset = 0; offset < pixels.data.length; offset += 4) {
            random = (Math.imul(random, 1664525) + 1013904223) >>> 0;
            pixels.data[offset] = random >>> 24;
            pixels.data[offset + 1] = random >>> 16;
            pixels.data[offset + 2] = random >>> 8;
            pixels.data[offset + 3] = 255;
          }
          c.putImageData(pixels, 0, 0);
        }
        c.fillStyle = "#fff9e8";
        c.beginPath();
        c.arc(320, 205, 110, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = "#284e3e";
        c.textAlign = "center";
        c.font = "40px sans-serif";
        c.fillText("PRUEBA " + i, 320, 220);
        c.font = "28px sans-serif";
        c.fillText("REGISTRO FICTICIO", 320, 400);
        return canvas.toDataURL("image/jpeg", 0.75);
      }),
    );
    const pdf = new jsPDF();
    pdf.text("Comprobante ficticio de ascendencia - prueba de estres", 15, 20);
    const bytes = Buffer.from(pdf.output("arraybuffer"));
    const proof = {
      id: "proof",
      name: "pedigri-prueba.pdf",
      type: "application/pdf",
      size: bytes.length,
      source: "data:application/pdf;base64," + bytes.toString("base64"),
    };
    const metrics = await page.evaluate(
      async ({ photos, proof }) => {
        const h = await import("/__stress/harness.js");
        const t = performance.now();
        const data = h.stressDatabase(photos, proof);
        let photoIndex = 0;
        for (const bird of data.birds) {
          if (bird.photos.length) bird.photos = [photos[photoIndex++]];
          for (const ancestor of Object.values(bird.ancestry || {})) {
            if (ancestor.details?.photos.length)
              ancestor.details.photos = [photos[photoIndex++]];
          }
        }
        if (photoIndex !== 2400 || new Set(photos).size !== 2400)
          throw Error("Carga de fotos incompleta");
        const byId = new Map(data.birds.map((b) => [b.id, b]));
        let positions = 0;
        for (const b of data.birds.slice(0, 1600))
          for (let g = 1; g <= 4; g++)
            for (const p of h.ancestorPaths(g)) {
              if (!h.ancestorAt(b, p, byId)?.name)
                throw Error("Ancestro ausente " + b.id + " " + p);
              positions++;
            }
        const seeded = await h.writeDB(data);
        const writeMs = performance.now() - t;
        h.closeStorage();
        const r = performance.now();
        const loaded = await h.readDB();
        const readMs = performance.now() - r;
        const photo = await h.hydrateBird(loaded.birds[0]);
        if (photo.photos[0] !== photos[0]) throw Error("La foto cambió");
        if (photo.attachments?.[0]?.source !== proof.source)
          throw Error("El comprobante cambió");
        const start = performance.now();
        const edited = await h.writeDB(
          {
            ...loaded,
            birds: loaded.birds.map((b, i) =>
              i === 777 ? { ...b, notes: b.notes + " EDITADO" } : b,
            ),
          },
          { base: loaded },
        );
        return {
          birds: edited.birds.length,
          events: edited.events.length,
          ancestryPositions: positions,
          distinctPhotos: photoIndex,
          largestPhotoBytes: Math.max(
            ...photos.map((photo) =>
              Math.floor((photo.split(",")[1].length * 3) / 4),
            ),
          ),
          mainPhotos: data.birds.filter((b) => b.photos.length).length,
          manualAncestorPhotos: 1600,
          writeMs: Math.round(writeMs),
          readMs: Math.round(readMs),
          editMs: Math.round(performance.now() - start),
          storage: await navigator.storage.estimate(),
          heapBytes: performance.memory?.usedJSHeapSize,
        };
      },
      { photos, proof },
    );
    fs.writeFileSync(
      path.join(out, "initial-metrics.json"),
      JSON.stringify(metrics, null, 2),
    );
    console.log("DATA", metrics);
    const backup = await page.evaluate(async () => {
      const h = await import("/__stress/harness.js"),
        db = await h.readDB(),
        start = performance.now(),
        part = h.subsetData(db, new Set(db.birds.map((b) => b.id))),
        blob = await h.jsonExport(part);
      return {
        text: await blob.text(),
        bytes: blob.size,
        ms: Math.round(performance.now() - start),
      };
    });
    fs.writeFileSync(path.join(out, "stress-backup.json"), backup.text);
    console.log("BACKUP", { bytes: backup.bytes, ms: backup.ms });
    await page.reload();
    await page
      .getByRole("button", { name: /^Ver ficha de/ })
      .first()
      .waitFor({ timeout: 30000 });
    const viewports = [
      [320, 568],
      [360, 800],
      [393, 852],
      [412, 915],
      [600, 960],
      [768, 1024],
      [800, 1280],
      [912, 1368],
      [1024, 768],
      [1280, 800],
      [1440, 900],
      [1920, 1080],
      [344, 740],
      [853, 480],
      [1536, 695],
      [924, 1480],
      [1480, 924],
      [2560, 1440],
      [402, 874],
    ];
    const layouts = [];
    async function navigate(name) {
      const menu = page.getByRole("button", { name: "Abrir menú" });
      if (await menu.isVisible()) await menu.click();
      await page
        .getByRole("button", { name: new RegExp("^" + name) })
        .first()
        .click();
      await page.waitForTimeout(100);
    }
    for (const [width, height] of viewports) {
      await page.setViewportSize({ width, height });
      await navigate("Mis gallos");
      const row = { width, height };
      row.overflow = await page.evaluate(() => ({
        viewport: innerWidth,
        scroll: document.documentElement.scrollWidth,
        offenders: [...document.querySelectorAll("#root *")]
          .filter((e) => {
            const r = e.getBoundingClientRect();
            const s = getComputedStyle(e);
            return (
              r.width > 0 &&
              (r.right > innerWidth + 2 || r.left < -2) &&
              s.position !== "fixed" &&
              s.display !== "none"
            );
          })
          .slice(0, 8)
          .map((e) => ({
            tag: e.tagName,
            class: e.className,
            text: e.textContent?.slice(0, 45),
          })),
      }));
      row.cards = await page
        .getByRole("button", { name: /^Ver ficha de/ })
        .count();
      await page
        .getByRole("button", { name: "Registrar gallo", exact: true })
        .click();
      const dialog = page.getByRole("dialog", { name: "Registrar un gallo" });
      row.dialog = await dialog.evaluate((e) => {
        const r = e.getBoundingClientRect();
        return {
          x: r.x,
          y: r.y,
          width: r.width,
          height: r.height,
          scroll: e.scrollHeight,
          client: e.clientHeight,
        };
      });
      assert.equal(
        await dialog
          .locator(".modal-body")
          .evaluate((e) => e.scrollWidth <= e.clientWidth + 1),
        true,
        "Desbordamiento interno del formulario",
      );
      await dialog.screenshot({
        path: path.join(out, `form-${width}x${height}.png`),
      });
      await dialog.getByRole("button", { name: "Cerrar formulario" }).click();
      await page.screenshot({
        path: path.join(out, `list-${width}x${height}.png`),
      });
      assert.equal(
        row.overflow.scroll,
        width,
        `Desbordamiento horizontal en ${width}x${height}`,
      );
      assert.ok(
        row.dialog.x >= 0 && row.dialog.y >= 0 && row.dialog.height <= height,
        `Diálogo fuera de pantalla en ${width}x${height}`,
      );
      assert.ok(row.cards <= 20, "El listado carga más de una página");
      layouts.push(row);
      console.log("VIEWPORT", width, height, row.overflow.scroll, row.cards);
    }
    await page.setViewportSize({ width: 393, height: 852 });
    await navigate("Mis gallos");
    await page
      .getByRole("textbox", { name: "Buscar un gallo" })
      .fill("Manual 0000");
    await page
      .getByRole("button", { name: "Ver ficha de Manual 0000", exact: true })
      .first()
      .click();
    const gallery = page.getByRole("img", {
      name: "Manual 0000, fotografía 1",
    });
    await gallery.scrollIntoViewIfNeeded();
    await gallery.evaluate(async (image) => {
      await image.decode();
      if (!image.naturalWidth) throw Error("Foto rota en la ficha");
    });
    await page.getByRole("button", { name: "Editar", exact: true }).click();
    const editor = page.getByRole("dialog", { name: "Editar registro" });
    const upload = editor.locator('input[accept="image/jpeg,image/png"]');
    const png = await page.evaluate(() => {
      const canvas = document.createElement("canvas");
      canvas.width = 1200;
      canvas.height = 900;
      const c = canvas.getContext("2d");
      c.fillStyle = "#34643f";
      c.fillRect(0, 0, 1200, 900);
      return canvas.toDataURL("image/png").split(",")[1];
    });
    await upload.setInputFiles({
      name: "adjunta.png",
      mimeType: "image/png",
      buffer: Buffer.from(png, "base64"),
    });
    await editor
      .getByRole("img", { name: "Foto seleccionada 2" })
      .evaluate((image) => image.decode());
    await editor
      .getByRole("button", { name: "Quitar foto 1", exact: true })
      .click();
    await editor
      .getByRole("img", { name: "Foto seleccionada 1" })
      .evaluate((image) => image.decode());
    await editor
      .getByRole("button", { name: "Ancestros", exact: true })
      .click();
    const tree = page.getByRole("dialog", { name: "Árbol genealógico" });
    await tree.getByRole("button", { name: /^Madre Ancestro manual/ }).click();
    await tree.getByRole("button", { name: "Tatarabuelos", exact: true }).click();
    assert.equal(await tree.locator(".ancestor-node:visible").count(), 16);
    await tree.getByRole("button", { name: "Progenitores", exact: true }).click();
    assert.equal(await tree.locator(".ancestor-node:visible").count(), 2);
    await tree.screenshot({ path: path.join(out, "ancestros-movil.png") });
    await tree.getByRole("button", { name: "Volver a la ficha" }).click();
    await editor.getByRole("button", { name: "Guardar registro" }).click();
    await editor.waitFor({ state: "hidden" });
    await gallery.evaluate(async (image) => {
      await image.decode();
      if (image.naturalWidth !== 1200)
        throw Error("Se mostró la foto anterior");
    });
    await page.reload();
    await page
      .getByRole("textbox", { name: "Buscar un gallo" })
      .fill("Manual 0000");
    await page
      .getByRole("button", { name: "Ver ficha de Manual 0000", exact: true })
      .first()
      .click();
    await gallery.evaluate(async (image) => {
      await image.decode();
      if (image.naturalWidth !== 1200) throw Error("La foto no persistió");
    });
    await page.screenshot({
      path: path.join(out, "detail-mobile.png"),
      fullPage: true,
    });
    await page
      .getByRole("button", { name: "Importar datos", exact: true })
      .click();
    const importing = page.getByRole("dialog", { name: "Importar datos" });
    const importStart = Date.now();
    await importing
      .getByLabel("Seleccionar archivo JSON o CSV")
      .setInputFiles(path.join(out, "stress-backup.json"));
    await importing
      .getByRole("button", { name: "Seleccionar cantidad", exact: true })
      .waitFor({ timeout: 120000 });
    const amount = importing.getByLabel("Cantidad a seleccionar");
    await amount.fill("100");
    await importing
      .getByRole("button", { name: "Seleccionar cantidad", exact: true })
      .click();
    await importing
      .getByRole("button", {
        name: "Conservar todos como distintos",
        exact: true,
      })
      .click();
    await importing
      .getByRole("button", { name: "Confirmar importación", exact: true })
      .click();
    await page
      .getByRole("dialog", { name: "¿Incorporar los datos revisados?" })
      .getByRole("button", { name: "Confirmar", exact: true })
      .click();
    await importing.waitFor({ state: "hidden", timeout: 120000 });
    const imported = await page.evaluate(async () => {
      const h = await import("/__stress/harness.js"),
        data = await h.readDB();
      const restored = await h.hydrateBird(data.birds[1630]);
      if (restored.deceased !== true || restored.deathDate !== "2026-01-02")
        throw Error("El estado vital no sobrevivió a la importación");
      if (
        !restored.attachments?.[0]?.source.startsWith(
          "data:application/pdf;base64,",
        ) ||
        !restored.ancestry?.f.details?.attachments?.length
      )
        throw Error("Se perdió un comprobante al importar");
      return {
        count: data.birds.length,
        ids: new Set(data.birds.map((b) => b.id)).size,
      };
    });
    assert.equal(imported.count, 1730);
    assert.equal(imported.ids, 1730);
    console.log("IMPORT", { ...imported, ms: Date.now() - importStart });
    fs.writeFileSync(
      path.join(out, "roundtrip.json"),
      JSON.stringify(
        {
          export: { bytes: backup.bytes, ms: backup.ms },
          import: { ...imported, ms: Date.now() - importStart },
        },
        null,
        2,
      ),
    );
    fs.writeFileSync(
      path.join(out, "browser-results.json"),
      JSON.stringify({ metrics, layouts, errors }, null, 2),
    );
    assert.deepEqual(errors, [], "Errores de ejecución del navegador");
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
