export interface User {
  firstname?: string
  lastname?: string
  id?: string
}

export interface UserState {
  user: User | null
  isLoading: boolean
  error: string | null
}

export type UserAction =
  | { type: "GET_USER"; payload: User }
  | { type: "GET_USER_ERROR"; payload: string }
  | { type: "GET_USER_LOADING"; payload: boolean }
