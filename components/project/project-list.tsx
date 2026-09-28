"use client"

import {
  Attachment,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
  AttachmentTrigger,
} from "@/components/ui/attachment"
import { Button } from "@/components/ui/button"
import { UploadVideoButton } from "@/components/upload/upload-video-button"
import { ApiError } from "@/lib/api-error"
import { listProjects } from "@/lib/project/api"
import type { ProjectListItem } from "@/lib/project/types"
import {
  thumbnailSrc,
  useThumbnailReady,
} from "@/lib/realtime/use-thumbnail-ready"
import { useCallback, useEffect, useState } from "react"
import { ProjectDetailDrawer } from "./project-detail-drawer"

export function ProjectList() {
  const [projects, setProjects] = useState<ProjectListItem[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  useThumbnailReady((event) => {
    const nextUrl = thumbnailSrc(event.thumbnailUrl, event.occurredAt)
    setProjects((current) =>
      current.map((project) =>
        project.id === event.projectId
          ? { ...project, thumbnailUrl: nextUrl }
          : project
      )
    )
  })

  const load = useCallback(async (nextPage: number, signal?: AbortSignal) => {
    const result = await listProjects(nextPage, signal)
    setProjects((current) =>
      nextPage === 1 ? result.members : [...current, ...result.members]
    )
    setPage(result.page)
    setTotalPages(result.totalPages)
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    setIsLoading(true)
    setError(null)

    void load(1, controller.signal)
      .catch((caught: unknown) => {
        if (controller.signal.aborted) return
        setError(
          caught instanceof ApiError ? caught.message : "Failed to list projects"
        )
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false)
      })

    return () => controller.abort()
  }, [load, refreshKey])

  async function loadMore() {
    setIsLoading(true)
    setError(null)
    try {
      await load(page + 1, undefined)
    } catch (caught: unknown) {
      setError(
        caught instanceof ApiError ? caught.message : "Failed to list projects"
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-end">
        <UploadVideoButton onUploaded={() => setRefreshKey((value) => value + 1)} />
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {projects.length === 0 && !isLoading ? (
        <p className="text-sm text-muted-foreground">No projects yet.</p>
      ) : (
        <div className="flex flex-wrap gap-6">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onOpen={() => {
                setSelectedId(project.id)
                setDetailOpen(true)
              }}
            />
          ))}
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading projects…</p>
      ) : null}

      {page < totalPages ? (
        <Button
          type="button"
          variant="outline"
          className="w-fit"
          onClick={() => void loadMore()}
          disabled={isLoading}
        >
          Load more
        </Button>
      ) : null}

      <ProjectDetailDrawer
        projectId={selectedId}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  )
}

function ProjectThumbnail({ url }: { url?: string | null }) {
  const [unavailable, setUnavailable] = useState(!url)

  useEffect(() => {
    setUnavailable(!url)
  }, [url])

  if (!url || unavailable) {
    return <div className="size-full bg-muted" aria-hidden="true" />
  }

  return (
    // The thumbnail route can 404 until the worker has written the file.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      key={url}
      src={url}
      alt=""
      className="size-full object-cover"
      onError={() => setUnavailable(true)}
    />
  )
}

function ProjectCard({
  project,
  onOpen,
}: {
  project: ProjectListItem
  onOpen: () => void
}) {
  return (
    <Attachment
      orientation="vertical"
      state="done"
      className="w-80! max-w-none has-data-[slot=attachment-content]:w-80!"
    >
      <AttachmentMedia variant="image" className="aspect-video! bg-muted">
        <ProjectThumbnail url={project.thumbnailUrl} />
      </AttachmentMedia>
      <AttachmentContent>
        <AttachmentTitle>{project.name}</AttachmentTitle>
        <div className="mt-0.5 flex h-4 items-center">
          <AttachmentDescription className="mt-0">
            {project.status}
          </AttachmentDescription>
        </div>
      </AttachmentContent>
      <AttachmentTrigger asChild>
        <button type="button" aria-label={`Open ${project.name}`} onClick={onOpen} />
      </AttachmentTrigger>
    </Attachment>
  )
}
