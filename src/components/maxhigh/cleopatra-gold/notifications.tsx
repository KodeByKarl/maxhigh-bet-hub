import { Toaster } from "sonner";
import { toasterId } from "./toast";

export function CleopatraNotifications() {
  return (
    <Toaster
      id={toasterId}
      position="top-center"
      offset="max(12px, env(safe-area-inset-top))"
      mobileOffset="max(12px, env(safe-area-inset-top))"
      visibleToasts={1}
      gap={6}
      style={{
        width: "min(240px, calc(100vw - 32px))",
        left: "50%",
        right: "auto",
        transform: "translateX(-50%)",
        zIndex: 200,
      }}
      toastOptions={{
        style: {
          width: "100%",
          padding: "8px 12px",
          minHeight: 0,
          fontSize: "11px",
          borderRadius: "12px",
          background: "rgba(28, 22, 13, 0.96)",
          border: "1px solid rgba(213, 181, 107, 0.5)",
          color: "#fff0c4",
        },
      }}
    />
  );
}
