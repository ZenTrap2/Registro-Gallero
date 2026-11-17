import { describe, it, expect } from "vitest";
import { emptyBird, validateImport, mergeImport } from "../src/data";
import { duplicateIndex } from "../src/import-duplicates";
const bird = (id: string, name = id, code = id) => ({
  ...emptyBird(),
  id,
  name,
  code,
});
describe("Revisión de posibles duplicados", () => {
  it("compara nombre, placa e ID sin usar padres ni nacimiento", () => {
    const a = {
      ...bird("a", "Ámbar", "P-1"),
      birth: "2020-01-01",
      father: "p",
      mother: "m",
    };
    const values = [
      bird("b", " ambar ", "otro"),
      bird("c", "Otro", " p-1 "),
      bird("a", "Renombrado", "Nuevo"),
      { ...bird("d"), birth: a.birth, father: "p", mother: "m" },
    ];
    const index = duplicateIndex([a], values);
    expect(values.map(index.has)).toEqual([true, true, true, false]);
  });
  it("retiene dos placas iguales dentro del archivo y señala la segunda", () => {
    const incoming = validateImport({
      birds: [bird("a", "Uno", "A"), bird("b", "Dos", "A")],
    });
    expect(incoming.errors).toEqual([]);
    expect(incoming.birds).toHaveLength(2);
    const index = duplicateIndex([], incoming.birds);
    expect(index.has(incoming.birds[0])).toBe(false);
    expect(index.has(incoming.birds[1])).toBe(true);
    expect(() => mergeImport({ birds: [], events: [] }, incoming, {})).toThrow(
      "coincidencia",
    );
  });
  it("conservar ambos asigna IDs diferentes sin alterar nombres o placas y separa sus eventos", () => {
    const old = bird("a", "Canelo", "A"),
      incoming = {
        birds: [{ ...old }],
        events: [
          {
            id: "e",
            birdId: "a",
            date: "2026-01-01",
            type: "Control",
            notes: "Nuevo",
            followUp: "",
            done: false,
          },
        ],
      };
    const existing = {
      birds: [old],
      events: [{ ...incoming.events[0], notes: "Anterior" }],
    };
    const result = mergeImport(existing, incoming, { a: { action: "keep" } });
    expect(result.birds).toHaveLength(2);
    expect(result.birds[0]).toEqual(old);
    expect(result.birds[1].name).toBe(old.name);
    expect(result.birds[1].code).toBe(old.code);
    expect(result.birds[1].id).not.toBe(old.id);
    expect(result.events).toHaveLength(2);
    expect(result.events[1].birdId).toBe(result.birds[1].id);
    expect(result.events[1].id).not.toBe("e");
    expect(existing.events[0].notes).toBe("Anterior");
  });
  it("reemplaza el destino elegido por nombre conservando su ID y enlaces existentes", () => {
    const old = bird("old", "Pepe", "A"),
      child = { ...bird("child"), father: "old" },
      incoming = bird("source", "Pepe", "B");
    const result = mergeImport(
      { birds: [old, child], events: [] },
      { birds: [incoming], events: [] },
      { source: { action: "replace", target: "db:old" } },
    );
    expect(result.birds).toHaveLength(2);
    expect(result.birds[0].code).toBe("B");
    expect(result.birds[0].id).toBe("old");
    expect(result.birds[1].father).toBe("old");
  });
  it("omite el animal y sus eventos sin modificar el original", () => {
    const old = bird("old", "Pepe"),
      source = bird("source", "Pepe");
    const result = mergeImport(
      { birds: [old], events: [] },
      {
        birds: [source],
        events: [
          {
            id: "e",
            birdId: "source",
            date: "2026-01-01",
            type: "Control",
            notes: "",
            followUp: "",
            done: false,
          },
        ],
      },
      { source: { action: "skip" } },
    );
    expect(result.birds).toEqual([old]);
    expect(result.events).toEqual([]);
  });
  it("exige elegir un destino si coinciden nombre y placa con animales distintos y evita reemplazar dos veces", () => {
    const a = bird("a", "Pepe", "A"),
      b = bird("b", "Otro", "B"),
      c = bird("c", "Pepe", "B"),
      d = bird("d", "Pepe", "C");
    const db = { birds: [a, b], events: [] };
    expect(duplicateIndex(db.birds, [c]).matches(c)).toHaveLength(2);
    expect(() =>
      mergeImport(db, { birds: [c], events: [] }, { c: { action: "replace" } }),
    ).toThrow("Elige");
    expect(() =>
      mergeImport(
        db,
        { birds: [c, d], events: [] },
        {
          c: { action: "replace", target: "db:a" },
          d: { action: "replace", target: "db:a" },
        },
      ),
    ).toThrow("Dos filas");
    expect(db.birds[0]).toEqual(a);
  });
  it("resuelve 1000 coincidencias y conserva todas con identidades nuevas", () => {
    const existing = Array.from({ length: 1000 }, (_, i) =>
      bird("local-" + i, "Gallo " + i, "P-" + i),
    );
    const incoming = existing.map((b, i) => ({ ...b, id: "source-" + i }));
    const decisions = Object.fromEntries(
      incoming.map((b) => [b.id, { action: "keep" as const }]),
    );
    const result = mergeImport(
      { birds: existing, events: [] },
      { birds: incoming, events: [] },
      decisions,
    );
    expect(result.birds).toHaveLength(2000);
    expect(new Set(result.birds.map((b) => b.id)).size).toBe(2000);
  });
  it("no adivina un progenitor externo cuando dos animales comparten placa", () => {
    const a = bird("a", "Pepe", "P"),
      b = bird("b", "Otro", "P"),
      child = { ...bird("c"), father: "missing" };
    const result = mergeImport(
      { birds: [a, b], events: [] },
      {
        birds: [child],
        events: [],
        references: [{ id: "missing", code: "P" }],
      },
      {},
    );
    expect(result.birds[2].father).toBe("");
  });
});
it("permite reemplazar una fila anterior del archivo por una posterior", () => {
  const first = bird("primero", "Pepe", "A"),
    second = { ...bird("segundo", "Pepe", "B"), notes: "Últimos datos" };
  const result = mergeImport(
    { birds: [], events: [] },
    { birds: [first, second], events: [] },
    { segundo: { action: "replace", target: "file:primero" } },
  );
  expect(result.birds).toHaveLength(1);
  expect(result.birds[0].notes).toBe("Últimos datos");
  expect(result.birds[0].code).toBe("B");
});
