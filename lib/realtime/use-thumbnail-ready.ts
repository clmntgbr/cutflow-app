"use client"

import { getRealtimeConnection } from "@/lib/media/realtime"
import { Centrifuge } from "centrifuge"
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
    let centrifuge: Centrifuge | null = null
    let cancelled = false

    const connect = async () => {
      const connection = await getRealtimeConnection()
      if (cancelled || !connection) return

      centrifuge = new Centrifuge(connection.wsUrl, {
        token: connection.token,
        getToken: async () => {
          const next = await getRealtimeConnection()
          if (!next?.token) {
            throw new Error("Realtime token refresh failed")
          }
          return next.token
        },
      })

      const subscription = centrifuge.newSubscription(connection.channel)
      subscription.on("publication", (ctx) => {
        const event = parseThumbnailReady(ctx.data)
        if (event) onReadyRef.current(event)
      })
      subscription.subscribe()
      centrifuge.connect()
    }

    void connect()

    return () => {
      cancelled = true
      centrifuge?.disconnect()
    }
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
