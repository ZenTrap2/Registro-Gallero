import type { ProgressHandler } from "./storage";
import { Capacitor } from "@capacitor/core";
export type FileDestination = "download" | "share";
export function fileSuccess(destination: FileDestination) {
  return destination === "share"
    ? "Archivo preparado para guardar o compartir."
    : "Archivo preparado. Revisa tus descargas.";
}
export async function saveFile(
  filename: string,
  blob: Blob,
  onProgress?: ProgressHandler,
): Promise<FileDestination> {
  if (Capacitor.isNativePlatform()) {
    const [{ Filesystem, Directory }, { Share }] = await Promise.all([
      import("@capacitor/filesystem"),
      import("@capacitor/share"),
    ]);
    let uri = "";
    const path = `exports/${filename}`;
    try {
      for (
        let offset = 0;
        offset < blob.size || offset === 0;
        offset += 512 * 1024
      ) {
        const bytes = new Uint8Array(
          await blob.slice(offset, offset + 512 * 1024).arrayBuffer(),
        );
        let binary = "";
        for (let i = 0; i < bytes.length; i += 8192)
          binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
        const options = {
          path,
          data: btoa(binary),
          directory: Directory.Cache,
        };
        if (!offset) {
          const first = await Filesystem.writeFile({
            ...options,
            recursive: true,
          });
          uri = first.uri;
        } else await Filesystem.appendFile(options);
        onProgress?.({
          label: "Guardando archivo",
          completed: Math.min(blob.size, offset + 512 * 1024),
          total: blob.size,
        });
        if (offset % (4 * 1024 * 1024) === 0)
          await new Promise((r) => setTimeout(r, 0));
      }
    } catch (error) {
      try {
        await Filesystem.deleteFile({ path, directory: Directory.Cache });
      } catch {}
      throw error;
    }
    const file = { uri };
    await Share.share({
      title: filename,
      url: file.uri,
      dialogTitle: "Guardar o compartir archivo",
    });
    return "share";
  }
  const url = URL.createObjectURL(blob),
    link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
  return "download";
}
