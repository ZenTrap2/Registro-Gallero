import { useEffect, useState } from "react";
export function StorageStatus({ records }: { records: number }) {
  const [quota, setQuota] = useState<{ usage?: number; quota?: number }>({});
  useEffect(() => {
    let active = true;
    navigator.storage
      ?.estimate?.()
      .then((value) => {
        if (active) setQuota(value);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [records]);
  const mb = (bytes: number) =>
    new Intl.NumberFormat("es", { maximumFractionDigits: 1 }).format(
      bytes / 1048576,
    );
  return (
    <section className="panel storage-status">
      <h2>Almacenamiento del dispositivo</h2>
      <p>
        {records.toLocaleString("es")} gallos registrados. Las fotografías se
        cargan bajo demanda.
      </p>
      {quota.quota && (
        <>
          <progress max={quota.quota} value={quota.usage || 0} />
          <p>
            {mb(quota.usage || 0)} MB usados de aproximadamente{" "}
            {mb(quota.quota)} MB disponibles para este sitio.
          </p>
        </>
      )}
      <p className="help">
        La capacidad depende del navegador y del espacio del dispositivo. Para
        criaderos grandes conserva copias JSON por lotes; las fotos originales
        pueden ocupar mucho más que los campos de texto.
      </p>
    </section>
  );
}
