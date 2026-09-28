import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"

export async function requireAuth(): Promise<
  { token: string } | { error: NextResponse }
> {
  const { userId, getToken } = await auth()
  if (!userId) {
    return {
      error: NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      ),
    }
  }

  const clerkToken = await getToken()
  if (!clerkToken) {
    return {
      error: NextResponse.json(
        { success: false, error: "Missing Clerk token" },
        { status: 401 }
      ),
    }
  }

  return { token: clerkToken }
}
