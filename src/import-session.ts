import {
  parseImportFile,
  metadataPreview,
  subsetData,
  type ImportData,
  type TransferData,
} from "./transfer";
export class ImportSession {
  private worker: Worker | undefined;
  private staged: ImportData | undefined;
  private pending = new Map<
    number,
    { resolve: (value: any) => void; reject: (error: Error) => void }
  >();
  private sequence = 0;
  constructor() {
    if (typeof Worker !== "undefined") {
      this.worker = new Worker(new URL("./import.worker.ts", import.meta.url), {
        type: "module",
      });
      this.worker.onmessage = ({ data }) => {
        const item = this.pending.get(data.requestId);
        if (!item) return;
        this.pending.delete(data.requestId);
        if (data.error) item.reject(Error(data.error));
        else item.resolve(data.value);
      };
      this.worker.onerror = () => {
        for (const item of this.pending.values())
          item.reject(
            Error("No se pudo procesar el archivo. Inténtalo de nuevo."),
          );
        this.pending.clear();
      };
    }
  }
  private call<T>(type: string, value: object = {}): Promise<T> {
    return new Promise((resolve, reject) => {
      const requestId = ++this.sequence;
      this.pending.set(requestId, { resolve, reject });
      this.worker!.postMessage({ requestId, type, ...value });
    });
  }
  async parse(file: File) {
    if (this.worker) return this.call<ImportData>("parse", { file });
    this.staged = await parseImportFile(file);
    return metadataPreview(this.staged);
  }
  async selected(ids: ReadonlySet<string>): Promise<TransferData> {
    if (this.worker) return this.call("select", { ids: [...ids] });
    if (!this.staged) throw Error("Vuelve a seleccionar el archivo.");
    return subsetData(this.staged, ids);
  }
  dispose() {
    this.worker?.terminate();
    for (const item of this.pending.values())
      item.reject(Error("Importación cancelada."));
    this.pending.clear();
    this.staged = undefined;
  }
}
