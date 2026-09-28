"use client"

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { ApiError } from "@/lib/api-error"
import { getProject } from "@/lib/project/api"
import { useEffect } from "react"
import { toast } from "sonner"

export function ProjectDetailDrawer({
  projectId,
  open,
  onOpenChange,
}: {
  projectId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  useEffect(() => {
    if (!open || !projectId) return

    const controller = new AbortController()

    void getProject(projectId, controller.signal).catch((error: unknown) => {
      if (controller.signal.aborted) return
      const message =
        error instanceof ApiError ? error.message : "Failed to get project"
      toast.error(message)
    })

    return () => controller.abort()
  }, [open, projectId])

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      <DrawerContent
        className="flex h-full w-[80vw]! max-w-[80vw]! flex-col"
        style={{ width: "80vw", maxWidth: "80vw", backgroundColor: "#f9f9f9" }}
      >
        <DrawerHeader className="sr-only">
          <DrawerTitle>Project</DrawerTitle>
        </DrawerHeader>
      </DrawerContent>
    </Drawer>
  )
}
