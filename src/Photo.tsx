import { useEffect, useState } from "react";
import { getPhoto, isPhotoReference } from "./storage";
import Rooster from "./Rooster";
const leases = new Map<string, { count: number; source: Promise<string> }>();
function acquire(reference: string, small: boolean) {
  const key = reference + (small ? ":small" : ":full");
  let entry = leases.get(key);
  if (!entry) {
    entry = {
      count: 0,
      source: getPhoto(reference, small).then((blob) =>
        URL.createObjectURL(blob),
      ),
    };
    leases.set(key, entry);
  }
  entry.count++;
  const captured = entry;
  return {
    source: entry.source,
    release: () => {
      captured.count--;
      if (!captured.count) {
        leases.delete(key);
        captured.source
          .then((url) => {
            if (!captured.count) URL.revokeObjectURL(url);
          })
          .catch(() => {});
      }
    },
  };
}
type PhotoProps = {
  source: string;
  alt?: string;
  thumbnail?: boolean;
  className?: string;
};
export function Photo(props: PhotoProps) {
  // Remount on a source change so an error from a revoked URL cannot hide its replacement.
  return <PhotoImage key={String(props.thumbnail) + props.source} {...props} />;
}
function PhotoImage({
  source,
  alt = "",
  thumbnail = false,
  ...props
}: PhotoProps) {
  const [url, setUrl] = useState(isPhotoReference(source) ? "" : source),
    [failed, setFailed] = useState(false);
  useEffect(() => {
    setFailed(false);
    if (!isPhotoReference(source)) {
      setUrl(source);
      return;
    }
    let active = true;
    setUrl("");
    const lease = acquire(source, thumbnail);
    lease.source
      .then((value) => {
        if (active) setUrl(value);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
      lease.release();
    };
  }, [source, thumbnail]);
  if (failed)
    return (
      <span className="photo-unavailable" title="Fotografía no disponible">
        <Rooster />
        <span className="sr-only">Fotografía no disponible</span>
      </span>
    );
  if (!url)
    return <span className="photo-loading" aria-label="Cargando fotografía" />;
  return (
    <img
      {...props}
      src={url}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}
