import { useEffect, useState, type ReactNode } from "react";
export function usePagination<T>(items: T[], initial = 20) {
  const [page, setPage] = useState(1),
    [size, setSize] = useState(initial);
  useEffect(() => setPage(1), [items]);
  const pages = Math.max(1, Math.ceil(items.length / size)),
    current = Math.min(page, pages);
  return {
    page: current,
    size,
    pages,
    setPage,
    setSize: (next: number) => {
      setSize(next);
      setPage(1);
    },
    items: items.slice((current - 1) * size, current * size),
  };
}
export function Pagination({
  pager,
  total,
  label,
}: {
  pager: ReturnType<typeof usePagination>;
  total: number;
  label: string;
}) {
  if (total <= 20) return null;
  return (
    <nav className="pagination" aria-label={label}>
      <span>
        {(pager.page - 1) * pager.size + 1}–
        {Math.min(pager.page * pager.size, total)} de {total}
      </span>
      <div className="pagination-controls">
        <label>
          Por página
          <select
            value={pager.size}
            onChange={(e) => pager.setSize(Number(e.target.value))}
          >
            {[20, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <button
          className="btn"
          disabled={pager.page === 1}
          onClick={() => pager.setPage((p) => p - 1)}
        >
          Anterior
        </button>
        <label>
          Página
          <input
            aria-label={`Página actual de ${label}`}
            type="number"
            min={1}
            max={pager.pages}
            value={pager.page}
            onChange={(e) =>
              pager.setPage(
                Math.max(1, Math.min(pager.pages, Number(e.target.value) || 1)),
              )
            }
          />
        </label>
        <span>de {pager.pages}</span>
        <button
          className="btn"
          disabled={pager.page === pager.pages}
          onClick={() => pager.setPage((p) => p + 1)}
        >
          Siguiente
        </button>
      </div>
    </nav>
  );
}
export function PagedList<T>({
  items,
  label,
  children,
}: {
  items: T[];
  label: string;
  children: (page: T[]) => ReactNode;
}) {
  const pager = usePagination(items);
  return (
    <>
      {children(pager.items)}
      <Pagination pager={pager} total={items.length} label={label} />
    </>
  );
}
