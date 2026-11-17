import { duplicateIndex, type ImportDecisions } from "./import-duplicates";
import { DuplicateChoice } from "./DuplicateChoice";
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
  decisions,
  setDecisions,
  confirm,
  cancel,
  busy,
}: {
  preview: ImportData;
  db: Database;
  selected: ReadonlySet<string>;
  change: (next: Set<string>) => void;
  decisions: ImportDecisions;
  setDecisions: (decisions: ImportDecisions) => void;
  confirm: () => void;
  cancel: () => void;
  busy: boolean;
}) {
  const [query, setQuery] = useState("");
  const incoming = useMemo(
    () => preview.birds.filter((b) => selected.has(b.id)),
    [preview.birds, selected],
  );
  const index = useMemo(
    () => duplicateIndex(db.birds, incoming),
    [db.birds, incoming],
  );
  const conflicts = useMemo(
    () => incoming.filter((b) => index.has(b)),
    [index, incoming],
  );
  const pending = conflicts.filter(
    (b) =>
      !decisions[b.id] ||
      (decisions[b.id].action === "replace" &&
        !index.matches(b).some((m) => m.key === decisions[b.id].target)),
  ).length;
  const records = useMemo(
    () =>
      preview.birds.filter((b) =>
        (b.name + " " + b.code + " " + b.breed)
          .toLowerCase()
          .includes(query.toLowerCase().trim()),
      ),
    [preview.birds, query],
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
        {conflicts.length} posibles duplicados por nombre, placa/código o
        identificador, incluidos los del propio archivo. {pending} pendientes de
        decisión. Se incorporarán únicamente los registros seleccionados.
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
              <div className="import-record" key={b.id}>
                <label className="import-row-selection">
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
                </label>
                {selected.has(b.id) && index.has(b) && (
                  <DuplicateChoice
                    bird={b}
                    matches={index.matches(b)}
                    value={decisions[b.id]}
                    busy={busy}
                    change={(decision) =>
                      setDecisions({ ...decisions, [b.id]: decision })
                    }
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </PagedList>
      {conflicts.length > 0 && (
        <div className="bulk-decisions">
          <h4>Resolver las coincidencias seleccionadas</h4>
          <p>
            Aplica una decisión al lote y ajusta los casos particulares antes de
            confirmar. Nunca se reemplazan dos filas sobre el mismo animal.
          </p>
          {(["skip", "keep", "replace"] as const).map((action) => (
            <button
              key={action}
              type="button"
              className="btn"
              disabled={busy}
              onClick={() => {
                const next = { ...decisions };
                for (const b of conflicts) {
                  const matches = index.matches(b);
                  if (action === "replace" && matches.length !== 1) continue;
                  next[b.id] = {
                    action,
                    target: matches.length === 1 ? matches[0].key : undefined,
                  };
                }
                setDecisions(next);
              }}
            >
              {action === "skip"
                ? "Omitir coincidencias"
                : action === "keep"
                  ? "Conservar todos como distintos"
                  : "Reemplazar coincidencias únicas"}
            </button>
          ))}
          <p className="help">
            Si varias filas reemplazan el mismo destino, la confirmación te
            pedirá corregirlo. «Conservar todos» permite nombres y placas
            repetidos sin sobrescribir registros.
          </p>
        </div>
      )}
      <p className="help">
        Los registros con errores se omiten. Reemplazar conserva el ID del
        destino y cambia su ficha y fotos por las del archivo; conserva su
        historial y actualiza los eventos importados del mismo ID. Padres y
        fecha de nacimiento no generan coincidencias por sí solos. Los
        progenitores no seleccionados solo se enlazan si ya existen en destino
        con el mismo código; no se agregan animales adicionales.
      </p>
      <div className="modal-actions">
        <button className="btn" disabled={busy} onClick={cancel}>
          Cancelar importación
        </button>
        <button
          className="btn primary"
          disabled={
            busy ||
            pending > 0 ||
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
