import { toast as sonnerToast } from "sonner";

export const toasterId = "cleopatra-notifications";
const options = { toasterId, duration: 1800 };

export const cleopatraToast = {
  error: (message: string) => sonnerToast.error(message, options),
  info: (message: string) => sonnerToast.info(message, options),
  message: (message: string) => sonnerToast.message(message, options),
  custom: (...[render, settings]: Parameters<typeof sonnerToast.custom>) =>
    sonnerToast.custom(render, {
      ...settings,
      toasterId,
      style: {
        ...settings?.style,
        background: "transparent",
        border: "none",
        padding: 0,
        boxShadow: "none",
        minHeight: 0,
      },
    }),
};
