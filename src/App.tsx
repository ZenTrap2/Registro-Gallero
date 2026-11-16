import { Photo } from "./Photo";
import { LineageView, HealthEventList } from "./LargeViews";
import { ImportPreview } from "./ImportPreview";
import { ExportDialog, type ExportScope } from "./ExportDialog";
import { SelectionToolbar } from "./SelectionToolbar";
import { StorageStatus } from "./StorageStatus";
import { ImportSession } from "./import-session";
import {
  jsonExport,
  csvExport,
  subsetData,
  type TransferData,
} from "./transfer";
import type { OperationProgress } from "./storage";
import { Navigation } from "./Navigation";
import { Feedback } from "./Feedback";
import { BirdRecords, birdAge } from "./BirdRecords";
import { useViewport } from "./viewport";
import { topLayer } from "./overlays";
import { Capacitor } from "@capacitor/core";
import { saveFile, fileSuccess } from "./files";
import { SettingsContext, useSettings } from "./SettingsContext";
import { getSettings } from "./settings";
import { AdminPage } from "./AdminPage";
import Rooster from "./Rooster";
import React, {
  useEffect,
  useRef,
  useState,
  useMemo,
  useDeferredValue,
} from "react";
import {
  LayoutDashboard,
  Bird as BirdIcon,
  GitFork,
  HeartPulse,
  ChartNoAxesCombined,
  Search,
  Upload,
  Download,
  Plus,
  ArrowUpRight,
  ArrowRight,
  CalendarDays,
  Check,
  X,
  ChevronRight,
  Leaf,
  ShieldCheck,
  MoreHorizontal,
  Trash2,
  Pencil,
  ImagePlus,
  Menu,
  FolderHeart,
  Clock,
  CheckCircle2,
  Warehouse,
  HelpCircle,
  Settings,
} from "lucide-react";
import {
  type Bird,
  type Farm,
  type HealthEvent,
  type Database,
  readDB,
  writeDB,
  emptyBird,
  today,
  toCSV,
  parseCSV,
  validateImport,
  mergeImport,
  validWeight,
  validPL,
  purposes,
  filterBirds,
  type BirdFilters,
} from "./data";
import "./style.css";
import { FarmPage, HelpPage, AdvancedFilters } from "./Extras";
import { Modal } from "./Modal";
const fmt = (d: string) =>
  d
    ? new Date(d + "T12:00:00").toLocaleDateString("es", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "Sin datos registrados";
const age = birdAge;
export default function App() {
  useViewport();
  const [db, setDb] = useState<Database>({ birds: [], events: [] }),
    [loaded, setLoaded] = useState(false),
    [operation, setOperation] = useState<OperationProgress | null>(null),
    [selectedRows, setSelectedRows] = useState<Set<string>>(new Set()),
    [importRows, setImportRows] = useState<Set<string>>(new Set()),
    [importParsing, setImportParsing] = useState(false),
    [exportScope, setExportScope] = useState<ExportScope>("all"),
    [page, setPage] = useState("Resumen"),
    [search, setSearch] = useState(""),
    [breed, setBreed] = useState(""),
    [status, setStatus] = useState(""),
    [sort, setSort] = useState("name"),
    [toast, setToast] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [mobile, setMobile] = useState(false),
    [selected, setSelected] = useState<string | null>(null),
    [edit, setEdit] = useState<Bird | null>(null),
    [event, setEvent] = useState<HealthEvent | null>(null),
    [confirm, setConfirm] = useState<{
      title: string;
      note: string;
      run: () => Promise<void>;
    } | null>(null),
    [exportOpen, setExportOpen] = useState(false),
    [importOpen, setImportOpen] = useState(false),
    [preview, setPreview] = useState<ReturnType<typeof validateImport> | null>(
      null,
    ),
    [mode, setMode] = useState("skip"),
    [loadVersion, setLoadVersion] = useState(0),
    [extraFilters, setExtraFilters] = useState({
      farmId: "",
      month: "",
      year: "",
      purpose: "",
      minWeight: "",
      maxWeight: "",
      pl: "",
    });
  const importSession = useRef<ImportSession | null>(null);
  useEffect(() => () => importSession.current?.dispose(), []);
  const indexes = useMemo(() => {
    const byId = new Map(db.birds.map((b) => [b.id, b])),
      byCode = new Set(db.birds.map((b) => b.code.toLowerCase())),
      eventsByBird = new Map<string, HealthEvent[]>(),
      statuses = new Map<string, number>(),
      breeds = new Map<string, number>();
    let parents = 0;
    for (const b of db.birds) {
      statuses.set(b.status, (statuses.get(b.status) || 0) + 1);
      const breed = b.breed || "Sin datos";
      breeds.set(breed, (breeds.get(breed) || 0) + 1);
      if (b.father || b.mother) parents++;
    }
    for (const event of db.events) {
      const list = eventsByBird.get(event.birdId) || [];
      list.push(event);
      eventsByBird.set(event.birdId, list);
    }
    return { byId, byCode, eventsByBird, statuses, breeds, parents };
  }, [db]);
  useEffect(
    () =>
      setSelectedRows((previous) => {
        const next = new Set(
          [...previous].filter((id) => indexes.byId.has(id)),
        );
        return next.size === previous.size ? previous : next;
      }),
    [indexes.byId],
  );
  const cfg = useMemo(() => getSettings(db), [db]);
  useEffect(() => {
    if (selected) {
      window.scrollTo({ top: 0, behavior: "auto" });
      document
        .querySelector<HTMLElement>("main h1")
        ?.focus({ preventScroll: true });
    }
  }, [selected]);
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let disposed = false;
    let remove: (() => Promise<void>) | undefined;
    import("@capacitor/app").then(async ({ App: nativeApp }) => {
      const handle = await nativeApp.addListener("backButton", () => {
        const layer = topLayer();
        if (layer) {
          layer.dispatchEvent(new Event("cancel", { cancelable: true }));
          return;
        }
        if (confirm) setConfirm(null);
        else if (edit) setEdit(null);
        else if (event) setEvent(null);
        else if (exportOpen) setExportOpen(false);
        else if (importOpen) setImportOpen(false);
        else if (selected) setSelected(null);
        else if (mobile) setMobile(false);
        else if (page !== "Resumen") {
          resetFilters();
          setPage("Resumen");
          setMobile(false);
        } else void nativeApp.exitApp();
      });
      if (disposed) await handle.remove();
      else remove = () => handle.remove();
    });
    return () => {
      disposed = true;
      void remove?.();
    };
  }, [confirm, edit, event, exportOpen, importOpen, selected, page, mobile]);
  const resetFilters = () => {
    setSearch("");
    setBreed("");
    setStatus("");
    setSort("name");
    setExtraFilters({
      farmId: "",
      month: "",
      year: "",
      purpose: "",
      minWeight: "",
      maxWeight: "",
      pl: "",
    });
  };
  useEffect(() => {
    let disposed = false;
    setLoaded(false);
    readDB({
      onProgress: (p) => {
        if (!disposed) setOperation(p);
      },
    })
      .then((d) => {
        if (!disposed) {
          setDb(d);
          setLoaded(true);
          setOperation(null);
        }
      })
      .catch((e) => {
        if (!disposed) {
          setError(e.message);
          setOperation(null);
        }
      });
    return () => {
      disposed = true;
    };
  }, [loadVersion]);
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(""), 5000);
      return () => clearTimeout(t);
    }
  }, [toast]);
  async function save(d: Database, message: string) {
    setBusy(true);
    setError("");
    try {
      const stored = await writeDB(d, { base: db, onProgress: setOperation });
      setDb(stored || d);
      setToast(message);
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setBusy(false);
      setOperation(null);
    }
  }
  const allBirds = useMemo(
    () => [...db.birds].sort((a, b) => a.name.localeCompare(b.name, "es")),
    [db.birds],
  );
  const deferredSearch = useDeferredValue(search);
  const filters: BirdFilters = { search, breed, status, ...extraFilters };
  const birds = useMemo(
    () =>
      filterBirds(db, {
        search: deferredSearch,
        breed,
        status,
        ...extraFilters,
      }).sort((a, b) =>
        sort === "name"
          ? a.name.localeCompare(b.name, "es")
          : b.arrival.localeCompare(a.arrival),
      ),
    [db, deferredSearch, breed, status, extraFilters, sort],
  );
  const active = indexes.byId.get(selected || "");
  const upcoming = useMemo(
    () =>
      db.events
        .filter((e) => !e.done)
        .sort((a, b) =>
          (a.followUp || a.date).localeCompare(b.followUp || b.date),
        ),
    [db.events],
  );
  const allEvents = useMemo(
    () =>
      [...db.events].sort(
        (a, b) =>
          Number(a.done) - Number(b.done) ||
          (a.followUp || a.date).localeCompare(b.followUp || b.date),
      ),
    [db.events],
  );
  const activeEvents = useMemo(
    () => indexes.eventsByBird.get(selected || "") || [],
    [indexes.eventsByBird, selected],
  );
  const demo = db.birds.some((b) => b.demo);
  const go = (p: string) => {
    resetFilters();
    setPage(p);
    setMobile(false);
    setSelected(null);
    requestAnimationFrame(() => {
      document
        .querySelector<HTMLElement>("main h1")
        ?.focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: "auto" });
    });
  };
  const newEvent = () =>
    setEvent({
      id: crypto.randomUUID(),
      birdId: active?.id || "",
      date: today(),
      type: cfg.catalogs.eventType.options[0],
      notes: "",
      followUp: "",
      done: false,
    });
  async function runExport(
    format: "json" | "csv" | "pdf",
    data: TransferData,
    includePhotos = true,
  ) {
    setBusy(true);
    setError("");
    setOperation({
      label: "Preparando exportación",
      completed: 0,
      total: data.birds.length,
    });
    try {
      if (format === "pdf") {
        const { exportBirdPDF } = await import("./pdf");
        const result = await exportBirdPDF(
          data.birds,
          { ...db, events: data.events },
          { includePhotos, onProgress: setOperation },
        );
        setToast(fileSuccess(result));
      } else {
        const blob =
          format === "json"
            ? await jsonExport(data, setOperation)
            : csvExport(data, db.birds);
        const result = await saveFile(
          `registro-gallero-${today()}-${data.birds.length}.${format}`,
          blob,
          setOperation,
        );
        setToast(fileSuccess(result));
      }
      setExportOpen(false);
    } catch (e) {
      setError(`No se pudo exportar el archivo: ${(e as Error).message}`);
    } finally {
      setBusy(false);
      setOperation(null);
    }
  }
  async function downloadPDF(list: Bird[]) {
    await runExport(
      "pdf",
      subsetData(db, new Set(list.map((b) => b.id))),
      list.length <= 100,
    );
  }
  function closeImport() {
    importSession.current?.dispose();
    importSession.current = null;
    setImportOpen(false);
    setPreview(null);
    setImportRows(new Set());
    setImportParsing(false);
    setOperation(null);
  }
  async function importFile(file?: File) {
    if (!file) return;
    importSession.current?.dispose();
    const session = new ImportSession();
    importSession.current = session;
    setPreview(null);
    setImportRows(new Set());
    setImportParsing(true);
    setError("");
    setOperation({
      label: "Revisando archivo de importación",
      completed: 0,
      total: 0,
    });
    try {
      const result = await session.parse(file);
      if (importSession.current !== session) return;
      setPreview(result);
      setImportRows(new Set(result.birds.map((b) => b.id)));
    } catch (e) {
      if (importSession.current === session)
        setError(`No se pudo importar: ${(e as Error).message}`);
    } finally {
      if (importSession.current === session) {
        setImportParsing(false);
        setOperation(null);
      }
    }
  }
  function confirmImport() {
    if (!preview) return;
    setConfirm({
      title: "¿Incorporar los datos revisados?",
      note: `Se revisarán ${importRows.size} gallos seleccionados. ${mode === "update" ? "Los códigos duplicados y sus criaderos vinculados se actualizarán con los datos del archivo." : "Los códigos duplicados se omitirán."} Los demás registros se conservarán.`,
      run: async () => {
        setBusy(true);
        try {
          const incoming = await importSession.current!.selected(importRows);
          if (
            await save(
              mergeImport(db, incoming, mode),
              "Importación completada.",
            )
          )
            closeImport();
        } finally {
          setBusy(false);
          setOperation(null);
        }
      },
    });
  }
  const eventProps = {
    db,
    edit: setEvent,
    busy,
    toggle: (e: HealthEvent) =>
      void save(
        {
          ...db,
          events: db.events.map((x) =>
            x.id === e.id ? { ...x, done: !x.done } : x,
          ),
        },
        "Evento actualizado.",
      ),
    remove: (e: HealthEvent) =>
      setConfirm({
        title: "¿Eliminar este evento?",
        note: "Esta acción no se puede deshacer.",
        run: async () => {
          await save(
            { ...db, events: db.events.filter((x) => x.id !== e.id) },
            "Evento eliminado.",
          );
        },
      }),
  };
  return (
    <SettingsContext.Provider value={cfg}>
      <>
        <Navigation
          page={page}
          count={db.birds.length}
          open={mobile}
          close={() => setMobile(false)}
          go={go}
        />
        <div className="app-shell">
          <a className="skip-link" href="#main-content">
            Saltar al contenido
          </a>
          <header className="topbar">
            <button
              className="icon-btn menu"
              onClick={() => setMobile(!mobile)}
              aria-label="Abrir menú"
              aria-expanded={mobile}
              aria-controls="mobile-navigation"
            >
              <Menu />
            </button>
            <div className="breadcrumbs">
              Mi criadero <ChevronRight size={14} />
              <strong>{page}</strong>
            </div>
            <label className="global-search">
              <Search size={18} />
              <span className="sr-only">Buscar un gallo</span>
              <input
                placeholder="Buscar por nombre o código..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  if (e.target.value) {
                    setPage("Mis gallos");
                    setSelected(null);
                  }
                }}
              />
            </label>
            <button
              className="btn header-btn"
              title="Importar datos"
              aria-label="Importar datos"
              onClick={() => {
                setPreview(null);
                setImportOpen(true);
              }}
              disabled={!loaded}
            >
              <Upload size={16} />
              Importar datos
            </button>
            <button
              className="btn header-btn"
              title="Exportar datos"
              aria-label="Exportar datos"
              onClick={() => {
                setExportScope("all");
                setExportOpen(true);
              }}
              disabled={!loaded}
            >
              <Download size={16} />
              Exportar datos
            </button>
          </header>
          <main id="main-content" aria-busy={!loaded || busy}>
            <div className="page-heading">
              <div>
                <h1 tabIndex={-1}>
                  {active
                    ? active.name
                    : page === "Resumen"
                      ? "Tu criadero, en orden."
                      : page}
                </h1>
                <p>
                  {active
                    ? `${active.code} · Ficha individual`
                    : page === "Resumen"
                      ? "Cada registro cuenta una historia. Cada cuidado hace la diferencia."
                      : page === "Mis gallos"
                        ? "Conoce y cuida a cada integrante de tu criadero."
                        : page === "Linaje"
                          ? "Una historia que comienza con sus raíces."
                          : page === "Criaderos"
                            ? "Gestiona los espacios donde viven tus gallos."
                            : page === "Ayuda"
                              ? "Conoce las funciones y encuentra lo que necesitas."
                              : page === "Reportes"
                                ? "Una mirada clara al bienestar de tu criadero."
                                : "El bienestar de tu criadero, día a día."}
                </p>
              </div>
              <button
                className="btn primary persistent-register"
                disabled={!loaded}
                onClick={() =>
                  setEdit({
                    ...emptyBird(),
                    status:
                      cfg.healthyStates[0] || cfg.catalogs.status.options[0],
                  })
                }
              >
                <Plus size={18} />
                Registrar gallo
              </button>
            </div>
            {!loaded && (
              <div className="panel empty" role="status">
                {error ? (
                  <div>
                    <strong>No se pudieron cargar tus registros.</strong>
                    <button
                      className="btn"
                      onClick={() => {
                        setError("");
                        setLoadVersion((v) => v + 1);
                      }}
                    >
                      Volver a intentar
                    </button>
                  </div>
                ) : (
                  "Cargando tus registros…"
                )}
              </div>
            )}
            {demo && (
              <div className="demo-note">
                <span>
                  <span className="demo-dot" /> Estás viendo registros ficticios
                  de ejemplo. Haz de este espacio tu criadero.
                </span>
                <button
                  onClick={() =>
                    setConfirm({
                      title: "¿Eliminar los datos de ejemplo?",
                      note: "Se eliminarán los gallos de ejemplo y sus eventos. Tus otros registros se conservarán.",
                      run: async () => {
                        const ids = db.birds
                          .filter((b) => b.demo)
                          .map((b) => b.id);
                        await save(
                          {
                            ...db,
                            birds: db.birds
                              .filter((b) => !b.demo)
                              .map((b) => ({
                                ...b,
                                father: ids.includes(b.father) ? "" : b.father,
                                mother: ids.includes(b.mother) ? "" : b.mother,
                              })),
                            events: db.events.filter(
                              (e) =>
                                !ids.includes(e.birdId) &&
                                !["e1", "e2", "e3"].includes(e.id),
                            ),
                          },
                          "Ejemplos eliminados.",
                        );
                      },
                    })
                  }
                >
                  Eliminar ejemplos <X size={13} />
                </button>
              </div>
            )}
            {loaded &&
              (active ? (
                <>
                  <button
                    className="text-button back"
                    onClick={() => setSelected(null)}
                  >
                    ← Volver a {page.toLowerCase()}
                  </button>
                  <div className="detail-grid">
                    <section className="panel detail">
                      <div className="section-head">
                        <h2>Información del registro</h2>
                        <button
                          className="btn"
                          onClick={() => downloadPDF([active])}
                        >
                          <Download size={15} />
                          Exportar ficha PDF
                        </button>
                        <button
                          className="btn"
                          onClick={() => setEdit({ ...active })}
                        >
                          <Pencil size={15} />
                          Editar
                        </button>
                      </div>
                      <div className="gallery">
                        {active.photos.length ? (
                          active.photos.map((p, i) => (
                            <img
                              key={i}
                              src={p}
                              alt={`${active.name}, fotografía ${i + 1}`}
                            />
                          ))
                        ) : (
                          <div className="no-photo">
                            <Rooster />
                            <span>Sin fotografías registradas</span>
                          </div>
                        )}
                      </div>
                      <dl>
                        {[
                          ["Código", active.code],
                          [
                            "Criadero",
                            db.farms?.find((f) => f.id === active.farmId)?.name,
                          ],
                          ["Procedencia", active.origin],
                          ["Marca", active.mark],
                          [cfg.catalogs.purpose.label, active.purpose],
                          [cfg.plLabel, active.pl],
                          [cfg.catalogs.breed.label, active.breed],
                          ["Edad", age(active)],
                          ["Nacimiento", fmt(active.birth)],
                          [
                            "Peso",
                            active.weightKg
                              ? `${Number(active.weightKg).toLocaleString("es", { maximumFractionDigits: 3 })} kg`
                              : "Sin datos registrados",
                          ],
                          [cfg.catalogs.color.label, active.color],
                          ["Fecha de ingreso", fmt(active.arrival)],
                          [cfg.catalogs.status.label, active.status],
                          ["Última revisión", fmt(active.lastReview)],
                        ].map(([k, v]) => (
                          <div key={k}>
                            <dt>{k}</dt>
                            <dd>{v || "Sin datos registrados"}</dd>
                          </div>
                        ))}
                      </dl>
                      <h3>Notas generales</h3>
                      <p className="preserve">
                        {active.notes || "Sin datos registrados"}
                      </p>
                      <button
                        className="btn danger"
                        onClick={() =>
                          setConfirm({
                            title: `¿Eliminar a ${active.name}?`,
                            note: "Se eliminarán su ficha, fotografías y eventos. Las referencias de parentesco se quitarán de otras fichas.",
                            run: async () => {
                              if (
                                await save(
                                  {
                                    ...db,
                                    birds: db.birds
                                      .filter((b) => b.id !== active.id)
                                      .map((b) => ({
                                        ...b,
                                        father:
                                          b.father === active.id
                                            ? ""
                                            : b.father,
                                        mother:
                                          b.mother === active.id
                                            ? ""
                                            : b.mother,
                                      })),
                                    events: db.events.filter(
                                      (e) => e.birdId !== active.id,
                                    ),
                                  },
                                  "Registro eliminado.",
                                )
                              )
                                setSelected(null);
                            },
                          })
                        }
                      >
                        <Trash2 size={16} />
                        Eliminar registro
                      </button>
                    </section>
                    <div>
                      <section className="panel genealogy">
                        <h2>
                          <GitFork size={20} /> Sus raíces
                        </h2>
                        {["father", "mother"].map((key, i) => {
                          const b = indexes.byId.get(
                            active[key as "father" | "mother"],
                          );
                          return (
                            <div className="parent" key={key}>
                              <small>{i ? "MADRE" : "PADRE"}</small>
                              {b ? (
                                <button
                                  className="bird-link"
                                  onClick={() => setSelected(b.id)}
                                >
                                  <span className="avatar">
                                    <Rooster />
                                  </span>
                                  <span>
                                    <strong>{b.name}</strong>
                                    <small>{b.code}</small>
                                  </span>
                                  <ArrowUpRight size={18} />
                                </button>
                              ) : (
                                <p>Sin datos registrados</p>
                              )}
                            </div>
                          );
                        })}
                      </section>
                      <section className="panel">
                        <div className="section-head">
                          <h2>Salud y cuidados</h2>
                          <button
                            className="icon-btn"
                            onClick={newEvent}
                            aria-label="Añadir evento"
                          >
                            <Plus />
                          </button>
                        </div>
                        <HealthEventList {...eventProps} items={activeEvents} />
                      </section>
                    </div>
                  </div>
                </>
              ) : page === "Resumen" ? (
                <>
                  <div className="stats-grid">
                    {[
                      {
                        label: "Gallos registrados",
                        value: db.birds.length,
                        icon: BirdIcon,
                        note: "Cada uno, una historia",
                        tone: "green",
                      },
                      {
                        label: "Controles próximos",
                        value: upcoming.filter(
                          (e) =>
                            cfg.controlTypes.includes(e.type) &&
                            (e.followUp || e.date) >= today(),
                        ).length,
                        icon: CalendarDays,
                        note: "Su salud es lo primero",
                        tone: "terra",
                      },
                      {
                        label: "Cuidados pendientes",
                        value: upcoming.length,
                        icon: FolderHeart,
                        note: "Pequeños cuidados, gran bienestar",
                        tone: "olive",
                      },
                    ].map((s) => (
                      <button
                        key={s.label}
                        className="stat-card"
                        onClick={() =>
                          go(
                            s.label === "Gallos registrados"
                              ? "Mis gallos"
                              : "Salud y cuidados",
                          )
                        }
                      >
                        <div>
                          <span className="stat-label">{s.label}</span>
                          <div className="stat-value">
                            {s.value.toString().padStart(2, "0")}
                          </div>
                          <small>{s.note}</small>
                        </div>
                        <span className={"stat-icon " + s.tone}>
                          <s.icon size={23} />
                        </span>
                        <ArrowUpRight className="stat-arrow" size={17} />
                      </button>
                    ))}
                  </div>
                  <div className="overview-grid">
                    <section className="welcome-card">
                      <div className="welcome-copy">
                        <span className="pill">
                          <Leaf size={13} /> CRIAR CON PROPÓSITO
                        </span>
                        <h2>
                          Conocer su historia.
                          <br />
                          Cuidar su futuro.
                        </h2>
                        <p>
                          Su origen, su salud y cada etapa de su vida,
                          <br className="desktop" /> en un solo lugar.
                        </p>
                        <button
                          className="btn cream"
                          onClick={() => go("Linaje")}
                        >
                          Explorar el linaje <ArrowRight size={16} />
                        </button>
                      </div>
                      <div className="hero-art">
                        <div className="art-circle" />
                        <Rooster />
                        <span className="art-leaf leaf-one">✧</span>
                        <span className="art-leaf leaf-two">✧</span>
                        <div className="art-caption">
                          BIENESTAR EN CADA ETAPA
                        </div>
                      </div>
                    </section>
                    <section className="panel agenda">
                      <div className="section-head">
                        <div>
                          <h2>Próximos cuidados</h2>
                          <p>Un poco de atención, todos los días.</p>
                        </div>
                        <CalendarDays size={20} />
                      </div>
                      <HealthEventList
                        {...eventProps}
                        items={upcoming}
                        compact
                      />
                      <button
                        className="text-button agenda-link"
                        onClick={() => go("Salud y cuidados")}
                      >
                        Ver todos los cuidados <ArrowRight size={16} />
                      </button>
                    </section>
                  </div>
                  <section className="panel records">
                    <div className="section-head">
                      <div>
                        <h2>
                          Tu criadero de un vistazo{" "}
                          <span className="count">{db.birds.length}</span>
                        </h2>
                        <p>Identificación y bienestar, siempre a mano.</p>
                      </div>
                      <button
                        className="text-button"
                        onClick={() => go("Mis gallos")}
                      >
                        Ver todos los gallos <ArrowRight size={16} />
                      </button>
                    </div>
                    <BirdRecords
                      birds={allBirds}
                      farms={db.farms || []}
                      open={setSelected}
                      edit={setEdit}
                      compact
                    />
                  </section>
                  <div className="bottom-message">
                    <Leaf size={15} /> El cuidado responsable empieza por
                    conocerlos.
                  </div>
                </>
              ) : page === "Mis gallos" ? (
                <section className="panel records">
                  <div className="filters">
                    <label>
                      <span>Buscar registro</span>
                      <div className="input-icon">
                        <Search size={17} />
                        <input
                          placeholder="Nombre, código, marca, procedencia…"
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                        />
                      </div>
                    </label>
                    <label>
                      {cfg.catalogs.breed.label}
                      <select
                        value={breed}
                        onChange={(e) => setBreed(e.target.value)}
                      >
                        <option value="">Todas las razas</option>
                        {[
                          ...new Set(
                            db.birds.map((b) => b.breed).filter(Boolean),
                          ),
                        ].map((b) => (
                          <option key={b}>{b}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      {cfg.catalogs.status.label}
                      <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                      >
                        <option value="">Todos los estados</option>
                        {cfg.catalogs.status.options.map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Ordenar por
                      <select
                        value={sort}
                        onChange={(e) => setSort(e.target.value)}
                      >
                        <option value="name">Nombre (A–Z)</option>
                        <option value="date">Ingreso más reciente</option>
                      </select>
                    </label>
                  </div>
                  <AdvancedFilters
                    db={db}
                    filters={filters}
                    setFilters={(f) => {
                      setSearch(f.search);
                      setBreed(f.breed);
                      setStatus(f.status);
                      setExtraFilters({
                        farmId: f.farmId,
                        month: f.month,
                        year: f.year,
                        purpose: f.purpose,
                        minWeight: f.minWeight,
                        maxWeight: f.maxWeight,
                        pl: f.pl || "",
                      });
                    }}
                  />
                  <div className="list-actions">
                    <button className="btn" onClick={resetFilters}>
                      Ver todos / limpiar filtros
                    </button>
                    <button
                      className="btn"
                      disabled={!birds.length || busy}
                      onClick={() => {
                        setExportScope("filtered");
                        setExportOpen(true);
                      }}
                    >
                      <Download size={16} />
                      Exportar resultados ({birds.length})
                    </button>
                  </div>
                  <SelectionToolbar
                    records={birds}
                    selected={selectedRows}
                    change={setSelectedRows}
                    disabled={busy}
                  >
                    <button
                      className="btn primary"
                      disabled={!selectedRows.size || busy}
                      onClick={() => {
                        setExportScope("selected");
                        setExportOpen(true);
                      }}
                    >
                      <Download size={16} />
                      Exportar selección ({selectedRows.size})
                    </button>
                  </SelectionToolbar>
                  <BirdRecords
                    birds={birds}
                    farms={db.farms || []}
                    open={setSelected}
                    edit={setEdit}
                    selected={selectedRows}
                    onSelectionChange={setSelectedRows}
                    disabled={busy}
                  />
                  <div className="table-footer">
                    {birds.length} registros encontrados
                  </div>
                </section>
              ) : page === "Administración" ? (
                <AdminPage db={db} save={save} busy={busy || !loaded} />
              ) : page === "Criaderos" ? (
                <FarmPage db={db} save={save} busy={busy || !loaded} />
              ) : page === "Ayuda" ? (
                <HelpPage />
              ) : page === "Linaje" ? (
                <LineageView birds={allBirds} open={setSelected} />
              ) : page === "Salud y cuidados" ? (
                <section className="panel">
                  <div className="section-head">
                    <div>
                      <h2>Agenda de bienestar</h2>
                      <p>Revisiones, alojamiento y cuidados responsables.</p>
                    </div>
                    <button
                      className="btn primary"
                      onClick={newEvent}
                      disabled={!loaded}
                    >
                      <Plus size={17} />
                      Nuevo evento
                    </button>
                  </div>
                  <HealthEventList {...eventProps} items={allEvents} />
                </section>
              ) : (
                <>
                  <div className="report-grid">
                    <section className="panel">
                      <h2>{cfg.catalogs.status.label}</h2>
                      {cfg.catalogs.status.options.map((s) => {
                        const n = indexes.statuses.get(s) || 0;
                        return (
                          <div className="report-row" key={s}>
                            <span>{s}</span>
                            <strong>{n}</strong>
                            <div className="bar">
                              <div
                                style={{
                                  width: `${db.birds.length ? (n / db.birds.length) * 100 : 0}%`,
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </section>
                    <section className="panel">
                      <h2>Composición del criadero</h2>
                      {[...indexes.breeds.keys()].map((r) => (
                        <div className="report-row" key={r}>
                          <span>{r}</span>
                          <strong>{indexes.breeds.get(r) || 0}</strong>
                        </div>
                      ))}
                      <p>
                        {indexes.parents} registros con al menos un progenitor
                        identificado.
                      </p>
                    </section>
                  </div>
                  <StorageStatus records={db.birds.length} />
                  <section className="panel backup">
                    <ShieldCheck size={35} />
                    <div>
                      <h2>Una copia para tu tranquilidad</h2>
                      <p>
                        Exporta JSON para conservar fotos y eventos. El CSV
                        contiene solo los campos de texto de las fichas.
                      </p>
                    </div>
                    <button
                      className="btn primary"
                      onClick={() => {
                        setExportScope("all");
                        setExportOpen(true);
                      }}
                    >
                      <Download size={16} />
                      Exportar datos
                    </button>
                  </section>
                </>
              ))}
            <footer>
              <span>
                Registro Gallero <span className="footer-dot">·</span>{" "}
                Identificación y cuidado responsable
              </span>
              <span>
                <ShieldCheck size={13} /> Tus datos se guardan en este navegador
              </span>
            </footer>
          </main>
        </div>
        {edit && (
          <BirdForm
            bird={edit}
            birds={db.birds}
            farms={db.farms || []}
            close={() => setEdit(null)}
            submit={async (b) => {
              const exists = db.birds.some((x) => x.id === b.id);
              if (
                await save(
                  {
                    ...db,
                    birds: exists
                      ? db.birds.map((x) => (x.id === b.id ? b : x))
                      : [...db.birds, b],
                  },
                  "Registro guardado correctamente.",
                )
              )
                setEdit(null);
            }}
            busy={busy}
          />
        )}
        {event && (
          <EventForm
            event={event}
            birds={db.birds}
            close={() => setEvent(null)}
            busy={busy}
            submit={async (e) => {
              if (
                await save(
                  {
                    ...db,
                    events: db.events.some((x) => x.id === e.id)
                      ? db.events.map((x) => (x.id === e.id ? e : x))
                      : [...db.events, e],
                  },
                  "Evento guardado.",
                )
              )
                setEvent(null);
            }}
          />
        )}
        {confirm && (
          <Modal
            title={confirm.title}
            close={() => setConfirm(null)}
            busy={busy}
          >
            <p>{confirm.note}</p>
            <div className="modal-actions">
              <button className="btn" onClick={() => setConfirm(null)}>
                Cancelar
              </button>
              <button
                className="btn primary"
                disabled={busy}
                onClick={async () => {
                  try {
                    await confirm.run();
                    setConfirm(null);
                  } catch (e) {
                    setError((e as Error).message);
                  }
                }}
              >
                {busy ? "Guardando…" : "Confirmar"}
              </button>
            </div>
          </Modal>
        )}
        {exportOpen && (
          <ExportDialog
            db={db}
            allBirds={allBirds}
            filtered={birds}
            selected={selectedRows}
            initialScope={exportScope}
            close={() => setExportOpen(false)}
            run={runExport}
            busy={busy}
          />
        )}
        {importOpen && (
          <Modal title="Importar datos" close={closeImport} busy={busy}>
            <p>
              Selecciona un JSON o CSV de Registro Gallero y elige qué gallos
              incorporar. No se modifica ningún dato hasta confirmar. La
              configuración de nombres y categorías se conserva.
            </p>
            <label className="drop-zone">
              <Upload />
              <strong>Seleccionar archivo JSON o CSV</strong>
              <span>
                Hasta 512 MB. Para copias con muchas fotografías, utiliza lotes.
              </span>
              <input
                type="file"
                aria-label="Seleccionar archivo JSON o CSV"
                accept=".json,.csv"
                disabled={busy || importParsing}
                onChange={(e) => void importFile(e.target.files?.[0])}
              />
            </label>
            {preview && (
              <ImportPreview
                preview={preview}
                db={db}
                selected={importRows}
                change={setImportRows}
                mode={mode}
                setMode={setMode}
                confirm={confirmImport}
                cancel={closeImport}
                busy={busy}
              />
            )}
          </Modal>
        )}
        <Feedback
          progress={operation}
          error={error}
          toast={toast}
          clearError={() => setError("")}
          clearToast={() => setToast("")}
        />
      </>
    </SettingsContext.Provider>
  );
}
function BirdForm({
  bird,
  birds,
  farms,
  close,
  submit,
  busy,
}: {
  bird: Bird;
  birds: Bird[];
  farms: Farm[];
  close: () => void;
  submit: (b: Bird) => Promise<void>;
  busy: boolean;
}) {
  const cfg = useSettings();
  const [b, setB] = useState({ ...bird, photos: [...bird.photos] }),
    [err, setErr] = useState(""),
    [uploading, setUploading] = useState(false);
  const field = (key: keyof Bird, value: string) =>
    setB((x) => ({ ...x, [key]: value }));
  async function photos(files: FileList | null) {
    if (!files) return;
    if (uploading) {
      setErr("Espera a que se terminen de cargar las fotos seleccionadas.");
      return;
    }
    setUploading(true);
    const valid: string[] = [];
    const errors: string[] = [];
    for (const f of Array.from(files)) {
      if (!["image/jpeg", "image/png"].includes(f.type)) {
        errors.push(`${f.name}: solo se acepta JPG o PNG.`);
        continue;
      }
      if (f.size > 5 * 1024 * 1024) {
        errors.push(`${f.name}: el tamaño máximo es 5 MB.`);
        continue;
      }
      try {
        const url = await new Promise<string>((resolve, reject) => {
          const r = new FileReader();
          r.onload = () => resolve(String(r.result));
          r.onerror = () => reject();
          r.readAsDataURL(f);
        });
        await new Promise<void>((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve();
          img.onerror = () => reject();
          img.src = url;
        });
        valid.push(url);
      } catch {
        errors.push(`${f.name}: no se pudo leer la imagen.`);
      }
    }
    setB((x) => ({ ...x, photos: [...x.photos, ...valid].slice(0, 8) }));
    if (b.photos.length + valid.length > 8)
      errors.push("Se permiten hasta 8 fotografías por registro.");
    setErr(errors.join(" "));
    setUploading(false);
  }
  function cycle(id: string, visited = new Set<string>()): boolean {
    if (id === b.id) return true;
    if (!id || visited.has(id)) return false;
    visited.add(id);
    const p = birds.find((x) => x.id === id);
    return !!p && (cycle(p.father, visited) || cycle(p.mother, visited));
  }
  return (
    <Modal
      title={
        birds.some((x) => x.id === b.id)
          ? "Editar registro"
          : "Registrar un gallo"
      }
      close={close}
      busy={busy}
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setErr("");
          if (!b.name.trim() || !b.code.trim()) {
            setErr("Completa el nombre y el código.");
            return;
          }
          if (
            birds.some(
              (x) =>
                x.id !== b.id &&
                x.code.trim().toLowerCase() === b.code.trim().toLowerCase(),
            )
          ) {
            setErr("Ese código ya existe. Elige un código único.");
            return;
          }
          if (
            (b.father && b.father === b.mother) ||
            cycle(b.father) ||
            cycle(b.mother)
          ) {
            setErr(
              "Revisa los progenitores: no pueden coincidir ni crear un ciclo en el linaje.",
            );
            return;
          }
          if (!validPL(b.pl)) {
            setErr(
              `${cfg.plLabel} debe ser un número entero igual o mayor que cero.`,
            );
            return;
          }
          if (!validWeight(b.weightKg)) {
            setErr(
              "El peso debe ser mayor que cero, en kilogramos y con hasta 3 decimales.",
            );
            return;
          }
          if (
            b.birth > today() ||
            b.arrival > today() ||
            b.lastReview > today()
          ) {
            setErr(
              "Las fechas de nacimiento, ingreso y última revisión no pueden estar en el futuro.",
            );
            return;
          }
          await submit({ ...b, name: b.name.trim(), code: b.code.trim() });
        }}
      >
        <p className="form-intro">
          Lo esencial para conocerlo y cuidarlo. Los campos con * son
          obligatorios.
        </p>
        <div className="form-grid">
          {[
            ["name", "Nombre *", "text"],
            ["code", "Código único *", "text"],
            ["birth", "Fecha de nacimiento", "date"],
            ["age", "Edad aproximada (si no conoces la fecha)", "text"],
            ["breed", cfg.catalogs.breed.label, "text"],
            ["color", cfg.catalogs.color.label, "text"],
            ["origin", "Procedencia (opcional)", "text"],
            ["mark", "Marca o identificación visible (opcional)", "text"],
          ].map(([k, label, type]) => (
            <label key={k}>
              {label}
              <input
                required={["name", "code"].includes(k)}
                maxLength={150}
                list={
                  ["breed", "color"].includes(k) ? `options-${k}` : undefined
                }
                type={type}
                max={type === "date" ? today() : undefined}
                value={String(b[k as keyof Bird] ?? "")}
                onChange={(e) => field(k as keyof Bird, e.target.value)}
              />
            </label>
          ))}
          <datalist id="options-breed">
            {cfg.catalogs.breed.options.map((v) => (
              <option key={v} value={v} />
            ))}
          </datalist>
          <datalist id="options-color">
            {cfg.catalogs.color.options.map((v) => (
              <option key={v} value={v} />
            ))}
          </datalist>
          <label>
            Criadero actual (opcional)
            <select
              value={b.farmId || ""}
              onChange={(e) => field("farmId", e.target.value)}
            >
              <option value="">Sin criadero asignado</option>
              {farms.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
            <small className="field-help">
              Crea o edita los criaderos en la pestaña «Criaderos».
            </small>
          </label>
          <label>
            {cfg.catalogs.purpose.label} (opcional)
            <select
              value={b.purpose || ""}
              onChange={(e) => field("purpose", e.target.value)}
            >
              <option value="">Sin datos registrados</option>
              {cfg.catalogs.purpose.options.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </label>
          <label>
            {cfg.plLabel} (opcional)
            <input
              type="number"
              inputMode="numeric"
              min="0"
              max="9007199254740991"
              step="1"
              aria-describedby="pl-help"
              placeholder="Sin datos registrados"
              value={b.pl ?? ""}
              onChange={(e) => field("pl", e.target.value)}
            />
            <small id="pl-help" className="field-help">
              Cantidad de criaderos que ha tenido. No requiere indicar cuáles.
            </small>
          </label>
          <label>
            Peso en kg (opcional)
            <input
              type="number"
              inputMode="decimal"
              min="0.001"
              step="0.001"
              placeholder="Ej.: 2,5"
              value={b.weightKg ?? ""}
              onChange={(e) => field("weightKg", e.target.value)}
            />
          </label>
          {[
            ["father", "Padre"],
            ["mother", "Madre"],
          ].map(([k, label]) => (
            <label key={k}>
              {label}
              <select
                value={b[k as "father" | "mother"]}
                onChange={(e) => field(k as keyof Bird, e.target.value)}
              >
                <option value="">Sin datos registrados</option>
                {birds
                  .filter((x) => x.id !== b.id)
                  .map((x) => (
                    <option value={x.id} key={x.id}>
                      {x.name} · {x.code}
                    </option>
                  ))}
              </select>
            </label>
          ))}
          <label>
            Fecha de ingreso
            <input
              type="date"
              max={today()}
              value={b.arrival}
              onChange={(e) => field("arrival", e.target.value)}
            />
          </label>
          <label>
            {cfg.catalogs.status.label}
            <select
              value={b.status}
              onChange={(e) => field("status", e.target.value)}
            >
              {cfg.catalogs.status.options.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label>
            Última revisión
            <input
              type="date"
              max={today()}
              value={b.lastReview}
              onChange={(e) => field("lastReview", e.target.value)}
            />
          </label>
        </div>
        <label className="full-label">
          Notas generales
          <textarea
            rows={3}
            maxLength={10000}
            value={b.notes}
            onChange={(e) => field("notes", e.target.value)}
            placeholder="Identificación, alojamiento o cuidados que quieras recordar…"
          />
        </label>
        <h3>Fotos (opcional)</h3>
        <label
          className="drop-zone"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            void photos(e.dataTransfer.files);
          }}
        >
          <ImagePlus size={25} />
          <strong>Adjuntar imágenes o arrastrar aquí</strong>
          <span>JPG o PNG · Máximo 5 MB por foto · Hasta 8 fotos</span>
          <input
            type="file"
            accept="image/jpeg,image/png"
            multiple
            disabled={uploading}
            onChange={(e) => void photos(e.target.files)}
          />
        </label>
        <div className="photo-previews">
          {b.photos.map((p, i) => (
            <div key={i}>
              <Photo source={p} alt={`Foto seleccionada ${i + 1}`} />
              <button
                type="button"
                aria-label={`Quitar foto ${i + 1}`}
                disabled={uploading}
                onClick={() =>
                  setB((x) => ({
                    ...x,
                    photos: x.photos.filter((_, n) => n !== i),
                  }))
                }
              >
                <X size={15} />
              </button>
            </div>
          ))}
        </div>
        {err && (
          <p className="form-error" role="alert">
            {err}
          </p>
        )}
        <div className="modal-actions">
          <button type="button" className="btn" onClick={close}>
            Cancelar
          </button>
          <button className="btn primary" disabled={busy || uploading}>
            {uploading
              ? "Procesando fotos…"
              : busy
                ? "Guardando…"
                : "Guardar registro"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
function EventForm({
  event,
  birds,
  close,
  submit,
  busy,
}: {
  event: HealthEvent;
  birds: Bird[];
  close: () => void;
  submit: (e: HealthEvent) => Promise<void>;
  busy: boolean;
}) {
  const cfg = useSettings();
  const [e, setE] = useState({ ...event }),
    [err, setErr] = useState("");
  return (
    <Modal title="Registrar salud y cuidados" close={close}>
      <form
        onSubmit={async (x) => {
          x.preventDefault();
          if (e.followUp && e.followUp < e.date) {
            setErr(
              "El seguimiento debe ser igual o posterior a la fecha del evento.",
            );
            return;
          }
          await submit(e);
        }}
      >
        <div className="form-grid">
          <label>
            Gallo
            <select
              value={e.birdId}
              onChange={(x) => setE({ ...e, birdId: x.target.value })}
            >
              <option value="">Todo el criadero</option>
              {birds.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} · {b.code}
                </option>
              ))}
            </select>
          </label>
          <label>
            {cfg.catalogs.eventType.label} *
            <select
              value={e.type}
              onChange={(x) => setE({ ...e, type: x.target.value })}
            >
              {cfg.catalogs.eventType.options.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          <label>
            Fecha *
            <input
              type="date"
              required
              value={e.date}
              onChange={(x) => setE({ ...e, date: x.target.value })}
            />
          </label>
          <label>
            Próximo control / seguimiento
            <input
              type="date"
              min={e.date}
              value={e.followUp}
              onChange={(x) => setE({ ...e, followUp: x.target.value })}
            />
          </label>
        </div>
        <label className="full-label">
          Notas
          <textarea
            rows={4}
            value={e.notes}
            onChange={(x) => setE({ ...e, notes: x.target.value })}
            placeholder="Observaciones o indicaciones del veterinario…"
          />
        </label>
        {e.type === "Tratamiento veterinario" && (
          <p className="help">
            Registra únicamente tratamientos indicados por un veterinario.
          </p>
        )}
        <label className="checkbox">
          <input
            type="checkbox"
            checked={e.done}
            onChange={(x) => setE({ ...e, done: x.target.checked })}
          />
          Evento completado
        </label>
        {err && (
          <p role="alert" className="form-error">
            {err}
          </p>
        )}
        <div className="modal-actions">
          <button type="button" className="btn" onClick={close}>
            Cancelar
          </button>
          <button className="btn primary" disabled={busy}>
            {busy ? "Guardando…" : "Guardar evento"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
