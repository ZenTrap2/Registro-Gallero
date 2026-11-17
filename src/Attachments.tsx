import { useState } from "react";
import { Paperclip, Download, Trash2 } from "lucide-react";
import {
  type Attachment,
  attachmentTypes,
  attachmentLimit,
  validateAttachments,
} from "./attachment-data";
import { getPhoto, isPhotoReference } from "./storage";
import { saveFile, fileSuccess } from "./files";
export function Attachments({
  items = [],
  change,
  readOnly = false,
  onBusyChange,
}: {
  items?: Attachment[];
  change?: (items: Attachment[]) => void;
  readOnly?: boolean;
  onBusyChange?: (busy: boolean) => void;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  async function add(files: FileList | null) {
    if (!files || busy) return;
    setBusy(true);
    onBusyChange?.(true);
    setError("");
    const next = [...items],
      errors: string[] = [];
    for (const file of Array.from(files)) {
      try {
        if (next.length >= 8) throw Error("Máximo 8 comprobantes.");
        const ext = file.name.split(".").pop()?.toLowerCase() || "",
          type = attachmentTypes[ext];
        if (!type || file.size > attachmentLimit || !file.size)
          throw Error("Usa PDF, JPG, PNG, WebP, TXT o DOCX de hasta 10 MB.");
        const source = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () =>
            resolve(
              `data:${type};base64,${String(reader.result).split(",")[1]}`,
            );
          reader.onerror = () => reject(Error("No se pudo leer el archivo."));
          reader.readAsDataURL(file);
        });
        const item = {
          id: crypto.randomUUID(),
          name: file.name.slice(0, 180),
          type,
          size: file.size,
          source,
        };
        validateAttachments([item]);
        next.push(item);
      } catch (e) {
        errors.push(file.name + ": " + (e as Error).message);
      }
    }
    change?.(next);
    setError(errors.join(" "));
    setBusy(false);
    onBusyChange?.(false);
    if (next.length > items.length)
      setNotice(
        "Comprobantes preparados. Guarda el registro para conservarlos.",
      );
  }
  async function download(item: Attachment) {
    setBusy(true);
    onBusyChange?.(true);
    setError("");
    try {
      const blob = isPhotoReference(item.source)
        ? await getPhoto(item.source)
        : await (await fetch(item.source)).blob();
      const result = await saveFile(
        item.name.replace(/[\\/]/g, "_"),
        new Blob([blob], { type: item.type }),
      );
      setNotice(fileSuccess(result));
    } catch (e) {
      setError("No se pudo abrir el comprobante: " + (e as Error).message);
    } finally {
      setBusy(false);
      onBusyChange?.(false);
    }
  }
  return (
    <section className="attachments">
      <h3>
        <Paperclip size={17} />
        Comprobantes de ascendencia (opcional)
      </h3>
      {!readOnly && (
        <label
          className="drop-zone"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            void add(e.dataTransfer.files);
          }}
        >
          <strong>Adjuntar pedigrí o comprobante</strong>
          <span>PDF, JPG, PNG, WebP, TXT o DOCX · Hasta 10 MB · Máximo 8</span>
          <input
            aria-label="Adjuntar comprobantes de ascendencia"
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png,.webp,.txt,.docx"
            disabled={busy}
            onChange={(e) => {
              void add(e.target.files);
              e.target.value = "";
            }}
          />
        </label>
      )}
      {items.length ? (
        <ul className="attachment-list">
          {items.map((item) => (
            <li key={item.id}>
              <span>
                <strong>{item.name}</strong>
                <small>
                  {(item.size / 1024).toLocaleString("es", {
                    maximumFractionDigits: 0,
                  })}{" "}
                  KB
                </small>
              </span>
              <button
                type="button"
                className="btn"
                disabled={busy}
                onClick={() => void download(item)}
                aria-label={`Descargar comprobante ${item.name}`}
              >
                <Download size={16} />
                <span>Descargar</span>
              </button>
              {!readOnly && (
                <button
                  type="button"
                  className="icon-btn danger"
                  disabled={busy}
                  onClick={() =>
                    change?.(items.filter((a) => a.id !== item.id))
                  }
                  aria-label={`Quitar comprobante ${item.name}`}
                >
                  <Trash2 size={17} />
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="help">Sin comprobantes adjuntos.</p>
      )}
      {busy && <p role="status">Procesando comprobantes…</p>}
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="help">
          {notice}
        </p>
      )}
    </section>
  );
}
