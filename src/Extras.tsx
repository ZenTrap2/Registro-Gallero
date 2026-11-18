import { useSettings } from "./SettingsContext";
import { useState, useMemo } from "react";
import {
  Plus,
  Pencil,
  Warehouse,
  HelpCircle,
  Search,
  Download,
} from "lucide-react";
import { type Database, type Farm, type BirdFilters, purposes } from "./data";
import { Modal } from "./Modal";
export function FarmPage({
  db,
  save,
  busy,
}: {
  db: Database;
  save: (d: Database, m: string) => Promise<boolean>;
  busy: boolean;
}) {
  const [edit, setEdit] = useState<Farm | null>(null),
    [error, setError] = useState("");
  const counts = useMemo(() => {
    const result = new Map<string, number>();
    for (const bird of db.birds)
      if (bird.farmId)
        result.set(bird.farmId, (result.get(bird.farmId) || 0) + 1);
    return result;
  }, [db.birds]);
  return (
    <>
      <section className="panel">
        <div className="section-head">
          <div>
            <h2>Criaderos registrados</h2>
            <p>
              Organiza la ubicación actual de tus gallos. La procedencia se
              registra por separado.
            </p>
          </div>
          <button
            className="btn primary"
            disabled={busy}
            onClick={() => {
              setError("");
              setEdit({
                id: crypto.randomUUID(),
                name: "",
                location: "",
                contact: "",
                notes: "",
              });
            }}
          >
            <Plus size={17} />
            Nuevo criadero
          </button>
        </div>
        <div className="farm-grid">
          {(db.farms || []).map((f) => (
            <article className="farm-card" key={f.id}>
              <Warehouse size={25} />
              <div>
                <h3>{f.name}</h3>
                <p>{f.location || "Sin ubicación registrada"}</p>
                <p>{f.contact || "Sin contacto registrado"}</p>
                <p className="preserve">{f.notes || "Sin notas registradas"}</p>
                <span className="badge green">
                  {counts.get(f.id) || 0} gallos
                </span>
              </div>
              <button
                className="icon-btn"
                aria-label={`Editar criadero ${f.name}`}
                onClick={() => {
                  setError("");
                  setEdit({ ...f });
                }}
              >
                <Pencil size={18} />
              </button>
            </article>
          ))}
        </div>
        {!db.farms?.length && (
          <div className="empty">
            <Warehouse />
            Aún no hay criaderos. Crea uno y asígnalo desde el registro de un
            gallo.
          </div>
        )}
      </section>
      {edit && (
        <Modal
          title={
            (db.farms || []).some((f) => f.id === edit.id)
              ? "Editar criadero"
              : "Registrar criadero"
          }
          close={() => setEdit(null)}
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!edit.name.trim()) {
                setError("Escribe el nombre del criadero.");
                return;
              }
              if (
                (db.farms || []).some(
                  (f) =>
                    f.id !== edit.id &&
                    f.name.trim().toLowerCase() ===
                      edit.name.trim().toLowerCase(),
                )
              ) {
                setError("Ya existe un criadero con ese nombre.");
                return;
              }
              const f = { ...edit, name: edit.name.trim() },
                farms = db.farms || [];
              if (
                await save(
                  {
                    ...db,
                    farms: farms.some((x) => x.id === f.id)
                      ? farms.map((x) => (x.id === f.id ? f : x))
                      : [...farms, f],
                  },
                  "Criadero guardado.",
                )
              )
                setEdit(null);
            }}
          >
            <div className="form-grid">
              {[
                ["name", "Nombre del criadero *"],
                ["location", "Ubicación"],
                ["contact", "Contacto"],
              ].map(([k, label]) => (
                <label key={k}>
                  {label}
                  <input
                    required={k === "name"}
                    maxLength={200}
                    value={edit[k as keyof Farm]}
                    onChange={(e) => setEdit({ ...edit, [k]: e.target.value })}
                  />
                </label>
              ))}
            </div>
            <label>
              Notas
              <textarea
                rows={3}
                maxLength={10000}
                value={edit.notes}
                onChange={(e) => setEdit({ ...edit, notes: e.target.value })}
              />
            </label>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <div className="modal-actions">
              <button
                type="button"
                className="btn"
                onClick={() => setEdit(null)}
              >
                Cancelar
              </button>
              <button className="btn primary" disabled={busy}>
                {busy ? "Guardando…" : "Guardar criadero"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
export function AdvancedFilters({
  db,
  filters,
  setFilters,
}: {
  db: Database;
  filters: BirdFilters;
  setFilters: (f: BirdFilters) => void;
}) {
  const cfg = useSettings();
  const change = (k: keyof BirdFilters, v: string) =>
    setFilters({ ...filters, [k]: v });
  return (
    <details className="advanced-filters">
      <summary>
        <Search size={15} />
        Más filtros: criadero, nacimiento, {cfg.plLabel},{" "}
        {cfg.catalogs.purpose.label.toLowerCase()} y peso
      </summary>
      <div className="filters advanced-grid">
        <label>
          Criadero
          <select
            value={filters.farmId}
            onChange={(e) => change("farmId", e.target.value)}
          >
            <option value="">Todos los criaderos</option>
            <option value="unassigned">Sin criadero asignado</option>
            {(db.farms || []).map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Mes de nacimiento
          <select
            value={filters.month}
            onChange={(e) => change("month", e.target.value)}
          >
            <option value="">Todos los meses</option>
            {Array.from({ length: 12 }, (_, i) => (
              <option value={String(i + 1).padStart(2, "0")} key={i}>
                {new Date(2020, i, 1).toLocaleString("es", { month: "long" })}
              </option>
            ))}
          </select>
        </label>
        <label>
          Año de nacimiento
          <select
            value={filters.year}
            onChange={(e) => change("year", e.target.value)}
          >
            <option value="">Todos los años</option>
            {[
              ...new Set(
                db.birds.filter((b) => b.birth).map((b) => b.birth.slice(0, 4)),
              ),
            ]
              .sort()
              .reverse()
              .map((y) => (
                <option key={y}>{y}</option>
              ))}
          </select>
        </label>
        <label>
          {cfg.plLabel}
          <select
            value={filters.pl || ""}
            onChange={(e) => change("pl", e.target.value)}
          >
            <option value="">Todos los valores</option>
            <option value="unknown">Sin datos registrados</option>
            {[
              ...new Set(
                db.birds
                  .filter((b) => b.pl !== undefined && b.pl !== "")
                  .map((b) => String(Number(b.pl))),
              ),
            ]
              .sort((a, b) => Number(a) - Number(b))
              .map((pl) => (
                <option key={pl} value={pl}>
                  {pl}
                </option>
              ))}
          </select>
        </label>
        <label>
          {cfg.catalogs.purpose.label}
          <select
            value={filters.purpose}
            onChange={(e) => change("purpose", e.target.value)}
          >
            <option value="">Todos los propósitos</option>
            {cfg.catalogs.purpose.options.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </label>
        <label>
          Peso mínimo (kg)
          <input
            type="number"
            min="0"
            step="0.001"
            value={filters.minWeight}
            onChange={(e) => change("minWeight", e.target.value)}
          />
        </label>
        <label>
          Peso máximo (kg)
          <input
            type="number"
            min="0"
            step="0.001"
            value={filters.maxWeight}
            onChange={(e) => change("maxWeight", e.target.value)}
          />
        </label>
      </div>
      {filters.minWeight &&
        filters.maxWeight &&
        Number(filters.minWeight) > Number(filters.maxWeight) && (
          <p className="form-error">
            El peso mínimo supera al máximo. Ajusta el rango para encontrar
            resultados.
          </p>
        )}
      <p className="help">
        La búsqueda también encuentra procedencia, marca, color, notas, fechas y
        nombres de progenitores. Puedes combinar los filtros.
      </p>
    </details>
  );
}
const help = [
  [
    "Estado vital y comprobantes de ascendencia",
    "El animal principal y cada ancestro manual permiten indicar fallecimiento con una casilla opcional y una fecha, también opcional. No se exige esta información ni se inventa para registros antiguos. Puedes adjuntar hasta ocho comprobantes por animal o ancestro: PDF, JPG, PNG, WebP, TXT o DOCX, hasta 10 MB por archivo. En los ancestros, abre Añadir/Editar detalles para adjuntarlos. Se guardan localmente al guardar la ficha; puedes descargarlos o quitarlos antes de guardar. JSON conserva los archivos; CSV no incluye los adjuntos. En la ficha de linaje puedes desplegar los comprobantes del ancestro.",
  ],
  [
    "Pedigrí de cuatro generaciones",
    "El formulario permite registrar padres, abuelos, bisabuelos y tatarabuelos, hasta 30 posiciones. Escribe nombres aunque no existan en la base. «Añadir detalles» guarda una ficha del ancestro dentro del linaje sin crear un animal en Mis gallos. «Añadir desde el registro» vincula un animal y hereda su linaje conocido. No se inventan datos faltantes. Abre «Ancestros» en el formulario y selecciona una posición del árbol para editarla. En PDF aparecen los nombres; activa «Incluir detalles de los ancestros en el PDF» si también quieres sus datos completos.",
  ],
  [
    "Crear y retirar categorías",
    "En Administración puedes crear categorías opcionales de texto, entero, decimal, fecha o lista de opciones. El tipo queda fijo al guardarlas. Retirar una categoría oculta el campo sin borrar sus valores; se puede restaurar. También puedes retirar y restaurar los catálogos del formulario. JSON y CSV conservan las categorías adicionales y el pedigrí; CSV no incluye imágenes.",
  ],
  [
    "Administración de categorías",
    "Accede desde el menú lateral y crea un PIN de 6 a 12 dígitos la primera vez. Puedes cambiar nombres de categorías y añadir, renombrar o quitar opciones. Al renombrar, se actualizan los registros que usan esa opción; no se pueden quitar opciones en uso. Cambiar el nombre de PL mantiene su función de conteo de criaderos y su validación de enteros. La pestaña se bloquea al salir o después de diez minutos. El PIN es local, no se exporta y protege de cambios casuales en la interfaz; no reemplaza los permisos de una cuenta. Puedes configurar una pregunta para restablecer el PIN y un PIN maestro propio desde «Métodos de acceso y recuperación». No hay clave maestra predeterminada ni recuperación por correo.",
  ],
  [
    "PL",
    "PL indica cuántos criaderos ha tenido el gallo. Es un conteo manual, opcional y editable; no necesitas identificar esos criaderos. No se calcula a partir del criadero actual. Usa un número entero igual o mayor que cero o déjalo vacío si no lo sabes. Puedes filtrar por su valor o buscar los registros sin este dato. Se conserva en las fichas PDF y en los archivos JSON y CSV.",
  ],
  [
    "Registrar y editar",
    "El botón «Registrar gallo» permanece visible al desplazarte por cualquier pantalla. Solo nombre y placa/código son obligatorios. Si una placa se repite, confirma expresamente que son animales distintos. Abre una ficha y pulsa «Editar» para cambiar cualquiera de sus datos, fotos o progenitores. El peso se registra en kg y acepta hasta tres decimales.",
  ],
  [
    "Criaderos y procedencia",
    "En «Criaderos» puedes crear y editar nombre, ubicación, contacto y notas. En cada gallo selecciona su criadero actual. Procedencia indica de dónde llegó (criadero de origen, localidad o persona); es un campo independiente y editable. Puedes ver todos los gallos aunque pertenezcan a criaderos distintos.",
  ],
  [
    "Marca y propósito",
    "Marca es una identificación visible, como un anillo o una señal natural. No es necesario realizar marcas físicas para usar esta función. El propósito permite organizar reproducción responsable, conservación de raza, compañía, exhibición avícola o cuidado y recuperación. Ambos campos son opcionales y editables.",
  ],
  [
    "Buscar y filtrar",
    "En «Mis gallos» combina raza y estado con «Más filtros»: criadero, mes o año de nacimiento, propósito y rango de peso. El buscador encuentra también marca, procedencia, color, notas y fechas. «Ver todos / limpiar filtros» elimina todas las restricciones. Los gallos sin fecha conocida no aparecen al filtrar por mes o año.",
  ],
  [
    "Linaje",
    "Asigna padre y madre desde el formulario si existen sus registros. Abre sus fichas desde «Linaje» o desde la ficha individual. Los datos desconocidos se muestran como «Sin datos registrados»; no se inventan parentescos.",
  ],
  [
    "Salud y cuidados",
    "Crea revisiones, vacunas, tratamientos indicados por un veterinario y tareas de alojamiento, alimentación o limpieza. Selecciona un gallo o todo el criadero. La fecha de seguimiento debe ser posterior o igual al evento. Las etiquetas distinguen próximos, vencidos y completados. El lápiz permite editar el evento y la marca de verificación cambiar su estado.",
  ],
  [
    "PDF, JSON y CSV",
    "«Exportar ficha PDF» descarga la ficha abierta, sus fotos y su historial individual de salud. En «Mis gallos» puedes descargar las fichas de los resultados filtrados en un PDF. JSON es la copia completa: incluye criaderos, fotos, linaje y eventos. CSV contiene texto y el nombre del criadero; no incluye fotos, comprobantes ni eventos. PDF es para consultar o compartir, no para restaurar datos.",
  ],
  [
    "Importar y resolver duplicados",
    "Selecciona JSON o CSV desde «Importar datos». Revisa registros, criaderos y errores antes de confirmar. La aplicación señala coincidencias por nombre, placa/código o ID, también dentro del archivo. Decide omitir, reemplazar el destino elegido o conservar ambos con IDs distintos. Puedes aplicar decisiones al lote y ajustar cada caso; no se guarda mientras haya coincidencias pendientes. Los padres y la fecha de nacimiento no bastan para señalar duplicados. Los criaderos existentes se conservan. Los registros antiguos sin campos nuevos siguen siendo compatibles.",
  ],
  [
    "Almacenamiento y copias",
    "Los datos y fotografías se guardan en IndexedDB, solo en este navegador y dispositivo. No se suben a servicios externos ni se sincronizan entre equipos. Mantén una copia JSON: borrar los datos del navegador o cambiar de dirección del sitio puede impedir el acceso. Los registros de demostración son ficticios y se pueden eliminar.",
  ],
];
export function HelpPage() {
  const cfg = useSettings();
  return (
    <section className="panel help-page">
      <div className="section-head">
        <div>
          <h2>
            <HelpCircle size={20} /> Ayuda de Registro Gallero
          </h2>
          <p>Una guía rápida para conocer cada función y cuidar tus datos.</p>
          <p>
            Nombres actuales: {cfg.plLabel} (conteo de criaderos) ·{" "}
            {cfg.catalogs.purpose.label} · {cfg.catalogs.status.label}.
          </p>
        </div>
      </div>
      <div className="help-intro">
        <Download size={23} />
        <p>
          Para guardar una copia completa, elige{" "}
          <strong>Exportar datos → JSON</strong>. Para una ficha legible, abre
          el gallo y elige <strong>Exportar ficha PDF</strong>.
        </p>
      </div>
      <details>
        <summary>Trabajar con muchos gallos y elegir cantidades</summary>
        <p>
          Mis gallos muestra 20, 50 o 100 registros por página. Puedes marcar
          animales en varias páginas, seleccionar todos los resultados del
          filtro o seleccionar una cantidad exacta. La selección se conserva al
          filtrar. Seleccionar cantidad reemplaza la selección por los primeros
          resultados en el orden mostrado.
        </p>
        <p>
          Al importar, revisa los errores y elige los registros o la cantidad
          antes de confirmar. Al exportar, elige todos, seleccionados o
          resultados filtrados y ajusta la cantidad. JSON incluye fotografías;
          CSV contiene texto; en PDF puedes omitir fotos para lotes grandes. Las
          copias parciales incluyen eventos y criaderos vinculados; un padre no
          seleccionado solo se vincula si su código ya existe al importar.
        </p>
        <p>
          Las fotografías se cargan cuando se necesitan. La capacidad depende
          del espacio del dispositivo y del tamaño de las fotos. Consulta el
          almacenamiento en Reportes y conserva copias JSON. Para archivos con
          muchas imágenes, trabaja por lotes; el límite de importación por
          archivo es 512 MB.
        </p>
      </details>
      {help.map(([title, text], i) => (
        <details key={title} open={i === 0}>
          <summary>{title}</summary>
          <p>{text}</p>
        </details>
      ))}
    </section>
  );
}
