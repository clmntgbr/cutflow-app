"use client"

import { Toaster as Sonner, type ToasterProps } from "sonner"

function Toaster({ ...props }: ToasterProps) {
  return (
    <Sonner
      className="toaster group"
      toastOptions={{
        classNames: {
          toast: "bg-popover text-popover-foreground border-border",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
