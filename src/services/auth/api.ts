import { API, UserRole } from "@/constants";
import { request } from "@/lib/api-client";
import { AuthUser } from "@/stores/auth.store";

export interface LoginPayload {
  username: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  role: UserRole
}

export const loginApi = (data: LoginPayload): Promise<LoginResponse> => {
  return request.post(API.AUTH.LOGIN, data, { skipAuth: true } as never)
}

export const logoutApi = (): Promise<void> => {
  return request.post(API.AUTH.LOGOUT)
}

export const getCurrentUser = (): Promise<AuthUser> => {
  return request.get(API.AUTH.ME)
}