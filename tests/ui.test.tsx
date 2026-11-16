// @vitest-environment jsdom
import React from "react";
import {
  beforeAll,
  beforeEach,
  afterEach,
  describe,
  it,
  expect,
  vi,
} from "vitest";
import {
  render,
  screen,
  within,
  waitFor,
  cleanup,
  act,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { emptyBird, type Database } from "../src/data";
const mocks = vi.hoisted(() => ({
  read: vi.fn(),
  write: vi.fn(),
  native: vi.fn(() => false),
  back: undefined as undefined | (() => void),
  exit: vi.fn(),
}));
vi.mock("../src/data", async () => ({
  ...(await vi.importActual("../src/data")),
  readDB: mocks.read,
  writeDB: mocks.write,
}));
vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: mocks.native },
}));
vi.mock("@capacitor/app", () => ({
  App: {
    addListener: vi.fn(async (_type: string, callback: () => void) => {
      mocks.back = callback;
      return { remove: vi.fn() };
    }),
    exitApp: mocks.exit,
  },
}));
let App: React.ComponentType;
let width = 390;
const media = new Map<
  string,
  { matches: boolean; listeners: Set<() => void> }
>();
function setWidth(value: number) {
  width = value;
  for (const [, query] of media) {
    query.matches = width <= 800;
    query.listeners.forEach((fn) => fn());
  }
}
const seed = (): Database => ({
  birds: [
    {
      ...emptyBird(),
      id: "bird-1",
      name: "Canelo",
      code: "RG-001",
      breed: "Criollo",
      weightKg: "2.375",
    },
    {
      ...emptyBird(),
      id: "bird-2",
      name: "Ámbar",
      code: "RG-002",
      breed: "Sussex",
    },
  ],
  events: [],
});
beforeAll(async () => {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: (query: string) => {
      if (!media.has(query))
        media.set(query, { matches: width <= 800, listeners: new Set() });
      const item = media.get(query)!;
      return {
        get matches() {
          return item.matches;
        },
        media: query,
        addEventListener: (_name: string, fn: () => void) =>
          item.listeners.add(fn),
        removeEventListener: (_name: string, fn: () => void) =>
          item.listeners.delete(fn),
      };
    },
  });
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
    configurable: true,
    value: function () {
      this.setAttribute("open", "");
      this.querySelector("button")?.focus();
    },
  });
  Object.defineProperty(HTMLDialogElement.prototype, "close", {
    configurable: true,
    value: function () {
      this.removeAttribute("open");
    },
  });
  window.scrollTo = vi.fn();
  HTMLElement.prototype.scrollIntoView = vi.fn();
  App = (await import("../src/App")).default;
});
beforeEach(() => {
  mocks.read.mockReset().mockResolvedValue(seed());
  mocks.write.mockReset().mockResolvedValue(undefined);
  mocks.native.mockReturnValue(false);
  mocks.exit.mockClear();
  mocks.back = undefined;
  setWidth(390);
});
afterEach(() => {
  cleanup();
  expect(document.body.style.overflow).toBe("");
  expect(document.body.dataset.modalOpen).toBeUndefined();
});
async function ready() {
  render(<App />);
  await screen.findByRole("button", { name: "Ver ficha de Canelo" });
}
async function navigate(name: string) {
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Abrir menú" }));
  const menu = screen.getByRole("dialog", { name: "Menú de navegación" });
  await user.click(
    within(menu).getByRole("button", { name: new RegExp("^" + name) }),
  );
  return user;
}
describe("Flujos de interfaz en teléfono", () => {
  it("usa tarjetas y permite navegar con un menú modal que libera el desplazamiento al cerrar", async () => {
    await ready();
    expect(screen.queryByRole("table")).toBeNull();
    expect(
      screen.getByRole("list", { name: "Gallos registrados" }),
    ).toBeTruthy();
    expect(screen.getByText("2,375 kg")).toBeTruthy();
    expect(screen.getAllByText("Peso")).toHaveLength(2);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Abrir menú" }));
    const menu = screen.getByRole("dialog", { name: "Menú de navegación" });
    expect(document.body.style.overflow).toBe("hidden");
    await user.click(within(menu).getByRole("button", { name: /^Mis gallos/ }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(
      screen.getByRole("heading", { name: "Mis gallos", level: 1 }),
    ).toBeTruthy();
    expect(screen.getByText("2,375 kg")).toBeTruthy();
    expect(document.body.style.overflow).toBe("");
  });
  it("mantiene el foco del buscador mientras escribe y restablece los resultados al limpiar filtros", async () => {
    await ready();
    const user = userEvent.setup(),
      search = screen.getByRole("textbox", { name: "Buscar un gallo" });
    await user.type(search, "canelo");
    expect((search as HTMLInputElement).value).toBe("canelo");
    expect(document.activeElement).toBe(search);
    expect(
      screen.queryByRole("button", { name: "Ver ficha de Ámbar" }),
    ).toBeNull();
    await user.click(
      screen.getByRole("button", { name: "Ver todos / limpiar filtros" }),
    );
    expect(
      screen.getByRole("button", { name: "Ver ficha de Ámbar" }),
    ).toBeTruthy();
  });
  it("edita y guarda una ficha y confirma el resultado tras cerrar el formulario", async () => {
    await ready();
    const user = userEvent.setup();
    await user.click(
      screen.getByRole("button", { name: "Ver ficha de Canelo" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Editar", exact: true }),
    );
    const dialog = screen.getByRole("dialog", { name: "Editar registro" }),
      field = within(dialog).getByLabelText("Nombre *");
    await user.clear(field);
    await user.type(field, "Canelo Azul");
    await user.click(
      within(dialog).getByRole("button", { name: "Guardar registro" }),
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(mocks.write.mock.calls.at(-1)![0].birds[0].name).toBe("Canelo Azul");
    expect(screen.getByRole("status").textContent).toContain(
      "Registro guardado correctamente.",
    );
  });
  it("muestra un fallo de almacenamiento dentro del formulario abierto, sin cerrar ni perder datos", async () => {
    await ready();
    mocks.write.mockRejectedValueOnce(
      Error("Almacenamiento lleno. Exporta una copia."),
    );
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Editar Canelo" }));
    const dialog = screen.getByRole("dialog", { name: "Editar registro" });
    await user.click(
      within(dialog).getByRole("button", { name: "Guardar registro" }),
    );
    await waitFor(() =>
      expect(within(dialog).getByRole("alert").textContent).toContain(
        "Almacenamiento lleno",
      ),
    );
    expect(screen.getByRole("dialog", { name: "Editar registro" })).toBe(
      dialog,
    );
    await user.click(
      within(dialog).getByRole("button", { name: "Cerrar formulario" }),
    );
    expect(screen.queryByRole("dialog")).toBeNull();
  });
  it("evita guardar códigos repetidos y mantiene los errores junto a los controles", async () => {
    await ready();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Registrar gallo" }));
    const dialog = screen.getByRole("dialog", { name: "Registrar un gallo" });
    await user.type(within(dialog).getByLabelText("Nombre *"), "Nuevo");
    await user.type(within(dialog).getByLabelText("Código único *"), "rg-001");
    await user.click(
      within(dialog).getByRole("button", { name: "Guardar registro" }),
    );
    expect(within(dialog).getByRole("alert").textContent).toContain(
      "Ese código ya existe",
    );
    expect(mocks.write).not.toHaveBeenCalled();
  });
  it("permite recuperar un error de carga antes de habilitar registros", async () => {
    mocks.read
      .mockRejectedValueOnce(Error("No se pudo leer IndexedDB."))
      .mockResolvedValue(seed());
    render(<App />);
    const retry = await screen.findByRole("button", {
      name: "Volver a intentar",
    });
    expect(
      (
        screen.getByRole("button", {
          name: "Registrar gallo",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    await userEvent.click(retry);
    await screen.findByRole("button", { name: "Ver ficha de Canelo" });
    expect(mocks.read).toHaveBeenCalledTimes(2);
  });
  it("conserva la tabla de escritorio y cambia a tarjetas al estrechar la ventana", async () => {
    setWidth(1280);
    await ready();
    expect(screen.getByRole("table")).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Peso" })).toBeTruthy();
    expect(screen.getByText("2,375 kg")).toBeTruthy();
    act(() => setWidth(360));
    await waitFor(() => expect(screen.queryByRole("table")).toBeNull());
    expect(
      screen.getByRole("list", { name: "Gallos registrados" }),
    ).toBeTruthy();
  });
  it("el botón Atrás de Android cierra el formulario superior y no abandona la página", async () => {
    mocks.native.mockReturnValue(true);
    await ready();
    const user = await navigate("Criaderos");
    await user.click(screen.getByRole("button", { name: "Nuevo criadero" }));
    expect(
      screen.getByRole("dialog", { name: "Registrar criadero" }),
    ).toBeTruthy();
    await waitFor(() => expect(mocks.back).toBeTypeOf("function"));
    act(() => mocks.back?.());
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(
      screen.getByRole("heading", { name: "Criaderos", level: 1 }),
    ).toBeTruthy();
    expect(mocks.exit).not.toHaveBeenCalled();
  });
  it("pagina listas grandes y permite llegar al último registro sin cargar todas las tarjetas", async () => {
    mocks.read.mockResolvedValue({
      birds: Array.from({ length: 25 }, (_, i) => ({
        ...emptyBird(),
        id: "bird-" + i,
        name: "Gallo " + String(i + 1).padStart(2, "0"),
        code: "RG-" + i,
      })),
      events: [],
    });
    render(<App />);
    await screen.findByRole("button", { name: "Ver ficha de Gallo 01" });
    const user = await navigate("Mis gallos");
    expect(
      screen.queryByRole("button", { name: "Ver ficha de Gallo 25" }),
    ).toBeNull();
    await user.click(screen.getByRole("button", { name: "Siguiente" }));
    expect(
      screen.getByRole("button", { name: "Ver ficha de Gallo 25" }),
    ).toBeTruthy();
    expect(
      (screen.getByRole("button", { name: "Siguiente" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });
  it("mantiene el aviso y el bloqueo correcto cuando falla una importación con confirmación anidada", async () => {
    await ready();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Importar datos" }));
    const dialog = screen.getByRole("dialog", { name: "Importar datos" });
    const data = {
      birds: [{ ...emptyBird(), id: "new", name: "Nuevo", code: "NEW" }],
      events: [],
    };
    const file = new File([JSON.stringify(data)], "copia.json", {
      type: "application/json",
    });
    Object.defineProperty(file, "text", {
      value: async () => JSON.stringify(data),
    });
    await user.upload(
      within(dialog).getByLabelText("Seleccionar archivo JSON o CSV"),
      file,
    );
    await user.click(
      await within(dialog).findByRole("button", {
        name: "Confirmar importación",
      }),
    );
    const confirmation = screen.getByRole("dialog", {
      name: "¿Incorporar los datos revisados?",
    });
    mocks.write.mockRejectedValueOnce(
      Error("No se pudo escribir la importación."),
    );
    await user.click(
      within(confirmation).getByRole("button", {
        name: "Confirmar",
        exact: true,
      }),
    );
    await waitFor(() =>
      expect(within(dialog).getByRole("alert").textContent).toContain(
        "No se pudo escribir",
      ),
    );
    expect(document.body.style.overflow).toBe("hidden");
    await user.click(
      within(dialog).getByRole("button", { name: "Cerrar formulario" }),
    );
    expect(document.body.style.overflow).toBe("");
  });

  it("restablece los filtros al navegar para que Resumen y Linaje no oculten registros", async () => {
    await ready();
    const user = userEvent.setup();
    await user.type(
      screen.getByRole("textbox", { name: "Buscar un gallo" }),
      "canelo",
    );
    expect(
      screen.queryByRole("button", { name: "Ver ficha de Ámbar" }),
    ).toBeNull();
    await navigate("Resumen");
    expect(
      screen.getByRole("button", { name: "Ver ficha de Ámbar" }),
    ).toBeTruthy();
    expect(
      (
        screen.getByRole("textbox", {
          name: "Buscar un gallo",
        }) as HTMLInputElement
      ).value,
    ).toBe("");
  });
  it("adapta el alto disponible cuando aparece el teclado y limpia las métricas al desmontar", async () => {
    const previous = Object.getOwnPropertyDescriptor(window, "visualViewport");
    const viewport = Object.assign(new window.EventTarget(), {
      height: window.innerHeight,
    });
    Object.defineProperty(window, "visualViewport", {
      configurable: true,
      value: viewport,
    });
    try {
      await ready();
      await waitFor(() =>
        expect(
          document.documentElement.style.getPropertyValue("--app-height"),
        ).toBe(window.innerHeight + "px"),
      );
      await userEvent.click(
        screen.getByRole("textbox", { name: "Buscar un gallo" }),
      );
      viewport.height = 400;
      act(() => viewport.dispatchEvent(new Event("resize")));
      await waitFor(() =>
        expect(
          document.documentElement.style.getPropertyValue("--app-height"),
        ).toBe("400px"),
      );
      expect(document.body.dataset.keyboard).toBe("true");
      cleanup();
      expect(
        document.documentElement.style.getPropertyValue("--app-height"),
      ).toBe("");
    } finally {
      if (previous) Object.defineProperty(window, "visualViewport", previous);
      else Reflect.deleteProperty(window, "visualViewport");
    }
  });
});

it("selecciona entre páginas y limita la exportación de 1200 registros", async () => {
  const birds = Array.from({ length: 1200 }, (_, i) => ({
    ...emptyBird(),
    id: "bulk-" + i,
    name: "Gallo " + String(i + 1).padStart(4, "0"),
    code: "B-" + i,
  }));
  mocks.read.mockResolvedValue({ birds, events: [] });
  render(<App />);
  await screen.findByRole("button", { name: "Ver ficha de Gallo 0001" });
  const user = await navigate("Mis gallos");
  expect(screen.getAllByRole("button", { name: /^Ver ficha de/ })).toHaveLength(
    20,
  );
  await user.click(
    screen.getByRole("checkbox", {
      name: "Seleccionar Gallo 0001",
      exact: true,
    }),
  );
  await user.click(screen.getByRole("button", { name: "Siguiente" }));
  await user.click(
    screen.getByRole("checkbox", {
      name: "Seleccionar Gallo 0021",
      exact: true,
    }),
  );
  expect(screen.getByText("2 seleccionados")).toBeTruthy();
  const quantity = screen.getByLabelText("Cantidad a seleccionar");
  await user.clear(quantity);
  await user.type(quantity, "125");
  await user.click(
    screen.getByRole("button", { name: "Seleccionar cantidad" }),
  );
  expect(screen.getByText("125 seleccionados")).toBeTruthy();
  await user.click(screen.getByRole("button", { name: /Exportar selección/ }));
  const dialog = screen.getByRole("dialog", { name: "Exportar tus datos" });
  expect(
    (within(dialog).getByLabelText("Cantidad a exportar") as HTMLInputElement)
      .value,
  ).toBe("125");
  await user.clear(within(dialog).getByLabelText("Cantidad a exportar"));
  await user.type(within(dialog).getByLabelText("Cantidad a exportar"), "50");
  expect(within(dialog).getByText("Exportarás 50 gallos.")).toBeTruthy();
});
it("importa exactamente 37 de 1100 gallos después de revisar y confirmar", async () => {
  await ready();
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Importar datos" }));
  const dialog = screen.getByRole("dialog", { name: "Importar datos" });
  const data = {
    birds: Array.from({ length: 1100 }, (_, i) => ({
      ...emptyBird(),
      id: "incoming-" + i,
      name: "Importado " + i,
      code: "I-" + i,
    })),
    events: [],
  };
  const content = JSON.stringify(data),
    file = new File([content], "lote.json", { type: "application/json" });
  Object.defineProperty(file, "text", { value: async () => content });
  await user.upload(
    within(dialog).getByLabelText("Seleccionar archivo JSON o CSV"),
    file,
  );
  const quantity = await within(dialog).findByLabelText(
    "Cantidad a seleccionar",
  );
  await user.clear(quantity);
  await user.type(quantity, "37");
  await user.click(
    within(dialog).getByRole("button", { name: "Seleccionar cantidad" }),
  );
  expect(within(dialog).getByText("37 seleccionados")).toBeTruthy();
  await user.click(
    within(dialog).getByRole("button", { name: "Confirmar importación" }),
  );
  await user.click(
    within(
      screen.getByRole("dialog", { name: "¿Incorporar los datos revisados?" }),
    ).getByRole("button", { name: "Confirmar", exact: true }),
  );
  await waitFor(() => expect(mocks.write).toHaveBeenCalled());
  expect(mocks.write.mock.calls.at(-1)![0].birds).toHaveLength(39);
});
