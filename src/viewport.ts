import { useEffect, useSyncExternalStore } from "react";
const PHONE_QUERY = "(max-width: 1100px)";
const subscribePhone = (callback: () => void) => {
  const media = window.matchMedia(PHONE_QUERY);
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
};
export function usePhoneLayout() {
  return useSyncExternalStore(
    subscribePhone,
    () => window.matchMedia(PHONE_QUERY).matches,
    () => false,
  );
}
export function useViewport() {
  useEffect(() => {
    const root = document.documentElement,
      viewport = window.visualViewport;
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const height = viewport?.height || window.innerHeight;
        root.style.setProperty("--app-height", `${Math.round(height)}px`);
        const editing = document.activeElement?.matches(
          "input,textarea,select",
        );
        const keyboard =
          !!editing && !!viewport && window.innerHeight - height > 140;
        document.body.dataset.keyboard = String(keyboard);
        if (keyboard && document.activeElement instanceof HTMLElement)
          document.activeElement.scrollIntoView?.({ block: "nearest" });
      });
    };
    update();
    viewport?.addEventListener("resize", update);
    window.addEventListener("resize", update);
    document.addEventListener("focusin", update);
    document.addEventListener("focusout", update);
    return () => {
      cancelAnimationFrame(frame);
      viewport?.removeEventListener("resize", update);
      window.removeEventListener("resize", update);
      document.removeEventListener("focusin", update);
      document.removeEventListener("focusout", update);
      root.style.removeProperty("--app-height");
      delete document.body.dataset.keyboard;
    };
  }, []);
}
