import {
  type AncestorEntry,
  ancestorAt,
  allBirdPhotos,
  ancestryCycle,
  withoutPhotos,
} from "./ancestry";
import { getSettings } from "./settings";
import {
  validateCustomDefinitions,
  validateCustomValues,
  type CustomField,
} from "./custom-fields";
import { duplicateIndex, type ImportDecisions } from "./import-duplicates";
import type { AppSettings } from "./settings";
export type HealthEvent = {
  id: string;
  birdId: string;
  date: string;
  type: string;
  notes: string;
  followUp: string;
  done: boolean;
};
export type Bird = {
  id: string;
  name: string;
  code: string;
  birth: string;
  age: string;
  weightKg?: string;
  pl?: string;
  farmId?: string;
  origin?: string;
  mark?: string;
  purpose?: string;
  breed: string;
  color: string;
  father: string;
  mother: string;
  arrival: string;
  notes: string;
  status: string;
  lastReview: string;
  photos: string[];
  demo?: boolean;
  customValues?: Record<string, string>;
  ancestry?: Record<string, AncestorEntry>;
};
export type Farm = {
  id: string;
  name: string;
  location: string;
  contact: string;
  notes: string;
};
export type Database = {
  birds: Bird[];
  events: HealthEvent[];
  farms?: Farm[];
  settings?: AppSettings;
};
export const purposes = [
  "Reproducción responsable",
  "Conservación de raza",
  "Compañía",
  "Exhibición avícola",
  "Cuidado y recuperación",
];
export const today = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "America/Caracas" });
export function dateOffset(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
export const emptyBird = (currentDate = today()): Bird => ({
  id: crypto.randomUUID(),
  name: "",
  code: "",
  birth: "",
  age: "",
  weightKg: "",
  pl: "",
  farmId: "",
  origin: "",
  mark: "",
  purpose: "",
  breed: "",
  color: "",
  father: "",
  mother: "",
  arrival: currentDate,
  notes: "",
  status: "Saludable",
  lastReview: "",
  photos: [],
});
export function examples(): Database {
  const birds = ["Canelo", "Olivo", "Colorado", "Lucero", "Ámbar", "Cedro"].map(
    (name, i) => ({
      ...emptyBird(),
      id: `demo-${i}`,
      name,
      code: `RG-00${i + 1}`,
      breed: ["Criollo", "Plymouth Rock", "Sussex"][i % 3],
      color: ["Cobrizo", "Negro", "Colorado"][i % 3],
      birth: `202${i % 2 ? 5 : 4}-0${i + 1}-12`,
      arrival: "2026-01-15",
      status: i === 2 ? "En observación" : "Saludable",
      lastReview: dateOffset(-12 - i),
      notes: "Registro ficticio de ejemplo. Puedes editarlo o eliminarlo.",
      demo: true,
      father: i === 3 ? "demo-0" : "",
      mother: "",
    }),
  );
  return {
    birds,
    events: [
      {
        id: "e1",
        birdId: "demo-0",
        date: dateOffset(2),
        type: "Revisión veterinaria",
        notes: "Control general de rutina.",
        followUp: "",
        done: false,
      },
      {
        id: "e2",
        birdId: "demo-2",
        date: dateOffset(4),
        type: "Vacuna",
        notes: "Consultar el calendario de vacunación con el veterinario.",
        followUp: "",
        done: false,
      },
      {
        id: "e3",
        birdId: "",
        date: dateOffset(1),
        type: "Limpieza del corral",
        notes: "Cambiar la cama y limpiar bebederos.",
        followUp: "",
        done: false,
      },
    ],
  };
}
export { readDB, writeDB } from "./storage";
export const csvFields = [
  "name",
  "code",
  "birth",
  "age",
  "breed",
  "color",
  "father",
  "mother",
  "arrival",
  "notes",
  "status",
  "lastReview",
  "weightKg",
  "farmId",
  "origin",
  "mark",
  "purpose",
  "pl",
  "id",
] as const;
export function toCSV(
  birds: Bird[],
  farms: Farm[] = [],
  allBirds: Bird[] = birds,
  customFields: CustomField[] = [],
) {
  const farmNames = new Map(farms.map((f) => [f.id, f.name])),
    byId = new Map(allBirds.map((b) => [b.id, b.code]));
  const cell = (value: string) => '"' + value.replaceAll('"', '""') + '"';
  return (
    "\uFEFF" +
    [
      [
        ...csvFields,
        "farmName",
        "fatherCode",
        "motherCode",
        "customValues",
        "customFields",
        "ancestry",
      ].join(","),
      ...birds.map((b, index) =>
        [
          ...csvFields.map((k) => cell(String(b[k] ?? ""))),
          cell(farmNames.get(b.farmId || "") || ""),
          cell(byId.get(b.father) || ""),
          cell(byId.get(b.mother) || ""),
          cell(JSON.stringify(b.customValues || {})),
          cell(index === 0 ? JSON.stringify(customFields) : ""),
          cell(
            JSON.stringify(
              Object.fromEntries(
                Object.entries(withoutPhotos(b).ancestry || {}).map(
                  ([path, a]) => [
                    path,
                    {
                      ...a,
                      ...(a.details
                        ? {
                            details: {
                              ...a.details,
                              farmName:
                                farmNames.get(a.details.farmId || "") || "",
                            },
                          }
                        : {}),
                    },
                  ],
                ),
              ),
            ),
          ),
        ].join(","),
      ),
    ].join("\r\n")
  );
}
export function parseCSV(
  text: string,
  onRowError?: (message: string) => void,
): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [],
    cell = "",
    quoted = false;
  text = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (!quoted && cell)
        throw Error("CSV inválido: comillas inesperadas.");
      else quoted = !quoted;
    } else if (c === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((c === "\n" || c === "\r") && !quoted) {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  if (quoted) throw Error("CSV inválido: hay comillas sin cerrar.");
  row.push(cell);
  if (row.some(Boolean)) rows.push(row);
  const headers = rows.shift();
  if (!headers || !headers.includes("name") || !headers.includes("code"))
    throw Error(
      "El CSV necesita las columnas name y code. Usa un CSV exportado como plantilla.",
    );
  if (new Set(headers).size !== headers.length)
    throw Error("El CSV contiene encabezados repetidos.");
  return rows.flatMap((r, index) => {
    if (r.length !== headers.length) {
      const message = `Fila CSV ${index + 2}: el número de columnas no coincide.`;
      if (onRowError) {
        onRowError(message);
        return [];
      }
      throw Error(message);
    }
    return [Object.fromEntries(headers.map((h, i) => [h, r[i]]))];
  });
}
export const validDate = (value: unknown): value is string =>
  typeof value === "string" &&
  /^(?!0000)\d{4}-\d{2}-\d{2}$/.test(value) &&
  !Number.isNaN(Date.parse(value)) &&
  new Date(value).toISOString().slice(0, 10) === value;
export const validPL = (value: string | undefined) =>
  !value || (/^\d+$/.test(value) && Number.isSafeInteger(Number(value)));
export const validWeight = (value: string | undefined) =>
  !value ||
  (/^\d+(\.\d{1,3})?$/.test(value) &&
    Number(value) > 0 &&
    Number.isFinite(Number(value)));
export function validateImport(raw: unknown): {
  birds: Bird[];
  events: HealthEvent[];
  farms: Farm[];
  errors: string[];
  references: ImportReference[];
  customFields: CustomField[];
} {
  if (!raw || typeof raw !== "object")
    throw Error("El archivo no contiene una base de datos válida.");
  const obj = raw as {
    birds?: unknown;
    events?: unknown;
    farms?: unknown;
    references?: unknown;
    settings?: AppSettings;
    customFields?: CustomField[];
  };
  if (
    !Array.isArray(obj.birds) ||
    (!obj.birds.length &&
      !(Array.isArray(obj.farms) && obj.farms.length) &&
      !(Array.isArray(obj.events) && obj.events.length))
  )
    throw Error("El archivo está vacío o no contiene registros.");
  let customFields: CustomField[] =
    obj.customFields || obj.settings?.customFields || [];
  const first = obj.birds[0] as Record<string, unknown> | undefined;
  if (first?.customFields && typeof first.customFields === "string") {
    try {
      customFields = JSON.parse(first.customFields);
    } catch {
      throw Error("La definición de categorías del CSV no es válida.");
    }
  }
  validateCustomDefinitions(customFields);
  const importDate = today();
  const errors: string[] = [],
    birds: Bird[] = [],
    seenIds = new Set<string>();
  const farms: Farm[] = [];
  const farmIds = new Set<string>(),
    farmNames = new Map<string, Farm>();
  if (obj.farms !== undefined && !Array.isArray(obj.farms))
    errors.push("La lista de criaderos es inválida.");
  if (Array.isArray(obj.farms))
    for (const [i, item] of obj.farms.entries()) {
      const f = item as Farm;
      if (
        !f ||
        typeof f.id !== "string" ||
        !f.id ||
        typeof f.name !== "string" ||
        !f.name.trim() ||
        ["location", "contact", "notes"].some(
          (k) =>
            f[k as keyof Farm] != null &&
            typeof f[k as keyof Farm] !== "string",
        ) ||
        farmIds.has(f.id) ||
        farmNames.has(f.name.trim().toLowerCase())
      ) {
        errors.push(`Criadero ${i + 1}: datos inválidos o repetidos.`);
        continue;
      }
      const cleanFarm = {
        id: f.id,
        name: f.name.trim(),
        location: f.location || "",
        contact: f.contact || "",
        notes: f.notes || "",
      };
      farms.push(cleanFarm);
      farmIds.add(cleanFarm.id);
      farmNames.set(cleanFarm.name.toLowerCase(), cleanFarm);
    }
  obj.birds.forEach((v: unknown, i: number) => {
    if (!v || typeof v !== "object") {
      errors.push(`Fila ${i + 1}: registro inválido.`);
      return;
    }
    const b = { ...v } as Record<string, unknown>;
    if (
      typeof b.name !== "string" ||
      !b.name.trim() ||
      typeof b.code !== "string" ||
      !b.code.trim()
    ) {
      errors.push(`Fila ${i + 1}: nombre y código son obligatorios.`);
      return;
    }
    const code = b.code.trim();
    if (
      b.id !== undefined &&
      (typeof b.id !== "string" || !b.id.trim() || seenIds.has(b.id))
    ) {
      errors.push(`Fila ${i + 1}: identificador vacío, inválido o repetido.`);
      return;
    }
    for (const k of csvFields) {
      if (b[k] != null && typeof b[k] !== "string") {
        errors.push(`Fila ${i + 1}: ${k} debe ser texto.`);
        return;
      }
    }
    if (!validPL(b.pl as string | undefined)) {
      errors.push(
        `Fila ${i + 1}: PL debe ser un número entero igual o mayor que cero.`,
      );
      return;
    }
    if (!validWeight(b.weightKg as string | undefined)) {
      errors.push(
        `Fila ${i + 1}: el peso debe ser mayor que cero, en kg y con hasta 3 decimales.`,
      );
      return;
    }
    for (const k of ["birth", "arrival", "lastReview"]) {
      if (b[k] && !validDate(b[k])) {
        errors.push(`Fila ${i + 1}: fecha ${k} inválida.`);
        return;
      }
    }
    if (b.birth && String(b.birth) > importDate) {
      errors.push(`Fila ${i + 1}: el nacimiento no puede estar en el futuro.`);
      return;
    }
    const photos = Array.isArray(b.photos) ? b.photos : [];
    if (photos.length > 8) {
      errors.push(`Fila ${i + 1}: se permiten hasta 8 fotos.`);
      return;
    }
    if (
      photos.some(
        (p) =>
          typeof p !== "string" ||
          !/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(p) ||
          p.length > 7_000_000,
      )
    ) {
      errors.push(`Fila ${i + 1}: imagen inválida o demasiado grande.`);
      return;
    }
    if (b.farmName != null && typeof b.farmName !== "string") {
      errors.push(`Fila ${i + 1}: nombre de criadero inválido.`);
      return;
    }
    if (typeof b.farmName === "string" && b.farmName.trim()) {
      let farm = farmNames.get(String(b.farmName).trim().toLowerCase());
      if (!farm) {
        farm = {
          id: crypto.randomUUID(),
          name: b.farmName.trim(),
          location: "",
          contact: "",
          notes: "",
        };
        farms.push(farm);
        farmIds.add(farm.id);
        farmNames.set(farm.name.toLowerCase(), farm);
      }
      b.farmId = farm.id;
    }
    if (b.farmId && !farmIds.has(String(b.farmId))) {
      errors.push(
        `Fila ${i + 1}: criadero desconocido; se importará sin asignación.`,
      );
      b.farmId = "";
    }
    if (typeof b.id === "string") seenIds.add(b.id);
    const clean = emptyBird(importDate);
    for (const k of csvFields)
      if (typeof b[k] === "string") clean[k] = String(b[k]);
    let customValues = b.customValues as Record<string, string> | undefined;
    if (typeof b.customValues === "string") {
      try {
        customValues = JSON.parse(b.customValues || "{}");
      } catch {
        errors.push(`Fila ${i + 1}: categorías personalizadas inválidas.`);
        return;
      }
    }
    try {
      validateCustomValues(customValues, customFields);
    } catch (e) {
      errors.push(`Fila ${i + 1}: ${(e as Error).message}`);
      return;
    }
    let ancestry: Record<string, AncestorEntry> | undefined;
    try {
      const source =
        typeof b.ancestry === "string"
          ? JSON.parse(b.ancestry || "{}")
          : b.ancestry;
      if (source !== undefined) {
        if (
          !source ||
          typeof source !== "object" ||
          Array.isArray(source) ||
          Object.keys(source).length > 30
        )
          throw Error("Linaje inválido: máximo cuatro generaciones.");
        ancestry = {};
        for (const [path, value] of Object.entries(source)) {
          const entry = value as AncestorEntry;
          if (
            !/^[fm]{1,4}$/.test(path) ||
            !entry ||
            typeof entry.name !== "string" ||
            entry.name.length > 150 ||
            (entry.birdId !== undefined && typeof entry.birdId !== "string")
          )
            throw Error("Nombre o posición de ancestro inválidos.");
          let details: Bird | undefined;
          if (entry.details) {
            if (entry.details.ancestry !== undefined)
              throw Error(
                "Los detalles del ancestro no pueden contener otro árbol anidado.",
              );
            const result = validateImport({
              birds: [
                {
                  ...entry.details,
                  name: entry.name || entry.details.name,
                  code: entry.details.code || "ANCESTRO",
                  id: crypto.randomUUID(),
                },
              ],
              customFields,
              farms,
            });
            if (
              result.errors.some((e) => !e.includes("criadero desconocido")) ||
              result.birds.length !== 1
            )
              throw Error(
                "Detalles de ancestro inválidos: " + result.errors.join(" "),
              );
            const snapshotFarm = result.farms.find(
              (f) => f.id === result.birds[0].farmId,
            );
            if (snapshotFarm) {
              let farm = farmNames.get(snapshotFarm.name.toLowerCase());
              if (!farm) {
                farm = snapshotFarm;
                farms.push(farm);
                farmIds.add(farm.id);
                farmNames.set(farm.name.toLowerCase(), farm);
              }
              result.birds[0].farmId = farm.id;
            }
            details = { ...result.birds[0], code: entry.details.code || "" };
          }
          ancestry[path] = {
            name: entry.name.trim(),
            ...(entry.birdId ? { birdId: entry.birdId } : {}),
            ...(details ? { details } : {}),
          };
        }
      }
    } catch (e) {
      errors.push(`Fila ${i + 1}: ${(e as Error).message}`);
      return;
    }
    const resultBird = {
      ...clean,
      id: typeof b.id === "string" ? b.id : clean.id,
      name: b.name.trim(),
      code,
      photos: photos as string[],
      demo: b.demo === true,
      ...(ancestry ? { ancestry } : {}),
      ...(customValues
        ? { customValues: Object.fromEntries(Object.entries(customValues)) }
        : {}),
    };
    birds.push(resultBird);
    seenIds.add(resultBird.id);
  });
  const events: HealthEvent[] = [],
    eventIds = new Set<string>();
  if (obj.events !== undefined && !Array.isArray(obj.events))
    errors.push("Los eventos no son una lista válida.");
  if (Array.isArray(obj.events))
    obj.events.forEach((v: unknown, i: number) => {
      const e = v as HealthEvent;
      if (
        !e ||
        typeof e.type !== "string" ||
        !e.type.trim() ||
        typeof e.notes !== "string" ||
        typeof e.birdId !== "string" ||
        !validDate(e.date) ||
        (e.followUp !== undefined &&
          e.followUp !== "" &&
          (!validDate(e.followUp) || e.followUp < e.date)) ||
        (e.done !== undefined && typeof e.done !== "boolean")
      ) {
        errors.push(`Evento ${i + 1}: campos o fechas inválidos.`);
        return;
      }
      if (
        e.id !== undefined &&
        (typeof e.id !== "string" || !e.id.trim() || eventIds.has(e.id))
      ) {
        errors.push(
          `Evento ${i + 1}: identificador vacío, inválido o repetido.`,
        );
        return;
      }
      if (typeof e.id === "string") eventIds.add(e.id);
      if (e.birdId && !seenIds.has(e.birdId)) {
        errors.push(`Evento ${i + 1}: gallo desconocido.`);
        return;
      }
      events.push({
        ...e,
        id: typeof e.id === "string" ? e.id : crypto.randomUUID(),
        done: e.done === true,
        followUp: e.followUp || "",
      });
    });
  const importedById = new Map(birds.map((b) => [b.id, b]));
  for (const edge of invalidParentage(birds)) {
    const bird = importedById.get(edge.id)!;
    bird[edge.key] = "";
    errors.push(
      `${bird.code}: parentesco cíclico o duplicado; se importará sin ese vínculo.`,
    );
  }
  const references: ImportReference[] = [];
  if (Array.isArray(obj.references))
    for (const value of obj.references) {
      const r = value as ImportReference;
      if (
        r &&
        typeof r.id === "string" &&
        typeof r.code === "string" &&
        r.id &&
        r.code.trim()
      )
        references.push({ id: r.id, code: r.code.trim() });
    }
  for (const value of obj.birds) {
    const r = value as Record<string, unknown>;
    if (!r || typeof r !== "object") continue;
    for (const key of ["father", "mother"])
      if (
        typeof r[key] === "string" &&
        r[key] &&
        typeof r[key + "Code"] === "string" &&
        r[key + "Code"]
      )
        references.push({ id: String(r[key]), code: String(r[key + "Code"]) });
  }
  return { birds, events, farms, errors, references, customFields };
}
export type ImportReference = { id: string; code: string };
export function mergeImport(
  db: Database,
  incoming: {
    birds: Bird[];
    events: HealthEvent[];
    farms?: Farm[];
    references?: ImportReference[];
    customFields?: CustomField[];
    settings?: AppSettings;
  },
  mode: string | ImportDecisions,
): Database {
  const farms = [...(db.farms || [])],
    farmMap = new Map<string, string>(),
    farmPositions = new Map(
      farms.map((f, i) => [f.name.trim().toLowerCase(), i]),
    );
  for (const farm of incoming.farms || []) {
    const key = farm.name.trim().toLowerCase(),
      i = farmPositions.get(key);
    if (i !== undefined) {
      farmMap.set(farm.id, farms[i].id);
      if (mode === "update") farms[i] = { ...farm, id: farms[i].id };
    } else {
      const id = crypto.randomUUID();
      farmMap.set(farm.id, id);
      farmPositions.set(key, farms.length);
      farms.push({ ...farm, id });
    }
  }
  const birds = db.birds.map((b) => ({ ...b })),
    idMap = new Map<string, string>(),
    skipped = new Set<string>(),
    targets = new Map<string, Bird>(),
    positions = new Map(birds.map((b, i) => [b.id, i])),
    claimed = new Set<string>();
  const index = duplicateIndex(db.birds, incoming.birds);
  for (const bird of incoming.birds) {
    const matches = index.matches(bird);
    const legacy = typeof mode === "string";
    const old = legacy
      ? birds.find(
          (b) => b.code.trim().toLowerCase() === bird.code.trim().toLowerCase(),
        )
      : undefined;
    const decision = legacy
      ? old
        ? {
            action:
              mode === "update" ? ("replace" as const) : ("skip" as const),
            target: "db:" + old.id,
          }
        : undefined
      : mode[bird.id];
    if (!legacy && matches.length && !decision)
      throw Error(
        `Revisa la posible coincidencia de «${bird.name}» antes de importar.`,
      );
    let target: string | undefined;
    if (decision?.target && decision.action !== "keep") {
      const match = legacy
        ? undefined
        : matches.find((m) => m.key === decision.target);
      if (!legacy && !match)
        throw Error(
          "La coincidencia elegida ya no es válida. Revisa la importación.",
        );
      target = decision.target.startsWith("db:")
        ? decision.target.slice(3)
        : idMap.get(decision.target.slice(5));
    }
    if (decision?.action === "skip") {
      skipped.add(bird.id);
      if (!target && matches.length === 1) {
        const m = matches[0];
        target = m.source === "db" ? m.bird.id : idMap.get(m.bird.id);
      }
      if (target) idMap.set(bird.id, target);
      continue;
    }
    if (decision?.action === "replace" && (!target || !positions.has(target)))
      throw Error(
        "Elige un registro existente para reemplazar; no puede ser un registro omitido sin destino.",
      );
    const id = decision?.action === "replace" ? target! : crypto.randomUUID();
    if (decision?.action === "replace" && claimed.has(id))
      throw Error(
        "Dos filas intentan reemplazar el mismo gallo. Conserva ambas o cambia una decisión.",
      );
    if (decision?.action === "replace") claimed.add(id);
    idMap.set(bird.id, id);
    const next = { ...bird, id, farmId: farmMap.get(bird.farmId || "") || "" };
    targets.set(bird.id, next);
    const position = positions.get(id);
    if (position === undefined) {
      positions.set(id, birds.length);
      birds.push(next);
    } else birds[position] = next;
  }
  const byId = new Map(birds.map((b) => [b.id, b])),
    byCode = new Map<string, string[]>();
  for (const b of birds) {
    const key = b.code.trim().toLowerCase();
    const list = byCode.get(key);
    if (list) list.push(b.id);
    else byCode.set(key, [b.id]);
  }
  for (const ref of incoming.references || []) {
    const matches = byCode.get(ref.code.trim().toLowerCase()) || [];
    if (!idMap.has(ref.id)) {
      if (byId.has(ref.id) && matches.includes(ref.id))
        idMap.set(ref.id, ref.id);
      else if (matches.length === 1) idMap.set(ref.id, matches[0]);
    }
  }
  const parent = (id: string) => idMap.get(id) || (byId.has(id) ? id : "");
  for (const b of incoming.birds) {
    const target = targets.get(b.id);
    if (target) {
      target.father = parent(b.father);
      target.mother = parent(b.mother);
    }
  }
  const events = [...db.events],
    eventPositions = new Map(events.map((e, i) => [e.id, i]));
  for (const event of incoming.events) {
    if (skipped.has(event.birdId)) continue;
    const birdId = event.birdId ? idMap.get(event.birdId) : "";
    if (event.birdId && !birdId) continue;
    const i = eventPositions.get(event.id),
      decision = typeof mode === "string" ? undefined : mode[event.birdId];
    const next = { ...event, birdId: birdId || "" };
    if (i !== undefined) {
      if (
        (typeof mode === "string"
          ? mode === "update"
          : decision?.action === "replace") &&
        events[i].birdId === next.birdId
      )
        events[i] = next;
      else if (event.birdId && events[i].birdId !== next.birdId) {
        next.id = crypto.randomUUID();
        eventPositions.set(next.id, events.length);
        events.push(next);
      }
    } else {
      eventPositions.set(next.id, events.length);
      events.push(next);
    }
  }
  for (const target of targets.values())
    if (target.ancestry) {
      target.ancestry = Object.fromEntries(
        Object.entries(target.ancestry).map(([path, entry]) => [
          path,
          {
            ...entry,
            birdId: entry.birdId ? parent(entry.birdId) : undefined,
            ...(entry.details
              ? {
                  details: {
                    ...entry.details,
                    farmId:
                      farmMap.get(entry.details.farmId || "") ||
                      (db.farms || []).find(
                        (f) => f.id === entry.details!.farmId,
                      )?.id ||
                      "",
                  },
                }
              : {}),
          },
        ]),
      );
    }
  if (invalidParentage(birds).length || ancestryCycle(birds))
    throw Error(
      "La importación crearía un ciclo en el linaje. Revisa los progenitores del archivo; no se incorporó ningún dato.",
    );
  let settings = db.settings;
  const incomingFields =
    incoming.customFields || incoming.settings?.customFields || [];
  if (incomingFields.length) {
    const fields = structuredClone(db.settings?.customFields || []);
    for (const field of incomingFields) {
      const old = fields.find((f) => f.id === field.id);
      if (old) {
        if (old.type !== field.type)
          throw Error(
            `La categoría «${field.label}» tiene otro tipo en este dispositivo. No se modificaron los datos.`,
          );
        if (old.type === "choice")
          old.options = [...new Set([...old.options, ...field.options])];
      } else fields.push({ ...field });
    }
    validateCustomDefinitions(fields);
    settings = { ...getSettings(db), customFields: fields };
  }
  for (const b of birds)
    validateCustomValues(b.customValues, settings?.customFields || []);
  return { ...db, birds, events, farms, ...(settings ? { settings } : {}) };
}

export type BirdFilters = {
  search: string;
  breed: string;
  status: string;
  farmId: string;
  month: string;
  year: string;
  purpose: string;
  minWeight: string;
  maxWeight: string;
  pl?: string;
};
const searchText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("es")
    .trim();
const cachedSearch = new WeakMap<Database, Map<string, string>>();
export function filterBirds(db: Database, f: BirdFilters) {
  const query = searchText(f.search),
    byId = new Map(db.birds.map((b) => [b.id, b])),
    farms = new Map((db.farms || []).map((farm) => [farm.id, farm.name]));
  return db.birds.filter((b) => {
    if (
      (f.breed && b.breed !== f.breed) ||
      (f.status && b.status !== f.status) ||
      (f.farmId &&
        (f.farmId === "unassigned" ? !!b.farmId : b.farmId !== f.farmId)) ||
      (f.pl &&
        (f.pl === "unknown"
          ? !!b.pl
          : !b.pl || Number(b.pl) !== Number(f.pl))) ||
      (f.month && b.birth.slice(5, 7) !== f.month) ||
      (f.year && b.birth.slice(0, 4) !== f.year) ||
      (f.purpose && b.purpose !== f.purpose) ||
      (f.minWeight &&
        (!b.weightKg || Number(b.weightKg) < Number(f.minWeight))) ||
      (f.maxWeight && (!b.weightKg || Number(b.weightKg) > Number(f.maxWeight)))
    )
      return false;
    if (!query) return true;
    return searchText(
      [
        b.name,
        b.code,
        b.breed,
        b.color,
        b.origin,
        b.mark,
        b.purpose,
        b.notes,
        b.age,
        b.birth,
        b.arrival,
        b.lastReview,
        b.status,
        b.weightKg,
        farms.get(b.farmId || ""),
        byId.get(b.father)?.name,
        byId.get(b.mother)?.name,
      ].join(" "),
    ).includes(query);
  });
}

/** Iterative traversal avoids call-stack failures on long family chains. */
export function invalidParentage(birds: Bird[]) {
  const map = new Map(birds.map((b) => [b.id, b])),
    finished = new Set<string>(),
    active = new Set<string>();
  const invalid: { id: string; key: "father" | "mother" }[] = [];
  for (const start of birds) {
    if (finished.has(start.id)) continue;
    const stack = [{ bird: start, index: 0 }];
    active.add(start.id);
    while (stack.length) {
      const frame = stack[stack.length - 1];
      if (frame.index === 2) {
        active.delete(frame.bird.id);
        finished.add(frame.bird.id);
        stack.pop();
        continue;
      }
      const key = frame.index++ === 0 ? "father" : "mother";
      const id = frame.bird[key];
      if (!id) continue;
      if ((key === "mother" && id === frame.bird.father) || active.has(id)) {
        invalid.push({ id: frame.bird.id, key });
        continue;
      }
      const parent = map.get(id);
      if (parent && !finished.has(id)) {
        active.add(id);
        stack.push({ bird: parent, index: 0 });
      }
    }
  }
  return invalid;
}
