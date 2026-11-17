import { expandedAncestry, withoutPhotos } from "./ancestry";
import {
  type Bird,
  type Database,
  type ImportReference,
  parseCSV,
  validateImport,
  toCSV,
} from "./data";
import { hydrateBird, type ProgressHandler } from "./storage";
export type TransferData = Database & {
  references?: ImportReference[];
  customFields?: import("./custom-fields").CustomField[];
};
export type ImportData = ReturnType<typeof validateImport>;
export function subsetData(
  data: TransferData,
  ids: ReadonlySet<string>,
  includeAllWhenComplete = true,
): TransferData {
  const originalById = new Map(data.birds.map((b) => [b.id, b]));
  const birds = data.birds
      .filter((b) => ids.has(b.id))
      .map((b) => {
        const expanded = expandedAncestry(b, originalById);
        if (!expanded.ancestry) return expanded;
        return {
          ...expanded,
          ancestry: Object.fromEntries(
            Object.entries(expanded.ancestry).map(([path, entry]) => [
              path,
              entry.birdId && ids.has(entry.birdId)
                ? { name: entry.name, birdId: entry.birdId }
                : entry,
            ]),
          ),
        };
      }),
    complete = includeAllWhenComplete && birds.length === data.birds.length,
    byId = new Map(data.birds.map((b) => [b.id, b])),
    neededParents = new Set(
      birds
        .flatMap((b) => [
          b.father,
          b.mother,
          ...Object.values(b.ancestry || {}).map((a) => a.birdId || ""),
        ])
        .filter((id) => id && !ids.has(id)),
    ),
    references = new Map(
      (data.references || [])
        .filter((r) => neededParents.has(r.id))
        .map((r) => [r.id, r]),
    ),
    farmIds = new Set(
      birds.flatMap((b) => [
        b.farmId,
        ...Object.values(b.ancestry || {}).map((a) => a.details?.farmId),
      ]),
    );
  for (const bird of birds)
    for (const id of [
      bird.father,
      bird.mother,
      ...Object.values(bird.ancestry || {}).map((a) => a.birdId || ""),
    ]) {
      const parent = byId.get(id);
      if (parent && !ids.has(id)) references.set(id, { id, code: parent.code });
    }
  return {
    birds,
    events: data.events.filter(
      (e) => ids.has(e.birdId) || (complete && !e.birdId),
    ),
    farms: (data.farms || []).filter((f) => complete || farmIds.has(f.id)),
    references: [...references.values()],
    customFields: (
      data.customFields ||
      data.settings?.customFields ||
      []
    ).filter(
      (f) =>
        complete ||
        birds.some(
          (b) =>
            (b.customValues && Object.hasOwn(b.customValues, f.id)) ||
            Object.values(b.ancestry || {}).some(
              (a) =>
                a.details?.customValues &&
                Object.hasOwn(a.details.customValues, f.id),
            ),
        ),
    ),
    ...(complete && data.settings ? { settings: data.settings } : {}),
  };
}
export async function jsonExport(
  data: TransferData,
  onProgress?: ProgressHandler,
): Promise<Blob> {
  const parts: BlobPart[] = ['{"version":2,"birds":['];
  for (let i = 0; i < data.birds.length; i++) {
    const bird = await hydrateBird(data.birds[i]);
    parts.push(new Blob([(i ? "," : "") + JSON.stringify(bird)]));
    if (i % 20 === 0 || i === data.birds.length - 1) {
      onProgress?.({
        label: "Preparando copia JSON",
        completed: i + 1,
        total: data.birds.length,
      });
      await new Promise((r) => setTimeout(r, 0));
    }
  }
  parts.push('],"events":[');
  for (let i = 0; i < data.events.length; i++) {
    parts.push((i ? "," : "") + JSON.stringify(data.events[i]));
    if (i % 200 === 0) await new Promise((r) => setTimeout(r, 0));
  }
  parts.push(
    '],"farms":' +
      JSON.stringify(data.farms || []) +
      ',"references":' +
      JSON.stringify(data.references || []),
    ',"customFields":' +
      JSON.stringify(data.customFields || data.settings?.customFields || []),
  );
  if (data.settings) parts.push(',"settings":' + JSON.stringify(data.settings));
  parts.push("}");
  return new Blob(parts, { type: "application/json" });
}
export function csvExport(data: TransferData, allBirds: Bird[]) {
  return new Blob(
    [
      toCSV(
        data.birds,
        data.farms,
        allBirds,
        data.customFields || data.settings?.customFields || [],
      ),
    ],
    {
      type: "text/csv;charset=utf-8",
    },
  );
}
export async function parseImportFile(file: File): Promise<ImportData> {
  if (!/\.(json|csv)$/i.test(file.name))
    throw Error("Selecciona un archivo JSON o CSV.");
  if (!file.size) throw Error("El archivo está vacío.");
  if (file.size > 512 * 1024 * 1024)
    throw Error(
      "El archivo supera 512 MB. Divide la copia en lotes desde Exportar datos.",
    );
  const text = await file.text();
  if (!text.trim()) throw Error("El archivo está vacío.");
  if (file.name.toLowerCase().endsWith(".csv")) {
    const errors: string[] = [],
      rows = parseCSV(text, (message) => errors.push(message));
    if (!rows.length && errors.length)
      return {
        birds: [],
        events: [],
        farms: [],
        references: [],
        customFields: [],
        errors,
      };
    const result = validateImport({ birds: rows });
    return { ...result, errors: [...errors, ...result.errors] };
  }
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw Error(
      "El archivo JSON no tiene un formato válido o está incompleto.",
    );
  }
  return validateImport(raw);
}
export function metadataPreview(data: ImportData): ImportData {
  return { ...data, birds: data.birds.map(withoutPhotos) };
}
