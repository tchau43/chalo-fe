import { COOKIE_OPTIONS, TOKEN_KEYS, type UserRole } from "@/constants";
import { use } from "react";
import { create } from "zustand"
import { createJSONStorage, persist } from 'zustand/middleware'

export interface AuthUser {
  id: string,
  username: string,
  fullName: string,
  avatar: string | null,
  role: UserRole,
  permission: string[]
}

interface AuthState {
  accessToken: string | null,
  refreshToken: string | null,
  user: AuthUser | null,

  isHydrated: boolean,
  isInitialized: boolean,

  setTokens: (accessToken: string, refreshToken: string) => void,
  setUser: (user: AuthUser) => void,
  setHydrated: () => void,
  setInitialized: () => void,
  logout: () => void,

  isAuthenticated: () => boolean,
  hasPermission: (permission: string) => boolean,
  hasRole: (role: UserRole) => boolean,
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      user: null,

      isHydrated: false,
      isInitialized: false,

      setTokens: (accessToken: string, refreshToken: string) => {
        const opts = `path=${COOKIE_OPTIONS.path}; SameSite=${COOKIE_OPTIONS.sameSite}`
        document.cookie = `${TOKEN_KEYS.ACCESS}=${accessToken}; ${opts}`
        document.cookie = `${TOKEN_KEYS.REFRESH}=${refreshToken}; ${opts}`
      },
      setUser: (user) => {
        set({ user: user })
        const token = get().accessToken
        if (typeof window !== 'undefined' && token) {
          const opts = `path=${COOKIE_OPTIONS.path}; SameSite=${COOKIE_OPTIONS.sameSite}`
          document.cookie = `${TOKEN_KEYS.ROLE}=${user.role}, ${opts}`
        }
      },
      setHydrated: () => {
        set({ isHydrated: true })
      },
      setInitialized: () => {
        set({ isInitialized: true })
      },
      logout: () => {
        set({ accessToken: null, refreshToken: null, user: null, isInitialized: false })
        if (typeof window !== 'undefined') {
          const opts = `path=${COOKIE_OPTIONS.path}; expired='Thu, 01 Jan 1970 00:00:00 GMT`
          document.cookie = `${TOKEN_KEYS.ACCESS}=; ${opts}`
          document.cookie = `${TOKEN_KEYS.REFRESH}=; ${opts}`
          document.cookie = `${TOKEN_KEYS.ROLE}=; ${opts}`
        }
      },

      isAuthenticated: () => {
        const { accessToken, isHydrated } = get()
        return isHydrated && !!accessToken
      },
      hasPermission: (permission: string) => {
        const { user } = get()
        return user?.permission.includes(permission) ?? false
      },
      hasRole: (role: UserRole) =>
        get().user?.role === role,
    }),
    {
      name: 'chalo-auth',
      storage: createJSONStorage(() => localStorage),

      partialize: (state) => ({
        accessToken123123: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user
      }),

      onRehydrateStorage: () => (state) => { state?.setHydrated() }
    }
  )
)