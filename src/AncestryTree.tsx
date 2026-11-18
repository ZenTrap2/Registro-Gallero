import { useRef, type CSSProperties } from "react";
import {
  ancestorLabel,
  ancestorPaths,
  generationNames,
  type AncestorEntry,
} from "./ancestry";

const generations = generationNames.map((label, index) => ({
  label,
  paths: ancestorPaths(index + 1),
}));

const branches = [
  { prefix: "f", label: "Rama paterna" },
  { prefix: "m", label: "Rama materna" },
] as const;

export function AncestryTree({
  name,
  selectedPath,
  entries,
  select,
}: {
  name: string;
  selectedPath: string;
  entries: ReadonlyMap<string, AncestorEntry | undefined>;
  select: (path: string) => void;
}) {
  const chart = useRef<HTMLDivElement>(null);
  function navigate(path: string) {
    select(path);
    requestAnimationFrame(() => {
      const region = chart.current;
      const node = region?.querySelector<HTMLElement>(`[data-path="${path}"]`);
      if (!region || !node) return;
      const bounds = region.getBoundingClientRect();
      const card = node.getBoundingClientRect();
      const headerHeight =
        region.querySelector(".ancestor-tree-head")?.getBoundingClientRect()
          .height ?? 0;
      if (card.top < bounds.top + headerHeight || card.bottom > bounds.bottom) {
        region.scrollTop += card.top - bounds.top - headerHeight - 10;
      }
    });
  }
  return (
    <>
      <div className="ancestor-overview">
        <div className="ancestor-root">
          <span>Ficha del animal</span>
          <strong>{name.trim() || "Nuevo animal"}</strong>
        </div>
        <nav
          className="ancestor-generations"
          aria-label="Generaciones del árbol"
        >
          {generations.map(({ label, paths }, index) => (
            <button
              type="button"
              className="btn"
              key={label}
              aria-label={label}
              aria-pressed={selectedPath.length === index + 1}
              onClick={() =>
                navigate(
                  selectedPath.slice(0, index + 1).padEnd(index + 1, "f"),
                )
              }
            >
              <span>{label}</span>
              <small aria-hidden="true">
                {paths.filter((path) => entries.get(path)?.name?.trim()).length}
                /{paths.length}
              </small>
            </button>
          ))}
        </nav>
      </div>
      <nav className="ancestor-branch-links" aria-label="Ir a una rama">
        {branches.map(({ prefix, label }) => (
          <button
            key={prefix}
            type="button"
            className="text-button"
            data-side={prefix}
            onClick={() => navigate(prefix + selectedPath.slice(1))}
          >
            {label}
          </button>
        ))}
      </nav>
      <div
        className="ancestor-tree-scroll"
        role="region"
        aria-label="Árbol de cuatro generaciones"
        tabIndex={0}
        ref={chart}
      >
        <div className="ancestor-tree-head" aria-hidden="true">
          {generationNames.map((label) => (
            <strong key={label}>{label}</strong>
          ))}
        </div>
        {branches.map(({ prefix, label }) => (
          <section
            className="ancestor-family"
            data-side={prefix}
            key={prefix}
            aria-label={label}
          >
            <h3>{label}</h3>
            <div className="ancestor-tree">
              {generations.map(({ label, paths }, index) => {
                const positions = paths.filter((path) =>
                  path.startsWith(prefix),
                );
                const span = 8 / positions.length;
                return (
                  <div
                    className="ancestor-generation"
                    key={label}
                    data-current={selectedPath.length === index + 1}
                  >
                    {positions.map((path, position) => {
                      const entry = entries.get(path);
                      const name = entry?.name?.trim();
                      const status = entry?.birdId
                        ? "Vinculado"
                        : name
                          ? "Manual"
                          : "Sin registrar";
                      return (
                        <div
                          key={path}
                          className="ancestor-position"
                          data-root={index === 0}
                          data-first={position % 2 === 0}
                          data-next={index < generations.length - 1}
                          style={
                            {
                              gridRow: `${1 + position * span} / span ${span}`,
                              "--branch-span": span,
                            } as CSSProperties
                          }
                        >
                          <button
                            type="button"
                            className="ancestor-node"
                            data-path={path}
                            data-empty={!name}
                            data-trail={selectedPath.startsWith(path)}
                            aria-label={`${ancestorLabel(path)} ${name || "Añadir ancestro"}`}
                            aria-pressed={path === selectedPath}
                            onClick={() => select(path)}
                          >
                            <small>{ancestorLabel(path)}</small>
                            <strong title={name}>
                              {name || "Añadir ancestro"}
                            </strong>
                            <span className="ancestor-state">{status}</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
      <nav
        className="ancestor-trail"
        aria-label="Ruta del ancestro seleccionado"
      >
        <span>
          {selectedPath.startsWith("f") ? "Rama paterna" : "Rama materna"}
        </span>
        {Array.from(selectedPath, (_, index) => {
          const path = selectedPath.slice(0, index + 1);
          const label = ancestorLabel(path);
          return path === selectedPath ? (
            <strong key={path} aria-current="true">
              {label}
            </strong>
          ) : (
            <button
              key={path}
              className="text-button"
              type="button"
              onClick={() => navigate(path)}
            >
              {label}
            </button>
          );
        })}
      </nav>
    </>
  );
}
