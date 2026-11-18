const fs = require("node:fs/promises");
const path = require("node:path");
const { randomUUID, createHash } = require("node:crypto");

function installMediaHandlers(ipcMain, root) {
  function mediaPath(event, id) {
    const url = new URL(event.senderFrame?.url || "about:blank");
    if (
      url.protocol !== "registro:" ||
      url.hostname !== "app" ||
      typeof id !== "string" ||
      !/^[a-f0-9]{64}$/.test(id)
    ) {
      throw Error("Solicitud de archivo inválida.");
    }
    return path.join(root, id);
  }
  ipcMain.handle("media:write", async (event, id, value) => {
    const target = mediaPath(event, id);
    if (
      !(value instanceof Uint8Array) ||
      !value.length ||
      value.length > 10 * 1024 * 1024 ||
      createHash("sha256").update(value).digest("hex") !== id
    ) {
      throw Error("Contenido de archivo inválido.");
    }
    await fs.mkdir(root, { recursive: true });
    const temporary = target + "." + randomUUID() + ".tmp";
    try {
      await fs.writeFile(temporary, value, { flag: "wx" });
      await fs.rename(temporary, target);
    } finally {
      await fs.rm(temporary, { force: true });
    }
  });
  ipcMain.handle(
    "media:read",
    async (event, id) =>
      new Uint8Array(await fs.readFile(mediaPath(event, id))),
  );
  ipcMain.handle("media:remove", (event, id) =>
    fs.rm(mediaPath(event, id), { force: true }),
  );
}

module.exports = { installMediaHandlers };
