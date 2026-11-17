import { AdminAccess, RecoverySettings } from "./AdminAccess";
import { CustomCategories } from "./CustomFields";
import { useEffect, useState } from "react";
import {
  LockKeyhole,
  Plus,
  Trash2,
  Settings,
  ShieldCheck,
  Save,
} from "lucide-react";
import { type Database } from "./data";
import {
  getSettings,
  applySettings,
  catalogKeys,
  type CatalogKey,
  type RenameMap,
} from "./settings";
import { setPIN } from "./admin-pin";
import { Modal } from "./Modal";
type Row = { original: string; value: string };
export function AdminPage({
  db,
  save,
  busy,
}: {
  db: Database;
  save: (d: Database, m: string) => Promise<boolean>;
  busy: boolean;
}) {
  const [unlocked, setUnlocked] = useState(false),
    [pin, setPin] = useState(""),
    [repeat, setRepeat] = useState(""),
    [error, setError] = useState(""),
    [checking, setChecking] = useState(false),
    [changing, setChanging] = useState(false),
    [notice, setNotice] = useState("");
  useEffect(() => {
    if (!unlocked) return;
    const timer = setTimeout(
      () => {
        setUnlocked(false);
        setPin("");
        setChanging(false);
      },
      10 * 60 * 1000,
    );
    return () => clearTimeout(timer);
  }, [unlocked]);
  if (!unlocked) return <AdminAccess unlock={() => setUnlocked(true)} />;
  return (
    <>
      {notice && (
        <p className="admin-notice" role="status">
          {notice}
        </p>
      )}
      <div className="admin-toolbar">
        <span>
          <ShieldCheck size={17} />
          Administración desbloqueada
        </span>
        <button
          className="btn"
          onClick={() => {
            setPin("");
            setRepeat("");
            setError("");
            setChanging(true);
          }}
        >
          Cambiar PIN
        </button>
        <button className="btn" onClick={() => setUnlocked(false)}>
          <LockKeyhole size={15} />
          Bloquear
        </button>
      </div>
      <RecoverySettings />
      <CatalogEditor
        key={JSON.stringify(db.settings)}
        db={db}
        save={save}
        busy={busy}
      />
      <CustomCategories
        key={JSON.stringify(db.settings) + "custom"}
        db={db}
        save={save}
        busy={busy}
      />
      {changing && (
        <Modal title="Cambiar PIN local" close={() => setChanging(false)}>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setError("");
              setChecking(true);
              try {
                if (pin !== repeat) throw Error("Los PIN no coinciden.");
                await setPIN(pin);
                setPin("");
                setRepeat("");
                setChanging(false);
                setNotice("PIN actualizado correctamente.");
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setChecking(false);
              }
            }}
          >
            <label>
              Nuevo PIN
              <input
                type="password"
                autoComplete="new-password"
                inputMode="numeric"
                pattern="[0-9]{6,12}"
                required
                value={pin}
                onChange={(e) => setPin(e.target.value)}
              />
            </label>
            <label>
              Repetir PIN
              <input
                type="password"
                autoComplete="new-password"
                inputMode="numeric"
                pattern="[0-9]{6,12}"
                required
                value={repeat}
                onChange={(e) => setRepeat(e.target.value)}
              />
            </label>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <div className="modal-actions">
              <button
                className="btn"
                type="button"
                onClick={() => setChanging(false)}
              >
                Cancelar
              </button>
              <button className="btn primary" disabled={checking}>
                Guardar PIN
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
function CatalogEditor({
  db,
  save,
  busy,
}: {
  db: Database;
  save: (d: Database, m: string) => Promise<boolean>;
  busy: boolean;
}) {
  const [settings, setSettings] = useState(() => getSettings(db)),
    [rows, setRows] = useState(
      () =>
        Object.fromEntries(
          catalogKeys.map((k) => [
            k,
            getSettings(db).catalogs[k].options.map((v) => ({
              original: v,
              value: v,
            })),
          ]),
        ) as Record<CatalogKey, Row[]>,
    ),
    [error, setError] = useState(""),
    [pending, setPending] = useState<Database | null>(null);
  const reset = () => {
    const s = getSettings(db);
    setSettings(s);
    setRows(
      Object.fromEntries(
        catalogKeys.map((k) => [
          k,
          s.catalogs[k].options.map((v) => ({ original: v, value: v })),
        ]),
      ) as Record<CatalogKey, Row[]>,
    );
    setError("");
  };
  function prepare() {
    setError("");
    try {
      const next = structuredClone(settings),
        renames: RenameMap = {};
      for (const k of catalogKeys) {
        next.catalogs[k].options = rows[k].map((r) => r.value.trim());
        renames[k] = Object.fromEntries(
          rows[k]
            .filter((r) => r.original && r.original !== r.value.trim())
            .map((r) => [r.original, r.value.trim()]),
        );
      }
      setPending(applySettings(db, next, renames));
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <section className="panel catalog-editor">
      <div className="section-head">
        <div>
          <h2>
            <Settings size={20} />
            Nombres y opciones de clasificación
          </h2>
          <p>
            Cambia los textos visibles. Los datos numéricos, fechas y relaciones
            mantienen su función y validación.
          </p>
        </div>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          prepare();
        }}
      >
        <div className="pl-settings">
          <label>
            Nombre visible del campo PL
            <input
              required
              maxLength={60}
              value={settings.plLabel}
              onChange={(e) =>
                setSettings({ ...settings, plLabel: e.target.value })
              }
            />
          </label>
          <p className="help">
            Tipo fijo: entero opcional, igual o mayor que cero. Sigue indicando
            la cantidad de criaderos que ha tenido el gallo. Cambiar su nombre
            no cambia los valores guardados.
          </p>
        </div>
        <div className="catalog-grid">
          {catalogKeys.map((k) => (
            <fieldset key={k}>
              <legend>{getSettings(db).catalogs[k].label}</legend>
              <label>
                Nombre de la categoría
                <input
                  required
                  maxLength={60}
                  value={settings.catalogs[k].label}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      catalogs: {
                        ...settings.catalogs,
                        [k]: { ...settings.catalogs[k], label: e.target.value },
                      },
                    })
                  }
                />
              </label>
              <p className="help">
                {settings.catalogs[k].active === false
                  ? "Categoría retirada del formulario. Sus datos se conservan."
                  : "Categoría activa en el formulario."}
              </p>
              <button
                type="button"
                className="btn"
                disabled={busy}
                onClick={() =>
                  setSettings({
                    ...settings,
                    catalogs: {
                      ...settings.catalogs,
                      [k]: {
                        ...settings.catalogs[k],
                        active: settings.catalogs[k].active === false,
                      },
                    },
                  })
                }
              >
                {settings.catalogs[k].active === false
                  ? "Restaurar categoría"
                  : "Retirar categoría del formulario"}
              </button>
              <h3>Opciones disponibles</h3>
              {rows[k].map((r, i) => (
                <div className="catalog-option" key={i}>
                  <label>
                    <span className="sr-only">
                      Opción {i + 1} de {settings.catalogs[k].label}
                    </span>
                    <input
                      required
                      maxLength={120}
                      value={r.value}
                      onChange={(e) =>
                        setRows({
                          ...rows,
                          [k]: rows[k].map((x, n) =>
                            n === i ? { ...x, value: e.target.value } : x,
                          ),
                        })
                      }
                    />
                  </label>
                  <button
                    className="icon-btn danger"
                    type="button"
                    aria-label={`Quitar opción ${r.value || i + 1}`}
                    onClick={() =>
                      setRows({
                        ...rows,
                        [k]: rows[k].filter((_, n) => n !== i),
                      })
                    }
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="text-button"
                onClick={() =>
                  setRows({
                    ...rows,
                    [k]: [...rows[k], { original: "", value: "" }],
                  })
                }
              >
                <Plus size={15} />
                Añadir opción
              </button>
            </fieldset>
          ))}
        </div>
        <p className="help">
          Al renombrar una opción se actualizan los registros que la usan. No se
          permite eliminar opciones en uso. Las listas de raza y color sirven
          como sugerencias y siguen admitiendo texto libre.
        </p>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="modal-actions">
          <button className="btn" type="button" onClick={reset}>
            Descartar cambios
          </button>
          <button className="btn primary" disabled={busy}>
            <Save size={16} />
            Revisar cambios
          </button>
        </div>
      </form>
      {pending && (
        <Modal
          title="¿Guardar las categorías?"
          close={() => setPending(null)}
          busy={busy}
        >
          <p>
            Los nombres se aplicarán a formularios, filtros, fichas y PDF. Las
            opciones renombradas actualizarán los registros existentes. Los
            tipos de los campos se conservarán.
          </p>
          <div className="modal-actions">
            <button className="btn" onClick={() => setPending(null)}>
              Cancelar
            </button>
            <button
              className="btn primary"
              disabled={busy}
              onClick={async () => {
                if (await save(pending, "Categorías actualizadas.")) {
                  setPending(null);
                  setRows(
                    Object.fromEntries(
                      catalogKeys.map((k) => [
                        k,
                        pending.settings!.catalogs[k].options.map((v) => ({
                          original: v,
                          value: v,
                        })),
                      ]),
                    ) as Record<CatalogKey, Row[]>,
                  );
                }
              }}
            >
              Guardar cambios
            </button>
          </div>
        </Modal>
      )}
    </section>
  );
}
