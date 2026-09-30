"use client"

import { queryKeys } from "@/lib/query/keys"
import { subscribeRealtime } from "@/lib/realtime/subscribe"
import { useQueryClient } from "@tanstack/react-query"
import { useEffect, useRef } from "react"

export function useTimelineEvents(
  projectId: string,
  mediaFileId: string,
  timelineVersion: number | null,
  handlers: {
    onUpdated: () => void
    onFailed: () => void
  }
) {
  const queryClient = useQueryClient()
  const versionRef = useRef(timelineVersion)
  const onUpdatedRef = useRef(handlers.onUpdated)
  const onFailedRef = useRef(handlers.onFailed)

  useEffect(() => {
    versionRef.current = timelineVersion
  }, [timelineVersion])

  useEffect(() => {
    onUpdatedRef.current = handlers.onUpdated
    onFailedRef.current = handlers.onFailed
  }, [handlers.onFailed, handlers.onUpdated])

  useEffect(() => {
    if (!mediaFileId) return

    return subscribeRealtime((data) => {
      const event = parseTimelineEvent(data)
      if (!event) return
      if (event.projectId !== projectId || event.mediaFileId !== mediaFileId) {
        if (event.kind === "updated") {
          console.log("[realtime] timeline_updated skipped", {
            openProjectId: projectId,
            eventProjectId: event.projectId,
            openMediaFileId: mediaFileId,
            eventMediaFileId: event.mediaFileId,
          })
        }
        return
      }

      if (event.kind === "failed") {
        onFailedRef.current()
        return
      }

      const current = versionRef.current
      if (current != null && event.version < current) return

      onUpdatedRef.current()
      void queryClient.refetchQueries({
        queryKey: queryKeys.editor.detail(mediaFileId),
      })
    })
  }, [mediaFileId, projectId, queryClient])
}

type TimelineEvent =
  | { kind: "updated"; projectId: string; mediaFileId: string; version: number }
  | { kind: "failed"; projectId: string; mediaFileId: string }

function parseTimelineEvent(data: unknown): TimelineEvent | null {
  if (!data || typeof data !== "object") return null
  const event = data as Record<string, unknown>
  const type = typeof event.type === "string" ? event.type.replace(/\.v\d+$/, "") : ""
  const projectId = readString(event, "project_id", "projectId")
  const mediaFileId = readString(event, "media_file_id", "mediaFileId")
  if (!projectId || !mediaFileId) return null

  if (type === "media_file.timeline_updated") {
    const version = readNumber(event, "version")
    if (version == null) return null
    return { kind: "updated", projectId, mediaFileId, version }
  }

  if (type === "media_file.timeline_failed") {
    return { kind: "failed", projectId, mediaFileId }
  }

  return null
}

function readString(event: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const value = event[key]
    if (typeof value === "string" && value) return value
  }
  return ""
}

function readNumber(event: Record<string, unknown>, key: string): number | null {
  const value = event[key]
  return typeof value === "number" ? value : null
}
