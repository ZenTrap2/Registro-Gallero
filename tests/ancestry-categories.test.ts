import { detachAncestor } from "../src/ancestry";
import { describe, it, expect } from "vitest";
import {
  emptyBird,
  validateImport,
  mergeImport,
  toCSV,
  parseCSV,
  type Bird,
} from "../src/data";
import {
  ancestorAt,
  ancestorPaths,
  expandedAncestry,
  ancestryCycle,
} from "../src/ancestry";
import { getSettings, applySettings } from "../src/settings";
import {
  subsetData,
  csvExport,
  jsonExport,
  metadataPreview,
} from "../src/transfer";
import { createBirdPDF } from "../src/pdf";
import { pdfText } from "./pdf-text";
const bird = (id: string) => ({ ...emptyBird(), id, name: id, code: id });
const field = {
  id: "temperatura",
  label: "Temperatura habitual",
  type: "number" as const,
  options: [],
  active: true,
};
describe("Categorías adicionales", () => {
  it("crea, edita, retira y restaura sin perder valores ni cambiar su tipo", () => {
    const b = { ...bird("a"), customValues: { temperatura: "41.5" } };
    const settings = {
      ...getSettings({ birds: [b], events: [] }),
      customFields: [field],
    };
    const db = { birds: [b], events: [], settings };
    const retired = applySettings(
      db,
      {
        ...settings,
        customFields: [{ ...field, active: false, label: "Temperatura" }],
      },
      {},
    );
    expect(retired.birds[0].customValues).toEqual(b.customValues);
    expect(retired.settings?.customFields?.[0].active).toBe(false);
    expect(() =>
      applySettings(
        db,
        { ...settings, customFields: [{ ...field, type: "text" }] },
        {},
      ),
    ).toThrow("tipo");
    expect(() =>
      applySettings(db, { ...settings, customFields: [] }, {}),
    ).toThrow("Retira");
  });
  it("valida los tipos al importar y conserva definiciones y valores en JSON y CSV", async () => {
    const b = { ...bird("a"), customValues: { temperatura: "41.5" } },
      settings = {
        ...getSettings({ birds: [], events: [] }),
        customFields: [field],
      },
      db = { birds: [b], events: [], settings };
    const part = subsetData(db, new Set(["a"]));
    for (const incoming of [
      validateImport(JSON.parse(await (await jsonExport(part)).text())),
      validateImport({
        birds: parseCSV(await csvExport(part, db.birds).text()),
      }),
    ]) {
      expect(incoming.errors).toEqual([]);
      const merged = mergeImport({ birds: [], events: [] }, incoming, {});
      expect(merged.settings?.customFields?.[0]).toEqual(field);
      expect(merged.birds[0].customValues).toEqual(b.customValues);
    }
    expect(
      validateImport({
        birds: [{ ...b, customValues: { temperatura: "texto" } }],
        customFields: [field],
      }).birds,
    ).toHaveLength(0);
  });
  it("mantiene configuraciones locales e incorpora categorías nuevas sin mutar el origen", () => {
    const settings = {
      ...getSettings({ birds: [], events: [] }),
      customFields: [
        {
          id: "lista",
          label: "Corral",
          type: "choice" as const,
          options: ["Norte"],
        },
      ],
    };
    const incoming = {
      birds: [{ ...bird("a"), customValues: { lista: "Sur" } }],
      events: [],
      customFields: [
        {
          id: "lista",
          label: "Ubicación",
          type: "choice" as const,
          options: ["Sur"],
        },
      ],
    };
    const next = mergeImport({ birds: [], events: [], settings }, incoming, {});
    expect(next.settings?.customFields?.[0].options).toEqual(["Norte", "Sur"]);
    expect(settings.customFields[0].options).toEqual(["Norte"]);
    expect(next.settings?.customFields?.[0].label).toBe("Corral");
  });
});
describe("Pedigrí de cuatro generaciones", () => {
  it("tiene 30 posiciones y hereda ancestros del padre registrado con rama materna manual", () => {
    const root = {
      ...bird("Claudio"),
      father: "Pepe",
      ancestry: {
        m: { name: "Clara" },
        mm: { name: "Rosa" },
        mmmm: { name: "Tatarabuela" },
      },
    };
    const father = { ...bird("Pepe"), father: "Juanito", mother: "Juanita" };
    const grandfather = { ...bird("Juanito"), father: "Bisabuelo" },
      great = bird("Bisabuelo");
    const db = [root, father, grandfather, bird("Juanita"), great],
      byId = new Map(db.map((b) => [b.id, b]));
    expect([1, 2, 3, 4].flatMap(ancestorPaths)).toHaveLength(30);
    expect(ancestorAt(root, "ff", byId)?.name).toBe("Juanito");
    expect(ancestorAt(root, "fm", byId)?.name).toBe("Juanita");
    expect(ancestorAt(root, "fff", byId)?.name).toBe("Bisabuelo");
    expect(ancestorAt(root, "m", byId)?.name).toBe("Clara");
    expect(ancestorAt(root, "mmmm", byId)?.name).toBe("Tatarabuela");
    expect(ancestorAt(root, "ffff", byId)).toBeUndefined();
  });
  it("conserva todo el linaje en una copia parcial sin crear animales extra y admite nombres sin código", async () => {
    const parent = { ...bird("Pepe"), father: "Juan" },
      root = {
        ...bird("Claudio"),
        father: "Pepe",
        ancestry: {
          m: {
            name: "Clara",
            details: {
              ...bird("snapshot"),
              name: "Clara",
              code: "",
              notes: "Datos privados de Clara",
            },
          },
          mmmm: { name: "Remota" },
        },
      };
    const db = { birds: [root, parent, bird("Juan")], events: [] };
    const part = subsetData(db, new Set([root.id]));
    expect(part.birds).toHaveLength(1);
    for (const input of [
      JSON.parse(await (await jsonExport(part)).text()),
      { birds: parseCSV(await csvExport(part, db.birds).text()) },
    ]) {
      const incoming = validateImport(input);
      expect(incoming.errors).toEqual([]);
      const result = mergeImport({ birds: [], events: [] }, incoming, {});
      expect(result.birds).toHaveLength(1);
      const byId = new Map(result.birds.map((b) => [b.id, b]));
      expect(ancestorAt(result.birds[0], "f", byId)?.name).toBe("Pepe");
      expect(ancestorAt(result.birds[0], "ff", byId)?.name).toBe("Juan");
      expect(ancestorAt(result.birds[0], "m", byId)?.details?.code).toBe("");
      expect(ancestorAt(result.birds[0], "mmmm", byId)?.name).toBe("Remota");
    }
  });
  it("omite fotos en la vista previa y en CSV, conserva originales en JSON y limita la profundidad", () => {
    const photo = "data:image/png;base64,YQ==",
      b = {
        ...bird("a"),
        ancestry: {
          f: { name: "Pepe", details: { ...bird("p"), photos: [photo] } },
        },
      };
    expect(
      metadataPreview(validateImport({ birds: [b] })).birds[0].ancestry?.f
        .details?.photos,
    ).toEqual([]);
    expect(parseCSV(toCSV([b]))[0].ancestry).not.toContain(photo);
    expect(
      validateImport({
        birds: [{ ...b, ancestry: { fffff: { name: "Demasiado" } } }],
      }).birds,
    ).toHaveLength(0);
  });
  it("evita ciclos entre ancestros registrados", () => {
    const a: Bird = {
        ...bird("a"),
        ancestry: { ff: { name: "b", birdId: "b" } },
      },
      b = { ...bird("b"), father: "a" };
    expect(ancestryCycle([a, b])).toBe(true);
    expect(() =>
      mergeImport({ birds: [], events: [] }, { birds: [a, b], events: [] }, {}),
    ).toThrow("ciclo");
  });
  it("PDF incluye nombres y oculta los detalles hasta elegirlos", async () => {
    const b = {
        ...bird("Claudio"),
        ancestry: {
          f: {
            name: "Pepe",
            details: { ...bird("p"), notes: "DETALLE RESERVADO DEL ANCESTRO" },
          },
          mmmm: { name: "Remota" },
        },
      },
      db = { birds: [b], events: [] };
    const normal = await pdfText(createBirdPDF([b], db));
    expect(normal).toContain("Pepe");
    expect(normal).toContain("Remota");
    expect(normal).not.toContain("DETALLE RESERVADO");
    const detailed = await pdfText(
      createBirdPDF([b], db, { includeAncestorDetails: true }),
    );
    expect(detailed).toContain("DETALLE RESERVADO DEL ANCESTRO");
  });
});
it("incluye definiciones de categorías usadas únicamente por un ancestro manual en una copia parcial", async () => {
  const b = {
      ...bird("a"),
      ancestry: {
        m: {
          name: "Madre",
          details: {
            ...bird("snapshot"),
            customValues: { temperatura: "40.5" },
          },
        },
      },
    },
    settings = {
      ...getSettings({ birds: [b], events: [] }),
      customFields: [field],
    },
    other = bird("other");
  const part = subsetData(
    { birds: [b, other], events: [], settings },
    new Set(["a"]),
  );
  expect(part.customFields).toEqual([field]);
  const result = validateImport(
    JSON.parse(await (await jsonExport(part)).text()),
  );
  expect(result.errors).toEqual([]);
  expect(result.customFields).toEqual([field]);
});
it("una copia completa usa vínculos en lugar de duplicar fotos de animales ya incluidos", async () => {
  const photo = "data:image/png;base64,YQ==",
    father = { ...bird("p"), photos: [photo] },
    child = { ...bird("c"), father: "p" };
  const data = subsetData(
    { birds: [father, child], events: [] },
    new Set(["p", "c"]),
  );
  expect(data.birds[1].ancestry?.f.details).toBeUndefined();
  const text = await (await jsonExport(data)).text();
  expect(text.split(photo).length - 1).toBe(1);
  const imported = validateImport(JSON.parse(text));
  const result = mergeImport({ birds: [], events: [] }, imported, {});
  expect(
    ancestorAt(
      result.birds[1],
      "f",
      new Map(result.birds.map((b) => [b.id, b])),
    )?.name,
  ).toBe("p");
});
it("conserva el criadero de un ancestro manual en una exportación parcial JSON y CSV", async () => {
  const farm = {
      id: "origin-farm",
      name: "Origen",
      location: "Pueblo",
      notes: "",
      contact: "",
    },
    b = {
      ...bird("a"),
      ancestry: {
        m: { name: "Madre", details: { ...bird("snapshot"), farmId: farm.id } },
      },
    },
    db = { birds: [b, bird("other")], events: [], farms: [farm] },
    part = subsetData(db, new Set(["a"]));
  expect(part.farms).toEqual([farm]);
  for (const input of [
    JSON.parse(await (await jsonExport(part)).text()),
    { birds: parseCSV(await csvExport(part, db.birds).text()) },
  ]) {
    const preview = validateImport(input);
    expect(preview.errors).toEqual([]);
    const result = mergeImport({ birds: [], events: [] }, preview, {});
    expect(result.birds[0].ancestry?.m.details?.farmId).toBe(
      result.farms?.find((f) => f.name === "Origen")?.id,
    );
    expect(result.farms?.some((f) => f.name === "Origen")).toBe(true);
  }
});

it("conserva nombres y detalles documentados al eliminar un ancestro registrado", () => {
  const parent = { ...bird("Pepe"), notes: "Datos documentados" },
    child = { ...bird("Claudio"), father: "Pepe" },
    byId = new Map([parent, child].map((b) => [b.id, b])),
    next = detachAncestor(child, "Pepe", byId);
  expect(next.father).toBe("");
  const resolved = ancestorAt(next, "f", new Map([[child.id, next]]));
  expect(resolved?.name).toBe("Pepe");
  expect(resolved?.birdId).toBeUndefined();
  expect(resolved?.details?.notes).toBe("Datos documentados");
});
