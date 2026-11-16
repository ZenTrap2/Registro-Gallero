import { useMemo } from "react";
import {
  GitFork,
  ArrowUpRight,
  HeartPulse,
  CheckCircle2,
  Pencil,
  Check,
  Trash2,
} from "lucide-react";
import type { Bird, Database, HealthEvent } from "./data";
import { today } from "./data";
import { PagedList } from "./Pagination";
import { Photo } from "./Photo";
import Rooster from "./Rooster";
import { formatDate } from "./BirdRecords";
export function LineageView({
  birds,
  open,
}: {
  birds: Bird[];
  open: (id: string) => void;
}) {
  const byId = useMemo(() => new Map(birds.map((b) => [b.id, b])), [birds]);
  if (!birds.length)
    return (
      <div className="panel empty">
        Registra tu primer gallo para organizar su linaje.
      </div>
    );
  return (
    <PagedList items={birds} label="Páginas de linaje">
      {(items) => (
        <div className="lineage-grid">
          {items.map((b) => (
            <section className="panel lineage-card" key={b.id}>
              <button className="bird-link" onClick={() => open(b.id)}>
                <span className="avatar">
                  {b.photos[0] ? (
                    <Photo source={b.photos[0]} thumbnail />
                  ) : (
                    <Rooster />
                  )}
                </span>
                <span>
                  <strong>{b.name}</strong>
                  <small>{b.code}</small>
                </span>
                <ArrowUpRight size={18} />
              </button>
              <div className="lineage-line">
                <GitFork size={22} />
              </div>
              {(["father", "mother"] as const).map((key, i) => {
                const p = byId.get(b[key]);
                return (
                  <div className="lineage-parent" key={key}>
                    <span>{i ? "Madre" : "Padre"}</span>
                    {p ? (
                      <button
                        className="text-button"
                        onClick={() => open(p.id)}
                      >
                        {p.name}
                        <ArrowUpRight size={14} />
                      </button>
                    ) : (
                      <small>Sin datos registrados</small>
                    )}
                  </div>
                );
              })}
            </section>
          ))}
        </div>
      )}
    </PagedList>
  );
}
export function HealthEventList({
  items,
  db,
  compact = false,
  edit,
  toggle,
  remove,
  busy = false,
}: {
  items: HealthEvent[];
  db: Database;
  compact?: boolean;
  edit: (event: HealthEvent) => void;
  toggle: (event: HealthEvent) => void;
  remove: (event: HealthEvent) => void;
  busy?: boolean;
}) {
  const names = useMemo(
    () => new Map(db.birds.map((b) => [b.id, b.name])),
    [db.birds],
  );
  const rows = (events: HealthEvent[]) => (
    <div className="event-list">
      {!events.length ? (
        <div className="empty">
          <CheckCircle2 />
          {compact
            ? "No hay eventos pendientes."
            : "No hay eventos registrados."}
        </div>
      ) : (
        events.map((e) => {
          const date = e.followUp || e.date,
            overdue = date < today() && !e.done;
          return (
            <div className="event-row" key={e.id}>
              <div className="event-icon">
                <HeartPulse size={20} />
              </div>
              <div className="event-content">
                <strong>{e.type}</strong>
                <span>
                  {names.get(e.birdId) || "Todo el criadero"} ·{" "}
                  {formatDate(date)}
                </span>
                {!compact && <p>{e.notes || "Sin datos registrados"}</p>}
              </div>
              <span
                className={
                  "badge " + (e.done ? "green" : overdue ? "red" : "sand")
                }
              >
                {e.done ? "Completado" : overdue ? "Vencido" : "Próximo"}
              </span>
              {!compact && (
                <div className="event-actions">
                  <button
                    className="icon-btn"
                    disabled={busy}
                    aria-label={`Editar ${e.type}`}
                    onClick={() => edit(e)}
                  >
                    <Pencil size={17} />
                  </button>
                  <button
                    className="icon-btn"
                    disabled={busy}
                    aria-label={
                      e.done ? "Marcar pendiente" : "Completar evento"
                    }
                    onClick={() => toggle(e)}
                  >
                    <Check size={18} />
                  </button>
                  <button
                    className="icon-btn danger"
                    disabled={busy}
                    aria-label="Eliminar evento"
                    onClick={() => remove(e)}
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
  return compact ? (
    rows(items.slice(0, 4))
  ) : (
    <PagedList items={items} label="Páginas de salud y cuidados">
      {rows}
    </PagedList>
  );
}
