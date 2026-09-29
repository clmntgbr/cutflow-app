import { ProjectList } from "@/components/project/project-list"

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = await params

  return (
    <div className="flex flex-col gap-6 p-6">
      <ProjectList openedProjectId={projectId} />
    </div>
  )
}
