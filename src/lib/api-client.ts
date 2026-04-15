import { TOKEN_KEYS } from "@/constants"
import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, InternalAxiosRequestConfig } from "axios"
import { handleApiError, triggerSessionExpired } from "./error-handler"

export interface ApiResponse<T = unknown> {
  code: number,
  message: string,
  data: T
}

export interface TokenPair {
  accessToken: string,
  refreshToken: string
}

const isClient = typeof window !== 'undefined'

export const tokenStore = {
  getAccessToken: (): string | null => {
    return isClient ? localStorage.getItem(TOKEN_KEYS.ACCESS) : null
  },
  getRefreshToken: (): string | null => {
    return isClient ? localStorage.getItem(TOKEN_KEYS.REFRESH) : null
  },
  setTokens: (token: TokenPair): void => {
    localStorage.setItem(TOKEN_KEYS.ACCESS, token.accessToken)
    localStorage.setItem(TOKEN_KEYS.REFRESH, token.refreshToken)
    const opts = 'path=/; SameSite=Strict'
    document.cookie = `${TOKEN_KEYS.ACCESS}=${token.accessToken}; ${opts}`
    document.cookie = `${TOKEN_KEYS.REFRESH}=${token.refreshToken}; ${opts}`
  },
  clearTokens: (): void => {
    localStorage.removeItem(TOKEN_KEYS.ACCESS)
    localStorage.removeItem(TOKEN_KEYS.REFRESH)
    const expired = 'path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
    document.cookie = `${TOKEN_KEYS.ACCESS}=; ${expired}`
    document.cookie = `${TOKEN_KEYS.REFRESH}=; ${expired}`
    document.cookie = `${TOKEN_KEYS.ROLE}=; ${expired}`
  }
}

let isRefreshing = false

let reqQueue: Array<{
  resolve: (token: string) => void
  reject: (err: Error) => void
}> = []

const drainQueue = (token: string) => {
  reqQueue.forEach(req => req.resolve(token))
  reqQueue = []
}

const rejectQueue = (err: Error) => {
  reqQueue.forEach(req => req.reject(err))
  reqQueue = []
}

declare module 'axios' {
  interface InternalAxiosRequestConfig {
    _retry?: boolean,
    skipAuth?: boolean
  }
}

const apiClient: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8080/api',
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' }
})

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const accToken = tokenStore.getAccessToken()
  if (accToken && !config.skipAuth) {
    config.headers.Authorization = `Bearer ${accToken}`
  }
  if (config.method) {
    config.headers['Cache-Control'] = 'no-cache'
  }
  return config
}, (error) => { Promise.reject(error) })

apiClient.interceptors.response.use(
  (response) => {
    const { code, message, data } = response.data

    if (code === 200) return { ...response, data }

    const err = new axios.AxiosError(
      message,
      String(code),
      response.config,
      response.request,
      { ...response, data: response.data }
    )
    return Promise.reject(err)
  }, async (error: AxiosError) => {
    const original = error.config!
    const status = error.status

    if (status === 401 && !original._retry) {
      original._retry = true

      if (!isRefreshing) {
        return new Promise((resolve, reject) => {
          reqQueue.push({
            resolve: (newToken) => {
              original.headers.Authorization = `Bearer ${newToken}`
              resolve(apiClient(original))
            }, reject
          })
        })
      }
      isRefreshing = true

      try {
        const refreshToken = tokenStore.getRefreshToken()
        if (!refreshToken)
          throw new Error('No refresh token')
        const { data: responseData } = await axios.post<ApiResponse<TokenPair>>(
          `${process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8080/api'}/auth/refresh-token`,
          { refreshToken },
          { skipAuth: true } as AxiosRequestConfig
        )
        const newTokens = responseData.data
        tokenStore.setTokens(newTokens)
        drainQueue(newTokens.accessToken)
        original.headers.Authorization = `Bearer ${newTokens.accessToken}`
        return apiClient(original)
      } catch (error) {
        rejectQueue(error as Error)
        triggerSessionExpired()
        return Promise.reject(error)
      } finally {
        isRefreshing = false
      }
    }
    handleApiError(error as AxiosError<{ message: string, code: number, data: unknown }>)
    return Promise.reject(error)
  }
)

export const request = {
  get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return apiClient.get<T, T>(url, config)
  },
  post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return apiClient.post<T, T>(url, data, config)
  },
  put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return apiClient.put<T, T>(url, data, config)
  },
  delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return apiClient.delete<T, T>(url, config)
  },
  download(url: string, config?: AxiosRequestConfig): Promise<Blob> {
    return apiClient.get<Blob, Blob>(url, { ...config, responseType: 'blob' })
  },
  upload<T>(url: string, formData?: FormData, config?: AxiosRequestConfig): Promise<T> {
    return apiClient.post<T, T>(url, formData, {
      ...config,
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  }
}