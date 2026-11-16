/// <reference lib="webworker" />
import {
  parseImportFile,
  metadataPreview,
  subsetData,
  type ImportData,
} from "./transfer";
let staged: ImportData | null = null;
self.onmessage = async (event: MessageEvent) => {
  const { requestId, type, file, ids } = event.data;
  try {
    if (type === "parse") {
      staged = await parseImportFile(file);
      postMessage({ requestId, value: metadataPreview(staged) });
    } else if (type === "select") {
      if (!staged) throw Error("Vuelve a seleccionar el archivo.");
      postMessage({ requestId, value: subsetData(staged, new Set(ids)) });
    } else if (type === "clear") {
      staged = null;
      postMessage({ requestId, value: null });
    }
  } catch (e) {
    postMessage({ requestId, error: (e as Error).message });
  }
};
