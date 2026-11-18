import { Capacitor } from "@capacitor/core";

interface DesktopMedia {
  write(id: string, bytes: Uint8Array): Promise<void>;
  read(id: string): Promise<Uint8Array<ArrayBuffer>>;
  remove(id: string): Promise<void>;
}

declare global {
  interface Window {
    registroMedia?: DesktopMedia;
  }
}

function desktopMedia() {
  return typeof window === "undefined" ? undefined : window.registroMedia;
}

export async function storeNativeFile(id: string, blob: Blob, base64: string) {
  const desktop = desktopMedia();
  if (desktop) {
    await desktop.write(id, new Uint8Array(await blob.arrayBuffer()));
    return true;
  }
  if (!Capacitor.isNativePlatform()) return false;
  const { Directory, Filesystem } = await import("@capacitor/filesystem");
  const path = "media/" + id;
  const temporary = path + "." + crypto.randomUUID() + ".tmp";
  try {
    await Filesystem.writeFile({
      path: temporary,
      directory: Directory.Data,
      data: base64,
      recursive: true,
    });
    await Filesystem.rename({
      from: temporary,
      to: path,
      directory: Directory.Data,
    });
    return true;
  } finally {
    await Filesystem.deleteFile({
      path: temporary,
      directory: Directory.Data,
    }).catch(() => {});
  }
}

export async function readNativeFile(id: string, type: string) {
  const desktop = desktopMedia();
  if (desktop) return new Blob([await desktop.read(id)], { type });
  if (!Capacitor.isNativePlatform())
    throw Error("Archivo privado no disponible.");
  const { Directory, Filesystem } = await import("@capacitor/filesystem");
  const { data } = await Filesystem.readFile({
    path: "media/" + id,
    directory: Directory.Data,
  });
  if (data instanceof Blob) return data.slice(0, data.size, type);
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++)
    bytes[index] = binary.charCodeAt(index);
  return new Blob([bytes], { type });
}

export async function removeNativeFile(id: string) {
  const desktop = desktopMedia();
  if (desktop) return desktop.remove(id);
  if (!Capacitor.isNativePlatform()) return;
  const { Directory, Filesystem } = await import("@capacitor/filesystem");
  await Filesystem.deleteFile({
    path: "media/" + id,
    directory: Directory.Data,
  });
}
