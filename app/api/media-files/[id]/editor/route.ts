import { createAuthHeaders } from "@/lib/create-auth-headers"
import { requireAuth } from "@/lib/require-auth"
import { NextResponse } from "next/server"

const BACKEND_API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL

async function proxy(
  request: Request,
  context: { params: Promise<{ id: string }> },
  method: "GET" | "PATCH"
) {
  try {
    const auth = await requireAuth()
    if ("error" in auth) return auth.error

    const { id } = await context.params
    const body = method === "PATCH" ? await request.text() : undefined
    const response = await fetch(`${BACKEND_API_URL}/api/media-files/${id}/editor`, {
      method,
      headers: createAuthHeaders(auth.token),
      body,
      cache: "no-store",
    })

    return forward(response, "Failed to load editor")
  } catch {
    return NextResponse.json({ message: "Failed to load editor" }, { status: 500 })
  }
}

export function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  return proxy(request, context, "GET")
}

export function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  return proxy(request, context, "PATCH")
}

async function forward(response: Response, fallbackMessage: string) {
  const text = await response.text()
  if (!text) return new NextResponse(null, { status: response.status })

  try {
    return NextResponse.json(JSON.parse(text), { status: response.status })
  } catch {
    return NextResponse.json({ message: fallbackMessage }, { status: response.status })
  }
}
