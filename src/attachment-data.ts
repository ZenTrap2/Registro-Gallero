export type Attachment = {
  id: string;
  name: string;
  type: string;
  size: number;
  source: string;
};
export const attachmentLimit = 10 * 1024 * 1024;
export const attachmentTypes: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  txt: "text/plain",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};
export function validateAttachments(
  value: unknown,
  allowReferences = false,
): asserts value is Attachment[] | undefined {
  if (value === undefined) return;
  if (!Array.isArray(value) || value.length > 8)
    throw Error("Se permiten hasta 8 comprobantes por animal o ancestro.");
  const ids = new Set<string>();
  for (const a of value) {
    if (
      !a ||
      typeof a.id !== "string" ||
      !a.id ||
      ids.has(a.id) ||
      typeof a.name !== "string" ||
      !a.name.trim() ||
      a.name.length > 180 ||
      !Object.values(attachmentTypes).includes(a.type) ||
      !Number.isInteger(a.size) ||
      a.size < 1 ||
      a.size > attachmentLimit ||
      typeof a.source !== "string"
    )
      throw Error(
        "Comprobante inválido: PDF, JPG, PNG, WebP, TXT o DOCX, hasta 10 MB por archivo.",
      );
    ids.add(a.id);
    if (allowReferences && a.source.startsWith("idb-photo:")) continue;
    const prefix = `data:${a.type};base64,`;
    if (
      !a.source.startsWith(prefix) ||
      !/^[-A-Za-z0-9+/=]+$/.test(a.source.slice(prefix.length))
    )
      throw Error("El comprobante no contiene un archivo local válido.");
    if (
      a.source.length - prefix.length >
      Math.ceil(attachmentLimit / 3) * 4 + 4
    )
      throw Error("El comprobante supera 10 MB.");
    const raw = atob(a.source.slice(prefix.length));
    if (raw.length !== a.size)
      throw Error("El tamaño del comprobante no coincide.");
    if (
      (a.type === "application/pdf" && !raw.startsWith("%PDF-")) ||
      (a.type === "image/jpeg" && !raw.startsWith("\xff\xd8\xff")) ||
      (a.type === "image/png" && !raw.startsWith("\x89PNG\r\n\x1a\n")) ||
      (a.type === "image/webp" &&
        !(raw.startsWith("RIFF") && raw.slice(8, 12) === "WEBP")) ||
      (a.type === attachmentTypes.docx && !raw.startsWith("PK\x03\x04"))
    )
      throw Error("El contenido del comprobante no coincide con su tipo.");
  }
}
export function validateLife(
  deceased: unknown,
  deathDate: unknown,
  birth?: string,
) {
  if (deceased !== undefined && typeof deceased !== "boolean")
    throw Error("Revisa el estado vital.");
  if (deathDate !== undefined && typeof deathDate !== "string")
    throw Error("Revisa la fecha de fallecimiento.");
  if (deathDate) {
    const d = String(deathDate);
    if (
      !deceased ||
      !/^(?!0000)\d{4}-\d{2}-\d{2}$/.test(d) ||
      Number.isNaN(Date.parse(d)) ||
      new Date(d).toISOString().slice(0, 10) !== d ||
      d >
        new Date().toLocaleDateString("en-CA", {
          timeZone: "America/Caracas",
        }) ||
      (birth && d < birth)
    )
      throw Error(
        "El fallecimiento debe ser una fecha válida entre el nacimiento y hoy. La fecha es opcional.",
      );
  }
}
