import type { Bird } from "./data";
export type CustomField = {
  id: string;
  label: string;
  type: "text" | "integer" | "number" | "date" | "choice";
  options: string[];
  active?: boolean;
};
export const fieldTypes = {
  text: "Texto",
  integer: "Número entero",
  number: "Número decimal",
  date: "Fecha",
  choice: "Lista de opciones",
} as const;
export function validateCustomDefinitions(fields: CustomField[]) {
  if (!Array.isArray(fields) || fields.length > 100)
    throw Error(
      "Se permiten hasta 100 categorías personalizadas, incluidas las retiradas.",
    );
  const ids = new Set<string>(),
    labels = new Set<string>();
  for (const f of fields) {
    if (
      !f ||
      typeof f.id !== "string" ||
      !/^[a-zA-Z0-9_-]{1,100}$/.test(f.id) ||
      ids.has(f.id) ||
      typeof f.label !== "string" ||
      !f.label.trim() ||
      f.label.length > 60 ||
      !Object.hasOwn(fieldTypes, f.type) ||
      !Array.isArray(f.options) ||
      f.options.length > 200 ||
      f.options.some(
        (v) => typeof v !== "string" || !v.trim() || v.length > 120,
      ) ||
      new Set(f.options.map((v) => v.trim().toLowerCase())).size !==
        f.options.length ||
      (f.type === "choice" && !f.options.length) ||
      (f.active !== undefined && typeof f.active !== "boolean")
    )
      throw Error(
        "Revisa las categorías: nombres, tipos y opciones deben ser válidos y los identificadores no pueden repetirse.",
      );
    if (f.active !== false && labels.has(f.label.trim().toLowerCase()))
      throw Error("Las categorías activas no pueden tener nombres repetidos.");
    ids.add(f.id);
    if (f.active !== false) labels.add(f.label.trim().toLowerCase());
  }
}
export function validateCustomValues(
  values: Bird["customValues"],
  fields: CustomField[],
) {
  if (values === undefined) return;
  if (
    !values ||
    typeof values !== "object" ||
    Array.isArray(values) ||
    Object.keys(values).length > 100
  )
    throw Error("Las categorías del registro tienen un formato inválido.");
  for (const [id, v] of Object.entries(values)) {
    if (
      !/^[a-zA-Z0-9_-]{1,100}$/.test(id) ||
      typeof v !== "string" ||
      v.length > 2000
    )
      throw Error(
        "Los valores de las categorías deben ser texto de hasta 2000 caracteres.",
      );
    if (!v) continue;
    const f = fields.find((f) => f.id === id);
    if (!f) continue;
    if (
      (f.type === "integer" &&
        (!/^-?\d+$/.test(v) || !Number.isSafeInteger(Number(v)))) ||
      (f.type === "number" &&
        (!/^-?\d+(\.\d+)?$/.test(v) || !Number.isFinite(Number(v)))) ||
      (f.type === "date" &&
        (!/^(?!0000)\d{4}-\d{2}-\d{2}$/.test(v) ||
          Number.isNaN(Date.parse(v)) ||
          new Date(v).toISOString().slice(0, 10) !== v)) ||
      (f.type === "choice" && !f.options.includes(v))
    )
      throw Error(
        `Revisa «${f.label}»: el valor no corresponde al tipo ${fieldTypes[f.type].toLowerCase()}.`,
      );
  }
}
