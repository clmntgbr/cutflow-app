"use client"

import { clearRealtimeConnection, getRealtimeConnection } from "@/lib/media/realtime"
import { Centrifuge } from "centrifuge"

type PublicationHandler = (data: unknown) => void

let client: Centrifuge | null = null
let starting: Promise<void> | null = null
let subscribers = 0
let releaseTimer: ReturnType<typeof setTimeout> | null = null
const handlers = new Set<PublicationHandler>()

export function subscribeRealtime(handler: PublicationHandler) {
  handlers.add(handler)
  subscribers += 1
  if (releaseTimer) {
    clearTimeout(releaseTimer)
    releaseTimer = null
  }
  void ensureClient()

  return () => {
    handlers.delete(handler)
    subscribers -= 1
    if (subscribers > 0) return
    releaseTimer = setTimeout(() => {
      if (subscribers > 0) return
      client?.disconnect()
      client = null
      clearRealtimeConnection()
    }, 100)
  }
}

function ensureClient() {
  if (client) return Promise.resolve()
  if (!starting) starting = connect()
  return starting
}

async function connect() {
  try {
    const connection = await getRealtimeConnection()
    if (!connection || subscribers === 0 || client) return

    const next = new Centrifuge(connection.wsUrl, {
      token: connection.token,
      getToken: async () => {
        const refreshed = await getRealtimeConnection(true)
        if (!refreshed?.token) {
          throw new Error("Realtime token refresh failed")
        }
        return refreshed.token
      },
    })

    const subscription = next.newSubscription(connection.channel)
    subscription.on("publication", (ctx) => {
      console.log("[realtime]", ctx.data)
      for (const handler of handlers) handler(ctx.data)
    })
    subscription.subscribe()
    next.connect()
    client = next
  } finally {
    starting = null
  }
}
