import {
  examples,
  type Bird,
  type Database,
  type Farm,
  type HealthEvent,
} from "./data";
export type OperationProgress = {
  label: string;
  completed: number;
  total: number;
};
export type ProgressHandler = (progress: OperationProgress) => void;
type PhotoRecord = { id: string; blob: Blob; thumbnail: Blob };
type State = {
  revision: number;
  hasFarms: boolean;
  hasSettings: boolean;
  settings?: Database["settings"];
  birdOrder?: string[];
  eventOrder?: string[];
  farmOrder?: string[];
};
type Snapshot = {
  revision: number;
  birds: Map<string, string>;
  events: Map<string, string>;
  farms: Map<string, string>;
  photoIds: Set<string>;
};
let connection: Promise<IDBDatabase> | undefined,
  snapshot: Snapshot | undefined,
  queue = Promise.resolve();
const versions = new WeakMap<Database, number>();
export const isPhotoReference = (value: string) =>
  value.startsWith("idb-photo:");
const photoId = (value: string) => value.slice("idb-photo:".length);
const fingerprints = (values: { id: string }[]) =>
  new Map(values.map((value) => [value.id, JSON.stringify(value)]));
function remember(data: Database, revision: number) {
  snapshot = {
    revision,
    birds: fingerprints(data.birds),
    events: fingerprints(data.events),
    farms: fingerprints(data.farms || []),
    photoIds: new Set(
      data.birds.flatMap((b) => b.photos.filter(isPhotoReference).map(photoId)),
    ),
  };
  versions.set(data, revision);
  return data;
}
export function closeStorage() {
  connection?.then((db) => db.close()).catch(() => {});
  connection = undefined;
  snapshot = undefined;
}
function openDB() {
  return (connection ??= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("registro-gallero", 2);
    let rejected = false;
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("database"))
        db.createObjectStore("database");
      for (const name of ["birds", "events", "farms", "photos"])
        if (!db.objectStoreNames.contains(name)) {
          const store = db.createObjectStore(name, { keyPath: "id" });
          if (name === "birds")
            store.createIndex("codeKey", "codeKey", { unique: true });
          if (name === "events") store.createIndex("birdId", "birdId");
        }
      if (!db.objectStoreNames.contains("meta")) db.createObjectStore("meta");
    };
    request.onsuccess = () => {
      if (rejected) {
        request.result.close();
        return;
      }
      const db = request.result;
      db.onversionchange = () => {
        db.close();
        connection = undefined;
        snapshot = undefined;
      };
      resolve(db);
    };
    request.onerror = () => {
      connection = undefined;
      reject(
        Error(
          "No se pudo abrir el almacenamiento local. Revisa los permisos del navegador.",
        ),
      );
    };
    request.onblocked = () => {
      rejected = true;
      connection = undefined;
      reject(
        Error(
          "Cierra otras pestañas de Registro Gallero y vuelve a intentarlo para actualizar el almacenamiento.",
        ),
      );
    };
  }));
}
function requestValue<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function loadRows() {
  const db = await openDB(),
    tx = db.transaction(
      ["meta", "birds", "events", "farms", "database"],
      "readonly",
    );
  const [state, birds, events, farms, legacy] = await Promise.all([
    requestValue<State | undefined>(tx.objectStore("meta").get("state")),
    requestValue<(Bird & { codeKey?: string })[]>(
      tx.objectStore("birds").getAll(),
    ),
    requestValue<HealthEvent[]>(tx.objectStore("events").getAll()),
    requestValue<Farm[]>(tx.objectStore("farms").getAll()),
    requestValue<Database | undefined>(tx.objectStore("database").get("data")),
  ]);
  for (const bird of birds) delete bird.codeKey;
  for (const [values, order] of [
    [birds, state?.birdOrder],
    [events, state?.eventOrder],
    [farms, state?.farmOrder],
  ] as const) {
    if (order) {
      const positions = new Map(order.map((id, index) => [id, index]));
      values.sort(
        (a, b) =>
          (positions.get(a.id) ?? Infinity) - (positions.get(b.id) ?? Infinity),
      );
    }
  }
  const data: Database = { birds, events };
  if (state?.hasFarms) data.farms = farms;
  if (state?.hasSettings) data.settings = state.settings;
  return { state, data, legacy };
}
export async function readDB(
  options: { onProgress?: ProgressHandler } = {},
): Promise<Database> {
  const loaded = await loadRows();
  if (loaded.state) return remember(loaded.data, loaded.state.revision);
  snapshot = {
    revision: 0,
    birds: new Map(),
    events: new Map(),
    farms: new Map(),
    photoIds: new Set(),
  };
  try {
    return await writeDB(loaded.legacy || examples(), options);
  } catch (error) {
    if ((error as Error).message.includes("otra pestaña")) {
      const retry = await loadRows();
      if (retry.state) return remember(retry.data, retry.state.revision);
    }
    throw error;
  }
}
function dataPhoto(value: string) {
  const match = /^data:image\/(jpeg|png);base64,([A-Za-z0-9+/=]+)$/.exec(value);
  if (!match)
    throw Error("Una fotografía no tiene un formato JPG o PNG válido.");
  const raw = atob(match[2]),
    bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return new Blob([bytes], { type: "image/" + match[1] });
}
async function thumbnail(blob: Blob) {
  if (typeof createImageBitmap !== "function") return blob;
  let bitmap: ImageBitmap | undefined;
  try {
    bitmap = await createImageBitmap(blob);
    const scale = Math.min(1, 192 / Math.max(bitmap.width, bitmap.height)),
      width = Math.max(1, Math.round(bitmap.width * scale)),
      height = Math.max(1, Math.round(bitmap.height * scale));
    if (typeof OffscreenCanvas !== "undefined") {
      const canvas = new OffscreenCanvas(width, height);
      canvas.getContext("2d")!.drawImage(bitmap, 0, 0, width, height);
      return await canvas.convertToBlob({ type: "image/jpeg", quality: 0.76 });
    }
    if (typeof document !== "undefined") {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d")!.drawImage(bitmap, 0, 0, width, height);
      return await new Promise<Blob>((resolve) =>
        canvas.toBlob((value) => resolve(value || blob), "image/jpeg", 0.76),
      );
    }
    return blob;
  } catch {
    return blob;
  } finally {
    bitmap?.close();
  }
}
const yieldUI = () => new Promise<void>((resolve) => setTimeout(resolve, 0));
export async function writeDB(
  data: Database,
  options: { base?: Database; onProgress?: ProgressHandler } = {},
): Promise<Database> {
  const baseRevision = options.base ? versions.get(options.base) : undefined;
  const task = queue.then(() =>
    performWrite(data, baseRevision, options.onProgress),
  );
  queue = task.then(
    () => {},
    () => {},
  );
  return task;
}
async function performWrite(
  data: Database,
  baseRevision: number | undefined,
  onProgress?: ProgressHandler,
) {
  if (!snapshot) {
    const loaded = await loadRows();
    remember(loaded.data, loaded.state?.revision || 0);
  }
  const before = snapshot!,
    expected = baseRevision ?? before.revision,
    newPhotos = new Map<string, PhotoRecord>(),
    prepared = new Map<string, Promise<string>>(),
    birds: Bird[] = [];
  const totalPhotos = data.birds.reduce(
    (n, b) => n + b.photos.filter((p) => !isPhotoReference(p)).length,
    0,
  );
  let completed = 0;
  for (const b of data.birds) {
    const photos: string[] = [];
    for (const value of b.photos) {
      if (isPhotoReference(value)) {
        photos.push(value);
        continue;
      }
      let promise = prepared.get(value);
      if (!promise) {
        promise = (async () => {
          const blob = dataPhoto(value),
            digest = await crypto.subtle.digest(
              "SHA-256",
              await blob.arrayBuffer(),
            ),
            id = Array.from(new Uint8Array(digest))
              .map((v) => v.toString(16).padStart(2, "0"))
              .join("");
          if (!before.photoIds.has(id) && !newPhotos.has(id))
            newPhotos.set(id, { id, blob, thumbnail: await thumbnail(blob) });
          return "idb-photo:" + id;
        })();
        prepared.set(value, promise);
      }
      photos.push(await promise);
      completed++;
      if (completed % 10 === 0 || completed === totalPhotos) {
        onProgress?.({
          label: "Preparando fotografías",
          completed,
          total: totalPhotos,
        });
        await yieldUI();
      }
    }
    birds.push(b.photos.every(isPhotoReference) ? b : { ...b, photos });
  }
  const canonical: Database = { ...data, birds };
  const activePhotos = new Set(
    birds.flatMap((b) => b.photos.filter(isPhotoReference).map(photoId)),
  );
  const changed = <T extends { id: string }>(
    values: T[],
    old: Map<string, string>,
  ) => values.filter((value) => old.get(value.id) !== JSON.stringify(value));
  const dirtyBirds = changed(birds, before.birds),
    dirtyEvents = changed(data.events, before.events),
    dirtyFarms = changed(data.farms || [], before.farms);
  const db = await openDB();
  onProgress?.({
    label: "Guardando registros",
    completed: 0,
    total: dirtyBirds.length + dirtyEvents.length + dirtyFarms.length,
  });
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(
      ["meta", "birds", "events", "farms", "photos", "database"],
      "readwrite",
    );
    let reason =
      "No se pudo guardar. Comprueba el espacio disponible y exporta una copia de tus datos.";
    tx.oncomplete = () => resolve();
    tx.onerror = tx.onabort = () => reject(Error(reason));
    const current = tx.objectStore("meta").get("state");
    current.onsuccess = () => {
      try {
        const actual = (current.result as State | undefined)?.revision || 0;
        if (actual !== expected) {
          reason =
            "Los datos cambiaron en otra pestaña o durante otra operación. Recarga la aplicación antes de guardar; no se sobrescribió ningún registro.";
          tx.abort();
          return;
        }
        for (const [name, values, dirty, previous] of [
          ["birds", birds, dirtyBirds, before.birds],
          ["events", data.events, dirtyEvents, before.events],
          ["farms", data.farms || [], dirtyFarms, before.farms],
        ] as const) {
          const store = tx.objectStore(name),
            ids = new Set(values.map((v) => v.id));
          for (const id of previous.keys()) if (!ids.has(id)) store.delete(id);
          for (const value of dirty)
            store.put(
              name === "birds"
                ? {
                    ...value,
                    codeKey: (value as Bird).code.trim().toLowerCase(),
                  }
                : value,
            );
        }
        for (const photo of newPhotos.values())
          if (activePhotos.has(photo.id)) tx.objectStore("photos").put(photo);
        for (const id of before.photoIds)
          if (!activePhotos.has(id)) tx.objectStore("photos").delete(id);
        tx.objectStore("meta").put(
          {
            revision: actual + 1,
            hasFarms: "farms" in data,
            hasSettings: !!data.settings,
            settings: data.settings,
            birdOrder: birds.map((b) => b.id),
            eventOrder: data.events.map((e) => e.id),
            farmOrder: (data.farms || []).map((f) => f.id),
          } as State,
          "state",
        );
        tx.objectStore("database").delete("data");
      } catch (error) {
        reason =
          (error as Error).name === "QuotaExceededError"
            ? "No hay espacio suficiente. No se modificaron los datos anteriores; exporta una copia y libera espacio."
            : reason;
        tx.abort();
      }
    };
  });
  onProgress?.({ label: "Datos guardados", completed: 1, total: 1 });
  return remember(canonical, expected + 1);
}
export async function getPhoto(reference: string, small = false) {
  const db = await openDB(),
    tx = db.transaction("photos", "readonly"),
    record = await requestValue<PhotoRecord | undefined>(
      tx.objectStore("photos").get(photoId(reference)),
    );
  if (!record)
    throw Error("No se encontró una fotografía en el almacenamiento local.");
  return small ? record.thumbnail : record.blob;
}
export async function photoDataURL(value: string) {
  if (!isPhotoReference(value)) return value;
  const blob = await getPhoto(value),
    bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  for (let i = 0; i < bytes.length; i += 8192)
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return `data:${blob.type};base64,${btoa(binary)}`;
}
export async function hydrateBird(
  bird: Bird,
  includePhotos = true,
): Promise<Bird> {
  return {
    ...bird,
    photos: includePhotos
      ? await Promise.all(bird.photos.map(photoDataURL))
      : [],
  };
}
