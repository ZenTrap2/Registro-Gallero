import "fake-indexeddb/auto";
import { expect, it, vi } from "vitest";
import { emptyBird } from "../src/data";
import { closeStorage, getPhoto, readDB, writeDB } from "../src/storage";

const files = vi.hoisted(() => new Map<string, string>());
vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => true },
}));
vi.mock("@capacitor/filesystem", () => ({
  Directory: { Data: "DATA" },
  Filesystem: {
    writeFile: async ({
      path,
      directory,
      data,
    }: {
      path: string;
      directory: string;
      data: string;
    }) => {
      expect(directory).toBe("DATA");
      files.set(path, data);
    },
    rename: async ({
      from,
      to,
      directory,
    }: {
      from: string;
      to: string;
      directory: string;
    }) => {
      expect(directory).toBe("DATA");
      files.set(to, files.get(from)!);
      files.delete(from);
    },
    readFile: async ({ path }: { path: string }) => ({ data: files.get(path) }),
    deleteFile: async ({ path }: { path: string }) => files.delete(path),
  },
}));

it("conserva los originales en el directorio privado de Android y reabre sus referencias", async () => {
  const image =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jG1kAAAAASUVORK5CYII=";
  const bird = { ...emptyBird(), name: "Prueba", code: "P", photos: [image] };
  const saved = await writeDB({
    birds: [bird, { ...bird, id: "compartido" }],
    events: [],
  });
  expect([...files.keys()]).toHaveLength(1);
  expect([...files.keys()][0]).toMatch(/^media\/[a-f0-9]{64}$/);
  closeStorage();
  const reopened = await readDB();
  const reference = saved.birds[0].photos[0];
  const restored = await getPhoto(reference);
  expect(restored.type).toBe("image/png");
  expect(Buffer.from(await restored.arrayBuffer()).toString("base64")).toBe(
    image.split(",")[1],
  );
  const remaining = await writeDB(
    { ...reopened, birds: [reopened.birds[1]] },
    { base: reopened },
  );
  expect(files.size).toBe(1);
  await writeDB({ ...remaining, birds: [] }, { base: remaining });
  expect(files.size).toBe(0);
  closeStorage();
});
