import { beforeEach, describe, it, expect, vi } from "vitest";
import { indexedDB, IDBObjectStore } from "fake-indexeddb";
import { webcrypto } from "node:crypto";
import {
  readDB,
  writeDB,
  closeStorage,
  getPhoto,
  hydrateBird,
} from "../src/storage";
import { emptyBird, type Database } from "../src/data";
Object.defineProperty(globalThis, "indexedDB", {
  value: indexedDB,
  configurable: true,
});
Object.defineProperty(globalThis, "crypto", {
  value: webcrypto,
  configurable: true,
});
const photo =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jG1kAAAAASUVORK5CYII=";
function birds(n: number) {
  return Array.from({ length: n }, (_, i) => ({
    ...emptyBird(),
    id: "bird-" + String(i).padStart(6, "0"),
    name: "Gallo " + i,
    code: "RG-" + i,
    arrival: "2026-01-01",
  }));
}
async function removeDatabase() {
  await new Promise<void>((resolve, reject) => {
    const r = indexedDB.deleteDatabase("registro-gallero");
    r.onsuccess = () => resolve();
    r.onerror = () => reject(r.error);
    r.onblocked = () => reject(Error("Database still open"));
  });
}
async function legacy(data: Database) {
  await new Promise<void>((resolve, reject) => {
    const r = indexedDB.open("registro-gallero", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("database");
    r.onerror = () => reject(r.error);
    r.onsuccess = () => {
      const db = r.result,
        t = db.transaction("database", "readwrite");
      t.objectStore("database").put(data, "data");
      t.oncomplete = () => {
        db.close();
        resolve();
      };
    };
  });
}
beforeEach(async () => {
  vi.restoreAllMocks();
  closeStorage();
  await removeDatabase();
});
describe("Persistencia para criaderos grandes", () => {
  it("migra el formato anterior sin cambiar IDs, eventos ni fotografías y no lee fotos al arrancar de nuevo", async () => {
    const original = {
      birds: [{ ...birds(1)[0], photos: [photo] }],
      events: [
        {
          id: "health",
          birdId: "bird-000000",
          date: "2026-01-02",
          type: "Control",
          notes: "Rutina",
          followUp: "",
          done: false,
        },
      ],
    };
    await legacy(original);
    const migrated = await readDB();
    expect(migrated.birds[0].id).toBe(original.birds[0].id);
    expect(migrated.events).toEqual(original.events);
    expect(migrated.birds[0].photos[0]).toMatch(/^idb-photo:/);
    expect((await hydrateBird(migrated.birds[0])).photos).toEqual([photo]);
    const get = vi.spyOn(IDBObjectStore.prototype, "get"),
      all = vi.spyOn(IDBObjectStore.prototype, "getAll");
    await readDB();
    expect(
      get.mock.contexts.filter((store) => store.name === "photos"),
    ).toHaveLength(0);
    expect(
      all.mock.contexts.filter((store) => store.name === "photos"),
    ).toHaveLength(0);
  });
  it("solo escribe el gallo modificado entre 1.500 registros y conserva los demás eventos", async () => {
    const data = {
      birds: birds(1500),
      events: Array.from({ length: 3000 }, (_, i) => ({
        id: "event-" + i,
        birdId: "bird-" + String(i % 1500).padStart(6, "0"),
        date: "2026-01-02",
        type: "Control",
        notes: "Rutina",
        followUp: "",
        done: false,
      })),
    };
    const initial = await writeDB(data);
    const put = vi.spyOn(IDBObjectStore.prototype, "put");
    const changed = {
      ...initial,
      birds: initial.birds.map((b, i) =>
        i === 777 ? { ...b, notes: "Actualizado" } : b,
      ),
    };
    await writeDB(changed, { base: initial });
    expect(
      put.mock.contexts.filter((store) => store.name === "birds"),
    ).toHaveLength(1);
    expect(
      put.mock.contexts.filter((store) => store.name === "events"),
    ).toHaveLength(0);
    expect(
      put.mock.contexts.filter((store) => store.name === "photos"),
    ).toHaveLength(0);
    const loaded = await readDB();
    expect(loaded.birds).toHaveLength(1500);
    expect(loaded.events).toHaveLength(3000);
    expect(loaded.birds[777].notes).toBe("Actualizado");
  });
  it("deduplica fotos idénticas y no elimina una foto todavía usada por otro gallo", async () => {
    const put = vi.spyOn(IDBObjectStore.prototype, "put");
    const data = await writeDB({
      birds: birds(1000).map((b) => ({ ...b, photos: [photo] })),
      events: [],
    });
    expect(
      put.mock.contexts.filter((store) => store.name === "photos"),
    ).toHaveLength(1);
    const ref = data.birds[0].photos[0];
    expect(new Set(data.birds.map((b) => b.photos[0])).size).toBe(1);
    const one = await writeDB(
      { ...data, birds: data.birds.slice(0, 1) },
      { base: data },
    );
    expect((await getPhoto(ref)).size).toBeGreaterThan(0);
    await writeDB({ ...one, birds: [] }, { base: one });
    await expect(getPhoto(ref)).rejects.toThrow("No se encontró");
  });
  it("rechaza una operación basada en una versión anterior sin sobrescribir cambios recientes", async () => {
    const first = await writeDB({ birds: birds(2), events: [] });
    const second = await writeDB(
      { ...first, birds: first.birds.map((b) => ({ ...b, notes: "Nuevo" })) },
      { base: first },
    );
    await expect(
      writeDB(
        {
          ...first,
          birds: first.birds.map((b) => ({ ...b, notes: "Antiguo" })),
        },
        { base: first },
      ),
    ).rejects.toThrow("otra pestaña");
    expect((await readDB()).birds).toEqual(second.birds);
  });
  it("revierte una migración fallida conservando el objeto original para reintentar", async () => {
    const original = {
      birds: [{ ...birds(1)[0], photos: [photo] }],
      events: [],
    };
    await legacy(original);
    const put = IDBObjectStore.prototype.put;
    const spy = vi
      .spyOn(IDBObjectStore.prototype, "put")
      .mockImplementation(function (
        this: IDBObjectStore,
        ...args: Parameters<IDBObjectStore["put"]>
      ) {
        if (this.name === "photos")
          throw new DOMException("Quota", "QuotaExceededError");
        return put.apply(this, args);
      });
    await expect(readDB()).rejects.toThrow("espacio");
    spy.mockRestore();
    const retried = await readDB();
    expect(retried.birds[0].id).toBe(original.birds[0].id);
    expect((await hydrateBird(retried.birds[0])).photos).toEqual([photo]);
  });
});
it("conserva dos placas iguales con IDs distintos y fotografías de ancestros en IndexedDB", async () => {
  const a = {
      ...birds(1)[0],
      ancestry: {
        m: {
          name: "Madre manual",
          details: { ...birds(1)[0], name: "Madre manual", photos: [photo] },
        },
      },
    },
    b = { ...a, id: "other" };
  const saved = await writeDB({ birds: [a, b], events: [] });
  expect(saved.birds).toHaveLength(2);
  expect(saved.birds[0].ancestry?.m.details?.photos[0]).toMatch(/^idb-photo:/);
  const ref = saved.birds[0].ancestry!.m.details!.photos[0];
  expect(
    (await hydrateBird(saved.birds[1])).ancestry?.m.details?.photos,
  ).toEqual([photo]);
  expect((await readDB()).birds.map((b) => b.code)).toEqual([a.code, a.code]);
  const kept = await writeDB(
    { ...saved, birds: saved.birds.slice(0, 1) },
    { base: saved },
  );
  expect((await getPhoto(ref)).size).toBeGreaterThan(0);
  await writeDB({ ...kept, birds: [] }, { base: kept });
  await expect(getPhoto(ref)).rejects.toThrow("No se encontró");
});
it("actualiza una base v2 con índice único sin perder fichas y admite placas repetidas después", async () => {
  const original = birds(1)[0];
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.open("registro-gallero", 2);
    request.onupgradeneeded = () => {
      const db = request.result;
      db.createObjectStore("database");
      const store = db.createObjectStore("birds", { keyPath: "id" });
      store.createIndex("codeKey", "codeKey", { unique: true });
      for (const name of ["events", "farms", "photos"])
        db.createObjectStore(name, { keyPath: "id" });
      db.createObjectStore("meta");
    };
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result,
        tx = db.transaction(["birds", "meta"], "readwrite");
      tx.objectStore("birds").put({
        ...original,
        codeKey: original.code.toLowerCase(),
      });
      tx.objectStore("meta").put(
        {
          revision: 1,
          hasFarms: false,
          hasSettings: false,
          birdOrder: [original.id],
          eventOrder: [],
          farmOrder: [],
        },
        "state",
      );
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
    };
  });
  const loaded = await readDB();
  expect(loaded.birds).toEqual([original]);
  await writeDB(
    { ...loaded, birds: [...loaded.birds, { ...original, id: "another" }] },
    { base: loaded },
  );
  expect((await readDB()).birds).toHaveLength(2);
});
