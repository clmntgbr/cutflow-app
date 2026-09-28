import { User } from "./types"

export const getUser = async (): Promise<User> => {
  const response = await fetch("/api/users", {
    method: "GET",
  })

  if (!response.ok) {
    throw new Error("Failed to fetch user")
  }

  return response.json()
}
