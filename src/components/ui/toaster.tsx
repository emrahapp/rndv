"use client";

import { Toaster as SonnerToaster } from "sonner";

/** Single mount point for app-wide toasts. Styled to match link.com theme. */
export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast:
            "!rounded-2xl !border !border-border !bg-card !text-card-foreground !shadow-sm",
          title: "!text-sm !font-semibold",
          description: "!text-sm !text-muted-foreground",
          actionButton: "!bg-primary !text-primary-foreground",
          cancelButton: "!bg-muted !text-foreground",
          closeButton: "!bg-background !border !border-border",
          success: "!text-foreground",
          error: "!text-destructive",
        },
      }}
    />
  );
}
