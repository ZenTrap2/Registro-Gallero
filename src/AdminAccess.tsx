import { useEffect, useState } from "react";
import { KeyRound, LockKeyhole } from "lucide-react";
import {
  hasPIN,
  checkPIN,
  setPIN,
  accessMethods,
  checkMasterPIN,
  recoverPIN,
  configureAccess,
} from "./admin-pin";
export function AdminAccess({ unlock }: { unlock: () => void }) {
  const [exists, setExists] = useState(false),
    [mode, setMode] = useState<"pin" | "recovery" | "master">("pin"),
    [pin, setPin] = useState(""),
    [repeat, setRepeat] = useState(""),
    [answer, setAnswer] = useState(""),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [methods, setMethods] = useState({
      question: "",
      recovery: false,
      master: false,
    });
  useEffect(() => {
    try {
      setExists(hasPIN());
      setMethods(accessMethods());
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);
  const changeMode = (next: typeof mode) => {
    setMode(next);
    setPin("");
    setRepeat("");
    setAnswer("");
    setError("");
    setNotice("");
  };
  return (
    <section className="panel admin-lock">
      <span className="lock-icon">
        <LockKeyhole size={30} />
      </span>
      <h2>
        {mode === "recovery"
          ? "Restablecer PIN"
          : mode === "master"
            ? "Acceso con PIN maestro"
            : "Administración de categorías"}
      </h2>
      <p>
        {!exists
          ? "Crea un PIN local de 6 a 12 dígitos. Después podrás configurar recuperación y PIN maestro."
          : mode === "recovery"
            ? "Responde la pregunta configurada y elige un nuevo PIN principal."
            : mode === "master"
              ? "Introduce el PIN maestro que configuraste en este dispositivo."
              : "Introduce tu PIN principal."}
      </p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setError("");
          setNotice("");
          setBusy(true);
          try {
            if (mode === "recovery") {
              if (pin !== repeat) throw Error("Los PIN no coinciden.");
              await recoverPIN(answer, pin);
              changeMode("pin");
              setNotice("PIN restablecido. Accede con tu nuevo PIN.");
            } else if (mode === "master") {
              if (!(await checkMasterPIN(pin)))
                throw Error("PIN maestro incorrecto.");
              unlock();
            } else {
              if (exists) {
                if (!(await checkPIN(pin)))
                  throw Error("PIN incorrecto. Inténtalo de nuevo.");
              } else {
                if (pin !== repeat) throw Error("Los PIN no coinciden.");
                await setPIN(pin);
                setExists(true);
              }
              unlock();
            }
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {mode === "recovery" && (
          <>
            <p>
              <strong>Pregunta de recuperación:</strong> {methods.question}
            </p>
            <label>
              Respuesta de recuperación
              <input
                autoComplete="off"
                type="password"
                value={answer}
                maxLength={200}
                required
                disabled={busy}
                onChange={(e) => setAnswer(e.target.value)}
              />
            </label>
          </>
        )}
        <label>
          {mode === "recovery"
            ? "Nuevo PIN"
            : mode === "master"
              ? "PIN maestro"
              : "PIN"}
          <input
            autoComplete={
              mode === "recovery" || !exists
                ? "new-password"
                : "current-password"
            }
            type="password"
            inputMode="numeric"
            pattern="[0-9]{6,12}"
            minLength={6}
            maxLength={12}
            required
            disabled={busy}
            value={pin}
            onChange={(e) => setPin(e.target.value)}
          />
        </label>
        {(mode === "recovery" || !exists) && (
          <label>
            Repetir PIN
            <input
              autoComplete="new-password"
              type="password"
              inputMode="numeric"
              pattern="[0-9]{6,12}"
              minLength={6}
              maxLength={12}
              required
              disabled={busy}
              value={repeat}
              onChange={(e) => setRepeat(e.target.value)}
            />
          </label>
        )}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {notice && <p role="status">{notice}</p>}
        <button className="btn primary" disabled={busy}>
          {busy
            ? "Comprobando…"
            : mode === "recovery"
              ? "Restablecer PIN"
              : exists
                ? "Desbloquear"
                : "Crear PIN y acceder"}
        </button>
      </form>
      {exists && (
        <div className="access-alternatives">
          {mode === "pin" ? (
            <>
              <button
                className="text-button"
                disabled={busy}
                onClick={() =>
                  methods.recovery
                    ? changeMode("recovery")
                    : setError(
                        "Aún no configuraste una pregunta de recuperación en este dispositivo. Puedes usar el PIN maestro si lo configuraste.",
                      )
                }
              >
                ¿Olvidaste tu PIN?
              </button>
              <button
                className="text-button"
                disabled={busy}
                onClick={() =>
                  methods.master
                    ? changeMode("master")
                    : setError(
                        "Aún no configuraste un PIN maestro en este dispositivo.",
                      )
                }
              >
                <KeyRound size={14} />
                Otro método de acceso
              </button>
            </>
          ) : (
            <button
              className="text-button"
              disabled={busy}
              onClick={() => changeMode("pin")}
            >
              Volver al PIN principal
            </button>
          )}
        </div>
      )}
      <p className="help">
        Métodos guardados solo en este dispositivo. Protegen cambios casuales,
        no sustituyen permisos de una cuenta. Las respuestas y PIN se guardan
        como hashes con sal y no se incluyen en las exportaciones. Sin un método
        alternativo configurado no se puede recuperar un PIN olvidado.
      </p>
    </section>
  );
}
export function RecoverySettings() {
  const [methods, setMethods] = useState(() => accessMethods()),
    [open, setOpen] = useState(false),
    [current, setCurrent] = useState(""),
    [question, setQuestion] = useState(methods.question),
    [answer, setAnswer] = useState(""),
    [master, setMaster] = useState(""),
    [repeat, setRepeat] = useState(""),
    [removeRecovery, setRemoveRecovery] = useState(false),
    [removeMaster, setRemoveMaster] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  return (
    <section className="panel recovery-settings">
      <h2>Métodos de acceso y recuperación</h2>
      <p>
        Pregunta de recuperación:{" "}
        {methods.recovery ? "Configurada" : "Pendiente"} · PIN maestro:{" "}
        {methods.master ? "Configurado" : "Pendiente"}
      </p>
      {notice && <p role="status">{notice}</p>}
      <button className="btn" disabled={busy} onClick={() => setOpen(!open)}>
        <KeyRound size={16} />
        {open ? "Cerrar configuración" : "Configurar métodos de acceso"}
      </button>
      {open && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setError("");
            setBusy(true);
            try {
              if (master !== repeat)
                throw Error("Los PIN maestros no coinciden.");
              await configureAccess(current, {
                question,
                answer,
                master,
                removeRecovery,
                removeMaster,
              });
              setMethods(accessMethods());
              setQuestion(accessMethods().question);
              setCurrent("");
              setAnswer("");
              setMaster("");
              setRepeat("");
              setRemoveRecovery(false);
              setRemoveMaster(false);
              setOpen(false);
              setNotice("Métodos de acceso actualizados.");
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <div className="form-grid">
            <label>
              PIN principal o maestro actual
              <input
                type="password"
                autoComplete="current-password"
                required
                disabled={busy}
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
              />
            </label>
            <label>
              Pregunta de recuperación
              <input
                maxLength={200}
                disabled={busy || removeRecovery}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
              />
            </label>
            <label>
              Respuesta de recuperación
              <input
                autoComplete="new-password"
                type="password"
                maxLength={200}
                disabled={busy || removeRecovery}
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
              />
            </label>
            <label>
              Nuevo PIN maestro
              <input
                autoComplete="new-password"
                type="password"
                inputMode="numeric"
                pattern="[0-9]{6,12}"
                disabled={busy || removeMaster}
                value={master}
                onChange={(e) => setMaster(e.target.value)}
              />
            </label>
            <label>
              Repetir PIN maestro
              <input
                autoComplete="new-password"
                type="password"
                inputMode="numeric"
                pattern="[0-9]{6,12}"
                disabled={busy || removeMaster}
                value={repeat}
                onChange={(e) => setRepeat(e.target.value)}
              />
            </label>
          </div>
          <p className="help">
            Deja vacíos la respuesta y el PIN maestro para conservar los
            actuales. La respuesta ignora mayúsculas y espacios sobrantes; las
            tildes sí cuentan. Elige una respuesta que no puedan adivinar y
            guarda el PIN maestro aparte.
          </p>
          {methods.recovery && (
            <label className="checkbox">
              <input
                type="checkbox"
                checked={removeRecovery}
                onChange={(e) => setRemoveRecovery(e.target.checked)}
              />
              Desactivar recuperación por pregunta
            </label>
          )}
          {methods.master && (
            <label className="checkbox">
              <input
                type="checkbox"
                checked={removeMaster}
                onChange={(e) => setRemoveMaster(e.target.checked)}
              />
              Desactivar PIN maestro
            </label>
          )}
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
          <button className="btn primary" disabled={busy}>
            {busy ? "Guardando…" : "Guardar métodos de acceso"}
          </button>
        </form>
      )}
    </section>
  );
}
