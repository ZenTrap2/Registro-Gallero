import { useEffect, useMemo, useState } from "react";
import { Download } from "lucide-react";
import { Modal } from "./Modal";
import { type Bird, type Database } from "./data";
import { subsetData, type TransferData } from "./transfer";
export type ExportScope = "all" | "selected" | "filtered";
export function ExportDialog({
  db,
  allBirds,
  filtered,
  selected,
  initialScope,
  close,
  run,
  busy,
}: {
  db: Database;
  allBirds: Bird[];
  filtered: Bird[];
  selected: ReadonlySet<string>;
  initialScope: ExportScope;
  close: () => void;
  run: (
    format: "json" | "csv" | "pdf",
    data: TransferData,
    includePhotos: boolean,
    includeAncestorDetails?: boolean,
  ) => Promise<void>;
  busy: boolean;
}) {
  const [ancestorDetails, setAncestorDetails] = useState(false);
  const [scope, setScope] = useState(initialScope),
    [limit, setLimit] = useState(""),
    [photos, setPhotos] = useState(
      (initialScope === "selected"
        ? selected.size
        : initialScope === "filtered"
          ? filtered.length
          : db.birds.length) <= 100,
    );
  const candidates = useMemo(
    () =>
      scope === "selected"
        ? allBirds.filter((b) => selected.has(b.id))
        : scope === "filtered"
          ? filtered
          : allBirds,
    [scope, allBirds, filtered, selected],
  );
  useEffect(() => setLimit(String(candidates.length)), [candidates]);
  const n = Number(limit),
    valid =
      Number.isInteger(n) &&
      n >= 0 &&
      n <= candidates.length &&
      (n > 0 || (!db.birds.length && scope === "all")),
    data = useMemo(
      () =>
        subsetData(
          db,
          new Set(candidates.slice(0, Math.max(0, n)).map((b) => b.id)),
        ),
      [db, candidates, n],
    );
  return (
    <Modal title="Exportar tus datos" close={close} busy={busy}>
      <p>Elige el alcance y la cantidad exacta antes de preparar el archivo.</p>
      <div className="form-grid">
        <label>
          Registros a exportar
          <select
            value={scope}
            disabled={busy}
            onChange={(e) => setScope(e.target.value as ExportScope)}
          >
            <option value="all">Todos los gallos ({allBirds.length})</option>
            <option value="selected" disabled={!selected.size}>
              Seleccionados ({selected.size})
            </option>
            <option value="filtered">
              Resultados del filtro ({filtered.length})
            </option>
          </select>
        </label>
        <label>
          Cantidad a exportar
          <input
            type="number"
            min={candidates.length ? 1 : 0}
            max={candidates.length}
            step={1}
            disabled={busy}
            value={limit}
            onChange={(e) => setLimit(e.target.value)}
          />
        </label>
      </div>
      <p className={valid ? "export-count" : "form-error"} role="status">
        {valid
          ? `Exportarás ${n} gallos.`
          : `Elige una cantidad válida entre ${candidates.length ? 1 : 0} y ${candidates.length}.`}
      </p>
      <p className="help">
        Al reducir la cantidad se toman los primeros registros del alcance
        elegido, en el orden mostrado. Para elegir animales concretos usa las
        casillas de Mis gallos. Las exportaciones parciales incluyen sus eventos
        y criaderos vinculados; los progenitores omitidos quedan como
        referencias por código.
      </p>
      <button
        className="export-option"
        disabled={busy || !valid}
        onClick={() => run("json", data, true)}
      >
        <Download />
        <span>
          <strong>Exportar JSON</strong>
          <small>
            Incluye fotografías originales y registros de salud. La copia
            completa conserva también los eventos generales y la configuración.
          </small>
        </span>
      </button>
      <button
        className="export-option"
        disabled={busy || !valid}
        onClick={() => run("csv", data, false)}
      >
        <Download />
        <span>
          <strong>Exportar CSV</strong>
          <small>
            Datos de texto y vínculos por código. No incluye archivos de imagen
            ni eventos.
          </small>
        </span>
      </button>
      <label className="checkbox">
        <input
          type="checkbox"
          checked={photos}
          disabled={busy}
          onChange={(e) => setPhotos(e.target.checked)}
        />
        Incluir fotografías en el PDF
      </label>
      <label className="checkbox">
        <input
          type="checkbox"
          checked={ancestorDetails}
          disabled={busy}
          onChange={(e) => setAncestorDetails(e.target.checked)}
        />
        Incluir detalles de los ancestros en el PDF
      </label>
      <p className="help">
        Los nombres del linaje se incluyen siempre. Los detalles adicionales de
        padres y ancestros se omiten salvo que actives esta opción.
      </p>
      {candidates.length > 100 && (
        <p className="help">
          Para lotes grandes se propone un PDF sin fotografías para reducir
          memoria y tamaño. JSON conserva las fotos independientemente de esta
          opción.
        </p>
      )}
      <button
        className="export-option"
        disabled={busy || !valid || !n}
        onClick={() => run("pdf", data, photos, ancestorDetails)}
      >
        <Download />
        <span>
          <strong>Exportar PDF</strong>
          <small>
            Fichas individuales de los {valid ? n : 0} gallos elegidos.
          </small>
        </span>
      </button>
    </Modal>
  );
}
