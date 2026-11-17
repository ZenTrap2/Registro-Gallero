// @vitest-environment jsdom
import React from "react";
import { webcrypto } from "node:crypto";
import { it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AdminAccess } from "../src/AdminAccess";
import { setPIN, configureAccess, checkPIN } from "../src/admin-pin";
Object.defineProperty(globalThis, "crypto", {
  value: webcrypto,
  configurable: true,
});
afterEach(() => {
  cleanup();
  localStorage.clear();
});
it("restablece con pregunta y permite acceder con el nuevo PIN y con el maestro", async () => {
  await setPIN("123456");
  await configureAccess("123456", {
    question: "¿Mi lugar favorito?",
    answer: "El patio",
    master: "987654",
  });
  const unlock = vi.fn(),
    user = userEvent.setup();
  render(<AdminAccess unlock={unlock} />);
  await user.click(screen.getByRole("button", { name: "¿Olvidaste tu PIN?" }));
  await user.type(
    screen.getByLabelText("Respuesta de recuperación"),
    "el patio",
  );
  await user.type(screen.getByLabelText("Nuevo PIN"), "654321");
  await user.type(screen.getByLabelText("Repetir PIN"), "654321");
  await user.click(
    screen.getByRole("button", { name: "Restablecer PIN", exact: true }),
  );
  await screen.findByText("PIN restablecido. Accede con tu nuevo PIN.");
  expect(await checkPIN("654321")).toBe(true);
  await user.type(screen.getByLabelText("PIN", { exact: true }), "654321");
  await user.click(screen.getByRole("button", { name: "Desbloquear" }));
  await vi.waitFor(() => expect(unlock).toHaveBeenCalledOnce());
  cleanup();
  render(<AdminAccess unlock={unlock} />);
  await user.click(
    screen.getByRole("button", { name: "Otro método de acceso" }),
  );
  await user.type(screen.getByLabelText("PIN maestro"), "987654");
  await user.click(screen.getByRole("button", { name: "Desbloquear" }));
  await screen.findByRole("button", { name: "Desbloquear" });
  await vi.waitFor(() => expect(unlock).toHaveBeenCalledTimes(2));
});
