import { useState } from "react";
import type { Bird } from "./data";
export function SelectionToolbar({
  records,
  selected,
  change,
  disabled = false,
  children,
}: {
  records: Bird[];
  selected: ReadonlySet<string>;
  change: (next: Set<string>) => void;
  disabled?: boolean;
  children?: React.ReactNode;
}) {
  const [quantity, setQuantity] = useState("100"),
    [error, setError] = useState("");
  const visible = new Set(records.map((b) => b.id)),
    hidden = [...selected].filter((id) => !visible.has(id)).length;
  return (
    <section className="selection-toolbar" aria-label="Selección de registros">
      <div className="selection-summary">
        <strong>{selected.size} seleccionados</strong>
        {hidden > 0 && <span>{hidden} fuera de este filtro</span>}
        <button
          className="text-button"
          disabled={disabled || !selected.size}
          onClick={() => change(new Set())}
        >
          Vaciar selección
        </button>
      </div>
      <div className="selection-actions">
        <button
          className="btn"
          disabled={disabled || !records.length}
          onClick={() =>
            change(new Set([...selected, ...records.map((b) => b.id)]))
          }
        >
          Seleccionar resultados ({records.length})
        </button>
        <label>
          Cantidad a seleccionar
          <input
            type="number"
            min={1}
            max={records.length || 1}
            step={1}
            value={quantity}
            disabled={disabled}
            onChange={(e) => setQuantity(e.target.value)}
          />
        </label>
        <button
          className="btn"
          disabled={disabled || !records.length}
          onClick={() => {
            const n = Number(quantity);
            if (!Number.isInteger(n) || n < 1 || n > records.length) {
              setError(`Elige un entero entre 1 y ${records.length}.`);
              return;
            }
            setError("");
            change(new Set(records.slice(0, n).map((b) => b.id)));
          }}
        >
          Seleccionar cantidad
        </button>
        {children}
      </div>
      <p className="help">
        «Seleccionar cantidad» reemplaza la selección por los primeros registros
        del resultado, en el orden mostrado. La selección se conserva al cambiar
        de página o filtrar.
      </p>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
