"use client"

import { queryKeys } from "@/lib/query/keys"
import { subscribeRealtime } from "@/lib/realtime/subscribe"
import { useQueryClient } from "@tanstack/react-query"
import { useEffect, useRef } from "react"

export function useTimelineEvents(
  projectId: string,
  mediaFileId: string,
  onUpdated: () => void
) {
  const queryClient = useQueryClient()
  const onUpdatedRef = useRef(onUpdated)

  useEffect(() => {
    onUpdatedRef.current = onUpdated
  }, [onUpdated])

  useEffect(() => {
    if (!projectId || !mediaFileId) return

    return subscribeRealtime((data) => {
      const event = parseTimelineUpdated(data)
      if (!event || event.projectId !== projectId || event.mediaFileId !== mediaFileId) return

      onUpdatedRef.current()
      void queryClient.refetchQueries({
        queryKey: queryKeys.editor.detail(mediaFileId),
      })
    })
  }, [mediaFileId, projectId, queryClient])
}

function parseTimelineUpdated(
  data: unknown
): { projectId: string; mediaFileId: string } | null {
  if (!data || typeof data !== "object") return null
  const event = data as Record<string, unknown>
  const type = typeof event.type === "string" ? event.type.replace(/\.v\d+$/, "") : ""
  if (type !== "media_file.timeline_updated") return null

  const projectId = readString(event, "project_id", "projectId")
  const mediaFileId = readString(event, "media_file_id", "mediaFileId")
  if (!projectId || !mediaFileId) return null

  return { projectId, mediaFileId }
}

function readString(event: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const value = event[key]
    if (typeof value === "string" && value) return value
  }
  return ""
}
