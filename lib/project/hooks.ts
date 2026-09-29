"use client"

import { queryKeys } from "@/lib/query/keys"
import {
  keepPreviousData,
  useInfiniteQuery,
  useQuery,
} from "@tanstack/react-query"
import { getProject, listProjects } from "./api"
import type { ProjectStatus } from "./types"

const PRESIGNED_URL_REFRESH_MS = 50 * 60 * 1000
const ACTIVE_PROJECT_POLL_MS = 2500

const POLLED_STATUSES = new Set<ProjectStatus | string>([
  "draft",
  "processing",
  "rendering",
])

export function useProjects() {
  return useInfiniteQuery({
    queryKey: queryKeys.projects.lists(),
    queryFn: ({ pageParam, signal }) => listProjects(pageParam, signal),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
    placeholderData: keepPreviousData,
  })
}

export function useProject(projectId: string | null) {
  return useQuery({
    queryKey: queryKeys.projects.detail(projectId ?? ""),
    queryFn: ({ signal }) => getProject(projectId!, signal),
    enabled: Boolean(projectId),
    refetchInterval: (query) => {
      const status = query.state.data?.status
      if (status && POLLED_STATUSES.has(status)) return ACTIVE_PROJECT_POLL_MS
      if (query.state.data) return PRESIGNED_URL_REFRESH_MS
      return false
    },
  })
}
