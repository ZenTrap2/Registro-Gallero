import type { Bird } from "./data";
export type AncestorEntry = { name: string; birdId?: string; details?: Bird };
export const ancestorPaths = (generation: number): string[] =>
  generation === 0
    ? [""]
    : ancestorPaths(generation - 1).flatMap((p) => [p + "f", p + "m"]);
export const generationNames = [
  "Progenitores",
  "Abuelos",
  "Bisabuelos",
  "Tatarabuelos",
];
export function ancestorLabel(path: string) {
  if (path === "f") return "Padre";
  if (path === "m") return "Madre";
  const words = [...path].reverse().map((c) => (c === "f" ? "padre" : "madre"));
  return (
    words[0][0].toUpperCase() +
    words[0].slice(1) +
    " de " +
    words.slice(1).join(" de ")
  );
}
export function ancestorAt(
  bird: Bird,
  path: string,
  byId: ReadonlyMap<string, Bird>,
): AncestorEntry | undefined {
  if (!/^[fm]{1,4}$/.test(path)) return;
  for (let n = 1; n <= path.length; n++) {
    const prefix = path.slice(0, n),
      entry = bird.ancestry?.[prefix],
      id =
        (n === 1 ? (prefix === "f" ? bird.father : bird.mother) : "") ||
        entry?.birdId,
      registered = id ? byId.get(id) : undefined;
    if (registered) {
      if (n === path.length)
        return {
          name: registered.name,
          birdId: registered.id,
          details: registered,
        };
      const inherited = ancestorAt(registered, path.slice(n), byId);
      if (inherited) return inherited;
    }
  }
  return bird.ancestry?.[path];
}
export function allBirdPhotos(bird: Bird): string[] {
  return [
    ...bird.photos,
    ...Object.values(bird.ancestry || {}).flatMap(
      (e) => e.details?.photos || [],
    ),
  ];
}
export async function mapBirdPhotos(
  bird: Bird,
  map: (value: string) => Promise<string>,
): Promise<Bird> {
  const ancestry = bird.ancestry ? { ...bird.ancestry } : undefined;
  if (ancestry)
    for (const [path, entry] of Object.entries(ancestry))
      if (entry.details)
        ancestry[path] = {
          ...entry,
          details: {
            ...entry.details,
            photos: await Promise.all(entry.details.photos.map(map)),
          },
        };
  return {
    ...bird,
    photos: await Promise.all(bird.photos.map(map)),
    ...(ancestry ? { ancestry } : {}),
  };
}
export function withoutPhotos(bird: Bird): Bird {
  return {
    ...bird,
    photos: [],
    ...(bird.ancestry
      ? {
          ancestry: Object.fromEntries(
            Object.entries(bird.ancestry).map(([p, e]) => [
              p,
              {
                ...e,
                ...(e.details ? { details: { ...e.details, photos: [] } } : {}),
              },
            ]),
          ),
        }
      : {}),
  };
}
export function ancestryCycle(birds: Bird[]) {
  const byId = new Map(birds.map((b) => [b.id, b])),
    done = new Set<string>(),
    active = new Set<string>();
  const edges = (b: Bird) =>
    [
      b.father,
      b.mother,
      ...Object.values(b.ancestry || {}).map((a) => a.birdId || ""),
    ].filter((id) => id && byId.has(id));
  for (const root of birds) {
    if (done.has(root.id)) continue;
    const stack = [{ id: root.id, edges: edges(root), next: 0 }];
    active.add(root.id);
    while (stack.length) {
      const node = stack[stack.length - 1];
      if (node.next === node.edges.length) {
        active.delete(node.id);
        done.add(node.id);
        stack.pop();
        continue;
      }
      const id = node.edges[node.next++];
      if (active.has(id)) return true;
      if (!done.has(id)) {
        active.add(id);
        stack.push({ id, edges: edges(byId.get(id)!), next: 0 });
      }
    }
  }
  return false;
}
export function expandedAncestry(
  bird: Bird,
  byId: ReadonlyMap<string, Bird>,
): Bird {
  const ancestry: Record<string, AncestorEntry> = {};
  for (let generation = 1; generation <= 4; generation++)
    for (const path of ancestorPaths(generation)) {
      const value = ancestorAt(bird, path, byId);
      if (value) {
        const { ancestry: ignored, ...details } = value.details || {};
        ancestry[path] = {
          ...value,
          ...(value.details ? { details: details as Bird } : {}),
        };
      }
    }
  return Object.keys(ancestry).length ? { ...bird, ancestry } : bird;
}

export const allDetailBirds = (birds: Bird[]) =>
  birds.flatMap((b) => [
    b,
    ...Object.values(b.ancestry || {}).flatMap((a) =>
      a.details ? [a.details] : [],
    ),
  ]);
export function detachAncestor(
  bird: Bird,
  removedId: string,
  byId: ReadonlyMap<string, Bird>,
): Bird {
  const expanded = expandedAncestry(bird, byId);
  if (
    !Object.values(expanded.ancestry || {}).some(
      (a) => a.birdId === removedId,
    ) &&
    bird.father !== removedId &&
    bird.mother !== removedId
  )
    return bird;
  return {
    ...expanded,
    father: bird.father === removedId ? "" : bird.father,
    mother: bird.mother === removedId ? "" : bird.mother,
    ancestry: Object.fromEntries(
      Object.entries(expanded.ancestry || {}).map(([p, a]) => [
        p,
        a.birdId === removedId ? { name: a.name, details: a.details } : a,
      ]),
    ),
  };
}
