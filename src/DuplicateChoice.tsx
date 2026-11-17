import { useMemo, useState } from "react";
import { type Bird } from "./data";
import {
  identityText,
  type Match,
  type ImportDecision,
} from "./import-duplicates";
const fmt = (v: string) => v || "Sin datos registrados";
export function DuplicateChoice({
  bird,
  matches,
  value,
  change,
  busy,
}: {
  bird: Bird;
  matches: Match[];
  value?: ImportDecision;
  change: (value: ImportDecision) => void;
  busy: boolean;
}) {
  const [query, setQuery] = useState("");
  const shown = useMemo(
    () =>
      matches
        .filter((m) =>
          identityText(
            m.bird.name + " " + m.bird.code + " " + m.bird.id,
          ).includes(identityText(query)),
        )
        .slice(0, 50),
    [matches, query],
  );
  const target = matches.find((m) => m.key === value?.target);
  return (
    <div className="duplicate-choice">
      <span className="badge sand">
        Posible duplicado · {matches.length} coincidencias
      </span>
      <label>
        Decisión para {bird.name}
        <select
          value={value?.action || ""}
          disabled={busy}
          onChange={(e) =>
            change({
              action: e.target.value as ImportDecision["action"],
              target: matches.length === 1 ? matches[0].key : undefined,
            })
          }
        >
          <option value="" disabled>
            Revisar y elegir…
          </option>
          <option value="skip">Omitir este registro</option>
          <option value="replace">Reemplazar un registro</option>
          <option value="keep">Conservar ambos como distintos</option>
        </select>
      </label>
      {value?.action === "replace" && (
        <>
          <label>
            Buscar coincidencia para {bird.name}
            <input
              value={query}
              disabled={busy}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Nombre, placa/código o ID"
            />
          </label>
          <label>
            Registro a reemplazar por {bird.name}
            <select
              disabled={busy}
              value={value.target || ""}
              onChange={(e) => change({ ...value, target: e.target.value })}
            >
              <option value="">Elige cuál es el mismo gallo</option>
              {target && !shown.some((m) => m.key === target.key) && (
                <option value={target.key}>
                  {target.bird.name} · {target.bird.code} · {target.bird.id}
                </option>
              )}
              {shown.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.bird.name} · {m.bird.code} ·{" "}
                  {m.source === "db" ? "Guardado" : "Fila anterior del archivo"}{" "}
                  · {m.bird.id}
                </option>
              ))}
            </select>
          </label>
          {matches.length > 50 && (
            <p className="help">
              Se muestran hasta 50 coincidencias. Busca para localizar otra.
            </p>
          )}
          {target && (
            <dl className="duplicate-comparison">
              <div>
                <dt>Guardado / fila anterior</dt>
                <dd>
                  {target.bird.name} · {target.bird.code}
                  <br />
                  Nacimiento: {fmt(target.bird.birth)} · Raza:{" "}
                  {target.bird.breed || "Sin datos registrados"}
                  <br />
                  Marca: {target.bird.mark || "Sin datos registrados"} · Peso:{" "}
                  {target.bird.weightKg || "Sin datos registrados"}
                </dd>
              </div>
              <div>
                <dt>Entrante</dt>
                <dd>
                  {bird.name} · {bird.code}
                  <br />
                  Nacimiento: {fmt(bird.birth)} · Raza:{" "}
                  {bird.breed || "Sin datos registrados"}
                  <br />
                  Marca: {bird.mark || "Sin datos registrados"} · Peso:{" "}
                  {bird.weightKg || "Sin datos registrados"}
                </dd>
              </div>
            </dl>
          )}
        </>
      )}
      {value?.action === "keep" && (
        <p className="help">
          Se conservan los mismos datos visibles con un identificador interno
          nuevo. Sus fotos, eventos y parentescos se guardan por separado.
        </p>
      )}
    </div>
  );
}
