import { requireAuth } from "@/lib/require-auth"
import { NextResponse } from "next/server"

const BACKEND_API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth()
    if ("error" in auth) return auth.error

    const { id } = await context.params
    const response = await fetch(
      `${BACKEND_API_URL}/api/media-files/${id}/thumbnail`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${auth.token}` },
        cache: "no-store",
      }
    )

    if (!response.ok) {
      return new NextResponse(null, { status: response.status })
    }

    const body = await response.arrayBuffer()
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": response.headers.get("Content-Type") ?? "image/jpeg",
        "Cache-Control": "private, max-age=3600",
      },
    })
  } catch {
    return new NextResponse(null, { status: 500 })
  }
}
