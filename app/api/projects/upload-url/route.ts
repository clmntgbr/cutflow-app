import { createAuthHeaders } from "@/lib/create-auth-headers"
import { requireAuth } from "@/lib/require-auth"
import { NextResponse } from "next/server"

const BACKEND_API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL

export async function POST(request: Request) {
  try {
    const auth = await requireAuth()
    if ("error" in auth) return auth.error

    const body = await request.json()

    const response = await fetch(`${BACKEND_API_URL}/api/projects/upload-url`, {
      method: "POST",
      headers: createAuthHeaders(auth.token),
      body: JSON.stringify(body),
    })

    const data = await response.json().catch(() => ({
      message: "Failed to generate upload url",
    }))

    return NextResponse.json(data, { status: response.status })
  } catch {
    return NextResponse.json(
      { message: "Failed to generate upload url" },
      { status: 500 }
    )
  }
}
