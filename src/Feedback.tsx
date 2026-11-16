import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, X, AlertCircle } from "lucide-react";
import type { OperationProgress } from "./storage";
import { subscribeLayers, topLayer } from "./overlays";
export function Feedback({
  error,
  toast,
  clearError,
  clearToast,
  progress,
}: {
  error: string;
  toast: string;
  clearError: () => void;
  clearToast: () => void;
  progress?: OperationProgress | null;
}) {
  const layer = useSyncExternalStore(subscribeLayers, topLayer, () => null),
    host = layer?.querySelector(".modal-feedback");
  const content = (
    <div
      className={host ? "dialog-notifications" : "notifications"}
      aria-label="Avisos de la aplicación"
    >
      <>
        {progress && (
          <div className="operation-progress" role="status">
            <strong>{progress.label}</strong>
            <progress
              max={progress.total || undefined}
              value={progress.total ? progress.completed : undefined}
            />
            <span>
              {progress.total
                ? `${progress.completed} / ${progress.total}`
                : "Procesando…"}
            </span>
          </div>
        )}
      </>
      {error && (
        <div className="error-banner" role="alert">
          <AlertCircle size={20} />
          <span>{error}</span>
          <button type="button" onClick={clearError} aria-label="Cerrar aviso">
            <X size={18} />
          </button>
        </div>
      )}
      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={20} />
          <span>{toast}</span>
          <button
            type="button"
            onClick={clearToast}
            aria-label="Cerrar mensaje"
          >
            <X size={18} />
          </button>
        </div>
      )}
    </div>
  );
  return host ? createPortal(content, host) : content;
}
