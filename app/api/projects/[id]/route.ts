import { createAuthHeaders } from "@/lib/create-auth-headers"
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
    const response = await fetch(`${BACKEND_API_URL}/api/projects/${id}`, {
      method: "GET",
      headers: createAuthHeaders(auth.token),
      cache: "no-store",
    })

    const data = await response.json().catch(() => ({
      message: "Failed to get project",
    }))

    return NextResponse.json(data, { status: response.status })
  } catch {
    return NextResponse.json(
      { message: "Failed to get project" },
      { status: 500 }
    )
  }
}
