import { emptyBird, type Bird, type Database } from "../../src/data";
import { ancestorPaths } from "../../src/ancestry";
import type { Attachment } from "../../src/attachment-data";
export function stressDatabase(
  photos: string[] = [],
  proof?: Attachment,
): Database {
  const template = emptyBird("2024-01-01"),
    paths = [1, 2, 3, 4].flatMap(ancestorPaths);
  const make = (id: string, name: string, birth = "2022-01-01"): Bird => ({
    ...template,
    id,
    name,
    code: id,
    birth,
    age: "",
    weightKg: "2.750",
    pl: "3",
    breed: "Criollo",
    color: "Cobrizo",
    farmId: "farm-stress",
    origin: "Datos ficticios de estrés",
    mark: "PRUEBA",
    purpose: "Conservación de raza",
    notes:
      "REGISTRO FICTICIO DE PRUEBA. Identificación, alojamiento y cuidados responsables.",
    lastReview: "2026-01-01",
    photos: [],
    customValues: { corral: "Corral de prueba", registro: "1" },
  });
  const pool = paths.map((path) => ({
    ...make("ancestor-" + path, "Ancestro registrado " + path, "2010-01-01"),
    father: path.length < 4 ? "ancestor-" + path + "f" : "",
    mother: path.length < 4 ? "ancestor-" + path + "m" : "",
    ancestry: Object.fromEntries(
      paths.map((p) => [
        p,
        {
          name: `Ascendiente de apoyo ${path}-${p}`,
          details: make(
            `support-${path}-${p}`,
            `Ascendiente de apoyo ${path}-${p}`,
            "2000-01-01",
          ),
        },
      ]),
    ),
  }));
  const manual = Array.from({ length: 800 }, (_, i) => ({
    ...make("manual-" + i, "Manual " + String(i).padStart(4, "0")),
    photos: photos.length && i % 2 === 0 ? [photos[i % photos.length]] : [],
    ...(proof && i % 20 === 0
      ? { attachments: [{ ...proof, id: "proof-main-" + i }] }
      : {}),
    ...(i % 40 === 0 ? { deceased: true, deathDate: "2026-01-02" } : {}),
    ancestry: Object.fromEntries(
      paths.map((path, j) => [
        path,
        {
          name: `Ancestro manual ${i}-${path}`,
          deceased: j % 3 === 0,
          deathDate: j % 3 === 0 ? "2020-01-02" : "",
          details: {
            ...make(
              `snapshot-${i}-${path}`,
              `Ancestro manual ${i}-${path}`,
              "2000-01-01",
            ),
            ...(photos.length && j < 2
              ? { photos: [photos[(i + j) % photos.length]] }
              : {}),
            ...(proof && j === 0 && i % 20 === 0
              ? { attachments: [{ ...proof, id: `proof-${i}-${path}` }] }
              : {}),
          },
        },
      ]),
    ),
  }));
  const linked = Array.from({ length: 800 }, (_, i) => ({
    ...make("linked-" + i, "Vinculado " + String(i).padStart(4, "0")),
    father: "ancestor-f",
    mother: "ancestor-m",
    photos:
      photos.length && i % 2 === 0 ? [photos[(i + 7) % photos.length]] : [],
  }));
  const birds = [...manual, ...linked, ...pool];
  return {
    birds,
    farms: [
      {
        id: "farm-stress",
        name: "Criadero ficticio de estrés",
        location: "Datos de prueba",
        contact: "",
        notes: "No son animales reales.",
      },
    ],
    events: birds.flatMap((b, i) =>
      [0, 1, 2].map((j) => ({
        id: "event-" + i + "-" + j,
        birdId: b.id,
        date: "2026-01-01",
        type: j ? "Observación" : "Revisión veterinaria",
        notes: "Evento ficticio de cuidados",
        followUp: j ? "" : "2026-12-01",
        done: j === 2,
      })),
    ),
    settings: {
      plLabel: "PL",
      catalogs: {
        breed: { label: "Raza", options: ["Criollo"] },
        color: { label: "Color", options: ["Cobrizo"] },
        purpose: { label: "Propósito", options: ["Conservación de raza"] },
        status: { label: "Estado sanitario", options: ["Saludable"] },
        eventType: {
          label: "Tipo de evento",
          options: ["Observación", "Revisión veterinaria"],
        },
      },
      healthyStates: ["Saludable"],
      controlTypes: ["Revisión veterinaria"],
      customFields: [
        { id: "corral", label: "Corral", type: "text", options: [] },
        {
          id: "registro",
          label: "Número de registro auxiliar",
          type: "integer",
          options: [],
        },
      ],
    },
  };
}
