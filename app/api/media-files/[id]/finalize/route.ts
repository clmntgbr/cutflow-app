import { createAuthHeaders } from "@/lib/create-auth-headers"
import { requireAuth } from "@/lib/require-auth"
import { NextResponse } from "next/server"

const BACKEND_API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth()
    if ("error" in auth) return auth.error

    const { id } = await context.params
    const body = await request.text()
    const response = await fetch(`${BACKEND_API_URL}/api/media-files/${id}/finalize`, {
      method: "POST",
      headers: createAuthHeaders(auth.token),
      body,
      cache: "no-store",
    })

    const text = await response.text()
    if (!text) return new NextResponse(null, { status: response.status })

    try {
      return NextResponse.json(JSON.parse(text), { status: response.status })
    } catch {
      return NextResponse.json({ message: "Failed to export" }, { status: response.status })
    }
  } catch {
    return NextResponse.json({ message: "Failed to export" }, { status: 500 })
  }
}
