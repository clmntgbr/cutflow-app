"use client"

import { subscribeRealtime } from "@/lib/realtime/subscribe"
import { useEffect, useRef } from "react"

export interface ThumbnailReadyEvent {
  projectId: string
  mediaFileId: string
  thumbnailUrl: string
  occurredAt?: string
}

export function useThumbnailReady(
  onReady: (event: ThumbnailReadyEvent) => void
) {
  const onReadyRef = useRef(onReady)

  useEffect(() => {
    onReadyRef.current = onReady
  }, [onReady])

  useEffect(() => {
    return subscribeRealtime((data) => {
      const event = parseThumbnailReady(data)
      if (event) onReadyRef.current(event)
    })
  }, [])
}

function parseThumbnailReady(data: unknown): ThumbnailReadyEvent | null {
  if (!data || typeof data !== "object") return null
  const event = data as Record<string, unknown>
  const type =
    typeof event.type === "string" ? event.type.replace(/\.v\d+$/, "") : ""
  if (type !== "media_file.thumbnail_ready") return null
  if (typeof event.projectId !== "string" || typeof event.thumbnailUrl !== "string") {
    return null
  }
  if (!event.thumbnailUrl) return null

  return {
    projectId: event.projectId,
    mediaFileId: typeof event.mediaFileId === "string" ? event.mediaFileId : "",
    thumbnailUrl: event.thumbnailUrl,
    occurredAt: typeof event.occurredAt === "string" ? event.occurredAt : undefined,
  }
}

export function thumbnailSrc(url: string, version?: string): string {
  const base = url.split("?")[0]
  const token = version && version.length > 0 ? version : String(Date.now())
  return `${base}?v=${encodeURIComponent(token)}`
}
