import { useEffect, useMemo, useRef } from "react";
import { Bird as BirdIcon, ChevronRight, Pencil } from "lucide-react";
import type { Bird, Farm } from "./data";
import { useSettings } from "./SettingsContext";
import { usePhoneLayout } from "./viewport";
import Rooster from "./Rooster";
import { Photo } from "./Photo";
import { Pagination, usePagination } from "./Pagination";
export const formatDate = (value: string) =>
  value
    ? new Date(value + "T12:00:00").toLocaleDateString("es", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "Sin datos registrados";
export function birdAge(b: Bird) {
  if (!b.birth) return b.age || "Sin datos registrados";
  const now = new Date(),
    born = new Date(b.birth + "T12:00:00");
  const months = Math.max(
    0,
    (now.getFullYear() - born.getFullYear()) * 12 +
      now.getMonth() -
      born.getMonth() -
      (now.getDate() < born.getDate() ? 1 : 0),
  );
  return months >= 12
    ? `${Math.floor(months / 12)} a ${months % 12} m`
    : `${months} meses`;
}
const weightText = (b: Bird) =>
  b.weightKg && Number.isFinite(Number(b.weightKg)) && Number(b.weightKg) > 0
    ? `${Number(b.weightKg).toLocaleString("es", { maximumFractionDigits: 3 })} kg`
    : "Sin datos registrados";
function PageCheckbox({
  all,
  some,
  toggle,
  disabled = false,
}: {
  all: boolean;
  some: boolean;
  toggle: () => void;
  disabled?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = some && !all;
  }, [all, some]);
  return (
    <label className="record-checkbox">
      <span className="sr-only">Seleccionar esta página</span>
      <input
        ref={ref}
        type="checkbox"
        checked={all}
        disabled={disabled}
        onChange={toggle}
      />
    </label>
  );
}
export function BirdRecords({
  birds,
  farms,
  open,
  edit,
  compact = false,
  selected,
  onSelectionChange,
  disabled = false,
}: {
  birds: Bird[];
  farms: Farm[];
  open: (id: string) => void;
  edit: (bird: Bird) => void;
  compact?: boolean;
  selected?: ReadonlySet<string>;
  onSelectionChange?: (next: Set<string>) => void;
  disabled?: boolean;
}) {
  const cfg = useSettings(),
    phone = usePhoneLayout(),
    pager = usePagination(birds),
    farmNames = useMemo(
      () => new Map(farms.map((f) => [f.id, f.name])),
      [farms],
    );
  const items = compact ? birds.slice(0, 4) : pager.items;
  const selectable = !!onSelectionChange && !compact,
    all = !!items.length && items.every((b) => selected?.has(b.id)),
    some = items.some((b) => selected?.has(b.id));
  const toggle = (id: string, checked: boolean) => {
    const next = new Set(selected);
    if (checked) next.add(id);
    else next.delete(id);
    onSelectionChange?.(next);
  };
  const togglePage = () => {
    const next = new Set(selected);
    for (const bird of items) {
      if (all) next.delete(bird.id);
      else next.add(bird.id);
    }
    onSelectionChange?.(next);
  };
  const identity = (b: Bird, i: number) => (
    <button
      className="bird-link"
      onClick={() => open(b.id)}
      aria-label={`Ver ficha de ${b.name}`}
    >
      <span className={"avatar tone-" + (i % 3)}>
        {b.photos[0] ? <Photo source={b.photos[0]} thumbnail /> : <Rooster />}
      </span>
      <span>
        <strong>{b.name}</strong>
        <small>
          {b.code}
          {b.demo ? " · Ejemplo" : ""}
        </small>
      </span>
    </button>
  );
  const badge = (b: Bird) => (
    <span
      className={
        "badge " + (cfg.healthyStates.includes(b.status) ? "green" : "sand")
      }
    >
      <i />
      {b.status}
    </span>
  );
  if (!items.length)
    return (
      <div className="empty">
        <BirdIcon />
        <div>
          <strong>No hay registros que coincidan</strong>
          <span>Prueba otra búsqueda o limpia los filtros.</span>
        </div>
      </div>
    );
  const pagination = compact ? null : (
    <Pagination pager={pager} total={birds.length} label="Páginas de gallos" />
  );
  if (phone)
    return (
      <>
        {selectable && (
          <div className="select-page">
            <PageCheckbox
              all={all}
              some={some}
              toggle={togglePage}
              disabled={disabled}
            />
            <span>Seleccionar esta página ({items.length})</span>
          </div>
        )}
        <div className="bird-cards" role="list" aria-label="Gallos registrados">
          {items.map((b, i) => (
            <article
              className={
                "bird-card" + (selected?.has(b.id) ? " is-selected" : "")
              }
              role="listitem"
              key={b.id}
            >
              {selectable && (
                <label className="card-selection">
                  <input
                    type="checkbox"
                    checked={!!selected?.has(b.id)}
                    disabled={disabled}
                    aria-label={`Seleccionar ${b.name}`}
                    onChange={(e) => toggle(b.id, e.target.checked)}
                  />
                  <span>Seleccionar</span>
                </label>
              )}
              <div className="bird-card-head">
                {identity(b, i)}
                <button
                  className="icon-btn"
                  disabled={disabled}
                  onClick={() => edit({ ...b })}
                  aria-label={`Editar ${b.name}`}
                >
                  <Pencil size={18} />
                </button>
              </div>
              <div className="bird-card-status">
                {badge(b)}
                <span>{birdAge(b)}</span>
              </div>
              <div className="bird-card-weight">
                <span>Peso</span>
                <strong>{weightText(b)}</strong>
              </div>
              <dl className="bird-card-data">
                <div>
                  <dt>Criadero</dt>
                  <dd>{farmNames.get(b.farmId || "") || "Sin asignar"}</dd>
                </div>
                <div>
                  <dt>{cfg.catalogs.breed.label}</dt>
                  <dd>{b.breed || "Sin datos registrados"}</dd>
                </div>
                <div>
                  <dt>Última revisión</dt>
                  <dd>
                    {b.lastReview
                      ? formatDate(b.lastReview)
                      : "Sin datos registrados"}
                  </dd>
                </div>
                <div>
                  <dt>{cfg.plLabel}</dt>
                  <dd>{b.pl || "Sin datos registrados"}</dd>
                </div>
              </dl>
              <button
                className="text-button card-open"
                onClick={() => open(b.id)}
              >
                Abrir ficha
                <ChevronRight size={17} />
              </button>
            </article>
          ))}
        </div>
        {pagination}
      </>
    );
  return (
    <>
      <div
        className="table-scroll"
        role="region"
        aria-label="Listado de gallos"
      >
        <table>
          <thead>
            <tr>
              {selectable && (
                <th className="selection-column">
                  <PageCheckbox
                    all={all}
                    some={some}
                    toggle={togglePage}
                    disabled={disabled}
                  />
                </th>
              )}
              <th>Gallo</th>
              <th>Peso</th>
              <th>Criadero</th>
              <th>{cfg.catalogs.breed.label}</th>
              <th>Edad</th>
              <th>{cfg.plLabel}</th>
              <th>{cfg.catalogs.status.label}</th>
              <th>Última revisión</th>
              <th>
                <span className="sr-only">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((b, i) => (
              <tr
                className={selected?.has(b.id) ? "is-selected" : ""}
                key={b.id}
              >
                {selectable && (
                  <td className="selection-column">
                    <label className="record-checkbox">
                      <span className="sr-only">Seleccionar {b.name}</span>
                      <input
                        type="checkbox"
                        checked={!!selected?.has(b.id)}
                        disabled={disabled}
                        onChange={(e) => toggle(b.id, e.target.checked)}
                      />
                    </label>
                  </td>
                )}
                <td className="identity-cell">{identity(b, i)}</td>
                <td className="weight-cell">
                  <span
                    className={b.weightKg ? "weight-value" : "weight-missing"}
                  >
                    {weightText(b)}
                  </span>
                </td>
                <td>{farmNames.get(b.farmId || "") || "Sin asignar"}</td>
                <td>{b.breed || "Sin datos"}</td>
                <td>{birdAge(b)}</td>
                <td>{b.pl || "Sin datos"}</td>
                <td>{badge(b)}</td>
                <td>{b.lastReview ? formatDate(b.lastReview) : "Sin datos"}</td>
                <td>
                  <div className="row-actions">
                    <button
                      className="icon-btn"
                      disabled={disabled}
                      onClick={() => edit({ ...b })}
                      aria-label={`Editar ${b.name}`}
                    >
                      <Pencil size={17} />
                    </button>
                    <button
                      className="icon-btn"
                      onClick={() => open(b.id)}
                      aria-label={`Abrir ficha de ${b.name}`}
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pagination}
    </>
  );
}
