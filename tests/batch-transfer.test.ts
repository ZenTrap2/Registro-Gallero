import { describe, it, expect } from "vitest";
import {
  subsetData,
  parseImportFile,
  metadataPreview,
  jsonExport,
  csvExport,
} from "../src/transfer";
import { emptyBird, mergeImport, validateImport, parseCSV } from "../src/data";
const birds = Array.from({ length: 1200 }, (_, i) => ({
  ...emptyBird(),
  id: "source-" + i,
  code: "RG-" + i,
  name: "Gallo " + i,
  farmId: i < 100 ? "farm-a" : "farm-b",
  father: i ? "source-0" : "",
}));
const db = {
  birds,
  farms: [
    { id: "farm-a", name: "Primero", location: "", contact: "", notes: "" },
    { id: "farm-b", name: "Segundo", location: "", contact: "", notes: "" },
  ],
  events: [
    {
      id: "a",
      birdId: "source-1",
      date: "2026-01-01",
      type: "Control",
      notes: "",
      done: false,
      followUp: "",
    },
    {
      id: "b",
      birdId: "source-700",
      date: "2026-01-01",
      type: "Control",
      notes: "",
      done: false,
      followUp: "",
    },
    {
      id: "global",
      birdId: "",
      date: "2026-01-01",
      type: "Limpieza",
      notes: "",
      done: false,
      followUp: "",
    },
  ],
};
describe("Transferencias por selección", () => {
  it("exporta exactamente 100 de 1.200 gallos, solo sus eventos y criaderos y ninguna ficha adicional de padres", async () => {
    const ids = new Set(birds.slice(1, 101).map((b) => b.id)),
      part = subsetData(db, ids);
    expect(part.birds).toHaveLength(100);
    expect(part.birds.some((b) => b.id === "source-0")).toBe(false);
    expect(part.references).toContainEqual({ id: "source-0", code: "RG-0" });
    expect(part.events.map((e) => e.id)).toEqual(["a"]);
    const exported = JSON.parse(await (await jsonExport(part)).text());
    expect(exported.birds).toHaveLength(100);
    expect(exported.birds[0].code).toBe("RG-1");
    expect(exported.version).toBe(2);
  });
  it("conserva eventos generales y todos los criaderos en una copia completa", () => {
    const part = subsetData(db, new Set(birds.map((b) => b.id)));
    expect(part.events).toHaveLength(3);
    expect(part.farms).toHaveLength(2);
  });
  it("enlaza un progenitor omitido si ya existe con el mismo código en el destino", () => {
    const part = subsetData(db, new Set(["source-1"])),
      existing = { ...birds[0], id: "local-father" },
      merged = mergeImport({ birds: [existing], events: [] }, part, "skip");
    expect(merged.birds).toHaveLength(2);
    expect(merged.birds[1].father).toBe(existing.id);
    const absent = mergeImport({ birds: [], events: [] }, part, "skip");
    expect(absent.birds).toHaveLength(1);
    expect(absent.birds[0].father).toBe("");
  });
  it("conserva referencias externas de progenitores en CSV sin exportar esos animales", async () => {
    const part = subsetData(db, new Set(["source-1"])),
      rows = parseCSV(await csvExport(part, db.birds).text()),
      incoming = validateImport({ birds: rows });
    expect(rows).toHaveLength(1);
    expect(rows[0].fatherCode).toBe("RG-0");
    const merged = mergeImport(
      { birds: [{ ...birds[0], id: "local" }], events: [] },
      incoming,
      "skip",
    );
    expect(merged.birds[1].father).toBe("local");
  });
  it("detecta filas CSV incorrectas y permite previsualizar las válidas", async () => {
    const file = new File(["name,code\nA,A\nincorrecta\nB,B"], "lote.csv");
    const preview = await parseImportFile(file);
    expect(preview.birds).toHaveLength(2);
    expect(preview.errors).toHaveLength(1);
    expect(preview.errors[0]).toContain("Fila CSV");
  });
  it("la vista previa no transfiere imágenes, pero la selección conserva las fotografías originales", () => {
    const photo = "data:image/png;base64,YQ==",
      full = validateImport({ birds: [{ ...birds[0], photos: [photo] }] });
    expect(metadataPreview(full).birds[0].photos).toEqual([]);
    expect(subsetData(full, new Set([birds[0].id])).birds[0].photos).toEqual([
      photo,
    ]);
  });
});
