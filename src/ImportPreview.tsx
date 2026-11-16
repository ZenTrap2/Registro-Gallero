import { useMemo, useState } from "react";
import type { Database } from "./data";
import type { ImportData } from "./transfer";
import { SelectionToolbar } from "./SelectionToolbar";
import { PagedList } from "./Pagination";
export function ImportPreview({
  preview,
  db,
  selected,
  change,
  mode,
  setMode,
  confirm,
  cancel,
  busy,
}: {
  preview: ImportData;
  db: Database;
  selected: ReadonlySet<string>;
  change: (next: Set<string>) => void;
  mode: string;
  setMode: (mode: string) => void;
  confirm: () => void;
  cancel: () => void;
  busy: boolean;
}) {
  const [query, setQuery] = useState("");
  const codes = useMemo(
      () => new Set(db.birds.map((b) => b.code.toLowerCase())),
      [db.birds],
    ),
    records = useMemo(
      () =>
        preview.birds.filter((b) =>
          (b.name + " " + b.code + " " + b.breed)
            .toLowerCase()
            .includes(query.toLowerCase().trim()),
        ),
      [preview.birds, query],
    );
  const duplicates = useMemo(
    () =>
      preview.birds.reduce(
        (n, b) => n + (codes.has(b.code.toLowerCase()) ? 1 : 0),
        0,
      ),
    [preview.birds, codes],
  );
  return (
    <div className="import-preview">
      <h3>Vista previa de importación</h3>
      <p>
        <strong>{preview.birds.length}</strong> registros válidos ·{" "}
        <strong>{preview.events.length}</strong> eventos ·{" "}
        <strong>{preview.farms.length}</strong> criaderos ·{" "}
        <strong>{preview.errors.length}</strong> errores
      </p>
      <p>
        {duplicates} códigos ya existen en tu criadero. Se incorporarán
        únicamente los registros seleccionados.
      </p>
      {preview.errors.length > 0 && (
        <details>
          <summary>Revisar errores ({preview.errors.length})</summary>
          <ul className="validation-list">
            {preview.errors.slice(0, 100).map((message, i) => (
              <li key={i}>{message}</li>
            ))}
          </ul>
          {preview.errors.length > 100 && (
            <p className="help">
              Se muestran los primeros 100 errores de {preview.errors.length}.
            </p>
          )}
        </details>
      )}
      <label>
        Buscar en el archivo
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Nombre, código o raza"
          disabled={busy}
        />
      </label>
      <SelectionToolbar
        records={records}
        selected={selected}
        change={change}
        disabled={busy}
      />
      <PagedList items={records} label="Importación">
        {(page) => (
          <div className="import-records">
            {page.map((b) => (
              <label className="import-record" key={b.id}>
                <input
                  type="checkbox"
                  checked={selected.has(b.id)}
                  disabled={busy}
                  aria-label={`Seleccionar ${b.name} para importar`}
                  onChange={(e) => {
                    const next = new Set(selected);
                    if (e.target.checked) next.add(b.id);
                    else next.delete(b.id);
                    change(next);
                  }}
                />
                <span>
                  <strong>{b.name}</strong>
                  <small>
                    {b.code} · {b.breed || "Sin raza registrada"}
                  </small>
                </span>
                {codes.has(b.code.toLowerCase()) && (
                  <span className="badge sand">Código existente</span>
                )}
              </label>
            ))}
          </div>
        )}
      </PagedList>
      <label>
        Códigos duplicados
        <select
          value={mode}
          disabled={busy}
          onChange={(e) => setMode(e.target.value)}
        >
          <option value="skip">Omitir los registros duplicados</option>
          <option value="update">Actualizar los registros existentes</option>
        </select>
      </label>
      <p className="help">
        Los registros con errores se omiten. Actualizar reemplaza la ficha y sus
        fotos con las del archivo, así como los criaderos vinculados del mismo
        nombre. Los progenitores no seleccionados solo se enlazan si ya existen
        en destino con el mismo código; no se agregan animales adicionales.
      </p>
      <div className="modal-actions">
        <button className="btn" disabled={busy} onClick={cancel}>
          Cancelar importación
        </button>
        <button
          className="btn primary"
          disabled={
            busy ||
            (!selected.size &&
              ((!preview.farms.length && !preview.events.length) ||
                preview.birds.length > 0))
          }
          onClick={confirm}
        >
          Confirmar importación
        </button>
      </div>
    </div>
  );
}
