import { parseApiError } from "@/lib/api-error"
import type { PaginatedProjects, ProjectDetail } from "./types"

export async function listProjects(
  page = 1,
  signal?: AbortSignal
): Promise<PaginatedProjects> {
  const params = new URLSearchParams({
    page: String(page),
    limit: "20",
    sortBy: "created_at",
    orderBy: "desc",
  })

  const response = await fetch(`/api/projects?${params.toString()}`, {
    method: "GET",
    signal,
  })

  if (!response.ok) {
    throw await parseApiError(response, "Failed to list projects")
  }

  return response.json()
}

export async function getProject(
  id: string,
  signal?: AbortSignal
): Promise<ProjectDetail> {
  const response = await fetch(`/api/projects/${id}`, {
    method: "GET",
    signal,
  })

  if (!response.ok) {
    throw await parseApiError(response, "Failed to get project")
  }

  return response.json()
}
