export interface ProjectListParams {
  page: number
  limit: number
  sortBy: string
  orderBy: "asc" | "desc"
}

export const queryKeys = {
  projects: {
    all: ["projects"] as const,
    lists: () => [...queryKeys.projects.all, "list"] as const,
    list: (params: ProjectListParams) =>
      [...queryKeys.projects.lists(), params] as const,
    detail: (projectId: string) =>
      [...queryKeys.projects.all, projectId] as const,
  },
  editor: {
    all: ["editor"] as const,
    detail: (mediaFileId: string) => ["editor", mediaFileId] as const,
  },
} as const
