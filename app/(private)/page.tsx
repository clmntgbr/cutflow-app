"use client"

import { ProjectList } from "@/components/project/project-list"
import { useUser } from "@/lib/user/context"

export default function Page() {
  const { user } = useUser()

  return (
    <div className="flex flex-col gap-6 p-6">
      <ProjectList />
    </div>
  )
}
