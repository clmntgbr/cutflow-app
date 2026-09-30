import { Centrifuge } from "centrifuge"
import type {
  MediaFileUploadedRealtimePayload,
  RealtimeConnection,
} from "./types"

const CONFIRM_TIMEOUT_MS = 90_000

let connectionRequest: Promise<RealtimeConnection | null> | null = null

export function getRealtimeConnection(force = false): Promise<RealtimeConnection | null> {
  if (force) connectionRequest = null
  if (!connectionRequest) {
    connectionRequest = fetchRealtimeConnection().then((connection) => {
      if (!connection) connectionRequest = null
      return connection
    })
  }
  return connectionRequest
}

export function clearRealtimeConnection() {
  connectionRequest = null
}

async function fetchRealtimeConnection(): Promise<RealtimeConnection | null> {
  try {
    const response = await fetch("/api/realtime/connection", {
      method: "GET",
      cache: "no-store",
    })

    if (!response.ok) return null

    const data = (await response.json()) as Partial<RealtimeConnection>
    if (!data.token || !data.channel || !data.wsUrl) return null

    return {
      token: data.token,
      channel: data.channel,
      wsUrl: data.wsUrl,
    }
  } catch {
    return null
  }
}

export interface UploadConfirmationListener {
  confirmed: Promise<MediaFileUploadedRealtimePayload>
  stop: () => void
}

export async function listenForMediaFileUploaded(
  mediaFileId: string,
  signal?: AbortSignal
): Promise<UploadConfirmationListener> {
  const connection = await getRealtimeConnection()
  if (!connection) {
    throw new Error("Realtime connection unavailable")
  }

  if (signal?.aborted) {
    throw new DOMException("Aborted", "AbortError")
  }

  let centrifuge: Centrifuge | null = null
  let settled = false
  let rejectConfirmed: ((error: unknown) => void) | null = null

  const confirmed = new Promise<MediaFileUploadedRealtimePayload>(
    (resolve, reject) => {
      rejectConfirmed = reject

      const finish = (fn: () => void) => {
        if (settled) return
        settled = true
        signal?.removeEventListener("abort", onAbort)
        centrifuge?.disconnect()
        fn()
      }

      const onAbort = () => {
        finish(() => reject(new DOMException("Aborted", "AbortError")))
      }

      signal?.addEventListener("abort", onAbort, { once: true })

      centrifuge = new Centrifuge(connection.wsUrl, {
        token: connection.token,
      })

      const subscription = centrifuge.newSubscription(connection.channel)
      subscription.on("publication", (ctx) => {
        if (isMediaFileUploadedEvent(ctx.data, mediaFileId)) {
          finish(() => resolve(ctx.data))
        }
      })

      subscription.subscribe()
      centrifuge.connect()
    }
  )

  void confirmed.catch(() => {})

  return {
    confirmed,
    stop: () => {
      if (settled) return
      settled = true
      centrifuge?.disconnect()
      rejectConfirmed?.(new DOMException("Aborted", "AbortError"))
    },
  }
}

export function waitForUploadConfirmation(
  confirmed: Promise<MediaFileUploadedRealtimePayload>,
  signal?: AbortSignal
): Promise<MediaFileUploadedRealtimePayload> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("Upload confirmation timed out. Try again."))
    }, CONFIRM_TIMEOUT_MS)

    const onAbort = () => {
      clearTimeout(timer)
      reject(new DOMException("Aborted", "AbortError"))
    }

    signal?.addEventListener("abort", onAbort, { once: true })

    confirmed.then(
      (payload) => {
        clearTimeout(timer)
        signal?.removeEventListener("abort", onAbort)
        resolve(payload)
      },
      (error: unknown) => {
        clearTimeout(timer)
        signal?.removeEventListener("abort", onAbort)
        reject(error)
      }
    )
  })
}

function isMediaFileUploadedEvent(
  data: unknown,
  mediaFileId: string
): data is MediaFileUploadedRealtimePayload {
  if (!data || typeof data !== "object") return false
  const event = data as Record<string, unknown>
  const type = typeof event.type === "string" ? event.type.replace(/\.v\d+$/, "") : ""
  return (
    type === "media_file.uploaded" &&
    event.mediaFileId === mediaFileId &&
    event.status === "uploaded"
  )
}
