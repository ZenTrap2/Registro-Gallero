import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  setPIN,
  checkPIN,
  checkMasterPIN,
  accessMethods,
  configureAccess,
  recoverPIN,
} from "../src/admin-pin";
let values: Map<string, string>;
beforeEach(() => {
  values = new Map();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => values.get(k) || null,
    setItem: (k: string, v: string) => values.set(k, v),
  });
});
afterEach(() => vi.unstubAllGlobals());
describe("Recuperación y PIN maestro", () => {
  it("conserva PIN antiguos y no habilita un maestro predeterminado", async () => {
    await setPIN("123456");
    expect(await checkPIN("123456")).toBe(true);
    expect(await checkMasterPIN("123456")).toBe(false);
    expect(accessMethods()).toEqual({
      question: "",
      recovery: false,
      master: false,
    });
  });
  it("configura métodos con autorización, guarda hashes y recupera solo con respuesta correcta", async () => {
    await setPIN("123456");
    await expect(
      configureAccess("000000", {
        question: "¿Nombre de mi primera mascota?",
        answer: " Mi Gato ",
        master: "987654",
      }),
    ).rejects.toThrow("Confirma");
    await configureAccess("123456", {
      question: "¿Nombre de mi primera mascota?",
      answer: " Mi Gato ",
      master: "987654",
    });
    expect(await checkMasterPIN("987654")).toBe(true);
    const stored = [...values.values()][0];
    for (const v of ["123456", "987654", "Mi Gato"])
      expect(stored).not.toContain(v);
    await expect(recoverPIN("incorrecta", "654321")).rejects.toThrow(
      "no coincide",
    );
    expect(await checkPIN("123456")).toBe(true);
    await recoverPIN("mi   gato", "654321");
    expect(await checkPIN("654321")).toBe(true);
    expect(await checkPIN("123456")).toBe(false);
    expect(await checkMasterPIN("987654")).toBe(true);
  });
  it("mantiene métodos al cambiar el PIN y permite desactivarlos con el maestro", async () => {
    await setPIN("123456");
    await configureAccess("123456", {
      question: "¿Mi lugar favorito?",
      answer: "el patio",
      master: "987654",
    });
    await setPIN("654321");
    expect(accessMethods().recovery).toBe(true);
    await configureAccess("987654", {
      question: "",
      answer: "",
      master: "",
      removeRecovery: true,
      removeMaster: true,
    });
    expect(accessMethods()).toEqual({
      question: "",
      recovery: false,
      master: false,
    });
    expect(await checkPIN("654321")).toBe(true);
  });
});
