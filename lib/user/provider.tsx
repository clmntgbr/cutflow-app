"use client"

import { useCallback, useEffect, useReducer } from "react"
import { getUser } from "./api"
import { UserContext } from "./context"
import { userReducer } from "./reducer"
import { UserState } from "./types"

const initialState: UserState = {
  user: null,
  isLoading: false,
  error: null,
}

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(userReducer, initialState)

  const fetchUser = useCallback(async () => {
    try {
      dispatch({ type: "GET_USER_LOADING", payload: true })
      const user = await getUser()
      dispatch({ type: "GET_USER", payload: user })
    } catch {
      dispatch({ type: "GET_USER_ERROR", payload: "Failed to fetch user" })
    } finally {
      dispatch({ type: "GET_USER_LOADING", payload: false })
    }
  }, [])

  useEffect(() => {
    fetchUser()
  }, [fetchUser])

  return (
    <UserContext.Provider
      value={{
        ...state,
        fetchUser,
      }}
    >
      {children}
    </UserContext.Provider>
  )
}
