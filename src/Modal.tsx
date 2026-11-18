import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { registerLayer } from "./overlays";
export function Modal({
  title,
  children,
  close,
  busy = false,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  close: () => void;
  busy?: boolean;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null),
    titleId = useId();
  useEffect(() => {
    const element = ref.current!;
    element.showModal();
    const release = registerLayer(element);
    return () => {
      release();
      element.close();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={wide ? "wide-dialog" : undefined}
      aria-labelledby={titleId}
      onCancel={(e) => {
        if (e.target !== ref.current) return;
        e.stopPropagation();
        e.preventDefault();
        if (!busy) close();
      }}
      onClick={(e) => {
        if (e.target === ref.current && !busy) close();
      }}
    >
      <div className="modal-head">
        <h2 id={titleId}>{title}</h2>
        <button
          type="button"
          className="icon-btn"
          onClick={close}
          disabled={busy}
          aria-label="Cerrar formulario"
        >
          <X size={21} />
        </button>
      </div>
      <div className="modal-body">
        <div className="modal-feedback" />
        {children}
      </div>
    </dialog>
  );
}
