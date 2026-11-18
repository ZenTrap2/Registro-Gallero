import { AncestryTree } from "./AncestryTree";
import { Attachments } from "./Attachments";
import { useMemo, useState } from "react";
import type { Bird } from "./data";
import {
  ancestorAt,
  ancestorPaths,
  ancestorLabel,
  generationNames,
  type AncestorEntry,
} from "./ancestry";
export function AncestryFields({
  bird,
  birds,
  change,
  details,
}: {
  bird: Bird;
  birds: Bird[];
  change: (bird: Bird) => void;
  details: (path: string, entry: AncestorEntry) => void;
}) {
  const byId = useMemo(() => new Map(birds.map((b) => [b.id, b])), [birds]);
  const entries = useMemo(
    () =>
      new Map(
        generationNames
          .flatMap((_, index) => ancestorPaths(index + 1))
          .map((path) => [path, ancestorAt(bird, path, byId)]),
      ),
    [bird, byId],
  );
  const [selectedPath, setSelectedPath] = useState("f");
  const [choosing, setChoosing] = useState(""),
    [query, setQuery] = useState(""),
    [pending, setPending] = useState<{
      path: string;
      entry: AncestorEntry;
    } | null>(null);
  const update = (path: string, entry: AncestorEntry, clearBranch = false) => {
    const ancestry = { ...bird.ancestry };
    // A different progenitor must not inherit the manually entered branch of the previous one.
    for (const key of Object.keys(ancestry))
      if (clearBranch && key.startsWith(path) && key !== path)
        delete ancestry[key];
    ancestry[path] = entry;
    change({
      ...bird,
      ancestry,
      ...(path === "f"
        ? { father: entry.birdId || "" }
        : path === "m"
          ? { mother: entry.birdId || "" }
          : {}),
    });
  };
  return (
    <section className="ancestry-editor">
      {pending && (
        <div role="alert" className="bulk-decisions">
          <p>
            Cambiar este ancestro sustituirá los nombres manuales de su rama por
            el linaje del registro elegido. Revisa antes de continuar.
          </p>
          <button
            type="button"
            className="btn"
            onClick={() => setPending(null)}
          >
            Conservar rama actual
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => {
              update(pending.path, pending.entry, true);
              setPending(null);
            }}
          >
            Confirmar cambio de rama
          </button>
        </div>
      )}
      <p className="help">
        Selecciona un ancestro para editarlo o vincularlo al registro. Los
        cambios se guardan con la ficha.
      </p>
      <AncestryTree
        name={bird.name}
        selectedPath={selectedPath}
        entries={entries}
        select={(path) => {
          setSelectedPath(path);
          setChoosing("");
        }}
      />
      <div className="ancestor-fields ancestor-selected">
        {[selectedPath].map((path) => {
          const info = entries.get(path),
            own = bird.ancestry?.[path],
            inherited = info?.birdId ? true : !!info && info !== own;
          return (
            <div className="ancestor-field" key={path}>
              <label>
                {ancestorLabel(path)}
                <input
                  maxLength={150}
                  value={info?.name || ""}
                  readOnly={inherited}
                  placeholder="Sin datos registrados"
                  onChange={(e) =>
                    update(path, {
                      ...own,
                      name: e.target.value,
                      details: own?.details
                        ? { ...own.details, name: e.target.value }
                        : undefined,
                    })
                  }
                />
              </label>
              {inherited && (
                <small className="field-help">
                  {info?.birdId
                    ? "Vinculado al registro"
                    : "Heredado del progenitor registrado"}
                  . Se actualiza con su ficha.
                </small>
              )}
              {!inherited && (
                <div className="ancestor-life">
                  <label className="checkbox">
                    <input
                      type="checkbox"
                      checked={info?.deceased === true}
                      onChange={(e) =>
                        change({
                          ...bird,
                          ancestry: {
                            ...bird.ancestry,
                            [path]: {
                              ...own,
                              name: info?.name || "",
                              deceased: e.target.checked,
                              deathDate: e.target.checked ? own?.deathDate : "",
                              ...(own?.details
                                ? {
                                    details: {
                                      ...own.details,
                                      deceased: e.target.checked,
                                      deathDate: e.target.checked
                                        ? own.deathDate
                                        : "",
                                    },
                                  }
                                : {}),
                            },
                          },
                        })
                      }
                    />
                    Fallecido (opcional)
                  </label>
                  {info?.deceased && (
                    <label>
                      Fallecimiento de {ancestorLabel(path).toLowerCase()}{" "}
                      (opcional)
                      <input
                        type="date"
                        max={new Date().toLocaleDateString("en-CA", {
                          timeZone: "America/Caracas",
                        })}
                        min={info.details?.birth || undefined}
                        value={info.deathDate || ""}
                        onChange={(e) =>
                          change({
                            ...bird,
                            ancestry: {
                              ...bird.ancestry,
                              [path]: {
                                ...own,
                                name: info.name,
                                deathDate: e.target.value,
                                ...(own?.details
                                  ? {
                                      details: {
                                        ...own.details,
                                        deathDate: e.target.value,
                                      },
                                    }
                                  : {}),
                              },
                            },
                          })
                        }
                      />
                    </label>
                  )}
                </div>
              )}
              <div className="ancestor-actions">
                {!inherited && (
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => details(path, info || { name: "" })}
                  >
                    {info?.details ? "Editar detalles" : "Añadir detalles"}
                  </button>
                )}
                {(!inherited || own?.birdId || path.length === 1) && (
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => {
                      setChoosing(choosing === path ? "" : path);
                      setQuery("");
                    }}
                  >
                    Añadir desde el registro
                  </button>
                )}
                {(info?.name || info?.birdId) &&
                  !(!own && inherited && path.length > 1) && (
                    <button
                      type="button"
                      className="text-button"
                      onClick={() => update(path, { name: "" })}
                    >
                      Desvincular / limpiar
                    </button>
                  )}
              </div>
              {choosing === path && (
                <div className="ancestor-picker">
                  <label>
                    Buscar registro para {ancestorLabel(path).toLowerCase()}
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Nombre o placa/código"
                    />
                  </label>
                  <div role="list" aria-label="Coincidencias de ancestros">
                    {birds
                      .filter(
                        (b) =>
                          b.id !== bird.id &&
                          (b.name + " " + b.code)
                            .toLocaleLowerCase("es")
                            .includes(query.trim().toLocaleLowerCase("es")),
                      )
                      .slice(0, 30)
                      .map((b) => (
                        <div role="listitem" key={b.id}>
                          <button
                            type="button"
                            className="ancestor-option"
                            onClick={() => {
                              const entry = { name: b.name, birdId: b.id };
                              if (
                                Object.entries(bird.ancestry || {}).some(
                                  ([key, a]) =>
                                    key.startsWith(path) &&
                                    key !== path &&
                                    (a.name || a.birdId),
                                )
                              )
                                setPending({ path, entry });
                              else update(path, entry, true);
                              setChoosing("");
                            }}
                          >
                            {b.name} · {b.code}
                            <small>{b.id}</small>
                          </button>
                        </div>
                      ))}
                  </div>
                  <p className="help">
                    Se muestran hasta 30 resultados. Escribe para acotar la
                    búsqueda.
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
export function Pedigree({
  bird,
  birds,
  open,
}: {
  bird: Bird;
  birds: Bird[];
  open?: (id: string) => void;
}) {
  const byId = useMemo(() => new Map(birds.map((b) => [b.id, b])), [birds]);
  return (
    <div className="pedigree">
      {generationNames.map((name, i) => (
        <details key={name} open={i < 2}>
          <summary>{name}</summary>
          <div className="pedigree-grid">
            {ancestorPaths(i + 1).map((path) => {
              const a = ancestorAt(bird, path, byId);
              return (
                <div className="pedigree-cell" key={path}>
                  <small>{ancestorLabel(path)}</small>
                  {a?.birdId && byId.has(a.birdId) && open ? (
                    <button
                      className="text-button"
                      onClick={() => open(a.birdId!)}
                    >
                      {a.name}
                    </button>
                  ) : (
                    <strong>{a?.name || "Sin datos registrados"}</strong>
                  )}
                  {a?.details?.code && <span>{a.details.code}</span>}
                  {!!a?.details?.attachments?.length && (
                    <details>
                      <summary>
                        Comprobantes ({a.details.attachments.length})
                      </summary>
                      <Attachments items={a.details.attachments} readOnly />
                    </details>
                  )}
                  {a?.deceased && (
                    <small>
                      Fallecido{a.deathDate ? ` · ${a.deathDate}` : ""}
                    </small>
                  )}
                </div>
              );
            })}
          </div>
        </details>
      ))}
    </div>
  );
}
