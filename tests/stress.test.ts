import { it, expect } from "vitest";
import "fake-indexeddb/auto";
import { readDB, writeDB, hydrateBird, closeStorage } from "../src/storage";
import { ancestorAt, ancestorPaths } from "../src/ancestry";
import { stressDatabase } from "./fixtures/stress-data";
import { jsonExport, subsetData, csvExport } from "../src/transfer";
import { validateImport, mergeImport, parseCSV } from "../src/data";
it("somete 1630 animales, 4890 eventos y cuatro generaciones completas a persistencia y restauración", async () => {
  const data = stressDatabase(),
    byId = new Map(data.birds.map((b) => [b.id, b])),
    paths = [1, 2, 3, 4].flatMap(ancestorPaths);
  expect(data.birds.length).toBeGreaterThan(1500);
  for (const bird of data.birds.slice(0, 1600))
    for (const path of paths)
      expect(ancestorAt(bird, path, byId)?.name).toBeTruthy();
  const start = performance.now();
  const stored = await writeDB(data);
  const loaded = await readDB();
  expect(loaded.birds).toHaveLength(1630);
  expect(loaded.events).toHaveLength(4890);
  const full = subsetData(loaded, new Set(loaded.birds.map((b) => b.id))),
    json = await jsonExport(full),
    incoming = validateImport(JSON.parse(await json.text()));
  expect(incoming.errors).toEqual([]);
  const restored = mergeImport({ birds: [], events: [] }, incoming, {});
  expect(restored.birds).toHaveLength(1630);
  const ids = new Map(restored.birds.map((b) => [b.id, b]));
  for (const b of [
    restored.birds[0],
    restored.birds[800],
    restored.birds[1599],
  ])
    for (const p of paths) expect(ancestorAt(b, p, ids)?.name).toBeTruthy();
  const csv = validateImport({
    birds: parseCSV(await csvExport(full, loaded.birds).text()),
  });
  expect(csv.errors).toEqual([]);
  expect(csv.birds).toHaveLength(1630);
  const csvResult = mergeImport({ birds: [], events: [] }, csv, {});
  expect(csvResult.birds).toHaveLength(1630);
  console.log(
    JSON.stringify({
      test: "1630 full ancestry",
      elapsedMs: Math.round(performance.now() - start),
      jsonBytes: json.size,
      events: loaded.events.length,
    }),
  );
  closeStorage();
}, 120000);
