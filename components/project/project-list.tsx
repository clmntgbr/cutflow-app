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
import { useProjects } from "@/lib/project/hooks"
import type { PaginatedProjects, ProjectListItem } from "@/lib/project/types"
import { queryKeys } from "@/lib/query/keys"
import {
  thumbnailSrc,
  useThumbnailReady,
} from "@/lib/realtime/use-thumbnail-ready"
import { useQueryClient, type InfiniteData } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { ProjectWorkspaceDrawer } from "./project-workspace-drawer"

export function ProjectList({
  openedProjectId = null,
}: {
  openedProjectId?: string | null
}) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const query = useProjects()
  const projects = query.data?.pages.flatMap((page) => page.members) ?? []

  useThumbnailReady((event) => {
    const nextUrl = thumbnailSrc(event.thumbnailUrl, event.occurredAt)
    queryClient.setQueriesData<InfiniteData<PaginatedProjects>>(
      { queryKey: queryKeys.projects.lists() },
      (current) => {
        if (!current) return current
        return {
          ...current,
          pages: current.pages.map((page) => ({
            ...page,
            members: page.members.map((project) =>
              project.id === event.projectId
                ? { ...project, thumbnailUrl: nextUrl }
                : project
            ),
          })),
        }
      }
    )
  })

  const error = query.isError
    ? query.error instanceof ApiError
      ? query.error.message
      : "Failed to list projects"
    : null

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-end">
        <UploadVideoButton />
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {projects.length === 0 && !query.isLoading ? (
        <p className="text-sm text-muted-foreground">No projects yet.</p>
      ) : (
        <div className="flex flex-wrap gap-6">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onOpen={() => router.push(`/projects/${project.id}`)}
            />
          ))}
        </div>
      )}

      {query.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading projects…</p>
      ) : null}

      {query.hasNextPage ? (
        <Button
          type="button"
          variant="outline"
          className="w-fit"
          onClick={() => void query.fetchNextPage()}
          disabled={query.isFetchingNextPage}
        >
          Load more
        </Button>
      ) : null}

      <ProjectWorkspaceDrawer
        projectId={openedProjectId}
        open={Boolean(openedProjectId)}
        onOpenChange={(next) => {
          if (!next) router.push("/")
        }}
      />
    </div>
  )
}

function ProjectThumbnail({ url }: { url?: string | null }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const unavailable = !url || failedUrl === url

  if (unavailable) {
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
      onError={() => setFailedUrl(url)}
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
