import { describe, it, expect } from "vitest";
import "fake-indexeddb/auto";
import {
  emptyBird,
  validateImport,
  mergeImport,
  parseCSV,
  toCSV,
} from "../src/data";
import { writeDB, readDB, hydrateBird } from "../src/storage";
import {
  validateAttachments,
  validateLife,
  type Attachment,
} from "../src/attachment-data";
import { jsonExport, subsetData } from "../src/transfer";
const content = "%PDF-1.4\n% Comprobante de prueba\n%%EOF",
  proof: Attachment = {
    id: "p",
    name: "pedigri.pdf",
    type: "application/pdf",
    size: content.length,
    source: "data:application/pdf;base64," + btoa(content),
  },
  bird = {
    ...emptyBird(),
    id: "a",
    name: "Ámbar",
    code: "A",
    birth: "2020-01-01",
    deceased: true,
    deathDate: "2026-01-01",
    attachments: [proof],
    ancestry: {
      m: {
        name: "Clara",
        deceased: true,
        deathDate: "2020-01-01",
        details: {
          ...emptyBird(),
          id: "snapshot",
          name: "Clara",
          code: "",
          birth: "2010-01-01",
          attachments: [{ ...proof, id: "ancestor" }],
        },
      },
    },
  };
describe("Comprobantes de ascendencia y estado vital", () => {
  it("valida archivos locales y rechaza tipo, contenido y tamaño incorrectos", () => {
    expect(() => validateAttachments([proof])).not.toThrow();
    for (const patch of [
      { type: "text/html" },
      { size: proof.size + 1 },
      { source: "https://example.com/a.pdf" },
      { source: "data:application/pdf;base64," + btoa("incorrecto") },
      { size: 11 * 1024 * 1024 },
    ])
      expect(() => validateAttachments([{ ...proof, ...patch }])).toThrow();
    expect(() =>
      validateAttachments(
        Array.from({ length: 9 }, (_, i) => ({ ...proof, id: String(i) })),
      ),
    ).toThrow();
  });
  it("el estado y la fecha son opcionales y no permite fechas incoherentes", () => {
    expect(() => validateLife(undefined, undefined)).not.toThrow();
    expect(() => validateLife(true, "")).not.toThrow();
    expect(() => validateLife(true, "2020-01-01", "2010-01-01")).not.toThrow();
    for (const [dead, date, birth] of [
      [false, "2020-01-01", ""],
      [true, "2010-01-01", "2020-01-01"],
      [true, "2999-01-01", ""],
      [true, "2020-02-31", ""],
    ])
      expect(() => validateLife(dead, date, birth as string)).toThrow();
  });
  it("guarda y restaura PDF y estado vital en el animal y en el ancestro sin cargar adjuntos al leer", async () => {
    const saved = await writeDB({ birds: [bird], events: [] });
    expect(saved.birds[0].attachments?.[0].source).toMatch(/^idb-photo:/);
    const loaded = await readDB(),
      full = await hydrateBird(loaded.birds[0]);
    expect(full.attachments?.[0].source).toBe(proof.source);
    expect(full.ancestry?.m.details?.attachments?.[0].source).toBe(
      proof.source,
    );
    const payload = JSON.parse(
        await (await jsonExport(subsetData(loaded, new Set(["a"])))).text(),
      ),
      preview = validateImport(payload);
    expect(preview.errors).toEqual([]);
    const restored = mergeImport({ birds: [], events: [] }, preview, {})
      .birds[0];
    expect(restored.deceased).toBe(true);
    expect(restored.deathDate).toBe("2026-01-01");
    expect(restored.ancestry?.m.deceased).toBe(true);
    expect(restored.ancestry?.m.deathDate).toBe("2020-01-01");
    expect(restored.attachments?.[0].source).toBe(proof.source);
  });
  it("CSV conserva fallecimiento y ancestros sin incluir archivos binarios", () => {
    const csv = toCSV([bird]);
    expect(csv).not.toContain(proof.source);
    const preview = validateImport({ birds: parseCSV(csv) });
    expect(preview.errors).toEqual([]);
    expect(preview.birds[0].deceased).toBe(true);
    expect(preview.birds[0].deathDate).toBe("2026-01-01");
    expect(preview.birds[0].ancestry?.m.deceased).toBe(true);
    expect(preview.birds[0].attachments).toBeUndefined();
  });
});
