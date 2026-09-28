import { UserAction, UserState } from "./types"

export const userReducer = (
  state: UserState,
  action: UserAction
): UserState => {
  switch (action.type) {
    case "GET_USER":
      return {
        ...state,
        user: action.payload,
        isLoading: false,
        error: null,
      }
    case "GET_USER_ERROR":
      return {
        ...state,
        user: null,
        isLoading: false,
        error: action.payload,
      }
    case "GET_USER_LOADING":
      return {
        ...state,
        isLoading: action.payload,
      }
    default:
      return state
  }
}
