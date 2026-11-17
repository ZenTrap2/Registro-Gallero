import { useState } from "react";
import type { Bird, Database } from "./data";
import { useSettings } from "./SettingsContext";
import { getSettings, applySettings } from "./settings";
import { fieldTypes, type CustomField } from "./custom-fields";
import { Modal } from "./Modal";
export function CustomFieldInputs({
  bird,
  change,
}: {
  bird: Bird;
  change: (values: Record<string, string>) => void;
}) {
  const fields = useSettings().customFields || [];
  return (
    <>
      {fields
        .filter((f) => f.active !== false)
        .map((f) => (
          <label key={f.id}>
            {f.label} (opcional)
            {f.type === "choice" ? (
              <select
                value={bird.customValues?.[f.id] || ""}
                onChange={(e) =>
                  change({ ...bird.customValues, [f.id]: e.target.value })
                }
              >
                <option value="">Sin datos registrados</option>
                {f.options.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            ) : (
              <input
                maxLength={2000}
                type={
                  f.type === "date"
                    ? "date"
                    : f.type === "integer" || f.type === "number"
                      ? "number"
                      : "text"
                }
                step={f.type === "integer" ? 1 : "any"}
                value={bird.customValues?.[f.id] || ""}
                onChange={(e) =>
                  change({ ...bird.customValues, [f.id]: e.target.value })
                }
              />
            )}
          </label>
        ))}
    </>
  );
}
export function CustomCategories({
  db,
  save,
  busy,
}: {
  db: Database;
  save: (d: Database, m: string) => Promise<boolean>;
  busy: boolean;
}) {
  const [fields, setFields] = useState<CustomField[]>(() =>
      structuredClone(db.settings?.customFields || []),
    ),
    [error, setError] = useState(""),
    [pending, setPending] = useState<Database | null>(null);
  const original = new Set((db.settings?.customFields || []).map((f) => f.id));
  const update = (id: string, patch: Partial<CustomField>) =>
    setFields(fields.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  return (
    <section className="panel catalog-editor">
      <h2>Categorías adicionales del registro</h2>
      <p>
        Crea campos opcionales de texto, número, fecha o lista. Una vez
        guardado, su tipo se mantiene fijo. Retirar una categoría la oculta sin
        borrar los datos; puedes restaurarla.
      </p>
      <div className="catalog-grid">
        {fields.map((f) => (
          <fieldset key={f.id}>
            <legend>
              {f.label || "Nueva categoría"}
              {f.active === false ? " · Retirada" : ""}
            </legend>
            <label>
              Nombre de la categoría adicional
              <input
                maxLength={60}
                value={f.label}
                disabled={busy}
                onChange={(e) => update(f.id, { label: e.target.value })}
              />
            </label>
            <label>
              Tipo de dato
              <select
                value={f.type}
                disabled={busy || original.has(f.id)}
                onChange={(e) =>
                  update(f.id, { type: e.target.value as CustomField["type"] })
                }
              >
                {Object.entries(fieldTypes).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            {f.type === "choice" && (
              <label>
                Opciones (una por línea)
                <textarea
                  rows={4}
                  value={f.options.join("\n")}
                  disabled={busy}
                  onChange={(e) =>
                    update(f.id, { options: e.target.value.split("\n") })
                  }
                />
              </label>
            )}
            <button
              type="button"
              className="btn"
              disabled={busy}
              onClick={() =>
                original.has(f.id)
                  ? update(f.id, { active: f.active === false })
                  : setFields(fields.filter((x) => x.id !== f.id))
              }
            >
              {f.active === false ? "Restaurar categoría" : "Retirar categoría"}
            </button>
          </fieldset>
        ))}
      </div>
      <button
        type="button"
        className="btn"
        disabled={busy || fields.length >= 100}
        onClick={() =>
          setFields([
            ...fields,
            {
              id: crypto.randomUUID(),
              label: "",
              type: "text",
              options: [],
              active: true,
            },
          ])
        }
      >
        Añadir categoría de registro
      </button>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <div className="modal-actions">
        <button
          type="button"
          className="btn"
          disabled={busy}
          onClick={() => {
            setFields(structuredClone(db.settings?.customFields || []));
            setError("");
          }}
        >
          Descartar categorías adicionales
        </button>
        <button
          className="btn primary"
          disabled={busy}
          onClick={() => {
            try {
              setError("");
              const clean = fields.map((f) => ({
                ...f,
                label: f.label.trim(),
                options: f.options.map((o) => o.trim()).filter(Boolean),
              }));
              setPending(
                applySettings(
                  db,
                  { ...getSettings(db), customFields: clean },
                  {},
                ),
              );
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        >
          Revisar categorías adicionales
        </button>
      </div>
      {pending && (
        <Modal
          title="¿Guardar categorías adicionales?"
          close={() => setPending(null)}
          busy={busy}
        >
          <p>
            Las categorías nuevas aparecerán en el registro, las fichas y las
            exportaciones. Retirar una categoría conserva sus valores y su
            definición para poder recuperarlos.
          </p>
          <div className="modal-actions">
            <button
              className="btn"
              disabled={busy}
              onClick={() => setPending(null)}
            >
              Cancelar
            </button>
            <button
              className="btn primary"
              disabled={busy}
              onClick={async () => {
                if (
                  await save(pending, "Categorías adicionales actualizadas.")
                ) {
                  setFields(
                    structuredClone(pending.settings?.customFields || []),
                  );
                  setPending(null);
                }
              }}
            >
              Guardar categorías
            </button>
          </div>
        </Modal>
      )}
    </section>
  );
}
