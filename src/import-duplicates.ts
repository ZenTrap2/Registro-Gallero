import type { Bird } from "./data";
export type DuplicateAction = "skip" | "replace" | "keep";
export type ImportDecision = { action: DuplicateAction; target?: string };
export type ImportDecisions = Record<string, ImportDecision>;
export type Match = {
  key: string;
  bird: Bird;
  source: "db" | "file";
  position: number;
};
export const identityText = (v: string) =>
  v
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("es")
    .trim()
    .replace(/\s+/g, " ");
export function duplicateIndex(existing: Bird[], incoming: Bird[]) {
  const names = new Map<string, Match[]>(),
    codes = new Map<string, Match[]>(),
    ids = new Map<string, Match[]>(),
    positions = new Map<string, number>();
  const add = (map: Map<string, Match[]>, key: string, value: Match) => {
    if (!key) return;
    const list = map.get(key);
    if (list) list.push(value);
    else map.set(key, [value]);
  };
  const all: Match[] = [
    ...existing.map((bird) => ({
      key: "db:" + bird.id,
      bird,
      source: "db" as const,
      position: -1,
    })),
    ...incoming.map((bird, position) => ({
      key: "file:" + bird.id,
      bird,
      source: "file" as const,
      position,
    })),
  ];
  for (const match of all) {
    add(names, identityText(match.bird.name), match);
    add(codes, identityText(match.bird.code), match);
    add(ids, match.bird.id, match);
    if (match.source === "file") positions.set(match.bird.id, match.position);
  }
  const groups = (b: Bird) => [
    names.get(identityText(b.name)) || [],
    codes.get(identityText(b.code)) || [],
    ids.get(b.id) || [],
  ];
  const precedes = (match: Match, b: Bird) =>
    match.source === "db" || match.position < (positions.get(b.id) ?? -1);
  return {
    has: (b: Bird) =>
      groups(b).some((group) => group.length > 0 && precedes(group[0], b)),
    matches: (b: Bird) => {
      const result = new Map<string, Match>();
      for (const group of groups(b))
        for (const match of group) {
          if (!precedes(match, b)) break;
          result.set(match.key, match);
        }
      return [...result.values()];
    },
  };
}
export function unresolvedDuplicates(
  existing: Bird[],
  incoming: Bird[],
  decisions: ImportDecisions,
) {
  const index = duplicateIndex(existing, incoming);
  return incoming.filter((b) => index.has(b) && !decisions[b.id]);
}
