"use client"

import { useUser } from "@/lib/user/context"

export default function Page() {
  const { user } = useUser()

  return (
    <>
      <pre>{JSON.stringify(user, null, 2)}</pre>
    </>
  )
}
