"use client"

import { Editor } from "@/components/editor/editor"
import { ProjectScreen } from "@/components/editor/project-screen"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { ApiError } from "@/lib/api-error"
import { useProject } from "@/lib/project/hooks"

function errorMessage(error: unknown) {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error && error.message) return error.message
  return "Failed to load project"
}

export function ProjectWorkspaceDrawer({
  projectId,
  open,
  onOpenChange,
}: {
  projectId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="right" handleOnly>
      <DrawerContent
        className="flex h-full w-[90vw]! max-w-[90vw]! flex-col"
        style={{ width: "90vw", maxWidth: "90vw", backgroundColor: "#f9f9f9" }}
      >
        <DrawerHeader className="sr-only">
          <DrawerTitle>Project</DrawerTitle>
        </DrawerHeader>
        <div className="flex min-h-0 flex-1 flex-col">
          {projectId ? <ProjectWorkspace projectId={projectId} /> : null}
        </div>
      </DrawerContent>
    </Drawer>
  )
}

function ProjectWorkspace({ projectId }: { projectId: string }) {
  const query = useProject(projectId)
  const project = query.data

  if (query.isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        Loading project…
      </div>
    )
  }

  if (query.isError || !project) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 text-sm text-destructive">
        {errorMessage(query.error)}
      </div>
    )
  }

  const mediaFile = project.mediaFiles[0]
  if ((project.status === "ready" || project.status === "completed") && mediaFile) {
    return <Editor projectId={projectId} mediaFileId={mediaFile.id} />
  }

  if (project.status === "ready" || project.status === "completed") {
    return (
      <div className="flex flex-1 items-center justify-center px-6 text-sm text-muted-foreground">
        This project has no video.
      </div>
    )
  }

  return <ProjectScreen projectId={projectId} />
}
