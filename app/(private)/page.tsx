"use client"

import { UploadVideoButton } from "@/components/upload/upload-video-button"
import { useUser } from "@/lib/user/context"

export default function Page() {
  const { user } = useUser()

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-end">
        <UploadVideoButton />
      </div>
      <pre>{JSON.stringify(user, null, 2)}</pre>
    </div>
  )
}
